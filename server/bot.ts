// ────────────────────────────────────────────────────────────────
// src/bot.ts   – single, self‑contained Telegram bot module
// ────────────────────────────────────────────────────────────────
import TelegramBot, { ReplyKeyboardMarkup } from 'node-telegram-bot-api';
import { nanoid } from 'nanoid';
import { storage } from './storage';

/* ─────────────── Globals ─────────────── */

let bot: TelegramBot | null = null;

/** Ephemeral per‑user state (for the invitation‑code prompt) */
const userStates = new Map<string, { state: 'awaiting_code'; timestamp: number }>();

/* ─────────────── Helper utilities ─────────────── */

const kb = {
  main: <ReplyKeyboardMarkup>{
    keyboard: [
      ['My Daily Reward', 'My Info'],
      ['Shop Items', 'Join A Raffle'],
      ['Invite A Friend', 'Enter Invitation Code'],
    ],
    resize_keyboard: true,
    one_time_keyboard: false,
  },
};

const generateReferralCode = () => nanoid(8).toUpperCase();

const pst = (d = new Date()) => new Date(d.getTime() - 8 * 60 * 60 * 1000);
const isSamePstDay = (a: Date, b: Date) => {
  const A = pst(a),
    B = pst(b);
  return A.getFullYear() === B.getFullYear() &&
    A.getMonth() === B.getMonth() &&
    A.getDate() === B.getDate();
};

/* ─────────────── Boot‑strapping ─────────────── */

/**
 * Call this once during server start‑up (index.ts).
 */
export async function initializeBot() {
  /* clean up any previous instance (hot‑reload etc.) */
  if (bot) {
    await bot.stopPolling().catch(() => {});
    bot.removeAllListeners();
    bot = null;
  }

  const BOT_TOKEN =
    (await storage.getBotSetting('bot_token'))?.value ||
    process.env.BOT_TOKEN ||
    process.env.TELEGRAM_BOT_TOKEN;

  if (!BOT_TOKEN) {
    console.error('⚠️  BOT_TOKEN missing – set it as an env var or DB setting');
    return null;
  }

  const isProd = process.env.NODE_ENV === 'production';
  const publicDomain = process.env.RAILWAY_PUBLIC_DOMAIN || process.env.RAILWAY_STATIC_URL;

  /* Create bot instance (polling in dev, webhook in prod) */
  bot = new TelegramBot(BOT_TOKEN, { polling: !isProd });

  if (isProd && publicDomain) {
    const webhookUrl = `https://${publicDomain}/api/telegram-webhook`;
    await bot.setWebHook(webhookUrl).catch((e) => console.error('Webhook error', e));
    console.log('✅ Webhook set:', webhookUrl);
  } else {
    console.log('✅ Bot running in polling mode');
  }

  attachHandlers();
  return bot;
}

/** Export for the rest of the server to grab the live instance */
export const getBot = () => bot;

/* ───────────────  Handlers  ─────────────── */

