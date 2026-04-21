import {
  Plus,
  Minus,
  Equal,
  ChevronDown,
  ChevronRight,
  Info,
  Calculator,
  TrendingUp,
  TrendingDown,
  Banknote,
  Clock,
  CalendarOff,
  Star,
  AlertTriangle,
  Moon,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

/* ─────────── small helpers ─────────── */
const fmt = (n: number) =>
  "Rs " + n.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function Row({
  label,
  formula,
  value,
  color = "text-gray-800",
  sub,
  bold,
  indent,
}: {
  label: string;
  formula?: string;
  value: number | string;
  color?: string;
  sub?: string;
  bold?: boolean;
  indent?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-[1fr_auto_auto] gap-3 items-start py-2.5 border-b border-gray-100 last:border-0",
        indent && "pl-5",
        bold && "bg-gray-50 rounded-lg px-3"
      )}
    >
      <div>
        <span className={cn("text-sm", bold ? "font-semibold text-gray-800" : "text-gray-700")}>
          {label}
        </span>
        {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
      </div>
      {formula ? (
        <code className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-mono whitespace-nowrap">
          {formula}
        </code>
      ) : (
        <div />
      )}
      <div className={cn("text-sm font-semibold tabular-nums text-right whitespace-nowrap", color)}>
        {typeof value === "number" ? fmt(value) : value}
      </div>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  color,
  bg,
  children,
  defaultOpen = true,
}: {
  title: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={cn("rounded-2xl border-2 overflow-hidden mb-5", bg)}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left"
      >
        <div className={cn("p-2 rounded-lg bg-white shadow-sm shrink-0", color)}>
          <Icon className="w-4 h-4" />
        </div>
        <span className={cn("font-semibold text-base flex-1", color.replace("text-", "text-").replace("-600", "-800").replace("-700", "-800"))}>
          {title}
        </span>
        {open ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}

/* ─────────── example values ─────────── */
const eg = {
  basic: 45000,
  transport: 3500,
  lunch: 1000,
  housing: 2000,
  other: 500,
  otHours: 6.5,
  otRate: 45000 / (22 * 9),         // basic / (working days * required hours)
  otPay: Math.round((45000 / (22 * 9)) * 6.5 * 1.5),
  holidayOt: 0,
  offDayOt: 0,
  absenceDays: 1,
  absenceDeduction: Math.round(45000 / 22),
  lateMins: 18,
  lateDeduction: Math.round((45000 / (22 * 9 * 60)) * 18),
  lunchLate: 0,
  halfDay: 0,
  incomplete: 0,
};

eg.otPay = Math.round((eg.basic / (22 * 9)) * eg.otHours * 1.5);

const grossSalary =
  eg.basic + eg.transport + eg.lunch + eg.housing + eg.other +
  eg.otPay + eg.holidayOt + eg.offDayOt -
  eg.absenceDeduction - eg.lateDeduction - eg.lunchLate - eg.halfDay - eg.incomplete;

const epfEmp = Math.round(grossSalary * 0.08);
const epfEmployer = Math.round(grossSalary * 0.12);
const etf = Math.round(grossSalary * 0.03);

function calcAPIT(gross: number): number {
  const annual = gross * 12;
  let tax = 0;
  const slabs = [
    { limit: 1800000, rate: 0 },
    { limit: 1200000, rate: 0.06 },
    { limit: 1200000, rate: 0.12 },
    { limit: 1200000, rate: 0.18 },
    { limit: 1200000, rate: 0.24 },
    { limit: Infinity, rate: 0.30 },
  ];
  let remaining = annual;
  for (const slab of slabs) {
    if (remaining <= 0) break;
    const taxable = Math.min(remaining, slab.limit);
    tax += taxable * slab.rate;
    remaining -= taxable;
  }
  return Math.round(tax / 12);
}

const apit = calcAPIT(grossSalary);
const loanDeduction = 5000;
const otherDeductions = 0;
const netSalary = grossSalary - epfEmp - apit - loanDeduction - otherDeductions;

/* ─────────── APIT slab table data ─────────── */
const APIT_SLABS = [
  { annual: "Up to Rs 1,800,000", rate: "0%", note: "Tax-free threshold" },
  { annual: "Rs 1,800,001 – 3,000,000", rate: "6%", note: "Next Rs 1.2M" },
  { annual: "Rs 3,000,001 – 4,200,000", rate: "12%", note: "Next Rs 1.2M" },
  { annual: "Rs 4,200,001 – 5,400,000", rate: "18%", note: "Next Rs 1.2M" },
  { annual: "Rs 5,400,001 – 6,600,000", rate: "24%", note: "Next Rs 1.2M" },
  { annual: "Above Rs 6,600,000", rate: "30%", note: "Remaining balance" },
];

const OT_MODES = [
  {
    name: "Hours-Based (Standard)",
    desc: "Most employees",
    formula: "OT Hours = max(0, Total Worked Hours − OT Threshold)\nOT Pay = OT Hours × (Basic ÷ (Working Days × Required Hours)) × 1.5",
    example: "Employee works 10.5 hrs, threshold = 9.5 hrs → OT = 1.0 hr\nOT Pay = 1.0 × (45,000 ÷ (22×9)) × 1.5 = Rs 341",
  },
  {
    name: "Time-Based (Kitchen / Night Watch)",
    desc: "Roles with a fixed OT clock time",
    formula: "OT Hours = max(0, Clock-Out Time − OT Start Time)\nOT Pay = OT Hours × Hourly Rate × 1.5",
    example: "Employee clocks out at 22:00, OT start = 20:30 → OT = 1.5 hrs\nOT Pay = 1.5 × hourly rate × 1.5",
  },
];

/* ─────────── main component ─────────── */
export default function SalaryBreakdown() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-3 rounded-2xl bg-emerald-100">
            <Calculator className="w-7 h-7 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Salary Calculation Format</h1>
            <p className="text-gray-500 text-sm">
              Full breakdown of how every employee's monthly salary is computed
            </p>
          </div>
        </div>

        {/* Master formula card */}
        <div className="bg-gray-900 text-white rounded-2xl p-5 mt-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Master Formula</p>
          <div className="space-y-2 font-mono text-sm">
            <div className="flex items-start gap-3">
              <span className="text-emerald-400 font-bold w-4 shrink-0">+</span>
              <span className="text-white">Basic Salary + Transport + Lunch + Housing + Other Allowances</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-blue-400 font-bold w-4 shrink-0">+</span>
              <span className="text-blue-200">Overtime Pay + Holiday OT Pay + Off-Day OT Pay + Incentives</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-red-400 font-bold w-4 shrink-0">−</span>
              <span className="text-red-200">Absence + Late + Lunch-Late + Half-Day + Incomplete Hours</span>
            </div>
            <div className="border-t border-gray-700 my-2" />
            <div className="flex items-start gap-3">
              <span className="text-yellow-400 font-bold w-4 shrink-0">=</span>
              <span className="text-yellow-200 font-semibold">GROSS SALARY</span>
            </div>
            <div className="flex items-start gap-3 mt-1">
              <span className="text-red-400 font-bold w-4 shrink-0">−</span>
              <span className="text-red-200">EPF (Employee 8%) + APIT + Loan Installments + Other Deductions</span>
            </div>
            <div className="border-t border-gray-700 my-2" />
            <div className="flex items-start gap-3">
              <span className="text-green-400 font-bold w-4 shrink-0">=</span>
              <span className="text-green-300 font-bold text-base">NET SALARY (Take-Home)</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── WORKED EXAMPLE ── */}
      <div className="bg-white border-2 border-emerald-200 rounded-2xl p-5 mb-5">
        <div className="flex items-center gap-2 mb-4">
          <Star className="w-5 h-5 text-amber-500" />
          <h2 className="font-bold text-gray-800">Worked Example — Employee: Nimal Seneviratne</h2>
          <span className="ml-auto text-xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full">Basic Salary: Rs 45,000 · April 2026</span>
        </div>

        {/* Step 1 — Earnings */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <h3 className="font-semibold text-emerald-700 text-sm uppercase tracking-wide">Step 1 — Earnings (Additions)</h3>
          </div>
          <div className="bg-emerald-50 rounded-xl px-4 py-1">
            <Row label="Basic Salary" value={eg.basic} sub="Employee salary master rate" />
            <Row label="Transport Allowance" formula="Fixed — from Payroll Settings" value={eg.transport} indent />
            <Row label="Lunch Incentive" formula="Fixed — from Payroll Settings" value={eg.lunch} indent />
            <Row label="Housing Allowance" formula="Tier based on Basic Salary" value={eg.housing} indent sub="Basic ≥ Rs 40,000 → Mid-tier rate" />
            <Row label="Other Allowances" value={eg.other} indent />
            <Row label="Overtime Pay" formula={`${eg.otHours}h × (45000÷(22×9)) × 1.5`} value={eg.otPay} color="text-blue-700" indent sub={`${eg.otHours} OT hours this month`} />
            <Row label="Holiday OT / Off-Day OT" value={0} indent />
            <Row label="Incentives" value={0} indent sub="No incentive this month" />
            <div className="border-t-2 border-emerald-300 mt-1 pt-2">
              <Row
                label="Total Earnings"
                value={eg.basic + eg.transport + eg.lunch + eg.housing + eg.other + eg.otPay}
                color="text-emerald-700"
                bold
              />
            </div>
          </div>
        </div>

        {/* Step 2 — Attendance Deductions */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-red-500" />
            <h3 className="font-semibold text-red-600 text-sm uppercase tracking-wide">Step 2 — Attendance Deductions (Subtractions)</h3>
          </div>
          <div className="bg-red-50 rounded-xl px-4 py-1">
            <Row
              label="Absence Deduction"
              formula="Basic ÷ Working Days × Absent Days"
              value={eg.absenceDeduction}
              color="text-red-600"
              sub={`Rs 45,000 ÷ 22 × 1 day = Rs ${eg.absenceDeduction.toLocaleString()}`}
            />
            <Row
              label="Late Deduction"
              formula="Late Minutes × (Hourly Rate ÷ 60)"
              value={eg.lateDeduction}
              color="text-red-600"
              sub={`${eg.lateMins} late minutes this month`}
              indent
            />
            <Row label="Lunch Return Late Deduction" value={0} indent />
            <Row label="Half-Day Deduction" value={0} indent />
            <Row label="Incomplete Hours Deduction" value={0} indent />
            <div className="border-t-2 border-red-200 mt-1 pt-2">
              <Row
                label="Total Attendance Deductions"
                value={eg.absenceDeduction + eg.lateDeduction}
                color="text-red-600"
                bold
              />
            </div>
          </div>
        </div>

        {/* Step 3 — Gross */}
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 mb-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Equal className="w-5 h-5 text-amber-600" />
              <span className="font-bold text-amber-800 text-base">GROSS SALARY</span>
            </div>
            <span className="text-xl font-bold text-amber-700">{fmt(grossSalary)}</span>
          </div>
          <p className="text-xs text-amber-600 mt-1">= Total Earnings − Attendance Deductions</p>
        </div>

        {/* Step 4 — Statutory & Other Deductions */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <Banknote className="w-4 h-4 text-violet-600" />
            <h3 className="font-semibold text-violet-700 text-sm uppercase tracking-wide">Step 3 — Statutory & Other Deductions from Gross</h3>
          </div>
          <div className="bg-violet-50 rounded-xl px-4 py-1">
            <Row
              label="EPF — Employee Contribution"
              formula="Gross × 8%"
              value={epfEmp}
              color="text-violet-700"
              sub={`Rs ${grossSalary.toLocaleString()} × 8% = Rs ${epfEmp.toLocaleString()}`}
            />
            <Row
              label="APIT (Income Tax)"
              formula="Annual tax slabs ÷ 12"
              value={apit}
              color="text-violet-700"
              sub={`Annual income Rs ${(grossSalary * 12).toLocaleString()} → tax slab applied`}
            />
            <Row
              label="Loan Installment Recovery"
              value={loanDeduction}
              color="text-violet-700"
              sub="Monthly deduction for active salary loan"
            />
            <Row label="Other Deductions" value={0} />
            <div className="border-t-2 border-violet-200 mt-1 pt-2">
              <Row
                label="Total Post-Gross Deductions"
                value={epfEmp + apit + loanDeduction}
                color="text-violet-700"
                bold
              />
            </div>
          </div>
        </div>

        {/* Step 5 — Net Salary */}
        <div className="bg-emerald-600 text-white rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Equal className="w-6 h-6" />
              <span className="font-bold text-xl">NET SALARY (Take-Home)</span>
            </div>
            <span className="text-3xl font-extrabold">{fmt(netSalary)}</span>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4 text-sm">
            <div className="bg-emerald-700 rounded-xl p-3">
              <div className="text-emerald-200 text-xs mb-0.5">EPF Employer</div>
              <div className="font-bold">{fmt(epfEmployer)}</div>
              <div className="text-emerald-300 text-xs">12% — paid by company</div>
            </div>
            <div className="bg-emerald-700 rounded-xl p-3">
              <div className="text-emerald-200 text-xs mb-0.5">ETF Employer</div>
              <div className="font-bold">{fmt(etf)}</div>
              <div className="text-emerald-300 text-xs">3% — paid by company</div>
            </div>
            <div className="bg-emerald-700 rounded-xl p-3">
              <div className="text-emerald-200 text-xs mb-0.5">Total Cost to Company</div>
              <div className="font-bold">{fmt(grossSalary + epfEmployer + etf)}</div>
              <div className="text-emerald-300 text-xs">Gross + Employer EPF + ETF</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── COMPONENT REFERENCE ── */}

      {/* Earnings */}
      <Section title="Earnings — All Components" icon={TrendingUp} color="text-emerald-600" bg="bg-emerald-50 border-emerald-200">
        <div className="space-y-3">
          {[
            { label: "Basic Salary", formula: "Set in Payroll Settings per employee or designation", note: "The base monthly pay. Everything else is calculated relative to this." },
            { label: "Transport Allowance", formula: "Fixed amount from Payroll Settings", note: "Flat amount added to every active employee's salary." },
            { label: "Lunch Incentive", formula: "Fixed amount from Payroll Settings", note: "Fixed daily meal support, paid monthly." },
            { label: "Housing Allowance", formula: "Tiered: Low / Mid / High based on Basic Salary thresholds", note: "Three tiers. E.g., Basic ≥ Rs 50,000 → High tier. Configured in Payroll Settings." },
            { label: "Other Allowances", formula: "Defined in salary structure per employee", note: "Any additional custom allowance assigned to the employee." },
            { label: "Overtime Pay (OT)", formula: "OT Hours × (Basic ÷ (Working Days × Required Hours)) × 1.5", note: "Only hours beyond the OT threshold count. See OT section for details." },
            { label: "Holiday OT Pay", formula: "OT Hours on public holiday × Hourly Rate × 1.5", note: "Working on a public holiday earns OT from the first hour." },
            { label: "Off-Day OT Pay", formula: "OT Hours on week-off day × Hourly Rate × 1.5", note: "Working on a Saturday/Sunday earns OT from the first hour." },
            { label: "Incentives", formula: "One-time amounts added via the Incentives module", note: "Performance bonuses, festival bonuses, etc., are included in the payslip additions." },
          ].map(({ label, formula, note }) => (
            <div key={label} className="bg-white rounded-xl border border-emerald-200 p-4">
              <div className="flex items-start justify-between gap-3 mb-1">
                <span className="font-semibold text-gray-800 text-sm">{label}</span>
                <Plus className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
              </div>
              <code className="text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded block mb-1.5 font-mono">{formula}</code>
              <p className="text-xs text-gray-500">{note}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Attendance Deductions */}
      <Section title="Attendance Deductions" icon={CalendarOff} color="text-red-600" bg="bg-red-50 border-red-200">
        <div className="space-y-3">
          {[
            { label: "Absence Deduction", formula: "Basic Salary ÷ Working Days × Absent Days", note: "Absent days are full no-pay deductions. Working days default is 22 but can be configured per month." },
            { label: "Late Deduction", formula: "Late Minutes × (Basic ÷ (Working Days × Shift Hours × 60))", note: "Only applies after the grace period (e.g., after 15 minutes). Configured in HR Settings." },
            { label: "Lunch Return Late Deduction", formula: "Lunch Late Minutes × (Hourly Rate ÷ 60)", note: "Triggered when the employee returns from lunch after the allowed break duration. Requires Lunch Return Late to be enabled in HR Settings." },
            { label: "Half-Day Deduction", formula: "Basic ÷ Working Days ÷ 2", note: "Applied when an employee is marked as half-day absent or leaves before half the shift is completed." },
            { label: "Incomplete Hours Deduction", formula: "(Required Hours − Effective Hours) × Minute Rate", note: "For fixed-shift employees only. Deducted when total worked hours fall short of the required shift hours, even if they clocked in and out." },
          ].map(({ label, formula, note }) => (
            <div key={label} className="bg-white rounded-xl border border-red-200 p-4">
              <div className="flex items-start justify-between gap-3 mb-1">
                <span className="font-semibold text-gray-800 text-sm">{label}</span>
                <Minus className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
              </div>
              <code className="text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded block mb-1.5 font-mono">{formula}</code>
              <p className="text-xs text-gray-500">{note}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Overtime modes */}
      <Section title="Overtime (OT) Calculation Modes" icon={Clock} color="text-blue-600" bg="bg-blue-50 border-blue-200">
        <div className="space-y-4">
          {OT_MODES.map((m, i) => (
            <div key={i} className="bg-white rounded-xl border border-blue-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                <span className="font-semibold text-gray-800">{m.name}</span>
                <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full ml-auto">{m.desc}</span>
              </div>
              <div className="bg-gray-900 rounded-lg p-3 mb-3">
                {m.formula.split("\n").map((line, li) => (
                  <p key={li} className="font-mono text-xs text-green-300">{line}</p>
                ))}
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-700 font-medium mb-0.5">Example:</p>
                {m.example.split("\n").map((line, li) => (
                  <p key={li} className="text-xs text-amber-700">{line}</p>
                ))}
              </div>
            </div>
          ))}
          <div className="bg-blue-100 rounded-xl p-4 text-sm text-blue-800">
            <strong>OT Multiplier:</strong> Always <strong>1.5×</strong> the normal hourly rate.<br />
            <strong>OT Threshold:</strong> Configured per shift/department in HR Settings. Default is shift hours + 0.5 h buffer.
          </div>
        </div>
      </Section>

      {/* Night Watcher — Security Department */}
      <Section title="Night Watcher (Security) — Special Payroll Rules" icon={Moon} color="text-indigo-600" bg="bg-indigo-50 border-indigo-200">
        <div className="space-y-4">
          <div className="bg-indigo-900 text-white rounded-xl p-4 text-sm">
            <p className="text-xs font-semibold text-indigo-300 uppercase tracking-wider mb-3">Night Watcher Payroll Formula</p>
            <div className="space-y-1.5 font-mono text-xs">
              <p className="text-indigo-200">Shift: 8:00 PM → 8:00 AM (next day) · 15 shifts / month</p>
              <div className="border-t border-indigo-700 my-2" />
              <p><span className="text-yellow-300">Daily Rate</span>   = Monthly Basic ÷ 30</p>
              <p><span className="text-yellow-300">Worked Shifts</span> = PRESENT × 1 + HALF DAY × 0.5</p>
              <p><span className="text-yellow-300">Leave Days</span>    = 15 − Worked Shifts</p>
              <p><span className="text-yellow-300">Leave Deduction</span>= Leave Days × Daily Rate</p>
              <p><span className="text-green-300 font-bold">Salary After Deduction</span> = Basic − Leave Deduction</p>
              <div className="border-t border-indigo-700 my-2" />
              <p><span className="text-blue-300">OT Hourly Rate</span> = Monthly Basic ÷ 240</p>
              <p><span className="text-blue-300">OT Rate</span>        = OT Hourly Rate × 1.5</p>
              <p><span className="text-blue-300">OT Amount</span>      = OT Hours × OT Rate</p>
              <div className="border-t border-indigo-700 my-2" />
              <p><span className="text-emerald-300">Total Earnings</span>= Salary After Deduction + OT Amount</p>
              <p className="text-indigo-300 text-[11px] mt-1">EPF / ETF are applied on Salary After Deduction ONLY — not on OT</p>
              <p><span className="text-red-300">EPF Employee 8%</span>= Salary After Deduction × 8%</p>
              <p><span className="text-red-300">EPF Employer 12%</span>= Salary After Deduction × 12%</p>
              <p><span className="text-red-300">ETF 3%</span>         = Salary After Deduction × 3%</p>
              <div className="border-t border-indigo-700 my-2" />
              <p><span className="text-green-400 font-bold">Net Salary</span>     = Total Earnings − EPF Employee (8%)</p>
            </div>
          </div>

          {/* Worked example matching the attached report */}
          <div className="bg-white rounded-xl border border-indigo-200 overflow-hidden">
          <div className="bg-indigo-50 px-4 py-2.5 border-b border-indigo-200">
            <p className="text-xs font-bold text-indigo-800">Worked Example (Illustration Only) — Anura Manamperi · February 2026</p>
            <p className="text-[11px] text-indigo-500">Sample values: Basic Rs.32,500 · Worked 13 PRESENT + 1 HALF DAY · OT 40.35 hrs</p>
            <p className="text-[11px] text-indigo-600 mt-1 font-medium">
              Actual payroll is always calculated from each employee&apos;s assigned salary structure and policy.
            </p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left px-4 py-2 text-gray-500 font-semibold text-xs">Section</th>
                  <th className="text-left px-4 py-2 text-gray-500 font-semibold text-xs">Component</th>
                  <th className="text-left px-4 py-2 text-gray-500 font-semibold text-xs">Formula</th>
                  <th className="text-right px-4 py-2 text-gray-500 font-semibold text-xs">Amount (LKR)</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { section: "BASIC", component: "Monthly Salary",         formula: "",                               amount: "32,500.00",   bold: false },
                  { section: "",      component: "Daily Rate",              formula: "32,500 ÷ 30",                    amount: "1,083.33",    bold: false },
                  { section: "",      component: "Leave Days",              formula: "15 − 13.5 worked",               amount: "1.5",         bold: false },
                  { section: "",      component: "Leave Deduction",         formula: "1.5 × 1,083.333",                amount: "1,625.00",    bold: false },
                  { section: "",      component: "Salary After Deduction",  formula: "32,500 − 1,625",                 amount: "30,875.00",   bold: true  },
                  { section: "OT",    component: "OT Hours",                formula: "",                               amount: "40.35",       bold: false },
                  { section: "",      component: "Hourly Rate",             formula: "32,500 ÷ 240",                   amount: "135.42",      bold: false },
                  { section: "",      component: "OT Rate (1.5×)",          formula: "135.42 × 1.5",                   amount: "203.13",      bold: false },
                  { section: "",      component: "OT Amount",               formula: "40.35 × 203.13",                 amount: "8,196.09",    bold: true  },
                  { section: "EARNINGS", component: "Total Earnings",      formula: "30,875.00 + 8,196.09",           amount: "39,071.09",   bold: true  },
                  { section: "DEDUCTION", component: "EPF Employee (8%)",   formula: "30,875 × 8%",                   amount: "2,470.00",    bold: false },
                  { section: "EMPLOYER",  component: "EPF Employer (12%)",  formula: "30,875 × 12%",                  amount: "3,705.00",    bold: false },
                  { section: "",          component: "ETF (3%)",            formula: "30,875 × 3%",                   amount: "926.25",      bold: false },
                  { section: "FINAL",     component: "Net Salary",          formula: "39,071.09 − 2,470",             amount: "36,601.09",   bold: true  },
                ].map((r, i) => (
                  <tr key={i} className={`border-b border-gray-100 last:border-0 ${r.bold ? "bg-indigo-50" : ""}`}>
                    <td className="px-4 py-2 font-bold text-xs text-indigo-700">{r.section}</td>
                    <td className={`px-4 py-2 text-xs ${r.bold ? "font-bold text-gray-900" : "text-gray-700"}`}>{r.component}</td>
                    <td className="px-4 py-2 font-mono text-[11px] text-blue-600">{r.formula}</td>
                    <td className={`px-4 py-2 text-right text-xs tabular-nums ${r.bold ? "font-bold text-gray-900" : "text-gray-700"}`}>{r.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 space-y-1">
            <p className="font-semibold">Key rules for Night Watcher payroll:</p>
            <ul className="list-disc list-inside space-y-0.5 mt-1">
              <li>Salary basis is always <strong>30 days</strong> — not actual working days in the month</li>
              <li>OT basis is <strong>240 hours</strong> (30 days × 8 hrs) — not days × shift hours</li>
              <li>No-record days are treated as <strong>off days</strong> (not absent) — only 15 shifts are scheduled</li>
              <li>EPF / ETF apply on <strong>Salary After Deduction only</strong> — OT is excluded from the EPF base</li>
              <li>ABSENT within the 15 shifts = Leave Day = salary deduction</li>
              <li>HALF DAY counts as 0.5 worked shift → 0.5 leave days deducted</li>
            </ul>
          </div>
        </div>
      </Section>

      {/* Statutory deductions */}
      <Section title="Statutory Deductions — EPF, ETF & APIT" icon={Banknote} color="text-violet-600" bg="bg-violet-50 border-violet-200">
        <div className="space-y-4">
          {/* EPF/ETF table */}
          <div className="bg-white rounded-xl border border-violet-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-violet-50 border-b border-violet-200">
                  <th className="text-left px-4 py-3 text-violet-700 font-semibold">Contribution</th>
                  <th className="text-left px-4 py-3 text-violet-700 font-semibold">Rate</th>
                  <th className="text-left px-4 py-3 text-violet-700 font-semibold">Formula</th>
                  <th className="text-left px-4 py-3 text-violet-700 font-semibold">Paid By</th>
                  <th className="text-left px-4 py-3 text-violet-700 font-semibold">Deducted from Pay?</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: "EPF — Employee", rate: "8%", formula: "Gross × 0.08", by: "Employee", deducted: "Yes" },
                  { name: "EPF — Employer", rate: "12%", formula: "Gross × 0.12", by: "Employer", deducted: "No — company bears this" },
                  { name: "ETF — Employer", rate: "3%", formula: "Gross × 0.03", by: "Employer", deducted: "No — company bears this" },
                ].map((r, i) => (
                  <tr key={i} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-gray-800">{r.name}</td>
                    <td className="px-4 py-3">
                      <span className="bg-violet-100 text-violet-700 font-bold px-2 py-0.5 rounded">{r.rate}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-blue-700 bg-blue-50 rounded px-2">{r.formula}</td>
                    <td className="px-4 py-3 text-gray-600">{r.by}</td>
                    <td className="px-4 py-3">
                      <span className={cn("text-xs px-2 py-0.5 rounded font-medium", r.deducted === "Yes" ? "bg-red-100 text-red-600" : "bg-green-100 text-green-700")}>
                        {r.deducted}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* APIT slabs */}
          <div>
            <h4 className="font-semibold text-violet-800 mb-2 text-sm">APIT (Advance Personal Income Tax) — Annual Tax Slabs</h4>
            <p className="text-xs text-gray-500 mb-3">
              APIT is calculated on annual gross income, then divided by 12 for monthly deduction. It uses progressive tax bands:
            </p>
            <div className="bg-white rounded-xl border border-violet-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-violet-50 border-b border-violet-200">
                    <th className="text-left px-4 py-2.5 text-violet-700 font-semibold text-xs">Annual Income Band</th>
                    <th className="text-left px-4 py-2.5 text-violet-700 font-semibold text-xs">Tax Rate</th>
                    <th className="text-left px-4 py-2.5 text-violet-700 font-semibold text-xs">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {APIT_SLABS.map((s, i) => (
                    <tr key={i} className="border-b border-gray-100 last:border-0">
                      <td className="px-4 py-2.5 text-gray-700 text-xs">{s.annual}</td>
                      <td className="px-4 py-2.5">
                        <span className={cn("font-bold text-xs px-2 py-0.5 rounded", i === 0 ? "bg-green-100 text-green-700" : "bg-red-50 text-red-700")}>
                          {s.rate}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs">{s.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-2 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <Star className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">Most employees on Rs 45,000/month have an annual income of Rs 540,000 — well below the Rs 1,800,000 threshold, meaning their APIT = Rs 0.</p>
            </div>
          </div>
        </div>
      </Section>

      {/* Loans & Incentives */}
      <Section title="Loans & Incentives" icon={Banknote} color="text-amber-600" bg="bg-amber-50 border-amber-200" defaultOpen={false}>
        <div className="space-y-3">
          <div className="bg-white rounded-xl border border-amber-200 p-4">
            <div className="font-semibold text-gray-800 mb-1">Loan Recovery</div>
            <code className="text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded block mb-2 font-mono">
              Deduction = min(Monthly Installment, Outstanding Balance)
            </code>
            <p className="text-xs text-gray-500">The system automatically deducts the configured monthly installment from Net Salary. When the outstanding balance is less than the installment, only the remaining balance is deducted. No manual entry needed each month.</p>
          </div>
          <div className="bg-white rounded-xl border border-amber-200 p-4">
            <div className="font-semibold text-gray-800 mb-1">Incentive Addition</div>
            <code className="text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded block mb-2 font-mono">
              Gross Salary includes all Incentives assigned for that payroll month
            </code>
            <p className="text-xs text-gray-500">Incentives are treated as earnings and appear before the Gross Salary line. They are included before EPF and APIT calculations, so they slightly increase statutory contributions.</p>
          </div>
        </div>
      </Section>

      {/* Quick reference */}
      <Section title="Quick Reference — All Rates at a Glance" icon={Info} color="text-gray-600" bg="bg-gray-50 border-gray-200" defaultOpen={false}>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "EPF (Employee)", value: "8% of Gross", color: "bg-red-100 text-red-700" },
            { label: "EPF (Employer)", value: "12% of Gross", color: "bg-orange-100 text-orange-700" },
            { label: "ETF (Employer)", value: "3% of Gross", color: "bg-yellow-100 text-yellow-700" },
            { label: "OT Multiplier", value: "1.5× Hourly Rate", color: "bg-blue-100 text-blue-700" },
            { label: "Absence Deduction", value: "Basic ÷ 22 per day", color: "bg-red-100 text-red-700" },
            { label: "Late Grace Period", value: "15 min (configurable)", color: "bg-gray-100 text-gray-700" },
            { label: "APIT Threshold", value: "Rs 1.8M/year (tax-free)", color: "bg-green-100 text-green-700" },
            { label: "Default Working Days", value: "22 days/month", color: "bg-gray-100 text-gray-700" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 p-3 flex items-center justify-between">
              <span className="text-sm text-gray-700">{label}</span>
              <span className={cn("text-xs font-bold px-2.5 py-1 rounded-full", color)}>{value}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <AlertTriangle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-700 space-y-1">
            <p><strong>Where to configure these values:</strong></p>
            <p>• Salary rates, allowances, and deduction amounts → <strong>Payroll Settings</strong></p>
            <p>• Grace period, OT threshold, lunch break rules → <strong>HR Settings</strong></p>
            <p>• Working days per month → <strong>Payroll Settings</strong></p>
            <p>• Loans and incentives → <strong>Loans & Advances</strong> / <strong>Incentives</strong> modules</p>
          </div>
        </div>
      </Section>
    </div>
  );
}
