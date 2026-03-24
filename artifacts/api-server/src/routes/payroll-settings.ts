import { Router } from "express";
import { db } from "@workspace/db";
import { payrollSettings } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

async function getOrCreate() {
  const [existing] = await db.select().from(payrollSettings);
  if (existing) return existing;
  const [created] = await db.insert(payrollSettings).values({}).returning();
  return created;
}

function parseSettings(s: typeof payrollSettings.$inferSelect) {
  return {
    ...s,
    salaryScale: JSON.parse(s.salaryScale) as Record<string, number>,
    employeeOverrides: JSON.parse(s.employeeOverrides) as Record<string, number>,
  };
}

router.get("/", async (_req, res) => {
  try {
    const settings = await getOrCreate();
    res.json(parseSettings(settings));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to load payroll settings" });
  }
});

router.put("/", async (req, res) => {
  try {
    const { salaryScale, employeeOverrides, ...rest } = req.body;
    const existing = await getOrCreate();
    const [updated] = await db.update(payrollSettings)
      .set({
        ...rest,
        salaryScale: JSON.stringify(salaryScale ?? {}),
        employeeOverrides: JSON.stringify(employeeOverrides ?? {}),
        updatedAt: new Date(),
      })
      .where(eq(payrollSettings.id, existing.id))
      .returning();
    res.json(parseSettings(updated));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to save payroll settings" });
  }
});

export default router;
