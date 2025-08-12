// routes.ts
// NOTE: Ensure in your server bootstrap you have: app.use(express.json()) BEFORE registerRoutes(app)

import type { Express, Request } from "express";
import { storage } from "./storage";
import {
  authenticateAdmin,
  generateToken,
  verifyToken,
  type AuthenticatedAdmin,
} from "./auth";
import { insertRaffleSchema, insertShopItemSchema } from "@shared/schema";
import { initializeBot, getBot } from "./bot";

// Extend Request type to include admin property
interface AuthenticatedRequest extends Request {
  admin: AuthenticatedAdmin;
}

// Auth middleware
function requireAuth(req: AuthenticatedRequest, res: any, next: any) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ message: "No token provided" });
  const admin = verifyToken(token);
  if (!admin) return res.status(401).json({ message: "Invalid token" });
  req.admin = admin;
  next();
}

export function registerRoutes(app: Express): void {
  // --- Healthcheck ---
  app.get("/healthz", (_req, res) => res.send("ok"));

  // --- Telegram Webhook ---
  app.post("/telegram/webhook", (req, res) => {
    const secret = req.get("x-telegram-bot-api-secret-token");
    if (secret !== process.env.TELEGRAM_SECRET) return res.sendStatus(401);

    const bot = getBot();
    if (!bot) return res.status(500).send("Bot not initialized");

    try {
      // @ts-ignore: node-telegram-bot-api runtime supports processUpdate
      bot.processUpdate(req.body);
      return res.sendStatus(200);
    } catch (e) {
      console.error("processUpdate error:", e);
      return res.sendStatus(500);
    }
  });

  // --- Test route ---
  app.get("/api/test", (_req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // --- Auth ---
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body ?? {};
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      const admin = await authenticateAdmin(username, password);
      if (!admin) return res.status(401).json({ message: "Invalid credentials" });
      const token = generateToken(admin);
      res.json({ token, admin });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/auth/me", requireAuth, (req: AuthenticatedRequest, res) => {
    res.json(req.admin);
  });

  // --- Sync user data from bot ---
  app.post("/api/users/:telegramId/sync", requireAuth, async (req, res) => {
    try {
      const { telegramId } = req.params;
      const user = await storage.getUserByTelegramId(telegramId);
      if (!user) return res.status(404).json({ message: "User not found" });
      const transactions = await storage.getUserTransactions(user.id);
      res.json({ user, transactions: transactions.slice(0, 10), syncedAt: new Date() });
    } catch (error) {
      console.error("Sync user error:", error);
      res.status(500).json({ message: "Failed to sync user data" });
    }
  });

  // --- Dashboard stats ---
  app.get("/api/dashboard/stats", requireAuth, async (_req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Dashboard stats error:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // --- Users ---
  app.get("/api/users", requireAuth, async (_req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Get full user data
  app.get("/api/users/:id/full", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const user = await storage.getUserById(id);
      if (!user) return res.status(404).json({ message: "User not found" });
      const transactions = await storage.getUserTransactions(user.id);
      const purchases = await storage.getUserPurchases(user.id);
      res.json({ ...user, transactions, purchases, lastSync: new Date() });
    } catch (error) {
      console.error("Get full user data error:", error);
      res.status(500).json({ message: "Failed to fetch user data" });
    }
  });

  // Adjust user coins
  app.post("/api/users/:id/adjust-coins", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const { amount, type, reason } = req.body ?? {};
      if (typeof amount !== "number" || !type || !reason) {
        return res.status(400).json({ message: "Amount, type, and reason are required" });
      }
      const user = await storage.getUserById(id);
      if (!user) return res.status(404).json({ message: "User not found" });

      const adjustedAmount = type === "add" ? Math.abs(amount) : -Math.abs(amount);
      const newBalance = (user.coins ?? 0) + adjustedAmount;
      if (newBalance < 0) return res.status(400).json({ message: "Insufficient balance for withdrawal" });

      const updatedUser = await storage.updateUserById(user.id, { coins: newBalance });
      await storage.createTransaction({
        userId: user.id,
        type: type === "add" ? "admin_add" : "admin_withdraw",
        amount: adjustedAmount,
        description: `Admin ${type}: ${reason}`,
      });
      res.json({ success: true, newBalance: updatedUser.coins, user: updatedUser });
    } catch (error) {
      console.error("Adjust coins error:", error);
      res.status(500).json({ message: "Failed to adjust coins" });
    }
  });

  // Toggle user status
  app.post("/api/users/:id/toggle-status", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const user = await storage.getUserById(id);
      if (!user) return res.status(404).json({ message: "User not found" });
      const updatedUser = await storage.updateUserById(user.id, { isActive: !user.isActive });
      res.json({ success: true, user: updatedUser, message: `User ${updatedUser.isActive ? "enabled" : "disabled"} successfully` });
    } catch (error) {
      console.error("Toggle user status error:", error);
      res.status(500).json({ message: "Failed to toggle user status" });
    }
  });

  // Update user by telegramId
  app.patch("/api/users/:telegramId", requireAuth, async (req, res) => {
    try {
      const { telegramId } = req.params;
      const updates = req.body ?? {};
      const user = await storage.updateUser(telegramId, updates);
      res.json(user);
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // --- Transactions ---
  app.get("/api/transactions", requireAuth, async (_req, res) => {
    try {
      const transactions = await storage.getAllTransactions();
      res.json(transactions);
    } catch (error) {
      console.error("Get transactions error:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  // --- Raffles ---
  app.get("/api/raffles", requireAuth, async (_req, res) => {
    try {
      const raffles = await storage.getAllRaffles();
      res.json(raffles);
    } catch (error) {
      console.error("Get raffles error:", error);
      res.status(500).json({ message: "Failed to fetch raffles" });
    }
  });

  app.post("/api/raffles", requireAuth, async (req, res) => {
    try {
      const processedData = {
        ...req.body,
        startDate: req.body?.startDate ? new Date(req.body.startDate) : new Date(),
        endDate: new Date(req.body?.endDate),
      };
      const raffleData = insertRaffleSchema.parse(processedData);
      const raffle = await storage.createRaffle(raffleData);
      res.json(raffle);
    } catch (error) {
      console.error("Create raffle error:", error);
      res.status(500).json({ message: "Failed to create raffle" });
    }
  });

  app.patch("/api/raffles/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const updates = req.body ?? {};
      const raffle = await storage.updateRaffle(id, updates);
      res.json(raffle);
    } catch (error) {
      console.error("Update raffle error:", error);
      res.status(500).json({ message: "Failed to update raffle" });
    }
  });

  app.get("/api/raffles/:id/entries", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const entries = await storage.getRaffleEntries(id);
      res.json(entries);
    } catch (error) {
      console.error("Get raffle entries error:", error);
      res.status(500).json({ message: "Failed to fetch raffle entries" });
    }
  });

  // --- Shop ---
  app.get("/api/shop", requireAuth, async (_req, res) => {
    try {
      const items = await storage.getAllShopItems();
      res.json(items);
    } catch (error) {
      console.error("Get shop items error:", error);
      res.status(500).json({ message: "Failed to fetch shop items" });
    }
  });

  app.post("/api/shop", requireAuth, async (req, res) => {
    try {
      console.log("Shop item data received:", req.body);
      const itemData = insertShopItemSchema.parse(req.body);
      const item = await storage.createShopItem(itemData);
      res.json(item);
    } catch (error: any) {
      console.error("Create shop item error:", error);
      res.status(500).json({ message: error?.message || "Failed to create shop item" });
    }
  });

  app.patch("/api/shop/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const updates = req.body ?? {};
      const item = await storage.updateShopItem(id, updates);
      res.json(item);
    } catch (error) {
      console.error("Update shop item error:", error);
      res.status(500).json({ message: "Failed to update shop item" });
    }
  });

  // --- Telegram broadcast ---
  app.post("/api/telegram/broadcast", requireAuth, async (req, res) => {
    try {
      const { message } = req.body ?? {};
      if (!message || !message.trim()) {
        return res.status(400).json({ message: "Message is required" });
      }

      const bot = getBot();
      if (!bot) return res.status(500).json({ message: "Bot is not initialized" });

      const users = await storage.getAllUsers();
      const activeUsers = users.filter((u: any) => u.telegramId);

      let sentCount = 0;
      let failedCount = 0;

      for (const user of activeUsers) {
        try {
          await bot.sendMessage(user.telegramId, message, { parse_mode: "Markdown" });
          sentCount++;
          await new Promise((r) => setTimeout(r, 50));
        } catch (e) {
          console.error(`Failed to send message to user ${user.telegramId}:`, e);
          failedCount++;
        }
      }

      res.json({ message: "Broadcast sent successfully", sentCount, failedCount, totalUsers: activeUsers.length });
    } catch (error) {
      console.error("Broadcast error:", error);
      res.status(500).json({ message: "Failed to send broadcast" });
    }
  });

  // --- Settings ---
  app.get("/api/settings", requireAuth, async (_req, res) => {
    try {
      const botToken = await storage.getBotSetting("bot_token");
      const dailyReward = await storage.getBotSetting("daily_reward_amount");
      const referralReward = await storage.getBotSetting("referral_reward_amount");
      res.json({
        botToken: botToken?.value || "",
        dailyRewardAmount: parseInt(dailyReward?.value || "1", 10),
        referralRewardAmount: parseInt(referralReward?.value || "1", 10),
      });
    } catch (error) {
      console.error("Get settings error:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.patch("/api/settings", requireAuth, async (req, res) => {
    try {
      const { botToken, dailyRewardAmount, referralRewardAmount } = req.body ?? {};

      if (typeof botToken === "string" && botToken.length) {
        await storage.setBotSetting({ key: "bot_token", value: botToken, description: "Telegram bot token" });
        try {
          await initializeBot();
          console.log("Bot reinitialized with new token");
        } catch (error) {
          console.log("Bot reinitialization failed:", error);
        }
      }

      if (typeof dailyRewardAmount !== "undefined") {
        await storage.setBotSetting({
          key: "daily_reward_amount",
          value: String(dailyRewardAmount),
          description: "Daily reward amount in coins",
        });
      }

      if (typeof referralRewardAmount !== "undefined") {
        await storage.setBotSetting({
          key: "referral_reward_amount",
          value: String(referralRewardAmount),
          description: "Referral reward amount in coins",
        });
      }

      res.json({ message: "Settings updated successfully" });
    } catch (error) {
      console.error("Update settings error:", error);
      res.status(500).json({ message: "Failed to update settings" });
    }
  });

  // --- Reset all user points ---
  app.post("/api/users/reset-points", requireAuth, async (_req: AuthenticatedRequest, res) => {
    try {
      await storage.resetAllUserPoints();
      res.json({ message: "All user points have been reset to 0" });
    } catch (error) {
      console.error("Reset points error:", error);
      res.status(500).json({ message: "Failed to reset user points" });
    }
  });

  // --- Export users CSV ---
  app.get("/api/users/export", requireAuth, async (_req: AuthenticatedRequest, res) => {
    try {
      const users = await storage.getAllUsers();
      const headers = [
        "ID",
        "Username",
        "First Name",
        "Last Name",
        "Coins",
        "Referral Code",
        "Referred By",
        "Created At",
        "Last Reward",
        "Streak",
        "Active",
      ];
      const rows = users.map((user: any) => [
        user.id,
        user.username || "",
        user.firstName || "",
        user.lastName || "",
        user.coins,
        user.referralCode || "",
        user.referredBy || "",
        user.createdAt ? new Date(user.createdAt).toLocaleString("en-US", { timeZone: "America/Vancouver" }) : "",
        user.lastDailyReward ? new Date(user.lastDailyReward).toLocaleString("en-US", { timeZone: "America/Vancouver" }) : "",
        user.dailyStreak || 0,
        user.isActive ? "Yes" : "No",
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((row) =>
          row
            .map((cell) => {
              const cellStr = String(cell ?? "");
              return cellStr.includes(",") || cellStr.includes("\"") || cellStr.includes("\n")
                ? `"${cellStr.replace(/\"/g, '""')}"`
                : cellStr;
            })
            .join(","),
        ),
      ].join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", 'attachment; filename="telegram_bot_users.csv"');
      res.send(csvContent);
    } catch (error) {
      console.error("Export users error:", error);
      res.status(500).json({ message: "Failed to export users" });
    }
  });

  // --- Broadcast (alias) ---
  app.post("/api/broadcast", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { message } = req.body ?? {};
      if (!message || typeof message !== "string" || !message.trim()) {
        return res.status(400).json({ message: "Message is required" });
      }

      console.log("Broadcasting message:", message);
      const { broadcastMessage } = await import("./bot");
      const result = await broadcastMessage(message);
      console.log("Broadcast result:", result);

      res.json({ success: result.success, failed: result.failed });
    } catch (error: any) {
      console.error("Broadcast message error:", error);
      res.status(500).json({ message: error.message || "Failed to broadcast message" });
    }
  });

  // --- Bot status ---
  app.get("/api/bot/status", async (_req: Request, res) => {
    const bot = getBot();
    const botTokenSetting = await storage.getBotSetting("bot_token");
    const hasToken = !!botTokenSetting?.value || !!process.env.BOT_TOKEN || !!process.env.TELEGRAM_BOT_TOKEN;

    if (!bot) {
      return res.json({ connected: false, hasToken, message: hasToken ? "Bot not initialized" : "Bot token not configured" });
    }

    try {
      const me = await bot.getMe();
      res.json({ connected: true, hasToken: true, botInfo: { username: me.username, firstName: me.first_name, id: me.id } });
    } catch (error: any) {
      console.error("Bot status check error:", error);
      res.json({ connected: false, hasToken, message: "Bot connection error", error: error.message });
    }
  });
}
