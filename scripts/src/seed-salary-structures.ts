/**
 * Seed salary structures for specific employees.
 * Run: cd scripts && pnpm tsx src/seed-salary-structures.ts
 */

import { db } from "@workspace/db";
import { employees, salaryStructures, employeeSalaryAssignments } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

// ── Data from the provided images ────────────────────────────────────────────
// employeeCode → basic salary (LKR)
const SALARY_DATA: { code: string; basic: number }[] = [
  { code: "HR-EMP-00002", basic: 32500 },
  { code: "HR-EMP-00003", basic: 32500 },
  { code: "HR-EMP-00004", basic: 36500 },
  { code: "HR-EMP-00005", basic: 53500 },
  { code: "HR-EMP-00021", basic: 31500 },
  { code: "HR-EMP-00006", basic: 34500 },
  { code: "SC-EMP-00005", basic: 32500 },
  { code: "SC-EMP-00006", basic: 32500 },
  { code: "HR-EMP-00010", basic: 60000 },
  { code: "HR-EMP-00007", basic: 37500 },
  { code: "HR-EMP-00022", basic: 80000 },
  { code: "HR-EMP-00026", basic: 55000 },
  { code: "HR-EMP-00008", basic: 37500 },
  { code: "SC-EMP-00001", basic: 120000 },
  { code: "HR-EMP-00015", basic: 120000 },
  { code: "HR-EMP-00023", basic: 120000 },
  { code: "HR-EMP-00018", basic: 80000 },
  { code: "HR-EMP-00024", basic: 120000 },
  { code: "HR-EMP-00011", basic: 100000 },
  { code: "HR-EMP-00012", basic: 35000 },
  { code: "HR-EMP-00013", basic: 35000 },
];

const EFFECTIVE_DATE = "2025-01-01";

async function run() {
  let created = 0, assigned = 0, updated = 0, notFound = 0;

  for (const { code, basic } of SALARY_DATA) {
    // 1. Look up employee
    const [emp] = await db
      .select({ id: employees.id, fullName: employees.fullName })
      .from(employees)
      .where(eq(employees.employeeId, code));

    if (!emp) {
      console.warn(`  ⚠  Not found: ${code}`);
      notFound++;
      continue;
    }

    const structName = emp.fullName;

    // 2. Get or create salary structure named after this employee
    let [existing] = await db
      .select({ id: salaryStructures.id })
      .from(salaryStructures)
      .where(eq(salaryStructures.name, structName));

    let structureId: number;

    if (existing) {
      structureId = existing.id;
      console.log(`  →  Structure exists: "${structName}" (id=${structureId})`);
    } else {
      const [newStruct] = await db
        .insert(salaryStructures)
        .values({
          name: structName,
          currency: "LKR",
          status: "active",
          earnings: JSON.stringify([{ component: "Basic", amount: basic }]),
          deductions: JSON.stringify([]),
          variablePay: JSON.stringify([]),
        })
        .returning({ id: salaryStructures.id });

      structureId = newStruct.id;
      console.log(`  ✔  Created structure: "${structName}" (id=${structureId})`);
      created++;
    }

    // 3. Upsert assignment
    const [existingAsgn] = await db
      .select({ id: employeeSalaryAssignments.id })
      .from(employeeSalaryAssignments)
      .where(eq(employeeSalaryAssignments.employeeId, emp.id));

    if (existingAsgn) {
      await db
        .update(employeeSalaryAssignments)
        .set({ salaryStructureId: structureId, basicAmount: basic, updatedAt: new Date() })
        .where(eq(employeeSalaryAssignments.employeeId, emp.id));
      console.log(`  ↺  Updated assignment: ${code} → "${structName}" @ ${basic.toLocaleString()}`);
      updated++;
    } else {
      await db.insert(employeeSalaryAssignments).values({
        employeeId: emp.id,
        salaryStructureId: structureId,
        basicAmount: basic,
        effectiveDate: EFFECTIVE_DATE,
      });
      console.log(`  ✔  Assigned: ${code} (${structName}) @ LKR ${basic.toLocaleString()}`);
      assigned++;
    }
  }

  console.log(`\nDone — Created=${created}  Assigned=${assigned}  Updated=${updated}  NotFound=${notFound}`);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
