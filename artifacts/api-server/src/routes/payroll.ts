import { Router } from "express";
import { db } from "@workspace/db";
import {
  payrollRecords, employees, attendanceRecords, payrollSettings,
  salaryStructures, employeeSalaryAssignments, holidays, shifts, staffLoans,
  weekoffSchedules, biometricLogs, loanEmiLedger, otAdjustments, staffIncentives,
} from "@workspace/db/schema";
import { eq, and, inArray, gte, lte, sql } from "drizzle-orm";
import {
  loadDeptRules, findRule, effectiveHours, calcOtHours, lateCutoffMins,
  timeToMins, calcLunchLateMinutes, calcTimeBasedOtHours,
  isNightShiftRecord, calcNightWatcherPolicyOtHours, calcNightWatcherOtFromAllPunches,
  DEFAULT_RULE,
} from "../lib/hr-rules.js";
import { processSalaryRow, resolveDayShift, type WeekOffInfo } from "../lib/salary-engine.js";

const STATUTORY_NAMES = ["EPF – Employee", "EPF – Employer", "ETF"];

const router = Router();

async function getPayrollSettings() {
  const [existing] = await db.select().from(payrollSettings);
  const row = existing ?? (await db.insert(payrollSettings).values({}).returning())[0];
  return {
    ...row,
    salaryScale: JSON.parse(row.salaryScale) as Record<string, number>,
    employeeOverrides: JSON.parse(row.employeeOverrides ?? "{}") as Record<string, number>,
    apitOverrides: JSON.parse((row as any).apitOverrides ?? "{}") as Record<string, number>,
    epfEtfExemptIds: JSON.parse((row as any).epfEtfExemptIds ?? "[]") as number[],
  };
}

async function getMonthHolidays(year: number, month: number) {
  const allHolidays = await db.select().from(holidays);
  const prefix = `${year}-${String(month).padStart(2, "0")}`;
  return allHolidays.filter(h => h.date.startsWith(prefix));
}

function calcAPIT(grossMonthly: number): number {
  const annual = grossMonthly * 12;
  if (annual <= 1800000) return 0;
  if (annual <= 3000000) return Math.round(((annual - 1800000) * 0.06) / 12);
  if (annual <= 4200000) return Math.round(((1200000 * 0.06 + (annual - 3000000) * 0.12) / 12));
  if (annual <= 5400000) return Math.round(((1200000 * 0.06 + 1200000 * 0.12 + (annual - 4200000) * 0.18) / 12));
  if (annual <= 6600000) return Math.round(((1200000 * 0.06 + 1200000 * 0.12 + 1200000 * 0.18 + (annual - 5400000) * 0.24) / 12));
  return Math.round(((1200000 * 0.06 + 1200000 * 0.12 + 1200000 * 0.18 + 1200000 * 0.24 + (annual - 6600000) * 0.30) / 12));
}

function workingDaysInMonth(year: number, month: number): number {
  const days = new Date(year, month, 0).getDate();
  let count = 0;
  for (let d = 1; d <= days; d++) {
    const dow = new Date(year, month - 1, d).getDay();
    if (dow !== 0) count++;
  }
  return count;
}

function employeeWorkingDays(year: number, month: number, offDays: number[], halfDays: number[]): number {
  const days = new Date(year, month, 0).getDate();
  let count = 0;
  for (let d = 1; d <= days; d++) {
    const dow = new Date(year, month - 1, d).getDay();
    if (dow === 0) continue;
    if (offDays.includes(dow)) continue;
    count += halfDays.includes(dow) ? 0.5 : 1;
  }
  return count;
}

