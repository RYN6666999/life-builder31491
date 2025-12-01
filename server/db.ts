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

let db: ReturnType<typeof import("drizzle-orm/neon-serverless").drizzle> | ReturnType<typeof import("drizzle-orm/node-postgres").drizzle>;
let pool: any;

if (isVercel || isSupabase) {
  // Production: Use standard pg for Supabase/Vercel
  const { Pool } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
  
  db = drizzle(pool, { schema });
} else {
  // Development (Replit): Use Neon serverless with WebSocket
  const { Pool, neonConfig } = await import("@neondatabase/serverless");
  const { drizzle } = await import("drizzle-orm/neon-serverless");
  const ws = await import("ws");
  
  neonConfig.webSocketConstructor = ws.default;
  
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle({ client: pool, schema });
}

export { db, pool };
