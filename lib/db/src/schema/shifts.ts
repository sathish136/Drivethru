import { pgTable, serial, text, integer, boolean, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const shifts = pgTable("shifts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull().$type<"normal" | "split">(),
  startTime1: text("start_time1").notNull(),
  endTime1: text("end_time1").notNull(),
  startTime2: text("start_time2"),
  endTime2: text("end_time2"),
  graceMinutes: integer("grace_minutes").notNull().default(0),
  overtimeThreshold: integer("overtime_threshold").notNull().default(60),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertShiftSchema = createInsertSchema(shifts).omit({ id: true, createdAt: true });
export type InsertShift = z.infer<typeof insertShiftSchema>;
export type Shift = typeof shifts.$inferSelect;
