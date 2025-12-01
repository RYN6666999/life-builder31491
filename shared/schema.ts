import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, jsonb, pgEnum, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Auth Sessions table - for Replit Auth session storage
// (IMPORTANT) This table is mandatory for Replit Auth
export const authSessions = pgTable(
  "auth_sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_auth_session_expire").on(table.expire)],
);

// Replit Auth Users table
// (IMPORTANT) This table is mandatory for Replit Auth
export const replitUsers = pgTable("replit_users", {
  id: varchar("id").primaryKey(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertReplitUser = typeof replitUsers.$inferInsert;
export type ReplitUser = typeof replitUsers.$inferSelect;

// Enums
export const taskStatusEnum = pgEnum("task_status", ["pending", "completed", "cancelled"]);
export const taskTypeEnum = pgEnum("task_type", ["action", "inner_work"]);
export const taskCategoryEnum = pgEnum("task_category", ["E", "A", "P", "X"]); // Elimination, Accumulation, Planning, eXperience

// Monuments table - The 6 life monuments
export const monuments = pgTable("monuments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  totalXp: integer("total_xp").notNull().default(0),
  color: text("color").notNull(),
  icon: text("icon").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Tasks table - Recursive structure for infinite nesting
export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id"),
  monumentId: varchar("monument_id").references(() => monuments.id),
  sessionId: varchar("session_id"), // Link to session for collaborative editing
  content: text("content").notNull(),
  status: taskStatusEnum("status").notNull().default("pending"),
  type: taskTypeEnum("type").notNull().default("action"),
  category: taskCategoryEnum("category"), // E/A/P/X classification
  xpValue: integer("xp_value").notNull().default(10),
  sortOrder: integer("sort_order").notNull().default(0), // For ordering tasks
  isDraft: integer("is_draft").notNull().default(0), // 0 = confirmed, 1 = draft/proposed by AI
  metadata: jsonb("metadata").$type<{
    emotionTags?: string[];
    context?: string;
    agentReasoning?: string;
    sedonaStep?: number;
    proposedBy?: "ai" | "user";
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

// Sessions table - Track user flow state
export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  currentStep: integer("current_step").notNull().default(1),
  selectedMonumentId: varchar("selected_monument_id").references(() => monuments.id),
  flowType: text("flow_type").$type<"mood" | "task">(),
  messages: jsonb("messages").$type<Array<{
    role: "user" | "assistant";
    content: string;
    toolCalls?: Array<{
      name: string;
      args: Record<string, unknown>;
      result?: unknown;
    }>;
  }>>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations
export const tasksRelations = relations(tasks, ({ one, many }) => ({
  parent: one(tasks, {
    fields: [tasks.parentId],
    references: [tasks.id],
    relationName: "taskTree",
  }),
  children: many(tasks, {
    relationName: "taskTree",
  }),
  monument: one(monuments, {
    fields: [tasks.monumentId],
    references: [monuments.id],
  }),
}));

export const monumentsRelations = relations(monuments, ({ many }) => ({
  tasks: many(tasks),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  monument: one(monuments, {
    fields: [sessions.selectedMonumentId],
    references: [monuments.id],
  }),
}));

// Insert schemas
export const insertMonumentSchema = createInsertSchema(monuments).omit({
  id: true,
  createdAt: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertSessionSchema = createInsertSchema(sessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types - Use Drizzle's inferred types for database operations
export type Monument = typeof monuments.$inferSelect;
export type InsertMonument = typeof monuments.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type InsertSession = typeof sessions.$inferInsert;

// Zod schema types for validation
export type InsertMonumentInput = z.infer<typeof insertMonumentSchema>;
export type InsertTaskInput = z.infer<typeof insertTaskSchema>;
export type InsertSessionInput = z.infer<typeof insertSessionSchema>;

// Keep users table for future auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Google OAuth Users table - for Google Fit integration
export const googleUsers = pgTable("google_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  googleId: text("google_id").notNull().unique(),
  email: text("email").notNull(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenExpiry: timestamp("token_expiry"),
  fitnessScopes: jsonb("fitness_scopes").$type<string[]>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertGoogleUserSchema = createInsertSchema(googleUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type GoogleUser = typeof googleUsers.$inferSelect;
export type InsertGoogleUser = z.infer<typeof insertGoogleUserSchema>;

// AI Persona enum
export const aiPersonaEnum = pgEnum("ai_persona", ["spiritual", "coach", "pm", "custom"]);

// User Settings table
export const userSettings = pgTable("user_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nickname: text("nickname").default("來地球玩的大師"),
  aiPersona: aiPersonaEnum("ai_persona").notNull().default("spiritual"),
  customPersonaPrompt: text("custom_persona_prompt"),
  theme: text("theme").notNull().default("dark"),
  googleDriveConnected: integer("google_drive_connected").notNull().default(0),
  googleCalendarConnected: integer("google_calendar_connected").notNull().default(0),
  webSearchEnabled: integer("web_search_enabled").notNull().default(0),
  customApiKeys: jsonb("custom_api_keys").$type<{
    gemini?: string;
    perplexity?: string;
  }>(),
  mcpSettings: jsonb("mcp_settings").$type<{
    fileSearch?: boolean;
    webSearch?: boolean;
    calendar?: boolean;
    alarms?: boolean;
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSettingsSchema = createInsertSchema(userSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type UserSettings = typeof userSettings.$inferSelect;
export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;

// Saved Locations table - for spatial memory and navigation
export const savedLocations = pgTable("saved_locations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  name: text("name").notNull(),
  address: text("address"),
  lat: text("lat").notNull(),
  lng: text("lng").notNull(),
  category: text("category"),
  metadata: jsonb("metadata").$type<{
    placeId?: string;
    types?: string[];
    notes?: string;
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSavedLocationSchema = createInsertSchema(savedLocations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type SavedLocation = typeof savedLocations.$inferSelect;
export type InsertSavedLocation = z.infer<typeof insertSavedLocationSchema>;
