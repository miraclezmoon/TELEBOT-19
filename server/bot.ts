import TelegramBot from 'node-telegram-bot-api';
import { storage } from './storage';
import { nanoid } from 'nanoid';

let bot: TelegramBot | null = null;

// User state management for tracking what input we're expecting
const userStates = new Map<string, { state: string; timestamp: number }>();

async function initializeBot() {
  // Stop existing bot instance if any
  if (bot) {
    try {
      console.log('Stopping existing bot instance...');
      await bot.stopPolling();
      bot.removeAllListeners();
      bot = null;
      // Wait a bit for cleanup
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Error stopping existing bot:', error);
    }
  }

  // Get bot token from database
  const botTokenSetting = await storage.getBotSetting('bot_token');
  const BOT_TOKEN = botTokenSetting?.value || process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;

  if (!BOT_TOKEN) {
    console.log('Bot token not found in database or environment variables. Configure it in settings first.');
    return null;
  }

  console.log('Initializing Telegram bot...');
  try {
    // Clear any pending updates first
    const clearUpdatesUrl = `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=-1`;
    await fetch(clearUpdatesUrl);
    
    bot = new TelegramBot(BOT_TOKEN, { polling: false }); // Disable polling, no webhook server

// Set webhook to your Railway public URL
await bot.setWebHook(`https://TELEBOT-19-production-acca.up.railway.app/telegram`);

    setupBotHandlers();
    console.log('Telegram bot initialized successfully!');
  } catch (error) {
    console.error('Failed to initialize bot:', error);
    // Continue without bot to allow admin panel to work
  }
  return bot;
}

// Generate unique referral code
function generateReferralCode(): string {
  return nanoid(8).toUpperCase();
}

// Helper function to convert date to PST
function toPST(date: Date): Date {
  // PST is UTC-8
  const pstOffset = -8 * 60 * 60 * 1000;
  return new Date(date.getTime() + pstOffset);
}

// Check if user can claim daily reward
function canClaimDailyReward(lastReward: Date | null): boolean {
  if (!lastReward) return true;
  
  const now = new Date();
  const pstNow = toPST(now);
  const pstLastReward = toPST(lastReward);
  
  // Get date only (no time) for comparison
  const todayPST = new Date(pstNow.getFullYear(), pstNow.getMonth(), pstNow.getDate());
  const lastRewardPST = new Date(pstLastReward.getFullYear(), pstLastReward.getMonth(), pstLastReward.getDate());
  
  return todayPST.getTime() > lastRewardPST.getTime();
}

