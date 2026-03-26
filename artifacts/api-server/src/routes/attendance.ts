import { Router } from "express";
import { db } from "@workspace/db";
import { attendanceRecords, employees, branches, shifts, leaveBalances } from "@workspace/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { calcWorkHours, getDaysInMonth, today } from "../lib/helpers.js";
import { loadDeptRules, findRule, timeToMins } from "../lib/hr-rules.js";

const router = Router();

async function enrichRecord(r: typeof attendanceRecords.$inferSelect) {
  const [emp] = await db.select({ name: employees.fullName, code: employees.employeeId })
    .from(employees).where(eq(employees.id, r.employeeId));
  const [br] = await db.select({ name: branches.name }).from(branches).where(eq(branches.id, r.branchId));
  return {
    ...r,
    employeeName: emp?.name || "Unknown",
    employeeCode: emp?.code || "",
    branchName: br?.name || "",
    shiftName: null,
    date: r.date,
    createdAt: r.createdAt.toISOString(),
  };
}

router.get("/today", async (req, res) => {
  try {
    const todayStr = today();
    const branchId = req.query.branchId ? Number(req.query.branchId) : null;

    const allEmp = await db.select({
      emp: employees,
      branchName: branches.name,
    }).from(employees).leftJoin(branches, eq(employees.branchId, branches.id))
      .where(eq(employees.status, "active"));

    const filtered = branchId ? allEmp.filter(r => r.emp.branchId === branchId) : allEmp;

    const records = await db.select().from(attendanceRecords)
      .where(eq(attendanceRecords.date, todayStr));
    const recordMap = new Map(records.map(r => [r.employeeId, r]));

    const mappedRecords = filtered.map(({ emp, branchName }) => {
      const rec = recordMap.get(emp.id);
      return rec ? {
        ...rec,
        employeeName: emp.fullName,
        employeeCode: emp.employeeId,
        branchName: branchName || "",
        shiftName: null,
        createdAt: rec.createdAt.toISOString(),
      } : {
        id: -emp.id,
        employeeId: emp.id,
        employeeName: emp.fullName,
        employeeCode: emp.employeeId,
        branchId: emp.branchId,
        branchName: branchName || "",
        date: todayStr,
        status: "absent",
        inTime1: null, outTime1: null, workHours1: null,
        inTime2: null, outTime2: null, workHours2: null,
        totalHours: null, overtimeHours: null,
        shiftName: null, source: "system", remarks: null,
        approvalStatus: null, approvedBy: null, approvalNote: null,
        leaveType: null,
        createdAt: new Date().toISOString(),
      };
    });

    const present = mappedRecords.filter(r => r.status === "present").length;
    const absent = mappedRecords.filter(r => r.status === "absent").length;
    const late = mappedRecords.filter(r => r.status === "late").length;
    const halfDay = mappedRecords.filter(r => r.status === "half_day").length;
    const onLeave = mappedRecords.filter(r => r.status === "leave").length;

    res.json({
      date: todayStr,
      totalEmployees: filtered.length,
      present, absent, late, halfDay, onLeave,
      notMarked: absent,
      records: mappedRecords,
    });
  } catch (e) { console.error(e); res.status(500).json({ message: "Error", success: false }); }
});

