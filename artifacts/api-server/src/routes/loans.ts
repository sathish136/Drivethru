import { Router } from "express";
import { db } from "@workspace/db";
import { staffLoans } from "@workspace/db/schema";
import { employees } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";

const router = Router();

/* GET /loans — list all with employee info */
router.get("/", async (req, res) => {
  try {
    const { employeeId, status, type } = req.query as Record<string, string>;
    const rows = await db
      .select({
        id: staffLoans.id,
        type: staffLoans.type,
        totalAmount: staffLoans.totalAmount,
        monthlyInstallment: staffLoans.monthlyInstallment,
        startMonth: staffLoans.startMonth,
        startYear: staffLoans.startYear,
        paidAmount: staffLoans.paidAmount,
        remainingBalance: staffLoans.remainingBalance,
        status: staffLoans.status,
        description: staffLoans.description,
        createdAt: staffLoans.createdAt,
        employeeId: employees.id,
        employeeCode: employees.employeeId,
        employeeName: employees.fullName,
        designation: employees.designation,
        department: employees.department,
      })
      .from(staffLoans)
      .innerJoin(employees, eq(staffLoans.employeeId, employees.id))
      .orderBy(desc(staffLoans.createdAt));

    let result = rows;
    if (employeeId) result = result.filter(r => r.employeeId === Number(employeeId));
    if (status)     result = result.filter(r => r.status === status);
    if (type)       result = result.filter(r => r.type === type);

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch loans" });
  }
});

/* GET /loans/summary */
router.get("/summary", async (_req, res) => {
  try {
    const rows = await db.select().from(staffLoans).where(eq(staffLoans.status, "active"));
    const totalLoans    = rows.filter(r => r.type === "loan").length;
    const totalAdvances = rows.filter(r => r.type === "advance").length;
    const totalOutstanding = rows.reduce((s, r) => s + r.remainingBalance, 0);
    const totalMonthlyDeduction = rows.reduce((s, r) => s + r.monthlyInstallment, 0);
    res.json({ totalLoans, totalAdvances, totalOutstanding, totalMonthlyDeduction, activeCount: rows.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch summary" });
  }
});

/* POST /loans — create new loan/advance */
router.post("/", async (req, res) => {
  try {
    const { employeeId, type, totalAmount, monthlyInstallment, startMonth, startYear, description } = req.body;
    if (!employeeId || !totalAmount || !monthlyInstallment || !startMonth || !startYear) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const [loan] = await db.insert(staffLoans).values({
      employeeId: Number(employeeId),
      type: type || "loan",
      totalAmount: Number(totalAmount),
      monthlyInstallment: Number(monthlyInstallment),
      startMonth: Number(startMonth),
      startYear: Number(startYear),
      paidAmount: 0,
      remainingBalance: Number(totalAmount),
      status: "active",
      description: description || null,
    }).returning();
    res.status(201).json(loan);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create loan" });
  }
});

/* PUT /loans/:id */
router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { monthlyInstallment, status, description } = req.body;
    const updates: Partial<typeof staffLoans.$inferInsert> = { updatedAt: new Date() };
    if (monthlyInstallment !== undefined) updates.monthlyInstallment = Number(monthlyInstallment);
    if (status !== undefined)             updates.status = status;
    if (description !== undefined)        updates.description = description;
    const [updated] = await db.update(staffLoans).set(updates).where(eq(staffLoans.id, id)).returning();
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update loan" });
  }
});

/* DELETE /loans/:id */
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(staffLoans).where(eq(staffLoans.id, id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete loan" });
  }
});

export default router;
