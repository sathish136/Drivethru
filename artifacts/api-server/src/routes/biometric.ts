import { Router } from "express";
import multer from "multer";
import { createRequire } from "module";
import { writeFileSync, unlinkSync, mkdtempSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { db } from "@workspace/db";
import {
  biometricDevices, biometricLogs, branches, employees, attendanceRecords, shifts,
} from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { loadDeptRules, findRule, timeToMins, calcOtHours } from "../lib/hr-rules.js";

const require = createRequire(import.meta.url);

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 200 * 1024 * 1024 } });

router.get("/devices", async (_req, res) => {
  try {
    const all = await db.select({
      dev: biometricDevices,
      branchName: branches.name,
    }).from(biometricDevices).leftJoin(branches, eq(biometricDevices.branchId, branches.id));
    res.json(all.map(r => ({
      ...r.dev,
      branchName: r.branchName || "",
      totalPushLogs: 0,
      lastSync: r.dev.lastSync?.toISOString() || null,
      createdAt: r.dev.createdAt.toISOString(),
    })));
  } catch (e) { res.status(500).json({ message: "Error", success: false }); }
});

router.post("/devices", async (req, res) => {
  try {
    const [dev] = await db.insert(biometricDevices).values(req.body).returning();
    const [br] = await db.select().from(branches).where(eq(branches.id, dev.branchId));
    res.status(201).json({ ...dev, branchName: br?.name || "", totalPushLogs: 0, lastSync: null, createdAt: dev.createdAt.toISOString() });
  } catch (e) { console.error(e); res.status(500).json({ message: "Error", success: false }); }
});

router.put("/devices/:id", async (req, res) => {
  try {
    const [dev] = await db.update(biometricDevices).set(req.body).where(eq(biometricDevices.id, Number(req.params.id))).returning();
    const [br] = await db.select().from(branches).where(eq(branches.id, dev.branchId));
    res.json({ ...dev, branchName: br?.name || "", totalPushLogs: 0, lastSync: dev.lastSync?.toISOString() || null, createdAt: dev.createdAt.toISOString() });
  } catch (e) { res.status(500).json({ message: "Error", success: false }); }
});

router.delete("/devices/:id", async (req, res) => {
  try {
    await db.delete(biometricDevices).where(eq(biometricDevices.id, Number(req.params.id)));
    res.json({ message: "Deleted", success: true });
  } catch (e) { res.status(500).json({ message: "Error", success: false }); }
});

router.post("/devices/:id/test", async (req, res) => {
  try {
    const [dev] = await db.select().from(biometricDevices).where(eq(biometricDevices.id, Number(req.params.id)));
    if (!dev) { res.status(404).json({ success: false, message: "Device not found" }); return; }
    const simLatency = Math.floor(Math.random() * 100) + 20;
    res.json({ success: true, message: `Connected to ${dev.ipAddress}:${dev.port} (simulated)`, latencyMs: simLatency });
  } catch (e) { res.status(500).json({ success: false, message: "Test failed" }); }
});

router.get("/logs", async (req, res) => {
  try {
    const { deviceId, page = "1" } = req.query;
    const all = await db.select({
      log: biometricLogs,
      deviceName: biometricDevices.name,
      empName: employees.fullName,
    }).from(biometricLogs)
      .leftJoin(biometricDevices, eq(biometricLogs.deviceId, biometricDevices.id))
      .leftJoin(employees, eq(biometricLogs.employeeId, employees.id));

    let filtered = all;
    if (deviceId) filtered = filtered.filter(r => r.log.deviceId === Number(deviceId));

    const total = filtered.length;
    const p = Number(page), l = 50;
    const paginated = filtered.slice((p - 1) * l, p * l);

    res.json({
      logs: paginated.map(r => ({
        ...r.log,
        deviceName: r.deviceName || "",
        employeeId: r.log.employeeId || 0,
        employeeName: r.empName || "Unknown",
        punchTime: r.log.punchTime.toISOString(),
        createdAt: r.log.createdAt.toISOString(),
      })),
      total, page: p,
    });
  } catch (e) { res.status(500).json({ message: "Error", success: false }); }
});

// ─── SQLite Push DB Sync ─────────────────────────────────────────────────────

function diffHrs(t1: string, t2: string): number {
  const [h1, m1] = t1.split(":").map(Number);
  const [h2, m2] = t2.split(":").map(Number);
  return ((h2 * 60 + m2) - (h1 * 60 + m1)) / 60;
}

/**
 * POST /api/biometric/sync-sqlite
 * Upload the push.db SQLite file from the ZKTeco push server.
 * Reads attlog table, matches pin → employee biometricId, syncs attendance_records.
 */