function setupBotHandlers() {
  if (!bot) return;

  // Add error handler
  bot.on('polling_error', (error) => {
    console.error('Bot polling error:', error);
  });

  // Add message handler for debugging
  bot.on('message', (msg) => {
    console.log('Received message:', msg.text, 'from:', msg.from?.username || msg.from?.id);
  });

  // Add error handler
  bot.on('error', (error) => {
    console.error('Bot error:', error);
  });

  // Bot command handlers
  bot.onText(/\/start(?:\s+(.+))?/, async (msg, match) => {
    console.log('Received /start command from:', msg.from?.username || msg.from?.id);
    if (!bot) return;
    const chatId = msg.chat.id;
    const telegramId = msg.from?.id?.toString();
    const referralCode = match?.[1];
    
    if (!telegramId) return;
  
  try {
    let user = await storage.getUserByTelegramId(telegramId);
    
    if (!user) {
      // Create new user
      const newUser = {
        telegramId,
        username: msg.from?.username || null,
        firstName: msg.from?.first_name || null,
        lastName: msg.from?.last_name || null,
        referralCode: generateReferralCode(),
        referredBy: referralCode || null,
        coins: 0,
      };
      
      user = await storage.createUser(newUser);
    } else {
      // Sync/update existing user data daily
      const updatedData = {
        username: msg.from?.username || user.username,
        firstName: msg.from?.first_name || user.firstName,
        lastName: msg.from?.last_name || user.lastName,
      };
      
      // Only update if data has changed
      if (updatedData.username !== user.username || 
          updatedData.firstName !== user.firstName || 
          updatedData.lastName !== user.lastName) {
        await storage.updateUser(telegramId, updatedData);
        user = { ...user, ...updatedData };
      }
    }
    
    // Handle referral reward for new users
    if (!user.referredBy && referralCode) {
      const referrer = await storage.getUserByReferralCode(referralCode);
      if (referrer) {
        // Get referral reward from bot settings
        const referralRewardStr = (await storage.getBotSetting('referral_reward_amount'))?.value || '1';
        const referralReward = parseInt(referralRewardStr, 10);
        
        // Give coins to both referrer and referee using awardReward
        await storage.awardReward(referrer.telegramId, referralReward, 'referral', `Referral bonus for inviting ${user.firstName || user.username}`);
        const updatedUser = await storage.awardReward(user.telegramId, referralReward, 'referral', 'Welcome bonus for joining via referral');
        
        // Update referredBy field
        await storage.updateUser(user.telegramId, { referredBy: referralCode });
        
        bot.sendMessage(chatId, `🎉 Welcome! You've received ${referralReward} coin${referralReward > 1 ? 's' : ''} for joining via referral!`);
        // Update user object to reflect new balance
        user = updatedUser;
      }
    }
    
    // Always show main menu
    const dailyRewardStr = (await storage.getBotSetting('daily_reward_amount'))?.value || '1';
    const referralRewardStr = (await storage.getBotSetting('referral_reward_amount'))?.value || '1';
    const dailyRewardAmount = parseInt(dailyRewardStr, 10);
    const referralReward = parseInt(referralRewardStr, 10);
    
    const isNewUser = !user.lastDailyReward && user.coins === 0;
    const welcomeMessage = isNewUser 
      ? `🎉 Welcome to the Coin Reward System, ${user.firstName || user.username}!

💰 **Starting Balance:** ${user.coins} coins

**How to Earn Coins:**
• Daily check-in: ${dailyRewardAmount} coin
• Invite friends: ${referralReward} coin per referral
• Join raffles and shop for rewards!

**Choose what you'd like to do:**`
      : `🎉 Welcome back, ${user.firstName || user.username}!

💰 **Current Balance:** ${user.coins} coins
🔥 **Consecutive Check-ins:** ${user.streak} days

**Choose what you'd like to do:**`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '✅ Daily Check-in', callback_data: 'daily_checkin' }
        ],
        [
          { text: '🎪 Join Raffle', callback_data: 'view_raffles' },
          { text: '🛍️ Coin Shop', callback_data: 'view_shop' }
        ],
        [
          { text: `👥 Invite Friends (+${referralReward} coins each)`, callback_data: 'referral_link' }
        ],
        [
          { text: '💰 My Info', callback_data: 'my_info' },
          { text: `🎁 Enter Invitation Code (+${referralReward} coins)`, callback_data: 'enter_code' }
        ]
      ]
    };
    
    bot.sendMessage(chatId, welcomeMessage, {
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    });
  } catch (error) {
    console.error('Error in /start command:', error);
    bot.sendMessage(chatId, 'Sorry, something went wrong. Please try again.');
  }
});

bot.onText(/\/daily/, async (msg) => {
  if (!bot) return;
  const chatId = msg.chat.id;
  const telegramId = msg.from?.id?.toString();
  
  if (!telegramId) return;
  
  try {
    const user = await storage.getUserByTelegramId(telegramId);
    if (!user) {
      bot.sendMessage(chatId, 'Please start the bot first with /start');
      return;
    }
    
    if (!canClaimDailyReward(user.lastDailyReward)) {
      bot.sendMessage(chatId, '⏰ You already claimed your daily reward today. Come back tomorrow!');
      return;
    }
    
    // Get reward amount from bot settings
    const getDailyAmount = async () => parseInt((await storage.getBotSetting('daily_reward_amount'))?.value || '1', 10);
    const dailyRewardAmount = await getDailyAmount();
    
    // Use the new claimDaily method
    const updatedUser = await storage.claimDaily(telegramId, dailyRewardAmount);
    
    bot.sendMessage(chatId, `🎁 Daily reward claimed! You received ${dailyRewardAmount} coin${dailyRewardAmount > 1 ? 's' : ''}!\n🔥 Current streak: ${updatedUser.streak} day${updatedUser.streak > 1 ? 's' : ''}\n🪙 Total coins: ${updatedUser.coins}`);
  } catch (error) {
    console.error('Error in /daily command:', error);
    bot.sendMessage(chatId, 'Sorry, something went wrong. Please try again.');
  }
});

bot.onText(/\/referral/, async (msg) => {
  if (!bot) return;
  const chatId = msg.chat.id;
  const telegramId = msg.from?.id?.toString();
  
  if (!telegramId) return;
  
  try {
    const user = await storage.getUserByTelegramId(telegramId);
    if (!user) {
      bot.sendMessage(chatId, 'Please start the bot first with /start');
      return;
    }
    
    // Get referral reward from bot settings
    const referralRewardStr = (await storage.getBotSetting('referral_reward_amount'))?.value || '1';
    const referralReward = parseInt(referralRewardStr, 10);
    
    const referralLink = `https://t.me/${(await bot.getMe()).username}?start=${user.referralCode}`;
    const message = `
🔗 Your referral link: ${referralLink}

📢 Share this link with friends to earn coins!
💰 You and your friend both get ${referralReward} coin${referralReward > 1 ? 's' : ''} when they join!

🔢 Your referral code: ${user.referralCode}
    `;
    
    bot.sendMessage(chatId, message);
  } catch (error) {
    console.error('Error in /referral command:', error);
    bot.sendMessage(chatId, 'Sorry, something went wrong. Please try again.');
  }
});

