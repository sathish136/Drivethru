import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const weekoffSchedules = pgTable("weekoff_schedules", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  offDays: text("off_days").notNull().default("[]"),
  halfDays: text("half_days").notNull().default("[]"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertWeekoffScheduleSchema = createInsertSchema(weekoffSchedules).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWeekoffSchedule = z.infer<typeof insertWeekoffScheduleSchema>;
export type WeekoffSchedule = typeof weekoffSchedules.$inferSelect;
