import { pgTable, serial, integer, real, text, timestamp, date, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { employees } from "./employees";
import { branches } from "./branches";

export const payrollRecords = pgTable("payroll_records", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employees.id),
  branchId: integer("branch_id").notNull().references(() => branches.id),
  month: integer("month").notNull(),
  year: integer("year").notNull(),

  workingDays: integer("working_days").notNull().default(0),
  presentDays: integer("present_days").notNull().default(0),
  absentDays: integer("absent_days").notNull().default(0),
  lateDays: integer("late_days").notNull().default(0),
  halfDays: integer("half_days").notNull().default(0),
  leaveDays: integer("leave_days").notNull().default(0),
  holidayDays: integer("holiday_days").notNull().default(0),
  overtimeHours: real("overtime_hours").notNull().default(0),

  basicSalary: real("basic_salary").notNull().default(0),
  transportAllowance: real("transport_allowance").notNull().default(0),
  housingAllowance: real("housing_allowance").notNull().default(0),
  otherAllowances: real("other_allowances").notNull().default(0),
  overtimePay: real("overtime_pay").notNull().default(0),
  holidayOtPay: real("holiday_ot_pay").notNull().default(0),
  grossSalary: real("gross_salary").notNull().default(0),

  epfEmployee: real("epf_employee").notNull().default(0),
  epfEmployer: real("epf_employer").notNull().default(0),
  etfEmployer: real("etf_employer").notNull().default(0),
  apit: real("apit").notNull().default(0),
  lateDeduction: real("late_deduction").notNull().default(0),
  absenceDeduction: real("absence_deduction").notNull().default(0),
  halfDayDeduction: real("half_day_deduction").notNull().default(0),
  incompleteDeduction: real("incomplete_deduction").notNull().default(0),
  otherDeductions: real("other_deductions").notNull().default(0),
  loanDeduction: real("loan_deduction").notNull().default(0),
  totalDeductions: real("total_deductions").notNull().default(0),

  netSalary: real("net_salary").notNull().default(0),

  status: text("status").notNull().$type<"draft" | "approved" | "paid">().default("draft"),
  remarks: text("remarks"),

  generatedAt: timestamp("generated_at").notNull().defaultNow(),
  approvedAt: timestamp("approved_at"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPayrollSchema = createInsertSchema(payrollRecords).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPayroll = z.infer<typeof insertPayrollSchema>;
export type PayrollRecord = typeof payrollRecords.$inferSelect;

/* ── Salary Structures ──────────────────────────────────── */

export const salaryStructures = pgTable("salary_structures", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  currency: text("currency").notNull().default("LKR"),
  status: text("status").notNull().$type<"active" | "inactive">().default("active"),
  earnings: text("earnings").notNull().default("[]"),
  deductions: text("deductions").notNull().default("[]"),
  variablePay: text("variable_pay").notNull().default("[]"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const employeeSalaryAssignments = pgTable("employee_salary_assignments", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employees.id),
  salaryStructureId: integer("salary_structure_id").notNull().references(() => salaryStructures.id),
  basicAmount: real("basic_amount").notNull().default(0),
  effectiveDate: date("effective_date").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSalaryStructureSchema = createInsertSchema(salaryStructures).omit({ id: true, createdAt: true, updatedAt: true });
export const insertEmployeeSalaryAssignmentSchema = createInsertSchema(employeeSalaryAssignments).omit({ id: true, createdAt: true, updatedAt: true });
export type SalaryStructure = typeof salaryStructures.$inferSelect;
export type EmployeeSalaryAssignment = typeof employeeSalaryAssignments.$inferSelect;

/* ── Staff Loans & Advances ─────────────────────────────── */

export const staffLoans = pgTable("staff_loans", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employees.id),
  type: text("type").notNull().$type<"loan" | "advance">().default("loan"),
  totalAmount: real("total_amount").notNull(),
  monthlyInstallment: real("monthly_installment").notNull(),
  startMonth: integer("start_month").notNull(),
  startYear: integer("start_year").notNull(),
  paidAmount: real("paid_amount").notNull().default(0),
  remainingBalance: real("remaining_balance").notNull(),
  status: text("status").notNull().$type<"active" | "completed" | "cancelled">().default("active"),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertStaffLoanSchema = createInsertSchema(staffLoans).omit({ id: true, createdAt: true, updatedAt: true });
export type StaffLoan = typeof staffLoans.$inferSelect;
