import { Router } from "express";
import { db } from "@workspace/db";
import {
  employees, branches, attendanceRecords, holidays,
  payrollSettings, employeeSalaryAssignments, otAdjustments,
} from "@workspace/db/schema";
import { eq, and, inArray, gte, lte } from "drizzle-orm";

const router = Router();

/* ── helpers ──────────────────────────────────────────── */
function workingDaysInMonth(year: number, month: number): number {
  const days = new Date(year, month, 0).getDate();
  let wd = 0;
  for (let d = 1; d <= days; d++) {
    const dow = new Date(year, month - 1, d).getDay();
    if (dow !== 0) wd++;
  }
  return wd;
}

function normalizeType(t: string | null | undefined): "statutory" | "poya" | "public" {
  const s = (t ?? "").toLowerCase();
  if (s === "statutory" || s === "national") return "statutory";
  if (s === "poya" || s === "religious") return "poya";
  return "public";
}

/* ── GET /ot-management  ──────────────────────────────── */
router.get("/", async (req, res) => {
  try {
    const year  = Number(req.query.year  ?? new Date().getFullYear());
    const month = Number(req.query.month ?? new Date().getMonth() + 1);
    const branchId = req.query.branchId ? Number(req.query.branchId) : null;

    /* 1. Payroll settings for OT multipliers */
    const cfgRow = await db.select().from(payrollSettings).limit(1);
    const cfg: any = cfgRow[0] ?? {};
    const statutoryMult = cfg.statutoryOtMultiplier ?? 2.0;
    const poyaMult      = cfg.poyaOtMultiplier ?? 1.5;
    const publicMult    = cfg.publicHolidayOtMultiplier ?? 1.5;
    const otMult        = cfg.overtimeMultiplier ?? 1.5;
    const wdCount       = workingDaysInMonth(year, month);
    const hourlyBase    = 8;

    /* 2. Active employees (filtered by branch) */
    let empQuery = db
      .select({ emp: employees, branch: branches })
      .from(employees)
      .innerJoin(branches, eq(employees.branchId, branches.id))
      .where(eq(employees.status, "active"));

    const allEmps = await empQuery;
    const filtered = branchId
      ? allEmps.filter(r => r.emp.branchId === branchId)
      : allEmps;

    const empIds = filtered.map(r => r.emp.id);
    if (empIds.length === 0) { return res.json([]); }

    /* 3. Salary lookup */
    const salaryRows = await db
      .select({ empId: employeeSalaryAssignments.employeeId, basic: employeeSalaryAssignments.basicAmount })
      .from(employeeSalaryAssignments)
      .where(inArray(employeeSalaryAssignments.employeeId, empIds));

    const salaryMap = new Map<number, number>();
    for (const s of salaryRows) salaryMap.set(s.empId, s.basic ?? 0);

    const empOverrides: Record<string, number> = (() => {
      try { return JSON.parse(cfg.employeeOverrides ?? "{}"); } catch { return {}; }
    })();
    const salaryScale: Record<string, number> = (() => {
      try { return JSON.parse(cfg.salaryScale ?? "{}"); } catch { return {}; }
    })();

    function getBasic(emp: typeof employees.$inferSelect): number {
      if (salaryMap.has(emp.id)) return salaryMap.get(emp.id)!;
      return empOverrides[String(emp.id)] ?? salaryScale[(emp as any).designation ?? ""] ?? 40000;
    }

    /* 4. Attendance records for the month */
    const monthStr   = String(month).padStart(2, "0");
    const prefix     = `${year}-${monthStr}`;
    const attRows    = await db.select().from(attendanceRecords).where(inArray(attendanceRecords.employeeId, empIds));
    const monthlyAtt = attRows.filter(r => r.date.startsWith(prefix));

    /* 5. Holidays for this year */
    const holRows = await db.select({ date: holidays.date, type: holidays.type }).from(holidays)
      .where(and(gte(holidays.date, `${year}-01-01`), lte(holidays.date, `${year}-12-31`)));
    const holMap = new Map<string, "statutory" | "poya" | "public">();
    for (const h of holRows) holMap.set(h.date, normalizeType(h.type));

    /* 6. Stored overrides */
    const storedAdjs = await db.select().from(otAdjustments)
      .where(and(
        eq(otAdjustments.year, year),
        eq(otAdjustments.month, month),
        inArray(otAdjustments.employeeId, empIds),
      ));
    const adjMap = new Map<number, typeof otAdjustments.$inferSelect>();
    for (const a of storedAdjs) adjMap.set(a.employeeId, a);

    /* 7. Build per-employee OT summary */
    const results = filtered.map(({ emp, branch }) => {
      const basic      = getBasic(emp);
      const dailyRate  = basic / 30;
      const regularHourlyRate  = basic / (wdCount * hourlyBase);
      const holidayHourlyRate  = basic / 240;

      const empAtt = monthlyAtt.filter(r => r.employeeId === emp.id);

      let regularOtHours  = 0;
      let holidayOtHours  = 0;
      let holidayOtAmount = 0;

      for (const rec of empAtt) {
        const isHol = holMap.has(rec.date);
        const totalHrs = rec.totalHours ?? 0;

        if (isHol && totalHrs > 0 && rec.status !== "off_day") {
          const hType = holMap.get(rec.date)!;
          const mult  = hType === "statutory" ? statutoryMult
                      : hType === "poya"      ? poyaMult
                      : publicMult;
          holidayOtHours  += totalHrs;
          holidayOtAmount += Math.round(totalHrs * holidayHourlyRate * mult);
        } else if (!isHol && rec.status !== "holiday" && rec.status !== "off_day") {
          regularOtHours += rec.overtimeHours ?? 0;
        }
      }

      const regularOtAmount = Math.round(regularOtHours * regularHourlyRate * otMult);

      const adj = adjMap.get(emp.id);

      const effectiveRegularOtHours  = adj?.isManualOverride && adj.adjustedRegularOtHours  != null ? adj.adjustedRegularOtHours  : regularOtHours;
      const effectiveRegularOtAmount = adj?.isManualOverride && adj.adjustedRegularOtAmount != null ? adj.adjustedRegularOtAmount : regularOtAmount;
      const effectiveHolidayOtHours  = adj?.isManualOverride && adj.adjustedHolidayOtHours  != null ? adj.adjustedHolidayOtHours  : holidayOtHours;
      const effectiveHolidayOtAmount = adj?.isManualOverride && adj.adjustedHolidayOtAmount != null ? adj.adjustedHolidayOtAmount : holidayOtAmount;

      return {
        id:               adj?.id ?? null,
        employeeId:       emp.id,
        employeeCode:     emp.employeeId,
        employeeName:     emp.fullName,
        department:       emp.department,
        branchName:       branch.name,
        branchId:         emp.branchId,
        basicSalary:      basic,

        autoRegularOtHours:   regularOtHours,
        autoRegularOtAmount:  regularOtAmount,
        autoHolidayOtHours:   holidayOtHours,
        autoHolidayOtAmount:  holidayOtAmount,
        autoTotalOtAmount:    regularOtAmount + holidayOtAmount,

        isManualOverride:         adj?.isManualOverride ?? false,
        adjustedRegularOtHours:   adj?.adjustedRegularOtHours  ?? null,
        adjustedRegularOtAmount:  adj?.adjustedRegularOtAmount ?? null,
        adjustedHolidayOtHours:   adj?.adjustedHolidayOtHours  ?? null,
        adjustedHolidayOtAmount:  adj?.adjustedHolidayOtAmount ?? null,

        effectiveRegularOtHours,
        effectiveRegularOtAmount,
        effectiveHolidayOtHours,
        effectiveHolidayOtAmount,
        effectiveTotalOtAmount: effectiveRegularOtAmount + effectiveHolidayOtAmount,

        notes:  adj?.notes  ?? null,
        status: adj?.status ?? "pending",
      };
    });

    res.json(results);
  } catch (e) { console.error(e); res.status(500).json({ message: "Error", success: false }); }
});