bot.onText(/\/raffle/, async (msg) => {
  if (!bot) return;
  const chatId = msg.chat.id;
  const telegramId = msg.from?.id?.toString();
  
  if (!telegramId) return;
  
  try {
    const user = await storage.getUserByTelegramId(telegramId);
    if (!user) {
      bot.sendMessage(chatId, 'Please start the bot first with /start');
      return;
    }
    
    const activeRaffles = await storage.getActiveRaffles();
    
    if (activeRaffles.length === 0) {
      bot.sendMessage(chatId, '🎪 No active raffles at the moment. Check back later!');
      return;
    }
    
    let message = '🎪 Active Raffles:\n\n';
    activeRaffles.forEach((raffle, index) => {
      const endDate = new Date(raffle.endDate).toLocaleDateString();
      message += `${index + 1}. ${raffle.title}\n`;
      message += `🏆 Prize: ${raffle.prizeDescription}\n`;
      message += `💰 Entry cost: ${raffle.entryCost} coins\n`;
      message += `📊 Entries: ${raffle.currentEntries}${raffle.maxEntries ? `/${raffle.maxEntries}` : ''}\n`;
      message += `⏰ Ends: ${endDate}\n\n`;
    });
    
    message += `Reply with the raffle number to enter!\n🪙 Your coins: ${user.coins}`;
    
    bot.sendMessage(chatId, message);
  } catch (error) {
    console.error('Error in /raffle command:', error);
    bot.sendMessage(chatId, 'Sorry, something went wrong. Please try again.');
  }
});

bot.onText(/\/shop/, async (msg) => {
  if (!bot) return;
  const chatId = msg.chat.id;
  const telegramId = msg.from?.id?.toString();
  
  if (!telegramId) return;
  
  try {
    const user = await storage.getUserByTelegramId(telegramId);
    if (!user) {
      bot.sendMessage(chatId, 'Please start the bot first with /start');
      return;
    }
    
    const shopItems = await storage.getActiveShopItems();
    
    if (shopItems.length === 0) {
      bot.sendMessage(chatId, '🏪 Shop is empty at the moment. Check back later!');
      return;
    }
    
    let message = '🏪 Coin Shop:\n\n';
    shopItems.forEach((item, index) => {
      message += `${index + 1}. ${item.name}\n`;
      if (item.description) {
        message += `📝 ${item.description}\n`;
      }
      message += `💰 Cost: ${item.cost} coins\n`;
      if (item.stock !== null) {
        message += `📦 Stock: ${item.stock}\n`;
      }
      message += '\n';
    });
    
    message += `Reply with the item number to purchase!\n🪙 Your coins: ${user.coins}`;
    
    bot.sendMessage(chatId, message);
  } catch (error) {
    console.error('Error in /shop command:', error);
    bot.sendMessage(chatId, 'Sorry, something went wrong. Please try again.');
  }
});

bot.onText(/\/myinfo/, async (msg) => {
  if (!bot) return;
  const chatId = msg.chat.id;
  const telegramId = msg.from?.id?.toString();
  
  if (!telegramId) return;
  
  try {
    const user = await storage.getUserByTelegramId(telegramId);
    if (!user) {
      bot.sendMessage(chatId, 'Please start the bot first with /start');
      return;
    }
    
    const transactions = await storage.getUserTransactions(user.id);
    const recentTransactions = transactions.slice(0, 5);
    
    let message = `👤 Your Profile:\n\n`;
    message += `🪙 Coins: ${user.coins}\n`;
    message += `🔢 Referral Code: ${user.referralCode}\n`;
    message += `📅 Joined: ${new Date(user.createdAt).toLocaleDateString()}\n`;
    
    if (user.lastDailyReward) {
      const canClaim = canClaimDailyReward(user.lastDailyReward);
      message += `🎁 Daily Reward: ${canClaim ? 'Available' : 'Claimed today'}\n`;
    } else {
      message += `🎁 Daily Reward: Available\n`;
    }
    
    if (recentTransactions.length > 0) {
      message += `\n📊 Recent Transactions:\n`;
      recentTransactions.forEach(tx => {
        const date = new Date(tx.createdAt).toLocaleDateString();
        const sign = tx.amount > 0 ? '+' : '';
        message += `${sign}${tx.amount} - ${tx.description} (${date})\n`;
      });
    }
    
    bot.sendMessage(chatId, message);
  } catch (error) {
    console.error('Error in /myinfo command:', error);
    bot.sendMessage(chatId, 'Sorry, something went wrong. Please try again.');
  }
});

