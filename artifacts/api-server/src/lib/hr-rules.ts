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
  earlyExitGraceMinutes: 15,
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
 * Calculate how many minutes an employee returned late from lunch.
 * Returns 0 if both times aren't present, or if actual break ≤ allocated break.
 *
 * @param outTime1     Time they left for lunch  ("HH:MM")
 * @param inTime2      Time they returned         ("HH:MM")
 * @param rule         Department/shift rule (lunchMinHours is the allocated lunch in hours)
 * @param stdLunchMins Fallback allocated lunch minutes when rule has no lunchMinHours (default 60)
 */
export function calcLunchLateMinutes(
  outTime1: string | null | undefined,
  inTime2: string | null | undefined,
  rule: DeptShiftRule,
  stdLunchMins = 60,
): number {
  if (!outTime1 || !inTime2) return 0;
  const actualLunchMins = timeToMins(inTime2) - timeToMins(outTime1);
  if (actualLunchMins <= 0) return 0;
  const allocatedLunchMins = rule.lunchMinHours != null ? rule.lunchMinHours * 60 : stdLunchMins;
  return Math.max(0, actualLunchMins - allocatedLunchMins);
}
