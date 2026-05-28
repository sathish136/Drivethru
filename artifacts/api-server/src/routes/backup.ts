import { Router } from "express";
import multer from "multer";
import { spawn } from "child_process";
import { db } from "@workspace/db";
import {
  branches, departments, shifts,
  employees, holidays,
  payrollRecords, staffLoans, staffIncentives,
  attendanceRecords, leaveBalances,
  biometricDevices,
  systemUsers,
} from "@workspace/db/schema";
import { sql } from "drizzle-orm";
import nodemailer from "nodemailer";
import cron from "node-cron";
import fs from "fs";
import path from "path";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 200 * 1024 * 1024 } });

/* ── File paths ── */
const SMTP_CONFIG_PATH = path.resolve(process.cwd(), "smtp-config.json");
const BACKUP_HISTORY_PATH = path.resolve(process.cwd(), "backup-history.json");

/* ── SMTP config ── */
interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  recipient: string;
  scheduledBackupEnabled: boolean;
  scheduleTimes: string[];
}

const DEFAULT_SMTP: SmtpConfig = {
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  user: "techhackatmil000@gmail.com",
  pass: "wrgg veip pytm chlf",
  recipient: "techhackatmil000@gmail.com",
  scheduledBackupEnabled: true,
  scheduleTimes: ["06:00", "14:00", "22:00"],
};

function loadSmtpConfig(): SmtpConfig {
  try {
    if (fs.existsSync(SMTP_CONFIG_PATH)) {
      return { ...DEFAULT_SMTP, ...JSON.parse(fs.readFileSync(SMTP_CONFIG_PATH, "utf-8")) };
    }
  } catch {}
  return { ...DEFAULT_SMTP };
}

function saveSmtpConfig(cfg: SmtpConfig): void {
  fs.writeFileSync(SMTP_CONFIG_PATH, JSON.stringify(cfg, null, 2), "utf-8");
}

/* ── Backup history log ── */
export interface BackupEntry {
  id: string;
  timestamp: string;        // ISO string
  type: "manual" | "email" | "scheduled" | "restore";
  trigger: string;          // "Manual Download" | "Email – Manual" | "Email – Scheduled 06:00" | "Restore"
  sizeKb: number | null;
  status: "success" | "failed";
  error?: string;
  recipient?: string;
}

function loadHistory(): BackupEntry[] {
  try {
    if (fs.existsSync(BACKUP_HISTORY_PATH)) {
      return JSON.parse(fs.readFileSync(BACKUP_HISTORY_PATH, "utf-8"));
    }
  } catch {}
  return [];
}

function addHistory(entry: Omit<BackupEntry, "id">): void {
  const history = loadHistory();
  history.unshift({ id: crypto.randomUUID(), ...entry });
  // Keep last 50 entries
  fs.writeFileSync(BACKUP_HISTORY_PATH, JSON.stringify(history.slice(0, 50), null, 2), "utf-8");
}

/* ── Helpers ── */
function getDatabaseUrl(): string {
  const url =
    process.env.APP_DATABASE_URL ||
    process.env.DATABASE_URL ||
    process.env.COLOMBO_DB_URL;
  if (!url) throw new Error("No database URL set (APP_DATABASE_URL / DATABASE_URL / COLOMBO_DB_URL)");
  return url;
}

function dumpToBuffer(): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    let dbUrl: string;
    try { dbUrl = getDatabaseUrl(); } catch (e) { reject(e); return; }
    const chunks: Buffer[] = [];
    const pgDump = spawn("pg_dump", ["--no-owner", "--no-acl", "--format=plain", "--encoding=UTF8", dbUrl]);
    pgDump.stdout.on("data", (c: Buffer) => chunks.push(c));
    let errOut = "";
    pgDump.stderr.on("data", (c: Buffer) => { errOut += c.toString(); });
    pgDump.on("error", (e) => reject(new Error("pg_dump not available: " + e.message)));
    pgDump.on("close", (code) => {
      if (code === 0) resolve(Buffer.concat(chunks));
      else reject(new Error("pg_dump failed (code " + code + "): " + errOut.slice(0, 300)));
    });
  });
}

async function sendBackupEmail(cfg: SmtpConfig, triggerLabel: string): Promise<void> {
  const buf = await dumpToBuffer();
  const sizeKb = Math.round(buf.length / 1024);
  const dateStr = new Date().toISOString().replace("T", "_").slice(0, 16).replace(":", "-");
  const filename = `db-backup-${dateStr}.sql`;

  const transporter = nodemailer.createTransport({
    host: cfg.host, port: cfg.port, secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
  });

  await transporter.sendMail({
    from: `"Post Office HRMS" <${cfg.user}>`,
    to: cfg.recipient,
    subject: `[Sri Lanka Post] DB Backup — ${triggerLabel} — ${new Date().toUTCString()}`,
    text: `Automated database backup attached.\n\nGenerated: ${new Date().toUTCString()}\nFile: ${filename}\nSize: ${sizeKb} KB\nTrigger: ${triggerLabel}\n\nThis is an automated email from Sri Lanka Post Attendance Management System.`,
    attachments: [{ filename, content: buf, contentType: "application/octet-stream" }],
  });

  addHistory({
    timestamp: new Date().toISOString(),
    type: triggerLabel.toLowerCase().includes("scheduled") ? "scheduled" : "email",
    trigger: triggerLabel,
    sizeKb,
    status: "success",
    recipient: cfg.recipient,
  });
}

