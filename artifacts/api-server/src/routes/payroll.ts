import { Router } from "express";
import { db } from "@workspace/db";
import {
  payrollRecords, employees, attendanceRecords, payrollSettings,
  salaryStructures, employeeSalaryAssignments, holidays, shifts, staffLoans,
} from "@workspace/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { loadDeptRules, findRule, effectiveHours, calcOtHours, lateCutoffMins, timeToMins } from "../lib/hr-rules.js";

const STATUTORY_NAMES = ["EPF – Employee", "EPF – Employer", "ETF"];

const router = Router();

async function getPayrollSettings() {
  const [existing] = await db.select().from(payrollSettings);
  const row = existing ?? (await db.insert(payrollSettings).values({}).returning())[0];
  return {
    ...row,
    salaryScale: JSON.parse(row.salaryScale) as Record<string, number>,
    employeeOverrides: JSON.parse(row.employeeOverrides ?? "{}") as Record<string, number>,
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

    const assignedEmployeeRows = await db.select({ employeeId: employeeSalaryAssignments.employeeId }).from(employeeSalaryAssignments);
    const assignedEmployeeIds = new Set(assignedEmployeeRows.map(r => r.employeeId));

    const rows = await db.select({
      payroll: payrollRecords,
      emp: {
        id: employees.id,
        employeeId: employees.employeeId,
        fullName: employees.fullName,
        designation: employees.designation,
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

    res.json(result.map(r => ({ ...r.payroll, employee: r.emp })));
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
      designation: employees.designation,
      department: employees.department,
      branchId: employees.branchId,
      employeeType: employees.employeeType,
      status: employees.status,
      epfNumber: employees.epfNumber,
      etfNumber: employees.etfNumber,
    }).from(employees);

    const activeEmps = allEmployees.filter(e => e.status === "active" && assignedIds.has(e.id));
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
    for (const h of monthHolidays) {
      holidayDateMap.set(h.date, h.type as "statutory" | "poya" | "public");
    }

    const allShifts = await db.select().from(shifts);
    const shiftMap = new Map(allShifts.map(s => [s.id, s]));

    /* ── Load HR department rules ── */
    const deptRules = await loadDeptRules();

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
    const loanUpdates: { id: number; paidAmount: number; remainingBalance: number; status: string }[] = [];

    await db.delete(payrollRecords).where(
      and(
        eq(payrollRecords.month, month),
        eq(payrollRecords.year, year),
        inArray(payrollRecords.employeeId, empIds)
      )
    );

    for (const emp of targetEmps) {
      const empAtt = filteredAtt.filter(a => a.employeeId === emp.id);
      const designation = (emp.designation ?? "").toLowerCase();

      /* ── Look up HR department rule for this employee ── */
      const empShiftName     = emp.shiftId ? shiftMap.get(emp.shiftId)?.name ?? null : null;
      const rule = findRule(deptRules, emp.department ?? "", empShiftName);
      const reqHoursPerDay   = rule.minHours;                          // required hrs for full pay
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

      const presentRecs    = empAtt.filter(a => a.status === "present" || a.status === "late");
      const lateRecs       = empAtt.filter(a => a.status === "late");
      const absentRecs     = empAtt.filter(a => a.status === "absent");
      const leaveRecs      = empAtt.filter(a => a.status === "leave");
      const halfDayRecs    = empAtt.filter(a => a.status === "half_day");
      const holidayRecs    = empAtt.filter(a => a.status === "holiday");
      const offDayRecs     = empAtt.filter(a => a.status === "off_day");
      const presentDays    = presentRecs.length;
      const lateDays       = lateRecs.length;
      const leaveDays      = leaveRecs.length;
      const halfDaysCount  = halfDayRecs.length;
      const holidayDays    = holidayRecs.length;

      /* Any working day with no attendance record is treated as absent */
      const markedDays  = empAtt.length;
      const unmarkedAbsentDays = Math.max(0, wdCount - markedDays);
      const absentDays  = absentRecs.length + unmarkedAbsentDays;

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
          else if (name.includes("lunch") || name.includes("incentive")) lunchIncentive += e.amount || 0;
          else otherAllowances += e.amount || 0;
        }

        epfEmployee = Math.round(basicSalary * 0.08);
        epfEmployer = Math.round(basicSalary * 0.12);
        etfEmployer = Math.round(basicSalary * 0.03);

        const customDeds = structData.deductions.filter((d: any) => !STATUTORY_NAMES.includes(d.component));
        otherDeductionsFromStruct = customDeds.reduce((s: number, d: any) => s + (d.amount || 0), 0);
      } else {
        basicSalary = cfg.employeeOverrides[String(emp.id)] ?? cfg.salaryScale[emp.designation] ?? 40000;
        transportAllowance = cfg.transportAllowance;
        lunchIncentive = cfg.lunchIncentive ?? 0;
        housingAllowance =
          basicSalary >= cfg.housingHighThreshold ? cfg.housingAllowanceHigh :
          basicSalary >= cfg.housingMidThreshold ? cfg.housingAllowanceMid :
          cfg.housingAllowanceLow;
        otherAllowances = cfg.otherAllowances;
        epfEmployee = 0;
        epfEmployer = 0;
        etfEmployer = 0;
      }

      const dailyRate   = basicSalary / wdCount;
      const hourlyRate  = basicSalary / (wdCount * reqHoursPerDay);
      const minuteRate  = hourlyRate / 60;

      /* ── Late deduction: lateMinutes × minuteRate ──────── */
      let totalLateMinutes = 0;
      for (const rec of lateRecs) {
        if (rec.inTime1) {
          const arrivalMinutes = timeToMins(rec.inTime1);
          if (arrivalMinutes > lateCutoff) {
            totalLateMinutes += arrivalMinutes - lateCutoff;
          }
        } else {
          totalLateMinutes += rule.lateGraceMinutes ?? 15;
        }
      }
      const lateDeduction = Math.round(totalLateMinutes * minuteRate);

      /* ── Absence deduction ─────────────────────────────── */
      const absenceDeduction = Math.round(dailyRate * absentDays);

      /* ── Half-day deduction ────────────────────────────── */
      const halfDayDeduction = Math.round(halfDaysCount * (dailyRate / 2));

      /* ── Incomplete hours deduction (rules-based) ───────── */
      let incompleteDeduction = 0;
      if (!isFlexible) {
        for (const rec of [...presentRecs, ...halfDayRecs]) {
          const rawHrs = rec.totalHours ?? 0;
          if (rawHrs === 0) continue;
          const effHrs = effectiveHours(rawHrs, rule);
          const required = rec.status === "half_day" ? reqHoursPerDay / 2 : reqHoursPerDay;
          if (effHrs < required) {
            const shortfallMinutes = Math.round((required - effHrs) * 60);
            incompleteDeduction += Math.round(shortfallMinutes * minuteRate);
          }
        }
        incompleteDeduction = Math.round(incompleteDeduction);
      }

      /* ── Off-season: skip standard OT if enabled ────────── */
      const isOffSeason = cfg.offSeasonEnabled && empAtt.some(rec =>
        isDateInOffSeason(rec.date, cfg.offSeasonStart, cfg.offSeasonEnd)
      );

      /* ── OT and holiday pay (rules-based) ───────────────── */
      let regularOtHours = 0;
      let holidayOtPay   = 0;
      let offDayOtPay    = 0;
      let regularOtPay   = 0;

      for (const rec of empAtt) {
        const rawHrs = rec.totalHours ?? 0;
        const recInOffSeason = cfg.offSeasonEnabled &&
          isDateInOffSeason(rec.date, cfg.offSeasonStart, cfg.offSeasonEnd);

        if (rec.status === "holiday") {
          /* Holiday pay: hours worked × hourly rate × holiday multiplier
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
          if (rawHrs > 0) holidayOtPay += Math.round(rawHrs * hourlyRate * mult);

        } else if (rec.status === "off_day") {
          /* Off-day worked: full daily rate × offday OT multiplier */
          if (rawHrs > 0) offDayOtPay += Math.round(dailyRate * ruleOffdayOtMult);

        } else if (!recInOffSeason && isOtEligible) {
          /* Regular day OT:
             - Exclude early sign-in (time before shift start) per policy.
             - otAfterHours is total clock-time threshold (incl. lunch). */
          const earlyMins = (rec.inTime1 && shiftStart1 && timeToMins(rec.inTime1) < timeToMins(shiftStart1))
            ? timeToMins(shiftStart1) - timeToMins(rec.inTime1)
            : 0;
          const ot = calcOtHours(rawHrs, rule, earlyMins);
          if (ot > 0) {
            regularOtHours += ot;
            regularOtPay   += Math.round(ot * hourlyRate * ruleOtMult);
          }
        }
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

      const grossSalary = Math.round(
        basicSalary + transportAllowance + lunchIncentive + housingAllowance + otherAllowances
        + overtimePay + holidayOtPay + offDayOtPay
        - absenceDeduction - lateDeduction - halfDayDeduction - incompleteDeduction
      );

      /* EPF / ETF always based on actual earned gross (not full basic) */
      const epfBase = Math.max(0, grossSalary);
      if (structData) {
        epfEmployee = Math.round(epfBase * 0.08);
        epfEmployer = Math.round(epfBase * 0.12);
        etfEmployer = Math.round(epfBase * 0.03);
      } else {
        epfEmployee = Math.round(epfBase * (cfg.epfEmployeePercent / 100));
        epfEmployer = Math.round(epfBase * (cfg.epfEmployerPercent / 100));
        etfEmployer = Math.round(epfBase * (cfg.etfEmployerPercent / 100));
      }

      const apit          = calcAPIT(grossSalary);
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
        });
      }
      loanDeduction = Math.round(loanDeduction);

      const totalDeductions = epfEmployee + apit + lateDeduction + absenceDeduction + halfDayDeduction + incompleteDeduction + otherDeductions + loanDeduction;
      const netSalary     = grossSalary - epfEmployee - apit - otherDeductions - loanDeduction;

      const record = {
        employeeId: emp.id,
        branchId: emp.branchId!,
        month,
        year,
        workingDays: wdCount,
        presentDays,
        absentDays,
        lateDays,
        halfDays: halfDaysCount,
        leaveDays,
        holidayDays,
        overtimeHours: Math.round(regularOtHours * 100) / 100,
        basicSalary,
        transportAllowance,
        lunchIncentive,
        housingAllowance,
        otherAllowances,
        overtimePay,
        holidayOtPay: holidayOtPay + offDayOtPay,
        grossSalary,
        epfEmployee,
        epfEmployer,
        etfEmployer,
        apit,
        lateDeduction,
        absenceDeduction,
        halfDayDeduction,
        incompleteDeduction,
        otherDeductions,
        loanDeduction,
        totalDeductions,
        netSalary,
        status: "draft" as const,
        generatedAt: new Date(),
      };
      generated.push(record);
    }

    for (let i = 0; i < generated.length; i += 50) {
      await db.insert(payrollRecords).values(generated.slice(i, i + 50));
    }

    /* ── Update loan balances after payroll is saved ── */
    for (const update of loanUpdates) {
      await db.update(staffLoans).set({
        paidAmount: update.paidAmount,
        remainingBalance: update.remainingBalance,
        status: update.status as "active" | "completed" | "cancelled",
        updatedAt: new Date(),
      }).where(eq(staffLoans.id, update.id));
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
    res.json({ ...r.payroll, employee: r.emp });
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

export default router;