function isWeekoffDay(dateStr: string, offDays: number[], halfDays: number[]): boolean {
  const dow = new Date(dateStr + "T12:00:00").getDay();
  return offDays.includes(dow) || halfDays.includes(dow);
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function isDateInOffSeason(dateStr: string, start: string | null | undefined, end: string | null | undefined): boolean {
  if (!start || !end) return false;
  return dateStr >= start && dateStr <= end;
}

router.get("/", async (req, res) => {
  try {
    const { month, year, branchId, status } = req.query as Record<string, string>;
    if (!month || !year) return res.status(400).json({ message: "month and year required" });

    const [assignedEmployeeRows, psRow] = await Promise.all([
      db.select({ employeeId: employeeSalaryAssignments.employeeId }).from(employeeSalaryAssignments),
      db.select().from(payrollSettings).then(rows => rows[0]),
    ]);
    const assignedEmployeeIds = new Set(assignedEmployeeRows.map(r => r.employeeId));
    const lunchPerDay = psRow?.lunchIncentivePerDay ?? 125;

    const rows = await db.select({
      payroll: payrollRecords,
      emp: {
        id: employees.id,
        employeeId: employees.employeeId,
        fullName: employees.fullName,
        designation: employees.department,
        department: employees.department,
        branchId: employees.branchId,
        employeeType: employees.employeeType,
        epfNumber: employees.epfNumber,
        etfNumber: employees.etfNumber,
      },
    }).from(payrollRecords)
      .innerJoin(employees, eq(payrollRecords.employeeId, employees.id));

    let result = rows.filter(r =>
      r.payroll.month === parseInt(month) && r.payroll.year === parseInt(year) &&
      assignedEmployeeIds.has(r.emp.id)
    );
    if (branchId) result = result.filter(r => r.payroll.branchId === parseInt(branchId));
    if (status) result = result.filter(r => r.payroll.status === status);

    /* Fetch approved lunch incentives for this month/year so salary report reflects manual edits */
    const empIds = result.map(r => r.emp.id);
    const approvedLunchIncentives = empIds.length > 0
      ? await db.select().from(staffIncentives).where(
          and(
            eq(staffIncentives.month, parseInt(month)),
            eq(staffIncentives.year, parseInt(year)),
            eq(staffIncentives.type, "lunch"),
            eq(staffIncentives.status, "approved"),
            inArray(staffIncentives.employeeId, empIds)
          )
        )
      : [];
    const approvedLunchMap = new Map<number, number>();
    for (const inc of approvedLunchIncentives) {
      approvedLunchMap.set(inc.employeeId, (approvedLunchMap.get(inc.employeeId) ?? 0) + inc.amount);
    }

    res.json(result.map(r => {
      const computedLunchIncentive = approvedLunchMap.has(r.emp.id)
        ? approvedLunchMap.get(r.emp.id)!
        : Math.round(lunchPerDay * ((r.payroll.presentDays || 0) + ((r.payroll as any).halfDays || 0)));
      return { ...r.payroll, employee: r.emp, computedLunchIncentive };
    }));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to fetch payroll" });
  }
});

router.get("/employees-for-payroll", async (req, res) => {
  try {
    const { month, year, branchId } = req.query as Record<string, string>;
    if (!month || !year) return res.status(400).json({ message: "month and year required" });

    const cfg = await getPayrollSettings();

    const assignedRows = await db.select({ employeeId: employeeSalaryAssignments.employeeId }).from(employeeSalaryAssignments);
    const assignedIds = new Set(assignedRows.map(r => r.employeeId));

    const allEmployees = await db.select({
      id: employees.id,
      employeeId: employees.employeeId,
      fullName: employees.fullName,
      designation: employees.department,
      department: employees.department,
      branchId: employees.branchId,
      employeeType: employees.employeeType,
      status: employees.status,
      epfNumber: employees.epfNumber,
      etfNumber: employees.etfNumber,
    }).from(employees);

    const activeEmps = allEmployees.filter(e => e.status === "active");
    const filteredByBranch = branchId ? activeEmps.filter(e => e.branchId === parseInt(branchId)) : activeEmps;

    const existingPayroll = await db.select({
      employeeId: payrollRecords.employeeId,
      status: payrollRecords.status,
      netSalary: payrollRecords.netSalary,
      grossSalary: payrollRecords.grossSalary,
    }).from(payrollRecords)
      .where(and(eq(payrollRecords.month, parseInt(month)), eq(payrollRecords.year, parseInt(year))));

    const payrollMap = new Map(existingPayroll.map(p => [p.employeeId, p]));

    const result = filteredByBranch.map(emp => ({
      ...emp,
      hasSalaryAssignment: assignedIds.has(emp.id),
      basicSalary: cfg.employeeOverrides[String(emp.id)] ?? cfg.salaryScale[emp.designation] ?? 40000,
      hasOverride: cfg.employeeOverrides[String(emp.id)] !== undefined,
      hasPayroll: payrollMap.has(emp.id),
      payrollStatus: payrollMap.get(emp.id)?.status ?? null,
      currentNetSalary: payrollMap.get(emp.id)?.netSalary ?? null,
      currentGrossSalary: payrollMap.get(emp.id)?.grossSalary ?? null,
    }));

    const { branches } = await import("@workspace/db/schema");
    const branchList = await db.select().from(branches);

    res.json({ employees: result, branches: branchList });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to fetch employees for payroll" });
  }
});

router.post("/generate", async (req, res) => {
  try {
    const { month, year, branchId, employeeIds } = req.body as {
      month: number;
      year: number;
      branchId?: number;
      employeeIds?: number[];
    };
    if (!month || !year) return res.status(400).json({ message: "month and year required" });

    const cfg = await getPayrollSettings();

    let allEmps = await db.select().from(employees);
    allEmps = allEmps.filter(e => e.status === "active");

    let targetEmps = allEmps;
    if (employeeIds && employeeIds.length > 0) {
      targetEmps = allEmps.filter(e => employeeIds.includes(e.id));
    } else if (branchId) {
      targetEmps = allEmps.filter(e => e.branchId === branchId);
    }

    if (targetEmps.length === 0) return res.status(404).json({ message: "No employees found" });

    const empIds = targetEmps.map(e => e.id);
    const datePrefix = `${year}-${String(month).padStart(2, "0")}`;
    const allAtt = await db.select().from(attendanceRecords)
      .where(inArray(attendanceRecords.employeeId, empIds));
    const filteredAtt = allAtt.filter(a => a.date.startsWith(datePrefix));

    const assignmentRows = await db
      .select({ assignment: employeeSalaryAssignments, structure: salaryStructures })
      .from(employeeSalaryAssignments)
      .innerJoin(salaryStructures, eq(employeeSalaryAssignments.salaryStructureId, salaryStructures.id))
      .where(inArray(employeeSalaryAssignments.employeeId, empIds));

    const structureMap = new Map<number, { basicAmount: number; earnings: any[]; deductions: any[] }>();
    for (const row of assignmentRows) {
      structureMap.set(row.assignment.employeeId, {
        basicAmount: row.assignment.basicAmount,
        earnings: JSON.parse(row.structure.earnings),
        deductions: JSON.parse(row.structure.deductions),
      });
    }

    const monthHolidays = await getMonthHolidays(year, month);
    const holidayDateMap = new Map<string, "statutory" | "poya" | "public">();
    const holidayInfoMap = new Map<string, { type: "statutory" | "poya" | "public"; name: string }>();
    for (const h of monthHolidays) {
      const t = (h.type as string)?.toLowerCase();
      const normalizedType =
        t === "statutory" || t === "national" ? "statutory"
        : t === "poya" || t === "religious"   ? "poya"
        : t === "public"                       ? "public"
        : null;
      if (normalizedType) {
        holidayDateMap.set(h.date, normalizedType as any);
        holidayInfoMap.set(h.date, { type: normalizedType as any, name: h.name });
      }
    }

    const allShifts = await db.select().from(shifts);
    const shiftMap = new Map(allShifts.map(s => [s.id, s]));
    const shiftsByName = new Map(allShifts.map(s => [s.name.trim().toLowerCase(), s]));

    const allWeekoffs = await db.select().from(weekoffSchedules);
    const weekoffMap = new Map(allWeekoffs.map(w => ({
      ...w,
      offDays: JSON.parse(w.offDays) as number[],
      halfDays: JSON.parse(w.halfDays) as number[],
    })).map(w => [w.id, w]));

    /* ── Load HR department rules ── */
    const deptRules = await loadDeptRules();

    /* ── Identify Night Watcher employees and synthesize attendance from bio logs ──
       Night Watcher employees store punches in biometric_logs only (no attendance_records).
       For each shift date in the month we look for evening punches (≥18:00) on that date
       and morning punches (<12:00) on the NEXT date, then build a synthetic attendance
       row that the salary engine can process identically to a real attendance_record. */
    const syntheticAttByEmp = new Map<number, Array<{
      employeeId: number; date: string; status: string;
      inTime1: string | null; outTime1: string | null;
      inTime2: string | null; outTime2: string | null;
      totalHours: number; leaveType: null;
    }>>();
    // All evening+morning punches per Night Watcher shift (key: `${empId}:${shiftDate}`)
    // Used by calcNightWatcherOtFromAllPunches for accurate checkpoint validation.
    const nwAllPunchesMap = new Map<string, string[]>();

    {
      // Determine which target employees are Night Watcher payroll employees
      const nightWatcherEmpIds: number[] = [];
      for (const emp of targetEmps) {
        const empShiftName = emp.shiftId ? shiftMap.get(emp.shiftId)?.name ?? null : null;
        const rule = findRule(deptRules, emp.department ?? "", empShiftName);
        if (rule.nightWatcherPayroll === true) nightWatcherEmpIds.push(emp.id);
      }

      if (nightWatcherEmpIds.length > 0) {
        // Extend end by 1 day to capture morning punches of the last night of the month
        const bioStart = `${year}-${String(month).padStart(2, "0")}-01`;
        const nextMonthFirst = new Date(Date.UTC(year, month, 1)); // month is 1-based; Date.UTC month is 0-based so month=4 gives May 1
        const bioEnd = nextMonthFirst.toISOString().slice(0, 10);

        const bioRows = await db.select({
          employeeId: biometricLogs.employeeId,
          punchTime: biometricLogs.punchTime,
        }).from(biometricLogs).where(and(
          inArray(biometricLogs.employeeId, nightWatcherEmpIds),
          gte(sql`(${biometricLogs.punchTime} AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Colombo')::date`, bioStart),
          lte(sql`(${biometricLogs.punchTime} AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Colombo')::date`, bioEnd),
        ));

        // Group by "empId:localDate" → sorted HH:MM list
        const byEmpDate = new Map<string, string[]>();
        for (const row of bioRows) {
          if (!row.employeeId) continue;
          const local = new Date((row.punchTime as Date).getTime() + 5.5 * 3_600_000);
          const dateStr = local.toISOString().slice(0, 10);
          const timeStr = `${String(local.getUTCHours()).padStart(2, "0")}:${String(local.getUTCMinutes()).padStart(2, "0")}`;
          const key = `${row.employeeId}:${dateStr}`;
          if (!byEmpDate.has(key)) byEmpDate.set(key, []);
          byEmpDate.get(key)!.push(timeStr);
        }
        for (const times of byEmpDate.values()) times.sort();

        const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

        for (const empId of nightWatcherEmpIds) {
          const recs: Array<{ employeeId: number; date: string; status: string; inTime1: string | null; outTime1: string | null; inTime2: string | null; outTime2: string | null; totalHours: number; leaveType: null; }> = [];
          for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            // Next calendar date (handles month boundary)
            const nextD = new Date(Date.UTC(year, month - 1, d + 1)).toISOString().slice(0, 10);

            const dayPunches  = byEmpDate.get(`${empId}:${dateStr}`) ?? [];
            const nextDayPunches = byEmpDate.get(`${empId}:${nextD}`) ?? [];

            // Evening punches on the shift date (≥18:00)
            const eveningPunches = dayPunches.filter(t => timeToMins(t) >= 18 * 60);

            // Morning punches on the next date (00:00–09:00, covers OT window + grace)
            // Night Watcher shift ends 05:00, OT window extends to 08:00
            const morningPunches = nextDayPunches.filter(t => timeToMins(t) < 9 * 60);

            // A shift is worked if evening punches exist OR morning punches from the
            // overnight tail exist (evening punch may be missing from device logs)
            if (eveningPunches.length === 0 && morningPunches.length === 0) continue;

            // Use default shift start time if evening punch was not recorded by device
            const inTime1  = eveningPunches.length > 0 ? eveningPunches[0] : "20:00";
            const outTime1 = eveningPunches.length > 1 ? eveningPunches[eveningPunches.length - 1] : null;
            const inTime2  = morningPunches.length > 1 ? morningPunches[0] : null;
            const outTime2 = morningPunches.length > 0 ? morningPunches[morningPunches.length - 1] : null;

            // Total hours (span from first evening punch to last morning punch, crossing midnight)
            let totalHours = 0;
            if (outTime2) {
              const startMins = timeToMins(inTime1);
              const endMins   = timeToMins(outTime2);
              const spanMins  = endMins < startMins ? (24 * 60 - startMins + endMins) : (endMins - startMins);
              totalHours = spanMins / 60;
            }

            recs.push({ employeeId: empId, date: dateStr, status: "present", inTime1, outTime1, inTime2, outTime2, totalHours, leaveType: null });
            // Store all punches (evening-first, then morning) for checkpoint-aware OT calculation
            nwAllPunchesMap.set(`${empId}:${dateStr}`, [...eveningPunches, ...morningPunches]);
          }
          if (recs.length > 0) syntheticAttByEmp.set(empId, recs);
        }
      }
    }

    /* ── Restore loan balances from any prior payroll run for this month ──
       This makes payroll generation idempotent: regenerating the same month
       first reverses the previous EMI deductions before applying fresh ones. */
    const priorLedger = await db
      .select({ ledgerId: loanEmiLedger.id, loanId: loanEmiLedger.loanId, amount: loanEmiLedger.amount, source: loanEmiLedger.source })
      .from(loanEmiLedger)
      .innerJoin(staffLoans, eq(loanEmiLedger.loanId, staffLoans.id))
      .where(and(
        eq(loanEmiLedger.month, month),
        eq(loanEmiLedger.year, year),
        eq(loanEmiLedger.source, "payroll"),
        inArray(staffLoans.employeeId, empIds),
      ));
    if (priorLedger.length > 0) {
      for (const entry of priorLedger) {
        const [loan] = await db.select().from(staffLoans).where(eq(staffLoans.id, entry.loanId));
        if (loan) {
          const restoredPaid    = Math.max(0, Math.round((loan.paidAmount - entry.amount) * 100) / 100);
          const restoredBalance = Math.round((loan.remainingBalance + entry.amount) * 100) / 100;
          await db.update(staffLoans).set({
            paidAmount: restoredPaid,
            remainingBalance: restoredBalance,
            status: restoredBalance > 0 ? "active" : loan.status,
            updatedAt: new Date(),
          }).where(eq(staffLoans.id, loan.id));
        }
      }
      await db.delete(loanEmiLedger)
        .where(inArray(loanEmiLedger.id, priorLedger.map(e => e.ledgerId)));
    }

    /* ── Fetch active loans for target employees ── */
    const activeLoans = await db.select().from(staffLoans)
      .where(and(eq(staffLoans.status, "active"), inArray(staffLoans.employeeId, empIds)));
    const loansByEmployee = new Map<number, typeof activeLoans>();
    for (const loan of activeLoans) {
      if (!loansByEmployee.has(loan.employeeId)) loansByEmployee.set(loan.employeeId, []);
      loansByEmployee.get(loan.employeeId)!.push(loan);
    }

    const wdCount = workingDaysInMonth(year, month);
    const generated: any[] = [];
    const loanUpdates: { id: number; paidAmount: number; remainingBalance: number; status: string; installment: number }[] = [];

    /* ── Load OT adjustments (manual overrides from OT Management) ── */
    const otAdjs = await db.select().from(otAdjustments)
      .where(and(eq(otAdjustments.year, year), eq(otAdjustments.month, month), inArray(otAdjustments.employeeId, empIds)));
    const otAdjMap = new Map<number, typeof otAdjs[0]>();
    for (const adj of otAdjs) otAdjMap.set(adj.employeeId, adj);

    /* ── Load approved incentives for this month/year ── */
    const approvedIncentives = await db.select().from(staffIncentives)
      .where(and(
        eq(staffIncentives.month, month),
        eq(staffIncentives.year, year),
        inArray(staffIncentives.employeeId, empIds)
      ));
    const incentivesByEmployee = new Map<number, number>();
    for (const inc of approvedIncentives.filter(i => i.status === "approved")) {
      incentivesByEmployee.set(inc.employeeId, (incentivesByEmployee.get(inc.employeeId) ?? 0) + inc.amount);
    }

    await db.delete(payrollRecords).where(
      and(
        eq(payrollRecords.month, month),
        eq(payrollRecords.year, year),
        inArray(payrollRecords.employeeId, empIds)
      )
    );

    for (const emp of targetEmps) {
      let empAtt: Array<any> = filteredAtt.filter(a => a.employeeId === emp.id);
      const designation = (emp.designation ?? "").toLowerCase();

      /* ── For Night Watcher employees: if no attendance_records exist,
         synthesize them from biometric_logs so payroll can compute
         present days, late minutes, and OT from actual punch data. ── */
      if (empAtt.length === 0 && syntheticAttByEmp.has(emp.id)) {
        empAtt = syntheticAttByEmp.get(emp.id)!;
      }

      /* ── Weekoff schedule for this employee ── */
      const empWeekoff = emp.weekoffScheduleId ? weekoffMap.get(emp.weekoffScheduleId) : null;
      const empOffDays  = empWeekoff ? empWeekoff.offDays  : [];
      const empHalfDays = empWeekoff ? empWeekoff.halfDays : [];
      const empWdCount  = empOffDays.length > 0 || empHalfDays.length > 0
        ? employeeWorkingDays(year, month, empOffDays, empHalfDays)
        : wdCount;

      /* ── Look up HR department rule for this employee ── */
      const empShiftName     = emp.shiftId ? shiftMap.get(emp.shiftId)?.name ?? null : null;
      const rule = findRule(deptRules, emp.department ?? "", empShiftName);

      /* ── Night Watcher: drop "morning tail" records ──────────────────────────
         Night Watcher shifts run overnight (e.g. 20:00 → 05:00). Some attendance
         sources create TWO records per shift: one for the evening start date and
         a second for the next calendar day's morning tail (inTime1 in 00:xx-11:xx).
         The morning-tail record is already captured in the previous evening's span,
         so counting it separately inflates present-days and generates phantom OT.
         Keep only records whose inTime1 is in the evening window (≥ 12:00) or that
         have no punch at all (legitimate absent rows). */
      if (rule.nightWatcherPayroll === true) {
        empAtt = empAtt.filter((a: any) => {
          if (!a.inTime1) return true;
          return timeToMins(a.inTime1) >= 12 * 60;
        });
      }

      const reqHoursPerDay   = (rule.minHours && rule.minHours > 0) ? rule.minHours : DEFAULT_RULE.minHours; // required hrs for full pay
      const otAfterHrsRule   = rule.otAfterHours ?? rule.minHours;     // OT threshold (hours)
      const isOtEligible     = rule.otEligible;
      const isFlexible       = rule.flexible;                          // exempt from incomplete deduction
      const ruleOtMult       = rule.otMultiplier ?? cfg.overtimeMultiplier;
      const ruleOffdayOtMult = rule.offdayOtMultiplier ?? cfg.offDayOtMultiplier;
      const ruleHolidayOtMult = rule.holidayOtMultiplier ?? null;

      /* Keep manager allowance for manager-designated employees (regardless of rule) */
      const isManagerDesig = designation.includes("manager") || designation.includes("gm") || designation.includes("general manager");

      const empShift = emp.shiftId ? shiftMap.get(emp.shiftId) : null;
      const shiftStart1 = empShift?.startTime1 ?? null;
      const shiftEnd1   = empShift?.endTime1   ?? null;
      const shiftWorkMinutes = (shiftStart1 && shiftEnd1)
        ? Math.max(0, timeToMins(shiftEnd1) - timeToMins(shiftStart1))
        : reqHoursPerDay * 60;

      /* Late cutoff based on shift start + rule grace period */
      const lateCutoff = lateCutoffMins(rule, shiftStart1);

      /* ── Salary-engine row cache (per-record policy results) ──
       * Drives morning-late minutes and OT hours from the approved shift policy
       * (Regular / Reception / Kitchen / Flexible / Night Watcher / Week-off).
       * Single source of truth shared with /api/reports/attendance. */
      const empWeekoffInfo: WeekOffInfo | null =
        (empOffDays.length > 0 || empHalfDays.length > 0)
          ? { offDays: empOffDays, halfDays: empHalfDays }
          : null;
      const salaryRowByDate = new Map<string, ReturnType<typeof processSalaryRow>>();
      const salaryRowFor = (rec: typeof empAtt[number]) => {
        const cached = salaryRowByDate.get(rec.date);
        if (cached) return cached;
        // Day-wise variant lookup: e.g. Kitchen on Sunday picks "Kitchen Shift - Sunday"
        const dayShift = empShift ? resolveDayShift(empShift, rec.date, shiftsByName as any) : null;
        const sr = processSalaryRow({
          date: rec.date,
          shift: { name: dayShift?.name ?? empShiftName, startTime: dayShift?.startTime1 ?? shiftStart1, endTime: dayShift?.endTime1 ?? shiftEnd1, graceMinutes: dayShift?.graceMinutes ?? empShift?.graceMinutes ?? null },
          weekoff: empWeekoffInfo,
          holiday: holidayInfoMap.get(rec.date) ?? null,
          rec: {
            date: rec.date,
            inTime1:  rec.inTime1,
            outTime1: rec.outTime1,
            inTime2:  rec.inTime2,
            outTime2: rec.outTime2,
            totalHours: rec.totalHours,
            leaveType: (rec as any).leaveType ?? null,
          },
          holidayMultipliers: {
            statutory: cfg.statutoryOtMultiplier,
            poya:      cfg.poyaOtMultiplier,
            public:    cfg.publicHolidayOtMultiplier,
          },
        });
        salaryRowByDate.set(rec.date, sr);
        return sr;
      };

      const presentRecs    = empAtt.filter(a => a.status === "present" || a.status === "late");
      const absentRecs     = empAtt.filter(a => a.status === "absent");
      const leaveRecs      = empAtt.filter(a => a.status === "leave");
      const halfDayRecs    = empAtt.filter(a => a.status === "half_day");
      const holidayRecs    = empAtt.filter(a => a.status === "holiday");
      const offDayRecs     = empAtt.filter(a => a.status === "off_day");
      const presentDays    = presentRecs.length;
      /* Recompute late arrivals from inTime1 vs cutoff — don't rely on stored status */
      const lateRecs       = presentRecs.filter(a => a.inTime1 && timeToMins(a.inTime1) > lateCutoff);
      const lateDays       = lateRecs.length;
      const leaveDays      = leaveRecs.length;
      const halfDaysCount  = halfDayRecs.length;
      const holidayDays    = holidayRecs.length;

      /* Any working day with no attendance record is treated as absent.
         Weekoff days do NOT count as working days, so don't penalise. */
      const nonWeekoffAtt = empAtt.filter(a =>
        !isWeekoffDay(a.date, empOffDays, empHalfDays)
      );
      const markedDays  = nonWeekoffAtt.length;
      const weekoffMarkedAsAbsent = absentRecs.filter(a => isWeekoffDay(a.date, empOffDays, empHalfDays)).length;
      const unmarkedAbsentDays = Math.max(0, empWdCount - markedDays);
      const absentDays  = absentRecs.length - weekoffMarkedAsAbsent + unmarkedAbsentDays;

      const structData = structureMap.get(emp.id);

      let basicSalary: number;
      let transportAllowance: number;
      let lunchIncentive: number;
      let housingAllowance: number;
      let otherAllowances: number;
      let epfEmployee: number;
      let epfEmployer: number;
      let etfEmployer: number;
      let otherDeductionsFromStruct = 0;

      if (structData) {
        const basicEarning = structData.earnings.find((e: any) => e.component === "Basic");
        basicSalary = structData.basicAmount || basicEarning?.amount || 0;

        const nonBasicEarnings = structData.earnings.filter((e: any) => e.component !== "Basic");
        transportAllowance = 0;
        lunchIncentive = 0;
        housingAllowance = 0;
        otherAllowances = 0;
        for (const e of nonBasicEarnings) {
          const name = (e.component ?? "").toLowerCase();
          if (name.includes("transport") || name.includes("travel")) transportAllowance += e.amount || 0;
          else if (name.includes("housing") || name.includes("rent")) housingAllowance += e.amount || 0;
          else if (name.includes("lunch") || name.includes("incentive")) { /* lunch handled via incentives page */ }
          else otherAllowances += e.amount || 0;
        }
        /* Lunch incentive is now managed via the Incentives page — not included in payroll */
        lunchIncentive = 0;

        epfEmployee = Math.round(basicSalary * 0.08);
        epfEmployer = Math.round(basicSalary * 0.12);
        etfEmployer = Math.round(basicSalary * 0.03);

        const customDeds = structData.deductions.filter((d: any) => !STATUTORY_NAMES.includes(d.component));
        otherDeductionsFromStruct = customDeds.reduce((s: number, d: any) => s + (d.amount || 0), 0);
      } else {
        basicSalary = cfg.employeeOverrides[String(emp.id)] ?? cfg.salaryScale[emp.designation] ?? 40000;
        transportAllowance = cfg.transportAllowance;
        /* Lunch incentive is now managed via the Incentives page — not included in payroll */
        lunchIncentive = 0;
        housingAllowance =
          basicSalary >= cfg.housingHighThreshold ? cfg.housingAllowanceHigh :
          basicSalary >= cfg.housingMidThreshold ? cfg.housingAllowanceMid :
          cfg.housingAllowanceLow;
        otherAllowances = cfg.otherAllowances;
        epfEmployee = 0;
        epfEmployer = 0;
        etfEmployer = 0;
      }

      /* ── Night Watcher payroll mode flag ── */
      const isNightWatcherPayroll = rule.nightWatcherPayroll === true;

      /* ── NIGHT WATCHER: fixed 30-day basis; 240-hour OT basis ── */
      const NW_SCHEDULED_SHIFTS = 15;
      const dailyRate   = isNightWatcherPayroll
        ? basicSalary / 30
        : basicSalary / empWdCount;
      const hourlyRate  = isNightWatcherPayroll
        ? basicSalary / 240
        : basicSalary / (empWdCount * reqHoursPerDay);
      const minuteRate  = hourlyRate / 60;

      /* ── NIGHT WATCHER: shift-based leave deduction ── */
      /* Worked shifts = PRESENT×1 + HALF_DAY×0.5 (no-record = off days, not absent) */
      const nwWorkedShifts = isNightWatcherPayroll
        ? presentDays + halfDaysCount * 0.5
        : 0;
      /* Leave days = scheduled shifts − worked shifts (includes explicit absents within 15 shifts) */
      const nwLeaveDays = isNightWatcherPayroll
        ? Math.max(0, NW_SCHEDULED_SHIFTS - nwWorkedShifts)
        : 0;
      /* Salary after deduction (Night Watcher specific) */
      const nwLeaveDeduction = isNightWatcherPayroll
        ? Math.round(nwLeaveDays * dailyRate * 1000) / 1000
        : 0;
      const nwSalaryAfterDeduction = isNightWatcherPayroll
        ? Math.max(0, basicSalary - nwLeaveDeduction)
        : 0;

      /* ── Off-season: skip OT, late deductions, incomplete hours, and absence deductions ──
         Night Watcher shift runs ALL YEAR with its own fixed policy — never off-season.
         For all other employees during off season:
           • Full salary paid even if punch records are missing (no absence deduction)
           • No OT, no late deductions, no incomplete-hour deductions
           • Loan/advance deductions and EPF/ETF continue as normal
           • Leave balance still tracked (manually approved leave still deducted)        */
      const offSeasonMonthsList: number[] = (() => {
        try { return JSON.parse((cfg as any).offSeasonMonths ?? "[5,6,7,8,9]") as number[]; }
        catch { return [5,6,7,8,9]; }
      })();
      /* Night Watchers are explicitly excluded from off-season — they operate year-round */
      const isOffSeason = !isNightWatcherPayroll && cfg.offSeasonEnabled && offSeasonMonthsList.includes(Number(month));

      /* ── Off-season earned basic (hours-based) ───────────────────────
         Rule:  ≥ 8 hrs punched  → pay full dailyRate
                0 < hrs < 8      → pay (totalHours − 1) × hourlyRate  (1 hr lunch deducted)
                no punch / ≤ 1h  → Rs. 0
         Holiday/off-day records are excluded here — their pay is covered by holidayOtPay/offDayOtPay. */
      let offSeasonEarnedBasic = basicSalary; // non-off-season: full salary
      let offSeasonPayableHrs  = 0;
      if (isOffSeason) {
        offSeasonEarnedBasic = 0;
        for (const rec of empAtt) {
          const h = rec.totalHours ?? 0;
          if (rec.status === "off_day") continue;
          if (rec.status === "holiday" || (holidayDateMap.has(rec.date) && h > 0)) continue;
          if (h >= 8) {
            offSeasonEarnedBasic += dailyRate;
            offSeasonPayableHrs  += 8;
          } else if (h > 1) {
            offSeasonEarnedBasic += (h - 1) * hourlyRate;
            offSeasonPayableHrs  += (h - 1);
          }
        }
        offSeasonEarnedBasic = Math.round(offSeasonEarnedBasic);
        offSeasonPayableHrs  = Math.round(offSeasonPayableHrs * 100) / 100;
      }

      /* ── EPF/ETF-exempt employees (Directors/shareholders) get full salary
         with no attendance-based deductions — they are treated as always present. ── */
      const isEpfEtfExempt = cfg.epfEtfExemptIds.includes(emp.id);

      /* ── STANDARD deductions ────────────────────────────────────────── */
      /* Morning late: applies to all employees EXCEPT during off-season (non-NW)
         and EPF-exempt employees. */
      const morningLateMinutes = (!isOffSeason && !isEpfEtfExempt)
        ? presentRecs.reduce((sum, rec) => sum + salaryRowFor(rec).lateMinutes, 0)
        : 0;
      /* Lunch return late: Night Watchers and EPF-exempt employees are excluded */
      const lunchLateMinutes = (!isNightWatcherPayroll && !isOffSeason && !isEpfEtfExempt) ? [...presentRecs, ...lateRecs].reduce((sum, rec) => {
        return sum + calcLunchLateMinutes(rec.outTime1, rec.inTime2, rule);
      }, 0) : 0;
      const totalLateMinutes = morningLateMinutes + lunchLateMinutes;
      const lateDeduction = Math.round(morningLateMinutes * minuteRate);
      const lunchLateDeduction = Math.round(lunchLateMinutes * minuteRate);

      /* ── Absence deduction ─────────────────────────────── */
      /* EPF-exempt employees: no absence deduction (always paid full basic).
         NW: handled via nwLeaveDeduction.
         Off-season: full salary paid regardless of attendance — no deduction. */
      const absenceDeduction = (isNightWatcherPayroll || isEpfEtfExempt || isOffSeason) ? 0
        : Math.round(dailyRate * absentDays);

      /* ── Half-day deduction ────────────────────────────── */
      const halfDayDeduction = (isNightWatcherPayroll || isOffSeason || isEpfEtfExempt) ? 0 : Math.round(halfDaysCount * (dailyRate / 2));

      /* ── Incomplete hours deduction (rules-based, skipped in off season) ─ */
      let incompleteDeduction = 0;
      let totalIncompleteMinutes = 0;
      if (!isFlexible && !isNightWatcherPayroll && !isOffSeason && !isEpfEtfExempt) {
        for (const rec of [...presentRecs, ...halfDayRecs]) {
          const rawHrs = rec.totalHours ?? 0;
          if (rawHrs === 0) continue;
          const effHrs = effectiveHours(rawHrs, rule);
          const required = rec.status === "half_day" ? reqHoursPerDay / 2 : reqHoursPerDay;
          if (effHrs < required) {
            const shortfallMinutes = Math.round((required - effHrs) * 60);
            totalIncompleteMinutes += shortfallMinutes;
            incompleteDeduction += Math.round(shortfallMinutes * minuteRate);
          }
        }
        incompleteDeduction = Math.round(incompleteDeduction);
      }

      /* ── OT and holiday pay (rules-based) ───────────────── */
      let regularOtHours = 0;
      let holidayOtHours = 0;
      let holidayOtPay   = 0;
      let offDayOtPay    = 0;
      let regularOtPay   = 0;

      /* Whether this employee's shift crosses midnight (Night Watcher etc.) */
      const isNightShift = isNightShiftRecord(shiftStart1);

      /* Scheduled shift hours — used for Night Watcher punch-count expectation.
         e.g. 8pm–5am = 9 hours. Derived from minHours when shift times are absent. */
      const scheduledShiftHours = (shiftStart1 && shiftEnd1)
        ? (() => {
            let mins = timeToMins(shiftEnd1) - timeToMins(shiftStart1);
            if (mins <= 0) mins += 24 * 60; // midnight crossover
            return mins / 60;
          })()
        : reqHoursPerDay;

      for (const rec of empAtt) {
        const rawHrs = rec.totalHours ?? 0;
        const recInOffSeason = isOffSeason;

        /* A record is treated as a holiday if either:
           (a) the stored status is "holiday", OR
           (b) the date falls on a known holiday AND the employee has actual punch hours.
           Case (b) catches off-season records that are stored as "present" but fall on a
           public/poya/statutory holiday — those must still earn holiday OT pay.
           Night Watchers are EXEMPT from the generic holiday branch — they use their own
           fixed policy (11 OT hrs at 1.5×) handled inside the regular NW OT branch. */
        const recDateIsHoliday = holidayDateMap.has(rec.date);
        const treatAsHoliday   = !isNightWatcherPayroll &&
          (rec.status === "holiday" || (recDateIsHoliday && rawHrs > 0 && rec.status !== "off_day"));

        if (treatAsHoliday) {
          /* Holiday pay: hours worked × (basic ÷ 240) × holiday multiplier
             Standard monthly hours basis: 240 = 30 days × 8 hrs.
             This rate is fixed and independent of how many working days the
             month has — applies consistently in both regular and off-season months.
             Rule-level holidayOtMultiplier overrides payroll-settings multiplier
             for the employee's department (except statutory stays at max of both). */
          const hType = holidayDateMap.get(rec.date) ?? "public";
          const cfgMult =
            hType === "statutory" ? (cfg.statutoryOtMultiplier ?? 2.0) :
            hType === "poya"      ? (cfg.poyaOtMultiplier ?? 1.5) :
                                    (cfg.publicHolidayOtMultiplier ?? 1.5);
          const mult = ruleHolidayOtMult != null
            ? (hType === "statutory" ? Math.max(ruleHolidayOtMult, cfgMult) : ruleHolidayOtMult)
            : cfgMult;
          const holidayHourlyRate = basicSalary / 240;
          if (rawHrs > 0) {
            const payableHrs = Math.min(rawHrs, 8); // cap at 8 hrs regardless of actual hours worked
            holidayOtHours += payableHrs;
            holidayOtPay += Math.round(payableHrs * holidayHourlyRate * mult);
          }

        } else if (rec.status === "off_day") {
          /* Off-day worked: full daily rate × offday OT multiplier */
          if (rawHrs > 0) offDayOtPay += Math.round(dailyRate * ruleOffdayOtMult);

        } else if (!recInOffSeason && isOtEligible) {
          /* ── Regular-day OT from the salary-engine policy ──
           * The engine implements the approved per-shift rules:
           *   Regular     OT after 17:30, 30-min threshold
           *   Reception   OT after 18:00, 30-min threshold
           *   Kitchen     OT after 20:30 (Saturday short-shift handled in engine)
           *   Flexible    OT only when worked > 9 hrs 30 mins
           *   Night       Discrete 0/1/2/3 hrs based on hourly punch validation
           */
          let ot: number;
          if (isNightWatcherPayroll) {
            // Use ALL evening+morning punches so 05:xx/06:xx/07:xx checkpoints are validated correctly.
            // calcNightWatcherPolicyOtHours only has 4 stored times and misses intermediate checkpoints.
            const allPunches = nwAllPunchesMap.get(`${emp.id}:${rec.date}`) ?? [];
            const baseOt = allPunches.length > 0
              ? calcNightWatcherOtFromAllPunches(allPunches)
              : calcNightWatcherPolicyOtHours(rec);
            // Night Watcher holiday rule: if worked (baseOt > 0) on a holiday → 11 OT hrs (8 base + 3).
            // Synthetic records always have status="present", so holiday detection uses holidayDateMap.
            ot = (holidayDateMap.has(rec.date) && baseOt > 0) ? 11 : baseOt;
          } else {
            ot = salaryRowFor(rec).otHours;
          }
          if (ot > 0) {
            regularOtHours += ot;
            // Night Watcher OT rate: Basic ÷ 240 × 1.5 (standard OT multiplier)
            const effectiveOtMult = isNightWatcherPayroll ? 1.5 : ruleOtMult;
            regularOtPay   += Math.round(ot * hourlyRate * effectiveOtMult);
          }
        }
      }

      /* ── Apply manual OT adjustment from OT Management page ── */
      const otAdj = otAdjMap.get(emp.id);
      if (otAdj?.isManualOverride) {
        if (otAdj.adjustedRegularOtHours != null) regularOtHours = otAdj.adjustedRegularOtHours;
        if (otAdj.adjustedRegularOtAmount != null) regularOtPay   = otAdj.adjustedRegularOtAmount;
        if (otAdj.adjustedHolidayOtHours  != null) holidayOtHours = otAdj.adjustedHolidayOtHours;
        if (otAdj.adjustedHolidayOtAmount != null) holidayOtPay   = otAdj.adjustedHolidayOtAmount;
      }

      /* ── Manager gets fixed allowance instead of regular OT ── */
      let managerFixedAllowance = 0;
      if (isManagerDesig) {
        managerFixedAllowance = Math.round(basicSalary * 0.1);
      }

      /* If OT-ineligible by rule, override regular OT pay to 0 */
      const overtimePay = isManagerDesig ? managerFixedAllowance
                        : isOtEligible   ? regularOtPay
                        : 0;

      const incentivesTotal = Math.round(incentivesByEmployee.get(emp.id) ?? 0);

      let grossSalary: number;

      if (isNightWatcherPayroll) {
        /* ── NIGHT WATCHER gross: salary after deduction + OT − late deduction + approved incentives ── */
        grossSalary = Math.round(nwSalaryAfterDeduction + overtimePay + holidayOtPay + offDayOtPay - lateDeduction + incentivesTotal);
      } else {
        grossSalary = Math.round(
          basicSalary + transportAllowance + lunchIncentive + housingAllowance + otherAllowances
          + overtimePay + holidayOtPay + offDayOtPay + incentivesTotal
          - absenceDeduction - lateDeduction - lunchLateDeduction - halfDayDeduction - incompleteDeduction
        );
      }

      /* ── EPF / ETF ──
       * EPF/ETF is always calculated on Basic Salary only (not on OT or allowances).
       * Night Watcher: use salary-after-deduction as the effective basic base.
       * All others:    use basicSalary directly.
       * Employee balance pay (netSalary) deducts only EPF 8% — EPF 12% and ETF 3%
       * are employer contributions and do NOT reduce the employee's take-home pay.
       */
      const epfBase = isNightWatcherPayroll
        ? Math.max(0, nwSalaryAfterDeduction)
        : Math.max(0, basicSalary);
      if (structData) {
        epfEmployee = Math.round(epfBase * 0.08);
        epfEmployer = Math.round(epfBase * 0.12);
        etfEmployer = Math.round(epfBase * 0.03);
      } else {
        epfEmployee = Math.round(epfBase * (cfg.epfEmployeePercent / 100));
        epfEmployer = Math.round(epfBase * (cfg.epfEmployerPercent / 100));
        etfEmployer = Math.round(epfBase * (cfg.etfEmployerPercent / 100));
      }

      /* ── EPF / ETF exemption override (e.g. Directors) ── */
      if (cfg.epfEtfExemptIds.includes(emp.id)) {
        epfEmployee = 0;
        epfEmployer = 0;
        etfEmployer = 0;
      }

      /* ── APIT: fixed override or progressive slab ── */
      const apitFixedOverride = cfg.apitOverrides[String(emp.id)];
      const apit = apitFixedOverride !== undefined ? apitFixedOverride : calcAPIT(grossSalary);
      const otherDeductions = otherDeductionsFromStruct;

      /* ── Loan / Advance deduction for this month ── */
      let loanDeduction = 0;
      const empLoans = loansByEmployee.get(emp.id) ?? [];
      for (const loan of empLoans) {
        /* Only apply if start month/year <= current month/year */
        const loanStart = loan.startYear * 100 + loan.startMonth;
        const current   = year * 100 + month;
        if (loanStart > current) continue;

        const installment = Math.min(loan.monthlyInstallment, loan.remainingBalance);
        loanDeduction += installment;
        const newPaid      = Math.round((loan.paidAmount + installment) * 100) / 100;
        const newBalance   = Math.max(0, Math.round((loan.remainingBalance - installment) * 100) / 100);
        loanUpdates.push({
          id: loan.id,
          paidAmount: newPaid,
          remainingBalance: newBalance,
          status: newBalance <= 0 ? "completed" : "active",
          installment,
        });
      }
      loanDeduction = Math.round(loanDeduction);

      const totalDeductions = epfEmployee + apit + lateDeduction + lunchLateDeduction + absenceDeduction + halfDayDeduction + incompleteDeduction + otherDeductions + loanDeduction;
      const netSalary     = grossSalary - epfEmployee - apit - otherDeductions - loanDeduction;

      /* ── For Night Watcher: map leave data to standard fields for storage/display ── */
      const storedAbsenceDeduction = isNightWatcherPayroll ? Math.round(nwLeaveDeduction) : absenceDeduction;
      const storedLeaveDays        = isNightWatcherPayroll ? nwLeaveDays : leaveDays;
      const storedAbsentDays       = isNightWatcherPayroll ? Math.floor(nwLeaveDays) : Math.round(absentDays);
      const storedHalfDays         = isNightWatcherPayroll ? halfDaysCount : halfDaysCount;
      const storedWorkingDays      = isNightWatcherPayroll ? NW_SCHEDULED_SHIFTS : Math.round(empWdCount);

      const record = {
        employeeId: emp.id,
        branchId: emp.branchId!,
        month,
        year,
        workingDays: storedWorkingDays,
        presentDays,
        absentDays: storedAbsentDays,
        lateDays,
        halfDays: storedHalfDays,
        leaveDays: storedLeaveDays,
        holidayDays,
        overtimeHours: Math.round((regularOtHours + holidayOtHours) * 100) / 100,
        basicSalary,
        transportAllowance: isNightWatcherPayroll ? 0 : transportAllowance,
        lunchIncentive,
        housingAllowance: isNightWatcherPayroll ? 0 : housingAllowance,
        otherAllowances: isNightWatcherPayroll ? 0 : otherAllowances,
        overtimePay,
        holidayOtPay: holidayOtPay + offDayOtPay,
        grossSalary,
        epfEmployee,
        epfEmployer,
        etfEmployer,
        apit,
        lateDeduction: lateDeduction,
        lunchLateDeduction: isNightWatcherPayroll ? 0 : lunchLateDeduction,
        absenceDeduction: storedAbsenceDeduction,
        halfDayDeduction: isNightWatcherPayroll ? 0 : halfDayDeduction,
        incompleteDeduction: isNightWatcherPayroll ? 0 : incompleteDeduction,
        otherDeductions,
        loanDeduction,
        totalDeductions,
        netSalary,
        reqHoursPerDay,
        lateMinutes: morningLateMinutes,
        lunchLateMinutes,
        incompleteMinutes: totalIncompleteMinutes,
        offSeasonPayableHours: offSeasonPayableHrs,
        incentivesTotal,
        status: "draft" as const,
        generatedAt: new Date(),
      };
      generated.push(record);
    }

    /* ── Mark consumed approved incentives as payroll-linked ── */
    const linkedIds = approvedIncentives
      .filter(i => i.status === "approved")
      .map(i => i.id);
    if (linkedIds.length > 0) {
      await db.update(staffIncentives)
        .set({ payrollLinked: true, updatedAt: new Date() })
        .where(inArray(staffIncentives.id, linkedIds));
    }

    if (generated.length > 0) {
      const genEmpIds = generated.map(r => r.employeeId);
      await db.delete(payrollRecords).where(
        and(
          eq(payrollRecords.month, month),
          eq(payrollRecords.year, year),
          inArray(payrollRecords.employeeId, genEmpIds)
        )
      );
    }
    for (let i = 0; i < generated.length; i += 50) {
      await db.insert(payrollRecords).values(generated.slice(i, i + 50));
    }

    /* ── Update loan balances after payroll is saved ── */
    const ledgerEntries: { loanId: number; month: number; year: number; amount: number; source: "payroll" | "manual" }[] = [];
    for (const update of loanUpdates) {
      await db.update(staffLoans).set({
        paidAmount: update.paidAmount,
        remainingBalance: update.remainingBalance,
        status: update.status as "active" | "completed" | "cancelled",
        updatedAt: new Date(),
      }).where(eq(staffLoans.id, update.id));
      ledgerEntries.push({ loanId: update.id, month, year, amount: update.installment, source: "payroll" });
    }
    if (ledgerEntries.length > 0) {
      await db.insert(loanEmiLedger).values(ledgerEntries);
    }

    res.json({ success: true, count: generated.length, message: `Payroll generated for ${generated.length} employees` });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to generate payroll" });
  }
});

