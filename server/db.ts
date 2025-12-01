import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Use different database drivers based on environment
// Neon serverless for Replit (requires WebSocket), pg Pool for Vercel/Supabase
const isVercel = process.env.VERCEL === "1";
const isSupabase = process.env.DATABASE_URL?.includes("supabase");

type DbType = ReturnType<typeof import("drizzle-orm/neon-serverless").drizzle> | ReturnType<typeof import("drizzle-orm/node-postgres").drizzle>;

let _db: DbType | null = null;
let _pool: any = null;

export async function initDatabase(): Promise<void> {
  if (_db !== null) return;
  
  if (isVercel || isSupabase) {
    // Production: Use standard pg for Supabase/Vercel
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    
    _pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
    
    _db = drizzle(_pool, { schema });
  } else {
    // Development (Replit): Use Neon serverless with WebSocket
    const { Pool, neonConfig } = await import("@neondatabase/serverless");
    const { drizzle } = await import("drizzle-orm/neon-serverless");
    const ws = await import("ws");
    
    neonConfig.webSocketConstructor = ws.default;
    
    _pool = new Pool({ connectionString: process.env.DATABASE_URL });
    _db = drizzle({ client: _pool, schema });
  }
  
  console.log(`Database initialized (${isVercel || isSupabase ? 'pg' : 'neon-serverless'})`);
}

// Getter that ensures db is initialized
export function getDb(): DbType {
  if (_db === null) {
    throw new Error("Database not initialized. Call initDatabase() first.");
  }
  return _db;
}

// Getter for pool
export function getPool(): any {
  if (_pool === null) {
    throw new Error("Database not initialized. Call initDatabase() first.");
  }
  return _pool;
}

// Proxy object for backward compatibility
// This allows existing code to use `db.select()` etc.
export const db = new Proxy({} as DbType, {
  get(_target, prop) {
    const realDb = getDb();
    const value = (realDb as any)[prop];
    if (typeof value === 'function') {
      return value.bind(realDb);
    }
    return value;
  }
});

export const pool = new Proxy({} as any, {
  get(_target, prop) {
    const realPool = getPool();
    const value = realPool[prop];
    if (typeof value === 'function') {
      return value.bind(realPool);
    }
    return value;
  }
});
