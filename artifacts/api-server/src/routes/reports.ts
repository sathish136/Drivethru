import { Router } from "express";
import { db } from "@workspace/db";
import { attendanceRecords, employees, branches, shifts, weekoffSchedules, holidays } from "@workspace/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { getDaysInMonth, today } from "../lib/helpers.js";
import { loadDeptRules, findRule, timeToMins, calcLunchLateMinutes, lateCutoffMins, calcOtHours, calcTimeBasedOtHours, isNightShiftRecord, DeptShiftRule, calcNightWatcherPolicyOtHours } from "../lib/hr-rules.js";
import { processSalaryRow, resolveDayShift, type WeekOffInfo, type DayType } from "../lib/salary-engine.js";

/**
 * Map salary-engine DayType into the front-end status string used across
 * the existing attendance UI ("present" | "absent" | "late" | "half_day" | …).
 */
function dayTypeToStatus(dayType: DayType, lateMinutes: number): string {
  if (dayType === "WEEK_OFF")        return "off_day";
  if (dayType === "WEEK_OFF_WORKED") return "present";
  if (dayType === "ABSENT")          return "absent";
  if (dayType === "HALF_DAY")        return "half_day";
  if (dayType === "INVALID")         return "invalid";
  // WORKING_DAY
  return lateMinutes > 0 ? "late" : "present";
}

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
 *  0. Night Watcher payroll mode: OT = time after 05:00 checkout, capped 3 h.
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
  if (rec.totalHours == null) return 0;

  // ── Night Watcher payroll mode: always use time-based OT from 05:00 ──────
  if (rule.nightWatcherPayroll) {
    // Night Watcher final OT policy: discrete hours (3/2/1/0), no decimal OT.
    return calcNightWatcherPolicyOtHours(rec, {
      otStartTime: "05:00",
      otEndTime: "08:00",
      nearEndGraceMinutes: 10,
    });
  }

  if (!rule.otEligible) return 0;

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

    // Keep cap for time-based OT.
    ot = Math.min(3, ot);
    // If this rule is Night Watcher-like (hourly deduction configured), apply discrete policy OT.
    if (rule.nightWatcherMissedPunchDeductHours != null) {
      return calcNightWatcherPolicyOtHours(rec, {
        otStartTime: "05:00",
        otEndTime: "08:00",
        nearEndGraceMinutes: 10,
      });
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
    // Night Watcher policy: apply only configured Late Grace (no extra +5 min checkout grace)
    const extraCheckoutGraceMinutes = rule.nightWatcherPayroll ? 0 : 5;
    const earlyExitGraceHrs =
      ((rule.earlyExitGraceMinutes ?? rule.lateGraceMinutes ?? 15) + extraCheckoutGraceMinutes) / 60;

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
    // Day-wise variant lookup ("kitchen shift - sunday", etc.)
    const shiftsByName = new Map(allShifts.map(s => [s.name.trim().toLowerCase(), s]));
    const hrRules = await loadDeptRules();

    /* Load week-off schedules and join via employees.weekoffScheduleId so the
       salary engine can decide WEEK_OFF / WEEK_OFF_WORKED dynamically. */
    const allWeekoffs = await db.select().from(weekoffSchedules);
    const weekoffMap = new Map<number, WeekOffInfo>(
      allWeekoffs.map(w => [w.id, {
        offDays:  JSON.parse(w.offDays)  as number[],
        halfDays: JSON.parse(w.halfDays) as number[],
      }])
    );
    const empWeekoffById = new Map<number, WeekOffInfo | null>();
    {
      const rows = await db.select({
        id: employees.id, weekoffScheduleId: employees.weekoffScheduleId,
      }).from(employees);
      for (const r of rows) {
        empWeekoffById.set(r.id, r.weekoffScheduleId ? weekoffMap.get(r.weekoffScheduleId) ?? null : null);
      }
    }

    /* Load holidays so the salary engine can apply OT pay multipliers
       (Statutory ×2.0 / Poya ×1.5 / Public ×1.5) when employees work on them. */
    const allHolidays = await db.select().from(holidays);
    const holidayByDate = new Map<string, { type: "statutory" | "poya" | "public"; name: string }>();
    for (const h of allHolidays) {
      const t = (h.type as string)?.toLowerCase();
      if (t === "statutory" || t === "poya" || t === "public") {
        holidayByDate.set(h.date, { type: t as any, name: h.name });
      }
    }

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
      const baseShift = r.empShiftId ? shiftMap.get(r.empShiftId) ?? undefined : undefined;
      const rule = findRule(hrRules, r.empDepartment || "", baseShift?.name);
      const date = r.rec.date;            // "YYYY-MM-DD"
      const empWeekoff = empWeekoffById.get(r.rec.employeeId) ?? null;
      // Day-wise variant: e.g. "Kitchen Shift" + Sunday → "Kitchen Shift - Sunday"
      const empShift = baseShift ? resolveDayShift(baseShift, date, shiftsByName as any) : undefined;

      // Run the policy-driven salary engine for THIS row.
      const sr = processSalaryRow({
        date,
        shift: { name: empShift?.name, startTime: empShift?.startTime1, endTime: empShift?.endTime1 },
        weekoff: empWeekoff,
        holiday: holidayByDate.get(date) ?? null,
        rec: {
          date,
          inTime1:  r.rec.inTime1,
          outTime1: r.rec.outTime1,
          inTime2:  r.rec.inTime2,
          outTime2: r.rec.outTime2,
          totalHours: r.rec.totalHours,
          leaveType: (r.rec as any).leaveType ?? null,
        },
      });

      // Preserve authoritative manual entries.
      // Leave / holiday are always preserved.
      // For manual records (HR override for missed biometric), trust the
      // explicitly-set status so a one-punch "missing punch" entry that HR
      // marked Present/Late/Half-Day is not auto-flipped back to Absent
      // by the salary engine.
      const isManual = (r.rec as any).source === "manual";
      const manualStatus = r.rec.status as string | null | undefined;
      const status = r.rec.status === "leave"
        ? "leave"
        : r.rec.status === "holiday"
          ? "holiday"
          : (isManual && manualStatus && ["present", "late", "half_day", "absent"].includes(manualStatus))
            ? (manualStatus === "present" && sr.lateMinutes > 0 ? "late" : manualStatus)
            : dayTypeToStatus(sr.dayType, sr.lateMinutes);

      return {
        ...r,
        _rule: rule,
        _empShift: empShift,
        _date: date,
        _salaryRow: sr,
        effectiveStatus: status,
      };
    });

    if (startDate) enriched = enriched.filter(r => r.rec.date >= (startDate as string));
    if (endDate) enriched = enriched.filter(r => r.rec.date <= (endDate as string));

    /* ── Synthesize unworked Day-Off rows ──────────────────────────────
       Attendance records only exist for days the employee actually punched.
       Without this synthesis, rostered off-days where no one came in are
       invisible to the report (Day Off summary stays at 0).  Generate a
       virtual record for every (employee × date in range) combination that
       is a rostered off-day AND has no real attendance row. */
    if (startDate && endDate) {
      const allEmps = await db.select({
        id: employees.id, fullName: employees.fullName, employeeCode: employees.employeeId,
        designation: employees.designation, department: employees.department,
        branchId: employees.branchId, shiftId: employees.shiftId,
        joiningDate: employees.joiningDate, status: employees.status,
      }).from(employees);
      const branchRows = await db.select().from(branches);
      const branchNameById = new Map(branchRows.map(b => [b.id, b.name]));

      const seen = new Set(enriched.map(r => `${r.rec.employeeId}|${r.rec.date}`));
      const dates: string[] = [];
      const start = new Date(startDate as string + "T00:00:00Z");
      const end = new Date(endDate as string + "T00:00:00Z");
      for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
        dates.push(d.toISOString().slice(0, 10));
      }

      for (const emp of allEmps) {
        // Skip employees whose status is not active for absence purposes
        // (resigned/terminated employees still get virtual rows only for dates before separation -
        //  here we conservatively skip non-active accounts entirely from synthesis).
        if (emp.status && emp.status !== "active" && emp.status !== "on_leave") continue;

        const wo = empWeekoffById.get(emp.id);
        const baseShift = emp.shiftId ? shiftMap.get(emp.shiftId) ?? undefined : undefined;
        const joinDate = emp.joiningDate ? String(emp.joiningDate).slice(0, 10) : null;

        for (const date of dates) {
          if (seen.has(`${emp.id}|${date}`)) continue;
          // Don't synthesize rows for dates before the employee joined.
          if (joinDate && date < joinDate) continue;

          const dow = new Date(date + "T00:00:00Z").getUTCDay();
          const isOffDay = !!(wo?.offDays?.includes(dow));
          const isHoliday = !!holidayByDate.get(date);

          const empShift = baseShift ? resolveDayShift(baseShift, date, shiftsByName as any) : undefined;
          const sr = processSalaryRow({
            date,
            shift: { name: empShift?.name, startTime: empShift?.startTime1, endTime: empShift?.endTime1 },
            weekoff: wo,
            holiday: holidayByDate.get(date) ?? null,
            rec: { date, inTime1: null, outTime1: null, inTime2: null, outTime2: null, totalHours: 0 },
          });

          let synthStatus: string;
          if (isHoliday) synthStatus = "holiday";
          else if (isOffDay) synthStatus = "off_day";
          else synthStatus = "absent";

          enriched.push({
            rec: {
              id: -1,
              employeeId: emp.id,
              branchId: emp.branchId,
              date,
              status: synthStatus,
              leaveType: null,
              inTime1: null, outTime1: null, workHours1: null,
              inTime2: null, outTime2: null, workHours2: null,
              totalHours: 0, overtimeHours: 0,
              source: "system" as const,
              approvalStatus: null, approvedBy: null, approvalNote: null,
              remarks: null,
              createdAt: new Date(), updatedAt: new Date(),
            },
            empName: emp.fullName,
            empCode: emp.employeeCode,
            empDesignation: emp.designation,
            empDepartment: emp.department,
            empShiftId: emp.shiftId,
            branchName: branchNameById.get(emp.branchId) ?? "",
            _rule: findRule(hrRules, emp.department || "", baseShift?.name),
            _empShift: empShift,
            _date: date,
            _salaryRow: sr,
            effectiveStatus: synthStatus,
          } as any);
        }
      }
    }

    if (branchId) enriched = enriched.filter(r => r.rec.branchId === Number(branchId));
    if (employeeId) enriched = enriched.filter(r => r.rec.employeeId === Number(employeeId));
    if (status) enriched = enriched.filter(r => r.effectiveStatus === status);

    const summary = { present: 0, absent: 0, late: 0, halfDay: 0, leave: 0, holiday: 0, offDay: 0, invalid: 0 };
    for (const r of enriched) {
      const st = r.effectiveStatus;
      if (st === "present") summary.present++;
      else if (st === "absent") summary.absent++;
      else if (st === "late") summary.late++;
      else if (st === "half_day") summary.halfDay++;
      else if (st === "leave") summary.leave++;
      else if (st === "holiday") summary.holiday++;
      else if (st === "off_day") summary.offDay++;
      else if (st === "invalid") summary.invalid++;
    }

    res.json({
      startDate: startDate as string,
      endDate: endDate as string,
      totalRecords: enriched.length,
      summary,
      records: enriched.map(r => {
        const rule = r._rule;
        const empShift = r._empShift;
        const sr = r._salaryRow;

        // Lunch late — uses 10-min grace (built into calcLunchLateMinutes)
        const lunchLateMinutes = calcLunchLateMinutes(r.rec.outTime1, r.rec.inTime2, rule);

        // For leave rows, surface leave details (type + any saved note) instead
        // of the generic shift-based "Absent" remark from the salary engine.
        let remarks = sr.remarks;
        if (r.effectiveStatus === "leave") {
          const lt = (r.rec as any).leaveType as string | null;
          const ltLabel = lt
            ? (lt === "annual" ? "Annual Leave"
              : lt === "casual" ? "Casual Leave"
              : lt === "leave"  ? "Leave"
              : String(lt).replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()))
            : "Leave";
          const note = typeof (r.rec as any).remarks === "string" ? (r.rec as any).remarks.trim() : "";
          remarks = note ? `${ltLabel} — ${note}` : ltLabel;
        }

        return {
          ...r.rec,
          status: r.effectiveStatus,
          employeeName: r.empName || "",
          employeeCode: r.empCode || "",
          designation: r.empDesignation || "",
          department: r.empDepartment || "",
          branchName: r.branchName || "",
          shiftName: empShift?.name ?? sr.shiftName ?? null,
          createdAt: r.rec.createdAt.toISOString(),
          /* Policy-driven values from the salary engine (single source of truth) */
          morningLateMinutes: sr.lateMinutes,
          lunchLateMinutes,
          overtimeHours: sr.otHours,
          remarks,
          /* Extra payroll-friendly fields exposed for the reports/payslip UI */
          shiftCategory: sr.shiftCategory,
          shiftCategoryLabel: sr.shiftCategoryLabel,
          shiftTime: sr.shiftTime,
          weekOffStatus: sr.weekOffStatus,
          dayType: sr.dayType,
          workedHoursLabel: sr.workedHoursLabel,
          isWeekOff: sr.isWeekOff,
          weekOffWorked: sr.weekOffWorked,
          holidayType: sr.holidayType,
          holidayName: sr.holidayName,
          holidayMultiplier: sr.holidayMultiplier,
          holidayWorked: sr.holidayWorked,
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
    const shiftsByName = new Map(allShifts.map(s => [s.name.trim().toLowerCase(), s]));
    const hrRules = await loadDeptRules();

    const allWeekoffs = await db.select().from(weekoffSchedules);
    const weekoffMap = new Map<number, WeekOffInfo>(
      allWeekoffs.map(w => [w.id, {
        offDays:  JSON.parse(w.offDays)  as number[],
        halfDays: JSON.parse(w.halfDays) as number[],
      }])
    );

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
      const empWeekoff: WeekOffInfo | null =
        emp.weekoffScheduleId ? weekoffMap.get(emp.weekoffScheduleId) ?? null : null;

      // Merge overnight records for night-shift employees
      let recs = rawByEmp.get(emp.id) || [];
      if (isNightShift(empShift)) {
        const wrapped = recs.map(r => ({ rec: r }));
        const merged = mergeNightShiftRecords(wrapped);
        recs = merged.map(x => x.rec);
      }

      let presentDays = 0, absentDays = 0, lateDays = 0, halfDays = 0, leaveDays = 0, holidayDays = 0, offDays = 0, invalidDays = 0;
      let totalWorkHours = 0, overtimeHours = 0;
      let lunchLateDays = 0, totalMorningLateMinutes = 0, totalLunchLateMinutes = 0;

      for (const r of recs) {
        // Resolve day-wise shift variant (e.g. Kitchen on Sunday) from master.
        const dayShift = empShift ? resolveDayShift(empShift, r.date, shiftsByName as any) : undefined;
        // Salary engine = single source of truth
        const sr = processSalaryRow({
          date: r.date,
          shift: { name: dayShift?.name, startTime: dayShift?.startTime1, endTime: dayShift?.endTime1 },
          weekoff: empWeekoff,
          holiday: holidayByDate.get(r.date) ?? null,
          rec: {
            date: r.date,
            inTime1:  r.inTime1,
            outTime1: r.outTime1,
            inTime2:  r.inTime2,
            outTime2: r.outTime2,
            totalHours: r.totalHours,
            leaveType: (r as any).leaveType ?? null,
          },
        });
        const isManual = (r as any).source === "manual";
        const manualStatus = r.status as string | null | undefined;
        const st = r.status === "leave"   ? "leave"
                 : r.status === "holiday" ? "holiday"
                 : (isManual && manualStatus && ["present", "late", "half_day", "absent"].includes(manualStatus))
                   ? (manualStatus === "present" && sr.lateMinutes > 0 ? "late" : manualStatus)
                   : dayTypeToStatus(sr.dayType, sr.lateMinutes);

        if (st === "present") presentDays++;
        else if (st === "absent") absentDays++;
        else if (st === "late") {
          lateDays++; presentDays++;
          totalMorningLateMinutes += sr.lateMinutes;
        }
        else if (st === "half_day") halfDays++;
        else if (st === "leave") leaveDays++;
        else if (st === "holiday") holidayDays++;
        else if (st === "off_day") offDays++;
        else if (st === "invalid") invalidDays++;

        totalWorkHours += r.totalHours || 0;
        overtimeHours += sr.otHours;

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
        presentDays, absentDays, lateDays, halfDays, leaveDays, holidayDays, offDays, invalidDays,
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
