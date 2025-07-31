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
  type InsertBotSetting
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sum, count, sql, avg } from "drizzle-orm";

// Helper function to convert date to PST
function toPST(date: Date): Date {
  // Create a new date with PST offset (-8 hours from UTC, or -7 during daylight saving)
  const utcTime = date.getTime() + date.getTimezoneOffset() * 60000;
  const pstOffset = -8 * 60 * 60000; // PST is UTC-8
  return new Date(utcTime + pstOffset);
}

// Helper function to check if user can claim daily reward (PST-based)
function canClaimDailyReward(lastReward: Date | null): boolean {
  if (!lastReward) return true;
  
  const nowPST = toPST(new Date());
  const todayPST = new Date(nowPST.getFullYear(), nowPST.getMonth(), nowPST.getDate());
  
  const lastRewardPST = toPST(lastReward);
  const lastRewardDayPST = new Date(lastRewardPST.getFullYear(), lastRewardPST.getMonth(), lastRewardPST.getDate());
  
  return todayPST.getTime() > lastRewardDayPST.getTime();
}

export interface IStorage {
  // User operations
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
  
  // Admin operations
  getAdminByUsername(username: string): Promise<Admin | undefined>;
  createAdmin(admin: InsertAdmin): Promise<Admin>;
  
  // Transaction operations
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getUserTransactions(userId: number): Promise<Transaction[]>;
  getAllTransactions(): Promise<Transaction[]>;
  
  // Raffle operations
  createRaffle(raffle: InsertRaffle): Promise<Raffle>;
  getAllRaffles(): Promise<Raffle[]>;
  getActiveRaffles(): Promise<Raffle[]>;
  getRaffleById(id: number): Promise<Raffle | undefined>;
  updateRaffle(id: number, updates: Partial<Raffle>): Promise<Raffle>;
  enterRaffle(entry: InsertRaffleEntry): Promise<RaffleEntry>;
  getRaffleEntries(raffleId: number): Promise<any[]>;
  
  // Shop operations
  createShopItem(item: InsertShopItem): Promise<ShopItem>;
  getAllShopItems(): Promise<ShopItem[]>;
  getActiveShopItems(): Promise<ShopItem[]>;
  updateShopItem(id: number, updates: Partial<ShopItem>): Promise<ShopItem>;
  createPurchase(purchase: InsertPurchase): Promise<Purchase>;
  getUserPurchases(userId: number): Promise<Purchase[]>;
  
  // Bot settings
  getBotSetting(key: string): Promise<BotSetting | undefined>;
  setBotSetting(setting: InsertBotSetting): Promise<BotSetting>;
  getSettings(): Promise<Record<string, any>>;
  updateSettings(updates: Record<string, any>): Promise<void>;
  
  // Dashboard stats
  getDashboardStats(): Promise<{
    totalUsers: number;
    totalCoins: number;
    activeRaffles: number;
    dailyLogins: number;
    recentUsers: User[];
  }>;
}

