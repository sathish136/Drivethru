import { useState, useEffect } from "react";
import { PageHeader, Card, Button, Input, Label } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  Percent, DollarSign, Save, RefreshCw, Check,
  Edit2, X, Info, AlertTriangle, SlidersHorizontal, Users, ChevronRight,
  Search, UserCheck, Undo2
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
function apiUrl(path: string) { return `${BASE}/api${path}`; }

const DEFAULT_SALARY_SCALE: Record<string, number> = {
  "Postmaster General": 150000, "Deputy Postmaster General": 120000,
  "Regional Postmaster": 80000, "Sub Postmaster": 60000,
  "Postal Supervisor": 55000, "Senior Postal Officer": 50000,
  "Postal Officer": 45000, "Counter Clerk": 40000,
  "Sorting Officer": 38000, "Delivery Agent": 35000,
  "Accounts Officer": 55000, "HR Officer": 50000, "IT Officer": 55000,
  "PSB Officer": 48000, "Driver": 38000, "Security Officer": 35000,
  "Clerical Assistant": 32000, "Data Entry Operator": 35000,
};

interface PayrollConfig {
  epfEmployeePercent: number;
  epfEmployerPercent: number;
  etfEmployerPercent: number;
  transportAllowance: number;
  housingAllowanceLow: number;
  housingAllowanceMid: number;
  housingAllowanceHigh: number;
  housingMidThreshold: number;
  housingHighThreshold: number;
  otherAllowances: number;
  lateDeductionPerInstance: number;
  overtimeMultiplier: number;
  salaryScale: Record<string, number>;
  employeeOverrides: Record<string, number>;
}

const DEFAULTS: PayrollConfig = {
  epfEmployeePercent: 8, epfEmployerPercent: 12, etfEmployerPercent: 3,
  transportAllowance: 5000,
  housingAllowanceLow: 3000, housingAllowanceMid: 7000, housingAllowanceHigh: 10000,
  housingMidThreshold: 50000, housingHighThreshold: 80000,
  otherAllowances: 1500, lateDeductionPerInstance: 100, overtimeMultiplier: 1.5,
  salaryScale: { ...DEFAULT_SALARY_SCALE },
  employeeOverrides: {},
};

type Tab = "general" | "fitment";

const TABS: { key: Tab; label: string; icon: React.ElementType; desc: string }[] = [
  { key: "general",  label: "General Settings",       icon: SlidersHorizontal, desc: "EPF/ETF, allowances & deductions" },
  { key: "fitment",  label: "Employee Fitment",        icon: Users,             desc: "Direct salary assignments per employee" },
];

interface Employee {
  id: number;
  employeeId: string;
  fullName: string;
  designation: string;
  department: string;
  employeeType: string;
  status: string;
}

