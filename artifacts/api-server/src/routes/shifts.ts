import { Router } from "express";
import { db } from "@workspace/db";
import { shifts } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

function calcHours(t1: string, t2: string): number {
  const [h1, m1] = t1.split(":").map(Number);
  const [h2, m2] = t2.split(":").map(Number);
  let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
  if (diff < 0) diff += 24 * 60; // cross-midnight (e.g. Night Watcher 20:00→05:00)
  return diff / 60;
}

export type WeekDaySchedule = {
  startTime: string;
  endTime: string;
  lunchBreakMinutes: number;
  isOff: boolean;
  isHalfDay: boolean;
} | null;

function mapShift(s: any) {
  let totalHours = calcHours(s.startTime1, s.endTime1);
  if (s.startTime2 && s.endTime2) totalHours += calcHours(s.startTime2, s.endTime2);
  const weeklySchedule: (WeekDaySchedule)[] | null = s.weeklySchedule
    ? JSON.parse(s.weeklySchedule)
    : null;
  return { ...s, totalHours, weeklySchedule, createdAt: s.createdAt.toISOString() };
}

router.get("/", async (_req, res) => {
  try {
    const all = await db.select().from(shifts);
    res.json(all.map(mapShift));
  } catch (e) { res.status(500).json({ message: "Error", success: false }); }
});

router.post("/", async (req, res) => {
  try {
    const [shift] = await db.insert(shifts).values(req.body).returning();
    res.status(201).json(mapShift(shift));
  } catch (e) { console.error(e); res.status(500).json({ message: "Error", success: false }); }
});

router.put("/:id", async (req, res) => {
  try {
    const body = { ...req.body };
    if ("weeklySchedule" in body && body.weeklySchedule !== undefined) {
      body.weeklySchedule = body.weeklySchedule === null ? null : JSON.stringify(body.weeklySchedule);
    }
    const [shift] = await db.update(shifts).set(body).where(eq(shifts.id, Number(req.params.id))).returning();
    res.json(mapShift(shift));
  } catch (e) { res.status(500).json({ message: "Error", success: false }); }
});

router.delete("/:id", async (req, res) => {
  try {
    await db.delete(shifts).where(eq(shifts.id, Number(req.params.id)));
    res.json({ message: "Deleted", success: true });
  } catch (e) { res.status(500).json({ message: "Error", success: false }); }
});

export default router;
