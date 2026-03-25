import { pgTable, serial, real, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const payrollSettings = pgTable("payroll_settings", {
  id: serial("id").primaryKey(),

  epfEmployeePercent: real("epf_employee_percent").notNull().default(8.0),
  epfEmployerPercent: real("epf_employer_percent").notNull().default(12.0),
  etfEmployerPercent: real("etf_employer_percent").notNull().default(3.0),

  transportAllowance: real("transport_allowance").notNull().default(0),
  lunchIncentive: real("lunch_incentive").notNull().default(0),
  housingAllowanceLow: real("housing_allowance_low").notNull().default(0),
  housingAllowanceMid: real("housing_allowance_mid").notNull().default(0),
  housingAllowanceHigh: real("housing_allowance_high").notNull().default(0),
  housingMidThreshold: real("housing_mid_threshold").notNull().default(50000),
  housingHighThreshold: real("housing_high_threshold").notNull().default(80000),
  otherAllowances: real("other_allowances").notNull().default(0),

  overtimeMultiplier: real("overtime_multiplier").notNull().default(1.5),
  statutoryOtMultiplier: real("statutory_ot_multiplier").notNull().default(2.0),
  poyaOtMultiplier: real("poya_ot_multiplier").notNull().default(1.5),
  publicHolidayOtMultiplier: real("public_holiday_ot_multiplier").notNull().default(1.5),
  offDayOtMultiplier: real("off_day_ot_multiplier").notNull().default(1.5),

  offSeasonEnabled: boolean("off_season_enabled").notNull().default(false),
  offSeasonStart: text("off_season_start"),
  offSeasonEnd: text("off_season_end"),

  salaryScale: text("salary_scale").notNull().default(JSON.stringify({
    "General Manager":       150000,
    "Operations Manager":    120000,
    "F&B Manager":           100000,
    "HR Manager":             90000,
    "Accountant":             75000,
    "Admin Officer":          65000,
    "Kitchen Supervisor":     60000,
    "Kitchen Staff":          45000,
    "Room Supervisor":        60000,
    "Room Attendant":         45000,
    "Head Gardener":          50000,
    "Gardener":               40000,
    "Head Surf Instructor":   60000,
    "Surf Instructor":        45000,
    "Night Watcher":          40000,
    "Security Officer":       40000,
    "Cashier":                42000,
    "Driver":                 38000,
  })),

  employeeOverrides: text("employee_overrides").notNull().default("{}"),

  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPayrollSettingsSchema = createInsertSchema(payrollSettings).omit({ id: true, updatedAt: true });
export type InsertPayrollSettings = z.infer<typeof insertPayrollSettingsSchema>;
export type PayrollSettings = typeof payrollSettings.$inferSelect;
