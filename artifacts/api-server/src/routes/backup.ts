import { Router } from "express";
import multer from "multer";
import { db } from "@workspace/db";
import {
  companies, branches, departments, designations, shifts,
  employees, systemSettings, holidays,
  payrollSettings, payrollRecords, staffLoans,
} from "@workspace/db/schema";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

const BACKUP_VERSION = 2;

/* ── GET /backup/export ── download full JSON backup */
router.get("/export", async (_req, res) => {
  try {
    const [
      companiesData, branchesData, departmentsData, designationsData, shiftsData,
      employeesData, systemSettingsData, holidaysData,
      payrollSettingsData, payrollRecordsData, staffLoansData,
    ] = await Promise.all([
      db.select().from(companies),
      db.select().from(branches),
      db.select().from(departments),
      db.select().from(designations),
      db.select().from(shifts),
      db.select().from(employees),
      db.select().from(systemSettings),
      db.select().from(holidays),
      db.select().from(payrollSettings),
      db.select().from(payrollRecords),
      db.select().from(staffLoans),
    ]);

    const backup = {
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      tables: {
        companies:       companiesData,
        branches:        branchesData,
        departments:     departmentsData,
        designations:    designationsData,
        shifts:          shiftsData,
        employees:       employeesData,
        systemSettings:  systemSettingsData,
        holidays:        holidaysData,
        payrollSettings: payrollSettingsData,
        payrollRecords:  payrollRecordsData,
        staffLoans:      staffLoansData,
      },
      stats: {
        companies:      companiesData.length,
        branches:       branchesData.length,
        departments:    departmentsData.length,
        designations:   designationsData.length,
        shifts:         shiftsData.length,
        employees:      employeesData.length,
        holidays:       holidaysData.length,
        payrollRecords: payrollRecordsData.length,
        staffLoans:     staffLoansData.length,
      },
    };

    const filename = `attendance-backup-${new Date().toISOString().slice(0, 10)}.json`;
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.json(backup);
  } catch (err) {
    console.error("Backup export error:", err);
    res.status(500).json({ error: "Failed to export backup" });
  }
});

