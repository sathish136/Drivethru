import { db } from "@workspace/db";
import { hrSettings } from "@workspace/db/schema";

/* ─── Type matching the front-end DeptShiftRule ─────────────── */
export interface DeptShiftRule {
  id: string;
  department: string;
  shift: string;
  minHours: number;
  maxHours: number | null;
  otEligible: boolean;
  otAfterHours: number | null;
  lateGraceMinutes: number | null;
  earlyExitGraceMinutes: number | null;
  lunchMinHours: number | null;
  lunchMaxHours: number | null;
  flexible: boolean;
  multipleLogin: boolean;
  otMultiplier: number | null;
  offdayOtMultiplier: number | null;
  holidayOtMultiplier: number | null;
  weeklyLeaveDays: number | null;
  halfDayHours: number | null;
  minPresentHours: number | null;
  remarks: string;
  notes: string;
  /** Saturday scheduled shift length in hours (e.g. 5 for 8am–1pm). When set,
   *  Saturday records only need this many hours to count as PRESENT. */
  saturdayShiftHours: number | null;
  /** Shift start time on Sundays if different from the regular startTime1
   *  (e.g. "08:00" for Kitchen staff who start at 8 am on Sundays vs 7 am
   *  on weekdays). Used for late calculation on Sundays. */
  sundayStartTime: string | null;
  /**
   * Fixed clock time (HH:MM, 24-hr) after which OT starts accumulating.
   * When set, OT = max(0, lastCheckout − otStartTime) instead of the
   * default hours-based calculation.
   *
   * Examples:
   *  - Kitchen shift: "20:30"  (OT after 8:30 pm)
   *  - Night Watcher: "05:00"  (OT after 5 am — shift ends, runs to 8 am)
   *
   * Set to null to use the existing hours-based (otAfterHours) approach.
   */
  otStartTime: string | null;
  /**
   * Night Watcher / security hourly-punch policy.
   * When > 0, each missed expected hourly punch deducts this many hours from
   * the employee's OT for that day.
   *
   * Policy: "They must punch every hr and if they forgot punch a hr then
   * deduct 1 or 2 hrs from their 3hrs OT."
   *
   * Expected punches = ceil(shiftHours) — one punch per scheduled hour.
   * Actual punches derived from the punch pairs (inTime1/outTime1/inTime2/outTime2).
   * Set to null when not applicable.
   */
  nightWatcherMissedPunchDeductHours: number | null;
}

export const DEFAULT_RULE: DeptShiftRule = {
  id: "_default",
  department: "General",
  shift: "Regular",
  minHours: 9,
  maxHours: 9,
  otEligible: true,
  otAfterHours: 9.5,
  lateGraceMinutes: 15,
  // Policy note: "Last check out 5 minutes grace periods"
  // earlyExitGraceMinutes = 0 so the +5 constant in computeEffectiveStatus
  // yields exactly a 5-minute checkout grace for ALL shifts by default.
  earlyExitGraceMinutes: 0,
  lunchMinHours: 1,
  lunchMaxHours: 1,
  flexible: false,
  multipleLogin: false,
  otMultiplier: 1.5,
  offdayOtMultiplier: 1.5,
  holidayOtMultiplier: 1.5,
  weeklyLeaveDays: 1.5,
  halfDayHours: 5,
  minPresentHours: 8,
  remarks: "",
  notes: "Default fallback rule",
  saturdayShiftHours: null,
  sundayStartTime: null,
  otStartTime: null,
  nightWatcherMissedPunchDeductHours: null,
};

/**
 * Load department shift rules from the hr_settings table.
 * Returns an empty array (falls back to DEFAULT_RULE) if the stored JSON
 * is in the old format or missing.
 */
export async function loadDeptRules(): Promise<DeptShiftRule[]> {
  const [row] = await db.select().from(hrSettings);
  if (!row) return [];
  try {
    const parsed = JSON.parse(row.departmentRules) as any[];
    if (Array.isArray(parsed) && parsed.length > 0
        && "department" in parsed[0] && "shift" in parsed[0]) {
      return parsed as DeptShiftRule[];
    }
  } catch { /* malformed JSON */ }
  return [];
}

