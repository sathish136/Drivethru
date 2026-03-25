import { Router } from "express";
import { db } from "@workspace/db";
import { attendanceRecords, employees, branches, shifts } from "@workspace/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { getDaysInMonth, today } from "../lib/helpers.js";
import { loadDeptRules, findRule, timeToMins, calcLunchLateMinutes, lateCutoffMins } from "../lib/hr-rules.js";

const router = Router();

router.get("/attendance", async (req, res) => {
  try {
    const { startDate, endDate, branchId, employeeId, status } = req.query;
    const all = await db.select({
      rec: attendanceRecords,
      empName: employees.fullName,
      empCode: employees.employeeId,
      empDesignation: employees.designation,
      empDepartment: employees.department,
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
        if (rec.totalHours < halfDayHrs) st = "absent";
        else if (rec.totalHours < minPresentHrs) st = "half_day";
      }
      return st;
    }

    let enriched = all.map(r => ({
      ...r,
      effectiveStatus: getEffectiveStatus(r.rec, r.empShiftId ? shiftMap.get(r.empShiftId) ?? undefined : undefined, r.empDepartment),
    }));

    if (startDate) enriched = enriched.filter(r => r.rec.date >= (startDate as string));
    if (endDate) enriched = enriched.filter(r => r.rec.date <= (endDate as string));
    if (branchId) enriched = enriched.filter(r => r.rec.branchId === Number(branchId));
    if (employeeId) enriched = enriched.filter(r => r.rec.employeeId === Number(employeeId));
    if (status) enriched = enriched.filter(r => r.effectiveStatus === status);

    const summary = { present: 0, absent: 0, late: 0, halfDay: 0, leave: 0, holiday: 0 };
    for (const r of enriched) {
      const st = r.effectiveStatus;
      if (st === "present") summary.present++;
      else if (st === "absent") summary.absent++;
      else if (st === "late") summary.late++;
      else if (st === "half_day") summary.halfDay++;
      else if (st === "leave") summary.leave++;
      else if (st === "holiday") summary.holiday++;
    }

    res.json({
      startDate: startDate as string,
      endDate: endDate as string,
      totalRecords: enriched.length,
      summary,
      records: enriched.map(r => {
        const empShift = r.empShiftId ? shiftMap.get(r.empShiftId) : undefined;
        const rule = findRule(hrRules, r.empDepartment || "", empShift?.name);
        const lateCutoff = lateCutoffMins(rule, empShift?.startTime1);
        const morningLateMinutes = (r.effectiveStatus === "late" && r.rec.inTime1)
          ? Math.max(0, timeToMins(r.rec.inTime1) - lateCutoff)
          : 0;
        const lunchLateMinutes = calcLunchLateMinutes(r.rec.outTime1, r.rec.inTime2, rule);
        return {
          ...r.rec,
          status: r.effectiveStatus,
          employeeName: r.empName || "",
          employeeCode: r.empCode || "",
          designation: r.empDesignation || "",
          department: r.empDepartment || "",
          branchName: r.branchName || "",
          shiftName: null,
          createdAt: r.rec.createdAt.toISOString(),
          morningLateMinutes,
          lunchLateMinutes,
        };
      }),
    });
  } catch (e) { console.error(e); res.status(500).json({ message: "Error", success: false }); }
});

