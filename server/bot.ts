// src/bot.ts  – fully self‑contained Telegram bot
import TelegramBot, { ReplyKeyboardMarkup } from 'node-telegram-bot-api';
import { storage } from './storage';
import { nanoid } from 'nanoid';

let bot: TelegramBot | null = null;

/* ──────────────────────────  Helpers  ────────────────────────── */

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

function generateReferralCode() {
  return nanoid(8).toUpperCase();
}

function pstDate(d = new Date()) {
  // UTC‑8
  return new Date(d.getTime() - 8 * 60 * 60 * 1000);
}
function samePstDay(a: Date, b: Date) {
  const aP = pstDate(a); const bP = pstDate(b);
  return (
    aP.getFullYear() === bP.getFullYear() &&
    aP.getMonth() === bP.getMonth() &&
    aP.getDate() === bP.getDate()
  );
}

/* ───────────────────  Initialise (webhook vs polling)  ────────────────── */

export async function initializeBot() {
  if (bot) {
    await bot.stopPolling().catch(() => {});
    bot.removeAllListeners();
    bot = null;
  }

  const token =
    (await storage.getBotSetting('bot_token'))?.value ||
    process.env.BOT_TOKEN ||
    process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    console.error('⚠️  BOT_TOKEN missing – set env var or DB setting');
    return null;
  }

  const isProd = process.env.NODE_ENV === 'production';
  const domain = process.env.RAILWAY_PUBLIC_DOMAIN || process.env.RAILWAY_STATIC_URL;

  bot = new TelegramBot(token, { polling: !isProd });

  if (isProd && domain) {
    const url = `https://${domain}/api/telegram-webhook`;
    await bot.setWebHook(url).catch((e) => console.error('Webhook error', e));
    console.log('✅ Webhook set:', url);
  } else {
    console.log('✅ Bot running in polling mode');
  }

  attachHandlers();
  return bot;
}

/* ──────────────────────  Core Handlers  ─────────────────────── */

function attachHandlers() {
  if (!bot) return;

  bot.on('polling_error', console.error);
  bot.on('error', console.error);

  /* Slash‑commands (still supported) */
  bot.onText(/^\/start(?:\s+(\S+))?/, (msg, match) => startCmd(msg, match?.[1]));
  bot.onText(/^\/daily$/, (m) => handleDaily(m.chat.id, m.from!.id.toString()));
  bot.onText(/^\/myinfo$/, (m) => handleInfo(m.chat.id, m.from!.id.toString()));
  bot.onText(/^\/shop$/, (m) => handleShop(m.chat.id, m.from!.id.toString()));
  bot.onText(/^\/raffle$/, (m) => handleRaffles(m.chat.id, m.from!.id.toString()));
  bot.onText(/^\/referral$/, (m) => handleReferral(m.chat.id, m.from!.id.toString()));
  bot.onText(/^\/entercode$/, (m) => promptInviteCode(m.chat.id, m.from!.id.toString()));

  /* Reply‑keyboard buttons → treat as virtual slash‑commands */
  bot.on('message', async (msg) => {
    if (!msg.text || msg.text.startsWith('/')) return; // slash handled above
    const { id: chatId } = msg.chat;
    const uid = msg.from!.id.toString();

    switch (msg.text) {
      case 'My Daily Reward':
        return handleDaily(chatId, uid);
      case 'My Info':
        return handleInfo(chatId, uid);
      case 'Shop Items':
        return handleShop(chatId, uid);
      case 'Join A Raffle':
        return handleRaffles(chatId, uid);
      case 'Invite A Friend':
        return handleReferral(chatId, uid);
      case 'Enter Invitation Code':
        return promptInviteCode(chatId, uid);
    }
  });
}

/* ───────────  Command Implementations  (trimmed for brevity) ─────────── */

async function startCmd(msg: TelegramBot.Message, referral?: string) {
  if (!bot) return;
  const chatId = msg.chat.id;
  const uid = msg.from!.id.toString();

  /* ── Upsert user ── */
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

  /* ── Handle referral bonus for fresh sign‑ups ── */
  if (referral && !user.referredBy) {
    const referrer = await storage.getUserByReferralCode(referral);
    if (referrer) {
      const reward = parseInt((await storage.getBotSetting('referral_reward_amount'))?.value ?? '1', 10);
      await storage.awardReward(referrer.telegramId, reward, 'referral', `Invited ${user.firstName || user.username}`);
      await storage.awardReward(uid, reward, 'referral', 'Referral welcome bonus');
      await storage.updateUser(uid, { referredBy: referral });
      user.coins += reward;
      bot.sendMessage(chatId, `🎉 Referral bonus: +${reward} coins!`);
    }
  }

  bot.sendMessage(
    chatId,
    `👋 Welcome${user.firstName ? ' ' + user.firstName : ''}! Select an option below.`,
    { reply_markup: kb.main }
  );
}

