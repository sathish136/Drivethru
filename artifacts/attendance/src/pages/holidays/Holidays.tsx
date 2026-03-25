import { useState, useEffect, useMemo } from "react";
import { PageHeader, Card, Button, Input, Label, Select } from "@/components/ui";
import {
  Plus, Trash2, Save, RefreshCw, Check, AlertTriangle, X, Edit2,
  CalendarDays, Download, Globe, ChevronLeft, ChevronRight,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
function apiUrl(path: string) { return `${BASE}/api${path}`; }

interface Holiday {
  id: number;
  name: string;
  date: string;
  type: "statutory" | "poya" | "public";
  description?: string | null;
  createdAt: string;
}

const BLANK: Omit<Holiday, "id" | "createdAt"> = {
  name: "", date: "", type: "public", description: "",
};

const TYPE_META = {
  statutory: { label: "Statutory",  badge: "bg-blue-100   text-blue-700   border-blue-200"   },
  poya:      { label: "Poya Day",   badge: "bg-purple-100 text-purple-700 border-purple-200" },
  public:    { label: "Public",     badge: "bg-amber-100  text-amber-700  border-amber-200"  },
};

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS   = ["Su","Mo","Tu","We","Th","Fr","Sa"];

function formatDate(d: string) {
  const [y, m, day] = d.split("-");
  return `${MONTHS[Number(m)-1].slice(0,3)} ${Number(day)}, ${y}`;
}

function MiniCalendar({ year, month, holidays }: { year: number; month: number; holidays: Holiday[] }) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const hdMap = new Map(
    holidays
      .filter(h => {
        const [hy, hm] = h.date.split("-").map(Number);
        return hy === year && hm - 1 === month;
      })
      .map(h => [Number(h.date.split("-")[2]), h])
  );

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="text-xs">
      <div className="grid grid-cols-7 gap-px mb-0.5">
        {DAYS.map(d => (
          <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground py-0.5">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const h = hdMap.get(day);
          const isWeekend = new Date(year, month, day).getDay() === 0 || new Date(year, month, day).getDay() === 6;
          return (
            <div
              key={i}
              title={h ? `${h.name} (${h.type})` : undefined}
              className={`
                rounded text-center py-0.5 leading-4
                ${h ? (
                  h.type === "statutory" ? "bg-blue-600 text-white font-bold cursor-default" :
                  h.type === "poya"      ? "bg-purple-600 text-white font-bold cursor-default" :
                                           "bg-amber-500 text-white font-bold cursor-default"
                ) : isWeekend ? "text-rose-400" : "text-foreground"}
              `}
            >
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Holidays() {
  const currentYear = new Date().getFullYear();
  const [year, setYear]         = useState(currentYear);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [success, setSuccess]   = useState<string | null>(null);

  const [showModal, setShowModal]   = useState(false);
  const [modalMode, setModalMode]   = useState<"add" | "edit">("add");
  const [editing, setEditing]       = useState<Omit<Holiday, "id" | "createdAt"> & { id?: number }>(BLANK);
  const [saving, setSaving]         = useState(false);

  const [syncing, setSyncing]       = useState(false);
  const [syncYear, setSyncYear]     = useState(currentYear);

  const [viewMode, setViewMode]     = useState<"calendar" | "list">("calendar");
  const [filterType, setFilterType] = useState<"all" | "statutory" | "poya" | "public">("all");

  function showMsg(msg: string, isError = false) {
    if (isError) { setError(msg); setSuccess(null); }
    else         { setSuccess(msg); setError(null); }
    setTimeout(() => { setError(null); setSuccess(null); }, 3500);
  }

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(apiUrl(`/holidays?year=${year}`));
      const d = await r.json();
      if (Array.isArray(d)) setHolidays(d);
    } catch { showMsg("Failed to load holidays", true); }
    setLoading(false);
  }

  useEffect(() => { load(); }, [year]);

  const filtered = useMemo(() =>
    filterType === "all" ? holidays : holidays.filter(h => h.type === filterType),
    [holidays, filterType]
  );

  /* ── Add / Edit ── */
  function openAdd() {
    const today = new Date().toISOString().slice(0, 10);
    setEditing({ ...BLANK, date: today });
    setModalMode("add");
    setShowModal(true);
  }
  function openEdit(h: Holiday) {
    setEditing({ id: h.id, name: h.name, date: h.date, type: h.type, description: h.description ?? "" });
    setModalMode("edit");
    setShowModal(true);
  }

  async function commitModal() {
    if (!editing.name || !editing.date) { showMsg("Name and date are required", true); return; }
    setSaving(true);
    try {
      const method = modalMode === "edit" ? "PUT" : "POST";
      const url    = modalMode === "edit" ? apiUrl(`/holidays/${editing.id}`) : apiUrl("/holidays");
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editing.name, date: editing.date, type: editing.type, description: editing.description }),
      });
      const d = await r.json();
      if (d.id) {
        showMsg(modalMode === "add" ? "Holiday added" : "Holiday updated");
        setShowModal(false);
        load();
      } else showMsg(d.message || "Save failed", true);
    } catch { showMsg("Save failed", true); }
    setSaving(false);
  }

  async function deleteHoliday(id: number, name: string) {
    if (!confirm(`Delete "${name}"?`)) return;
    try {
      await fetch(apiUrl(`/holidays/${id}`), { method: "DELETE" });
      showMsg(`"${name}" deleted`);
      setHolidays(prev => prev.filter(h => h.id !== id));
    } catch { showMsg("Delete failed", true); }
  }

  /* ── Sync Sri Lanka ── */
  async function syncSriLanka() {
    setSyncing(true);
    try {
      const r = await fetch(apiUrl("/holidays/sync-srilanka"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: syncYear }),
      });
      const d = await r.json();
      if (d.success) {
        showMsg(`Synced ${syncYear}: ${d.inserted} added, ${d.skipped} already existed`);
        if (syncYear === year) load();
        else setYear(syncYear);
      } else showMsg(d.message || "Sync failed", true);
    } catch { showMsg("Sync failed — check your internet connection", true); }
    setSyncing(false);
  }

  const byMonth = useMemo(() => {
    const map = new Map<number, Holiday[]>();
    for (let m = 0; m < 12; m++) map.set(m, []);
    for (const h of holidays) {
      const m = Number(h.date.split("-")[1]) - 1;
      map.get(m)?.push(h);
    }
    return map;
  }, [holidays]);

  const counts = useMemo(() => ({
    statutory: holidays.filter(h => h.type === "statutory").length,
    poya:      holidays.filter(h => h.type === "poya").length,
    public:    holidays.filter(h => h.type === "public").length,
  }), [holidays]);

  const TypeBadge = ({ type }: { type: Holiday["type"] }) => (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${TYPE_META[type].badge}`}>
      {TYPE_META[type].label}
    </span>
  );

  return (
    <div className="space-y-5 max-w-full">
      <PageHeader
        title="Holiday Management"
        description="Manage Sri Lanka public holidays — used for OT calculations in payroll"
      />

      {/* ── Alerts ── */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm bg-red-50 text-red-700 border border-red-200">
          <AlertTriangle className="w-4 h-4 shrink-0" />{error}
          <button onClick={() => setError(null)} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm bg-emerald-50 text-emerald-700 border border-emerald-200">
          <Check className="w-4 h-4 shrink-0" />{success}
        </div>
      )}

      {/* ── Top toolbar ── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Year navigation */}
        <div className="flex items-center gap-1 bg-card border border-border rounded-xl px-2 py-1.5">
          <button onClick={() => setYear(y => y - 1)} className="p-1 hover:bg-muted rounded-lg">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-bold px-3 min-w-[60px] text-center">{year}</span>
          <button onClick={() => setYear(y => y + 1)} className="p-1 hover:bg-muted rounded-lg">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* View toggle */}
        <div className="flex rounded-xl border border-border overflow-hidden text-xs">
          <button
            onClick={() => setViewMode("calendar")}
            className={`px-3 py-1.5 flex items-center gap-1.5 ${viewMode === "calendar" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          >
            <CalendarDays className="w-3.5 h-3.5" />Calendar
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`px-3 py-1.5 flex items-center gap-1.5 ${viewMode === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          >
            <Download className="w-3.5 h-3.5" />List
          </button>
        </div>

        {/* Filter by type (list mode) */}
        {viewMode === "list" && (
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value as any)}
            className="text-xs border border-border rounded-lg px-2 py-1.5 bg-card"
          >
            <option value="all">All types ({holidays.length})</option>
            <option value="statutory">Statutory ({counts.statutory})</option>
            <option value="poya">Poya ({counts.poya})</option>
            <option value="public">Public ({counts.public})</option>
          </select>
        )}

        <div className="ml-auto flex items-center gap-2">
          <Button className="flex items-center gap-1.5 text-xs h-8" onClick={openAdd}>
            <Plus className="w-3.5 h-3.5" />Add Holiday
          </Button>
        </div>
      </div>

      {/* ── Summary chips ── */}
      <div className="flex flex-wrap gap-3">
        {(["statutory", "poya", "public"] as const).map(type => (
          <div key={type} className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs ${TYPE_META[type].badge}`}>
            <span className="font-bold text-base">{counts[type]}</span>
            <span>{TYPE_META[type].label}</span>
          </div>
        ))}
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-xs">
          <span className="font-bold text-base">{holidays.length}</span>
          <span className="text-muted-foreground">Total holidays</span>
        </div>
      </div>

      {/* ── Sync box ── */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <Globe className="w-5 h-5 text-emerald-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Sync Sri Lanka Official Holidays</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Automatically imports public &amp; poya holidays from the official Sri Lanka calendar (Nager.Date).
              Only new holidays are added — existing dates are not duplicated.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={syncYear}
              onChange={e => setSyncYear(Number(e.target.value))}
              className="text-xs border border-border rounded-lg px-2 py-1.5 bg-card"
            >
              {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <Button
              onClick={syncSriLanka}
              disabled={syncing}
              className="text-xs h-8 flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700"
            >
              {syncing
                ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" />Syncing…</>
                : <><Globe className="w-3.5 h-3.5" />Sync {syncYear}</>}
            </Button>
          </div>
        </div>
      </Card>

      {/* ── Calendar grid ── */}
      {viewMode === "calendar" && (
        loading ? (
          <div className="flex items-center justify-center h-32 gap-2 text-muted-foreground">
            <RefreshCw className="w-4 h-4 animate-spin" /><span className="text-sm">Loading…</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 12 }, (_, m) => {
              const monthHolidays = byMonth.get(m) || [];
              return (
                <Card key={m} className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-bold">{MONTHS[m]}</p>
                    {monthHolidays.length > 0 && (
                      <span className="text-[10px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        {monthHolidays.length} holiday{monthHolidays.length > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <MiniCalendar year={year} month={m} holidays={holidays} />
                  {monthHolidays.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {monthHolidays.map(h => (
                        <div key={h.id} className="flex items-center gap-1.5 group">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${
                            h.type === "statutory" ? "bg-blue-600" :
                            h.type === "poya"      ? "bg-purple-600" : "bg-amber-500"
                          }`} />
                          <span className="text-[11px] text-foreground flex-1 truncate">{h.name}</span>
                          <span className="text-[10px] text-muted-foreground">{formatDate(h.date).slice(0, 6)}</span>
                          <div className="hidden group-hover:flex items-center gap-0.5">
                            <button onClick={() => openEdit(h)} className="p-0.5 rounded hover:bg-primary/10 text-primary">
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button onClick={() => deleteHoliday(h.id, h.name)} className="p-0.5 rounded hover:bg-red-50 text-red-500">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )
      )}

      {/* ── List view ── */}
      {viewMode === "list" && (
        <Card className="p-0 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-32 gap-2 text-muted-foreground">
              <RefreshCw className="w-4 h-4 animate-spin" /><span className="text-sm">Loading…</span>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Holiday</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Description</th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((h, i) => (
                  <tr key={h.id} className={`border-b border-border/50 hover:bg-muted/20 ${i % 2 !== 0 ? "bg-muted/10" : ""}`}>
                    <td className="px-4 py-2.5 text-xs font-mono text-muted-foreground whitespace-nowrap">
                      {formatDate(h.date)}
                    </td>
                    <td className="px-4 py-2.5 text-xs font-medium">{h.name}</td>
                    <td className="px-4 py-2.5"><TypeBadge type={h.type} /></td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-[200px] truncate">
                      {h.description || "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(h)} className="p-1.5 rounded hover:bg-primary/10 text-primary">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteHoliday(h.id, h.name)} className="p-1.5 rounded hover:bg-red-50 text-red-500">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-12 text-center text-xs text-muted-foreground">
                    No holidays for {year}. Add manually or sync from Sri Lanka official calendar.
                  </td></tr>
                )}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {/* ── Legend ── */}
      <Card className="p-3">
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-600" />
            <span><b>Statutory</b> — National statutory holidays (2× OT applies)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-purple-600" />
            <span><b>Poya Day</b> — Buddhist full moon holidays (1.5× OT applies)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500" />
            <span><b>Public</b> — General public holidays (1.5× OT applies)</span>
          </div>
        </div>
      </Card>

      {/* ── Add / Edit Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md border border-border">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-primary" />
                <span className="font-bold text-sm">{modalMode === "add" ? "Add Holiday" : "Edit Holiday"}</span>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-muted">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <Label className="text-xs font-medium mb-1 block">Holiday Name *</Label>
                <Input
                  value={editing.name}
                  onChange={e => setEditing(s => ({ ...s, name: e.target.value }))}
                  placeholder="e.g. Sinhala & Tamil New Year"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-medium mb-1 block">Date *</Label>
                  <Input
                    type="date"
                    value={editing.date}
                    onChange={e => setEditing(s => ({ ...s, date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium mb-1 block">Type</Label>
                  <Select
                    value={editing.type}
                    onChange={e => setEditing(s => ({ ...s, type: e.target.value as Holiday["type"] }))}
                  >
                    <option value="statutory">Statutory (2× OT)</option>
                    <option value="poya">Poya Day (1.5× OT)</option>
                    <option value="public">Public (1.5× OT)</option>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium mb-1 block">Description / Local Name <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input
                  value={editing.description ?? ""}
                  onChange={e => setEditing(s => ({ ...s, description: e.target.value }))}
                  placeholder="e.g. අලුත් අවුරුදු දිනය"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 p-5 border-t border-border">
              <Button variant="outline" className="text-xs h-9" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button
                className="text-xs h-9 flex items-center gap-1.5"
                onClick={commitModal}
                disabled={!editing.name || !editing.date || saving}
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? "Saving…" : modalMode === "add" ? "Add Holiday" : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
