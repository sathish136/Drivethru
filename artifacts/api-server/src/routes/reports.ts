import { Router } from "express";
import { db } from "@workspace/db";
import { attendanceRecords, employees, branches, shifts } from "@workspace/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { getDaysInMonth, today } from "../lib/helpers.js";
import { loadDeptRules, findRule, timeToMins, calcLunchLateMinutes, lateCutoffMins, calcOtHours, calcTimeBasedOtHours, calcNightWatcherPunchDeduction, isNightShiftRecord, DeptShiftRule } from "../lib/hr-rules.js";

const router = Router();

/* ─── Night-shift helpers ───────────────────────────────────────────────── */

/** True when a shift starts at or after 18:00 (6 pm). */
function isNightShift(empShift: { startTime1?: string | null } | undefined): boolean {
  if (!empShift?.startTime1) return false;
  return timeToMins(empShift.startTime1) >= 18 * 60;
}

/** Advance a YYYY-MM-DD string by one calendar day. */
function nextDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * For employees on a night shift (start ≥ 18:00) the biometric device stores
 * two separate date-records per worked night:
 *   • evening record  — date N,   inTime1 ≥ 18:00, ends before midnight
 *   • morning record  — date N+1, inTime1 < 12:00, continues to ~08:00
 *
 * This function detects those pairs, merges them into a single record keyed
 * on the evening date, and drops the standalone morning record so it is not
 * double-counted.
 *
 * The merged record carries:
 *   • totalHours  = evening hours + morning hours
 *   • status      = "present" (to be re-evaluated by getEffectiveStatus)
 *   • inTime1     = evening check-in
 *   • outTime2    = morning final check-out
 */
function mergeNightShiftRecords<T extends {
  rec: typeof attendanceRecords.$inferSelect;
  [k: string]: any;
}>(recs: T[]): T[] {
  const grouped = new Map<number, T[]>();
  for (const r of recs) {
    if (!grouped.has(r.rec.employeeId)) grouped.set(r.rec.employeeId, []);
    grouped.get(r.rec.employeeId)!.push(r);
  }

  const skipKey = new Set<string>(); // "employeeId:date" to exclude after merging
  const result: T[] = [];

  for (const [empId, empRecs] of grouped) {
    const sorted = [...empRecs].sort((a, b) => a.rec.date.localeCompare(b.rec.date));

    for (const r of sorted) {
      const key = `${empId}:${r.rec.date}`;
      if (skipKey.has(key)) continue;

      const inMins = r.rec.inTime1 ? timeToMins(r.rec.inTime1) : -1;

      // Is this an evening start for a night shift employee?
      if (inMins >= 18 * 60) {
        const nd = nextDate(r.rec.date);
        const morning = sorted.find(x =>
          x.rec.date === nd &&
          x.rec.inTime1 != null &&
          timeToMins(x.rec.inTime1) < 12 * 60,
        );

        if (morning) {
          skipKey.add(`${empId}:${nd}`);
          const combinedHours = (r.rec.totalHours ?? 0) + (morning.rec.totalHours ?? 0);
          result.push({
            ...r,
            rec: {
              ...r.rec,
              totalHours: combinedHours,
              outTime2: morning.rec.outTime2 ?? r.rec.outTime2,
              status: "present", // will be re-evaluated
            },
          } as T);
          continue;
        }
      }

      result.push(r);
    }
  }

  return result;
}

/* ─── OT calculation helper ─────────────────────────────────────────────── */

/**
 * Compute overtime hours for a single attendance record using the correct
 * method based on the rule's configuration:
 *
 *  1. Time-based OT (rule.otStartTime set): Kitchen shift OT after 8:30 pm,
 *     Night Watcher OT after 5 am.  Saturday Kitchen capped at 1 h.
 *  2. Night-shift hours-based (fallback): total − scheduled, capped at 3 h.
 *  3. Standard hours-based: calcOtHours.
 */
