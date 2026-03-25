import { Router } from "express";
import { db } from "@workspace/db";
import { staffIncentives, employees } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";

const router = Router();

/* GET /incentives — list all with employee info */
router.get("/", async (req, res) => {
  try {
    const { employeeId, month, year, type, status } = req.query as Record<string, string>;

    const rows = await db
      .select({
        id: staffIncentives.id,
        month: staffIncentives.month,
        year: staffIncentives.year,
        type: staffIncentives.type,
        amount: staffIncentives.amount,
        reason: staffIncentives.reason,
        status: staffIncentives.status,
        notes: staffIncentives.notes,
        createdAt: staffIncentives.createdAt,
        updatedAt: staffIncentives.updatedAt,
        employeeId: employees.id,
        employeeCode: employees.employeeId,
        employeeName: employees.fullName,
        designation: employees.designation,
        department: employees.department,
        branchId: employees.branchId,
      })
      .from(staffIncentives)
      .innerJoin(employees, eq(staffIncentives.employeeId, employees.id))
      .orderBy(desc(staffIncentives.createdAt));

    let result = rows;
    if (employeeId) result = result.filter(r => r.employeeId === Number(employeeId));
    if (month)      result = result.filter(r => r.month === Number(month));
    if (year)       result = result.filter(r => r.year === Number(year));
    if (type)       result = result.filter(r => r.type === type);
    if (status)     result = result.filter(r => r.status === status);

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch incentives" });
  }
});

/* GET /incentives/summary */
router.get("/summary", async (req, res) => {
  try {
    const { month, year } = req.query as Record<string, string>;

    let rows = await db.select().from(staffIncentives);
    if (month) rows = rows.filter(r => r.month === Number(month));
    if (year)  rows = rows.filter(r => r.year === Number(year));

    const totalCount       = rows.length;
    const totalAmount      = rows.reduce((s, r) => s + r.amount, 0);
    const pendingCount     = rows.filter(r => r.status === "pending").length;
    const approvedCount    = rows.filter(r => r.status === "approved").length;
    const paidCount        = rows.filter(r => r.status === "paid").length;
    const pendingAmount    = rows.filter(r => r.status === "pending").reduce((s, r) => s + r.amount, 0);
    const approvedAmount   = rows.filter(r => r.status === "approved").reduce((s, r) => s + r.amount, 0);
    const paidAmount       = rows.filter(r => r.status === "paid").reduce((s, r) => s + r.amount, 0);

    const byType: Record<string, number> = {};
    for (const r of rows) {
      byType[r.type] = (byType[r.type] || 0) + r.amount;
    }

    res.json({
      totalCount, totalAmount,
      pendingCount, approvedCount, paidCount,
      pendingAmount, approvedAmount, paidAmount,
      byType,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch incentive summary" });
  }
});

/* POST /incentives — create new incentive */
router.post("/", async (req, res) => {
  try {
    const { employeeId, month, year, type, amount, reason, status, notes } = req.body;
    if (!employeeId || !month || !year || !amount) {
      return res.status(400).json({ error: "Missing required fields: employeeId, month, year, amount" });
    }
    const [incentive] = await db.insert(staffIncentives).values({
      employeeId: Number(employeeId),
      month: Number(month),
      year: Number(year),
      type: type || "other",
      amount: Number(amount),
      reason: reason || null,
      status: status || "pending",
      notes: notes || null,
    }).returning();
    res.status(201).json(incentive);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create incentive" });
  }
});

/* PUT /incentives/:id */
router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { type, amount, reason, status, notes } = req.body;
    const updates: Partial<typeof staffIncentives.$inferInsert> = { updatedAt: new Date() };
    if (type   !== undefined) updates.type   = type;
    if (amount !== undefined) updates.amount = Number(amount);
    if (reason !== undefined) updates.reason = reason;
    if (status !== undefined) updates.status = status;
    if (notes  !== undefined) updates.notes  = notes;

    const [updated] = await db
      .update(staffIncentives)
      .set(updates)
      .where(eq(staffIncentives.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Incentive not found" });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update incentive" });
  }
});

/* DELETE /incentives/:id */
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(staffIncentives).where(eq(staffIncentives.id, id));
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete incentive" });
  }
});

export default router;
