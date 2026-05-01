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
import { loadDeptRules, findRule, timeToMins, calcOtHours, isNightShiftRecord } from "../lib/hr-rules.js";

const require = createRequire(join(process.cwd(), "package.json"));

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

/**
 * Hours between two "HH:MM" strings.
 * Handles midnight crossover automatically: if t2 < t1, assumes the span
 * crosses midnight and adds 24 h to the difference.
 */
function diffHrs(t1: string, t2: string): number {
  const [h1, m1] = t1.split(":").map(Number);
  const [h2, m2] = t2.split(":").map(Number);
  let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
  if (diff < 0) diff += 24 * 60; // midnight crossover
  return diff / 60;
}

/**
 * For night-shift employees, normalise a "HH:MM" minute value so that
 * after-midnight times sort AFTER evening times.
 * Uses noon (12:00 = 720 min) as the crossover boundary.
 *   e.g. "01:30" (90 min) → 90 + 1440 = 1530   (sorts after "23:30" = 1410)
 *        "20:00" (1200 min) → 1200               (unchanged)
 */
function nightNorm(hhmm: string): number {
  const m = timeToMins(hhmm);
  return m < 12 * 60 ? m + 24 * 60 : m;
}

/**
 * Re-attribute a punch's calendar date to its "work date" for night-shift
 * employees.  Any punch before noon belongs to the PREVIOUS night's shift.
 */
