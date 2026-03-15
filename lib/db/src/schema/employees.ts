import { pgTable, serial, text, integer, boolean, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { branches } from "./branches";
import { shifts } from "./shifts";

export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  employeeId: text("employee_id").notNull().unique(),
  fullName: text("full_name").notNull(),
  designation: text("designation").notNull(),
  department: text("department").notNull(),
  branchId: integer("branch_id").notNull().references(() => branches.id),
  shiftId: integer("shift_id").references(() => shifts.id),
  joiningDate: date("joining_date").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  biometricId: text("biometric_id"),
  status: text("status").notNull().$type<"active" | "inactive">().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertEmployeeSchema = createInsertSchema(employees).omit({ id: true, createdAt: true });
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Employee = typeof employees.$inferSelect;
