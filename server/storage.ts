/* ────────────────────────────────────────────────────────────────
   src/storage.ts – Database access layer (Drizzle ORM)
   ──────────────────────────────────────────────────────────────── */

import {
  users,
  admins,
  transactions,
  raffles,
  raffleEntries,
  shopItems,
  purchases,
  botSettings,
  type User,
  type InsertUser,
  type Admin,
  type InsertAdmin,
  type Transaction,
  type InsertTransaction,
  type Raffle,
  type InsertRaffle,
  type RaffleEntry,
  type InsertRaffleEntry,
  type ShopItem,
  type InsertShopItem,
  type Purchase,
  type InsertPurchase,
  type BotSetting,
  type InsertBotSetting,
} from '@shared/schema';
import { db } from './db';
import {
  eq,
  desc,
  asc,
  and,
  sum,
  count,
  avg,
  sql,
} from 'drizzle-orm';

/* ─────────────── Time helpers (PST) ─────────────── */

function toPST(date: Date): Date {
  const utc = date.getTime() + date.getTimezoneOffset() * 60_000;
  const pstOffset = -8 * 60 * 60_000; // UTC‑8
  return new Date(utc + pstOffset);
}

function canClaimDailyReward(last: Date | null): boolean {
  if (!last) return true;
  const nowPST = toPST(new Date());
  const todayPST = new Date(
    nowPST.getFullYear(),
    nowPST.getMonth(),
    nowPST.getDate()
  );
  const lastPST = toPST(last);
  const lastDayPST = new Date(
    lastPST.getFullYear(),
    lastPST.getMonth(),
    lastPST.getDate()
  );
  return todayPST.getTime() > lastDayPST.getTime();
}

/* ─────────────── Storage interface ─────────────── */

export interface IStorage {
  /* Users */
  getUserById(id: number): Promise<User | undefined>;
  getUserByTelegramId(tid: string): Promise<User | undefined>;
  getUserByReferralCode(code: string): Promise<User | undefined>;
  createUser(u: InsertUser): Promise<User>;
  updateUser(tid: string, patch: Partial<User>): Promise<User>;
  updateUserById(id: number, patch: Partial<User>): Promise<User>;
  getAllUsers(): Promise<User[]>;
  getUserStats(): Promise<{ totalUsers: number; activeUsers: number; totalCoins: number }>;
  awardReward(tid: string, amt: number, type: string, desc: string): Promise<User>;
  claimDaily(tid: string, amt: number): Promise<User>;

  /* Admins */
  getAdminByUsername(name: string): Promise<Admin | undefined>;
  createAdmin(a: InsertAdmin): Promise<Admin>;

  /* Transactions */
  createTransaction(t: InsertTransaction): Promise<Transaction>;
  getUserTransactions(uid: number): Promise<Transaction[]>;
  getAllTransactions(): Promise<Transaction[]>;

  /* Raffles */
  createRaffle(r: InsertRaffle): Promise<Raffle>;
  getAllRaffles(): Promise<Raffle[]>;
  getActiveRaffles(): Promise<Raffle[]>;
  getRaffleById(id: number): Promise<Raffle | undefined>;
  updateRaffle(id: number, patch: Partial<Raffle>): Promise<Raffle>;
  enterRaffle(e: InsertRaffleEntry): Promise<RaffleEntry>;
  getRaffleEntries(rid: number): Promise<any[]>;

  /* Shop */
  createShopItem(i: InsertShopItem): Promise<ShopItem>;
  getAllShopItems(): Promise<ShopItem[]>;
  getActiveShopItems(): Promise<ShopItem[]>;
  updateShopItem(id: number, patch: Partial<ShopItem>): Promise<ShopItem>;
  createPurchase(p: InsertPurchase): Promise<Purchase>;
  getUserPurchases(uid: number): Promise<Purchase[]>;

  /* Settings */
  getBotSetting(key: string): Promise<BotSetting | undefined>;
  setBotSetting(s: InsertBotSetting): Promise<BotSetting>;
  getSettings(): Promise<Record<string, any>>;
  updateSettings(up: Record<string, any>): Promise<void>;

  /* Dashboard / misc */
  getDashboardStats(): Promise<{
    totalUsers: number;
    totalCoins: number;
    activeRaffles: number;
    dailyLogins: number;
    recentUsers: User[];
  }>;
  getActiveUsers(): Promise<{ telegramId: string }[]>;
}

