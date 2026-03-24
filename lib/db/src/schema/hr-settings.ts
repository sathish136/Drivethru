import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const hrSettings = pgTable("hr_settings", {
  id: serial("id").primaryKey(),

  requiredWorkMinutes: integer("required_work_minutes").notNull().default(540),
  otGraceMinutes: integer("ot_grace_minutes").notNull().default(30),
  dailyRateDivisor: integer("daily_rate_divisor").notNull().default(30),
  hoursPerDay: integer("hours_per_day").notNull().default(8),
  duplicatePunchFilterMinutes: integer("duplicate_punch_filter_minutes").notNull().default(5),

  standardLunchStartHour: integer("standard_lunch_start_hour").notNull().default(13),
  standardLunchMinutes: integer("standard_lunch_minutes").notNull().default(60),

  otExemptDesignations: text("ot_exempt_designations").notNull().default(JSON.stringify(["Manager"])),
  incompleteExemptDepartments: text("incomplete_exempt_departments").notNull().default(JSON.stringify(["Surf Instructors - D"])),

  departmentRules: text("department_rules").notNull().default(JSON.stringify([
    {
      department: "Security - D",
      isNightShift: true,
      lunchType: "none",
      lunchStartHour: 13,
      lunchDurations: { Monday: 0, Tuesday: 0, Wednesday: 0, Thursday: 0, Friday: 0, Saturday: 0, Sunday: 0 },
    },
    {
      department: "Kitchen - D",
      isNightShift: false,
      lunchType: "custom",
      lunchStartHour: 14,
      lunchDurations: { Monday: 120, Tuesday: 120, Wednesday: 60, Thursday: 120, Friday: 120, Saturday: 0, Sunday: 60 },
    },
  ])),

  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertHrSettingsSchema = createInsertSchema(hrSettings).omit({ id: true, updatedAt: true });
export type InsertHrSettings = z.infer<typeof insertHrSettingsSchema>;
export type HrSettings = typeof hrSettings.$inferSelect;