/**
 * Find the best matching rule for an employee's department AND shift.
 * Matching strategy (case-insensitive):
 *   1. Exact department + exact shift name match
 *   2. Exact department match (any shift)
 *   3. Partial department match (substring containment)
 *   4. DEFAULT_RULE as fallback
 */
export function findRule(
  rules: DeptShiftRule[],
  department: string,
  shiftName?: string | null,
): DeptShiftRule {
  const dept  = (department ?? "").toLowerCase().trim();
  const shift = (shiftName  ?? "").toLowerCase().trim();

  // 1. Exact dept + exact shift
  if (shift) {
    const both = rules.find(
      r => r.department.toLowerCase().trim() === dept &&
           r.shift.toLowerCase().trim() === shift,
    );
    if (both) return both;
  }

  // 2. Exact dept match (first one found)
  const exactDept = rules.find(r => r.department.toLowerCase().trim() === dept);
  if (exactDept) return exactDept;

  // 3. Partial match
  const partial = rules.find(r => {
    const rd = r.department.toLowerCase().trim();
    return dept.includes(rd) || rd.includes(dept);
  });
  if (partial) return partial;

  return DEFAULT_RULE;
}

/** Convert "HH:MM" string to total minutes since midnight */
export function timeToMins(t: string): number {
  const [h, m] = (t ?? "00:00").split(":").map(Number);
  return h * 60 + m;
}

/**
 * Given a rule and an employee's shift start time string ("HH:MM"),
 * return the late threshold in minutes since midnight.
 */
export function lateCutoffMins(rule: DeptShiftRule, shiftStartTime: string | null | undefined): number {
  const start = shiftStartTime ? timeToMins(shiftStartTime) : 8 * 60; // default 08:00
  const grace = rule.lateGraceMinutes ?? 15;
  return start + grace;
}

/**
 * Effective lunch hours to deduct for a given rule.
 * Uses the minimum of the lunch range to be conservative.
 */
export function lunchDeductHours(rule: DeptShiftRule): number {
  if (rule.lunchMinHours == null) return 0;
  return rule.lunchMinHours;
}

/**
 * Given raw totalHours from attendance, subtract lunch and return effective work hours.
 */
export function effectiveHours(rawHours: number, rule: DeptShiftRule): number {
  return Math.max(0, rawHours - lunchDeductHours(rule));
}

/**
 * Calculate OT hours for a given attendance record.
 *
 * Policy:
 *  - otAfterHours is the TOTAL CLOCK TIME threshold (including lunch break).
 *    e.g. 9.5 = 8h scheduled work + 1h lunch + 0.5h minimum OT buffer.
 *  - OT only accrues when rawHours exceeds this threshold.
 *  - OT hours = effective work hours beyond (threshold − lunchHours).
 *  - earlyMinutes: minutes signed-in BEFORE shift start are excluded from OT.
 */
export function calcOtHours(
  rawHours: number,
  rule: DeptShiftRule,
  earlyMinutes = 0,
): number {
  if (!rule.otEligible) return 0;

  /* Remove early-sign-in time (before shift start) from raw hours */
  const adjustedRaw = Math.max(0, rawHours - earlyMinutes / 60);

  const threshold = rule.otAfterHours ?? rule.minHours; // total clock-time threshold
  if (adjustedRaw <= threshold) return 0;

  const lunchH       = lunchDeductHours(rule);
  const effHours     = Math.max(0, adjustedRaw - lunchH);
  const effThreshold = Math.max(0, threshold - lunchH);

  return Math.round(Math.max(0, effHours - effThreshold) * 100) / 100;
}

/**
 * Half-day threshold hours from rule, with fallback.
 */
export function halfDayThresholdHours(rule: DeptShiftRule): number {
  return rule.halfDayHours ?? 5;
}

/**
 * Returns true when the shift is a night shift (start time ≥ 18:00).
 */
export function isNightShiftRecord(shiftStartTime: string | null | undefined): boolean {
  if (!shiftStartTime) return false;
  return timeToMins(shiftStartTime) >= 18 * 60;
}