router.get("/summary", async (req, res) => {
  try {
    const { month, year } = req.query as Record<string, string>;
    if (!month || !year) return res.status(400).json({ message: "month and year required" });

    const assignedRows = await db.select({ employeeId: employeeSalaryAssignments.employeeId }).from(employeeSalaryAssignments);
    const assignedIds = new Set(assignedRows.map(r => r.employeeId));

    const allRows = await db.select().from(payrollRecords)
      .where(and(eq(payrollRecords.month, parseInt(month)), eq(payrollRecords.year, parseInt(year))));

    const rows = allRows.filter(r => assignedIds.has(r.employeeId));

    const summary = {
      totalEmployees: rows.length,
      totalGross: rows.reduce((s, r) => s + r.grossSalary, 0),
      totalNet: rows.reduce((s, r) => s + r.netSalary, 0),
      totalEPF: rows.reduce((s, r) => s + r.epfEmployee + r.epfEmployer, 0),
      totalETF: rows.reduce((s, r) => s + r.etfEmployer, 0),
      totalAPIT: rows.reduce((s, r) => s + r.apit, 0),
      totalOTPay: rows.reduce((s, r) => s + r.overtimePay + (r.holidayOtPay ?? 0), 0),
      statusCounts: {
        draft: rows.filter(r => r.status === "draft").length,
        approved: rows.filter(r => r.status === "approved").length,
        paid: rows.filter(r => r.status === "paid").length,
      }
    };
    res.json(summary);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to fetch summary" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const rows = await db.select({
      payroll: payrollRecords,
      emp: employees,
    }).from(payrollRecords)
      .innerJoin(employees, eq(payrollRecords.employeeId, employees.id))
      .where(eq(payrollRecords.id, id));

    if (!rows.length) return res.status(404).json({ message: "Not found" });
    const r = rows[0];

    /* Fetch active loans so the payslip always shows live installment amounts */
    const empActiveLoans = await db.select().from(staffLoans)
      .where(and(eq(staffLoans.employeeId, r.emp.id), eq(staffLoans.status, "active")));
    const currentPeriod = r.payroll.year * 100 + r.payroll.month;
    const liveInstallment = Math.round(empActiveLoans.reduce((sum, loan) => {
      if (loan.startYear * 100 + loan.startMonth > currentPeriod) return sum;
      return sum + Math.min(loan.monthlyInstallment, loan.remainingBalance);
    }, 0));

    /* Compute live lunch incentive — prefer approved incentive from incentives page if one exists */
    const [psRow, approvedLunchRows] = await Promise.all([
      db.select().from(payrollSettings).then(rows => rows[0]),
      db.select().from(staffIncentives).where(
        and(
          eq(staffIncentives.employeeId, r.emp.id),
          eq(staffIncentives.month, r.payroll.month),
          eq(staffIncentives.year, r.payroll.year),
          eq(staffIncentives.type, "lunch"),
          eq(staffIncentives.status, "approved")
        )
      ),
    ]);
    const lunchPerDay = psRow?.lunchIncentivePerDay ?? 125;
    const approvedLunchTotal = approvedLunchRows.reduce((s, i) => s + i.amount, 0);
    const computedLunch = approvedLunchTotal > 0
      ? approvedLunchTotal
      : Math.round(lunchPerDay * ((r.payroll.presentDays || 0) + (r.payroll.halfDays || 0)));

    res.json({ ...r.payroll, employee: r.emp, activeLoanInstallment: liveInstallment, computedLunchIncentive: computedLunch });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to fetch payslip" });
  }
});