/* ── PUT /ot-management/:employeeId  ──────────────────── */
router.put("/:employeeId", async (req, res) => {
  try {
    const employeeId = Number(req.params.employeeId);
    const { year, month, isManualOverride,
            adjustedRegularOtHours, adjustedRegularOtAmount,
            adjustedHolidayOtHours, adjustedHolidayOtAmount,
            autoRegularOtHours, autoRegularOtAmount,
            autoHolidayOtHours, autoHolidayOtAmount,
            notes } = req.body;

    const existing = await db.select().from(otAdjustments)
      .where(and(
        eq(otAdjustments.employeeId, employeeId),
        eq(otAdjustments.year, Number(year)),
        eq(otAdjustments.month, Number(month)),
      )).limit(1);

    const payload = {
      autoRegularOtHours:   Number(autoRegularOtHours  ?? 0),
      autoRegularOtAmount:  Number(autoRegularOtAmount  ?? 0),
      autoHolidayOtHours:   Number(autoHolidayOtHours  ?? 0),
      autoHolidayOtAmount:  Number(autoHolidayOtAmount  ?? 0),
      isManualOverride:     Boolean(isManualOverride),
      adjustedRegularOtHours:   isManualOverride ? Number(adjustedRegularOtHours)  : null,
      adjustedRegularOtAmount:  isManualOverride ? Number(adjustedRegularOtAmount) : null,
      adjustedHolidayOtHours:   isManualOverride ? Number(adjustedHolidayOtHours)  : null,
      adjustedHolidayOtAmount:  isManualOverride ? Number(adjustedHolidayOtAmount) : null,
      notes: notes ?? null,
      updatedAt: new Date(),
    };

    let result;
    if (existing.length > 0) {
      [result] = await db.update(otAdjustments).set(payload)
        .where(eq(otAdjustments.id, existing[0].id)).returning();
    } else {
      [result] = await db.insert(otAdjustments).values({
        employeeId,
        year:  Number(year),
        month: Number(month),
        status: "pending",
        ...payload,
      }).returning();
    }

    res.json({ success: true, data: result });
  } catch (e) { console.error(e); res.status(500).json({ message: "Error", success: false }); }
});

