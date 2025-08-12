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
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sum, count, sql, avg } from "drizzle-orm";

/* ─────────────── Time helpers (America/Vancouver) ─────────────── */
const sameLocalDay = (a: Date | string, b: Date | string, tz = "America/Vancouver") => {
  const fmt = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: tz });
  return fmt(new Date(a)) === fmt(new Date(b));
};

/* ─────────────── Storage Interface ─────────────── */
export interface IStorage {
  // Users
  getUserById(id: number): Promise<User | undefined>;
  getUserByTelegramId(telegramId: string): Promise<User | undefined>;
  getUserByReferralCode(referralCode: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(telegramId: string, updates: Partial<User>): Promise<User>;
  updateUserById(id: number, updates: Partial<User>): Promise<User>;
  getAllUsers(): Promise<User[]>;
  getUserStats(): Promise<{ totalUsers: number; activeUsers: number; totalCoins: number }>;
  awardReward(telegramId: string, amount: number, type: string, description: string): Promise<User>;
  claimDaily(telegramId: string, amount: number): Promise<User>;

  // Admins
  getAdminByUsername(username: string): Promise<Admin | undefined>;
  createAdmin(admin: InsertAdmin): Promise<Admin>;

  // Transactions
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getUserTransactions(userId: number): Promise<Transaction[]>;
  getAllTransactions(): Promise<Transaction[]>;

  // Raffles
  createRaffle(raffle: InsertRaffle): Promise<Raffle>;
  getAllRaffles(): Promise<Raffle[]>;
  getActiveRaffles(): Promise<Raffle[]>;
  getRaffleById(id: number): Promise<Raffle | undefined>;
  updateRaffle(id: number, updates: Partial<Raffle>): Promise<Raffle>;
  enterRaffle(entry: InsertRaffleEntry): Promise<RaffleEntry>;
  getRaffleEntries(raffleId: number): Promise<any[]>;

  // Shop
  createShopItem(item: InsertShopItem): Promise<ShopItem>;
  getAllShopItems(): Promise<ShopItem[]>;
  getActiveShopItems(): Promise<ShopItem[]>;
  updateShopItem(id: number, updates: Partial<ShopItem>): Promise<ShopItem>;
  createPurchase(purchase: InsertPurchase): Promise<Purchase>;
  getUserPurchases(userId: number): Promise<Purchase[]>;

  // Settings
  getBotSetting(key: string): Promise<BotSetting | undefined>;
  setBotSetting(setting: InsertBotSetting): Promise<BotSetting>;
  getSettings(): Promise<Record<string, any>>;
  updateSettings(updates: Record<string, any>): Promise<void>;

  // Dashboard
  getDashboardStats(): Promise<{
    totalUsers: number;
    totalCoins: number;
    activeRaffles: number;
    dailyLogins: number;
    recentUsers: User[];
  }>;

  // Misc
  resetAllUserPoints(): Promise<void>;
  updateOnboardingProgress(telegramId: string, step: number, progress: Record<string, any>): Promise<User | null>;
  completeOnboarding(telegramId: string): Promise<User | null>;
  getOnboardingStats(): Promise<{ totalUsers: number; completedOnboarding: number; averageStep: number }>;
  hasClaimedTutorialBonus(telegramId: string): Promise<boolean>;
  getActiveUsers(): Promise<{ telegramId: string }[]>;
}

/* ─────────────── Implementation ─────────────── */
export class DatabaseStorage implements IStorage {
  // Users
  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByTelegramId(telegramId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.telegramId, telegramId));
    return user || undefined;
  }

  async getUserByReferralCode(referralCode: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.referralCode, referralCode));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(telegramId: string, updates: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.telegramId, telegramId))
      .returning();
    return user;
  }

  async updateUserById(id: number, updates: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getUserStats(): Promise<{ totalUsers: number; activeUsers: number; totalCoins: number }> {
    const [stats] = await db
      .select({
        totalUsers: count(),
        activeUsers: sum(sql`CASE WHEN ${users.isActive} THEN 1 ELSE 0 END`),
        totalCoins: sum(users.coins),
      })
      .from(users);

    return {
      totalUsers: Number(stats.totalUsers ?? 0),
      activeUsers: Number(stats.activeUsers ?? 0),
      totalCoins: Number(stats.totalCoins ?? 0),
    };
  }

  async awardReward(telegramId: string, amount: number, type: string, description: string): Promise<User> {
    return db.transaction(async (tx) => {
      const [user] = await tx.select().from(users).where(eq(users.telegramId, telegramId));
      if (!user) throw new Error("User not found");

      const newCoins = (user.coins ?? 0) + amount;
      if (newCoins < 0) throw new Error("Insufficient coins");

      const [updatedUser] = await tx
        .update(users)
        .set({ coins: newCoins, updatedAt: new Date() })
        .where(eq(users.telegramId, telegramId))
        .returning();

      await tx.insert(transactions).values({
        userId: updatedUser.id,
        type,
        amount,
        description,
        createdAt: new Date(),
      });

      return updatedUser;
    });
  }

  async claimDaily(telegramId: string, amount: number): Promise<User> {
    return db.transaction(async (tx) => {
      const [user] = await tx.select().from(users).where(eq(users.telegramId, telegramId));
      if (!user) throw new Error("User not found");

      // Prevent double-claim (America/Vancouver day)
      if (user.lastDailyReward && sameLocalDay(user.lastDailyReward, new Date())) {
        throw new Error("Already claimed");
      }

      // Streak logic: +1 if last claim was exactly yesterday (local), else reset
      let newStreak = 1;
      if (user.lastDailyReward) {
        const last = new Date(user.lastDailyReward);
        const dToday = new Date(new Date().toLocaleDateString("en-CA", { timeZone: "America/Vancouver" }));
        const dLast = new Date(last.toLocaleDateString("en-CA", { timeZone: "America/Vancouver" }));
        const diffDays = Math.round((dToday.getTime() - dLast.getTime()) / 86400000);
        newStreak = diffDays === 1 ? (user.streak || 0) + 1 : 1;
      }

      const [updated] = await tx
        .update(users)
        .set({
          coins: (user.coins ?? 0) + amount,
          lastDailyReward: new Date(),
          streak: newStreak,
          updatedAt: new Date(),
        })
        .where(eq(users.telegramId, telegramId))
        .returning();

      await tx.insert(transactions).values({
        userId: updated.id,
        type: "daily_reward",
        amount,
        description: "Daily reward",
      });

      return updated;
    });
  }

  // Admins
  async getAdminByUsername(username: string): Promise<Admin | undefined> {
    const [admin] = await db.select().from(admins).where(eq(admins.username, username));
    return admin || undefined;
  }

  async createAdmin(insertAdmin: InsertAdmin): Promise<Admin> {
    const [admin] = await db.insert(admins).values(insertAdmin).returning();
    return admin;
  }

  // Transactions
  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const [transaction] = await db.insert(transactions).values(insertTransaction).returning();
    return transaction;
  }

  async getUserTransactions(userId: number): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt));
  }

  async getAllTransactions(): Promise<Transaction[]> {
    return await db.select().from(transactions).orderBy(desc(transactions.createdAt));
  }

  // Raffles
  async createRaffle(insertRaffle: InsertRaffle): Promise<Raffle> {
    const [raffle] = await db.insert(raffles).values(insertRaffle).returning();
    return raffle;
  }

  async getAllRaffles(): Promise<Raffle[]> {
    return await db.select().from(raffles).orderBy(desc(raffles.createdAt));
  }

  async getActiveRaffles(): Promise<Raffle[]> {
    return await db
      .select()
      .from(raffles)
      .where(and(eq(raffles.isActive, true), sql`${raffles.endDate} > NOW()`))
      .orderBy(desc(raffles.createdAt));
  }

  async getRaffleById(id: number): Promise<Raffle | undefined> {
    const [raffle] = await db.select().from(raffles).where(eq(raffles.id, id));
    return raffle || undefined;
  }

  async updateRaffle(id: number, updates: Partial<Raffle>): Promise<Raffle> {
    const [raffle] = await db
      .update(raffles)
      .set(updates)
      .where(eq(raffles.id, id))
      .returning();
    return raffle;
  }

  async enterRaffle(insertEntry: InsertRaffleEntry): Promise<RaffleEntry> {
    const [entry] = await db.insert(raffleEntries).values(insertEntry).returning();
    return entry;
  }

  async getRaffleEntries(raffleId: number): Promise<any[]> {
    return await db
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
      .where(eq(raffleEntries.raffleId, raffleId))
      .orderBy(desc(raffleEntries.createdAt));
  }

  // Shop
  async createShopItem(insertItem: InsertShopItem): Promise<ShopItem> {
    const [item] = await db.insert(shopItems).values(insertItem).returning();
    return item;
  }

  async getAllShopItems(): Promise<ShopItem[]> {
    return await db.select().from(shopItems).orderBy(desc(shopItems.createdAt));
  }

  async getActiveShopItems(): Promise<ShopItem[]> {
    return await db
      .select()
      .from(shopItems)
      .where(eq(shopItems.isActive, true))
      .orderBy(desc(shopItems.createdAt));
  }

  async updateShopItem(id: number, updates: Partial<ShopItem>): Promise<ShopItem> {
    const [item] = await db
      .update(shopItems)
      .set(updates)
      .where(eq(shopItems.id, id))
      .returning();
    return item;
  }

  async createPurchase(insertPurchase: InsertPurchase): Promise<Purchase> {
    const [purchase] = await db.insert(purchases).values(insertPurchase).returning();
    return purchase;
  }

  async getUserPurchases(userId: number): Promise<Purchase[]> {
    return await db
      .select()
      .from(purchases)
      .where(eq(purchases.userId, userId))
      .orderBy(desc(purchases.createdAt));
  }

  // Settings
  async getBotSetting(key: string): Promise<BotSetting | undefined> {
    const [setting] = await db.select().from(botSettings).where(eq(botSettings.key, key));
    return setting || undefined;
  }

  async setBotSetting(insertSetting: InsertBotSetting): Promise<BotSetting> {
    const [setting] = await db
      .insert(botSettings)
      .values(insertSetting)
      .onConflictDoUpdate({
        target: botSettings.key,
        set: { value: insertSetting.value, updatedAt: new Date() },
      })
      .returning();
    return setting;
  }

  async getDashboardStats(): Promise<{
    totalUsers: number;
    totalCoins: number;
    activeRaffles: number;
    dailyLogins: number;
    recentUsers: User[];
  }> {
    const [userStats] = await db
      .select({ totalUsers: count(), totalCoins: sum(users.coins) })
      .from(users);

    const [raffleStats] = await db
      .select({ activeRaffles: count() })
      .from(raffles)
      .where(and(eq(raffles.isActive, true), sql`${raffles.endDate} > NOW()`));

    // NOTE: DB-local day; adjust if you store TZ-aware timestamps.
    const [dailyStats] = await db
      .select({ dailyLogins: count() })
      .from(users)
      .where(sql`${users.lastDailyReward} >= CURRENT_DATE`);

    const recentUsers = await db.select().from(users).orderBy(desc(users.createdAt)).limit(10);

    return {
      totalUsers: Number(userStats.totalUsers ?? 0),
      totalCoins: Number(userStats.totalCoins ?? 0),
      activeRaffles: Number(raffleStats.activeRaffles ?? 0),
      dailyLogins: Number(dailyStats.dailyLogins ?? 0),
      recentUsers,
    };
  }

  async getSettings(): Promise<Record<string, any>> {
    const settingsList = await db.select().from(botSettings);
    const settings: Record<string, any> = {};
    for (const s of settingsList) settings[s.key] = s.value;
    return settings;
  }

  async updateSettings(updates: Record<string, any>): Promise<void> {
    for (const [key, value] of Object.entries(updates)) {
      await this.setBotSetting({ key, value });
    }
  }

  async resetAllUserPoints(): Promise<void> {
    await db.transaction(async (tx) => {
      const allUsers = await tx.select().from(users);
      for (const user of allUsers) {
        if ((user.coins ?? 0) > 0) {
          await tx.insert(transactions).values({
            userId: user.id,
            type: 'admin_adjustment',
            amount: -(user.coins ?? 0),
            description: 'Admin reset all user points',
          });
        }
      }
      await tx.update(users).set({ coins: 0 }).where(sql`1=1`);
    });
  }

  async updateOnboardingProgress(telegramId: string, step: number, progress: Record<string, any>): Promise<User | null> {
    const [user] = await db
      .update(users)
      .set({ onboardingStep: step, tutorialProgress: progress, updatedAt: new Date() })
      .where(eq(users.telegramId, telegramId))
      .returning();
    return user || null;
  }

  async completeOnboarding(telegramId: string): Promise<User | null> {
    const [user] = await db
      .update(users)
      .set({ onboardingCompleted: true, onboardingStep: 0, updatedAt: new Date() })
      .where(eq(users.telegramId, telegramId))
      .returning();
    return user || null;
  }

  async getOnboardingStats(): Promise<{ totalUsers: number; completedOnboarding: number; averageStep: number }> {
    const [stats] = await db
      .select({
        totalUsers: count(),
        completedOnboarding: count(sql`CASE WHEN ${users.onboardingCompleted} = true THEN 1 END`),
        averageStep: avg(users.onboardingStep),
      })
      .from(users);

    return {
      totalUsers: Number(stats.totalUsers ?? 0),
      completedOnboarding: Number(stats.completedOnboarding ?? 0),
      averageStep: Math.round(Number(stats.averageStep ?? 0)),
    };
  }

  async hasClaimedTutorialBonus(telegramId: string): Promise<boolean> {
    const [u] = await db.select().from(users).where(eq(users.telegramId, telegramId));
    if (!u) return false;
    const rows = await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.userId, u.id), eq(transactions.type, 'onboarding')))
      .limit(1);
    return rows.length > 0;
  }

  async getActiveUsers(): Promise<{ telegramId: string }[]> {
    return await db.select({ telegramId: users.telegramId }).from(users).where(eq(users.isActive, true));
  }
}

export const storage = new DatabaseStorage();
