/**
 * Seed / upsert leave balances for specific employees.
 * Run: cd scripts && pnpm tsx src/seed-leave-balances.ts
 *
 * annualLeaveBalance = total entitlement (daysLeft + usedDays = 21)
 * annualLeaveUsed    = days already used
 */

import { db } from "@workspace/db";
import { leaveBalances, employees } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

// ── Data from the provided table ─────────────────────────────────────────────
// "Not Found" rows (no Days Left/Used given) are omitted — they default to 21/0 in the UI.
const YEAR = 2026;

const RECORDS: { code: string; balance: number; used: number }[] = [
  { code: "SC-EMP-00004", balance: 21,   used: 0    },
  { code: "HR-EMP-00026", balance: 21,   used: 3    },
  { code: "SC-EMP-00001", balance: 21,   used: 14.5 },
  { code: "HR-EMP-00021", balance: 21,   used: 11   },
  { code: "HR-EMP-00022", balance: 21,   used: 1    },
  { code: "HR-EMP-00023", balance: 21,   used: 12.5 },
  { code: "HR-EMP-00024", balance: 21,   used: 9.5  },
  { code: "HR-EMP-00027", balance: 21,   used: 22.5 },
  { code: "HR-EMP-00018", balance: 21,   used: 3    },
  { code: "SC-EMP-00003", balance: 21,   used: 13.5 },
  { code: "SC-EMP-00002", balance: 21,   used: 22.5 },
  { code: "HR-EMP-00005", balance: 21,   used: 5    },
  { code: "HR-EMP-00012", balance: 21,   used: 10   },
  { code: "HR-EMP-00006", balance: 21,   used: 0    },
  { code: "HR-EMP-00011", balance: 21,   used: 1    },
  { code: "HR-EMP-00008", balance: 21,   used: 10   },
  { code: "HR-EMP-00013", balance: 21,   used: 1    },
  { code: "HR-EMP-00020", balance: 21,   used: 14.5 },
  { code: "HR-EMP-00015", balance: 21,   used: 3.5  },
  { code: "HR-EMP-00010", balance: 21,   used: 0.5  },
  { code: "HR-EMP-00007", balance: 21,   used: 4    },
];

async function run() {
  // Load all employees once
  const allEmps = await db
    .select({ id: employees.id, employeeId: employees.employeeId, fullName: employees.fullName })
    .from(employees);
  const empMap = new Map(allEmps.map(e => [e.employeeId, e]));

  let created = 0, updated = 0, notFound = 0;

  for (const rec of RECORDS) {
    const emp = empMap.get(rec.code);
    if (!emp) {
      console.warn(`  ⚠  Employee not found: ${rec.code}`);
      notFound++;
      continue;
    }

    const [existing] = await db
      .select({ id: leaveBalances.id })
      .from(leaveBalances)
      .where(and(eq(leaveBalances.employeeId, emp.id), eq(leaveBalances.year, YEAR)));

    if (existing) {
      await db
        .update(leaveBalances)
        .set({
          annualLeaveBalance: rec.balance,
          casualLeaveBalance: 0,
          annualLeaveUsed: rec.used,
          casualLeaveUsed: 0,
          updatedAt: new Date(),
        })
        .where(eq(leaveBalances.id, existing.id));
      console.log(`  ↺  Updated: ${rec.code} (${emp.fullName}) — balance=${rec.balance} used=${rec.used} remaining=${rec.balance - rec.used}`);
      updated++;
    } else {
      await db.insert(leaveBalances).values({
        employeeId: emp.id,
        year: YEAR,
        annualLeaveBalance: rec.balance,
        casualLeaveBalance: 0,
        annualLeaveUsed: rec.used,
        casualLeaveUsed: 0,
      });
      console.log(`  ✔  Created: ${rec.code} (${emp.fullName}) — balance=${rec.balance} used=${rec.used} remaining=${rec.balance - rec.used}`);
      created++;
    }
  }

  console.log(`\nDone — Created=${created}  Updated=${updated}  NotFound=${notFound}`);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