// Handle raffle entries, shop purchases, and invitation codes
bot.on('message', async (msg) => {
  if (!bot) return;
  const chatId = msg.chat.id;
  const telegramId = msg.from?.id?.toString();
  const text = msg.text;
  
  if (!telegramId || !text || text.startsWith('/')) return;
  
  try {
    const user = await storage.getUserByTelegramId(telegramId);
    if (!user) return;
    
    // Check if user is expecting to enter an invitation code
    const userState = userStates.get(telegramId);
    if (userState && userState.state === 'expecting_invite_code') {
      // Clear the state
      userStates.delete(telegramId);
      
      const inviteCode = text.trim().toUpperCase();
      
      // Check if the invitation code exists (belongs to another user)
      const codeOwner = await storage.getUserByReferralCode(inviteCode);
      
      if (!codeOwner) {
        bot.sendMessage(chatId, '❌ Invalid invitation code! This code does not exist. Please check the code and try again.');
        return;
      }
      
      // Optional: Check if the code owner is still active (you can add a status field to users if needed)
      // For now, we just check if they exist
      
      if (codeOwner.id === user.id) {
        bot.sendMessage(chatId, '❌ You cannot use your own invitation code!');
        return;
      }
      
      // Check if user has already been referred
      if (user.referredBy) {
        bot.sendMessage(chatId, '❌ You have already used an invitation code!');
        return;
      }
      
      // Get referral reward from bot settings
      const referralRewardStr = (await storage.getBotSetting('referral_reward_amount'))?.value || '1';
      const referralReward = parseInt(referralRewardStr, 10);
      
      // Update both users using awardReward
      await storage.awardReward(codeOwner.telegramId, referralReward, 'referral', `Referral bonus for inviting ${user.firstName || user.username}`);
      const updatedUser = await storage.awardReward(user.telegramId, referralReward, 'referral', 'Bonus for using invitation code');
      
      // Update referredBy field
      await storage.updateUser(user.telegramId, { referredBy: inviteCode });
      
      bot.sendMessage(chatId, `✅ **Invitation Code Accepted!**\n\nYou have successfully used the invitation code: \`${inviteCode}\`\n💰 You received ${referralReward} coin${referralReward > 1 ? 's' : ''}!\n🪙 Total coins: ${updatedUser.coins}\n\n👤 Code owner: ${codeOwner.firstName || codeOwner.username || 'User'}`);
      return;
    }
    
    const number = parseInt(text.trim());
    if (isNaN(number)) return;
    
    // Check if it's a raffle entry
    const activeRaffles = await storage.getActiveRaffles();
    if (number > 0 && number <= activeRaffles.length) {
      const raffle = activeRaffles[number - 1];
      
      if (user.coins < raffle.entryCost) {
        bot.sendMessage(chatId, `❌ Not enough coins! You need ${raffle.entryCost} coins to enter this raffle.`);
        return;
      }
      
      // Enter raffle
      await storage.updateUser(telegramId, { coins: user.coins - raffle.entryCost });
      await storage.enterRaffle({
        raffleId: raffle.id,
        userId: user.id,
        entries: 1,
      });
      
      await storage.updateRaffle(raffle.id, {
        currentEntries: raffle.currentEntries + 1,
      });
      
      await storage.createTransaction({
        userId: user.id,
        type: 'raffle_entry',
        amount: -raffle.entryCost,
        description: `Raffle entry: ${raffle.title}`,
      });
      
      bot.sendMessage(chatId, `🎪 Successfully entered raffle: ${raffle.title}!\n🪙 Remaining coins: ${user.coins - raffle.entryCost}`);
      return;
    }
    
    // Check if it's a shop purchase
    const shopItems = await storage.getActiveShopItems();
    if (number > 0 && number <= shopItems.length) {
      const item = shopItems[number - 1];
      
      if (user.coins < item.cost) {
        bot.sendMessage(chatId, `❌ Not enough coins! You need ${item.cost} coins to purchase this item.`);
        return;
      }
      
      if (item.stock !== null && item.stock <= 0) {
        bot.sendMessage(chatId, `❌ This item is out of stock!`);
        return;
      }
      
      // Purchase item
      await storage.updateUser(telegramId, { coins: user.coins - item.cost });
      await storage.createPurchase({
        userId: user.id,
        itemId: item.id,
        quantity: 1,
        totalCost: item.cost,
        status: 'completed',
      });
      
      if (item.stock !== null) {
        await storage.updateShopItem(item.id, { stock: item.stock - 1 });
      }
      
      await storage.createTransaction({
        userId: user.id,
        type: 'shop_purchase',
        amount: -item.cost,
        description: `Shop purchase: ${item.name}`,
      });
      
      bot.sendMessage(chatId, `🛍️ Successfully purchased: ${item.name}!\n🪙 Remaining coins: ${user.coins - item.cost}`);
      return;
    }
  } catch (error) {
    console.error('Error handling message:', error);
  }
});

