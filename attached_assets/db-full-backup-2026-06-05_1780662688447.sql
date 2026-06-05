--
-- PostgreSQL database dump
--

\restrict oGhW49JDsLEeTTTTOB0c0JlWidSyndGFdJPLx3npOkaPKF3v5NjyWVPhaaS3DQO

-- Dumped from database version 16.14 (Ubuntu 16.14-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.14 (Ubuntu 16.14-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: activity_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_logs (
    id integer NOT NULL,
    user_id integer,
    username text NOT NULL,
    full_name text DEFAULT ''::text NOT NULL,
    action text NOT NULL,
    module text,
    description text,
    ip_address text,
    user_agent text,
    location text,
    session_id text,
    status text DEFAULT 'success'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: activity_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.activity_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: activity_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.activity_logs_id_seq OWNED BY public.activity_logs.id;


--
-- Name: attendance_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attendance_records (
    id integer NOT NULL,
    employee_id integer NOT NULL,
    branch_id integer NOT NULL,
    date date NOT NULL,
    status text NOT NULL,
    in_time1 text,
    out_time1 text,
    work_hours1 real,
    in_time2 text,
    out_time2 text,
    work_hours2 real,
    total_hours real,
    overtime_hours real,
    source text DEFAULT 'manual'::text NOT NULL,
    remarks text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    leave_type text,
    approval_status text,
    approved_by integer,
    approval_note text
);


--
-- Name: attendance_records_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.attendance_records_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: attendance_records_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.attendance_records_id_seq OWNED BY public.attendance_records.id;


--
-- Name: biometric_devices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.biometric_devices (
    id integer NOT NULL,
    name text NOT NULL,
    serial_number text NOT NULL,
    model text NOT NULL,
    ip_address text NOT NULL,
    port integer DEFAULT 4370 NOT NULL,
    branch_id integer,
    push_method text DEFAULT 'zkpush'::text NOT NULL,
    api_key text,
    status text DEFAULT 'offline'::text NOT NULL,
    last_sync timestamp without time zone,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: biometric_devices_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.biometric_devices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: biometric_devices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.biometric_devices_id_seq OWNED BY public.biometric_devices.id;


--
-- Name: biometric_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.biometric_logs (
    id integer NOT NULL,
    device_id integer,
    employee_id integer,
    biometric_id text NOT NULL,
    punch_time timestamp without time zone NOT NULL,
    punch_type text DEFAULT 'unknown'::text NOT NULL,
    processed boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: biometric_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.biometric_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: biometric_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.biometric_logs_id_seq OWNED BY public.biometric_logs.id;


--
-- Name: branches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.branches (
    id integer NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    type text NOT NULL,
    parent_id integer,
    address text,
    phone text,
    manager_name text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    company_id integer
);


--
-- Name: branches_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.branches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: branches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.branches_id_seq OWNED BY public.branches.id;


--
-- Name: companies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.companies (
    id integer NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    address text,
    phone text,
    email text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: companies_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.companies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: companies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.companies_id_seq OWNED BY public.companies.id;


--
-- Name: departments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.departments (
    id integer NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: departments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.departments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: departments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.departments_id_seq OWNED BY public.departments.id;


--
-- Name: designations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.designations (
    id integer NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    department_id integer,
    level integer DEFAULT 1,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: designations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.designations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: designations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.designations_id_seq OWNED BY public.designations.id;


--
-- Name: employee_salary_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_salary_assignments (
    id integer NOT NULL,
    employee_id integer NOT NULL,
    salary_structure_id integer NOT NULL,
    basic_amount real DEFAULT 0 NOT NULL,
    effective_date date NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: employee_salary_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.employee_salary_assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: employee_salary_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.employee_salary_assignments_id_seq OWNED BY public.employee_salary_assignments.id;


--
-- Name: employees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employees (
    id integer NOT NULL,
    employee_id text NOT NULL,
    first_name text,
    last_name text,
    full_name text NOT NULL,
    designation text DEFAULT 'Staff'::text NOT NULL,
    department text NOT NULL,
    branch_id integer NOT NULL,
    shift_id integer,
    joining_date date DEFAULT CURRENT_DATE,
    email text,
    phone text,
    biometric_id text,
    status text DEFAULT 'active'::text NOT NULL,
    gender text DEFAULT 'male'::text,
    date_of_birth date,
    address text,
    employee_type text DEFAULT 'permanent'::text,
    reporting_manager_id integer,
    nic_number text,
    epf_number text,
    etf_number text,
    aadhar_number text,
    pan_number text,
    photo_url text,
    aadhar_doc_url text,
    pan_doc_url text,
    certificates_doc_url text,
    resume_doc_url text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    company_id integer,
    weekoff_schedule_id integer,
    remarks text
);


--
-- Name: employees_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.employees_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: employees_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.employees_id_seq OWNED BY public.employees.id;


--
-- Name: holidays; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.holidays (
    id integer NOT NULL,
    name text NOT NULL,
    date date NOT NULL,
    type text DEFAULT 'public'::text NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: holidays_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.holidays_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: holidays_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.holidays_id_seq OWNED BY public.holidays.id;


--
-- Name: hr_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hr_settings (
    id integer NOT NULL,
    required_work_minutes integer DEFAULT 540 NOT NULL,
    ot_grace_minutes integer DEFAULT 30 NOT NULL,
    daily_rate_divisor integer DEFAULT 30 NOT NULL,
    hours_per_day integer DEFAULT 8 NOT NULL,
    duplicate_punch_filter_minutes integer DEFAULT 5 NOT NULL,
    standard_lunch_start_hour integer DEFAULT 13 NOT NULL,
    standard_lunch_minutes integer DEFAULT 60 NOT NULL,
    ot_exempt_designations text DEFAULT '["Manager"]'::text NOT NULL,
    incomplete_exempt_departments text DEFAULT '["Surf Instructors - D"]'::text NOT NULL,
    department_rules text DEFAULT '[{"department":"Security - D","isNightShift":true,"lunchType":"none","lunchStartHour":13,"lunchDurations":{"Monday":0,"Tuesday":0,"Wednesday":0,"Thursday":0,"Friday":0,"Saturday":0,"Sunday":0}},{"department":"Kitchen - D","isNightShift":false,"lunchType":"custom","lunchStartHour":14,"lunchDurations":{"Monday":120,"Tuesday":120,"Wednesday":60,"Thursday":120,"Friday":120,"Saturday":0,"Sunday":60}}]'::text NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    early_in_minutes integer DEFAULT 30 NOT NULL,
    late_deduction_enabled boolean DEFAULT true NOT NULL,
    late_deduction_threshold integer DEFAULT 15 NOT NULL
);


--
-- Name: hr_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.hr_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hr_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.hr_settings_id_seq OWNED BY public.hr_settings.id;


--
-- Name: leave_balances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leave_balances (
    id integer NOT NULL,
    employee_id integer NOT NULL,
    year integer NOT NULL,
    annual_leave_balance real DEFAULT 0 NOT NULL,
    casual_leave_balance real DEFAULT 0 NOT NULL,
    annual_leave_used real DEFAULT 0 NOT NULL,
    casual_leave_used real DEFAULT 0 NOT NULL,
    last_accrual_date date,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: leave_balances_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.leave_balances_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: leave_balances_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.leave_balances_id_seq OWNED BY public.leave_balances.id;


--
-- Name: loan_emi_ledger; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.loan_emi_ledger (
    id integer NOT NULL,
    loan_id integer NOT NULL,
    month integer NOT NULL,
    year integer NOT NULL,
    amount real NOT NULL,
    source text DEFAULT 'payroll'::text NOT NULL,
    note text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: loan_emi_ledger_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.loan_emi_ledger_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: loan_emi_ledger_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.loan_emi_ledger_id_seq OWNED BY public.loan_emi_ledger.id;


--
-- Name: manual_salary_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.manual_salary_entries (
    id integer NOT NULL,
    employee_id integer NOT NULL,
    branch_id integer NOT NULL,
    month integer NOT NULL,
    year integer NOT NULL,
    present_days real DEFAULT 0 NOT NULL,
    absent_days real DEFAULT 0 NOT NULL,
    ot_hours real DEFAULT 0 NOT NULL,
    ot_amount real DEFAULT 0 NOT NULL,
    basic_salary real DEFAULT 0 NOT NULL,
    transport_allowance real DEFAULT 0 NOT NULL,
    lunch_allowance real DEFAULT 0 NOT NULL,
    housing_allowance real DEFAULT 0 NOT NULL,
    other_allowances real DEFAULT 0 NOT NULL,
    epf_deduction real DEFAULT 0 NOT NULL,
    loan_deduction real DEFAULT 0 NOT NULL,
    absence_deduction real DEFAULT 0 NOT NULL,
    other_deductions real DEFAULT 0 NOT NULL,
    gross_salary real DEFAULT 0 NOT NULL,
    net_salary real DEFAULT 0 NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: manual_salary_entries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.manual_salary_entries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: manual_salary_entries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.manual_salary_entries_id_seq OWNED BY public.manual_salary_entries.id;


--
-- Name: ot_adjustments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ot_adjustments (
    id integer NOT NULL,
    employee_id integer NOT NULL,
    year integer NOT NULL,
    month integer NOT NULL,
    auto_regular_ot_hours real DEFAULT 0 NOT NULL,
    auto_regular_ot_amount real DEFAULT 0 NOT NULL,
    auto_holiday_ot_hours real DEFAULT 0 NOT NULL,
    auto_holiday_ot_amount real DEFAULT 0 NOT NULL,
    is_manual_override boolean DEFAULT false NOT NULL,
    adjusted_regular_ot_hours real,
    adjusted_regular_ot_amount real,
    adjusted_holiday_ot_hours real,
    adjusted_holiday_ot_amount real,
    notes text,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: ot_adjustments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ot_adjustments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ot_adjustments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ot_adjustments_id_seq OWNED BY public.ot_adjustments.id;


--
-- Name: payroll_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payroll_records (
    id integer NOT NULL,
    employee_id integer NOT NULL,
    branch_id integer NOT NULL,
    month integer NOT NULL,
    year integer NOT NULL,
    working_days integer DEFAULT 0 NOT NULL,
    present_days integer DEFAULT 0 NOT NULL,
    absent_days integer DEFAULT 0 NOT NULL,
    late_days integer DEFAULT 0 NOT NULL,
    leave_days integer DEFAULT 0 NOT NULL,
    holiday_days integer DEFAULT 0 NOT NULL,
    overtime_hours real DEFAULT 0 NOT NULL,
    basic_salary real DEFAULT 0 NOT NULL,
    transport_allowance real DEFAULT 0 NOT NULL,
    housing_allowance real DEFAULT 0 NOT NULL,
    other_allowances real DEFAULT 0 NOT NULL,
    overtime_pay real DEFAULT 0 NOT NULL,
    gross_salary real DEFAULT 0 NOT NULL,
    epf_employee real DEFAULT 0 NOT NULL,
    epf_employer real DEFAULT 0 NOT NULL,
    etf_employer real DEFAULT 0 NOT NULL,
    apit real DEFAULT 0 NOT NULL,
    late_deduction real DEFAULT 0 NOT NULL,
    absence_deduction real DEFAULT 0 NOT NULL,
    other_deductions real DEFAULT 0 NOT NULL,
    total_deductions real DEFAULT 0 NOT NULL,
    net_salary real DEFAULT 0 NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    remarks text,
    generated_at timestamp without time zone DEFAULT now() NOT NULL,
    approved_at timestamp without time zone,
    paid_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    half_days integer DEFAULT 0 NOT NULL,
    half_day_deduction real DEFAULT 0 NOT NULL,
    incomplete_deduction real DEFAULT 0 NOT NULL,
    holiday_ot_pay real DEFAULT 0 NOT NULL,
    loan_deduction real DEFAULT 0 NOT NULL,
    lunch_incentive real DEFAULT 0 NOT NULL,
    lunch_late_deduction real DEFAULT 0 NOT NULL,
    req_hours_per_day real DEFAULT 0,
    late_minutes real DEFAULT 0,
    lunch_late_minutes real DEFAULT 0,
    incomplete_minutes real DEFAULT 0,
    off_season_payable_hours real DEFAULT 0 NOT NULL
);


--
-- Name: payroll_records_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payroll_records_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payroll_records_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payroll_records_id_seq OWNED BY public.payroll_records.id;


--
-- Name: payroll_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payroll_settings (
    id integer NOT NULL,
    epf_employee_percent real DEFAULT 8 NOT NULL,
    epf_employer_percent real DEFAULT 12 NOT NULL,
    etf_employer_percent real DEFAULT 3 NOT NULL,
    transport_allowance real DEFAULT 0 NOT NULL,
    housing_allowance_low real DEFAULT 0 NOT NULL,
    housing_allowance_mid real DEFAULT 0 NOT NULL,
    housing_allowance_high real DEFAULT 0 NOT NULL,
    housing_mid_threshold real DEFAULT 50000 NOT NULL,
    housing_high_threshold real DEFAULT 80000 NOT NULL,
    other_allowances real DEFAULT 0 NOT NULL,
    overtime_multiplier real DEFAULT 1.5 NOT NULL,
    salary_scale text DEFAULT '{"General Manager":150000,"Operations Manager":120000,"F&B Manager":100000,"HR Manager":90000,"Accountant":75000,"Admin Officer":65000,"Kitchen Supervisor":60000,"Kitchen Staff":45000,"Room Supervisor":60000,"Room Attendant":45000,"Head Gardener":50000,"Gardener":40000,"Head Surf Instructor":60000,"Surf Instructor":45000,"Night Watcher":40000,"Security Officer":40000,"Cashier":42000,"Driver":38000}'::text NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    employee_overrides text DEFAULT '{}'::text NOT NULL,
    statutory_ot_multiplier real DEFAULT 2.0 NOT NULL,
    poya_ot_multiplier real DEFAULT 1.5 NOT NULL,
    public_holiday_ot_multiplier real DEFAULT 1.5 NOT NULL,
    off_day_ot_multiplier real DEFAULT 1.5 NOT NULL,
    off_season_enabled boolean DEFAULT false NOT NULL,
    off_season_start text,
    off_season_end text,
    lunch_incentive real DEFAULT 0 NOT NULL,
    lunch_incentive_per_day real DEFAULT 125 NOT NULL,
    off_season_months text DEFAULT '[5,6,7,8,9]'::text NOT NULL,
    apit_overrides text DEFAULT '{}'::text NOT NULL,
    epf_etf_exempt_ids text DEFAULT '[]'::text NOT NULL
);


--
-- Name: payroll_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payroll_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payroll_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payroll_settings_id_seq OWNED BY public.payroll_settings.id;


--
-- Name: salary_structures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.salary_structures (
    id integer NOT NULL,
    name text NOT NULL,
    currency text DEFAULT 'LKR'::text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    earnings text DEFAULT '[]'::text NOT NULL,
    deductions text DEFAULT '[]'::text NOT NULL,
    variable_pay text DEFAULT '[]'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: salary_structures_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.salary_structures_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: salary_structures_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.salary_structures_id_seq OWNED BY public.salary_structures.id;


--
-- Name: shifts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shifts (
    id integer NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    start_time1 text NOT NULL,
    end_time1 text NOT NULL,
    start_time2 text,
    end_time2 text,
    grace_minutes integer DEFAULT 0 NOT NULL,
    overtime_threshold integer DEFAULT 60 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    category text DEFAULT 'REGULAR'::text NOT NULL,
    weekly_schedule text
);


--
-- Name: shifts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.shifts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: shifts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.shifts_id_seq OWNED BY public.shifts.id;


--
-- Name: staff_incentives; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_incentives (
    id integer NOT NULL,
    employee_id integer NOT NULL,
    month integer NOT NULL,
    year integer NOT NULL,
    type text DEFAULT 'other'::text NOT NULL,
    amount real NOT NULL,
    reason text,
    status text DEFAULT 'pending'::text NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: staff_incentives_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.staff_incentives_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: staff_incentives_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.staff_incentives_id_seq OWNED BY public.staff_incentives.id;


--
-- Name: staff_loans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_loans (
    id integer NOT NULL,
    employee_id integer NOT NULL,
    type text DEFAULT 'loan'::text NOT NULL,
    total_amount real NOT NULL,
    monthly_installment real NOT NULL,
    start_month integer NOT NULL,
    start_year integer NOT NULL,
    paid_amount real DEFAULT 0 NOT NULL,
    remaining_balance real NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: staff_loans_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.staff_loans_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: staff_loans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.staff_loans_id_seq OWNED BY public.staff_loans.id;


--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_settings (
    id integer NOT NULL,
    organization_name text DEFAULT 'Drivethru'::text NOT NULL,
    organization_code text DEFAULT 'DT'::text NOT NULL,
    working_days text DEFAULT '["monday","tuesday","wednesday","thursday","friday","saturday"]'::text NOT NULL,
    timezone text DEFAULT 'Asia/Colombo'::text NOT NULL,
    late_threshold_minutes integer DEFAULT 15 NOT NULL,
    half_day_threshold_hours real DEFAULT 5 NOT NULL,
    overtime_threshold_hours real DEFAULT 9 NOT NULL,
    auto_mark_absent boolean DEFAULT false NOT NULL,
    biometric_sync_interval integer DEFAULT 5 NOT NULL,
    zk_push_server_url text,
    zk_push_api_key text,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: system_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.system_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: system_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.system_settings_id_seq OWNED BY public.system_settings.id;


--
-- Name: system_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_users (
    id integer NOT NULL,
    username text NOT NULL,
    full_name text NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    role text DEFAULT 'viewer'::text NOT NULL,
    branch_ids text DEFAULT '[]'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    last_login timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: system_users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.system_users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: system_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.system_users_id_seq OWNED BY public.system_users.id;


--
-- Name: weekoff_schedules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.weekoff_schedules (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    off_days text DEFAULT '[]'::text NOT NULL,
    half_days text DEFAULT '[]'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: weekoff_schedules_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.weekoff_schedules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: weekoff_schedules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.weekoff_schedules_id_seq OWNED BY public.weekoff_schedules.id;


--
-- Name: activity_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs ALTER COLUMN id SET DEFAULT nextval('public.activity_logs_id_seq'::regclass);


--
-- Name: attendance_records id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_records ALTER COLUMN id SET DEFAULT nextval('public.attendance_records_id_seq'::regclass);


--
-- Name: biometric_devices id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.biometric_devices ALTER COLUMN id SET DEFAULT nextval('public.biometric_devices_id_seq'::regclass);


--
-- Name: biometric_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.biometric_logs ALTER COLUMN id SET DEFAULT nextval('public.biometric_logs_id_seq'::regclass);


--
-- Name: branches id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branches ALTER COLUMN id SET DEFAULT nextval('public.branches_id_seq'::regclass);


--
-- Name: companies id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies ALTER COLUMN id SET DEFAULT nextval('public.companies_id_seq'::regclass);


--
-- Name: departments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments ALTER COLUMN id SET DEFAULT nextval('public.departments_id_seq'::regclass);


--
-- Name: designations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.designations ALTER COLUMN id SET DEFAULT nextval('public.designations_id_seq'::regclass);


--
-- Name: employee_salary_assignments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_salary_assignments ALTER COLUMN id SET DEFAULT nextval('public.employee_salary_assignments_id_seq'::regclass);


--
-- Name: employees id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees ALTER COLUMN id SET DEFAULT nextval('public.employees_id_seq'::regclass);


--
-- Name: holidays id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.holidays ALTER COLUMN id SET DEFAULT nextval('public.holidays_id_seq'::regclass);


--
-- Name: hr_settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_settings ALTER COLUMN id SET DEFAULT nextval('public.hr_settings_id_seq'::regclass);


--
-- Name: leave_balances id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_balances ALTER COLUMN id SET DEFAULT nextval('public.leave_balances_id_seq'::regclass);


--
-- Name: loan_emi_ledger id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loan_emi_ledger ALTER COLUMN id SET DEFAULT nextval('public.loan_emi_ledger_id_seq'::regclass);


--
-- Name: manual_salary_entries id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manual_salary_entries ALTER COLUMN id SET DEFAULT nextval('public.manual_salary_entries_id_seq'::regclass);


--
-- Name: ot_adjustments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ot_adjustments ALTER COLUMN id SET DEFAULT nextval('public.ot_adjustments_id_seq'::regclass);


--
-- Name: payroll_records id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_records ALTER COLUMN id SET DEFAULT nextval('public.payroll_records_id_seq'::regclass);


--
-- Name: payroll_settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_settings ALTER COLUMN id SET DEFAULT nextval('public.payroll_settings_id_seq'::regclass);


--
-- Name: salary_structures id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salary_structures ALTER COLUMN id SET DEFAULT nextval('public.salary_structures_id_seq'::regclass);


--
-- Name: shifts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shifts ALTER COLUMN id SET DEFAULT nextval('public.shifts_id_seq'::regclass);


--
-- Name: staff_incentives id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_incentives ALTER COLUMN id SET DEFAULT nextval('public.staff_incentives_id_seq'::regclass);


--
-- Name: staff_loans id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_loans ALTER COLUMN id SET DEFAULT nextval('public.staff_loans_id_seq'::regclass);


--
-- Name: system_settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings ALTER COLUMN id SET DEFAULT nextval('public.system_settings_id_seq'::regclass);


--
-- Name: system_users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_users ALTER COLUMN id SET DEFAULT nextval('public.system_users_id_seq'::regclass);


--
-- Name: weekoff_schedules id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weekoff_schedules ALTER COLUMN id SET DEFAULT nextval('public.weekoff_schedules_id_seq'::regclass);


--
-- Data for Name: activity_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.activity_logs (id, user_id, username, full_name, action, module, description, ip_address, user_agent, location, session_id, status, created_at) FROM stdin;
1	\N	admin		login_failed	Auth	Failed login attempt for username: admin	122.165.225.42	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	Coimbatore, Tamil Nadu, India	\N	failed	2026-05-28 16:08:14.277884
5	\N	srilanka@drivethru.de		login_failed	Auth	Failed login attempt for username: srilanka@drivethru.de	122.165.225.42	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	Coimbatore, Tamil Nadu, India	\N	failed	2026-05-28 16:45:57.439559
2	\N	admin	Super Administrator	login_failed	Auth	Incorrect password for user: admin	122.165.225.42	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	Coimbatore, Tamil Nadu, India	\N	failed	2026-05-28 16:09:02.678116
3	\N	admin	Super Administrator	login	Auth	User logged in successfully	122.165.225.42	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	Coimbatore, Tamil Nadu, India	97e2650a76f8d7d3	success	2026-05-28 16:10:54.638189
4	\N	admin	Super Administrator	login	Auth	User logged in successfully	14.1.78.161	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	Colombo, Western Province, Sri Lanka	01af25a049a146db	success	2026-05-28 16:25:47.980087
6	\N	admin	Super Administrator	login	Auth	User logged in successfully	14.1.78.161	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	Colombo, Western Province, Sri Lanka	daaed7c3afd83949	success	2026-05-28 16:46:57.046911
7	\N	admin	Super Administrator	login	Auth	User logged in successfully	122.165.225.42	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	Coimbatore, Tamil Nadu, India	43551362f9ff725e	success	2026-05-28 17:00:28.359881
8	\N	admin	Super Administrator	login	Auth	User logged in successfully	122.165.225.42	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	Coimbatore, Tamil Nadu, India	e7dfd25c3a6bc4af	success	2026-05-28 17:19:26.605001
9	\N	admin	Super Administrator	login	Auth	User logged in successfully	122.165.225.42	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	Coimbatore, Tamil Nadu, India	f190cd02f0cd1afb	success	2026-05-28 17:28:08.008623
10	\N	admin	Super Administrator	login	Auth	User logged in successfully	122.165.225.42	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	Coimbatore, Tamil Nadu, India	92a43d29df4a0223	success	2026-05-28 17:53:21.982195
11	\N	admin	Super Administrator	login	Auth	User logged in successfully	122.165.225.42	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	Coimbatore, Tamil Nadu, India	75c817e15abb1176	success	2026-05-28 17:56:14.581551
12	7	admin	Super Administrator	login	Auth	User logged in successfully	122.165.225.42	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	Coimbatore, Tamil Nadu, India	75389144b1c58955	success	2026-05-28 18:04:37.376344
13	11	srilanka@drivethru.de	Achala A A S De Silva	login	Auth	User logged in successfully	122.165.225.42	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	Coimbatore, Tamil Nadu, India	9f7335f37ea21f61	success	2026-05-28 18:49:14.5455
14	11	srilanka@drivethru.de	Achala A A S De Silva	logout	Auth	User logged out	122.165.225.42	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	Coimbatore, Tamil Nadu, India	9f7335f37ea21f61	success	2026-05-28 18:49:19.246156
15	11	srilanka@drivethru.de	Achala A A S De Silva	login	Auth	User logged in successfully	122.165.225.42	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	Coimbatore, Tamil Nadu, India	b48599343ff88f74	success	2026-05-29 04:51:03.81291
16	11	srilanka@drivethru.de	Achala A A S De Silva	logout	Auth	User logged out	122.165.225.42	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	Coimbatore, Tamil Nadu, India	b48599343ff88f74	success	2026-05-29 04:52:01.932457
17	11	srilanka@drivethru.de	Achala A A S De Silva	login	Auth	User logged in successfully	122.165.225.42	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	Coimbatore, Tamil Nadu, India	3add43382298d1a4	success	2026-05-29 05:05:12.051678
18	11	srilanka@drivethru.de	Achala A A S De Silva	login	Auth	User logged in successfully	122.165.225.42	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	Coimbatore, Tamil Nadu, India	cded8567c036788a	success	2026-06-01 04:06:35.917901
19	11	srilanka@drivethru.de	Achala A A S De Silva	login	Auth	User logged in successfully	14.1.78.105	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	Colombo, Western Province, Sri Lanka	fe89bd5c19e46f7f	success	2026-06-01 05:01:45.226646
20	11	srilanka@drivethru.de	Achala A A S De Silva	login	Auth	User logged in successfully	14.1.78.105	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	Colombo, Western Province, Sri Lanka	6fb74b08c3fb02da	success	2026-06-01 06:17:08.791008
21	11	srilanka@drivethru.de	Achala A A S De Silva	login	Auth	User logged in successfully	14.1.78.105	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	Colombo, Western Province, Sri Lanka	0e1341e09cea8452	success	2026-06-01 09:21:52.023717
22	11	srilanka@drivethru.de	Achala A A S De Silva	login	Auth	User logged in successfully	122.165.225.42	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	Coimbatore, Tamil Nadu, India	e0a43145225e4019	success	2026-06-02 04:39:38.007533
23	\N	srilank@drivethru.de		login_failed	Auth	Failed login attempt for username: srilank@drivethru.de	14.1.78.228	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	Colombo, Western Province, Sri Lanka	\N	failed	2026-06-03 03:29:30.018182
24	11	srilanka@drivethru.de	Achala A A S De Silva	login	Auth	User logged in successfully	122.165.225.42	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	Coimbatore, Tamil Nadu, India	375a85f7137d871f	success	2026-06-03 05:21:03.678688
25	11	srilanka@drivethru.de	Achala A A S De Silva	login	Auth	User logged in successfully	122.165.225.42	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	Coimbatore, Tamil Nadu, India	d038c27cc0c233d3	success	2026-06-03 07:06:56.324391
26	11	srilanka@drivethru.de	Achala A A S De Silva	login	Auth	User logged in successfully	14.1.78.228	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	Colombo, Western Province, Sri Lanka	2ba37fc88151ff86	success	2026-06-03 07:56:47.072552
27	11	srilanka@drivethru.de	Achala A A S De Silva	login	Auth	User logged in successfully	122.165.225.42	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	Coimbatore, Tamil Nadu, India	833e7514d5d6397e	success	2026-06-03 08:40:05.370406
28	11	srilanka@drivethru.de	Achala A A S De Silva	login	Auth	User logged in successfully	14.1.78.228	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	Colombo, Western Province, Sri Lanka	cddff6f824bfbf9f	success	2026-06-03 08:40:54.899402
29	11	srilanka@drivethru.de	Achala A A S De Silva	login	Auth	User logged in successfully	122.165.225.42	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	Coimbatore, Tamil Nadu, India	472fed9fabe08b5c	success	2026-06-03 10:04:01.923621
30	7	admin	Super Administrator	login	Auth	User logged in successfully	14.1.78.228	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	Colombo, Western Province, Sri Lanka	08b7ae3be5d093b8	success	2026-06-03 10:06:02.124902
31	7	admin	Super Administrator	login	Auth	User logged in successfully	14.1.78.228	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	Colombo, Western Province, Sri Lanka	4baa87fd4a3cde5f	success	2026-06-03 10:43:39.832856
32	7	admin	Super Administrator	login	Auth	User logged in successfully	14.1.78.228	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	Colombo, Western Province, Sri Lanka	7e81d7ae6bf1a915	success	2026-06-03 11:09:15.076085
33	7	admin	Super Administrator	login	Auth	User logged in successfully	14.1.78.228	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	Colombo, Western Province, Sri Lanka	90fd737c83fabcce	success	2026-06-03 11:22:24.5247
34	11	srilanka@drivethru.de	Achala A A S De Silva	login	Auth	User logged in successfully	122.165.225.42	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	Coimbatore, Tamil Nadu, India	672b437d9f230f3b	success	2026-06-03 11:42:17.657866
35	11	srilanka@drivethru.de	Achala A A S De Silva	login	Auth	User logged in successfully	14.1.78.228	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	Colombo, Western Province, Sri Lanka	5293911d2c502ee2	success	2026-06-03 11:51:46.268426
36	7	admin	Super Administrator	login	Auth	User logged in successfully	14.1.78.228	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	Colombo, Western Province, Sri Lanka	1435696cdad12e10	success	2026-06-03 11:51:55.92639
37	11	srilanka@drivethru.de	Achala A A S De Silva	login	Auth	User logged in successfully	14.1.78.228	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	Colombo, Western Province, Sri Lanka	5130273c16f96448	success	2026-06-04 03:26:34.81686
38	11	srilanka@drivethru.de	Achala A A S De Silva	login	Auth	User logged in successfully	14.1.78.228	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	Colombo, Western Province, Sri Lanka	d11c18e0b96dd1a8	success	2026-06-04 05:28:00.35484
39	\N	administrator		login_failed	Auth	Failed login attempt for username: administrator	175.157.228.45	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1	Colombo, Western Province, Sri Lanka	\N	failed	2026-06-04 08:59:18.700764
40	11	srilanka@drivethru.de	Achala A A S De Silva	login	Auth	User logged in successfully	43.252.15.159	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	Colombo, Western Province, Sri Lanka	bfbeed133596f606	success	2026-06-04 09:10:16.132129
41	11	srilanka@drivethru.de	Achala A A S De Silva	logout	Auth	User logged out	43.252.15.159	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	Colombo, Western Province, Sri Lanka	bfbeed133596f606	success	2026-06-04 09:52:47.228815
42	11	srilanka@drivethru.de	Achala A A S De Silva	login	Auth	User logged in successfully	122.165.225.42	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	Coimbatore, Tamil Nadu, India	5cefe755827632c7	success	2026-06-04 10:37:19.421621
43	11	srilanka@drivethru.de	Achala A A S De Silva	login	Auth	User logged in successfully	14.1.78.228	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	Colombo, Western Province, Sri Lanka	7738c36302fd7a16	success	2026-06-05 06:02:38.751709
44	11	srilanka@drivethru.de	Achala A A S De Silva	login	Auth	User logged in successfully	122.165.225.42	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	Coimbatore, Tamil Nadu, India	b1cb1361a0c6e236	success	2026-06-05 09:36:48.156942
45	11	srilanka@drivethru.de	Achala A A S De Silva	login	Auth	User logged in successfully	122.165.225.42	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	Coimbatore, Tamil Nadu, India	84616128541f10aa	success	2026-06-05 09:43:26.207744
46	7	admin	Super Administrator	login	Auth	User logged in successfully	14.1.78.228	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	Colombo, Western Province, Sri Lanka	6591a20e7fa58703	success	2026-06-05 10:33:27.394701
47	11	srilanka@drivethru.de	Achala A A S De Silva	login	Auth	User logged in successfully	122.165.225.42	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	Coimbatore, Tamil Nadu, India	c1ecba97d7f4dbac	success	2026-06-05 11:05:58.484533
\.


--
-- Data for Name: attendance_records; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.attendance_records (id, employee_id, branch_id, date, status, in_time1, out_time1, work_hours1, in_time2, out_time2, work_hours2, total_hours, overtime_hours, source, remarks, created_at, updated_at, leave_type, approval_status, approved_by, approval_note) FROM stdin;
4483	595	93	2026-05-01	present	00:04	01:03	0.98	07:08	08:04	0.93	1.91	0	biometric	\N	2026-05-28 18:07:48.792883	2026-05-28 18:07:48.792883	\N	\N	\N	\N
4484	595	93	2026-05-02	late	19:59	21:12	1.22	22:15	23:07	0.87	2.09	0	biometric	\N	2026-05-28 18:07:48.865874	2026-05-28 18:07:48.865874	\N	\N	\N	\N
4485	595	93	2026-05-03	present	00:01	01:02	1.02	07:04	08:11	1.12	2.14	0	biometric	\N	2026-05-28 18:07:48.937526	2026-05-28 18:07:48.937526	\N	\N	\N	\N
4486	595	93	2026-05-04	late	19:59	21:11	1.2	22:02	23:02	1	2.2	0	biometric	\N	2026-05-28 18:07:49.009039	2026-05-28 18:07:49.009039	\N	\N	\N	\N
4487	595	93	2026-05-05	present	00:05	01:08	1.05	07:07	08:02	0.92	1.97	0	biometric	\N	2026-05-28 18:07:49.080679	2026-05-28 18:07:49.080679	\N	\N	\N	\N
4488	595	93	2026-05-06	late	19:57	21:04	1.12	22:06	23:05	0.98	2.1	0	biometric	\N	2026-05-28 18:07:49.15315	2026-05-28 18:07:49.15315	\N	\N	\N	\N
4489	595	93	2026-05-07	present	00:03	01:06	1.05	07:02	08:05	1.05	2.1	0	biometric	\N	2026-05-28 18:07:49.225144	2026-05-28 18:07:49.225144	\N	\N	\N	\N
4490	595	93	2026-05-08	late	19:59	21:09	1.17	22:02	23:06	1.07	2.24	0	biometric	\N	2026-05-28 18:07:49.29675	2026-05-28 18:07:49.29675	\N	\N	\N	\N
4491	595	93	2026-05-09	present	00:03	01:04	1.02	07:03	08:47	1.73	2.75	0	biometric	\N	2026-05-28 18:07:49.368314	2026-05-28 18:07:49.368314	\N	\N	\N	\N
4492	595	93	2026-05-10	late	19:57	21:12	1.25	22:11	23:04	0.88	2.13	0	biometric	\N	2026-05-28 18:07:49.440349	2026-05-28 18:07:49.440349	\N	\N	\N	\N
4493	595	93	2026-05-11	present	00:01	01:10	1.15	07:06	08:04	0.97	2.12	0	biometric	\N	2026-05-28 18:07:49.511637	2026-05-28 18:07:49.511637	\N	\N	\N	\N
4494	595	93	2026-05-12	late	19:59	21:14	1.25	22:05	23:23	1.3	2.55	0	biometric	\N	2026-05-28 18:07:49.586084	2026-05-28 18:07:49.586084	\N	\N	\N	\N
4495	595	93	2026-05-13	present	00:08	01:10	1.03	07:19	08:08	0.82	1.85	0	biometric	\N	2026-05-28 18:07:49.657795	2026-05-28 18:07:49.657795	\N	\N	\N	\N
4496	595	93	2026-05-14	late	19:59	21:02	1.05	22:00	23:03	1.05	2.1	0	biometric	\N	2026-05-28 18:07:49.729849	2026-05-28 18:07:49.729849	\N	\N	\N	\N
4497	595	93	2026-05-15	present	00:02	01:01	0.98	07:04	08:11	1.12	2.1	0	biometric	\N	2026-05-28 18:07:49.800783	2026-05-28 18:07:49.800783	\N	\N	\N	\N
4498	595	93	2026-05-16	late	19:57	21:07	1.17	22:05	23:08	1.05	2.22	0	biometric	\N	2026-05-28 18:07:49.872649	2026-05-28 18:07:49.872649	\N	\N	\N	\N
4499	595	93	2026-05-17	present	00:12	01:08	0.93	07:15	08:10	0.92	1.85	0	biometric	\N	2026-05-28 18:07:49.944339	2026-05-28 18:07:49.944339	\N	\N	\N	\N
4500	595	93	2026-05-18	late	19:56	21:01	1.08	22:06	23:04	0.97	2.05	0	biometric	\N	2026-05-28 18:07:50.01822	2026-05-28 18:07:50.01822	\N	\N	\N	\N
4501	595	93	2026-05-19	present	00:00	01:02	1.03	07:00	08:09	1.15	2.18	0	biometric	\N	2026-05-28 18:07:50.089662	2026-05-28 18:07:50.089662	\N	\N	\N	\N
4502	595	93	2026-05-20	late	20:00	21:23	1.38	22:15	23:09	0.9	2.28	0	biometric	\N	2026-05-28 18:07:50.16144	2026-05-28 18:07:50.16144	\N	\N	\N	\N
4503	595	93	2026-05-21	present	00:13	01:02	0.82	07:08	08:22	1.23	2.05	0	biometric	\N	2026-05-28 18:07:50.233322	2026-05-28 18:07:50.233322	\N	\N	\N	\N
4504	595	93	2026-05-22	late	19:57	21:17	1.33	22:03	23:11	1.13	2.46	0	biometric	\N	2026-05-28 18:07:50.305165	2026-05-28 18:07:50.305165	\N	\N	\N	\N
4505	595	93	2026-05-23	present	00:12	01:01	0.82	07:04	08:13	1.15	1.97	0	biometric	\N	2026-05-28 18:07:50.377269	2026-05-28 18:07:50.377269	\N	\N	\N	\N
4506	595	93	2026-05-24	late	19:57	21:06	1.15	22:04	23:12	1.13	2.28	0	biometric	\N	2026-05-28 18:07:50.449919	2026-05-28 18:07:50.449919	\N	\N	\N	\N
4507	595	93	2026-05-25	present	00:14	01:13	0.98	07:11	08:01	0.83	1.81	0	biometric	\N	2026-05-28 18:07:50.521752	2026-05-28 18:07:50.521752	\N	\N	\N	\N
4508	595	93	2026-05-26	late	19:58	21:09	1.18	22:17	23:04	0.78	1.96	0	biometric	\N	2026-05-28 18:07:50.593412	2026-05-28 18:07:50.593412	\N	\N	\N	\N
4509	595	93	2026-05-27	present	00:09	01:07	0.97	07:02	08:14	1.2	2.17	0	biometric	\N	2026-05-28 18:07:50.664759	2026-05-28 18:07:50.664759	\N	\N	\N	\N
4511	607	92	2026-05-02	present	07:54	14:01	6.12	15:00	17:04	2.07	8.19	0	biometric	\N	2026-05-28 18:07:50.80794	2026-05-28 18:07:50.80794	\N	\N	\N	\N
4512	607	92	2026-05-06	present	08:00	14:01	6.02	\N	\N	\N	6.02	0	biometric	\N	2026-05-28 18:07:50.878651	2026-05-28 18:07:50.878651	\N	\N	\N	\N
4513	607	92	2026-05-07	late	08:20	14:00	5.67	\N	\N	\N	5.67	0	biometric	\N	2026-05-28 18:07:50.949494	2026-05-28 18:07:50.949494	\N	\N	\N	\N
4514	607	92	2026-05-08	present	07:53	\N	\N	\N	\N	\N	\N	\N	biometric	\N	2026-05-28 18:07:51.021422	2026-05-28 18:07:51.021422	\N	\N	\N	\N
4515	607	92	2026-05-13	present	08:07	14:24	6.28	\N	\N	\N	6.28	0	biometric	\N	2026-05-28 18:07:51.092659	2026-05-28 18:07:51.092659	\N	\N	\N	\N
4538	605	92	2026-05-21	late	13:38	\N	\N	\N	\N	\N	\N	\N	biometric	\N	2026-05-28 18:07:52.741648	2026-05-28 18:07:52.741648	\N	\N	\N	\N
4517	607	92	2026-05-15	present	08:07	\N	\N	\N	\N	\N	\N	\N	biometric	\N	2026-05-28 18:07:51.235679	2026-05-28 18:07:51.235679	\N	\N	\N	\N
4518	607	92	2026-05-18	present	08:15	13:18	5.05	14:05	17:01	2.93	7.98	0	biometric	\N	2026-05-28 18:07:51.307393	2026-05-28 18:07:51.307393	\N	\N	\N	\N
4519	607	92	2026-05-20	present	08:08	13:09	5.02	14:02	17:00	2.97	7.99	0	biometric	\N	2026-05-28 18:07:51.379253	2026-05-28 18:07:51.379253	\N	\N	\N	\N
4520	607	92	2026-05-25	present	07:38	12:41	5.05	13:52	16:58	3.1	8.15	0	biometric	\N	2026-05-28 18:07:51.450909	2026-05-28 18:07:51.450909	\N	\N	\N	\N
4521	607	92	2026-05-27	present	07:53	17:03	9.17	\N	\N	\N	9.17	0	biometric	\N	2026-05-28 18:07:51.522358	2026-05-28 18:07:51.522358	\N	\N	\N	\N
4523	605	92	2026-05-01	late	08:01	13:54	5.88	15:00	17:17	2.28	8.16	0	biometric	\N	2026-05-28 18:07:51.665787	2026-05-28 18:07:51.665787	\N	\N	\N	\N
4524	605	92	2026-05-02	late	08:09	14:18	6.15	14:42	17:05	2.38	8.53	0	biometric	\N	2026-05-28 18:07:51.737263	2026-05-28 18:07:51.737263	\N	\N	\N	\N
4525	605	92	2026-05-03	late	07:59	14:00	6.02	15:04	17:10	2.1	8.12	0	biometric	\N	2026-05-28 18:07:51.809338	2026-05-28 18:07:51.809338	\N	\N	\N	\N
4526	605	92	2026-05-04	late	08:59	18:01	9.03	\N	\N	\N	9.03	0	biometric	\N	2026-05-28 18:07:51.881222	2026-05-28 18:07:51.881222	\N	\N	\N	\N
4527	605	92	2026-05-05	late	09:04	13:31	4.45	\N	\N	\N	4.45	0	biometric	\N	2026-05-28 18:07:51.952382	2026-05-28 18:07:51.952382	\N	\N	\N	\N
4528	605	92	2026-05-06	late	09:09	12:12	3.05	\N	\N	\N	3.05	0	biometric	\N	2026-05-28 18:07:52.023799	2026-05-28 18:07:52.023799	\N	\N	\N	\N
4529	605	92	2026-05-07	late	09:09	09:42	0.55	09:42	13:11	3.48	4.03	0	biometric	\N	2026-05-28 18:07:52.09513	2026-05-28 18:07:52.09513	\N	\N	\N	\N
4530	605	92	2026-05-08	late	08:04	\N	\N	\N	\N	\N	\N	\N	biometric	\N	2026-05-28 18:07:52.166801	2026-05-28 18:07:52.166801	\N	\N	\N	\N
4531	605	92	2026-05-09	late	08:48	14:01	5.22	\N	\N	\N	5.22	0	biometric	\N	2026-05-28 18:07:52.238639	2026-05-28 18:07:52.238639	\N	\N	\N	\N
4532	605	92	2026-05-10	late	08:18	14:19	6.02	\N	\N	\N	6.02	0	biometric	\N	2026-05-28 18:07:52.310975	2026-05-28 18:07:52.310975	\N	\N	\N	\N
4533	605	92	2026-05-11	late	08:20	17:03	8.72	\N	\N	\N	8.72	0	biometric	\N	2026-05-28 18:07:52.38257	2026-05-28 18:07:52.38257	\N	\N	\N	\N
4534	605	92	2026-05-12	late	09:01	16:01	7	\N	\N	\N	7	0	biometric	\N	2026-05-28 18:07:52.454369	2026-05-28 18:07:52.454369	\N	\N	\N	\N
4535	605	92	2026-05-13	late	12:57	15:19	2.37	\N	\N	\N	2.37	0	biometric	\N	2026-05-28 18:07:52.526088	2026-05-28 18:07:52.526088	\N	\N	\N	\N
4536	605	92	2026-05-18	late	08:10	08:15	0.08	14:05	17:01	2.93	3.01	0	biometric	\N	2026-05-28 18:07:52.597825	2026-05-28 18:07:52.597825	\N	\N	\N	\N
4537	605	92	2026-05-20	late	14:07	16:13	2.1	\N	\N	\N	2.1	0	biometric	\N	2026-05-28 18:07:52.66997	2026-05-28 18:07:52.66997	\N	\N	\N	\N
4539	605	92	2026-05-23	late	08:04	13:20	5.27	14:21	19:54	5.55	10.82	1.32	biometric	\N	2026-05-28 18:07:52.81354	2026-05-28 18:07:52.81354	\N	\N	\N	\N
4540	605	92	2026-05-24	late	08:15	14:24	6.15	15:38	17:21	1.72	7.87	0	biometric	\N	2026-05-28 18:07:52.885026	2026-05-28 18:07:52.885026	\N	\N	\N	\N
4541	605	92	2026-05-25	late	08:16	13:53	5.62	13:53	16:58	3.08	8.7	0	biometric	\N	2026-05-28 18:07:52.957376	2026-05-28 18:07:52.957376	\N	\N	\N	\N
4542	605	92	2026-05-27	late	14:09	17:00	2.85	\N	\N	\N	2.85	0	biometric	\N	2026-05-28 18:07:53.029002	2026-05-28 18:07:53.029002	\N	\N	\N	\N
4543	608	92	2026-05-01	present	08:04	14:00	5.93	15:04	17:02	1.97	7.9	0	biometric	\N	2026-05-28 18:07:53.10109	2026-05-28 18:07:53.10109	\N	\N	\N	\N
4544	608	92	2026-05-03	present	08:08	14:01	5.88	14:55	17:01	2.1	7.98	0	biometric	\N	2026-05-28 18:07:53.172796	2026-05-28 18:07:53.172796	\N	\N	\N	\N
4546	608	92	2026-05-12	present	07:57	14:10	6.22	\N	\N	\N	6.22	0	biometric	\N	2026-05-28 18:07:53.317374	2026-05-28 18:07:53.317374	\N	\N	\N	\N
4547	608	92	2026-05-18	present	08:00	13:28	5.47	14:26	17:00	2.57	8.04	0	biometric	\N	2026-05-28 18:07:53.389312	2026-05-28 18:07:53.389312	\N	\N	\N	\N
4516	607	92	2026-05-14	late	14:09	\N	\N	\N	\N	\N	\N	\N	biometric	\N	2026-05-28 18:07:51.16416	2026-05-28 18:07:51.16416	\N	\N	\N	\N
4613	594	92	2026-05-02	present	00:01	01:01	1	07:01	08:01	1	2	0	biometric	\N	2026-05-28 18:07:58.138601	2026-05-28 18:07:58.138601	\N	\N	\N	\N
4549	608	92	2026-05-20	present	07:58	13:33	5.58	14:24	17:01	2.62	8.2	0	biometric	\N	2026-05-28 18:07:53.533051	2026-05-28 18:07:53.533051	\N	\N	\N	\N
4550	608	92	2026-05-22	late	16:58	20:00	3.03	\N	\N	\N	3.03	0	biometric	\N	2026-05-28 18:07:53.60518	2026-05-28 18:07:53.60518	\N	\N	\N	\N
4551	608	92	2026-05-25	present	07:58	13:36	5.63	14:26	17:00	2.57	8.2	0	biometric	\N	2026-05-28 18:07:53.677894	2026-05-28 18:07:53.677894	\N	\N	\N	\N
4552	608	92	2026-05-26	present	08:00	13:45	5.75	14:09	17:04	2.92	8.67	0	biometric	\N	2026-05-28 18:07:53.749537	2026-05-28 18:07:53.749537	\N	\N	\N	\N
4553	608	92	2026-05-27	present	07:58	13:32	5.57	14:09	17:03	2.9	8.47	0	biometric	\N	2026-05-28 18:07:53.821871	2026-05-28 18:07:53.821871	\N	\N	\N	\N
4555	610	92	2026-05-11	late	08:19	17:03	8.73	\N	\N	\N	8.73	0	biometric	\N	2026-05-28 18:07:53.966721	2026-05-28 18:07:53.966721	\N	\N	\N	\N
4556	610	92	2026-05-12	late	08:59	15:03	6.07	\N	\N	\N	6.07	0	biometric	\N	2026-05-28 18:07:54.038758	2026-05-28 18:07:54.038758	\N	\N	\N	\N
4557	610	92	2026-05-13	late	13:01	15:01	2	\N	\N	\N	2	0	biometric	\N	2026-05-28 18:07:54.11161	2026-05-28 18:07:54.11161	\N	\N	\N	\N
4558	610	92	2026-05-14	late	13:03	15:04	2.02	\N	\N	\N	2.02	0	biometric	\N	2026-05-28 18:07:54.184302	2026-05-28 18:07:54.184302	\N	\N	\N	\N
4559	610	92	2026-05-15	late	12:59	15:32	2.55	\N	\N	\N	2.55	0	biometric	\N	2026-05-28 18:07:54.256043	2026-05-28 18:07:54.256043	\N	\N	\N	\N
4560	610	92	2026-05-18	late	08:23	13:19	4.93	14:05	17:06	3.02	7.95	0	biometric	\N	2026-05-28 18:07:54.328607	2026-05-28 18:07:54.328607	\N	\N	\N	\N
4561	610	92	2026-05-20	late	08:21	13:13	4.87	13:49	17:00	3.18	8.05	0	biometric	\N	2026-05-28 18:07:54.400675	2026-05-28 18:07:54.400675	\N	\N	\N	\N
4562	610	92	2026-05-22	late	08:23	14:03	5.67	14:50	17:00	2.17	7.84	0	biometric	\N	2026-05-28 18:07:54.472363	2026-05-28 18:07:54.472363	\N	\N	\N	\N
4563	610	92	2026-05-23	late	08:32	13:57	5.42	14:56	17:00	2.07	7.49	0	biometric	\N	2026-05-28 18:07:54.544532	2026-05-28 18:07:54.544532	\N	\N	\N	\N
4564	610	92	2026-05-25	late	08:24	12:56	4.53	13:52	17:01	3.15	7.68	0	biometric	\N	2026-05-28 18:07:54.616868	2026-05-28 18:07:54.616868	\N	\N	\N	\N
4565	610	92	2026-05-27	late	08:40	13:14	4.57	13:58	17:03	3.08	7.65	0	biometric	\N	2026-05-28 18:07:54.688869	2026-05-28 18:07:54.688869	\N	\N	\N	\N
4567	600	92	2026-05-04	late	09:12	13:49	4.62	14:39	18:15	3.6	8.22	0	biometric	\N	2026-05-28 18:07:54.832797	2026-05-28 18:07:54.832797	\N	\N	\N	\N
4568	600	92	2026-05-08	late	08:29	17:21	8.87	\N	\N	\N	8.87	0	biometric	\N	2026-05-28 18:07:54.904176	2026-05-28 18:07:54.904176	\N	\N	\N	\N
4569	600	92	2026-05-18	late	08:47	13:12	4.42	13:12	17:04	3.87	8.29	0	biometric	\N	2026-05-28 18:07:54.975727	2026-05-28 18:07:54.975727	\N	\N	\N	\N
4570	600	92	2026-05-19	late	08:20	13:18	4.97	13:18	17:05	3.78	8.75	0	biometric	\N	2026-05-28 18:07:55.047306	2026-05-28 18:07:55.047306	\N	\N	\N	\N
4572	600	92	2026-05-21	late	09:39	14:12	4.55	14:12	17:06	2.9	7.45	0	biometric	\N	2026-05-28 18:07:55.191397	2026-05-28 18:07:55.191397	\N	\N	\N	\N
4573	600	92	2026-05-25	late	08:25	13:28	5.05	14:21	17:14	2.88	7.93	0	biometric	\N	2026-05-28 18:07:55.263384	2026-05-28 18:07:55.263384	\N	\N	\N	\N
4574	600	92	2026-05-26	late	09:25	12:10	2.75	14:25	17:19	2.9	5.65	0	biometric	\N	2026-05-28 18:07:55.335377	2026-05-28 18:07:55.335377	\N	\N	\N	\N
4575	600	92	2026-05-27	late	08:43	13:21	4.63	13:21	17:07	3.77	8.4	0	biometric	\N	2026-05-28 18:07:55.407294	2026-05-28 18:07:55.407294	\N	\N	\N	\N
4576	600	92	2026-05-28	late	08:32	13:23	4.85	13:40	17:27	3.78	8.63	0	biometric	\N	2026-05-28 18:07:55.479279	2026-05-28 18:07:55.479279	\N	\N	\N	\N
4577	602	92	2026-05-01	late	17:06	19:56	2.83	\N	\N	\N	2.83	0	biometric	\N	2026-05-28 18:07:55.551948	2026-05-28 18:07:55.551948	\N	\N	\N	\N
4578	602	92	2026-05-02	late	17:01	19:59	2.97	\N	\N	\N	2.97	0	biometric	\N	2026-05-28 18:07:55.623764	2026-05-28 18:07:55.623764	\N	\N	\N	\N
4579	602	92	2026-05-03	late	16:57	19:59	3.03	\N	\N	\N	3.03	0	biometric	\N	2026-05-28 18:07:55.696105	2026-05-28 18:07:55.696105	\N	\N	\N	\N
4580	602	92	2026-05-04	late	18:01	\N	\N	\N	\N	\N	\N	\N	biometric	\N	2026-05-28 18:07:55.768914	2026-05-28 18:07:55.768914	\N	\N	\N	\N
4581	602	92	2026-05-05	late	09:27	15:03	5.6	\N	\N	\N	5.6	0	biometric	\N	2026-05-28 18:07:55.840879	2026-05-28 18:07:55.840879	\N	\N	\N	\N
4582	602	92	2026-05-07	late	09:42	\N	\N	\N	\N	\N	\N	\N	biometric	\N	2026-05-28 18:07:55.912577	2026-05-28 18:07:55.912577	\N	\N	\N	\N
4583	602	92	2026-05-09	late	15:11	19:57	4.77	\N	\N	\N	4.77	0	biometric	\N	2026-05-28 18:07:55.984169	2026-05-28 18:07:55.984169	\N	\N	\N	\N
4584	602	92	2026-05-10	late	15:11	19:58	4.78	\N	\N	\N	4.78	0	biometric	\N	2026-05-28 18:07:56.055878	2026-05-28 18:07:56.055878	\N	\N	\N	\N
4585	602	92	2026-05-11	late	10:57	14:47	3.83	15:51	19:58	4.12	7.95	0	biometric	\N	2026-05-28 18:07:56.127715	2026-05-28 18:07:56.127715	\N	\N	\N	\N
4586	602	92	2026-05-12	late	09:16	\N	\N	\N	\N	\N	\N	\N	biometric	\N	2026-05-28 18:07:56.19989	2026-05-28 18:07:56.19989	\N	\N	\N	\N
4587	602	92	2026-05-16	late	15:11	19:57	4.77	\N	\N	\N	4.77	0	biometric	\N	2026-05-28 18:07:56.271921	2026-05-28 18:07:56.271921	\N	\N	\N	\N
4588	602	92	2026-05-17	late	14:58	19:57	4.98	\N	\N	\N	4.98	0	biometric	\N	2026-05-28 18:07:56.343756	2026-05-28 18:07:56.343756	\N	\N	\N	\N
4590	602	92	2026-05-20	late	13:58	16:07	2.15	17:05	20:00	2.92	5.07	0	biometric	\N	2026-05-28 18:07:56.487515	2026-05-28 18:07:56.487515	\N	\N	\N	\N
4591	602	92	2026-05-21	late	17:00	19:57	2.95	\N	\N	\N	2.95	0	biometric	\N	2026-05-28 18:07:56.55929	2026-05-28 18:07:56.55929	\N	\N	\N	\N
4592	602	92	2026-05-24	late	16:58	19:57	2.98	\N	\N	\N	2.98	0	biometric	\N	2026-05-28 18:07:56.631386	2026-05-28 18:07:56.631386	\N	\N	\N	\N
4593	602	92	2026-05-25	late	11:05	20:00	8.92	\N	\N	\N	8.92	0	biometric	\N	2026-05-28 18:07:56.703124	2026-05-28 18:07:56.703124	\N	\N	\N	\N
4594	602	92	2026-05-26	late	17:24	19:58	2.57	\N	\N	\N	2.57	0	biometric	\N	2026-05-28 18:07:56.774824	2026-05-28 18:07:56.774824	\N	\N	\N	\N
4595	602	92	2026-05-27	late	13:09	19:58	6.82	\N	\N	\N	6.82	0	biometric	\N	2026-05-28 18:07:56.846588	2026-05-28 18:07:56.846588	\N	\N	\N	\N
4596	603	92	2026-05-01	late	17:06	19:57	2.85	\N	\N	\N	2.85	0	biometric	\N	2026-05-28 18:07:56.918016	2026-05-28 18:07:56.918016	\N	\N	\N	\N
4597	603	92	2026-05-04	late	09:06	18:01	8.92	\N	\N	\N	8.92	0	biometric	\N	2026-05-28 18:07:56.989531	2026-05-28 18:07:56.989531	\N	\N	\N	\N
4598	603	92	2026-05-05	late	09:04	13:11	4.12	\N	\N	\N	4.12	0	biometric	\N	2026-05-28 18:07:57.062094	2026-05-28 18:07:57.062094	\N	\N	\N	\N
4599	603	92	2026-05-06	late	09:01	15:07	6.1	\N	\N	\N	6.1	0	biometric	\N	2026-05-28 18:07:57.133675	2026-05-28 18:07:57.133675	\N	\N	\N	\N
4600	603	92	2026-05-07	late	09:08	15:02	5.9	\N	\N	\N	5.9	0	biometric	\N	2026-05-28 18:07:57.205526	2026-05-28 18:07:57.205526	\N	\N	\N	\N
4601	603	92	2026-05-08	late	20:01	\N	\N	\N	\N	\N	\N	\N	biometric	\N	2026-05-28 18:07:57.27708	2026-05-28 18:07:57.27708	\N	\N	\N	\N
4602	603	92	2026-05-12	late	09:13	11:58	2.75	\N	\N	\N	2.75	0	biometric	\N	2026-05-28 18:07:57.348728	2026-05-28 18:07:57.348728	\N	\N	\N	\N
4603	603	92	2026-05-16	late	08:10	14:03	5.88	\N	\N	\N	5.88	0	biometric	\N	2026-05-28 18:07:57.421011	2026-05-28 18:07:57.421011	\N	\N	\N	\N
4604	603	92	2026-05-17	late	08:14	14:02	5.8	\N	\N	\N	5.8	0	biometric	\N	2026-05-28 18:07:57.493062	2026-05-28 18:07:57.493062	\N	\N	\N	\N
4605	603	92	2026-05-18	late	11:03	13:11	2.13	14:05	19:57	5.87	8	0	biometric	\N	2026-05-28 18:07:57.564606	2026-05-28 18:07:57.564606	\N	\N	\N	\N
4606	603	92	2026-05-19	late	08:08	14:01	5.88	15:03	17:04	2.02	7.9	0	biometric	\N	2026-05-28 18:07:57.636433	2026-05-28 18:07:57.636433	\N	\N	\N	\N
4607	603	92	2026-05-20	late	11:04	13:26	2.37	13:56	16:28	2.53	4.9	0	biometric	\N	2026-05-28 18:07:57.707962	2026-05-28 18:07:57.707962	\N	\N	\N	\N
4608	603	92	2026-05-22	late	08:17	13:26	5.15	14:30	17:00	2.5	7.65	0	biometric	\N	2026-05-28 18:07:57.77955	2026-05-28 18:07:57.77955	\N	\N	\N	\N
4609	603	92	2026-05-25	late	11:19	12:56	1.62	13:52	20:00	6.13	7.75	0	biometric	\N	2026-05-28 18:07:57.85122	2026-05-28 18:07:57.85122	\N	\N	\N	\N
4610	603	92	2026-05-27	late	13:49	19:58	6.15	\N	\N	\N	6.15	0	biometric	\N	2026-05-28 18:07:57.923187	2026-05-28 18:07:57.923187	\N	\N	\N	\N
4611	603	92	2026-05-28	late	08:23	\N	\N	\N	\N	\N	\N	\N	biometric	\N	2026-05-28 18:07:57.995303	2026-05-28 18:07:57.995303	\N	\N	\N	\N
4612	594	92	2026-05-01	present	19:56	\N	\N	19:56	08:01	12.08	12.08	1	biometric	\N	2026-05-28 18:07:58.066574	2026-05-28 18:07:58.066574	\N	\N	\N	\N
4614	594	92	2026-05-03	present	19:58	\N	\N	19:58	08:01	12.05	12.05	1	biometric	\N	2026-05-28 18:07:58.210274	2026-05-28 18:07:58.210274	\N	\N	\N	\N
4554	610	92	2026-05-01	late	14:16	15:00	0.73	15:00	16:55	1.92	2.65	0	biometric	\N	2026-05-28 18:07:53.894168	2026-05-28 18:07:53.894168	\N	\N	\N	\N
4615	594	92	2026-05-04	present	00:01	01:01	1	07:02	08:01	0.98	1.98	0	biometric	\N	2026-05-28 18:07:58.281502	2026-05-28 18:07:58.281502	\N	\N	\N	\N
4617	594	92	2026-05-06	present	00:01	01:01	1	07:01	08:01	1	2	0	biometric	\N	2026-05-28 18:07:58.42445	2026-05-28 18:07:58.42445	\N	\N	\N	\N
4619	594	92	2026-05-08	present	00:02	01:01	0.98	07:01	08:00	0.98	1.96	0	biometric	\N	2026-05-28 18:07:58.568235	2026-05-28 18:07:58.568235	\N	\N	\N	\N
4621	594	92	2026-05-10	present	00:00	01:01	1.02	07:01	08:00	0.98	2	0	biometric	\N	2026-05-28 18:07:58.713812	2026-05-28 18:07:58.713812	\N	\N	\N	\N
4623	594	92	2026-05-12	present	00:01	01:01	1	07:01	08:01	1	2	0	biometric	\N	2026-05-28 18:07:58.857688	2026-05-28 18:07:58.857688	\N	\N	\N	\N
4625	594	92	2026-05-14	present	00:01	01:01	1	07:01	08:00	0.98	1.98	0	biometric	\N	2026-05-28 18:07:59.001285	2026-05-28 18:07:59.001285	\N	\N	\N	\N
4627	594	92	2026-05-16	present	00:01	01:01	1	07:01	08:01	1	2	0	biometric	\N	2026-05-28 18:07:59.145156	2026-05-28 18:07:59.145156	\N	\N	\N	\N
4629	594	92	2026-05-18	present	00:01	01:01	1	07:01	08:00	0.98	1.98	0	biometric	\N	2026-05-28 18:07:59.288794	2026-05-28 18:07:59.288794	\N	\N	\N	\N
4631	594	92	2026-05-20	present	00:01	01:01	1	07:01	08:01	1	2	0	biometric	\N	2026-05-28 18:07:59.433266	2026-05-28 18:07:59.433266	\N	\N	\N	\N
4633	594	92	2026-05-22	present	00:01	01:01	1	07:00	08:01	1.02	2.02	0	biometric	\N	2026-05-28 18:07:59.577906	2026-05-28 18:07:59.577906	\N	\N	\N	\N
4635	594	92	2026-05-24	present	00:01	01:01	1	07:01	08:00	0.98	1.98	0	biometric	\N	2026-05-28 18:07:59.721473	2026-05-28 18:07:59.721473	\N	\N	\N	\N
4637	594	92	2026-05-26	present	00:01	01:01	1	07:01	08:01	1	2	0	biometric	\N	2026-05-28 18:07:59.865267	2026-05-28 18:07:59.865267	\N	\N	\N	\N
4639	594	92	2026-05-28	present	00:01	00:58	0.95	07:01	08:00	0.98	1.93	0	biometric	\N	2026-05-28 18:08:00.00841	2026-05-28 18:08:00.00841	\N	\N	\N	\N
4618	594	92	2026-05-07	present	19:56	\N	\N	19:56	08:00	12.07	12.07	1	biometric	\N	2026-05-28 18:07:58.495997	2026-05-28 18:07:58.495997	\N	\N	\N	\N
4620	594	92	2026-05-09	present	19:56	\N	\N	19:56	08:00	12.07	12.07	1	biometric	\N	2026-05-28 18:07:58.640647	2026-05-28 18:07:58.640647	\N	\N	\N	\N
4622	594	92	2026-05-11	present	19:57	\N	\N	19:57	08:01	12.07	12.07	1	biometric	\N	2026-05-28 18:07:58.785801	2026-05-28 18:07:58.785801	\N	\N	\N	\N
4624	594	92	2026-05-13	present	19:56	\N	\N	19:56	08:00	12.07	12.07	1	biometric	\N	2026-05-28 18:07:58.929573	2026-05-28 18:07:58.929573	\N	\N	\N	\N
4626	594	92	2026-05-15	present	19:56	\N	\N	19:56	08:01	12.08	12.08	1	biometric	\N	2026-05-28 18:07:59.073164	2026-05-28 18:07:59.073164	\N	\N	\N	\N
4628	594	92	2026-05-17	present	19:57	\N	\N	19:57	08:00	12.05	12.05	1	biometric	\N	2026-05-28 18:07:59.216777	2026-05-28 18:07:59.216777	\N	\N	\N	\N
4630	594	92	2026-05-19	present	19:55	\N	\N	19:55	08:01	12.1	12.1	1	biometric	\N	2026-05-28 18:07:59.361503	2026-05-28 18:07:59.361503	\N	\N	\N	\N
4632	594	92	2026-05-21	present	19:56	\N	\N	19:56	08:01	12.08	12.08	1	biometric	\N	2026-05-28 18:07:59.505636	2026-05-28 18:07:59.505636	\N	\N	\N	\N
4634	594	92	2026-05-23	present	19:55	\N	\N	19:55	08:00	12.08	12.08	1	biometric	\N	2026-05-28 18:07:59.649377	2026-05-28 18:07:59.649377	\N	\N	\N	\N
4636	594	92	2026-05-25	present	19:58	\N	\N	19:58	08:01	12.05	12.05	1	biometric	\N	2026-05-28 18:07:59.793405	2026-05-28 18:07:59.793405	\N	\N	\N	\N
4638	594	92	2026-05-27	present	19:57	\N	\N	19:57	08:00	12.05	12.05	1	biometric	\N	2026-05-28 18:07:59.93665	2026-05-28 18:07:59.93665	\N	\N	\N	\N
4640	609	92	2026-05-02	present	08:04	14:01	5.95	15:01	17:05	2.07	8.02	0	biometric	\N	2026-05-28 18:08:00.080422	2026-05-28 18:08:00.080422	\N	\N	\N	\N
4641	609	92	2026-05-09	late	08:20	14:01	5.68	\N	\N	\N	5.68	0	biometric	\N	2026-05-28 18:08:00.152375	2026-05-28 18:08:00.152375	\N	\N	\N	\N
4642	609	92	2026-05-10	late	08:17	14:16	5.98	\N	\N	\N	5.98	0	biometric	\N	2026-05-28 18:08:00.224912	2026-05-28 18:08:00.224912	\N	\N	\N	\N
4643	609	92	2026-05-12	late	09:16	15:03	5.78	\N	\N	\N	5.78	0	biometric	\N	2026-05-28 18:08:00.297453	2026-05-28 18:08:00.297453	\N	\N	\N	\N
4644	609	92	2026-05-13	late	13:01	15:01	2	\N	\N	\N	2	0	biometric	\N	2026-05-28 18:08:00.368874	2026-05-28 18:08:00.368874	\N	\N	\N	\N
4645	609	92	2026-05-14	late	13:01	15:03	2.03	\N	\N	\N	2.03	0	biometric	\N	2026-05-28 18:08:00.440733	2026-05-28 18:08:00.440733	\N	\N	\N	\N
4646	609	92	2026-05-15	late	12:59	15:32	2.55	\N	\N	\N	2.55	0	biometric	\N	2026-05-28 18:08:00.512804	2026-05-28 18:08:00.512804	\N	\N	\N	\N
4647	609	92	2026-05-16	present	08:10	14:03	5.88	\N	\N	\N	5.88	0	biometric	\N	2026-05-28 18:08:00.584594	2026-05-28 18:08:00.584594	\N	\N	\N	\N
4648	609	92	2026-05-17	present	08:14	14:04	5.83	\N	\N	\N	5.83	0	biometric	\N	2026-05-28 18:08:00.656229	2026-05-28 18:08:00.656229	\N	\N	\N	\N
4649	609	92	2026-05-18	present	08:10	13:19	5.15	14:05	17:01	2.93	8.08	0	biometric	\N	2026-05-28 18:08:00.72782	2026-05-28 18:08:00.72782	\N	\N	\N	\N
4650	609	92	2026-05-20	late	08:19	13:07	4.8	13:53	17:00	3.12	7.92	0	biometric	\N	2026-05-28 18:08:00.79908	2026-05-28 18:08:00.79908	\N	\N	\N	\N
4651	609	92	2026-05-21	late	17:00	19:57	2.95	\N	\N	\N	2.95	0	biometric	\N	2026-05-28 18:08:00.870964	2026-05-28 18:08:00.870964	\N	\N	\N	\N
4652	609	92	2026-05-24	present	08:15	14:08	5.88	15:05	17:21	2.27	8.15	0	biometric	\N	2026-05-28 18:08:00.942624	2026-05-28 18:08:00.942624	\N	\N	\N	\N
4653	609	92	2026-05-25	present	08:15	13:53	5.63	13:53	17:01	3.13	8.76	0	biometric	\N	2026-05-28 18:08:01.014325	2026-05-28 18:08:01.014325	\N	\N	\N	\N
4654	609	92	2026-05-27	present	07:53	13:15	5.37	13:15	17:02	3.78	9.15	0	biometric	\N	2026-05-28 18:08:01.08552	2026-05-28 18:08:01.08552	\N	\N	\N	\N
4655	601	92	2026-05-02	late	16:51	20:00	3.15	\N	\N	\N	3.15	0	biometric	\N	2026-05-28 18:08:01.156622	2026-05-28 18:08:01.156622	\N	\N	\N	\N
4656	601	92	2026-05-03	late	17:00	19:58	2.97	\N	\N	\N	2.97	0	biometric	\N	2026-05-28 18:08:01.228566	2026-05-28 18:08:01.228566	\N	\N	\N	\N
4657	601	92	2026-05-04	late	11:03	14:11	3.13	15:08	20:00	4.87	8	0	biometric	\N	2026-05-28 18:08:01.30038	2026-05-28 18:08:01.30038	\N	\N	\N	\N
4658	601	92	2026-05-05	late	15:01	20:00	4.98	\N	\N	\N	4.98	0	biometric	\N	2026-05-28 18:08:01.372364	2026-05-28 18:08:01.372364	\N	\N	\N	\N
4659	601	92	2026-05-06	late	15:02	20:00	4.97	\N	\N	\N	4.97	0	biometric	\N	2026-05-28 18:08:01.444364	2026-05-28 18:08:01.444364	\N	\N	\N	\N
4660	601	92	2026-05-07	late	15:03	20:01	4.97	\N	\N	\N	4.97	0	biometric	\N	2026-05-28 18:08:01.515981	2026-05-28 18:08:01.515981	\N	\N	\N	\N
4661	601	92	2026-05-12	late	15:03	19:59	4.93	\N	\N	\N	4.93	0	biometric	\N	2026-05-28 18:08:01.587845	2026-05-28 18:08:01.587845	\N	\N	\N	\N
4662	601	92	2026-05-13	late	15:00	20:03	5.05	\N	\N	\N	5.05	0	biometric	\N	2026-05-28 18:08:01.659796	2026-05-28 18:08:01.659796	\N	\N	\N	\N
4663	601	92	2026-05-14	late	15:03	20:01	4.97	\N	\N	\N	4.97	0	biometric	\N	2026-05-28 18:08:01.730637	2026-05-28 18:08:01.730637	\N	\N	\N	\N
4664	601	92	2026-05-15	late	15:32	20:00	4.47	\N	\N	\N	4.47	0	biometric	\N	2026-05-28 18:08:01.802054	2026-05-28 18:08:01.802054	\N	\N	\N	\N
4665	601	92	2026-05-18	late	07:49	13:27	5.63	14:12	16:59	2.78	8.41	0	biometric	\N	2026-05-28 18:08:01.873303	2026-05-28 18:08:01.873303	\N	\N	\N	\N
4666	601	92	2026-05-19	late	17:04	20:00	2.93	\N	\N	\N	2.93	0	biometric	\N	2026-05-28 18:08:01.945278	2026-05-28 18:08:01.945278	\N	\N	\N	\N
4667	617	92	2026-05-03	present	08:00	14:00	6	14:48	17:00	2.2	8.2	0	biometric	\N	2026-05-28 18:08:02.016979	2026-05-28 18:08:02.016979	\N	\N	\N	\N
4668	617	92	2026-05-04	present	07:58	14:00	6.03	14:57	17:00	2.05	8.08	0	biometric	\N	2026-05-28 18:08:02.089109	2026-05-28 18:08:02.089109	\N	\N	\N	\N
4669	617	92	2026-05-05	present	07:58	14:00	6.03	\N	\N	\N	6.03	0	biometric	\N	2026-05-28 18:08:02.161001	2026-05-28 18:08:02.161001	\N	\N	\N	\N
4670	617	92	2026-05-09	present	07:38	14:00	6.37	\N	\N	\N	6.37	0	biometric	\N	2026-05-28 18:08:02.232637	2026-05-28 18:08:02.232637	\N	\N	\N	\N
4672	617	92	2026-05-13	present	07:53	14:03	6.17	\N	\N	\N	6.17	0	biometric	\N	2026-05-28 18:08:02.376065	2026-05-28 18:08:02.376065	\N	\N	\N	\N
4673	617	92	2026-05-18	present	08:00	14:00	6	15:07	16:59	1.87	7.87	0	biometric	\N	2026-05-28 18:08:02.447209	2026-05-28 18:08:02.447209	\N	\N	\N	\N
4674	617	92	2026-05-20	present	07:59	14:00	6.02	15:00	17:00	2	8.02	0	biometric	\N	2026-05-28 18:08:02.518702	2026-05-28 18:08:02.518702	\N	\N	\N	\N
4675	617	92	2026-05-21	present	07:57	13:49	5.87	15:05	17:00	1.92	7.79	0	biometric	\N	2026-05-28 18:08:02.590634	2026-05-28 18:08:02.590634	\N	\N	\N	\N
4676	617	92	2026-05-23	present	07:55	12:55	5	13:57	17:00	3.05	8.05	0	biometric	\N	2026-05-28 18:08:02.662394	2026-05-28 18:08:02.662394	\N	\N	\N	\N
4677	617	92	2026-05-25	present	07:57	14:00	6.05	15:06	17:00	1.9	7.95	0	biometric	\N	2026-05-28 18:08:02.733967	2026-05-28 18:08:02.733967	\N	\N	\N	\N
4678	617	92	2026-05-27	present	07:59	14:00	6.02	14:59	16:59	2	8.02	0	biometric	\N	2026-05-28 18:08:02.806312	2026-05-28 18:08:02.806312	\N	\N	\N	\N
4745	595	93	2026-05-28	present	19:57	\N	\N	19:57	08:24	12.45	12.45	1	biometric	\N	2026-05-29 04:50:33.178028	2026-05-29 04:50:33.178028	\N	\N	\N	\N
4747	609	92	2026-05-28	late	17:04	20:00	2.93	\N	\N	\N	2.93	0	biometric	\N	2026-05-29 04:50:33.214828	2026-05-29 04:50:33.214828	\N	\N	\N	\N
4679	617	92	2026-05-28	present	08:00	14:00	6	14:45	17:00	2.25	8.25	0	biometric	\N	2026-05-28 18:08:02.879114	2026-05-28 18:08:02.879114	\N	\N	\N	\N
4681	599	92	2026-05-04	late	09:40	18:19	8.65	\N	\N	\N	8.65	0	biometric	\N	2026-05-28 18:08:03.023107	2026-05-28 18:08:03.023107	\N	\N	\N	\N
4682	599	92	2026-05-05	late	09:30	14:45	5.25	15:44	17:27	1.72	6.97	0	biometric	\N	2026-05-28 18:08:03.095705	2026-05-28 18:08:03.095705	\N	\N	\N	\N
4683	599	92	2026-05-06	late	10:23	12:51	2.47	12:51	16:48	3.95	6.42	0	biometric	\N	2026-05-28 18:08:03.168047	2026-05-28 18:08:03.168047	\N	\N	\N	\N
4684	599	92	2026-05-07	late	09:41	13:16	3.58	15:24	17:47	2.38	5.96	0	biometric	\N	2026-05-28 18:08:03.240391	2026-05-28 18:08:03.240391	\N	\N	\N	\N
4685	599	92	2026-05-10	late	09:41	19:08	9.45	\N	\N	\N	9.45	0	biometric	\N	2026-05-28 18:08:03.31194	2026-05-28 18:08:03.31194	\N	\N	\N	\N
4686	599	92	2026-05-11	late	09:42	14:23	4.68	14:50	18:22	3.53	8.21	0	biometric	\N	2026-05-28 18:08:03.384304	2026-05-28 18:08:03.384304	\N	\N	\N	\N
4687	599	92	2026-05-12	late	09:32	15:42	6.17	\N	\N	\N	6.17	0	biometric	\N	2026-05-28 18:08:03.456872	2026-05-28 18:08:03.456872	\N	\N	\N	\N
4688	599	92	2026-05-13	late	09:37	15:50	6.22	\N	\N	\N	6.22	0	biometric	\N	2026-05-28 18:08:03.52905	2026-05-28 18:08:03.52905	\N	\N	\N	\N
4689	599	92	2026-05-14	late	09:47	17:59	8.2	\N	\N	\N	8.2	0	biometric	\N	2026-05-28 18:08:03.601684	2026-05-28 18:08:03.601684	\N	\N	\N	\N
4690	599	92	2026-05-17	late	09:24	16:15	6.85	\N	\N	\N	6.85	0	biometric	\N	2026-05-28 18:08:03.673939	2026-05-28 18:08:03.673939	\N	\N	\N	\N
4691	599	92	2026-05-19	late	08:55	12:46	3.85	\N	\N	\N	3.85	0	biometric	\N	2026-05-28 18:08:03.745643	2026-05-28 18:08:03.745643	\N	\N	\N	\N
4692	599	92	2026-05-20	late	09:15	17:07	7.87	\N	\N	\N	7.87	0	biometric	\N	2026-05-28 18:08:03.818042	2026-05-28 18:08:03.818042	\N	\N	\N	\N
4696	599	92	2026-05-27	late	14:15	\N	\N	\N	\N	\N	\N	\N	biometric	\N	2026-05-28 18:08:04.106359	2026-05-28 18:08:04.106359	\N	\N	\N	\N
4694	599	92	2026-05-24	late	09:58	16:53	6.92	\N	\N	\N	6.92	0	biometric	\N	2026-05-28 18:08:03.961896	2026-05-28 18:08:03.961896	\N	\N	\N	\N
4695	599	92	2026-05-26	late	09:18	12:09	2.85	12:12	17:26	5.23	8.08	0	biometric	\N	2026-05-28 18:08:04.034124	2026-05-28 18:08:04.034124	\N	\N	\N	\N
4711	604	92	2026-05-18	leave	07:35	13:06	5.52	13:51	16:18	2.45	7.97	0	manual	\N	2026-05-28 18:08:05.190261	2026-06-04 09:03:26.266	leave	approved	\N	\N
4697	616	92	2026-05-03	late	10:13	14:17	4.07	\N	\N	\N	4.07	0	biometric	\N	2026-05-28 18:08:04.178784	2026-05-28 18:08:04.178784	\N	\N	\N	\N
4698	616	92	2026-05-04	late	09:17	13:55	4.63	\N	\N	\N	4.63	0	biometric	\N	2026-05-28 18:08:04.251388	2026-05-28 18:08:04.251388	\N	\N	\N	\N
4699	616	92	2026-05-05	late	09:30	13:08	3.63	\N	\N	\N	3.63	0	biometric	\N	2026-05-28 18:08:04.324276	2026-05-28 18:08:04.324276	\N	\N	\N	\N
4700	616	92	2026-05-06	late	10:19	12:02	1.72	\N	\N	\N	1.72	0	biometric	\N	2026-05-28 18:08:04.397396	2026-05-28 18:08:04.397396	\N	\N	\N	\N
4701	616	92	2026-05-27	late	09:08	12:57	3.82	\N	\N	\N	3.82	0	biometric	\N	2026-05-28 18:08:04.470144	2026-05-28 18:08:04.470144	\N	\N	\N	\N
4702	612	92	2026-05-03	late	14:01	14:17	0.27	\N	\N	\N	0.27	0	biometric	\N	2026-05-28 18:08:04.542216	2026-05-28 18:08:04.542216	\N	\N	\N	\N
4704	604	92	2026-05-05	late	07:36	14:02	6.43	\N	\N	\N	6.43	0	biometric	\N	2026-05-28 18:08:04.686364	2026-05-28 18:08:04.686364	\N	\N	\N	\N
4705	604	92	2026-05-06	late	07:19	14:01	6.7	\N	\N	\N	6.7	0	biometric	\N	2026-05-28 18:08:04.758308	2026-05-28 18:08:04.758308	\N	\N	\N	\N
4706	604	92	2026-05-07	late	07:32	14:01	6.48	\N	\N	\N	6.48	0	biometric	\N	2026-05-28 18:08:04.830925	2026-05-28 18:08:04.830925	\N	\N	\N	\N
4707	604	92	2026-05-12	late	08:01	14:11	6.17	\N	\N	\N	6.17	0	biometric	\N	2026-05-28 18:08:04.903062	2026-05-28 18:08:04.903062	\N	\N	\N	\N
4708	604	92	2026-05-13	late	07:37	14:02	6.42	\N	\N	\N	6.42	0	biometric	\N	2026-05-28 18:08:04.974829	2026-05-28 18:08:04.974829	\N	\N	\N	\N
4709	604	92	2026-05-14	late	07:30	14:03	6.55	\N	\N	\N	6.55	0	biometric	\N	2026-05-28 18:08:05.046988	2026-05-28 18:08:05.046988	\N	\N	\N	\N
4710	604	92	2026-05-15	late	08:06	\N	\N	\N	\N	\N	\N	\N	biometric	\N	2026-05-28 18:08:05.118736	2026-05-28 18:08:05.118736	\N	\N	\N	\N
4712	604	92	2026-05-22	late	07:49	17:00	9.18	\N	\N	\N	9.18	0	biometric	\N	2026-05-28 18:08:05.262234	2026-05-28 18:08:05.262234	\N	\N	\N	\N
4713	604	92	2026-05-25	late	07:45	14:02	6.28	14:02	17:08	3.1	9.38	0	biometric	\N	2026-05-28 18:08:05.334192	2026-05-28 18:08:05.334192	\N	\N	\N	\N
4714	604	92	2026-05-26	late	07:42	13:11	5.48	13:59	17:04	3.08	8.56	0	biometric	\N	2026-05-28 18:08:05.405745	2026-05-28 18:08:05.405745	\N	\N	\N	\N
4715	604	92	2026-05-27	late	07:35	13:29	5.9	14:00	17:01	3.02	8.92	0	biometric	\N	2026-05-28 18:08:05.477623	2026-05-28 18:08:05.477623	\N	\N	\N	\N
4716	614	92	2026-05-04	late	09:00	12:45	3.75	12:45	13:13	0.47	4.22	0	biometric	\N	2026-05-28 18:08:05.549214	2026-05-28 18:08:05.549214	\N	\N	\N	\N
4717	614	92	2026-05-05	late	08:59	09:27	0.47	09:27	12:56	3.48	3.95	0	biometric	\N	2026-05-28 18:08:05.620634	2026-05-28 18:08:05.620634	\N	\N	\N	\N
4718	614	92	2026-05-06	late	09:10	12:05	2.92	\N	\N	\N	2.92	0	biometric	\N	2026-05-28 18:08:05.6922	2026-05-28 18:08:05.6922	\N	\N	\N	\N
4719	614	92	2026-05-07	late	09:05	13:10	4.08	\N	\N	\N	4.08	0	biometric	\N	2026-05-28 18:08:05.762856	2026-05-28 18:08:05.762856	\N	\N	\N	\N
4720	614	92	2026-05-12	late	09:16	12:21	3.08	\N	\N	\N	3.08	0	biometric	\N	2026-05-28 18:08:05.834727	2026-05-28 18:08:05.834727	\N	\N	\N	\N
4721	614	92	2026-05-15	late	09:13	12:13	3	\N	\N	\N	3	0	biometric	\N	2026-05-28 18:08:05.905815	2026-05-28 18:08:05.905815	\N	\N	\N	\N
4722	614	92	2026-05-19	late	08:58	11:33	2.58	11:42	12:57	1.25	3.83	0	biometric	\N	2026-05-28 18:08:05.976993	2026-05-28 18:08:05.976993	\N	\N	\N	\N
4723	614	92	2026-05-20	late	08:48	10:55	2.12	11:01	13:08	2.12	4.24	0	biometric	\N	2026-05-28 18:08:06.048582	2026-05-28 18:08:06.048582	\N	\N	\N	\N
4724	614	92	2026-05-21	late	08:51	\N	\N	\N	\N	\N	\N	\N	biometric	\N	2026-05-28 18:08:06.120281	2026-05-28 18:08:06.120281	\N	\N	\N	\N
4725	614	92	2026-05-22	late	09:13	12:24	3.18	\N	\N	\N	3.18	0	biometric	\N	2026-05-28 18:08:06.191622	2026-05-28 18:08:06.191622	\N	\N	\N	\N
4726	614	92	2026-05-26	late	09:34	10:06	0.53	10:23	13:00	2.62	3.15	0	biometric	\N	2026-05-28 18:08:06.263481	2026-05-28 18:08:06.263481	\N	\N	\N	\N
4727	614	92	2026-05-27	late	09:44	13:00	3.27	\N	\N	\N	3.27	0	biometric	\N	2026-05-28 18:08:06.335651	2026-05-28 18:08:06.335651	\N	\N	\N	\N
4728	615	93	2026-05-07	late	09:02	13:03	4.02	\N	\N	\N	4.02	0	biometric	\N	2026-05-28 18:08:06.407142	2026-05-28 18:08:06.407142	\N	\N	\N	\N
4729	615	93	2026-05-08	late	09:07	\N	\N	\N	\N	\N	\N	\N	biometric	\N	2026-05-28 18:08:06.478469	2026-05-28 18:08:06.478469	\N	\N	\N	\N
4730	615	93	2026-05-09	late	09:09	12:59	3.83	\N	\N	\N	3.83	0	biometric	\N	2026-05-28 18:08:06.549879	2026-05-28 18:08:06.549879	\N	\N	\N	\N
4731	615	93	2026-05-15	late	09:04	10:04	1	10:14	12:13	1.98	2.98	0	biometric	\N	2026-05-28 18:08:06.62174	2026-05-28 18:08:06.62174	\N	\N	\N	\N
4732	615	93	2026-05-19	late	10:06	13:49	3.72	\N	\N	\N	3.72	0	biometric	\N	2026-05-28 18:08:06.693832	2026-05-28 18:08:06.693832	\N	\N	\N	\N
4733	615	93	2026-05-20	late	09:06	13:07	4.02	\N	\N	\N	4.02	0	biometric	\N	2026-05-28 18:08:06.765381	2026-05-28 18:08:06.765381	\N	\N	\N	\N
4734	615	93	2026-05-21	late	09:00	13:08	4.13	\N	\N	\N	4.13	0	biometric	\N	2026-05-28 18:08:06.836378	2026-05-28 18:08:06.836378	\N	\N	\N	\N
4735	615	93	2026-05-22	late	09:11	12:24	3.22	\N	\N	\N	3.22	0	biometric	\N	2026-05-28 18:08:06.907871	2026-05-28 18:08:06.907871	\N	\N	\N	\N
4736	615	93	2026-05-26	late	09:19	13:00	3.68	\N	\N	\N	3.68	0	biometric	\N	2026-05-28 18:08:06.979447	2026-05-28 18:08:06.979447	\N	\N	\N	\N
4737	615	93	2026-05-27	late	09:37	12:59	3.37	\N	\N	\N	3.37	0	biometric	\N	2026-05-28 18:08:07.051226	2026-05-28 18:08:07.051226	\N	\N	\N	\N
4738	613	92	2026-05-07	late	09:05	13:03	3.97	\N	\N	\N	3.97	0	biometric	\N	2026-05-28 18:08:07.123132	2026-05-28 18:08:07.123132	\N	\N	\N	\N
4739	613	92	2026-05-08	late	09:07	\N	\N	\N	\N	\N	\N	\N	biometric	\N	2026-05-28 18:08:07.195338	2026-05-28 18:08:07.195338	\N	\N	\N	\N
4741	613	92	2026-05-19	late	09:53	13:50	3.95	\N	\N	\N	3.95	0	biometric	\N	2026-05-28 18:08:07.967532	2026-05-28 18:08:07.967532	\N	\N	\N	\N
4742	613	92	2026-05-20	late	09:08	13:08	4	\N	\N	\N	4	0	biometric	\N	2026-05-28 18:08:08.039058	2026-05-28 18:08:08.039058	\N	\N	\N	\N
4743	613	92	2026-05-21	late	09:06	13:09	4.05	\N	\N	\N	4.05	0	biometric	\N	2026-05-28 18:08:08.110884	2026-05-28 18:08:08.110884	\N	\N	\N	\N
4744	613	92	2026-05-22	late	09:28	12:25	2.95	\N	\N	\N	2.95	0	biometric	\N	2026-05-28 18:08:08.182579	2026-05-28 18:08:08.182579	\N	\N	\N	\N
4693	599	92	2026-05-21	late	18:21	\N	\N	\N	\N	\N	\N	\N	biometric	\N	2026-05-28 18:08:03.890108	2026-05-28 18:08:03.890108	\N	\N	\N	\N
4753	610	92	2026-05-30	late	08:20	13:04	4.73	13:32	17:00	3.47	8.2	0	biometric	\N	2026-06-01 04:06:26.362032	2026-06-01 04:06:26.362032	\N	\N	\N	\N
4756	608	92	2026-06-01	present	07:58	08:12	0.23	\N	\N	\N	0.23	0	biometric	\N	2026-06-01 04:06:26.410011	2026-06-01 04:06:26.410011	\N	\N	\N	\N
4760	611	93	2026-05-30	late	17:01	19:52	2.85	\N	\N	\N	2.85	0	biometric	\N	2026-06-01 04:06:26.458202	2026-06-01 04:06:26.458202	\N	\N	\N	\N
4765	595	93	2026-05-30	present	19:57	\N	\N	19:57	08:08	12.18	12.18	1	biometric	\N	2026-06-01 04:06:26.498461	2026-06-01 04:06:26.498461	\N	\N	\N	\N
4775	613	92	2026-06-01	late	10:35	\N	\N	\N	\N	\N	\N	\N	biometric	\N	2026-06-01 04:27:43.499995	2026-06-01 04:27:43.499995	\N	\N	\N	\N
4793	619	93	2026-05-16	late	19:57	21:07	1.17	22:05	23:08	1.05	2.22	0	biometric	\N	2026-06-01 12:31:19.996693	2026-06-01 12:31:19.996693	\N	\N	\N	\N
4794	619	93	2026-05-17	present	00:12	01:08	0.93	07:15	08:10	0.92	1.85	0	biometric	\N	2026-06-01 12:31:20.002805	2026-06-01 12:31:20.002805	\N	\N	\N	\N
4795	619	93	2026-05-18	late	19:56	21:01	1.08	22:06	23:04	0.97	2.05	0	biometric	\N	2026-06-01 12:31:20.007772	2026-06-01 12:31:20.007772	\N	\N	\N	\N
4796	619	93	2026-05-19	present	00:00	01:02	1.03	07:00	08:09	1.15	2.18	0	biometric	\N	2026-06-01 12:31:20.011951	2026-06-01 12:31:20.011951	\N	\N	\N	\N
4797	619	93	2026-05-20	late	20:00	21:23	1.38	22:15	23:09	0.9	2.28	0	biometric	\N	2026-06-01 12:31:20.019175	2026-06-01 12:31:20.019175	\N	\N	\N	\N
4798	619	93	2026-05-21	present	00:13	01:02	0.82	07:08	08:22	1.23	2.05	0	biometric	\N	2026-06-01 12:31:20.024721	2026-06-01 12:31:20.024721	\N	\N	\N	\N
4799	619	93	2026-05-22	late	19:57	21:17	1.33	22:03	23:11	1.13	2.46	0	biometric	\N	2026-06-01 12:31:20.029282	2026-06-01 12:31:20.029282	\N	\N	\N	\N
4800	619	93	2026-05-23	present	00:12	01:01	0.82	07:04	08:13	1.15	1.97	0	biometric	\N	2026-06-01 12:31:20.033284	2026-06-01 12:31:20.033284	\N	\N	\N	\N
4801	619	93	2026-05-24	late	19:57	21:06	1.15	22:04	23:12	1.13	2.28	0	biometric	\N	2026-06-01 12:31:20.03742	2026-06-01 12:31:20.03742	\N	\N	\N	\N
4802	619	93	2026-05-25	present	00:14	01:13	0.98	07:11	08:01	0.83	1.81	0	biometric	\N	2026-06-01 12:31:20.041809	2026-06-01 12:31:20.041809	\N	\N	\N	\N
4803	619	93	2026-05-26	late	19:58	21:09	1.18	22:17	23:04	0.78	1.96	0	biometric	\N	2026-06-01 12:31:20.044995	2026-06-01 12:31:20.044995	\N	\N	\N	\N
4804	619	93	2026-05-27	present	00:09	01:07	0.97	07:02	08:14	1.2	2.17	0	biometric	\N	2026-06-01 12:31:20.048636	2026-06-01 12:31:20.048636	\N	\N	\N	\N
4767	598	92	2026-06-01	late	16:55	\N	\N	\N	\N	\N	\N	\N	biometric	\N	2026-06-01 04:06:26.509407	2026-06-01 04:06:26.509407	\N	\N	\N	\N
4772	607	92	2026-06-01	late	17:00	\N	\N	\N	\N	\N	\N	\N	biometric	\N	2026-06-01 04:06:26.660194	2026-06-01 04:06:26.660194	\N	\N	\N	\N
4805	619	93	2026-05-28	late	19:57	21:13	1.27	22:04	23:13	1.15	2.42	0	biometric	\N	2026-06-01 12:31:20.052054	2026-06-01 12:31:20.052054	\N	\N	\N	\N
4754	610	92	2026-06-01	late	17:03	\N	\N	\N	\N	\N	\N	\N	biometric	\N	2026-06-01 04:06:26.379808	2026-06-01 04:06:26.379808	\N	\N	\N	\N
4770	609	92	2026-06-01	late	17:04	\N	\N	\N	\N	\N	\N	\N	biometric	\N	2026-06-01 04:06:26.634867	2026-06-01 04:06:26.634867	\N	\N	\N	\N
4763	605	92	2026-06-01	late	17:04	\N	\N	\N	\N	\N	\N	\N	biometric	\N	2026-06-01 04:06:26.485013	2026-06-01 04:06:26.485013	\N	\N	\N	\N
4773	600	92	2026-06-01	late	17:17	\N	\N	\N	\N	\N	\N	\N	biometric	\N	2026-06-01 04:06:26.670737	2026-06-01 04:06:26.670737	\N	\N	\N	\N
4778	619	93	2026-05-01	present	00:04	01:03	0.98	07:08	08:04	0.93	1.91	0	biometric	\N	2026-06-01 12:31:19.799962	2026-06-01 12:31:19.799962	\N	\N	\N	\N
4779	619	93	2026-05-02	late	19:59	21:12	1.22	22:15	23:07	0.87	2.09	0	biometric	\N	2026-06-01 12:31:19.920825	2026-06-01 12:31:19.920825	\N	\N	\N	\N
4780	619	93	2026-05-03	present	00:01	01:02	1.02	07:04	08:11	1.12	2.14	0	biometric	\N	2026-06-01 12:31:19.928416	2026-06-01 12:31:19.928416	\N	\N	\N	\N
4781	619	93	2026-05-04	late	19:59	21:11	1.2	22:02	23:02	1	2.2	0	biometric	\N	2026-06-01 12:31:19.932014	2026-06-01 12:31:19.932014	\N	\N	\N	\N
4782	619	93	2026-05-05	present	00:05	01:08	1.05	07:07	08:02	0.92	1.97	0	biometric	\N	2026-06-01 12:31:19.939321	2026-06-01 12:31:19.939321	\N	\N	\N	\N
4783	619	93	2026-05-06	late	19:57	21:04	1.12	22:06	23:05	0.98	2.1	0	biometric	\N	2026-06-01 12:31:19.946199	2026-06-01 12:31:19.946199	\N	\N	\N	\N
4784	619	93	2026-05-07	present	00:03	01:06	1.05	07:02	08:05	1.05	2.1	0	biometric	\N	2026-06-01 12:31:19.952638	2026-06-01 12:31:19.952638	\N	\N	\N	\N
4785	619	93	2026-05-08	late	19:59	21:09	1.17	22:02	23:06	1.07	2.24	0	biometric	\N	2026-06-01 12:31:19.957086	2026-06-01 12:31:19.957086	\N	\N	\N	\N
4786	619	93	2026-05-09	present	00:03	01:04	1.02	07:03	08:47	1.73	2.75	0	biometric	\N	2026-06-01 12:31:19.961201	2026-06-01 12:31:19.961201	\N	\N	\N	\N
4787	619	93	2026-05-10	late	19:57	21:12	1.25	22:11	23:04	0.88	2.13	0	biometric	\N	2026-06-01 12:31:19.965385	2026-06-01 12:31:19.965385	\N	\N	\N	\N
4788	619	93	2026-05-11	present	00:01	01:10	1.15	07:06	08:04	0.97	2.12	0	biometric	\N	2026-06-01 12:31:19.969633	2026-06-01 12:31:19.969633	\N	\N	\N	\N
4789	619	93	2026-05-12	late	19:59	21:14	1.25	22:05	23:23	1.3	2.55	0	biometric	\N	2026-06-01 12:31:19.974076	2026-06-01 12:31:19.974076	\N	\N	\N	\N
4790	619	93	2026-05-13	present	00:08	01:10	1.03	07:19	08:08	0.82	1.85	0	biometric	\N	2026-06-01 12:31:19.978656	2026-06-01 12:31:19.978656	\N	\N	\N	\N
4791	619	93	2026-05-14	late	19:59	21:02	1.05	22:00	23:03	1.05	2.1	0	biometric	\N	2026-06-01 12:31:19.983097	2026-06-01 12:31:19.983097	\N	\N	\N	\N
4792	619	93	2026-05-15	present	00:02	01:01	0.98	07:04	08:11	1.12	2.1	0	biometric	\N	2026-06-01 12:31:19.989971	2026-06-01 12:31:19.989971	\N	\N	\N	\N
4806	619	93	2026-05-29	present	00:10	01:15	1.08	07:21	08:24	1.05	2.13	0	biometric	\N	2026-06-01 12:31:20.056015	2026-06-01 12:31:20.056015	\N	\N	\N	\N
4807	619	93	2026-05-30	late	19:57	21:03	1.1	22:04	23:08	1.07	2.17	0	biometric	\N	2026-06-01 12:31:20.060727	2026-06-01 12:31:20.060727	\N	\N	\N	\N
4808	619	93	2026-05-31	present	00:11	01:13	1.03	07:10	08:08	0.97	2	0	biometric	\N	2026-06-01 12:31:20.06458	2026-06-01 12:31:20.06458	\N	\N	\N	\N
4522	607	92	2026-05-28	present	07:49	14:00	6.18	14:45	17:00	2.25	8.43	0	biometric	\N	2026-05-28 18:07:51.594131	2026-05-28 18:07:51.594131	\N	\N	\N	\N
4759	605	92	2026-05-30	late	08:04	17:00	8.93	\N	\N	\N	8.93	0	biometric	\N	2026-06-01 04:06:26.454313	2026-06-01 04:06:26.454313	\N	\N	\N	\N
4761	605	92	2026-05-31	late	08:17	17:10	8.88	\N	\N	\N	8.88	0	biometric	\N	2026-06-01 04:06:26.464727	2026-06-01 04:06:26.464727	\N	\N	\N	\N
4545	608	92	2026-05-04	present	08:01	14:01	6	14:56	17:01	2.08	8.08	0	biometric	\N	2026-05-28 18:07:53.2449	2026-05-28 18:07:53.2449	\N	\N	\N	\N
4548	608	92	2026-05-19	present	07:53	14:00	6.12	14:58	17:03	2.08	8.2	0	biometric	\N	2026-05-28 18:07:53.46108	2026-05-28 18:07:53.46108	\N	\N	\N	\N
4755	608	92	2026-05-29	late	16:58	20:03	3.08	\N	\N	\N	3.08	0	biometric	\N	2026-06-01 04:06:26.393639	2026-06-01 04:06:26.393639	\N	\N	\N	\N
4749	610	92	2026-05-29	late	08:33	14:00	5.45	14:55	17:00	2.08	7.53	0	biometric	\N	2026-05-29 04:50:33.262636	2026-05-29 04:50:33.262636	\N	\N	\N	\N
4566	600	92	2026-05-01	late	08:34	13:10	4.6	13:55	17:07	3.2	7.8	0	biometric	\N	2026-05-28 18:07:54.761111	2026-05-28 18:07:54.761111	\N	\N	\N	\N
4752	603	92	2026-05-30	late	17:06	20:01	2.92	\N	\N	\N	2.92	0	biometric	\N	2026-06-01 04:06:26.304239	2026-06-01 04:06:26.304239	\N	\N	\N	\N
4757	594	92	2026-05-29	present	19:52	\N	\N	19:52	08:04	12.2	12.2	1	biometric	\N	2026-06-01 04:06:26.423495	2026-06-01 04:06:26.423495	\N	\N	\N	\N
4758	594	92	2026-05-31	present	19:59	\N	\N	19:59	23:01	3.03	3.03	0	biometric	\N	2026-06-01 04:06:26.439697	2026-06-01 04:06:26.439697	\N	\N	\N	\N
4768	609	92	2026-05-31	late	17:11	19:59	2.8	\N	\N	\N	2.8	0	biometric	\N	2026-06-01 04:06:26.513852	2026-06-01 04:06:26.513852	\N	\N	\N	\N
4766	599	92	2026-05-31	late	13:16	18:59	5.72	\N	\N	\N	5.72	0	biometric	\N	2026-06-01 04:06:26.506623	2026-06-01 04:06:26.506623	\N	\N	\N	\N
4776	599	92	2026-06-01	late	18:18	\N	\N	\N	\N	\N	\N	\N	biometric	\N	2026-06-01 04:35:44.751956	2026-06-01 04:35:44.751956	\N	\N	\N	\N
4777	602	92	2026-06-01	late	19:58	\N	\N	\N	\N	\N	\N	\N	biometric	\N	2026-06-01 05:25:43.841032	2026-06-01 05:25:43.841032	\N	\N	\N	\N
4771	596	92	2026-05-31	present	19:25	\N	\N	19:25	23:04	3.65	3.65	1	biometric	\N	2026-06-01 04:06:26.654399	2026-06-01 04:06:26.654399	\N	\N	\N	\N
4764	598	92	2026-05-29	late	17:05	19:59	2.9	\N	\N	\N	2.9	0	biometric	\N	2026-06-01 04:06:26.497067	2026-06-01 04:06:26.497067	\N	\N	\N	\N
4510	607	92	2026-05-01	late	14:14	15:04	0.83	15:04	16:55	1.85	2.68	0	biometric	\N	2026-05-28 18:07:50.736688	2026-05-28 18:07:50.736688	\N	\N	\N	\N
4751	611	93	2026-05-29	present	08:04	14:05	6.02	14:59	17:02	2.05	8.07	0	biometric	\N	2026-05-29 04:50:37.976225	2026-05-29 04:50:37.976225	\N	\N	\N	\N
4762	611	93	2026-05-31	late	17:02	19:37	2.58	\N	\N	\N	2.58	0	biometric	\N	2026-06-01 04:06:26.476186	2026-06-01 04:06:26.476186	\N	\N	\N	\N
4750	597	92	2026-05-28	present	19:51	\N	\N	19:51	08:06	12.25	12.25	1	biometric	\N	2026-05-29 04:50:37.965394	2026-05-29 04:50:37.965394	\N	\N	\N	\N
4774	597	92	2026-05-30	present	19:52	\N	\N	19:52	08:01	12.15	12.15	1	biometric	\N	2026-06-01 04:06:26.672738	2026-06-01 04:06:26.672738	\N	\N	\N	\N
4589	602	92	2026-05-18	late	11:09	13:10	2.02	13:32	19:56	6.4	8.42	0	biometric	\N	2026-05-28 18:07:56.415898	2026-05-28 18:07:56.415898	\N	\N	\N	\N
4746	602	92	2026-05-28	late	17:04	20:00	2.93	\N	\N	\N	2.93	0	biometric	\N	2026-05-29 04:50:33.194398	2026-05-29 04:50:33.194398	\N	\N	\N	\N
4748	603	92	2026-05-29	late	08:15	13:59	5.73	14:58	17:00	2.03	7.76	0	biometric	\N	2026-05-29 04:50:33.243178	2026-05-29 04:50:33.243178	\N	\N	\N	\N
4616	594	92	2026-05-05	present	19:56	\N	\N	19:56	08:01	12.08	12.08	1	biometric	\N	2026-05-28 18:07:58.352897	2026-05-28 18:07:58.352897	\N	\N	\N	\N
4671	617	92	2026-05-11	present	07:55	14:22	6.45	14:57	17:00	2.05	8.5	0	biometric	\N	2026-05-28 18:08:02.30454	2026-05-28 18:08:02.30454	\N	\N	\N	\N
4680	599	92	2026-05-03	late	09:50	18:28	8.63	\N	\N	\N	8.63	0	biometric	\N	2026-05-28 18:08:02.951496	2026-05-28 18:08:02.951496	\N	\N	\N	\N
4809	599	92	2026-05-28	late	09:48	17:52	8.07	\N	\N	\N	8.07	0	biometric	\N	2026-06-01 12:31:21.180407	2026-06-01 12:31:21.180407	\N	\N	\N	\N
4703	604	92	2026-05-04	late	07:40	14:11	6.52	15:00	17:13	2.22	8.74	0	biometric	\N	2026-05-28 18:08:04.614362	2026-05-28 18:08:04.614362	\N	\N	\N	\N
4810	614	92	2026-05-28	late	09:27	11:28	2.02	\N	\N	\N	2.02	0	biometric	\N	2026-06-01 12:31:21.35175	2026-06-01 12:31:21.35175	\N	\N	\N	\N
4740	613	92	2026-05-09	late	09:13	13:03	3.83	\N	\N	\N	3.83	0	biometric	\N	2026-05-28 18:08:07.266982	2026-05-28 18:08:07.266982	\N	\N	\N	\N
4857	598	92	2026-05-18	present	08:06	16:55	8.82	\N	\N	\N	8.82	0	biometric	\N	2026-06-03 08:40:50.176547	2026-06-03 08:40:50.176547	\N	\N	\N	\N
4858	598	92	2026-05-20	present	08:04	16:57	8.88	\N	\N	\N	8.88	0	biometric	\N	2026-06-03 08:40:50.181156	2026-06-03 08:40:50.181156	\N	\N	\N	\N
4859	598	92	2026-05-22	late	17:01	20:02	3.02	\N	\N	\N	3.02	0	biometric	\N	2026-06-03 08:40:50.190666	2026-06-03 08:40:50.190666	\N	\N	\N	\N
4821	594	92	2026-06-02	late	08:00	\N	\N	08:00	\N	\N	\N	0	biometric	\N	2026-06-02 14:30:30.497213	2026-06-02 14:30:30.497213	\N	\N	\N	\N
4820	596	92	2026-06-02	late	08:00	\N	\N	08:00	\N	\N	\N	0	biometric	\N	2026-06-02 13:42:19.987624	2026-06-02 13:42:19.987624	\N	\N	\N	\N
4812	619	93	2026-06-01	late	23:06	\N	\N	\N	\N	\N	\N	\N	biometric	\N	2026-06-01 14:29:21.34918	2026-06-01 14:29:21.34918	\N	\N	\N	\N
4827	613	92	2026-06-03	late	12:13	\N	\N	\N	\N	\N	\N	\N	biometric	\N	2026-06-03 03:51:01.095824	2026-06-03 03:51:01.095824	\N	\N	\N	\N
4825	610	92	2026-06-03	late	17:01	\N	\N	\N	\N	\N	\N	\N	biometric	\N	2026-06-03 02:55:33.976766	2026-06-03 02:55:33.976766	\N	\N	\N	\N
4828	599	92	2026-06-03	late	17:30	\N	\N	\N	\N	\N	\N	\N	biometric	\N	2026-06-03 04:49:16.226343	2026-06-03 04:49:16.226343	\N	\N	\N	\N
4830	603	92	2026-06-03	late	20:06	\N	\N	\N	\N	\N	\N	\N	biometric	\N	2026-06-03 08:39:39.243392	2026-06-03 08:39:39.243392	\N	\N	\N	\N
4824	605	92	2026-06-03	late	17:01	\N	\N	\N	\N	\N	\N	\N	biometric	\N	2026-06-03 02:51:34.102254	2026-06-03 02:51:34.102254	\N	\N	\N	\N
4831	596	92	2026-04-30	late	00:00	\N	\N	00:00	08:00	8	8	0	biometric	\N	2026-06-03 08:40:49.98732	2026-06-03 08:40:49.98732	\N	\N	\N	\N
4811	597	92	2026-06-01	late	08:01	\N	\N	08:01	\N	\N	\N	0	biometric	\N	2026-06-01 14:14:19.961495	2026-06-01 14:14:19.961495	\N	\N	\N	\N
4813	619	93	2026-06-02	late	08:21	\N	\N	\N	\N	\N	\N	\N	biometric	\N	2026-06-01 18:34:35.520195	2026-06-01 18:34:35.520195	\N	\N	\N	\N
4816	613	92	2026-06-02	late	11:32	\N	\N	\N	\N	\N	\N	\N	biometric	\N	2026-06-02 03:41:02.165795	2026-06-02 03:41:02.165795	\N	\N	\N	\N
4832	596	92	2026-05-01	present	19:46	\N	\N	19:46	08:03	12.28	12.28	1	biometric	\N	2026-06-03 08:40:49.996358	2026-06-03 08:40:49.996358	\N	\N	\N	\N
4833	596	92	2026-05-03	present	19:36	\N	\N	19:36	07:54	12.3	12.3	1	biometric	\N	2026-06-03 08:40:50.002009	2026-06-03 08:40:50.002009	\N	\N	\N	\N
4817	599	92	2026-06-02	late	16:35	\N	\N	\N	\N	\N	\N	\N	biometric	\N	2026-06-02 04:04:15.401101	2026-06-02 04:04:15.401101	\N	\N	\N	\N
4814	598	92	2026-06-02	late	17:01	\N	\N	\N	\N	\N	\N	\N	biometric	\N	2026-06-02 02:29:19.776728	2026-06-02 02:29:19.776728	\N	\N	\N	\N
4815	605	92	2026-06-02	late	17:03	\N	\N	\N	\N	\N	\N	\N	biometric	\N	2026-06-02 02:39:46.322314	2026-06-02 02:39:46.322314	\N	\N	\N	\N
4818	611	93	2026-06-02	late	19:15	\N	\N	\N	\N	\N	\N	\N	biometric	\N	2026-06-02 11:31:19.932726	2026-06-02 11:31:19.932726	\N	\N	\N	\N
4819	602	92	2026-06-02	late	20:00	\N	\N	\N	\N	\N	\N	\N	biometric	\N	2026-06-02 11:34:45.410839	2026-06-02 11:34:45.410839	\N	\N	\N	\N
4834	596	92	2026-05-05	present	19:32	\N	\N	19:32	07:42	12.17	12.17	0	biometric	\N	2026-06-03 08:40:50.009386	2026-06-03 08:40:50.009386	\N	\N	\N	\N
4835	596	92	2026-05-07	present	19:45	\N	\N	19:45	08:00	12.25	12.25	1	biometric	\N	2026-06-03 08:40:50.017123	2026-06-03 08:40:50.017123	\N	\N	\N	\N
4836	596	92	2026-05-09	present	19:27	\N	\N	19:27	08:00	12.55	12.55	2	biometric	\N	2026-06-03 08:40:50.02432	2026-06-03 08:40:50.02432	\N	\N	\N	\N
4837	596	92	2026-05-11	present	19:56	\N	\N	19:56	08:02	12.1	12.1	1	biometric	\N	2026-06-03 08:40:50.030004	2026-06-03 08:40:50.030004	\N	\N	\N	\N
4838	596	92	2026-05-13	present	19:33	\N	\N	19:33	07:59	12.43	12.43	1	biometric	\N	2026-06-03 08:40:50.035626	2026-06-03 08:40:50.035626	\N	\N	\N	\N
4839	596	92	2026-05-15	present	19:47	\N	\N	19:47	08:05	12.3	12.3	1	biometric	\N	2026-06-03 08:40:50.040813	2026-06-03 08:40:50.040813	\N	\N	\N	\N
4840	596	92	2026-05-17	present	19:31	\N	\N	19:31	08:06	12.58	12.58	1	biometric	\N	2026-06-03 08:40:50.046861	2026-06-03 08:40:50.046861	\N	\N	\N	\N
4841	596	92	2026-05-19	present	19:35	\N	\N	19:35	08:04	12.48	12.48	1	biometric	\N	2026-06-03 08:40:50.05397	2026-06-03 08:40:50.05397	\N	\N	\N	\N
4842	596	92	2026-05-21	present	19:45	\N	\N	19:45	07:59	12.23	12.23	1	biometric	\N	2026-06-03 08:40:50.062282	2026-06-03 08:40:50.062282	\N	\N	\N	\N
4843	596	92	2026-05-23	present	19:44	\N	\N	19:44	08:01	12.28	12.28	1	biometric	\N	2026-06-03 08:40:50.067804	2026-06-03 08:40:50.067804	\N	\N	\N	\N
4844	596	92	2026-05-27	present	19:48	\N	\N	19:48	08:00	12.2	12.2	1	biometric	\N	2026-06-03 08:40:50.077714	2026-06-03 08:40:50.077714	\N	\N	\N	\N
4769	596	92	2026-05-29	present	19:32	\N	\N	19:32	07:56	12.4	12.4	1	biometric	\N	2026-06-01 04:06:26.630005	2026-06-01 04:06:26.630005	\N	\N	\N	\N
4845	598	92	2026-05-01	present	07:59	14:16	6.28	14:16	16:54	2.63	8.91	0	biometric	\N	2026-06-03 08:40:50.105012	2026-06-03 08:40:50.105012	\N	\N	\N	\N
4846	598	92	2026-05-02	late	16:52	19:58	3.1	\N	\N	\N	3.1	0	biometric	\N	2026-06-03 08:40:50.110639	2026-06-03 08:40:50.110639	\N	\N	\N	\N
4847	598	92	2026-05-03	late	17:29	20:00	2.52	\N	\N	\N	2.52	0	biometric	\N	2026-06-03 08:40:50.119568	2026-06-03 08:40:50.119568	\N	\N	\N	\N
4848	598	92	2026-05-05	present	07:53	16:55	9.03	\N	\N	\N	9.03	0	biometric	\N	2026-06-03 08:40:50.127987	2026-06-03 08:40:50.127987	\N	\N	\N	\N
4849	598	92	2026-05-06	present	07:42	17:02	9.33	\N	\N	\N	9.33	0	biometric	\N	2026-06-03 08:40:50.134611	2026-06-03 08:40:50.134611	\N	\N	\N	\N
4860	598	92	2026-05-24	late	17:04	19:55	2.85	\N	\N	\N	2.85	0	biometric	\N	2026-06-03 08:40:50.195331	2026-06-03 08:40:50.195331	\N	\N	\N	\N
4861	610	92	2026-05-17	late	16:59	19:47	2.8	\N	\N	\N	2.8	0	biometric	\N	2026-06-03 08:40:50.226274	2026-06-03 08:40:50.226274	\N	\N	\N	\N
4850	598	92	2026-05-07	present	08:03	16:45	8.7	\N	\N	\N	8.7	0	biometric	\N	2026-06-03 08:40:50.140928	2026-06-03 08:40:50.140928	\N	\N	\N	\N
4851	598	92	2026-05-08	late	17:00	17:07	0.12	17:07	19:57	2.83	2.95	0	biometric	\N	2026-06-03 08:40:50.145061	2026-06-03 08:40:50.145061	\N	\N	\N	\N
4852	598	92	2026-05-09	present	07:58	16:53	8.92	\N	\N	\N	8.92	0	biometric	\N	2026-06-03 08:40:50.14969	2026-06-03 08:40:50.14969	\N	\N	\N	\N
4853	598	92	2026-05-12	present	08:02	17:00	8.97	\N	\N	\N	8.97	0	biometric	\N	2026-06-03 08:40:50.156593	2026-06-03 08:40:50.156593	\N	\N	\N	\N
4854	598	92	2026-05-13	late	17:04	19:59	2.92	\N	\N	\N	2.92	0	biometric	\N	2026-06-03 08:40:50.163977	2026-06-03 08:40:50.163977	\N	\N	\N	\N
4855	598	92	2026-05-14	late	17:07	17:11	0.07	17:11	20:00	2.82	2.89	0	biometric	\N	2026-06-03 08:40:50.16789	2026-06-03 08:40:50.16789	\N	\N	\N	\N
4856	598	92	2026-05-16	late	17:01	20:00	2.98	\N	\N	\N	2.98	0	biometric	\N	2026-06-03 08:40:50.172814	2026-06-03 08:40:50.172814	\N	\N	\N	\N
4862	611	93	2026-05-02	present	08:03	13:41	5.63	14:20	17:08	2.8	8.43	0	biometric	\N	2026-06-03 08:40:50.231638	2026-06-03 08:40:50.231638	\N	\N	\N	\N
4863	611	93	2026-05-03	present	08:01	13:30	5.48	14:19	17:27	3.13	8.61	0	biometric	\N	2026-06-03 08:40:50.239166	2026-06-03 08:40:50.239166	\N	\N	\N	\N
4864	611	93	2026-05-04	late	17:01	19:57	2.93	\N	\N	\N	2.93	0	biometric	\N	2026-06-03 08:40:50.244443	2026-06-03 08:40:50.244443	\N	\N	\N	\N
4865	611	93	2026-05-05	late	16:56	19:35	2.65	\N	\N	\N	2.65	0	biometric	\N	2026-06-03 08:40:50.250326	2026-06-03 08:40:50.250326	\N	\N	\N	\N
4866	611	93	2026-05-06	late	17:05	19:50	2.75	\N	\N	\N	2.75	0	biometric	\N	2026-06-03 08:40:50.255273	2026-06-03 08:40:50.255273	\N	\N	\N	\N
4867	611	93	2026-05-11	late	17:01	19:56	2.92	\N	\N	\N	2.92	0	biometric	\N	2026-06-03 08:40:50.263615	2026-06-03 08:40:50.263615	\N	\N	\N	\N
4868	611	93	2026-05-15	present	08:01	14:55	6.9	15:36	17:09	1.55	8.45	0	biometric	\N	2026-06-03 08:40:50.275314	2026-06-03 08:40:50.275314	\N	\N	\N	\N
4869	611	93	2026-05-16	present	08:05	13:30	5.42	14:21	17:04	2.72	8.14	0	biometric	\N	2026-06-03 08:40:50.287728	2026-06-03 08:40:50.287728	\N	\N	\N	\N
4829	602	92	2026-06-03	late	20:05	\N	\N	\N	\N	\N	\N	\N	biometric	\N	2026-06-03 07:36:08.05343	2026-06-03 07:36:08.05343	\N	\N	\N	\N
4822	598	92	2026-06-03	late	16:55	\N	\N	\N	\N	\N	\N	\N	biometric	\N	2026-06-03 02:31:20.486156	2026-06-03 02:31:20.486156	\N	\N	\N	\N
4823	609	92	2026-06-03	late	17:01	\N	\N	\N	\N	\N	\N	\N	biometric	\N	2026-06-03 02:51:34.092824	2026-06-03 02:51:34.092824	\N	\N	\N	\N
4826	600	92	2026-06-03	late	17:33	\N	\N	\N	\N	\N	\N	\N	biometric	\N	2026-06-03 03:19:59.748275	2026-06-03 03:19:59.748275	\N	\N	\N	\N
4870	611	93	2026-05-17	present	07:59	13:22	5.38	14:19	17:00	2.68	8.06	0	biometric	\N	2026-06-03 08:40:50.297511	2026-06-03 08:40:50.297511	\N	\N	\N	\N
4871	611	93	2026-05-19	present	08:01	13:53	5.87	14:55	16:59	2.07	7.94	0	biometric	\N	2026-06-03 08:40:50.311681	2026-06-03 08:40:50.311681	\N	\N	\N	\N
4872	611	93	2026-05-20	late	16:57	19:54	2.95	\N	\N	\N	2.95	0	biometric	\N	2026-06-03 08:40:50.320997	2026-06-03 08:40:50.320997	\N	\N	\N	\N
4873	611	93	2026-05-21	present	08:03	13:38	5.58	14:27	16:55	2.47	8.05	0	biometric	\N	2026-06-03 08:40:50.326011	2026-06-03 08:40:50.326011	\N	\N	\N	\N
4874	611	93	2026-05-23	late	17:03	19:47	2.73	\N	\N	\N	2.73	0	biometric	\N	2026-06-03 08:40:50.330825	2026-06-03 08:40:50.330825	\N	\N	\N	\N
4875	611	93	2026-05-24	present	08:01	14:49	6.8	15:33	17:10	1.62	8.42	0	biometric	\N	2026-06-03 08:40:50.465725	2026-06-03 08:40:50.465725	\N	\N	\N	\N
4876	611	93	2026-05-28	present	08:00	12:57	4.95	14:06	17:05	2.98	7.93	0	biometric	\N	2026-06-03 08:40:50.475029	2026-06-03 08:40:50.475029	\N	\N	\N	\N
4877	597	92	2026-05-02	present	19:52	\N	\N	19:52	08:03	12.18	12.18	1	biometric	\N	2026-06-03 08:40:50.500341	2026-06-03 08:40:50.500341	\N	\N	\N	\N
4878	597	92	2026-05-04	present	19:55	\N	\N	19:55	07:59	12.07	12.07	1	biometric	\N	2026-06-03 08:40:50.505944	2026-06-03 08:40:50.505944	\N	\N	\N	\N
4879	597	92	2026-05-06	present	19:50	\N	\N	19:50	08:02	12.2	12.2	1	biometric	\N	2026-06-03 08:40:50.511715	2026-06-03 08:40:50.511715	\N	\N	\N	\N
4880	597	92	2026-05-08	present	19:55	\N	\N	19:55	08:12	12.28	12.28	1	biometric	\N	2026-06-03 08:40:50.520897	2026-06-03 08:40:50.520897	\N	\N	\N	\N
4881	597	92	2026-05-10	present	19:51	\N	\N	19:51	08:01	12.17	12.17	1	biometric	\N	2026-06-03 08:40:50.526631	2026-06-03 08:40:50.526631	\N	\N	\N	\N
4882	597	92	2026-05-12	present	19:46	\N	\N	19:46	07:59	12.22	12.22	1	biometric	\N	2026-06-03 08:40:50.535299	2026-06-03 08:40:50.535299	\N	\N	\N	\N
4883	597	92	2026-05-14	present	19:45	\N	\N	19:45	08:01	12.27	12.27	1	biometric	\N	2026-06-03 08:40:50.546273	2026-06-03 08:40:50.546273	\N	\N	\N	\N
4884	597	92	2026-05-16	present	19:58	\N	\N	19:58	08:02	12.07	12.07	1	biometric	\N	2026-06-03 08:40:50.555029	2026-06-03 08:40:50.555029	\N	\N	\N	\N
4885	597	92	2026-05-18	present	19:53	\N	\N	19:53	08:01	12.13	12.13	1	biometric	\N	2026-06-03 08:40:50.561052	2026-06-03 08:40:50.561052	\N	\N	\N	\N
4886	597	92	2026-05-20	present	19:53	\N	\N	19:53	08:02	12.15	12.15	1	biometric	\N	2026-06-03 08:40:50.566858	2026-06-03 08:40:50.566858	\N	\N	\N	\N
4887	597	92	2026-05-22	present	20:03	\N	\N	20:03	07:59	11.93	11.93	1	biometric	\N	2026-06-03 08:40:50.570925	2026-06-03 08:40:50.570925	\N	\N	\N	\N
4888	597	92	2026-05-24	present	19:52	\N	\N	19:52	04:00	8.13	8.13	0	biometric	\N	2026-06-03 08:40:50.577525	2026-06-03 08:40:50.577525	\N	\N	\N	\N
4889	607	92	2026-05-21	leave	\N	\N	\N	\N	\N	\N	\N	\N	manual	\N	2026-06-04 08:45:39.338281	2026-06-04 08:45:39.338281	leave	approved	\N	\N
4890	601	92	2026-05-22	leave	\N	\N	\N	\N	\N	\N	\N	\N	manual	\N	2026-06-04 09:02:37.311878	2026-06-04 09:02:37.311878	leave	approved	\N	\N
4891	601	92	2026-05-23	leave	\N	\N	\N	\N	\N	\N	\N	\N	manual	\N	2026-06-04 09:02:37.647464	2026-06-04 09:02:37.647464	leave	approved	\N	\N
4892	601	92	2026-05-24	leave	\N	\N	\N	\N	\N	\N	\N	\N	manual	\N	2026-06-04 09:02:37.976199	2026-06-04 09:02:37.976199	leave	approved	\N	\N
4893	601	92	2026-05-25	leave	\N	\N	\N	\N	\N	\N	\N	\N	manual	\N	2026-06-04 09:02:38.283322	2026-06-04 09:02:38.283322	leave	approved	\N	\N
4894	604	92	2026-05-19	leave	\N	\N	\N	\N	\N	\N	\N	\N	manual	\N	2026-06-04 09:03:26.594143	2026-06-04 09:03:26.594143	leave	approved	\N	\N
4895	604	92	2026-05-21	leave	\N	\N	\N	\N	\N	\N	\N	\N	manual	\N	2026-06-04 09:03:48.277988	2026-06-04 09:03:48.277988	leave	approved	\N	\N
4896	614	92	2026-05-13	leave	\N	\N	\N	\N	\N	\N	\N	\N	manual	\N	2026-06-04 09:04:28.369163	2026-06-04 09:04:28.369163	leave	approved	\N	\N
4571	600	92	2026-05-20	half_day	11:35	13:19	1.73	13:19	17:10	3.85	5.58	0	manual	\N	2026-05-28 18:07:55.119375	2026-06-04 09:05:25.15	leave	approved	\N	\N
4897	609	92	2026-06-04	late	17:00	19:58	2.97	\N	\N	\N	2.97	0	biometric	\N	2026-06-05 09:39:53.335028	2026-06-05 09:39:53.335028	\N	\N	\N	\N
4898	610	92	2026-06-05	late	08:31	13:03	4.53	13:03	13:54	0.85	5.38	0	biometric	\N	2026-06-05 09:39:53.36303	2026-06-05 09:39:53.36303	\N	\N	\N	\N
4899	599	92	2026-06-04	late	09:39	17:13	7.57	\N	\N	\N	7.57	0	biometric	\N	2026-06-05 09:39:53.386495	2026-06-05 09:39:53.386495	\N	\N	\N	\N
4900	599	92	2026-06-05	late	09:22	\N	\N	\N	\N	\N	\N	\N	biometric	\N	2026-06-05 09:39:53.393229	2026-06-05 09:39:53.393229	\N	\N	\N	\N
4901	600	92	2026-06-04	late	08:37	13:25	4.8	13:44	17:07	3.38	8.18	0	biometric	\N	2026-06-05 09:39:53.407109	2026-06-05 09:39:53.407109	\N	\N	\N	\N
4902	600	92	2026-06-05	late	08:58	13:15	4.28	13:15	14:05	0.83	5.11	0	biometric	\N	2026-06-05 09:39:53.415203	2026-06-05 09:39:53.415203	\N	\N	\N	\N
4903	597	92	2026-06-03	present	19:51	\N	\N	19:51	08:03	12.2	12.2	1	biometric	\N	2026-06-05 09:39:53.424318	2026-06-05 09:39:53.424318	\N	\N	\N	\N
4904	595	92	2026-06-03	present	20:05	\N	\N	20:05	08:04	11.98	11.98	1	biometric	\N	2026-06-05 09:39:53.430053	2026-06-05 09:39:53.430053	\N	\N	\N	\N
4905	602	92	2026-06-04	late	17:00	19:58	2.97	\N	\N	\N	2.97	0	biometric	\N	2026-06-05 09:39:53.445086	2026-06-05 09:39:53.445086	\N	\N	\N	\N
4906	603	92	2026-06-04	late	08:04	13:25	5.35	13:54	17:01	3.12	8.47	0	biometric	\N	2026-06-05 09:39:53.460844	2026-06-05 09:39:53.460844	\N	\N	\N	\N
4907	603	92	2026-06-05	late	08:07	13:45	5.63	13:45	14:35	0.83	6.46	0	biometric	\N	2026-06-05 09:39:53.469433	2026-06-05 09:39:53.469433	\N	\N	\N	\N
4908	611	93	2026-06-04	present	08:00	13:11	5.18	14:01	17:04	3.05	8.23	0	biometric	\N	2026-06-05 09:39:53.478031	2026-06-05 09:39:53.478031	\N	\N	\N	\N
4909	611	93	2026-06-05	present	08:05	13:31	5.43	13:31	14:29	0.97	6.4	0	biometric	\N	2026-06-05 09:39:53.487795	2026-06-05 09:39:53.487795	\N	\N	\N	\N
4910	613	92	2026-06-04	late	09:36	12:07	2.52	\N	\N	\N	2.52	0	biometric	\N	2026-06-05 09:39:53.495681	2026-06-05 09:39:53.495681	\N	\N	\N	\N
4912	596	92	2026-06-04	present	19:42	\N	\N	19:42	08:05	12.38	12.38	1	biometric	\N	2026-06-05 09:39:53.516909	2026-06-05 09:39:53.516909	\N	\N	\N	\N
4913	594	92	2026-06-04	present	19:58	\N	\N	19:58	08:02	12.07	12.07	1	biometric	\N	2026-06-05 09:39:53.534297	2026-06-05 09:39:53.534297	\N	\N	\N	\N
4914	616	92	2026-06-05	late	16:22	\N	\N	\N	\N	\N	\N	\N	biometric	\N	2026-06-05 09:39:53.541091	2026-06-05 09:39:53.541091	\N	\N	\N	\N
4911	613	92	2026-06-05	late	16:22	\N	\N	\N	\N	\N	\N	\N	biometric	\N	2026-06-05 09:39:53.508785	2026-06-05 09:39:53.508785	\N	\N	\N	\N
\.


--
-- Data for Name: biometric_devices; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.biometric_devices (id, name, serial_number, model, ip_address, port, branch_id, push_method, api_key, status, last_sync, is_active, created_at) FROM stdin;
454	System Import	SYSTEM-IMPORT	Virtual	0.0.0.0	4370	92	zkpush	\N	offline	\N	t	2026-05-28 18:08:08.290956
460	ZK Device (SPK7254300003)	SPK7254300003	ZKTeco	14.1.78.228	8081	92	zkpush	\N	online	2026-06-03 05:21:25.938	t	2026-05-28 18:10:08.829118
461	ZK Device (SPK7254300008)	SPK7254300008	ZKTeco	112.134.239.255	8081	92	zkpush	\N	online	2026-06-03 05:21:28.335	t	2026-05-28 18:10:09.371514
\.


--
-- Data for Name: biometric_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.biometric_logs (id, device_id, employee_id, biometric_id, punch_time, punch_type, processed, created_at) FROM stdin;
2088	454	595	20	2026-04-30 18:34:22	out	t	2026-05-28 18:08:17.635708
2089	454	595	20	2026-04-30 19:33:21	out	t	2026-05-28 18:08:17.635708
2090	454	595	20	2026-04-30 20:51:05	out	t	2026-05-28 18:08:17.635708
2091	454	595	20	2026-04-30 21:32:28	out	t	2026-05-28 18:08:17.635708
2092	454	595	20	2026-04-30 22:33:07	out	t	2026-05-28 18:08:17.635708
2093	454	595	20	2026-04-30 23:41:10	out	t	2026-05-28 18:08:17.635708
2094	454	595	20	2026-05-01 01:38:51	out	t	2026-05-28 18:08:17.635708
4227	460	599	52	2026-06-01 12:48:44	in	t	2026-06-01 12:49:15.017411
2097	454	595	20	2026-05-01 02:34:03	out	t	2026-05-28 18:08:17.635708
4297	461	596	44	2026-06-03 02:30:46	in	t	2026-06-03 02:31:20.503813
4305	454	613	54	2026-06-03 06:43:18	in	t	2026-06-03 07:04:34.89307
4803	454	611	18	2026-05-28 11:35:29	out	t	2026-06-03 08:40:50.902064
4804	454	597	45	2026-05-28 14:21:20	out	t	2026-06-03 08:40:50.902064
4805	454	\N	2	2026-05-28 14:29:13	out	t	2026-06-03 08:40:50.902064
4806	454	597	45	2026-05-28 15:30:29	out	t	2026-06-03 08:40:50.902064
4807	454	597	45	2026-05-28 16:30:47	out	t	2026-06-03 08:40:50.902064
4808	454	597	45	2026-05-28 17:30:38	out	t	2026-06-03 08:40:50.902064
4809	454	597	45	2026-05-28 18:31:42	out	t	2026-06-03 08:40:50.902064
4810	454	597	45	2026-05-28 19:30:43	out	t	2026-06-03 08:40:50.902064
4811	454	597	45	2026-05-28 20:30:21	out	t	2026-06-03 08:40:50.902064
4812	454	597	45	2026-05-28 21:30:38	out	t	2026-06-03 08:40:50.902064
4813	454	597	45	2026-05-28 22:30:51	out	t	2026-06-03 08:40:50.902064
4814	454	597	45	2026-05-28 23:31:07	out	t	2026-06-03 08:40:50.902064
4815	454	597	45	2026-05-29 00:30:35	out	t	2026-06-03 08:40:50.902064
4816	454	597	45	2026-05-29 01:30:22	out	t	2026-06-03 08:40:50.902064
4817	454	611	18	2026-05-29 02:34:22	out	t	2026-06-03 08:40:50.902064
4818	454	597	45	2026-05-29 02:36:47	out	t	2026-06-03 08:40:50.902064
4819	454	611	18	2026-05-29 08:35:59	out	t	2026-06-03 08:40:50.902064
4820	454	611	18	2026-05-29 09:29:01	out	t	2026-06-03 08:40:50.902064
4821	454	611	18	2026-05-29 11:32:10	out	t	2026-06-03 08:40:50.902064
4822	454	598	49	2026-05-29 11:35:30	out	t	2026-06-03 08:40:50.902064
4823	454	596	44	2026-05-29 14:02:26	out	t	2026-06-03 08:40:50.902064
4824	454	598	49	2026-05-29 14:29:42	out	t	2026-06-03 08:40:50.902064
4825	454	596	44	2026-05-29 15:32:20	out	t	2026-06-03 08:40:50.902064
4826	454	596	44	2026-05-29 16:37:24	out	t	2026-06-03 08:40:50.902064
4827	454	596	44	2026-05-29 17:30:13	out	t	2026-06-03 08:40:50.902064
4828	454	596	44	2026-05-29 18:32:26	out	t	2026-06-03 08:40:50.902064
4829	454	596	44	2026-05-29 19:31:30	out	t	2026-06-03 08:40:50.902064
4830	454	596	44	2026-05-29 20:30:16	out	t	2026-06-03 08:40:50.902064
4831	454	596	44	2026-05-29 22:58:34	out	t	2026-06-03 08:40:50.902064
4832	454	596	44	2026-05-29 23:33:54	out	t	2026-06-03 08:40:50.902064
4833	454	596	44	2026-05-30 00:34:46	out	t	2026-06-03 08:40:50.902064
4834	454	596	44	2026-05-30 01:31:43	out	t	2026-06-03 08:40:50.902064
4835	454	\N	2	2026-05-30 02:25:27	out	t	2026-06-03 08:40:50.902064
4836	454	596	44	2026-05-30 02:26:31	out	t	2026-06-03 08:40:50.902064
4837	454	\N	2	2026-05-30 09:15:29	out	t	2026-06-03 08:40:50.902064
4838	454	\N	2	2026-05-30 09:49:31	out	t	2026-06-03 08:40:50.902064
4839	454	611	18	2026-05-30 11:31:50	out	t	2026-06-03 08:40:50.902064
2142	454	595	20	2026-05-02 14:29:26	out	t	2026-05-28 18:08:17.635708
4840	454	\N	2	2026-05-30 11:31:59	out	t	2026-06-03 08:40:50.902064
4841	454	597	45	2026-05-30 14:22:15	out	t	2026-06-03 08:40:50.902064
2145	454	595	20	2026-05-02 15:42:12	out	t	2026-05-28 18:08:17.635708
2146	454	595	20	2026-05-02 16:45:16	out	t	2026-05-28 18:08:17.635708
2147	454	595	20	2026-05-02 17:37:56	out	t	2026-05-28 18:08:17.635708
2148	454	595	20	2026-05-02 18:31:25	out	t	2026-05-28 18:08:17.635708
2149	454	595	20	2026-05-02 19:32:45	out	t	2026-05-28 18:08:17.635708
2150	454	595	20	2026-05-02 20:44:29	out	t	2026-05-28 18:08:17.635708
2151	454	595	20	2026-05-02 21:35:16	out	t	2026-05-28 18:08:17.635708
2152	454	595	20	2026-05-02 22:38:15	out	t	2026-05-28 18:08:17.635708
2153	454	595	20	2026-05-02 23:37:22	out	t	2026-05-28 18:08:17.635708
2154	454	595	20	2026-05-03 00:37:49	out	t	2026-05-28 18:08:17.635708
2155	454	595	20	2026-05-03 01:34:23	out	t	2026-05-28 18:08:17.635708
4842	454	611	18	2026-05-30 14:22:41	out	t	2026-06-03 08:40:50.902064
4843	454	597	45	2026-05-30 15:30:32	out	t	2026-06-03 08:40:50.902064
4844	454	597	45	2026-05-30 16:30:28	out	t	2026-06-03 08:40:50.902064
2159	454	595	20	2026-05-03 02:41:02	out	t	2026-05-28 18:08:17.635708
4845	454	597	45	2026-05-30 17:30:39	out	t	2026-06-03 08:40:50.902064
4846	454	597	45	2026-05-30 18:31:25	out	t	2026-06-03 08:40:50.902064
4847	454	597	45	2026-05-30 19:31:06	out	t	2026-06-03 08:40:50.902064
4848	454	597	45	2026-05-30 20:30:53	out	t	2026-06-03 08:40:50.902064
4849	454	597	45	2026-05-30 21:31:07	out	t	2026-06-03 08:40:50.902064
4850	454	597	45	2026-05-30 22:31:00	out	t	2026-06-03 08:40:50.902064
4851	454	597	45	2026-05-30 23:30:52	out	t	2026-06-03 08:40:50.902064
4852	454	597	45	2026-05-31 00:30:34	out	t	2026-06-03 08:40:50.902064
4853	454	597	45	2026-05-31 01:31:06	out	t	2026-06-03 08:40:50.902064
4854	454	\N	2	2026-05-31 02:30:50	out	t	2026-06-03 08:40:50.902064
4855	454	597	45	2026-05-31 02:31:51	out	t	2026-06-03 08:40:50.902064
4856	454	\N	2	2026-05-31 08:14:56	out	t	2026-06-03 08:40:50.902064
4857	454	\N	2	2026-05-31 08:51:45	out	t	2026-06-03 08:40:50.902064
4858	454	\N	2	2026-05-31 11:31:54	out	t	2026-06-03 08:40:50.902064
4859	454	611	18	2026-05-31 11:32:15	out	t	2026-06-03 08:40:50.902064
4860	454	596	44	2026-05-31 13:55:52	out	t	2026-06-03 08:40:50.902064
4861	454	611	18	2026-05-31 14:07:56	out	t	2026-06-03 08:40:50.902064
4862	454	596	44	2026-05-31 15:24:27	out	t	2026-06-03 08:40:50.902064
4863	454	596	44	2026-05-31 16:29:46	out	t	2026-06-03 08:40:50.902064
4864	454	596	44	2026-05-31 17:34:13	out	t	2026-06-03 08:40:50.902064
4867	454	598	49	2026-06-03 11:25:03	in	t	2026-06-03 11:25:43.663648
4943	454	594	60	2026-06-04 22:31:48	in	t	2026-06-05 09:39:53.646302
4944	454	594	60	2026-06-04 23:31:26	in	t	2026-06-05 09:39:53.646302
4945	454	596	44	2026-06-04 23:47:08	in	t	2026-06-05 09:39:53.646302
4946	454	594	60	2026-06-05 00:31:23	in	t	2026-06-05 09:39:53.646302
4947	454	596	44	2026-06-05 00:35:05	in	t	2026-06-05 09:39:53.646302
4948	454	596	44	2026-06-05 01:30:41	in	t	2026-06-05 09:39:53.646302
4949	454	594	60	2026-06-05 01:30:50	in	t	2026-06-05 09:39:53.646302
4950	454	594	60	2026-06-05 02:32:12	in	t	2026-06-05 09:39:53.646302
4951	454	596	44	2026-06-05 02:35:03	in	t	2026-06-05 09:39:53.646302
4952	454	611	18	2026-06-05 02:35:36	in	t	2026-06-05 09:39:53.646302
4953	454	603	57	2026-06-05 02:37:13	in	t	2026-06-05 09:39:53.646302
4954	454	610	47	2026-06-05 03:01:00	in	t	2026-06-05 09:39:53.646302
4955	454	600	55	2026-06-05 03:28:50	in	t	2026-06-05 09:39:53.646302
4956	454	599	52	2026-06-05 03:52:14	in	t	2026-06-05 09:39:53.646302
4957	454	610	47	2026-06-05 07:33:42	in	t	2026-06-05 09:39:53.646302
4958	454	600	55	2026-06-05 07:45:02	in	t	2026-06-05 09:39:53.646302
4959	454	611	18	2026-06-05 08:01:39	in	t	2026-06-05 09:39:53.646302
4960	454	603	57	2026-06-05 08:15:35	in	t	2026-06-05 09:39:53.646302
4962	454	610	47	2026-06-05 08:24:27	in	t	2026-06-05 09:39:53.646302
4963	454	600	55	2026-06-05 08:35:12	in	t	2026-06-05 09:39:53.646302
4965	454	611	18	2026-06-05 08:59:57	in	t	2026-06-05 09:39:53.646302
4966	454	603	57	2026-06-05 09:05:59	in	t	2026-06-05 09:39:53.646302
4967	454	616	53	2026-06-05 10:52:13	in	t	2026-06-05 10:53:07.965027
4968	454	613	54	2026-06-05 10:52:22	in	t	2026-06-05 10:53:07.965027
2224	454	595	20	2026-05-04 14:29:04	out	t	2026-05-28 18:08:17.635708
2226	454	595	20	2026-05-04 15:41:18	out	t	2026-05-28 18:08:17.635708
2227	454	595	20	2026-05-04 16:32:02	out	t	2026-05-28 18:08:17.635708
2228	454	595	20	2026-05-04 17:32:12	out	t	2026-05-28 18:08:17.635708
2229	454	595	20	2026-05-04 18:35:21	out	t	2026-05-28 18:08:17.635708
2230	454	595	20	2026-05-04 19:38:34	out	t	2026-05-28 18:08:17.635708
2231	454	595	20	2026-05-04 20:48:28	out	t	2026-05-28 18:08:17.635708
2232	454	595	20	2026-05-04 21:34:27	out	t	2026-05-28 18:08:17.635708
2233	454	595	20	2026-05-04 22:40:19	out	t	2026-05-28 18:08:17.635708
2234	454	595	20	2026-05-04 23:35:46	out	t	2026-05-28 18:08:17.635708
2235	454	595	20	2026-05-05 00:40:27	out	t	2026-05-28 18:08:17.635708
2236	454	595	20	2026-05-05 01:37:22	out	t	2026-05-28 18:08:17.635708
2239	454	595	20	2026-05-05 02:32:14	out	t	2026-05-28 18:08:17.635708
2289	454	595	20	2026-05-06 14:27:16	out	t	2026-05-28 18:08:17.73242
2291	454	595	20	2026-05-06 15:34:25	out	t	2026-05-28 18:08:17.73242
2292	454	595	20	2026-05-06 16:36:11	out	t	2026-05-28 18:08:17.73242
2293	454	595	20	2026-05-06 16:36:23	out	t	2026-05-28 18:08:17.73242
2294	454	595	20	2026-05-06 17:35:51	out	t	2026-05-28 18:08:17.73242
2295	454	595	20	2026-05-06 18:33:52	out	t	2026-05-28 18:08:17.73242
2296	454	595	20	2026-05-06 18:34:04	out	t	2026-05-28 18:08:17.73242
2297	454	595	20	2026-05-06 19:36:35	out	t	2026-05-28 18:08:17.73242
2298	454	595	20	2026-05-06 20:47:37	out	t	2026-05-28 18:08:17.73242
2299	454	595	20	2026-05-06 21:40:04	out	t	2026-05-28 18:08:17.73242
2300	454	595	20	2026-05-06 22:41:33	out	t	2026-05-28 18:08:17.73242
2301	454	595	20	2026-05-06 23:32:14	out	t	2026-05-28 18:08:17.73242
2302	454	595	20	2026-05-07 00:36:39	out	t	2026-05-28 18:08:17.73242
2303	454	595	20	2026-05-07 01:32:37	out	t	2026-05-28 18:08:17.73242
2305	454	595	20	2026-05-07 02:35:02	out	t	2026-05-28 18:08:17.73242
4229	461	\N	2	2026-06-01 14:28:05	in	t	2026-06-01 14:28:19.984446
4263	460	599	52	2026-06-02 11:05:29	in	t	2026-06-02 11:06:02.239216
4314	454	\N	11111	2026-06-03 08:14:34	in	t	2026-06-03 08:39:39.291016
4866	454	\N	2	2026-06-03 11:24:05	in	t	2026-06-03 11:24:53.37059
2345	454	\N	11111	2026-05-08 04:47:24	out	t	2026-05-28 18:08:17.73242
2346	454	\N	3	2026-05-08 04:48:28	out	t	2026-05-28 18:08:17.73242
4870	454	605	46	2026-06-03 11:31:08	in	t	2026-06-05 09:39:53.646302
2348	454	595	20	2026-05-08 14:29:21	out	t	2026-05-28 18:08:17.73242
4871	454	609	50	2026-06-03 11:31:25	in	t	2026-06-05 09:39:53.646302
2350	454	595	20	2026-05-08 15:39:55	out	t	2026-05-28 18:08:17.73242
2351	454	595	20	2026-05-08 16:32:31	out	t	2026-05-28 18:08:17.73242
2352	454	595	20	2026-05-08 17:36:54	out	t	2026-05-28 18:08:17.73242
2353	454	595	20	2026-05-08 18:33:44	out	t	2026-05-28 18:08:17.73242
2354	454	595	20	2026-05-08 19:34:49	out	t	2026-05-28 18:08:17.73242
2355	454	595	20	2026-05-08 20:40:01	out	t	2026-05-28 18:08:17.73242
2356	454	595	20	2026-05-08 21:39:34	out	t	2026-05-28 18:08:17.73242
2357	454	595	20	2026-05-08 22:41:29	out	t	2026-05-28 18:08:17.73242
2358	454	595	20	2026-05-08 23:49:37	out	t	2026-05-28 18:08:17.73242
2359	454	595	20	2026-05-09 00:42:20	out	t	2026-05-28 18:08:17.73242
2360	454	595	20	2026-05-09 01:33:24	out	t	2026-05-28 18:08:17.73242
4872	454	610	47	2026-06-03 11:31:31	in	t	2026-06-05 09:39:53.646302
4873	454	599	52	2026-06-03 12:00:37	in	t	2026-06-05 09:39:53.646302
2363	454	595	20	2026-05-09 03:17:40	out	t	2026-05-28 18:08:17.73242
4874	454	600	55	2026-06-03 12:03:35	in	t	2026-06-05 09:39:53.646302
4875	454	597	45	2026-06-03 14:21:33	in	t	2026-06-05 09:39:53.646302
4876	454	\N	2	2026-06-03 14:29:05	in	t	2026-06-05 09:39:53.646302
4877	454	595	20	2026-06-03 14:35:53	in	t	2026-06-05 09:39:53.646302
4878	454	602	58	2026-06-03 14:35:58	in	t	2026-06-05 09:39:53.646302
4879	454	603	57	2026-06-03 14:36:04	in	t	2026-06-05 09:39:53.646302
4880	454	597	45	2026-06-03 15:30:28	in	t	2026-06-05 09:39:53.646302
4881	454	595	20	2026-06-03 15:42:26	in	t	2026-06-05 09:39:53.646302
4882	454	597	45	2026-06-03 16:30:41	in	t	2026-06-05 09:39:53.646302
4883	454	595	20	2026-06-03 16:35:06	in	t	2026-06-05 09:39:53.646302
4884	454	597	45	2026-06-03 17:30:35	in	t	2026-06-05 09:39:53.646302
4885	454	595	20	2026-06-03 17:35:38	in	t	2026-06-05 09:39:53.646302
4886	454	597	45	2026-06-03 18:33:25	in	t	2026-06-05 09:39:53.646302
4887	454	595	20	2026-06-03 18:42:53	in	t	2026-06-05 09:39:53.646302
4888	454	597	45	2026-06-03 19:30:46	in	t	2026-06-05 09:39:53.646302
4889	454	595	20	2026-06-03 19:40:58	in	t	2026-06-05 09:39:53.646302
4890	454	597	45	2026-06-03 20:30:49	in	t	2026-06-05 09:39:53.646302
4891	454	595	20	2026-06-03 20:49:42	in	t	2026-06-05 09:39:53.646302
4892	454	597	45	2026-06-03 21:32:10	in	t	2026-06-05 09:39:53.646302
4893	454	595	20	2026-06-03 21:36:43	in	t	2026-06-05 09:39:53.646302
4894	454	597	45	2026-06-03 22:31:29	in	t	2026-06-05 09:39:53.646302
4895	454	595	20	2026-06-03 22:44:28	in	t	2026-06-05 09:39:53.646302
4896	454	597	45	2026-06-03 23:31:12	in	t	2026-06-05 09:39:53.646302
4897	454	595	20	2026-06-03 23:51:17	in	t	2026-06-05 09:39:53.646302
4898	454	597	45	2026-06-04 00:30:29	in	t	2026-06-05 09:39:53.646302
4899	454	595	20	2026-06-04 00:41:50	in	t	2026-06-05 09:39:53.646302
4900	454	597	45	2026-06-04 01:30:23	in	t	2026-06-05 09:39:53.646302
4901	454	595	20	2026-06-04 01:50:40	in	t	2026-06-05 09:39:53.646302
4902	454	611	18	2026-06-04 02:30:57	in	t	2026-06-05 09:39:53.646302
4903	454	597	45	2026-06-04 02:33:59	in	t	2026-06-05 09:39:53.646302
2394	454	595	20	2026-05-10 14:27:35	out	t	2026-05-28 18:08:17.73242
4904	454	595	20	2026-06-04 02:34:04	in	t	2026-06-05 09:39:53.646302
2396	454	595	20	2026-05-10 15:42:17	out	t	2026-05-28 18:08:17.73242
2397	454	595	20	2026-05-10 16:41:53	out	t	2026-05-28 18:08:17.73242
2398	454	595	20	2026-05-10 17:34:07	out	t	2026-05-28 18:08:17.73242
2399	454	595	20	2026-05-10 18:31:56	out	t	2026-05-28 18:08:17.73242
2400	454	595	20	2026-05-10 19:40:53	out	t	2026-05-28 18:08:17.73242
2401	454	595	20	2026-05-10 20:35:23	out	t	2026-05-28 18:08:17.73242
2402	454	595	20	2026-05-10 21:44:33	out	t	2026-05-28 18:08:17.73242
2403	454	595	20	2026-05-10 22:34:34	out	t	2026-05-28 18:08:17.73242
2404	454	595	20	2026-05-10 23:48:59	out	t	2026-05-28 18:08:17.73242
2405	454	595	20	2026-05-11 00:32:53	out	t	2026-05-28 18:08:17.73242
2406	454	\N	3	2026-05-11 00:57:26	out	t	2026-05-28 18:08:17.73242
2407	454	\N	3	2026-05-11 01:18:57	out	t	2026-05-28 18:08:17.73242
2408	454	595	20	2026-05-11 01:36:59	out	t	2026-05-28 18:08:17.73242
4905	454	603	57	2026-06-04 02:34:08	in	t	2026-06-05 09:39:53.646302
2410	454	595	20	2026-05-11 02:34:50	out	t	2026-05-28 18:08:17.73242
4906	454	600	55	2026-06-04 03:07:29	in	t	2026-06-05 09:39:53.646302
4907	454	613	54	2026-06-04 04:06:09	in	t	2026-06-05 09:39:53.646302
4908	454	599	52	2026-06-04 04:09:43	in	t	2026-06-05 09:39:53.646302
4909	454	613	54	2026-06-04 06:37:25	in	t	2026-06-05 09:39:53.646302
4910	454	611	18	2026-06-04 07:41:27	in	t	2026-06-05 09:39:53.646302
4911	454	603	57	2026-06-04 07:55:30	in	t	2026-06-05 09:39:53.646302
4912	454	600	55	2026-06-04 07:55:43	in	t	2026-06-05 09:39:53.646302
4913	454	600	55	2026-06-04 08:14:39	in	t	2026-06-05 09:39:53.646302
4914	454	603	57	2026-06-04 08:24:52	in	t	2026-06-05 09:39:53.646302
4915	454	611	18	2026-06-04 08:31:37	in	t	2026-06-05 09:39:53.646302
4916	454	\N	2	2026-06-04 11:24:49	in	t	2026-06-05 09:39:53.646302
4917	454	609	50	2026-06-04 11:30:28	in	t	2026-06-05 09:39:53.646302
4918	454	602	58	2026-06-04 11:30:47	in	t	2026-06-05 09:39:53.646302
4919	454	603	57	2026-06-04 11:31:37	in	t	2026-06-05 09:39:53.646302
4920	454	611	18	2026-06-04 11:34:16	in	t	2026-06-05 09:39:53.646302
4921	454	600	55	2026-06-04 11:37:08	in	t	2026-06-05 09:39:53.646302
4922	454	599	52	2026-06-04 11:43:33	in	t	2026-06-05 09:39:53.646302
4923	454	596	44	2026-06-04 14:12:55	in	t	2026-06-05 09:39:53.646302
4924	454	594	60	2026-06-04 14:28:09	in	t	2026-06-05 09:39:53.646302
4925	454	602	58	2026-06-04 14:28:19	in	t	2026-06-05 09:39:53.646302
4926	454	609	50	2026-06-04 14:28:50	in	t	2026-06-05 09:39:53.646302
4927	454	\N	2	2026-06-04 14:30:19	in	t	2026-06-05 09:39:53.646302
4928	454	596	44	2026-06-04 15:30:32	in	t	2026-06-05 09:39:53.646302
4929	454	594	60	2026-06-04 15:31:20	in	t	2026-06-05 09:39:53.646302
4930	454	594	60	2026-06-04 16:31:32	in	t	2026-06-05 09:39:53.646302
4931	454	596	44	2026-06-04 16:33:24	in	t	2026-06-05 09:39:53.646302
4932	454	596	44	2026-06-04 17:31:27	in	t	2026-06-05 09:39:53.646302
4933	454	594	60	2026-06-04 17:34:58	in	t	2026-06-05 09:39:53.646302
4934	454	596	44	2026-06-04 18:30:12	in	t	2026-06-05 09:39:53.646302
4935	454	594	60	2026-06-04 18:31:32	in	t	2026-06-05 09:39:53.646302
4936	454	596	44	2026-06-04 19:31:31	in	t	2026-06-05 09:39:53.646302
4937	454	594	60	2026-06-04 19:31:35	in	t	2026-06-05 09:39:53.646302
4938	454	596	44	2026-06-04 20:30:16	in	t	2026-06-05 09:39:53.646302
4939	454	594	60	2026-06-04 20:31:24	in	t	2026-06-05 09:39:53.646302
4940	454	596	44	2026-06-04 21:30:23	in	t	2026-06-05 09:39:53.646302
4941	454	594	60	2026-06-04 21:31:24	in	t	2026-06-05 09:39:53.646302
4942	454	596	44	2026-06-04 22:30:47	in	t	2026-06-05 09:39:53.646302
4231	460	602	58	2026-06-01 14:28:47	in	t	2026-06-01 14:29:21.36958
4265	461	598	49	2026-06-02 11:31:06	in	t	2026-06-02 11:31:19.955292
4316	454	596	44	2026-04-30 18:30:57	out	t	2026-06-03 08:40:50.789251
4317	454	596	44	2026-04-30 19:31:55	out	t	2026-06-03 08:40:50.789251
2459	454	595	20	2026-05-12 14:29:48	out	t	2026-05-28 18:08:17.73242
4318	454	596	44	2026-04-30 20:31:15	out	t	2026-06-03 08:40:50.789251
2461	454	595	20	2026-05-12 15:44:14	out	t	2026-05-28 18:08:17.73242
2462	454	595	20	2026-05-12 16:35:36	out	t	2026-05-28 18:08:17.73242
2463	454	595	20	2026-05-12 17:53:22	out	t	2026-05-28 18:08:17.73242
2464	454	595	20	2026-05-12 18:38:29	out	t	2026-05-28 18:08:17.73242
2465	454	595	20	2026-05-12 19:40:36	out	t	2026-05-28 18:08:17.73242
2466	454	595	20	2026-05-12 20:39:28	out	t	2026-05-28 18:08:17.73242
2467	454	595	20	2026-05-12 21:37:51	out	t	2026-05-28 18:08:17.73242
2468	454	595	20	2026-05-12 22:49:25	out	t	2026-05-28 18:08:17.73242
2469	454	595	20	2026-05-12 23:43:50	out	t	2026-05-28 18:08:17.73242
2470	454	595	20	2026-05-13 00:44:12	out	t	2026-05-28 18:08:17.73242
2471	454	595	20	2026-05-13 01:49:34	out	t	2026-05-28 18:08:17.73242
4319	454	596	44	2026-04-30 21:32:37	out	t	2026-06-03 08:40:50.789251
4320	454	596	44	2026-04-30 22:31:10	out	t	2026-06-03 08:40:50.789251
4321	454	596	44	2026-04-30 23:34:32	out	t	2026-06-03 08:40:50.789251
2475	454	595	20	2026-05-13 02:38:13	out	t	2026-05-28 18:08:17.73242
4322	454	596	44	2026-05-01 00:38:06	out	t	2026-06-03 08:40:50.789251
4323	454	596	44	2026-05-01 01:26:52	out	t	2026-06-03 08:40:50.789251
4324	454	598	49	2026-05-01 02:29:40	out	t	2026-06-03 08:40:50.789251
4325	454	596	44	2026-05-01 02:30:43	out	t	2026-06-03 08:40:50.789251
4326	454	596	44	2026-05-01 02:30:54	out	t	2026-06-03 08:40:50.789251
4327	454	607	41	2026-05-01 08:44:15	out	t	2026-06-03 08:40:50.789251
4328	454	610	47	2026-05-01 08:46:55	out	t	2026-06-03 08:40:50.789251
4329	454	598	49	2026-05-01 08:46:58	out	t	2026-06-03 08:40:50.789251
4330	454	610	47	2026-05-01 09:30:22	out	t	2026-06-03 08:40:50.789251
4331	454	607	41	2026-05-01 09:34:14	out	t	2026-06-03 08:40:50.789251
4332	454	\N	2	2026-05-01 11:21:17	out	t	2026-06-03 08:40:50.789251
4333	454	598	49	2026-05-01 11:24:47	out	t	2026-06-03 08:40:50.789251
4334	454	607	41	2026-05-01 11:25:03	out	t	2026-06-03 08:40:50.789251
4335	454	610	47	2026-05-01 11:25:34	out	t	2026-06-03 08:40:50.789251
4336	454	596	44	2026-05-01 14:16:15	out	t	2026-06-03 08:40:50.789251
4337	454	596	44	2026-05-01 14:16:24	out	t	2026-06-03 08:40:50.789251
4338	454	\N	2	2026-05-01 14:30:23	out	t	2026-06-03 08:40:50.789251
4339	454	596	44	2026-05-01 15:32:35	out	t	2026-06-03 08:40:50.789251
4340	454	596	44	2026-05-01 15:33:20	out	t	2026-06-03 08:40:50.789251
4341	454	596	44	2026-05-01 17:05:42	out	t	2026-06-03 08:40:50.789251
4342	454	596	44	2026-05-01 17:35:27	out	t	2026-06-03 08:40:50.789251
4343	454	596	44	2026-05-01 17:35:51	out	t	2026-06-03 08:40:50.789251
4344	454	596	44	2026-05-01 18:31:36	out	t	2026-06-03 08:40:50.789251
4345	454	596	44	2026-05-01 19:31:28	out	t	2026-06-03 08:40:50.789251
4346	454	596	44	2026-05-01 22:19:52	out	t	2026-06-03 08:40:50.789251
4347	454	596	44	2026-05-01 22:31:07	out	t	2026-06-03 08:40:50.789251
2502	454	\N	3	2026-05-14 02:26:52	out	t	2026-05-28 18:08:17.782694
4348	454	596	44	2026-05-01 23:42:31	out	t	2026-06-03 08:40:50.789251
4349	454	596	44	2026-05-02 00:32:18	out	t	2026-06-03 08:40:50.789251
2505	454	\N	3	2026-05-14 02:49:37	out	t	2026-05-28 18:08:17.782694
4350	454	596	44	2026-05-02 01:31:57	out	t	2026-06-03 08:40:50.789251
4351	454	611	18	2026-05-02 02:33:41	out	t	2026-06-03 08:40:50.789251
4352	454	596	44	2026-05-02 02:33:49	out	t	2026-06-03 08:40:50.789251
4353	454	611	18	2026-05-02 08:11:02	out	t	2026-06-03 08:40:50.789251
4354	454	611	18	2026-05-02 08:50:46	out	t	2026-06-03 08:40:50.789251
4355	454	598	49	2026-05-02 11:22:58	out	t	2026-06-03 08:40:50.789251
4356	454	611	18	2026-05-02 11:38:22	out	t	2026-06-03 08:40:50.789251
4357	454	597	45	2026-05-02 14:22:11	out	t	2026-06-03 08:40:50.789251
2514	454	595	20	2026-05-14 14:29:21	out	t	2026-05-28 18:08:17.782694
4358	454	598	49	2026-05-02 14:28:33	out	t	2026-06-03 08:40:50.789251
2516	454	595	20	2026-05-14 15:32:30	out	t	2026-05-28 18:08:17.782694
2517	454	595	20	2026-05-14 16:30:14	out	t	2026-05-28 18:08:17.782694
2518	454	595	20	2026-05-14 17:33:28	out	t	2026-05-28 18:08:17.782694
2519	454	595	20	2026-05-14 18:32:01	out	t	2026-05-28 18:08:17.782694
2520	454	595	20	2026-05-14 19:31:24	out	t	2026-05-28 18:08:17.782694
2521	454	595	20	2026-05-14 20:32:30	out	t	2026-05-28 18:08:17.782694
2522	454	595	20	2026-05-14 21:34:32	out	t	2026-05-28 18:08:17.782694
2523	454	595	20	2026-05-14 22:35:38	out	t	2026-05-28 18:08:17.782694
2524	454	595	20	2026-05-14 23:30:54	out	t	2026-05-28 18:08:17.782694
2525	454	595	20	2026-05-15 00:30:05	out	t	2026-05-28 18:08:17.782694
2526	454	595	20	2026-05-15 01:34:45	out	t	2026-05-28 18:08:17.782694
4359	454	597	45	2026-05-02 15:30:01	out	t	2026-06-03 08:40:50.789251
4360	454	597	45	2026-05-02 16:29:31	out	t	2026-06-03 08:40:50.789251
2529	454	595	20	2026-05-15 02:41:50	out	t	2026-05-28 18:08:17.782694
4361	454	597	45	2026-05-02 17:29:31	out	t	2026-06-03 08:40:50.789251
4362	454	597	45	2026-05-02 18:29:41	out	t	2026-06-03 08:40:50.789251
4363	454	597	45	2026-05-02 19:29:31	out	t	2026-06-03 08:40:50.789251
4364	454	597	45	2026-05-02 20:29:38	out	t	2026-06-03 08:40:50.789251
4365	454	597	45	2026-05-02 21:29:31	out	t	2026-06-03 08:40:50.789251
4366	454	597	45	2026-05-02 22:29:27	out	t	2026-06-03 08:40:50.789251
4367	454	597	45	2026-05-02 23:29:37	out	t	2026-06-03 08:40:50.789251
4368	454	597	45	2026-05-03 00:29:26	out	t	2026-06-03 08:40:50.789251
4369	454	597	45	2026-05-03 01:29:29	out	t	2026-06-03 08:40:50.789251
4370	454	611	18	2026-05-03 02:31:40	out	t	2026-06-03 08:40:50.789251
4371	454	597	45	2026-05-03 02:33:59	out	t	2026-06-03 08:40:50.789251
4372	454	611	18	2026-05-03 08:00:27	out	t	2026-06-03 08:40:50.789251
4373	454	611	18	2026-05-03 08:49:34	out	t	2026-06-03 08:40:50.789251
4374	454	611	18	2026-05-03 11:57:27	out	t	2026-06-03 08:40:50.789251
4375	454	598	49	2026-05-03 11:59:22	out	t	2026-06-03 08:40:50.789251
4376	454	596	44	2026-05-03 14:06:17	out	t	2026-06-03 08:40:50.789251
4377	454	598	49	2026-05-03 14:30:07	out	t	2026-06-03 08:40:50.789251
4378	454	596	44	2026-05-03 15:30:17	out	t	2026-06-03 08:40:50.789251
4379	454	596	44	2026-05-03 16:30:51	out	t	2026-06-03 08:40:50.789251
4380	454	596	44	2026-05-03 17:25:18	out	t	2026-06-03 08:40:50.789251
4381	454	596	44	2026-05-03 18:30:58	out	t	2026-06-03 08:40:50.789251
4382	454	596	44	2026-05-03 19:00:35	out	t	2026-06-03 08:40:50.789251
4383	454	596	44	2026-05-03 19:32:33	out	t	2026-06-03 08:40:50.789251
4384	454	596	44	2026-05-03 20:30:48	out	t	2026-06-03 08:40:50.789251
4385	454	596	44	2026-05-03 20:31:02	out	t	2026-06-03 08:40:50.789251
4386	454	596	44	2026-05-03 21:31:41	out	t	2026-06-03 08:40:50.789251
4387	454	596	44	2026-05-03 22:50:43	out	t	2026-06-03 08:40:50.789251
4388	454	596	44	2026-05-03 23:42:17	out	t	2026-06-03 08:40:50.789251
4389	454	596	44	2026-05-04 00:31:57	out	t	2026-06-03 08:40:50.789251
4390	454	596	44	2026-05-04 01:30:37	out	t	2026-06-03 08:40:50.789251
2560	454	595	20	2026-05-16 14:27:45	out	t	2026-05-28 18:08:17.782694
4391	454	\N	2	2026-05-04 02:21:44	out	t	2026-06-03 08:40:50.789251
2562	454	595	20	2026-05-16 15:37:18	out	t	2026-05-28 18:08:17.782694
2563	454	595	20	2026-05-16 16:35:24	out	t	2026-05-28 18:08:17.782694
2564	454	595	20	2026-05-16 17:38:28	out	t	2026-05-28 18:08:17.782694
2565	454	595	20	2026-05-16 18:42:06	out	t	2026-05-28 18:08:17.782694
2566	454	595	20	2026-05-16 19:38:36	out	t	2026-05-28 18:08:17.782694
2567	454	595	20	2026-05-16 20:31:25	out	t	2026-05-28 18:08:17.782694
2568	454	595	20	2026-05-16 21:33:52	out	t	2026-05-28 18:08:17.782694
2569	454	595	20	2026-05-16 22:34:03	out	t	2026-05-28 18:08:17.782694
2570	454	595	20	2026-05-16 23:40:38	out	t	2026-05-28 18:08:17.782694
2571	454	595	20	2026-05-17 00:42:49	out	t	2026-05-28 18:08:17.782694
2572	454	\N	3	2026-05-17 01:06:54	out	t	2026-05-28 18:08:17.782694
2573	454	\N	3	2026-05-17 01:27:50	out	t	2026-05-28 18:08:17.782694
2574	454	595	20	2026-05-17 01:45:08	out	t	2026-05-28 18:08:17.782694
2575	454	595	20	2026-05-17 02:40:03	out	t	2026-05-28 18:08:17.782694
4266	460	605	46	2026-06-02 11:33:49	in	t	2026-06-02 11:34:45.433361
4392	454	596	44	2026-05-04 02:24:15	out	t	2026-06-03 08:40:50.789251
4393	454	\N	2	2026-05-04 08:52:47	out	t	2026-06-03 08:40:50.789251
4394	454	\N	2	2026-05-04 09:41:13	out	t	2026-06-03 08:40:50.789251
4395	454	\N	2	2026-05-04 11:31:43	out	t	2026-06-03 08:40:50.789251
4396	454	611	18	2026-05-04 11:31:51	out	t	2026-06-03 08:40:50.789251
4397	454	597	45	2026-05-04 14:25:02	out	t	2026-06-03 08:40:50.789251
4398	454	611	18	2026-05-04 14:27:29	out	t	2026-06-03 08:40:50.789251
4399	454	597	45	2026-05-04 15:29:33	out	t	2026-06-03 08:40:50.789251
4400	454	597	45	2026-05-04 16:29:30	out	t	2026-06-03 08:40:50.789251
4401	454	597	45	2026-05-04 17:29:25	out	t	2026-06-03 08:40:50.789251
4402	454	597	45	2026-05-04 18:29:25	out	t	2026-06-03 08:40:50.789251
4403	454	597	45	2026-05-04 19:29:41	out	t	2026-06-03 08:40:50.789251
4404	454	597	45	2026-05-04 20:29:36	out	t	2026-06-03 08:40:50.789251
4405	454	597	45	2026-05-04 21:29:54	out	t	2026-06-03 08:40:50.789251
4406	454	597	45	2026-05-04 22:29:41	out	t	2026-06-03 08:40:50.789251
4407	454	597	45	2026-05-04 23:29:26	out	t	2026-06-03 08:40:50.789251
4408	454	597	45	2026-05-05 00:29:26	out	t	2026-06-03 08:40:50.789251
4409	454	597	45	2026-05-05 01:29:28	out	t	2026-06-03 08:40:50.789251
4410	454	598	49	2026-05-05 02:23:09	out	t	2026-06-03 08:40:50.789251
4411	454	597	45	2026-05-05 02:29:44	out	t	2026-06-03 08:40:50.789251
4412	454	598	49	2026-05-05 11:25:02	out	t	2026-06-03 08:40:50.789251
4413	454	611	18	2026-05-05 11:26:19	out	t	2026-06-03 08:40:50.789251
4414	454	596	44	2026-05-05 14:02:25	out	t	2026-06-03 08:40:50.789251
4415	454	611	18	2026-05-05 14:05:19	out	t	2026-06-03 08:40:50.789251
4416	454	596	44	2026-05-05 15:28:28	out	t	2026-06-03 08:40:50.789251
4417	454	596	44	2026-05-05 16:30:45	out	t	2026-06-03 08:40:50.789251
4418	454	596	44	2026-05-05 17:35:16	out	t	2026-06-03 08:40:50.789251
4419	454	596	44	2026-05-05 17:35:27	out	t	2026-06-03 08:40:50.789251
4420	454	596	44	2026-05-05 18:30:39	out	t	2026-06-03 08:40:50.789251
4421	454	596	44	2026-05-05 19:30:39	out	t	2026-06-03 08:40:50.789251
4422	454	596	44	2026-05-05 20:30:52	out	t	2026-06-03 08:40:50.789251
4423	454	596	44	2026-05-05 21:31:32	out	t	2026-06-03 08:40:50.789251
4424	454	596	44	2026-05-05 22:35:43	out	t	2026-06-03 08:40:50.789251
4425	454	596	44	2026-05-05 23:32:49	out	t	2026-06-03 08:40:50.789251
4426	454	596	44	2026-05-06 00:27:39	out	t	2026-06-03 08:40:50.789251
4427	454	596	44	2026-05-06 00:38:44	out	t	2026-06-03 08:40:50.789251
4428	454	596	44	2026-05-06 01:31:05	out	t	2026-06-03 08:40:50.789251
4429	454	598	49	2026-05-06 02:12:37	out	t	2026-06-03 08:40:50.789251
4430	454	596	44	2026-05-06 02:12:43	out	t	2026-06-03 08:40:50.789251
4431	454	596	44	2026-05-06 02:12:53	out	t	2026-06-03 08:40:50.789251
4432	454	598	49	2026-05-06 11:32:39	out	t	2026-06-03 08:40:50.789251
4433	454	611	18	2026-05-06 11:35:12	out	t	2026-06-03 08:40:50.789251
4434	454	597	45	2026-05-06 14:20:15	out	t	2026-06-03 08:40:50.789251
4435	454	611	18	2026-05-06 14:20:56	out	t	2026-06-03 08:40:50.789251
4436	454	597	45	2026-05-06 15:29:17	out	t	2026-06-03 08:40:50.789251
4437	454	597	45	2026-05-06 16:29:36	out	t	2026-06-03 08:40:50.789251
4438	454	597	45	2026-05-06 18:29:55	out	t	2026-06-03 08:40:50.789251
4439	454	597	45	2026-05-06 20:34:40	out	t	2026-06-03 08:40:50.789251
4440	454	597	45	2026-05-06 21:29:30	out	t	2026-06-03 08:40:50.789251
4441	454	597	45	2026-05-06 22:29:40	out	t	2026-06-03 08:40:50.789251
4442	454	597	45	2026-05-06 23:29:34	out	t	2026-06-03 08:40:50.789251
4443	454	597	45	2026-05-07 00:30:02	out	t	2026-06-03 08:40:50.789251
4444	454	597	45	2026-05-07 01:29:35	out	t	2026-06-03 08:40:50.789251
4445	454	597	45	2026-05-07 02:32:52	out	t	2026-06-03 08:40:50.789251
4446	454	598	49	2026-05-07 02:33:08	out	t	2026-06-03 08:40:50.789251
4447	454	\N	2	2026-05-07 11:14:55	out	t	2026-06-03 08:40:50.789251
2640	454	595	20	2026-05-18 14:26:04	out	t	2026-05-28 18:08:17.782694
4448	454	598	49	2026-05-07 11:15:34	out	t	2026-06-03 08:40:50.789251
4449	454	596	44	2026-05-07 14:15:43	out	t	2026-06-03 08:40:50.789251
2643	454	595	20	2026-05-18 15:31:51	out	t	2026-05-28 18:08:17.782694
2644	454	595	20	2026-05-18 16:36:44	out	t	2026-05-28 18:08:17.782694
2645	454	595	20	2026-05-18 17:34:25	out	t	2026-05-28 18:08:17.782694
2646	454	595	20	2026-05-18 18:30:47	out	t	2026-05-28 18:08:17.782694
2647	454	595	20	2026-05-18 19:32:36	out	t	2026-05-28 18:08:17.782694
2648	454	595	20	2026-05-18 20:41:33	out	t	2026-05-28 18:08:17.782694
2649	454	595	20	2026-05-18 21:42:09	out	t	2026-05-28 18:08:17.782694
2650	454	595	20	2026-05-18 22:38:15	out	t	2026-05-28 18:08:17.782694
2651	454	595	20	2026-05-18 23:43:25	out	t	2026-05-28 18:08:17.782694
2652	454	595	20	2026-05-19 00:42:54	out	t	2026-05-28 18:08:17.782694
2653	454	595	20	2026-05-19 01:30:47	out	t	2026-05-28 18:08:17.782694
4450	454	\N	2	2026-05-07 14:27:12	out	t	2026-06-03 08:40:50.789251
4451	454	596	44	2026-05-07 15:31:24	out	t	2026-06-03 08:40:50.789251
2656	454	595	20	2026-05-19 02:39:32	out	t	2026-05-28 18:08:17.782694
4452	454	596	44	2026-05-07 16:31:53	out	t	2026-06-03 08:40:50.789251
4453	454	596	44	2026-05-07 17:46:59	out	t	2026-06-03 08:40:50.789251
4454	454	596	44	2026-05-07 18:30:39	out	t	2026-06-03 08:40:50.789251
4455	454	596	44	2026-05-07 19:30:31	out	t	2026-06-03 08:40:50.789251
4456	454	596	44	2026-05-07 20:30:47	out	t	2026-06-03 08:40:50.789251
4457	454	596	44	2026-05-07 21:31:17	out	t	2026-06-03 08:40:50.789251
4458	454	596	44	2026-05-07 22:30:53	out	t	2026-06-03 08:40:50.789251
4459	454	596	44	2026-05-07 23:32:07	out	t	2026-06-03 08:40:50.789251
4460	454	596	44	2026-05-08 00:31:18	out	t	2026-06-03 08:40:50.789251
4461	454	596	44	2026-05-08 01:31:19	out	t	2026-06-03 08:40:50.789251
4462	454	596	44	2026-05-08 01:57:37	out	t	2026-06-03 08:40:50.789251
4463	454	\N	2	2026-05-08 02:16:26	out	t	2026-06-03 08:40:50.789251
4464	454	596	44	2026-05-08 02:30:19	out	t	2026-06-03 08:40:50.789251
4465	454	\N	2	2026-05-08 11:30:05	out	t	2026-06-03 08:40:50.789251
4466	454	598	49	2026-05-08 11:30:38	out	t	2026-06-03 08:40:50.789251
4467	454	598	49	2026-05-08 11:37:20	out	t	2026-06-03 08:40:50.789251
4468	454	597	45	2026-05-08 14:25:45	out	t	2026-06-03 08:40:50.789251
4469	454	598	49	2026-05-08 14:27:23	out	t	2026-06-03 08:40:50.789251
4470	454	597	45	2026-05-08 15:29:19	out	t	2026-06-03 08:40:50.789251
4471	454	597	45	2026-05-08 16:29:25	out	t	2026-06-03 08:40:50.789251
4472	454	597	45	2026-05-08 17:29:37	out	t	2026-06-03 08:40:50.789251
4473	454	597	45	2026-05-08 18:29:34	out	t	2026-06-03 08:40:50.789251
4474	454	597	45	2026-05-08 19:30:34	out	t	2026-06-03 08:40:50.789251
4475	454	597	45	2026-05-08 20:30:02	out	t	2026-06-03 08:40:50.789251
4476	454	597	45	2026-05-08 21:30:41	out	t	2026-06-03 08:40:50.789251
4477	454	597	45	2026-05-08 22:29:31	out	t	2026-06-03 08:40:50.789251
4478	454	597	45	2026-05-08 23:29:55	out	t	2026-06-03 08:40:50.789251
4479	454	597	45	2026-05-09 00:29:25	out	t	2026-06-03 08:40:50.789251
4480	454	597	45	2026-05-09 01:29:23	out	t	2026-06-03 08:40:50.789251
4481	454	598	49	2026-05-09 02:28:23	out	t	2026-06-03 08:40:50.789251
4482	454	597	45	2026-05-09 02:42:45	out	t	2026-06-03 08:40:50.789251
2689	454	\N	3	2026-05-20 01:30:24	out	t	2026-05-28 18:08:17.832441
2691	454	\N	3	2026-05-20 01:46:22	out	t	2026-05-28 18:08:17.832441
4255	461	597	45	2026-06-02 02:31:25	in	t	2026-06-02 02:32:19.960956
4483	454	598	49	2026-05-09 11:23:41	out	t	2026-06-03 08:40:50.789251
4484	454	\N	2	2026-05-09 11:25:53	out	t	2026-06-03 08:40:50.789251
4485	454	596	44	2026-05-09 13:57:01	out	t	2026-06-03 08:40:50.789251
4486	454	\N	2	2026-05-09 13:57:50	out	t	2026-06-03 08:40:50.789251
4487	454	596	44	2026-05-09 14:34:06	out	t	2026-06-03 08:40:50.789251
4488	454	596	44	2026-05-09 15:32:32	out	t	2026-06-03 08:40:50.789251
4489	454	596	44	2026-05-09 16:29:50	out	t	2026-06-03 08:40:50.789251
4490	454	596	44	2026-05-09 17:51:58	out	t	2026-06-03 08:40:50.789251
4491	454	596	44	2026-05-09 17:52:07	out	t	2026-06-03 08:40:50.789251
4492	454	596	44	2026-05-09 18:31:38	out	t	2026-06-03 08:40:50.789251
4493	454	596	44	2026-05-09 19:33:19	out	t	2026-06-03 08:40:50.789251
4494	454	596	44	2026-05-09 20:30:17	out	t	2026-06-03 08:40:50.789251
4495	454	596	44	2026-05-09 21:30:34	out	t	2026-06-03 08:40:50.789251
4496	454	596	44	2026-05-09 23:34:14	out	t	2026-06-03 08:40:50.789251
4497	454	596	44	2026-05-10 00:31:22	out	t	2026-06-03 08:40:50.789251
4498	454	596	44	2026-05-10 01:30:56	out	t	2026-06-03 08:40:50.789251
4499	454	\N	2	2026-05-10 02:25:07	out	t	2026-06-03 08:40:50.789251
4500	454	596	44	2026-05-10 02:30:04	out	t	2026-06-03 08:40:50.789251
4501	454	\N	2	2026-05-10 09:09:56	out	t	2026-06-03 08:40:50.789251
4502	454	\N	2	2026-05-10 09:48:29	out	t	2026-06-03 08:40:50.789251
4503	454	\N	2	2026-05-10 11:40:26	out	t	2026-06-03 08:40:50.789251
4504	454	\N	2	2026-05-10 11:40:41	out	t	2026-06-03 08:40:50.789251
4505	454	597	45	2026-05-10 14:21:43	out	t	2026-06-03 08:40:50.789251
4506	454	597	45	2026-05-10 15:29:14	out	t	2026-06-03 08:40:50.789251
4507	454	597	45	2026-05-10 16:31:36	out	t	2026-06-03 08:40:50.789251
4508	454	597	45	2026-05-10 17:29:32	out	t	2026-06-03 08:40:50.789251
4509	454	597	45	2026-05-10 18:29:35	out	t	2026-06-03 08:40:50.789251
4510	454	597	45	2026-05-10 19:29:22	out	t	2026-06-03 08:40:50.789251
4511	454	597	45	2026-05-10 20:29:27	out	t	2026-06-03 08:40:50.789251
4512	454	597	45	2026-05-10 21:29:23	out	t	2026-06-03 08:40:50.789251
4513	454	597	45	2026-05-10 22:29:25	out	t	2026-06-03 08:40:50.789251
4514	454	597	45	2026-05-10 23:29:32	out	t	2026-06-03 08:40:50.789251
4515	454	597	45	2026-05-11 00:29:17	out	t	2026-06-03 08:40:50.789251
4516	454	597	45	2026-05-11 01:29:12	out	t	2026-06-03 08:40:50.851321
4517	454	\N	2	2026-05-11 02:27:04	out	t	2026-06-03 08:40:50.851321
4518	454	597	45	2026-05-11 02:31:15	out	t	2026-06-03 08:40:50.851321
4519	454	\N	2	2026-05-11 09:04:27	out	t	2026-06-03 08:40:50.851321
4520	454	\N	2	2026-05-11 09:54:46	out	t	2026-06-03 08:40:50.851321
2735	454	595	20	2026-05-20 14:30:46	out	t	2026-05-28 18:08:17.832441
4521	454	611	18	2026-05-11 11:31:05	out	t	2026-06-03 08:40:50.851321
2737	454	595	20	2026-05-20 15:53:20	out	t	2026-05-28 18:08:17.832441
2738	454	595	20	2026-05-20 16:45:52	out	t	2026-05-28 18:08:17.832441
2739	454	595	20	2026-05-20 17:39:31	out	t	2026-05-28 18:08:17.832441
2740	454	595	20	2026-05-20 18:43:38	out	t	2026-05-28 18:08:17.832441
2741	454	595	20	2026-05-20 19:32:15	out	t	2026-05-28 18:08:17.832441
2742	454	595	20	2026-05-20 20:34:09	out	t	2026-05-28 18:08:17.832441
2743	454	595	20	2026-05-20 21:33:53	out	t	2026-05-28 18:08:17.832441
2744	454	595	20	2026-05-20 22:42:59	out	t	2026-05-28 18:08:17.832441
2745	454	595	20	2026-05-20 23:28:52	out	t	2026-05-28 18:08:17.832441
2746	454	595	20	2026-05-21 00:14:38	out	t	2026-05-28 18:08:17.832441
2747	454	595	20	2026-05-21 00:41:47	out	t	2026-05-28 18:08:17.832441
2748	454	595	20	2026-05-21 01:38:16	out	t	2026-05-28 18:08:17.832441
4522	454	\N	2	2026-05-11 11:31:40	out	t	2026-06-03 08:40:50.851321
4523	454	611	18	2026-05-11 14:26:13	out	t	2026-06-03 08:40:50.851321
2751	454	595	20	2026-05-21 02:52:39	out	t	2026-05-28 18:08:17.832441
4524	454	596	44	2026-05-11 14:26:36	out	t	2026-06-03 08:40:50.851321
4525	454	596	44	2026-05-11 15:31:46	out	t	2026-06-03 08:40:50.851321
4526	454	596	44	2026-05-11 16:31:27	out	t	2026-06-03 08:40:50.851321
4527	454	596	44	2026-05-11 17:28:40	out	t	2026-06-03 08:40:50.851321
4528	454	596	44	2026-05-11 18:30:30	out	t	2026-06-03 08:40:50.851321
4529	454	596	44	2026-05-11 19:33:22	out	t	2026-06-03 08:40:50.851321
4530	454	596	44	2026-05-11 20:31:04	out	t	2026-06-03 08:40:50.851321
4531	454	596	44	2026-05-11 21:31:24	out	t	2026-06-03 08:40:50.851321
4532	454	596	44	2026-05-11 22:30:52	out	t	2026-06-03 08:40:50.851321
4533	454	596	44	2026-05-11 23:41:09	out	t	2026-06-03 08:40:50.851321
4534	454	596	44	2026-05-12 00:46:35	out	t	2026-06-03 08:40:50.851321
4535	454	596	44	2026-05-12 01:30:10	out	t	2026-06-03 08:40:50.851321
4536	454	598	49	2026-05-12 02:32:07	out	t	2026-06-03 08:40:50.851321
4537	454	596	44	2026-05-12 02:32:12	out	t	2026-06-03 08:40:50.851321
4538	454	\N	2	2026-05-12 11:27:48	out	t	2026-06-03 08:40:50.851321
4539	454	598	49	2026-05-12 11:30:20	out	t	2026-06-03 08:40:50.851321
4540	454	597	45	2026-05-12 14:16:58	out	t	2026-06-03 08:40:50.851321
4541	454	\N	2	2026-05-12 14:18:30	out	t	2026-06-03 08:40:50.851321
4542	454	597	45	2026-05-12 15:29:08	out	t	2026-06-03 08:40:50.851321
4543	454	597	45	2026-05-12 16:29:10	out	t	2026-06-03 08:40:50.851321
4544	454	597	45	2026-05-12 17:29:15	out	t	2026-06-03 08:40:50.851321
4545	454	597	45	2026-05-12 18:29:12	out	t	2026-06-03 08:40:50.851321
4546	454	597	45	2026-05-12 19:30:11	out	t	2026-06-03 08:40:50.851321
4547	454	597	45	2026-05-12 20:30:23	out	t	2026-06-03 08:40:50.851321
4548	454	597	45	2026-05-12 21:30:07	out	t	2026-06-03 08:40:50.851321
4549	454	597	45	2026-05-12 22:30:11	out	t	2026-06-03 08:40:50.851321
4550	454	597	45	2026-05-12 23:29:25	out	t	2026-06-03 08:40:50.851321
4551	454	597	45	2026-05-13 00:29:25	out	t	2026-06-03 08:40:50.851321
4552	454	597	45	2026-05-13 01:29:10	out	t	2026-06-03 08:40:50.851321
2781	454	\N	3	2026-05-22 01:31:12	out	t	2026-05-28 18:08:17.832441
4553	454	\N	2	2026-05-13 02:29:03	out	t	2026-06-03 08:40:50.851321
2783	454	\N	3	2026-05-22 02:27:14	out	t	2026-05-28 18:08:17.832441
4554	454	597	45	2026-05-13 02:29:39	out	t	2026-06-03 08:40:50.851321
4555	454	\N	2	2026-05-13 08:35:31	out	t	2026-06-03 08:40:50.851321
4556	454	\N	2	2026-05-13 09:41:42	out	t	2026-06-03 08:40:50.851321
4557	454	598	49	2026-05-13 11:34:59	out	t	2026-06-03 08:40:50.851321
4558	454	\N	2	2026-05-13 11:35:07	out	t	2026-06-03 08:40:50.851321
4559	454	596	44	2026-05-13 14:03:15	out	t	2026-06-03 08:40:50.851321
4560	454	598	49	2026-05-13 14:29:39	out	t	2026-06-03 08:40:50.851321
4561	454	596	44	2026-05-13 15:30:46	out	t	2026-06-03 08:40:50.851321
4562	454	596	44	2026-05-13 16:30:19	out	t	2026-06-03 08:40:50.851321
4563	454	596	44	2026-05-13 17:30:55	out	t	2026-06-03 08:40:50.851321
4564	454	596	44	2026-05-13 18:39:45	out	t	2026-06-03 08:40:50.851321
4565	454	596	44	2026-05-13 19:30:49	out	t	2026-06-03 08:40:50.851321
4566	454	596	44	2026-05-13 20:30:25	out	t	2026-06-03 08:40:50.851321
4567	454	596	44	2026-05-13 21:30:35	out	t	2026-06-03 08:40:50.851321
4568	454	596	44	2026-05-13 22:30:21	out	t	2026-06-03 08:40:50.851321
4569	454	596	44	2026-05-14 00:40:00	out	t	2026-06-03 08:40:50.851321
4570	454	596	44	2026-05-14 01:30:00	out	t	2026-06-03 08:40:50.851321
2801	454	595	20	2026-05-22 14:27:28	out	t	2026-05-28 18:08:17.832441
4571	454	\N	2	2026-05-14 02:23:34	out	t	2026-06-03 08:40:50.851321
2803	454	595	20	2026-05-22 15:47:55	out	t	2026-05-28 18:08:17.832441
2804	454	595	20	2026-05-22 16:33:27	out	t	2026-05-28 18:08:17.832441
2805	454	595	20	2026-05-22 17:41:49	out	t	2026-05-28 18:08:17.832441
2806	454	595	20	2026-05-22 18:42:58	out	t	2026-05-28 18:08:17.832441
2807	454	595	20	2026-05-22 19:31:32	out	t	2026-05-28 18:08:17.832441
2808	454	595	20	2026-05-22 20:41:40	out	t	2026-05-28 18:08:17.832441
2809	454	595	20	2026-05-22 21:42:43	out	t	2026-05-28 18:08:17.832441
2810	454	595	20	2026-05-22 22:43:04	out	t	2026-05-28 18:08:17.832441
2811	454	595	20	2026-05-22 23:57:10	out	t	2026-05-28 18:08:17.832441
2812	454	595	20	2026-05-23 00:37:51	out	t	2026-05-28 18:08:17.832441
2813	454	595	20	2026-05-23 01:34:24	out	t	2026-05-28 18:08:17.832441
2816	454	595	20	2026-05-23 02:43:02	out	t	2026-05-28 18:08:17.832441
4269	461	611	18	2026-06-02 13:45:05	in	t	2026-06-02 13:45:20.2132
4572	454	596	44	2026-05-14 02:29:58	out	t	2026-06-03 08:40:50.851321
4573	454	607	41	2026-05-14 08:39:05	out	t	2026-06-03 08:40:50.851321
4574	454	\N	2	2026-05-14 08:39:48	out	t	2026-06-03 08:40:50.851321
4575	454	\N	2	2026-05-14 09:33:48	out	t	2026-06-03 08:40:50.851321
4576	454	\N	2	2026-05-14 11:36:24	out	t	2026-06-03 08:40:50.851321
4577	454	598	49	2026-05-14 11:37:52	out	t	2026-06-03 08:40:50.851321
4578	454	598	49	2026-05-14 11:41:21	out	t	2026-06-03 08:40:50.851321
4579	454	597	45	2026-05-14 14:15:23	out	t	2026-06-03 08:40:50.851321
4580	454	598	49	2026-05-14 14:30:26	out	t	2026-06-03 08:40:50.851321
4581	454	597	45	2026-05-14 15:28:56	out	t	2026-06-03 08:40:50.851321
4582	454	597	45	2026-05-14 16:29:00	out	t	2026-06-03 08:40:50.851321
4583	454	597	45	2026-05-14 17:33:14	out	t	2026-06-03 08:40:50.851321
4584	454	597	45	2026-05-14 18:29:05	out	t	2026-06-03 08:40:50.851321
4585	454	597	45	2026-05-14 19:29:39	out	t	2026-06-03 08:40:50.851321
4586	454	597	45	2026-05-14 20:29:26	out	t	2026-06-03 08:40:50.851321
4587	454	597	45	2026-05-14 21:31:20	out	t	2026-06-03 08:40:50.851321
4588	454	597	45	2026-05-14 22:29:43	out	t	2026-06-03 08:40:50.851321
4589	454	597	45	2026-05-14 23:29:32	out	t	2026-06-03 08:40:50.851321
4590	454	597	45	2026-05-15 00:29:19	out	t	2026-06-03 08:40:50.851321
4591	454	597	45	2026-05-15 01:28:57	out	t	2026-06-03 08:40:50.851321
4592	454	597	45	2026-05-15 02:31:17	out	t	2026-06-03 08:40:50.851321
4593	454	611	18	2026-05-15 02:31:36	out	t	2026-06-03 08:40:50.851321
4594	454	611	18	2026-05-15 09:25:47	out	t	2026-06-03 08:40:50.851321
4595	454	611	18	2026-05-15 10:06:23	out	t	2026-06-03 08:40:50.851321
4596	454	\N	2	2026-05-15 11:27:25	out	t	2026-06-03 08:40:50.851321
4597	454	611	18	2026-05-15 11:39:44	out	t	2026-06-03 08:40:50.851321
4598	454	596	44	2026-05-15 14:17:05	out	t	2026-06-03 08:40:50.851321
4599	454	\N	2	2026-05-15 14:25:37	out	t	2026-06-03 08:40:50.851321
4600	454	596	44	2026-05-15 15:30:23	out	t	2026-06-03 08:40:50.851321
4601	454	596	44	2026-05-15 16:32:12	out	t	2026-06-03 08:40:50.851321
2851	454	595	20	2026-05-24 14:27:52	out	t	2026-05-28 18:08:17.832441
4602	454	596	44	2026-05-15 17:50:12	out	t	2026-06-03 08:40:50.851321
2853	454	595	20	2026-05-24 15:36:27	out	t	2026-05-28 18:08:17.832441
2854	454	595	20	2026-05-24 16:34:14	out	t	2026-05-28 18:08:17.832441
2855	454	595	20	2026-05-24 17:42:58	out	t	2026-05-28 18:08:17.832441
2856	454	595	20	2026-05-24 18:44:48	out	t	2026-05-28 18:08:17.832441
2857	454	595	20	2026-05-24 19:43:09	out	t	2026-05-28 18:08:17.832441
2858	454	595	20	2026-05-24 20:41:16	out	t	2026-05-28 18:08:17.832441
2859	454	595	20	2026-05-24 22:05:46	out	t	2026-05-28 18:08:17.832441
2860	454	595	20	2026-05-24 22:50:34	out	t	2026-05-28 18:08:17.832441
2861	454	595	20	2026-05-24 23:40:09	out	t	2026-05-28 18:08:17.832441
2862	454	595	20	2026-05-25 00:34:49	out	t	2026-05-28 18:08:17.832441
2863	454	\N	3	2026-05-25 01:24:55	out	t	2026-05-28 18:08:17.832441
2864	454	595	20	2026-05-25 01:41:10	out	t	2026-05-28 18:08:17.832441
2865	454	\N	3	2026-05-25 01:54:58	out	t	2026-05-28 18:08:17.832441
4603	454	596	44	2026-05-15 18:30:13	out	t	2026-06-03 08:40:50.851321
4604	454	596	44	2026-05-15 19:31:31	out	t	2026-06-03 08:40:50.851321
4605	454	596	44	2026-05-15 20:30:33	out	t	2026-06-03 08:40:50.851321
4606	454	596	44	2026-05-15 21:35:56	out	t	2026-06-03 08:40:50.851321
2870	454	595	20	2026-05-25 02:31:17	out	t	2026-05-28 18:08:17.832441
4607	454	596	44	2026-05-15 22:30:24	out	t	2026-06-03 08:40:50.851321
4608	454	596	44	2026-05-15 23:31:45	out	t	2026-06-03 08:40:50.851321
4609	454	596	44	2026-05-16 00:38:30	out	t	2026-06-03 08:40:50.851321
4610	454	596	44	2026-05-16 01:33:03	out	t	2026-06-03 08:40:50.851321
2875	454	\N	11111	2026-05-25 03:08:46	out	t	2026-05-28 18:08:17.832441
2876	454	\N	11111	2026-05-25 03:08:48	out	t	2026-05-28 18:08:17.832441
2877	454	\N	11111	2026-05-25 03:15:44	out	t	2026-05-28 18:08:17.832441
4611	454	611	18	2026-05-16 02:35:19	out	t	2026-06-03 08:40:50.851321
4612	454	596	44	2026-05-16 02:35:25	out	t	2026-06-03 08:40:50.851321
4613	454	611	18	2026-05-16 08:00:26	out	t	2026-06-03 08:40:50.851321
4614	454	611	18	2026-05-16 08:51:09	out	t	2026-06-03 08:40:50.851321
4615	454	598	49	2026-05-16 11:31:57	out	t	2026-06-03 08:40:50.851321
4616	454	611	18	2026-05-16 11:34:53	out	t	2026-06-03 08:40:50.851321
4617	454	597	45	2026-05-16 14:28:05	out	t	2026-06-03 08:40:50.851321
4618	454	598	49	2026-05-16 14:30:19	out	t	2026-06-03 08:40:50.851321
4619	454	597	45	2026-05-16 15:30:24	out	t	2026-06-03 08:40:50.851321
4620	454	597	45	2026-05-16 16:30:09	out	t	2026-06-03 08:40:50.851321
4621	454	597	45	2026-05-16 17:32:15	out	t	2026-06-03 08:40:50.851321
4622	454	597	45	2026-05-16 18:30:23	out	t	2026-06-03 08:40:50.851321
4623	454	597	45	2026-05-16 19:32:25	out	t	2026-06-03 08:40:50.851321
4624	454	597	45	2026-05-16 20:32:10	out	t	2026-06-03 08:40:50.851321
4625	454	597	45	2026-05-16 21:32:28	out	t	2026-06-03 08:40:50.851321
4626	454	597	45	2026-05-16 22:31:33	out	t	2026-06-03 08:40:50.851321
4627	454	597	45	2026-05-16 23:31:43	out	t	2026-06-03 08:40:50.851321
4628	454	597	45	2026-05-17 00:30:52	out	t	2026-06-03 08:40:50.851321
4629	454	597	45	2026-05-17 01:30:08	out	t	2026-06-03 08:40:50.851321
4630	454	611	18	2026-05-17 02:29:39	out	t	2026-06-03 08:40:50.851321
4631	454	597	45	2026-05-17 02:32:22	out	t	2026-06-03 08:40:50.851321
4632	454	597	45	2026-05-17 02:32:41	out	t	2026-06-03 08:40:50.851321
4633	454	611	18	2026-05-17 07:52:53	out	t	2026-06-03 08:40:50.851321
4634	454	611	18	2026-05-17 08:49:43	out	t	2026-06-03 08:40:50.851321
4635	454	610	47	2026-05-17 11:29:33	out	t	2026-06-03 08:40:50.851321
4636	454	611	18	2026-05-17 11:30:27	out	t	2026-06-03 08:40:50.851321
4637	454	596	44	2026-05-17 14:01:06	out	t	2026-06-03 08:40:50.851321
4638	454	610	47	2026-05-17 14:17:36	out	t	2026-06-03 08:40:50.851321
4639	454	596	44	2026-05-17 15:33:09	out	t	2026-06-03 08:40:50.851321
4640	454	596	44	2026-05-17 16:29:35	out	t	2026-06-03 08:40:50.851321
4641	454	596	44	2026-05-17 17:30:14	out	t	2026-06-03 08:40:50.851321
4642	454	596	44	2026-05-17 18:30:07	out	t	2026-06-03 08:40:50.851321
4643	454	596	44	2026-05-17 19:30:16	out	t	2026-06-03 08:40:50.851321
4644	454	596	44	2026-05-17 20:30:43	out	t	2026-06-03 08:40:50.851321
4645	454	596	44	2026-05-17 21:31:32	out	t	2026-06-03 08:40:50.851321
4646	454	596	44	2026-05-17 22:31:40	out	t	2026-06-03 08:40:50.851321
4647	454	596	44	2026-05-18 00:11:31	out	t	2026-06-03 08:40:50.851321
4648	454	596	44	2026-05-18 01:30:34	out	t	2026-06-03 08:40:50.851321
4649	454	598	49	2026-05-18 02:36:20	out	t	2026-06-03 08:40:50.851321
4650	454	596	44	2026-05-18 02:36:35	out	t	2026-06-03 08:40:50.851321
4651	454	\N	2	2026-05-18 11:22:08	out	t	2026-06-03 08:40:50.851321
4652	454	598	49	2026-05-18 11:25:46	out	t	2026-06-03 08:40:50.851321
4653	454	597	45	2026-05-18 14:23:35	out	t	2026-06-03 08:40:50.851321
4654	454	\N	2	2026-05-18 14:27:03	out	t	2026-06-03 08:40:50.851321
4655	454	597	45	2026-05-18 15:29:02	out	t	2026-06-03 08:40:50.851321
4656	454	597	45	2026-05-18 16:29:13	out	t	2026-06-03 08:40:50.851321
4657	454	597	45	2026-05-18 17:28:58	out	t	2026-06-03 08:40:50.851321
4658	454	597	45	2026-05-18 18:29:45	out	t	2026-06-03 08:40:50.851321
4659	454	597	45	2026-05-18 19:29:50	out	t	2026-06-03 08:40:50.851321
4660	454	597	45	2026-05-18 20:30:55	out	t	2026-06-03 08:40:50.851321
4257	460	619	20	2026-06-02 02:51:15	in	t	2026-06-02 02:51:46.408878
4271	460	602	58	2026-06-02 14:30:13	in	t	2026-06-02 14:30:30.520774
2934	454	\N	11111	2026-05-26 08:26:35	out	t	2026-05-28 18:08:17.879113
4661	454	597	45	2026-05-18 21:29:48	out	t	2026-06-03 08:40:50.851321
4662	454	597	45	2026-05-18 22:29:34	out	t	2026-06-03 08:40:50.851321
2938	454	\N	11111	2026-05-26 10:23:58	out	t	2026-05-28 18:08:17.879113
2939	454	\N	11111	2026-05-26 10:24:01	out	t	2026-05-28 18:08:17.879113
2940	454	\N	11111	2026-05-26 10:24:03	out	t	2026-05-28 18:08:17.879113
4663	454	597	45	2026-05-18 23:29:21	out	t	2026-06-03 08:40:50.851321
4664	454	597	45	2026-05-19 00:28:48	out	t	2026-06-03 08:40:50.851321
4665	454	597	45	2026-05-19 01:28:50	out	t	2026-06-03 08:40:50.851321
4666	454	597	45	2026-05-19 02:31:09	out	t	2026-06-03 08:40:50.851321
4667	454	611	18	2026-05-19 02:31:21	out	t	2026-06-03 08:40:50.851321
2946	454	595	20	2026-05-26 14:28:03	out	t	2026-05-28 18:08:17.879113
4668	454	611	18	2026-05-19 08:23:18	out	t	2026-06-03 08:40:50.851321
2948	454	595	20	2026-05-26 15:39:53	out	t	2026-05-28 18:08:17.879113
2949	454	595	20	2026-05-26 16:47:05	out	t	2026-05-28 18:08:17.879113
2950	454	595	20	2026-05-26 17:34:59	out	t	2026-05-28 18:08:17.879113
2951	454	595	20	2026-05-26 18:39:00	out	t	2026-05-28 18:08:17.879113
2952	454	595	20	2026-05-26 19:37:39	out	t	2026-05-28 18:08:17.879113
2953	454	595	20	2026-05-26 20:35:06	out	t	2026-05-28 18:08:17.879113
2954	454	595	20	2026-05-26 21:42:16	out	t	2026-05-28 18:08:17.879113
2955	454	595	20	2026-05-26 22:48:10	out	t	2026-05-28 18:08:17.879113
2956	454	595	20	2026-05-26 23:42:45	out	t	2026-05-28 18:08:17.879113
2957	454	595	20	2026-05-27 00:34:03	out	t	2026-05-28 18:08:17.879113
2958	454	595	20	2026-05-27 01:32:18	out	t	2026-05-28 18:08:17.879113
4669	454	611	18	2026-05-19 09:25:47	out	t	2026-06-03 08:40:50.851321
4670	454	\N	2	2026-05-19 11:26:31	out	t	2026-06-03 08:40:50.851321
4671	454	611	18	2026-05-19 11:29:52	out	t	2026-06-03 08:40:50.851321
4672	454	596	44	2026-05-19 14:05:03	out	t	2026-06-03 08:40:50.851321
4673	454	\N	2	2026-05-19 14:26:54	out	t	2026-06-03 08:40:50.851321
2964	454	595	20	2026-05-27 02:44:44	out	t	2026-05-28 18:08:17.879113
4674	454	596	44	2026-05-19 15:30:12	out	t	2026-06-03 08:40:50.851321
4675	454	596	44	2026-05-19 16:30:05	out	t	2026-06-03 08:40:50.851321
4676	454	596	44	2026-05-19 17:33:49	out	t	2026-06-03 08:40:50.851321
4677	454	596	44	2026-05-19 17:46:43	out	t	2026-06-03 08:40:50.851321
4678	454	596	44	2026-05-19 18:31:24	out	t	2026-06-03 08:40:50.851321
4679	454	596	44	2026-05-19 19:30:28	out	t	2026-06-03 08:40:50.851321
4680	454	596	44	2026-05-19 20:30:19	out	t	2026-06-03 08:40:50.851321
4681	454	596	44	2026-05-19 21:30:24	out	t	2026-06-03 08:40:50.851321
4682	454	596	44	2026-05-19 22:15:54	out	t	2026-06-03 08:40:50.851321
4683	454	596	44	2026-05-19 22:30:30	out	t	2026-06-03 08:40:50.851321
4684	454	596	44	2026-05-19 22:40:18	out	t	2026-06-03 08:40:50.851321
4685	454	596	44	2026-05-19 23:53:33	out	t	2026-06-03 08:40:50.851321
4686	454	596	44	2026-05-20 00:27:32	out	t	2026-06-03 08:40:50.851321
4687	454	596	44	2026-05-20 01:30:23	out	t	2026-06-03 08:40:50.851321
4688	454	596	44	2026-05-20 01:37:29	out	t	2026-06-03 08:40:50.851321
4689	454	596	44	2026-05-20 02:34:30	out	t	2026-06-03 08:40:50.851321
4690	454	598	49	2026-05-20 02:34:53	out	t	2026-06-03 08:40:50.851321
4691	454	598	49	2026-05-20 11:27:05	out	t	2026-06-03 08:40:50.851321
4692	454	611	18	2026-05-20 11:27:59	out	t	2026-06-03 08:40:50.851321
4693	454	597	45	2026-05-20 14:23:49	out	t	2026-06-03 08:40:50.851321
4694	454	611	18	2026-05-20 14:24:09	out	t	2026-06-03 08:40:50.851321
4695	454	597	45	2026-05-20 15:29:03	out	t	2026-06-03 08:40:50.851321
4696	454	597	45	2026-05-20 16:32:53	out	t	2026-06-03 08:40:50.851321
4697	454	597	45	2026-05-20 17:30:23	out	t	2026-06-03 08:40:50.851321
4698	454	597	45	2026-05-20 18:30:46	out	t	2026-06-03 08:40:50.851321
4699	454	597	45	2026-05-20 19:30:04	out	t	2026-06-03 08:40:50.851321
4700	454	597	45	2026-05-20 20:29:28	out	t	2026-06-03 08:40:50.851321
4701	454	597	45	2026-05-20 21:29:30	out	t	2026-06-03 08:40:50.851321
4702	454	597	45	2026-05-20 22:29:33	out	t	2026-06-03 08:40:50.851321
4703	454	597	45	2026-05-20 23:30:10	out	t	2026-06-03 08:40:50.851321
4704	454	597	45	2026-05-21 00:30:35	out	t	2026-06-03 08:40:50.851321
4705	454	597	45	2026-05-21 01:29:23	out	t	2026-06-03 08:40:50.851321
4706	454	597	45	2026-05-21 02:32:59	out	t	2026-06-03 08:40:50.851321
4707	454	611	18	2026-05-21 02:33:16	out	t	2026-06-03 08:40:50.851321
4708	454	605	46	2026-05-21 08:08:34	out	t	2026-06-03 08:40:50.851321
4709	454	611	18	2026-05-21 08:08:36	out	t	2026-06-03 08:40:50.851321
4710	454	611	18	2026-05-21 08:57:59	out	t	2026-06-03 08:40:50.851321
4711	454	\N	2	2026-05-21 11:23:18	out	t	2026-06-03 08:40:50.851321
4712	454	611	18	2026-05-21 11:25:23	out	t	2026-06-03 08:40:50.851321
4713	454	599	52	2026-05-21 12:51:21	out	t	2026-06-03 08:40:50.851321
4714	454	596	44	2026-05-21 14:15:01	out	t	2026-06-03 08:40:50.851321
4715	454	\N	2	2026-05-21 14:23:40	out	t	2026-06-03 08:40:50.851321
4716	454	596	44	2026-05-21 15:37:30	out	t	2026-06-03 08:40:50.902064
4717	454	596	44	2026-05-21 16:31:01	out	t	2026-06-03 08:40:50.902064
4718	454	596	44	2026-05-21 17:51:26	out	t	2026-06-03 08:40:50.902064
4719	454	596	44	2026-05-21 18:30:41	out	t	2026-06-03 08:40:50.902064
4720	454	596	44	2026-05-21 19:30:38	out	t	2026-06-03 08:40:50.902064
3012	454	\N	3	2026-05-28 01:44:10	out	t	2026-05-28 18:08:17.879113
3013	454	\N	3	2026-05-28 02:10:30	out	t	2026-05-28 18:08:17.879113
4721	454	596	44	2026-05-21 20:30:36	out	t	2026-06-03 08:40:50.902064
4722	454	596	44	2026-05-21 21:35:21	out	t	2026-06-03 08:40:50.902064
4723	454	596	44	2026-05-21 22:31:12	out	t	2026-06-03 08:40:50.902064
4724	454	596	44	2026-05-21 23:02:06	out	t	2026-06-03 08:40:50.902064
4725	454	596	44	2026-05-21 23:26:50	out	t	2026-06-03 08:40:50.902064
3019	454	\N	11111	2026-05-28 03:14:18	out	t	2026-05-28 18:08:17.879113
3020	454	\N	11111	2026-05-28 03:14:21	out	t	2026-05-28 18:08:17.879113
3021	460	595	20	2026-05-28 14:27:50	in	t	2026-05-29 04:50:33.319523
4726	454	596	44	2026-05-21 23:33:11	out	t	2026-06-03 08:40:50.902064
4727	454	596	44	2026-05-22 00:28:42	out	t	2026-06-03 08:40:50.902064
3024	460	595	20	2026-05-28 15:43:28	in	t	2026-05-29 04:50:33.319523
3025	460	595	20	2026-05-28 16:34:34	in	t	2026-05-29 04:50:33.319523
3026	460	595	20	2026-05-28 17:43:42	in	t	2026-05-29 04:50:33.319523
3027	460	595	20	2026-05-28 18:40:07	in	t	2026-05-29 04:50:33.319523
3028	460	595	20	2026-05-28 19:45:56	in	t	2026-05-29 04:50:33.319523
3029	460	595	20	2026-05-28 20:44:57	in	t	2026-05-29 04:50:33.319523
3030	460	595	20	2026-05-28 21:39:52	in	t	2026-05-29 04:50:33.319523
3031	460	595	20	2026-05-28 22:43:48	in	t	2026-05-29 04:50:33.319523
3032	460	595	20	2026-05-28 23:35:00	in	t	2026-05-29 04:50:33.319523
3033	460	595	20	2026-05-29 00:37:06	in	t	2026-05-29 04:50:33.319523
3034	460	595	20	2026-05-29 01:51:17	in	t	2026-05-29 04:50:33.319523
4728	454	596	44	2026-05-22 01:29:36	out	t	2026-06-03 08:40:50.902064
3036	460	595	20	2026-05-29 02:54:50	in	t	2026-05-29 04:50:33.319523
4729	454	\N	2	2026-05-22 02:21:27	out	t	2026-06-03 08:40:50.902064
3039	461	\N	2	2026-05-28 14:29:13	in	t	2026-05-29 04:50:37.991988
3069	461	\N	2	2026-05-30 02:25:27	in	t	2026-06-01 04:06:26.7534
3071	461	\N	2	2026-05-30 09:15:29	in	t	2026-06-01 04:06:26.7534
3072	461	\N	2	2026-05-30 09:49:31	in	t	2026-06-01 04:06:26.7534
3074	461	\N	2	2026-05-30 11:31:59	in	t	2026-06-01 04:06:26.7534
3088	461	\N	2	2026-05-31 02:30:50	in	t	2026-06-01 04:06:26.7534
3090	461	\N	2	2026-05-31 08:14:56	in	t	2026-06-01 04:06:26.7534
3091	461	\N	2	2026-05-31 08:51:45	in	t	2026-06-01 04:06:26.7534
3092	461	\N	2	2026-05-31 11:31:54	in	t	2026-06-01 04:06:26.7534
4294	460	\N	3	2026-06-03 01:43:01	in	t	2026-06-03 01:43:58.877698
4730	454	596	44	2026-05-22 02:29:45	out	t	2026-06-03 08:40:50.902064
4731	454	\N	2	2026-05-22 08:24:02	out	t	2026-06-03 08:40:50.902064
4732	454	\N	2	2026-05-22 09:07:44	out	t	2026-06-03 08:40:50.902064
4733	454	598	49	2026-05-22 11:31:44	out	t	2026-06-03 08:40:50.902064
4734	454	\N	2	2026-05-22 11:31:58	out	t	2026-06-03 08:40:50.902064
4735	454	598	49	2026-05-22 14:32:28	out	t	2026-06-03 08:40:50.902064
4736	454	597	45	2026-05-22 14:33:28	out	t	2026-06-03 08:40:50.902064
4737	454	597	45	2026-05-22 15:31:42	out	t	2026-06-03 08:40:50.902064
4738	454	597	45	2026-05-22 16:32:37	out	t	2026-06-03 08:40:50.902064
4739	454	597	45	2026-05-22 18:32:01	out	t	2026-06-03 08:40:50.902064
4740	454	597	45	2026-05-22 19:32:00	out	t	2026-06-03 08:40:50.902064
4741	454	597	45	2026-05-22 20:31:27	out	t	2026-06-03 08:40:50.902064
4742	454	597	45	2026-05-22 21:31:37	out	t	2026-06-03 08:40:50.902064
4743	454	597	45	2026-05-22 23:30:50	out	t	2026-06-03 08:40:50.902064
4744	454	597	45	2026-05-23 00:30:29	out	t	2026-06-03 08:40:50.902064
4745	454	597	45	2026-05-23 01:30:21	out	t	2026-06-03 08:40:50.902064
4746	454	\N	2	2026-05-23 02:23:30	out	t	2026-06-03 08:40:50.902064
4747	454	597	45	2026-05-23 02:29:18	out	t	2026-06-03 08:40:50.902064
4748	454	\N	2	2026-05-23 08:25:26	out	t	2026-06-03 08:40:50.902064
4749	454	\N	2	2026-05-23 09:18:59	out	t	2026-06-03 08:40:50.902064
4750	454	\N	2	2026-05-23 11:33:08	out	t	2026-06-03 08:40:50.902064
4751	454	611	18	2026-05-23 11:33:19	out	t	2026-06-03 08:40:50.902064
4752	454	596	44	2026-05-23 14:14:47	out	t	2026-06-03 08:40:50.902064
4753	454	611	18	2026-05-23 14:17:38	out	t	2026-06-03 08:40:50.902064
3137	460	595	20	2026-05-30 14:27:40	in	t	2026-06-01 04:06:26.779821
4754	454	596	44	2026-05-23 15:30:41	out	t	2026-06-03 08:40:50.902064
3139	460	595	20	2026-05-30 15:33:53	in	t	2026-06-01 04:06:26.779821
3140	460	595	20	2026-05-30 16:34:54	in	t	2026-06-01 04:06:26.779821
3141	460	595	20	2026-05-30 17:38:00	in	t	2026-06-01 04:06:26.779821
3142	460	595	20	2026-05-30 18:41:38	in	t	2026-06-01 04:06:26.779821
3143	460	595	20	2026-05-30 19:43:45	in	t	2026-06-01 04:06:26.779821
3144	460	595	20	2026-05-30 20:44:30	in	t	2026-06-01 04:06:26.779821
3145	460	595	20	2026-05-30 21:44:45	in	t	2026-06-01 04:06:26.779821
3146	460	595	20	2026-05-30 22:34:08	in	t	2026-06-01 04:06:26.779821
3147	460	595	20	2026-05-30 23:49:38	in	t	2026-06-01 04:06:26.779821
3148	460	595	20	2026-05-31 00:38:50	in	t	2026-06-01 04:06:26.779821
3149	460	\N	3	2026-05-31 01:15:44	in	t	2026-06-01 04:06:26.779821
3150	460	\N	3	2026-05-31 01:39:27	in	t	2026-06-01 04:06:26.779821
3151	460	595	20	2026-05-31 01:40:16	in	t	2026-06-01 04:06:26.779821
3152	460	595	20	2026-05-31 02:38:55	in	t	2026-06-01 04:06:26.779821
4755	454	596	44	2026-05-23 16:30:11	out	t	2026-06-03 08:40:50.902064
4756	454	596	44	2026-05-23 17:44:16	out	t	2026-06-03 08:40:50.902064
4757	454	596	44	2026-05-23 18:26:53	out	t	2026-06-03 08:40:50.902064
4758	454	596	44	2026-05-23 19:30:48	out	t	2026-06-03 08:40:50.902064
4759	454	596	44	2026-05-23 20:30:41	out	t	2026-06-03 08:40:50.902064
4760	454	596	44	2026-05-23 21:30:27	out	t	2026-06-03 08:40:50.902064
4761	454	596	44	2026-05-23 22:30:29	out	t	2026-06-03 08:40:50.902064
4762	454	596	44	2026-05-23 23:30:22	out	t	2026-06-03 08:40:50.902064
4763	454	596	44	2026-05-24 00:58:31	out	t	2026-06-03 08:40:50.902064
4764	454	596	44	2026-05-24 01:28:23	out	t	2026-06-03 08:40:50.902064
4765	454	611	18	2026-05-24 02:31:26	out	t	2026-06-03 08:40:50.902064
4766	454	596	44	2026-05-24 02:31:43	out	t	2026-06-03 08:40:50.902064
4767	454	611	18	2026-05-24 09:19:33	out	t	2026-06-03 08:40:50.902064
4768	454	611	18	2026-05-24 10:03:31	out	t	2026-06-03 08:40:50.902064
4769	454	598	49	2026-05-24 11:34:47	out	t	2026-06-03 08:40:50.902064
3171	460	608	42	2026-06-01 02:28:32	in	t	2026-06-01 04:06:26.779821
3174	460	608	42	2026-06-01 02:42:30	in	t	2026-06-01 04:06:26.779821
4295	460	\N	3	2026-06-03 02:13:40	in	t	2026-06-03 02:14:00.917275
4770	454	611	18	2026-05-24 11:40:43	out	t	2026-06-03 08:40:50.902064
4771	454	597	45	2026-05-24 14:22:23	out	t	2026-06-03 08:40:50.902064
4772	454	598	49	2026-05-24 14:25:35	out	t	2026-06-03 08:40:50.902064
4773	454	597	45	2026-05-24 15:30:31	out	t	2026-06-03 08:40:50.902064
3181	460	613	54	2026-06-01 05:05:28	in	t	2026-06-01 05:05:43.903957
4774	454	597	45	2026-05-24 16:30:25	out	t	2026-06-03 08:40:50.902064
4775	454	597	45	2026-05-24 17:30:25	out	t	2026-06-03 08:40:50.902064
4776	454	597	45	2026-05-24 18:31:18	out	t	2026-06-03 08:40:50.902064
4777	454	597	45	2026-05-24 19:30:44	out	t	2026-06-03 08:40:50.902064
4778	454	597	45	2026-05-24 20:31:36	out	t	2026-06-03 08:40:50.902064
4779	454	597	45	2026-05-24 21:31:02	out	t	2026-06-03 08:40:50.902064
4780	454	597	45	2026-05-24 22:30:30	out	t	2026-06-03 08:40:50.902064
4781	454	\N	11111	2026-05-27 06:41:44	out	t	2026-06-03 08:40:50.902064
4782	454	599	52	2026-05-27 08:45:56	out	t	2026-06-03 08:40:50.902064
4783	454	599	52	2026-05-27 08:46:18	out	t	2026-06-03 08:40:50.902064
3193	460	\N	11111	2026-06-01 10:44:18	in	t	2026-06-01 10:45:17.426019
4784	454	\N	2	2026-05-27 11:36:05	out	t	2026-06-03 08:40:50.902064
3195	460	\N	11111	2026-06-01 10:44:22	in	t	2026-06-01 10:45:17.426019
4785	454	596	44	2026-05-27 14:18:07	out	t	2026-06-03 08:40:50.902064
4786	454	\N	2	2026-05-27 14:29:44	out	t	2026-06-03 08:40:50.902064
3198	461	\N	2	2026-06-01 11:23:08	in	t	2026-06-01 11:23:19.516467
3199	461	598	49	2026-06-01 11:25:00	in	t	2026-06-01 11:25:19.602329
3200	460	\N	11111	2026-06-01 11:28:15	in	t	2026-06-01 11:29:17.555969
3201	460	607	41	2026-06-01 11:30:06	in	t	2026-06-01 11:30:17.464646
4787	454	596	44	2026-05-27 15:30:17	out	t	2026-06-03 08:40:50.902064
3203	460	610	47	2026-06-01 11:33:03	in	t	2026-06-01 11:33:18.073998
3204	460	609	50	2026-06-01 11:34:23	in	t	2026-06-01 11:35:18.242105
3205	460	605	46	2026-06-01 11:34:40	in	t	2026-06-01 11:35:18.242105
3206	460	600	55	2026-06-01 11:47:18	in	t	2026-06-01 11:48:17.686063
3207	454	619	20	2026-04-30 18:34:22	out	t	2026-06-01 12:31:22.348954
3208	454	619	20	2026-04-30 19:33:21	out	t	2026-06-01 12:31:22.348954
3209	454	619	20	2026-04-30 20:51:05	out	t	2026-06-01 12:31:22.348954
3210	454	619	20	2026-04-30 21:32:28	out	t	2026-06-01 12:31:22.348954
3211	454	619	20	2026-04-30 22:33:07	out	t	2026-06-01 12:31:22.348954
3212	454	619	20	2026-04-30 23:41:10	out	t	2026-06-01 12:31:22.348954
3213	454	619	20	2026-05-01 01:38:51	out	t	2026-06-01 12:31:22.348954
3215	454	605	46	2026-05-01 02:31:32	out	t	2026-06-01 12:31:22.348954
3216	454	619	20	2026-05-01 02:34:03	out	t	2026-06-01 12:31:22.348954
3217	454	608	42	2026-05-01 02:34:18	out	t	2026-06-01 12:31:22.348954
3219	454	600	55	2026-05-01 03:04:58	out	t	2026-06-01 12:31:22.348954
3220	454	600	55	2026-05-01 07:40:22	out	t	2026-06-01 12:31:22.348954
3221	454	605	46	2026-05-01 08:24:52	out	t	2026-06-01 12:31:22.348954
3222	454	600	55	2026-05-01 08:25:04	out	t	2026-06-01 12:31:22.348954
3223	454	608	42	2026-05-01 08:30:31	out	t	2026-06-01 12:31:22.348954
3224	454	605	46	2026-05-01 09:30:06	out	t	2026-06-01 12:31:22.348954
3225	454	608	42	2026-05-01 09:34:21	out	t	2026-06-01 12:31:22.348954
3226	454	608	42	2026-05-01 11:32:10	out	t	2026-06-01 12:31:22.348954
3227	454	602	58	2026-05-01 11:36:02	out	t	2026-06-01 12:31:22.348954
3228	454	603	57	2026-05-01 11:36:25	out	t	2026-06-01 12:31:22.348954
3229	454	600	55	2026-05-01 11:37:51	out	t	2026-06-01 12:31:22.348954
3230	454	605	46	2026-05-01 11:47:31	out	t	2026-06-01 12:31:22.348954
3231	454	594	60	2026-05-01 14:26:22	out	t	2026-06-01 12:31:22.348954
3232	454	602	58	2026-05-01 14:26:39	out	t	2026-06-01 12:31:22.348954
3233	454	603	57	2026-05-01 14:27:36	out	t	2026-06-01 12:31:22.348954
3234	454	594	60	2026-05-01 15:31:26	out	t	2026-06-01 12:31:22.348954
3235	454	594	60	2026-05-01 16:31:32	out	t	2026-06-01 12:31:22.348954
3236	454	594	60	2026-05-01 17:31:44	out	t	2026-06-01 12:31:22.348954
3237	454	594	60	2026-05-01 18:31:28	out	t	2026-06-01 12:31:22.348954
3238	454	594	60	2026-05-01 19:31:40	out	t	2026-06-01 12:31:22.348954
3239	454	594	60	2026-05-01 20:30:56	out	t	2026-06-01 12:31:22.348954
3240	454	594	60	2026-05-01 21:30:53	out	t	2026-06-01 12:31:22.348954
3241	454	594	60	2026-05-01 22:30:53	out	t	2026-06-01 12:31:22.348954
3242	454	594	60	2026-05-01 23:31:33	out	t	2026-06-01 12:31:22.348954
3243	454	594	60	2026-05-02 00:31:46	out	t	2026-06-01 12:31:22.348954
3244	454	594	60	2026-05-02 01:31:25	out	t	2026-06-01 12:31:22.348954
3245	454	607	41	2026-05-02 02:24:50	out	t	2026-06-01 12:31:22.348954
3246	454	594	60	2026-05-02 02:31:16	out	t	2026-06-01 12:31:22.348954
3247	454	609	50	2026-05-02 02:34:00	out	t	2026-06-01 12:31:22.348954
3248	454	605	46	2026-05-02 02:39:30	out	t	2026-06-01 12:31:22.348954
3249	454	607	41	2026-05-02 08:31:13	out	t	2026-06-01 12:31:22.348954
3250	454	609	50	2026-05-02 08:31:24	out	t	2026-06-01 12:31:22.348954
3251	454	605	46	2026-05-02 08:48:42	out	t	2026-06-01 12:31:22.348954
3252	454	605	46	2026-05-02 09:12:05	out	t	2026-06-01 12:31:22.348954
3253	454	605	46	2026-05-02 09:12:27	out	t	2026-06-01 12:31:22.348954
3254	454	607	41	2026-05-02 09:30:53	out	t	2026-06-01 12:31:22.348954
3255	454	609	50	2026-05-02 09:31:23	out	t	2026-06-01 12:31:22.348954
3256	454	601	34	2026-05-02 11:21:17	out	t	2026-06-01 12:31:22.348954
3257	454	602	58	2026-05-02 11:31:15	out	t	2026-06-01 12:31:22.348954
3258	454	607	41	2026-05-02 11:34:02	out	t	2026-06-01 12:31:22.348954
3259	454	605	46	2026-05-02 11:35:25	out	t	2026-06-01 12:31:22.348954
3260	454	609	50	2026-05-02 11:35:55	out	t	2026-06-01 12:31:22.348954
3261	454	619	20	2026-05-02 14:29:26	out	t	2026-06-01 12:31:22.348954
3262	454	602	58	2026-05-02 14:29:43	out	t	2026-06-01 12:31:22.348954
3263	454	601	34	2026-05-02 14:30:21	out	t	2026-06-01 12:31:22.348954
3264	454	619	20	2026-05-02 15:42:12	out	t	2026-06-01 12:31:22.348954
3265	454	619	20	2026-05-02 16:45:16	out	t	2026-06-01 12:31:22.348954
3266	454	619	20	2026-05-02 17:37:56	out	t	2026-06-01 12:31:22.348954
3267	454	619	20	2026-05-02 18:31:25	out	t	2026-06-01 12:31:22.348954
3268	454	619	20	2026-05-02 19:32:45	out	t	2026-06-01 12:31:22.348954
3269	454	619	20	2026-05-02 20:44:29	out	t	2026-06-01 12:31:22.348954
3270	454	619	20	2026-05-02 21:35:16	out	t	2026-06-01 12:31:22.348954
3271	454	619	20	2026-05-02 22:38:15	out	t	2026-06-01 12:31:22.348954
3272	454	619	20	2026-05-02 23:37:22	out	t	2026-06-01 12:31:22.348954
3273	454	619	20	2026-05-03 00:37:49	out	t	2026-06-01 12:31:22.348954
3274	454	619	20	2026-05-03 01:34:23	out	t	2026-06-01 12:31:22.348954
3275	454	605	46	2026-05-03 02:29:02	out	t	2026-06-01 12:31:22.348954
3276	454	617	9	2026-05-03 02:30:28	out	t	2026-06-01 12:31:22.348954
3277	454	608	42	2026-05-03 02:38:48	out	t	2026-06-01 12:31:22.348954
3278	454	619	20	2026-05-03 02:41:02	out	t	2026-06-01 12:31:22.348954
3279	454	599	52	2026-05-03 04:20:15	out	t	2026-06-01 12:31:22.348954
3280	454	616	53	2026-05-03 04:43:47	out	t	2026-06-01 12:31:22.348954
3281	454	605	46	2026-05-03 08:30:31	out	t	2026-06-01 12:31:22.348954
3282	454	617	9	2026-05-03 08:30:45	out	t	2026-06-01 12:31:22.348954
3283	454	612	48	2026-05-03 08:31:08	out	t	2026-06-01 12:31:22.348954
3284	454	608	42	2026-05-03 08:31:23	out	t	2026-06-01 12:31:22.348954
3285	454	612	48	2026-05-03 08:47:10	out	t	2026-06-01 12:31:22.348954
3286	454	616	53	2026-05-03 08:47:21	out	t	2026-06-01 12:31:22.348954
3287	454	617	9	2026-05-03 09:18:27	out	t	2026-06-01 12:31:22.348954
3288	454	608	42	2026-05-03 09:25:43	out	t	2026-06-01 12:31:22.348954
3289	454	605	46	2026-05-03 09:34:52	out	t	2026-06-01 12:31:22.348954
3290	454	602	58	2026-05-03 11:27:23	out	t	2026-06-01 12:31:22.348954
3291	454	601	34	2026-05-03 11:30:24	out	t	2026-06-01 12:31:22.348954
3292	454	617	9	2026-05-03 11:30:35	out	t	2026-06-01 12:31:22.348954
3293	454	608	42	2026-05-03 11:31:02	out	t	2026-06-01 12:31:22.348954
3294	454	605	46	2026-05-03 11:40:35	out	t	2026-06-01 12:31:22.348954
3295	454	599	52	2026-05-03 12:58:59	out	t	2026-06-01 12:31:22.348954
3296	454	594	60	2026-05-03 14:28:27	out	t	2026-06-01 12:31:22.348954
3297	454	601	34	2026-05-03 14:28:54	out	t	2026-06-01 12:31:22.348954
3298	454	602	58	2026-05-03 14:29:08	out	t	2026-06-01 12:31:22.348954
3299	454	594	60	2026-05-03 15:31:21	out	t	2026-06-01 12:31:22.348954
3300	454	594	60	2026-05-03 16:31:20	out	t	2026-06-01 12:31:22.348954
3301	454	594	60	2026-05-03 17:31:45	out	t	2026-06-01 12:31:22.348954
3302	454	594	60	2026-05-03 18:04:36	out	t	2026-06-01 12:31:22.348954
3303	454	594	60	2026-05-03 18:31:43	out	t	2026-06-01 12:31:22.348954
3304	454	594	60	2026-05-03 19:31:54	out	t	2026-06-01 12:31:22.348954
3305	454	594	60	2026-05-03 20:32:02	out	t	2026-06-01 12:31:22.348954
3306	454	594	60	2026-05-03 21:31:44	out	t	2026-06-01 12:31:22.348954
3307	454	594	60	2026-05-03 22:31:55	out	t	2026-06-01 12:31:22.348954
3308	454	594	60	2026-05-03 23:31:45	out	t	2026-06-01 12:31:22.348954
3309	454	594	60	2026-05-04 00:31:43	out	t	2026-06-01 12:31:22.348954
3310	454	594	60	2026-05-04 01:32:03	out	t	2026-06-01 12:31:22.348954
3311	454	604	59	2026-05-04 02:10:22	out	t	2026-06-01 12:31:22.348954
3312	454	617	9	2026-05-04 02:28:24	out	t	2026-06-01 12:31:22.348954
3313	454	608	42	2026-05-04 02:31:04	out	t	2026-06-01 12:31:22.348954
3314	454	594	60	2026-05-04 02:31:34	out	t	2026-06-01 12:31:22.348954
3315	454	605	46	2026-05-04 03:29:50	out	t	2026-06-01 12:31:22.348954
3316	454	614	56	2026-05-04 03:30:01	out	t	2026-06-01 12:31:22.348954
3317	454	603	57	2026-05-04 03:36:50	out	t	2026-06-01 12:31:22.348954
3318	454	600	55	2026-05-04 03:42:18	out	t	2026-06-01 12:31:22.348954
3319	454	616	53	2026-05-04 03:47:48	out	t	2026-06-01 12:31:22.348954
3320	454	599	52	2026-05-04 04:10:25	out	t	2026-06-01 12:31:22.348954
3321	454	601	34	2026-05-04 05:33:29	out	t	2026-06-01 12:31:22.348954
3322	454	614	56	2026-05-04 07:15:07	out	t	2026-06-01 12:31:22.348954
3323	454	614	56	2026-05-04 07:43:43	out	t	2026-06-01 12:31:22.348954
3324	454	600	55	2026-05-04 08:19:11	out	t	2026-06-01 12:31:22.348954
3325	454	616	53	2026-05-04 08:25:18	out	t	2026-06-01 12:31:22.348954
3326	454	617	9	2026-05-04 08:30:10	out	t	2026-06-01 12:31:22.348954
3327	454	608	42	2026-05-04 08:31:03	out	t	2026-06-01 12:31:22.348954
3328	454	604	59	2026-05-04 08:41:39	out	t	2026-06-01 12:31:22.348954
3329	454	601	34	2026-05-04 08:41:51	out	t	2026-06-01 12:31:22.348954
3330	454	600	55	2026-05-04 09:09:13	out	t	2026-06-01 12:31:22.348954
3331	454	608	42	2026-05-04 09:26:00	out	t	2026-06-01 12:31:22.348954
3332	454	617	9	2026-05-04 09:27:54	out	t	2026-06-01 12:31:22.348954
3333	454	604	59	2026-05-04 09:30:42	out	t	2026-06-01 12:31:22.348954
3334	454	601	34	2026-05-04 09:38:57	out	t	2026-06-01 12:31:22.348954
3335	454	617	9	2026-05-04 11:30:05	out	t	2026-06-01 12:31:22.348954
3336	454	608	42	2026-05-04 11:31:48	out	t	2026-06-01 12:31:22.348954
3337	454	604	59	2026-05-04 11:43:47	out	t	2026-06-01 12:31:22.348954
3338	454	603	57	2026-05-04 12:31:13	out	t	2026-06-01 12:31:22.348954
3339	454	602	58	2026-05-04 12:31:29	out	t	2026-06-01 12:31:22.348954
3340	454	605	46	2026-05-04 12:31:43	out	t	2026-06-01 12:31:22.348954
3341	454	600	55	2026-05-04 12:45:23	out	t	2026-06-01 12:31:22.348954
3342	454	599	52	2026-05-04 12:49:28	out	t	2026-06-01 12:31:22.348954
3343	454	619	20	2026-05-04 14:29:04	out	t	2026-06-01 12:31:22.348954
3344	454	601	34	2026-05-04 14:30:31	out	t	2026-06-01 12:31:22.348954
3345	454	619	20	2026-05-04 15:41:18	out	t	2026-06-01 12:31:22.348954
3346	454	619	20	2026-05-04 16:32:02	out	t	2026-06-01 12:31:22.348954
3347	454	619	20	2026-05-04 17:32:12	out	t	2026-06-01 12:31:22.348954
3348	454	619	20	2026-05-04 18:35:21	out	t	2026-06-01 12:31:22.348954
3349	454	619	20	2026-05-04 19:38:34	out	t	2026-06-01 12:31:22.348954
3350	454	619	20	2026-05-04 20:48:28	out	t	2026-06-01 12:31:22.348954
3351	454	619	20	2026-05-04 21:34:27	out	t	2026-06-01 12:31:22.348954
3352	454	619	20	2026-05-04 22:40:19	out	t	2026-06-01 12:31:22.348954
3353	454	619	20	2026-05-04 23:35:46	out	t	2026-06-01 12:31:22.348954
3354	454	619	20	2026-05-05 00:40:27	out	t	2026-06-01 12:31:22.348954
3355	454	619	20	2026-05-05 01:37:22	out	t	2026-06-01 12:31:22.348954
3356	454	604	59	2026-05-05 02:06:14	out	t	2026-06-01 12:31:22.348954
3357	454	617	9	2026-05-05 02:28:37	out	t	2026-06-01 12:31:22.348954
3358	454	619	20	2026-05-05 02:32:14	out	t	2026-06-01 12:31:22.348954
3359	454	614	56	2026-05-05 03:29:35	out	t	2026-06-01 12:31:22.348954
3360	454	603	57	2026-05-05 03:34:34	out	t	2026-06-01 12:31:22.348954
3361	454	605	46	2026-05-05 03:34:44	out	t	2026-06-01 12:31:22.348954
3362	454	602	58	2026-05-05 03:57:10	out	t	2026-06-01 12:31:22.348954
3363	454	614	56	2026-05-05 03:57:19	out	t	2026-06-01 12:31:22.348954
3364	454	616	53	2026-05-05 04:00:29	out	t	2026-06-01 12:31:22.348954
3365	454	599	52	2026-05-05 04:00:49	out	t	2026-06-01 12:31:22.348954
3366	454	614	56	2026-05-05 07:26:09	out	t	2026-06-01 12:31:22.348954
3367	454	616	53	2026-05-05 07:38:24	out	t	2026-06-01 12:31:22.348954
3368	454	603	57	2026-05-05 07:41:02	out	t	2026-06-01 12:31:22.348954
3369	454	605	46	2026-05-05 08:01:05	out	t	2026-06-01 12:31:22.348954
3370	454	617	9	2026-05-05 08:30:06	out	t	2026-06-01 12:31:22.348954
3371	454	604	59	2026-05-05 08:32:45	out	t	2026-06-01 12:31:22.348954
3372	454	599	52	2026-05-05 09:15:54	out	t	2026-06-01 12:31:22.348954
3373	454	601	34	2026-05-05 09:31:50	out	t	2026-06-01 12:31:22.348954
3374	454	602	58	2026-05-05 09:33:12	out	t	2026-06-01 12:31:22.348954
3375	454	599	52	2026-05-05 10:14:58	out	t	2026-06-01 12:31:22.348954
3376	454	599	52	2026-05-05 11:57:35	out	t	2026-06-01 12:31:22.348954
3377	454	594	60	2026-05-05 14:26:42	out	t	2026-06-01 12:31:22.348954
3378	454	601	34	2026-05-05 14:30:53	out	t	2026-06-01 12:31:22.348954
3379	454	594	60	2026-05-05 15:31:26	out	t	2026-06-01 12:31:22.348954
3380	454	594	60	2026-05-05 15:31:45	out	t	2026-06-01 12:31:22.348954
3381	454	594	60	2026-05-05 16:31:40	out	t	2026-06-01 12:31:22.348954
3382	454	594	60	2026-05-05 17:31:46	out	t	2026-06-01 12:31:22.348954
3383	454	594	60	2026-05-05 18:31:50	out	t	2026-06-01 12:31:22.348954
3384	454	594	60	2026-05-05 19:31:47	out	t	2026-06-01 12:31:22.348954
3385	454	594	60	2026-05-05 20:31:47	out	t	2026-06-01 12:31:22.348954
3386	454	594	60	2026-05-05 21:31:31	out	t	2026-06-01 12:31:22.348954
3387	454	594	60	2026-05-05 22:31:47	out	t	2026-06-01 12:31:22.348954
3388	454	594	60	2026-05-05 23:31:45	out	t	2026-06-01 12:31:22.348954
3389	454	594	60	2026-05-06 00:40:33	out	t	2026-06-01 12:31:22.348954
3390	454	594	60	2026-05-06 01:31:35	out	t	2026-06-01 12:31:22.348954
3391	454	604	59	2026-05-06 01:49:28	out	t	2026-06-01 12:31:22.348954
3392	454	607	41	2026-05-06 02:30:32	out	t	2026-06-01 12:31:22.348954
3393	454	594	60	2026-05-06 02:31:33	out	t	2026-06-01 12:31:22.348954
3394	454	603	57	2026-05-06 03:31:56	out	t	2026-06-01 12:31:22.348954
3395	454	605	46	2026-05-06 03:39:50	out	t	2026-06-01 12:31:22.348954
3396	454	614	56	2026-05-06 03:40:12	out	t	2026-06-01 12:31:22.348954
3397	454	616	53	2026-05-06 04:49:42	out	t	2026-06-01 12:31:22.348954
3398	454	599	52	2026-05-06 04:53:56	out	t	2026-06-01 12:31:22.348954
3399	454	616	53	2026-05-06 06:32:13	out	t	2026-06-01 12:31:22.348954
3400	454	614	56	2026-05-06 06:35:49	out	t	2026-06-01 12:31:22.348954
3401	454	605	46	2026-05-06 06:42:46	out	t	2026-06-01 12:31:22.348954
3402	454	599	52	2026-05-06 07:21:31	out	t	2026-06-01 12:31:22.348954
3403	454	604	59	2026-05-06 08:31:23	out	t	2026-06-01 12:31:22.348954
3404	454	607	41	2026-05-06 08:31:41	out	t	2026-06-01 12:31:22.348954
3405	454	601	34	2026-05-06 09:32:34	out	t	2026-06-01 12:31:22.348954
3406	454	603	57	2026-05-06 09:37:08	out	t	2026-06-01 12:31:22.348954
3407	454	599	52	2026-05-06 11:18:43	out	t	2026-06-01 12:31:22.419265
3408	454	619	20	2026-05-06 14:27:16	out	t	2026-06-01 12:31:22.419265
3409	454	601	34	2026-05-06 14:30:18	out	t	2026-06-01 12:31:22.419265
3410	454	619	20	2026-05-06 15:34:25	out	t	2026-06-01 12:31:22.419265
3411	454	619	20	2026-05-06 16:36:11	out	t	2026-06-01 12:31:22.419265
3412	454	619	20	2026-05-06 16:36:23	out	t	2026-06-01 12:31:22.419265
3413	454	619	20	2026-05-06 17:35:51	out	t	2026-06-01 12:31:22.419265
3414	454	619	20	2026-05-06 18:33:52	out	t	2026-06-01 12:31:22.419265
3415	454	619	20	2026-05-06 18:34:04	out	t	2026-06-01 12:31:22.419265
3416	454	619	20	2026-05-06 19:36:35	out	t	2026-06-01 12:31:22.419265
3417	454	619	20	2026-05-06 20:47:37	out	t	2026-06-01 12:31:22.419265
3418	454	619	20	2026-05-06 21:40:04	out	t	2026-06-01 12:31:22.419265
3419	454	619	20	2026-05-06 22:41:33	out	t	2026-06-01 12:31:22.419265
3420	454	619	20	2026-05-06 23:32:14	out	t	2026-06-01 12:31:22.419265
3421	454	619	20	2026-05-07 00:36:39	out	t	2026-06-01 12:31:22.419265
3422	454	619	20	2026-05-07 01:32:37	out	t	2026-06-01 12:31:22.419265
3423	454	604	59	2026-05-07 02:02:42	out	t	2026-06-01 12:31:22.419265
3424	454	619	20	2026-05-07 02:35:02	out	t	2026-06-01 12:31:22.419265
3425	454	607	41	2026-05-07 02:50:05	out	t	2026-06-01 12:31:22.419265
3426	454	615	5	2026-05-07 03:32:07	out	t	2026-06-01 12:31:22.419265
3427	454	613	54	2026-05-07 03:35:02	out	t	2026-06-01 12:31:22.419265
3428	454	614	56	2026-05-07 03:35:16	out	t	2026-06-01 12:31:22.419265
3429	454	603	57	2026-05-07 03:38:57	out	t	2026-06-01 12:31:22.419265
3430	454	605	46	2026-05-07 03:39:45	out	t	2026-06-01 12:31:22.419265
3431	454	599	52	2026-05-07 04:11:12	out	t	2026-06-01 12:31:22.419265
3432	454	605	46	2026-05-07 04:12:05	out	t	2026-06-01 12:31:22.419265
3433	454	602	58	2026-05-07 04:12:23	out	t	2026-06-01 12:31:22.419265
3434	454	615	5	2026-05-07 07:33:00	out	t	2026-06-01 12:31:22.419265
3435	454	613	54	2026-05-07 07:33:18	out	t	2026-06-01 12:31:22.419265
3436	454	614	56	2026-05-07 07:40:13	out	t	2026-06-01 12:31:22.419265
3437	454	605	46	2026-05-07 07:41:04	out	t	2026-06-01 12:31:22.419265
3438	454	599	52	2026-05-07 07:46:45	out	t	2026-06-01 12:31:22.419265
3439	454	607	41	2026-05-07 08:30:19	out	t	2026-06-01 12:31:22.419265
3440	454	604	59	2026-05-07 08:31:03	out	t	2026-06-01 12:31:22.419265
3441	454	603	57	2026-05-07 09:32:57	out	t	2026-06-01 12:31:22.419265
3442	454	601	34	2026-05-07 09:33:21	out	t	2026-06-01 12:31:22.419265
3443	454	599	52	2026-05-07 09:54:21	out	t	2026-06-01 12:31:22.419265
3444	454	599	52	2026-05-07 12:17:34	out	t	2026-06-01 12:31:22.419265
3445	454	594	60	2026-05-07 14:26:49	out	t	2026-06-01 12:31:22.419265
3446	454	601	34	2026-05-07 14:31:04	out	t	2026-06-01 12:31:22.419265
3447	454	594	60	2026-05-07 15:31:21	out	t	2026-06-01 12:31:22.419265
3448	454	594	60	2026-05-07 16:31:20	out	t	2026-06-01 12:31:22.419265
3449	454	594	60	2026-05-07 17:31:27	out	t	2026-06-01 12:31:22.419265
3450	454	594	60	2026-05-07 18:32:12	out	t	2026-06-01 12:31:22.419265
3451	454	594	60	2026-05-07 19:31:50	out	t	2026-06-01 12:31:22.419265
3452	454	594	60	2026-05-07 20:31:26	out	t	2026-06-01 12:31:22.419265
3453	454	594	60	2026-05-07 21:31:36	out	t	2026-06-01 12:31:22.419265
3454	454	594	60	2026-05-07 22:30:59	out	t	2026-06-01 12:31:22.419265
3455	454	594	60	2026-05-07 23:30:38	out	t	2026-06-01 12:31:22.419265
3456	454	594	60	2026-05-08 00:31:26	out	t	2026-06-01 12:31:22.419265
3457	454	594	60	2026-05-08 01:31:36	out	t	2026-06-01 12:31:22.419265
3458	454	607	41	2026-05-08 02:23:06	out	t	2026-06-01 12:31:22.419265
3459	454	594	60	2026-05-08 02:30:58	out	t	2026-06-01 12:31:22.419265
3460	454	605	46	2026-05-08 02:34:15	out	t	2026-06-01 12:31:22.419265
3461	454	600	55	2026-05-08 02:59:49	out	t	2026-06-01 12:31:22.419265
3462	454	613	54	2026-05-08 03:37:02	out	t	2026-06-01 12:31:22.419265
3463	454	615	5	2026-05-08 03:37:22	out	t	2026-06-01 12:31:22.419265
3464	454	\N	11111	2026-05-08 04:47:24	out	t	2026-06-01 12:31:22.419265
3465	454	\N	3	2026-05-08 04:48:28	out	t	2026-06-01 12:31:22.419265
3466	454	600	55	2026-05-08 11:51:52	out	t	2026-06-01 12:31:22.419265
3467	454	619	20	2026-05-08 14:29:21	out	t	2026-06-01 12:31:22.419265
3468	454	603	57	2026-05-08 14:31:30	out	t	2026-06-01 12:31:22.419265
3469	454	619	20	2026-05-08 15:39:55	out	t	2026-06-01 12:31:22.419265
3470	454	619	20	2026-05-08 16:32:31	out	t	2026-06-01 12:31:22.419265
3471	454	619	20	2026-05-08 17:36:54	out	t	2026-06-01 12:31:22.419265
3472	454	619	20	2026-05-08 18:33:44	out	t	2026-06-01 12:31:22.419265
3473	454	619	20	2026-05-08 19:34:49	out	t	2026-06-01 12:31:22.419265
3474	454	619	20	2026-05-08 20:40:01	out	t	2026-06-01 12:31:22.419265
3475	454	619	20	2026-05-08 21:39:34	out	t	2026-06-01 12:31:22.419265
3476	454	619	20	2026-05-08 22:41:29	out	t	2026-06-01 12:31:22.419265
3477	454	619	20	2026-05-08 23:49:37	out	t	2026-06-01 12:31:22.419265
3478	454	619	20	2026-05-09 00:42:20	out	t	2026-06-01 12:31:22.419265
3479	454	619	20	2026-05-09 01:33:24	out	t	2026-06-01 12:31:22.419265
3480	454	617	9	2026-05-09 02:08:39	out	t	2026-06-01 12:31:22.419265
3481	454	609	50	2026-05-09 02:50:34	out	t	2026-06-01 12:31:22.419265
3482	454	619	20	2026-05-09 03:17:40	out	t	2026-06-01 12:31:22.419265
3483	454	605	46	2026-05-09 03:18:12	out	t	2026-06-01 12:31:22.419265
3484	454	615	5	2026-05-09 03:39:03	out	t	2026-06-01 12:31:22.419265
3485	454	613	54	2026-05-09 03:43:08	out	t	2026-06-01 12:31:22.419265
3486	454	615	5	2026-05-09 07:29:31	out	t	2026-06-01 12:31:22.419265
3487	454	613	54	2026-05-09 07:33:11	out	t	2026-06-01 12:31:22.419265
3488	454	617	9	2026-05-09 08:30:25	out	t	2026-06-01 12:31:22.419265
3489	454	605	46	2026-05-09 08:31:35	out	t	2026-06-01 12:31:22.419265
3490	454	609	50	2026-05-09 08:31:45	out	t	2026-06-01 12:31:22.419265
3491	454	602	58	2026-05-09 09:41:09	out	t	2026-06-01 12:31:22.419265
3492	454	594	60	2026-05-09 14:26:29	out	t	2026-06-01 12:31:22.419265
3493	454	602	58	2026-05-09 14:27:19	out	t	2026-06-01 12:31:22.419265
3494	454	594	60	2026-05-09 15:31:52	out	t	2026-06-01 12:31:22.419265
3495	454	594	60	2026-05-09 16:31:19	out	t	2026-06-01 12:31:22.419265
3496	454	594	60	2026-05-09 17:47:54	out	t	2026-06-01 12:31:22.419265
3497	454	594	60	2026-05-09 18:30:31	out	t	2026-06-01 12:31:22.419265
3498	454	594	60	2026-05-09 19:31:07	out	t	2026-06-01 12:31:22.419265
3499	454	594	60	2026-05-09 20:31:06	out	t	2026-06-01 12:31:22.419265
3500	454	594	60	2026-05-09 21:31:10	out	t	2026-06-01 12:31:22.419265
3501	454	594	60	2026-05-09 22:31:12	out	t	2026-06-01 12:31:22.419265
3502	454	594	60	2026-05-09 23:31:07	out	t	2026-06-01 12:31:22.419265
3503	454	594	60	2026-05-10 00:30:19	out	t	2026-06-01 12:31:22.419265
3504	454	594	60	2026-05-10 01:31:34	out	t	2026-06-01 12:31:22.419265
3505	454	594	60	2026-05-10 02:30:57	out	t	2026-06-01 12:31:22.419265
3506	454	609	50	2026-05-10 02:47:47	out	t	2026-06-01 12:31:22.419265
3507	454	605	46	2026-05-10 02:48:04	out	t	2026-06-01 12:31:22.419265
3508	454	599	52	2026-05-10 04:11:56	out	t	2026-06-01 12:31:22.419265
3509	454	609	50	2026-05-10 08:46:19	out	t	2026-06-01 12:31:22.419265
3510	454	605	46	2026-05-10 08:49:17	out	t	2026-06-01 12:31:22.419265
3511	454	602	58	2026-05-10 09:41:12	out	t	2026-06-01 12:31:22.419265
3512	454	599	52	2026-05-10 13:38:38	out	t	2026-06-01 12:31:22.419265
3513	454	619	20	2026-05-10 14:27:35	out	t	2026-06-01 12:31:22.419265
3514	454	602	58	2026-05-10 14:28:05	out	t	2026-06-01 12:31:22.419265
3515	454	619	20	2026-05-10 15:42:17	out	t	2026-06-01 12:31:22.419265
3516	454	619	20	2026-05-10 16:41:53	out	t	2026-06-01 12:31:22.419265
3517	454	619	20	2026-05-10 17:34:07	out	t	2026-06-01 12:31:22.419265
3518	454	619	20	2026-05-10 18:31:56	out	t	2026-06-01 12:31:22.419265
3519	454	619	20	2026-05-10 19:40:53	out	t	2026-06-01 12:31:22.419265
3520	454	619	20	2026-05-10 20:35:23	out	t	2026-06-01 12:31:22.419265
3521	454	619	20	2026-05-10 21:44:33	out	t	2026-06-01 12:31:22.419265
3522	454	619	20	2026-05-10 22:34:34	out	t	2026-06-01 12:31:22.419265
3523	454	619	20	2026-05-10 23:48:59	out	t	2026-06-01 12:31:22.419265
3524	454	619	20	2026-05-11 00:32:53	out	t	2026-06-01 12:31:22.419265
3525	454	\N	3	2026-05-11 00:57:26	out	t	2026-06-01 12:31:22.419265
3526	454	\N	3	2026-05-11 01:18:57	out	t	2026-06-01 12:31:22.419265
3527	454	619	20	2026-05-11 01:36:59	out	t	2026-06-01 12:31:22.419265
3528	454	617	9	2026-05-11 02:25:28	out	t	2026-06-01 12:31:22.419265
3529	454	619	20	2026-05-11 02:34:50	out	t	2026-06-01 12:31:22.419265
3530	454	610	47	2026-05-11 02:49:21	out	t	2026-06-01 12:31:22.419265
3531	454	605	46	2026-05-11 02:50:06	out	t	2026-06-01 12:31:22.419265
3532	454	599	52	2026-05-11 04:12:48	out	t	2026-06-01 12:31:22.419265
3533	454	602	58	2026-05-11 05:27:12	out	t	2026-06-01 12:31:22.419265
3534	454	617	9	2026-05-11 08:52:46	out	t	2026-06-01 12:31:22.419265
3535	454	599	52	2026-05-11 08:53:12	out	t	2026-06-01 12:31:22.419265
3536	454	602	58	2026-05-11 09:17:36	out	t	2026-06-01 12:31:22.419265
3537	454	599	52	2026-05-11 09:20:15	out	t	2026-06-01 12:31:22.419265
3538	454	617	9	2026-05-11 09:27:35	out	t	2026-06-01 12:31:22.419265
3539	454	602	58	2026-05-11 10:21:38	out	t	2026-06-01 12:31:22.419265
3540	454	617	9	2026-05-11 11:30:17	out	t	2026-06-01 12:31:22.419265
3541	454	605	46	2026-05-11 11:33:02	out	t	2026-06-01 12:31:22.419265
3542	454	610	47	2026-05-11 11:33:29	out	t	2026-06-01 12:31:22.419265
3543	454	599	52	2026-05-11 12:52:33	out	t	2026-06-01 12:31:22.419265
3544	454	594	60	2026-05-11 14:27:17	out	t	2026-06-01 12:31:22.419265
3545	454	594	60	2026-05-11 14:27:43	out	t	2026-06-01 12:31:22.419265
3546	454	602	58	2026-05-11 14:28:21	out	t	2026-06-01 12:31:22.419265
3547	454	594	60	2026-05-11 15:35:25	out	t	2026-06-01 12:31:22.419265
3548	454	594	60	2026-05-11 16:31:22	out	t	2026-06-01 12:31:22.419265
3549	454	594	60	2026-05-11 17:31:20	out	t	2026-06-01 12:31:22.419265
3550	454	594	60	2026-05-11 18:31:17	out	t	2026-06-01 12:31:22.419265
3551	454	594	60	2026-05-11 19:31:24	out	t	2026-06-01 12:31:22.419265
3552	454	594	60	2026-05-11 20:31:26	out	t	2026-06-01 12:31:22.419265
3553	454	594	60	2026-05-11 21:31:22	out	t	2026-06-01 12:31:22.419265
3554	454	594	60	2026-05-11 22:31:20	out	t	2026-06-01 12:31:22.419265
3555	454	594	60	2026-05-11 23:04:08	out	t	2026-06-01 12:31:22.419265
3556	454	594	60	2026-05-11 23:31:26	out	t	2026-06-01 12:31:22.419265
3557	454	594	60	2026-05-12 00:31:09	out	t	2026-06-01 12:31:22.419265
3558	454	594	60	2026-05-12 01:31:04	out	t	2026-06-01 12:31:22.419265
3559	454	608	42	2026-05-12 02:27:33	out	t	2026-06-01 12:31:22.419265
3560	454	594	60	2026-05-12 02:31:20	out	t	2026-06-01 12:31:22.419265
3561	454	604	59	2026-05-12 02:31:26	out	t	2026-06-01 12:31:22.419265
3562	454	610	47	2026-05-12 03:29:59	out	t	2026-06-01 12:31:22.419265
3563	454	605	46	2026-05-12 03:31:34	out	t	2026-06-01 12:31:22.419265
3564	454	603	57	2026-05-12 03:43:47	out	t	2026-06-01 12:31:22.419265
3565	454	614	56	2026-05-12 03:46:42	out	t	2026-06-01 12:31:22.419265
3566	454	602	58	2026-05-12 03:46:57	out	t	2026-06-01 12:31:22.419265
3567	454	609	50	2026-05-12 03:46:59	out	t	2026-06-01 12:31:22.419265
3568	454	599	52	2026-05-12 04:02:20	out	t	2026-06-01 12:31:22.419265
3569	454	603	57	2026-05-12 06:28:31	out	t	2026-06-01 12:31:22.419265
3570	454	614	56	2026-05-12 06:51:27	out	t	2026-06-01 12:31:22.419265
3571	454	608	42	2026-05-12 08:40:44	out	t	2026-06-01 12:31:22.419265
3572	454	604	59	2026-05-12 08:41:09	out	t	2026-06-01 12:31:22.419265
3573	454	601	34	2026-05-12 09:33:01	out	t	2026-06-01 12:31:22.419265
3574	454	609	50	2026-05-12 09:33:12	out	t	2026-06-01 12:31:22.419265
3575	454	610	47	2026-05-12 09:33:22	out	t	2026-06-01 12:31:22.419265
3576	454	599	52	2026-05-12 10:12:54	out	t	2026-06-01 12:31:22.419265
3577	454	605	46	2026-05-12 10:31:40	out	t	2026-06-01 12:31:22.419265
3578	454	619	20	2026-05-12 14:29:48	out	t	2026-06-01 12:31:22.419265
3579	454	601	34	2026-05-12 14:29:56	out	t	2026-06-01 12:31:22.419265
3580	454	619	20	2026-05-12 15:44:14	out	t	2026-06-01 12:31:22.419265
3581	454	619	20	2026-05-12 16:35:36	out	t	2026-06-01 12:31:22.419265
3582	454	619	20	2026-05-12 17:53:22	out	t	2026-06-01 12:31:22.419265
3583	454	619	20	2026-05-12 18:38:29	out	t	2026-06-01 12:31:22.419265
3584	454	619	20	2026-05-12 19:40:36	out	t	2026-06-01 12:31:22.419265
3585	454	619	20	2026-05-12 20:39:28	out	t	2026-06-01 12:31:22.419265
3586	454	619	20	2026-05-12 21:37:51	out	t	2026-06-01 12:31:22.419265
3587	454	619	20	2026-05-12 22:49:25	out	t	2026-06-01 12:31:22.419265
3588	454	619	20	2026-05-12 23:43:50	out	t	2026-06-01 12:31:22.419265
3589	454	619	20	2026-05-13 00:44:12	out	t	2026-06-01 12:31:22.419265
3590	454	619	20	2026-05-13 01:49:34	out	t	2026-06-01 12:31:22.419265
3591	454	604	59	2026-05-13 02:07:51	out	t	2026-06-01 12:31:22.419265
3592	454	617	9	2026-05-13 02:23:57	out	t	2026-06-01 12:31:22.419265
3593	454	607	41	2026-05-13 02:37:57	out	t	2026-06-01 12:31:22.419265
3594	454	619	20	2026-05-13 02:38:13	out	t	2026-06-01 12:31:22.419265
3595	454	599	52	2026-05-13 04:07:13	out	t	2026-06-01 12:31:22.419265
3596	454	605	46	2026-05-13 07:27:31	out	t	2026-06-01 12:31:22.419265
3597	454	610	47	2026-05-13 07:31:43	out	t	2026-06-01 12:31:22.419265
3598	454	609	50	2026-05-13 07:31:51	out	t	2026-06-01 12:31:22.419265
3599	454	604	59	2026-05-13 08:32:35	out	t	2026-06-01 12:31:22.419265
3600	454	617	9	2026-05-13 08:33:25	out	t	2026-06-01 12:31:22.419265
3601	454	607	41	2026-05-13 08:54:19	out	t	2026-06-01 12:31:22.419265
3602	454	601	34	2026-05-13 09:30:07	out	t	2026-06-01 12:31:22.419265
3603	454	609	50	2026-05-13 09:31:00	out	t	2026-06-01 12:31:22.419265
3604	454	610	47	2026-05-13 09:31:10	out	t	2026-06-01 12:31:22.419265
3605	454	605	46	2026-05-13 09:49:48	out	t	2026-06-01 12:31:22.419265
3606	454	599	52	2026-05-13 10:20:55	out	t	2026-06-01 12:31:22.419265
3607	454	594	60	2026-05-13 14:26:18	out	t	2026-06-01 12:31:22.504422
3608	454	601	34	2026-05-13 14:33:22	out	t	2026-06-01 12:31:22.504422
3609	454	594	60	2026-05-13 15:31:03	out	t	2026-06-01 12:31:22.504422
3610	454	594	60	2026-05-13 16:31:08	out	t	2026-06-01 12:31:22.504422
3611	454	594	60	2026-05-13 17:31:17	out	t	2026-06-01 12:31:22.504422
3612	454	594	60	2026-05-13 18:31:13	out	t	2026-06-01 12:31:22.504422
3613	454	594	60	2026-05-13 19:31:14	out	t	2026-06-01 12:31:22.504422
3614	454	594	60	2026-05-13 20:30:23	out	t	2026-06-01 12:31:22.504422
3615	454	594	60	2026-05-13 21:31:10	out	t	2026-06-01 12:31:22.504422
3616	454	594	60	2026-05-13 22:31:15	out	t	2026-06-01 12:31:22.504422
3617	454	594	60	2026-05-13 23:31:15	out	t	2026-06-01 12:31:22.504422
3618	454	594	60	2026-05-14 00:31:34	out	t	2026-06-01 12:31:22.504422
3619	454	594	60	2026-05-14 01:31:32	out	t	2026-06-01 12:31:22.504422
3620	454	604	59	2026-05-14 02:00:53	out	t	2026-06-01 12:31:22.504422
3621	454	\N	3	2026-05-14 02:26:52	out	t	2026-06-01 12:31:22.504422
3622	454	594	60	2026-05-14 02:30:51	out	t	2026-06-01 12:31:22.504422
3624	454	\N	3	2026-05-14 02:49:37	out	t	2026-06-01 12:31:22.504422
3625	454	599	52	2026-05-14 04:17:03	out	t	2026-06-01 12:31:22.504422
3626	454	609	50	2026-05-14 07:31:17	out	t	2026-06-01 12:31:22.504422
3627	454	610	47	2026-05-14 07:33:33	out	t	2026-06-01 12:31:22.504422
3628	454	604	59	2026-05-14 08:33:33	out	t	2026-06-01 12:31:22.504422
3629	454	601	34	2026-05-14 09:33:27	out	t	2026-06-01 12:31:22.504422
3630	454	609	50	2026-05-14 09:33:52	out	t	2026-06-01 12:31:22.504422
3631	454	610	47	2026-05-14 09:34:01	out	t	2026-06-01 12:31:22.504422
3632	454	599	52	2026-05-14 12:29:24	out	t	2026-06-01 12:31:22.504422
3633	454	619	20	2026-05-14 14:29:21	out	t	2026-06-01 12:31:22.504422
3634	454	601	34	2026-05-14 14:31:41	out	t	2026-06-01 12:31:22.504422
3635	454	619	20	2026-05-14 15:32:30	out	t	2026-06-01 12:31:22.504422
3636	454	619	20	2026-05-14 16:30:14	out	t	2026-06-01 12:31:22.504422
3637	454	619	20	2026-05-14 17:33:28	out	t	2026-06-01 12:31:22.504422
3638	454	619	20	2026-05-14 18:32:01	out	t	2026-06-01 12:31:22.504422
3639	454	619	20	2026-05-14 19:31:24	out	t	2026-06-01 12:31:22.504422
3640	454	619	20	2026-05-14 20:32:30	out	t	2026-06-01 12:31:22.504422
3641	454	619	20	2026-05-14 21:34:32	out	t	2026-06-01 12:31:22.504422
3642	454	619	20	2026-05-14 22:35:38	out	t	2026-06-01 12:31:22.504422
3643	454	619	20	2026-05-14 23:30:54	out	t	2026-06-01 12:31:22.504422
3644	454	619	20	2026-05-15 00:30:05	out	t	2026-06-01 12:31:22.504422
3645	454	619	20	2026-05-15 01:34:45	out	t	2026-06-01 12:31:22.504422
3646	454	604	59	2026-05-15 02:36:41	out	t	2026-06-01 12:31:22.504422
3647	454	607	41	2026-05-15 02:37:08	out	t	2026-06-01 12:31:22.504422
3648	454	619	20	2026-05-15 02:41:50	out	t	2026-06-01 12:31:22.504422
3649	454	615	5	2026-05-15 03:34:55	out	t	2026-06-01 12:31:22.504422
3650	454	614	56	2026-05-15 03:43:49	out	t	2026-06-01 12:31:22.504422
3651	454	615	5	2026-05-15 04:34:28	out	t	2026-06-01 12:31:22.504422
3652	454	615	5	2026-05-15 04:44:18	out	t	2026-06-01 12:31:22.504422
3653	454	614	56	2026-05-15 06:43:35	out	t	2026-06-01 12:31:22.504422
3654	454	615	5	2026-05-15 06:43:54	out	t	2026-06-01 12:31:22.504422
3655	454	609	50	2026-05-15 07:29:14	out	t	2026-06-01 12:31:22.504422
3656	454	610	47	2026-05-15 07:29:27	out	t	2026-06-01 12:31:22.504422
3657	454	609	50	2026-05-15 10:02:19	out	t	2026-06-01 12:31:22.504422
3658	454	610	47	2026-05-15 10:02:22	out	t	2026-06-01 12:31:22.504422
3659	454	601	34	2026-05-15 10:02:28	out	t	2026-06-01 12:31:22.504422
3660	454	594	60	2026-05-15 14:26:55	out	t	2026-06-01 12:31:22.504422
3661	454	601	34	2026-05-15 14:30:52	out	t	2026-06-01 12:31:22.504422
3662	454	594	60	2026-05-15 15:31:08	out	t	2026-06-01 12:31:22.504422
3663	454	594	60	2026-05-15 16:31:07	out	t	2026-06-01 12:31:22.504422
3664	454	594	60	2026-05-15 17:31:18	out	t	2026-06-01 12:31:22.504422
3665	454	594	60	2026-05-15 18:31:22	out	t	2026-06-01 12:31:22.504422
3666	454	594	60	2026-05-15 19:31:32	out	t	2026-06-01 12:31:22.504422
3667	454	594	60	2026-05-15 20:30:44	out	t	2026-06-01 12:31:22.504422
3668	454	594	60	2026-05-15 21:31:15	out	t	2026-06-01 12:31:22.504422
3669	454	594	60	2026-05-15 22:30:41	out	t	2026-06-01 12:31:22.504422
3670	454	594	60	2026-05-15 23:31:19	out	t	2026-06-01 12:31:22.504422
3671	454	594	60	2026-05-16 00:31:30	out	t	2026-06-01 12:31:22.504422
3672	454	594	60	2026-05-16 01:31:04	out	t	2026-06-01 12:31:22.504422
3673	454	594	60	2026-05-16 02:31:39	out	t	2026-06-01 12:31:22.504422
3674	454	609	50	2026-05-16 02:40:35	out	t	2026-06-01 12:31:22.504422
3675	454	603	57	2026-05-16 02:40:45	out	t	2026-06-01 12:31:22.504422
3676	454	609	50	2026-05-16 08:33:34	out	t	2026-06-01 12:31:22.504422
3677	454	603	57	2026-05-16 08:33:36	out	t	2026-06-01 12:31:22.504422
3678	454	602	58	2026-05-16 09:41:17	out	t	2026-06-01 12:31:22.504422
3679	454	619	20	2026-05-16 14:27:45	out	t	2026-06-01 12:31:22.504422
3680	454	602	58	2026-05-16 14:27:57	out	t	2026-06-01 12:31:22.504422
3681	454	619	20	2026-05-16 15:37:18	out	t	2026-06-01 12:31:22.504422
3682	454	619	20	2026-05-16 16:35:24	out	t	2026-06-01 12:31:22.504422
3683	454	619	20	2026-05-16 17:38:28	out	t	2026-06-01 12:31:22.504422
3684	454	619	20	2026-05-16 18:42:06	out	t	2026-06-01 12:31:22.504422
3685	454	619	20	2026-05-16 19:38:36	out	t	2026-06-01 12:31:22.504422
3686	454	619	20	2026-05-16 20:31:25	out	t	2026-06-01 12:31:22.504422
3687	454	619	20	2026-05-16 21:33:52	out	t	2026-06-01 12:31:22.504422
3688	454	619	20	2026-05-16 22:34:03	out	t	2026-06-01 12:31:22.504422
3689	454	619	20	2026-05-16 23:40:38	out	t	2026-06-01 12:31:22.504422
3690	454	619	20	2026-05-17 00:42:49	out	t	2026-06-01 12:31:22.504422
3691	454	\N	3	2026-05-17 01:06:54	out	t	2026-06-01 12:31:22.504422
3692	454	\N	3	2026-05-17 01:27:50	out	t	2026-06-01 12:31:22.504422
3693	454	619	20	2026-05-17 01:45:08	out	t	2026-06-01 12:31:22.504422
3694	454	619	20	2026-05-17 02:40:03	out	t	2026-06-01 12:31:22.504422
3695	454	603	57	2026-05-17 02:44:07	out	t	2026-06-01 12:31:22.504422
3696	454	609	50	2026-05-17 02:44:18	out	t	2026-06-01 12:31:22.504422
3697	454	599	52	2026-05-17 03:54:19	out	t	2026-06-01 12:31:22.504422
3698	454	603	57	2026-05-17 08:32:57	out	t	2026-06-01 12:31:22.504422
3699	454	609	50	2026-05-17 08:34:02	out	t	2026-06-01 12:31:22.504422
3700	454	602	58	2026-05-17 09:28:39	out	t	2026-06-01 12:31:22.504422
3701	454	599	52	2026-05-17 10:45:20	out	t	2026-06-01 12:31:22.504422
3702	454	594	60	2026-05-17 14:27:20	out	t	2026-06-01 12:31:22.504422
3703	454	602	58	2026-05-17 14:27:27	out	t	2026-06-01 12:31:22.504422
3704	454	594	60	2026-05-17 15:30:53	out	t	2026-06-01 12:31:22.504422
3705	454	594	60	2026-05-17 16:31:25	out	t	2026-06-01 12:31:22.504422
3706	454	594	60	2026-05-17 17:31:14	out	t	2026-06-01 12:31:22.504422
3707	454	594	60	2026-05-17 18:31:26	out	t	2026-06-01 12:31:22.504422
3708	454	594	60	2026-05-17 19:31:18	out	t	2026-06-01 12:31:22.504422
3709	454	594	60	2026-05-17 20:31:23	out	t	2026-06-01 12:31:22.504422
3710	454	594	60	2026-05-17 21:31:25	out	t	2026-06-01 12:31:22.504422
3711	454	594	60	2026-05-17 22:30:52	out	t	2026-06-01 12:31:22.504422
3712	454	594	60	2026-05-17 23:31:12	out	t	2026-06-01 12:31:22.504422
3713	454	594	60	2026-05-18 00:31:30	out	t	2026-06-01 12:31:22.504422
3714	454	594	60	2026-05-18 01:31:38	out	t	2026-06-01 12:31:22.504422
3715	454	604	59	2026-05-18 02:05:50	out	t	2026-06-01 12:31:22.504422
3716	454	601	34	2026-05-18 02:19:21	out	t	2026-06-01 12:31:22.504422
3717	454	617	9	2026-05-18 02:30:34	out	t	2026-06-01 12:31:22.504422
3718	454	608	42	2026-05-18 02:30:49	out	t	2026-06-01 12:31:22.504422
3719	454	594	60	2026-05-18 02:30:54	out	t	2026-06-01 12:31:22.504422
3720	454	609	50	2026-05-18 02:40:54	out	t	2026-06-01 12:31:22.504422
3721	454	605	46	2026-05-18 02:40:59	out	t	2026-06-01 12:31:22.504422
3722	454	607	41	2026-05-18 02:45:02	out	t	2026-06-01 12:31:22.504422
3723	454	605	46	2026-05-18 02:45:06	out	t	2026-06-01 12:31:22.504422
3724	454	605	46	2026-05-18 02:45:16	out	t	2026-06-01 12:31:22.504422
3725	454	610	47	2026-05-18 02:53:51	out	t	2026-06-01 12:31:22.504422
3726	454	600	55	2026-05-18 03:17:29	out	t	2026-06-01 12:31:22.504422
3727	454	603	57	2026-05-18 05:33:26	out	t	2026-06-01 12:31:22.504422
3728	454	602	58	2026-05-18 05:39:25	out	t	2026-06-01 12:31:22.504422
3729	454	604	59	2026-05-18 07:36:31	out	t	2026-06-01 12:31:22.504422
3730	454	602	58	2026-05-18 07:40:16	out	t	2026-06-01 12:31:22.504422
3731	454	603	57	2026-05-18 07:41:49	out	t	2026-06-01 12:31:22.504422
3732	454	600	55	2026-05-18 07:42:43	out	t	2026-06-01 12:31:22.504422
3733	454	607	41	2026-05-18 07:48:05	out	t	2026-06-01 12:31:22.504422
3734	454	609	50	2026-05-18 07:49:52	out	t	2026-06-01 12:31:22.504422
3735	454	610	47	2026-05-18 07:49:56	out	t	2026-06-01 12:31:22.504422
3736	454	601	34	2026-05-18 07:57:15	out	t	2026-06-01 12:31:22.504422
3737	454	608	42	2026-05-18 07:58:59	out	t	2026-06-01 12:31:22.504422
3738	454	602	58	2026-05-18 08:02:18	out	t	2026-06-01 12:31:22.504422
3739	454	605	46	2026-05-18 08:08:35	out	t	2026-06-01 12:31:22.504422
3740	454	604	59	2026-05-18 08:21:12	out	t	2026-06-01 12:31:22.504422
3741	454	617	9	2026-05-18 08:30:03	out	t	2026-06-01 12:31:22.504422
3742	454	605	46	2026-05-18 08:35:22	out	t	2026-06-01 12:31:22.504422
3743	454	609	50	2026-05-18 08:35:27	out	t	2026-06-01 12:31:22.504422
3744	454	603	57	2026-05-18 08:35:32	out	t	2026-06-01 12:31:22.504422
3745	454	610	47	2026-05-18 08:35:36	out	t	2026-06-01 12:31:22.504422
3746	454	607	41	2026-05-18 08:35:44	out	t	2026-06-01 12:31:22.504422
3747	454	601	34	2026-05-18 08:42:24	out	t	2026-06-01 12:31:22.504422
3748	454	608	42	2026-05-18 08:56:59	out	t	2026-06-01 12:31:22.504422
3749	454	617	9	2026-05-18 09:37:49	out	t	2026-06-01 12:31:22.504422
3750	454	604	59	2026-05-18 10:48:06	out	t	2026-06-01 12:31:22.504422
3751	454	617	9	2026-05-18 11:29:54	out	t	2026-06-01 12:31:22.504422
3752	454	601	34	2026-05-18 11:29:58	out	t	2026-06-01 12:31:22.504422
3753	454	608	42	2026-05-18 11:30:49	out	t	2026-06-01 12:31:22.504422
3754	454	609	50	2026-05-18 11:31:08	out	t	2026-06-01 12:31:22.504422
3755	454	605	46	2026-05-18 11:31:12	out	t	2026-06-01 12:31:22.504422
3756	454	607	41	2026-05-18 11:31:56	out	t	2026-06-01 12:31:22.504422
3757	454	600	55	2026-05-18 11:34:35	out	t	2026-06-01 12:31:22.504422
3758	454	610	47	2026-05-18 11:36:38	out	t	2026-06-01 12:31:22.504422
3759	454	619	20	2026-05-18 14:26:04	out	t	2026-06-01 12:31:22.504422
3760	454	602	58	2026-05-18 14:26:42	out	t	2026-06-01 12:31:22.504422
3761	454	603	57	2026-05-18 14:27:48	out	t	2026-06-01 12:31:22.504422
3762	454	619	20	2026-05-18 15:31:51	out	t	2026-06-01 12:31:22.504422
3763	454	619	20	2026-05-18 16:36:44	out	t	2026-06-01 12:31:22.504422
3764	454	619	20	2026-05-18 17:34:25	out	t	2026-06-01 12:31:22.504422
3765	454	619	20	2026-05-18 18:30:47	out	t	2026-06-01 12:31:22.504422
3766	454	619	20	2026-05-18 19:32:36	out	t	2026-06-01 12:31:22.504422
3767	454	619	20	2026-05-18 20:41:33	out	t	2026-06-01 12:31:22.504422
3768	454	619	20	2026-05-18 21:42:09	out	t	2026-06-01 12:31:22.504422
3769	454	619	20	2026-05-18 22:38:15	out	t	2026-06-01 12:31:22.504422
3770	454	619	20	2026-05-18 23:43:25	out	t	2026-06-01 12:31:22.504422
3771	454	619	20	2026-05-19 00:42:54	out	t	2026-06-01 12:31:22.504422
3772	454	619	20	2026-05-19 01:30:47	out	t	2026-06-01 12:31:22.504422
3773	454	608	42	2026-05-19 02:23:23	out	t	2026-06-01 12:31:22.504422
3774	454	603	57	2026-05-19 02:38:30	out	t	2026-06-01 12:31:22.504422
3775	454	619	20	2026-05-19 02:39:32	out	t	2026-06-01 12:31:22.504422
3776	454	600	55	2026-05-19 02:50:54	out	t	2026-06-01 12:31:22.504422
3777	454	599	52	2026-05-19 03:25:34	out	t	2026-06-01 12:31:22.504422
3778	454	614	56	2026-05-19 03:28:09	out	t	2026-06-01 12:31:22.504422
3779	454	613	54	2026-05-19 04:23:38	out	t	2026-06-01 12:31:22.504422
3780	454	615	5	2026-05-19 04:36:04	out	t	2026-06-01 12:31:22.504422
3781	454	614	56	2026-05-19 06:03:11	out	t	2026-06-01 12:31:22.504422
3782	454	614	56	2026-05-19 06:12:16	out	t	2026-06-01 12:31:22.504422
3783	454	599	52	2026-05-19 07:16:39	out	t	2026-06-01 12:31:22.504422
3784	454	614	56	2026-05-19 07:27:11	out	t	2026-06-01 12:31:22.504422
3785	454	600	55	2026-05-19 07:48:33	out	t	2026-06-01 12:31:22.504422
3786	454	615	5	2026-05-19 08:19:55	out	t	2026-06-01 12:31:22.504422
3787	454	613	54	2026-05-19 08:20:07	out	t	2026-06-01 12:31:22.504422
3788	454	608	42	2026-05-19 08:30:26	out	t	2026-06-01 12:31:22.504422
3789	454	603	57	2026-05-19 08:31:21	out	t	2026-06-01 12:31:22.504422
3790	454	608	42	2026-05-19 09:28:39	out	t	2026-06-01 12:31:22.504422
3791	454	603	57	2026-05-19 09:33:01	out	t	2026-06-01 12:31:22.504422
3792	454	608	42	2026-05-19 11:33:40	out	t	2026-06-01 12:31:22.504422
3793	454	601	34	2026-05-19 11:34:08	out	t	2026-06-01 12:31:22.504422
3794	454	603	57	2026-05-19 11:34:26	out	t	2026-06-01 12:31:22.504422
3795	454	600	55	2026-05-19 11:35:08	out	t	2026-06-01 12:31:22.504422
3796	454	594	60	2026-05-19 14:25:59	out	t	2026-06-01 12:31:22.504422
3797	454	601	34	2026-05-19 14:30:34	out	t	2026-06-01 12:31:22.504422
3798	454	594	60	2026-05-19 15:31:40	out	t	2026-06-01 12:31:22.504422
3799	454	594	60	2026-05-19 16:32:15	out	t	2026-06-01 12:31:22.504422
3800	454	594	60	2026-05-19 17:31:32	out	t	2026-06-01 12:31:22.504422
3801	454	594	60	2026-05-19 18:31:36	out	t	2026-06-01 12:31:22.504422
3802	454	594	60	2026-05-19 19:31:33	out	t	2026-06-01 12:31:22.504422
3803	454	594	60	2026-05-19 20:30:40	out	t	2026-06-01 12:31:22.504422
3804	454	594	60	2026-05-19 21:31:47	out	t	2026-06-01 12:31:22.504422
3805	454	594	60	2026-05-19 22:31:41	out	t	2026-06-01 12:31:22.504422
3806	454	594	60	2026-05-19 23:31:37	out	t	2026-06-01 12:31:22.504422
3807	454	594	60	2026-05-20 00:31:41	out	t	2026-06-01 12:31:22.574302
3808	454	\N	3	2026-05-20 01:30:24	out	t	2026-06-01 12:31:22.574302
3809	454	594	60	2026-05-20 01:31:39	out	t	2026-06-01 12:31:22.574302
3810	454	\N	3	2026-05-20 01:46:22	out	t	2026-06-01 12:31:22.574302
3811	454	608	42	2026-05-20 02:28:52	out	t	2026-06-01 12:31:22.574302
3812	454	617	9	2026-05-20 02:29:13	out	t	2026-06-01 12:31:22.574302
3813	454	594	60	2026-05-20 02:31:30	out	t	2026-06-01 12:31:22.574302
3814	454	607	41	2026-05-20 02:38:29	out	t	2026-06-01 12:31:22.574302
3815	454	609	50	2026-05-20 02:49:58	out	t	2026-06-01 12:31:22.574302
3816	454	610	47	2026-05-20 02:51:01	out	t	2026-06-01 12:31:22.574302
3817	454	614	56	2026-05-20 03:18:00	out	t	2026-06-01 12:31:22.574302
3818	454	615	5	2026-05-20 03:36:09	out	t	2026-06-01 12:31:22.574302
3819	454	613	54	2026-05-20 03:38:17	out	t	2026-06-01 12:31:22.574302
3820	454	599	52	2026-05-20 03:45:57	out	t	2026-06-01 12:31:22.574302
3821	454	614	56	2026-05-20 05:25:18	out	t	2026-06-01 12:31:22.574302
3822	454	614	56	2026-05-20 05:31:30	out	t	2026-06-01 12:31:22.574302
3823	454	603	57	2026-05-20 05:34:46	out	t	2026-06-01 12:31:22.574302
3824	454	600	55	2026-05-20 06:05:31	out	t	2026-06-01 12:31:22.574302
3825	454	609	50	2026-05-20 07:37:36	out	t	2026-06-01 12:31:22.574302
3826	454	615	5	2026-05-20 07:37:43	out	t	2026-06-01 12:31:22.574302
3827	454	613	54	2026-05-20 07:38:19	out	t	2026-06-01 12:31:22.574302
3828	454	614	56	2026-05-20 07:38:44	out	t	2026-06-01 12:31:22.574302
3829	454	607	41	2026-05-20 07:39:58	out	t	2026-06-01 12:31:22.574302
3830	454	610	47	2026-05-20 07:43:59	out	t	2026-06-01 12:31:22.574302
3831	454	600	55	2026-05-20 07:49:27	out	t	2026-06-01 12:31:22.574302
3832	454	603	57	2026-05-20 07:56:42	out	t	2026-06-01 12:31:22.574302
3833	454	608	42	2026-05-20 08:03:52	out	t	2026-06-01 12:31:22.574302
3834	454	610	47	2026-05-20 08:19:02	out	t	2026-06-01 12:31:22.574302
3835	454	609	50	2026-05-20 08:23:10	out	t	2026-06-01 12:31:22.574302
3836	454	603	57	2026-05-20 08:26:34	out	t	2026-06-01 12:31:22.574302
3837	454	602	58	2026-05-20 08:28:22	out	t	2026-06-01 12:31:22.574302
3838	454	617	9	2026-05-20 08:30:03	out	t	2026-06-01 12:31:22.574302
3839	454	607	41	2026-05-20 08:32:44	out	t	2026-06-01 12:31:22.574302
3840	454	605	46	2026-05-20 08:37:52	out	t	2026-06-01 12:31:22.574302
3841	454	608	42	2026-05-20 08:54:22	out	t	2026-06-01 12:31:22.574302
3842	454	617	9	2026-05-20 09:30:03	out	t	2026-06-01 12:31:22.574302
3843	454	602	58	2026-05-20 10:37:44	out	t	2026-06-01 12:31:22.574302
3844	454	605	46	2026-05-20 10:43:19	out	t	2026-06-01 12:31:22.574302
3845	454	603	57	2026-05-20 10:58:30	out	t	2026-06-01 12:31:22.574302
3846	454	617	9	2026-05-20 11:30:05	out	t	2026-06-01 12:31:22.574302
3847	454	609	50	2026-05-20 11:30:09	out	t	2026-06-01 12:31:22.574302
3848	454	607	41	2026-05-20 11:30:28	out	t	2026-06-01 12:31:22.574302
3849	454	610	47	2026-05-20 11:30:34	out	t	2026-06-01 12:31:22.574302
3850	454	608	42	2026-05-20 11:31:03	out	t	2026-06-01 12:31:22.574302
3851	454	602	58	2026-05-20 11:35:25	out	t	2026-06-01 12:31:22.574302
3852	454	599	52	2026-05-20 11:37:42	out	t	2026-06-01 12:31:22.574302
3853	454	600	55	2026-05-20 11:40:21	out	t	2026-06-01 12:31:22.574302
3854	454	619	20	2026-05-20 14:30:46	out	t	2026-06-01 12:31:22.574302
3855	454	602	58	2026-05-20 14:30:52	out	t	2026-06-01 12:31:22.574302
3856	454	619	20	2026-05-20 15:53:20	out	t	2026-06-01 12:31:22.574302
3857	454	619	20	2026-05-20 16:45:52	out	t	2026-06-01 12:31:22.574302
3858	454	619	20	2026-05-20 17:39:31	out	t	2026-06-01 12:31:22.574302
3859	454	619	20	2026-05-20 18:43:38	out	t	2026-06-01 12:31:22.574302
3860	454	619	20	2026-05-20 19:32:15	out	t	2026-06-01 12:31:22.574302
3861	454	619	20	2026-05-20 20:34:09	out	t	2026-06-01 12:31:22.574302
3862	454	619	20	2026-05-20 21:33:53	out	t	2026-06-01 12:31:22.574302
3863	454	619	20	2026-05-20 22:42:59	out	t	2026-06-01 12:31:22.574302
3864	454	619	20	2026-05-20 23:28:52	out	t	2026-06-01 12:31:22.574302
3865	454	619	20	2026-05-21 00:14:38	out	t	2026-06-01 12:31:22.574302
3866	454	619	20	2026-05-21 00:41:47	out	t	2026-06-01 12:31:22.574302
3867	454	619	20	2026-05-21 01:38:16	out	t	2026-06-01 12:31:22.574302
3868	454	617	9	2026-05-21 02:27:05	out	t	2026-06-01 12:31:22.574302
3870	454	619	20	2026-05-21 02:52:39	out	t	2026-06-01 12:31:22.574302
3871	454	614	56	2026-05-21 03:21:02	out	t	2026-06-01 12:31:22.574302
3872	454	615	5	2026-05-21 03:30:56	out	t	2026-06-01 12:31:22.574302
3873	454	613	54	2026-05-21 03:36:00	out	t	2026-06-01 12:31:22.574302
3875	454	600	55	2026-05-21 04:09:58	out	t	2026-06-01 12:31:22.574302
3876	454	615	5	2026-05-21 07:38:37	out	t	2026-06-01 12:31:22.574302
3877	454	613	54	2026-05-21 07:39:51	out	t	2026-06-01 12:31:22.574302
3878	454	617	9	2026-05-21 08:19:47	out	t	2026-06-01 12:31:22.574302
3879	454	600	55	2026-05-21 08:42:25	out	t	2026-06-01 12:31:22.574302
3880	454	617	9	2026-05-21 09:35:54	out	t	2026-06-01 12:31:22.574302
3881	454	602	58	2026-05-21 11:30:06	out	t	2026-06-01 12:31:22.574302
3882	454	609	50	2026-05-21 11:30:12	out	t	2026-06-01 12:31:22.574302
3883	454	617	9	2026-05-21 11:30:16	out	t	2026-06-01 12:31:22.574302
3884	454	600	55	2026-05-21 11:36:56	out	t	2026-06-01 12:31:22.574302
3886	454	594	60	2026-05-21 14:26:13	out	t	2026-06-01 12:31:22.574302
3887	454	602	58	2026-05-21 14:27:02	out	t	2026-06-01 12:31:22.574302
3888	454	609	50	2026-05-21 14:27:06	out	t	2026-06-01 12:31:22.574302
3889	454	594	60	2026-05-21 15:31:20	out	t	2026-06-01 12:31:22.574302
3890	454	594	60	2026-05-21 16:33:38	out	t	2026-06-01 12:31:22.574302
3891	454	594	60	2026-05-21 17:31:35	out	t	2026-06-01 12:31:22.574302
3892	454	594	60	2026-05-21 18:31:30	out	t	2026-06-01 12:31:22.574302
3893	454	594	60	2026-05-21 19:31:29	out	t	2026-06-01 12:31:22.574302
3894	454	594	60	2026-05-21 20:31:24	out	t	2026-06-01 12:31:22.574302
3895	454	594	60	2026-05-21 21:31:34	out	t	2026-06-01 12:31:22.574302
3896	454	594	60	2026-05-21 22:32:58	out	t	2026-06-01 12:31:22.574302
3897	454	594	60	2026-05-21 23:31:28	out	t	2026-06-01 12:31:22.574302
3898	454	594	60	2026-05-22 00:32:18	out	t	2026-06-01 12:31:22.574302
3899	454	594	60	2026-05-22 01:30:48	out	t	2026-06-01 12:31:22.574302
3900	454	\N	3	2026-05-22 01:31:12	out	t	2026-06-01 12:31:22.574302
3901	454	604	59	2026-05-22 02:19:20	out	t	2026-06-01 12:31:22.574302
3902	454	\N	3	2026-05-22 02:27:14	out	t	2026-06-01 12:31:22.574302
3903	454	594	60	2026-05-22 02:31:00	out	t	2026-06-01 12:31:22.574302
3904	454	603	57	2026-05-22 02:47:04	out	t	2026-06-01 12:31:22.574302
3905	454	610	47	2026-05-22 02:53:31	out	t	2026-06-01 12:31:22.574302
3906	454	615	5	2026-05-22 03:41:30	out	t	2026-06-01 12:31:22.574302
3907	454	614	56	2026-05-22 03:43:57	out	t	2026-06-01 12:31:22.574302
3908	454	613	54	2026-05-22 03:58:53	out	t	2026-06-01 12:31:22.574302
3909	454	614	56	2026-05-22 06:54:20	out	t	2026-06-01 12:31:22.574302
3910	454	615	5	2026-05-22 06:54:47	out	t	2026-06-01 12:31:22.574302
3911	454	613	54	2026-05-22 06:55:29	out	t	2026-06-01 12:31:22.574302
3912	454	603	57	2026-05-22 07:56:04	out	t	2026-06-01 12:31:22.574302
3913	454	610	47	2026-05-22 08:33:30	out	t	2026-06-01 12:31:22.574302
3914	454	603	57	2026-05-22 09:00:36	out	t	2026-06-01 12:31:22.574302
3915	454	610	47	2026-05-22 09:20:26	out	t	2026-06-01 12:31:22.574302
3916	454	608	42	2026-05-22 11:28:35	out	t	2026-06-01 12:31:22.574302
3917	454	603	57	2026-05-22 11:30:39	out	t	2026-06-01 12:31:22.574302
3918	454	610	47	2026-05-22 11:30:45	out	t	2026-06-01 12:31:22.574302
3919	454	604	59	2026-05-22 11:30:53	out	t	2026-06-01 12:31:22.574302
3920	454	619	20	2026-05-22 14:27:28	out	t	2026-06-01 12:31:22.574302
3921	454	608	42	2026-05-22 14:30:48	out	t	2026-06-01 12:31:22.574302
3922	454	619	20	2026-05-22 15:47:55	out	t	2026-06-01 12:31:22.574302
3923	454	619	20	2026-05-22 16:33:27	out	t	2026-06-01 12:31:22.574302
3924	454	619	20	2026-05-22 17:41:49	out	t	2026-06-01 12:31:22.574302
3925	454	619	20	2026-05-22 18:42:58	out	t	2026-06-01 12:31:22.574302
3926	454	619	20	2026-05-22 19:31:32	out	t	2026-06-01 12:31:22.574302
3927	454	619	20	2026-05-22 20:41:40	out	t	2026-06-01 12:31:22.574302
3928	454	619	20	2026-05-22 21:42:43	out	t	2026-06-01 12:31:22.574302
3929	454	619	20	2026-05-22 22:43:04	out	t	2026-06-01 12:31:22.574302
3930	454	619	20	2026-05-22 23:57:10	out	t	2026-06-01 12:31:22.574302
3931	454	619	20	2026-05-23 00:37:51	out	t	2026-06-01 12:31:22.574302
3932	454	619	20	2026-05-23 01:34:24	out	t	2026-06-01 12:31:22.574302
3933	454	617	9	2026-05-23 02:25:26	out	t	2026-06-01 12:31:22.574302
3934	454	605	46	2026-05-23 02:34:22	out	t	2026-06-01 12:31:22.574302
3935	454	619	20	2026-05-23 02:43:02	out	t	2026-06-01 12:31:22.574302
3936	454	610	47	2026-05-23 03:02:25	out	t	2026-06-01 12:31:22.574302
3937	454	617	9	2026-05-23 07:25:58	out	t	2026-06-01 12:31:22.574302
3938	454	605	46	2026-05-23 07:50:27	out	t	2026-06-01 12:31:22.574302
3939	454	610	47	2026-05-23 08:27:31	out	t	2026-06-01 12:31:22.574302
3940	454	617	9	2026-05-23 08:27:41	out	t	2026-06-01 12:31:22.574302
3941	454	605	46	2026-05-23 08:51:48	out	t	2026-06-01 12:31:22.574302
3942	454	610	47	2026-05-23 09:26:46	out	t	2026-06-01 12:31:22.574302
3943	454	617	9	2026-05-23 11:30:05	out	t	2026-06-01 12:31:22.574302
3944	454	610	47	2026-05-23 11:30:36	out	t	2026-06-01 12:31:22.574302
3945	454	605	46	2026-05-23 14:24:25	out	t	2026-06-01 12:31:22.574302
3946	454	594	60	2026-05-23 14:25:52	out	t	2026-06-01 12:31:22.574302
3947	454	594	60	2026-05-23 15:37:28	out	t	2026-06-01 12:31:22.574302
3948	454	594	60	2026-05-23 16:31:14	out	t	2026-06-01 12:31:22.574302
3949	454	594	60	2026-05-23 17:31:25	out	t	2026-06-01 12:31:22.574302
3950	454	594	60	2026-05-23 18:31:35	out	t	2026-06-01 12:31:22.574302
3951	454	594	60	2026-05-23 19:31:37	out	t	2026-06-01 12:31:22.574302
3952	454	594	60	2026-05-23 20:30:36	out	t	2026-06-01 12:31:22.574302
3953	454	594	60	2026-05-23 21:31:31	out	t	2026-06-01 12:31:22.574302
3954	454	594	60	2026-05-23 22:31:24	out	t	2026-06-01 12:31:22.574302
3955	454	594	60	2026-05-23 23:31:27	out	t	2026-06-01 12:31:22.574302
3956	454	594	60	2026-05-24 00:31:33	out	t	2026-06-01 12:31:22.574302
3957	454	594	60	2026-05-24 01:31:22	out	t	2026-06-01 12:31:22.574302
3958	454	594	60	2026-05-24 02:30:56	out	t	2026-06-01 12:31:22.574302
3959	454	609	50	2026-05-24 02:45:49	out	t	2026-06-01 12:31:22.574302
3960	454	605	46	2026-05-24 02:45:59	out	t	2026-06-01 12:31:22.574302
3961	454	599	52	2026-05-24 04:28:17	out	t	2026-06-01 12:31:22.574302
3962	454	609	50	2026-05-24 08:38:09	out	t	2026-06-01 12:31:22.574302
3963	454	605	46	2026-05-24 08:54:41	out	t	2026-06-01 12:31:22.574302
3964	454	609	50	2026-05-24 09:35:16	out	t	2026-06-01 12:31:22.574302
3965	454	605	46	2026-05-24 10:08:40	out	t	2026-06-01 12:31:22.574302
3966	454	599	52	2026-05-24 11:23:07	out	t	2026-06-01 12:31:22.574302
3967	454	602	58	2026-05-24 11:28:15	out	t	2026-06-01 12:31:22.574302
3968	454	605	46	2026-05-24 11:51:54	out	t	2026-06-01 12:31:22.574302
3969	454	609	50	2026-05-24 11:51:58	out	t	2026-06-01 12:31:22.574302
3970	454	619	20	2026-05-24 14:27:52	out	t	2026-06-01 12:31:22.574302
3971	454	602	58	2026-05-24 14:27:58	out	t	2026-06-01 12:31:22.574302
3972	454	619	20	2026-05-24 15:36:27	out	t	2026-06-01 12:31:22.574302
3973	454	619	20	2026-05-24 16:34:14	out	t	2026-06-01 12:31:22.574302
3974	454	619	20	2026-05-24 17:42:58	out	t	2026-06-01 12:31:22.574302
3975	454	619	20	2026-05-24 18:44:48	out	t	2026-06-01 12:31:22.574302
3976	454	619	20	2026-05-24 19:43:09	out	t	2026-06-01 12:31:22.574302
3977	454	619	20	2026-05-24 20:41:16	out	t	2026-06-01 12:31:22.574302
3978	454	619	20	2026-05-24 22:05:46	out	t	2026-06-01 12:31:22.574302
3979	454	619	20	2026-05-24 22:50:34	out	t	2026-06-01 12:31:22.574302
3980	454	619	20	2026-05-24 23:40:09	out	t	2026-06-01 12:31:22.574302
3981	454	619	20	2026-05-25 00:34:49	out	t	2026-06-01 12:31:22.574302
3982	454	\N	3	2026-05-25 01:24:55	out	t	2026-06-01 12:31:22.574302
3983	454	619	20	2026-05-25 01:41:10	out	t	2026-06-01 12:31:22.574302
3984	454	\N	3	2026-05-25 01:54:58	out	t	2026-06-01 12:31:22.574302
3985	454	607	41	2026-05-25 02:08:47	out	t	2026-06-01 12:31:22.574302
3986	454	604	59	2026-05-25 02:15:55	out	t	2026-06-01 12:31:22.574302
3987	454	617	9	2026-05-25 02:27:44	out	t	2026-06-01 12:31:22.574302
3988	454	608	42	2026-05-25 02:28:15	out	t	2026-06-01 12:31:22.574302
3989	454	619	20	2026-05-25 02:31:17	out	t	2026-06-01 12:31:22.574302
3990	454	609	50	2026-05-25 02:45:35	out	t	2026-06-01 12:31:22.574302
3991	454	605	46	2026-05-25 02:46:33	out	t	2026-06-01 12:31:22.574302
3992	454	610	47	2026-05-25 02:54:55	out	t	2026-06-01 12:31:22.574302
3993	454	600	55	2026-05-25 02:55:39	out	t	2026-06-01 12:31:22.574302
3994	454	\N	11111	2026-05-25 03:08:46	out	t	2026-06-01 12:31:22.574302
3995	454	\N	11111	2026-05-25 03:08:48	out	t	2026-06-01 12:31:22.574302
3996	454	\N	11111	2026-05-25 03:15:44	out	t	2026-06-01 12:31:22.574302
3997	454	602	58	2026-05-25 05:35:54	out	t	2026-06-01 12:31:22.574302
3998	454	603	57	2026-05-25 05:49:20	out	t	2026-06-01 12:31:22.574302
3999	454	607	41	2026-05-25 07:11:29	out	t	2026-06-01 12:31:22.574302
4000	454	603	57	2026-05-25 07:26:08	out	t	2026-06-01 12:31:22.574302
4001	454	610	47	2026-05-25 07:26:16	out	t	2026-06-01 12:31:22.574302
4002	454	600	55	2026-05-25 07:58:48	out	t	2026-06-01 12:31:22.574302
4003	454	608	42	2026-05-25 08:06:08	out	t	2026-06-01 12:31:22.574302
4004	454	607	41	2026-05-25 08:22:19	out	t	2026-06-01 12:31:22.574302
4005	454	610	47	2026-05-25 08:22:32	out	t	2026-06-01 12:31:22.574302
4006	454	603	57	2026-05-25 08:22:39	out	t	2026-06-01 12:31:22.574302
4007	454	609	50	2026-05-25 08:23:42	out	t	2026-06-01 12:31:22.624528
4008	454	605	46	2026-05-25 08:23:47	out	t	2026-06-01 12:31:22.624528
4009	454	617	9	2026-05-25 08:30:13	out	t	2026-06-01 12:31:22.624528
4010	454	604	59	2026-05-25 08:32:55	out	t	2026-06-01 12:31:22.624528
4011	454	600	55	2026-05-25 08:51:03	out	t	2026-06-01 12:31:22.624528
4012	454	608	42	2026-05-25 08:56:18	out	t	2026-06-01 12:31:22.624528
4013	454	617	9	2026-05-25 09:36:26	out	t	2026-06-01 12:31:22.624528
4014	454	607	41	2026-05-25 11:28:43	out	t	2026-06-01 12:31:22.624528
4015	454	605	46	2026-05-25 11:28:58	out	t	2026-06-01 12:31:22.624528
4016	454	617	9	2026-05-25 11:30:11	out	t	2026-06-01 12:31:22.624528
4017	454	608	42	2026-05-25 11:30:20	out	t	2026-06-01 12:31:22.624528
4018	454	609	50	2026-05-25 11:31:17	out	t	2026-06-01 12:31:22.624528
4019	454	610	47	2026-05-25 11:31:37	out	t	2026-06-01 12:31:22.624528
4020	454	604	59	2026-05-25 11:38:12	out	t	2026-06-01 12:31:22.624528
4021	454	600	55	2026-05-25 11:44:58	out	t	2026-06-01 12:31:22.624528
4022	454	594	60	2026-05-25 14:28:40	out	t	2026-06-01 12:31:22.624528
4023	454	602	58	2026-05-25 14:30:41	out	t	2026-06-01 12:31:22.624528
4024	454	603	57	2026-05-25 14:30:46	out	t	2026-06-01 12:31:22.624528
4025	454	594	60	2026-05-25 15:30:29	out	t	2026-06-01 12:31:22.624528
4026	454	594	60	2026-05-25 16:30:55	out	t	2026-06-01 12:31:22.624528
4027	454	594	60	2026-05-25 17:31:37	out	t	2026-06-01 12:31:22.624528
4028	454	594	60	2026-05-25 18:31:03	out	t	2026-06-01 12:31:22.624528
4029	454	594	60	2026-05-25 19:31:34	out	t	2026-06-01 12:31:22.624528
4030	454	594	60	2026-05-25 20:31:30	out	t	2026-06-01 12:31:22.624528
4031	454	594	60	2026-05-25 21:31:31	out	t	2026-06-01 12:31:22.624528
4032	454	594	60	2026-05-25 22:31:46	out	t	2026-06-01 12:31:22.624528
4033	454	594	60	2026-05-25 23:31:50	out	t	2026-06-01 12:31:22.624528
4034	454	594	60	2026-05-26 00:31:21	out	t	2026-06-01 12:31:22.624528
4035	454	594	60	2026-05-26 01:31:25	out	t	2026-06-01 12:31:22.624528
4036	454	604	59	2026-05-26 02:12:24	out	t	2026-06-01 12:31:22.624528
4037	454	608	42	2026-05-26 02:30:09	out	t	2026-06-01 12:31:22.624528
4038	454	594	60	2026-05-26 02:31:19	out	t	2026-06-01 12:31:22.624528
4039	454	599	52	2026-05-26 03:48:26	out	t	2026-06-01 12:31:22.624528
4040	454	615	5	2026-05-26 03:49:42	out	t	2026-06-01 12:31:22.624528
4041	454	600	55	2026-05-26 03:55:13	out	t	2026-06-01 12:31:22.624528
4042	454	614	56	2026-05-26 04:04:40	out	t	2026-06-01 12:31:22.624528
4043	454	614	56	2026-05-26 04:36:41	out	t	2026-06-01 12:31:22.624528
4044	454	614	56	2026-05-26 04:53:40	out	t	2026-06-01 12:31:22.624528
4045	454	599	52	2026-05-26 06:39:24	out	t	2026-06-01 12:31:22.624528
4046	454	599	52	2026-05-26 06:40:16	out	t	2026-06-01 12:31:22.624528
4047	454	600	55	2026-05-26 06:40:24	out	t	2026-06-01 12:31:22.624528
4048	454	599	52	2026-05-26 06:42:56	out	t	2026-06-01 12:31:22.624528
4049	454	614	56	2026-05-26 07:30:03	out	t	2026-06-01 12:31:22.624528
4050	454	615	5	2026-05-26 07:30:15	out	t	2026-06-01 12:31:22.624528
4051	454	604	59	2026-05-26 07:41:12	out	t	2026-06-01 12:31:22.624528
4052	454	608	42	2026-05-26 08:15:56	out	t	2026-06-01 12:31:22.624528
4053	454	\N	11111	2026-05-26 08:26:35	out	t	2026-06-01 12:31:22.624528
4054	454	604	59	2026-05-26 08:29:59	out	t	2026-06-01 12:31:22.624528
4055	454	608	42	2026-05-26 08:39:03	out	t	2026-06-01 12:31:22.624528
4056	454	600	55	2026-05-26 08:55:48	out	t	2026-06-01 12:31:22.624528
4057	454	\N	11111	2026-05-26 10:23:58	out	t	2026-06-01 12:31:22.624528
4058	454	\N	11111	2026-05-26 10:24:01	out	t	2026-06-01 12:31:22.624528
4059	454	\N	11111	2026-05-26 10:24:03	out	t	2026-06-01 12:31:22.624528
4060	454	604	59	2026-05-26 11:34:33	out	t	2026-06-01 12:31:22.624528
4061	454	608	42	2026-05-26 11:34:48	out	t	2026-06-01 12:31:22.624528
4062	454	600	55	2026-05-26 11:49:38	out	t	2026-06-01 12:31:22.624528
4063	454	602	58	2026-05-26 11:54:14	out	t	2026-06-01 12:31:22.624528
4064	454	599	52	2026-05-26 11:56:46	out	t	2026-06-01 12:31:22.624528
4065	454	619	20	2026-05-26 14:28:03	out	t	2026-06-01 12:31:22.624528
4066	454	602	58	2026-05-26 14:28:09	out	t	2026-06-01 12:31:22.624528
4067	454	619	20	2026-05-26 15:39:53	out	t	2026-06-01 12:31:22.624528
4068	454	619	20	2026-05-26 16:47:05	out	t	2026-06-01 12:31:22.624528
4069	454	619	20	2026-05-26 17:34:59	out	t	2026-06-01 12:31:22.624528
4070	454	619	20	2026-05-26 18:39:00	out	t	2026-06-01 12:31:22.624528
4071	454	619	20	2026-05-26 19:37:39	out	t	2026-06-01 12:31:22.624528
4072	454	619	20	2026-05-26 20:35:06	out	t	2026-06-01 12:31:22.624528
4073	454	619	20	2026-05-26 21:42:16	out	t	2026-06-01 12:31:22.624528
4074	454	619	20	2026-05-26 22:48:10	out	t	2026-06-01 12:31:22.624528
4075	454	619	20	2026-05-26 23:42:45	out	t	2026-06-01 12:31:22.624528
4076	454	619	20	2026-05-27 00:34:03	out	t	2026-06-01 12:31:22.624528
4077	454	619	20	2026-05-27 01:32:18	out	t	2026-06-01 12:31:22.624528
4078	454	604	59	2026-05-27 02:05:44	out	t	2026-06-01 12:31:22.624528
4079	454	609	50	2026-05-27 02:23:12	out	t	2026-06-01 12:31:22.624528
4080	454	607	41	2026-05-27 02:23:28	out	t	2026-06-01 12:31:22.624528
4081	454	608	42	2026-05-27 02:28:28	out	t	2026-06-01 12:31:22.624528
4082	454	617	9	2026-05-27 02:29:43	out	t	2026-06-01 12:31:22.624528
4083	454	619	20	2026-05-27 02:44:44	out	t	2026-06-01 12:31:22.624528
4084	454	610	47	2026-05-27 03:10:04	out	t	2026-06-01 12:31:22.624528
4085	454	600	55	2026-05-27 03:13:53	out	t	2026-06-01 12:31:22.624528
4086	454	616	53	2026-05-27 03:38:23	out	t	2026-06-01 12:31:22.624528
4088	454	615	5	2026-05-27 04:07:01	out	t	2026-06-01 12:31:22.624528
4089	454	614	56	2026-05-27 04:14:17	out	t	2026-06-01 12:31:22.624528
4090	454	616	53	2026-05-27 07:27:16	out	t	2026-06-01 12:31:22.624528
4091	454	615	5	2026-05-27 07:29:02	out	t	2026-06-01 12:31:22.624528
4092	454	614	56	2026-05-27 07:30:11	out	t	2026-06-01 12:31:22.624528
4093	454	602	58	2026-05-27 07:39:31	out	t	2026-06-01 12:31:22.624528
4094	454	610	47	2026-05-27 07:44:11	out	t	2026-06-01 12:31:22.624528
4095	454	609	50	2026-05-27 07:45:20	out	t	2026-06-01 12:31:22.624528
4096	454	600	55	2026-05-27 07:51:30	out	t	2026-06-01 12:31:22.624528
4097	454	604	59	2026-05-27 07:59:25	out	t	2026-06-01 12:31:22.624528
4098	454	608	42	2026-05-27 08:02:03	out	t	2026-06-01 12:31:22.624528
4099	454	603	57	2026-05-27 08:19:42	out	t	2026-06-01 12:31:22.624528
4100	454	610	47	2026-05-27 08:28:27	out	t	2026-06-01 12:31:22.624528
4101	454	617	9	2026-05-27 08:30:00	out	t	2026-06-01 12:31:22.624528
4102	454	604	59	2026-05-27 08:30:49	out	t	2026-06-01 12:31:22.624528
4103	454	605	46	2026-05-27 08:39:11	out	t	2026-06-01 12:31:22.624528
4104	454	608	42	2026-05-27 08:39:23	out	t	2026-06-01 12:31:22.624528
4105	454	617	9	2026-05-27 09:29:55	out	t	2026-06-01 12:31:22.624528
4106	454	617	9	2026-05-27 11:29:58	out	t	2026-06-01 12:31:22.624528
4107	454	605	46	2026-05-27 11:30:42	out	t	2026-06-01 12:31:22.624528
4108	454	604	59	2026-05-27 11:31:14	out	t	2026-06-01 12:31:22.624528
4109	454	609	50	2026-05-27 11:32:06	out	t	2026-06-01 12:31:22.624528
4111	454	610	47	2026-05-27 11:33:04	out	t	2026-06-01 12:31:22.624528
4112	454	607	41	2026-05-27 11:33:12	out	t	2026-06-01 12:31:22.624528
4113	454	608	42	2026-05-27 11:33:39	out	t	2026-06-01 12:31:22.624528
4114	454	600	55	2026-05-27 11:37:15	out	t	2026-06-01 12:31:22.624528
4115	454	594	60	2026-05-27 14:27:11	out	t	2026-06-01 12:31:22.624528
4116	454	602	58	2026-05-27 14:28:01	out	t	2026-06-01 12:31:22.624528
4117	454	603	57	2026-05-27 14:28:11	out	t	2026-06-01 12:31:22.624528
4118	454	594	60	2026-05-27 15:38:06	out	t	2026-06-01 12:31:22.624528
4119	454	594	60	2026-05-27 16:30:23	out	t	2026-06-01 12:31:22.624528
4120	454	594	60	2026-05-27 17:30:37	out	t	2026-06-01 12:31:22.624528
4121	454	594	60	2026-05-27 18:31:17	out	t	2026-06-01 12:31:22.624528
4122	454	594	60	2026-05-27 19:28:13	out	t	2026-06-01 12:31:22.624528
4123	454	594	60	2026-05-27 19:29:48	out	t	2026-06-01 12:31:22.624528
4124	454	594	60	2026-05-27 19:30:15	out	t	2026-06-01 12:31:22.624528
4125	454	594	60	2026-05-27 20:31:17	out	t	2026-06-01 12:31:22.624528
4126	454	594	60	2026-05-27 21:31:26	out	t	2026-06-01 12:31:22.624528
4127	454	594	60	2026-05-27 22:31:40	out	t	2026-06-01 12:31:22.624528
4128	454	594	60	2026-05-27 23:56:19	out	t	2026-06-01 12:31:22.624528
4129	454	594	60	2026-05-28 00:32:07	out	t	2026-06-01 12:31:22.624528
4130	454	594	60	2026-05-28 01:31:42	out	t	2026-06-01 12:31:22.624528
4131	454	\N	3	2026-05-28 01:44:10	out	t	2026-06-01 12:31:22.624528
4132	454	\N	3	2026-05-28 02:10:30	out	t	2026-06-01 12:31:22.624528
4133	454	607	41	2026-05-28 02:19:29	out	t	2026-06-01 12:31:22.624528
4134	454	617	9	2026-05-28 02:30:34	out	t	2026-06-01 12:31:22.624528
4135	454	594	60	2026-05-28 02:30:41	out	t	2026-06-01 12:31:22.624528
4136	454	603	57	2026-05-28 02:53:07	out	t	2026-06-01 12:31:22.624528
4137	454	600	55	2026-05-28 03:02:18	out	t	2026-06-01 12:31:22.624528
4138	454	\N	11111	2026-05-28 03:14:18	out	t	2026-06-01 12:31:22.624528
4139	454	\N	11111	2026-05-28 03:14:21	out	t	2026-06-01 12:31:22.624528
4140	454	\N	11111	2026-05-28 03:14:47	out	t	2026-06-01 12:31:22.624528
4141	454	614	56	2026-05-28 03:57:44	out	t	2026-06-01 12:31:22.624528
4142	454	599	52	2026-05-28 04:18:33	out	t	2026-06-01 12:31:22.624528
4143	454	614	56	2026-05-28 05:58:39	out	t	2026-06-01 12:31:22.624528
4144	454	600	55	2026-05-28 07:53:11	out	t	2026-06-01 12:31:22.624528
4145	454	600	55	2026-05-28 08:10:36	out	t	2026-06-01 12:31:22.624528
4146	454	617	9	2026-05-28 08:30:02	out	t	2026-06-01 12:31:22.624528
4147	454	607	41	2026-05-28 08:30:36	out	t	2026-06-01 12:31:22.624528
4148	454	607	41	2026-05-28 09:15:10	out	t	2026-06-01 12:31:22.624528
4149	454	617	9	2026-05-28 09:15:28	out	t	2026-06-01 12:31:22.624528
4150	454	617	9	2026-05-28 11:30:08	out	t	2026-06-01 12:31:22.624528
4151	454	607	41	2026-05-28 11:30:16	out	t	2026-06-01 12:31:22.624528
4152	454	602	58	2026-05-28 11:34:23	out	t	2026-06-01 12:31:22.624528
4153	454	609	50	2026-05-28 11:34:27	out	t	2026-06-01 12:31:22.624528
4154	454	600	55	2026-05-28 11:57:02	out	t	2026-06-01 12:31:22.624528
4155	454	599	52	2026-05-28 12:22:09	out	t	2026-06-01 12:31:22.624528
4156	454	619	20	2026-05-28 14:27:50	out	t	2026-06-01 12:31:22.624528
4157	454	602	58	2026-05-28 14:30:22	out	t	2026-06-01 12:31:22.624528
4158	454	609	50	2026-05-28 14:30:30	out	t	2026-06-01 12:31:22.624528
4159	454	619	20	2026-05-28 15:43:28	out	t	2026-06-01 12:31:22.624528
4160	454	619	20	2026-05-28 16:34:34	out	t	2026-06-01 12:31:22.624528
4161	454	619	20	2026-05-28 17:43:42	out	t	2026-06-01 12:31:22.624528
4162	454	619	20	2026-05-28 18:40:07	out	t	2026-06-01 12:31:22.624528
4163	454	619	20	2026-05-28 19:45:56	out	t	2026-06-01 12:31:22.624528
4164	454	619	20	2026-05-28 20:44:57	out	t	2026-06-01 12:31:22.624528
4165	454	619	20	2026-05-28 21:39:52	out	t	2026-06-01 12:31:22.624528
4166	454	619	20	2026-05-28 22:43:48	out	t	2026-06-01 12:31:22.624528
4167	454	619	20	2026-05-28 23:35:00	out	t	2026-06-01 12:31:22.624528
4168	454	619	20	2026-05-29 00:37:06	out	t	2026-06-01 12:31:22.624528
4169	454	619	20	2026-05-29 01:51:17	out	t	2026-06-01 12:31:22.624528
4170	454	603	57	2026-05-29 02:45:33	out	t	2026-06-01 12:31:22.624528
4171	454	619	20	2026-05-29 02:54:50	out	t	2026-06-01 12:31:22.624528
4172	454	610	47	2026-05-29 03:03:06	out	t	2026-06-01 12:31:22.624528
4173	454	603	57	2026-05-29 08:29:36	out	t	2026-06-01 12:31:22.624528
4174	454	610	47	2026-05-29 08:30:51	out	t	2026-06-01 12:31:22.624528
4175	454	610	47	2026-05-29 09:25:03	out	t	2026-06-01 12:31:22.624528
4176	454	603	57	2026-05-29 09:28:21	out	t	2026-06-01 12:31:22.624528
4177	454	608	42	2026-05-29 11:28:29	out	t	2026-06-01 12:31:22.624528
4178	454	603	57	2026-05-29 11:30:10	out	t	2026-06-01 12:31:22.624528
4179	454	610	47	2026-05-29 11:30:19	out	t	2026-06-01 12:31:22.624528
4180	454	594	60	2026-05-29 14:22:15	out	t	2026-06-01 12:31:22.624528
4181	454	608	42	2026-05-29 14:33:19	out	t	2026-06-01 12:31:22.624528
4182	454	594	60	2026-05-29 15:30:59	out	t	2026-06-01 12:31:22.624528
4183	454	594	60	2026-05-29 16:30:58	out	t	2026-06-01 12:31:22.624528
4184	454	594	60	2026-05-29 17:31:33	out	t	2026-06-01 12:31:22.624528
4185	454	594	60	2026-05-29 18:31:41	out	t	2026-06-01 12:31:22.624528
4186	454	594	60	2026-05-29 19:31:25	out	t	2026-06-01 12:31:22.624528
4187	454	594	60	2026-05-29 20:31:26	out	t	2026-06-01 12:31:22.624528
4188	454	594	60	2026-05-29 21:31:27	out	t	2026-06-01 12:31:22.624528
4189	454	594	60	2026-05-29 22:30:50	out	t	2026-06-01 12:31:22.624528
4190	454	594	60	2026-05-29 23:31:27	out	t	2026-06-01 12:31:22.624528
4191	454	594	60	2026-05-30 00:46:01	out	t	2026-06-01 12:31:22.624528
4192	454	594	60	2026-05-30 01:30:35	out	t	2026-06-01 12:31:22.624528
4193	454	594	60	2026-05-30 02:34:10	out	t	2026-06-01 12:31:22.624528
4194	454	605	46	2026-05-30 02:34:29	out	t	2026-06-01 12:31:22.624528
4195	454	610	47	2026-05-30 02:50:18	out	t	2026-06-01 12:31:22.624528
4196	454	610	47	2026-05-30 07:34:15	out	t	2026-06-01 12:31:22.624528
4197	454	610	47	2026-05-30 08:02:45	out	t	2026-06-01 12:31:22.624528
4198	454	605	46	2026-05-30 11:30:13	out	t	2026-06-01 12:31:22.624528
4199	454	610	47	2026-05-30 11:30:51	out	t	2026-06-01 12:31:22.624528
4200	454	603	57	2026-05-30 11:36:18	out	t	2026-06-01 12:31:22.624528
4201	454	619	20	2026-05-30 14:27:40	out	t	2026-06-01 12:31:22.624528
4202	454	603	57	2026-05-30 14:31:04	out	t	2026-06-01 12:31:22.624528
4203	454	619	20	2026-05-30 15:33:53	out	t	2026-06-01 12:31:22.624528
4204	454	619	20	2026-05-30 16:34:54	out	t	2026-06-01 12:31:22.624528
4205	454	619	20	2026-05-30 17:38:00	out	t	2026-06-01 12:31:22.624528
4206	454	619	20	2026-05-30 18:41:38	out	t	2026-06-01 12:31:22.624528
4207	454	619	20	2026-05-30 19:43:45	out	t	2026-06-01 12:31:22.644244
4208	454	619	20	2026-05-30 20:44:30	out	t	2026-06-01 12:31:22.644244
4209	454	619	20	2026-05-30 21:44:45	out	t	2026-06-01 12:31:22.644244
4210	454	619	20	2026-05-30 22:34:08	out	t	2026-06-01 12:31:22.644244
4211	454	619	20	2026-05-30 23:49:38	out	t	2026-06-01 12:31:22.644244
4212	454	619	20	2026-05-31 00:38:50	out	t	2026-06-01 12:31:22.644244
4213	454	\N	3	2026-05-31 01:15:44	out	t	2026-06-01 12:31:22.644244
4214	454	\N	3	2026-05-31 01:39:27	out	t	2026-06-01 12:31:22.644244
4215	454	619	20	2026-05-31 01:40:16	out	t	2026-06-01 12:31:22.644244
4216	454	619	20	2026-05-31 02:38:55	out	t	2026-06-01 12:31:22.644244
4217	454	605	46	2026-05-31 02:47:40	out	t	2026-06-01 12:31:22.644244
4218	454	599	52	2026-05-31 07:46:04	out	t	2026-06-01 12:31:22.644244
4219	454	605	46	2026-05-31 11:40:52	out	t	2026-06-01 12:31:22.644244
4220	454	609	50	2026-05-31 11:41:33	out	t	2026-06-01 12:31:22.644244
4221	454	599	52	2026-05-31 13:29:02	out	t	2026-06-01 12:31:22.644244
4222	454	594	60	2026-05-31 14:29:27	out	t	2026-06-01 12:31:22.644244
4223	454	609	50	2026-05-31 14:29:36	out	t	2026-06-01 12:31:22.644244
4224	454	594	60	2026-05-31 15:31:16	out	t	2026-06-01 12:31:22.644244
4225	454	594	60	2026-05-31 16:31:18	out	t	2026-06-01 12:31:22.644244
4226	454	594	60	2026-05-31 17:31:43	out	t	2026-06-01 12:31:22.644244
4249	460	619	20	2026-06-01 23:43:05	in	t	2026-06-01 23:43:47.078615
4260	460	613	54	2026-06-02 06:02:10	in	t	2026-06-02 06:02:20.662765
4296	460	594	60	2026-06-03 02:30:50	in	t	2026-06-03 02:31:01.27518
4788	454	596	44	2026-05-27 16:50:28	out	t	2026-06-03 08:40:50.902064
4789	454	596	44	2026-05-27 17:34:40	out	t	2026-06-03 08:40:50.902064
4790	454	596	44	2026-05-27 18:30:37	out	t	2026-06-03 08:40:50.902064
4791	454	596	44	2026-05-27 19:30:34	out	t	2026-06-03 08:40:50.902064
4792	454	596	44	2026-05-27 20:30:49	out	t	2026-06-03 08:40:50.902064
4793	454	596	44	2026-05-27 21:30:22	out	t	2026-06-03 08:40:50.902064
4794	454	596	44	2026-05-27 22:30:25	out	t	2026-06-03 08:40:50.902064
4795	454	596	44	2026-05-28 00:14:47	out	t	2026-06-03 08:40:50.902064
4796	454	596	44	2026-05-28 00:39:26	out	t	2026-06-03 08:40:50.902064
4797	454	596	44	2026-05-28 01:31:49	out	t	2026-06-03 08:40:50.902064
4798	454	611	18	2026-05-28 02:30:32	out	t	2026-06-03 08:40:50.902064
4799	454	596	44	2026-05-28 02:30:40	out	t	2026-06-03 08:40:50.902064
4800	454	611	18	2026-05-28 07:27:54	out	t	2026-06-03 08:40:50.902064
4801	454	611	18	2026-05-28 08:36:10	out	t	2026-06-03 08:40:50.902064
4802	454	\N	2	2026-05-28 11:31:35	out	t	2026-06-03 08:40:50.902064
\.


--
-- Data for Name: branches; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.branches (id, name, code, type, parent_id, address, phone, manager_name, is_active, created_at, company_id) FROM stdin;
92	Drivethru	DRIVETHRU	head_office	\N				t	2026-05-28 18:06:01.580055	\N
93	Shelumi	SHELUMI	head_office	\N				t	2026-05-28 18:06:19.775878	\N
\.


--
-- Data for Name: companies; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.companies (id, name, code, address, phone, email, is_active, created_at) FROM stdin;
\.


--
-- Data for Name: departments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.departments (id, name, code, description, is_active, created_at) FROM stdin;
1	Director	DIR	Executive Director level	t	2026-05-28 16:08:45.227322
2	Security	SECURI		t	2026-05-28 16:21:36.004326
3	Front Office	FRONTO		t	2026-05-28 16:21:42.752777
4	Kitchen	KITCHE		t	2026-05-28 16:21:49.929169
5	House Keeping	HOUSEK		t	2026-05-28 16:21:54.366456
6	Photography	PHOTOG		t	2026-05-28 16:21:59.576841
7	Surf	SURF		t	2026-05-28 16:22:04.940986
8	Maintenance	MAINTE		t	2026-05-28 16:22:09.556397
9	Admin	ADMIN		t	2026-05-28 17:05:45.805241
\.


--
-- Data for Name: designations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.designations (id, name, code, department_id, level, description, is_active, created_at) FROM stdin;
\.


--
-- Data for Name: employee_salary_assignments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.employee_salary_assignments (id, employee_id, salary_structure_id, basic_amount, effective_date, created_at, updated_at) FROM stdin;
49	594	49	32500	2026-05-28	2026-05-28 18:24:53.61524	2026-05-28 18:24:53.61524
50	595	50	32500	2026-05-28	2026-05-28 18:24:53.61524	2026-05-28 18:24:53.61524
51	596	51	32500	2026-05-28	2026-05-28 18:24:53.61524	2026-05-28 18:24:53.61524
52	597	52	32500	2026-05-28	2026-05-28 18:24:53.61524	2026-05-28 18:24:53.61524
53	598	53	55000	2026-05-28	2026-05-28 18:24:53.61524	2026-05-28 18:24:53.61524
54	599	54	120000	2026-05-28	2026-05-28 18:24:53.61524	2026-05-28 18:24:53.61524
55	600	55	80000	2026-05-28	2026-05-28 18:24:53.61524	2026-05-28 18:24:53.61524
56	601	56	31500	2026-05-28	2026-05-28 18:24:53.61524	2026-05-28 18:24:53.61524
57	602	57	35000	2026-05-28	2026-05-28 18:24:53.61524	2026-05-28 18:24:53.61524
58	603	58	100000	2026-05-28	2026-05-28 18:24:53.61524	2026-05-28 18:24:53.61524
59	604	59	35000	2026-05-28	2026-05-28 18:24:53.61524	2026-05-28 18:24:53.61524
60	605	60	60000	2026-05-28	2026-05-28 18:24:53.61524	2026-05-28 18:24:53.61524
61	606	61	33000	2026-05-28	2026-05-28 18:24:53.61524	2026-05-28 18:24:53.61524
62	607	62	53500	2026-05-28	2026-05-28 18:24:53.61524	2026-05-28 18:24:53.61524
63	608	63	34500	2026-05-28	2026-05-28 18:24:53.61524	2026-05-28 18:24:53.61524
64	609	64	37500	2026-05-28	2026-05-28 18:24:53.61524	2026-05-28 18:24:53.61524
65	610	65	37500	2026-05-28	2026-05-28 18:24:53.61524	2026-05-28 18:24:53.61524
66	611	66	41500	2026-05-28	2026-05-28 18:24:53.61524	2026-05-28 18:24:53.61524
67	612	67	80000	2026-05-28	2026-05-28 18:24:53.61524	2026-05-28 18:24:53.61524
68	613	68	120000	2026-05-28	2026-05-28 18:24:53.61524	2026-05-28 18:24:53.61524
69	614	69	120000	2026-05-28	2026-05-28 18:24:53.61524	2026-05-28 18:24:53.61524
70	615	70	180000	2026-05-28	2026-05-28 18:24:53.61524	2026-05-28 18:24:53.61524
71	616	71	120000	2026-05-28	2026-05-28 18:24:53.61524	2026-05-28 18:24:53.61524
72	617	72	36500	2026-05-28	2026-05-28 18:24:53.61524	2026-05-28 18:24:53.61524
24	618	24	160000	2026-05-28	2026-05-28 18:11:10.408949	2026-05-28 18:11:10.408949
73	619	73	80000	2000-06-01	2026-06-01 06:42:52.452503	2026-06-01 06:42:52.452503
\.


--
-- Data for Name: employees; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.employees (id, employee_id, first_name, last_name, full_name, designation, department, branch_id, shift_id, joining_date, email, phone, biometric_id, status, gender, date_of_birth, address, employee_type, reporting_manager_id, nic_number, epf_number, etf_number, aadhar_number, pan_number, photo_url, aadhar_doc_url, pan_doc_url, certificates_doc_url, resume_doc_url, created_at, company_id, weekoff_schedule_id, remarks) FROM stdin;
618		Raphael Amsler		Raphael Amsler	Staff	Director	92	\N	\N				active	male	\N		permanent	\N											2026-05-28 18:11:02.90042	\N	\N	
594	EMP001	Anura	Manamperi	Anura Manamperi	Staff	Security	92	16	\N	\N	\N	60	active	male	\N	\N	permanent	\N	\N	60	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-28 18:06:38.356976	\N	\N	\N
596	EMP003	V.A.	Aberyatne	V.A. Aberyatne	Staff	Security	92	16	\N	\N	\N	44	active	male	\N	\N	permanent	\N	\N	44	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-28 18:06:38.71631	\N	\N	\N
597	EMP004	K.H.	Udayasiri Sarath	K.H. Udayasiri Sarath	Staff	Security	92	16	\N	\N	\N	45	active	male	\N	\N	permanent	\N	\N	45	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-28 18:06:38.915377	\N	\N	\N
598	EMP005	K.D. Achintha	Madushanith Nadeera	K.D. Achintha Madushanith Nadeera	Staff	Front Office	92	19	\N	\N	\N	49	active	male	\N	\N	permanent	\N	\N	49	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-28 18:06:39.088494	\N	\N	\N
599	EMP006	Anuradha	Abeysinghe Bandara	Anuradha Abeysinghe Bandara	Staff	Admin	92	17	\N	\N	\N	52	active	male	\N	\N	permanent	\N	\N	52	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-28 18:06:39.281642	\N	\N	\N
600	EMP007	Achala	A A S De Silva	Achala A A S De Silva	Staff	Admin	92	18	\N	\N	\N	55	active	male	\N	\N	permanent	\N	\N	55	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-28 18:06:39.530532	\N	\N	\N
601	EMP008	Ramayalatha W.	Gunasekara	Ramayalatha W. Gunasekara	Staff	Kitchen	92	15	\N	\N	\N	34	active	male	\N	\N	permanent	\N	\N	34	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-28 18:06:39.731626	\N	\N	\N
602	EMP009	M A	Kavishka	M A Kavishka	Staff	Kitchen	92	15	\N	\N	\N	58	active	male	\N	\N	permanent	\N	\N	58	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-28 18:06:39.936908	\N	\N	\N
603	EMP010	Pramila	Chamod Wellehewa	Pramila Chamod Wellehewa	Staff	Kitchen	92	15	\N	\N	\N	57	active	male	\N	\N	permanent	\N	\N	57	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-28 18:06:40.147335	\N	\N	\N
604	EMP011	Inosha	Lakmali	Inosha Lakmali	Staff	Kitchen	92	15	\N	\N	\N	59	active	male	\N	\N	permanent	\N	\N	59	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-28 18:06:40.339707	\N	\N	\N
605	EMP012	H.K.Chamika	Ruwan Kumara	H.K.Chamika Ruwan Kumara	Staff	Kitchen	92	15	\N	\N	\N	46	active	male	\N	\N	permanent	\N	\N	46	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-28 18:06:40.556816	\N	\N	\N
606	EMP013	Ashoka	Damayanthi	Ashoka Damayanthi	Staff	House Keeping	93	18	\N	\N	\N	13	active	male	\N	\N	permanent	\N	\N	13	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-28 18:06:40.765185	\N	\N	\N
607	EMP014	Ananda	Silva	Ananda Silva	Staff	House Keeping	92	18	\N	\N	\N	41	active	male	\N	\N	permanent	\N	\N	41	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-28 18:06:40.958153	\N	\N	\N
608	EMP015	R.K.	Kusumawathi	R.K. Kusumawathi	Staff	House Keeping	92	18	\N	\N	\N	42	active	male	\N	\N	permanent	\N	\N	42	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-28 18:06:41.172896	\N	\N	\N
609	EMP016	Chamil	Asuntha Rathnayaka Koralege	Chamil Asuntha Rathnayaka Koralege	Staff	House Keeping	92	18	\N	\N	\N	50	active	male	\N	\N	permanent	\N	\N	50	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-28 18:06:41.390427	\N	\N	\N
610	EMP017	G.S.Thimira	Nethsara	G.S.Thimira Nethsara	Staff	House Keeping	92	18	\N	\N	\N	47	active	male	\N	\N	permanent	\N	\N	47	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-28 18:06:41.680894	\N	\N	\N
611	EMP018	Nimesh	Dhananjaya	Nimesh Dhananjaya	Staff	House Keeping	93	18	\N	\N	\N	18	active	male	\N	\N	permanent	\N	\N	18	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-28 18:06:41.893337	\N	\N	\N
612	EMP019	Lakshan Y.	Wickramasinghe Mohotti	Lakshan Y. Wickramasinghe Mohotti	Staff	Photography	92	17	\N	\N	\N	48	active	male	\N	\N	permanent	\N	\N	48	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-28 18:06:42.088443	\N	\N	\N
613	EMP020	Mari Chehan	Chanuka Nambukara Wellalage	Mari Chehan Chanuka Nambukara Wellalage	Staff	Surf	92	17	\N	\N	\N	54	active	male	\N	\N	permanent	\N	\N	54	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-28 18:06:42.297311	\N	\N	\N
614	EMP021	K Ridmika H	Karunawardhana	K Ridmika H Karunawardhana	Staff	Surf	92	17	\N	\N	\N	56	active	male	\N	\N	permanent	\N	\N	56	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-28 18:06:42.494832	\N	\N	\N
615	EMP022	Nadun	Moni	Nadun Moni	Staff	Surf	93	17	\N	\N	\N	5	active	male	\N	\N	permanent	\N	\N	5	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-28 18:06:42.702534	\N	\N	\N
616	EMP023	Chathuni	Amasha Ruwanpathirana	Chathuni Amasha Ruwanpathirana	Staff	Surf	92	17	\N	\N	\N	53	active	male	\N	\N	permanent	\N	\N	53	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-28 18:06:42.865801	\N	\N	\N
617	EMP024	M.A.	Jayantha	M.A. Jayantha	Staff	Maintenance	92	18	\N	\N	\N	9	active	male	\N	\N	permanent	\N	\N	9	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-28 18:06:43.0326	\N	\N	\N
619	20	Anuradha Abeysinghe Bandara		Anuradha Abeysinghe Bandara	Staff	Admin	93	17	\N			20	active	male	2026-02-01		permanent	\N		20									2026-06-01 06:40:48.93235	\N	\N	
595	EMP002	K.A.	Jayalath	K.A. Jayalath	Staff	Security	92	16	\N			20	active	male	\N		permanent	\N		20									2026-05-28 18:06:38.554308	\N	\N	
\.


--
-- Data for Name: holidays; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.holidays (id, name, date, type, description, created_at) FROM stdin;
27	New Year	2026-01-01	national	\N	2026-05-28 17:56:56.444829
28	Independence Day	2026-02-04	national	\N	2026-05-28 17:56:56.444829
29	Poya Day	2026-03-03	religious	\N	2026-05-28 17:56:56.444829
30	Sinhala & Tamil New Year	2026-04-13	national	\N	2026-05-28 17:56:56.444829
31	May Day	2026-05-01	national	\N	2026-05-28 17:56:56.444829
32	Duruthu Full Moon Poya Day	2026-01-03	poya	දුරුතු පෝය දිනය	2026-05-28 18:07:31.054034
33	Tamil Thai Pongal Day	2026-01-14	public	தைப்பொங்கல்	2026-05-28 18:07:31.091097
34	Navam Full Moon Poya Day	2026-02-01	poya	නවම් පෝය දිනය	2026-05-28 18:07:31.127478
35	Good Friday	2026-04-03	public	ශුද්ධ සිකුරාදා	2026-05-28 18:07:31.163968
36	Bak Full Moon Poya Day	2026-04-12	poya	බක් පෝය දිනය	2026-05-28 18:07:31.200384
37	Sinhala & Tamil New Year	2026-04-14	statutory	සිංහල හා දෙමළ අලුත් අවුරුද්ද	2026-05-28 18:07:31.236773
40	Poson Full Moon Poya Day	2026-06-10	poya	පොසොන් පෝය දිනය	2026-05-28 18:07:31.344674
41	Esala Full Moon Poya Day	2026-07-09	poya	ඇසල පෝය දිනය	2026-05-28 18:07:31.380847
42	Nikini Full Moon Poya Day	2026-08-08	poya	නිකිණි පෝය දිනය	2026-05-28 18:07:31.416849
43	Binara Full Moon Poya Day	2026-09-06	poya	බිනර පෝය දිනය	2026-05-28 18:07:31.452509
44	Vap Full Moon Poya Day	2026-10-06	poya	වප් පෝය දිනය	2026-05-28 18:07:31.488566
45	Milad-un-Nabi	2026-10-18	public	Prophet Birthday	2026-05-28 18:07:31.524571
46	Il Full Moon Poya Day	2026-11-04	poya	ඉල් පෝය දිනය	2026-05-28 18:07:31.560868
47	Deepavali	2026-11-09	public	දීපාවලිය	2026-05-28 18:07:31.596583
48	Unduvap Full Moon Poya Day	2026-11-24	poya	උඳුවප් පෝය දිනය	2026-05-28 18:07:31.632816
49	Christmas Day	2026-12-25	statutory	නත්තල් දිනය	2026-05-28 18:07:31.668753
38	Wesak Full Moon Poya Day	2026-05-30	poya	වෙසක් පෝය දිනය	2026-05-28 18:07:31.272808
39	Day following Wesak Full Moon Poya Day	2026-05-31	public	වෙසක් පසු දිනය	2026-05-28 18:07:31.308589
\.


--
-- Data for Name: hr_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.hr_settings (id, required_work_minutes, ot_grace_minutes, daily_rate_divisor, hours_per_day, duplicate_punch_filter_minutes, standard_lunch_start_hour, standard_lunch_minutes, ot_exempt_designations, incomplete_exempt_departments, department_rules, updated_at, early_in_minutes, late_deduction_enabled, late_deduction_threshold) FROM stdin;
\.


--
-- Data for Name: leave_balances; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.leave_balances (id, employee_id, year, annual_leave_balance, casual_leave_balance, annual_leave_used, casual_leave_used, last_accrual_date, created_at, updated_at) FROM stdin;
29	611	2026	21	0	0	0	\N	2026-05-28 18:47:11.153171	2026-05-28 18:47:11.153171
30	612	2026	20	0	1	0	\N	2026-05-28 18:47:11.153171	2026-05-28 18:47:11.153171
35	594	2026	0	0	0	0	\N	2026-06-04 08:52:59.811258	2026-06-04 08:52:59.811258
36	618	2026	0	0	0	0	\N	2026-06-04 08:53:12.228701	2026-06-04 08:53:12.228701
37	596	2026	0	0	0	0	\N	2026-06-04 08:53:29.732689	2026-06-04 08:53:29.732689
38	597	2026	0	0	0	0	\N	2026-06-04 08:53:40.333543	2026-06-04 08:53:40.333543
39	598	2026	21	0	4.5	0	\N	2026-06-04 08:54:03.412863	2026-06-04 08:54:03.412863
17	599	2026	21	0	14.5	0	\N	2026-05-28 18:47:11.153171	2026-06-04 08:54:22.405
24	606	2026	21	0	13.5	0	\N	2026-05-28 18:47:11.153171	2026-06-04 08:55:29.964
20	602	2026	21	0	10	0	\N	2026-05-28 18:47:11.153171	2026-06-04 08:56:20.221
21	603	2026	21	0	1	0	\N	2026-05-28 18:47:11.153171	2026-06-04 08:56:40.958
23	605	2026	21	0	0.5	0	\N	2026-05-28 18:47:11.153171	2026-06-04 08:57:16.194
25	607	2026	21	0	5	0	\N	2026-05-28 18:47:11.153171	2026-06-04 08:57:53.778
26	608	2026	21	0	0	0	\N	2026-05-28 18:47:11.153171	2026-06-04 08:58:12.061
27	609	2026	21	0	10	0	\N	2026-05-28 18:47:11.153171	2026-06-04 08:59:00.232
28	610	2026	21	0	4	0	\N	2026-05-28 18:47:11.153171	2026-06-04 08:59:19.028
31	613	2026	21	0	12.5	0	\N	2026-05-28 18:47:11.153171	2026-06-04 08:59:34.372
33	615	2026	21	0	22.5	0	\N	2026-05-28 18:47:11.153171	2026-06-04 09:00:12.337
34	616	2026	21	0	3.5	0	\N	2026-05-28 18:47:11.153171	2026-06-04 09:00:28.391
40	617	2026	21	0	2	0	\N	2026-06-04 09:00:57.350494	2026-06-04 09:00:57.350494
41	595	2026	0	0	0	0	\N	2026-06-04 09:01:11.105377	2026-06-04 09:01:11.105377
42	619	2026	0	0	0	0	\N	2026-06-04 09:01:30.463623	2026-06-04 09:01:30.463623
19	601	2026	21	0	15	0	\N	2026-05-28 18:47:11.153171	2026-06-04 09:02:38.285
22	604	2026	21	0	4	0	\N	2026-05-28 18:47:11.153171	2026-06-04 09:03:48.284
32	614	2026	21	0	10.5	0	\N	2026-05-28 18:47:11.153171	2026-06-04 09:04:28.375
18	600	2026	21	0	3.5	0	\N	2026-05-28 18:47:11.153171	2026-06-04 09:05:25.157
\.


--
-- Data for Name: loan_emi_ledger; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.loan_emi_ledger (id, loan_id, month, year, amount, source, note, created_at) FROM stdin;
6	15	11	2025	12500	manual	\N	2026-06-03 10:07:46.182886
7	15	12	2025	12500	manual	\N	2026-06-03 10:07:46.182886
8	15	1	2026	12500	manual	\N	2026-06-03 10:07:46.182886
9	15	2	2026	12500	manual	\N	2026-06-03 10:07:46.182886
10	15	3	2026	12500	manual	\N	2026-06-03 10:07:46.182886
11	15	4	2026	12500	manual	\N	2026-06-03 10:07:46.182886
18	16	4	2026	25000	manual	\N	2026-06-03 10:12:11.394919
19	17	1	2026	30000	manual	\N	2026-06-03 10:13:13.97571
20	17	2	2026	30000	manual	\N	2026-06-03 10:13:13.97571
21	17	3	2026	30000	manual	\N	2026-06-03 10:13:13.97571
22	17	4	2026	30000	manual	\N	2026-06-03 10:13:13.97571
119	12	5	2026	5000	payroll	\N	2026-06-04 10:39:14.948553
120	16	5	2026	25000	payroll	\N	2026-06-04 10:39:14.948553
122	14	5	2026	15000	payroll	\N	2026-06-04 10:39:14.948553
123	15	5	2026	12500	payroll	\N	2026-06-04 10:39:14.948553
124	10	5	2026	5000	payroll	\N	2026-06-04 10:39:14.948553
125	13	5	2026	10000	payroll	\N	2026-06-04 10:39:14.948553
126	11	5	2026	5000	payroll	\N	2026-06-04 10:39:14.948553
128	17	5	2026	30000	payroll	\N	2026-06-05 10:56:13.715956
\.


--
-- Data for Name: manual_salary_entries; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.manual_salary_entries (id, employee_id, branch_id, month, year, present_days, absent_days, ot_hours, ot_amount, basic_salary, transport_allowance, lunch_allowance, housing_allowance, other_allowances, epf_deduction, loan_deduction, absence_deduction, other_deductions, gross_salary, net_salary, status, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: ot_adjustments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ot_adjustments (id, employee_id, year, month, auto_regular_ot_hours, auto_regular_ot_amount, auto_holiday_ot_hours, auto_holiday_ot_amount, is_manual_override, adjusted_regular_ot_hours, adjusted_regular_ot_amount, adjusted_holiday_ot_hours, adjusted_holiday_ot_amount, notes, status, created_at, updated_at) FROM stdin;
1	619	2026	5	0	0	6.08	3358	t	0	0	0	0		pending	2026-06-03 11:38:29.914416	2026-06-03 11:38:29.905
2	619	2026	6	0	0	0	0	f	\N	\N	\N	\N	\N	approved	2026-06-03 11:40:30.887401	2026-06-03 11:40:30.887401
3	594	2026	5	14	3281	15.11	3887	t	13	2640.69	8	1625.04		pending	2026-06-05 10:42:56.773187	2026-06-05 10:42:56.767
4	594	2026	6	1	234	0	0	f	\N	\N	\N	\N	\N	approved	2026-06-05 10:43:50.989276	2026-06-05 10:43:50.989276
\.


--
-- Data for Name: payroll_records; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payroll_records (id, employee_id, branch_id, month, year, working_days, present_days, absent_days, late_days, leave_days, holiday_days, overtime_hours, basic_salary, transport_allowance, housing_allowance, other_allowances, overtime_pay, gross_salary, epf_employee, epf_employer, etf_employer, apit, late_deduction, absence_deduction, other_deductions, total_deductions, net_salary, status, remarks, generated_at, approved_at, paid_at, created_at, updated_at, half_days, half_day_deduction, incomplete_deduction, holiday_ot_pay, loan_deduction, lunch_incentive, lunch_late_deduction, req_hours_per_day, late_minutes, lunch_late_minutes, incomplete_minutes, off_season_payable_hours) FROM stdin;
721	600	92	5	2026	26	10	15	10	0	0	7.8	80000	0	0	0	0	31391	6400	9600	2400	0	0	53809	0	90209	-5009	draft	\N	2026-06-05 10:56:13.701	\N	\N	2026-06-05 10:56:13.707565	2026-06-05 10:56:13.707565	1	0	0	5200	30000	0	0	9	0	0	0	70.61
712	617	92	5	2026	26	13	13	0	0	0	0	36500	0	0	0	0	15470	2920	4380	1095	0	0	21030	0	23950	12550	draft	\N	2026-06-05 03:43:11.81	\N	\N	2026-06-05 03:43:11.814463	2026-06-05 03:43:11.814463	0	0	0	0	0	0	0	9	0	0	0	92.18
715	595	92	5	2026	15	29	0	0	0	0	77	32500	0	0	0	15633	48133	2600	3900	975	0	0	0	0	2600	45533	draft	\N	2026-06-05 04:12:11.436	\N	\N	2026-06-05 04:12:11.441814	2026-06-05 04:12:11.441814	0	0	0	0	0	0	0	9	0	0	0	0
685	618	92	5	2026	26	0	26	0	0	0	0	160000	0	0	0	0	160000	0	0	0	600	0	0	0	600	159400	draft	\N	2026-06-04 10:39:14.875	\N	\N	2026-06-04 10:39:14.915964	2026-06-04 10:39:14.915964	0	0	0	0	0	0	0	9	0	0	0	0
687	596	92	5	2026	15	15	0	0	0	0	46	32500	0	0	0	9339	41839	2600	3900	975	0	0	0	0	7600	34239	draft	\N	2026-06-04 10:39:14.881	\N	\N	2026-06-04 10:39:14.915964	2026-06-04 10:39:14.915964	0	0	0	0	5000	0	0	9	0	0	0	0
688	597	92	5	2026	15	14	1	0	1	0	39	32500	0	0	0	7918	39335	2513	3770	943	0	0	1083	0	2513	36822	draft	\N	2026-06-04 10:39:14.884	\N	\N	2026-06-04 10:39:14.915964	2026-06-04 10:39:14.915964	0	0	0	0	0	0	0	9	0	0	0	0
689	598	92	5	2026	26	17	9	9	0	0	8	55000	0	0	0	0	22501	4400	6600	1650	0	0	36166	0	40566	18101	draft	\N	2026-06-04 10:39:14.885	\N	\N	2026-06-04 10:39:14.915964	2026-06-04 10:39:14.915964	0	0	0	3667	0	0	0	9	0	0	0	73.13
690	599	92	5	2026	26	19	7	19	0	0	5.72	120000	0	0	0	0	61331	9600	14400	3600	0	0	62959	0	97559	26731	draft	\N	2026-06-04 10:39:14.885	\N	\N	2026-06-04 10:39:14.915964	2026-06-04 10:39:14.915964	0	0	0	4290	25000	0	0	9	0	0	0	104.23
692	601	92	5	2026	26	12	10	12	4	0	0	31500	0	0	0	0	6918	2520	3780	945	0	0	24582	0	27102	4398	draft	\N	2026-06-04 10:39:14.885	\N	\N	2026-06-04 10:39:14.915964	2026-06-04 10:39:14.915964	0	0	0	0	0	0	0	9	0	0	0	49.39
693	602	92	5	2026	26	20	6	20	0	0	2.83	35000	0	0	0	0	10722	2800	4200	1050	0	0	25103	0	42903	-7078	draft	\N	2026-06-04 10:39:14.886	\N	\N	2026-06-04 10:39:14.915964	2026-06-04 10:39:14.915964	0	0	0	825	15000	0	0	9	0	0	0	64.17
694	603	92	5	2026	26	18	8	18	0	0	5.77	100000	0	0	0	0	37815	8000	12000	3000	0	0	66385	0	74385	29815	draft	\N	2026-06-04 10:39:14.886	\N	\N	2026-06-04 10:39:14.915964	2026-06-04 10:39:14.915964	0	0	0	4200	0	0	0	9	0	0	0	76.66
695	604	92	5	2026	26	12	11	12	3	0	0	35000	0	0	0	0	12672	2800	4200	1050	0	0	22328	0	25128	9872	draft	\N	2026-06-04 10:39:14.886	\N	\N	2026-06-04 10:39:14.915964	2026-06-04 10:39:14.915964	0	0	0	0	0	0	0	9	0	0	0	79.72
696	605	92	5	2026	26	22	4	22	0	0	24	60000	0	0	0	0	33326	4800	7200	1800	0	0	36674	0	53974	16026	draft	\N	2026-06-04 10:39:14.886	\N	\N	2026-06-04 10:39:14.915964	2026-06-04 10:39:14.915964	0	0	0	10000	12500	0	0	9	0	0	0	84.97
697	606	93	5	2026	26	0	26	0	0	0	0	33000	0	0	0	0	0	2640	3960	990	0	0	33000	0	35640	-2640	draft	\N	2026-06-04 10:39:14.886	\N	\N	2026-06-04 10:39:14.915964	2026-06-04 10:39:14.915964	0	0	0	0	0	0	0	9	0	0	0	0
698	607	92	5	2026	26	13	12	3	1	0	2.68	53500	0	0	0	0	16042	4280	6420	1605	0	0	38653	0	47933	6762	draft	\N	2026-06-04 10:39:14.886	\N	\N	2026-06-04 10:39:14.915964	2026-06-04 10:39:14.915964	0	0	0	1195	5000	0	0	9	0	0	0	60.94
699	608	92	5	2026	26	12	14	2	0	0	7.9	34500	0	0	0	0	13964	2760	4140	1035	0	0	22807	0	35567	1204	draft	\N	2026-06-04 10:39:14.887	\N	\N	2026-06-04 10:39:14.915964	2026-06-04 10:39:14.915964	0	0	0	2271	10000	0	0	9	0	0	0	72.31
700	609	92	5	2026	26	17	9	10	0	0	2.8	37500	0	0	0	0	14042	3000	4500	1125	0	0	24114	0	27114	11042	draft	\N	2026-06-04 10:39:14.887	\N	\N	2026-06-04 10:39:14.915964	2026-06-04 10:39:14.915964	0	0	0	656	0	0	0	9	0	0	0	78.53
701	610	92	5	2026	26	15	11	15	0	0	10.65	37500	0	0	0	0	13693	3000	4500	1125	0	0	26510	0	34510	5693	draft	\N	2026-06-04 10:39:14.887	\N	\N	2026-06-04 10:39:14.915964	2026-06-04 10:39:14.915964	0	0	0	2703	5000	0	0	9	0	0	0	66.58
702	611	93	5	2026	26	18	8	8	0	0	5.43	41500	0	0	0	0	18576	3320	4980	1245	0	0	24332	0	27652	15256	draft	\N	2026-06-04 10:39:14.887	\N	\N	2026-06-04 10:39:14.915964	2026-06-04 10:39:14.915964	0	0	0	1408	0	0	0	9	0	0	0	88.8
703	612	92	5	2026	26	1	25	1	0	0	0	80000	0	0	0	0	0	6400	9600	2400	0	0	80000	0	86400	-6400	draft	\N	2026-06-04 10:39:14.887	\N	\N	2026-06-04 10:39:14.915964	2026-06-04 10:39:14.915964	0	0	0	0	0	0	0	9	0	0	0	0
704	613	92	5	2026	26	7	19	7	0	0	0	120000	0	0	0	0	8590	9600	14400	3600	0	0	111410	0	121010	-1010	draft	\N	2026-06-04 10:39:14.887	\N	\N	2026-06-04 10:39:14.915964	2026-06-04 10:39:14.915964	0	0	0	0	0	0	0	9	0	0	0	16.75
705	614	92	5	2026	26	13	12	13	1	0	0	120000	0	0	0	0	14841	9600	14400	3600	0	0	105159	0	114759	5241	draft	\N	2026-06-04 10:39:14.888	\N	\N	2026-06-04 10:39:14.915964	2026-06-04 10:39:14.915964	0	0	0	0	0	0	0	9	0	0	0	28.94
706	615	93	5	2026	26	10	16	10	0	0	0	180000	0	0	0	0	18438	14400	21600	5400	1800	0	161562	0	177762	2238	draft	\N	2026-06-04 10:39:14.888	\N	\N	2026-06-04 10:39:14.915964	2026-06-04 10:39:14.915964	0	0	0	0	0	0	0	9	0	0	0	23.97
707	616	92	5	2026	26	5	21	5	0	0	0	120000	0	0	0	0	6600	9600	14400	3600	0	0	113400	0	123000	-3000	draft	\N	2026-06-04 10:39:14.888	\N	\N	2026-06-04 10:39:14.915964	2026-06-04 10:39:14.915964	0	0	0	0	0	0	0	9	0	0	0	12.87
709	619	93	5	2026	26	31	0	15	0	0	0	80000	0	0	0	0	11032	6400	9600	2400	0	0	68968	0	75368	4632	draft	\N	2026-06-04 10:39:14.888	\N	\N	2026-06-04 10:39:14.915964	2026-06-04 10:39:14.915964	0	0	0	0	0	0	0	9	0	0	0	32.27
720	594	92	5	2026	15	30	0	0	0	0	21	32500	0	0	0	2640.69	36766	2600	3900	975	0	0	0	0	2600	34166	draft	\N	2026-06-05 10:48:16.53	\N	\N	2026-06-05 10:48:16.537021	2026-06-05 10:48:16.537021	0	0	0	1625.04	0	0	0	9	0	0	0	0
319	600	92	6	2026	26	2	24	2	0	0	0	80000	0	0	0	0	0	0	0	0	0	0	80000	0	110000	-30000	draft	\N	2026-06-03 08:45:45.684	\N	\N	2026-06-03 08:45:45.693317	2026-06-03 08:45:45.693317	0	0	0	0	30000	0	0	9	0	0	0	0
\.


--
-- Data for Name: payroll_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payroll_settings (id, epf_employee_percent, epf_employer_percent, etf_employer_percent, transport_allowance, housing_allowance_low, housing_allowance_mid, housing_allowance_high, housing_mid_threshold, housing_high_threshold, other_allowances, overtime_multiplier, salary_scale, updated_at, employee_overrides, statutory_ot_multiplier, poya_ot_multiplier, public_holiday_ot_multiplier, off_day_ot_multiplier, off_season_enabled, off_season_start, off_season_end, lunch_incentive, lunch_incentive_per_day, off_season_months, apit_overrides, epf_etf_exempt_ids) FROM stdin;
1	8	12	3	0	0	0	0	50000	80000	0	1.5	{"General Manager":150000,"Operations Manager":120000,"F&B Manager":100000,"HR Manager":90000,"Accountant":75000,"Admin Officer":65000,"Kitchen Supervisor":60000,"Kitchen Staff":45000,"Room Supervisor":60000,"Room Attendant":45000,"Head Gardener":50000,"Gardener":40000,"Head Surf Instructor":60000,"Surf Instructor":45000,"Night Watcher":40000,"Security Officer":40000,"Cashier":42000,"Driver":38000}	2026-06-01 06:35:10.154	{"3":32500,"4":32500,"5":32500,"6":32500,"7":55000,"8":120000,"9":80000,"10":31500,"11":35000,"12":100000,"13":35000,"14":60000,"15":33000,"16":53500,"17":34500,"18":37500,"19":37500,"20":41500,"21":80000,"22":120000,"23":120000,"24":180000,"25":120000,"26":36500}	2	1.5	1.5	1.5	t			0	125	[5,6,7,8,9]	{"24":1800,"55":600,"615":1800,"618":600}	[55,618]
\.


--
-- Data for Name: salary_structures; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.salary_structures (id, name, currency, status, earnings, deductions, variable_pay, created_at, updated_at) FROM stdin;
1	EMP005 – K.D. Achintha Madushanith Nadeera	LKR	active	[{"component":"Basic","abbr":"BA","amount":55000,"dependsOn":"","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":""}]	[{"component":"EPF – Employee","abbr":"EPF_EE","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.08"},{"component":"EPF – Employer","abbr":"EPF_ER","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.12"},{"component":"ETF","abbr":"ETF","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.03"}]	[]	2026-05-28 16:30:28.459266	2026-05-28 16:30:28.459266
2	EMP014 – Ananda Silva	LKR	active	[{"component":"Basic","abbr":"BA","amount":53500,"dependsOn":"","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":""}]	[{"component":"EPF – Employee","abbr":"EPF_EE","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.08"},{"component":"EPF – Employer","abbr":"EPF_ER","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.12"},{"component":"ETF","abbr":"ETF","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.03"}]	[]	2026-05-28 16:30:53.812203	2026-05-28 16:30:53.812203
3	EMP015 – R.K. Kusumawathi	LKR	active	[{"component":"Basic","abbr":"BA","amount":34500,"dependsOn":"","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":""}]	[{"component":"EPF – Employee","abbr":"EPF_EE","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.08"},{"component":"EPF – Employer","abbr":"EPF_ER","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.12"},{"component":"ETF","abbr":"ETF","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.03"}]	[]	2026-05-28 16:31:07.59413	2026-05-28 16:31:07.59413
4	EMP016 – Chamil Asuntha Rathnayaka Koralege	LKR	active	[{"component":"Basic","abbr":"BA","amount":37500,"dependsOn":"","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":""}]	[{"component":"EPF – Employee","abbr":"EPF_EE","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.08"},{"component":"EPF – Employer","abbr":"EPF_ER","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.12"},{"component":"ETF","abbr":"ETF","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.03"}]	[]	2026-05-28 16:31:22.432497	2026-05-28 16:31:22.432497
5	EMP017 – G.S.Thimira Nethsara	LKR	active	[{"component":"Basic","abbr":"BA","amount":37500,"dependsOn":"","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":""}]	[{"component":"EPF – Employee","abbr":"EPF_EE","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.08"},{"component":"EPF – Employer","abbr":"EPF_ER","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.12"},{"component":"ETF","abbr":"ETF","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.03"}]	[]	2026-05-28 16:31:36.446814	2026-05-28 16:31:36.446814
6	EMP013 – Ashoka Damayanthi	LKR	active	[{"component":"Basic","abbr":"BA","amount":33000,"dependsOn":"","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":""}]	[{"component":"EPF – Employee","abbr":"EPF_EE","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.08"},{"component":"EPF – Employer","abbr":"EPF_ER","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.12"},{"component":"ETF","abbr":"ETF","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.03"}]	[]	2026-05-28 16:31:49.641078	2026-05-28 16:31:49.641078
7	EMP018 – Nimesh Dhananjaya	LKR	active	[{"component":"Basic","abbr":"BA","amount":41500,"dependsOn":"","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":""}]	[{"component":"EPF – Employee","abbr":"EPF_EE","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.08"},{"component":"EPF – Employer","abbr":"EPF_ER","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.12"},{"component":"ETF","abbr":"ETF","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.03"}]	[]	2026-05-28 16:32:06.640612	2026-05-28 16:32:06.640612
8	EMP008 – Ramayalatha W. Gunasekara	LKR	active	[{"component":"Basic","abbr":"BA","amount":31500,"dependsOn":"","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":""}]	[{"component":"EPF – Employee","abbr":"EPF_EE","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.08"},{"component":"EPF – Employer","abbr":"EPF_ER","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.12"},{"component":"ETF","abbr":"ETF","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.03"}]	[]	2026-05-28 16:32:21.086073	2026-05-28 16:32:21.086073
9	EMP009 – M A Kavishka	LKR	active	[{"component":"Basic","abbr":"BA","amount":35000,"dependsOn":"","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":""}]	[{"component":"EPF – Employee","abbr":"EPF_EE","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.08"},{"component":"EPF – Employer","abbr":"EPF_ER","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.12"},{"component":"ETF","abbr":"ETF","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.03"}]	[]	2026-05-28 16:32:32.261082	2026-05-28 16:32:32.261082
10	EMP011 – Inosha Lakmali	LKR	active	[{"component":"Basic","abbr":"BA","amount":35000,"dependsOn":"","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":""}]	[{"component":"EPF – Employee","abbr":"EPF_EE","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.08"},{"component":"EPF – Employer","abbr":"EPF_ER","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.12"},{"component":"ETF","abbr":"ETF","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.03"}]	[]	2026-05-28 16:32:47.370307	2026-05-28 16:32:47.370307
11	EMP024 – M.A. Jayantha	LKR	active	[{"component":"Basic","abbr":"BA","amount":36500,"dependsOn":"","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":""}]	[{"component":"EPF – Employee","abbr":"EPF_EE","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.08"},{"component":"EPF – Employer","abbr":"EPF_ER","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.12"},{"component":"ETF","abbr":"ETF","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.03"}]	[]	2026-05-28 16:33:18.567867	2026-05-28 16:33:18.567867
12	EMP019 – Lakshan Y. Wickramasinghe Mohotti	LKR	active	[{"component":"Basic","abbr":"BA","amount":80000,"dependsOn":"","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":""}]	[{"component":"EPF – Employee","abbr":"EPF_EE","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.08"},{"component":"EPF – Employer","abbr":"EPF_ER","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.12"},{"component":"ETF","abbr":"ETF","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.03"}]	[]	2026-05-28 16:33:38.903175	2026-05-28 16:33:38.903175
13	EMP001 – Anura Manamperi	LKR	active	[{"component":"Basic","abbr":"BA","amount":32500,"dependsOn":"","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":""}]	[{"component":"EPF – Employee","abbr":"EPF_EE","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.08"},{"component":"EPF – Employer","abbr":"EPF_ER","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.12"},{"component":"ETF","abbr":"ETF","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.03"}]	[]	2026-05-28 16:34:06.107991	2026-05-28 16:34:06.107991
14	EMP003 – V.A. Aberyatne	LKR	active	[{"component":"Basic","abbr":"BA","amount":32500,"dependsOn":"","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":""}]	[{"component":"EPF – Employee","abbr":"EPF_EE","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.08"},{"component":"EPF – Employer","abbr":"EPF_ER","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.12"},{"component":"ETF","abbr":"ETF","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.03"}]	[]	2026-05-28 16:34:14.090995	2026-05-28 16:34:14.090995
15	EMP004 – K.H. Udayasiri Sarath	LKR	active	[{"component":"Basic","abbr":"BA","amount":32500,"dependsOn":"","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":""}]	[{"component":"EPF – Employee","abbr":"EPF_EE","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.08"},{"component":"EPF – Employer","abbr":"EPF_ER","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.12"},{"component":"ETF","abbr":"ETF","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.03"}]	[]	2026-05-28 16:34:25.082472	2026-05-28 16:34:25.082472
16	EMP002 – K.A. Jayalath	LKR	active	[{"component":"Basic","abbr":"BA","amount":32500,"dependsOn":"","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":""}]	[{"component":"EPF – Employee","abbr":"EPF_EE","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.08"},{"component":"EPF – Employer","abbr":"EPF_ER","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.12"},{"component":"ETF","abbr":"ETF","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.03"}]	[]	2026-05-28 16:34:33.706147	2026-05-28 16:34:33.706147
17	EMP020 – Mari Chehan Chanuka Nambukara Wellalage	LKR	active	[{"component":"Basic","abbr":"BA","amount":120000,"dependsOn":"","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":""}]	[{"component":"EPF – Employee","abbr":"EPF_EE","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.08"},{"component":"EPF – Employer","abbr":"EPF_ER","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.12"},{"component":"ETF","abbr":"ETF","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.03"}]	[]	2026-05-28 16:34:52.452956	2026-05-28 16:34:52.452956
18	EMP021 – K Ridmika H Karunawardhana	LKR	active	[{"component":"Basic","abbr":"BA","amount":120000,"dependsOn":"","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":""}]	[{"component":"EPF – Employee","abbr":"EPF_EE","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.08"},{"component":"EPF – Employer","abbr":"EPF_ER","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.12"},{"component":"ETF","abbr":"ETF","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.03"}]	[]	2026-05-28 16:35:07.14744	2026-05-28 16:35:07.14744
20	EMP023 – Chathuni Amasha Ruwanpathirana	LKR	active	[{"component":"Basic","abbr":"BA","amount":120000,"dependsOn":"","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":""}]	[{"component":"EPF – Employee","abbr":"EPF_EE","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.08"},{"component":"EPF – Employer","abbr":"EPF_ER","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.12"},{"component":"ETF","abbr":"ETF","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.03"}]	[]	2026-05-28 16:35:36.883813	2026-05-28 16:35:36.883813
21	EMP006 – Anuradha Abeysinghe Bandara	LKR	active	[{"component":"Basic","abbr":"BA","amount":120000,"dependsOn":"","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":""}]	[{"component":"EPF – Employee","abbr":"EPF_EE","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.08"},{"component":"EPF – Employer","abbr":"EPF_ER","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.12"},{"component":"ETF","abbr":"ETF","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.03"}]	[]	2026-05-28 16:36:40.467763	2026-05-28 16:36:40.467763
19	EMP022 – Nadun Moni	LKR	active	[{"component":"Basic","abbr":"BA","amount":180000,"dependsOn":"","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":""}]	[{"component":"EPF – Employee","abbr":"EPF_EE","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.08"},{"component":"EPF – Employer","abbr":"EPF_ER","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.12"},{"component":"ETF","abbr":"ETF","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.03"}]	[]	2026-05-28 16:35:22.627011	2026-05-28 11:37:18.101
22	EMP007 – Achala A A S De Silva	LKR	active	[{"component":"Basic","abbr":"BA","amount":80000,"dependsOn":"","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":""}]	[{"component":"EPF – Employee","abbr":"EPF_EE","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.08"},{"component":"EPF – Employer","abbr":"EPF_ER","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.12"},{"component":"ETF","abbr":"ETF","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.03"}]	[]	2026-05-28 16:37:04.52796	2026-05-28 11:07:08.754
23	 – Raphael Amsler	LKR	active	[{"component":"Basic","abbr":"BA","amount":160000,"dependsOn":"","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":""}]	[{"component":"EPF – Employee","abbr":"EPF_EE","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.08"},{"component":"EPF – Employer","abbr":"EPF_ER","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.12"},{"component":"ETF","abbr":"ETF","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.03"}]	[]	2026-05-28 16:37:48.562086	2026-05-28 11:37:28.545
24	 – Raphael Amsler	LKR	active	[{"component":"Basic","abbr":"BA","amount":160000,"dependsOn":"","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":""}]	[{"component":"EPF – Employee","abbr":"EPF_EE","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.08"},{"component":"EPF – Employer","abbr":"EPF_ER","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.12"},{"component":"ETF","abbr":"ETF","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.03"}]	[]	2026-05-28 18:11:10.352402	2026-05-28 18:11:10.352402
49	BIO60 – Anura Manamperi	LKR	active	[{"component":"Basic","abbr":"BA","amount":32500,"dependsOn":"","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":""}]	[{"component":"EPF – Employee","abbr":"EPF_EE","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.08"},{"component":"EPF – Employer","abbr":"EPF_ER","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.12"},{"component":"ETF","abbr":"ETF","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.03"}]	[]	2026-05-28 18:24:53.61524	2026-05-28 18:24:53.61524
50	BIO20 – K.A. Jayalath	LKR	active	[{"component":"Basic","abbr":"BA","amount":32500,"dependsOn":"","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":""}]	[{"component":"EPF – Employee","abbr":"EPF_EE","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.08"},{"component":"EPF – Employer","abbr":"EPF_ER","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.12"},{"component":"ETF","abbr":"ETF","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.03"}]	[]	2026-05-28 18:24:53.61524	2026-05-28 18:24:53.61524
51	BIO44 – V.A. Aberyatne	LKR	active	[{"component":"Basic","abbr":"BA","amount":32500,"dependsOn":"","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":""}]	[{"component":"EPF – Employee","abbr":"EPF_EE","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.08"},{"component":"EPF – Employer","abbr":"EPF_ER","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.12"},{"component":"ETF","abbr":"ETF","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.03"}]	[]	2026-05-28 18:24:53.61524	2026-05-28 18:24:53.61524
52	BIO45 – K.H. Udayasiri Sarath	LKR	active	[{"component":"Basic","abbr":"BA","amount":32500,"dependsOn":"","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":""}]	[{"component":"EPF – Employee","abbr":"EPF_EE","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.08"},{"component":"EPF – Employer","abbr":"EPF_ER","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.12"},{"component":"ETF","abbr":"ETF","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.03"}]	[]	2026-05-28 18:24:53.61524	2026-05-28 18:24:53.61524
53	BIO49 – K.D. Achintha Madushanith Nadeera	LKR	active	[{"component":"Basic","abbr":"BA","amount":55000,"dependsOn":"","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":""}]	[{"component":"EPF – Employee","abbr":"EPF_EE","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.08"},{"component":"EPF – Employer","abbr":"EPF_ER","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.12"},{"component":"ETF","abbr":"ETF","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.03"}]	[]	2026-05-28 18:24:53.61524	2026-05-28 18:24:53.61524
54	BIO52 – Anuradha Abeysinghe Bandara	LKR	active	[{"component":"Basic","abbr":"BA","amount":120000,"dependsOn":"","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":""}]	[{"component":"EPF – Employee","abbr":"EPF_EE","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.08"},{"component":"EPF – Employer","abbr":"EPF_ER","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.12"},{"component":"ETF","abbr":"ETF","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.03"}]	[]	2026-05-28 18:24:53.61524	2026-05-28 18:24:53.61524
55	BIO55 – Achala A A S De Silva	LKR	active	[{"component":"Basic","abbr":"BA","amount":80000,"dependsOn":"","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":""}]	[{"component":"EPF – Employee","abbr":"EPF_EE","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.08"},{"component":"EPF – Employer","abbr":"EPF_ER","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.12"},{"component":"ETF","abbr":"ETF","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.03"}]	[]	2026-05-28 18:24:53.61524	2026-05-28 18:24:53.61524
56	BIO34 – Ramayalatha W. Gunasekara	LKR	active	[{"component":"Basic","abbr":"BA","amount":31500,"dependsOn":"","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":""}]	[{"component":"EPF – Employee","abbr":"EPF_EE","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.08"},{"component":"EPF – Employer","abbr":"EPF_ER","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.12"},{"component":"ETF","abbr":"ETF","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.03"}]	[]	2026-05-28 18:24:53.61524	2026-05-28 18:24:53.61524
57	BIO58 – M A Kavishka	LKR	active	[{"component":"Basic","abbr":"BA","amount":35000,"dependsOn":"","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":""}]	[{"component":"EPF – Employee","abbr":"EPF_EE","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.08"},{"component":"EPF – Employer","abbr":"EPF_ER","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.12"},{"component":"ETF","abbr":"ETF","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.03"}]	[]	2026-05-28 18:24:53.61524	2026-05-28 18:24:53.61524
58	BIO57 – Pramila Chamod Wellehewa	LKR	active	[{"component":"Basic","abbr":"BA","amount":100000,"dependsOn":"","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":""}]	[{"component":"EPF – Employee","abbr":"EPF_EE","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.08"},{"component":"EPF – Employer","abbr":"EPF_ER","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.12"},{"component":"ETF","abbr":"ETF","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.03"}]	[]	2026-05-28 18:24:53.61524	2026-05-28 18:24:53.61524
59	BIO59 – Inosha Lakmali	LKR	active	[{"component":"Basic","abbr":"BA","amount":35000,"dependsOn":"","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":""}]	[{"component":"EPF – Employee","abbr":"EPF_EE","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.08"},{"component":"EPF – Employer","abbr":"EPF_ER","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.12"},{"component":"ETF","abbr":"ETF","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.03"}]	[]	2026-05-28 18:24:53.61524	2026-05-28 18:24:53.61524
60	BIO46 – H.K.Chamika Ruwan Kumara	LKR	active	[{"component":"Basic","abbr":"BA","amount":60000,"dependsOn":"","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":""}]	[{"component":"EPF – Employee","abbr":"EPF_EE","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.08"},{"component":"EPF – Employer","abbr":"EPF_ER","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.12"},{"component":"ETF","abbr":"ETF","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.03"}]	[]	2026-05-28 18:24:53.61524	2026-05-28 18:24:53.61524
61	BIO13 – Ashoka Damayanthi	LKR	active	[{"component":"Basic","abbr":"BA","amount":33000,"dependsOn":"","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":""}]	[{"component":"EPF – Employee","abbr":"EPF_EE","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.08"},{"component":"EPF – Employer","abbr":"EPF_ER","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.12"},{"component":"ETF","abbr":"ETF","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.03"}]	[]	2026-05-28 18:24:53.61524	2026-05-28 18:24:53.61524
62	BIO41 – Ananda Silva	LKR	active	[{"component":"Basic","abbr":"BA","amount":53500,"dependsOn":"","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":""}]	[{"component":"EPF – Employee","abbr":"EPF_EE","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.08"},{"component":"EPF – Employer","abbr":"EPF_ER","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.12"},{"component":"ETF","abbr":"ETF","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.03"}]	[]	2026-05-28 18:24:53.61524	2026-05-28 18:24:53.61524
63	BIO42 – R.K. Kusumawathi	LKR	active	[{"component":"Basic","abbr":"BA","amount":34500,"dependsOn":"","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":""}]	[{"component":"EPF – Employee","abbr":"EPF_EE","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.08"},{"component":"EPF – Employer","abbr":"EPF_ER","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.12"},{"component":"ETF","abbr":"ETF","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.03"}]	[]	2026-05-28 18:24:53.61524	2026-05-28 18:24:53.61524
64	BIO50 – Chamil Asuntha Rathnayaka Koralege	LKR	active	[{"component":"Basic","abbr":"BA","amount":37500,"dependsOn":"","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":""}]	[{"component":"EPF – Employee","abbr":"EPF_EE","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.08"},{"component":"EPF – Employer","abbr":"EPF_ER","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.12"},{"component":"ETF","abbr":"ETF","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.03"}]	[]	2026-05-28 18:24:53.61524	2026-05-28 18:24:53.61524
65	BIO47 – G.S.Thimira Nethsara	LKR	active	[{"component":"Basic","abbr":"BA","amount":37500,"dependsOn":"","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":""}]	[{"component":"EPF – Employee","abbr":"EPF_EE","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.08"},{"component":"EPF – Employer","abbr":"EPF_ER","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.12"},{"component":"ETF","abbr":"ETF","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.03"}]	[]	2026-05-28 18:24:53.61524	2026-05-28 18:24:53.61524
66	BIO18 – Nimesh Dhananjaya	LKR	active	[{"component":"Basic","abbr":"BA","amount":41500,"dependsOn":"","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":""}]	[{"component":"EPF – Employee","abbr":"EPF_EE","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.08"},{"component":"EPF – Employer","abbr":"EPF_ER","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.12"},{"component":"ETF","abbr":"ETF","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.03"}]	[]	2026-05-28 18:24:53.61524	2026-05-28 18:24:53.61524
67	BIO48 – Lakshan Y. Wickramasinghe Mohotti	LKR	active	[{"component":"Basic","abbr":"BA","amount":80000,"dependsOn":"","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":""}]	[{"component":"EPF – Employee","abbr":"EPF_EE","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.08"},{"component":"EPF – Employer","abbr":"EPF_ER","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.12"},{"component":"ETF","abbr":"ETF","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.03"}]	[]	2026-05-28 18:24:53.61524	2026-05-28 18:24:53.61524
68	BIO54 – Mari Chehan Chanuka Nambukara Wellalage	LKR	active	[{"component":"Basic","abbr":"BA","amount":120000,"dependsOn":"","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":""}]	[{"component":"EPF – Employee","abbr":"EPF_EE","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.08"},{"component":"EPF – Employer","abbr":"EPF_ER","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.12"},{"component":"ETF","abbr":"ETF","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.03"}]	[]	2026-05-28 18:24:53.61524	2026-05-28 18:24:53.61524
69	BIO56 – K Ridmika H Karunawardhana	LKR	active	[{"component":"Basic","abbr":"BA","amount":120000,"dependsOn":"","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":""}]	[{"component":"EPF – Employee","abbr":"EPF_EE","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.08"},{"component":"EPF – Employer","abbr":"EPF_ER","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.12"},{"component":"ETF","abbr":"ETF","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.03"}]	[]	2026-05-28 18:24:53.61524	2026-05-28 18:24:53.61524
70	BIO5 – Nadun Moni	LKR	active	[{"component":"Basic","abbr":"BA","amount":180000,"dependsOn":"","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":""}]	[{"component":"EPF – Employee","abbr":"EPF_EE","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.08"},{"component":"EPF – Employer","abbr":"EPF_ER","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.12"},{"component":"ETF","abbr":"ETF","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.03"}]	[]	2026-05-28 18:24:53.61524	2026-05-28 18:24:53.61524
71	BIO53 – Chathuni Amasha Ruwanpathirana	LKR	active	[{"component":"Basic","abbr":"BA","amount":120000,"dependsOn":"","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":""}]	[{"component":"EPF – Employee","abbr":"EPF_EE","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.08"},{"component":"EPF – Employer","abbr":"EPF_ER","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.12"},{"component":"ETF","abbr":"ETF","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.03"}]	[]	2026-05-28 18:24:53.61524	2026-05-28 18:24:53.61524
72	BIO9 – M.A. Jayantha	LKR	active	[{"component":"Basic","abbr":"BA","amount":36500,"dependsOn":"","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":""}]	[{"component":"EPF – Employee","abbr":"EPF_EE","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.08"},{"component":"EPF – Employer","abbr":"EPF_ER","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.12"},{"component":"ETF","abbr":"ETF","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.03"}]	[]	2026-05-28 18:24:53.61524	2026-05-28 18:24:53.61524
73	20 – Anuradha Abeysinghe Bandara	LKR	active	[{"component":"Basic","abbr":"BA","amount":80000,"dependsOn":"","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":""}]	[{"component":"EPF – Employee","abbr":"EPF_EE","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.08"},{"component":"EPF – Employer","abbr":"EPF_ER","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.12"},{"component":"ETF","abbr":"ETF","amount":0,"dependsOn":"basic","isTaxApplicable":false,"amountBasedOn":"Basic Salary","formula":"basic * 0.03"}]	[]	2026-06-01 06:42:52.445652	2026-06-01 06:42:52.445652
\.


--
-- Data for Name: shifts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.shifts (id, name, type, start_time1, end_time1, start_time2, end_time2, grace_minutes, overtime_threshold, is_active, created_at, category, weekly_schedule) FROM stdin;
15	Kitchen Shift	normal	07:00	21:00	\N	\N	10	30	t	2026-05-28 18:15:58.18363	REGULAR	[\n    {"startTime":"08:00","endTime":"20:00","lunchBreakMinutes":60,"isOff":false,"isHalfDay":false},\n    {"startTime":"07:00","endTime":"21:00","lunchBreakMinutes":120,"isOff":false,"isHalfDay":false},\n    {"startTime":"07:00","endTime":"21:00","lunchBreakMinutes":120,"isOff":false,"isHalfDay":false},\n    {"startTime":"07:00","endTime":"21:00","lunchBreakMinutes":120,"isOff":false,"isHalfDay":false},\n    {"startTime":"07:00","endTime":"21:00","lunchBreakMinutes":120,"isOff":false,"isHalfDay":false},\n    {"startTime":"07:00","endTime":"21:00","lunchBreakMinutes":120,"isOff":false,"isHalfDay":false},\n    {"startTime":"08:00","endTime":"14:00","lunchBreakMinutes":0,"isOff":false,"isHalfDay":true}\n  ]
17	Flexible Shift	normal	08:00	17:00	\N	\N	60	30	t	2026-05-28 18:16:56.072492	REGULAR	\N
18	Regular Shift	normal	08:00	17:00	\N	\N	15	30	t	2026-05-28 18:16:56.072492	REGULAR	\N
19	Receptionist Shift	normal	08:30	17:30	\N	\N	10	30	t	2026-05-28 18:16:56.072492	REGULAR	\N
16	Night Watcher Shift	normal	20:00	05:00	\N	\N	10	30	t	2026-05-28 18:16:56.072492	REGULAR	\N
\.


--
-- Data for Name: staff_incentives; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.staff_incentives (id, employee_id, month, year, type, amount, reason, status, notes, created_at, updated_at) FROM stdin;
85	598	5	2026	lunch	125	Auto: 1 day(s) × Rs.125 — 2026-05	pending	\N	2026-06-01 06:44:49.830707	2026-06-01 06:44:49.830707
87	600	5	2026	lunch	1375	Auto: 11 day(s) × Rs.125 — 2026-05	pending	\N	2026-06-01 06:44:49.830707	2026-06-01 06:44:49.830707
88	601	5	2026	lunch	1500	Auto: 12 day(s) × Rs.125 — 2026-05	pending	\N	2026-06-01 06:44:49.830707	2026-06-01 06:44:49.830707
89	602	5	2026	lunch	2500	Auto: 20 day(s) × Rs.125 — 2026-05	pending	\N	2026-06-01 06:44:49.830707	2026-06-01 06:44:49.830707
90	603	5	2026	lunch	2250	Auto: 18 day(s) × Rs.125 — 2026-05	pending	\N	2026-06-01 06:44:49.830707	2026-06-01 06:44:49.830707
91	604	5	2026	lunch	1625	Auto: 13 day(s) × Rs.125 — 2026-05	pending	\N	2026-06-01 06:44:49.830707	2026-06-01 06:44:49.830707
92	605	5	2026	lunch	2750	Auto: 22 day(s) × Rs.125 — 2026-05	pending	\N	2026-06-01 06:44:49.830707	2026-06-01 06:44:49.830707
93	607	5	2026	lunch	1625	Auto: 13 day(s) × Rs.125 — 2026-05	pending	\N	2026-06-01 06:44:49.830707	2026-06-01 06:44:49.830707
94	608	5	2026	lunch	1500	Auto: 12 day(s) × Rs.125 — 2026-05	pending	\N	2026-06-01 06:44:49.830707	2026-06-01 06:44:49.830707
95	609	5	2026	lunch	2125	Auto: 17 day(s) × Rs.125 — 2026-05	pending	\N	2026-06-01 06:44:49.830707	2026-06-01 06:44:49.830707
96	610	5	2026	lunch	1750	Auto: 14 day(s) × Rs.125 — 2026-05	pending	\N	2026-06-01 06:44:49.830707	2026-06-01 06:44:49.830707
98	612	5	2026	lunch	125	Auto: 1 day(s) × Rs.125 — 2026-05	pending	\N	2026-06-01 06:44:49.830707	2026-06-01 06:44:49.830707
99	613	5	2026	lunch	875	Auto: 7 day(s) × Rs.125 — 2026-05	pending	\N	2026-06-01 06:44:49.830707	2026-06-01 06:44:49.830707
100	614	5	2026	lunch	1500	Auto: 12 day(s) × Rs.125 — 2026-05	pending	\N	2026-06-01 06:44:49.830707	2026-06-01 06:44:49.830707
101	615	5	2026	lunch	1250	Auto: 10 day(s) × Rs.125 — 2026-05	pending	\N	2026-06-01 06:44:49.830707	2026-06-01 06:44:49.830707
102	616	5	2026	lunch	625	Auto: 5 day(s) × Rs.125 — 2026-05	pending	\N	2026-06-01 06:44:49.830707	2026-06-01 06:44:49.830707
103	617	5	2026	lunch	1625	Auto: 13 day(s) × Rs.125 — 2026-05	pending	\N	2026-06-01 06:44:49.830707	2026-06-01 06:44:49.830707
104	606	6	2026	lunch	2625	dates 21*125	pending	\N	2026-06-04 09:59:08.031581	2026-06-04 10:01:11.897
81	594	5	2026	lunch	2500	Auto: 20 day(s) × Rs.125 — 2026-05	paid	\N	2026-06-01 06:44:49.830707	2026-06-05 10:45:32.463
82	595	5	2026	lunch	1875	Auto: 15 day(s) × Rs.125 — 2026-05	pending	\N	2026-06-01 06:44:49.830707	2026-06-04 04:31:38.772
86	599	5	2026	lunch	0	Auto: 18 day(s) × Rs.125 — 2026-05	pending	\N	2026-06-01 06:44:49.830707	2026-06-04 09:56:48.678
97	611	5	2026	lunch	2250	Auto: 18 day(s) × Rs.125 — 2026-05	pending	\N	2026-06-01 06:44:49.830707	2026-06-04 09:58:03.247
84	597	5	2026	lunch	1749.98	Auto: 14 day(s) × Rs.125 — 2026-05	pending	\N	2026-06-01 06:44:49.830707	2026-06-04 10:00:08.059
83	596	5	2026	lunch	1875	Auto: 15 day(s) × Rs.125 — 2026-05	pending	\N	2026-06-01 06:44:49.830707	2026-06-04 10:00:45.561
\.


--
-- Data for Name: staff_loans; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.staff_loans (id, employee_id, type, total_amount, monthly_installment, start_month, start_year, paid_amount, remaining_balance, status, description, created_at, updated_at) FROM stdin;
12	596	advance	60000	5000	1	2026	45000	15000	active	\N	2026-06-01 06:21:16.080725	2026-06-04 10:39:14.933
16	599	advance	50000	25000	4	2026	50000	0	completed	\N	2026-06-03 10:12:03.309879	2026-06-04 10:39:14.935
14	602	advance	150000	15000	3	2026	135000	15000	active	\N	2026-06-01 06:22:18.638154	2026-06-04 10:39:14.938
15	605	loan	100000	12500	11	2025	87500	12500	active	\N	2026-06-03 10:07:20.053514	2026-06-04 10:39:14.94
10	607	advance	60000	5000	1	2026	45000	15000	active	\N	2026-06-01 06:19:06.469205	2026-06-04 10:39:14.942
13	608	advance	120000	10000	1	2026	90000	30000	active	\N	2026-06-01 06:21:43.63592	2026-06-04 10:39:14.944
11	610	advance	60000	5000	1	2026	45000	15000	active	\N	2026-06-01 06:20:50.814075	2026-06-04 10:39:14.945
17	600	advance	360000	30000	1	2026	150000	210000	active	\N	2026-06-03 10:13:04.759428	2026-06-05 10:56:13.712
\.


--
-- Data for Name: system_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.system_settings (id, organization_name, organization_code, working_days, timezone, late_threshold_minutes, half_day_threshold_hours, overtime_threshold_hours, auto_mark_absent, biometric_sync_interval, zk_push_server_url, zk_push_api_key, updated_at) FROM stdin;
3	Drivethru	DT	["monday","tuesday","wednesday","thursday","friday","saturday"]	Asia/Colombo	15	4	8	f	5	http://0.0.0.0:8765	\N	2026-05-28 17:56:56.402399
\.


--
-- Data for Name: system_users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.system_users (id, username, full_name, email, password_hash, role, branch_ids, is_active, last_login, created_at) FROM stdin;
7	admin	Super Administrator	admin@slpost.lk	f5f307912c8ba24592c96c7468c5af3d097f441a45128eae14329dcc8ee9ac1c	super_admin	[]	t	2026-06-05 10:33:27.235	2026-05-28 17:56:57.643076
11	srilanka@drivethru.de	Achala A A S De Silva	srilanka@drivethru.de	df5b26ec87f357d3cc24e1dc81178c73838b007d1bb4ab975874e3bb06f3d338	super_admin	[92,93]	t	2026-06-05 11:05:58.335	2026-05-28 18:29:54.171985
\.


--
-- Data for Name: weekoff_schedules; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.weekoff_schedules (id, name, description, off_days, half_days, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Name: activity_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.activity_logs_id_seq', 47, true);


--
-- Name: attendance_records_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.attendance_records_id_seq', 4914, true);


--
-- Name: biometric_devices_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.biometric_devices_id_seq', 12010, true);


--
-- Name: biometric_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.biometric_logs_id_seq', 4968, true);


--
-- Name: branches_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.branches_id_seq', 93, true);


--
-- Name: companies_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.companies_id_seq', 1, false);


--
-- Name: departments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.departments_id_seq', 9, true);


--
-- Name: designations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.designations_id_seq', 1, false);


--
-- Name: employee_salary_assignments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.employee_salary_assignments_id_seq', 73, true);


--
-- Name: employees_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.employees_id_seq', 619, true);


--
-- Name: holidays_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.holidays_id_seq', 49, true);


--
-- Name: hr_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.hr_settings_id_seq', 1, false);


--
-- Name: leave_balances_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.leave_balances_id_seq', 42, true);


--
-- Name: loan_emi_ledger_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.loan_emi_ledger_id_seq', 128, true);


--
-- Name: manual_salary_entries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.manual_salary_entries_id_seq', 1, false);


--
-- Name: ot_adjustments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.ot_adjustments_id_seq', 4, true);


--
-- Name: payroll_records_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.payroll_records_id_seq', 721, true);


--
-- Name: payroll_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.payroll_settings_id_seq', 1, true);


--
-- Name: salary_structures_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.salary_structures_id_seq', 73, true);


--
-- Name: shifts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.shifts_id_seq', 19, true);


--
-- Name: staff_incentives_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.staff_incentives_id_seq', 104, true);


--
-- Name: staff_loans_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.staff_loans_id_seq', 17, true);


--
-- Name: system_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.system_settings_id_seq', 3, true);


--
-- Name: system_users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.system_users_id_seq', 11, true);


--
-- Name: weekoff_schedules_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.weekoff_schedules_id_seq', 1, false);


--
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);


--
-- Name: attendance_records attendance_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_pkey PRIMARY KEY (id);


--
-- Name: biometric_devices biometric_devices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.biometric_devices
    ADD CONSTRAINT biometric_devices_pkey PRIMARY KEY (id);


--
-- Name: biometric_devices biometric_devices_serial_number_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.biometric_devices
    ADD CONSTRAINT biometric_devices_serial_number_unique UNIQUE (serial_number);


--
-- Name: biometric_logs biometric_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.biometric_logs
    ADD CONSTRAINT biometric_logs_pkey PRIMARY KEY (id);


--
-- Name: branches branches_code_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_code_unique UNIQUE (code);


--
-- Name: branches branches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_pkey PRIMARY KEY (id);


--
-- Name: companies companies_code_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_code_unique UNIQUE (code);


--
-- Name: companies companies_name_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_name_unique UNIQUE (name);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: departments departments_code_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_code_unique UNIQUE (code);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: designations designations_code_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.designations
    ADD CONSTRAINT designations_code_unique UNIQUE (code);


--
-- Name: designations designations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.designations
    ADD CONSTRAINT designations_pkey PRIMARY KEY (id);


--
-- Name: employee_salary_assignments employee_salary_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_salary_assignments
    ADD CONSTRAINT employee_salary_assignments_pkey PRIMARY KEY (id);


--
-- Name: employees employees_employee_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_employee_id_unique UNIQUE (employee_id);


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);


--
-- Name: holidays holidays_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.holidays
    ADD CONSTRAINT holidays_pkey PRIMARY KEY (id);


--
-- Name: hr_settings hr_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_settings
    ADD CONSTRAINT hr_settings_pkey PRIMARY KEY (id);


--
-- Name: leave_balances leave_balances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_balances
    ADD CONSTRAINT leave_balances_pkey PRIMARY KEY (id);


--
-- Name: loan_emi_ledger loan_emi_ledger_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loan_emi_ledger
    ADD CONSTRAINT loan_emi_ledger_pkey PRIMARY KEY (id);


--
-- Name: manual_salary_entries manual_salary_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manual_salary_entries
    ADD CONSTRAINT manual_salary_entries_pkey PRIMARY KEY (id);


--
-- Name: ot_adjustments ot_adjustments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ot_adjustments
    ADD CONSTRAINT ot_adjustments_pkey PRIMARY KEY (id);


--
-- Name: payroll_records payroll_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_records
    ADD CONSTRAINT payroll_records_pkey PRIMARY KEY (id);


--
-- Name: payroll_settings payroll_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_settings
    ADD CONSTRAINT payroll_settings_pkey PRIMARY KEY (id);


--
-- Name: salary_structures salary_structures_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salary_structures
    ADD CONSTRAINT salary_structures_pkey PRIMARY KEY (id);


--
-- Name: shifts shifts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shifts
    ADD CONSTRAINT shifts_pkey PRIMARY KEY (id);


--
-- Name: staff_incentives staff_incentives_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_incentives
    ADD CONSTRAINT staff_incentives_pkey PRIMARY KEY (id);


--
-- Name: staff_loans staff_loans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_loans
    ADD CONSTRAINT staff_loans_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (id);


--
-- Name: system_users system_users_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_users
    ADD CONSTRAINT system_users_email_unique UNIQUE (email);


--
-- Name: system_users system_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_users
    ADD CONSTRAINT system_users_pkey PRIMARY KEY (id);


--
-- Name: system_users system_users_username_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_users
    ADD CONSTRAINT system_users_username_unique UNIQUE (username);


--
-- Name: weekoff_schedules weekoff_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weekoff_schedules
    ADD CONSTRAINT weekoff_schedules_pkey PRIMARY KEY (id);


--
-- Name: idx_loan_emi_ledger_loan_month; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_loan_emi_ledger_loan_month ON public.loan_emi_ledger USING btree (loan_id, month, year);


--
-- Name: idx_loan_emi_ledger_month_year; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_loan_emi_ledger_month_year ON public.loan_emi_ledger USING btree (month, year);


--
-- Name: activity_logs activity_logs_user_id_system_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_user_id_system_users_id_fk FOREIGN KEY (user_id) REFERENCES public.system_users(id) ON DELETE SET NULL;


--
-- Name: attendance_records attendance_records_branch_id_branches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_branch_id_branches_id_fk FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: attendance_records attendance_records_employee_id_employees_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_employee_id_employees_id_fk FOREIGN KEY (employee_id) REFERENCES public.employees(id);


--
-- Name: biometric_devices biometric_devices_branch_id_branches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.biometric_devices
    ADD CONSTRAINT biometric_devices_branch_id_branches_id_fk FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: biometric_logs biometric_logs_device_id_biometric_devices_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.biometric_logs
    ADD CONSTRAINT biometric_logs_device_id_biometric_devices_id_fk FOREIGN KEY (device_id) REFERENCES public.biometric_devices(id);


--
-- Name: biometric_logs biometric_logs_employee_id_employees_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.biometric_logs
    ADD CONSTRAINT biometric_logs_employee_id_employees_id_fk FOREIGN KEY (employee_id) REFERENCES public.employees(id);


--
-- Name: branches branches_company_id_companies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_company_id_companies_id_fk FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: branches branches_parent_id_branches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_parent_id_branches_id_fk FOREIGN KEY (parent_id) REFERENCES public.branches(id);


--
-- Name: designations designations_department_id_departments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.designations
    ADD CONSTRAINT designations_department_id_departments_id_fk FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- Name: employee_salary_assignments employee_salary_assignments_employee_id_employees_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_salary_assignments
    ADD CONSTRAINT employee_salary_assignments_employee_id_employees_id_fk FOREIGN KEY (employee_id) REFERENCES public.employees(id);


--
-- Name: employee_salary_assignments employee_salary_assignments_salary_structure_id_salary_structur; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_salary_assignments
    ADD CONSTRAINT employee_salary_assignments_salary_structure_id_salary_structur FOREIGN KEY (salary_structure_id) REFERENCES public.salary_structures(id);


--
-- Name: employees employees_branch_id_branches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_branch_id_branches_id_fk FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: employees employees_company_id_companies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_company_id_companies_id_fk FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: employees employees_shift_id_shifts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_shift_id_shifts_id_fk FOREIGN KEY (shift_id) REFERENCES public.shifts(id);


--
-- Name: employees employees_weekoff_schedule_id_weekoff_schedules_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_weekoff_schedule_id_weekoff_schedules_id_fk FOREIGN KEY (weekoff_schedule_id) REFERENCES public.weekoff_schedules(id);


--
-- Name: leave_balances leave_balances_employee_id_employees_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_balances
    ADD CONSTRAINT leave_balances_employee_id_employees_id_fk FOREIGN KEY (employee_id) REFERENCES public.employees(id);


--
-- Name: loan_emi_ledger loan_emi_ledger_loan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loan_emi_ledger
    ADD CONSTRAINT loan_emi_ledger_loan_id_fkey FOREIGN KEY (loan_id) REFERENCES public.staff_loans(id) ON DELETE CASCADE;


--
-- Name: manual_salary_entries manual_salary_entries_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manual_salary_entries
    ADD CONSTRAINT manual_salary_entries_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: manual_salary_entries manual_salary_entries_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manual_salary_entries
    ADD CONSTRAINT manual_salary_entries_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id);


--
-- Name: ot_adjustments ot_adjustments_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ot_adjustments
    ADD CONSTRAINT ot_adjustments_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id);


--
-- Name: payroll_records payroll_records_branch_id_branches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_records
    ADD CONSTRAINT payroll_records_branch_id_branches_id_fk FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: payroll_records payroll_records_employee_id_employees_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_records
    ADD CONSTRAINT payroll_records_employee_id_employees_id_fk FOREIGN KEY (employee_id) REFERENCES public.employees(id);


--
-- Name: staff_incentives staff_incentives_employee_id_employees_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_incentives
    ADD CONSTRAINT staff_incentives_employee_id_employees_id_fk FOREIGN KEY (employee_id) REFERENCES public.employees(id);


--
-- Name: staff_loans staff_loans_employee_id_employees_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_loans
    ADD CONSTRAINT staff_loans_employee_id_employees_id_fk FOREIGN KEY (employee_id) REFERENCES public.employees(id);


--
-- PostgreSQL database dump complete
--

\unrestrict oGhW49JDsLEeTTTTOB0c0JlWidSyndGFdJPLx3npOkaPKF3v5NjyWVPhaaS3DQO

