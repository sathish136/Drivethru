import { useState, useEffect } from "react";
import { PageHeader, Card, Button, Input, Label, Select } from "@/components/ui";
import {
  Plus, Trash2, Save, RefreshCw, Check, AlertTriangle, X, Edit2, Users,
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
  notes: string;
}

const DEFAULT_RULES: DeptShiftRule[] = [
  { id: "1", department: "Kitchen",       shift: "Kitchen Shift", minHours: 9, maxHours: 12,   otEligible: true,  otAfterHours: 9.5, lateGraceMinutes: 15, lunchMinHours: 1, lunchMaxHours: 2, flexible: false, multipleLogin: false, otMultiplier: 1.5, offdayOtMultiplier: 1.5, notes: "Split shift"    },
  { id: "2", department: "House Keeping", shift: "Regular",       minHours: 9, maxHours: 9,    otEligible: true,  otAfterHours: 9.5, lateGraceMinutes: 15, lunchMinHours: 1, lunchMaxHours: 1, flexible: false, multipleLogin: false, otMultiplier: 1.5, offdayOtMultiplier: 1.5, notes: "Lunch tracking" },
  { id: "3", department: "Maintenance",   shift: "Regular",       minHours: 9, maxHours: 9,    otEligible: true,  otAfterHours: 9.5, lateGraceMinutes: 15, lunchMinHours: 1, lunchMaxHours: 1, flexible: false, multipleLogin: false, otMultiplier: 1.5, offdayOtMultiplier: 1.5, notes: "Standard"      },
  { id: "4", department: "Surf",          shift: "Flexible",      minHours: 0, maxHours: null, otEligible: true,  otAfterHours: 9,   lateGraceMinutes: null, lunchMinHours: null, lunchMaxHours: null, flexible: true,  multipleLogin: true,  otMultiplier: 1.5, offdayOtMultiplier: 1.5, notes: "Flexible work" },
  { id: "5", department: "Admin",         shift: "Regular",       minHours: 9, maxHours: 9,    otEligible: true,  otAfterHours: 9.5, lateGraceMinutes: 15, lunchMinHours: 1, lunchMaxHours: 1, flexible: false, multipleLogin: false, otMultiplier: 1.5, offdayOtMultiplier: 1.5, notes: "Office"        },
  { id: "6", department: "Security",      shift: "Night",         minHours: 9, maxHours: 12,   otEligible: true,  otAfterHours: 9,   lateGraceMinutes: 15, lunchMinHours: 1, lunchMaxHours: 1, flexible: false, multipleLogin: false, otMultiplier: 1.5, offdayOtMultiplier: 1.5, notes: "Night shift"   },
  { id: "7", department: "Manager",       shift: "Flexible",      minHours: 0, maxHours: null, otEligible: false, otAfterHours: null, lateGraceMinutes: null, lunchMinHours: null, lunchMaxHours: null, flexible: true,  multipleLogin: true,  otMultiplier: null, offdayOtMultiplier: 1.5, notes: "No OT"  },
];

const BLANK_RULE: DeptShiftRule = {
  id: "", department: "", shift: "", minHours: 9, maxHours: 9,
  otEligible: true, otAfterHours: 9.5, lateGraceMinutes: 15,
  lunchMinHours: 1, lunchMaxHours: 1,
  flexible: false, multipleLogin: false,
  otMultiplier: 1.5, offdayOtMultiplier: 1.5, notes: "",
};

const COLS = [
  "Department", "Shift", "Min h", "Max h", "OT?", "OT After",
  "Grace", "Lunch (hrs)", "Flex", "Multi Login", "OT ×", "Offday ×", "Notes", "",
];