/* ── GET /backup/stats ── record counts for display */
router.get("/stats", async (_req, res) => {
  try {
    const [
      companiesData, branchesData, departmentsData, designationsData,
      shiftsData, employeesData, holidaysData, payrollRecordsData, staffLoansData,
    ] = await Promise.all([
      db.select().from(companies),
      db.select().from(branches),
      db.select().from(departments),
      db.select().from(designations),
      db.select().from(shifts),
      db.select().from(employees),
      db.select().from(holidays),
      db.select().from(payrollRecords),
      db.select().from(staffLoans),
    ]);
    res.json({
      companies:      companiesData.length,
      branches:       branchesData.length,
      departments:    departmentsData.length,
      designations:   designationsData.length,
      shifts:         shiftsData.length,
      employees:      employeesData.length,
      holidays:       holidaysData.length,
      payrollRecords: payrollRecordsData.length,
      staffLoans:     staffLoansData.length,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

/* ── POST /backup/restore ── restore from JSON file */
router.post("/restore", upload.single("backup"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No backup file provided" });

  let backup: any;
  try {
    backup = JSON.parse(req.file.buffer.toString("utf-8"));
  } catch {
    return res.status(400).json({ error: "Invalid JSON — could not parse the backup file" });
  }

  if (!backup.tables || typeof backup.tables !== "object") {
    return res.status(400).json({ error: "Invalid backup format — missing tables section" });
  }

  const t = backup.tables;
  const log: string[] = [];

  try {
    // 1. Settings (no FK deps)
    if (Array.isArray(t.systemSettings) && t.systemSettings.length > 0) {
      const s = t.systemSettings[0];
      await db.delete(systemSettings);
      await db.insert(systemSettings).values({
        organizationName:       s.organizationName,
        organizationCode:       s.organizationCode,
        workingDays:            s.workingDays,
        timezone:               s.timezone,
        lateThresholdMinutes:   s.lateThresholdMinutes,
        halfDayThresholdHours:  s.halfDayThresholdHours,
        overtimeThresholdHours: s.overtimeThresholdHours,
        autoMarkAbsent:         s.autoMarkAbsent,
        biometricSyncInterval:  s.biometricSyncInterval,
        zkPushServerUrl:        s.zkPushServerUrl ?? null,
        zkPushApiKey:           s.zkPushApiKey ?? null,
      });
      log.push("systemSettings: restored");
    }

    // 2. Holidays
    if (Array.isArray(t.holidays)) {
      await db.delete(holidays);
      if (t.holidays.length > 0) {
        await db.insert(holidays).values(t.holidays.map((h: any) => ({
          name: h.name, date: h.date, type: h.type, description: h.description ?? null,
        })));
      }
      log.push(`holidays: ${t.holidays.length} rows`);
    }

    // 3. PayrollSettings
    if (Array.isArray(t.payrollSettings) && t.payrollSettings.length > 0) {
      const p = t.payrollSettings[0];
      await db.delete(payrollSettings);
      await db.insert(payrollSettings).values({
        epfEmployeePercent:        p.epfEmployeePercent,
        epfEmployerPercent:        p.epfEmployerPercent,
        etfEmployerPercent:        p.etfEmployerPercent,
        transportAllowance:        p.transportAllowance,
        housingAllowanceLow:       p.housingAllowanceLow,
        housingAllowanceMid:       p.housingAllowanceMid,
        housingAllowanceHigh:      p.housingAllowanceHigh,
        housingMidThreshold:       p.housingMidThreshold,
        housingHighThreshold:      p.housingHighThreshold,
        otherAllowances:           p.otherAllowances,
        overtimeMultiplier:        p.overtimeMultiplier,
        statutoryOtMultiplier:     p.statutoryOtMultiplier,
        poyaOtMultiplier:          p.poyaOtMultiplier,
        publicHolidayOtMultiplier: p.publicHolidayOtMultiplier,
        offDayOtMultiplier:        p.offDayOtMultiplier,
        salaryScale:               typeof p.salaryScale === "string" ? p.salaryScale : JSON.stringify(p.salaryScale ?? {}),
        employeeOverrides:         typeof p.employeeOverrides === "string" ? p.employeeOverrides : JSON.stringify(p.employeeOverrides ?? {}),
      });
      log.push("payrollSettings: restored");
    }

    // 4. Companies (no deps)
    if (Array.isArray(t.companies)) {
      await db.delete(companies);
      if (t.companies.length > 0) {
        await db.insert(companies).values(t.companies.map((c: any) => ({
          name: c.name, code: c.code, address: c.address ?? null,
          phone: c.phone ?? null, email: c.email ?? null, isActive: c.isActive ?? true,
        })));
      }
      log.push(`companies: ${t.companies.length} rows`);
    }

    // 5. Branches (self-referential — insert without parentId first)
    if (Array.isArray(t.branches)) {
      await db.delete(branches);
      if (t.branches.length > 0) {
        await db.insert(branches).values(t.branches.map((b: any) => ({
          name: b.name, code: b.code, type: b.type,
          companyId: b.companyId ?? null, parentId: null,
          address: b.address ?? null, phone: b.phone ?? null,
          managerName: b.managerName ?? null, isActive: b.isActive ?? true,
        })));
      }
      log.push(`branches: ${t.branches.length} rows`);
    }

    // 6. Departments
    if (Array.isArray(t.departments)) {
      await db.delete(departments);
      if (t.departments.length > 0) {
        await db.insert(departments).values(t.departments.map((d: any) => ({
          name: d.name, code: d.code, description: d.description ?? null, isActive: d.isActive ?? true,
        })));
      }
      log.push(`departments: ${t.departments.length} rows`);
    }

    // 7. Designations
    if (Array.isArray(t.designations)) {
      await db.delete(designations);
      if (t.designations.length > 0) {
        await db.insert(designations).values(t.designations.map((d: any) => ({
          name: d.name, code: d.code, departmentId: d.departmentId ?? null,
          description: d.description ?? null, isActive: d.isActive ?? true,
        })));
      }
      log.push(`designations: ${t.designations.length} rows`);
    }

    // 8. Shifts
    if (Array.isArray(t.shifts)) {
      await db.delete(shifts);
      if (t.shifts.length > 0) {
        await db.insert(shifts).values(t.shifts.map((s: any) => ({
          name: s.name, code: s.code, startTime: s.startTime, endTime: s.endTime,
          graceMinutes: s.graceMinutes ?? 0, isActive: s.isActive ?? true,
          branchId: s.branchId ?? null,
        })));
      }
      log.push(`shifts: ${t.shifts.length} rows`);
    }

    // 9. Employees (clear loans & payroll first due to FK)
    if (Array.isArray(t.employees)) {
      await db.delete(staffLoans);
      await db.delete(payrollRecords);
      await db.delete(employees);
      if (t.employees.length > 0) {
        await db.insert(employees).values(t.employees.map((e: any) => ({
          employeeId:   e.employeeId,
          fullName:     e.fullName,
          firstName:    e.firstName ?? null,
          lastName:     e.lastName ?? null,
          email:        e.email ?? null,
          phone:        e.phone ?? null,
          designation:  e.designation ?? "",
          department:   e.department ?? "",
          branchId:     e.branchId,
          shiftId:      e.shiftId ?? null,
          employeeType: e.employeeType ?? "full_time",
          status:       e.status ?? "active",
          joinDate:     e.joinDate ?? null,
          nicNumber:    e.nicNumber ?? null,
          aadharNumber: e.aadharNumber ?? null,
          panNumber:    e.panNumber ?? null,
          bankName:     e.bankName ?? null,
          bankAccount:  e.bankAccount ?? null,
          basicSalary:  e.basicSalary ?? 0,
          address:      e.address ?? null,
          photoUrl:     e.photoUrl ?? null,
        })));
      }
      log.push(`employees: ${t.employees.length} rows`);
    }

    // 10. Payroll Records
    if (Array.isArray(t.payrollRecords)) {
      await db.delete(payrollRecords);
      if (t.payrollRecords.length > 0) {
        await db.insert(payrollRecords).values(t.payrollRecords.map((p: any) => ({
          employeeId:          p.employeeId,
          branchId:            p.branchId,
          month:               p.month,
          year:                p.year,
          workingDays:         p.workingDays ?? 0,
          presentDays:         p.presentDays ?? 0,
          absentDays:          p.absentDays ?? 0,
          lateDays:            p.lateDays ?? 0,
          halfDays:            p.halfDays ?? 0,
          leaveDays:           p.leaveDays ?? 0,
          holidayDays:         p.holidayDays ?? 0,
          overtimeHours:       p.overtimeHours ?? 0,
          basicSalary:         p.basicSalary ?? 0,
          transportAllowance:  p.transportAllowance ?? 0,
          housingAllowance:    p.housingAllowance ?? 0,
          otherAllowances:     p.otherAllowances ?? 0,
          overtimePay:         p.overtimePay ?? 0,
          holidayOtPay:        p.holidayOtPay ?? 0,
          grossSalary:         p.grossSalary ?? 0,
          epfEmployee:         p.epfEmployee ?? 0,
          epfEmployer:         p.epfEmployer ?? 0,
          etfEmployer:         p.etfEmployer ?? 0,
          apit:                p.apit ?? 0,
          lateDeduction:       p.lateDeduction ?? 0,
          absenceDeduction:    p.absenceDeduction ?? 0,
          halfDayDeduction:    p.halfDayDeduction ?? 0,
          incompleteDeduction: p.incompleteDeduction ?? 0,
          otherDeductions:     p.otherDeductions ?? 0,
          loanDeduction:       p.loanDeduction ?? 0,
          totalDeductions:     p.totalDeductions ?? 0,
          netSalary:           p.netSalary ?? 0,
          status:              p.status ?? "draft",
          remarks:             p.remarks ?? null,
        })));
      }
      log.push(`payrollRecords: ${t.payrollRecords.length} rows`);
    }

    // 11. Staff Loans
    if (Array.isArray(t.staffLoans)) {
      await db.delete(staffLoans);
      if (t.staffLoans.length > 0) {
        await db.insert(staffLoans).values(t.staffLoans.map((l: any) => ({
          employeeId:         l.employeeId,
          type:               l.type ?? "loan",
          totalAmount:        l.totalAmount,
          monthlyInstallment: l.monthlyInstallment,
          startMonth:         l.startMonth,
          startYear:          l.startYear,
          paidAmount:         l.paidAmount ?? 0,
          remainingBalance:   l.remainingBalance,
          status:             l.status ?? "active",
          description:        l.description ?? null,
        })));
      }
      log.push(`staffLoans: ${t.staffLoans.length} rows`);
    }

    res.json({
      success: true,
      message: "Restore completed successfully",
      restoredAt: new Date().toISOString(),
      log,
    });
  } catch (err: any) {
    console.error("Restore error:", err);
    res.status(500).json({ error: "Restore failed: " + (err?.message ?? "Unknown error"), log });
  }
});

export default router;
