import { useState, useEffect } from "react";
import { PageHeader, Card, Button, Input, Label, Select } from "@/components/ui";
import {
  Plus, Trash2, Save, RefreshCw, Check, AlertTriangle, X, Edit2, Users, Settings, Settings2,
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
  notes: string;
}

interface Department { id: number; name: string; isActive: boolean; }
interface ShiftOption  { id: number; name: string; startTime1: string; endTime1: string; isActive: boolean; }

const BLANK_RULE: DeptShiftRule = {
  id: "", department: "", shift: "", minHours: 9, maxHours: 9,
  otEligible: true, otAfterHours: 9.5, lateGraceMinutes: 15,
  lunchMinHours: 1, lunchMaxHours: 1,
  flexible: false, multipleLogin: false,
  otMultiplier: 1.5, offdayOtMultiplier: 1.5,
  holidayOtMultiplier: 1.5, weeklyLeaveDays: 1.5, halfDayHours: 5,
  minPresentHours: 8,
  notes: "",
};

const COLS = [
  "Department", "Shift", "Start Time", "End Time", "Min h", "Break h", "OT?", "OT After",
  "Grace", "Flex", "Multi", "Wk Leave", "Half-day h", "Present h", "Holiday OT", "Offday OT", "OT ×", "Staff", "Notes", "",
];

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
  const [rules, setRules]           = useState<DeptShiftRule[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [shiftOptions, setShiftOptions] = useState<ShiftOption[]>([]);
  const [employees, setEmployees]   = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const [globalSettings, setGlobalSettings] = useState({ earlyInMinutes: 30 });
  const [globalSaving, setGlobalSaving] = useState(false);
  const [globalSaved,  setGlobalSaved]  = useState(false);

  const [showModal, setShowModal]   = useState(false);
  const [modalMode, setModalMode]   = useState<"add" | "edit">("add");
  const [editing, setEditing]       = useState<DeptShiftRule>(BLANK_RULE);
  const [staffModal, setStaffModal] = useState<{ rule: DeptShiftRule; emps: any[] } | null>(null);

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
      setGlobalSettings({ earlyInMinutes: hrData.earlyInMinutes ?? 30 });
      if (Array.isArray(depts)) setDepartments(depts.filter((d: Department) => d.isActive !== false));
      if (Array.isArray(shiftsData)) setShiftOptions(shiftsData.filter((s: ShiftOption) => s.isActive !== false));
      const emps = Array.isArray(empsData?.employees) ? empsData.employees
        : Array.isArray(empsData) ? empsData : [];
      setEmployees(emps.filter((e: any) => e.status !== "terminated"));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function saveGlobalSettings() {
    setGlobalSaving(true);
    try {
      const r = await fetch(apiUrl("/hr-settings"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ earlyInMinutes: globalSettings.earlyInMinutes }),
      });
      const d = await r.json();
      if (d.id || d.earlyInMinutes != null) { setGlobalSaved(true); setTimeout(() => setGlobalSaved(false), 2500); }
    } catch {}
    setGlobalSaving(false);
  }

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
    setEditing({ ...rule });
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

  function lunchLabel(r: DeptShiftRule) {
    if (r.lunchMinHours == null) return "—";
    if (r.lunchMaxHours != null && r.lunchMaxHours !== r.lunchMinHours)
      return `${r.lunchMinHours}–${r.lunchMaxHours}`;
    return `${r.lunchMinHours}`;
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

  function getShiftTimes(shiftName: string): { start: string; end: string } {
    const s = shiftOptions.find(o => o.name.toLowerCase() === shiftName.toLowerCase());
    if (!s || !s.startTime1) return { start: "—", end: "—" };
    return { start: s.startTime1, end: s.endTime1 };
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
        description="Per-department attendance, overtime, and shift rules — used across attendance, reports, and payroll"
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
              {noDepts  && <li>No departments found — please add departments first (Settings → Departments)</li>}
              {noShifts && <li>No shifts found — please configure shifts first (Settings → Shifts)</li>}
            </ul>
          </div>
        </div>
      )}

      {/* Global Attendance Defaults */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-bold">Global Attendance Defaults</span>
            <span className="text-xs text-muted-foreground ml-1">— applies to all employees unless overridden</span>
          </div>
          <div className="flex items-center gap-3">
            {globalSaving && <span className="text-xs text-muted-foreground flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin" />Saving…</span>}
            {globalSaved  && <span className="text-xs text-emerald-600 flex items-center gap-1"><Check className="w-3 h-3" />Saved</span>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6 max-w-lg">
          <div>
            <label className="text-xs font-medium block mb-1">Early-In Window (minutes) <span className="text-muted-foreground font-normal">(before shift start)</span></label>
            <div className="flex items-center gap-2">
              <input
                type="number" min="0" step="1"
                className="border border-border rounded-md px-3 py-1.5 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-ring"
                value={globalSettings.earlyInMinutes}
                onChange={e => setGlobalSettings(g => ({ ...g, earlyInMinutes: parseInt(e.target.value) || 0 }))}
              />
              <Button className="h-8 text-xs" onClick={saveGlobalSettings} disabled={globalSaving}>Save</Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Attendance is not recorded earlier than this many minutes before the shift starts.</p>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-violet-600" />
            <span className="text-sm font-bold">Department Shift Rules</span>
            <span className="text-xs text-muted-foreground ml-1">— attendance, OT &amp; payroll rules per department+shift</span>
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
            <table className="w-full text-xs min-w-[1300px]">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {COLS.map(h => (
                    <th key={h} className="text-left px-3 py-2.5 font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rules.map((rule, i) => {
                  const times = getShiftTimes(rule.shift);
                  return (
                  <tr key={rule.id} className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${i % 2 !== 0 ? "bg-muted/10" : ""}`}>
                    <td className="px-3 py-2.5 font-medium text-foreground whitespace-nowrap">{rule.department}</td>
                    <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{rule.shift}</td>
                    <td className="px-3 py-2.5 text-center font-mono text-xs">
                      {rule.flexible ? <span className="text-muted-foreground">—</span> : times.start}
                    </td>
                    <td className="px-3 py-2.5 text-center font-mono text-xs">
                      {rule.flexible ? <span className="text-muted-foreground">—</span> : times.end}
                    </td>
                    <td className="px-3 py-2.5 text-center">{rule.minHours || <span className="text-muted-foreground">—</span>}</td>
                    <td className="px-3 py-2.5 text-center">{lunchLabel(rule)}</td>
                    <td className="px-3 py-2.5 text-center"><YesNo v={rule.otEligible} /></td>
                    <td className="px-3 py-2.5 text-center">
                      {rule.otAfterHours != null ? `${rule.otAfterHours}h` : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {rule.lateGraceMinutes != null ? `${rule.lateGraceMinutes} min` : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center"><YesNo v={rule.flexible} yes="bg-blue-100 text-blue-700" /></td>
                    <td className="px-3 py-2.5 text-center"><YesNo v={rule.multipleLogin} yes="bg-blue-100 text-blue-700" /></td>
                    <td className="px-3 py-2.5 text-center">
                      {rule.weeklyLeaveDays != null ? `${rule.weeklyLeaveDays}d` : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {rule.halfDayHours != null ? `${rule.halfDayHours}h` : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {rule.minPresentHours != null ? `${rule.minPresentHours}h` : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {rule.holidayOtMultiplier != null ? `${rule.holidayOtMultiplier}×` : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {rule.offdayOtMultiplier != null ? `${rule.offdayOtMultiplier}×` : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {rule.otMultiplier != null ? `${rule.otMultiplier}×` : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {(() => {
                        const count = getMatchedEmployees(rule).length;
                        return (
                          <button
                            onClick={() => openStaffModal(rule)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors hover:bg-primary/15
                              bg-primary/10 text-primary"
                          >
                            <Users className="w-2.5 h-2.5" />{count}
                          </button>
                        );
                      })()}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground max-w-[120px] truncate">{rule.notes || "—"}</td>
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
                  );
                })}
                {rules.length === 0 && (
                  <tr>
                    <td colSpan={19} className="px-3 py-10 text-center text-muted-foreground text-xs">
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

      {/* ── Legend ── */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Settings className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground">Column Legend</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-1 text-xs text-muted-foreground">
          <span><b>Start / End Time</b> — shift working hours from the shift table</span>
          <span><b>Min h</b> — minimum hours per day for full pay</span>
          <span><b>Break h</b> — lunch/break hours deducted from total</span>
          <span><b>OT?</b> — overtime eligible</span>
          <span><b>OT After</b> — OT kicks in after these hours</span>
          <span><b>Grace</b> — late grace period (minutes)</span>
          <span><b>Flex</b> — flexible schedule (no fixed start/end)</span>
          <span><b>Multi</b> — multiple check-in/out sessions allowed</span>
          <span><b>Wk Leave</b> — weekly leave days entitlement</span>
          <span><b>Half-day h</b> — hours threshold for half-day</span>
          <span><b>Holiday OT</b> — holiday worked rate multiplier</span>
          <span><b>Offday OT</b> — off-day worked rate multiplier</span>
          <span><b>OT ×</b> — regular overtime rate multiplier</span>
          <span><b>Staff</b> — active employees assigned to this rule (click to view)</span>
        </div>
      </Card>

      {/* ── Add / Edit Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-border">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-violet-600" />
                <span className="font-bold text-sm">{modalMode === "add" ? "Add" : "Edit"} Department Rule</span>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-muted">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Department + Shift — dropdowns from DB */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-medium mb-1 block">Department *</Label>
                  <Select
                    value={editing.department}
                    onChange={e => setE("department", e.target.value)}
                  >
                    <option value="">— Select department —</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                  </Select>
                  {departments.length === 0 && (
                    <p className="text-[10px] text-amber-600 mt-1">No departments configured yet.</p>
                  )}
                </div>
                <div>
                  <Label className="text-xs font-medium mb-1 block">Shift *</Label>
                  <Select
                    value={editing.shift}
                    onChange={e => setE("shift", e.target.value)}
                  >
                    <option value="">— Select shift —</option>
                    {shiftOptions.map(s => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </Select>
                  {shiftOptions.length === 0 && (
                    <p className="text-[10px] text-amber-600 mt-1">No shifts configured yet.</p>
                  )}
                </div>
              </div>

              {/* Hours */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-medium mb-1 block">Min Hours / Day</Label>
                  <Input type="number" step="0.5" min="0"
                    value={editing.minHours}
                    onChange={e => setE("minHours", parseFloat(e.target.value) || 0)} />
                </div>
                <div>
                  <Label className="text-xs font-medium mb-1 block">Max Hours / Day <span className="text-muted-foreground font-normal">(blank = unlimited)</span></Label>
                  <Input type="number" step="0.5" min="0"
                    value={editing.maxHours ?? ""}
                    onChange={e => setE("maxHours", e.target.value === "" ? null : parseFloat(e.target.value))}
                    placeholder="—" />
                </div>
              </div>

              {/* OT settings */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs font-medium mb-1 block">OT Eligible</Label>
                  <Select value={editing.otEligible ? "yes" : "no"} onChange={e => setE("otEligible", e.target.value === "yes")}>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-medium mb-1 block">OT After (hours) <span className="text-muted-foreground font-normal">(blank = N/A)</span></Label>
                  <Input type="number" step="0.5" min="0"
                    value={editing.otAfterHours ?? ""}
                    onChange={e => setE("otAfterHours", e.target.value === "" ? null : parseFloat(e.target.value))}
                    placeholder="—" />
                </div>
                <div>
                  <Label className="text-xs font-medium mb-1 block">OT Multiplier <span className="text-muted-foreground font-normal">(blank = N/A)</span></Label>
                  <Input type="number" step="0.1" min="0"
                    value={editing.otMultiplier ?? ""}
                    onChange={e => setE("otMultiplier", e.target.value === "" ? null : parseFloat(e.target.value))}
                    placeholder="—" />
                </div>
              </div>

              {/* Off-day + Holiday OT */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-medium mb-1 block">Off-Day OT Multiplier <span className="text-muted-foreground font-normal">(blank = use global)</span></Label>
                  <Input type="number" step="0.1" min="0"
                    value={editing.offdayOtMultiplier ?? ""}
                    onChange={e => setE("offdayOtMultiplier", e.target.value === "" ? null : parseFloat(e.target.value))}
                    placeholder="—" />
                </div>
                <div>
                  <Label className="text-xs font-medium mb-1 block">Holiday OT Multiplier <span className="text-muted-foreground font-normal">(blank = use global)</span></Label>
                  <Input type="number" step="0.1" min="0"
                    value={editing.holidayOtMultiplier ?? ""}
                    onChange={e => setE("holidayOtMultiplier", e.target.value === "" ? null : parseFloat(e.target.value))}
                    placeholder="—" />
                </div>
              </div>

              {/* Grace + Lunch */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs font-medium mb-1 block">Late Grace (min) <span className="text-muted-foreground font-normal">(blank = no grace)</span></Label>
                  <Input type="number" step="1" min="0"
                    value={editing.lateGraceMinutes ?? ""}
                    onChange={e => setE("lateGraceMinutes", e.target.value === "" ? null : parseInt(e.target.value))}
                    placeholder="—" />
                </div>
                <div>
                  <Label className="text-xs font-medium mb-1 block">Lunch Min (hrs)</Label>
                  <Input type="number" step="0.5" min="0"
                    value={editing.lunchMinHours ?? ""}
                    onChange={e => setE("lunchMinHours", e.target.value === "" ? null : parseFloat(e.target.value))}
                    placeholder="—" />
                </div>
                <div>
                  <Label className="text-xs font-medium mb-1 block">Lunch Max (hrs) <span className="text-muted-foreground font-normal">(blank = same)</span></Label>
                  <Input type="number" step="0.5" min="0"
                    value={editing.lunchMaxHours ?? ""}
                    onChange={e => setE("lunchMaxHours", e.target.value === "" ? null : parseFloat(e.target.value))}
                    placeholder="—" />
                </div>
              </div>

              {/* Leave + Half-day */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-medium mb-1 block">Weekly Leave Days <span className="text-muted-foreground font-normal">(e.g. 1.5, 0 for night shift)</span></Label>
                  <Input type="number" step="0.5" min="0"
                    value={editing.weeklyLeaveDays ?? ""}
                    onChange={e => setE("weeklyLeaveDays", e.target.value === "" ? null : parseFloat(e.target.value))}
                    placeholder="1.5" />
                </div>
                <div>
                  <Label className="text-xs font-medium mb-1 block">Half-Day Threshold (hrs) <span className="text-muted-foreground font-normal">(below this → absent)</span></Label>
                  <Input type="number" step="0.5" min="0"
                    value={editing.halfDayHours ?? ""}
                    onChange={e => setE("halfDayHours", e.target.value === "" ? null : parseFloat(e.target.value))}
                    placeholder="5" />
                </div>
                <div>
                  <Label className="text-xs font-medium mb-1 block">Min Present Hours <span className="text-muted-foreground font-normal">(below this → half-day)</span></Label>
                  <Input type="number" step="0.5" min="0"
                    value={editing.minPresentHours ?? ""}
                    onChange={e => setE("minPresentHours", e.target.value === "" ? null : parseFloat(e.target.value))}
                    placeholder="8" />
                </div>
              </div>

              {/* Flexible + Multi-login */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-medium mb-1 block">Flexible Hours</Label>
                  <Select value={editing.flexible ? "yes" : "no"} onChange={e => setE("flexible", e.target.value === "yes")}>
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-medium mb-1 block">Multiple Login Allowed</Label>
                  <Select value={editing.multipleLogin ? "yes" : "no"} onChange={e => setE("multipleLogin", e.target.value === "yes")}>
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-xs font-medium mb-1 block">Notes</Label>
                <Input value={editing.notes} onChange={e => setE("notes", e.target.value)} placeholder="Any additional notes…" />
              </div>
            </div>

            <div className="flex justify-end gap-2 p-5 border-t border-border">
              <Button variant="outline" className="text-xs h-9" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button
                className="text-xs h-9 flex items-center gap-1.5"
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
