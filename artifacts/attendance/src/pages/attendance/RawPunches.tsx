import { useState, useEffect, useCallback } from "react";
import {
  Fingerprint, Search, RefreshCw, Download, ChevronLeft, ChevronRight, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
function apiUrl(path: string) { return `${BASE}/api${path}`; }
function authHeaders() {
  const token = localStorage.getItem("auth_token") || "";
  return { Authorization: `Bearer ${token}` };
}

const PAGE_SIZE = 100;

type DayRow = {
  id: number;
  employeeId: number;
  employeeName: string;
  employeeCode: string;
  branchName: string;
  date: string;
  status: string;
  source: string;
  p1: string | null;
  p2: string | null;
  p3: string | null;
  p4: string | null;
  totalHours: number | null;
  overtimeHours: number | null;
};

type Employee = { id: number; fullName: string; employeeId: string };

const STATUS_COLOR: Record<string, { bg: string; text: string; dot: string }> = {
  present:  { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  late:     { bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-500"   },
  half_day: { bg: "bg-yellow-50",  text: "text-yellow-700",  dot: "bg-yellow-500"  },
  absent:   { bg: "bg-red-50",     text: "text-red-700",     dot: "bg-red-500"     },
  leave:    { bg: "bg-purple-50",  text: "text-purple-700",  dot: "bg-purple-500"  },
  holiday:  { bg: "bg-gray-50",    text: "text-gray-600",    dot: "bg-gray-400"    },
  off_day:  { bg: "bg-slate-50",   text: "text-slate-600",   dot: "bg-slate-400"   },
};

// Punch column definitions: 8 slots alternating IN/OUT
const PUNCH_COLS = [
  { key: "p1", label: "Punch 1", type: "IN",  field: "p1" },
  { key: "p2", label: "Punch 2", type: "OUT", field: "p2" },
  { key: "p3", label: "Punch 3", type: "IN",  field: "p3" },
  { key: "p4", label: "Punch 4", type: "OUT", field: "p4" },
  { key: "p5", label: "Punch 5", type: "IN",  field: "p5" },
  { key: "p6", label: "Punch 6", type: "OUT", field: "p6" },
  { key: "p7", label: "Punch 7", type: "IN",  field: "p7" },
  { key: "p8", label: "Punch 8", type: "OUT", field: "p8" },
] as const;

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtDay(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short" });
}
function fmtHours(h: number | null) {
  if (h == null) return "—";
  const hrs = Math.floor(h); const mins = Math.round((h - hrs) * 60);
  return `${hrs}:${String(mins).padStart(2, "0")}`;
}

export default function RawPunches() {
  const [rows, setRows]         = useState<DayRow[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(false);
  const [page, setPage]         = useState(1);

  const [search, setSearch]     = useState("");
  const [empId, setEmpId]       = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate]     = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    fetch(apiUrl("/employees?limit=1000"), { headers: authHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then(d => setEmployees((d?.employees || d || []).map((e: any) => ({
        id: e.id, fullName: e.fullName, employeeId: e.employeeId,
      }))))
      .catch(() => {});
  }, []);

  const fetchRows = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(PAGE_SIZE) });
      if (search)    params.set("search", search);
      if (empId)     params.set("employeeId", empId);
      if (startDate) params.set("startDate", startDate);
      if (endDate)   params.set("endDate", endDate);

      const r = await fetch(apiUrl(`/attendance/raw-punches?${params}`), { headers: authHeaders() });
      const d = await r.json();
      setRows(d.rows || []);
      setTotal(d.total || 0);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [search, empId, startDate, endDate]);

  useEffect(() => { setPage(1); fetchRows(1); }, [empId, startDate, endDate]);
  useEffect(() => { fetchRows(page); }, [page]);

  const handleSearch = () => { setPage(1); fetchRows(1); };
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const exportCsv = () => {
    const header = [
      "#", "Date", "Day", "Employee", "Emp Code", "Branch", "Status", "Source",
      "Punch 1 (IN)", "Punch 2 (OUT)", "Punch 3 (IN)", "Punch 4 (OUT)",
      "Punch 5 (IN)", "Punch 6 (OUT)", "Punch 7 (IN)", "Punch 8 (OUT)",
      "Total Hrs", "OT Hrs",
    ];
    const data = rows.map((r, i) => [
      (page - 1) * PAGE_SIZE + i + 1,
      fmtDate(r.date), fmtDay(r.date),
      r.employeeName, r.employeeCode, r.branchName,
      r.status.replace("_", " "), r.source,
      r.p1 || "", r.p2 || "", r.p3 || "", r.p4 || "",
      "", "", "", "",
      fmtHours(r.totalHours), fmtHours(r.overtimeHours),
    ]);
    const csv = [header, ...data].map(row =>
      row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")
    ).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `raw-punches-${startDate || "all"}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // Summary stats
  const presentCount  = rows.filter(r => r.status === "present" || r.status === "late").length;
  const absentCount   = rows.filter(r => r.status === "absent").length;
  const missingOut    = rows.filter(r => r.p1 && !r.p2).length;
  const missingIn2    = rows.filter(r => r.p2 && r.p3 && !r.p4).length; // has split but missing out2

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Fingerprint className="w-5 h-5 text-primary" />
          <h1 className="text-base font-semibold">Raw Punch Logs</h1>
          <span className="text-xs text-muted-foreground">One row per employee per day · all punch times</span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => fetchRows(page)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded-md bg-background hover:bg-muted">
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} /> Refresh
          </button>
          <button onClick={exportCsv} disabled={rows.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded-md bg-background hover:bg-muted disabled:opacity-40">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border px-4 py-3 bg-blue-50 border-blue-200">
          <div className="text-xl font-bold text-blue-600">{total.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Total Records</div>
        </div>
        <div className="rounded-lg border px-4 py-3 bg-emerald-50 border-emerald-200">
          <div className="text-xl font-bold text-emerald-600">{presentCount.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Present / Late</div>
        </div>
        <div className="rounded-lg border px-4 py-3 bg-red-50 border-red-200">
          <div className="text-xl font-bold text-red-600">{absentCount.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Absent</div>
        </div>
        <div className="rounded-lg border px-4 py-3 bg-orange-50 border-orange-300">
          <div className="text-xl font-bold text-orange-600">{(missingOut + missingIn2).toLocaleString()}</div>
          <div className="text-xs text-muted-foreground mt-0.5">⚠ Missing Punches</div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="px-4 py-2.5 border-b border-border bg-muted/30 rounded-t-xl">
          <span className="text-xs font-semibold">Filters</span>
        </div>
        <div className="p-3 flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs text-muted-foreground mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input className="w-full pl-8 pr-7 py-1.5 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Name or emp code…" value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()} />
              {search && <button className="absolute right-2 top-1/2 -translate-y-1/2"
                onClick={() => { setSearch(""); setPage(1); fetchRows(1); }}>
                <X className="w-3.5 h-3.5 text-muted-foreground" /></button>}
            </div>
          </div>
          <div className="min-w-[190px]">
            <label className="block text-xs text-muted-foreground mb-1">Employee</label>
            <select className="w-full py-1.5 px-2 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              value={empId} onChange={e => setEmpId(e.target.value)}>
              <option value="">— All Employees —</option>
              {employees.map(e => <option key={e.id} value={String(e.id)}>{e.fullName} ({e.employeeId})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">From</label>
            <input type="date" className="py-1.5 px-2 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">To</label>
            <input type="date" className="py-1.5 px-2 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <button onClick={handleSearch}
            className="px-4 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
            Apply
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {/* Table header bar */}
        <div className="px-4 py-2.5 border-b border-border bg-muted/30 flex items-center justify-between">
          <span className="text-xs font-semibold">
            {loading ? "Loading…" : `${total.toLocaleString()} records`}
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
          <table className="w-full text-xs border-collapse">
            <thead>
              {/* Punch group header */}
              <tr className="bg-slate-700 text-white">
                <th colSpan={7} className="px-3 py-1.5 text-left text-[10px] font-semibold border-r border-slate-600">
                  Employee Info
                </th>
                <th colSpan={4} className="px-3 py-1.5 text-center text-[10px] font-semibold border-r border-slate-600">
                  Punch Times
                </th>
                <th colSpan={2} className="px-3 py-1.5 text-center text-[10px] font-semibold">
                  Hours
                </th>
              </tr>
              <tr className="bg-muted/70 border-b border-border">
                <th className="px-2 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap w-8">#</th>
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">Date</th>
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">Day</th>
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">Employee</th>
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">Code</th>
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">Status</th>
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap border-r border-border">Source</th>
                {/* 4 punch columns */}
                <th className="px-3 py-2 text-center font-semibold whitespace-nowrap bg-emerald-50 text-emerald-700">
                  <div className="text-[10px]">Punch 1</div><div className="text-[9px] font-normal opacity-70">IN</div>
                </th>
                <th className="px-3 py-2 text-center font-semibold whitespace-nowrap bg-red-50 text-red-700">
                  <div className="text-[10px]">Punch 2</div><div className="text-[9px] font-normal opacity-70">OUT</div>
                </th>
                <th className="px-3 py-2 text-center font-semibold whitespace-nowrap bg-emerald-50 text-emerald-700">
                  <div className="text-[10px]">Punch 3</div><div className="text-[9px] font-normal opacity-70">IN</div>
                </th>
                <th className="px-3 py-2 text-center font-semibold whitespace-nowrap bg-red-50 text-red-700 border-r border-border">
                  <div className="text-[10px]">Punch 4</div><div className="text-[9px] font-normal opacity-70">OUT</div>
                </th>
                <th className="px-3 py-2 text-center font-semibold text-muted-foreground whitespace-nowrap">Total</th>
                <th className="px-3 py-2 text-center font-semibold text-muted-foreground whitespace-nowrap">OT</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={13} className="px-3 py-12 text-center text-muted-foreground">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                    Loading records…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-3 py-12 text-center text-muted-foreground">
                    <Fingerprint className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No records found. Try adjusting your filters.
                  </td>
                </tr>
              ) : rows.map((row, i) => {
                const sc = STATUS_COLOR[row.status] ?? STATUS_COLOR.absent;
                const rowN = (page - 1) * PAGE_SIZE + i + 1;
                // missing punch detection
                const missingP2 = !!row.p1 && !row.p2;          // punched in, never out
                const missingP4 = !!row.p3 && !row.p4;          // split: punched in2, never out2
                const hasMissing = missingP2 || missingP4;
                return (
                  <tr key={row.id}
                    className={cn("border-b border-border/50 hover:bg-muted/20 transition-colors",
                      hasMissing ? "bg-orange-50/60" : i % 2 === 1 ? "bg-muted/10" : "bg-background")}>
                    <td className="px-2 py-1.5 text-muted-foreground text-right w-8">{rowN}</td>
                    <td className="px-3 py-1.5 font-mono whitespace-nowrap">{fmtDate(row.date)}</td>
                    <td className="px-3 py-1.5 text-muted-foreground">{fmtDay(row.date)}</td>
                    <td className="px-3 py-1.5 font-medium text-foreground whitespace-nowrap max-w-[160px] truncate" title={row.employeeName}>
                      {hasMissing && <span className="mr-1 text-orange-500" title="Missing punch">⚠</span>}
                      {row.employeeName}
                    </td>
                    <td className="px-3 py-1.5 font-mono text-muted-foreground whitespace-nowrap">{row.employeeCode}</td>
                    <td className="px-3 py-1.5">
                      <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium", sc.bg, sc.text)}>
                        <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", sc.dot)} />
                        {row.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 border-r border-border/50">
                      <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium capitalize",
                        row.source === "biometric" ? "bg-blue-100 text-blue-700" :
                        row.source === "manual"    ? "bg-purple-100 text-purple-700" :
                        "bg-gray-100 text-gray-600")}>
                        {row.source}
                      </span>
                    </td>
                    {/* Punch 1 IN */}
                    <td className="px-3 py-1.5 text-center font-mono whitespace-nowrap text-emerald-700 font-semibold">
                      {row.p1 ?? <span className="text-muted-foreground/30">—</span>}
                    </td>
                    {/* Punch 2 OUT — highlight missing */}
                    <td className="px-3 py-1.5 text-center font-mono whitespace-nowrap">
                      {row.p2
                        ? <span className="text-red-700 font-semibold">{row.p2}</span>
                        : missingP2
                          ? <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-100 text-orange-700 border border-orange-300">MISSING</span>
                          : <span className="text-muted-foreground/30">—</span>}
                    </td>
                    {/* Punch 3 IN */}
                    <td className="px-3 py-1.5 text-center font-mono whitespace-nowrap text-emerald-700 font-semibold">
                      {row.p3 ?? <span className="text-muted-foreground/30">—</span>}
                    </td>
                    {/* Punch 4 OUT — highlight missing */}
                    <td className="px-3 py-1.5 text-center font-mono whitespace-nowrap border-r border-border/50">
                      {row.p4
                        ? <span className="text-red-700 font-semibold">{row.p4}</span>
                        : missingP4
                          ? <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-100 text-orange-700 border border-orange-300">MISSING</span>
                          : <span className="text-muted-foreground/30">—</span>}
                    </td>
                    <td className="px-3 py-1.5 text-center font-mono text-blue-700 font-medium">
                      {fmtHours(row.totalHours)}
                    </td>
                    <td className="px-3 py-1.5 text-center font-mono text-orange-600">
                      {row.overtimeHours && row.overtimeHours > 0 ? fmtHours(row.overtimeHours) : "—"}
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
              Page {page} of {totalPages} · {PAGE_SIZE} rows per page
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
                      pg === page
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border bg-background hover:bg-muted")}>
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
