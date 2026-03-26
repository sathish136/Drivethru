import { Router } from "express";
import { db } from "@workspace/db";
import { leaveBalances, employees, attendanceRecords } from "@workspace/db/schema";
import { eq, and, inArray } from "drizzle-orm";

const router = Router();

/* ── Get all leave balances for a given year ──────────────── */
router.get("/", async (req, res) => {
  try {
    const { year, branchId } = req.query as Record<string, string>;
    const y = year ? parseInt(year) : new Date().getFullYear();

    const allEmps = await db.select({
      id: employees.id,
      employeeId: employees.employeeId,
      fullName: employees.fullName,
      designation: employees.designation,
      department: employees.department,
      branchId: employees.branchId,
      status: employees.status,
    }).from(employees).where(eq(employees.status, "active"));

    const filteredEmps = branchId ? allEmps.filter(e => e.branchId === parseInt(branchId)) : allEmps;
    const empIds = filteredEmps.map(e => e.id);

    const balances = empIds.length
      ? await db.select().from(leaveBalances)
          .where(and(eq(leaveBalances.year, y), inArray(leaveBalances.employeeId, empIds)))
      : [];

    const balanceMap = new Map(balances.map(b => [b.employeeId, b]));

    const result = filteredEmps.map(emp => {
      const bal = balanceMap.get(emp.id);
      return {
        employeeId: emp.id,
        employeeCode: emp.employeeId,
        fullName: emp.fullName,
        designation: emp.designation,
        department: emp.department,
        branchId: emp.branchId,
        year: y,
        annualLeaveBalance: bal?.annualLeaveBalance ?? 0,
        casualLeaveBalance: bal?.casualLeaveBalance ?? 0,
        annualLeaveUsed: bal?.annualLeaveUsed ?? 0,
        casualLeaveUsed: bal?.casualLeaveUsed ?? 0,
        lastAccrualDate: bal?.lastAccrualDate ?? null,
        balanceId: bal?.id ?? null,
      };
    });

    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to fetch leave balances" });
  }
});

/* ── Accrue 1.5 days per week for all employees up to today ── */
router.post("/accrue", async (req, res) => {
  try {
    const { year } = req.body as { year?: number };
    const y = year ?? new Date().getFullYear();
    const todayStr = new Date().toISOString().split("T")[0];

    const allEmps = await db.select({ id: employees.id }).from(employees)
      .where(eq(employees.status, "active"));

    const empIds = allEmps.map(e => e.id);
    if (!empIds.length) return res.json({ message: "No active employees" });

    const existingBalances = await db.select().from(leaveBalances)
      .where(and(eq(leaveBalances.year, y), inArray(leaveBalances.employeeId, empIds)));
    const balanceMap = new Map(existingBalances.map(b => [b.employeeId, b]));

    let accrued = 0;
    const ACCRUAL_RATE = 1.5;

    for (const emp of allEmps) {
      const bal = balanceMap.get(emp.id);
      const lastAccrual = bal?.lastAccrualDate ?? `${y}-01-01`;
      const lastDate = new Date(lastAccrual);
      const todayDate = new Date(todayStr);

      const diffMs = todayDate.getTime() - lastDate.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const weeksElapsed = Math.floor(diffDays / 7);

      if (weeksElapsed <= 0) continue;

      const newDays = weeksElapsed * ACCRUAL_RATE;
      const newLastAccrual = new Date(lastDate.getTime() + weeksElapsed * 7 * 24 * 60 * 60 * 1000)
        .toISOString().split("T")[0];

      if (bal) {
        await db.update(leaveBalances).set({
          annualLeaveBalance: (bal.annualLeaveBalance ?? 0) + newDays,
          lastAccrualDate: newLastAccrual,
          updatedAt: new Date(),
        }).where(eq(leaveBalances.id, bal.id));
      } else {
        await db.insert(leaveBalances).values({
          employeeId: emp.id,
          year: y,
          annualLeaveBalance: newDays,
          casualLeaveBalance: 0,
          annualLeaveUsed: 0,
          casualLeaveUsed: 0,
          lastAccrualDate: newLastAccrual,
        });
      }
      accrued++;
    }

    res.json({ success: true, accrued, message: `Leave accrued for ${accrued} employees` });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to accrue leave" });
  }
});

