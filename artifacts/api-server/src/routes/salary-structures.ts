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

/* GET /salary-structures/assignment/:employeeId  — single employee */
router.get("/assignment/:employeeId", async (req, res) => {
  try {
    const empId = parseInt(req.params.employeeId);
    const rows = await db
      .select({
        assignment: employeeSalaryAssignments,
        structure: salaryStructures,
      })
      .from(employeeSalaryAssignments)
      .innerJoin(salaryStructures, eq(employeeSalaryAssignments.salaryStructureId, salaryStructures.id))
      .where(eq(employeeSalaryAssignments.employeeId, empId))
      .limit(1);

    if (!rows.length) return res.status(404).json({ error: "No salary structure assigned" });

    const { assignment, structure } = rows[0];
    const earnings   = JSON.parse(structure.earnings)   as any[];
    const deductions = JSON.parse(structure.deductions) as any[];

    // Map earnings components to named salary fields
    let transportAllowance = 0;
    let lunchAllowance     = 0;
    let housingAllowance   = 0;
    let otherAllowances    = 0;

    for (const e of earnings) {
      const name = (e.component ?? e.name ?? "").toLowerCase();
      if (name === "basic") continue; // handled via basicAmount
      if      (name.includes("transport") || name.includes("travel")) transportAllowance += Number(e.amount) || 0;
      else if (name.includes("lunch")     || name.includes("incentive")) lunchAllowance   += Number(e.amount) || 0;
      else if (name.includes("housing")   || name.includes("rent"))    housingAllowance   += Number(e.amount) || 0;
      else                                                               otherAllowances   += Number(e.amount) || 0;
    }

    res.json({
      structureId:   structure.id,
      structureName: structure.name,
      basicAmount:   assignment.basicAmount,
      transportAllowance,
      lunchAllowance,
      housingAllowance,
      otherAllowances,
      earnings,
      deductions,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to fetch assignment" });
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
        designation: employees.department,
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

/* PUT /salary-structures/employee/:employeeId — upsert per-employee structure inline */
router.put("/employee/:employeeId", async (req, res) => {
  try {
    const empId = parseInt(req.params.employeeId);
    const { basicAmount = 0, effectiveDate, earnings = [], deductions = [] } = req.body;
    if (!effectiveDate) return res.status(400).json({ message: "effectiveDate is required" });

    const [emp] = await db.select({ id: employees.id, employeeId: employees.employeeId, fullName: employees.fullName })
      .from(employees).where(eq(employees.id, empId));
    if (!emp) return res.status(404).json({ message: "Employee not found" });

    const STATUTORY = [
      { component: "EPF – Employee", abbr: "EPF_EE", amount: 0, dependsOn: "basic", isTaxApplicable: false, amountBasedOn: "Basic Salary", formula: "basic * 0.08" },
      { component: "EPF – Employer", abbr: "EPF_ER", amount: 0, dependsOn: "basic", isTaxApplicable: false, amountBasedOn: "Basic Salary", formula: "basic * 0.12" },
      { component: "ETF",            abbr: "ETF",    amount: 0, dependsOn: "basic", isTaxApplicable: false, amountBasedOn: "Basic Salary", formula: "basic * 0.03" },
    ];
    const STAT_NAMES = STATUTORY.map(s => s.component);

    const hasBasic = earnings.some((e: any) => (e.component || "").toLowerCase() === "basic");
    const fullEarnings = hasBasic
      ? earnings
      : [{ component: "Basic", abbr: "BA", amount: parseFloat(basicAmount) || 0, dependsOn: "", isTaxApplicable: false, amountBasedOn: "Basic Salary", formula: "" }, ...earnings];

    const customDeds = deductions.filter((d: any) => !STAT_NAMES.includes(d.component));
    const fullDeductions = [...STATUTORY, ...customDeds];

    const [existing] = await db.select().from(employeeSalaryAssignments)
      .where(eq(employeeSalaryAssignments.employeeId, empId));

    if (existing) {
      await db.update(salaryStructures).set({
        earnings: JSON.stringify(fullEarnings),
        deductions: JSON.stringify(fullDeductions),
        updatedAt: new Date(),
      }).where(eq(salaryStructures.id, existing.salaryStructureId));
      await db.update(employeeSalaryAssignments).set({
        basicAmount: parseFloat(basicAmount) || 0,
        effectiveDate,
        updatedAt: new Date(),
      }).where(eq(employeeSalaryAssignments.id, existing.id));
      res.json({ success: true, structureId: existing.salaryStructureId });
    } else {
      const [newStruct] = await db.insert(salaryStructures).values({
        name: `${emp.employeeId} – ${emp.fullName}`,
        currency: "LKR",
        status: "active",
        earnings: JSON.stringify(fullEarnings),
        deductions: JSON.stringify(fullDeductions),
        variablePay: "[]",
      }).returning();
      await db.insert(employeeSalaryAssignments).values({
        employeeId: empId,
        salaryStructureId: newStruct.id,
        basicAmount: parseFloat(basicAmount) || 0,
        effectiveDate,
      });
      res.json({ success: true, structureId: newStruct.id });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to save employee salary structure" });
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