// Handle callback queries from inline buttons
bot.on('callback_query', async (callbackQuery) => {
  if (!bot) return;
  const chatId = callbackQuery.message?.chat.id;
  const telegramId = callbackQuery.from.id.toString();
  const data = callbackQuery.data;
  
  if (!chatId || !data) return;
  
  try {
    const user = await storage.getUserByTelegramId(telegramId);
    if (!user) {
      bot.answerCallbackQuery(callbackQuery.id, { text: 'Please start the bot first with /start' });
      return;
    }

    switch (data) {
      case 'daily_checkin':
        await handleDailyCheckin(chatId, telegramId, user, callbackQuery.id, callbackQuery.message?.message_id);
        break;
      case 'view_raffles':
        await handleViewRaffles(chatId, telegramId, user, callbackQuery.id, callbackQuery.message?.message_id);
        break;
      case 'view_shop':
        await handleViewShop(chatId, telegramId, user, callbackQuery.id, callbackQuery.message?.message_id);
        break;
      case 'referral_link':
        await handleReferralLink(chatId, telegramId, user, callbackQuery.id, callbackQuery.message?.message_id);
        break;
      case 'my_info':
        await handleMyInfo(chatId, telegramId, user, callbackQuery.id, callbackQuery.message?.message_id);
        break;
      case 'enter_code':
        await handleEnterCode(chatId, telegramId, user, callbackQuery.id, callbackQuery.message?.message_id);
        break;
      case 'back_to_menu':
        await handleBackToMenu(chatId, telegramId, user, callbackQuery.id, callbackQuery.message?.message_id);
        break;
      

      
      default:
        // Handle raffle entries and shop purchases
        if (data.startsWith('raffle_')) {
          const raffleId = parseInt(data.split('_')[1]);
          await handleRaffleEntry(chatId, telegramId, user, raffleId, callbackQuery.id);
        } else if (data.startsWith('shop_')) {
          const itemId = parseInt(data.split('_')[1]);
          await handleShopPurchase(chatId, telegramId, user, itemId, callbackQuery.id);
        }
        break;
    }
  } catch (error) {
    console.error('Error handling callback query:', error);
    bot.answerCallbackQuery(callbackQuery.id, { text: 'Something went wrong. Please try again.' });
  }
});

async function handleDailyCheckin(chatId: number, telegramId: string, user: any, callbackQueryId: string, messageId?: number) {
  if (!bot) return;
  if (!canClaimDailyReward(user.lastDailyReward)) {
    bot.answerCallbackQuery(callbackQueryId, { 
      text: '⏰ You already claimed your daily reward today. Come back tomorrow!',
      show_alert: true
    });
    return;
  }
  
  // Get reward amounts from bot settings
  const dailyRewardStr = (await storage.getBotSetting('daily_reward_amount'))?.value || '1';
  const referralRewardStr = (await storage.getBotSetting('referral_reward_amount'))?.value || '1';
  const dailyRewardAmount = parseInt(dailyRewardStr, 10);
  const referralReward = parseInt(referralRewardStr, 10);
  
  // Give daily reward using awardReward
  const updatedUser = await storage.awardReward(
    telegramId,
    dailyRewardAmount,
    'daily_reward',
    'Daily login reward'
  );
  
  // Update last daily reward
  await storage.updateUser(telegramId, {
    lastDailyReward: new Date()
  });
  
  // Update user object to reflect new balance
  user.coins = updatedUser.coins;
  
  const keyboard = {
    inline_keyboard: [
      [
        { text: '✅ Daily Check-in (Completed)', callback_data: 'daily_completed' }
      ],
      [
        { text: '🎪 Join Raffle', callback_data: 'view_raffles' },
        { text: '🛍️ Coin Shop', callback_data: 'view_shop' }
      ],
      [
        { text: `👥 Invite Friends (+${referralReward} coins each)`, callback_data: 'referral_link' }
      ],
      [
        { text: '💰 My Info', callback_data: 'my_info' },
        { text: `🎁 Enter Invitation Code (+${referralReward} coins)`, callback_data: 'enter_code' }
      ]
    ]
  };
  
  bot.editMessageText(
    `🎉 Hello ${user.firstName || user.username}! Welcome to the Coin Reward System!

💰 **Current Balance:** ${updatedUser.coins} coins
🔥 **Consecutive Check-ins:** 1 days

**How to Earn Coins:**
• Daily check-in: ${dailyRewardAmount} coin
• Invite friends: ${referralReward} coin per referral
• Use invitation codes: ${referralReward} coin bonus

Click buttons below to start earning!`,
    {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    }
  );
  
  bot.answerCallbackQuery(callbackQueryId, { 
    text: `🎁 Daily reward claimed! You received ${dailyRewardAmount} coin${dailyRewardAmount > 1 ? 's' : ''}!`,
    show_alert: true
  });
}