/* ── Get leave balance for a single employee ──────────────── */
router.get("/employee/:id", async (req, res) => {
  try {
    const empId = parseInt(req.params.id);
    const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();

    const [bal] = await db.select().from(leaveBalances)
      .where(and(eq(leaveBalances.employeeId, empId), eq(leaveBalances.year, year)));

    res.json({
      employeeId: empId,
      year,
      annualLeaveBalance: bal?.annualLeaveBalance ?? 0,
      casualLeaveBalance: bal?.casualLeaveBalance ?? 0,
      annualLeaveUsed: bal?.annualLeaveUsed ?? 0,
      casualLeaveUsed: bal?.casualLeaveUsed ?? 0,
      annualRemaining: (bal?.annualLeaveBalance ?? 0) - (bal?.annualLeaveUsed ?? 0),
      casualRemaining: (bal?.casualLeaveBalance ?? 0) - (bal?.casualLeaveUsed ?? 0),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to fetch leave balance" });
  }
});

/* ── Manual override: set balance for an employee ─────────── */
router.put("/:employeeId", async (req, res) => {
  try {
    const empId = parseInt(req.params.employeeId);
    const { year, annualLeaveBalance, casualLeaveBalance, annualLeaveUsed, casualLeaveUsed } = req.body as {
      year: number;
      annualLeaveBalance?: number;
      casualLeaveBalance?: number;
      annualLeaveUsed?: number;
      casualLeaveUsed?: number;
    };

    const [existing] = await db.select().from(leaveBalances)
      .where(and(eq(leaveBalances.employeeId, empId), eq(leaveBalances.year, year)));

    if (existing) {
      const [updated] = await db.update(leaveBalances).set({
        annualLeaveBalance: annualLeaveBalance ?? existing.annualLeaveBalance,
        casualLeaveBalance: casualLeaveBalance ?? existing.casualLeaveBalance,
        annualLeaveUsed: annualLeaveUsed ?? existing.annualLeaveUsed,
        casualLeaveUsed: casualLeaveUsed ?? existing.casualLeaveUsed,
        updatedAt: new Date(),
      }).where(eq(leaveBalances.id, existing.id)).returning();
      res.json(updated);
    } else {
      const [created] = await db.insert(leaveBalances).values({
        employeeId: empId,
        year,
        annualLeaveBalance: annualLeaveBalance ?? 0,
        casualLeaveBalance: casualLeaveBalance ?? 0,
        annualLeaveUsed: annualLeaveUsed ?? 0,
        casualLeaveUsed: casualLeaveUsed ?? 0,
      }).returning();
      res.json(created);
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to update leave balance" });
  }
});

/* ── Sync used leave from attendance records ──────────────── */
router.post("/sync-used", async (req, res) => {
  try {
    const { year } = req.body as { year?: number };
    const y = year ?? new Date().getFullYear();
    const prefix = `${y}-`;

    const allEmps = await db.select({ id: employees.id }).from(employees)
      .where(eq(employees.status, "active"));

    const allAtt = await db.select({
      employeeId: attendanceRecords.employeeId,
      status: attendanceRecords.status,
      leaveType: attendanceRecords.leaveType,
      date: attendanceRecords.date,
    }).from(attendanceRecords);

    const yearAtt = allAtt.filter(a => a.date.startsWith(prefix) && a.status === "leave");

    let synced = 0;
    for (const emp of allEmps) {
      const empLeaves = yearAtt.filter(a => a.employeeId === emp.id);
      const annualUsed = empLeaves.filter(a => a.leaveType === "annual").length;
      const casualUsed = empLeaves.filter(a => a.leaveType === "casual").length;

      const [existing] = await db.select().from(leaveBalances)
        .where(and(eq(leaveBalances.employeeId, emp.id), eq(leaveBalances.year, y)));

      if (existing) {
        await db.update(leaveBalances).set({
          annualLeaveUsed: annualUsed,
          casualLeaveUsed: casualUsed,
          updatedAt: new Date(),
        }).where(eq(leaveBalances.id, existing.id));
      } else {
        await db.insert(leaveBalances).values({
          employeeId: emp.id,
          year: y,
          annualLeaveBalance: 0,
          casualLeaveBalance: 0,
          annualLeaveUsed: annualUsed,
          casualLeaveUsed: casualUsed,
        });
      }
      synced++;
    }

    res.json({ success: true, synced, message: `Leave usage synced for ${synced} employees` });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to sync leave usage" });
  }
});

export default router;
