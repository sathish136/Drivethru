/**
 * Salary-run engine.
 *
 * Single source of truth for the payroll-ready attendance report.
 * Drives every late / OT / grace / day-type / remark decision off the
 * employee's assigned shift NAME from /shifts (mapped to a category) and
 * the employee's week-off schedule from /weekoffs.
 *
 * Categories (resolved from shift name):
 *   REGULAR     "Regular Shift"
 *   RECEPTION   "Receptionist Shift"
 *   KITCHEN     "Kitchen Shift" (+ day variants)
 *   FLEXIBLE    "Flexible Shift"
 *   NIGHT       "Night Watcher Shift"
 *   HALF_DAY    "Half Day Shift"
 */

import { timeToMins } from "./hr-rules.js";

export type ShiftCategory =
  | "REGULAR"
  | "RECEPTION"
  | "KITCHEN"
  | "FLEXIBLE"
  | "NIGHT"
  | "HALF_DAY";

export type DayType =
  | "WORKING_DAY"
  | "WEEK_OFF"
  | "WEEK_OFF_WORKED"
  | "HALF_DAY"
  | "ABSENT";

/** Common policy constants (per spec) */
export const LATE_GRACE_MINUTES = 15;
export const OT_THRESHOLD_MINUTES = 30;
export const LUNCH_GRACE_MINUTES = 10;
export const CHECKOUT_GRACE_MINUTES = 5;
export const FLEXIBLE_OT_AFTER_HOURS = 9.5; // 9 hrs 30 mins
export const HALF_DAY_HOURS = 5;

/**
 * Map shift name -> category.
 * Matching is case-insensitive and substring-based so day variants like
 * "Kitchen Shift - Sunday" still resolve to KITCHEN.
 */
export function categoryFromShiftName(name: string | null | undefined): ShiftCategory {
  const n = (name ?? "").toLowerCase().trim();
  if (!n) return "REGULAR";
  if (n.includes("night")) return "NIGHT";
  if (n.includes("recept")) return "RECEPTION";
  if (n.includes("kitchen")) return "KITCHEN";
  if (n.includes("flex")) return "FLEXIBLE";
  if (n.includes("half")) return "HALF_DAY";
  return "REGULAR";
}

/** Pretty label for remarks/UI */
export function categoryLabel(c: ShiftCategory): string {
  switch (c) {
    case "REGULAR":   return "Regular Shift";
    case "RECEPTION": return "Receptionist Shift";
    case "KITCHEN":   return "Kitchen Shift";
    case "FLEXIBLE":  return "Flexible Shift";
    case "NIGHT":     return "Night Watcher Shift";
    case "HALF_DAY":  return "Half Day Shift";
  }
}

/** "510" -> "08:30" */
function minsToTime(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Per-category late/OT thresholds. Times are HH:MM, minutes since midnight. */
function categoryDefaults(c: ShiftCategory): {
  startTime: string;
  endTime: string;
  lateAfter: string;     // late deduction starts after this clock time
  otAfter: string;       // OT counted after this clock time
} {
  switch (c) {
    case "REGULAR":   return { startTime: "08:00", endTime: "17:00", lateAfter: "08:15", otAfter: "17:30" };
    case "RECEPTION": return { startTime: "08:30", endTime: "17:30", lateAfter: "08:45", otAfter: "18:00" };
    case "KITCHEN":   return { startTime: "08:00", endTime: "17:00", lateAfter: "08:15", otAfter: "20:30" };
    case "FLEXIBLE":  return { startTime: "—",     endTime: "—",     lateAfter: "—",     otAfter: "—"     };
    case "NIGHT":     return { startTime: "20:00", endTime: "05:00", lateAfter: "—",     otAfter: "05:00" };
    case "HALF_DAY":  return { startTime: "08:00", endTime: "13:00", lateAfter: "08:15", otAfter: "—"     };
  }
}

/** "08:18" -> 18 (mins after the cutoff), or 0 if not late */
function lateMinutesAfter(inTime: string, cutoff: string): number {
  return Math.max(0, timeToMins(inTime) - timeToMins(cutoff));
}

/** Format minutes as "1 hr 15 mins" / "12 mins" */
function fmtDuration(mins: number): string {
  if (mins <= 0) return "0 mins";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h <= 0) return `${m} mins`;
  if (m <= 0) return `${h} hr${h > 1 ? "s" : ""}`;
  return `${h} hr${h > 1 ? "s" : ""} ${m} mins`;
}