export default function PayrollSettings() {
  const [tab, setTab] = useState<Tab>("general");
  const [cfg, setCfg] = useState<PayrollConfig>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [empsLoading, setEmpsLoading] = useState(false);
  const [empSearch, setEmpSearch] = useState("");
  const [editingEmpId, setEditingEmpId] = useState<number | null>(null);
  const [editEmpVal, setEditEmpVal] = useState("");

  useEffect(() => {
    setLoading(true);
    fetch(apiUrl("/payroll-settings"))
      .then(r => r.json())
      .then(d => {
        if (d.id) {
          setCfg({
            epfEmployeePercent: d.epfEmployeePercent,
            epfEmployerPercent: d.epfEmployerPercent,
            etfEmployerPercent: d.etfEmployerPercent,
            transportAllowance: d.transportAllowance,
            housingAllowanceLow: d.housingAllowanceLow,
            housingAllowanceMid: d.housingAllowanceMid,
            housingAllowanceHigh: d.housingAllowanceHigh,
            housingMidThreshold: d.housingMidThreshold,
            housingHighThreshold: d.housingHighThreshold,
            otherAllowances: d.otherAllowances,
            lateDeductionPerInstance: d.lateDeductionPerInstance,
            overtimeMultiplier: d.overtimeMultiplier,
            salaryScale: d.salaryScale && typeof d.salaryScale === "object" ? d.salaryScale : { ...DEFAULT_SALARY_SCALE },
            employeeOverrides: d.employeeOverrides && typeof d.employeeOverrides === "object" ? d.employeeOverrides : {},
          });
        }
      })
      .catch(() => setError("Failed to load payroll settings"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (tab !== "fitment" || employees.length > 0) return;
    setEmpsLoading(true);
    fetch(apiUrl("/employees"))
      .then(r => r.json())
      .then(d => setEmployees(Array.isArray(d) ? d.filter((e: Employee) => e.status === "active") : []))
      .catch(() => setError("Failed to load employees"))
      .finally(() => setEmpsLoading(false));
  }, [tab]);

  function set(k: keyof PayrollConfig, v: any) { setCfg(s => ({ ...s, [k]: v })); }

  async function save() {
    setSaving(true); setError(null);
    try {
      const r = await fetch(apiUrl("/payroll-settings"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cfg),
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
    if (!isNaN(v) && v > 0) {
      setCfg(s => ({ ...s, employeeOverrides: { ...s.employeeOverrides, [String(empId)]: v } }));
    }
    setEditingEmpId(null);
  }

  function clearEmpOverride(empId: number) {
    setCfg(s => {
      const next = { ...s.employeeOverrides };
      delete next[String(empId)];
      return { ...s, employeeOverrides: next };
    });
    if (editingEmpId === empId) setEditingEmpId(null);
  }

  const filteredEmps = employees.filter(e =>
    `${e.fullName} ${e.employeeId} ${e.designation} ${e.department}`.toLowerCase().includes(empSearch.toLowerCase())
  );

  const overrideCount = Object.keys(cfg.employeeOverrides).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-2 text-muted-foreground">
        <RefreshCw className="w-5 h-5 animate-spin" />
        <span className="text-sm">Loading payroll settings…</span>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <PageHeader
        title="Payroll Settings"
        description="Configure statutory contributions, allowances, salary scales, and per-employee fitments"
      />

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm bg-red-50 text-red-700 border border-red-200">
          <AlertTriangle className="w-4 h-4 shrink-0" />{error}
          <button onClick={() => setError(null)} className="ml-auto p-0.5 rounded hover:bg-red-100"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Tab Nav */}
      <div className="flex gap-1 p-1 bg-muted/50 rounded-xl border border-border w-fit">
        {TABS.map(({ key, label, icon: Icon, desc }) => (
          <button key={key} onClick={() => setTab(key)}
            className={cn(
              "flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
              tab === key
                ? "bg-white shadow-sm text-foreground border border-border"
                : "text-muted-foreground hover:text-foreground hover:bg-white/60"
            )}>
            <Icon className={cn("w-4 h-4", tab === key ? "text-primary" : "text-muted-foreground")} />
            <span>{label}</span>
            {key === "fitment" && overrideCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-primary/10 text-primary rounded-full">
                {overrideCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── General Settings Tab ─────────────────────────── */}
      {tab === "general" && (
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
                      value={(cfg as any)[key]}
                      onChange={e => set(key as keyof PayrollConfig, parseFloat(e.target.value))}
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
                <DollarSign className="w-4 h-4 text-green-600" />
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
                <Label className="text-xs font-semibold">Other Allowances (Rs.)</Label>
                <Input type="number" min="0" value={cfg.otherAllowances}
                  onChange={e => set("otherAllowances", parseInt(e.target.value))} className="mt-1.5" />
                <p className="text-[10px] text-muted-foreground mt-1">Miscellaneous fixed allowances</p>
              </div>
              <div>
                <Label className="text-xs font-semibold">Overtime Rate Multiplier</Label>
                <Input type="number" step="0.1" min="1" max="5" value={cfg.overtimeMultiplier}
                  onChange={e => set("overtimeMultiplier", parseFloat(e.target.value))} className="mt-1.5" />
                <p className="text-[10px] text-muted-foreground mt-1">e.g. 1.5× = 1.5× hourly rate per OT hour</p>
              </div>
            </div>
            <div className="mt-5">
              <p className="text-xs font-semibold mb-1">Housing Allowance — Salary-Based Tiers</p>
              <p className="text-[10px] text-muted-foreground mb-3">
                Each employee is placed in a tier based on their basic salary. The tier amount is added to their gross pay.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border border-border rounded-xl p-4 bg-muted/20">
                  <p className="text-xs font-bold text-muted-foreground mb-3 uppercase tracking-wide">Low Tier</p>
                  <Label className="text-[10px]">Allowance Amount (Rs.)</Label>
                  <Input type="number" min="0" value={cfg.housingAllowanceLow}
                    onChange={e => set("housingAllowanceLow", parseInt(e.target.value))} className="mt-1 h-8 text-sm" />
                  <p className="text-[10px] text-muted-foreground mt-2">For basic below Rs. {cfg.housingMidThreshold.toLocaleString()}</p>
                </div>
                <div className="border border-blue-200 rounded-xl p-4 bg-blue-50/30">
                  <p className="text-xs font-bold text-blue-600 mb-3 uppercase tracking-wide">Mid Tier</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label className="text-[10px]">Allowance (Rs.)</Label>
                      <Input type="number" min="0" value={cfg.housingAllowanceMid}
                        onChange={e => set("housingAllowanceMid", parseInt(e.target.value))} className="mt-1 h-8 text-sm" /></div>
                    <div><Label className="text-[10px]">Min. Basic (Rs.)</Label>
                      <Input type="number" min="0" value={cfg.housingMidThreshold}
                        onChange={e => set("housingMidThreshold", parseInt(e.target.value))} className="mt-1 h-8 text-sm" /></div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    {cfg.housingMidThreshold.toLocaleString()} – {cfg.housingHighThreshold.toLocaleString()}
                  </p>
                </div>
                <div className="border border-amber-200 rounded-xl p-4 bg-amber-50/30">
                  <p className="text-xs font-bold text-amber-600 mb-3 uppercase tracking-wide">High Tier</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label className="text-[10px]">Allowance (Rs.)</Label>
                      <Input type="number" min="0" value={cfg.housingAllowanceHigh}
                        onChange={e => set("housingAllowanceHigh", parseInt(e.target.value))} className="mt-1 h-8 text-sm" /></div>
                    <div><Label className="text-[10px]">Min. Basic (Rs.)</Label>
                      <Input type="number" min="0" value={cfg.housingHighThreshold}
                        onChange={e => set("housingHighThreshold", parseInt(e.target.value))} className="mt-1 h-8 text-sm" /></div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">Rs. {cfg.housingHighThreshold.toLocaleString()} and above</p>
                </div>
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
                <p className="text-xs text-muted-foreground">Rules applied for attendance violations</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <Label className="text-xs font-semibold">Late Arrival Deduction (Rs. per instance)</Label>
                <Input type="number" min="0" value={cfg.lateDeductionPerInstance}
                  onChange={e => set("lateDeductionPerInstance", parseInt(e.target.value))} className="mt-1.5" />
                <p className="text-[10px] text-muted-foreground mt-1">Deducted once for each late-arrival record in the month</p>
              </div>
              <div className="p-4 rounded-xl bg-muted/30 border border-border">
                <p className="text-xs font-semibold mb-2">Auto-Calculated Deductions</p>
                <ul className="space-y-1.5 text-[11px] text-muted-foreground">
                  <li><strong className="text-foreground">Absence:</strong> (Basic ÷ Working Days) × Absent Days</li>
                  <li><strong className="text-foreground">Half-day:</strong> (Daily Rate ÷ 2) × Half-day Count</li>
                </ul>
                <p className="text-[10px] text-blue-600 mt-2">Derived from attendance data, not configurable.</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── Employee Fitment Tab ─────────────────────────── */}
      {tab === "fitment" && (
        <div className="space-y-4">
          <Card className="p-4 bg-blue-50/40 border-blue-200">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                <UserCheck className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-blue-900">Employee Salary Fitment</p>
                <p className="text-xs text-blue-700 mt-0.5">
                  Assign a custom basic salary directly to specific employees. This overrides the designation-based salary scale
                  for that employee during payroll generation. Employees without an override use their designation's default salary.
                </p>
              </div>
            </div>
          </Card>

          {overrideCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20 text-xs text-primary font-medium">
              <UserCheck className="w-3.5 h-3.5" />
              {overrideCount} employee{overrideCount > 1 ? "s have" : " has"} a custom salary fitment applied
            </div>
          )}

          <Card className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, ID, designation or department…"
                  value={empSearch}
                  onChange={e => setEmpSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {filteredEmps.length} of {employees.length} employees
              </span>
            </div>

            {empsLoading ? (
              <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span className="text-sm">Loading employees…</span>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Employee</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Designation</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Scale Salary</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Fitment Salary</th>
                      <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground w-28">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredEmps.map(emp => {
                      const scaleSalary = cfg.salaryScale[emp.designation] ?? 40000;
                      const overrideSalary = cfg.employeeOverrides[String(emp.id)];
                      const hasOverride = overrideSalary !== undefined;
                      const isEditing = editingEmpId === emp.id;

                      return (
                        <tr key={emp.id} className={cn(
                          "transition-colors group",
                          hasOverride ? "bg-primary/3 hover:bg-primary/5" : "hover:bg-muted/30"
                        )}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                                <span className="text-[10px] font-bold text-muted-foreground">
                                  {emp.fullName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium text-sm leading-tight">{emp.fullName}</p>
                                <p className="text-[10px] text-muted-foreground">{emp.employeeId}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm">{emp.designation}</p>
                            <p className="text-[10px] text-muted-foreground">{emp.department}</p>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-sm text-muted-foreground">
                            Rs. {scaleSalary.toLocaleString("en-LK")}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {isEditing ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <Input
                                  type="number" value={editEmpVal}
                                  onChange={e => setEditEmpVal(e.target.value)}
                                  onKeyDown={e => { if (e.key === "Enter") confirmEmpOverride(emp.id); if (e.key === "Escape") setEditingEmpId(null); }}
                                  className="h-7 w-32 text-right text-sm font-mono" autoFocus
                                />
                                <button onClick={() => confirmEmpOverride(emp.id)} className="p-1 rounded bg-green-100 text-green-700 hover:bg-green-200">
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => setEditingEmpId(null)} className="p-1 rounded hover:bg-muted text-muted-foreground">
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : hasOverride ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <span className="font-mono font-bold text-sm text-primary">
                                  Rs. {overrideSalary.toLocaleString("en-LK")}
                                </span>
                                <span className="px-1.5 py-0.5 text-[9px] font-bold bg-primary/10 text-primary rounded-full uppercase tracking-wide">
                                  Fitment
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">— using scale default —</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {!isEditing && (
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => startEditEmp(emp)}
                                  className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                                  title={hasOverride ? "Edit fitment salary" : "Set fitment salary"}
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                {hasOverride && (
                                  <button
                                    onClick={() => clearEmpOverride(emp.id)}
                                    className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-muted-foreground hover:text-red-600"
                                    title="Remove fitment — revert to scale salary"
                                  >
                                    <Undo2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {filteredEmps.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground text-sm">
                          No employees match your search
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Save Bar */}
      <div className="flex items-center justify-between py-2 sticky bottom-0 bg-background/80 backdrop-blur border-t border-border mt-4 pt-4">
        <p className="text-xs text-muted-foreground">
          {tab === "fitment"
            ? "Fitment overrides are saved together with all payroll settings."
            : "Changes take effect on the next payroll generation run."}
        </p>
        <Button onClick={save} disabled={saving} className="flex items-center gap-2">
          {saving ? <><RefreshCw className="w-4 h-4 animate-spin" /> Saving…</> :
           saved  ? <><Check className="w-4 h-4 text-green-300" /> Saved!</> :
                    <><Save className="w-4 h-4" /> Save Payroll Settings</>}
        </Button>
      </div>
    </div>
  );
}