router.get("/monthly-sheet", async (req, res) => {
  try {
    const { month, year, branchId } = req.query;
    const m = Number(month);
    const y = Number(year);
    const daysInMonth = getDaysInMonth(m, y);
    const startDate = `${y}-${String(m).padStart(2, "0")}-01`;
    const endDate = `${y}-${String(m).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

    const allEmp = await db.select({
      emp: employees,
      branchName: branches.name,
    }).from(employees).leftJoin(branches, eq(employees.branchId, branches.id))
      .where(eq(employees.status, "active"));

    const filtered = branchId ? allEmp.filter(r => r.emp.branchId === Number(branchId)) : allEmp;

    const records = await db.select().from(attendanceRecords)
      .where(and(gte(attendanceRecords.date, startDate), lte(attendanceRecords.date, endDate)));

    const empRecords = new Map<number, Map<number, typeof records[0]>>();
    for (const r of records) {
      if (!empRecords.has(r.employeeId)) empRecords.set(r.employeeId, new Map());
      const day = parseInt(r.date.split("-")[2]);
      empRecords.get(r.employeeId)!.set(day, r);
    }

    const allShifts = await db.select().from(shifts);
    const shiftMap = new Map(allShifts.map(s => [s.id, s]));
    const hrRules = await loadDeptRules();

    function calcEffectiveStatus(rec: typeof records[0], empShift: typeof allShifts[0] | undefined, department: string | null) {
      const rule = findRule(hrRules, department || "", empShift?.name);
      let status = rec.status;

      if (status === "present" && rec.inTime1) {
        const shiftStartMins = empShift?.startTime1 ? timeToMins(empShift.startTime1) : 8 * 60;
        const graceMinutes = rule.lateGraceMinutes ?? (empShift?.graceMinutes ?? 15);
        const cutoffMins = shiftStartMins + graceMinutes;
        if (timeToMins(rec.inTime1) > cutoffMins) status = "late";
      }

      if ((status === "present" || status === "late") && rec.totalHours != null) {
        const halfDayHrs = rule.halfDayHours ?? 5;
        const minPresentHrs = rule.minPresentHours ?? 8;
        const earlyExitGraceHrs = (rule.earlyExitGraceMinutes ?? rule.lateGraceMinutes ?? 15) / 60;
        const presentThreshold = Math.max(halfDayHrs + 0.01, minPresentHrs - earlyExitGraceHrs);
        if (rec.totalHours < halfDayHrs) status = "absent";
        else if (rec.totalHours < presentThreshold) status = "half_day";
      }

      return status;
    }

    const rows = filtered.map(({ emp, branchName }) => {
      const empRecs = empRecords.get(emp.id) || new Map();
      const empShift = emp.shiftId ? shiftMap.get(emp.shiftId) : undefined;
      const dailyStatus = [];
      let presentDays = 0, absentDays = 0, lateDays = 0, halfDays = 0, leaveDays = 0, holidayDays = 0;
      let totalWorkHours = 0, overtimeHours = 0;

      for (let d = 1; d <= daysInMonth; d++) {
        const rec = empRecs.get(d);
        if (rec) {
          const effectiveStatus = calcEffectiveStatus(rec, empShift, emp.department);
          dailyStatus.push({ day: d, status: effectiveStatus, inTime: rec.inTime1, outTime: rec.outTime1, inTime2: rec.inTime2, outTime2: rec.outTime2, hours: rec.totalHours, leaveType: rec.leaveType ?? null, recordId: rec.id });
          if (effectiveStatus === "present") presentDays++;
          else if (effectiveStatus === "absent") absentDays++;
          else if (effectiveStatus === "late") { lateDays++; presentDays++; }
          else if (effectiveStatus === "half_day") halfDays++;
          else if (effectiveStatus === "leave") leaveDays++;
          else if (effectiveStatus === "holiday") holidayDays++;
          totalWorkHours += rec.totalHours || 0;
          overtimeHours += rec.overtimeHours || 0;
        } else {
          dailyStatus.push({ day: d, status: "absent" });
          absentDays++;
        }
      }

      return {
        employeeId: emp.id,
        branchId: emp.branchId,
        employeeName: emp.fullName,
        employeeCode: emp.employeeId,
        designation: emp.designation,
        dailyStatus,
        presentDays, absentDays, lateDays, halfDays, leaveDays, holidayDays,
        totalWorkHours: Math.round(totalWorkHours * 10) / 10,
        overtimeHours: Math.round(overtimeHours * 10) / 10,
      };
    });

    const branchName = branchId ? (filtered[0]?.branchName || "All Branches") : "All Branches";
    res.json({ month: m, year: y, daysInMonth, branchName, rows });
  } catch (e) { console.error(e); res.status(500).json({ message: "Error", success: false }); }
});

/* ── Manual punch — sets approvalStatus = "pending" ──────── */
router.post("/punch", async (req, res) => {
  try {
    const { employeeId, type, time, remarks } = req.body;
    const todayStr = today();
    const punchTime = time || new Date().toTimeString().slice(0, 5);

    const [existing] = await db.select().from(attendanceRecords)
      .where(and(eq(attendanceRecords.employeeId, employeeId), eq(attendanceRecords.date, todayStr)));

    const [emp] = await db.select().from(employees).where(eq(employees.id, employeeId));
    if (!emp) { res.status(404).json({ message: "Employee not found", success: false }); return; }

    if (existing) {
      const updates: any = { updatedAt: new Date(), approvalStatus: "pending" };
      if (type === "in") {
        if (!existing.inTime1) updates.inTime1 = punchTime;
        else updates.inTime2 = punchTime;
        updates.status = "present";
      } else {
        if (!existing.outTime1) {
          updates.outTime1 = punchTime;
          updates.workHours1 = calcWorkHours(existing.inTime1, punchTime);
          updates.totalHours = updates.workHours1;
        } else {
          updates.outTime2 = punchTime;
          updates.workHours2 = calcWorkHours(existing.inTime2, punchTime);
          updates.totalHours = (existing.workHours1 || 0) + updates.workHours2;
        }
      }
      if (remarks) updates.remarks = remarks;
      const [updated] = await db.update(attendanceRecords).set(updates).where(eq(attendanceRecords.id, existing.id)).returning();
      res.json({ ...updated, employeeName: emp.fullName, employeeCode: emp.employeeId, branchName: "", shiftName: null, createdAt: updated.createdAt.toISOString() });
    } else {
      const newRec: any = {
        employeeId,
        branchId: emp.branchId,
        date: todayStr,
        status: "present",
        source: "manual",
        approvalStatus: "pending",
        remarks: remarks || null,
      };
      if (type === "in") newRec.inTime1 = punchTime;
      else newRec.outTime1 = punchTime;
      const [created] = await db.insert(attendanceRecords).values(newRec).returning();
      res.json({ ...created, employeeName: emp.fullName, employeeCode: emp.employeeId, branchName: "", shiftName: null, createdAt: created.createdAt.toISOString() });
    }
  } catch (e) { console.error(e); res.status(500).json({ message: "Error", success: false }); }
});

/* ── Mark Leave (manual entry with leave balance deduction) ── */
router.post("/mark-leave", async (req, res) => {
  try {
    const { employeeId, date, leaveType } = req.body as {
      employeeId: number;
      date: string;
      leaveType: "annual" | "casual" | "no_pay";
    };
    if (!employeeId || !date || !leaveType) {
      return res.status(400).json({ message: "employeeId, date, and leaveType are required" });
    }

    const [emp] = await db.select().from(employees).where(eq(employees.id, employeeId));
    if (!emp) return res.status(404).json({ message: "Employee not found" });

    const year = parseInt(date.split("-")[0]);

    if (leaveType === "annual" || leaveType === "casual") {
      const [bal] = await db.select().from(leaveBalances)
        .where(and(eq(leaveBalances.employeeId, employeeId), eq(leaveBalances.year, year)));

      const annualRemaining = (bal?.annualLeaveBalance ?? 0) - (bal?.annualLeaveUsed ?? 0);
      const casualRemaining = (bal?.casualLeaveBalance ?? 0) - (bal?.casualLeaveUsed ?? 0);

      if (leaveType === "annual" && annualRemaining < 1) {
        return res.status(422).json({
          message: "No annual leave balance remaining. Please use Casual Leave or No-Pay Leave.",
          annualRemaining, casualRemaining,
        });
      }
      if (leaveType === "casual" && casualRemaining < 1) {
        return res.status(422).json({
          message: "No casual leave balance remaining. Please use Annual Leave or No-Pay Leave.",
          annualRemaining, casualRemaining,
        });
      }

      const [existing] = await db.select().from(attendanceRecords)
        .where(and(eq(attendanceRecords.employeeId, employeeId), eq(attendanceRecords.date, date)));

      if (existing) {
        await db.update(attendanceRecords).set({
          status: "leave",
          leaveType,
          source: "manual",
          approvalStatus: "approved",
          updatedAt: new Date(),
        }).where(eq(attendanceRecords.id, existing.id));
      } else {
        await db.insert(attendanceRecords).values({
          employeeId,
          branchId: emp.branchId!,
          date,
          status: "leave",
          leaveType,
          source: "manual",
          approvalStatus: "approved",
        });
      }

      if (bal) {
        if (leaveType === "annual") {
          await db.update(leaveBalances).set({
            annualLeaveUsed: (bal.annualLeaveUsed ?? 0) + 1,
            updatedAt: new Date(),
          }).where(eq(leaveBalances.id, bal.id));
        } else {
          await db.update(leaveBalances).set({
            casualLeaveUsed: (bal.casualLeaveUsed ?? 0) + 1,
            updatedAt: new Date(),
          }).where(eq(leaveBalances.id, bal.id));
        }
      } else {
        await db.insert(leaveBalances).values({
          employeeId,
          year,
          annualLeaveBalance: 0,
          casualLeaveBalance: 0,
          annualLeaveUsed: leaveType === "annual" ? 1 : 0,
          casualLeaveUsed: leaveType === "casual" ? 1 : 0,
        });
      }

      return res.json({ success: true, status: "leave", leaveType });
    }

    /* ── No-pay leave: mark as absent (salary deduction in payroll) ── */
    const [existing] = await db.select().from(attendanceRecords)
      .where(and(eq(attendanceRecords.employeeId, employeeId), eq(attendanceRecords.date, date)));

    if (existing) {
      await db.update(attendanceRecords).set({
        status: "absent",
        leaveType: null,
        source: "manual",
        approvalStatus: "approved",
        updatedAt: new Date(),
      }).where(eq(attendanceRecords.id, existing.id));
    } else {
      await db.insert(attendanceRecords).values({
        employeeId,
        branchId: emp.branchId!,
        date,
        status: "absent",
        source: "manual",
        approvalStatus: "approved",
      });
    }

    return res.json({ success: true, status: "absent", leaveType: "no_pay" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to mark leave" });
  }
});

/* ── Pending manual punch approvals ───────────────────────── */
router.get("/pending-approvals", async (req, res) => {
  try {
    const { branchId } = req.query;
    const all = await db.select({
      rec: attendanceRecords,
      empName: employees.fullName,
      empCode: employees.employeeId,
      empDesignation: employees.designation,
      branchName: branches.name,
    }).from(attendanceRecords)
      .leftJoin(employees, eq(attendanceRecords.employeeId, employees.id))
      .leftJoin(branches, eq(attendanceRecords.branchId, branches.id));

    let filtered = all.filter(r => r.rec.approvalStatus === "pending" && r.rec.source === "manual");
    if (branchId) filtered = filtered.filter(r => r.rec.branchId === Number(branchId));

    res.json(filtered.map(r => ({
      ...r.rec,
      employeeName: r.empName || "Unknown",
      employeeCode: r.empCode || "",
      designation: r.empDesignation || "",
      branchName: r.branchName || "",
      createdAt: r.rec.createdAt.toISOString(),
    })));
  } catch (e) { console.error(e); res.status(500).json({ message: "Error", success: false }); }
});

/* ── Approve / Reject manual punch ───────────────────────── */
router.patch("/:id/approve", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { action, approvedBy, note } = req.body as {
      action: "approved" | "rejected";
      approvedBy?: number;
      note?: string;
    };

    const [updated] = await db.update(attendanceRecords).set({
      approvalStatus: action,
      approvedBy: approvedBy ?? null,
      approvalNote: note ?? null,
      updatedAt: new Date(),
    }).where(eq(attendanceRecords.id, id)).returning();

    if (!updated) return res.status(404).json({ message: "Record not found" });
    res.json({ success: true, record: updated });
  } catch (e) { console.error(e); res.status(500).json({ message: "Error", success: false }); }
});

router.get("/", async (req, res) => {
  try {
    const { branchId, employeeId, date, startDate, endDate, status, page = "1", limit = "50" } = req.query;
    const all = await db.select({
      rec: attendanceRecords,
      empName: employees.fullName,
      empCode: employees.employeeId,
      empDept: employees.department,
      empShiftId: employees.shiftId,
      branchName: branches.name,
    }).from(attendanceRecords)
      .leftJoin(employees, eq(attendanceRecords.employeeId, employees.id))
      .leftJoin(branches, eq(attendanceRecords.branchId, branches.id));

    const allShifts = await db.select().from(shifts);
    const shiftMap = new Map(allShifts.map(s => [s.id, s]));
    const hrRules = await loadDeptRules();

    function getEffectiveStatus(rec: typeof attendanceRecords.$inferSelect, empShift: typeof allShifts[0] | undefined, department: string | null) {
      const rule = findRule(hrRules, department || "", empShift?.name);
      let st = rec.status;
      if (st === "present" && rec.inTime1) {
        const shiftStartMins = empShift?.startTime1 ? timeToMins(empShift.startTime1) : 8 * 60;
        const grace = rule.lateGraceMinutes ?? (empShift?.graceMinutes ?? 15);
        if (timeToMins(rec.inTime1) > shiftStartMins + grace) st = "late";
      }
      if ((st === "present" || st === "late") && rec.totalHours != null) {
        const halfDayHrs = rule.halfDayHours ?? 5;
        const minPresentHrs = rule.minPresentHours ?? 8;
        const earlyExitGraceHrs = (rule.earlyExitGraceMinutes ?? rule.lateGraceMinutes ?? 15) / 60;
        const presentThreshold = Math.max(halfDayHrs + 0.01, minPresentHrs - earlyExitGraceHrs);
        if (rec.totalHours < halfDayHrs) st = "absent";
        else if (rec.totalHours < presentThreshold) st = "half_day";
      }
      return st;
    }

    let filtered = all.map(r => ({
      ...r,
      effectiveStatus: getEffectiveStatus(r.rec, r.empShiftId ? shiftMap.get(r.empShiftId) ?? undefined : undefined, r.empDept),
    }));

    if (branchId) filtered = filtered.filter(r => r.rec.branchId === Number(branchId));
    if (employeeId) filtered = filtered.filter(r => r.rec.employeeId === Number(employeeId));
    if (date) filtered = filtered.filter(r => r.rec.date === date);
    if (startDate) filtered = filtered.filter(r => r.rec.date >= (startDate as string));
    if (endDate) filtered = filtered.filter(r => r.rec.date <= (endDate as string));
    if (status) filtered = filtered.filter(r => r.effectiveStatus === status);

    const total = filtered.length;
    const p = Number(page), l = Number(limit);
    const paginated = filtered.slice((p - 1) * l, p * l);

    res.json({
      records: paginated.map(r => ({
        ...r.rec,
        status: r.effectiveStatus,
        employeeName: r.empName || "Unknown",
        employeeCode: r.empCode || "",
        branchName: r.branchName || "",
        shiftName: null,
        createdAt: r.rec.createdAt.toISOString(),
      })),
      total, page: p, limit: l,
    });
  } catch (e) { console.error(e); res.status(500).json({ message: "Error", success: false }); }
});

router.post("/", async (req, res) => {
  try {
    const body = req.body;
    const [emp] = await db.select().from(employees).where(eq(employees.id, body.employeeId));
    if (!emp) { res.status(404).json({ message: "Employee not found" }); return; }

    const workHours1 = calcWorkHours(body.inTime1, body.outTime1);
    const workHours2 = calcWorkHours(body.inTime2, body.outTime2);
    const totalHours = workHours1 + workHours2;

    const isManual = body.source === "manual" || !body.source;
    const [rec] = await db.insert(attendanceRecords).values({
      ...body,
      branchId: emp.branchId,
      workHours1: workHours1 || null,
      workHours2: workHours2 || null,
      totalHours: totalHours || null,
      approvalStatus: isManual ? "pending" : null,
    }).returning();

    const [br] = await db.select().from(branches).where(eq(branches.id, emp.branchId));
    res.status(201).json({ ...rec, employeeName: emp.fullName, employeeCode: emp.employeeId, branchName: br?.name || "", shiftName: null, createdAt: rec.createdAt.toISOString() });
  } catch (e) { console.error(e); res.status(500).json({ message: "Error", success: false }); }
});

router.put("/:id", async (req, res) => {
  try {
    const body = req.body;
    const workHours1 = calcWorkHours(body.inTime1, body.outTime1);
    const workHours2 = calcWorkHours(body.inTime2, body.outTime2);
    const totalHours = workHours1 + workHours2;
    const [rec] = await db.update(attendanceRecords).set({
      ...body,
      workHours1: workHours1 || null,
      workHours2: workHours2 || null,
      totalHours: totalHours || null,
      updatedAt: new Date(),
    }).where(eq(attendanceRecords.id, Number(req.params.id))).returning();
    const [emp] = await db.select().from(employees).where(eq(employees.id, rec.employeeId));
    const [br] = await db.select().from(branches).where(eq(branches.id, rec.branchId));
    res.json({ ...rec, employeeName: emp?.fullName || "", employeeCode: emp?.employeeId || "", branchName: br?.name || "", shiftName: null, createdAt: rec.createdAt.toISOString() });
  } catch (e) { res.status(500).json({ message: "Error", success: false }); }
});

export default router;