/* ── Scheduler ── */
let scheduledJobs: cron.ScheduledTask[] = [];
let lastScheduledRun: string | null = null;
let nextScheduledRun: string | null = null;
let schedulerError: string | null = null;

function cronExprFor(timeStr: string): string {
  const [h, m] = timeStr.split(":").map(Number);
  return `${m} ${h} * * *`;
}

function setupScheduler() {
  scheduledJobs.forEach(j => j.stop());
  scheduledJobs = [];
  nextScheduledRun = null;

  const cfg = loadSmtpConfig();
  if (!cfg.scheduledBackupEnabled) return;

  const times = cfg.scheduleTimes.length ? cfg.scheduleTimes : ["06:00", "14:00", "22:00"];

  times.forEach((timeStr) => {
    const expr = cronExprFor(timeStr);
    try {
      const job = cron.schedule(expr, async () => {
        console.log(`[Backup] Scheduled email backup at ${timeStr}…`);
        const cfg2 = loadSmtpConfig();
        if (!cfg2.scheduledBackupEnabled) return;
        try {
          await sendBackupEmail(cfg2, `Scheduled ${timeStr}`);
          lastScheduledRun = new Date().toISOString();
          schedulerError = null;
          console.log(`[Backup] Scheduled backup email sent at ${timeStr}`);
        } catch (err: any) {
          schedulerError = err?.message ?? "Unknown error";
          addHistory({
            timestamp: new Date().toISOString(),
            type: "scheduled",
            trigger: `Scheduled ${timeStr}`,
            sizeKb: null,
            status: "failed",
            error: schedulerError ?? undefined,
          });
          console.error(`[Backup] Scheduled backup FAILED at ${timeStr}:`, err);
        }
      }, { timezone: "Asia/Colombo" });
      scheduledJobs.push(job);
    } catch (e: any) {
      console.error(`[Backup] Invalid cron for ${timeStr}:`, e.message);
    }
  });

  const now = new Date();
  const upcoming = times.map(t => {
    const [h, m] = t.split(":").map(Number);
    const d = new Date(now);
    d.setHours(h, m, 0, 0);
    if (d <= now) d.setDate(d.getDate() + 1);
    return d;
  }).sort((a, b) => a.getTime() - b.getTime());
  nextScheduledRun = upcoming[0]?.toISOString() ?? null;

  console.log(`[Backup] Scheduler set for ${times.join(", ")} (Asia/Colombo). Next: ${nextScheduledRun}`);
}

setupScheduler();

/* ════════════════════ ROUTES ════════════════════ */

/* GET /backup/history */
router.get("/history", (_req, res) => {
  res.json(loadHistory());
});

/* GET /backup/smtp-settings */
router.get("/smtp-settings", (_req, res) => {
  const cfg = loadSmtpConfig();
  res.json({
    ...cfg,
    pass: cfg.pass ? "••••••••" : "",
    schedulerStatus: {
      running: scheduledJobs.length > 0,
      lastRun: lastScheduledRun,
      nextRun: nextScheduledRun,
      error: schedulerError,
    },
  });
});

/* POST /backup/smtp-settings */
router.post("/smtp-settings", (req, res) => {
  const body = req.body as Partial<SmtpConfig> & { pass?: string };
  const current = loadSmtpConfig();
  const updated: SmtpConfig = {
    ...current,
    host: body.host ?? current.host,
    port: typeof body.port === "number" ? body.port : current.port,
    secure: typeof body.secure === "boolean" ? body.secure : current.secure,
    user: body.user ?? current.user,
    pass: body.pass && body.pass !== "••••••••" ? body.pass : current.pass,
    recipient: body.recipient ?? current.recipient,
    scheduledBackupEnabled: typeof body.scheduledBackupEnabled === "boolean" ? body.scheduledBackupEnabled : current.scheduledBackupEnabled,
    scheduleTimes: Array.isArray(body.scheduleTimes) ? body.scheduleTimes : current.scheduleTimes,
  };
  saveSmtpConfig(updated);
  setupScheduler();
  res.json({ success: true, message: "SMTP settings saved" });
});

/* POST /backup/send-email — manual email send */
router.post("/send-email", async (_req, res) => {
  const cfg = loadSmtpConfig();
  try {
    await sendBackupEmail(cfg, "Email – Manual");
    res.json({ success: true, message: `Backup emailed to ${cfg.recipient}` });
  } catch (err: any) {
    addHistory({
      timestamp: new Date().toISOString(),
      type: "email",
      trigger: "Email – Manual",
      sizeKb: null,
      status: "failed",
      error: err?.message ?? "Unknown error",
    });
    res.status(500).json({ error: "Email failed: " + (err?.message ?? "Unknown error") });
  }
});

