import { Router } from "express";
import { db } from "@workspace/db";
import { attendanceRecords, employees, branches, shifts, weekoffSchedules, holidays, biometricLogs } from "@workspace/db/schema";
import { eq, and, gte, lte, sql, inArray } from "drizzle-orm";
import { getDaysInMonth, today, calcWorkHours } from "../lib/helpers.js";
import { loadDeptRules, findRule, timeToMins, calcLunchLateMinutes, lateCutoffMins, calcOtHours, calcTimeBasedOtHours, isNightShiftRecord, DeptShiftRule, calcNightWatcherPolicyOtHours, calcNightWatcherOtFromAllPunches } from "../lib/hr-rules.js";
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
}>(recs: T[], nightShiftEmpIds: Set<number>): T[] {
  const grouped = new Map<number, T[]>();
  for (const r of recs) {
    if (!grouped.has(r.rec.employeeId)) grouped.set(r.rec.employeeId, []);
    grouped.get(r.rec.employeeId)!.push(r);
  }

  const skipKey = new Set<string>(); // "employeeId:date" to exclude after merging
  const result: T[] = [];

  for (const [empId, empRecs] of grouped) {
    const sorted = [...empRecs].sort((a, b) => a.rec.date.localeCompare(b.rec.date));

    // Only attempt overnight merging for employees whose ASSIGNED shift is a night shift.
    // This avoids incorrectly merging day-shift employees who happen to punch in late.
    if (!nightShiftEmpIds.has(empId)) {
      result.push(...sorted);
      continue;
    }

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
          // Merge overnight punches. Night-shift patterns:
          //   A) 2 punches only: Eve=In1, Morning=In1 → map as In1/Out1 pair
          //   B) 3 punches: Eve=In1+Out1, Morning=In1 → In1/Out1/In2/Out2
          //   C) 4 punches: Eve=In1+Out1+In2, Morning=outTime1 → In1/Out1/In2/Out2
          let mergedOutTime1 = r.rec.outTime1;
          let mergedInTime2  = r.rec.inTime2;
          let mergedOutTime2 = r.rec.outTime2;

          if (!mergedOutTime1) {
            // Pattern A: evening only has a check-in; morning's first punch is the checkout
            mergedOutTime1 = morning.rec.inTime1 ?? morning.rec.outTime1 ?? null;
            mergedInTime2  = null;
            mergedOutTime2 = morning.rec.outTime2 ?? morning.rec.outTime1 ?? null;
            // Avoid duplicate: if mergedOutTime1 same as mergedOutTime2, clear out2
            if (mergedOutTime2 === mergedOutTime1) mergedOutTime2 = null;
          } else if (!mergedInTime2 && !mergedOutTime2) {
            // Pattern B: evening has In1/Out1 but no second session; morning fills it
            mergedInTime2  = morning.rec.inTime1 ?? null;
            mergedOutTime2 = morning.rec.outTime2 ?? morning.rec.outTime1 ?? null;
          } else if (!mergedOutTime2) {
            // Pattern C: evening has In1/Out1/In2 but no final checkout; morning fills it
            mergedOutTime2 = morning.rec.outTime2 ?? morning.rec.outTime1 ?? morning.rec.inTime1 ?? null;
          }

          const wh1 = calcWorkHours(r.rec.inTime1, mergedOutTime1);
          const wh2 = calcWorkHours(mergedInTime2, mergedOutTime2);
          const combinedHours = Math.round((wh1 + wh2) * 100) / 100;
          result.push({
            ...r,
            rec: {
              ...r.rec,
              outTime1: mergedOutTime1,
              inTime2:  mergedInTime2,
              outTime2: mergedOutTime2,
              totalHours: combinedHours,
              status: "present", // will be re-evaluated
            },
            _nightShiftMerged: true,
            _morningDate: nd,
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
    // Holiday worked override: 11 OT hrs (8 base + 3), cap at 11.
    const baseOt = calcNightWatcherPolicyOtHours(rec, {
      otStartTime: "05:00",
      otEndTime: "08:00",
      nearEndGraceMinutes: 10,
    });
    return baseOt;
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
    const { branchId, employeeId, status, department } = req.query;
    // Sanitise date params: reject empty strings so the filter is never silently skipped.
    const pad = (n: number) => String(n).padStart(2, "0");
    const todayStr = (() => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; })();
    const startDate = typeof req.query.startDate === "string" && req.query.startDate ? req.query.startDate : undefined;
    const endDate   = typeof req.query.endDate   === "string" && req.query.endDate   ? req.query.endDate   : todayStr;
    const all = await db.select({
      rec: attendanceRecords,
      empName: employees.fullName,
      empCode: employees.employeeId,
      empDesignation: employees.department,
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
    /* Also build nightShiftEmployeeIds from the employees table directly so
       it works even when the attendance table is empty (e.g. after a reset). */
    const nightShiftEmployeeIds = new Set<number>();
    {
      const rows = await db.select({
        id: employees.id,
        weekoffScheduleId: employees.weekoffScheduleId,
        shiftId: employees.shiftId,
      }).from(employees);
      for (const r of rows) {
        empWeekoffById.set(r.id, r.weekoffScheduleId ? weekoffMap.get(r.weekoffScheduleId) ?? null : null);
        const empShift = r.shiftId ? shiftMap.get(r.shiftId) : undefined;
        if (isNightShift(empShift)) nightShiftEmployeeIds.add(r.id);
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

    const processedAll = nightShiftEmployeeIds.size > 0
      ? mergeNightShiftRecords(all, nightShiftEmployeeIds)
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
        shift: { name: empShift?.name, startTime: empShift?.startTime1, endTime: empShift?.endTime1, graceMinutes: empShift?.graceMinutes ?? null },
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

      // Preserve authoritative entries.
      // Leave / holiday are always preserved.
      // Trust an explicitly stored Present/Late/Half-Day/Absent status when
      // the row is a manual override OR has been explicitly approved — this
      // prevents the salary engine from auto-flipping HR-confirmed "missing
      // punch" days back to Absent.
      const recSource = (r.rec as any).source as string | null | undefined;
      const recApproval = (r.rec as any).approvalStatus as string | null | undefined;
      const storedStatus = r.rec.status as string | null | undefined;
      const isAuthoritative =
        recSource === "manual" || recApproval === "approved";
      const status = storedStatus === "leave"
        ? "leave"
        : storedStatus === "holiday"
          ? "holiday"
          : (isAuthoritative && storedStatus && ["present", "late", "half_day", "absent"].includes(storedStatus))
            ? (storedStatus === "present" && sr.lateMinutes > 0 ? "late" : storedStatus)
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
        designation: employees.department, department: employees.department,
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
          // Guard against JS Date overflow (e.g. "2026-04-31" → May 1).
          // Always clamp synthesized rows to the requested string range.
          if ((startDate as string) && date < (startDate as string)) continue;
          if ((endDate as string) && date > (endDate as string)) continue;

          const dow = new Date(date + "T00:00:00Z").getUTCDay();
          const isOffDay = !!(wo?.offDays?.includes(dow));
          const isHoliday = !!holidayByDate.get(date);

          const empShift = baseShift ? resolveDayShift(baseShift, date, shiftsByName as any) : undefined;
          const sr = processSalaryRow({
            date,
            shift: { name: empShift?.name, startTime: empShift?.startTime1, endTime: empShift?.endTime1, graceMinutes: empShift?.graceMinutes ?? null },
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
    if (department) enriched = enriched.filter(r => r.empDepartment === (department as string));

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

    // ── Fetch raw biometric punches for night-shift employees (up to 12 per shift) ──
    const bioPunchesByEmpDate = new Map<string, string[]>(); // "empId:localDate" → sorted HH:MM
    if (nightShiftEmployeeIds.size > 0) {
      try {
        const empIdList = [...nightShiftEmployeeIds];
        // Extend end date by 1 day to capture morning punches of overnight shifts
        let bioEnd: string | undefined;
        if (endDate) {
          const d = new Date((endDate as string) + "T00:00:00Z");
          d.setUTCDate(d.getUTCDate() + 1);
          bioEnd = d.toISOString().slice(0, 10);
        }
        const conditions: any[] = [inArray(biometricLogs.employeeId, empIdList)];
        if (startDate) conditions.push(gte(sql`(${biometricLogs.punchTime} AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Colombo')::date`, startDate as string));
        if (bioEnd)    conditions.push(lte(sql`(${biometricLogs.punchTime} AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Colombo')::date`, bioEnd));

        const bioRows = await db.select({
          employeeId: biometricLogs.employeeId,
          punchTime:  biometricLogs.punchTime,
        }).from(biometricLogs).where(and(...conditions));

        for (const row of bioRows) {
          if (!row.employeeId) continue;
          // Convert UTC → Asia/Colombo (UTC+5:30)
          const local = new Date(row.punchTime.getTime() + 5.5 * 3_600_000);
          const dateStr = local.toISOString().slice(0, 10);
          const timeStr = `${String(local.getUTCHours()).padStart(2, "0")}:${String(local.getUTCMinutes()).padStart(2, "0")}`;
          const key = `${row.employeeId}:${dateStr}`;
          if (!bioPunchesByEmpDate.has(key)) bioPunchesByEmpDate.set(key, []);
          bioPunchesByEmpDate.get(key)!.push(timeStr);
        }
        for (const times of bioPunchesByEmpDate.values()) {
          times.sort();
          // Deduplicate punches within 2 minutes of each other
          let i = 1;
          while (i < times.length) {
            const [ph, pm] = times[i - 1].split(":").map(Number);
            const [ch, cm] = times[i].split(":").map(Number);
            if (Math.abs((ch * 60 + cm) - (ph * 60 + pm)) < 2) {
              times.splice(i, 1);
            } else {
              i++;
            }
          }
        }
      } catch {
        // biometric_logs may be empty — silently fall back to stored punch fields
      }
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

        // Build rawPunches (up to 12) for night-shift records
        const empId = r.rec.employeeId;
        const isNightEmp = nightShiftEmployeeIds.has(empId);
        let rawPunches: string[] = [];
        if (isNightEmp) {
          const shiftDate   = String(r.rec.date);
          const morningDate = (r as any)._morningDate ? String((r as any)._morningDate) : null;
          const allShiftDateBio = bioPunchesByEmpDate.get(`${empId}:${shiftDate}`) ?? [];
          const allMorningDateBio = morningDate ? bioPunchesByEmpDate.get(`${empId}:${morningDate}`) ?? [] : [];

          // Stored punch fields (inTime1/outTime1/inTime2/outTime2) as ultimate fallback
          const storedPunches = ([r.rec.inTime1, r.rec.outTime1, r.rec.inTime2, r.rec.outTime2]
            .filter((t): t is string => typeof t === "string" && t.trim().length > 0));

          let bioPunches: string[];
          if (morningDate) {
            // Explicitly-merged overnight row – combine both date's bio punches as-is
            bioPunches = [...allShiftDateBio, ...allMorningDateBio];
          } else {
            /* Non-merged night-shift row.  Bio punches on the shift date that fall
               in the morning hours (<18:00) actually belong to the *previous* day's
               overnight tail and must NOT be shown here.  Instead:
               • keep only evening bio punches (≥18:00) from the shift date
               • append stored inTime1 if it is an evening time and not already in bio
               • pull morning bio punches (< 12:00) from the NEXT calendar day — those
                 are the overnight tail of *this* shift */
            const eveningBio  = allShiftDateBio.filter(t => timeToMins(t) >= 18 * 60);
            const nd          = nextDate(shiftDate);
            // Tighten the morning cutoff based on the shift's end time + OT window.
            // For Night Watcher (endTime1=05:00): cutoff = 05:00 + 4h = 09:00.
            // This prevents stale SL-as-UTC punches (shifted by +5:30) that fall
            // in the 09:00–11:59 range from polluting the punch sequence.
            const nightEndMins = empShift?.endTime1 ? timeToMins(empShift.endTime1) : 5 * 60;
            const morningCutoff = nightEndMins < 12 * 60
              ? Math.min(12 * 60, nightEndMins + 4 * 60)   // end + 4 h covers OT window + grace
              : 12 * 60;
            const nextMorning = (bioPunchesByEmpDate.get(`${empId}:${nd}`) ?? [])
              .filter(t => timeToMins(t) < morningCutoff);
            // Seed with stored evening punch if bio doesn't have it
            const storedEvening = storedPunches.filter(t => timeToMins(t) >= 18 * 60);
            const combined = [...new Set([...storedEvening, ...eveningBio, ...nextMorning])];
            // Sort: evening times first (≥18:00), then morning (00:00–11:59)
            combined.sort((a, b) => {
              const am = timeToMins(a), bm = timeToMins(b);
              const ae = am >= 18 * 60, be = bm >= 18 * 60;
              if (ae && !be) return -1;
              if (!ae && be) return 1;
              return am - bm;
            });
            bioPunches = combined;
          }
          rawPunches = (bioPunches.length > 0 ? bioPunches : storedPunches).slice(0, 13);
        }

        // For Night Watcher employees, compute OT from ALL raw punch times using
        // the correct checkpoint policy (0/1/2/3 h based on 05:xx/06:xx/07:xx presence).
        // This overrides the salary-engine's simplified estimate when bio data is available.
        const nightOtHours = (isNightEmp && rawPunches.length > 0 && rule.nightWatcherPayroll)
          ? calcNightWatcherOtFromAllPunches(rawPunches)
          : null;

        return {
          ...r.rec,
          status: r.effectiveStatus,
          employeeName: r.empName || "",
          employeeCode: r.empCode || "",
          designation: r.empDesignation || "",
          department: r.empDepartment || "",
          branchName: r.branchName || "",
          shiftId: r.empShiftId ?? null,
          shiftName: empShift?.name ?? sr.shiftName ?? null,
          createdAt: r.rec.createdAt.toISOString(),
          /* Night-shift flags — derived from assigned shift, not punch time */
          isNightShift: isNightEmp,
          isNightShiftMerged: (r as any)._nightShiftMerged ?? false,
          morningDate: (r as any)._morningDate ?? null,
          rawPunches,
          /* Policy-driven values — OT uses checkpoint-based calculation for Night Watcher */
          morningLateMinutes: sr.lateMinutes,
          lunchLateMinutes,
          overtimeHours: nightOtHours !== null ? nightOtHours : sr.otHours,
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

    // Holiday lookup for OT multipliers / status preservation in this month.
    const monthHolidays = await db.select().from(holidays)
      .where(and(gte(holidays.date, startDate), lte(holidays.date, endDate)));
    const holidayByDate = new Map<string, { type: "statutory" | "poya" | "public"; name: string }>();
    for (const h of monthHolidays) {
      const t = (h.type as string)?.toLowerCase();
      if (t === "statutory" || t === "poya" || t === "public") {
        holidayByDate.set(h.date, { type: t as any, name: h.name });
      }
    }

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
      let totalWorkHours = 0, overtimeHours = 0, regularOtHours = 0, holidayOtHours = 0, holidayWorkedDays = 0;
      let lunchLateDays = 0, totalMorningLateMinutes = 0, totalLunchLateMinutes = 0;

      for (const r of recs) {
        // Resolve day-wise shift variant (e.g. Kitchen on Sunday) from master.
        const dayShift = empShift ? resolveDayShift(empShift, r.date, shiftsByName as any) : undefined;
        const holidayInfo = holidayByDate.get(r.date) ?? null;
        // Salary engine = single source of truth
        const sr = processSalaryRow({
          date: r.date,
          shift: { name: dayShift?.name, startTime: dayShift?.startTime1, endTime: dayShift?.endTime1, graceMinutes: dayShift?.graceMinutes ?? empShift?.graceMinutes ?? null },
          weekoff: empWeekoff,
          holiday: holidayInfo,
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
        const recSource = (r as any).source as string | null | undefined;
        const recApproval = (r as any).approvalStatus as string | null | undefined;
        const storedStatus = r.status as string | null | undefined;
        const isAuthoritative = recSource === "manual" || recApproval === "approved";
        const st = storedStatus === "leave"   ? "leave"
                 : storedStatus === "holiday" ? "holiday"
                 : (isAuthoritative && storedStatus && ["present", "late", "half_day", "absent"].includes(storedStatus))
                   ? (storedStatus === "present" && sr.lateMinutes > 0 ? "late" : storedStatus)
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

        // Split OT into regular vs holiday
        if (sr.holidayWorked && sr.otHours > 0) {
          holidayOtHours += sr.otHours;
          holidayWorkedDays++;
        } else {
          regularOtHours += sr.otHours;
        }
        // Count any day employee punched in on a holiday (even if OT is 0)
        if (sr.holidayWorked && sr.otHours === 0) {
          holidayWorkedDays++;
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
        presentDays, absentDays, lateDays, halfDays, leaveDays, holidayDays, offDays, invalidDays,
        totalWorkHours: Math.round(totalWorkHours * 10) / 10,
        overtimeHours: Math.round(overtimeHours * 10) / 10,
        regularOtHours: Math.round(regularOtHours * 10) / 10,
        holidayOtHours: Math.round(holidayOtHours * 10) / 10,
        holidayWorkedDays,
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

    /* Load holidays so we can flag which OT days fall on a public/statutory holiday */
    const allHolidaysData = await db.select().from(holidays);
    const holidayByDate = new Map<string, { type: "statutory" | "poya" | "public"; name: string }>();
    for (const h of allHolidaysData) {
      const t = (h.type as string)?.toLowerCase();
      if (t === "statutory" || t === "poya" || t === "public") {
        holidayByDate.set(h.date, { type: t as any, name: h.name });
      }
    }
    const MULTIPLIERS: Record<string, number> = { statutory: 2.0, poya: 1.5, public: 1.5 };

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
          regularOtHours: 0,
          holidayOtHours: 0,
          overtimeDays: 0,
          holidayOtDays: 0,
          records: [],
        });
      }
      const entry = empMap.get(r.rec.employeeId);
      const otHrs = r.rec.overtimeHours || 0;
      const holidayInfo = holidayByDate.get(r.rec.date);
      const multiplier = holidayInfo ? MULTIPLIERS[holidayInfo.type] ?? 1 : 1;
      entry.totalOvertimeHours += otHrs;
      entry.overtimeDays++;
      if (holidayInfo) {
        entry.holidayOtHours += otHrs;
        entry.holidayOtDays++;
      } else {
        entry.regularOtHours += otHrs;
      }
      entry.records.push({
        date: r.rec.date,
        overtimeHours: otHrs,
        holidayType: holidayInfo?.type ?? null,
        holidayName: holidayInfo?.name ?? null,
        holidayMultiplier: holidayInfo ? multiplier : null,
      });
    }

    const totalOT = Array.from(empMap.values()).reduce((sum, e) => sum + e.totalOvertimeHours, 0);
    const totalHolidayOT = Array.from(empMap.values()).reduce((sum, e) => sum + e.holidayOtHours, 0);
    res.json({
      startDate: startDate as string,
      endDate: endDate as string,
      totalOvertimeHours: Math.round(totalOT * 10) / 10,
      totalHolidayOtHours: Math.round(totalHolidayOT * 10) / 10,
      employees: Array.from(empMap.values()).map(e => ({
        ...e,
        totalOvertimeHours: Math.round(e.totalOvertimeHours * 10) / 10,
        regularOtHours: Math.round(e.regularOtHours * 10) / 10,
        holidayOtHours: Math.round(e.holidayOtHours * 10) / 10,
      })),
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
