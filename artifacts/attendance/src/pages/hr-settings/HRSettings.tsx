import { useState, useEffect } from "react";
import { PageHeader, Card, Button, Input, Label } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  Save, RefreshCw, Check, AlertTriangle, X, Plus, Trash2,
  Clock, Timer, ChevronDown, ChevronUp, Info, ShieldAlert,
  Building2, Utensils, ToggleLeft, UserRound, CalendarClock,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
function apiUrl(path: string) { return `${BASE}/api${path}`; }

/* ─── Types ─────────────────────────────────────────────── */
interface DeptRule {
  _id: string;
  department: string;
  isNightShift: boolean;
  lunchType: "none" | "standard" | "custom";
  lunchStartHour: number;
  lunchDurations: Record<string, number>;
}

interface HRConfig {
  requiredWorkMinutes: number;
  otGraceMinutes: number;
  hoursPerDay: number;
  duplicatePunchFilterMinutes: number;
  standardLunchStartHour: number;
  standardLunchMinutes: number;
  otExemptDesignations: string[];
  incompleteExemptDepartments: string[];
  departmentRules: DeptRule[];
}

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function uid() { return Math.random().toString(36).slice(2); }
function blankDept(): DeptRule {
  const durations: Record<string, number> = {};
  WEEKDAYS.forEach(d => { durations[d] = 60; });
  return { _id: uid(), department: "", isNightShift: false, lunchType: "standard", lunchStartHour: 13, lunchDurations: durations };
}

const DEFAULTS: HRConfig = {
  requiredWorkMinutes: 540,
  otGraceMinutes: 30,
  hoursPerDay: 8,
  duplicatePunchFilterMinutes: 5,
  standardLunchStartHour: 13,
  standardLunchMinutes: 60,
  otExemptDesignations: ["Manager"],
  incompleteExemptDepartments: ["Surf Instructors - D"],
  departmentRules: [],
};

type Tab = "worktime" | "ot" | "lunch" | "departments";
const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "worktime",    label: "Work Time",         icon: Clock       },
  { key: "ot",         label: "OT & Deductions",    icon: CalendarClock },
  { key: "lunch",      label: "Lunch Rules",         icon: Utensils    },
  { key: "departments",label: "Department Rules",    icon: Building2   },
];