router.patch("/bulk-status", async (req, res) => {
  try {
    const { ids, status } = req.body as { ids: number[]; status: "draft" | "approved" | "paid" };
    const update: any = { status, updatedAt: new Date() };
    if (status === "approved") update.approvedAt = new Date();
    if (status === "paid") update.paidAt = new Date();
    await db.update(payrollRecords).set(update).where(inArray(payrollRecords.id, ids));
    res.json({ success: true, updated: ids.length });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to bulk update" });
  }
});

/* ── Shared helper: reverse payroll-sourced loan ledger entries ──────────
   Called whenever a payroll record is deleted (single or bulk).
   Restores paidAmount / remainingBalance on the affected loans. */
async function reverseLoanLedgerForPayroll(
  records: { employeeId: number; month: number; year: number }[]
) {
  for (const { employeeId, month, year } of records) {
    const empLoans = await db
      .select({ id: staffLoans.id })
      .from(staffLoans)
      .where(eq(staffLoans.employeeId, employeeId));
    const loanIds = empLoans.map(l => l.id);
    if (loanIds.length === 0) continue;

    const entries = await db
      .select()
      .from(loanEmiLedger)
      .where(
        and(
          eq(loanEmiLedger.month, month),
          eq(loanEmiLedger.year, year),
          eq(loanEmiLedger.source, "payroll"),
          inArray(loanEmiLedger.loanId, loanIds),
        )
      );

    for (const entry of entries) {
      const [loan] = await db
        .select()
        .from(staffLoans)
        .where(eq(staffLoans.id, entry.loanId));
      if (!loan) continue;
      const restoredPaid    = Math.max(0, Math.round((loan.paidAmount    - entry.amount) * 100) / 100);
      const restoredBalance =             Math.round((loan.remainingBalance + entry.amount) * 100) / 100;
      await db.update(staffLoans).set({
        paidAmount:       restoredPaid,
        remainingBalance: restoredBalance,
        status:           restoredBalance > 0 ? "active" : loan.status,
        updatedAt:        new Date(),
      }).where(eq(staffLoans.id, loan.id));
    }

    if (entries.length > 0) {
      await db.delete(loanEmiLedger)
        .where(inArray(loanEmiLedger.id, entries.map(e => e.id)));
    }
  }
}

