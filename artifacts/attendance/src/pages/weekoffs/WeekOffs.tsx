import { useState, useEffect } from "react";
import { PageHeader, Card, Button, Input, Label } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  Plus, Trash2, Edit2, Check, X, Users, CalendarOff, ChevronRight, Save,
  UserRound, CheckCircle2, AlertCircle,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
function apiUrl(path: string) { return `${BASE}/api${path}`; }

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Schedule = {
  id: number;
  name: string;
  description: string | null;
  offDays: number[];
  halfDays: number[];
  isActive: boolean;
};

type Employee = {
  id: number;
  employeeId: string;
  fullName: string;
  designation: string;
  department: string;
  weekoffScheduleId?: number | null;
};

const BLANK_SCHEDULE: Omit<Schedule, "id"> = {
  name: "",
  description: "",
  offDays: [],
  halfDays: [],
  isActive: true,
};

export default function WeekOffs() {
  const [schedules, setSchedules]     = useState<Schedule[]>([]);
  const [employees, setEmployees]     = useState<Employee[]>([]);
  const [loading, setLoading]         = useState(true);
  const [selected, setSelected]       = useState<number | null>(null);
  const [showForm, setShowForm]       = useState(false);
  const [editId, setEditId]           = useState<number | null>(null);
  const [form, setForm]               = useState(BLANK_SCHEDULE);
  const [saving, setSaving]           = useState(false);
  const [msg, setMsg]                 = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [assignTab, setAssignTab]     = useState<"assigned" | "unassigned">("assigned");
  const [assignSearch, setAssignSearch] = useState("");
  const [assigning, setAssigning]     = useState(false);

  async function loadAll() {
    setLoading(true);
    try {
      const [sRes, eRes] = await Promise.all([
        fetch(apiUrl("/weekoffs")),
        fetch(apiUrl("/employees?limit=1000")),
      ]);
      const sData = await sRes.json();
      const eData = await eRes.json();
      setSchedules(Array.isArray(sData) ? sData : []);
      setEmployees(Array.isArray(eData.employees) ? eData.employees : Array.isArray(eData) ? eData : []);
    } catch { setMsg({ type: "error", text: "Failed to load data" }); }
    setLoading(false);
  }

  useEffect(() => { loadAll(); }, []);

  function openAdd() {
    setEditId(null);
    setForm(BLANK_SCHEDULE);
    setShowForm(true);
  }

  function openEdit(s: Schedule) {
    setEditId(s.id);
    setForm({ name: s.name, description: s.description || "", offDays: [...s.offDays], halfDays: [...s.halfDays], isActive: s.isActive });
    setShowForm(true);
  }

  async function saveSchedule() {
    if (!form.name.trim()) { setMsg({ type: "error", text: "Name is required" }); return; }
    setSaving(true); setMsg(null);
    try {
      const method = editId ? "PUT" : "POST";
      const url    = editId ? apiUrl(`/weekoffs/${editId}`) : apiUrl("/weekoffs");
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!r.ok) throw new Error("Save failed");
      setMsg({ type: "success", text: editId ? "Schedule updated" : "Schedule created" });
      setShowForm(false);
      loadAll();
    } catch { setMsg({ type: "error", text: "Failed to save schedule" }); }
    setSaving(false);
  }

  async function deleteSchedule(id: number) {
    if (!confirm("Delete this weekoff schedule? Employees assigned to it will be unassigned.")) return;
    try {
      await fetch(apiUrl(`/weekoffs/${id}`), { method: "DELETE" });
      if (selected === id) setSelected(null);
      setMsg({ type: "success", text: "Schedule deleted" });
      loadAll();
    } catch { setMsg({ type: "error", text: "Failed to delete" }); }
  }

  function toggleDay(day: number, type: "off" | "half") {
    setForm(prev => {
      const offDays  = [...prev.offDays];
      const halfDays = [...prev.halfDays];
      if (type === "off") {
        const inOff = offDays.includes(day);
        const newOff = inOff ? offDays.filter(d => d !== day) : [...offDays, day];
        const newHalf = halfDays.filter(d => d !== day);
        return { ...prev, offDays: newOff, halfDays: newHalf };
      } else {
        const inHalf = halfDays.includes(day);
        const newHalf = inHalf ? halfDays.filter(d => d !== day) : [...halfDays, day];
        const newOff = offDays.filter(d => d !== day);
        return { ...prev, offDays: newOff, halfDays: newHalf };
      }
    });
  }

  async function assignEmployee(empId: number, scheduleId: number | null) {
    setAssigning(true);
    try {
      await fetch(apiUrl("/weekoffs/assign"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeIds: [empId], weekoffScheduleId: scheduleId }),
      });
      setEmployees(prev => prev.map(e => e.id === empId ? { ...e, weekoffScheduleId: scheduleId } : e));
    } catch { setMsg({ type: "error", text: "Failed to assign" }); }
    setAssigning(false);
  }

  const selectedSchedule = schedules.find(s => s.id === selected) || null;

  const assignedEmps   = employees.filter(e => e.weekoffScheduleId === selected);
  const unassignedEmps = employees.filter(e => !e.weekoffScheduleId || e.weekoffScheduleId !== selected);

  const filteredAssigned   = assignedEmps.filter(e =>
    e.fullName.toLowerCase().includes(assignSearch.toLowerCase()) ||
    e.employeeId.toLowerCase().includes(assignSearch.toLowerCase())
  );
  const filteredUnassigned = unassignedEmps.filter(e =>
    e.fullName.toLowerCase().includes(assignSearch.toLowerCase()) ||
    e.employeeId.toLowerCase().includes(assignSearch.toLowerCase())
  );

  function dayLabel(s: Schedule) {
    if (s.offDays.length === 0 && s.halfDays.length === 0) return "No days configured";
    const parts: string[] = [];
    if (s.offDays.length) parts.push(`Off: ${s.offDays.map(d => DAY_SHORT[d]).join(", ")}`);
    if (s.halfDays.length) parts.push(`Half: ${s.halfDays.map(d => DAY_SHORT[d]).join(", ")}`);
    return parts.join("  ·  ");
  }

  return (
    <div className="flex gap-5 max-w-6xl mx-auto h-full">

      {/* ── Left Panel: Schedules ─────────────────────────────── */}
      <div className="w-72 shrink-0 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-base">Week Off Schedules</h2>
            <p className="text-xs text-muted-foreground">Configure off days per schedule</p>
          </div>
          <Button size="sm" className="gap-1.5" onClick={openAdd}>
            <Plus className="w-3.5 h-3.5" /> New
          </Button>
        </div>

        {msg && (
          <div className={cn("flex items-center gap-2 p-2.5 rounded-lg text-xs font-medium",
            msg.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
          )}>
            {msg.type === "success" ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
            {msg.text}
          </div>
        )}

        {loading ? (
          <div className="text-xs text-muted-foreground text-center py-8">Loading…</div>
        ) : schedules.length === 0 ? (
          <Card className="p-6 text-center">
            <CalendarOff className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium">No schedules yet</p>
            <p className="text-xs text-muted-foreground mt-1">Create a weekoff schedule to get started</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {schedules.map(s => {
              const empCount = employees.filter(e => e.weekoffScheduleId === s.id).length;
              return (
                <div
                  key={s.id}
                  onClick={() => { setSelected(s.id); setAssignSearch(""); setAssignTab("assigned"); }}
                  className={cn(
                    "rounded-xl border p-3 cursor-pointer transition-all",
                    selected === s.id
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-primary/40 hover:bg-muted/30 bg-card"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm truncate">{s.name}</p>
                      {s.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{s.description}</p>}
                      <p className="text-[10px] text-muted-foreground mt-1">{dayLabel(s)}</p>
                      <div className="flex items-center gap-1 mt-1.5">
                        <Users className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[11px] text-muted-foreground">{empCount} employee{empCount !== 1 ? "s" : ""}</span>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={e => { e.stopPropagation(); openEdit(s); }}
                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={e => { e.stopPropagation(); deleteSchedule(s.id); }}
                        className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {selected === s.id && <ChevronRight className="w-3 h-3 text-primary mt-1" />}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Right Panel ───────────────────────────────────────── */}
      <div className="flex-1 min-w-0">
        {showForm ? (
          <Card className="p-5 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">{editId ? "Edit Schedule" : "New Weekoff Schedule"}</h3>
                <p className="text-xs text-muted-foreground">Define which days are off or half-day</p>
              </div>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded hover:bg-muted text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 md:col-span-1">
                <Label className="text-xs mb-1.5 block">Schedule Name *</Label>
                <Input
                  placeholder="e.g. Standard 5-Day, Field Staff, Weekend Off"
                  value={form.name}
                  onChange={e => setForm(s => ({ ...s, name: e.target.value }))}
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <Label className="text-xs mb-1.5 block">Description</Label>
                <Input
                  placeholder="Optional description"
                  value={form.description || ""}
                  onChange={e => setForm(s => ({ ...s, description: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label className="text-xs mb-3 block">Configure Days of Week</Label>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground w-32">Day</th>
                      <th className="py-2 px-4 text-xs font-semibold text-center">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 rounded-full border border-red-200">
                          Full Day Off
                        </span>
                      </th>
                      <th className="py-2 px-4 text-xs font-semibold text-center">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-200">
                          Half Day
                        </span>
                      </th>
                      <th className="py-2 px-4 text-xs font-semibold text-center text-muted-foreground">Working</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DAY_NAMES.map((name, i) => {
                      const isOff  = form.offDays.includes(i);
                      const isHalf = form.halfDays.includes(i);
                      const isWork = !isOff && !isHalf;
                      return (
                        <tr key={i} className={cn(
                          "border-b border-border/50 transition-colors",
                          isOff  ? "bg-red-50/40" :
                          isHalf ? "bg-amber-50/40" : ""
                        )}>
                          <td className={cn("py-2.5 px-3 font-semibold text-sm",
                            isOff  ? "text-red-700" :
                            isHalf ? "text-amber-700" : "text-foreground"
                          )}>
                            {name}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <button
                              onClick={() => toggleDay(i, "off")}
                              className={cn(
                                "w-7 h-7 rounded-lg border-2 flex items-center justify-center mx-auto transition-all",
                                isOff
                                  ? "bg-red-500 border-red-500 text-white shadow-sm"
                                  : "border-border hover:border-red-300 hover:bg-red-50 text-transparent hover:text-red-300"
                              )}
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <button
                              onClick={() => toggleDay(i, "half")}
                              className={cn(
                                "w-7 h-7 rounded-lg border-2 flex items-center justify-center mx-auto transition-all",
                                isHalf
                                  ? "bg-amber-400 border-amber-400 text-white shadow-sm"
                                  : "border-border hover:border-amber-300 hover:bg-amber-50 text-transparent hover:text-amber-300"
                              )}
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            {isWork && <span className="text-xs text-green-600 font-medium">✓ Working</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-3 mt-3 flex-wrap">
                {form.offDays.length > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 rounded-full text-xs text-red-700 font-medium">
                    <CalendarOff className="w-3 h-3" />
                    Off: {form.offDays.map(d => DAY_SHORT[d]).join(", ")}
                  </div>
                )}
                {form.halfDays.length > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full text-xs text-amber-700 font-medium">
                    Half Day: {form.halfDays.map(d => DAY_SHORT[d]).join(", ")}
                  </div>
                )}
                {form.offDays.length === 0 && form.halfDays.length === 0 && (
                  <span className="text-xs text-muted-foreground italic">No days marked — all days are working days</span>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={saveSchedule} disabled={saving} className="gap-1.5">
                <Save className="w-3.5 h-3.5" />
                {saving ? "Saving…" : "Save Schedule"}
              </Button>
            </div>
          </Card>
        ) : selectedSchedule ? (
          <div className="space-y-4">
            <Card className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-bold text-base">{selectedSchedule.name}</h3>
                  {selectedSchedule.description && <p className="text-sm text-muted-foreground mt-0.5">{selectedSchedule.description}</p>}
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {selectedSchedule.offDays.map(d => (
                      <span key={d} className="px-2 py-0.5 bg-red-100 text-red-700 border border-red-200 rounded-full text-[11px] font-medium">
                        {DAY_NAMES[d]} — Off
                      </span>
                    ))}
                    {selectedSchedule.halfDays.map(d => (
                      <span key={d} className="px-2 py-0.5 bg-amber-100 text-amber-700 border border-amber-200 rounded-full text-[11px] font-medium">
                        {DAY_NAMES[d]} — Half Day
                      </span>
                    ))}
                    {selectedSchedule.offDays.length === 0 && selectedSchedule.halfDays.length === 0 && (
                      <span className="text-xs text-muted-foreground">No days configured</span>
                    )}
                  </div>
                </div>
                <Button size="sm" variant="outline" className="gap-1.5 shrink-0" onClick={() => openEdit(selectedSchedule)}>
                  <Edit2 className="w-3.5 h-3.5" /> Edit
                </Button>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div>
                  <h4 className="font-semibold text-sm">Employee Assignment</h4>
                  <p className="text-xs text-muted-foreground">
                    {assignedEmps.length} assigned · {unassignedEmps.length} unassigned
                  </p>
                </div>
                <Input
                  className="w-48 text-xs"
                  placeholder="Search employee…"
                  value={assignSearch}
                  onChange={e => setAssignSearch(e.target.value)}
                />
              </div>

              <div className="flex gap-1 mb-3">
                <button
                  onClick={() => setAssignTab("assigned")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                    assignTab === "assigned"
                      ? "bg-primary text-white"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  Assigned ({assignedEmps.length})
                </button>
                <button
                  onClick={() => setAssignTab("unassigned")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                    assignTab === "unassigned"
                      ? "bg-primary text-white"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  Add Employees ({unassignedEmps.length})
                </button>
              </div>

              {assignTab === "assigned" && (
                filteredAssigned.length === 0 ? (
                  <div className="text-center py-8 text-xs text-muted-foreground">
                    <UserRound className="w-6 h-6 mx-auto mb-1.5 opacity-40" />
                    {assignSearch ? "No matching employees" : "No employees assigned yet"}
                  </div>
                ) : (
                  <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
                    {filteredAssigned.map(e => (
                      <div key={e.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{e.fullName}</p>
                          <p className="text-[11px] text-muted-foreground">{e.employeeId} · {e.designation}</p>
                        </div>
                        <button
                          onClick={() => assignEmployee(e.id, null)}
                          disabled={assigning}
                          title="Remove from schedule"
                          className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors shrink-0 ml-2"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )
              )}

              {assignTab === "unassigned" && (
                filteredUnassigned.length === 0 ? (
                  <div className="text-center py-8 text-xs text-muted-foreground">
                    <CheckCircle2 className="w-6 h-6 mx-auto mb-1.5 text-green-500 opacity-60" />
                    {assignSearch ? "No matching employees" : "All employees are assigned to this schedule"}
                  </div>
                ) : (
                  <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
                    {filteredUnassigned.map(e => (
                      <div key={e.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{e.fullName}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {e.employeeId} · {e.designation}
                            {e.weekoffScheduleId && (
                              <span className="ml-1 text-amber-600">
                                (assigned to other schedule)
                              </span>
                            )}
                          </p>
                        </div>
                        <button
                          onClick={() => assignEmployee(e.id, selected)}
                          disabled={assigning}
                          title="Add to this schedule"
                          className="p-1 rounded hover:bg-green-50 text-muted-foreground hover:text-green-600 transition-colors shrink-0 ml-2"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )
              )}
            </Card>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full min-h-64 text-center">
            <CalendarOff className="w-12 h-12 text-muted-foreground opacity-40 mb-3" />
            <p className="font-medium text-muted-foreground">Select a schedule</p>
            <p className="text-xs text-muted-foreground mt-1">Choose a schedule from the left to manage employee assignments</p>
          </div>
        )}
      </div>
    </div>
  );
}
