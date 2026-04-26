import { Router } from "express";
import { db } from "@workspace/db";
import { weekoffSchedules, employees } from "@workspace/db/schema";
import { eq, inArray } from "drizzle-orm";

const router = Router();

function parseSchedule(s: typeof weekoffSchedules.$inferSelect) {
  return {
    ...s,
    offDays: JSON.parse(s.offDays) as number[],
    halfDays: JSON.parse(s.halfDays) as number[],
  };
}

router.get("/", async (_req, res) => {
  try {
    const rows = await db.select().from(weekoffSchedules).orderBy(weekoffSchedules.id);
    res.json(rows.map(parseSchedule));
  } catch (e) { console.error(e); res.status(500).json({ message: "Failed to fetch weekoff schedules" }); }
});

router.post("/", async (req, res) => {
  try {
    const { name, description, offDays, halfDays, isActive } = req.body;
    if (!name) return res.status(400).json({ message: "name is required" });
    const [row] = await db.insert(weekoffSchedules).values({
      name,
      description: description ?? null,
      offDays: JSON.stringify(offDays ?? []),
      halfDays: JSON.stringify(halfDays ?? []),
      isActive: isActive ?? true,
    }).returning();
    res.status(201).json(parseSchedule(row));
  } catch (e) { console.error(e); res.status(500).json({ message: "Failed to create weekoff schedule" }); }
});

router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, description, offDays, halfDays, isActive } = req.body;
    const [row] = await db.update(weekoffSchedules).set({
      name,
      description: description ?? null,
      offDays: offDays !== undefined ? JSON.stringify(offDays) : undefined,
      halfDays: halfDays !== undefined ? JSON.stringify(halfDays) : undefined,
      isActive: isActive ?? true,
      updatedAt: new Date(),
    }).where(eq(weekoffSchedules.id, id)).returning();
    if (!row) return res.status(404).json({ message: "Not found" });
    res.json(parseSchedule(row));
  } catch (e) { console.error(e); res.status(500).json({ message: "Failed to update weekoff schedule" }); }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.update(employees).set({ weekoffScheduleId: null }).where(eq(employees.weekoffScheduleId, id));
    await db.delete(weekoffSchedules).where(eq(weekoffSchedules.id, id));
    res.json({ success: true });
  } catch (e) { console.error(e); res.status(500).json({ message: "Failed to delete weekoff schedule" }); }
});

router.get("/:id/employees", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const rows = await db.select({
      id: employees.id,
      employeeId: employees.employeeId,
      fullName: employees.fullName,
      designation: employees.designation,
      department: employees.department,
    }).from(employees).where(eq(employees.weekoffScheduleId, id));
    res.json(rows);
  } catch (e) { console.error(e); res.status(500).json({ message: "Failed to fetch assigned employees" }); }
});

router.post("/assign", async (req, res) => {
  try {
    const { employeeIds, weekoffScheduleId } = req.body as {
      employeeIds: number[];
      weekoffScheduleId: number | null;
    };
    if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
      return res.status(400).json({ message: "employeeIds array required" });
    }
    await db.update(employees)
      .set({ weekoffScheduleId: weekoffScheduleId ?? null })
      .where(inArray(employees.id, employeeIds));
    res.json({ success: true, updated: employeeIds.length });
  } catch (e) { console.error(e); res.status(500).json({ message: "Failed to assign weekoff schedule" }); }
});

export default router;
