import { Router } from "express";
import { db } from "@workspace/db";
import { staffIncentives, employees, attendanceRecords, payrollSettings, payrollRecords } from "@workspace/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";

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

/* POST /incentives/bulk-approve — approve multiple incentives at once */
router.post("/bulk-approve", async (req, res) => {
  try {
    const { ids } = req.body as { ids: number[] };
    if (!ids || ids.length === 0) return res.status(400).json({ error: "No IDs provided" });
    await db.update(staffIncentives)
      .set({ status: "approved", updatedAt: new Date() })
      .where(and(inArray(staffIncentives.id, ids), eq(staffIncentives.status, "pending")));
    res.json({ success: true, approved: ids.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to bulk approve" });
  }
});

/* POST /incentives/generate-lunch — auto-generate lunch incentives from attendance */
router.post("/generate-lunch", async (req, res) => {
  try {
    const { month, year } = req.body;
    if (!month || !year) return res.status(400).json({ error: "month and year are required" });

    const m = Number(month);
    const y = Number(year);
    const datePrefix = `${y}-${String(m).padStart(2, "0")}`;

    /* Payroll settings for per-day rate */
    const [ps] = await db.select().from(payrollSettings);
    const lunchPerDay = ps?.lunchIncentivePerDay ?? 125;

    /* All active employees */
    const allEmps = await db.select({
      id: employees.id,
    }).from(employees).where(eq(employees.status, "active"));
    const empIds = allEmps.map(e => e.id);

    if (empIds.length === 0) return res.json({ created: 0, skipped: 0 });

    /* Attendance for the month */
    const att = await db.select().from(attendanceRecords)
      .where(inArray(attendanceRecords.employeeId, empIds));
    const monthAtt = att.filter(a => a.date.startsWith(datePrefix));

    /* Group by employee */
    const attByEmp = new Map<number, typeof monthAtt>();
    for (const a of monthAtt) {
      if (!attByEmp.has(a.employeeId)) attByEmp.set(a.employeeId, []);
      attByEmp.get(a.employeeId)!.push(a);
    }

    /* Delete existing auto-generated lunch incentives for this period */
    await db.delete(staffIncentives).where(
      and(
        eq(staffIncentives.month, m),
        eq(staffIncentives.year, y),
        eq(staffIncentives.type, "lunch"),
        inArray(staffIncentives.employeeId, empIds)
      )
    );

    /* Build new records */
    const toInsert: Array<typeof staffIncentives.$inferInsert> = [];
    for (const emp of allEmps) {
      const recs = attByEmp.get(emp.id) ?? [];
      const eligibleDays = recs.filter(a =>
        a.status === "present" || a.status === "late" ||
        a.status === "half_day" ||
        /* single punch: inTime1 exists but no outTime1, and not holiday/leave/off */
        (a.inTime1 && !a.outTime1 && a.status !== "holiday" && a.status !== "leave" && a.status !== "off_day")
      ).length;

      if (eligibleDays === 0) continue;

      toInsert.push({
        employeeId: emp.id,
        month: m,
        year: y,
        type: "lunch",
        amount: Math.round(lunchPerDay * eligibleDays),
        reason: `Auto: ${eligibleDays} day(s) × Rs.${lunchPerDay} — ${datePrefix}`,
        status: "pending",
        notes: null,
      });
    }

    if (toInsert.length > 0) {
      await db.insert(staffIncentives).values(toInsert);
    }

    res.json({ created: toInsert.length, ratePerDay: lunchPerDay, month: m, year: y });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate lunch incentives" });
  }
});

/* DELETE /incentives/:id */
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [inc] = await db.select().from(staffIncentives).where(eq(staffIncentives.id, id));
    if (!inc) return res.status(404).json({ error: "Incentive not found" });
    if (inc.payrollLinked) {
      return res.status(409).json({ error: "This incentive is linked to a generated payroll and cannot be deleted." });
    }
    await db.delete(staffIncentives).where(eq(staffIncentives.id, id));
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete incentive" });
  }
});

export default router;
