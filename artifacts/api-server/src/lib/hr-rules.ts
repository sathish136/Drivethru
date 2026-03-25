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
  lunchMinHours: number | null;
  lunchMaxHours: number | null;
  flexible: boolean;
  multipleLogin: boolean;
  otMultiplier: number | null;
  offdayOtMultiplier: number | null;
  holidayOtMultiplier: number | null;
  weeklyLeaveDays: number | null;
  halfDayHours: number | null;
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
  lunchMinHours: 1,
  lunchMaxHours: 1,
  flexible: false,
  multipleLogin: false,
  otMultiplier: 1.5,
  offdayOtMultiplier: 1.5,
  holidayOtMultiplier: 1.5,
  weeklyLeaveDays: 1.5,
  halfDayHours: 4.5,
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
 * Calculate OT hours for a given record's effective hours.
 * Returns 0 if not OT-eligible.
 */
export function calcOtHours(effHours: number, rule: DeptShiftRule): number {
  if (!rule.otEligible) return 0;
  const threshold = rule.otAfterHours ?? rule.minHours;
  return Math.max(0, Math.round((effHours - threshold) * 100) / 100);
}

/**
 * Half-day threshold hours from rule, with fallback.
 */
export function halfDayThresholdHours(rule: DeptShiftRule): number {
  return rule.halfDayHours ?? 4.5;
}