export class DatabaseStorage implements IStorage {
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
      totalUsers: Number(stats.totalUsers),
      activeUsers: Number(stats.activeUsers),
      totalCoins: Number(stats.totalCoins) || 0,
    };
  }

  async awardReward(telegramId: string, amount: number, type: string, description: string): Promise<User> {
    return db.transaction(async (tx) => {
      const [user] = await tx.select().from(users).where(eq(users.telegramId, telegramId)).for('update skip locked');
      
      if (!user) {
        throw new Error('User not found');
      }
      
      const newCoins = user.coins + amount;
      if (newCoins < 0) {
        throw new Error('Insufficient coins');
      }
      
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
        createdAt: new Date()
      });
      
      return updatedUser;
    });
  }

  async claimDaily(telegramId: string, amount: number): Promise<User> {
    return db.transaction(async (tx) => {
      const [user] = await tx.select().from(users).where(eq(users.telegramId, telegramId)).for('update skip locked');
      
      if (!user) {
        throw new Error('User not found');
      }
      
      if (!canClaimDailyReward(user.lastDailyReward)) {
        throw new Error('Already claimed');
      }
      
      let newStreak = 1;
      if (user.lastDailyReward) {
        const lastPST = toPST(new Date(user.lastDailyReward));
        const nowPST = toPST(new Date());
        const lastDay = new Date(lastPST.getFullYear(), lastPST.getMonth(), lastPST.getDate());
        const today = new Date(nowPST.getFullYear(), nowPST.getMonth(), nowPST.getDate());
        const diff = Math.floor((today.getTime() - lastDay.getTime()) / 86400000);
        newStreak = diff === 1 ? (user.streak || 0) + 1 : 1;
      }
      
      const updates = { 
        coins: user.coins + amount, 
        lastDailyReward: new Date(), 
        streak: newStreak, 
        updatedAt: new Date() 
      };
      
      const [updated] = await tx
        .update(users)
        .set(updates)
        .where(eq(users.telegramId, telegramId))
        .returning();
      
      await tx.insert(transactions).values({ 
        userId: updated.id, 
        type: 'daily_reward', 
        amount, 
        description: 'Daily reward' 
      });
      
      return updated;
    });
  }

  async getAdminByUsername(username: string): Promise<Admin | undefined> {
    const [admin] = await db.select().from(admins).where(eq(admins.username, username));
    return admin || undefined;
  }

  async createAdmin(insertAdmin: InsertAdmin): Promise<Admin> {
    const [admin] = await db.insert(admins).values(insertAdmin).returning();
    return admin;
  }

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
          coins: users.coins
        }
      })
      .from(raffleEntries)
      .innerJoin(users, eq(raffleEntries.userId, users.id))
      .where(eq(raffleEntries.raffleId, raffleId))
      .orderBy(desc(raffleEntries.createdAt));
  }

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
        set: {
          value: insertSetting.value,
          updatedAt: new Date(),
        },
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
      .select({
        totalUsers: count(),
        totalCoins: sum(users.coins),
      })
      .from(users);

    const [raffleStats] = await db
      .select({
        activeRaffles: count(),
      })
      .from(raffles)
      .where(and(eq(raffles.isActive, true), sql`${raffles.endDate} > NOW()`));

    const [dailyStats] = await db
      .select({
        dailyLogins: count(),
      })
      .from(users)
      .where(sql`${users.lastDailyReward} >= CURRENT_DATE`);

    const recentUsers = await db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(10);

    return {
      totalUsers: Number(userStats.totalUsers),
      totalCoins: Number(userStats.totalCoins) || 0,
      activeRaffles: Number(raffleStats.activeRaffles),
      dailyLogins: Number(dailyStats.dailyLogins),
      recentUsers,
    };
  }

  async getSettings(): Promise<Record<string, any>> {
    const settingsList = await db.select().from(botSettings);
    const settings: Record<string, any> = {};
    
    for (const setting of settingsList) {
      settings[setting.key] = setting.value;
    }
    
    return settings;
  }

  async updateSettings(updates: Record<string, any>): Promise<void> {
    for (const [key, value] of Object.entries(updates)) {
      await this.setBotSetting({ key, value });
    }
  }

  async resetAllUserPoints(): Promise<void> {
    await db.transaction(async (tx) => {
      // Get all users with their current coin balances
      const allUsers = await tx.select().from(users);
      
      // Create transaction records for each user before resetting
      for (const user of allUsers) {
        if (user.coins > 0) {
          await tx.insert(transactions).values({
            userId: user.id,
            type: 'admin_adjustment',
            amount: -user.coins,
            description: 'Admin reset all user points',
          });
        }
      }
      
      // Now reset all user coins to 0
      await tx
        .update(users)
        .set({ coins: 0 })
        .where(sql`1=1`); // Update all users
    });
  }

  async updateOnboardingProgress(telegramId: string, step: number, progress: Record<string, any>): Promise<User | null> {
    const [user] = await db
      .update(users)
      .set({
        onboardingStep: step,
        tutorialProgress: progress,
        updatedAt: new Date(),
      })
      .where(eq(users.telegramId, telegramId))
      .returning();
    
    return user || null;
  }

  async completeOnboarding(telegramId: string): Promise<User | null> {
    const [user] = await db
      .update(users)
      .set({
        onboardingCompleted: true,
        onboardingStep: 0,
        updatedAt: new Date(),
      })
      .where(eq(users.telegramId, telegramId))
      .returning();
    
    return user || null;
  }

  async getOnboardingStats(): Promise<{
    totalUsers: number;
    completedOnboarding: number;
    averageStep: number;
  }> {
    const [stats] = await db
      .select({
        totalUsers: count(),
        completedOnboarding: count(sql`CASE WHEN ${users.onboardingCompleted} = true THEN 1 END`),
        averageStep: avg(users.onboardingStep),
      })
      .from(users);

    return {
      totalUsers: Number(stats.totalUsers),
      completedOnboarding: Number(stats.completedOnboarding),
      averageStep: Math.round(Number(stats.averageStep) || 0),
    };
  }

  async hasClaimedTutorialBonus(telegramId: string): Promise<boolean> {
    // Check if user has ANY onboarding transaction (welcome bonus or completion bonus)
    const bonusTransactions = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, sql`(SELECT id FROM ${users} WHERE telegram_id = ${telegramId})`),
          eq(transactions.type, 'onboarding')
        )
      );
    
    return bonusTransactions.length > 0;
  }

  async getActiveUsers(): Promise<{ telegramId: string }[]> {
    const activeUsers = await db
      .select({
        telegramId: users.telegramId,
      })
      .from(users)
      .where(eq(users.isActive, true));
    
    return activeUsers;
  }
}

export const storage = new DatabaseStorage();
