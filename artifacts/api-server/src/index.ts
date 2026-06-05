import app from "./app";
import { startZkAdmsServer } from "./zk-adms-server.js";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const KITCHEN_WEEKLY = JSON.stringify([
  { startTime: "08:00", endTime: "20:00", lunchBreakMinutes: 60,  isOff: false, isHalfDay: false },
  { startTime: "07:00", endTime: "21:00", lunchBreakMinutes: 120, isOff: false, isHalfDay: false },
  { startTime: "07:00", endTime: "21:00", lunchBreakMinutes: 120, isOff: false, isHalfDay: false },
  { startTime: "07:00", endTime: "21:00", lunchBreakMinutes: 120, isOff: false, isHalfDay: false },
  { startTime: "07:00", endTime: "21:00", lunchBreakMinutes: 120, isOff: false, isHalfDay: false },
  { startTime: "07:00", endTime: "21:00", lunchBreakMinutes: 120, isOff: false, isHalfDay: false },
  { startTime: "08:00", endTime: "14:00", lunchBreakMinutes: 0,   isOff: false, isHalfDay: true  },
]);

async function runStartupMigrations() {
  const migrations = [
    /* ── Fix sequences not linked to id columns (from pg_dump restore without defaults) ── */
    `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='activity_logs' AND column_name='id' AND column_default IS NOT NULL) THEN
        ALTER TABLE activity_logs ALTER COLUMN id SET DEFAULT nextval('activity_logs_id_seq');
      END IF;
    END $$`,
    `DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='branches') THEN
        BEGIN ALTER TABLE branches ALTER COLUMN id SET DEFAULT nextval('branches_id_seq'); EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE employees ALTER COLUMN id SET DEFAULT nextval('employees_id_seq'); EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE attendance_records ALTER COLUMN id SET DEFAULT nextval('attendance_records_id_seq'); EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE biometric_devices ALTER COLUMN id SET DEFAULT nextval('biometric_devices_id_seq'); EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE biometric_logs ALTER COLUMN id SET DEFAULT nextval('biometric_logs_id_seq'); EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE holidays ALTER COLUMN id SET DEFAULT nextval('holidays_id_seq'); EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE departments ALTER COLUMN id SET DEFAULT nextval('departments_id_seq'); EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE hr_settings ALTER COLUMN id SET DEFAULT nextval('hr_settings_id_seq'); EXCEPTION WHEN OTHERS THEN NULL; END;
      END IF;
    END $$`,
    /* ── New tables ── */
    `CREATE TABLE IF NOT EXISTS weekoff_schedules (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      off_days TEXT NOT NULL DEFAULT '[]',
      half_days TEXT NOT NULL DEFAULT '[]',
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS salary_structures (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'LKR',
      status TEXT NOT NULL DEFAULT 'active',
      earnings TEXT NOT NULL DEFAULT '[]',
      deductions TEXT NOT NULL DEFAULT '[]',
      variable_pay TEXT NOT NULL DEFAULT '[]',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS staff_loans (
      id SERIAL PRIMARY KEY,
      employee_id INTEGER NOT NULL REFERENCES employees(id),
      type TEXT NOT NULL DEFAULT 'loan',
      total_amount REAL NOT NULL,
      monthly_installment REAL NOT NULL,
      start_month INTEGER NOT NULL,
      start_year INTEGER NOT NULL,
      paid_amount REAL NOT NULL DEFAULT 0,
      remaining_balance REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      description TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS staff_incentives (
      id SERIAL PRIMARY KEY,
      employee_id INTEGER NOT NULL REFERENCES employees(id),
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      type TEXT NOT NULL DEFAULT 'other',
      amount REAL NOT NULL,
      reason TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      notes TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS leave_balances (
      id SERIAL PRIMARY KEY,
      employee_id INTEGER NOT NULL REFERENCES employees(id),
      year INTEGER NOT NULL,
      annual_leave_balance REAL NOT NULL DEFAULT 0,
      casual_leave_balance REAL NOT NULL DEFAULT 0,
      annual_leave_used REAL NOT NULL DEFAULT 0,
      casual_leave_used REAL NOT NULL DEFAULT 0,
      last_accrual_date DATE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS employee_salary_assignments (
      id SERIAL PRIMARY KEY,
      employee_id INTEGER NOT NULL REFERENCES employees(id),
      salary_structure_id INTEGER NOT NULL REFERENCES salary_structures(id),
      basic_amount REAL NOT NULL DEFAULT 0,
      effective_date DATE NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS manual_salary_entries (
      id SERIAL PRIMARY KEY,
      employee_id INTEGER NOT NULL REFERENCES employees(id),
      branch_id INTEGER NOT NULL REFERENCES branches(id),
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      present_days REAL NOT NULL DEFAULT 0,
      absent_days REAL NOT NULL DEFAULT 0,
      ot_hours REAL NOT NULL DEFAULT 0,
      ot_amount REAL NOT NULL DEFAULT 0,
      basic_salary REAL NOT NULL DEFAULT 0,
      transport_allowance REAL NOT NULL DEFAULT 0,
      lunch_allowance REAL NOT NULL DEFAULT 0,
      housing_allowance REAL NOT NULL DEFAULT 0,
      other_allowances REAL NOT NULL DEFAULT 0,
      epf_deduction REAL NOT NULL DEFAULT 0,
      loan_deduction REAL NOT NULL DEFAULT 0,
      absence_deduction REAL NOT NULL DEFAULT 0,
      other_deductions REAL NOT NULL DEFAULT 0,
      gross_salary REAL NOT NULL DEFAULT 0,
      net_salary REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'draft',
      notes TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS ot_adjustments (
      id SERIAL PRIMARY KEY,
      employee_id INTEGER NOT NULL REFERENCES employees(id),
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      auto_regular_ot_hours REAL NOT NULL DEFAULT 0,
      auto_regular_ot_amount REAL NOT NULL DEFAULT 0,
      auto_holiday_ot_hours REAL NOT NULL DEFAULT 0,
      auto_holiday_ot_amount REAL NOT NULL DEFAULT 0,
      is_manual_override BOOLEAN NOT NULL DEFAULT false,
      adjusted_regular_ot_hours REAL,
      adjusted_regular_ot_amount REAL,
      adjusted_holiday_ot_hours REAL,
      adjusted_holiday_ot_amount REAL,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS loan_emi_ledger (
      id SERIAL PRIMARY KEY,
      loan_id INTEGER NOT NULL REFERENCES staff_loans(id) ON DELETE CASCADE,
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      amount REAL NOT NULL,
      source TEXT NOT NULL DEFAULT 'payroll',
      note TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    /* ── New columns on existing tables ── */
    `ALTER TABLE payroll_settings ADD COLUMN IF NOT EXISTS off_season_months text NOT NULL DEFAULT '[5,6,7,8,9]'`,
    `ALTER TABLE payroll_settings ADD COLUMN IF NOT EXISTS lunch_incentive_per_day real NOT NULL DEFAULT 125`,
    `ALTER TABLE payroll_settings ADD COLUMN IF NOT EXISTS employee_overrides text NOT NULL DEFAULT '{}'`,
    `ALTER TABLE payroll_settings ADD COLUMN IF NOT EXISTS apit_overrides text NOT NULL DEFAULT '{}'`,
    `ALTER TABLE payroll_settings ADD COLUMN IF NOT EXISTS epf_etf_exempt_ids text NOT NULL DEFAULT '[]'`,
    `ALTER TABLE shifts ADD COLUMN IF NOT EXISTS weekly_schedule text`,
    `ALTER TABLE employees ADD COLUMN IF NOT EXISTS weekoff_schedule_id integer`,
    `ALTER TABLE employees ADD COLUMN IF NOT EXISTS remarks text`,
    `ALTER TABLE employees ADD COLUMN IF NOT EXISTS company_id integer`,
    `ALTER TABLE branches ADD COLUMN IF NOT EXISTS company_id integer`,
    `ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS approval_status text`,
    `ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS approved_by integer`,
    `ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS approval_note text`,
    `ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS remarks text`,
    `ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS off_season_payable_hours real NOT NULL DEFAULT 0`,
    `ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS half_day_deduction real NOT NULL DEFAULT 0`,
    `ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS incomplete_deduction real NOT NULL DEFAULT 0`,
    `ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS loan_deduction real NOT NULL DEFAULT 0`,
    `ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS holiday_ot_pay real NOT NULL DEFAULT 0`,
    `ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS lunch_late_deduction real NOT NULL DEFAULT 0`,
    `ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS req_hours_per_day real DEFAULT 0`,
    `ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS late_minutes real DEFAULT 0`,
    `ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS lunch_late_minutes real DEFAULT 0`,
    `ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS incomplete_minutes real DEFAULT 0`,
    /* ── Indexes ── */
    `CREATE INDEX IF NOT EXISTS idx_loan_emi_ledger_loan_month ON loan_emi_ledger(loan_id, month, year)`,
    `CREATE INDEX IF NOT EXISTS idx_loan_emi_ledger_month_year ON loan_emi_ledger(month, year)`,
  ];
  for (const m of migrations) {
    try {
      await db.execute(sql.raw(m));
    } catch (e: any) {
      console.warn("[migration] skipped:", e?.message ?? e);
    }
  }

  // Seed default shifts if the table is empty
  try {
    const existing = await db.execute(sql.raw(`SELECT COUNT(*) AS cnt FROM shifts`));
    const cnt = Number((existing.rows[0] as any).cnt);
    if (cnt === 0) {
      await db.execute(sql.raw(`
        INSERT INTO shifts (name, type, start_time1, end_time1, grace_minutes, overtime_threshold, is_active, weekly_schedule)
        VALUES
          ('Flexible Shift',     'normal', '08:00', '17:00', 60, 30, true, NULL),
          ('Kitchen Shift',      'normal', '07:00', '21:00', 10, 30, true, '${KITCHEN_WEEKLY}'),
          ('Receptionist Shift', 'normal', '08:30', '17:30', 10, 30, true, NULL),
          ('Regular Shift',      'normal', '08:00', '17:00', 15, 30, true, NULL),
          ('Night Watcher Shift','normal', '20:00', '05:00', 10, 60, true, NULL)
      `));
      console.log("[migration] seeded 5 default shifts");
    }
  } catch (e: any) {
    console.warn("[migration] shift seed skipped:", e?.message ?? e);
  }

  console.log("[migration] startup migrations complete");
}

const port = Number(process.env["PORT"] || "8080");

runStartupMigrations().then(() => {
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
  startZkAdmsServer(8081);
}).catch((e) => {
  console.error("[migration] fatal error, starting anyway:", e);
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
  startZkAdmsServer(8081);
});
