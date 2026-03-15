import { Router } from "express";
import { db } from "@workspace/db";
import { systemSettings, holidays } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const [settings] = await db.select().from(systemSettings);
    if (!settings) {
      const [created] = await db.insert(systemSettings).values({}).returning();
      res.json({ ...created, workingDays: JSON.parse(created.workingDays), updatedAt: created.updatedAt.toISOString() });
      return;
    }
    res.json({ ...settings, workingDays: JSON.parse(settings.workingDays), updatedAt: settings.updatedAt.toISOString() });
  } catch (e) { console.error(e); res.status(500).json({ message: "Error", success: false }); }
});

router.put("/", async (req, res) => {
  try {
    const { workingDays, ...rest } = req.body;
    const [existing] = await db.select().from(systemSettings);
    if (existing) {
      const [updated] = await db.update(systemSettings).set({ ...rest, workingDays: JSON.stringify(workingDays), updatedAt: new Date() }).where(eq(systemSettings.id, existing.id)).returning();
      res.json({ ...updated, workingDays: JSON.parse(updated.workingDays), updatedAt: updated.updatedAt.toISOString() });
    } else {
      const [created] = await db.insert(systemSettings).values({ ...rest, workingDays: JSON.stringify(workingDays) }).returning();
      res.json({ ...created, workingDays: JSON.parse(created.workingDays), updatedAt: created.updatedAt.toISOString() });
    }
  } catch (e) { res.status(500).json({ message: "Error", success: false }); }
});

router.get("/holidays", async (req, res) => {
  try {
    const all = await db.select().from(holidays);
    const year = req.query.year ? Number(req.query.year) : null;
    const filtered = year ? all.filter(h => h.date.startsWith(String(year))) : all;
    res.json(filtered.map(h => ({ ...h, createdAt: h.createdAt.toISOString() })));
  } catch (e) { res.status(500).json({ message: "Error", success: false }); }
});

router.post("/holidays", async (req, res) => {
  try {
    const [holiday] = await db.insert(holidays).values(req.body).returning();
    res.status(201).json({ ...holiday, createdAt: holiday.createdAt.toISOString() });
  } catch (e) { res.status(500).json({ message: "Error", success: false }); }
});

router.delete("/holidays/:id", async (req, res) => {
  try {
    await db.delete(holidays).where(eq(holidays.id, Number(req.params.id)));
    res.json({ message: "Deleted", success: true });
  } catch (e) { res.status(500).json({ message: "Error", success: false }); }
});

export default router;
