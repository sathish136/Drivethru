import { Router } from "express";
import multer from "multer";
import { spawn } from "child_process";
import { db } from "@workspace/db";
import {
  companies, branches, departments, shifts,
  employees, systemSettings, holidays,
  payrollSettings, payrollRecords, staffLoans, staffIncentives,
  attendanceRecords, leaveBalances,
  biometricDevices, biometricLogs,
  systemUsers, hrSettings, weekoffSchedules,
  manualSalaryEntries, activityLogs,
} from "@workspace/db/schema";
import { sql } from "drizzle-orm";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 200 * 1024 * 1024 } });

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL environment variable is not set");
  return url;
}

/* ── GET /backup/export ── pg_dump SQL backup (all tables) */
router.get("/export", (_req, res) => {
  let dbUrl: string;
  try {
    dbUrl = getDatabaseUrl();
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }

  const filename = `attendance-backup-${new Date().toISOString().slice(0, 10)}.sql`;
  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  const pgDump = spawn("pg_dump", [
    "--no-owner",
    "--no-acl",
    "--format=plain",
    "--encoding=UTF8",
    dbUrl,
  ]);

  pgDump.stdout.pipe(res);

  let errOutput = "";
  pgDump.stderr.on("data", (chunk) => { errOutput += chunk.toString(); });

  pgDump.on("error", (err) => {
    console.error("pg_dump spawn error:", err);
    if (!res.headersSent) res.status(500).json({ error: "pg_dump not available: " + err.message });
  });

  pgDump.on("close", (code) => {
    if (code !== 0) {
      console.error("pg_dump exited with code", code, errOutput);
      if (!res.writableEnded) res.end();
    }
  });
});

/* ── GET /backup/stats ── record counts per table */
router.get("/stats", async (_req, res) => {
  try {
    const tables = [
      { key: "branches",          tbl: branches },
      { key: "employees",         tbl: employees },
      { key: "attendance",        tbl: attendanceRecords },
      { key: "shifts",            tbl: shifts },
      { key: "departments",       tbl: departments },
      { key: "holidays",          tbl: holidays },
      { key: "payrollRecords",    tbl: payrollRecords },
      { key: "staffLoans",        tbl: staffLoans },
      { key: "staffIncentives",   tbl: staffIncentives },
      { key: "biometricDevices",  tbl: biometricDevices },
      { key: "leaveBalances",     tbl: leaveBalances },
      { key: "users",             tbl: systemUsers },
    ];

    const counts = await Promise.all(
      tables.map(({ tbl }) =>
        db.select({ count: sql<number>`count(*)::int` }).from(tbl).then(r => r[0]?.count ?? 0)
      )
    );

    const result: Record<string, number> = {};
    tables.forEach(({ key }, i) => { result[key] = counts[i]; });
    res.json(result);
  } catch (err) {
    console.error("Stats error:", err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

/* ── POST /backup/restore ── restore from SQL dump via psql */
router.post("/restore", upload.single("backup"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No backup file provided" });

  const sqlContent = req.file.buffer.toString("utf-8").trim();
  if (!sqlContent) return res.status(400).json({ error: "The uploaded file is empty" });

  const lower = sqlContent.toLowerCase();
  const looksLikeSql =
    sqlContent.includes("PostgreSQL") ||
    lower.includes("set ") ||
    lower.includes("create table") ||
    lower.includes("copy ") ||
    lower.includes("insert into");

  if (!looksLikeSql) {
    return res.status(400).json({ error: "File does not appear to be a valid PostgreSQL SQL dump" });
  }

  let dbUrl: string;
  try {
    dbUrl = getDatabaseUrl();
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }

  try {
    await new Promise<void>((resolve, reject) => {
      const psql = spawn("psql", [dbUrl], { stdio: ["pipe", "pipe", "pipe"] });

      let stderr = "";
      psql.stderr.on("data", (chunk) => { stderr += chunk.toString(); });

      psql.on("error", (err) => reject(new Error("psql not available: " + err.message)));
      psql.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          const errLines = stderr.split("\n")
            .filter(l => l.toLowerCase().includes("error"))
            .slice(0, 5);
          reject(new Error(errLines.length ? errLines.join("; ") : `psql exited with code ${code}`));
        }
      });

      psql.stdin.write(sqlContent);
      psql.stdin.end();
    });

    res.json({
      success: true,
      message: "Database restored successfully from SQL backup",
      restoredAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("Restore error:", err);
    res.status(500).json({ error: "Restore failed: " + (err?.message ?? "Unknown error") });
  }
});

/* ── DELETE /backup/attendance ── wipe all attendance records */
router.delete("/attendance", async (_req, res) => {
  try {
    const result = await db.delete(attendanceRecords);
    res.json({ success: true, message: "All attendance records deleted successfully" });
  } catch (err: any) {
    console.error("Delete attendance error:", err);
    res.status(500).json({ error: "Failed to delete attendance records: " + (err?.message ?? "Unknown error") });
  }
});

export default router;
