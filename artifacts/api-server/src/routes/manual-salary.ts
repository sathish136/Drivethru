import { Router } from "express";
import { db } from "@workspace/db";
import { manualSalaryEntries, employees, attendanceRecords } from "@workspace/db/schema";
import { eq, and, desc, gte, lte } from "drizzle-orm";

const router = Router();

/* GET /manual-salary/attendance-lookup?employeeId=&month=&year= */
router.get("/attendance-lookup", async (req, res) => {
  try {
    const { employeeId, month, year } = req.query as Record<string, string>;
    if (!employeeId || !month || !year) {
      return res.status(400).json({ error: "employeeId, month and year are required" });
    }

    const m = Number(month);
    const y = Number(year);
    const daysInMonth = new Date(y, m, 0).getDate();
    const firstDay = `${y}-${String(m).padStart(2, "0")}-01`;
    const lastDay  = `${y}-${String(m).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

    const recs = await db
      .select({
        status: attendanceRecords.status,
        overtimeHours: attendanceRecords.overtimeHours,
      })
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.employeeId, Number(employeeId)),
          gte(attendanceRecords.date, firstDay),
          lte(attendanceRecords.date, lastDay),
        )
      );

    let presentDays = 0;
    let absentDays  = 0;
    let otHours     = 0;

    for (const r of recs) {
      if (r.status === "present" || r.status === "late") presentDays += 1;
      else if (r.status === "half_day")                  presentDays += 0.5;
      else if (r.status === "absent")                    absentDays  += 1;
      otHours += r.overtimeHours ?? 0;
    }

    res.json({ presentDays, absentDays, otHours: Math.round(otHours * 100) / 100 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch attendance summary" });
  }
});

/* GET /manual-salary */
router.get("/", async (req, res) => {
  try {
    const { month, year, employeeId, status } = req.query as Record<string, string>;

    const rows = await db
      .select({
        id: manualSalaryEntries.id,
        month: manualSalaryEntries.month,
        year: manualSalaryEntries.year,
        presentDays: manualSalaryEntries.presentDays,
        absentDays: manualSalaryEntries.absentDays,
        otHours: manualSalaryEntries.otHours,
        otAmount: manualSalaryEntries.otAmount,
        basicSalary: manualSalaryEntries.basicSalary,
        transportAllowance: manualSalaryEntries.transportAllowance,
        lunchAllowance: manualSalaryEntries.lunchAllowance,
        housingAllowance: manualSalaryEntries.housingAllowance,
        otherAllowances: manualSalaryEntries.otherAllowances,
        epfDeduction: manualSalaryEntries.epfDeduction,
        loanDeduction: manualSalaryEntries.loanDeduction,
        absenceDeduction: manualSalaryEntries.absenceDeduction,
        otherDeductions: manualSalaryEntries.otherDeductions,
        grossSalary: manualSalaryEntries.grossSalary,
        netSalary: manualSalaryEntries.netSalary,
        status: manualSalaryEntries.status,
        notes: manualSalaryEntries.notes,
        createdAt: manualSalaryEntries.createdAt,
        updatedAt: manualSalaryEntries.updatedAt,
        employeeId: employees.id,
        employeeCode: employees.employeeId,
        employeeName: employees.fullName,
        designation: employees.department,
        department: employees.department,
        branchId: manualSalaryEntries.branchId,
      })
      .from(manualSalaryEntries)
      .innerJoin(employees, eq(manualSalaryEntries.employeeId, employees.id))
      .orderBy(desc(manualSalaryEntries.createdAt));

    let result = rows;
    if (month)      result = result.filter(r => r.month === Number(month));
    if (year)       result = result.filter(r => r.year  === Number(year));
    if (employeeId) result = result.filter(r => r.employeeId === Number(employeeId));
    if (status)     result = result.filter(r => r.status === status);

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch manual salary entries" });
  }
});

/* POST /manual-salary */
router.post("/", async (req, res) => {
  try {
    const body = req.body;
    const emp = await db.select().from(employees).where(eq(employees.id, Number(body.employeeId))).limit(1);
    if (!emp.length) return res.status(404).json({ error: "Employee not found" });

    const gross =
      Number(body.basicSalary || 0) +
      Number(body.transportAllowance || 0) +
      Number(body.lunchAllowance || 0) +
      Number(body.housingAllowance || 0) +
      Number(body.otherAllowances || 0) +
      Number(body.otAmount || 0);

    const totalDed =
      Number(body.epfDeduction || 0) +
      Number(body.loanDeduction || 0) +
      Number(body.absenceDeduction || 0) +
      Number(body.otherDeductions || 0);

    const net = gross - totalDed;

    const [row] = await db.insert(manualSalaryEntries).values({
      employeeId:         Number(body.employeeId),
      branchId:           Number(emp[0].branchId),
      month:              Number(body.month),
      year:               Number(body.year),
      presentDays:        Number(body.presentDays || 0),
      absentDays:         Number(body.absentDays || 0),
      otHours:            Number(body.otHours || 0),
      otAmount:           Number(body.otAmount || 0),
      basicSalary:        Number(body.basicSalary || 0),
      transportAllowance: Number(body.transportAllowance || 0),
      lunchAllowance:     Number(body.lunchAllowance || 0),
      housingAllowance:   Number(body.housingAllowance || 0),
      otherAllowances:    Number(body.otherAllowances || 0),
      epfDeduction:       Number(body.epfDeduction || 0),
      loanDeduction:      Number(body.loanDeduction || 0),
      absenceDeduction:   Number(body.absenceDeduction || 0),
      otherDeductions:    Number(body.otherDeductions || 0),
      grossSalary:        gross,
      netSalary:          net,
      status:             body.status || "draft",
      notes:              body.notes || null,
    }).returning();

    res.status(201).json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create manual salary entry" });
  }
});

/* PUT /manual-salary/:id */
router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const body = req.body;

    const gross =
      Number(body.basicSalary || 0) +
      Number(body.transportAllowance || 0) +
      Number(body.lunchAllowance || 0) +
      Number(body.housingAllowance || 0) +
      Number(body.otherAllowances || 0) +
      Number(body.otAmount || 0);

    const totalDed =
      Number(body.epfDeduction || 0) +
      Number(body.loanDeduction || 0) +
      Number(body.absenceDeduction || 0) +
      Number(body.otherDeductions || 0);

    const net = gross - totalDed;

    const [row] = await db
      .update(manualSalaryEntries)
      .set({
        month:              Number(body.month),
        year:               Number(body.year),
        presentDays:        Number(body.presentDays || 0),
        absentDays:         Number(body.absentDays || 0),
        otHours:            Number(body.otHours || 0),
        otAmount:           Number(body.otAmount || 0),
        basicSalary:        Number(body.basicSalary || 0),
        transportAllowance: Number(body.transportAllowance || 0),
        lunchAllowance:     Number(body.lunchAllowance || 0),
        housingAllowance:   Number(body.housingAllowance || 0),
        otherAllowances:    Number(body.otherAllowances || 0),
        epfDeduction:       Number(body.epfDeduction || 0),
        loanDeduction:      Number(body.loanDeduction || 0),
        absenceDeduction:   Number(body.absenceDeduction || 0),
        otherDeductions:    Number(body.otherDeductions || 0),
        grossSalary:        gross,
        netSalary:          net,
        status:             body.status || "draft",
        notes:              body.notes || null,
        updatedAt:          new Date(),
      })
      .where(eq(manualSalaryEntries.id, id))
      .returning();

    if (!row) return res.status(404).json({ error: "Entry not found" });
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update manual salary entry" });
  }
});

/* DELETE /manual-salary/:id */
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(manualSalaryEntries).where(eq(manualSalaryEntries.id, id));
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete manual salary entry" });
  }
});

/* PATCH /manual-salary/:id/status */
router.patch("/:id/status", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;
    const [row] = await db
      .update(manualSalaryEntries)
      .set({ status, updatedAt: new Date() })
      .where(eq(manualSalaryEntries.id, id))
      .returning();
    if (!row) return res.status(404).json({ error: "Entry not found" });
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update status" });
  }
});

export default router;
