import { Router } from "express";
import { db } from "@workspace/db";
import { hrSettings } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

async function getOrCreate() {
  const [existing] = await db.select().from(hrSettings);
  if (existing) return existing;
  const [created] = await db.insert(hrSettings).values({}).returning();
  return created;
}

function parse(s: typeof hrSettings.$inferSelect) {
  return {
    ...s,
    otExemptDesignations: JSON.parse(s.otExemptDesignations) as string[],
    incompleteExemptDepartments: JSON.parse(s.incompleteExemptDepartments) as string[],
    departmentRules: JSON.parse(s.departmentRules) as object[],
  };
}

router.get("/", async (_req, res) => {
  try {
    const row = await getOrCreate();
    res.json(parse(row));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to load HR settings" });
  }
});

router.put("/", async (req, res) => {
  try {
    const { otExemptDesignations, incompleteExemptDepartments, departmentRules, ...rest } = req.body;
    const existing = await getOrCreate();
    const [updated] = await db.update(hrSettings)
      .set({
        ...rest,
        otExemptDesignations: JSON.stringify(otExemptDesignations ?? []),
        incompleteExemptDepartments: JSON.stringify(incompleteExemptDepartments ?? []),
        departmentRules: JSON.stringify(departmentRules ?? []),
        updatedAt: new Date(),
      })
      .where(eq(hrSettings.id, existing.id))
      .returning();
    res.json(parse(updated));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to save HR settings" });
  }
});

export default router;
