import { useState, useEffect, useCallback } from "react";
import {
  Fingerprint, Search, RefreshCw, Download, ChevronLeft, ChevronRight,
  LogIn, LogOut, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
function apiUrl(path: string) { return `${BASE}/api${path}`; }
function authHeaders() {
  const token = localStorage.getItem("auth_token") || "";
  return { Authorization: `Bearer ${token}` };
}

const PAGE_SIZE = 100;

type PunchRow = {
  id: string;
  attendanceId: number;
  employeeId: number;
  employeeName: string;
  employeeCode: string;
  branchName: string;
  date: string;
  punchTime: string;
  punchType: "in" | "out";
  slot: string;
  status: string;
  source: string;
};

type Employee = { id: number; fullName: string; employeeId: string };

const PUNCH_META = {
  in:  { label: "Punch In",  icon: LogIn,  color: "text-emerald-700", bg: "bg-emerald-100" },
  out: { label: "Punch Out", icon: LogOut, color: "text-red-700",     bg: "bg-red-100"     },
};

function fmtDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtDay(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short" });
}
function fmtTime(punchTime: string) {
  const d = new Date(punchTime);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
function todayStr() { return new Date().toISOString().slice(0, 10); }
function sevenDaysAgoStr() {
  const d = new Date(); d.setDate(d.getDate() - 6);
  return d.toISOString().slice(0, 10);
}

const SOURCE_BADGE: Record<string, string> = {
  biometric: "bg-blue-100 text-blue-700",
  manual:    "bg-purple-100 text-purple-700",
  system:    "bg-gray-100 text-gray-600",
};
const STATUS_DOT: Record<string, string> = {
  present:  "bg-emerald-500",
  late:     "bg-amber-500",
  half_day: "bg-yellow-500",
  absent:   "bg-red-500",
  leave:    "bg-purple-500",
  holiday:  "bg-gray-400",
  off_day:  "bg-slate-400",
};

export default function RawPunches() {
  const [punches, setPunches]   = useState<PunchRow[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(false);
  const [page, setPage]         = useState(1);

  const [search, setSearch]       = useState("");
  const [empId, setEmpId]         = useState("");
  const [punchType, setPunchType] = useState("all");
  const [startDate, setStartDate] = useState(sevenDaysAgoStr());
  const [endDate, setEndDate]     = useState(todayStr());
  const [employees, setEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    fetch(apiUrl("/employees?limit=1000"), { headers: authHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then(d => setEmployees((d?.employees || d || []).map((e: any) => ({ id: e.id, fullName: e.fullName, employeeId: e.employeeId }))))
      .catch(() => {});
  }, []);

  const fetchPunches = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(PAGE_SIZE) });
      if (search)              params.set("search", search);
      if (empId)               params.set("employeeId", empId);
      if (punchType !== "all") params.set("punchType", punchType);
      if (startDate)           params.set("startDate", startDate);
      if (endDate)             params.set("endDate", endDate);

      const r = await fetch(apiUrl(`/attendance/raw-punches?${params}`), { headers: authHeaders() });
      const d = await r.json();
      setPunches(d.punches || []);
      setTotal(d.total || 0);
    } catch {
      setPunches([]);
    } finally {
      setLoading(false);
    }
  }, [search, empId, punchType, startDate, endDate]);

  useEffect(() => { setPage(1); fetchPunches(1); }, [empId, punchType, startDate, endDate]);
  useEffect(() => { fetchPunches(page); }, [page]);

  const handleSearch = () => { setPage(1); fetchPunches(1); };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const inCount  = punches.filter(p => p.punchType === "in").length;
  const outCount = punches.filter(p => p.punchType === "out").length;

  const exportCsv = () => {
    const header = ["#", "Date", "Day", "Time", "Slot", "Punch Type", "Employee", "Emp Code", "Branch", "Att. Status", "Source"];
    const rows = punches.map((p, i) => [
      (page - 1) * PAGE_SIZE + i + 1,
      fmtDate(p.date), fmtDay(p.date), fmtTime(p.punchTime), p.slot,
      p.punchType === "in" ? "Punch In" : "Punch Out",
      p.employeeName, p.employeeCode, p.branchName,
      p.status.replace("_", " "), p.source,
    ]);
    const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `raw-punches-${startDate}-${endDate}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Fingerprint className="w-5 h-5 text-primary" />
          <h1 className="text-base font-semibold text-foreground">Raw Punch Logs</h1>
          <span className="text-xs text-muted-foreground ml-1">All individual punch records from attendance data</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => fetchPunches(page)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded-md bg-background hover:bg-muted transition-colors">
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} /> Refresh
          </button>
          <button onClick={exportCsv} disabled={punches.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded-md bg-background hover:bg-muted transition-colors disabled:opacity-40">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: "Total Punches",     value: total,    color: "text-blue-600",    bg: "bg-blue-50 border-blue-200"     },
          { label: "Punch In (page)",   value: inCount,  color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
          { label: "Punch Out (page)",  value: outCount, color: "text-red-600",     bg: "bg-red-50 border-red-200"       },
        ].map(c => (
          <div key={c.label} className={cn("rounded-lg border px-4 py-3", c.bg)}>
            <div className={cn("text-xl font-bold", c.color)}>{c.value.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="px-4 py-3 border-b border-border bg-muted/30 rounded-t-xl">
          <span className="text-xs font-semibold text-foreground">Filters</span>
        </div>
        <div className="p-4 flex flex-wrap gap-3 items-end">
          {/* Search */}
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs text-muted-foreground mb-1">Search (name / emp code)</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                className="w-full pl-8 pr-8 py-1.5 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Employee name or code…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
              />
              {search && (
                <button className="absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={() => { setSearch(""); setPage(1); fetchPunches(1); }}>
                  <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>
          </div>

          {/* Employee dropdown */}
          <div className="min-w-[200px]">
            <label className="block text-xs text-muted-foreground mb-1">Employee</label>
            <select className="w-full py-1.5 px-2 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              value={empId} onChange={e => setEmpId(e.target.value)}>
              <option value="">— All Employees —</option>
              {employees.map(e => (
                <option key={e.id} value={String(e.id)}>{e.fullName} ({e.employeeId})</option>
              ))}
            </select>
          </div>

          {/* Punch type */}
          <div className="min-w-[130px]">
            <label className="block text-xs text-muted-foreground mb-1">Punch Type</label>
            <select className="w-full py-1.5 px-2 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              value={punchType} onChange={e => setPunchType(e.target.value)}>
              <option value="all">All Types</option>
              <option value="in">Punch In</option>
              <option value="out">Punch Out</option>
            </select>
          </div>

          {/* Date range */}
          <div>
            <label className="block text-xs text-muted-foreground mb-1">From</label>
            <input type="date"
              className="py-1.5 px-2 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">To</label>
            <input type="date"
              className="py-1.5 px-2 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>

          <button onClick={handleSearch}
            className="px-4 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
            Apply
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground">
            {loading ? "Loading…" : `${total.toLocaleString()} punch records`}
            {!loading && total > 0 && (
              <span className="text-muted-foreground font-normal ml-1">
                — showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)}
              </span>
            )}
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}
                className="p-1 rounded border border-border bg-background hover:bg-muted disabled:opacity-40">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs px-2">{page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="p-1 rounded border border-border bg-background hover:bg-muted disabled:opacity-40">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                {["#", "Date", "Day", "Time", "Slot", "Type", "Employee", "Emp Code", "Branch", "Att. Status", "Source"].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} className="px-3 py-12 text-center text-muted-foreground">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                    Loading punch records…
                  </td>
                </tr>
              ) : punches.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-3 py-12 text-center text-muted-foreground">
                    <Fingerprint className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No punch records found for the selected filters.
                  </td>
                </tr>
              ) : punches.map((p, i) => {
                const meta = PUNCH_META[p.punchType];
                const Icon = meta.icon;
                const rowN = (page - 1) * PAGE_SIZE + i + 1;
                return (
                  <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-2 text-muted-foreground">{rowN}</td>
                    <td className="px-3 py-2 font-mono whitespace-nowrap">{fmtDate(p.date)}</td>
                    <td className="px-3 py-2 text-muted-foreground">{fmtDay(p.date)}</td>
                    <td className="px-3 py-2 font-mono whitespace-nowrap font-semibold text-foreground">{fmtTime(p.punchTime)}</td>
                    <td className="px-3 py-2 text-muted-foreground">{p.slot}</td>
                    <td className="px-3 py-2">
                      <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium", meta.bg, meta.color)}>
                        <Icon className="w-3 h-3" />
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-medium text-foreground whitespace-nowrap">{p.employeeName}</td>
                    <td className="px-3 py-2 font-mono text-muted-foreground">{p.employeeCode || "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{p.branchName || "—"}</td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-1.5">
                        <span className={cn("w-2 h-2 rounded-full flex-shrink-0", STATUS_DOT[p.status] || "bg-gray-400")} />
                        <span className="capitalize">{p.status.replace("_", " ")}</span>
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium capitalize", SOURCE_BADGE[p.source] || "bg-gray-100 text-gray-600")}>
                        {p.source}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination bottom */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-border bg-muted/20 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Page {page} of {totalPages} · {PAGE_SIZE} per page
            </span>
            <div className="flex items-center gap-1">
              <button disabled={page <= 1} onClick={() => setPage(1)}
                className="px-2 py-1 text-xs rounded border border-border bg-background hover:bg-muted disabled:opacity-40">First</button>
              <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}
                className="p-1 rounded border border-border bg-background hover:bg-muted disabled:opacity-40">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
                const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                const pg = start + idx;
                return (
                  <button key={pg} onClick={() => setPage(pg)}
                    className={cn("w-7 h-7 text-xs rounded border transition-colors",
                      pg === page ? "bg-primary text-primary-foreground border-primary" : "border-border bg-background hover:bg-muted")}>
                    {pg}
                  </button>
                );
              })}
              <button disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="p-1 rounded border border-border bg-background hover:bg-muted disabled:opacity-40">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button disabled={page >= totalPages} onClick={() => setPage(totalPages)}
                className="px-2 py-1 text-xs rounded border border-border bg-background hover:bg-muted disabled:opacity-40">Last</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
