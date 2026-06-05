CREATE TABLE "branches" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"type" text NOT NULL,
	"company_id" integer,
	"parent_id" integer,
	"address" text,
	"phone" text,
	"manager_name" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "branches_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"address" text,
	"phone" text,
	"email" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "companies_name_unique" UNIQUE("name"),
	CONSTRAINT "companies_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "shifts" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"start_time1" text NOT NULL,
	"end_time1" text NOT NULL,
	"start_time2" text,
	"end_time2" text,
	"grace_minutes" integer DEFAULT 0 NOT NULL,
	"overtime_threshold" integer DEFAULT 60 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"weekly_schedule" text
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "departments_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"full_name" text NOT NULL,
	"department" text NOT NULL,
	"company_id" integer,
	"branch_id" integer NOT NULL,
	"shift_id" integer,
	"weekoff_schedule_id" integer,
	"joining_date" date NOT NULL,
	"email" text,
	"phone" text,
	"biometric_id" text,
	"status" text DEFAULT 'active' NOT NULL,
	"gender" text DEFAULT 'male',
	"date_of_birth" date,
	"address" text,
	"employee_type" text DEFAULT 'permanent',
	"reporting_manager_id" integer,
	"nic_number" text,
	"epf_number" text,
	"etf_number" text,
	"aadhar_number" text,
	"pan_number" text,
	"photo_url" text,
	"aadhar_doc_url" text,
	"pan_doc_url" text,
	"certificates_doc_url" text,
	"resume_doc_url" text,
	"remarks" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "employees_employee_id_unique" UNIQUE("employee_id")
);
--> statement-breakpoint
CREATE TABLE "attendance_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"branch_id" integer NOT NULL,
	"date" date NOT NULL,
	"status" text NOT NULL,
	"leave_type" text,
	"in_time1" text,
	"out_time1" text,
	"work_hours1" real,
	"in_time2" text,
	"out_time2" text,
	"work_hours2" real,
	"total_hours" real,
	"overtime_hours" real,
	"source" text DEFAULT 'manual' NOT NULL,
	"approval_status" text,
	"approved_by" integer,
	"approval_note" text,
	"remarks" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leave_balances" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"year" integer NOT NULL,
	"annual_leave_balance" real DEFAULT 0 NOT NULL,
	"casual_leave_balance" real DEFAULT 0 NOT NULL,
	"annual_leave_used" real DEFAULT 0 NOT NULL,
	"casual_leave_used" real DEFAULT 0 NOT NULL,
	"last_accrual_date" date,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "biometric_devices" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"serial_number" text NOT NULL,
	"model" text NOT NULL,
	"ip_address" text NOT NULL,
	"port" integer DEFAULT 4370 NOT NULL,
	"branch_id" integer NOT NULL,
	"push_method" text DEFAULT 'zkpush' NOT NULL,
	"api_key" text,
	"status" text DEFAULT 'offline' NOT NULL,
	"last_sync" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "biometric_devices_serial_number_unique" UNIQUE("serial_number")
);
--> statement-breakpoint
CREATE TABLE "biometric_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"device_id" integer NOT NULL,
	"employee_id" integer,
	"biometric_id" text NOT NULL,
	"punch_time" timestamp NOT NULL,
	"punch_type" text DEFAULT 'unknown' NOT NULL,
	"processed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'viewer' NOT NULL,
	"branch_ids" text DEFAULT '[]' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "system_users_username_unique" UNIQUE("username"),
	CONSTRAINT "system_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "holidays" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"date" date NOT NULL,
	"type" text DEFAULT 'public' NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_name" text DEFAULT 'Drivethru' NOT NULL,
	"organization_code" text DEFAULT 'DT' NOT NULL,
	"working_days" text DEFAULT '["monday","tuesday","wednesday","thursday","friday","saturday"]' NOT NULL,
	"timezone" text DEFAULT 'Asia/Colombo' NOT NULL,
	"late_threshold_minutes" integer DEFAULT 15 NOT NULL,
	"half_day_threshold_hours" real DEFAULT 5 NOT NULL,
	"overtime_threshold_hours" real DEFAULT 9 NOT NULL,
	"auto_mark_absent" boolean DEFAULT false NOT NULL,
	"biometric_sync_interval" integer DEFAULT 5 NOT NULL,
	"zk_push_server_url" text,
	"zk_push_api_key" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_salary_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"salary_structure_id" integer NOT NULL,
	"basic_amount" real DEFAULT 0 NOT NULL,
	"effective_date" date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loan_emi_ledger" (
	"id" serial PRIMARY KEY NOT NULL,
	"loan_id" integer NOT NULL,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"amount" real NOT NULL,
	"source" text DEFAULT 'payroll' NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ot_adjustments" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"auto_regular_ot_hours" real DEFAULT 0 NOT NULL,
	"auto_regular_ot_amount" real DEFAULT 0 NOT NULL,
	"auto_holiday_ot_hours" real DEFAULT 0 NOT NULL,
	"auto_holiday_ot_amount" real DEFAULT 0 NOT NULL,
	"is_manual_override" boolean DEFAULT false NOT NULL,
	"adjusted_regular_ot_hours" real,
	"adjusted_regular_ot_amount" real,
	"adjusted_holiday_ot_hours" real,
	"adjusted_holiday_ot_amount" real,
	"notes" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"branch_id" integer NOT NULL,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"working_days" integer DEFAULT 0 NOT NULL,
	"present_days" integer DEFAULT 0 NOT NULL,
	"absent_days" integer DEFAULT 0 NOT NULL,
	"late_days" integer DEFAULT 0 NOT NULL,
	"half_days" integer DEFAULT 0 NOT NULL,
	"leave_days" integer DEFAULT 0 NOT NULL,
	"holiday_days" integer DEFAULT 0 NOT NULL,
	"overtime_hours" real DEFAULT 0 NOT NULL,
	"basic_salary" real DEFAULT 0 NOT NULL,
	"transport_allowance" real DEFAULT 0 NOT NULL,
	"lunch_incentive" real DEFAULT 0 NOT NULL,
	"housing_allowance" real DEFAULT 0 NOT NULL,
	"other_allowances" real DEFAULT 0 NOT NULL,
	"overtime_pay" real DEFAULT 0 NOT NULL,
	"holiday_ot_pay" real DEFAULT 0 NOT NULL,
	"gross_salary" real DEFAULT 0 NOT NULL,
	"epf_employee" real DEFAULT 0 NOT NULL,
	"epf_employer" real DEFAULT 0 NOT NULL,
	"etf_employer" real DEFAULT 0 NOT NULL,
	"apit" real DEFAULT 0 NOT NULL,
	"late_deduction" real DEFAULT 0 NOT NULL,
	"lunch_late_deduction" real DEFAULT 0 NOT NULL,
	"absence_deduction" real DEFAULT 0 NOT NULL,
	"half_day_deduction" real DEFAULT 0 NOT NULL,
	"incomplete_deduction" real DEFAULT 0 NOT NULL,
	"other_deductions" real DEFAULT 0 NOT NULL,
	"req_hours_per_day" real DEFAULT 0,
	"late_minutes" real DEFAULT 0,
	"lunch_late_minutes" real DEFAULT 0,
	"incomplete_minutes" real DEFAULT 0,
	"off_season_payable_hours" real DEFAULT 0 NOT NULL,
	"loan_deduction" real DEFAULT 0 NOT NULL,
	"total_deductions" real DEFAULT 0 NOT NULL,
	"net_salary" real DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"remarks" text,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"approved_at" timestamp,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "salary_structures" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"currency" text DEFAULT 'LKR' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"earnings" text DEFAULT '[]' NOT NULL,
	"deductions" text DEFAULT '[]' NOT NULL,
	"variable_pay" text DEFAULT '[]' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_incentives" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"type" text DEFAULT 'other' NOT NULL,
	"amount" real NOT NULL,
	"reason" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_loans" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"type" text DEFAULT 'loan' NOT NULL,
	"total_amount" real NOT NULL,
	"monthly_installment" real NOT NULL,
	"start_month" integer NOT NULL,
	"start_year" integer NOT NULL,
	"paid_amount" real DEFAULT 0 NOT NULL,
	"remaining_balance" real NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"epf_employee_percent" real DEFAULT 8 NOT NULL,
	"epf_employer_percent" real DEFAULT 12 NOT NULL,
	"etf_employer_percent" real DEFAULT 3 NOT NULL,
	"transport_allowance" real DEFAULT 0 NOT NULL,
	"lunch_incentive" real DEFAULT 0 NOT NULL,
	"lunch_incentive_per_day" real DEFAULT 125 NOT NULL,
	"housing_allowance_low" real DEFAULT 0 NOT NULL,
	"housing_allowance_mid" real DEFAULT 0 NOT NULL,
	"housing_allowance_high" real DEFAULT 0 NOT NULL,
	"housing_mid_threshold" real DEFAULT 50000 NOT NULL,
	"housing_high_threshold" real DEFAULT 80000 NOT NULL,
	"other_allowances" real DEFAULT 0 NOT NULL,
	"overtime_multiplier" real DEFAULT 1.5 NOT NULL,
	"statutory_ot_multiplier" real DEFAULT 2 NOT NULL,
	"poya_ot_multiplier" real DEFAULT 1.5 NOT NULL,
	"public_holiday_ot_multiplier" real DEFAULT 1.5 NOT NULL,
	"off_day_ot_multiplier" real DEFAULT 1.5 NOT NULL,
	"off_season_enabled" boolean DEFAULT false NOT NULL,
	"off_season_start" text,
	"off_season_end" text,
	"off_season_months" text DEFAULT '[5,6,7,8,9]' NOT NULL,
	"salary_scale" text DEFAULT '{"General Manager":150000,"Operations Manager":120000,"F&B Manager":100000,"HR Manager":90000,"Accountant":75000,"Admin Officer":65000,"Kitchen Supervisor":60000,"Kitchen Staff":45000,"Room Supervisor":60000,"Room Attendant":45000,"Head Gardener":50000,"Gardener":40000,"Head Surf Instructor":60000,"Surf Instructor":45000,"Night Watcher":40000,"Security Officer":40000,"Cashier":42000,"Driver":38000}' NOT NULL,
	"employee_overrides" text DEFAULT '{}' NOT NULL,
	"apit_overrides" text DEFAULT '{}' NOT NULL,
	"epf_etf_exempt_ids" text DEFAULT '[]' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"username" text NOT NULL,
	"full_name" text DEFAULT '' NOT NULL,
	"action" text NOT NULL,
	"module" text,
	"description" text,
	"ip_address" text,
	"user_agent" text,
	"location" text,
	"session_id" text,
	"status" text DEFAULT 'success' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"required_work_minutes" integer DEFAULT 540 NOT NULL,
	"ot_grace_minutes" integer DEFAULT 30 NOT NULL,
	"daily_rate_divisor" integer DEFAULT 30 NOT NULL,
	"hours_per_day" integer DEFAULT 8 NOT NULL,
	"duplicate_punch_filter_minutes" integer DEFAULT 5 NOT NULL,
	"standard_lunch_start_hour" integer DEFAULT 13 NOT NULL,
	"standard_lunch_minutes" integer DEFAULT 60 NOT NULL,
	"early_in_minutes" integer DEFAULT 30 NOT NULL,
	"late_deduction_enabled" boolean DEFAULT true NOT NULL,
	"late_deduction_threshold" integer DEFAULT 15 NOT NULL,
	"ot_exempt_designations" text DEFAULT '["Manager"]' NOT NULL,
	"incomplete_exempt_departments" text DEFAULT '["Surf Instructors - D"]' NOT NULL,
	"department_rules" text DEFAULT '[{"department":"Security - D","isNightShift":true,"lunchType":"none","lunchStartHour":13,"lunchDurations":{"Monday":0,"Tuesday":0,"Wednesday":0,"Thursday":0,"Friday":0,"Saturday":0,"Sunday":0}},{"department":"Kitchen - D","isNightShift":false,"lunchType":"custom","lunchStartHour":14,"lunchDurations":{"Monday":120,"Tuesday":120,"Wednesday":60,"Thursday":120,"Friday":120,"Saturday":0,"Sunday":60}}]' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weekoff_schedules" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"off_days" text DEFAULT '[]' NOT NULL,
	"half_days" text DEFAULT '[]' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "manual_salary_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"branch_id" integer NOT NULL,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"present_days" real DEFAULT 0 NOT NULL,
	"absent_days" real DEFAULT 0 NOT NULL,
	"ot_hours" real DEFAULT 0 NOT NULL,
	"ot_amount" real DEFAULT 0 NOT NULL,
	"basic_salary" real DEFAULT 0 NOT NULL,
	"transport_allowance" real DEFAULT 0 NOT NULL,
	"lunch_allowance" real DEFAULT 0 NOT NULL,
	"housing_allowance" real DEFAULT 0 NOT NULL,
	"other_allowances" real DEFAULT 0 NOT NULL,
	"epf_deduction" real DEFAULT 0 NOT NULL,
	"loan_deduction" real DEFAULT 0 NOT NULL,
	"absence_deduction" real DEFAULT 0 NOT NULL,
	"other_deductions" real DEFAULT 0 NOT NULL,
	"gross_salary" real DEFAULT 0 NOT NULL,
	"net_salary" real DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_parent_id_branches_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_shift_id_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_weekoff_schedule_id_weekoff_schedules_id_fk" FOREIGN KEY ("weekoff_schedule_id") REFERENCES "public"."weekoff_schedules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biometric_devices" ADD CONSTRAINT "biometric_devices_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biometric_logs" ADD CONSTRAINT "biometric_logs_device_id_biometric_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."biometric_devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biometric_logs" ADD CONSTRAINT "biometric_logs_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_salary_assignments" ADD CONSTRAINT "employee_salary_assignments_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_salary_assignments" ADD CONSTRAINT "employee_salary_assignments_salary_structure_id_salary_structures_id_fk" FOREIGN KEY ("salary_structure_id") REFERENCES "public"."salary_structures"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_emi_ledger" ADD CONSTRAINT "loan_emi_ledger_loan_id_staff_loans_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."staff_loans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ot_adjustments" ADD CONSTRAINT "ot_adjustments_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_records" ADD CONSTRAINT "payroll_records_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_records" ADD CONSTRAINT "payroll_records_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_incentives" ADD CONSTRAINT "staff_incentives_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_loans" ADD CONSTRAINT "staff_loans_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_system_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."system_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manual_salary_entries" ADD CONSTRAINT "manual_salary_entries_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manual_salary_entries" ADD CONSTRAINT "manual_salary_entries_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;