/**
 * Compute the effective attendance status for a single record, applying all
 * HR-policy corrections:
 *
 *  1. Flexible-shift employees are never "late".  Any stored "late" is reset to "present".
 *  2. Non-flexible employees are re-checked for late arrival against the shift start
 *     (uses sundayStartTime on Sundays when rule provides it).
 *  3. Hours-based status with checkout grace:
 *      - On Saturdays with `saturdayShiftHours`, uses that as the full-day reference.
 *      - Otherwise uses `minPresentHours`.
 *
 * This is the single source of truth shared by the attendance report and payroll engines.
 */
export function computeEffectiveStatus(
  rec: {
    status: string;
    inTime1?: string | null;
    totalHours?: number | null;
  },
  empShift: { startTime1?: string | null; graceMinutes?: number | null } | null | undefined,
  rule: DeptShiftRule,
  date: string,           // "YYYY-MM-DD"
): string {
  let st = rec.status;

  const dayOfWeek = new Date(date + "T00:00:00Z").getUTCDay(); // 0=Sun, 6=Sat
  const isSaturday = dayOfWeek === 6;
  const isSunday   = dayOfWeek === 0;

  // 1. Late check
  if (rule.flexible) {
    if (st === "late") st = "present";
  } else if ((st === "present" || st === "late") && rec.inTime1) {
    const baseStart = (isSunday && rule.sundayStartTime)
      ? rule.sundayStartTime
      : empShift?.startTime1;
    const shiftStartMins = baseStart ? timeToMins(baseStart) : 8 * 60;
    const grace          = rule.lateGraceMinutes ?? (empShift?.graceMinutes ?? 15);
    const isLate         = timeToMins(rec.inTime1) > shiftStartMins + grace;
    if (st === "present" && isLate)  st = "late";
    if (st === "late"    && !isLate) st = "present";
  }

  // 2. Hours-based status with checkout grace
  if ((st === "present" || st === "late") && rec.totalHours != null) {
    const halfDayHrs    = rule.halfDayHours ?? 5;
    const minPresentHrs = rule.minPresentHours ?? 8;
    const earlyExitGraceHrs = ((rule.earlyExitGraceMinutes ?? rule.lateGraceMinutes ?? 15) + 5) / 60;

    const effectiveHalfDayHrs = (isSaturday && rule.saturdayShiftHours != null)
      ? rule.saturdayShiftHours / 2
      : halfDayHrs;
    const presentThreshold = (isSaturday && rule.saturdayShiftHours != null)
      ? Math.max(effectiveHalfDayHrs + 0.01, rule.saturdayShiftHours - earlyExitGraceHrs)
      : Math.max(halfDayHrs + 0.01, minPresentHrs - earlyExitGraceHrs);

    if (rec.totalHours < effectiveHalfDayHrs) st = "absent";
    else if (rec.totalHours < presentThreshold) st = "half_day";
  }

  return st;
}

/**
 * ── TIME-BASED OT ────────────────────────────────────────────────────────────
 *
 * Used for Kitchen Shift ("OT after 8:30 pm") and Night Watcher Shift
 * ("actual off time 8 am — add 3 hours OT").
 *
 * Instead of counting hours worked, we look at the actual clock time the
 * employee left (lastCheckoutTime) and compare it to a fixed OT-start time
 * (rule.otStartTime).  Any minutes past that fixed threshold are OT.
 *
 * Night-shift midnight crossover: when the checkout time (HH:MM) is earlier
 * than the OT-start time — meaning the employee crossed midnight — we add
 * 24 hours to the checkout to compute the correct difference.
 *
 * @param lastCheckoutTime  "HH:MM" of the last recorded checkout (outTime2 ?? outTime1)
 * @param otStartTime       "HH:MM" fixed clock time after which OT begins
 * @param isNightShift      true when the shift crosses midnight (start ≥ 18:00)
 * @returns OT hours (rounded to 2 dp), 0 when lastCheckoutTime is missing or before threshold
 */