async function handleViewRaffles(chatId: number, telegramId: string, user: any, callbackQueryId: string, messageId?: number) {
  if (!bot) return;
  const activeRaffles = await storage.getActiveRaffles();
  
  if (activeRaffles.length === 0) {
    bot.answerCallbackQuery(callbackQueryId, { 
      text: '🎪 No active raffles at the moment. Check back later!',
      show_alert: true
    });
    return;
  }
  
  let message = '🎪 **Active Raffles:**\n\n';
  const keyboard: any = { inline_keyboard: [] };
  
  activeRaffles.forEach((raffle, index) => {
    const endDate = new Date(raffle.endDate).toLocaleDateString();
    message += `**${index + 1}. ${raffle.title}**\n`;
    message += `🏆 Prize: ${raffle.prizeDescription}\n`;
    message += `💰 Entry cost: ${raffle.entryCost} coins\n`;
    message += `📊 Entries: ${raffle.currentEntries}${raffle.maxEntries ? `/${raffle.maxEntries}` : ''}\n`;
    message += `⏰ Ends: ${endDate}\n\n`;
    
    keyboard.inline_keyboard.push([
      { text: `🎪 Enter Raffle ${index + 1} (${raffle.entryCost} coins)`, callback_data: `raffle_${raffle.id}` }
    ]);
  });
  
  message += `💰 **Your coins:** ${user.coins}`;
  
  keyboard.inline_keyboard.push([
    { text: '🔙 Back to Menu', callback_data: 'back_to_menu' }
  ]);
  
  bot.editMessageText(message, {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: keyboard,
    parse_mode: 'Markdown'
  });
  
  bot.answerCallbackQuery(callbackQueryId);
}

async function handleViewShop(chatId: number, telegramId: string, user: any, callbackQueryId: string, messageId?: number) {
  if (!bot) return;
  const shopItems = await storage.getActiveShopItems();
  
  if (shopItems.length === 0) {
    bot.answerCallbackQuery(callbackQueryId, { 
      text: '🏪 Shop is empty at the moment. Check back later!',
      show_alert: true
    });
    return;
  }
  
  let message = '🏪 **Coin Shop:**\n\n';
  const keyboard: any = { inline_keyboard: [] };
  
  shopItems.forEach((item, index) => {
    message += `**${index + 1}. ${item.name}**\n`;
    if (item.description) {
      message += `📝 ${item.description}\n`;
    }
    message += `💰 Cost: ${item.cost} coins\n`;
    if (item.stock !== null) {
      message += `📦 Stock: ${item.stock}\n`;
    }
    message += '\n';
    
    const stockText = item.stock !== null && item.stock <= 0 ? ' (Out of Stock)' : '';
    keyboard.inline_keyboard.push([
      { text: `🛍️ Buy ${item.name} (${item.cost} coins)${stockText}`, callback_data: `shop_${item.id}` }
    ]);
  });
  
  message += `💰 **Your coins:** ${user.coins}`;
  
  keyboard.inline_keyboard.push([
    { text: '🔙 Back to Menu', callback_data: 'back_to_menu' }
  ]);
  
  bot.editMessageText(message, {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: keyboard,
    parse_mode: 'Markdown'
  });
  
  bot.answerCallbackQuery(callbackQueryId);
}

async function handleReferralLink(chatId: number, telegramId: string, user: any, callbackQueryId: string, messageId?: number) {
  if (!bot) return;
  // Get referral reward from bot settings
  const referralRewardStr = (await storage.getBotSetting('referral_reward_amount'))?.value || '1';
  const referralReward = parseInt(referralRewardStr, 10);
  
  const botInfo = await bot.getMe();
  const referralLink = `https://t.me/${botInfo.username}?start=${user.referralCode}`;
  const message = `🔗 **Your referral link:**
\`${referralLink}\`

📢 Share this link with friends to earn coins!
💰 You and your friend both get ${referralReward} coin${referralReward > 1 ? 's' : ''} when they join!

🔢 **Your referral code:** \`${user.referralCode}\``;

  const keyboard = {
    inline_keyboard: [
      [
        { text: '🔙 Back to Menu', callback_data: 'back_to_menu' }
      ]
    ]
  };
  
  if (messageId) {
    bot.editMessageText(message, {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    });
  } else {
    bot.sendMessage(chatId, message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    });
  }
  
  bot.answerCallbackQuery(callbackQueryId);
}