function nightWorkDate(calendarDate: string, timePart: string): string {
  if (timeToMins(timePart) < 12 * 60) {
    const d = new Date(calendarDate + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
  }
  return calendarDate;
}

/**
 * Compute Night Watcher OT hours from the FULL list of punch times for a
 * single night's shift (all punches, not just 4 slots).
 *
 * OT window: otStart (default 05:00) → otEnd (default 08:00), max 3 hours.
 * Base OT is determined from how late the last punch is:
 *   ≥ 07:50 → 3 h,  ≥ 07:00 → 2 h,  ≥ 06:00 → 1 h,  < 06:00 → 0 h
 * Each required hourly checkpoint (05:xx, 06:xx, 07:xx) that has NO punch
 * within that 60-minute window deducts 1 h from OT.
 */
function nightWatcherOtFromPunches(
  punchTimes: string[],
  otStart = "05:00",
  otEnd = "08:00",
  nearEndGraceMinutes = 10,
): number {
  if (punchTimes.length === 0) return 0;

  // Night-normalise the OT boundary times so they compare correctly against
  // nightNorm(punch) values (e.g. 05:00 raw = 300 min → +1440 = 1740 norm).
  const rawStart  = timeToMins(otStart);
  const rawEnd    = timeToMins(otEnd);
  const normStart = rawStart < 12 * 60 ? rawStart + 24 * 60 : rawStart; // e.g. 1740
  const normEnd   = rawEnd   < 12 * 60 ? rawEnd   + 24 * 60 : rawEnd;   // e.g. 1920
  const nearEnd   = normEnd - nearEndGraceMinutes;                        // e.g. 1910

  const normMins = punchTimes.map(nightNorm);
  const lastMins = Math.max(...normMins);

  let baseOt = 0;
  if (lastMins >= nearEnd)              baseOt = 3; // last punch ≥ 07:50
  else if (lastMins >= normStart + 120) baseOt = 2; // last punch ≥ 07:00
  else if (lastMins >= normStart + 60)  baseOt = 1; // last punch ≥ 06:00

  if (baseOt === 0) return 0;

  // Each required hourly checkpoint that has no punch deducts 1 h from OT
  const checkpoints = [normStart, normStart + 60, normStart + 120]; // 05, 06, 07 (normalised)
  let missing = 0;
  for (let i = 0; i < baseOt; i++) {
    const cp = checkpoints[i];
    const hasPunch = normMins.some(p => p >= cp && p < cp + 60);
    if (!hasPunch) missing++;
  }

  return Math.max(0, Math.min(3, baseOt - missing));
}

/**
 * Build the 4 attendance time-slots from ALL punch times for a night shift.
 * Slot strategy:
 *   inTime1  = first punch  (shift start)
 *   outTime1 = last punch before OT window  (< otStart)
 *   inTime2  = first punch inside OT window (≥ otStart)
 *   outTime2 = last punch  (shift end / OT end)
 *
 * This ensures calcNightWatcherPolicyOtHours receives the most useful
 * timestamps in the 4 available slots.
 */
function nightSlots(sortedPunches: string[], otStartTime = "05:00"): {
  inTime1: string;
  outTime1: string | null;
  inTime2: string | null;
  outTime2: string | null;
} {
  const rawStart  = timeToMins(otStartTime);
  // Night-normalise the OT boundary so it compares correctly with nightNorm() punch values.
  // e.g. "05:00" raw = 300 → normalised = 1740 (after midnight → +1440)
  const normOtStart = rawStart < 12 * 60 ? rawStart + 24 * 60 : rawStart;

  // Separate pre-OT and OT-window punches using night-normalised minutes
  const preOt  = sortedPunches.filter(t => nightNorm(t) < normOtStart);
  const inOt   = sortedPunches.filter(t => nightNorm(t) >= normOtStart);

  const inTime1  = sortedPunches[0];
  const outTime1 = preOt.length >= 2 ? preOt[preOt.length - 1] : (preOt.length === 1 && preOt[0] !== inTime1 ? preOt[0] : null);
  const inTime2  = inOt.length >= 1 ? inOt[0] : null;
  const outTime2 = inOt.length >= 2 ? inOt[inOt.length - 1] : (inOt.length === 1 ? inOt[0] : null);

  // De-duplicate adjacent identical slots
  return {
    inTime1,
    outTime1: outTime1 !== inTime1 ? outTime1 : null,
    inTime2,
    outTime2: outTime2 !== inTime2 ? outTime2 : null,
  };
}

type AttRow = { pin: string; time: string; status: string };

async function processAttRows(rows: AttRow[]) {
  type Stats = { created: number; updated: number; skipped: number; unmatched: number };
  const stats: Stats = { created: 0, updated: 0, skipped: 0, unmatched: 0 };

  if (rows.length === 0) return stats;

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

  // Pre-compute night-shift indicator per PIN so we can group correctly
  const nightShiftPins = new Set<string>();
  for (const [pin, emp] of empByBiometricId) {
    const s = emp.shiftId ? shiftMap.get(emp.shiftId) : undefined;
    if (isNightShiftRecord(s?.startTime1)) nightShiftPins.add(pin);
  }

  type DayLog = { time: string; type: "in" | "out" };
  const grouped = new Map<string, Map<string, DayLog[]>>();

  for (const row of rows) {
    const pin = (row.pin || "").trim();
    const timeStr = (row.time || "").trim();
    if (!pin || !timeStr) continue;

    const calendarDate = timeStr.slice(0, 10);
    const timePart = timeStr.slice(11, 16);
    if (!calendarDate || !timePart) continue;

    const status = String(row.status || "0");
    const punchType: "in" | "out" = (status === "1" || status === "255") ? "out" : "in";

    // For night-shift employees: punches before noon belong to the previous shift's work date
    const workDate = nightShiftPins.has(pin)
      ? nightWorkDate(calendarDate, timePart)
      : calendarDate;

    if (!grouped.has(pin)) grouped.set(pin, new Map());
    const byDate = grouped.get(pin)!;
    if (!byDate.has(workDate)) byDate.set(workDate, []);
    byDate.get(workDate)!.push({ time: timePart, type: punchType });
  }

  for (const [pin, dateMap] of grouped) {
    const emp = empByBiometricId.get(pin);
    if (!emp) { stats.unmatched += dateMap.size; continue; }

    const empShift = emp.shiftId ? shiftMap.get(emp.shiftId) : undefined;
    const rule = findRule(deptRules, emp.department ?? "", empShift?.name);
    const isNightShift = isNightShiftRecord(empShift?.startTime1) || (rule.nightWatcherPayroll ?? false);
    const shiftStartMins = empShift?.startTime1 ? timeToMins(empShift.startTime1) : 8 * 60;
    const lateThresholdMins = shiftStartMins + (rule.lateGraceMinutes ?? 15);

    for (const [date, logs] of dateMap) {
      if (logs.length === 0) { stats.skipped++; continue; }

      // Sort punches – for night shifts, after-midnight times sort after evening times
      const sorted = isNightShift
        ? logs.slice().sort((a, b) => nightNorm(a.time) - nightNorm(b.time))
        : logs.slice().sort((a, b) => a.time.localeCompare(b.time));

      const allTimes = sorted.map(l => l.time);

      let inTime1: string, outTime1: string | null, inTime2: string | null, outTime2: string | null;
      let workHours1: number | null = null;
      let workHours2: number | null = null;
      let totalHours: number | null = null;
      let overtimeHours: number | null = null;

      if (isNightShift) {
        // ── Night Watcher special handling ──────────────────────────────
        const otStart = rule.otStartTime ?? "05:00";
        const slots = nightSlots(allTimes, otStart);
        inTime1  = slots.inTime1;
        outTime1 = slots.outTime1;
        inTime2  = slots.inTime2;
        outTime2 = slots.outTime2;

        // Total hours = first punch to last punch (with midnight crossover)
        const firstPunch = allTimes[0];
        const lastPunch  = allTimes[allTimes.length - 1];
        const th = diffHrs(firstPunch, lastPunch);
        if (th > 0) totalHours = Math.round(th * 100) / 100;

        // Regular shift hours (before OT window)
        if (outTime1) {
          const d = diffHrs(inTime1, outTime1);
          if (d > 0) workHours1 = Math.round(d * 100) / 100;
        }
        // OT window hours
        if (inTime2 && outTime2) {
          const d = diffHrs(inTime2, outTime2);
          if (d > 0) workHours2 = Math.round(d * 100) / 100;
        }

        // OT computed from ALL punches so no hourly checkpoint is missed
        overtimeHours = nightWatcherOtFromPunches(allTimes, otStart);

      } else {
        // ── Regular / day-shift handling ─────────────────────────────────
        inTime1  = allTimes[0];
        const count = allTimes.length;
        outTime1 = count >= 2 ? allTimes[1] : null;
        inTime2  = count >= 3 ? allTimes[count - 2] : null;
        outTime2 = count >= 3 ? allTimes[count - 1] : null;

        if (outTime1 && outTime1 !== inTime1) {
          const d = diffHrs(inTime1, outTime1);
          if (d > 0) workHours1 = Math.round(d * 100) / 100;
        }
        if (inTime2 && outTime2 && outTime2 !== inTime2) {
          const d = diffHrs(inTime2, outTime2);
          if (d > 0) workHours2 = Math.round(d * 100) / 100;
        }

        const sumHrs = (workHours1 ?? 0) + (workHours2 ?? 0);
        if (sumHrs > 0) {
          totalHours = Math.round(sumHrs * 100) / 100;
          const earlyMins = timeToMins(inTime1) < shiftStartMins ? shiftStartMins - timeToMins(inTime1) : 0;
          overtimeHours = Math.round(calcOtHours(totalHours, rule, earlyMins) * 100) / 100;
        }
      }

      const arrivalMins = isNightShift ? nightNorm(inTime1) : timeToMins(inTime1);
      const effectiveShiftStartMins = isNightShift ? nightNorm(empShift?.startTime1 ?? "20:00") : shiftStartMins;
      const status: "present" | "late" = arrivalMins > effectiveShiftStartMins + (rule.lateGraceMinutes ?? 15)
        ? "late" : "present";

      const record: any = {
        employeeId: emp.id,
        branchId: emp.branchId,
        date,
        status,
        inTime1,
        outTime1,
        workHours1,
        inTime2,
        outTime2,
        workHours2,
        totalHours,
        overtimeHours,
        source: "biometric" as const,
      };

      const existing = await db.select({ id: attendanceRecords.id })
        .from(attendanceRecords)
        .where(and(eq(attendanceRecords.employeeId, emp.id), eq(attendanceRecords.date, date)));

      if (existing.length > 0) {
        await db.update(attendanceRecords).set(record).where(eq(attendanceRecords.id, existing[0].id));
        stats.updated++;
      } else {
        await db.insert(attendanceRecords).values(record);
        stats.created++;
      }
    }
  }

  return stats;
}

/**
 * POST /api/biometric/sync-txt
 * Upload a plain-text attendance dump (whitespace-separated columns:
 *   pin   YYYY-MM-DD HH:MM:SS   status   [extra cols...]
 * ). Same processing as sync-sqlite.
 */
router.post("/sync-txt", upload.single("file"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ success: false, message: "No file uploaded." });
    return;
  }
  try {
    const text = req.file.buffer.toString("utf8");
    const rows: AttRow[] = [];
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line) continue;
      // pin then "YYYY-MM-DD HH:MM:SS" then status then extras
      const m = line.match(/^(\S+)\s+(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\s+(\S+)/);
      if (!m) continue;
      rows.push({ pin: m[1], time: m[2], status: m[3] });
    }
    if (rows.length === 0) {
      res.status(400).json({ success: false, message: "No valid punch lines found in file." });
      return;
    }
    const stats = await processAttRows(rows);
    res.json({
      success: true,
      message: `Sync complete. ${stats.created} records created, ${stats.updated} updated, ${stats.skipped} skipped, ${stats.unmatched} unmatched (no employee biometric ID).`,
      stats: { ...stats, totalPunches: rows.length },
    });
  } catch (e) {
    console.error("TXT sync error:", e);
    res.status(500).json({ success: false, message: "Sync failed: " + (e as Error).message });
  }
});

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

    const rows: AttRow[] = sqlite.prepare(
      "SELECT pin, time, status FROM attlog ORDER BY time ASC"
    ).all() as AttRow[];

    sqlite.close();

    if (rows.length === 0) {
      res.json({ success: true, message: "No attendance records found in the database.", stats: { created: 0, updated: 0, skipped: 0, unmatched: 0 } });
      return;
    }

    const stats = await processAttRows(rows);
    res.json({
      success: true,
      message: `Sync complete. ${stats.created} records created, ${stats.updated} updated, ${stats.skipped} skipped, ${stats.unmatched} unmatched (no employee biometric ID).`,
      stats: { ...stats, totalPunches: rows.length },
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

// ─── AccSoft PDF Import ───────────────────────────────────────────────────────

function to24h(time12: string): string {
  const m = time12.match(/^(\d{1,2}):(\d{2}):(\d{2})(AM|PM)$/i);
  if (!m) return time12.slice(0, 5);
  let hours = parseInt(m[1], 10);
  const mins = m[2];
  const secs = m[3];
  const period = m[4].toUpperCase();
  if (period === "AM" && hours === 12) hours = 0;
  if (period === "PM" && hours !== 12) hours += 12;
  return `${String(hours).padStart(2, "0")}:${mins}:${secs}`;
}

/**
 * POST /api/biometric/parse-pdf
 * Upload an AccSoft Timetrack Raw Data Report PDF.
 * Returns parsed date + time rows (employee selection happens on the frontend).
 */
router.post("/parse-pdf", upload.single("pdf"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ success: false, message: "No PDF file uploaded." });
    return;
  }
  try {
    const pdfParse = require("pdf-parse");
    const data = await pdfParse(req.file.buffer);
    const text: string = data.text;

    const rows: { date: string; time: string }[] = [];
    for (const line of text.split(/\n/)) {
      const dateMatch = line.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      const timeMatch = line.match(/(\d{1,2}:\d{2}:\d{2}\s*[AP]M)/i);
      if (dateMatch && timeMatch) {
        const [, dd, mm, yyyy] = dateMatch;
        const date = `${yyyy}-${mm}-${dd}`;
        const time = to24h(timeMatch[1].replace(/\s+/g, ""));
        rows.push({ date, time });
      }
    }

    if (rows.length === 0) {
      res.status(400).json({ success: false, message: "No valid date/time rows found in this PDF. Make sure it is an AccSoft Raw Data Report." });
      return;
    }

    res.json({ success: true, rows, total: rows.length });
  } catch (e) {
    console.error("PDF parse error:", e);
    res.status(500).json({ success: false, message: "PDF parse failed: " + (e as Error).message });
  }
});