function attachHandlers() {
  if (!bot) return;

  bot.on('polling_error', console.error);
  bot.on('error', console.error);

  /* Slash commands (still allowed) */
  bot.onText(/^\/start(?:\s+(\S+))?/, (msg, m) => cmdStart(msg, m?.[1]));
  bot.onText(/^\/daily$/, (m) => cmdDaily(m.chat.id, m.from!.id.toString()));
  bot.onText(/^\/myinfo$/, (m) => cmdInfo(m.chat.id, m.from!.id.toString()));
  bot.onText(/^\/shop$/, (m) => cmdShop(m.chat.id, m.from!.id.toString()));
  bot.onText(/^\/raffle$/, (m) => cmdRaffles(m.chat.id, m.from!.id.toString()));
  bot.onText(/^\/referral$/, (m) => cmdReferral(m.chat.id, m.from!.id.toString()));
  bot.onText(/^\/entercode$/, (m) => promptInviteCode(m.chat.id, m.from!.id.toString()));

  /* One single message handler for ALL text – buttons + invite‑code */
  bot.on('message', async (msg) => {
    if (!msg.text) return; // ignore photos, stickers, etc.

    const chatId = msg.chat.id;
    const uid = msg.from!.id.toString();

    /* 1️⃣  Were we waiting for an invitation code from this user? */
    const pending = userStates.get(uid);
    if (pending?.state === 'awaiting_code' && !msg.text.startsWith('/')) {
      userStates.delete(uid);
      return handleInvitationCode(chatId, uid, msg.text.trim().toUpperCase());
    }

    /* 2️⃣  Otherwise treat as reply‑keyboard button press */
    switch (msg.text) {
      case 'My Daily Reward':
        return cmdDaily(chatId, uid);
      case 'My Info':
        return cmdInfo(chatId, uid);
      case 'Shop Items':
        return cmdShop(chatId, uid);
      case 'Join A Raffle':
        return cmdRaffles(chatId, uid);
      case 'Invite A Friend':
        return cmdReferral(chatId, uid);
      case 'Enter Invitation Code':
        return promptInviteCode(chatId, uid);
      default:
        return; // ignore other free‑text
    }
  });
}

/* ───────────────  Command implementations  ─────────────── */

async function cmdStart(msg: TelegramBot.Message, referral?: string) {
  if (!bot) return;
  const chatId = msg.chat.id;
  const uid = msg.from!.id.toString();

  /* Upsert user */
  let user = await storage.getUserByTelegramId(uid);
  if (!user) {
    user = await storage.createUser({
      telegramId: uid,
      username: msg.from!.username || null,
      firstName: msg.from!.first_name || null,
      lastName: msg.from!.last_name || null,
      referralCode: generateReferralCode(),
      referredBy: referral || null,
      coins: 0,
    });
  }

  /* Referral bonus (first time only) */
  if (referral && !user.referredBy) {
    const referrer = await storage.getUserByReferralCode(referral);
    if (referrer) {
      const reward = +((await storage.getBotSetting('referral_reward_amount'))?.value || 1);
      await storage.awardReward(referrer.telegramId, reward, 'referral', `Invited ${user.username}`);
      await storage.awardReward(uid, reward, 'referral', 'Referral welcome bonus');
      await storage.updateUser(uid, { referredBy: referral });
      user.coins += reward;
      bot.sendMessage(chatId, `🎉 Referral bonus: +${reward} coins!`);
    }
  }

  bot.sendMessage(
    chatId,
    `👋 Welcome${user.firstName ? ` ${user.firstName}` : ''}! Choose an option below.`,
    { reply_markup: kb.main },
  );
}

async function cmdDaily(chatId: number, uid: string) {
  if (!bot) return;
  const user = await storage.getUserByTelegramId(uid);
  if (!user) return bot.sendMessage(chatId, 'Please /start first');

  if (user.lastDailyReward && isSamePstDay(user.lastDailyReward, new Date())) {
    return bot.sendMessage(chatId, '⏰ Already claimed today. Come back tomorrow!');
  }

  const reward = +((await storage.getBotSetting('daily_reward_amount'))?.value || 1);
  const updated = await storage.claimDaily(uid, reward);

  bot.sendMessage(
    chatId,
    `🎁 +${reward} coin${reward > 1 ? 's' : ''}!\nStreak: ${updated.streak} days\nBalance: ${updated.coins}`,
    { reply_markup: kb.main },
  );
}

async function cmdInfo(chatId: number, uid: string) {
  if (!bot) return;
  const user = await storage.getUserByTelegramId(uid);
  if (!user) return;

  const txs = await storage.getUserTransactions(user.id);
  const recent = txs
    .slice(0, 5)
    .map((t) => `${t.amount > 0 ? '+' : ''}${t.amount} – ${t.description}`)
    .join('\n') || 'None yet';

  bot.sendMessage(
    chatId,
    `🪙 Coins: ${user.coins}\nReferral code: ${user.referralCode}\n\nRecent transactions:\n${recent}`,
    { reply_markup: kb.main },
  );
}