/* POST /backup/test-smtp */
router.post("/test-smtp", async (_req, res) => {
  const cfg = loadSmtpConfig();
  try {
    const transporter = nodemailer.createTransport({
      host: cfg.host, port: cfg.port, secure: cfg.secure,
      auth: { user: cfg.user, pass: cfg.pass },
    });
    await transporter.verify();
    res.json({ success: true, message: "SMTP connection verified successfully" });
  } catch (err: any) {
    res.status(500).json({ error: "SMTP test failed: " + (err?.message ?? "Unknown error") });
  }
});

/* GET /backup/export — pg_dump download, logs history */
router.get("/export", async (_req, res) => {
  let dbUrl: string;
  try { dbUrl = getDatabaseUrl(); } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }

  const filename = `db-full-backup-${new Date().toISOString().slice(0, 10)}.sql`;
  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  const chunks: Buffer[] = [];
  const pgDump = spawn("pg_dump", ["--no-owner", "--no-acl", "--format=plain", "--encoding=UTF8", dbUrl]);

  pgDump.stdout.on("data", (c: Buffer) => { chunks.push(c); res.write(c); });

  let errOutput = "";
  pgDump.stderr.on("data", (chunk) => { errOutput += chunk.toString(); });

  pgDump.on("error", (err) => {
    console.error("pg_dump spawn error:", err);
    if (!res.headersSent) res.status(500).json({ error: "pg_dump not available: " + err.message });
  });

  pgDump.on("close", (code) => {
    if (code === 0) {
      const sizeKb = Math.round(Buffer.concat(chunks).length / 1024);
      addHistory({
        timestamp: new Date().toISOString(),
        type: "manual",
        trigger: "Manual Download",
        sizeKb,
        status: "success",
      });
    } else {
      console.error("pg_dump exited with code", code, errOutput);
      addHistory({
        timestamp: new Date().toISOString(),
        type: "manual",
        trigger: "Manual Download",
        sizeKb: null,
        status: "failed",
        error: errOutput.slice(0, 200),
      });
    }
    if (!res.writableEnded) res.end();
  });
});

/* GET /backup/stats */
router.get("/stats", async (_req, res) => {
  try {
    const tables = [
      { key: "branches",         tbl: branches },
      { key: "employees",        tbl: employees },
      { key: "attendance",       tbl: attendanceRecords },
      { key: "shifts",           tbl: shifts },
      { key: "departments",      tbl: departments },
      { key: "holidays",         tbl: holidays },
      { key: "payrollRecords",   tbl: payrollRecords },
      { key: "staffLoans",       tbl: staffLoans },
      { key: "staffIncentives",  tbl: staffIncentives },
      { key: "biometricDevices", tbl: biometricDevices },
      { key: "leaveBalances",    tbl: leaveBalances },
      { key: "users",            tbl: systemUsers },
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
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

/* POST /backup/restore */
router.post("/restore", upload.single("backup"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No backup file provided" });

  const sqlContent = req.file.buffer.toString("utf-8").trim();
  if (!sqlContent) return res.status(400).json({ error: "The uploaded file is empty" });

  const lower = sqlContent.toLowerCase();
  const looksLikeSql =
    sqlContent.includes("PostgreSQL") || lower.includes("set ") ||
    lower.includes("create table") || lower.includes("copy ") || lower.includes("insert into");

  if (!looksLikeSql) return res.status(400).json({ error: "File does not appear to be a valid PostgreSQL SQL dump" });

  let dbUrl: string;
  try { dbUrl = getDatabaseUrl(); } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }

  const filename = req.file.originalname ?? "unknown.sql";
  const sizeKb = Math.round(req.file.size / 1024);

  try {
    await new Promise<void>((resolve, reject) => {
      const psql = spawn("psql", [dbUrl], { stdio: ["pipe", "pipe", "pipe"] });
      let stderr = "";
      psql.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
      psql.on("error", (err) => reject(new Error("psql not available: " + err.message)));
      psql.on("close", (code) => {
        if (code === 0) resolve();
        else {
          const errLines = stderr.split("\n").filter(l => l.toLowerCase().includes("error")).slice(0, 5);
          reject(new Error(errLines.length ? errLines.join("; ") : `psql exited with code ${code}`));
        }
      });
      psql.stdin.write(sqlContent);
      psql.stdin.end();
    });

    addHistory({
      timestamp: new Date().toISOString(),
      type: "restore",
      trigger: `Restore — ${filename}`,
      sizeKb,
      status: "success",
    });

    res.json({ success: true, message: "Database restored successfully", restoredAt: new Date().toISOString() });
  } catch (err: any) {
    addHistory({
      timestamp: new Date().toISOString(),
      type: "restore",
      trigger: `Restore — ${filename}`,
      sizeKb,
      status: "failed",
      error: err?.message ?? "Unknown error",
    });
    res.status(500).json({ error: "Restore failed: " + (err?.message ?? "Unknown error") });
  }
});

/* DELETE /backup/attendance */
router.delete("/attendance", async (_req, res) => {
  try {
    await db.delete(attendanceRecords);
    res.json({ success: true, message: "All attendance records deleted successfully" });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to delete attendance records: " + (err?.message ?? "Unknown error") });
  }
});

export default router;