function computeRecordOt(
  rec: {
    totalHours?: number | null;
    inTime1?: string | null;
    outTime1?: string | null;
    inTime2?: string | null;
    outTime2?: string | null;
  },
  empShift: { startTime1?: string | null; name?: string } | undefined,
  rule: DeptShiftRule,
  date: string,
  earlyMinutes: number,
): number {
  if (!rule.otEligible) return 0;
  if (rec.totalHours == null) return 0;

  const dayOfWeek = new Date(date + "T00:00:00Z").getUTCDay();
  const isSat = dayOfWeek === 6;
  const isNight = isNightShiftRecord(empShift?.startTime1);
  const lastCheckout = rec.outTime2 ?? rec.outTime1;

  // ── Time-based OT (Kitchen after 8:30 pm, Night Watcher after 5 am) ───
  if (rule.otStartTime) {
    if (isSat && rule.saturdayShiftHours != null) {
      // Saturday Kitchen: short shift (8 am–1 pm). OT capped at 1 h.
      // Use hours-based OT relative to the Saturday shift length.
      const satOtAfter = rule.saturdayShiftHours + 0.5;  // 5h + 30min grace = 5.5h
      const satRawOt = Math.max(0, rec.totalHours - satOtAfter);
      return Math.round(Math.min(1, satRawOt) * 100) / 100;
    }

    let ot = calcTimeBasedOtHours(lastCheckout, rule.otStartTime, isNight);

    if (rule.nightWatcherMissedPunchDeductHours != null) {
      // Night Watcher: deduct for missed hourly punches, cap at 3 h
      const shiftHrs = rule.minHours ?? 9;
      const deduction = calcNightWatcherPunchDeduction(rec, shiftHrs, rule.nightWatcherMissedPunchDeductHours);
      ot = Math.max(0, ot - deduction);
      ot = Math.min(3, ot);
    } else {
      // Kitchen weekdays: cap at 3 h
      ot = Math.min(3, ot);
    }
    return Math.round(ot * 100) / 100;
  }

  // ── Night shift without otStartTime: hours-based, capped at 3 h ────────
  if (isNight) {
    const scheduled = rule.minHours ?? 9;
    return Math.min(3, Math.round(Math.max(0, rec.totalHours - scheduled) * 100) / 100);
  }

  // ── Standard hours-based OT ─────────────────────────────────────────────
  return calcOtHours(rec.totalHours, rule, earlyMinutes);
}

/* ─── Status & OT helpers ───────────────────────────────────────────────── */

/**
 * Policy rules applied when computing an effective status:
 *  1. Flexible-shift employees never get a "late" mark (no late-hour deduction).
 *  2. Last-checkout 5-minute grace: employees can leave up to 5 min early without
 *     it affecting their present/half-day threshold.
 *  3. OT for night-shift employees: scheduled shift is minHours; if combined
 *     hours exceed that, OT = excess (capped at 3 h per policy).
 */
function getEffectiveStatus(
  rec: typeof attendanceRecords.$inferSelect,
  empShift: { startTime1?: string | null; graceMinutes?: number | null; name?: string } | undefined,
  department: string | null,
  rule: DeptShiftRule,
  date: string,                 // "YYYY-MM-DD" — needed for day-of-week rules
): string {
  let st = rec.status;

  const dayOfWeek = new Date(date + "T00:00:00Z").getUTCDay(); // 0=Sun, 6=Sat
  const isSaturday = dayOfWeek === 6;
  const isSunday = dayOfWeek === 0;

  // 1. Late check — skipped entirely for flexible shifts (managers, surf instructors, etc.)
  //    Also reset any stored "late" status back to "present" for flexible-shift employees.
  if (rule.flexible) {
    if (st === "late") st = "present"; // undo any previously stored late
  } else if ((st === "present" || st === "late") && rec.inTime1) {
    // Use Sunday-specific start time when the rule provides one
    const baseStart = (isSunday && rule.sundayStartTime)
      ? rule.sundayStartTime
      : empShift?.startTime1;
    const shiftStartMins = baseStart ? timeToMins(baseStart) : 8 * 60;
    const grace = rule.lateGraceMinutes ?? (empShift?.graceMinutes ?? 15);
    const isLate = timeToMins(rec.inTime1) > shiftStartMins + grace;
    if (st === "present" && isLate) st = "late";
    else if (st === "late" && !isLate) st = "present"; // stored late but actually on time
  }

  // 2. Hours-based status with checkout grace
  if ((st === "present" || st === "late") && rec.totalHours != null) {
    const halfDayHrs = rule.halfDayHours ?? 5;
    const minPresentHrs = rule.minPresentHours ?? 8;
    // Add 5-minute policy checkout grace on top of the rule's own early-exit grace
    const earlyExitGraceHrs = ((rule.earlyExitGraceMinutes ?? rule.lateGraceMinutes ?? 15) + 5) / 60;

    // Saturday short-shift: if the rule declares a shorter Saturday schedule,
    // treat that as the full day (present threshold = saturdayShiftHours - grace).
    // effectiveHalfDayHrs is halved on Saturdays so the Math.max() doesn't cancel the grace.
    const effectiveHalfDayHrs = (isSaturday && rule.saturdayShiftHours != null)
      ? rule.saturdayShiftHours / 2   // 2.5 hrs for a 5-hr Saturday shift
      : halfDayHrs;
    const presentThreshold = (isSaturday && rule.saturdayShiftHours != null)
      ? Math.max(effectiveHalfDayHrs + 0.01, rule.saturdayShiftHours - earlyExitGraceHrs)
      : Math.max(halfDayHrs + 0.01, minPresentHrs - earlyExitGraceHrs);
    const effectiveAbsentCutoff = effectiveHalfDayHrs;

    if (rec.totalHours < effectiveAbsentCutoff) st = "absent";
    else if (rec.totalHours < presentThreshold) st = "half_day";
  }

  return st;
}