async function handleMyInfo(chatId: number, telegramId: string, user: any, callbackQueryId: string, messageId?: number) {
  if (!bot) return;
  // Refresh user data to get the latest coin balance
  const updatedUser = await storage.getUserByTelegramId(telegramId);
  if (!updatedUser) {
    bot.answerCallbackQuery(callbackQueryId, { text: 'User not found!' });
    return;
  }
  
  const transactions = await storage.getUserTransactions(updatedUser.id);
  const recentTransactions = transactions.slice(0, 5);
  
  let message = `👤 **Your Profile:**\n\n`;
  message += `🪙 **Coins:** ${updatedUser.coins}\n`;
  message += `🔢 **Referral Code:** ${updatedUser.referralCode}\n`;
  message += `📅 **Joined:** ${new Date(updatedUser.createdAt).toLocaleDateString()}\n`;
  
  if (updatedUser.lastDailyReward) {
    const canClaim = canClaimDailyReward(updatedUser.lastDailyReward);
    message += `🎁 **Daily Reward:** ${canClaim ? 'Available' : 'Claimed today'}\n`;
  } else {
    message += `🎁 **Daily Reward:** Available\n`;
  }
  
  if (recentTransactions.length > 0) {
    message += `\n📊 **Recent Transactions:**\n`;
    recentTransactions.forEach(tx => {
      const date = new Date(tx.createdAt).toLocaleDateString();
      const sign = tx.amount > 0 ? '+' : '';
      message += `${sign}${tx.amount} - ${tx.description} (${date})\n`;
    });
  }

  const keyboard = {
    inline_keyboard: [
      [
        { text: '🔙 Back to Menu', callback_data: 'back_to_menu' }
      ]
    ]
  };
  
  bot.editMessageText(message, {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: keyboard,
    parse_mode: 'Markdown'
  });
  
  bot.answerCallbackQuery(callbackQueryId);
}

async function handleEnterCode(chatId: number, telegramId: string, user: any, callbackQueryId: string, messageId?: number) {
  if (!bot) return;
  // Get referral reward from bot settings
  const referralRewardStr = (await storage.getBotSetting('referral_reward_amount'))?.value || '1';
  const referralReward = parseInt(referralRewardStr, 10);
  
  // Set user state to expect invitation code
  userStates.set(telegramId, { state: 'expecting_invite_code', timestamp: Date.now() });
  
  const message = `🎁 **Enter Invitation Code**

Please send me the invitation code to receive +${referralReward} coins bonus!

Type the code and send it as a message.`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: '🔙 Back to Menu', callback_data: 'back_to_menu' }
      ]
    ]
  };
  
  bot.editMessageText(message, {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: keyboard,
    parse_mode: 'Markdown'
  });
  
  bot.answerCallbackQuery(callbackQueryId);
}

async function handleRaffleEntry(chatId: number, telegramId: string, user: any, raffleId: number, callbackQueryId: string) {
  if (!bot) return;
  const raffle = await storage.getRaffleById(raffleId);
  if (!raffle) {
    bot.answerCallbackQuery(callbackQueryId, { text: 'Raffle not found!' });
    return;
  }
  
  if (user.coins < raffle.entryCost) {
    bot.answerCallbackQuery(callbackQueryId, { 
      text: `❌ Not enough coins! You need ${raffle.entryCost} coins to enter this raffle.`,
      show_alert: true
    });
    return;
  }
  
  await storage.updateUser(telegramId, { coins: user.coins - raffle.entryCost });
  await storage.enterRaffle({
    raffleId: raffle.id,
    userId: user.id,
    entries: 1,
  });
  
  await storage.updateRaffle(raffle.id, {
    currentEntries: raffle.currentEntries + 1,
  });
  
  await storage.createTransaction({
    userId: user.id,
    type: 'raffle_entry',
    amount: -raffle.entryCost,
    description: `Raffle entry: ${raffle.title}`,
  });
  
  bot.answerCallbackQuery(callbackQueryId, { 
    text: `🎪 Successfully entered raffle: ${raffle.title}! Remaining coins: ${user.coins - raffle.entryCost}`,
    show_alert: true
  });
}

