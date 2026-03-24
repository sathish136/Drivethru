import { pgTable, serial, text, integer, boolean, timestamp, real, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const systemSettings = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  organizationName: text("organization_name").notNull().default("Drivethru"),
  organizationCode: text("organization_code").notNull().default("DT"),
  workingDays: text("working_days").notNull().default('["monday","tuesday","wednesday","thursday","friday","saturday"]'),
  timezone: text("timezone").notNull().default("Asia/Colombo"),
  lateThresholdMinutes: integer("late_threshold_minutes").notNull().default(15),
  halfDayThresholdHours: real("half_day_threshold_hours").notNull().default(5),
  overtimeThresholdHours: real("overtime_threshold_hours").notNull().default(9),
  autoMarkAbsent: boolean("auto_mark_absent").notNull().default(false),
  biometricSyncInterval: integer("biometric_sync_interval").notNull().default(5),
  zkPushServerUrl: text("zk_push_server_url"),
  zkPushApiKey: text("zk_push_api_key"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const holidays = pgTable("holidays", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  date: date("date").notNull(),
  type: text("type").notNull().$type<"statutory" | "poya" | "public">().default("public"),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertHolidaySchema = createInsertSchema(holidays).omit({ id: true, createdAt: true });
export type InsertHoliday = z.infer<typeof insertHolidaySchema>;
export type Holiday = typeof holidays.$inferSelect;