/* ── POST /ot-management/:employeeId/approve  ─────────── */
router.post("/:employeeId/approve", async (req, res) => {
  try {
    const employeeId = Number(req.params.employeeId);
    const { year, month } = req.body;

    const existing = await db.select().from(otAdjustments)
      .where(and(
        eq(otAdjustments.employeeId, employeeId),
        eq(otAdjustments.year, Number(year)),
        eq(otAdjustments.month, Number(month)),
      )).limit(1);

    if (existing.length > 0) {
      const [updated] = await db.update(otAdjustments)
        .set({ status: "approved", updatedAt: new Date() })
        .where(eq(otAdjustments.id, existing[0].id)).returning();
      return res.json({ success: true, data: updated });
    } else {
      const [created] = await db.insert(otAdjustments).values({
        employeeId,
        year:  Number(year),
        month: Number(month),
        autoRegularOtHours:  Number(req.body.autoRegularOtHours ?? 0),
        autoRegularOtAmount: Number(req.body.autoRegularOtAmount ?? 0),
        autoHolidayOtHours:  Number(req.body.autoHolidayOtHours ?? 0),
        autoHolidayOtAmount: Number(req.body.autoHolidayOtAmount ?? 0),
        isManualOverride: false,
        status: "approved",
      }).returning();
      return res.json({ success: true, data: created });
    }
  } catch (e) { console.error(e); res.status(500).json({ message: "Error", success: false }); }
});

/* ── POST /ot-management/:employeeId/pay  ─────────────── */
router.post("/:employeeId/pay", async (req, res) => {
  try {
    const employeeId = Number(req.params.employeeId);
    const { year, month } = req.body;

    const existing = await db.select().from(otAdjustments)
      .where(and(
        eq(otAdjustments.employeeId, employeeId),
        eq(otAdjustments.year, Number(year)),
        eq(otAdjustments.month, Number(month)),
      )).limit(1);

    if (existing.length > 0) {
      const [updated] = await db.update(otAdjustments)
        .set({ status: "paid", updatedAt: new Date() })
        .where(eq(otAdjustments.id, existing[0].id)).returning();
      return res.json({ success: true, data: updated });
    }
    res.status(404).json({ message: "No OT record found — approve first", success: false });
  } catch (e) { console.error(e); res.status(500).json({ message: "Error", success: false }); }
});

/* ── DELETE /ot-management/:employeeId/override  ─────── */
router.delete("/:employeeId/override", async (req, res) => {
  try {
    const employeeId = Number(req.params.employeeId);
    const year  = Number(req.query.year);
    const month = Number(req.query.month);

    await db.update(otAdjustments)
      .set({
        isManualOverride: false,
        adjustedRegularOtHours:  null,
        adjustedRegularOtAmount: null,
        adjustedHolidayOtHours:  null,
        adjustedHolidayOtAmount: null,
        updatedAt: new Date(),
      })
      .where(and(
        eq(otAdjustments.employeeId, employeeId),
        eq(otAdjustments.year, year),
        eq(otAdjustments.month, month),
      ));

    res.json({ success: true });
  } catch (e) { console.error(e); res.status(500).json({ message: "Error", success: false }); }
});

export default router;