/**
 * POST /api/biometric/import-pdf-rows
 * Body: { employeeId: number, rows: [{ date: "YYYY-MM-DD", time: "HH:MM:SS" }] }
 * Saves parsed PDF rows as attendance records for the chosen employee.
 */
router.post("/import-pdf-rows", async (req, res) => {
  const { employeeId, rows } = req.body as { employeeId: number; rows: { date: string; time: string }[] };

  if (!employeeId || !Array.isArray(rows) || rows.length === 0) {
    res.status(400).json({ success: false, message: "employeeId and rows are required." });
    return;
  }

  try {
    const [emp] = await db.select({
      id: employees.id,
      branchId: employees.branchId,
      department: employees.department,
      shiftId: employees.shiftId,
    }).from(employees).where(eq(employees.id, employeeId));

    if (!emp) {
      res.status(404).json({ success: false, message: "Employee not found." });
      return;
    }

    const allShifts = await db.select().from(shifts);
    const shiftMap = new Map(allShifts.map(s => [s.id, s]));
    const deptRules = await loadDeptRules();
    const empShift = emp.shiftId ? shiftMap.get(emp.shiftId) : undefined;
    const rule = findRule(deptRules, emp.department ?? "", empShift?.name);
    const isNightShift = isNightShiftRecord(empShift?.startTime1) || (rule.nightWatcherPayroll ?? false);
    const shiftStartMins = empShift?.startTime1 ? timeToMins(empShift.startTime1) : 8 * 60;
    const otStart = rule.otStartTime ?? "05:00";

    // Group punches by WORK date (night-shift aware)
    const byDate = new Map<string, string[]>();
    for (const row of rows) {
      if (!row.date || !row.time) continue;
      const timePart = row.time.slice(0, 5); // HH:MM
      const workDate = isNightShift ? nightWorkDate(row.date, timePart) : row.date;
      if (!byDate.has(workDate)) byDate.set(workDate, []);
      byDate.get(workDate)!.push(timePart);
    }

    let created = 0, updated = 0, skipped = 0;

    for (const [date, times] of byDate) {
      if (times.length === 0) { skipped++; continue; }

      // Sort – night-shift aware
      const sorted = isNightShift
        ? [...times].sort((a, b) => nightNorm(a) - nightNorm(b))
        : [...times].sort();

      let inTime1: string, outTime1: string | null, inTime2: string | null, outTime2: string | null;
      let workHours1: number | null = null;
      let workHours2: number | null = null;
      let totalHours: number | null = null;
      let overtimeHours: number | null = null;

      if (isNightShift) {
        const slots = nightSlots(sorted, otStart);
        inTime1  = slots.inTime1;
        outTime1 = slots.outTime1;
        inTime2  = slots.inTime2;
        outTime2 = slots.outTime2;

        // Total hours: first to last punch with midnight crossover
        const th = diffHrs(sorted[0], sorted[sorted.length - 1]);
        if (th > 0) totalHours = Math.round(th * 100) / 100;

        if (outTime1) {
          const d = diffHrs(inTime1, outTime1);
          if (d > 0) workHours1 = Math.round(d * 100) / 100;
        }
        if (inTime2 && outTime2) {
          const d = diffHrs(inTime2, outTime2);
          if (d > 0) workHours2 = Math.round(d * 100) / 100;
        }

        overtimeHours = nightWatcherOtFromPunches(sorted, otStart);

      } else {
        const count = sorted.length;
        inTime1  = sorted[0];
        outTime1 = count >= 2 ? sorted[1] : null;
        inTime2  = count >= 3 ? sorted[count - 2] : null;
        outTime2 = count >= 3 ? sorted[count - 1] : null;

        if (outTime1 && outTime1 !== inTime1) {
          const d = diffHrs(inTime1, outTime1);
          if (d > 0) workHours1 = Math.round(d * 100) / 100;
        }
        if (inTime2 && outTime2 && outTime2 !== inTime2) {
          const d = diffHrs(inTime2, outTime2);
          if (d > 0) workHours2 = Math.round(d * 100) / 100;
        }

        const sumHrs = (workHours1 ?? 0) + (workHours2 ?? 0);
        if (sumHrs > 0) {
          totalHours = Math.round(sumHrs * 100) / 100;
          const earlyMins = timeToMins(inTime1) < shiftStartMins ? shiftStartMins - timeToMins(inTime1) : 0;
          overtimeHours = Math.round(calcOtHours(totalHours, rule, earlyMins) * 100) / 100;
        }
      }

      const arrivalMins = isNightShift ? nightNorm(inTime1) : timeToMins(inTime1);
      const lateThreshold = isNightShift
        ? nightNorm(empShift?.startTime1 ?? "20:00") + (rule.lateGraceMinutes ?? 15)
        : shiftStartMins + (rule.lateGraceMinutes ?? 15);
      const status: "present" | "late" = arrivalMins > lateThreshold ? "late" : "present";

      const record: any = {
        employeeId: emp.id,
        branchId: emp.branchId,
        date,
        status,
        inTime1,
        outTime1,
        workHours1,
        inTime2,
        outTime2,
        workHours2,
        totalHours,
        overtimeHours,
        source: "biometric" as const,
        approvalStatus: "approved" as const,
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

    res.json({
      success: true,
      message: `Import complete. ${created} records created, ${updated} updated, ${skipped} skipped.`,
      stats: { created, updated, skipped, totalPunches: rows.length, totalDays: byDate.size },
    });
  } catch (e) {
    console.error("PDF import error:", e);
    res.status(500).json({ success: false, message: "Import failed: " + (e as Error).message });
  }
});

export default router;
