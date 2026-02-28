import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set in environment");
}

export const db = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30_000,
});

