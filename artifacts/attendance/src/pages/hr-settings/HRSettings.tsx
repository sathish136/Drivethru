import { useState, useEffect } from "react";
import { PageHeader, Card, Button, Input, Label, Select } from "@/components/ui";
import {
  Plus, Trash2, Save, RefreshCw, Check, AlertTriangle, X, Edit2, Users, Sparkles,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
function apiUrl(path: string) { return `${BASE}/api${path}`; }

interface DeptShiftRule {
  id: string;
  department: string;
  shift: string;
  minHours: number;
  maxHours: number | null;
  otEligible: boolean;
  otAfterHours: number | null;
  lateGraceMinutes: number | null;
  earlyExitGraceMinutes: number | null;
  lunchMinHours: number | null;
  lunchMaxHours: number | null;
  flexible: boolean;
  multipleLogin: boolean;
  otMultiplier: number | null;
  offdayOtMultiplier: number | null;
  holidayOtMultiplier: number | null;
  weeklyLeaveDays: number | null;
  halfDayHours: number | null;
  minPresentHours: number | null;
  remarks: string;
  notes: string;
  otStartTime: string | null;
  nightWatcherMissedPunchDeductHours: number | null;
  saturdayShiftHours: number | null;
  sundayStartTime: string | null;
}

interface Department { id: number; name: string; isActive: boolean; }
interface ShiftOption  { id: number; name: string; startTime1: string; endTime1: string; isActive: boolean; }

const BLANK_RULE: DeptShiftRule = {
  id: "", department: "", shift: "", minHours: 9, maxHours: null,
  otEligible: true, otAfterHours: 9.5, lateGraceMinutes: 15,
  earlyExitGraceMinutes: 0,
  lunchMinHours: 1, lunchMaxHours: 1,
  flexible: false, multipleLogin: false,
  otMultiplier: 1.5, offdayOtMultiplier: 1.5,
  holidayOtMultiplier: 1.5, weeklyLeaveDays: 1, halfDayHours: 5,
  minPresentHours: 8,
  remarks: "", notes: "",
  otStartTime: null,
  nightWatcherMissedPunchDeductHours: null,
  saturdayShiftHours: 5,
  sundayStartTime: null,
};

function fmtTimeMins(totalMins: number): string {
  const h = Math.floor(totalMins / 60) % 24;
  const m = totalMins % 60;
  const period = h >= 12 ? "pm" : "am";
  const displayH = h > 12 ? h - 12 : (h === 0 ? 12 : h);
  return m > 0 ? `${displayH}:${String(m).padStart(2, "0")} ${period}` : `${displayH} ${period}`;
}

function generateRemarks(rule: DeptShiftRule, shiftOptions: ShiftOption[]): string {
  if (rule.flexible) {
    if (!rule.otEligible) return "No OT / No late hr deductions";
    if (rule.otAfterHours != null)
      return `No late hr deduction / Add OT if exceed total hrs ${rule.otAfterHours}hrs`;
    return "No late hr deduction / Flexible schedule";
  }

  const shift = shiftOptions.find(s => s.name.toLowerCase() === rule.shift.toLowerCase());
  const shiftStart = shift?.startTime1 ?? null;
  const parts: string[] = [];

  if (!rule.otEligible && (!rule.lateGraceMinutes || rule.lateGraceMinutes === 0)) {
    return "No OT / No late hr deductions";
  }

  if (rule.lateGraceMinutes != null && rule.lateGraceMinutes > 0) {
    if (shiftStart) {
      const [h, m] = shiftStart.split(":").map(Number);
      const lateMins = h * 60 + m + rule.lateGraceMinutes;
      parts.push(`Late deduction after ${fmtTimeMins(lateMins)}`);
    } else {
      parts.push(`Late deduction after ${rule.lateGraceMinutes} min`);
    }
  } else {
    parts.push("No late deduction");
  }

  if (!rule.otEligible) {
    parts.push("No OT");
  } else if (rule.otStartTime) {
    const [oh, om] = rule.otStartTime.split(":").map(Number);
    const label = fmtTimeMins(oh * 60 + om);
    parts.push(`OT after ${label}`);
    if (rule.nightWatcherMissedPunchDeductHours != null) {
      parts.push(`deduct ${rule.nightWatcherMissedPunchDeductHours}hr/missed punch`);
    }
  } else if (rule.otAfterHours != null && shiftStart) {
    const [sh, sm] = shiftStart.split(":").map(Number);
    const otStartMins = sh * 60 + sm + Math.round(rule.otAfterHours * 60);
    parts.push(`OT after ${fmtTimeMins(otStartMins)}`);
  } else if (rule.otAfterHours != null) {
    parts.push(`OT after ${rule.otAfterHours}h`);
  }

  return parts.join(" / ");
}

function otRuleLabel(rule: DeptShiftRule, shiftOptions: ShiftOption[]): string {
  if (!rule.otEligible) return "No OT";
  if (rule.flexible && rule.otAfterHours != null) return `>${rule.otAfterHours}h total`;
  if (rule.otStartTime) {
    const [h, m] = rule.otStartTime.split(":").map(Number);
    return `After ${fmtTimeMins(h * 60 + m)} (clock)`;
  }
  if (rule.otAfterHours != null) {
    const shift = shiftOptions.find(s => s.name.toLowerCase() === rule.shift.toLowerCase());
    if (shift?.startTime1) {
      const [sh, sm] = shift.startTime1.split(":").map(Number);
      const otMins = sh * 60 + sm + Math.round(rule.otAfterHours * 60);
      return `After ${fmtTimeMins(otMins)}`;
    }
    return `After ${rule.otAfterHours}h`;
  }
  return "—";
}

function clientFindRule(rules: DeptShiftRule[], department: string, shiftName?: string | null) {
  const dept  = (department ?? "").toLowerCase().trim();
  const shift = (shiftName  ?? "").toLowerCase().trim();
  if (shift) {
    const both = rules.find(r =>
      r.department.toLowerCase().trim() === dept && r.shift.toLowerCase().trim() === shift
    );
    if (both) return both.id;
  }
  const exactDept = rules.find(r => r.department.toLowerCase().trim() === dept);
  if (exactDept) return exactDept.id;
  const partial = rules.find(r => {
    const rd = r.department.toLowerCase().trim();
    return dept.includes(rd) || rd.includes(dept);
  });
  if (partial) return partial.id;
  return "_default";
}

export default function HRSettings() {
  const [rules, setRules]             = useState<DeptShiftRule[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [shiftOptions, setShiftOptions] = useState<ShiftOption[]>([]);
  const [employees, setEmployees]     = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const [showModal, setShowModal]     = useState(false);
  const [modalMode, setModalMode]     = useState<"add" | "edit">("add");
  const [editing, setEditing]         = useState<DeptShiftRule>(BLANK_RULE);
  const [staffModal, setStaffModal]   = useState<{ rule: DeptShiftRule; emps: any[] } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(apiUrl("/hr-settings")).then(r => r.json()),
      fetch(apiUrl("/departments")).then(r => r.json()),
      fetch(apiUrl("/shifts")).then(r => r.json()),
      fetch(apiUrl("/employees?limit=500")).then(r => r.json()),
    ]).then(([hrData, depts, shiftsData, empsData]) => {
      if (Array.isArray(hrData.departmentRules) && hrData.departmentRules.length > 0) {
        const r = hrData.departmentRules as DeptShiftRule[];
        if (r[0] && "department" in r[0] && "shift" in r[0]) setRules(r);
      }
      if (Array.isArray(depts)) setDepartments(depts.filter((d: Department) => d.isActive !== false));
      if (Array.isArray(shiftsData)) setShiftOptions(shiftsData.filter((s: ShiftOption) => s.isActive !== false));
      const emps = Array.isArray(empsData?.employees) ? empsData.employees
        : Array.isArray(empsData) ? empsData : [];
      setEmployees(emps.filter((e: any) => e.status !== "terminated"));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function persistRules(updated: DeptShiftRule[]) {
    setSaving(true); setError(null);
    try {
      const r = await fetch(apiUrl("/hr-settings"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ departmentRules: updated }),
      });
      const d = await r.json();
      if (d.id || d.departmentRules) { setSaved(true); setTimeout(() => setSaved(false), 2500); }
      else setError(d.message || "Save failed");
    } catch { setError("Failed to save"); }
    setSaving(false);
  }

  function openAdd() {
    const firstDept  = departments[0]?.name  ?? "";
    const firstShift = shiftOptions[0]?.name ?? "";
    setEditing({ ...BLANK_RULE, id: crypto.randomUUID(), department: firstDept, shift: firstShift });
    setModalMode("add");
    setShowModal(true);
  }

  function openEdit(rule: DeptShiftRule) {
    setEditing({
      otStartTime: null,
      nightWatcherMissedPunchDeductHours: null,
      earlyExitGraceMinutes: 0,
      saturdayShiftHours: null,
      sundayStartTime: null,
      ...rule,
    });
    setModalMode("edit");
    setShowModal(true);
  }

  function commitModal() {
    if (!editing.department || !editing.shift) { setError("Department and Shift are required."); return; }
    const updated = modalMode === "add"
      ? [...rules, editing]
      : rules.map(r => r.id === editing.id ? editing : r);
    setRules(updated);
    persistRules(updated);
    setShowModal(false);
  }

  function deleteRule(id: string) {
    if (!confirm("Delete this rule?")) return;
    const updated = rules.filter(r => r.id !== id);
    setRules(updated);
    persistRules(updated);
  }

  function setE<K extends keyof DeptShiftRule>(k: K, v: DeptShiftRule[K]) {
    setEditing(s => ({ ...s, [k]: v }));
  }

  function getMatchedEmployees(rule: DeptShiftRule): any[] {
    return employees.filter(emp => {
      const shiftName = shiftOptions.find(s => s.id === Number(emp.shiftId))?.name ?? null;
      return clientFindRule(rules, emp.department ?? "", shiftName) === rule.id;
    });
  }

  function openStaffModal(rule: DeptShiftRule) {
    setStaffModal({ rule, emps: getMatchedEmployees(rule) });
  }

  function getShiftTimes(shiftName: string): string {
    const s = shiftOptions.find(o => o.name.toLowerCase() === shiftName.toLowerCase());
    if (!s || !s.startTime1) return "—";
    const fmt = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      const p = h >= 12 ? "pm" : "am";
      const dh = h > 12 ? h - 12 : (h === 0 ? 12 : h);
      return m > 0 ? `${dh}:${String(m).padStart(2,"0")}${p}` : `${dh}${p}`;
    };
    return `${fmt(s.startTime1)} – ${fmt(s.endTime1)}`;
  }

  const YesNo = ({ v, yes = "bg-emerald-100 text-emerald-700", no = "bg-slate-100 text-slate-500" }: { v: boolean; yes?: string; no?: string }) => (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${v ? yes : no}`}>
      {v ? "Yes" : "No"}
    </span>
  );

  const noDepts  = !loading && departments.length === 0;
  const noShifts = !loading && shiftOptions.length === 0;

  return (
    <div className="space-y-5 max-w-full">
      <PageHeader
        title="HR Settings"
        description="Attendance, overtime, and late deduction rules per department — based on company shift policy"
      />

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm bg-red-50 text-red-700 border border-red-200">
          <AlertTriangle className="w-4 h-4 shrink-0" />{error}
          <button onClick={() => setError(null)} className="ml-auto p-0.5 rounded hover:bg-red-100"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {(noDepts || noShifts) && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm bg-amber-50 text-amber-800 border border-amber-200">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Setup required before adding rules:</p>
            <ul className="mt-1 list-disc list-inside text-xs space-y-0.5">
              {noDepts  && <li>No departments found — add departments first</li>}
              {noShifts && <li>No shifts found — configure shifts first</li>}
            </ul>
          </div>
        </div>
      )}

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-violet-600" />
            <span className="text-sm font-bold">Department Shift Rules</span>
            <span className="text-xs text-muted-foreground ml-1">— attendance, OT &amp; late deduction rules per department</span>
          </div>
          <div className="flex items-center gap-3">
            {saving && <span className="text-xs text-muted-foreground flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin" />Saving…</span>}
            {saved  && <span className="text-xs text-emerald-600 flex items-center gap-1"><Check className="w-3 h-3" />Saved</span>}
            <Button
              className="flex items-center gap-1.5 text-xs h-8"
              onClick={openAdd}
              disabled={noDepts || noShifts}
            >
              <Plus className="w-3.5 h-3.5" />Add Rule
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-24 gap-2 text-muted-foreground">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading…</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {["Department","Shift","Schedule","Late Grace","OT Rule","Flexible","OT Eligible","Sat. Hrs","Staff","Remarks",""].map(h => (
                    <th key={h} className="text-left px-3 py-2.5 font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rules.map((rule, i) => (
                  <tr key={rule.id} className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${i % 2 !== 0 ? "bg-muted/10" : ""}`}>
                    <td className="px-3 py-2.5 font-semibold text-foreground whitespace-nowrap">{rule.department}</td>
                    <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{rule.shift}</td>
                    <td className="px-3 py-2.5 font-mono text-xs whitespace-nowrap">
                      {rule.flexible
                        ? <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-700">Flexible</span>
                        : getShiftTimes(rule.shift)}
                    </td>
                    <td className="px-3 py-2.5 text-center whitespace-nowrap">
                      {rule.flexible || !rule.lateGraceMinutes
                        ? <span className="text-muted-foreground">None</span>
                        : <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-semibold">{rule.lateGraceMinutes} min</span>}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        !rule.otEligible ? "bg-slate-100 text-slate-500" : "bg-orange-50 text-orange-700"
                      }`}>
                        {otRuleLabel(rule, shiftOptions)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <YesNo v={rule.flexible} yes="bg-blue-100 text-blue-700" />
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <YesNo v={rule.otEligible} />
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {(rule as any).saturdayShiftHours != null
                        ? <span className="font-mono">{(rule as any).saturdayShiftHours}h</span>
                        : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <button
                        onClick={() => openStaffModal(rule)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors hover:bg-primary/15 bg-primary/10 text-primary"
                      >
                        <Users className="w-2.5 h-2.5" />{getMatchedEmployees(rule).length}
                      </button>
                    </td>
                    <td className="px-3 py-2.5 max-w-[240px]">
                      {rule.remarks ? (
                        <span className="text-[10px] leading-snug text-indigo-700 bg-indigo-50 px-2 py-1 rounded block truncate" title={rule.remarks}>
                          {rule.remarks}
                        </span>
                      ) : <span className="text-muted-foreground text-[10px]">—</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(rule)} className="p-1.5 rounded hover:bg-primary/10 text-primary transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteRule(rule.id)} className="p-1.5 rounded hover:bg-red-50 text-red-500 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {rules.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-3 py-10 text-center text-muted-foreground text-xs">
                      No rules yet.{" "}
                      {noDepts || noShifts
                        ? "Add departments and shifts first, then click Add Rule."
                        : 'Click "Add Rule" to create one.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── Policy Notes ── */}
      <Card className="p-4 bg-indigo-50/50 border-indigo-200/60">
        <p className="text-xs font-semibold text-indigo-800 mb-2">Global Policy Rules (apply to all shifts)</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-indigo-700">
          <div className="bg-white/70 rounded-lg px-3 py-2 border border-indigo-100">
            <p className="font-semibold">OT Calculation</p>
            <p className="text-[11px] mt-0.5 text-muted-foreground">After 30 min past shift end</p>
          </div>
          <div className="bg-white/70 rounded-lg px-3 py-2 border border-indigo-100">
            <p className="font-semibold">Late Calculation</p>
            <p className="text-[11px] mt-0.5 text-muted-foreground">After 15 min from shift start</p>
          </div>
          <div className="bg-white/70 rounded-lg px-3 py-2 border border-indigo-100">
            <p className="font-semibold">Lunch Grace</p>
            <p className="text-[11px] mt-0.5 text-muted-foreground">+10 min on allocated lunch</p>
          </div>
          <div className="bg-white/70 rounded-lg px-3 py-2 border border-indigo-100">
            <p className="font-semibold">Checkout Grace</p>
            <p className="text-[11px] mt-0.5 text-muted-foreground">5 min on last checkout</p>
          </div>
        </div>
      </Card>

      {/* ── Add / Edit Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl border border-border flex flex-col max-h-[92vh]">

            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                  <Users className="w-4 h-4 text-violet-600" />
                </div>
                <div>
                  <p className="font-semibold text-sm leading-tight">{modalMode === "add" ? "Add" : "Edit"} Department Rule</p>
                  <p className="text-[11px] text-muted-foreground leading-tight">Configure attendance & OT rules for a department</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">

              {/* Department & Shift */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-4 rounded-full bg-violet-500" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Department & Shift</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-medium mb-1.5 block">Department <span className="text-red-500">*</span></Label>
                    <Select value={editing.department} onChange={e => setE("department", e.target.value)}>
                      <option value="">— Select department —</option>
                      {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-medium mb-1.5 block">Shift <span className="text-red-500">*</span></Label>
                    <Select value={editing.shift} onChange={e => setE("shift", e.target.value)}>
                      <option value="">— Select shift —</option>
                      {shiftOptions.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </Select>
                  </div>
                </div>
              </div>

              {/* Late & Attendance */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-4 rounded-full bg-amber-500" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Late & Attendance</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-medium mb-1.5 block">Flexible Hours</Label>
                    <Select value={editing.flexible ? "yes" : "no"} onChange={e => setE("flexible", e.target.value === "yes")}>
                      <option value="no">No — fixed start/end time</option>
                      <option value="yes">Yes — flexible schedule</option>
                    </Select>
                    <p className="text-[10px] text-muted-foreground mt-1">Flexible employees are never marked late</p>
                  </div>
                  <div>
                    <Label className="text-xs font-medium mb-1.5 block">Late Arrival Grace (min)</Label>
                    <Input type="number" step="1" min="0"
                      value={editing.lateGraceMinutes ?? ""}
                      onChange={e => setE("lateGraceMinutes", e.target.value === "" ? null : parseInt(e.target.value))}
                      placeholder="e.g. 15" />
                    <p className="text-[10px] text-muted-foreground mt-1">0 for flexible / no grace</p>
                  </div>
                  <div>
                    <Label className="text-xs font-medium mb-1.5 block">Saturday Shift Hours</Label>
                    <Input type="number" step="0.5" min="0"
                      value={(editing as any).saturdayShiftHours ?? ""}
                      onChange={e => setE("saturdayShiftHours" as any, e.target.value === "" ? null : parseFloat(e.target.value))}
                      placeholder="e.g. 5 (8am–1pm)" />
                    <p className="text-[10px] text-muted-foreground mt-1">Hours for Saturday shift (e.g. 5 for 8am–1pm)</p>
                  </div>
                  <div>
                    <Label className="text-xs font-medium mb-1.5 block">Sunday Start Time</Label>
                    <Input type="time"
                      value={(editing as any).sundayStartTime ?? ""}
                      onChange={e => setE("sundayStartTime" as any, e.target.value === "" ? null : e.target.value)}
                      placeholder="HH:MM" />
                    <p className="text-[10px] text-muted-foreground mt-1">If Sunday start differs (e.g. Kitchen: 08:00 vs 07:00)</p>
                  </div>
                  <div>
                    <Label className="text-xs font-medium mb-1.5 block">Lunch Break (hrs)</Label>
                    <Input type="number" step="0.5" min="0"
                      value={editing.lunchMinHours ?? ""}
                      onChange={e => setE("lunchMinHours", e.target.value === "" ? null : parseFloat(e.target.value))}
                      placeholder="1" />
                    <p className="text-[10px] text-muted-foreground mt-1">Deducted from total hours daily</p>
                  </div>
                  <div>
                    <Label className="text-xs font-medium mb-1.5 block">Half-Day Threshold (hrs)</Label>
                    <Input type="number" step="0.5" min="0"
                      value={editing.halfDayHours ?? ""}
                      onChange={e => setE("halfDayHours", e.target.value === "" ? null : parseFloat(e.target.value))}
                      placeholder="5" />
                    <p className="text-[10px] text-muted-foreground mt-1">Below this → marked absent</p>
                  </div>
                </div>
              </div>

              {/* Overtime */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-4 rounded-full bg-orange-500" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Overtime</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-medium mb-1.5 block">OT Eligible</Label>
                    <Select value={editing.otEligible ? "yes" : "no"} onChange={e => setE("otEligible", e.target.value === "yes")}>
                      <option value="yes">Yes</option>
                      <option value="no">No — exempt from OT</option>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-medium mb-1.5 block">OT Starts After (hrs total)</Label>
                    <Input type="number" step="0.5" min="0"
                      value={editing.otAfterHours ?? ""}
                      onChange={e => setE("otAfterHours", e.target.value === "" ? null : parseFloat(e.target.value))}
                      placeholder="e.g. 9.5 → OT after 5:30pm" />
                    <p className="text-[10px] text-muted-foreground mt-1">For Regular / Receptionist / Flexible shifts</p>
                  </div>
                  <div>
                    <Label className="text-xs font-medium mb-1.5 block">OT Start Clock Time</Label>
                    <Input
                      type="time"
                      value={editing.otStartTime ?? ""}
                      onChange={e => setE("otStartTime", e.target.value === "" ? null : e.target.value)}
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">Kitchen: 20:30 · Night Watcher: 05:00. Overrides hours-based OT.</p>
                  </div>
                  <div>
                    <Label className="text-xs font-medium mb-1.5 block">Missed-Punch Deduction (hrs)</Label>
                    <Input
                      type="number" step="1" min="0" max="3"
                      value={editing.nightWatcherMissedPunchDeductHours ?? ""}
                      onChange={e => setE("nightWatcherMissedPunchDeductHours", e.target.value === "" ? null : parseFloat(e.target.value))}
                      placeholder="e.g. 1 or 2"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">Night Watcher only — hrs deducted per missed hourly punch</p>
                  </div>
                  <div>
                    <Label className="text-xs font-medium mb-1.5 block">OT Rate Multiplier</Label>
                    <Input type="number" step="0.1" min="0"
                      value={editing.otMultiplier ?? ""}
                      onChange={e => setE("otMultiplier", e.target.value === "" ? null : parseFloat(e.target.value))}
                      placeholder="1.5" />
                  </div>
                  <div>
                    <Label className="text-xs font-medium mb-1.5 block">Holiday / Off-Day OT Rate</Label>
                    <Input type="number" step="0.1" min="0"
                      value={editing.holidayOtMultiplier ?? ""}
                      onChange={e => {
                        const v = e.target.value === "" ? null : parseFloat(e.target.value);
                        setE("holidayOtMultiplier", v);
                        setE("offdayOtMultiplier", v);
                      }}
                      placeholder="1.5" />
                  </div>
                </div>
              </div>

              {/* Remarks */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-4 rounded-full bg-indigo-500" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Remarks Policy</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium block">Auto-assigned Remarks</Label>
                    <button
                      type="button"
                      onClick={() => setE("remarks", generateRemarks(editing, shiftOptions))}
                      className="flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors border border-indigo-200"
                    >
                      <Sparkles className="w-3 h-3" />
                      Auto-generate
                    </button>
                  </div>
                  <textarea
                    className="w-full min-h-[64px] px-3 py-2 text-xs rounded-lg border border-border bg-background resize-y focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400"
                    value={editing.remarks}
                    onChange={e => setE("remarks", e.target.value)}
                    placeholder="e.g. Late deduction after 8.15am / OT after 5.30pm"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Shown in attendance reports. Click <b>Auto-generate</b> to fill from settings above.
                  </p>
                </div>
              </div>

            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border shrink-0 bg-muted/30 rounded-b-2xl">
              <Button variant="outline" className="text-xs h-9 px-4" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button
                className="text-xs h-9 px-4 flex items-center gap-1.5"
                onClick={commitModal}
                disabled={!editing.department || !editing.shift || saving}
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? "Saving…" : modalMode === "add" ? "Add Rule" : "Save Changes"}
              </Button>
            </div>

          </div>
        </div>
      )}

      {/* ── Staff Modal ── */}
      {staffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg border border-border flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  <span className="font-bold text-sm">Matched Staff</span>
                  <span className="ml-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
                    {staffModal.emps.length}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Rule: <b>{staffModal.rule.department}</b> — <b>{staffModal.rule.shift}</b>
                </p>
              </div>
              <button onClick={() => setStaffModal(null)} className="p-1.5 rounded-lg hover:bg-muted">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              {staffModal.emps.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                  <Users className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-sm">No employees matched to this rule</p>
                  <p className="text-xs mt-1">Employees are matched by department and shift</p>
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Employee</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Department</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Shift</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffModal.emps.map((emp, i) => {
                      const shiftName = shiftOptions.find(s => s.id === Number(emp.shiftId))?.name ?? "—";
                      return (
                        <tr key={emp.id} className={`border-b border-border/40 hover:bg-muted/30 ${i % 2 !== 0 ? "bg-muted/10" : ""}`}>
                          <td className="px-4 py-2.5">
                            <div className="font-medium text-foreground">
                              {emp.firstName} {emp.lastName || emp.fullName || ""}
                            </div>
                            <div className="text-muted-foreground text-[10px]">{emp.employeeId || emp.id}</div>
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground">{emp.department || "—"}</td>
                          <td className="px-4 py-2.5 text-muted-foreground">{shiftName}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
