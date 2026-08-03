import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

// Ne pas bloquer `next build` : le pool pg se connecte paresseusement.
const isBuild = process.env.NEXT_PHASE === "phase-production-build";

if (!databaseUrl && !isBuild) {
  throw new Error("DATABASE_URL is required");
}

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ??
  new Pool(databaseUrl ? { connectionString: databaseUrl } : {});

// Neon coupe régulièrement les connexions idle : sans listener, l'événement
// 'error' du pool est considéré comme non géré et fait planter la fonction.
pool.on("error", (err) => {
  console.error("pg pool error", err);
});

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export const db = drizzle(pool);
