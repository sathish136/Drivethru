import app from "./app";
import { startZkAdmsServer } from "./zk-adms-server.js";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const KITCHEN_WEEKLY = JSON.stringify([
  { startTime: "08:00", endTime: "20:00", lunchBreakMinutes: 60,  isOff: false, isHalfDay: false },
  { startTime: "07:00", endTime: "21:00", lunchBreakMinutes: 120, isOff: false, isHalfDay: false },
  { startTime: "07:00", endTime: "21:00", lunchBreakMinutes: 120, isOff: false, isHalfDay: false },
  { startTime: "07:00", endTime: "21:00", lunchBreakMinutes: 120, isOff: false, isHalfDay: false },
  { startTime: "07:00", endTime: "21:00", lunchBreakMinutes: 120, isOff: false, isHalfDay: false },
  { startTime: "07:00", endTime: "21:00", lunchBreakMinutes: 120, isOff: false, isHalfDay: false },
  { startTime: "08:00", endTime: "14:00", lunchBreakMinutes: 0,   isOff: false, isHalfDay: true  },
]);

async function runStartupMigrations() {
  const migrations = [
    `ALTER TABLE payroll_settings ADD COLUMN IF NOT EXISTS off_season_months text NOT NULL DEFAULT '[5,6,7,8,9]'`,
    `ALTER TABLE payroll_settings ADD COLUMN IF NOT EXISTS lunch_incentive_per_day real NOT NULL DEFAULT 125`,
    `ALTER TABLE shifts ADD COLUMN IF NOT EXISTS weekly_schedule text`,
  ];
  for (const m of migrations) {
    try {
      await db.execute(sql.raw(m));
    } catch (e: any) {
      console.warn("[migration] skipped:", e?.message ?? e);
    }
  }

  // Seed default shifts if the table is empty
  try {
    const existing = await db.execute(sql.raw(`SELECT COUNT(*) AS cnt FROM shifts`));
    const cnt = Number((existing.rows[0] as any).cnt);
    if (cnt === 0) {
      await db.execute(sql.raw(`
        INSERT INTO shifts (name, type, start_time1, end_time1, grace_minutes, overtime_threshold, is_active, weekly_schedule)
        VALUES
          ('Flexible Shift',     'normal', '08:00', '17:00', 60, 30, true, NULL),
          ('Kitchen Shift',      'normal', '07:00', '21:00', 10, 30, true, '${KITCHEN_WEEKLY}'),
          ('Receptionist Shift', 'normal', '08:30', '17:30', 10, 30, true, NULL),
          ('Regular Shift',      'normal', '08:00', '17:00', 15, 30, true, NULL),
          ('Night Watcher Shift','normal', '20:00', '05:00', 10, 60, true, NULL)
      `));
      console.log("[migration] seeded 5 default shifts");
    }
  } catch (e: any) {
    console.warn("[migration] shift seed skipped:", e?.message ?? e);
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