router.delete("/bulk", async (req, res) => {
  try {
    const { ids } = req.body as { ids: number[] };
    if (!ids || ids.length === 0) return res.status(400).json({ message: "No IDs provided" });

    /* Fetch records before deleting so we can reverse loan ledger entries */
    const rows = await db
      .select({ employeeId: payrollRecords.employeeId, month: payrollRecords.month, year: payrollRecords.year })
      .from(payrollRecords)
      .where(inArray(payrollRecords.id, ids));
    await reverseLoanLedgerForPayroll(rows);

    await db.delete(payrollRecords).where(inArray(payrollRecords.id, ids));
    res.json({ success: true, deleted: ids.length });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to delete records" });
  }
});

router.patch("/:id/status", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body as { status: "draft" | "approved" | "paid" };
    const update: any = { status, updatedAt: new Date() };
    if (status === "approved") update.approvedAt = new Date();
    if (status === "paid") update.paidAt = new Date();
    await db.update(payrollRecords).set(update).where(eq(payrollRecords.id, id));
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to update status" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [record] = await db
      .select({ employeeId: payrollRecords.employeeId, month: payrollRecords.month, year: payrollRecords.year })
      .from(payrollRecords)
      .where(eq(payrollRecords.id, id));
    if (record) await reverseLoanLedgerForPayroll([record]);
    await db.delete(payrollRecords).where(eq(payrollRecords.id, id));
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to delete payroll record" });
  }
});

export default router;