router.post("/sync-sqlite", upload.single("db"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ success: false, message: "No database file uploaded." });
    return;
  }

  let tmpPath: string | null = null;

  try {
    const tmpDir = mkdtempSync(join(tmpdir(), "pushdb-"));
    tmpPath = join(tmpDir, "push.db");
    writeFileSync(tmpPath, req.file.buffer);

    const Database = require("better-sqlite3");
    const sqlite = new Database(tmpPath, { readonly: true });

    type AttRow = {
      pin: string;
      time: string;
      status: string;
    };

    const rows: AttRow[] = sqlite.prepare(
      "SELECT pin, time, status FROM attlog ORDER BY time ASC"
    ).all() as AttRow[];

    sqlite.close();

    if (rows.length === 0) {
      res.json({ success: true, message: "No attendance records found in the database.", stats: { created: 0, updated: 0, skipped: 0, unmatched: 0 } });
      return;
    }

    const allEmps = await db.select({
      id: employees.id,
      biometricId: employees.biometricId,
      branchId: employees.branchId,
      department: employees.department,
      shiftId: employees.shiftId,
    }).from(employees).where(eq(employees.status, "active"));

    const empByBiometricId = new Map<string, { id: number; branchId: number; department: string | null; shiftId: number | null }>();
    for (const e of allEmps) {
      if (e.biometricId) empByBiometricId.set(e.biometricId.trim(), e);
    }

    const allShifts = await db.select().from(shifts);
    const shiftMap = new Map(allShifts.map(s => [s.id, s]));
    const deptRules = await loadDeptRules();

    type DayLog = { time: string; type: "in" | "out" };
    const grouped = new Map<string, Map<string, DayLog[]>>();

    for (const row of rows) {
      const pin = (row.pin || "").trim();
      const timeStr = (row.time || "").trim();
      if (!pin || !timeStr) continue;

      const datePart = timeStr.slice(0, 10);
      const timePart = timeStr.slice(11, 16);
      if (!datePart || !timePart) continue;

      const status = String(row.status || "0");
      const punchType: "in" | "out" = (status === "1" || status === "255") ? "out" : "in";

      if (!grouped.has(pin)) grouped.set(pin, new Map());
      const byDate = grouped.get(pin)!;
      if (!byDate.has(datePart)) byDate.set(datePart, []);
      byDate.get(datePart)!.push({ time: timePart, type: punchType });
    }

    let created = 0, updated = 0, skipped = 0, unmatched = 0;

    for (const [pin, dateMap] of grouped) {
      const emp = empByBiometricId.get(pin);
      if (!emp) { unmatched += dateMap.size; continue; }

      const empShift = emp.shiftId ? shiftMap.get(emp.shiftId) : undefined;
      const rule = findRule(deptRules, emp.department ?? "", empShift?.name);
      const shiftStartMins = empShift?.startTime1 ? timeToMins(empShift.startTime1) : 8 * 60;
      const lateThresholdMins = shiftStartMins + (rule.lateGraceMinutes ?? 15);

      for (const [date, logs] of dateMap) {
        const sorted = logs.sort((a, b) => a.time.localeCompare(b.time));
        if (sorted.length === 0) { skipped++; continue; }

        const ins = sorted.filter(l => l.type === "in");
        const outs = sorted.filter(l => l.type === "out");

        const inTime = ins.length > 0 ? ins[0].time : sorted[0].time;
        const outTime = outs.length > 0 ? outs[outs.length - 1].time : (sorted.length > 1 ? sorted[sorted.length - 1].time : null);

        let totalHours: number | null = null;
        let overtimeHours: number | null = null;
        if (outTime && outTime !== inTime) {
          const diff = diffHrs(inTime, outTime);
          if (diff > 0) {
            totalHours = Math.round(diff * 100) / 100;
            const earlyMins = timeToMins(inTime) < shiftStartMins ? shiftStartMins - timeToMins(inTime) : 0;
            overtimeHours = Math.round(calcOtHours(totalHours, rule, earlyMins) * 100) / 100;
          }
        }

        const arrivalMins = timeToMins(inTime);
        const status: "present" | "late" = arrivalMins > lateThresholdMins ? "late" : "present";

        const record = {
          employeeId: emp.id,
          branchId: emp.branchId,
          date,
          status,
          inTime1: inTime,
          outTime1: outTime ?? undefined,
          workHours1: totalHours ?? undefined,
          totalHours: totalHours ?? undefined,
          overtimeHours: overtimeHours ?? undefined,
          source: "biometric" as const,
        };

        const existing = await db.select({ id: attendanceRecords.id })
          .from(attendanceRecords)
          .where(and(eq(attendanceRecords.employeeId, emp.id), eq(attendanceRecords.date, date)));

        if (existing.length > 0) {
          await db.update(attendanceRecords).set(record).where(eq(attendanceRecords.id, existing[0].id));
          updated++;
        } else {
          await db.insert(attendanceRecords).values(record);
          created++;
        }
      }
    }

    res.json({
      success: true,
      message: `Sync complete. ${created} records created, ${updated} updated, ${skipped} skipped, ${unmatched} unmatched (no employee biometric ID).`,
      stats: { created, updated, skipped, unmatched, totalPunches: rows.length },
    });

  } catch (e) {
    console.error("SQLite sync error:", e);
    res.status(500).json({ success: false, message: "Sync failed: " + (e as Error).message });
  } finally {
    if (tmpPath) {
      try { unlinkSync(tmpPath); } catch {}
    }
  }
});

export default router;