router.get("/monthly", async (req, res) => {
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

    // Load shifts + HR rules so we can compute effective status
    const allShifts = await db.select().from(shifts);
    const shiftMap = new Map(allShifts.map(s => [s.id, s]));
    const hrRules = await loadDeptRules();

    function calcEffectiveStatus(
      rec: typeof attendanceRecords.$inferSelect,
      empShift: typeof allShifts[0] | undefined,
      department: string | null,
    ) {
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
        if (rec.totalHours < halfDayHrs) st = "absent";
        else if (rec.totalHours < minPresentHrs) st = "half_day";
      }
      return st;
    }

    const filtered = branchId ? allEmp.filter(r => r.emp.branchId === Number(branchId)) : allEmp;
    const records = await db.select().from(attendanceRecords)
      .where(and(gte(attendanceRecords.date, startDate), lte(attendanceRecords.date, endDate)));

    const empRecords = new Map<number, (typeof records[0])[]>();
    for (const r of records) {
      if (!empRecords.has(r.employeeId)) empRecords.set(r.employeeId, []);
      empRecords.get(r.employeeId)!.push(r);
    }

    const workingDays = daysInMonth;
    const empSummaries = filtered.map(({ emp, branchName }) => {
      const recs = empRecords.get(emp.id) || [];
      const empShift = emp.shiftId ? shiftMap.get(emp.shiftId) : undefined;
      const rule = findRule(hrRules, emp.department || "", empShift?.name);
      const lateCutoff = lateCutoffMins(rule, empShift?.startTime1);
      let presentDays = 0, absentDays = 0, lateDays = 0, halfDays = 0, leaveDays = 0, holidayDays = 0;
      let totalWorkHours = 0, overtimeHours = 0;
      let lunchLateDays = 0, totalMorningLateMinutes = 0, totalLunchLateMinutes = 0;
      for (const r of recs) {
        const st = calcEffectiveStatus(r, empShift, emp.department);
        if (st === "present") presentDays++;
        else if (st === "absent") absentDays++;
        else if (st === "late") {
          lateDays++; presentDays++;
          if (r.inTime1) totalMorningLateMinutes += Math.max(0, timeToMins(r.inTime1) - lateCutoff);
        }
        else if (st === "half_day") halfDays++;
        else if (st === "leave") leaveDays++;
        else if (st === "holiday") holidayDays++;
        totalWorkHours += r.totalHours || 0;
        overtimeHours += r.overtimeHours || 0;
        const ll = calcLunchLateMinutes(r.outTime1, r.inTime2, rule);
        if (ll > 0) { lunchLateDays++; totalLunchLateMinutes += ll; }
      }
      const effectiveDays = workingDays - holidayDays;
      const attendancePercentage = effectiveDays > 0 ? Math.round(((presentDays + halfDays * 0.5) / effectiveDays) * 100) : 0;
      return {
        employeeId: emp.id, employeeName: emp.fullName, employeeCode: emp.employeeId,
        branchName: branchName || "", designation: emp.designation,
        department: emp.department || "", employeeType: emp.employeeType || "",
        presentDays, absentDays, lateDays, halfDays, leaveDays, holidayDays,
        totalWorkHours: Math.round(totalWorkHours * 10) / 10,
        overtimeHours: Math.round(overtimeHours * 10) / 10,
        attendancePercentage,
        lunchLateDays,
        totalMorningLateMinutes,
        totalLunchLateMinutes,
      };
    });

    res.json({ month: m, year: y, totalEmployees: filtered.length, workingDays, employees: empSummaries });
  } catch (e) { console.error(e); res.status(500).json({ message: "Error", success: false }); }
});

router.get("/overtime", async (req, res) => {
  try {
    const { startDate, endDate, branchId } = req.query;
    const all = await db.select({
      rec: attendanceRecords,
      emp: employees,
      branchName: branches.name,
    }).from(attendanceRecords)
      .leftJoin(employees, eq(attendanceRecords.employeeId, employees.id))
      .leftJoin(branches, eq(attendanceRecords.branchId, branches.id));

    let filtered = all.filter(r => (r.rec.overtimeHours || 0) > 0);
    if (startDate) filtered = filtered.filter(r => r.rec.date >= (startDate as string));
    if (endDate) filtered = filtered.filter(r => r.rec.date <= (endDate as string));
    if (branchId) filtered = filtered.filter(r => r.rec.branchId === Number(branchId));

    const empMap = new Map<number, any>();
    for (const r of filtered) {
      if (!empMap.has(r.rec.employeeId)) {
        empMap.set(r.rec.employeeId, {
          employeeId: r.rec.employeeId,
          employeeName: r.emp?.fullName || "",
          employeeCode: r.emp?.employeeId || "",
          branchName: r.branchName || "",
          designation: r.emp?.designation || "",
          employeeType: r.emp?.employeeType || "",
          totalOvertimeHours: 0,
          overtimeDays: 0,
          records: [],
        });
      }
      const entry = empMap.get(r.rec.employeeId);
      entry.totalOvertimeHours += r.rec.overtimeHours || 0;
      entry.overtimeDays++;
      entry.records.push({ date: r.rec.date, overtimeHours: r.rec.overtimeHours || 0 });
    }

    const totalOT = Array.from(empMap.values()).reduce((sum, e) => sum + e.totalOvertimeHours, 0);
    res.json({
      startDate: startDate as string,
      endDate: endDate as string,
      totalOvertimeHours: Math.round(totalOT * 10) / 10,
      employees: Array.from(empMap.values()).map(e => ({ ...e, totalOvertimeHours: Math.round(e.totalOvertimeHours * 10) / 10 })),
    });
  } catch (e) { console.error(e); res.status(500).json({ message: "Error", success: false }); }
});