export default function HRSettings() {
  const [rules, setRules] = useState<DeptShiftRule[]>(DEFAULT_RULES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [editing, setEditing] = useState<DeptShiftRule>(BLANK_RULE);

  useEffect(() => {
    setLoading(true);
    fetch(apiUrl("/hr-settings"))
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d.departmentRules) && d.departmentRules.length > 0) {
          const r = d.departmentRules as DeptShiftRule[];
          if (r[0] && "department" in r[0] && "shift" in r[0]) {
            setRules(r);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
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
    setEditing({ ...BLANK_RULE, id: crypto.randomUUID() });
    setModalMode("add");
    setShowModal(true);
  }

  function openEdit(rule: DeptShiftRule) {
    setEditing({ ...rule });
    setModalMode("edit");
    setShowModal(true);
  }

  function commitModal() {
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

  const YesNo = ({ v, yes = "bg-emerald-100 text-emerald-700", no = "bg-slate-100 text-slate-500" }: { v: boolean; yes?: string; no?: string }) => (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${v ? yes : no}`}>
      {v ? "Yes" : "No"}
    </span>
  );

  return (
    <div className="space-y-5 max-w-full">
      <PageHeader
        title="HR Settings"
        description="Per-department attendance, overtime, and shift rules"
      />

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm bg-red-50 text-red-700 border border-red-200">
          <AlertTriangle className="w-4 h-4 shrink-0" />{error}
          <button onClick={() => setError(null)} className="ml-auto p-0.5 rounded hover:bg-red-100"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-violet-600" />
            <span className="text-sm font-bold">Department Shift Rules</span>
            <span className="text-xs text-muted-foreground ml-1">— per-department attendance & OT configuration</span>
          </div>
          <div className="flex items-center gap-3">
            {saving && <span className="text-xs text-muted-foreground flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin" />Saving…</span>}
            {saved  && <span className="text-xs text-emerald-600 flex items-center gap-1"><Check className="w-3 h-3" />Saved</span>}
            <Button className="flex items-center gap-1.5 text-xs h-8" onClick={openAdd}>
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
            <table className="w-full text-xs min-w-[960px]">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {COLS.map(h => (
                    <th key={h} className="text-left px-3 py-2.5 font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rules.map((rule, i) => (
                  <tr key={rule.id} className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${i % 2 !== 0 ? "bg-muted/10" : ""}`}>
                    <td className="px-3 py-2.5 font-medium text-foreground whitespace-nowrap">{rule.department}</td>
                    <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{rule.shift}</td>
                    <td className="px-3 py-2.5 text-center">{rule.minHours}</td>
                    <td className="px-3 py-2.5 text-center">{rule.maxHours ?? <span className="text-muted-foreground">—</span>}</td>
                    <td className="px-3 py-2.5 text-center"><YesNo v={rule.otEligible} /></td>
                    <td className="px-3 py-2.5 text-center">
                      {rule.otAfterHours != null ? `${rule.otAfterHours}h` : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {rule.lateGraceMinutes != null ? `${rule.lateGraceMinutes} min` : <span className="text-muted-foreground">No</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center">{lunchLabel(rule)}</td>
                    <td className="px-3 py-2.5 text-center"><YesNo v={rule.flexible} yes="bg-blue-100 text-blue-700" /></td>
                    <td className="px-3 py-2.5 text-center"><YesNo v={rule.multipleLogin} yes="bg-blue-100 text-blue-700" /></td>
                    <td className="px-3 py-2.5 text-center">
                      {rule.otMultiplier != null ? `${rule.otMultiplier}×` : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {rule.offdayOtMultiplier != null ? `${rule.offdayOtMultiplier}×` : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground max-w-[130px] truncate">{rule.notes || "—"}</td>
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
                    <td colSpan={14} className="px-3 py-10 text-center text-muted-foreground text-xs">
                      No rules yet. Click "Add Rule" to create one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-medium mb-1 block">Department *</Label>
                  <Input value={editing.department} onChange={e => setE("department", e.target.value)} placeholder="e.g. Kitchen" />
                </div>
                <div>
                  <Label className="text-xs font-medium mb-1 block">Shift *</Label>
                  <Input value={editing.shift} onChange={e => setE("shift", e.target.value)} placeholder="e.g. Kitchen Shift" />
                </div>
              </div>

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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-medium mb-1 block">Offday OT Multiplier <span className="text-muted-foreground font-normal">(blank = N/A)</span></Label>
                  <Input type="number" step="0.1" min="0"
                    value={editing.offdayOtMultiplier ?? ""}
                    onChange={e => setE("offdayOtMultiplier", e.target.value === "" ? null : parseFloat(e.target.value))}
                    placeholder="—" />
                </div>
                <div>
                  <Label className="text-xs font-medium mb-1 block">Late Grace (minutes) <span className="text-muted-foreground font-normal">(blank = no grace)</span></Label>
                  <Input type="number" step="1" min="0"
                    value={editing.lateGraceMinutes ?? ""}
                    onChange={e => setE("lateGraceMinutes", e.target.value === "" ? null : parseInt(e.target.value))}
                    placeholder="—" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-medium mb-1 block">Lunch Min (hrs) <span className="text-muted-foreground font-normal">(blank = N/A)</span></Label>
                  <Input type="number" step="0.5" min="0"
                    value={editing.lunchMinHours ?? ""}
                    onChange={e => setE("lunchMinHours", e.target.value === "" ? null : parseFloat(e.target.value))}
                    placeholder="—" />
                </div>
                <div>
                  <Label className="text-xs font-medium mb-1 block">Lunch Max (hrs) <span className="text-muted-foreground font-normal">(blank = same as min)</span></Label>
                  <Input type="number" step="0.5" min="0"
                    value={editing.lunchMaxHours ?? ""}
                    onChange={e => setE("lunchMaxHours", e.target.value === "" ? null : parseFloat(e.target.value))}
                    placeholder="—" />
                </div>
              </div>

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
    </div>
  );
}
