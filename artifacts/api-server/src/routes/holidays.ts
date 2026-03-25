import { Router } from "express";
import { db } from "@workspace/db";
import { holidays } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

/* ── Built-in Sri Lanka holiday data (fallback when external API unreachable) ── */
const SL_HOLIDAYS: Record<number, Array<{ date: string; name: string; localName: string; type: "statutory" | "poya" | "public" }>> = {
  2025: [
    { date: "2025-01-13", name: "Duruthu Full Moon Poya Day",              localName: "දුරුතු පෝය දිනය",          type: "poya" },
    { date: "2025-01-14", name: "Tamil Thai Pongal Day",                   localName: "தைப்பொங்கல்",              type: "public" },
    { date: "2025-02-04", name: "National Day (Independence Day)",         localName: "ජාතික දිනය",                type: "statutory" },
    { date: "2025-02-12", name: "Navam Full Moon Poya Day",                localName: "නවම් පෝය දිනය",            type: "poya" },
    { date: "2025-02-28", name: "Milad-un-Nabi",                           localName: "Prophet Birthday",          type: "public" },
    { date: "2025-03-13", name: "Medin Full Moon Poya Day",                localName: "මැදින් පෝය දිනය",          type: "poya" },
    { date: "2025-04-13", name: "Bak Full Moon Poya Day",                  localName: "බක් පෝය දිනය",             type: "poya" },
    { date: "2025-04-14", name: "Sinhala & Tamil New Year",                localName: "සිංහල හා දෙමළ අලුත් අවුරුද්ද", type: "statutory" },
    { date: "2025-04-18", name: "Good Friday",                             localName: "ශුද්ධ සිකුරාදා",           type: "public" },
    { date: "2025-05-01", name: "May Day (Labour Day)",                    localName: "කම්කරු දිනය",              type: "statutory" },
    { date: "2025-05-12", name: "Wesak Full Moon Poya Day",                localName: "වෙසක් පෝය දිනය",           type: "poya" },
    { date: "2025-05-13", name: "Day following Wesak Full Moon Poya Day",  localName: "වෙසක් පසු දිනය",           type: "public" },
    { date: "2025-06-10", name: "Poson Full Moon Poya Day",                localName: "පොසොන් පෝය දිනය",          type: "poya" },
    { date: "2025-07-10", name: "Esala Full Moon Poya Day",                localName: "ඇසල පෝය දිනය",             type: "poya" },
    { date: "2025-08-09", name: "Nikini Full Moon Poya Day",               localName: "නිකිණි පෝය දිනය",          type: "poya" },
    { date: "2025-09-07", name: "Binara Full Moon Poya Day",               localName: "බිනර පෝය දිනය",            type: "poya" },
    { date: "2025-10-07", name: "Vap Full Moon Poya Day",                  localName: "වප් පෝය දිනය",             type: "poya" },
    { date: "2025-10-20", name: "Deepavali",                               localName: "දීපාවලිය",                  type: "public" },
    { date: "2025-11-05", name: "Il Full Moon Poya Day",                   localName: "ඉල් පෝය දිනය",             type: "poya" },
    { date: "2025-12-04", name: "Unduvap Full Moon Poya Day",              localName: "උඳුවප් පෝය දිනය",          type: "poya" },
    { date: "2025-12-25", name: "Christmas Day",                           localName: "නත්තල් දිනය",               type: "statutory" },
  ],
  2026: [
    { date: "2026-01-03", name: "Duruthu Full Moon Poya Day",              localName: "දුරුතු පෝය දිනය",          type: "poya" },
    { date: "2026-01-14", name: "Tamil Thai Pongal Day",                   localName: "தைப்பொங்கல்",              type: "public" },
    { date: "2026-02-01", name: "Navam Full Moon Poya Day",                localName: "නවම් පෝය දිනය",            type: "poya" },
    { date: "2026-02-04", name: "National Day (Independence Day)",         localName: "ජාතික දිනය",                type: "statutory" },
    { date: "2026-03-03", name: "Medin Full Moon Poya Day",                localName: "මැදින් පෝය දිනය",          type: "poya" },
    { date: "2026-04-03", name: "Good Friday",                             localName: "ශුද්ධ සිකුරාදා",           type: "public" },
    { date: "2026-04-12", name: "Bak Full Moon Poya Day",                  localName: "බක් පෝය දිනය",             type: "poya" },
    { date: "2026-04-14", name: "Sinhala & Tamil New Year",                localName: "සිංහල හා දෙමළ අලුත් අවුරුද්ද", type: "statutory" },
    { date: "2026-05-01", name: "May Day (Labour Day)",                    localName: "කම්කරු දිනය",              type: "statutory" },
    { date: "2026-05-11", name: "Wesak Full Moon Poya Day",                localName: "වෙසක් පෝය දිනය",           type: "poya" },
    { date: "2026-05-12", name: "Day following Wesak Full Moon Poya Day",  localName: "වෙසක් පසු දිනය",           type: "public" },
    { date: "2026-06-10", name: "Poson Full Moon Poya Day",                localName: "පොසොන් පෝය දිනය",          type: "poya" },
    { date: "2026-07-09", name: "Esala Full Moon Poya Day",                localName: "ඇසල පෝය දිනය",             type: "poya" },
    { date: "2026-08-08", name: "Nikini Full Moon Poya Day",               localName: "නිකිණි පෝය දිනය",          type: "poya" },
    { date: "2026-09-06", name: "Binara Full Moon Poya Day",               localName: "බිනර පෝය දිනය",            type: "poya" },
    { date: "2026-10-06", name: "Vap Full Moon Poya Day",                  localName: "වප් පෝය දිනය",             type: "poya" },
    { date: "2026-10-18", name: "Milad-un-Nabi",                           localName: "Prophet Birthday",          type: "public" },
    { date: "2026-11-04", name: "Il Full Moon Poya Day",                   localName: "ඉල් පෝය දිනය",             type: "poya" },
    { date: "2026-11-09", name: "Deepavali",                               localName: "දීපාවලිය",                  type: "public" },
    { date: "2026-11-24", name: "Unduvap Full Moon Poya Day",              localName: "උඳුවප් පෝය දිනය",          type: "poya" },
    { date: "2026-12-25", name: "Christmas Day",                           localName: "නත්තල් දිනය",               type: "statutory" },
  ],
};

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