router.get("/summary", async (req, res) => {
  try {
    const { branchId } = req.query;
    const todayStr = today();
    const now = new Date();
    const m = now.getMonth() + 1;
    const y = now.getFullYear();
    const daysInMonth = getDaysInMonth(m, y);
    const monthStart = `${y}-${String(m).padStart(2, "0")}-01`;
    const monthEnd = `${y}-${String(m).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

    const allEmp = await db.select({ emp: employees, branchName: branches.name })
      .from(employees).leftJoin(branches, eq(employees.branchId, branches.id))
      .where(eq(employees.status, "active"));
    const filteredEmp = branchId ? allEmp.filter(r => r.emp.branchId === Number(branchId)) : allEmp;
    const empIds = filteredEmp.map(r => r.emp.id);

    const allBranches = await db.select().from(branches).where(eq(branches.isActive, true));

    const todayRecs = await db.select().from(attendanceRecords).where(eq(attendanceRecords.date, todayStr));
    const filteredToday = branchId ? todayRecs.filter(r => r.branchId === Number(branchId)) : todayRecs;
    const present = filteredToday.filter(r => r.status === "present" || r.status === "late").length;
    const absent = filteredToday.filter(r => r.status === "absent").length;
    const late = filteredToday.filter(r => r.status === "late").length;
    const onLeave = filteredToday.filter(r => r.status === "leave").length;
    const total = filteredEmp.length;
    const attPct = total > 0 ? Math.round((present / total) * 100) : 0;

    const monthRecs = await db.select().from(attendanceRecords)
      .where(and(gte(attendanceRecords.date, monthStart), lte(attendanceRecords.date, monthEnd)));
    const filteredMonth = branchId ? monthRecs.filter(r => r.branchId === Number(branchId)) : monthRecs;
    const monthPresent = filteredMonth.filter(r => r.status === "present" || r.status === "late").length;
    const monthTotal = filteredEmp.length * daysInMonth;
    const monthPct = monthTotal > 0 ? Math.round((monthPresent / monthTotal) * 100) : 0;
    const totalOT = filteredMonth.reduce((s, r) => s + (r.overtimeHours || 0), 0);

    const branchWise = allBranches.slice(0, 10).map(b => {
      const empInBranch = allEmp.filter(r => r.emp.branchId === b.id).length;
      const presentInBranch = filteredToday.filter(r => r.branchId === b.id && (r.status === "present" || r.status === "late")).length;
      return { branchId: b.id, branchName: b.name, present: presentInBranch, absent: empInBranch - presentInBranch, total: empInBranch };
    });

    const recentRecs = await db.select({
      rec: attendanceRecords,
      empName: employees.fullName,
      empCode: employees.employeeId,
      branchName: branches.name,
    }).from(attendanceRecords)
      .leftJoin(employees, eq(attendanceRecords.employeeId, employees.id))
      .leftJoin(branches, eq(attendanceRecords.branchId, branches.id));
    const recent = recentRecs.slice(-10).reverse().map(r => ({
      ...r.rec,
      employeeName: r.empName || "",
      employeeCode: r.empCode || "",
      branchName: r.branchName || "",
      shiftName: null,
      createdAt: r.rec.createdAt.toISOString(),
    }));

    res.json({
      totalEmployees: total,
      totalBranches: allBranches.length,
      presentToday: present,
      absentToday: absent,
      lateToday: late,
      onLeaveToday: onLeave,
      attendancePercentageToday: attPct,
      monthlyAttendancePercentage: monthPct,
      totalOvertimeThisMonth: Math.round(totalOT * 10) / 10,
      recentAttendance: recent,
      branchWiseSummary: branchWise,
    });
  } catch (e) { console.error(e); res.status(500).json({ message: "Error", success: false }); }
});

export default router;
