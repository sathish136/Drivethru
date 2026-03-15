import { Router } from "express";
import { db } from "@workspace/db";
import { holidays } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const all = await db.select().from(holidays);
    const year = req.query.year ? Number(req.query.year) : null;
    const filtered = year ? all.filter(h => h.date.startsWith(String(year))) : all;
    res.json(filtered.map(h => ({ ...h, createdAt: h.createdAt.toISOString() })));
  } catch (e) { res.status(500).json({ message: "Error", success: false }); }
});

router.post("/", async (req, res) => {
  try {
    const [holiday] = await db.insert(holidays).values(req.body).returning();
    res.status(201).json({ ...holiday, createdAt: holiday.createdAt.toISOString() });
  } catch (e) { console.error(e); res.status(500).json({ message: "Error", success: false }); }
});

router.delete("/:id", async (req, res) => {
  try {
    await db.delete(holidays).where(eq(holidays.id, Number(req.params.id)));
    res.json({ message: "Deleted", success: true });
  } catch (e) { res.status(500).json({ message: "Error", success: false }); }
});

export default router;
