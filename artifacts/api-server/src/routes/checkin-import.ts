import { Router } from "express";
import multer from "multer";
import * as XLSX from "xlsx";
import { db } from "@workspace/db";
import { attendanceRecords, employees, branches, shifts } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { loadDeptRules, findRule, timeToMins, calcOtHours } from "../lib/hr-rules.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

function parseTime(dateTimeStr: string): { date: string; time: string } | null {
  if (!dateTimeStr) return null;
  const m = String(dateTimeStr).match(/^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}:\d{2})/);
  if (!m) return null;
  return {
    date: `${m[3]}-${m[2]}-${m[1]}`,
    time: m[4],
  };
}

function diffHrs(t1: string, t2: string): number {
  const [h1, m1] = t1.split(":").map(Number);
  const [h2, m2] = t2.split(":").map(Number);
  return ((h2 * 60 + m2) - (h1 * 60 + m1)) / 60;
}

router.post("/import", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded." });
    }

    const wb = XLSX.read(req.file.buffer, { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });

    const dataRows = rawRows.slice(1).filter(r => r[2] && r[3]);

    type LogEntry = { time: string; logType: string; deviceId: string; shift: string };
    const grouped = new Map<string, Map<string, { empName: string; logs: LogEntry[] }>>();

    for (const row of dataRows) {
      const empCode = String(row[2] || "").trim();
      const empName = String(row[6] || "").trim();
      const timeStr = String(row[3] || "").trim();
      const logType = String(row[7] || "IN").trim().toUpperCase();
      const deviceId = String(row[9] || "").trim();
      const shift = String(row[8] || "").trim();

      const parsed = parseTime(timeStr);
      if (!parsed || !empCode) continue;

      if (!grouped.has(empCode)) grouped.set(empCode, new Map());
      const byDate = grouped.get(empCode)!;
      if (!byDate.has(parsed.date)) byDate.set(parsed.date, { empName, logs: [] });
      byDate.get(parsed.date)!.logs.push({ time: parsed.time, logType, deviceId, shift });
    }

    let defaultBranchId: number | null = null;
    const allBranches = await db.select({ id: branches.id }).from(branches).limit(1);
    if (allBranches.length > 0) defaultBranchId = allBranches[0].id;

    if (!defaultBranchId) {
      const [inserted] = await db.insert(branches).values({
        name: "drivethru Head Office",
        code: "DT-HQ",
        type: "head_office",
        isActive: true,
      }).returning({ id: branches.id });
      defaultBranchId = inserted.id;
    }

    /* Load HR rules + shifts so late/OT thresholds come from settings */
    const deptRules  = await loadDeptRules();
    const allShifts  = await db.select().from(shifts);
    const shiftMap   = new Map(allShifts.map(s => [s.id, s]));

    const empCache    = new Map<string, { id: number; department: string | null; shiftId: number | null }>();
    const allEmps     = await db.select({
      id: employees.id, employeeId: employees.employeeId,
      department: employees.department, shiftId: employees.shiftId,
    }).from(employees);
    for (const e of allEmps) empCache.set(e.employeeId, { id: e.id, department: e.department, shiftId: e.shiftId });

    let created = 0, updated = 0, skipped = 0, newEmp = 0;

    for (const [empCode, dateMap] of grouped) {
      let empEntry = empCache.get(empCode);

      if (!empEntry) {
        const firstName = dateMap.values().next().value?.empName || empCode;
        try {
          const [ins] = await db.insert(employees).values({
            employeeId: empCode,
            fullName: firstName,
            firstName,
            designation: "Staff",
            department: "General",
            branchId: defaultBranchId,
            joiningDate: new Date().toISOString().split("T")[0],
            email: `${empCode.toLowerCase().replace(/-/g, ".")}@drivethru.lk`,
            phone: "+94-000-0000000",
            status: "active",
          }).returning({ id: employees.id });
          empEntry = { id: ins.id, department: "General", shiftId: null };
          empCache.set(empCode, empEntry);
          newEmp++;
        } catch {
          skipped++;
          continue;
        }
      }

      /* Resolve HR rule and shift for this employee (drives late & OT thresholds) */
      const empShift = empEntry.shiftId ? shiftMap.get(empEntry.shiftId) : undefined;
      const rule     = findRule(deptRules, empEntry.department ?? "", empShift?.name);
      const shiftStartMins = empShift?.startTime1 ? timeToMins(empShift.startTime1) : 8 * 60;
      const lateThresholdMins = shiftStartMins + (rule.lateGraceMinutes ?? 15);

      for (const [date, { logs }] of dateMap) {
        const sorted = logs
          .filter(l => l.logType === "IN" || l.logType === "OUT")
          .sort((a, b) => a.time.localeCompare(b.time));
        if (sorted.length === 0) { skipped++; continue; }

        const inTime = sorted[0].time;
        const outTime = sorted.length > 1 ? sorted[sorted.length - 1].time : null;

        let totalHours: number | null = null;
        let overtimeHours: number | null = null;
        if (outTime && outTime !== inTime) {
          const diff = diffHrs(inTime, outTime);
          if (diff > 0) {
            totalHours = Math.round(diff * 100) / 100;
            /* OT hours from HR rule (accounts for lunch, threshold) */
            const earlyMins = timeToMins(inTime) < shiftStartMins
              ? shiftStartMins - timeToMins(inTime) : 0;
            overtimeHours = Math.round(calcOtHours(totalHours, rule, earlyMins) * 100) / 100;
          }
        }

        const arrivalMins = timeToMins(inTime);
        const status: "present" | "late" = arrivalMins > lateThresholdMins ? "late" : "present";

        const record = {
          employeeId: empEntry.id,
          branchId: defaultBranchId,
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
          .where(and(eq(attendanceRecords.employeeId, empId), eq(attendanceRecords.date, date)));

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
      message: `Import complete. ${created} records created, ${updated} updated, ${skipped} skipped. ${newEmp} new employees added.`,
      stats: { created, updated, skipped, newEmployees: newEmp },
    });
  } catch (e) {
    console.error("Checkin import error:", e);
    res.status(500).json({ success: false, message: "Import failed: " + (e as Error).message });
  }
});

export default router;
