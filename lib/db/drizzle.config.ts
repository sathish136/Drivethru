import { defineConfig } from "drizzle-kit";
import path from "path";

const dbUrl = process.env.DATABASE_URL || process.env.COLOMBO_DB_URL;

if (!dbUrl) {
  throw new Error("DATABASE_URL or COLOMBO_DB_URL environment variable is required");
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: dbUrl,
  },
});