export function calcTimeBasedOtHours(
  lastCheckoutTime: string | null | undefined,
  otStartTime: string,
  isNightShift = false,
): number {
  if (!lastCheckoutTime) return 0;

  let checkoutMins = timeToMins(lastCheckoutTime);
  const otStartMins = timeToMins(otStartTime);

  // Night-shift crossover: e.g. Night Watcher otStartTime = "05:00",
  // checkout "07:30" → 7*60+30 = 450 < 300 (05:00) is FALSE for this example,
  // but for otStartTime "20:30" with checkout "23:00" it is also fine.
  // The crossover only matters when the shift spans midnight and the checkout
  // timestamp is on the NEXT calendar day (i.e., checkout HH:MM < otStartTime HH:MM).
  if (isNightShift && checkoutMins < otStartMins) {
    checkoutMins += 24 * 60;
  }

  const otMins = Math.max(0, checkoutMins - otStartMins);
  return Math.round((otMins / 60) * 100) / 100;
}

/**
 * ── NIGHT WATCHER HOURLY-PUNCH DEDUCTION ─────────────────────────────────────
 *
 * Policy: Night Watchers must punch the biometric reader every hour during
 * their shift.  If a punch is missed, 1–2 hours are deducted from their OT.
 *
 * Implementation:
 *  - expectedPunches  = number of scheduled shift hours (e.g. 9 for 8pm–5am)
 *  - recordedPunches  = number of non-null time fields captured in the record
 *                       (inTime1, outTime1, inTime2, outTime2 each count as 1)
 *  - missedPunches    = max(0, expectedPunches − recordedPunches)
 *  - OT deduction hrs = missedPunches × rule.nightWatcherMissedPunchDeductHours
 *
 * The result is subtracted from the calculated OT hours; it cannot make OT go
 * below zero.
 *
 * @param rec                             Attendance record for the night
 * @param shiftScheduledHours             Scheduled shift length in hours (e.g. 9)
 * @param deductHoursPerMissedPunch       From rule.nightWatcherMissedPunchDeductHours
 * @returns Hours to deduct from the employee's OT for this record
 */
export function calcNightWatcherPunchDeduction(
  rec: {
    inTime1?: string | null;
    outTime1?: string | null;
    inTime2?: string | null;
    outTime2?: string | null;
  },
  shiftScheduledHours: number,
  deductHoursPerMissedPunch: number,
): number {
  const expectedPunches = Math.ceil(shiftScheduledHours);

  // Count how many time-stamp slots are actually recorded for this day
  const recordedPunches = [rec.inTime1, rec.outTime1, rec.inTime2, rec.outTime2]
    .filter(t => t != null && t !== "").length;

  const missed = Math.max(0, expectedPunches - recordedPunches);
  return Math.round(missed * deductHoursPerMissedPunch * 100) / 100;
}

/**
 * Calculate how many minutes an employee returned late from lunch.
 * Returns 0 if both times aren't present, or if actual break ≤ allocated break + grace.
 *
 * Policy: "Lunch out add 10 minutes grace" — employees have allocated + 10 min before
 * a lunch-late deduction applies.
 *
 * @param outTime1     Time they left for lunch  ("HH:MM")
 * @param inTime2      Time they returned         ("HH:MM")
 * @param rule         Department/shift rule (lunchMinHours is the allocated lunch in hours)
 * @param stdLunchMins Fallback allocated lunch minutes when rule has no lunchMinHours (default 60)
 * @param lunchGraceMins Extra grace minutes on top of allocated lunch (policy default: 10)
 */
export function calcLunchLateMinutes(
  outTime1: string | null | undefined,
  inTime2: string | null | undefined,
  rule: DeptShiftRule,
  stdLunchMins = 60,
  lunchGraceMins = 10,
): number {
  if (!outTime1 || !inTime2) return 0;
  const actualLunchMins = timeToMins(inTime2) - timeToMins(outTime1);
  if (actualLunchMins <= 0) return 0;
  // Allocated lunch + 10-minute grace period per policy
  const allocatedLunchMins = (rule.lunchMinHours != null ? rule.lunchMinHours * 60 : stdLunchMins) + lunchGraceMins;
  return Math.max(0, actualLunchMins - allocatedLunchMins);
}
