import { Router } from "express";
import { db } from "@workspace/db";
import { salaryStructures, employeeSalaryAssignments, employees } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

function parseStructure(s: typeof salaryStructures.$inferSelect) {
  return {
    ...s,
    earnings: JSON.parse(s.earnings),
    deductions: JSON.parse(s.deductions),
    variablePay: JSON.parse(s.variablePay),
  };
}

/* GET /salary-structures */
router.get("/", async (_req, res) => {
  try {
    const rows = await db.select().from(salaryStructures).orderBy(salaryStructures.createdAt);
    res.json(rows.map(parseStructure));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to load salary structures" });
  }
});

/* POST /salary-structures */
router.post("/", async (req, res) => {
  try {
    const { name, currency = "LKR", earnings = [], deductions = [], variablePay = [] } = req.body;
    if (!name) return res.status(400).json({ message: "Name is required" });
    const [created] = await db.insert(salaryStructures).values({
      name,
      currency,
      earnings: JSON.stringify(earnings),
      deductions: JSON.stringify(deductions),
      variablePay: JSON.stringify(variablePay),
    }).returning();
    res.json(parseStructure(created));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to create salary structure" });
  }
});

/* GET /salary-structures/:id */
router.get("/:id", async (req, res) => {
  try {
    const [row] = await db.select().from(salaryStructures).where(eq(salaryStructures.id, parseInt(req.params.id)));
    if (!row) return res.status(404).json({ message: "Not found" });
    res.json(parseStructure(row));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to fetch salary structure" });
  }
});

/* PUT /salary-structures/:id */
router.put("/:id", async (req, res) => {
  try {
    const { name, currency, status, earnings, deductions, variablePay } = req.body;
    const [updated] = await db.update(salaryStructures)
      .set({
        ...(name !== undefined && { name }),
        ...(currency !== undefined && { currency }),
        ...(status !== undefined && { status }),
        ...(earnings !== undefined && { earnings: JSON.stringify(earnings) }),
        ...(deductions !== undefined && { deductions: JSON.stringify(deductions) }),
        ...(variablePay !== undefined && { variablePay: JSON.stringify(variablePay) }),
        updatedAt: new Date(),
      })
      .where(eq(salaryStructures.id, parseInt(req.params.id)))
      .returning();
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(parseStructure(updated));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to update salary structure" });
  }
});

/* DELETE /salary-structures/:id */
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(employeeSalaryAssignments).where(eq(employeeSalaryAssignments.salaryStructureId, id));
    await db.delete(salaryStructures).where(eq(salaryStructures.id, id));
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to delete salary structure" });
  }
});

/* GET /salary-structures/assignments/all */
router.get("/assignments/all", async (_req, res) => {
  try {
    const rows = await db.select({
      assignment: employeeSalaryAssignments,
      employee: {
        id: employees.id,
        employeeId: employees.employeeId,
        fullName: employees.fullName,
        designation: employees.designation,
        department: employees.department,
        status: employees.status,
      },
      structure: {
        id: salaryStructures.id,
        name: salaryStructures.name,
      },
    })
      .from(employeeSalaryAssignments)
      .innerJoin(employees, eq(employeeSalaryAssignments.employeeId, employees.id))
      .innerJoin(salaryStructures, eq(employeeSalaryAssignments.salaryStructureId, salaryStructures.id));
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to load assignments" });
  }
});

/* POST /salary-structures/assignments */
router.post("/assignments", async (req, res) => {
  try {
    const { employeeId, salaryStructureId, basicAmount, effectiveDate } = req.body;
    if (!employeeId || !salaryStructureId || !effectiveDate)
      return res.status(400).json({ message: "employeeId, salaryStructureId, effectiveDate required" });

    /* Upsert: delete existing assignment for this employee then insert */
    await db.delete(employeeSalaryAssignments).where(eq(employeeSalaryAssignments.employeeId, parseInt(employeeId)));
    const [created] = await db.insert(employeeSalaryAssignments).values({
      employeeId: parseInt(employeeId),
      salaryStructureId: parseInt(salaryStructureId),
      basicAmount: parseFloat(basicAmount) || 0,
      effectiveDate,
    }).returning();
    res.json(created);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to assign salary structure" });
  }
});

/* DELETE /salary-structures/assignments/:employeeId */
router.delete("/assignments/:employeeId", async (req, res) => {
  try {
    await db.delete(employeeSalaryAssignments)
      .where(eq(employeeSalaryAssignments.employeeId, parseInt(req.params.employeeId)));
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to remove assignment" });
  }
});

export default router;
