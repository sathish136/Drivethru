import { useState, useEffect } from "react";
import { PageHeader, Card, Button, Input, Label } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  Percent, BadgeIndianRupee, Save, RefreshCw, Check,
  Edit2, X, Info, AlertTriangle, SlidersHorizontal, Users, ChevronRight,
  Search, UserCheck, Undo2, CalendarDays, ToggleLeft,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
function apiUrl(path: string) { return `${BASE}/api${path}`; }

/* ─── Salary Scale defaults ──────────────────────────────── */
const DEFAULT_SALARY_SCALE: Record<string, number> = {
  "General Manager":      150000,
  "Operations Manager":   120000,
  "F&B Manager":          100000,
  "HR Manager":            90000,
  "Accountant":            75000,
  "Admin Officer":         65000,
  "Kitchen Supervisor":    60000,
  "Kitchen Staff":         45000,
  "Room Supervisor":       60000,
  "Room Attendant":        45000,
  "Head Gardener":         50000,
  "Gardener":              40000,
  "Head Surf Instructor":  60000,
  "Surf Instructor":       45000,
  "Night Watcher":         40000,
  "Security Officer":      40000,
  "Cashier":               42000,
  "Driver":                38000,
};

/* ─── Types ──────────────────────────────────────────────── */
interface PayrollConfig {
  epfEmployeePercent: number; epfEmployerPercent: number; etfEmployerPercent: number;
  transportAllowance: number;
  lunchIncentivePerDay: number;
  housingAllowanceLow: number; housingAllowanceMid: number; housingAllowanceHigh: number;
  housingMidThreshold: number; housingHighThreshold: number;
  otherAllowances: number;
  overtimeMultiplier: number;
  statutoryOtMultiplier: number;
  poyaOtMultiplier: number;
  publicHolidayOtMultiplier: number;
  offDayOtMultiplier: number;
  offSeasonEnabled: boolean;
  offSeasonStart: string;
  offSeasonEnd: string;
  offSeasonMonths: number[];
  salaryScale: Record<string, number>; employeeOverrides: Record<string, number>;
}
const DEFAULTS: PayrollConfig = {
  epfEmployeePercent: 8, epfEmployerPercent: 12, etfEmployerPercent: 3,
  transportAllowance: 0,
  lunchIncentivePerDay: 125,
  housingAllowanceLow: 0, housingAllowanceMid: 0, housingAllowanceHigh: 0,
  housingMidThreshold: 50000, housingHighThreshold: 80000,
  otherAllowances: 0,
  overtimeMultiplier: 1.5,
  statutoryOtMultiplier: 2.0,
  poyaOtMultiplier: 1.5,
  publicHolidayOtMultiplier: 1.5,
  offDayOtMultiplier: 1.5,
  offSeasonEnabled: false,
  offSeasonStart: "",
  offSeasonEnd: "",
  offSeasonMonths: [5,6,7,8,9],
  salaryScale: { ...DEFAULT_SALARY_SCALE }, employeeOverrides: {},
};

interface Employee {
  id: number; employeeId: string; fullName: string;
  designation: string; department: string; employeeType: string; status: string;
}



