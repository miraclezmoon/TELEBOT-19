import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  telegramId: text("telegram_id").notNull().unique(),
  username: text("username"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  coins: integer("coins").default(0).notNull(),
  streak: integer("streak").default(0).notNull(),
  referralCode: text("referral_code").unique(),
  referredBy: text("referred_by"),
  lastDailyReward: timestamp("last_daily_reward"),
  isActive: boolean("is_active").default(true).notNull(),
  onboardingCompleted: boolean("onboarding_completed").default(false).notNull(),
  onboardingStep: integer("onboarding_step").default(0).notNull(),
  tutorialProgress: jsonb("tutorial_progress").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  type: text("type").notNull(), // 'daily_reward', 'referral', 'raffle_entry', 'shop_purchase', 'admin_adjustment'
  amount: integer("amount").notNull(),
  description: text("description"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const raffles = pgTable("raffles", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  prizeDescription: text("prize_description").notNull(),
  entryCost: integer("entry_cost").notNull(),
  maxEntries: integer("max_entries"),
  currentEntries: integer("current_entries").default(0).notNull(),
  startDate: timestamp("start_date").defaultNow().notNull(),
  endDate: timestamp("end_date").notNull(),
  winnerId: integer("winner_id").references(() => users.id),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const raffleEntries = pgTable("raffle_entries", {
  id: serial("id").primaryKey(),
  raffleId: integer("raffle_id").references(() => raffles.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  entries: integer("entries").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const shopItems = pgTable("shop_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  cost: integer("cost").notNull(),
  stock: integer("stock"),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const purchases = pgTable("purchases", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  itemId: integer("item_id").references(() => shopItems.id).notNull(),
  quantity: integer("quantity").default(1).notNull(),
  totalCost: integer("total_cost").notNull(),
  status: text("status").default("pending").notNull(), // 'pending', 'completed', 'cancelled'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const botSettings = pgTable("bot_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  transactions: many(transactions),
  raffleEntries: many(raffleEntries),
  purchases: many(purchases),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, { fields: [transactions.userId], references: [users.id] }),
}));

export const rafflesRelations = relations(raffles, ({ one, many }) => ({
  winner: one(users, { fields: [raffles.winnerId], references: [users.id] }),
  entries: many(raffleEntries),
}));

export const raffleEntriesRelations = relations(raffleEntries, ({ one }) => ({
  raffle: one(raffles, { fields: [raffleEntries.raffleId], references: [raffles.id] }),
  user: one(users, { fields: [raffleEntries.userId], references: [users.id] }),
}));

export const shopItemsRelations = relations(shopItems, ({ many }) => ({
  purchases: many(purchases),
}));

export const purchasesRelations = relations(purchases, ({ one }) => ({
  user: one(users, { fields: [purchases.userId], references: [users.id] }),
  item: one(shopItems, { fields: [purchases.itemId], references: [shopItems.id] }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAdminSchema = createInsertSchema(admins).omit({ id: true, createdAt: true });
export const insertTransactionSchema = createInsertSchema(transactions).omit({ id: true, createdAt: true });
export const insertRaffleSchema = createInsertSchema(raffles).omit({ id: true, createdAt: true });
export const insertRaffleEntrySchema = createInsertSchema(raffleEntries).omit({ id: true, createdAt: true });
export const insertShopItemSchema = createInsertSchema(shopItems).omit({ id: true, createdAt: true });
export const insertPurchaseSchema = createInsertSchema(purchases).omit({ id: true, createdAt: true });
export const insertBotSettingSchema = createInsertSchema(botSettings).omit({ id: true, updatedAt: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Admin = typeof admins.$inferSelect;
export type InsertAdmin = z.infer<typeof insertAdminSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Raffle = typeof raffles.$inferSelect;
export type InsertRaffle = z.infer<typeof insertRaffleSchema>;
export type RaffleEntry = typeof raffleEntries.$inferSelect;
export type InsertRaffleEntry = z.infer<typeof insertRaffleEntrySchema>;
export type ShopItem = typeof shopItems.$inferSelect;
export type InsertShopItem = z.infer<typeof insertShopItemSchema>;
export type Purchase = typeof purchases.$inferSelect;
export type InsertPurchase = z.infer<typeof insertPurchaseSchema>;
export type BotSetting = typeof botSettings.$inferSelect;
export type InsertBotSetting = z.infer<typeof insertBotSettingSchema>;
