import { useState, useEffect } from "react";
import { PageHeader, Card, Button, Input, Label } from "@/components/ui";
import {
  Banknote, Percent, DollarSign, Save, RefreshCw, Check,
  Edit2, X, Info, AlertTriangle
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
function apiUrl(path: string) { return `${BASE}/api${path}`; }

const DEFAULT_SALARY_SCALE: Record<string, number> = {
  "Postmaster General": 150000,
  "Deputy Postmaster General": 120000,
  "Regional Postmaster": 80000,
  "Sub Postmaster": 60000,
  "Postal Supervisor": 55000,
  "Senior Postal Officer": 50000,
  "Postal Officer": 45000,
  "Counter Clerk": 40000,
  "Sorting Officer": 38000,
  "Delivery Agent": 35000,
  "Accounts Officer": 55000,
  "HR Officer": 50000,
  "IT Officer": 55000,
  "PSB Officer": 48000,
  "Driver": 38000,
  "Security Officer": 35000,
  "Clerical Assistant": 32000,
  "Data Entry Operator": 35000,
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
}

const DEFAULTS: PayrollConfig = {
  epfEmployeePercent: 8, epfEmployerPercent: 12, etfEmployerPercent: 3,
  transportAllowance: 5000,
  housingAllowanceLow: 3000, housingAllowanceMid: 7000, housingAllowanceHigh: 10000,
  housingMidThreshold: 50000, housingHighThreshold: 80000,
  otherAllowances: 1500, lateDeductionPerInstance: 100, overtimeMultiplier: 1.5,
  salaryScale: { ...DEFAULT_SALARY_SCALE },
};

export default function PayrollSettings() {
  const [cfg, setCfg] = useState<PayrollConfig>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingDesig, setEditingDesig] = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");

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
          });
        }
      })
      .catch(() => setError("Failed to load payroll settings"))
      .finally(() => setLoading(false));
  }, []);

  function set(k: keyof PayrollConfig, v: any) {
    setCfg(s => ({ ...s, [k]: v }));
  }

  async function save() {
    setSaving(true); setError(null);
    try {
      const r = await fetch(apiUrl("/payroll-settings"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cfg),
      });
      const d = await r.json();
      if (d.id) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError(d.message || "Save failed");
      }
    } catch {
      setError("Failed to save. Check server connection.");
    }
    setSaving(false);
  }

  function startEdit(designation: string) {
    setEditingDesig(designation);
    setEditVal(String(cfg.salaryScale[designation] ?? 40000));
  }

  function confirmEdit(designation: string) {
    const val = parseInt(editVal);
    if (!isNaN(val) && val > 0) {
      setCfg(s => ({ ...s, salaryScale: { ...s.salaryScale, [designation]: val } }));
    }
    setEditingDesig(null);
  }

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
        description="Configure EPF/ETF rates, allowances, deductions, and salary scale by designation"
      />

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm bg-red-50 text-red-700 border border-red-200">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto p-0.5 rounded hover:bg-red-100">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

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
          <div>
            <Label className="text-xs font-semibold">EPF — Employee Contribution</Label>
            <div className="relative mt-1.5">
              <Input type="number" step="0.01" min="0" max="100"
                value={cfg.epfEmployeePercent}
                onChange={e => set("epfEmployeePercent", parseFloat(e.target.value))}
                className="pr-8" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">%</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Deducted from employee gross salary</p>
          </div>

          <div>
            <Label className="text-xs font-semibold">EPF — Employer Contribution</Label>
            <div className="relative mt-1.5">
              <Input type="number" step="0.01" min="0" max="100"
                value={cfg.epfEmployerPercent}
                onChange={e => set("epfEmployerPercent", parseFloat(e.target.value))}
                className="pr-8" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">%</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Employer cost, not deducted from employee</p>
          </div>

          <div>
            <Label className="text-xs font-semibold">ETF — Employer Contribution</Label>
            <div className="relative mt-1.5">
              <Input type="number" step="0.01" min="0" max="100"
                value={cfg.etfEmployerPercent}
                onChange={e => set("etfEmployerPercent", parseFloat(e.target.value))}
                className="pr-8" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">%</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Employees Trust Fund contribution</p>
          </div>
        </div>

        <div className="mt-4 flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
          <p className="text-xs text-blue-700">
            <strong>APIT (income tax)</strong> is automatically calculated using Sri Lanka IRD progressive tax slabs (6%–30%) and cannot be configured manually.
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
            <p className="text-[10px] text-muted-foreground mt-1">e.g. 1.5× = 1.5 times hourly rate per OT hour</p>
          </div>
        </div>

        {/* Housing Allowance Tiers */}
        <div className="mt-5">
          <p className="text-xs font-semibold mb-1">Housing Allowance — Salary-Based Tiers</p>
          <p className="text-[10px] text-muted-foreground mb-3">
            Housing allowance is assigned based on the employee's basic salary. Each employee receives the amount for the tier their salary falls into.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-border rounded-xl p-4 bg-muted/20">
              <p className="text-xs font-bold text-muted-foreground mb-3 uppercase tracking-wide">Low Tier</p>
              <Label className="text-[10px]">Allowance Amount (Rs.)</Label>
              <Input type="number" min="0" value={cfg.housingAllowanceLow}
                onChange={e => set("housingAllowanceLow", parseInt(e.target.value))} className="mt-1 h-8 text-sm" />
              <p className="text-[10px] text-muted-foreground mt-2">
                For basic salary below Rs. {cfg.housingMidThreshold.toLocaleString()}
              </p>
            </div>
            <div className="border border-blue-200 rounded-xl p-4 bg-blue-50/30">
              <p className="text-xs font-bold text-blue-600 mb-3 uppercase tracking-wide">Mid Tier</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px]">Allowance (Rs.)</Label>
                  <Input type="number" min="0" value={cfg.housingAllowanceMid}
                    onChange={e => set("housingAllowanceMid", parseInt(e.target.value))} className="mt-1 h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-[10px]">Min. Basic (Rs.)</Label>
                  <Input type="number" min="0" value={cfg.housingMidThreshold}
                    onChange={e => set("housingMidThreshold", parseInt(e.target.value))} className="mt-1 h-8 text-sm" />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                Basic salary {cfg.housingMidThreshold.toLocaleString()} – {cfg.housingHighThreshold.toLocaleString()}
              </p>
            </div>
            <div className="border border-amber-200 rounded-xl p-4 bg-amber-50/30">
              <p className="text-xs font-bold text-amber-600 mb-3 uppercase tracking-wide">High Tier</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px]">Allowance (Rs.)</Label>
                  <Input type="number" min="0" value={cfg.housingAllowanceHigh}
                    onChange={e => set("housingAllowanceHigh", parseInt(e.target.value))} className="mt-1 h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-[10px]">Min. Basic (Rs.)</Label>
                  <Input type="number" min="0" value={cfg.housingHighThreshold}
                    onChange={e => set("housingHighThreshold", parseInt(e.target.value))} className="mt-1 h-8 text-sm" />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                Basic salary Rs. {cfg.housingHighThreshold.toLocaleString()} and above
              </p>
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
            <p className="text-xs text-muted-foreground">Rules applied when attendance violations occur</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <Label className="text-xs font-semibold">Late Arrival Deduction (Rs. per instance)</Label>
            <Input type="number" min="0" value={cfg.lateDeductionPerInstance}
              onChange={e => set("lateDeductionPerInstance", parseInt(e.target.value))} className="mt-1.5" />
            <p className="text-[10px] text-muted-foreground mt-1">
              Amount deducted for each late-arrival record in the month
            </p>
          </div>
          <div className="p-4 rounded-xl bg-muted/30 border border-border">
            <p className="text-xs font-semibold mb-2">Auto-Calculated Deductions</p>
            <ul className="space-y-1.5 text-[11px] text-muted-foreground">
              <li><strong className="text-foreground">Absence:</strong> (Basic Salary ÷ Working Days) × Absent Days</li>
              <li><strong className="text-foreground">Half-day:</strong> (Daily Rate ÷ 2) × Half-day Count</li>
            </ul>
            <p className="text-[10px] text-blue-600 mt-2">These are derived from attendance records and cannot be manually configured.</p>
          </div>
        </div>
      </Card>

      {/* Salary Scale */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-5 pb-3 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
            <Banknote className="w-4 h-4 text-violet-600" />
          </div>
          <div>
            <p className="text-sm font-bold">Designation Salary Scale</p>
            <p className="text-xs text-muted-foreground">Basic salary used during payroll generation per designation — click the edit icon to change</p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">#</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Designation</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Basic Salary (Rs.)</th>
                <th className="px-4 py-2.5 w-20 text-center text-xs font-semibold text-muted-foreground">Edit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {Object.entries(cfg.salaryScale)
                .sort((a, b) => b[1] - a[1])
                .map(([designation, salary], idx) => (
                  <tr key={designation} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{idx + 1}</td>
                    <td className="px-4 py-2.5 font-medium text-sm">{designation}</td>
                    <td className="px-4 py-2.5 text-right">
                      {editingDesig === designation ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <Input
                            type="number"
                            value={editVal}
                            onChange={e => setEditVal(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === "Enter") confirmEdit(designation);
                              if (e.key === "Escape") setEditingDesig(null);
                            }}
                            className="h-7 w-32 text-right text-sm font-mono"
                            autoFocus
                          />
                          <button
                            onClick={() => confirmEdit(designation)}
                            className="p-1 rounded bg-green-100 text-green-700 hover:bg-green-200"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingDesig(null)}
                            className="p-1 rounded hover:bg-muted text-muted-foreground"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="font-mono font-semibold text-sm">
                          Rs. {salary.toLocaleString("en-LK")}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {editingDesig !== designation && (
                        <button
                          onClick={() => startEdit(designation)}
                          className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted text-muted-foreground hover:text-foreground"
                          title="Edit salary"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Save Bar */}
      <div className="flex items-center justify-between py-2">
        <p className="text-xs text-muted-foreground">
          Changes take effect on the next payroll generation run.
        </p>
        <Button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2"
        >
          {saving ? (
            <><RefreshCw className="w-4 h-4 animate-spin" /> Saving…</>
          ) : saved ? (
            <><Check className="w-4 h-4 text-green-300" /> Saved!</>
          ) : (
            <><Save className="w-4 h-4" /> Save Payroll Settings</>
          )}
        </Button>
      </div>
    </div>
  );
}