/* ─── Routes ─────────────────────────────────────────────────────────────── */

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

    // Merge overnight (evening + morning) records for night-shift employees
    const getShift = (shiftId: number | null | undefined) =>
      shiftId ? shiftMap.get(shiftId) : undefined;

    const nightShiftEmployeeIds = new Set(
      all
        .filter(r => isNightShift(getShift(r.empShiftId)))
        .map(r => r.rec.employeeId),
    );

    const processedAll = nightShiftEmployeeIds.size > 0
      ? mergeNightShiftRecords(all)
      : all;

    let enriched = processedAll.map(r => {
      const empShift = r.empShiftId ? shiftMap.get(r.empShiftId) ?? undefined : undefined;
      const rule = findRule(hrRules, r.empDepartment || "", empShift?.name);
      const date = r.rec.date;            // "YYYY-MM-DD"
      return {
        ...r,
        _rule: rule,
        _empShift: empShift,
        _date: date,
        effectiveStatus: getEffectiveStatus(r.rec, empShift, r.empDepartment, rule, date),
      };
    });

    if (startDate) enriched = enriched.filter(r => r.rec.date >= (startDate as string));
    if (endDate) enriched = enriched.filter(r => r.rec.date <= (endDate as string));
    if (branchId) enriched = enriched.filter(r => r.rec.branchId === Number(branchId));
    if (employeeId) enriched = enriched.filter(r => r.rec.employeeId === Number(employeeId));
    if (status) enriched = enriched.filter(r => r.effectiveStatus === status);

    const summary = { present: 0, absent: 0, late: 0, halfDay: 0, leave: 0, holiday: 0, offDay: 0 };
    for (const r of enriched) {
      const st = r.effectiveStatus;
      if (st === "present") summary.present++;
      else if (st === "absent") summary.absent++;
      else if (st === "late") summary.late++;
      else if (st === "half_day") summary.halfDay++;
      else if (st === "leave") summary.leave++;
      else if (st === "holiday") summary.holiday++;
      else if (st === "off_day") summary.offDay++;
    }

    res.json({
      startDate: startDate as string,
      endDate: endDate as string,
      totalRecords: enriched.length,
      summary,
      records: enriched.map(r => {
        const rule = r._rule;
        const empShift = r._empShift;

        // Choose Sunday-specific start time for late calculation when applicable
        const dayOfWeek = new Date(r._date + "T00:00:00Z").getUTCDay();
        const effectiveStartTime =
          (dayOfWeek === 0 && rule.sundayStartTime) ? rule.sundayStartTime : empShift?.startTime1;
        const lateCutoff = lateCutoffMins(rule, effectiveStartTime);

        // Morning late minutes — zero for flexible shifts; tracked even for half_day records
        const morningLateMinutes =
          (!rule.flexible &&
           (r.effectiveStatus === "late" || r.effectiveStatus === "half_day") &&
           r.rec.inTime1)
            ? Math.max(0, timeToMins(r.rec.inTime1) - lateCutoff)
            : 0;

        // Lunch late — uses 10-min grace (built into calcLunchLateMinutes)
        const lunchLateMinutes = calcLunchLateMinutes(r.rec.outTime1, r.rec.inTime2, rule);

        // OT calculation
        const shiftStartMins = empShift?.startTime1 ? timeToMins(empShift.startTime1) : 8 * 60;
        const rawEarly = r.rec.inTime1 ? shiftStartMins - timeToMins(r.rec.inTime1) : 0;
        const earlyMinutes = rawEarly > 0 && rawEarly < 240 ? rawEarly : 0;

        const recalcOt = (r.rec.totalHours != null && r.effectiveStatus !== "absent" && r.effectiveStatus !== "half_day")
          ? computeRecordOt(r.rec, empShift, rule, r._date, earlyMinutes)
          : 0;

        return {
          ...r.rec,
          status: r.effectiveStatus,
          employeeName: r.empName || "",
          employeeCode: r.empCode || "",
          designation: r.empDesignation || "",
          department: r.empDepartment || "",
          branchName: r.branchName || "",
          shiftName: empShift?.name ?? null,
          createdAt: r.rec.createdAt.toISOString(),
          morningLateMinutes,
          lunchLateMinutes,
          overtimeHours: recalcOt,
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

    const allShifts = await db.select().from(shifts);
    const shiftMap = new Map(allShifts.map(s => [s.id, s]));
    const hrRules = await loadDeptRules();

    const filtered = branchId ? allEmp.filter(r => r.emp.branchId === Number(branchId)) : allEmp;
    const records = await db.select().from(attendanceRecords)
      .where(and(gte(attendanceRecords.date, startDate), lte(attendanceRecords.date, endDate)));

    // Group raw records by employee for night-shift merging
    const rawByEmp = new Map<number, (typeof records[0])[]>();
    for (const r of records) {
      if (!rawByEmp.has(r.employeeId)) rawByEmp.set(r.employeeId, []);
      rawByEmp.get(r.employeeId)!.push(r);
    }

    const workingDays = daysInMonth;
    const empSummaries = filtered.map(({ emp, branchName }) => {
      const empShift = emp.shiftId ? shiftMap.get(emp.shiftId) : undefined;
      const rule = findRule(hrRules, emp.department || "", empShift?.name);
      const lateCutoff = lateCutoffMins(rule, empShift?.startTime1);
      const shiftStartMins = empShift?.startTime1 ? timeToMins(empShift.startTime1) : 8 * 60;

      // Merge overnight records for night-shift employees
      let recs = rawByEmp.get(emp.id) || [];
      if (isNightShift(empShift)) {
        // Use the same merging logic via a wrapper
        const wrapped = recs.map(r => ({ rec: r }));
        const merged = mergeNightShiftRecords(wrapped);
        recs = merged.map(x => x.rec);
      }

      let presentDays = 0, absentDays = 0, lateDays = 0, halfDays = 0, leaveDays = 0, holidayDays = 0, offDays = 0;
      let totalWorkHours = 0, overtimeHours = 0;
      let lunchLateDays = 0, totalMorningLateMinutes = 0, totalLunchLateMinutes = 0;

      for (const r of recs) {
        const st = getEffectiveStatus(r, empShift, emp.department, rule);
        if (st === "present") presentDays++;
        else if (st === "absent") absentDays++;
        else if (st === "late") {
          lateDays++; presentDays++;
          if (!rule.flexible && r.inTime1) {
            totalMorningLateMinutes += Math.max(0, timeToMins(r.inTime1) - lateCutoff);
          }
        }
        else if (st === "half_day") halfDays++;
        else if (st === "leave") leaveDays++;
        else if (st === "holiday") holidayDays++;
        else if (st === "off_day") offDays++;

        totalWorkHours += r.totalHours || 0;

        if (r.totalHours != null && st !== "absent" && st !== "half_day") {
          const earlyMins = r.inTime1 ? Math.max(0, shiftStartMins - timeToMins(r.inTime1)) : 0;
          overtimeHours += computeRecordOt(r, empShift, rule, r.date, earlyMins);
        }

        const ll = calcLunchLateMinutes(r.outTime1, r.inTime2, rule);
        if (ll > 0) { lunchLateDays++; totalLunchLateMinutes += ll; }
      }

      const effectiveDays = workingDays - holidayDays;
      const attendancePercentage = effectiveDays > 0
        ? Math.round(((presentDays + halfDays * 0.5) / effectiveDays) * 100)
        : 0;

      return {
        employeeId: emp.id, employeeName: emp.fullName, employeeCode: emp.employeeId,
        branchName: branchName || "", designation: emp.designation,
        department: emp.department || "", employeeType: emp.employeeType || "",
        presentDays, absentDays, lateDays, halfDays, leaveDays, holidayDays, offDays,
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
