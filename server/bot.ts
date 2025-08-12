import TelegramBot, { ReplyKeyboardMarkup } from 'node-telegram-bot-api';
import { nanoid } from 'nanoid';
import { storage } from './storage';

/* ─────────────── Globals ─────────────── */
let bot: TelegramBot | null = null;
const userStates = new Map<string, { state: 'awaiting_code'; timestamp: number }>();

export const getBot = () => bot;

/* ─────────────── BotFather menu (single source of truth) ─────────────── */
const COMMANDS = [
  { command: 'start',    description: 'Start / account intro' },
  { command: 'shop',     description: 'Open shop' },
  { command: 'raffle',   description: 'Join raffles' },
  { command: 'balance',  description: 'View balance' },
  { command: 'withdraw', description: 'Withdraw funds' },
  { command: 'help',     description: 'Help & commands' },
] as const;

/* ─────────────── Keyboard ─────────────── */
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

/* ─────────────── Utilities ─────────────── */
const generateReferralCode = () => nanoid(8).toUpperCase();

// Compare same calendar day in a specific timezone (DST-safe)
const isSameLocalDay = (a: Date | string | number, b: Date | string | number, tz = 'America/Vancouver') => {
  const fmt = (d: Date) => d.toLocaleString('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
  return fmt(new Date(a)) === fmt(new Date(b));
};

/* ─────────────── Initialization ─────────────── */
export async function initializeBot() {
  // cleanup on re-init
  if (bot) {
    try { await bot.deleteWebHook({ drop_pending_updates: true }); } catch {}
    try { await bot.stopPolling(); } catch {}
    bot.removeAllListeners();
    bot = null;
  }

  const token = (await storage.getBotSetting('bot_token'))?.value
    ?? process.env.BOT_TOKEN
    ?? process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    console.error('⚠️ BOT_TOKEN missing — set env or DB setting');
    return null;
  }

  bot = new TelegramBot(token, { polling: false });

  const isProd = process.env.NODE_ENV === 'production';
  if (isProd) {
    const base = process.env.WEBHOOK_URL
      || (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : undefined)
      || (process.env.RAILWAY_STATIC_URL ? `https://${process.env.RAILWAY_STATIC_URL}` : undefined);

    if (!base) {
      console.warn('⚠️ WEBHOOK_URL/RAILWAY_* not set. SetWebhook may fail.');
    }

    const url = `${base || ''}/telegram/webhook`;
    try {
      await bot.setWebHook(url, {
        secret_token: process.env.TELEGRAM_SECRET,
        drop_pending_updates: true,
      } as any);
      console.log('✅ Webhook set:', url);
    } catch (e) {
      console.error('setWebHook error:', e);
    }
  } else {
    try { await bot.deleteWebHook({ drop_pending_updates: true }); } catch {}
    bot.startPolling();
    console.log('✅ Polling mode (development)');
  }

  // Seed BotFather menus (all scopes)
  try {
    await bot.setMyCommands(COMMANDS as any);
    await bot.setMyCommands(COMMANDS as any, { scope: { type: 'all_private_chats' } as any });
    await bot.setMyCommands(COMMANDS as any, { scope: { type: 'all_group_chats' } as any });
  } catch (e) {
    console.error('setMyCommands error:', e);
  }

  attachHandlers();
  console.log('✅ Bot initialized and handlers attached');
  return bot;
}

/* ─────────────── Handler wiring (unified + aliases) ─────────────── */
function attachHandlers() {
  if (!bot) return;

  // Diagnostics
  bot.on('polling_error', (e) => console.error('polling_error:', e));
  bot.on('error', (e) => console.error('bot error:', e));
  bot.on('message', (msg) => {
    const ent = msg.entities?.find((e) => e.type === 'bot_command');
    if (!ent || typeof msg.text !== 'string') return;
    const { offset, length } = ent;
    const command = msg.text.slice(offset, offset + length);
    const payload = msg.text.slice(offset + length).trim();
    console.log('[CMD]', command, '| payload:', payload, '| chat:', msg.chat.type);
  });

  // Helper to register /cmd and /cmd@Bot with optional payload
  const onCmd = (name: string, fn: (msg: TelegramBot.Message, payload?: string) => any) => {
    const re = new RegExp(`^\\/${name}(?:@[\\w_]+)?(?:\\s+(.+))?$`, 'i');
    bot!.onText(re, (msg, m) => fn(msg, m?.[1]));
  };

  // Canonical commands
  onCmd('start', (msg, referral) => cmdStart(msg, referral));
  onCmd('shop', (m) => cmdShop(m.chat.id, m.from!.id.toString()));
  onCmd('raffle', (m) => cmdRaffles(m.chat.id, m.from!.id.toString()));
  onCmd('balance', (m) => cmdInfo(m.chat.id, m.from!.id.toString()));
  onCmd('withdraw', (m) => cmdWithdraw(m.chat.id, m.from!.id.toString()));
  onCmd('help', (m) => cmdHelp(m.chat.id));

  // Backwards-compatible aliases (old names)
  onCmd('raffles', (m) => cmdRaffles(m.chat.id, m.from!.id.toString()));
  onCmd('myinfo', (m) => cmdInfo(m.chat.id, m.from!.id.toString()));
  onCmd('cashout', (m) => cmdWithdraw(m.chat.id, m.from!.id.toString()));
  onCmd('redeem', (m) => cmdWithdraw(m.chat.id, m.from!.id.toString()));
  onCmd('daily', (m) => cmdDaily(m.chat.id, m.from!.id.toString()));
  onCmd('referral', (m) => cmdReferral(m.chat.id, m.from!.id.toString()));
  onCmd('entercode', (m) => promptInviteCode(m.chat.id, m.from!.id.toString()));

  // Reply keyboard actions
  bot!.on('message', async (msg) => {
    if (!msg.text) return;
    // Ignore commands here (already handled above)
    if (msg.entities?.some((e) => e.type === 'bot_command')) return;

    const chatId = msg.chat.id;
    const uid = msg.from!.id.toString();

    // Invitation code capture state
    const pending = userStates.get(uid);
    if (pending?.state === 'awaiting_code') {
      userStates.delete(uid);
      return handleInvitationCode(chatId, uid, msg.text.trim().toUpperCase());
    }

    switch (msg.text) {
      case 'My Daily Reward': return cmdDaily(chatId, uid);
      case 'My Info': return cmdInfo(chatId, uid);
      case 'Shop Items': return cmdShop(chatId, uid);
      case 'Join A Raffle': return cmdRaffles(chatId, uid);
      case 'Invite A Friend': return cmdReferral(chatId, uid);
      case 'Enter Invitation Code': return promptInviteCode(chatId, uid);
      default: return;
    }
  });
}