/* ── Sync Sri Lanka public holidays — external API with embedded fallback ── */
router.post("/sync-srilanka", async (req, res) => {
  try {
    const year = Number(req.body.year) || new Date().getFullYear();

    type RawHoliday = { date: string; name: string; localName: string; type: "statutory" | "poya" | "public" };
    let source: "api" | "builtin" = "api";
    let apiHolidays: RawHoliday[] = [];

    /* Try external API first */
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const resp = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/LK`, { signal: controller.signal });
      clearTimeout(timer);

      if (resp.ok) {
        const raw = await resp.json() as Array<{ date: string; name: string; localName: string; types: string[] }>;
        if (Array.isArray(raw) && raw.length > 0) {
          function classify(h: { name: string; types: string[] }): "statutory" | "poya" | "public" {
            const n = h.name.toLowerCase();
            if (n.includes("poya")) return "poya";
            const types = (h.types ?? []).map((t: string) => t.toLowerCase());
            if (types.includes("public") && (
              n.includes("independence") || n.includes("national") || n.includes("labour") ||
              n.includes("republic") || n.includes("victory") || n.includes("heroes") || n.includes("may day")
            )) return "statutory";
            return "public";
          }
          apiHolidays = raw.map(h => ({
            date: h.date,
            name: h.name,
            localName: h.localName || h.name,
            type: classify(h),
          }));
        }
      }
    } catch {
      /* API unreachable — fall through to built-in data */
    }

    /* Fall back to built-in data if API returned nothing */
    if (apiHolidays.length === 0) {
      const builtin = SL_HOLIDAYS[year];
      if (!builtin) {
        return res.status(404).json({
          message: `No built-in holiday data for ${year}. Please add holidays manually or use a year between 2025–2026.`,
          success: false,
        });
      }
      apiHolidays = builtin;
      source = "builtin";
    }

    /* Fetch existing dates for the year to avoid duplicates */
    const existingAll = await db.select({ date: holidays.date }).from(holidays);
    const existingDates = new Set(existingAll.filter(h => h.date.startsWith(String(year))).map(h => h.date));

    let inserted = 0;
    let skipped  = 0;

    for (const h of apiHolidays) {
      if (existingDates.has(h.date)) { skipped++; continue; }
      await db.insert(holidays).values({
        name: h.name,
        date: h.date,
        type: h.type,
        description: h.localName !== h.name ? h.localName : undefined,
      });
      inserted++;
    }

    res.json({ success: true, year, total: apiHolidays.length, inserted, skipped, source });
  } catch (e) {
    console.error("Sync error:", e);
    res.status(500).json({ message: "Failed to sync Sri Lanka holidays", success: false });
  }
});

export default router;
