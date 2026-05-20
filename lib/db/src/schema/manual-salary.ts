import { pgTable, serial, integer, real, text, timestamp } from "drizzle-orm/pg-core";
import { employees } from "./employees";
import { branches } from "./branches";

export const manualSalaryEntries = pgTable("manual_salary_entries", {
  id: serial("id").primaryKey(),

  employeeId: integer("employee_id").notNull().references(() => employees.id),
  branchId:   integer("branch_id").notNull().references(() => branches.id),

  month: integer("month").notNull(),
  year:  integer("year").notNull(),

  presentDays:   real("present_days").notNull().default(0),
  absentDays:    real("absent_days").notNull().default(0),
  otHours:       real("ot_hours").notNull().default(0),
  otAmount:      real("ot_amount").notNull().default(0),

  basicSalary:          real("basic_salary").notNull().default(0),
  transportAllowance:   real("transport_allowance").notNull().default(0),
  lunchAllowance:       real("lunch_allowance").notNull().default(0),
  housingAllowance:     real("housing_allowance").notNull().default(0),
  otherAllowances:      real("other_allowances").notNull().default(0),

  epfDeduction:         real("epf_deduction").notNull().default(0),
  loanDeduction:        real("loan_deduction").notNull().default(0),
  absenceDeduction:     real("absence_deduction").notNull().default(0),
  otherDeductions:      real("other_deductions").notNull().default(0),

  grossSalary:   real("gross_salary").notNull().default(0),
  netSalary:     real("net_salary").notNull().default(0),

  status: text("status").notNull().default("draft"),
  notes:  text("notes"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