async function cmdShop(chatId: number, uid: string) {
  if (!bot) return;
  const items = await storage.getActiveShopItems();
  if (!items.length) return bot.sendMessage(chatId, '🏪 Shop is empty.', { reply_markup: kb.main });

  const body = items
    .map(
      (it, i) =>
        `${i + 1}. ${it.name} – ${it.cost} coins${it.stock !== null ? ` (stock ${it.stock})` : ''}`,
    )
    .join('\n');

  bot.sendMessage(chatId, `🏪 Items:\n\n${body}\n\n(type item number to buy)`, {
    reply_markup: kb.main,
  });
}

async function cmdRaffles(chatId: number, uid: string) {
  if (!bot) return;
  const raffles = await storage.getActiveRaffles();
  if (!raffles.length) return bot.sendMessage(chatId, '🎪 No active raffles.', { reply_markup: kb.main });

  const body = raffles
    .map(
      (r, i) =>
        `${i + 1}. ${r.title}\n   Prize: ${r.prizeDescription}\n   Cost: ${r.entryCost} coins`,
    )
    .join('\n\n');

  bot.sendMessage(chatId, `🎪 Raffles:\n\n${body}\n\n(type raffle number to enter)`, {
    reply_markup: kb.main,
  });
}

async function cmdReferral(chatId: number, uid: string) {
  if (!bot) return;
  const user = await storage.getUserByTelegramId(uid);
  if (!user) return;

  const reward = +((await storage.getBotSetting('referral_reward_amount'))?.value || 1);
  const me = await bot.getMe();
  const link = `https://t.me/${me.username}?start=${user.referralCode}`;

  bot.sendMessage(
    chatId,
    `🔗 Share: ${link}\nBoth of you earn ${reward} coin${reward > 1 ? 's' : ''}!`,
    { reply_markup: kb.main },
  );
}

/* Prompt invitation code (stores state) */
function promptInviteCode(chatId: number, uid: string) {
  userStates.set(uid, { state: 'awaiting_code', timestamp: Date.now() });
  return bot?.sendMessage(chatId, 'Please send the invitation code:', { reply_markup: kb.main });
}

/* Handle the code the user typed */
async function handleInvitationCode(chatId: number, uid: string, code: string) {
  if (!bot) return;
  const user = await storage.getUserByTelegramId(uid);
  if (!user) return;

  const owner = await storage.getUserByReferralCode(code);
  if (!owner || owner.id === user.id) {
    return bot.sendMessage(chatId, '❌ Invalid invitation code.', { reply_markup: kb.main });
  }
  if (user.referredBy) {
    return bot.sendMessage(chatId, '❌ You already used a code.', { reply_markup: kb.main });
  }

  const reward = +((await storage.getBotSetting('referral_reward_amount'))?.value || 1);
  await storage.awardReward(owner.telegramId, reward, 'referral', `Invited ${user.username}`);
  const updated = await storage.awardReward(uid, reward, 'referral', 'Used invitation code');
  await storage.updateUser(uid, { referredBy: code });

  bot.sendMessage(
    chatId,
    `✅ Code accepted! +${reward} coins.\nBalance: ${updated.coins}`,
    { reply_markup: kb.main },
  );
}

/* ───────────────────────  Broadcast utility  ─────────────────────── */

export async function broadcastMessage(message: string) {
  if (!bot) throw new Error('Bot not initialised');

  const users = await storage.getActiveUsers();
  let ok = 0,
    fail = 0;

  for (const u of users) {
    try {
      await bot.sendMessage(u.telegramId, `📢 ${message}`);
      ok++;
      await new Promise((r) => setTimeout(r, 50)); // tiny delay to avoid spam
    } catch (e) {
      console.error('Broadcast error to', u.telegramId, e);
      fail++;
    }
  }
  return { success: ok, failed: fail };
}
