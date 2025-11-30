import { 
  users, tasks, monuments, sessions, userSettings,
  type User, type InsertUser, 
  type Task, type InsertTask,
  type Monument, type InsertMonument,
  type Session, type InsertSession,
  type UserSettings, type InsertUserSettings
} from "@shared/schema";
import { db } from "./db";
import { eq, and, isNull, asc, inArray } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Monuments
  getMonuments(): Promise<Monument[]>;
  getMonument(id: string): Promise<Monument | undefined>;
  getMonumentBySlug(slug: string): Promise<Monument | undefined>;
  createMonument(monument: InsertMonument): Promise<Monument>;
  updateMonumentXp(id: string, xpToAdd: number): Promise<Monument>;
  
  // Tasks
  getTasks(): Promise<Task[]>;
  getTasksByMonument(monumentId: string): Promise<Task[]>;
  getTasksBySession(sessionId: string): Promise<Task[]>;
  getTask(id: string): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  createBulkTasks(taskList: InsertTask[]): Promise<Task[]>;
  updateTask(id: string, updates: Partial<InsertTask>): Promise<Task>;
  deleteTask(id: string): Promise<void>;
  deleteTasks(ids: string[]): Promise<void>;
  completeTask(id: string): Promise<Task>;
  uncompleteTask(id: string): Promise<Task>;
  createChildTasks(parentId: string, tasks: Omit<InsertTask, 'parentId'>[]): Promise<Task[]>;
  confirmDraftTasks(sessionId: string): Promise<Task[]>;
  
  // Sessions
  getSession(id: string): Promise<Session | undefined>;
  createSession(session: InsertSession): Promise<Session>;
  updateSession(id: string, updates: Partial<Session>): Promise<Session>;
  
  // User Settings
  getUserSettings(): Promise<UserSettings | undefined>;
  createOrUpdateUserSettings(settings: Partial<InsertUserSettings>): Promise<UserSettings>;
  exportUserData(): Promise<{ sessions: Session[]; tasks: Task[]; monuments: Monument[] }>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Monuments
  async getMonuments(): Promise<Monument[]> {
    return db.select().from(monuments);
  }

  async getMonument(id: string): Promise<Monument | undefined> {
    const [monument] = await db.select().from(monuments).where(eq(monuments.id, id));
    return monument || undefined;
  }

  async getMonumentBySlug(slug: string): Promise<Monument | undefined> {
    const [monument] = await db.select().from(monuments).where(eq(monuments.slug, slug));
    return monument || undefined;
  }

  async createMonument(monument: InsertMonument): Promise<Monument> {
    const [created] = await db
      .insert(monuments)
      .values(monument)
      .returning();
    return created;
  }

  async updateMonumentXp(id: string, xpToAdd: number): Promise<Monument> {
    const monument = await this.getMonument(id);
    if (!monument) {
      throw new Error(`Monument ${id} not found`);
    }
    
    const [updated] = await db
      .update(monuments)
      .set({ totalXp: monument.totalXp + xpToAdd })
      .where(eq(monuments.id, id))
      .returning();
    return updated;
  }

  // Tasks
  async getTasks(): Promise<Task[]> {
    return db.select().from(tasks);
  }

  async getTasksByMonument(monumentId: string): Promise<Task[]> {
    return db.select().from(tasks).where(eq(tasks.monumentId, monumentId)).orderBy(asc(tasks.sortOrder));
  }

  async getTasksBySession(sessionId: string): Promise<Task[]> {
    return db.select().from(tasks).where(eq(tasks.sessionId, sessionId)).orderBy(asc(tasks.sortOrder));
  }

  async getTask(id: string): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task || undefined;
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [created] = await db
      .insert(tasks)
      .values(task)
      .returning();
    return created;
  }

  async createBulkTasks(taskList: InsertTask[]): Promise<Task[]> {
    if (taskList.length === 0) return [];
    const created = await db
      .insert(tasks)
      .values(taskList)
      .returning();
    return created;
  }

  async updateTask(id: string, updates: Partial<InsertTask>): Promise<Task> {
    const [updated] = await db
      .update(tasks)
      .set(updates)
      .where(eq(tasks.id, id))
      .returning();
    return updated;
  }

  async deleteTask(id: string): Promise<void> {
    // Delete child tasks first (recursive)
    const childTasks = await db.select().from(tasks).where(eq(tasks.parentId, id));
    for (const child of childTasks) {
      await this.deleteTask(child.id);
    }
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  async deleteTasks(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    for (const id of ids) {
      await this.deleteTask(id);
    }
  }

  async completeTask(id: string): Promise<Task> {
    const [updated] = await db
      .update(tasks)
      .set({ 
        status: "completed",
        completedAt: new Date(),
      })
      .where(eq(tasks.id, id))
      .returning();
    return updated;
  }

  async uncompleteTask(id: string): Promise<Task> {
    const [updated] = await db
      .update(tasks)
      .set({ 
        status: "pending",
        completedAt: null,
      })
      .where(eq(tasks.id, id))
      .returning();
    return updated;
  }

  async createChildTasks(parentId: string, childTasks: Omit<InsertTask, 'parentId'>[]): Promise<Task[]> {
    const tasksToInsert = childTasks.map((t, i) => ({
      ...t,
      parentId,
      sortOrder: i,
    }));
    
    const created = await db
      .insert(tasks)
      .values(tasksToInsert)
      .returning();
    return created;
  }

  async confirmDraftTasks(sessionId: string): Promise<Task[]> {
    const updated = await db
      .update(tasks)
      .set({ isDraft: 0 })
      .where(and(eq(tasks.sessionId, sessionId), eq(tasks.isDraft, 1)))
      .returning();
    return updated;
  }

  // Sessions
  async getSession(id: string): Promise<Session | undefined> {
    const [session] = await db.select().from(sessions).where(eq(sessions.id, id));
    return session || undefined;
  }

  async createSession(session: InsertSession): Promise<Session> {
    const [created] = await db
      .insert(sessions)
      .values(session)
      .returning();
    return created;
  }

  async updateSession(id: string, updates: Partial<Session>): Promise<Session> {
    const [updated] = await db
      .update(sessions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(sessions.id, id))
      .returning();
    return updated;
  }

  // User Settings
  async getUserSettings(): Promise<UserSettings | undefined> {
    const [settings] = await db.select().from(userSettings);
    return settings || undefined;
  }

  async createOrUpdateUserSettings(settings: Partial<InsertUserSettings>): Promise<UserSettings> {
    const existing = await this.getUserSettings();
    
    if (existing) {
      const [updated] = await db
        .update(userSettings)
        .set({ ...settings, updatedAt: new Date() })
        .where(eq(userSettings.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(userSettings)
        .values(settings as InsertUserSettings)
        .returning();
      return created;
    }
  }

  async exportUserData(): Promise<{ sessions: Session[]; tasks: Task[]; monuments: Monument[] }> {
    const allSessions = await db.select().from(sessions);
    const allTasks = await db.select().from(tasks);
    const allMonuments = await db.select().from(monuments);
    return { sessions: allSessions, tasks: allTasks, monuments: allMonuments };
  }
}

export const storage = new DatabaseStorage();

// Initialize default monuments
export async function initializeMonuments() {
  const existingMonuments = await storage.getMonuments();
  
  if (existingMonuments.length === 0) {
    const defaultMonuments: InsertMonument[] = [
      { name: "Career", slug: "career", color: "#3B82F6", icon: "briefcase" },
      { name: "Wealth", slug: "wealth", color: "#F59E0B", icon: "coins" },
      { name: "Emotion", slug: "emotion", color: "#A855F7", icon: "heart" },
      { name: "Family", slug: "family", color: "#EC4899", icon: "users" },
      { name: "Health", slug: "health", color: "#10B981", icon: "activity" },
      { name: "Experience", slug: "experience", color: "#F97316", icon: "compass" },
    ];
    
    for (const monument of defaultMonuments) {
      await storage.createMonument(monument);
    }
    console.log("Initialized default monuments");
  }
}
