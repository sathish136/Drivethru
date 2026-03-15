import { Router } from "express";
import { db } from "@workspace/db";
import { shifts } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

function calcHours(t1: string, t2: string): number {
  const [h1, m1] = t1.split(":").map(Number);
  const [h2, m2] = t2.split(":").map(Number);
  return Math.max(0, (h2 * 60 + m2 - (h1 * 60 + m1)) / 60);
}

function mapShift(s: any) {
  let totalHours = calcHours(s.startTime1, s.endTime1);
  if (s.startTime2 && s.endTime2) totalHours += calcHours(s.startTime2, s.endTime2);
  return { ...s, totalHours, createdAt: s.createdAt.toISOString() };
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
    const [shift] = await db.update(shifts).set(req.body).where(eq(shifts.id, Number(req.params.id))).returning();
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
