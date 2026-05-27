import app from "./app";
import { startZkAdmsServer } from "./zk-adms-server.js";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

async function runStartupMigrations() {
  const migrations = [
    `ALTER TABLE payroll_settings ADD COLUMN IF NOT EXISTS off_season_months text NOT NULL DEFAULT '[5,6,7,8,9]'`,
    `ALTER TABLE payroll_settings ADD COLUMN IF NOT EXISTS lunch_incentive_per_day real NOT NULL DEFAULT 125`,
  ];
  for (const m of migrations) {
    try {
      await db.execute(sql.raw(m));
    } catch (e: any) {
      console.warn("[migration] skipped:", e?.message ?? e);
    }
  }
  console.log("[migration] startup migrations complete");
}

const port = Number(process.env["PORT"] || "8080");

runStartupMigrations().then(() => {
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
  startZkAdmsServer(8081);
}).catch((e) => {
  console.error("[migration] fatal error, starting anyway:", e);
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
  startZkAdmsServer(8081);
});
