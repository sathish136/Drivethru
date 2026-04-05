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
      const leaveBalance = bal?.annualLeaveBalance ?? 21;
      const leaveUsed = bal?.annualLeaveUsed ?? 0;
      return {
        employeeId: emp.id,
        employeeCode: emp.employeeId,
        fullName: emp.fullName,
        designation: emp.designation,
        department: emp.department,
        branchId: emp.branchId,
        year: y,
        leaveBalance,
        leaveUsed,
        leaveRemaining: leaveBalance - leaveUsed,
        annualLeaveBalance: leaveBalance,
        casualLeaveBalance: 0,
        annualLeaveUsed: leaveUsed,
        casualLeaveUsed: 0,
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

/* ── Get leave balance for a single employee ──────────────── */
router.get("/employee/:id", async (req, res) => {
  try {
    const empId = parseInt(req.params.id);
    const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();

    const [bal] = await db.select().from(leaveBalances)
      .where(and(eq(leaveBalances.employeeId, empId), eq(leaveBalances.year, year)));

    const leaveBalance = bal?.annualLeaveBalance ?? 21;
    const leaveUsed = bal?.annualLeaveUsed ?? 0;
    const leaveRemaining = leaveBalance - leaveUsed;

    res.json({
      employeeId: empId,
      year,
      leaveBalance,
      leaveUsed,
      leaveRemaining,
      annualLeaveBalance: leaveBalance,
      casualLeaveBalance: 0,
      annualLeaveUsed: leaveUsed,
      casualLeaveUsed: 0,
      annualRemaining: leaveRemaining,
      casualRemaining: 0,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to fetch leave balance" });
  }
});

/* ── Manual override: set leave balance for an employee ───── */
router.put("/:employeeId", async (req, res) => {
  try {
    const empId = parseInt(req.params.employeeId);
    const { year, leaveBalance, leaveUsed, annualLeaveBalance, annualLeaveUsed } = req.body as {
      year: number;
      leaveBalance?: number;
      leaveUsed?: number;
      annualLeaveBalance?: number;
      annualLeaveUsed?: number;
    };

    const newBalance = leaveBalance ?? annualLeaveBalance;
    const newUsed = leaveUsed ?? annualLeaveUsed;

    const [existing] = await db.select().from(leaveBalances)
      .where(and(eq(leaveBalances.employeeId, empId), eq(leaveBalances.year, year)));

    if (existing) {
      const [updated] = await db.update(leaveBalances).set({
        annualLeaveBalance: newBalance ?? existing.annualLeaveBalance,
        casualLeaveBalance: 0,
        annualLeaveUsed: newUsed ?? existing.annualLeaveUsed,
        casualLeaveUsed: 0,
        updatedAt: new Date(),
      }).where(eq(leaveBalances.id, existing.id)).returning();
      res.json({ ...updated, id: updated.id, employeeId: empId });
    } else {
      const [created] = await db.insert(leaveBalances).values({
        employeeId: empId,
        year,
        annualLeaveBalance: newBalance ?? 21,
        casualLeaveBalance: 0,
        annualLeaveUsed: newUsed ?? 0,
        casualLeaveUsed: 0,
      }).returning();
      res.json({ ...created, employeeId: empId });
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
      const totalUsed = empLeaves.length;

      const [existing] = await db.select().from(leaveBalances)
        .where(and(eq(leaveBalances.employeeId, emp.id), eq(leaveBalances.year, y)));

      if (existing) {
        await db.update(leaveBalances).set({
          annualLeaveUsed: totalUsed,
          casualLeaveUsed: 0,
          updatedAt: new Date(),
        }).where(eq(leaveBalances.id, existing.id));
      } else {
        await db.insert(leaveBalances).values({
          employeeId: emp.id,
          year: y,
          annualLeaveBalance: 21,
          casualLeaveBalance: 0,
          annualLeaveUsed: totalUsed,
          casualLeaveUsed: 0,
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

/* ── Bulk set leave balances (from Excel import) ─────────── */
router.post("/bulk-set", async (req, res) => {
  try {
    const { year, records: inputRecords } = req.body as {
      year: number;
      records: Array<{ employeeCode: string; leaveBalance: number; leaveUsed: number }>;
    };

    const allEmps = await db.select({ id: employees.id, employeeId: employees.employeeId })
      .from(employees);
    const empMap = new Map(allEmps.map(e => [e.employeeId, e.id]));

    let updated = 0;
    for (const rec of inputRecords) {
      const empId = empMap.get(rec.employeeCode);
      if (!empId) continue;

      const [existing] = await db.select().from(leaveBalances)
        .where(and(eq(leaveBalances.employeeId, empId), eq(leaveBalances.year, year)));

      if (existing) {
        await db.update(leaveBalances).set({
          annualLeaveBalance: rec.leaveBalance,
          casualLeaveBalance: 0,
          annualLeaveUsed: rec.leaveUsed,
          casualLeaveUsed: 0,
          updatedAt: new Date(),
        }).where(eq(leaveBalances.id, existing.id));
      } else {
        await db.insert(leaveBalances).values({
          employeeId: empId,
          year,
          annualLeaveBalance: rec.leaveBalance,
          casualLeaveBalance: 0,
          annualLeaveUsed: rec.leaveUsed,
          casualLeaveUsed: 0,
        });
      }
      updated++;
    }

    res.json({ success: true, updated, message: `Balances set for ${updated} employees` });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to bulk-set leave balances" });
  }
});

export default router;