/** Worked hours -> "8:18 hrs" style */
export function fmtHours(hours: number): string {
  const total = Math.max(0, Math.round(hours * 60));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h}:${String(m).padStart(2, "0")} hrs`;
}

/** True when the date (YYYY-MM-DD) falls on one of the JS getUTCDay numbers */
function dayOfWeek(dateStr: string): number {
  return new Date(dateStr + "T00:00:00Z").getUTCDay(); // 0=Sun..6=Sat
}

/** "2026-02-01" -> "Sunday" */
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export function dayNameOf(dateStr: string): string {
  return DAY_NAMES[dayOfWeek(dateStr)];
}

/**
 * Day-wise shift variant resolver — uses ONLY the existing /shifts master.
 *
 * If the employee is assigned a shift named "Kitchen Shift" and the master has
 * a row "Kitchen Shift - Sunday" that is active, that variant's start/end
 * times are used for that date. Otherwise the employee's base shift is used
 * unchanged. This keeps day-wise Kitchen timing within the existing module.
 */
export interface ShiftMasterRow {
  id: number;
  name: string;
  startTime1: string;
  endTime1: string;
  isActive: boolean;
}
export function resolveDayShift<T extends ShiftMasterRow | undefined | null>(
  baseShift: T,
  dateStr: string,
  shiftsByName: Map<string, ShiftMasterRow>,
): T {
  if (!baseShift) return baseShift;
  const variantKey = `${baseShift.name.trim().toLowerCase()} - ${dayNameOf(dateStr).toLowerCase()}`;
  const variant = shiftsByName.get(variantKey);
  if (variant && variant.isActive) {
    // Return a shallow override — keep id/name of variant so remarks reflect it.
    return { ...(baseShift as object), startTime1: variant.startTime1, endTime1: variant.endTime1 } as T;
  }
  return baseShift;
}

/* ── Night-shift hourly punch validation ───────────────────────────────── */

/**
 * Spec:
 *   0 missed hourly blocks → full 3 hrs OT
 *   1 missed hourly block  → deduct 1 hr OT
 *   2+ missed              → deduct 2 hrs OT (never more)
 *
 * The night window for which we expect hourly continuity is
 * 20:00 (start) → 05:00 (off), i.e. 9 hourly blocks. We treat each whole-hour
 * window as covered if at least one stored punch (in/out 1/2) falls inside it.
 *
 * Returns { otHours, missedBlocks, deductedHours }.
 */
export function nightShiftOt(rec: {
  inTime1?: string | null;
  outTime1?: string | null;
  inTime2?: string | null;
  outTime2?: string | null;
}): { otHours: number; missedBlocks: number; deductedHours: number } {
  const start = 20 * 60;     // 20:00
  const end   = 5 * 60 + 24 * 60; // 05:00 next day, normalized

  // Normalize each stored punch to the night-window timeline (add 24h if before start)
  const punches: number[] = [];
  for (const p of [rec.inTime1, rec.outTime1, rec.inTime2, rec.outTime2]) {
    if (!p) continue;
    let m = timeToMins(p);
    if (m < start) m += 24 * 60; // crossed midnight
    punches.push(m);
  }

  // Hourly blocks: [20-21, 21-22, …, 04-05]  → 9 blocks
  let covered = 0;
  let missed = 0;
  for (let blockStart = start; blockStart < end; blockStart += 60) {
    const blockEnd = blockStart + 60;
    const has = punches.some((m) => m >= blockStart && m < blockEnd);
    if (has) covered++;
    else missed++;
  }

  // No punches at all → no OT
  if (covered === 0) return { otHours: 0, missedBlocks: missed, deductedHours: 0 };

  const baseOt = 3;
  const deducted = missed === 0 ? 0 : missed === 1 ? 1 : 2;
  const otHours = Math.max(0, baseOt - deducted);
  return { otHours, missedBlocks: missed, deductedHours: deducted };
}

/* ── Inputs the engine needs from the caller ──────────────────────────── */

export interface ShiftInfo {
  /** Shift NAME from /shifts — drives category mapping */
  name: string | null | undefined;
  /** Optional override: assigned start (HH:MM). Falls back to category default. */
  startTime?: string | null;
  /** Optional override: assigned end (HH:MM). Falls back to category default. */
  endTime?: string | null;
}

export interface WeekOffInfo {
  /** offDays array from /weekoffs (0=Sun..6=Sat) */
  offDays: number[];
  /** halfDays array from /weekoffs (0=Sun..6=Sat) */
  halfDays: number[];
}

export interface AttendanceRow {
  date: string;            // "YYYY-MM-DD"
  inTime1?: string | null; // "HH:MM"
  outTime1?: string | null;
  inTime2?: string | null;
  outTime2?: string | null;
  totalHours?: number | null;
  /** Stored leaveType, if any */
  leaveType?: string | null;
}

/** Final payroll-ready row */
export interface SalaryRunRow {
  date: string;
  shiftCategory: ShiftCategory;
  shiftCategoryLabel: string;
  shiftName: string;
  shiftTime: string;       // "08:00 - 17:00" / "Flexible" / "—"
  weekOffStatus: string;   // "Off" | "Half Day" | "Working"
  firstIn: string | null;
  lastOut: string | null;
  workedHours: number;     // numeric hours, rounded to 2dp
  workedHoursLabel: string;// "8:18 hrs"
  lateMinutes: number;
  otHours: number;
  dayType: DayType;
  remarks: string;
  /** Per-row trace bits for audit */
  graceApplied: { lunch: boolean; checkout: boolean };
}

/**
 * Process a single (employee × date × shift × weekoff × punches) into a
 * payroll-ready row.  All policy decisions live here.
 */
export function processSalaryRow(opts: {
  date: string;
  shift: ShiftInfo | null | undefined;
  weekoff: WeekOffInfo | null | undefined;
  rec: AttendanceRow | null | undefined;
}): SalaryRunRow {
  const { date, shift, weekoff, rec } = opts;
  const category = categoryFromShiftName(shift?.name);
  const defaults = categoryDefaults(category);

  // Resolve effective shift times — assigned start/end take precedence (Kitchen day variants)
  const startTime = shift?.startTime || defaults.startTime;
  const endTime   = shift?.endTime   || defaults.endTime;
  const shiftTime = category === "FLEXIBLE"
    ? "Flexible"
    : (startTime && endTime && startTime !== "—" ? `${startTime} - ${endTime}` : "—");

  const dow = dayOfWeek(date);
  const isOff = !!weekoff?.offDays?.includes(dow);
  const isHalfDayScheduled = !!weekoff?.halfDays?.includes(dow);
  const weekOffStatus = isOff ? "Off" : isHalfDayScheduled ? "Half Day" : "Working";

  const firstIn = rec?.inTime1 ?? null;
  const lastOut = rec?.outTime2 ?? rec?.outTime1 ?? null;
  const workedHoursRaw = rec?.totalHours ?? 0;
  const workedHours = Math.round(workedHoursRaw * 100) / 100;

  /* ── Day-type classification ─────────────────────────────────────── */
  // Did the employee actually work? Use a small lower bound to ignore noise punches.
  const hasWork = workedHoursRaw > 0.25 || !!firstIn;

  // Effective shift duration in hours (used by half-day & OT thresholds).
  // Falls back to 9 hrs when undefined or category is FLEXIBLE/NIGHT.
  const shiftDurationHours = (() => {
    if (category === "FLEXIBLE" || category === "NIGHT") return 9;
    if (!startTime || !endTime || startTime === "—" || endTime === "—") return 9;
    const s = timeToMins(startTime);
    const e = timeToMins(endTime);
    const span = e > s ? e - s : (24 * 60 - s) + e;
    return Math.max(1, span / 60);
  })();
  // 50% of shift duration is the half-day threshold per policy.
  const halfDayThresholdHours = Math.max(2, shiftDurationHours * 0.5);

  let dayType: DayType;
  if (rec?.leaveType) {
    // Leaves are out of scope for salary-run day-type — surface as ABSENT day so payroll handles via leave routes.
    // (Kept conservative — we never silently downgrade a leave to "WORKING_DAY".)
    dayType = "ABSENT";
  } else if (isOff) {
    dayType = hasWork ? "WEEK_OFF_WORKED" : "WEEK_OFF";
  } else if (!hasWork) {
    dayType = "ABSENT";
  } else if (isHalfDayScheduled || category === "HALF_DAY") {
    // Scheduled half-day: completed if they showed up; remarks differentiate
    dayType = "HALF_DAY";
  } else if (workedHoursRaw < halfDayThresholdHours) {
    // Worked some but under 50% of shift → HALF_DAY (not ABSENT).
    dayType = "HALF_DAY";
  } else {
    dayType = "WORKING_DAY";
  }

  /* ── Late minutes ─────────────────────────────────────────────────── */
  let lateMinutes = 0;
  if (
    dayType !== "ABSENT" &&
    dayType !== "WEEK_OFF" &&
    category !== "FLEXIBLE" &&
    category !== "NIGHT"
  ) {
    if (firstIn) {
      // Late cutoff = assigned/category start + 15-min general grace, OR the
      // category's explicit lateAfter when it differs (e.g. Reception 08:45).
      // For Kitchen with a varied assigned start we use start + 15.
      const cutoff = (() => {
        if (category === "REGULAR")   return defaults.lateAfter;          // 08:15
        if (category === "RECEPTION") return defaults.lateAfter;          // 08:45
        if (category === "HALF_DAY")  return defaults.lateAfter;          // 08:15
        // KITCHEN → assigned start + 15
        return minsToTime(timeToMins(startTime) + LATE_GRACE_MINUTES);
      })();
      lateMinutes = lateMinutesAfter(firstIn, cutoff);
    }
  }

  /* ── OT hours ─────────────────────────────────────────────────────── */
  let otHours = 0;
  let nightTrace: { missedBlocks: number; deductedHours: number } | null = null;

  if (dayType !== "ABSENT" && rec) {
    if (category === "NIGHT") {
      const r = nightShiftOt(rec);
      otHours = r.otHours;
      nightTrace = { missedBlocks: r.missedBlocks, deductedHours: r.deductedHours };
    } else if (category === "FLEXIBLE") {
      otHours = workedHoursRaw > FLEXIBLE_OT_AFTER_HOURS
        ? Math.round((workedHoursRaw - FLEXIBLE_OT_AFTER_HOURS) * 100) / 100
        : 0;
    } else if (lastOut) {
      const otStart = defaults.otAfter;
      if (otStart && otStart !== "—") {
        const outMins = timeToMins(lastOut);
        const otStartMins = timeToMins(otStart);
        const overMins = outMins - otStartMins;
        // OT completion guard: the person must have actually completed the
        // shift (worked hrs ≥ shift duration − 30 min). Prevents bugs like
        // "came in at 14:02, left at 20:00 → 2.5h OT" on a Regular Shift.
        const completedShift = workedHoursRaw >= shiftDurationHours - 0.5;
        // 30-minute threshold: only count OT once over by ≥ threshold,
        // and the counted minutes are the full minutes past otStart.
        if (completedShift && overMins >= OT_THRESHOLD_MINUTES) {
          otHours = Math.round((overMins / 60) * 100) / 100;
        }
      }
    }
  }

  /* ── Grace tracking (for remarks) ─────────────────────────────────── */
  const graceApplied = { lunch: false, checkout: false };
  if (rec?.outTime1 && rec?.inTime2) {
    const lunchMins = timeToMins(rec.inTime2) - timeToMins(rec.outTime1);
    if (lunchMins > 0 && lunchMins <= 60 + LUNCH_GRACE_MINUTES) {
      graceApplied.lunch = true;
    }
  }
  if (lastOut && category !== "FLEXIBLE" && category !== "NIGHT" && defaults.endTime !== "—") {
    const out = timeToMins(lastOut);
    const end = timeToMins(endTime);
    if (out >= end - CHECKOUT_GRACE_MINUTES && out < end) {
      graceApplied.checkout = true;
    }
  }

  /* ── Dynamic remarks ──────────────────────────────────────────────── */
  const remarks = buildRemarks({
    category, dayType, lateMinutes, otHours, graceApplied, night: nightTrace,
  });

  return {
    date,
    shiftCategory: category,
    shiftCategoryLabel: categoryLabel(category),
    shiftName: shift?.name ?? categoryLabel(category),
    shiftTime,
    weekOffStatus,
    firstIn,
    lastOut,
    workedHours,
    workedHoursLabel: fmtHours(workedHoursRaw),
    lateMinutes,
    otHours,
    dayType,
    remarks,
    graceApplied,
  };
}

function buildRemarks(args: {
  category: ShiftCategory;
  dayType: DayType;
  lateMinutes: number;
  otHours: number;
  graceApplied: { lunch: boolean; checkout: boolean };
  night: { missedBlocks: number; deductedHours: number } | null;
}): string {
  const { category, dayType, lateMinutes, otHours, graceApplied, night } = args;
  const label = categoryLabel(category);
  const parts: string[] = [];

  // Day-type primary remark
  if (dayType === "WEEK_OFF") {
    return "Week Off - Not worked";
  }
  if (dayType === "WEEK_OFF_WORKED") {
    parts.push("Week Off - Worked");
    if (otHours > 0) parts.push(`OT ${fmtDuration(Math.round(otHours * 60))}`);
    return parts.join(" / ");
  }
  if (dayType === "ABSENT") {
    return `${label} - Absent`;
  }
  if (dayType === "HALF_DAY") {
    parts.push(`${label} - Half Day Completed`);
    if (lateMinutes > 0) parts.push(`Late by ${fmtDuration(lateMinutes)}`);
    return parts.join(" / ");
  }

  // WORKING_DAY — category-specific phrasing
  switch (category) {
    case "FLEXIBLE":
      parts.push(`${label} - No late deduction`);
      if (otHours > 0) parts.push(`OT applied after 9.30 hrs - ${fmtDuration(Math.round(otHours * 60))}`);
      break;

    case "NIGHT":
      if (night && night.deductedHours === 0 && otHours > 0) {
        parts.push(`${label} - 3 hrs OT added`);
      } else if (night && night.deductedHours === 1) {
        parts.push(`${label} - 1 hr OT deducted due to missed hourly punch`);
      } else if (night && night.deductedHours >= 2) {
        parts.push(`${label} - 2 hrs OT deducted due to multiple missed punches`);
      } else {
        parts.push(`${label} - No OT`);
      }
      break;

    case "KITCHEN":
      if (lateMinutes > 0) parts.push(`${label} - Late by ${fmtDuration(lateMinutes)}`);
      else parts.push(`${label} - Within grace`);
      if (otHours > 0) parts.push(`OT ${fmtDuration(Math.round(otHours * 60))} after 8:30 PM`);
      break;

    case "RECEPTION":
    case "REGULAR":
    case "HALF_DAY":
    default:
      if (lateMinutes > 0) parts.push(`${label} - Late by ${fmtDuration(lateMinutes)}`);
      else parts.push(`${label} - Within grace`);
      if (otHours > 0) parts.push(`OT ${fmtDuration(Math.round(otHours * 60))}`);
      break;
  }

  if (graceApplied.lunch) parts.push("Lunch grace applied");
  if (graceApplied.checkout) parts.push("Checkout grace applied");

  return parts.join(" / ");
}
