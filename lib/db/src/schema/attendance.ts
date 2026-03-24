import { pgTable, serial, text, integer, boolean, timestamp, date, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { employees } from "./employees";
import { branches } from "./branches";

export const attendanceRecords = pgTable("attendance_records", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employees.id),
  branchId: integer("branch_id").notNull().references(() => branches.id),
  date: date("date").notNull(),
  status: text("status").notNull().$type<"present" | "absent" | "late" | "half_day" | "holiday" | "leave">(),
  leaveType: text("leave_type").$type<"annual" | "casual">(),
  inTime1: text("in_time1"),
  outTime1: text("out_time1"),
  workHours1: real("work_hours1"),
  inTime2: text("in_time2"),
  outTime2: text("out_time2"),
  workHours2: real("work_hours2"),
  totalHours: real("total_hours"),
  overtimeHours: real("overtime_hours"),
  source: text("source").notNull().$type<"biometric" | "manual" | "system">().default("manual"),
  remarks: text("remarks"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAttendanceSchema = createInsertSchema(attendanceRecords).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type AttendanceRecord = typeof attendanceRecords.$inferSelect;
