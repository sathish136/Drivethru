import { Router } from "express";
import { db } from "@workspace/db";
import { payrollRecords, employees, attendanceRecords, payrollSettings, salaryStructures, employeeSalaryAssignments } from "@workspace/db/schema";
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

    // Only fetch payroll for employees who have a salary structure assigned
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

    // Only include employees who have a salary structure assigned
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

    // Load salary structure assignments for these employees
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

    const wdCount = workingDaysInMonth(year, month);
    const generated: any[] = [];

    await db.delete(payrollRecords).where(
      and(
        eq(payrollRecords.month, month),
        eq(payrollRecords.year, year),
        inArray(payrollRecords.employeeId, empIds)
      )
    );

    for (const emp of targetEmps) {
      const empAtt = filteredAtt.filter(a => a.employeeId === emp.id);
      const presentDays = empAtt.filter(a => a.status === "present").length;
      const lateDays = empAtt.filter(a => a.status === "late").length;
      const absentDays = empAtt.filter(a => a.status === "absent").length;
      const leaveDays = empAtt.filter(a => a.status === "leave").length;
      const halfDays = empAtt.filter(a => a.status === "half_day").length;
      const holidayDays = empAtt.filter(a => a.status === "holiday").length;
      const totalOTHours = empAtt.reduce((s, a) => s + (a.overtimeHours || 0), 0);

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
        // Use the assigned salary structure
        const basicEarning = structData.earnings.find((e: any) => e.component === "Basic");
        basicSalary = structData.basicAmount || basicEarning?.amount || 0;

        // Map non-basic earnings into allowance buckets
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

        // EPF/ETF calculated from basic salary per structure
        epfEmployee = Math.round(basicSalary * 0.08);
        epfEmployer = Math.round(basicSalary * 0.12);
        etfEmployer = Math.round(basicSalary * 0.03);

        // Sum any custom (non-statutory) deductions
        const customDeds = structData.deductions.filter((d: any) => !STATUTORY_NAMES.includes(d.component));
        otherDeductionsFromStruct = customDeds.reduce((s: number, d: any) => s + (d.amount || 0), 0);
      } else {
        // Fall back to global payroll settings
        basicSalary = cfg.employeeOverrides[String(emp.id)] ?? cfg.salaryScale[emp.designation] ?? 40000;
        transportAllowance = cfg.transportAllowance;
        housingAllowance =
          basicSalary >= cfg.housingHighThreshold ? cfg.housingAllowanceHigh :
          basicSalary >= cfg.housingMidThreshold ? cfg.housingAllowanceMid :
          cfg.housingAllowanceLow;
        otherAllowances = cfg.otherAllowances;
        epfEmployee = 0; // will be computed after gross
        epfEmployer = 0;
        etfEmployer = 0;
      }

      const dailyRate = basicSalary / wdCount;
      const hourlyRate = basicSalary / (wdCount * 8);
      const absenceDeduction = Math.round(dailyRate * absentDays);
      const lateDeduction = Math.round(lateDays * cfg.lateDeductionPerInstance);
      const halfDayDeduction = Math.round(halfDays * (dailyRate / 2));
      const overtimePay = Math.round(totalOTHours * hourlyRate * cfg.overtimeMultiplier);

      const grossSalary = Math.round(
        basicSalary + transportAllowance + housingAllowance + otherAllowances + overtimePay
        - absenceDeduction - lateDeduction - halfDayDeduction
      );

      // For non-structure employees, calculate EPF/ETF from gross
      if (!structData) {
        epfEmployee = Math.round(grossSalary * (cfg.epfEmployeePercent / 100));
        epfEmployer = Math.round(grossSalary * (cfg.epfEmployerPercent / 100));
        etfEmployer = Math.round(grossSalary * (cfg.etfEmployerPercent / 100));
      }

      const apit = calcAPIT(grossSalary);
      const otherDeductions = otherDeductionsFromStruct;
      const totalDeductions = epfEmployee + apit + lateDeduction + absenceDeduction + halfDayDeduction + otherDeductions;
      const netSalary = grossSalary - epfEmployee - apit - otherDeductions;

      const record = {
        employeeId: emp.id,
        branchId: emp.branchId!,
        month,
        year,
        workingDays: wdCount,
        presentDays,
        absentDays,
        lateDays,
        leaveDays,
        holidayDays,
        overtimeHours: Math.round(totalOTHours * 100) / 100,
        basicSalary,
        transportAllowance,
        housingAllowance,
        otherAllowances,
        overtimePay,
        grossSalary,
        epfEmployee,
        epfEmployer,
        etfEmployer,
        apit,
        lateDeduction,
        absenceDeduction,
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

    const rows = await db.select().from(payrollRecords)
      .where(and(eq(payrollRecords.month, parseInt(month)), eq(payrollRecords.year, parseInt(year))));

    const summary = {
      totalEmployees: rows.length,
      totalGross: rows.reduce((s, r) => s + r.grossSalary, 0),
      totalNet: rows.reduce((s, r) => s + r.netSalary, 0),
      totalEPF: rows.reduce((s, r) => s + r.epfEmployee + r.epfEmployer, 0),
      totalETF: rows.reduce((s, r) => s + r.etfEmployer, 0),
      totalAPIT: rows.reduce((s, r) => s + r.apit, 0),
      totalOTPay: rows.reduce((s, r) => s + r.overtimePay, 0),
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
