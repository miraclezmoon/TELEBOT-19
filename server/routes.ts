import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { authenticateAdmin, generateToken, verifyToken, type AuthenticatedAdmin } from "./auth";
import { insertRaffleSchema, insertShopItemSchema, insertBotSettingSchema } from "@shared/schema";
import { initializeBot, getBot } from "./bot";

// Extend Request type to include admin property
interface AuthenticatedRequest extends Request {
  admin: AuthenticatedAdmin;
}

// Middleware to check authentication
function requireAuth(req: AuthenticatedRequest, res: any, next: any) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }
  
  const admin = verifyToken(token);
  if (!admin) {
    return res.status(401).json({ message: 'Invalid token' });
  }
  
  req.admin = admin;
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Test route
  app.get('/api/test', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });
  
  // Auth routes
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
      }
      
      const admin = await authenticateAdmin(username, password);
      if (!admin) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      const token = generateToken(admin);
      res.json({ token, admin });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  app.get('/api/auth/me', requireAuth, (req, res) => {
    res.json(req.admin);
  });
  
  // Sync user data from bot
  app.post('/api/users/:telegramId/sync', requireAuth, async (req, res) => {
    try {
      const { telegramId } = req.params;
      const user = await storage.getUserByTelegramId(telegramId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Return fresh user data
      const transactions = await storage.getUserTransactions(user.id);
      
      res.json({
        user,
        transactions: transactions.slice(0, 10),
        syncedAt: new Date()
      });
    } catch (error) {
      console.error('Sync user error:', error);
      res.status(500).json({ message: 'Failed to sync user data' });
    }
  });
  
  // Dashboard stats
  app.get('/api/dashboard/stats', requireAuth, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error('Dashboard stats error:', error);
      res.status(500).json({ message: 'Failed to fetch dashboard stats' });
    }
  });
  
  // Users
  app.get('/api/users', requireAuth, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });
  
  // Get full user data with all relations
  app.get('/api/users/:id/full', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const user = await storage.getUserById(parseInt(id));
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      const transactions = await storage.getUserTransactions(user.id);
      const purchases = await storage.getUserPurchases(user.id);
      
      res.json({
        ...user,
        transactions,
        purchases,
        lastSync: new Date()
      });
    } catch (error) {
      console.error('Get full user data error:', error);
      res.status(500).json({ message: 'Failed to fetch user data' });
    }
  });

  // Adjust user coins
  app.post('/api/users/:id/adjust-coins', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { amount, type, reason } = req.body;
      
      if (!amount || !type || !reason) {
        return res.status(400).json({ message: 'Amount, type, and reason are required' });
      }
      
      const user = await storage.getUserById(parseInt(id));
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      const adjustedAmount = type === 'add' ? Math.abs(amount) : -Math.abs(amount);
      const newBalance = user.coins + adjustedAmount;
      
      if (newBalance < 0) {
        return res.status(400).json({ message: 'Insufficient balance for withdrawal' });
      }
      
      // Update user coins - use updateUserById for direct ID update
      const updatedUser = await storage.updateUserById(user.id, { coins: newBalance });
      
      // Create transaction record
      await storage.createTransaction({
        userId: user.id,
        type: type === 'add' ? 'admin_add' : 'admin_withdraw',
        amount: adjustedAmount,
        description: `Admin ${type}: ${reason}`,
      });
      
      res.json({ 
        success: true, 
        newBalance: updatedUser.coins,
        user: updatedUser 
      });
    } catch (error) {
      console.error('Adjust coins error:', error);
      res.status(500).json({ message: 'Failed to adjust coins' });
    }
  });
  
  app.patch('/api/users/:telegramId', requireAuth, async (req, res) => {
    try {
      const { telegramId } = req.params;
      const updates = req.body;
      
      const user = await storage.updateUser(telegramId, updates);
      res.json(user);
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({ message: 'Failed to update user' });
    }
  });
  
  // Transactions
  app.get('/api/transactions', requireAuth, async (req, res) => {
    try {
      const transactions = await storage.getAllTransactions();
      res.json(transactions);
    } catch (error) {
      console.error('Get transactions error:', error);
      res.status(500).json({ message: 'Failed to fetch transactions' });
    }
  });
  
  // Raffles
  app.get('/api/raffles', requireAuth, async (req, res) => {
    try {
      const raffles = await storage.getAllRaffles();
      res.json(raffles);
    } catch (error) {
      console.error('Get raffles error:', error);
      res.status(500).json({ message: 'Failed to fetch raffles' });
    }
  });
  
  app.post('/api/raffles', requireAuth, async (req, res) => {
    try {
      // Convert date strings to Date objects
      const processedData = {
        ...req.body,
        startDate: req.body.startDate ? new Date(req.body.startDate) : new Date(),
        endDate: new Date(req.body.endDate),
      };
      
      const raffleData = insertRaffleSchema.parse(processedData);
      const raffle = await storage.createRaffle(raffleData);
      res.json(raffle);
    } catch (error) {
      console.error('Create raffle error:', error);
      res.status(500).json({ message: 'Failed to create raffle' });
    }
  });
  
  app.patch('/api/raffles/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const raffle = await storage.updateRaffle(parseInt(id), updates);
      res.json(raffle);
    } catch (error) {
      console.error('Update raffle error:', error);
      res.status(500).json({ message: 'Failed to update raffle' });
    }
  });
  
  app.get('/api/raffles/:id/entries', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const entries = await storage.getRaffleEntries(parseInt(id));
      res.json(entries);
    } catch (error) {
      console.error('Get raffle entries error:', error);
      res.status(500).json({ message: 'Failed to fetch raffle entries' });
    }
  });
  
  // Shop items
  app.get('/api/shop', requireAuth, async (req, res) => {
    try {
      const items = await storage.getAllShopItems();
      res.json(items);
    } catch (error) {
      console.error('Get shop items error:', error);
      res.status(500).json({ message: 'Failed to fetch shop items' });
    }
  });
  
  app.post('/api/shop', requireAuth, async (req, res) => {
    try {
      console.log('Shop item data received:', req.body);
      const itemData = insertShopItemSchema.parse(req.body);
      const item = await storage.createShopItem(itemData);
      res.json(item);
    } catch (error) {
      console.error('Create shop item error:', error);
      if (error instanceof Error) {
        res.status(500).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Failed to create shop item' });
      }
    }
  });
  
  app.patch('/api/shop/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const item = await storage.updateShopItem(parseInt(id), updates);
      res.json(item);
    } catch (error) {
      console.error('Update shop item error:', error);
      res.status(500).json({ message: 'Failed to update shop item' });
    }
  });
  
  // Telegram broadcast
  app.post('/api/telegram/broadcast', requireAuth, async (req, res) => {
    try {
      const { message } = req.body;
      
      if (!message || !message.trim()) {
        return res.status(400).json({ message: 'Message is required' });
      }
      
      // Get bot instance
      const bot = getBot();
      if (!bot) {
        return res.status(500).json({ message: 'Bot is not initialized' });
      }
      
      // Get all users with telegram IDs
      const users = await storage.getUsers();
      const activeUsers = users.filter(user => user.telegramId);
      
      let sentCount = 0;
      let failedCount = 0;
      
      // Send message to each user
      for (const user of activeUsers) {
        try {
          await bot.sendMessage(user.telegramId, message, { parse_mode: 'Markdown' });
          sentCount++;
          
          // Add small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 50));
        } catch (error) {
          console.error(`Failed to send message to user ${user.telegramId}:`, error);
          failedCount++;
        }
      }
      
      res.json({ 
        message: 'Broadcast sent successfully',
        sentCount,
        failedCount,
        totalUsers: activeUsers.length
      });
    } catch (error) {
      console.error('Broadcast error:', error);
      res.status(500).json({ message: 'Failed to send broadcast' });
    }
  });
  
  // Bot settings
  app.get('/api/settings', requireAuth, async (req, res) => {
    try {
      const botToken = await storage.getBotSetting('bot_token');
      const dailyReward = await storage.getBotSetting('daily_reward_amount');
      const referralReward = await storage.getBotSetting('referral_reward_amount');
      
      res.json({
        botToken: botToken?.value || '',
        dailyRewardAmount: parseInt(dailyReward?.value || '1'),
        referralRewardAmount: parseInt(referralReward?.value || '1'),
      });
    } catch (error) {
      console.error('Get settings error:', error);
      res.status(500).json({ message: 'Failed to fetch settings' });
    }
  });
  
  app.patch('/api/settings', requireAuth, async (req, res) => {
    try {
      const { botToken, dailyRewardAmount, referralRewardAmount } = req.body;
      
      if (botToken) {
        await storage.setBotSetting({
          key: 'bot_token',
          value: botToken,
          description: 'Telegram bot token',
        });
        
        // Reinitialize bot with new token
        try {
          await initializeBot();
          console.log('Bot reinitialized with new token');
        } catch (error) {
          console.log('Bot reinitialization failed:', error);
        }
      }
      
      if (dailyRewardAmount) {
        await storage.setBotSetting({
          key: 'daily_reward_amount',
          value: dailyRewardAmount.toString(),
          description: 'Daily reward amount in coins',
        });
      }
      
      if (referralRewardAmount) {
        await storage.setBotSetting({
          key: 'referral_reward_amount',
          value: referralRewardAmount.toString(),
          description: 'Referral reward amount in coins',
        });
      }
      
      res.json({ message: 'Settings updated successfully' });
    } catch (error) {
      console.error('Update settings error:', error);
      res.status(500).json({ message: 'Failed to update settings' });
    }
  });

  // Reset all user points
  app.post("/api/users/reset-points", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      await storage.resetAllUserPoints();
      res.json({ message: 'All user points have been reset to 0' });
    } catch (error) {
      console.error('Reset points error:', error);
      res.status(500).json({ message: 'Failed to reset user points' });
    }
  });

  // Export users data endpoint
  app.get("/api/users/export", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const users = await storage.getAllUsers();
      
      // Create CSV content
      const headers = ['ID', 'Username', 'First Name', 'Last Name', 'Coins', 'Referral Code', 'Referred By', 'Created At', 'Last Reward', 'Streak', 'Active'];
      const rows = users.map(user => [
        user.id,
        user.username || '',
        user.firstName || '',
        user.lastName || '',
        user.coins,
        user.referralCode || '',
        user.referredBy || '',
        user.createdAt ? new Date(user.createdAt).toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }) : '',
        user.lastDailyReward ? new Date(user.lastDailyReward).toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }) : '',
        user.dailyStreak || 0,
        user.isActive ? 'Yes' : 'No'
      ]);
      
      // Convert to CSV format
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => {
          // Escape cells that contain commas or quotes
          const cellStr = String(cell);
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        }).join(','))
      ].join('\n');
      
      // Set headers for file download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="telegram_bot_users.csv"');
      res.send(csvContent);
    } catch (error) {
      console.error('Export users error:', error);
      res.status(500).json({ message: 'Failed to export users' });
    }
  });

  // Broadcast message endpoint
  app.post("/api/broadcast", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { message } = req.body;
      
      if (!message || typeof message !== 'string' || !message.trim()) {
        return res.status(400).json({ message: 'Message is required' });
      }

      console.log('Broadcasting message:', message);
      const { broadcastMessage } = await import('./bot');
      const result = await broadcastMessage(message);
      console.log('Broadcast result:', result);
      
      res.json({ 
        success: result.success,
        failed: result.failed
      });
    } catch (error: any) {
      console.error('Broadcast message error:', error);
      res.status(500).json({ message: error.message || 'Failed to broadcast message' });
    }
  });

  // Bot status endpoint
  app.get("/api/bot/status", async (req: Request, res) => {
    const bot = getBot();
    const botTokenSetting = await storage.getBotSetting('bot_token');
    const hasToken = !!botTokenSetting?.value || !!process.env.BOT_TOKEN || !!process.env.TELEGRAM_BOT_TOKEN;
    
    if (!bot) {
      return res.json({ 
        connected: false, 
        hasToken,
        message: hasToken ? 'Bot not initialized' : 'Bot token not configured' 
      });
    }
    
    try {
      const me = await bot.getMe();
      res.json({ 
        connected: true, 
        hasToken: true,
        botInfo: {
          username: me.username,
          firstName: me.first_name,
          id: me.id
        }
      });
    } catch (error: any) {
      console.error('Bot status check error:', error);
      res.json({ 
        connected: false, 
        hasToken,
        message: 'Bot connection error',
        error: error.message 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