async function handleShopPurchase(chatId: number, telegramId: string, user: any, itemId: number, callbackQueryId: string) {
  if (!bot) return;
  const item = await storage.getAllShopItems().then(items => items.find(i => i.id === itemId));
  if (!item) {
    bot.answerCallbackQuery(callbackQueryId, { text: 'Item not found!' });
    return;
  }
  
  if (user.coins < item.cost) {
    bot.answerCallbackQuery(callbackQueryId, { 
      text: `❌ Not enough coins! You need ${item.cost} coins to purchase this item.`,
      show_alert: true
    });
    return;
  }
  
  if (item.stock !== null && item.stock <= 0) {
    bot.answerCallbackQuery(callbackQueryId, { 
      text: '❌ This item is out of stock!',
      show_alert: true
    });
    return;
  }
  
  await storage.updateUser(telegramId, { coins: user.coins - item.cost });
  await storage.createPurchase({
    userId: user.id,
    itemId: item.id,
    quantity: 1,
    totalCost: item.cost,
    status: 'completed',
  });
  
  if (item.stock !== null) {
    await storage.updateShopItem(item.id, { stock: item.stock - 1 });
  }
  
  await storage.createTransaction({
    userId: user.id,
    type: 'shop_purchase',
    amount: -item.cost,
    description: `Shop purchase: ${item.name}`,
  });
  
  bot.answerCallbackQuery(callbackQueryId, { 
    text: `🛍️ Successfully purchased: ${item.name}! Remaining coins: ${user.coins - item.cost}`,
    show_alert: true
  });
}

async function handleBackToMenu(chatId: number, telegramId: string, user: any, callbackQueryId: string, messageId?: number) {
  if (!bot) return;
  // Clear any user state
  userStates.delete(telegramId);
  
  // Refresh user data to get the latest coin balance
  const updatedUser = await storage.getUserByTelegramId(telegramId);
  if (!updatedUser) {
    bot.answerCallbackQuery(callbackQueryId, { text: 'User not found!' });
    return;
  }
  
  // Get reward amounts from bot settings
  const dailyRewardStr = (await storage.getBotSetting('daily_reward_amount'))?.value || '1';
  const referralRewardStr = (await storage.getBotSetting('referral_reward_amount'))?.value || '1';
  const dailyRewardAmount = parseInt(dailyRewardStr, 10);
  const referralReward = parseInt(referralRewardStr, 10);
  
  const welcomeMessage = `🎉 Hello ${updatedUser.firstName || updatedUser.username}! Welcome to the Coin Reward System!

💰 **Current Balance:** ${updatedUser.coins} coins
🔥 **Consecutive Check-ins:** ${updatedUser.lastDailyReward ? '1' : '0'} days

**How to Earn Coins:**
• Daily check-in: ${dailyRewardAmount} coin${dailyRewardAmount > 1 ? 's' : ''}
• Invite friends: ${referralReward} coin${referralReward > 1 ? 's' : ''} per referral
• Use invitation codes: ${referralReward} coin${referralReward > 1 ? 's' : ''} bonus

Click buttons below to start earning!`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: canClaimDailyReward(updatedUser.lastDailyReward) ? '✅ Daily Check-in' : '✅ Daily Check-in (Completed)', callback_data: 'daily_checkin' }
      ],
      [
        { text: '🎪 Join Raffle', callback_data: 'view_raffles' },
        { text: '🛍️ Coin Shop', callback_data: 'view_shop' }
      ],
      [
        { text: `👥 Invite Friends (+${referralReward} coins each)`, callback_data: 'referral_link' }
      ],
      [
        { text: '💰 My Info', callback_data: 'my_info' },
        { text: `🎁 Enter Invitation Code (+${referralReward} coins)`, callback_data: 'enter_code' }
      ]
    ]
  };
  
  if (messageId) {
    bot.editMessageText(welcomeMessage, {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    });
  } else {
    bot.sendMessage(chatId, welcomeMessage, {
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    });
  }
  
  bot.answerCallbackQuery(callbackQueryId);
}

}

// Function to get bot instance
function getBot(): TelegramBot | null {
  return bot;
}

// Function to broadcast message to all users
async function broadcastMessage(message: string): Promise<{ success: number; failed: number }> {
  if (!bot) {
    throw new Error('Bot is not initialized');
  }

  const activeUsers = await storage.getActiveUsers();
  let success = 0;
  let failed = 0;

  // Send message to each user with a small delay to avoid rate limiting
  for (const user of activeUsers) {
    try {
      await bot.sendMessage(user.telegramId, `📢 **Announcement**\n\n${message}`, {
        parse_mode: 'Markdown'
      });
      success++;
      // Small delay to avoid hitting rate limits
      await new Promise(resolve => setTimeout(resolve, 50));
    } catch (error) {
      console.error(`Failed to send message to user ${user.telegramId}:`, error);
      failed++;
    }
  }

  return { success, failed };
}

// Initialize bot and export
export { initializeBot, bot, getBot, broadcastMessage };