/* ─────────────── Commands ─────────────── */
async function cmdStart(msg: TelegramBot.Message, referral?: string) {
  if (!bot) return;
  const chatId = msg.chat.id;
  const uid = msg.from!.id.toString();

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

  if (referral && !user.referredBy) {
    const referrer = await storage.getUserByReferralCode(referral);
    if (referrer) {
      const reward = +((await storage.getBotSetting('referral_reward_amount'))?.value || 1);
      await storage.awardReward(referrer.telegramId, reward, 'referral', `Invited ${user.username ?? uid}`);
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

  if (user.lastDailyReward && isSameLocalDay(user.lastDailyReward, new Date())) {
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
    .map((t: any) => `${t.amount > 0 ? '+' : ''}${t.amount} – ${t.description}`)
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
    .map((it: any, i: number) => `${i + 1}. ${it.name} – ${it.cost} coins${it.stock !== null ? ` (stock ${it.stock})` : ''}`)
    .join('\n');

  bot.sendMessage(chatId, `🏪 Items:\n\n${body}\n\n(type item number to buy)`, { reply_markup: kb.main });
}

async function cmdRaffles(chatId: number, uid: string) {
  if (!bot) return;
  const raffles = await storage.getActiveRaffles();
  if (!raffles.length) return bot.sendMessage(chatId, '🎪 No active raffles.', { reply_markup: kb.main });

  const body = raffles
    .map((r: any, i: number) => `${i + 1}. ${r.title}\n   Prize: ${r.prizeDescription}\n   Cost: ${r.entryCost} coins`)
    .join('\n\n');

  bot.sendMessage(chatId, `🎪 Raffles:\n\n${body}\n\n(type raffle number to enter)`, { reply_markup: kb.main });
}

async function cmdReferral(chatId: number, uid: string) {
  if (!bot) return;
  const user = await storage.getUserByTelegramId(uid);
  if (!user) return;

  const reward = +((await storage.getBotSetting('referral_reward_amount'))?.value || 1);
  const me = await bot.getMe();
  const link = `https://t.me/${me.username}?start=${user.referralCode}`;

  bot.sendMessage(chatId, `🔗 Share: ${link}\nBoth of you earn ${reward} coin${reward > 1 ? 's' : ''}!`, { reply_markup: kb.main });
}

function promptInviteCode(chatId: number, uid: string) {
  userStates.set(uid, { state: 'awaiting_code', timestamp: Date.now() });
  return bot?.sendMessage(chatId, 'Please send the invitation code:', { reply_markup: kb.main });
}

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
  await storage.awardReward(owner.telegramId, reward, 'referral', `Invited ${user.username ?? uid}`);
  const updated = await storage.awardReward(uid, reward, 'referral', 'Used invitation code');
  await storage.updateUser(uid, { referredBy: code });

  bot.sendMessage(chatId, `✅ Code accepted! +${reward} coins.\nBalance: ${updated.coins}`, { reply_markup: kb.main });
}

async function cmdWithdraw(chatId: number, uid: string) {
  // Placeholder — wire to your real withdrawal flow if available
  return bot?.sendMessage(
    chatId,
    '💵 Withdrawal: use the Shop to redeem or contact support. (You can alias /cashout and /redeem to this.)',
    { reply_markup: kb.main },
  );
}

function cmdHelp(chatId: number) {
  const lines = [
    '/start — Start / account intro',
    '/shop — Open shop',
    '/raffle — Join raffles',
    '/balance — View balance (also: /myinfo)',
    '/withdraw — Withdraw funds (also: /cashout, /redeem)',
    '/daily — Claim daily reward',
    '/referral — Your invite link',
    '/entercode — Enter invitation code',
  ];
  return bot?.sendMessage(chatId, `📖 Help\n\n${lines.join('\n')}`, { reply_markup: kb.main });
}

/* ─────────────── Broadcast helper (used by /api/broadcast) ─────────────── */
export async function broadcastMessage(message: string) {
  if (!bot) throw new Error('Bot is not initialized');
  const users = await storage.getAllUsers();
  const targets = users.filter((u: any) => u.telegramId);
  let success = 0, failed = 0;
  for (const u of targets) {
    try {
      await bot.sendMessage(u.telegramId, message, { parse_mode: 'Markdown' });
      success++;
      await new Promise((r) => setTimeout(r, 50)); // rate-limit
    } catch {
      failed++;
    }
  }
  return { success, failed };
}
