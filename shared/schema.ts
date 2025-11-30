import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

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
  content: text("content").notNull(),
  status: taskStatusEnum("status").notNull().default("pending"),
  type: taskTypeEnum("type").notNull().default("action"),
  category: taskCategoryEnum("category"), // E/A/P/X classification
  xpValue: integer("xp_value").notNull().default(10),
  metadata: jsonb("metadata").$type<{
    emotionTags?: string[];
    context?: string;
    agentReasoning?: string;
    sedonaStep?: number;
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