function minutesToHoursLabel(m: number) {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return min > 0 ? `${h}h ${min}m` : `${h}h`;
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════ */
export default function HRSettings() {
  const [tab, setTab] = useState<Tab>("worktime");
  const [cfg, setCfg] = useState<HRConfig>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ── expanded dept row ── */
  const [expandedDept, setExpandedDept] = useState<string | null>(null);

  /* ── new item inputs ── */
  const [newOtDesig, setNewOtDesig] = useState("");
  const [newIncompleteExempt, setNewIncompleteExempt] = useState("");

  useEffect(() => {
    setLoading(true);
    fetch(apiUrl("/hr-settings"))
      .then(r => r.json())
      .then(d => {
        if (d.id) {
          setCfg({
            requiredWorkMinutes: d.requiredWorkMinutes,
            otGraceMinutes: d.otGraceMinutes,
            hoursPerDay: d.hoursPerDay,
            duplicatePunchFilterMinutes: d.duplicatePunchFilterMinutes,
            standardLunchStartHour: d.standardLunchStartHour,
            standardLunchMinutes: d.standardLunchMinutes,
            otExemptDesignations: d.otExemptDesignations ?? [],
            incompleteExemptDepartments: d.incompleteExemptDepartments ?? [],
            departmentRules: (d.departmentRules ?? []).map((r: any) => ({ _id: uid(), ...r })),
          });
        }
      })
      .catch(() => setError("Failed to load HR settings"))
      .finally(() => setLoading(false));
  }, []);

  function set<K extends keyof HRConfig>(k: K, v: HRConfig[K]) {
    setCfg(s => ({ ...s, [k]: v }));
  }

  async function save() {
    setSaving(true); setError(null);
    try {
      const body = {
        ...cfg,
        departmentRules: cfg.departmentRules.map(({ _id, ...rest }) => rest),
      };
      const r = await fetch(apiUrl("/hr-settings"), {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const d = await r.json();
      if (d.id) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
      else setError(d.message || "Save failed");
    } catch { setError("Failed to save HR settings."); }
    setSaving(false);
  }

  /* ── OT exempt designations ── */
  function addOtDesig() {
    const v = newOtDesig.trim();
    if (!v || cfg.otExemptDesignations.includes(v)) return;
    set("otExemptDesignations", [...cfg.otExemptDesignations, v]);
    setNewOtDesig("");
  }
  function removeOtDesig(d: string) {
    set("otExemptDesignations", cfg.otExemptDesignations.filter(x => x !== d));
  }

  /* ── Incomplete exempt departments ── */
  function addIncompleteExempt() {
    const v = newIncompleteExempt.trim();
    if (!v || cfg.incompleteExemptDepartments.includes(v)) return;
    set("incompleteExemptDepartments", [...cfg.incompleteExemptDepartments, v]);
    setNewIncompleteExempt("");
  }
  function removeIncompleteExempt(d: string) {
    set("incompleteExemptDepartments", cfg.incompleteExemptDepartments.filter(x => x !== d));
  }

  /* ── Department rules ── */
  function addDeptRule() {
    const rule = blankDept();
    set("departmentRules", [...cfg.departmentRules, rule]);
    setExpandedDept(rule._id);
  }
  function removeDeptRule(id: string) {
    set("departmentRules", cfg.departmentRules.filter(r => r._id !== id));
    if (expandedDept === id) setExpandedDept(null);
  }
  function updateDeptRule(id: string, patch: Partial<DeptRule>) {
    set("departmentRules", cfg.departmentRules.map(r => r._id === id ? { ...r, ...patch } : r));
  }
  function updateDeptLunch(id: string, day: string, val: number) {
    set("departmentRules", cfg.departmentRules.map(r => {
      if (r._id !== id) return r;
      return { ...r, lunchDurations: { ...r.lunchDurations, [day]: val } };
    }));
  }

  const otStart = cfg.requiredWorkMinutes + cfg.otGraceMinutes;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-2 text-muted-foreground">
        <RefreshCw className="w-5 h-5 animate-spin" />
        <span className="text-sm">Loading HR settings…</span>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <PageHeader
        title="HR Settings"
        description="Configure work time rules, overtime policy, lunch breaks, and department-specific behaviour"
      />

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm bg-red-50 text-red-700 border border-red-200">
          <AlertTriangle className="w-4 h-4 shrink-0" />{error}
          <button onClick={() => setError(null)} className="ml-auto p-0.5 rounded hover:bg-red-100"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* ── Tab Nav ── */}
      <div className="flex gap-1 p-1 bg-muted/50 rounded-xl border border-border w-fit">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
              tab === key ? "bg-white shadow-sm text-foreground border border-border" : "text-muted-foreground hover:text-foreground hover:bg-white/60"
            )}>
            <Icon className={cn("w-4 h-4", tab === key ? "text-primary" : "text-muted-foreground")} />
            {label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════
          WORK TIME TAB
      ══════════════════════════════════════════ */}
      {tab === "worktime" && (
        <div className="space-y-4">
          {/* Policy summary banner */}
          <Card className="p-4 bg-blue-50/40 border-blue-200">
            <div className="flex items-start gap-3">
              <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
              <div className="text-xs text-blue-700 space-y-1">
                <p><strong>Current Policy Summary:</strong></p>
                <p>Required work: <strong>{minutesToHoursLabel(cfg.requiredWorkMinutes)}</strong> per day.
                  OT kicks in after <strong>{minutesToHoursLabel(otStart)}</strong> ({minutesToHoursLabel(cfg.requiredWorkMinutes)} + {cfg.otGraceMinutes} min grace).
                  Daily rate = Basic ÷ Actual Working Days in Month. Hour rate = Daily ÷ {cfg.hoursPerDay}.
                  Duplicate punches within <strong>{cfg.duplicatePunchFilterMinutes} min</strong> are filtered out.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 mb-5 pb-3 border-b border-border">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <Clock className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-bold">Daily Work Requirements</p>
                <p className="text-xs text-muted-foreground">Sets the baseline for attendance calculations and OT eligibility</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <Label className="text-xs font-semibold">Required Work Minutes <span className="text-xs font-normal text-muted-foreground ml-1">({minutesToHoursLabel(cfg.requiredWorkMinutes)})</span></Label>
                <Input type="number" min="60" max="720" step="15" value={cfg.requiredWorkMinutes}
                  onChange={e => set("requiredWorkMinutes", parseInt(e.target.value) || 540)} className="mt-1.5" />
                <p className="text-[10px] text-muted-foreground mt-1">Daily work time employees are expected to complete (e.g. 540 = 9 hours)</p>
              </div>
              <div>
                <Label className="text-xs font-semibold">OT Grace Period (minutes)</Label>
                <Input type="number" min="0" max="120" step="5" value={cfg.otGraceMinutes}
                  onChange={e => set("otGraceMinutes", parseInt(e.target.value) || 0)} className="mt-1.5" />
                <p className="text-[10px] text-muted-foreground mt-1">
                  OT counted only after required + grace. Currently: OT starts at <strong>{minutesToHoursLabel(otStart)}</strong>
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 mb-5 pb-3 border-b border-border">
              <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                <Timer className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-bold">Salary Rate Calculation</p>
                <p className="text-xs text-muted-foreground">Used to convert basic salary into per-minute rate for OT and deduction calculations</p>
              </div>
            </div>
            <div className="max-w-xs">
              <Label className="text-xs font-semibold">Hours Per Day</Label>
              <Input type="number" min="1" max="24" value={cfg.hoursPerDay}
                onChange={e => set("hoursPerDay", parseInt(e.target.value) || 8)} className="mt-1.5" />
              <p className="text-[10px] text-muted-foreground mt-1">Hourly rate = Daily rate ÷ this value. Minute rate = Hourly ÷ 60</p>
            </div>
            <div className="mt-4 p-4 rounded-xl bg-muted/30 border border-border text-xs space-y-1">
              <p className="font-semibold mb-2 text-foreground">Rate Formula (read-only)</p>
              <p className="text-muted-foreground font-mono">Daily rate &nbsp;&nbsp;&nbsp;= Basic ÷ Actual Working Days in Month</p>
              <p className="text-muted-foreground font-mono">Hourly rate &nbsp;= Daily ÷ {cfg.hoursPerDay}</p>
              <p className="text-muted-foreground font-mono">Minute rate = Hourly ÷ 60</p>
              <p className="text-muted-foreground font-mono">OT amount &nbsp;&nbsp;= OT minutes × Minute rate × Multiplier</p>
              <p className="text-muted-foreground font-mono">Short deduction = Incomplete minutes × Minute rate</p>
              <p className="text-[10px] text-blue-600 mt-2 font-medium">Daily rate uses actual working days — it changes each month automatically.</p>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 mb-5 pb-3 border-b border-border">
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                <ToggleLeft className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-bold">Punch Deduplication</p>
                <p className="text-xs text-muted-foreground">Consecutive biometric punches too close together are treated as one</p>
              </div>
            </div>
            <div className="max-w-xs">
              <Label className="text-xs font-semibold">Duplicate Punch Filter (minutes)</Label>
              <Input type="number" min="1" max="30" value={cfg.duplicatePunchFilterMinutes}
                onChange={e => set("duplicatePunchFilterMinutes", parseInt(e.target.value) || 5)} className="mt-1.5" />
              <p className="text-[10px] text-muted-foreground mt-1">
                If two consecutive punches are within this window, the second is ignored. Default: 5 min
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════════
          OT & DEDUCTIONS TAB
      ══════════════════════════════════════════ */}
      {tab === "ot" && (
        <div className="space-y-4">
          {/* OT Exempt Designations */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-5 pb-3 border-b border-border">
              <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                <UserRound className="w-4 h-4 text-violet-600" />
              </div>
              <div>
                <p className="text-sm font-bold">OT-Exempt Designations</p>
                <p className="text-xs text-muted-foreground">Employees with these designations will NOT receive overtime pay regardless of hours worked</p>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              {cfg.otExemptDesignations.length === 0 ? (
                <p className="text-sm text-muted-foreground italic px-1">No exempt designations — all employees are eligible for OT</p>
              ) : (
                cfg.otExemptDesignations.map(d => (
                  <div key={d} className="flex items-center justify-between px-3 py-2 rounded-lg bg-violet-50 border border-violet-200">
                    <div className="flex items-center gap-2">
                      <UserRound className="w-3.5 h-3.5 text-violet-500" />
                      <span className="text-sm font-medium">{d}</span>
                    </div>
                    <button onClick={() => removeOtDesig(d)}
                      className="p-1 rounded hover:bg-violet-100 text-violet-400 hover:text-violet-700">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-2">
              <Input value={newOtDesig} onChange={e => setNewOtDesig(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") addOtDesig(); }}
                placeholder="e.g. Manager, Director, CEO…" className="flex-1" />
              <Button onClick={addOtDesig} variant="outline" className="gap-1.5 shrink-0">
                <Plus className="w-4 h-4" /> Add
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5">
              Designation name must exactly match what's stored in the employee record (case-sensitive)
            </p>
          </Card>

          {/* Incomplete Hours Exempt Departments */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-5 pb-3 border-b border-border">
              <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                <ShieldAlert className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-bold">Incomplete Hours — Exempt Departments</p>
                <p className="text-xs text-muted-foreground">Employees in these departments will NOT be penalised for working fewer than the required hours</p>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              {cfg.incompleteExemptDepartments.length === 0 ? (
                <p className="text-sm text-muted-foreground italic px-1">No departments are exempt — all are subject to incomplete hour deductions</p>
              ) : (
                cfg.incompleteExemptDepartments.map(d => (
                  <div key={d} className="flex items-center justify-between px-3 py-2 rounded-lg bg-orange-50 border border-orange-200">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-orange-500" />
                      <span className="text-sm font-medium">{d}</span>
                    </div>
                    <button onClick={() => removeIncompleteExempt(d)}
                      className="p-1 rounded hover:bg-orange-100 text-orange-400 hover:text-orange-700">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-2">
              <Input value={newIncompleteExempt} onChange={e => setNewIncompleteExempt(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") addIncompleteExempt(); }}
                placeholder="e.g. Surf Instructors - D…" className="flex-1" />
              <Button onClick={addIncompleteExempt} variant="outline" className="gap-1.5 shrink-0">
                <Plus className="w-4 h-4" /> Add
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════════
          LUNCH RULES TAB
      ══════════════════════════════════════════ */}
      {tab === "lunch" && (
        <div className="space-y-4">
          <Card className="p-4 bg-green-50/40 border-green-200">
            <div className="flex items-start gap-3">
              <Utensils className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
              <p className="text-xs text-green-700">
                The <strong>standard lunch rule</strong> applies to all employees whose department is not listed under Department Rules.
                Departments with custom lunch rules can be configured in the <strong>Department Rules</strong> tab.
              </p>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 mb-5 pb-3 border-b border-border">
              <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                <Utensils className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-bold">Standard Lunch Break</p>
                <p className="text-xs text-muted-foreground">Applied to all departments not overridden in Department Rules</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <Label className="text-xs font-semibold">Lunch Start (Hour, 24h)</Label>
                <div className="relative mt-1.5">
                  <Input type="number" min="8" max="18" value={cfg.standardLunchStartHour}
                    onChange={e => set("standardLunchStartHour", parseInt(e.target.value) || 13)} className="pr-16" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-semibold">
                    {String(cfg.standardLunchStartHour).padStart(2, "0")}:00
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Lunch deduction only applies if the employee works past this time
                </p>
              </div>
              <div>
                <Label className="text-xs font-semibold">Lunch Duration (minutes)</Label>
                <Input type="number" min="0" max="180" step="15" value={cfg.standardLunchMinutes}
                  onChange={e => set("standardLunchMinutes", parseInt(e.target.value) || 60)} className="mt-1.5" />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Subtracted from total work time if still at work after lunch start
                </p>
              </div>
            </div>

            <div className="mt-5 p-4 rounded-xl bg-muted/30 border border-border text-xs space-y-1">
              <p className="font-semibold text-foreground mb-2">How it works</p>
              <ol className="space-y-1 text-muted-foreground list-decimal list-inside">
                <li>Calculate raw work time from in/out punch pairs</li>
                <li>If employee's last punch is after <strong>{String(cfg.standardLunchStartHour).padStart(2, "0")}:00</strong>, subtract <strong>{cfg.standardLunchMinutes} minutes</strong></li>
                <li>Compare adjusted work time to required ({minutesToHoursLabel(cfg.requiredWorkMinutes)}) for OT / incomplete calculation</li>
              </ol>
            </div>
          </Card>

          {/* Department overrides summary */}
          {cfg.departmentRules.filter(r => r.lunchType !== "standard").length > 0 && (
            <Card className="p-5">
              <p className="text-sm font-bold mb-3">Department Lunch Overrides</p>
              <div className="space-y-2">
                {cfg.departmentRules.filter(r => r.lunchType !== "standard").map(r => (
                  <div key={r._id} className="flex items-start gap-3 px-3 py-2.5 rounded-lg bg-muted/30 border border-border text-sm">
                    <Building2 className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">{r.department || <em className="text-muted-foreground">Unnamed dept</em>}</p>
                      {r.lunchType === "none" ? (
                        <p className="text-xs text-muted-foreground">No lunch deduction</p>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Custom lunch from <strong>{String(r.lunchStartHour).padStart(2, "0")}:00</strong>.
                          {" "}{WEEKDAYS.map(d => `${d.slice(0, 3)}: ${r.lunchDurations[d] ?? 0}m`).join(" · ")}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">Edit these rules in the <strong>Department Rules</strong> tab.</p>
            </Card>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════
          DEPARTMENT RULES TAB
      ══════════════════════════════════════════ */}
      {tab === "departments" && (
        <div className="space-y-4">
          <Card className="p-4 bg-amber-50/40 border-amber-200">
            <div className="flex items-start gap-3">
              <Building2 className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700">
                Override default attendance behaviour for specific departments. You can set <strong>night shift punch handling</strong>,
                <strong> custom lunch durations per weekday</strong>, and whether to use the standard or no lunch rule.
                Departments not listed here use all defaults.
              </p>
            </div>
          </Card>

          {cfg.departmentRules.length === 0 ? (
            <Card className="p-12 text-center">
              <Building2 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No department rules configured</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">All departments will use standard work time, OT, and lunch rules.</p>
              <Button onClick={addDeptRule} variant="outline" className="gap-2">
                <Plus className="w-4 h-4" /> Add Department Rule
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {cfg.departmentRules.map((rule) => {
                const isExpanded = expandedDept === rule._id;
                return (
                  <Card key={rule._id} className="overflow-hidden">
                    {/* Header row */}
                    <div className="flex items-center gap-3 px-5 py-3.5 cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => setExpandedDept(isExpanded ? null : rule._id)}>
                      <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{rule.department || <em className="text-muted-foreground font-normal">Unnamed department</em>}</p>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          {rule.isNightShift && (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold bg-indigo-100 text-indigo-700 rounded-full uppercase tracking-wide">Night Shift</span>
                          )}
                          <span className={cn("px-1.5 py-0.5 text-[9px] font-bold rounded-full uppercase tracking-wide",
                            rule.lunchType === "none" ? "bg-red-100 text-red-600" :
                            rule.lunchType === "custom" ? "bg-green-100 text-green-700" :
                            "bg-muted text-muted-foreground")}>
                            Lunch: {rule.lunchType}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={e => { e.stopPropagation(); removeDeptRule(rule._id); }}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </div>

                    {/* Expanded form */}
                    {isExpanded && (
                      <div className="px-5 pb-5 pt-2 border-t border-border space-y-5">
                        {/* Department Name */}
                        <div className="max-w-sm">
                          <Label className="text-xs font-semibold">Department Name <span className="text-red-500">*</span></Label>
                          <Input value={rule.department} onChange={e => updateDeptRule(rule._id, { department: e.target.value })}
                            placeholder="e.g. Security - D" className="mt-1.5" />
                          <p className="text-[10px] text-muted-foreground mt-1">Must exactly match the department name in employee records</p>
                        </div>

                        {/* Night Shift */}
                        <div className="flex items-start gap-3 p-4 rounded-xl border border-border bg-indigo-50/30">
                          <input type="checkbox" id={`ns-${rule._id}`} checked={rule.isNightShift}
                            onChange={e => updateDeptRule(rule._id, { isNightShift: e.target.checked })}
                            className="mt-0.5 w-4 h-4 rounded accent-primary cursor-pointer" />
                          <label htmlFor={`ns-${rule._id}`} className="cursor-pointer">
                            <p className="text-sm font-semibold">Night Shift Department</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              When enabled, punches are fetched from <strong>the attendance date up to midnight of the next day</strong>,
                              allowing shifts that span past midnight to be counted correctly.
                            </p>
                          </label>
                        </div>

                        {/* Lunch Type */}
                        <div>
                          <Label className="text-xs font-semibold">Lunch Rule</Label>
                          <div className="grid grid-cols-3 gap-3 mt-2">
                            {([
                              { val: "none" as const, label: "No Lunch", desc: "0 minutes deducted", color: "border-red-200 bg-red-50/30 text-red-700" },
                              { val: "standard" as const, label: "Standard Lunch", desc: `${cfg.standardLunchMinutes} min from ${String(cfg.standardLunchStartHour).padStart(2, "0")}:00`, color: "border-blue-200 bg-blue-50/30 text-blue-700" },
                              { val: "custom" as const, label: "Custom Lunch", desc: "Per-weekday amounts", color: "border-green-200 bg-green-50/30 text-green-700" },
                            ]).map(({ val, label, desc, color }) => (
                              <label key={val} className={cn(
                                "flex flex-col gap-1 p-3 rounded-xl border-2 cursor-pointer transition-all",
                                rule.lunchType === val ? color + " border-current" : "border-border hover:bg-muted/30"
                              )}>
                                <div className="flex items-center gap-2">
                                  <input type="radio" name={`lunch-${rule._id}`} value={val} checked={rule.lunchType === val}
                                    onChange={() => updateDeptRule(rule._id, { lunchType: val })}
                                    className="accent-primary" />
                                  <span className="text-sm font-semibold">{label}</span>
                                </div>
                                <span className="text-[10px] text-muted-foreground pl-5">{desc}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* Custom lunch config */}
                        {rule.lunchType === "custom" && (
                          <div className="space-y-3 pl-1">
                            <div className="max-w-xs">
                              <Label className="text-xs font-semibold">Lunch Start Hour (24h)</Label>
                              <div className="relative mt-1.5">
                                <Input type="number" min="8" max="18" value={rule.lunchStartHour}
                                  onChange={e => updateDeptRule(rule._id, { lunchStartHour: parseInt(e.target.value) || 13 })}
                                  className="pr-16" />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-semibold">
                                  {String(rule.lunchStartHour).padStart(2, "0")}:00
                                </span>
                              </div>
                            </div>

                            <div>
                              <Label className="text-xs font-semibold mb-2 block">Lunch Duration per Weekday (minutes)</Label>
                              <div className="grid grid-cols-7 gap-2">
                                {WEEKDAYS.map(day => (
                                  <div key={day} className="flex flex-col items-center gap-1">
                                    <span className="text-[10px] font-semibold text-muted-foreground uppercase">{day.slice(0, 3)}</span>
                                    <Input type="number" min="0" max="240" step="15"
                                      value={rule.lunchDurations[day] ?? 60}
                                      onChange={e => updateDeptLunch(rule._id, day, parseInt(e.target.value) || 0)}
                                      className="h-9 text-center text-sm px-2" />
                                  </div>
                                ))}
                              </div>
                              <p className="text-[10px] text-muted-foreground mt-1.5">Enter 0 for days with no lunch deduction</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}

              <button onClick={addDeptRule}
                className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-border rounded-xl text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors">
                <Plus className="w-4 h-4" /> Add Department Rule
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Save Bar ── */}
      <div className="flex items-center justify-between py-2 sticky bottom-0 bg-background/80 backdrop-blur border-t border-border mt-4 pt-4">
        <p className="text-xs text-muted-foreground">HR policy changes apply to all future attendance and payroll calculations.</p>
        <Button onClick={save} disabled={saving} className="flex items-center gap-2">
          {saving ? <><RefreshCw className="w-4 h-4 animate-spin" /> Saving…</> :
           saved  ? <><Check className="w-4 h-4 text-green-300" /> Saved!</> :
                    <><Save className="w-4 h-4" /> Save HR Settings</>}
        </Button>
      </div>
    </div>
  );
}
