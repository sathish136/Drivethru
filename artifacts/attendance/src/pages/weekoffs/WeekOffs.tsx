import { useState, useEffect, useMemo } from "react";
import { Card, Button, Input, Label } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  Plus, Trash2, Edit2, Check, X, Users, CalendarOff, Save,
  UserRound, CheckCircle2, AlertCircle, Search, UserCheck, UserMinus,
  Calendar, Coffee, ListFilter, LayoutList, Layers, ChevronDown,
  RefreshCw, Building2, ChevronLeft, ChevronRight, Clock,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
function apiUrl(path: string) { return `${BASE}/api${path}`; }

const DAYS = [
  { short: "Sun", full: "Sunday",    idx: 0 },
  { short: "Mon", full: "Monday",    idx: 1 },
  { short: "Tue", full: "Tuesday",   idx: 2 },
  { short: "Wed", full: "Wednesday", idx: 3 },
  { short: "Thu", full: "Thursday",  idx: 4 },
  { short: "Fri", full: "Friday",    idx: 5 },
  { short: "Sat", full: "Saturday",  idx: 6 },
];

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
  branchName?: string;
  weekoffScheduleId?: number | null;
};

const BLANK: Omit<Schedule, "id"> = { name: "", description: "", offDays: [], halfDays: [], isActive: true };

