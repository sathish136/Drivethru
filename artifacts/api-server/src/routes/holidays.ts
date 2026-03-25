import { Router } from "express";
import { db } from "@workspace/db";
import { holidays } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const all = await db.select().from(holidays).orderBy(holidays.date);
    const year = req.query.year ? Number(req.query.year) : null;
    const filtered = year ? all.filter(h => h.date.startsWith(String(year))) : all;
    res.json(filtered.map(h => ({ ...h, createdAt: h.createdAt.toISOString() })));
  } catch (e) { res.status(500).json({ message: "Error", success: false }); }
});

router.post("/", async (req, res) => {
  try {
    const { name, date, type, description } = req.body;
    const [holiday] = await db.insert(holidays).values({ name, date, type: type || "public", description }).returning();
    res.status(201).json({ ...holiday, createdAt: holiday.createdAt.toISOString() });
  } catch (e) { console.error(e); res.status(500).json({ message: "Error", success: false }); }
});

router.put("/:id", async (req, res) => {
  try {
    const { name, date, type, description } = req.body;
    const [holiday] = await db.update(holidays)
      .set({ name, date, type: type || "public", description })
      .where(eq(holidays.id, Number(req.params.id)))
      .returning();
    if (!holiday) return res.status(404).json({ message: "Not found" });
    res.json({ ...holiday, createdAt: holiday.createdAt.toISOString() });
  } catch (e) { console.error(e); res.status(500).json({ message: "Error", success: false }); }
});

router.delete("/:id", async (req, res) => {
  try {
    await db.delete(holidays).where(eq(holidays.id, Number(req.params.id)));
    res.json({ message: "Deleted", success: true });
  } catch (e) { res.status(500).json({ message: "Error", success: false }); }
});

/* ── Sync Sri Lanka public holidays from Nager.Date API ── */
router.post("/sync-srilanka", async (req, res) => {
  try {
    const year = Number(req.body.year) || new Date().getFullYear();
    const url  = `https://date.nager.at/api/v3/PublicHolidays/${year}/LK`;

    const resp = await fetch(url);
    if (!resp.ok) return res.status(502).json({ message: `Nager API error: ${resp.status}` });

    const apiHolidays = await resp.json() as Array<{
      date: string;
      name: string;
      localName: string;
      types: string[];
    }>;

    if (!Array.isArray(apiHolidays)) return res.status(502).json({ message: "Unexpected API response" });

    /* Classify holiday type */
    function classify(h: { name: string; types: string[] }): "statutory" | "poya" | "public" {
      const n = h.name.toLowerCase();
      if (n.includes("poya")) return "poya";
      const types = (h.types ?? []).map((t: string) => t.toLowerCase());
      if (types.includes("public") && (
        n.includes("independence") || n.includes("national") || n.includes("labour") ||
        n.includes("republic") || n.includes("victory") || n.includes("heroes")
      )) return "statutory";
      return "public";
    }

    /* Fetch existing for the year to avoid duplicates */
    const existingAll = await db.select({ date: holidays.date }).from(holidays);
    const existingDates = new Set(existingAll.filter(h => h.date.startsWith(String(year))).map(h => h.date));

    let inserted = 0;
    let skipped  = 0;

    for (const h of apiHolidays) {
      if (existingDates.has(h.date)) { skipped++; continue; }
      const type = classify(h);
      await db.insert(holidays).values({
        name: h.name,
        date: h.date,
        type,
        description: h.localName !== h.name ? h.localName : undefined,
      });
      inserted++;
    }

    res.json({ success: true, year, total: apiHolidays.length, inserted, skipped });
  } catch (e) {
    console.error("Sync error:", e);
    res.status(500).json({ message: "Failed to sync Sri Lanka holidays" });
  }
});

export default router;