/* Daily reward */
async function handleDaily(chatId: number, uid: string) {
  if (!bot) return;
  const user = await storage.getUserByTelegramId(uid);
  if (!user) return bot.sendMessage(chatId, 'Please /start first');

  if (user.lastDailyReward && samePstDay(user.lastDailyReward, new Date())) {
    return bot.sendMessage(chatId, '⏰ You already claimed today. Come back tomorrow!');
  }

  const reward = parseInt((await storage.getBotSetting('daily_reward_amount'))?.value ?? '1', 10);
  const updated = await storage.claimDaily(uid, reward);
  bot.sendMessage(
    chatId,
    `🎁 Claimed ${reward} coin${reward > 1 ? 's' : ''}! Current streak: ${updated.streak} days.\nBalance: ${updated.coins}`,
    { reply_markup: kb.main }
  );
}

/* Info */
async function handleInfo(chatId: number, uid: string) {
  if (!bot) return;
  const user = await storage.getUserByTelegramId(uid);
  if (!user) return bot.sendMessage(chatId, 'Please /start first');

  const tx = await storage.getUserTransactions(user.id);
  const last5 = tx.slice(0, 5)
    .map(t => `${t.amount > 0 ? '+' : ''}${t.amount} – ${t.description}`)
    .join('\n') || 'None yet';

  bot.sendMessage(
    chatId,
    `🪙 Coins: ${user.coins}\nReferral code: ${user.referralCode}\n\nRecent transactions:\n${last5}`,
    { reply_markup: kb.main }
  );
}

/* Shop */
async function handleShop(chatId: number, uid: string) {
  if (!bot) return;
  const items = await storage.getActiveShopItems();
  if (!items.length) return bot.sendMessage(chatId, '🏪 Shop is empty', { reply_markup: kb.main });

  const msg = items
    .map((it, i) =>
      `${i + 1}. ${it.name} – ${it.cost} coins${it.stock !== null ? ` (stock ${it.stock})` : ''}`
    )
    .join('\n');

  bot.sendMessage(chatId, `🏪 Shop items:\n\n${msg}\n\n(Type the item number to buy)`, {
    reply_markup: kb.main,
  });
}

/* Raffles */
async function handleRaffles(chatId: number, uid: string) {
  if (!bot) return;
  const raffles = await storage.getActiveRaffles();
  if (!raffles.length) return bot.sendMessage(chatId, '🎪 No active raffles', { reply_markup: kb.main });

  const msg = raffles
    .map(
      (r, i) =>
        `${i + 1}. ${r.title}\n   Prize: ${r.prizeDescription}\n   Cost: ${r.entryCost} coins`
    )
    .join('\n\n');

  bot.sendMessage(chatId, `🎪 Raffles:\n\n${msg}\n\n(Type the raffle number to enter)`, {
    reply_markup: kb.main,
  });
}

/* Referral link */
async function handleReferral(chatId: number, uid: string) {
  if (!bot) return;
  const user = await storage.getUserByTelegramId(uid);
  if (!user) return;

  const reward = parseInt((await storage.getBotSetting('referral_reward_amount'))?.value ?? '1', 10);
  const me = await bot.getMe();
  const link = `https://t.me/${me.username}?start=${user.referralCode}`;

  bot.sendMessage(
    chatId,
    `🔗 Share this link: ${link}\nBoth of you earn ${reward} coin${reward > 1 ? 's' : ''}!`,
    { reply_markup: kb.main }
  );
}

/* Prompt invitation code */
function promptInviteCode(chatId: number, uid: string) {
  userStates.set(uid, { state: 'awaiting_code', timestamp: Date.now() });
  return bot?.sendMessage(chatId, 'Please send the invitation code now:', {
    reply_markup: kb.main,
  });
}

/* Handle free‑text after we prompt for code */
const userStates = new Map<string, { state: string; timestamp: number }>();

bot?.on('message', async (msg) => {
  if (!msg.text || msg.text.startsWith('/')) return;
  const uid = msg.from!.id.toString();
  const state = userStates.get(uid);
  if (!state || state.state !== 'awaiting_code') return;

  userStates.delete(uid);
  const code = msg.text.trim().toUpperCase();
  const user = await storage.getUserByTelegramId(uid);
  const owner = await storage.getUserByReferralCode(code);

  if (!owner || owner.id === user?.id) {
    return bot?.sendMessage(msg.chat.id, '❌ Invalid invitation code.', {
      reply_markup: kb.main,
    });
  }

  if (user?.referredBy) {
    return bot?.sendMessage(msg.chat.id, '❌ You already used a code.', {
      reply_markup: kb.main,
    });
  }

  const reward = parseInt((await storage.getBotSetting('referral_reward_amount'))?.value ?? '1', 10);
  await storage.awardReward(owner.telegramId, reward, 'referral', `Invited ${user!.username}`);
  const updated = await storage.awardReward(uid, reward, 'referral', 'Used invitation code');
  await storage.updateUser(uid, { referredBy: code });

  bot?.sendMessage(
    msg.chat.id,
    `✅ Code accepted! +${reward} coins.\nBalance: ${updated.coins}`,
    { reply_markup: kb.main }
  );
});

/* --------------------------------------------------------------------- */

export function getBot() {
  return bot;
}