/* ── Day grid pill row ─────────────────────────────────────── */
function DayGrid({ offDays, halfDays, size = "md" }: { offDays: number[]; halfDays: number[]; size?: "sm" | "md" | "xs" }) {
  return (
    <div className={cn("flex", size === "xs" ? "gap-0.5" : size === "sm" ? "gap-0.5" : "gap-1")}>
      {DAYS.map(d => {
        const isOff  = offDays.includes(d.idx);
        const isHalf = halfDays.includes(d.idx);
        return (
          <div
            key={d.idx}
            title={`${d.full}: ${isOff ? "Day Off" : isHalf ? "Half Day" : "Working"}`}
            className={cn(
              "flex flex-col items-center rounded font-bold transition-all",
              size === "xs" ? "w-6 py-0.5" : size === "sm" ? "w-7 py-1" : "w-9 py-1.5 gap-0.5",
              isOff  ? "bg-red-100 text-red-700 border border-red-200" :
              isHalf ? "bg-amber-100 text-amber-700 border border-amber-200" :
              "bg-muted/60 text-muted-foreground border border-transparent"
            )}
          >
            <span className={cn(size === "xs" ? "text-[8px]" : size === "sm" ? "text-[9px]" : "text-[10px]")}>{d.short}</span>
            {size === "md" && (
              <span className="text-[8px] leading-tight">
                {isOff ? "Off" : isHalf ? "½" : "·"}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Schedule create/edit form ─────────────────────────────── */
function ScheduleForm({ initial, onSave, onCancel, saving }: {
  initial: Omit<Schedule, "id">;
  onSave: (data: Omit<Schedule, "id">) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState(initial);

  function toggle(idx: number, type: "off" | "half") {
    setForm(prev => {
      if (type === "off") {
        const inOff = prev.offDays.includes(idx);
        return { ...prev, offDays: inOff ? prev.offDays.filter(d => d !== idx) : [...prev.offDays, idx], halfDays: prev.halfDays.filter(d => d !== idx) };
      } else {
        const inHalf = prev.halfDays.includes(idx);
        return { ...prev, halfDays: inHalf ? prev.halfDays.filter(d => d !== idx) : [...prev.halfDays, idx], offDays: prev.offDays.filter(d => d !== idx) };
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs font-semibold mb-1.5 block">Schedule Name *</Label>
          <Input autoFocus placeholder="e.g. Standard 5-Day, Weekend Off" value={form.name} onChange={e => setForm(s => ({ ...s, name: e.target.value }))} />
        </div>
        <div>
          <Label className="text-xs font-semibold mb-1.5 block">Description</Label>
          <Input placeholder="Optional" value={form.description || ""} onChange={e => setForm(s => ({ ...s, description: e.target.value }))} />
        </div>
      </div>
      <div>
        <Label className="text-xs font-semibold mb-3 block">Day Configuration</Label>
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="grid grid-cols-4 gap-0 text-[10px] font-bold text-muted-foreground bg-muted/40 border-b border-border px-4 py-2">
            <span>Day</span>
            <span className="text-center text-red-600">Full Day Off</span>
            <span className="text-center text-amber-600">Half Day</span>
            <span className="text-center text-green-600">Working</span>
          </div>
          {DAYS.map(d => {
            const isOff  = form.offDays.includes(d.idx);
            const isHalf = form.halfDays.includes(d.idx);
            return (
              <div key={d.idx} className={cn("grid grid-cols-4 items-center px-4 py-2.5 border-b border-border/50 last:border-b-0", isOff ? "bg-red-50/50" : isHalf ? "bg-amber-50/50" : "")}>
                <span className={cn("text-sm font-semibold", isOff ? "text-red-700" : isHalf ? "text-amber-700" : "text-foreground")}>
                  {d.full}<span className="text-[10px] text-muted-foreground ml-1.5 font-normal">{d.short}</span>
                </span>
                <div className="flex justify-center">
                  <button onClick={() => toggle(d.idx, "off")} className={cn("w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all", isOff ? "bg-red-500 border-red-500 text-white" : "border-border hover:border-red-300 hover:bg-red-50")}>
                    {isOff && <Check className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="flex justify-center">
                  <button onClick={() => toggle(d.idx, "half")} className={cn("w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all", isHalf ? "bg-amber-400 border-amber-400 text-white" : "border-border hover:border-amber-300 hover:bg-amber-50")}>
                    {isHalf && <Check className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="flex justify-center">
                  {!isOff && !isHalf && <span className="text-[11px] text-green-700 font-medium flex items-center gap-1"><Check className="w-3 h-3" />Working</span>}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {form.offDays.length > 0 && <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 border border-red-200 rounded-full text-[11px] text-red-700 font-medium"><CalendarOff className="w-3 h-3" />Off: {form.offDays.map(i => DAYS[i].short).join(", ")}</span>}
          {form.halfDays.length > 0 && <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-full text-[11px] text-amber-700 font-medium"><Coffee className="w-3 h-3" />Half: {form.halfDays.map(i => DAYS[i].short).join(", ")}</span>}
          {form.offDays.length === 0 && form.halfDays.length === 0 && <span className="text-xs text-muted-foreground italic">No off days configured</span>}
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button onClick={() => onSave(form)} disabled={saving || !form.name.trim()} className="gap-1.5">
          <Save className="w-3.5 h-3.5" />{saving ? "Saving…" : "Save Schedule"}
        </Button>
      </div>
    </div>
  );
}

/* ── Employee avatar ───────────────────────────────────────── */
function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const initials = name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();
  const colors = ["bg-blue-100 text-blue-700", "bg-green-100 text-green-700", "bg-purple-100 text-purple-700", "bg-amber-100 text-amber-700", "bg-rose-100 text-rose-700", "bg-cyan-100 text-cyan-700", "bg-indigo-100 text-indigo-700"];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div className={cn("rounded-full flex items-center justify-center font-bold shrink-0", color, size === "sm" ? "w-7 h-7 text-[10px]" : "w-8 h-8 text-xs")}>
      {initials}
    </div>
  );
}

/* ── Inline schedule selector ──────────────────────────────── */
function ScheduleSelect({ value, schedules, onChange }: { value: number | null | undefined; schedules: Schedule[]; onChange: (id: number | null) => void }) {
  const [open, setOpen] = useState(false);
  const current = schedules.find(s => s.id === value);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-all min-w-[180px] text-left",
          open ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/50 hover:bg-muted/30 bg-background"
        )}
      >
        {current ? (
          <>
            <div className="flex gap-0.5 shrink-0">
              {DAYS.map(d => (
                <div key={d.idx} className={cn("w-1.5 h-4 rounded-sm", current.offDays.includes(d.idx) ? "bg-red-400" : current.halfDays.includes(d.idx) ? "bg-amber-400" : "bg-muted")} />
              ))}
            </div>
            <span className="font-medium truncate flex-1 text-xs">{current.name}</span>
          </>
        ) : (
          <span className="text-muted-foreground text-xs flex-1">— No Schedule —</span>
        )}
        <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-20 bg-background border border-border rounded-xl shadow-xl overflow-hidden min-w-[220px]">
            <button
              onClick={() => { onChange(null); setOpen(false); }}
              className={cn("w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted/50 transition-colors text-left", !value && "bg-primary/5 font-semibold text-primary")}
            >
              <X className="w-3.5 h-3.5 text-muted-foreground" />
              <span>No Schedule</span>
            </button>
            {schedules.map(s => (
              <button
                key={s.id}
                onClick={() => { onChange(s.id); setOpen(false); }}
                className={cn("w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted/50 transition-colors text-left", value === s.id && "bg-primary/5")}
              >
                <div className="flex gap-0.5 shrink-0">
                  {DAYS.map(d => (
                    <div key={d.idx} className={cn("w-1.5 h-4 rounded-sm", s.offDays.includes(d.idx) ? "bg-red-400" : s.halfDays.includes(d.idx) ? "bg-amber-400" : "bg-muted")} />
                  ))}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("font-medium truncate", value === s.id ? "text-primary" : "")}>{s.name}</p>
                  {s.offDays.length > 0 && <p className="text-[10px] text-muted-foreground">{s.offDays.map(i => DAYS[i].short).join(", ")} off</p>}
                </div>
                {value === s.id && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ── Main component ────────────────────────────────────────── */
export default function WeekOffs() {
  const [schedules, setSchedules]   = useState<Schedule[]>([]);
  const [employees, setEmployees]   = useState<Employee[]>([]);
  const [loading, setLoading]       = useState(true);
  const [view, setView]             = useState<"roster" | "schedules">("roster");
  const [selected, setSelected]     = useState<number | null>(null);
  const [mode, setMode]             = useState<"list" | "create" | "edit">("list");
  const [editTarget, setEditTarget] = useState<Schedule | null>(null);
  const [saving, setSaving]         = useState(false);
  const [msg, setMsg]               = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [search, setSearch]             = useState("");
  const [filterSchedule, setFilterSchedule] = useState<string>("");
  const [filterDept, setFilterDept]     = useState("");
  const [assignTab, setAssignTab]       = useState<"assigned" | "add">("assigned");
  const [pendingChanges, setPendingChanges] = useState<Record<number, number | null>>({});
  const [bulkSaving, setBulkSaving]     = useState(false);

  const [periodMode, setPeriodMode]     = useState<"month" | "week">("month");
  const [periodDate, setPeriodDate]     = useState(() => new Date());

  async function load() {
    setLoading(true);
    try {
      const [sRes, eRes] = await Promise.all([fetch(apiUrl("/weekoffs")), fetch(apiUrl("/employees?limit=1000"))]);
      const sData = await sRes.json();
      const eData = await eRes.json();
      setSchedules(Array.isArray(sData) ? sData : []);
      const empList = Array.isArray(eData.employees) ? eData.employees : Array.isArray(eData) ? eData : [];
      setEmployees(empList);
    } catch { setMsg({ type: "error", text: "Failed to load data" }); }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { if (msg) { const t = setTimeout(() => setMsg(null), 4000); return () => clearTimeout(t); } }, [msg]);

  async function saveSchedule(data: Omit<Schedule, "id">) {
    setSaving(true);
    try {
      const isEdit = mode === "edit" && editTarget;
      const r = await fetch(isEdit ? apiUrl(`/weekoffs/${editTarget!.id}`) : apiUrl("/weekoffs"), {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!r.ok) throw new Error();
      setMsg({ type: "success", text: isEdit ? "Schedule updated" : "Schedule created" });
      setMode("list");
      setEditTarget(null);
      load();
    } catch { setMsg({ type: "error", text: "Failed to save schedule" }); }
    setSaving(false);
  }

  async function deleteSchedule(id: number) {
    if (!confirm("Delete this schedule? Employees will be unassigned.")) return;
    try {
      await fetch(apiUrl(`/weekoffs/${id}`), { method: "DELETE" });
      if (selected === id) setSelected(null);
      setMsg({ type: "success", text: "Schedule deleted" });
      load();
    } catch { setMsg({ type: "error", text: "Delete failed" }); }
  }

  async function assignOne(empId: number, scheduleId: number | null) {
    try {
      await fetch(apiUrl("/weekoffs/assign"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeIds: [empId], weekoffScheduleId: scheduleId }),
      });
      setEmployees(prev => prev.map(e => e.id === empId ? { ...e, weekoffScheduleId: scheduleId } : e));
    } catch { setMsg({ type: "error", text: "Assignment failed" }); }
  }

  function setRosterChange(empId: number, scheduleId: number | null) {
    setPendingChanges(prev => {
      const emp = employees.find(e => e.id === empId);
      const currentId = emp?.weekoffScheduleId ?? null;
      if (scheduleId === currentId) {
        const next = { ...prev };
        delete next[empId];
        return next;
      }
      return { ...prev, [empId]: scheduleId };
    });
  }

  async function saveAllChanges() {
    if (Object.keys(pendingChanges).length === 0) return;
    setBulkSaving(true);
    try {
      await Promise.all(
        Object.entries(pendingChanges).map(([empId, schedId]) =>
          fetch(apiUrl("/weekoffs/assign"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ employeeIds: [Number(empId)], weekoffScheduleId: schedId }),
          })
        )
      );
      setEmployees(prev => prev.map(e =>
        pendingChanges.hasOwnProperty(e.id) ? { ...e, weekoffScheduleId: pendingChanges[e.id] } : e
      ));
      setMsg({ type: "success", text: `Updated ${Object.keys(pendingChanges).length} employee${Object.keys(pendingChanges).length > 1 ? "s" : ""}` });
      setPendingChanges({});
    } catch { setMsg({ type: "error", text: "Failed to save changes" }); }
    setBulkSaving(false);
  }

  function periodLabel() {
    if (periodMode === "month") {
      return periodDate.toLocaleString("default", { month: "long", year: "numeric" });
    }
    const start = new Date(periodDate);
    const day = start.getDay();
    start.setDate(start.getDate() - day);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const fmt = (d: Date) => d.toLocaleString("default", { month: "short", day: "numeric" });
    return `${fmt(start)} – ${fmt(end)}, ${end.getFullYear()}`;
  }

  function shiftPeriod(dir: 1 | -1) {
    setPeriodDate(prev => {
      const d = new Date(prev);
      if (periodMode === "month") {
        d.setMonth(d.getMonth() + dir);
        d.setDate(1);
      } else {
        d.setDate(d.getDate() + dir * 7);
      }
      return d;
    });
  }

  function isCurrentPeriod() {
    const now = new Date();
    if (periodMode === "month") {
      return periodDate.getMonth() === now.getMonth() && periodDate.getFullYear() === now.getFullYear();
    }
    const start = new Date(periodDate);
    start.setDate(start.getDate() - start.getDay());
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return now >= start && now <= end;
  }

  const departments = useMemo(() => [...new Set(employees.map(e => e.department).filter(Boolean))].sort(), [employees]);

  const filteredEmployees = useMemo(() => {
    return employees.filter(e => {
      const q = search.toLowerCase();
      const matchSearch = !q || e.fullName.toLowerCase().includes(q) || e.employeeId.toLowerCase().includes(q) || e.designation?.toLowerCase().includes(q);
      const currentScheduleId = pendingChanges.hasOwnProperty(e.id) ? pendingChanges[e.id] : e.weekoffScheduleId;
      const matchSchedule = !filterSchedule
        ? true
        : filterSchedule === "none"
          ? !currentScheduleId
          : String(currentScheduleId) === filterSchedule;
      const matchDept = !filterDept || e.department === filterDept;
      return matchSearch && matchSchedule && matchDept;
    });
  }, [employees, search, filterSchedule, filterDept, pendingChanges]);

  const pendingCount = Object.keys(pendingChanges).length;

  const selectedSchedule = schedules.find(s => s.id === selected) ?? null;
  const assignedEmps     = employees.filter(e => e.weekoffScheduleId === selected);
  const unassignedEmps   = employees.filter(e => !e.weekoffScheduleId || e.weekoffScheduleId !== selected);

  return (
    <div className="h-full flex flex-col gap-4">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between shrink-0 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Week Off Schedules</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {schedules.length} schedule{schedules.length !== 1 ? "s" : ""} ·{" "}
            {employees.filter(e => e.weekoffScheduleId).length} of {employees.length} employees assigned
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center rounded-lg border border-border bg-muted/30 p-0.5">
            <button
              onClick={() => setView("roster")}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all", view === "roster" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >
              <LayoutList className="w-3.5 h-3.5" /> Employee Roster
            </button>
            <button
              onClick={() => setView("schedules")}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all", view === "schedules" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >
              <Layers className="w-3.5 h-3.5" /> Manage Schedules
            </button>
          </div>
          {view === "schedules" && mode === "list" && (
            <Button onClick={() => setMode("create")} className="gap-2">
              <Plus className="w-4 h-4" /> New Schedule
            </Button>
          )}
        </div>
      </div>

      {/* ── Toast ───────────────────────────────────────────────── */}
      {msg && (
        <div className={cn("flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border shrink-0", msg.type === "success" ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200")}>
          {msg.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          {msg.text}
        </div>
      )}

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">Loading…</div>
      ) : (
        <>
          {/* ═══════════════════════════════════════════════════════ */}
          {/* ROSTER VIEW                                            */}
          {/* ═══════════════════════════════════════════════════════ */}
          {view === "roster" && (
            <div className="flex-1 flex flex-col gap-3 min-h-0">

              {/* Period selector */}
              <div className="flex items-center gap-3 shrink-0 flex-wrap">
                <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-0.5">
                  <button
                    onClick={() => { setPeriodMode("month"); }}
                    className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-all", periodMode === "month" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                  >Monthly</button>
                  <button
                    onClick={() => { setPeriodMode("week"); }}
                    className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-all", periodMode === "week" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                  >Weekly</button>
                </div>

                <div className="flex items-center gap-1 rounded-lg border border-border bg-background px-1 py-1">
                  <button onClick={() => shiftPeriod(-1)} className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-3 text-sm font-semibold min-w-[170px] text-center">{periodLabel()}</span>
                  <button onClick={() => shiftPeriod(1)} className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {!isCurrentPeriod() && (
                  <button
                    onClick={() => setPeriodDate(new Date())}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors"
                  >
                    <Clock className="w-3.5 h-3.5" /> Today
                  </button>
                )}

                <div className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border",
                  isCurrentPeriod()
                    ? "bg-green-50 text-green-700 border-green-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                )}>
                  <Calendar className="w-3.5 h-3.5" />
                  {isCurrentPeriod() ? "Current period" : "Planning ahead"}
                </div>
              </div>

              {/* Filters + save bar */}
              <div className="flex items-center gap-3 flex-wrap shrink-0">
                <div className="relative flex-1 min-w-48">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    placeholder="Search employee, ID, designation…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                <select
                  value={filterSchedule}
                  onChange={e => setFilterSchedule(e.target.value)}
                  className="px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                >
                  <option value="">All Schedules</option>
                  <option value="none">No Schedule</option>
                  {schedules.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <select
                  value={filterDept}
                  onChange={e => setFilterDept(e.target.value)}
                  className="px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                >
                  <option value="">All Departments</option>
                  {departments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>

                {pendingCount > 0 && (
                  <div className="flex items-center gap-2 ml-auto">
                    <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded-lg font-medium">
                      {pendingCount} unsaved change{pendingCount > 1 ? "s" : ""}
                    </span>
                    <Button variant="outline" size="sm" onClick={() => setPendingChanges({})}>Discard</Button>
                    <Button size="sm" onClick={saveAllChanges} disabled={bulkSaving} className="gap-1.5">
                      {bulkSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      {bulkSaving ? "Saving…" : "Save Changes"}
                    </Button>
                  </div>
                )}
              </div>

              {/* Schedule summary strips */}
              {schedules.length > 0 && (
                <div className="flex gap-2 flex-wrap shrink-0">
                  {schedules.map(s => {
                    const count = employees.filter(e => {
                      const id = pendingChanges.hasOwnProperty(e.id) ? pendingChanges[e.id] : e.weekoffScheduleId;
                      return id === s.id;
                    }).length;
                    return (
                      <div
                        key={s.id}
                        onClick={() => setFilterSchedule(filterSchedule === String(s.id) ? "" : String(s.id))}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer transition-all text-sm",
                          filterSchedule === String(s.id) ? "border-primary bg-primary/5 text-primary" : "border-border bg-card hover:border-primary/40"
                        )}
                      >
                        <div className="flex gap-0.5">
                          {DAYS.map(d => (
                            <div key={d.idx} className={cn("w-1.5 h-3.5 rounded-sm", s.offDays.includes(d.idx) ? "bg-red-400" : s.halfDays.includes(d.idx) ? "bg-amber-400" : "bg-muted")} />
                          ))}
                        </div>
                        <span className="font-medium text-xs">{s.name}</span>
                        <span className={cn("text-[11px] px-1.5 py-0.5 rounded-full font-bold", filterSchedule === String(s.id) ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                          {count}
                        </span>
                      </div>
                    );
                  })}
                  <div
                    onClick={() => setFilterSchedule(filterSchedule === "none" ? "" : "none")}
                    className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer transition-all text-xs", filterSchedule === "none" ? "border-amber-400 bg-amber-50 text-amber-700" : "border-border bg-card hover:border-amber-300")}
                  >
                    <X className="w-3 h-3" />
                    <span className="font-medium">Unassigned</span>
                    <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-bold">
                      {employees.filter(e => {
                        const id = pendingChanges.hasOwnProperty(e.id) ? pendingChanges[e.id] : e.weekoffScheduleId;
                        return !id;
                      }).length}
                    </span>
                  </div>
                </div>
              )}

              {/* List table */}
              <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="grid grid-cols-[2fr_1fr_1fr_200px] gap-0 text-[11px] font-bold text-muted-foreground uppercase tracking-wider bg-muted/40 border-b border-border px-4 py-2.5 shrink-0">
                  <span>Employee</span>
                  <span>Department</span>
                  <span>Designation</span>
                  <span>Week Off Schedule</span>
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-border/60">
                  {filteredEmployees.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-center px-4">
                      <UserRound className="w-8 h-8 text-muted-foreground opacity-30 mb-2" />
                      <p className="text-sm text-muted-foreground">No employees match filters</p>
                    </div>
                  ) : (
                    filteredEmployees.map(e => {
                      const effectiveId = pendingChanges.hasOwnProperty(e.id) ? pendingChanges[e.id] : e.weekoffScheduleId;
                      const hasPending  = pendingChanges.hasOwnProperty(e.id);
                      const currentSchedule = schedules.find(s => s.id === effectiveId);
                      return (
                        <div key={e.id} className={cn("grid grid-cols-[2fr_1fr_1fr_200px] items-center gap-0 px-4 py-2.5 transition-colors hover:bg-muted/20", hasPending && "bg-amber-50/40")}>
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Avatar name={e.fullName} size="sm" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{e.fullName}
                                {hasPending && <span className="ml-1.5 text-[10px] text-amber-700 font-semibold bg-amber-100 px-1.5 py-0.5 rounded-full">edited</span>}
                              </p>
                              <p className="text-[11px] text-muted-foreground font-mono">{e.employeeId}</p>
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground truncate pr-2">{e.department}</span>
                          <span className="text-xs text-muted-foreground truncate pr-2">{e.designation}</span>
                          <div>
                            <ScheduleSelect
                              value={effectiveId}
                              schedules={schedules}
                              onChange={id => setRosterChange(e.id, id)}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                <div className="border-t border-border px-4 py-2 text-xs text-muted-foreground bg-muted/20 shrink-0 flex items-center justify-between">
                  <span>Showing {filteredEmployees.length} of {employees.length} employees</span>
                  {pendingCount > 0 && (
                    <span className="text-amber-700 font-medium">{pendingCount} pending change{pendingCount > 1 ? "s" : ""} — click Save Changes to apply</span>
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════ */}
          {/* SCHEDULES VIEW                                         */}
          {/* ═══════════════════════════════════════════════════════ */}
          {view === "schedules" && (
            <div className="flex-1 flex flex-col gap-4 min-h-0">
              {(mode === "create" || mode === "edit") && (
                <Card className="p-5 shrink-0">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h2 className="font-bold text-base">{mode === "edit" ? "Edit Schedule" : "New Weekoff Schedule"}</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">Configure which days are off or half-day</p>
                    </div>
                    <button onClick={() => { setMode("list"); setEditTarget(null); }} className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <ScheduleForm
                    initial={mode === "edit" && editTarget ? { name: editTarget.name, description: editTarget.description, offDays: [...editTarget.offDays], halfDays: [...editTarget.halfDays], isActive: editTarget.isActive } : BLANK}
                    onSave={saveSchedule}
                    onCancel={() => { setMode("list"); setEditTarget(null); }}
                    saving={saving}
                  />
                </Card>
              )}

              {mode === "list" && (
                schedules.length === 0 ? (
                  <Card className="flex-1 flex flex-col items-center justify-center text-center p-12">
                    <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                      <CalendarOff className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold text-base mb-1">No schedules yet</h3>
                    <p className="text-sm text-muted-foreground mb-5 max-w-xs">Create a week off schedule to define which days employees have off.</p>
                    <Button onClick={() => setMode("create")} className="gap-2"><Plus className="w-4 h-4" />Create First Schedule</Button>
                  </Card>
                ) : (
                  <div className="flex gap-5 flex-1 min-h-0">
                    {/* Schedule cards */}
                    <div className="w-80 shrink-0 flex flex-col gap-3 overflow-y-auto pr-1">
                      {schedules.map(s => {
                        const empCount = employees.filter(e => e.weekoffScheduleId === s.id).length;
                        const isSel = selected === s.id;
                        return (
                          <div key={s.id} onClick={() => { setSelected(s.id); setAssignTab("assigned"); }} className={cn("rounded-xl border p-4 cursor-pointer transition-all select-none", isSel ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20" : "border-border bg-card hover:border-primary/40 hover:shadow-sm")}>
                            <div className="flex items-start justify-between gap-2 mb-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-sm truncate">{s.name}</p>
                                  {isSel && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                                </div>
                                {s.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{s.description}</p>}
                              </div>
                              <div className="flex gap-0.5 shrink-0">
                                <button onClick={e => { e.stopPropagation(); setEditTarget(s); setMode("edit"); }} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                                <button onClick={e => { e.stopPropagation(); deleteSchedule(s.id); }} className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                            </div>
                            <DayGrid offDays={s.offDays} halfDays={s.halfDays} size="sm" />
                            <div className="flex items-center gap-1.5 mt-3">
                              <div className={cn("flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full", empCount > 0 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                                <Users className="w-3 h-3" />{empCount} employee{empCount !== 1 ? "s" : ""}
                              </div>
                              {s.offDays.length > 0 && <div className="flex items-center gap-1 text-[11px] bg-red-50 text-red-700 px-2 py-0.5 rounded-full font-medium"><CalendarOff className="w-3 h-3" />{s.offDays.length} day{s.offDays.length !== 1 ? "s" : ""} off</div>}
                              {s.halfDays.length > 0 && <div className="flex items-center gap-1 text-[11px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium"><Coffee className="w-3 h-3" />{s.halfDays.length} half</div>}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Right panel */}
                    <div className="flex-1 min-w-0">
                      {selectedSchedule ? (
                        <div className="flex flex-col gap-4 h-full">
                          <Card className="p-5 shrink-0">
                            <div className="flex items-start justify-between gap-4 mb-4">
                              <div>
                                <h2 className="font-bold text-base">{selectedSchedule.name}</h2>
                                {selectedSchedule.description && <p className="text-sm text-muted-foreground mt-0.5">{selectedSchedule.description}</p>}
                              </div>
                              <Button size="sm" variant="outline" className="gap-1.5 shrink-0" onClick={() => { setEditTarget(selectedSchedule); setMode("edit"); }}>
                                <Edit2 className="w-3.5 h-3.5" /> Edit
                              </Button>
                            </div>
                            <DayGrid offDays={selectedSchedule.offDays} halfDays={selectedSchedule.halfDays} />
                            <div className="flex gap-4 mt-4">
                              {[["bg-red-200 border-red-300", "Full Day Off"], ["bg-amber-200 border-amber-300", "Half Day"], ["bg-muted border-border", "Working Day"]].map(([cls, label]) => (
                                <div key={label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <div className={cn("w-3 h-3 rounded border", cls)} />{label}
                                </div>
                              ))}
                            </div>
                          </Card>

                          <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
                            <div className="p-4 border-b border-border shrink-0">
                              <div className="flex items-center justify-between mb-3 gap-3">
                                <h3 className="font-semibold text-sm">Employees</h3>
                              </div>
                              <div className="flex gap-1">
                                {([{ key: "assigned" as const, label: "Assigned", count: assignedEmps.length, icon: UserCheck }, { key: "add" as const, label: "Add Employees", count: unassignedEmps.length, icon: UserMinus }]).map(t => (
                                  <button key={t.key} onClick={() => setAssignTab(t.key)} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors", assignTab === t.key ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted")}>
                                    <t.icon className="w-3 h-3" />{t.label}
                                    <span className={cn("ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold", assignTab === t.key ? "bg-white/20" : "bg-muted")}>{t.count}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="flex-1 overflow-y-auto divide-y divide-border/60">
                              {assignTab === "assigned" && (
                                assignedEmps.length === 0 ? (
                                  <div className="flex flex-col items-center justify-center h-48 text-center px-4">
                                    <UserRound className="w-8 h-8 text-muted-foreground opacity-30 mb-2" />
                                    <p className="text-sm text-muted-foreground">No employees assigned yet</p>
                                  </div>
                                ) : assignedEmps.map(e => (
                                  <div key={e.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors group">
                                    <Avatar name={e.fullName} size="sm" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate">{e.fullName}</p>
                                      <p className="text-[11px] text-muted-foreground">{e.employeeId} · {e.designation}</p>
                                    </div>
                                    <button onClick={() => assignOne(e.id, null)} title="Remove" className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-all"><X className="w-3.5 h-3.5" /></button>
                                  </div>
                                ))
                              )}
                              {assignTab === "add" && (
                                unassignedEmps.length === 0 ? (
                                  <div className="flex flex-col items-center justify-center h-48 text-center px-4">
                                    <CheckCircle2 className="w-8 h-8 text-green-500 opacity-50 mb-2" />
                                    <p className="text-sm text-muted-foreground">All employees assigned</p>
                                  </div>
                                ) : unassignedEmps.map(e => (
                                  <div key={e.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors group">
                                    <Avatar name={e.fullName} size="sm" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate">{e.fullName}</p>
                                      <p className="text-[11px] text-muted-foreground">{e.employeeId} · {e.designation}{e.weekoffScheduleId && e.weekoffScheduleId !== selected && <span className="ml-1 text-amber-600">· other schedule</span>}</p>
                                    </div>
                                    <button onClick={() => assignOne(e.id, selected)} title="Add" className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-green-50 text-muted-foreground hover:text-green-600 transition-all"><Plus className="w-3.5 h-3.5" /></button>
                                  </div>
                                ))
                              )}
                            </div>
                          </Card>
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center">
                          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
                            <Calendar className="w-7 h-7 text-muted-foreground opacity-60" />
                          </div>
                          <p className="font-medium text-muted-foreground">Select a schedule</p>
                          <p className="text-xs text-muted-foreground mt-1">Click a schedule to manage its employees</p>
                        </div>
                      )}
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
