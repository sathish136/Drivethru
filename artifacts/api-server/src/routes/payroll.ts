import { Router } from "express";
import { db } from "@workspace/db";
import { payrollRecords, employees, attendanceRecords, payrollSettings, salaryStructures, employeeSalaryAssignments, holidays, systemSettings } from "@workspace/db/schema";
import { eq, and, inArray } from "drizzle-orm";

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

async function getHrSettings() {
  const [row] = await db.select().from(systemSettings);
  return row ?? null;
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

    const wdCount = workingDaysInMonth(year, month);
    const generated: any[] = [];

    await db.delete(payrollRecords).where(
      and(
        eq(payrollRecords.month, month),
        eq(payrollRecords.year, year),
        inArray(payrollRecords.employeeId, empIds)
      )
    );

    const LATE_CUTOFF_MINUTES = 8 * 60 + 15;

    for (const emp of targetEmps) {
      const empAtt = filteredAtt.filter(a => a.employeeId === emp.id);
      const dept = (emp.department ?? "").toLowerCase();
      const designation = (emp.designation ?? "").toLowerCase();

      const isManager = designation.includes("manager") || designation.includes("gm") || designation.includes("general manager");
      const isSurfInstructor = dept.includes("surf") || designation.includes("surf");
      const isNightWatcher = designation.includes("night watcher") || designation.includes("night watch");

      const presentRecs    = empAtt.filter(a => a.status === "present" || a.status === "late");
      const lateRecs       = empAtt.filter(a => a.status === "late");
      const absentRecs     = empAtt.filter(a => a.status === "absent");
      const leaveRecs      = empAtt.filter(a => a.status === "leave");
      const halfDayRecs    = empAtt.filter(a => a.status === "half_day");
      const holidayRecs    = empAtt.filter(a => a.status === "holiday");
      const presentDays    = presentRecs.length;
      const lateDays       = lateRecs.length;
      const absentDays     = absentRecs.length;
      const leaveDays      = leaveRecs.length;
      const halfDaysCount  = halfDayRecs.length;
      const holidayDays    = holidayRecs.length;

      const structData = structureMap.get(emp.id);

      let basicSalary: number;
      let transportAllowance: number;
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
        housingAllowance = 0;
        otherAllowances = 0;
        for (const e of nonBasicEarnings) {
          const name = (e.component ?? "").toLowerCase();
          if (name.includes("transport") || name.includes("travel")) transportAllowance += e.amount || 0;
          else if (name.includes("housing") || name.includes("rent")) housingAllowance += e.amount || 0;
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
      const hourlyRate  = basicSalary / (wdCount * 8);
      const minuteRate  = hourlyRate / 60;

      /* ── Late deduction: lateMinutes × minuteRate ──────── */
      let totalLateMinutes = 0;
      for (const rec of lateRecs) {
        if (rec.inTime1) {
          const [hh, mm] = rec.inTime1.split(":").map(Number);
          const arrivalMinutes = hh * 60 + mm;
          if (arrivalMinutes > LATE_CUTOFF_MINUTES) {
            totalLateMinutes += arrivalMinutes - LATE_CUTOFF_MINUTES;
          }
        } else {
          totalLateMinutes += 15;
        }
      }
      const lateDeduction = Math.round(totalLateMinutes * minuteRate);

      /* ── Absence deduction ─────────────────────────────── */
      const absenceDeduction = Math.round(dailyRate * absentDays);

      /* ── Half-day deduction ────────────────────────────── */
      const halfDayDeduction = Math.round(halfDaysCount * (dailyRate / 2));

      /* ── Incomplete hours deduction (non-exempt only) ──── */
      let incompleteDeduction = 0;
      if (!isSurfInstructor) {
        const requiredHoursPerDay = 8;
        for (const rec of [...presentRecs, ...halfDayRecs]) {
          const hours = rec.totalHours ?? 0;
          const required = rec.status === "half_day" ? 4 : requiredHoursPerDay;
          if (hours < required && hours > 0) {
            const shortfallMinutes = Math.round((required - hours) * 60);
            incompleteDeduction += Math.round(shortfallMinutes * minuteRate);
          }
        }
        incompleteDeduction = Math.round(incompleteDeduction);
      }

      /* ── Regular OT (non-holiday days) ────────────────── */
      let regularOtHours = 0;
      let holidayOtPay   = 0;
      let regularOtPay   = 0;

      for (const rec of empAtt) {
        const recHours = rec.totalHours ?? 0;
        const recOt    = rec.overtimeHours ?? 0;

        if (rec.status === "holiday") {
          const hType = holidayDateMap.get(rec.date) ?? "public";
          const mult =
            hType === "statutory" ? (cfg.statutoryOtMultiplier ?? 2.0) :
            hType === "poya"      ? (cfg.poyaOtMultiplier ?? 1.5) :
                                    (cfg.publicHolidayOtMultiplier ?? 1.5);
          if (recHours > 0) {
            holidayOtPay += Math.round(recHours * hourlyRate * mult);
          }
        } else if (rec.status === "half_day") {
          if (recHours > 5) {
            const halfDayOt = recHours - 5;
            const mult = isManager ? 0 : cfg.overtimeMultiplier;
            regularOtHours += halfDayOt;
            regularOtPay   += Math.round(halfDayOt * hourlyRate * mult);
          }
        } else if (recOt > 0) {
          let ot = recOt;
          if (isNightWatcher && ot > 2) ot = 2;
          if (!isManager) {
            regularOtHours += ot;
            regularOtPay   += Math.round(ot * hourlyRate * cfg.overtimeMultiplier);
          }
        }
      }

      /* ── Manager gets fixed allowance instead of OT ───── */
      let managerFixedAllowance = 0;
      if (isManager) {
        managerFixedAllowance = Math.round(basicSalary * 0.1);
      }

      const overtimePay = isManager ? managerFixedAllowance : regularOtPay;

      const grossSalary = Math.round(
        basicSalary + transportAllowance + housingAllowance + otherAllowances
        + overtimePay + holidayOtPay
        - absenceDeduction - lateDeduction - halfDayDeduction - incompleteDeduction
      );

      if (!structData) {
        epfEmployee = Math.round(grossSalary * (cfg.epfEmployeePercent / 100));
        epfEmployer = Math.round(grossSalary * (cfg.epfEmployerPercent / 100));
        etfEmployer = Math.round(grossSalary * (cfg.etfEmployerPercent / 100));
      }

      const apit         = calcAPIT(grossSalary);
      const otherDeductions = otherDeductionsFromStruct;
      const totalDeductions = epfEmployee + apit + lateDeduction + absenceDeduction + halfDayDeduction + incompleteDeduction + otherDeductions;
      const netSalary    = grossSalary - epfEmployee - apit - otherDeductions;

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
        housingAllowance,
        otherAllowances,
        overtimePay,
        holidayOtPay,
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
