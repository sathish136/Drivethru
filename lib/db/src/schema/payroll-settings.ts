import { pgTable, serial, real, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const payrollSettings = pgTable("payroll_settings", {
  id: serial("id").primaryKey(),

  epfEmployeePercent: real("epf_employee_percent").notNull().default(8.0),
  epfEmployerPercent: real("epf_employer_percent").notNull().default(12.0),
  etfEmployerPercent: real("etf_employer_percent").notNull().default(3.0),

  transportAllowance: real("transport_allowance").notNull().default(5000),
  housingAllowanceLow: real("housing_allowance_low").notNull().default(3000),
  housingAllowanceMid: real("housing_allowance_mid").notNull().default(7000),
  housingAllowanceHigh: real("housing_allowance_high").notNull().default(10000),
  housingMidThreshold: real("housing_mid_threshold").notNull().default(50000),
  housingHighThreshold: real("housing_high_threshold").notNull().default(80000),
  otherAllowances: real("other_allowances").notNull().default(1500),

  lateDeductionPerInstance: real("late_deduction_per_instance").notNull().default(100),
  overtimeMultiplier: real("overtime_multiplier").notNull().default(1.5),

  salaryScale: text("salary_scale").notNull().default(JSON.stringify({
    "Postmaster General": 150000,
    "Deputy Postmaster General": 120000,
    "Regional Postmaster": 80000,
    "Sub Postmaster": 60000,
    "Postal Supervisor": 55000,
    "Senior Postal Officer": 50000,
    "Postal Officer": 45000,
    "Counter Clerk": 40000,
    "Sorting Officer": 38000,
    "Delivery Agent": 35000,
    "Accounts Officer": 55000,
    "HR Officer": 50000,
    "IT Officer": 55000,
    "PSB Officer": 48000,
    "Driver": 38000,
    "Security Officer": 35000,
    "Clerical Assistant": 32000,
    "Data Entry Operator": 35000,
  })),

  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPayrollSettingsSchema = createInsertSchema(payrollSettings).omit({ id: true, updatedAt: true });
export type InsertPayrollSettings = z.infer<typeof insertPayrollSettingsSchema>;
export type PayrollSettings = typeof payrollSettings.$inferSelect;
