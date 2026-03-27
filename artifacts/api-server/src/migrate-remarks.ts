import { pool } from "@workspace/db";

const REMARKS: Record<string, string> = {
  // Security - Night Watchers
  "6":  "Actual shift 8pm-5am. Apply OT if they punch more than scheduled hours. If punch is missed for 1hr, deduct 1-2 hrs from their 3hrs OT.",
  "7":  "Actual shift 8pm-5am. Apply OT if they punch more than scheduled hours. If punch is missed for 1hr, deduct 1-2 hrs from their 3hrs OT.",
  "44": "Actual shift 8pm-5am. Apply OT if they punch more than scheduled hours. If punch is missed for 1hr, deduct 1-2 hrs from their 3hrs OT.",
  "45": "Actual shift 8pm-5am. Apply OT if they punch more than scheduled hours. If punch is missed for 1hr, deduct 1-2 hrs from their 3hrs OT.",
  // Maintenance / Gardener + House Keeping (Regular Shift)
  "9":  "Late deduction after 8:15 am / OT after 5:30pm",
  "41": "Late deduction after 8:15 am / OT after 5:30pm",
  "42": "Late deduction after 8:15 am / OT after 5:30pm",
  "47": "Late deduction after 8:15 am / OT after 5:30pm",
  "50": "Late deduction after 8:15 am / OT after 5:30pm",
  "13": "Late deduction after 8:15 am / OT after 5:30pm",
  "18": "Late deduction after 8:15 am / OT after 5:30pm",
  // Kitchen - 3hr OT
  "34": "Apply late deduction after 15 minutes if late / Add 3 hr OT after 8:30pm",
  "46": "Apply late deduction after 15 minutes if late / Add 3 hr OT after 8:30pm",
  "57": "Apply late deduction after 15 minutes if late / Add 3 hr OT after 8:30pm",
  // Kitchen - 1hr OT
  "58": "Apply late deduction after 15 minutes if late / Add 1 hr OT after 8:30pm",
  "59": "Apply late deduction after 15 minutes if late / Add 1 hr OT after 8:30pm",
  // Surf Instructors
  "48": "No late hr deduction / Add OT if exceed total hrs 9.30hrs",
  "53": "No late hr deduction / Add OT if exceed total hrs 9.30hrs",
  "54": "No late hr deduction / Add OT if exceed total hrs 9.30hrs",
  "56": "No late hr deduction / Add OT if exceed total hrs 9.30hrs",
  "5":  "No late hr deduction / Add OT if exceed total hrs 9.30hrs",
  // Admin / Manager / Receptionist
  "55": "No OT / No late hr deductions",
  "52": "No OT / No late hr deductions",
  "49": "No OT / No late hr deductions",
};

async function main() {
  await pool.query("ALTER TABLE employees ADD COLUMN IF NOT EXISTS remarks TEXT");
  console.log("✓ Ensured remarks column exists");

  for (const [bioId, remark] of Object.entries(REMARKS)) {
    const result = await pool.query(
      "UPDATE employees SET remarks = $1 WHERE biometric_id = $2 RETURNING full_name, biometric_id",
      [remark, bioId]
    );
    if (result.rows.length > 0) {
      result.rows.forEach((r: any) => console.log(`✓ ${r.full_name} (bio:${r.biometric_id})`));
    } else {
      console.log(`⚠ No employee found with biometric_id = ${bioId}`);
    }
  }

  console.log("\n✓ All remarks seeded!");
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
