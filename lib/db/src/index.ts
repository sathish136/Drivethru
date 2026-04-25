import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || process.env.COLOMBO_DB_URL;

export const pool = new Pool({ connectionString });
export const db = drizzle(pool, { schema });

export * from "./schema";