/* ─────────────── Implementation ─────────────── */

export class DatabaseStorage implements IStorage {
  /* ---------- Users ---------- */

  async getUserById(id: number) {
    const [u] = await db.select().from(users).where(eq(users.id, id));
    return u;
  }

  async getUserByTelegramId(tid: string) {
    const [u] = await db.select().from(users).where(eq(users.telegramId, tid));
    return u;
  }

  async getUserByReferralCode(code: string) {
    const [u] = await db.select().from(users).where(eq(users.referralCode, code));
    return u;
  }

  async createUser(u: InsertUser) {
    const [created] = await db.insert(users).values(u).returning();
    return created;
  }

  async updateUser(tid: string, patch: Partial<User>) {
    const [u] = await db
      .update(users)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(users.telegramId, tid))
      .returning();
    return u;
  }

  async updateUserById(id: number, patch: Partial<User>) {
    const [u] = await db
      .update(users)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return u;
  }

  async getAllUsers() {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getUserStats() {
    const [row] = await db
      .select({
        totalUsers: count(),
        activeUsers: sum(sql`CASE WHEN ${users.isActive} THEN 1 ELSE 0 END`),
        totalCoins: sum(users.coins),
      })
      .from(users);
    return {
      totalUsers: Number(row.totalUsers),
      activeUsers: Number(row.activeUsers),
      totalCoins: Number(row.totalCoins) || 0,
    };
  }

  async awardReward(tid: string, amount: number, type: string, description: string) {
    return db.transaction(async (tx) => {
      const [u] = await tx
        .select()
        .from(users)
        .where(eq(users.telegramId, tid))
        .for('update skip locked');
      if (!u) throw new Error('User not found');

      if (u.coins + amount < 0) throw new Error('Insufficient coins');

      const [updated] = await tx
        .update(users)
        .set({ coins: u.coins + amount, updatedAt: new Date() })
        .where(eq(users.id, u.id))
        .returning();

      await tx.insert(transactions).values({
        userId: u.id,
        type,
        amount,
        description,
        createdAt: new Date(),
      });

      return updated;
    });
  }

  async claimDaily(tid: string, amount: number) {
    return db.transaction(async (tx) => {
      const [u] = await tx
        .select()
        .from(users)
        .where(eq(users.telegramId, tid))
        .for('update skip locked');
      if (!u) throw new Error('User not found');
      if (!canClaimDailyReward(u.lastDailyReward)) throw new Error('Already claimed');

      /* streak logic */
      let newStreak = 1;
      if (u.lastDailyReward) {
        const diff = Math.floor(
          (toPST(new Date()).getTime() - toPST(u.lastDailyReward).getTime()) /
            86_400_000
        );
        newStreak = diff === 1 ? (u.streak ?? 0) + 1 : 1;
      }

      const [updated] = await tx
        .update(users)
        .set({
          coins: u.coins + amount,
          lastDailyReward: new Date(),
          streak: newStreak,
          updatedAt: new Date(),
        })
        .where(eq(users.id, u.id))
        .returning();

      await tx.insert(transactions).values({
        userId: u.id,
        type: 'daily_reward',
        amount,
        description: 'Daily reward',
      });

      return updated;
    });
  }

  /* ---------- Admins ---------- */

  async getAdminByUsername(username: string) {
    const [a] = await db.select().from(admins).where(eq(admins.username, username));
    return a;
  }

  async createAdmin(a: InsertAdmin) {
    const [created] = await db.insert(admins).values(a).returning();
    return created;
  }

  /* ---------- Transactions ---------- */

  async createTransaction(t: InsertTransaction) {
    const [trx] = await db.insert(transactions).values(t).returning();
    return trx;
  }

  async getUserTransactions(uid: number) {
    return db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, uid))
      .orderBy(desc(transactions.createdAt));
  }

  async getAllTransactions() {
    return db.select().from(transactions).orderBy(desc(transactions.createdAt));
  }

  /* ---------- Raffles ---------- */

  async createRaffle(r: InsertRaffle) {
    const [raffle] = await db.insert(raffles).values(r).returning();
    return raffle;
  }

  async getAllRaffles() {
    return db.select().from(raffles).orderBy(desc(raffles.createdAt));
  }

  async getActiveRaffles() {
    return db
      .select()
      .from(raffles)
      .where(and(eq(raffles.isActive, true), sql`${raffles.endDate} > NOW()`))
      .orderBy(asc(raffles.id));
  }

  async getRaffleById(id: number) {
    const [r] = await db.select().from(raffles).where(eq(raffles.id, id));
    return r;
  }

  async updateRaffle(id: number, patch: Partial<Raffle>) {
    const [r] = await db.update(raffles).set(patch).where(eq(raffles.id, id)).returning();
    return r;
  }

  async enterRaffle(e: InsertRaffleEntry) {
    const [entry] = await db.insert(raffleEntries).values(e).returning();
    return entry;
  }

  async getRaffleEntries(rid: number) {
    return db
      .select({
        id: raffleEntries.id,
        raffleId: raffleEntries.raffleId,
        userId: raffleEntries.userId,
        entries: raffleEntries.entries,
        createdAt: raffleEntries.createdAt,
        user: {
          id: users.id,
          username: users.username,
          firstName: users.firstName,
          lastName: users.lastName,
          telegramId: users.telegramId,
          coins: users.coins,
        },
      })
      .from(raffleEntries)
      .innerJoin(users, eq(raffleEntries.userId, users.id))
      .where(eq(raffleEntries.raffleId, rid))
      .orderBy(desc(raffleEntries.createdAt));
  }

  /* ---------- Shop ---------- */

  async createShopItem(i: InsertShopItem) {
    const [item] = await db.insert(shopItems).values(i).returning();
    return item;
  }

  async getAllShopItems() {
    return db.select().from(shopItems).orderBy(desc(shopItems.createdAt));
  }

  /** Order by ID ascending so numeric selection matches stable list */
  async getActiveShopItems() {
    return db
      .select()
      .from(shopItems)
      .where(eq(shopItems.isActive, true))
      .orderBy(asc(shopItems.id));
  }

  async updateShopItem(id: number, patch: Partial<ShopItem>) {
    const [item] = await db
      .update(shopItems)
      .set(patch)
      .where(eq(shopItems.id, id))
      .returning();
    return item;
  }

  async createPurchase(p: InsertPurchase) {
    const [purchase] = await db.insert(purchases).values(p).returning();
    return purchase;
  }

  async getUserPurchases(uid: number) {
    return db
      .select()
      .from(purchases)
      .where(eq(purchases.userId, uid))
      .orderBy(desc(purchases.createdAt));
  }

  /* ---------- Settings ---------- */

  async getBotSetting(key: string) {
    const [s] = await db.select().from(botSettings).where(eq(botSettings.key, key));
    return s;
  }

  async setBotSetting(s: InsertBotSetting) {
    const [updated] = await db
      .insert(botSettings)
      .values(s)
      .onConflictDoUpdate({
        target: botSettings.key,
        set: { value: s.value, updatedAt: new Date() },
      })
      .returning();
    return updated;
  }

  async getSettings() {
    const rows = await db.select().from(botSettings);
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  }

  async updateSettings(up: Record<string, any>) {
    for (const [k, v] of Object.entries(up)) {
      await this.setBotSetting({ key: k, value: v });
    }
  }

  /* ---------- Dashboard & misc ---------- */

  async getDashboardStats() {
    const [uStats] = await db
      .select({ totalUsers: count(), totalCoins: sum(users.coins) })
      .from(users);
    const [rStats] = await db
      .select({ activeRaffles: count() })
      .from(raffles)
      .where(and(eq(raffles.isActive, true), sql`${raffles.endDate} > NOW()`));
    const [dStats] = await db
      .select({ dailyLogins: count() })
      .from(users)
      .where(sql`${users.lastDailyReward} >= CURRENT_DATE`);

    const recent = await db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(10);

    return {
      totalUsers: Number(uStats.totalUsers),
      totalCoins: Number(uStats.totalCoins) || 0,
      activeRaffles: Number(rStats.activeRaffles),
      dailyLogins: Number(dStats.dailyLogins),
      recentUsers: recent,
    };
  }

  async getActiveUsers() {
    return db
      .select({ telegramId: users.telegramId })
      .from(users)
      .where(eq(users.isActive, true));
  }
}

/* ─────────────── Export singleton ─────────────── */

export const storage = new DatabaseStorage();