/* ════════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════════ */
export default function PayrollSettings() {
  /* ── General Settings state ── */
  const [cfg, setCfg] = useState<PayrollConfig>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ── Fitment state ── */
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [empsLoading, setEmpsLoading] = useState(false);
  const [empSearch, setEmpSearch] = useState("");
  const [editingEmpId, setEditingEmpId] = useState<number | null>(null);
  const [editEmpVal, setEditEmpVal] = useState("");


  /* ─── Load payroll settings ─── */
  useEffect(() => {
    setLoading(true);
    fetch(apiUrl("/payroll-settings"))
      .then(r => r.json())
      .then(d => {
        if (d.id) {
          setCfg({
            epfEmployeePercent: d.epfEmployeePercent, epfEmployerPercent: d.epfEmployerPercent,
            etfEmployerPercent: d.etfEmployerPercent, transportAllowance: d.transportAllowance,
            lunchIncentivePerDay: d.lunchIncentivePerDay ?? 125,
            housingAllowanceLow: d.housingAllowanceLow, housingAllowanceMid: d.housingAllowanceMid,
            housingAllowanceHigh: d.housingAllowanceHigh, housingMidThreshold: d.housingMidThreshold,
            housingHighThreshold: d.housingHighThreshold, otherAllowances: d.otherAllowances,
            overtimeMultiplier: d.overtimeMultiplier ?? 1.5,
            statutoryOtMultiplier: d.statutoryOtMultiplier ?? 2.0,
            poyaOtMultiplier: d.poyaOtMultiplier ?? 1.5,
            publicHolidayOtMultiplier: d.publicHolidayOtMultiplier ?? 1.5,
            offDayOtMultiplier: d.offDayOtMultiplier ?? 1.5,
            offSeasonEnabled: d.offSeasonEnabled ?? false,
            offSeasonStart: d.offSeasonStart ?? "",
            offSeasonEnd: d.offSeasonEnd ?? "",
            offSeasonMonths: Array.isArray(d.offSeasonMonths) ? d.offSeasonMonths : (() => { try { return JSON.parse(d.offSeasonMonths ?? "[5,6,7,8,9]"); } catch { return [5,6,7,8,9]; } })(),
            salaryScale: d.salaryScale && typeof d.salaryScale === "object" ? d.salaryScale : { ...DEFAULT_SALARY_SCALE },
            employeeOverrides: d.employeeOverrides && typeof d.employeeOverrides === "object" ? d.employeeOverrides : {},
          });
        }
      })
      .catch(() => setError("Failed to load payroll settings"))
      .finally(() => setLoading(false));
  }, []);

  /* ─── Load employees for fitment ─── */
  useEffect(() => {
    if (employees.length > 0) return;
    setEmpsLoading(true);
    fetch(apiUrl("/employees"))
      .then(r => r.json())
      .then(d => setEmployees((d.employees ?? (Array.isArray(d) ? d : [])).filter((e: Employee) => e.status === "active")))
      .catch(() => setError("Failed to load employees"))
      .finally(() => setEmpsLoading(false));
  }, []);

  /* ─── General helpers ─── */
  function set(k: keyof PayrollConfig, v: any) { setCfg(s => ({ ...s, [k]: v })); }

  async function save() {
    setSaving(true); setError(null);
    try {
      const r = await fetch(apiUrl("/payroll-settings"), {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cfg),
      });
      const d = await r.json();
      if (d.id) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
      else setError(d.message || "Save failed");
    } catch { setError("Failed to save. Check server connection."); }
    setSaving(false);
  }

  function startEditEmp(emp: Employee) {
    setEditingEmpId(emp.id);
    setEditEmpVal(String(cfg.employeeOverrides[String(emp.id)] ?? cfg.salaryScale[emp.designation] ?? 40000));
  }
  function confirmEmpOverride(empId: number) {
    const v = parseInt(editEmpVal);
    if (!isNaN(v) && v > 0) setCfg(s => ({ ...s, employeeOverrides: { ...s.employeeOverrides, [String(empId)]: v } }));
    setEditingEmpId(null);
  }
  function clearEmpOverride(empId: number) {
    setCfg(s => { const next = { ...s.employeeOverrides }; delete next[String(empId)]; return { ...s, employeeOverrides: next }; });
    if (editingEmpId === empId) setEditingEmpId(null);
  }
  const filteredEmps = employees.filter(e =>
    `${e.fullName} ${e.employeeId} ${e.designation} ${e.department}`.toLowerCase().includes(empSearch.toLowerCase())
  );
  const overrideCount = Object.keys(cfg.employeeOverrides).length;

  /* ─── Loading state ─── */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-2 text-muted-foreground">
        <RefreshCw className="w-5 h-5 animate-spin" />
        <span className="text-sm">Loading payroll settings…</span>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-6xl">
      <PageHeader
        title="Payroll Settings"
        description="Configure salary structures, statutory contributions, allowances, and per-employee assignments"
      />

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm bg-red-50 text-red-700 border border-red-200">
          <AlertTriangle className="w-4 h-4 shrink-0" />{error}
          <button onClick={() => setError(null)} className="ml-auto p-0.5 rounded hover:bg-red-100"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* ══════════════════════════════════════════
          GENERAL SETTINGS
      ══════════════════════════════════════════ */}
      <div className="space-y-4">
          {/* Statutory Contributions */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-5 pb-3 border-b border-border">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <Percent className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-bold">Statutory Deductions & Contributions</p>
                <p className="text-xs text-muted-foreground">Applied automatically during payroll calculation</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                { key: "epfEmployeePercent", label: "EPF — Employee Contribution", hint: "Deducted from employee gross salary" },
                { key: "epfEmployerPercent", label: "EPF — Employer Contribution", hint: "Employer cost, not deducted from employee" },
                { key: "etfEmployerPercent", label: "ETF — Employer Contribution", hint: "Employees Trust Fund contribution" },
              ].map(({ key, label, hint }) => (
                <div key={key}>
                  <Label className="text-xs font-semibold">{label}</Label>
                  <div className="relative mt-1.5">
                    <Input type="number" step="0.01" min="0" max="100"
                      value={(cfg as any)[key]} onChange={e => set(key as keyof PayrollConfig, parseFloat(e.target.value))}
                      className="pr-8" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">%</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">{hint}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-700">
                <strong>APIT (income tax)</strong> is automatically calculated using Sri Lanka IRD progressive slabs (6%–30%) and cannot be manually configured.
              </p>
            </div>
          </Card>

          {/* Earnings & Allowances */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-5 pb-3 border-b border-border">
              <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                <BadgeIndianRupee className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-bold">Earnings & Allowances</p>
                <p className="text-xs text-muted-foreground">Fixed monthly amounts added on top of basic salary</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <Label className="text-xs font-semibold">Transport Allowance (Rs.)</Label>
                <Input type="number" min="0" value={cfg.transportAllowance}
                  onChange={e => set("transportAllowance", parseInt(e.target.value))} className="mt-1.5" />
                <p className="text-[10px] text-muted-foreground mt-1">Same fixed amount for all employees</p>
              </div>
              <div>
                <Label className="text-xs font-semibold">Lunch Incentive Per Day (Rs.)</Label>
                <Input type="number" min="0" value={cfg.lunchIncentivePerDay ?? 125}
                  onChange={e => set("lunchIncentivePerDay", parseInt(e.target.value))} className="mt-1.5" />
                <p className="text-[10px] text-muted-foreground mt-1">Rs. per working day (present + half days). Default: Rs. 125/day</p>
              </div>
              <div>
                <Label className="text-xs font-semibold">Other Allowances (Rs.)</Label>
                <Input type="number" min="0" value={cfg.otherAllowances}
                  onChange={e => set("otherAllowances", parseInt(e.target.value))} className="mt-1.5" />
                <p className="text-[10px] text-muted-foreground mt-1">Miscellaneous fixed allowances</p>
              </div>
            </div>
          </Card>

          {/* Deduction Rules */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-5 pb-3 border-b border-border">
              <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                <X className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-bold">Deduction Rules</p>
                <p className="text-xs text-muted-foreground">Auto-calculated from attendance data during payroll generation</p>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-muted/30 border border-border">
              <p className="text-xs font-semibold mb-3">All deductions are proportional — calculated automatically</p>
              <ul className="space-y-2 text-[11px] text-muted-foreground">
                <li><strong className="text-foreground">Late Arrival:</strong> Actual late minutes × (Basic ÷ Working Days ÷ 8 ÷ 60)</li>
                <li><strong className="text-foreground">Absence:</strong> (Basic ÷ Working Days) × Absent Days</li>
                <li><strong className="text-foreground">Half-day:</strong> (Daily Rate ÷ 2) × Half-day Count</li>
                <li><strong className="text-foreground">Incomplete Hours:</strong> Shortfall minutes × Minute Rate (exempt: Surf Instructors)</li>
              </ul>
              <p className="text-[10px] text-blue-600 mt-3 font-medium">Derived from attendance data — no manual configuration needed.</p>
            </div>
          </Card>

          {/* OT & Holiday Multipliers */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-5 pb-3 border-b border-border">
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                <CalendarDays className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-bold">OT & Holiday Multipliers</p>
                <p className="text-xs text-muted-foreground">Rate multipliers per overtime and holiday type</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { key: "overtimeMultiplier",         label: "Regular OT",      hint: "Normal working days" },
                { key: "offDayOtMultiplier",          label: "Off Day Worked",  hint: "Employee's day off" },
                { key: "poyaOtMultiplier",            label: "Poya Holiday",    hint: "Full moon / Poya days" },
                { key: "publicHolidayOtMultiplier",   label: "Public Holiday",  hint: "Government holidays" },
              ].map(({ key, label, hint }) => (
                <div key={key}>
                  <Label className="text-xs font-semibold">{label}</Label>
                  <div className="relative mt-1.5">
                    <Input type="number" step="0.1" min="1" max="5"
                      value={(cfg as any)[key]}
                      onChange={e => set(key as keyof PayrollConfig, parseFloat(e.target.value))}
                      className="pr-8" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">×</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">{hint}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-700">
                <strong>Statutory holidays</strong> always use <strong>2.0×</strong> (Daily Rate × 2) as required by Sri Lanka Labour Law. Night Watchers OT is capped at 3 hours per day.
              </p>
            </div>
          </Card>

          {/* Off-Season Mode */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <ToggleLeft className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold">Off-Season Mode</p>
                <p className="text-xs text-muted-foreground">Controls payroll rules for non-Night Watcher employees during off season months</p>
              </div>
              <button
                onClick={() => set("offSeasonEnabled", !cfg.offSeasonEnabled)}
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none",
                  cfg.offSeasonEnabled ? "bg-blue-600" : "bg-muted-foreground/30"
                )}
              >
                <span className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform",
                  cfg.offSeasonEnabled ? "translate-x-6" : "translate-x-1"
                )} />
              </button>
            </div>

            {/* Policy summary cards */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-2.5">
                <p className="text-[11px] font-bold text-blue-800 mb-1.5">Off Season Rules (all employees except Night Watcher)</p>
                <ul className="space-y-0.5 text-[10px] text-blue-700">
                  <li className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-300 inline-flex items-center justify-center text-white text-[8px]">✓</span> Full salary paid even if punch records are missing</li>
                  <li className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-300 inline-flex items-center justify-center text-white text-[8px]">✓</span> No overtime calculations</li>
                  <li className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-300 inline-flex items-center justify-center text-white text-[8px]">✓</span> No late arrival deductions</li>
                  <li className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-300 inline-flex items-center justify-center text-white text-[8px]">✓</span> No incomplete hours deductions</li>
                  <li className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-300 inline-flex items-center justify-center text-white text-[8px]">✓</span> Leave balance still tracked (manually approved)</li>
                  <li className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-300 inline-flex items-center justify-center text-white text-[8px]">✓</span> Loan / advance deductions continue</li>
                  <li className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-300 inline-flex items-center justify-center text-white text-[8px]">✓</span> EPF / ETF contributions continue</li>
                </ul>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5">
                <p className="text-[11px] font-bold text-amber-800 mb-1.5">Night Watcher — All Year Round (unaffected)</p>
                <ul className="space-y-0.5 text-[10px] text-amber-700">
                  <li className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-300 inline-flex items-center justify-center text-white text-[8px]">★</span> Full shift policy applies in all seasons</li>
                  <li className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-300 inline-flex items-center justify-center text-white text-[8px]">★</span> OT calculated (discrete 0/1/2/3 hrs)</li>
                  <li className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-300 inline-flex items-center justify-center text-white text-[8px]">★</span> Late arrival deductions apply</li>
                  <li className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-300 inline-flex items-center justify-center text-white text-[8px]">★</span> 15-shift schedule, 30-day salary basis</li>
                  <li className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-300 inline-flex items-center justify-center text-white text-[8px]">★</span> Off-season toggle does NOT affect Night Watcher</li>
                </ul>
              </div>
            </div>

            {(() => {
              const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
              const toggleMonth = (m: number) => {
                const current: number[] = cfg.offSeasonMonths ?? [5,6,7,8,9];
                const next = current.includes(m) ? current.filter(x => x !== m) : [...current, m].sort((a,b)=>a-b);
                set("offSeasonMonths", next);
              };
              const currentMonth = new Date().getMonth() + 1;
              const isCurrentMonthOff = (cfg.offSeasonMonths ?? [5,6,7,8,9]).includes(currentMonth);
              return (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-muted-foreground">
                      Click months to toggle between <span className="text-blue-600 font-medium">Off Season</span> and <span className="text-green-600 font-medium">Main Season</span>.
                    </p>
                    {cfg.offSeasonEnabled && (
                      <span className={cn(
                        "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                        isCurrentMonthOff
                          ? "bg-blue-100 text-blue-700"
                          : "bg-green-100 text-green-700"
                      )}>
                        Current month: {isCurrentMonthOff ? "Off Season" : "Main Season"}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {MONTHS.map((name, i) => {
                      const m = i + 1;
                      const isOff = (cfg.offSeasonMonths ?? [5,6,7,8,9]).includes(m);
                      const isCurrent = m === currentMonth;
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => toggleMonth(m)}
                          className={cn(
                            "py-2 rounded-lg text-xs font-semibold border transition-all relative",
                            isOff
                              ? "bg-blue-100 border-blue-300 text-blue-800 hover:bg-blue-200"
                              : "bg-green-50 border-green-200 text-green-800 hover:bg-green-100",
                            isCurrent && "ring-2 ring-offset-1 ring-primary"
                          )}
                        >
                          {name}
                          {isCurrent && <span className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-primary rounded-full border border-white" />}
                          <div className="text-[10px] font-normal opacity-70 mt-0.5">{isOff ? "Off" : "Main"}</div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-blue-300 inline-block"/> Off Season — May · Jun · Jul · Aug · Sep (default)</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-green-300 inline-block"/> Main Season — Jan · Feb · Mar · Apr · Oct · Nov · Dec (default)</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-primary inline-block"/> Current month</span>
                  </div>
                </div>
              );
            })()}
          </Card>
        </div>

      {/* ══════════════════════════════════════════
          SAVE BAR
      ══════════════════════════════════════════ */}
      <div className="flex items-center justify-between py-2 sticky bottom-0 bg-background/80 backdrop-blur border-t border-border mt-4 pt-4">
        <p className="text-xs text-muted-foreground">Changes take effect on the next payroll generation run.</p>
        <Button onClick={save} disabled={saving} className="flex items-center gap-2">
          {saving ? <><RefreshCw className="w-4 h-4 animate-spin" /> Saving…</> :
           saved  ? <><Check className="w-4 h-4 text-green-300" /> Saved!</> :
                    <><Save className="w-4 h-4" /> Save Payroll Settings</>}
        </Button>
      </div>
    </div>
  );
}

