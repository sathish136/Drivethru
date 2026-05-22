import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Fingerprint, Search, RefreshCw, Download, ChevronLeft, ChevronRight, X,
  Calendar, Building2, User, Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
function apiUrl(path: string) { return `${BASE}/api${path}`; }
function authHeaders() {
  const token = localStorage.getItem("auth_token") || "";
  return { Authorization: `Bearer ${token}` };
}

const PAGE_SIZE = 100;

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

type DayRow = {
  id: number;
  employeeId: number;
  employeeName: string;
  employeeCode: string;
  branchName: string;
  date: string;
  status: string;
  source: string;
  punchCount: number;
  punchTimes: string[];
  punchTypes: string[];
  totalHours: number | null;
  overtimeHours: number | null;
};

type Employee = { id: number; fullName: string; employeeId: string };
type Branch   = { id: number; name: string };

const DEPARTMENTS = [
  "Admin", "Front Office", "House Keeping", "Kitchen",
  "Maintainance", "Security", "Surf Instructors",
];

const STATUS_COLOR: Record<string, { bg: string; text: string; dot: string }> = {
  present:  { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  late:     { bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-500"   },
  half_day: { bg: "bg-yellow-50",  text: "text-yellow-700",  dot: "bg-yellow-500"  },
  absent:   { bg: "bg-red-50",     text: "text-red-700",     dot: "bg-red-500"     },
  leave:    { bg: "bg-purple-50",  text: "text-purple-700",  dot: "bg-purple-500"  },
  holiday:  { bg: "bg-gray-50",    text: "text-gray-600",    dot: "bg-gray-400"    },
  off_day:  { bg: "bg-slate-50",   text: "text-slate-600",   dot: "bg-slate-400"   },
};

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
function punchLabel(idx: number): "IN" | "OUT" {
  return idx % 2 === 0 ? "IN" : "OUT";
}

export default function RawPunches() {
  const [rows, setRows]       = useState<DayRow[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage]       = useState(1);

  // Filters — default date = today
  const [date, setDate]           = useState(todayStr());
  const [search, setSearch]       = useState("");
  const [empId, setEmpId]         = useState("");
  const [branchId, setBranchId]   = useState("");
  const [department, setDepartment] = useState("");

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches]   = useState<Branch[]>([]);

  // Load dropdowns
  useEffect(() => {
    fetch(apiUrl("/employees?limit=1000"), { headers: authHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then(d => setEmployees((d?.employees || d || []).map((e: any) => ({
        id: e.id, fullName: e.fullName, employeeId: e.employeeId,
      })))). catch(() => {});

    fetch(apiUrl("/branches?limit=500"), { headers: authHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then(d => setBranches((d?.branches || d || []).map((b: any) => ({
        id: b.id, name: b.name,
      }))))
      .catch(() => {});
  }, []);

  const fetchRows = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(PAGE_SIZE) });
      if (date)       { params.set("startDate", date); params.set("endDate", date); }
      if (search)     params.set("search", search);
      if (empId)      params.set("employeeId", empId);
      if (branchId)   params.set("branchId", branchId);
      if (department) params.set("department", department);

      const r = await fetch(apiUrl(`/attendance/raw-punches?${params}`), { headers: authHeaders() });
      const d = await r.json();
      setRows(d.rows || []);
      setTotal(d.total || 0);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [date, search, empId, branchId, department]);

  // Re-fetch when dropdown filters change
  useEffect(() => { setPage(1); fetchRows(1); }, [date, empId, branchId, department]);
  useEffect(() => { fetchRows(page); }, [page]);

  const handleSearch = () => { setPage(1); fetchRows(1); };
  const clearDate    = () => setDate("");
  const totalPages   = Math.ceil(total / PAGE_SIZE);

  // Dynamic punch columns — minimum 4, expands with data
  const maxCols = useMemo(() =>
    Math.max(4, ...rows.map(r => r.punchCount ?? 0)),
    [rows]
  );

  const exportCsv = () => {
    const punchHeaders = Array.from({ length: maxCols }, (_, i) => `Punch ${i + 1}`);
    const header = [
      "#", "Date", "Day", "Employee", "Emp Code", "Branch", "Status", "Source",
      ...punchHeaders, "Total Punches", "Total Hrs", "OT Hrs",
    ];
    const data = rows.map((r, i) => [
      (page - 1) * PAGE_SIZE + i + 1,
      fmtDate(r.date), fmtDay(r.date),
      r.employeeName, r.employeeCode, r.branchName,
      r.status.replace("_", " "), r.source,
      ...Array.from({ length: maxCols }, (_, pi) => r.punchTimes?.[pi] || ""),
      r.punchCount || 0, fmtHours(r.totalHours), fmtHours(r.overtimeHours),
    ]);
    const csv = [header, ...data].map(row =>
      row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")
    ).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `raw-punches-${date || "all"}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // Summary stats
  const presentCount      = rows.filter(r => r.status === "present" || r.status === "late").length;
  const absentCount       = rows.filter(r => r.status === "absent").length;
  const missingPunchCount = rows.filter(r => {
    const t = r.punchTypes || [];
    return t.length > 0 && t[t.length - 1] === "in";
  }).length;
  const totalPunches = rows.reduce((s, r) => s + (r.punchCount || 0), 0);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Fingerprint className="w-4 h-4 text-primary" />
          <h1 className="text-sm font-semibold">Raw Punch Logs</h1>
          <span className="text-[11px] text-muted-foreground hidden sm:inline">· all biometric punch records</span>
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => fetchRows(page)}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] border border-border rounded-md bg-background hover:bg-muted">
            <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} /> Refresh
          </button>
          <button onClick={exportCsv} disabled={rows.length === 0}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] border border-border rounded-md bg-background hover:bg-muted disabled:opacity-40">
            <Download className="w-3 h-3" /> CSV
          </button>
        </div>
      </div>

      {/* Compact summary cards */}
      <div className="grid grid-cols-4 gap-2">
        <div className="rounded-lg border px-3 py-2 bg-blue-50 border-blue-200 flex items-center gap-2">
          <div>
            <div className="text-base font-bold text-blue-600 leading-tight">{total.toLocaleString()}</div>
            <div className="text-[10px] text-blue-500/80">Records</div>
          </div>
        </div>
        <div className="rounded-lg border px-3 py-2 bg-emerald-50 border-emerald-200 flex items-center gap-2">
          <div>
            <div className="text-base font-bold text-emerald-600 leading-tight">{presentCount.toLocaleString()}</div>
            <div className="text-[10px] text-emerald-600/80">Present/Late</div>
          </div>
        </div>
        <div className="rounded-lg border px-3 py-2 bg-red-50 border-red-200 flex items-center gap-2">
          <div>
            <div className="text-base font-bold text-red-600 leading-tight">{absentCount.toLocaleString()}</div>
            <div className="text-[10px] text-red-500/80">Absent</div>
          </div>
        </div>
        <div className="rounded-lg border px-3 py-2 bg-orange-50 border-orange-200 flex items-center gap-2">
          <div>
            <div className="text-base font-bold text-orange-600 leading-tight">{missingPunchCount.toLocaleString()}</div>
            <div className="text-[10px] text-orange-500/80">⚠ Missing</div>
          </div>
        </div>
      </div>

      {/* Filter bar — single row */}
      <div className="rounded-lg border border-border bg-card shadow-sm">
        <div className="px-3 py-2 flex flex-wrap gap-2 items-end">

          {/* Single date picker */}
          <div className="min-w-[140px]">
            <label className="block text-[10px] text-muted-foreground mb-0.5 font-medium uppercase tracking-wide">Date</label>
            <div className="relative">
              <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
              <input type="date"
                className="w-full pl-6 pr-6 py-1 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                value={date}
                onChange={e => setDate(e.target.value)} />
              {date && (
                <button className="absolute right-1.5 top-1/2 -translate-y-1/2" onClick={clearDate} title="Clear date (show all)">
                  <X className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>
          </div>

          {/* Department filter */}
          <div className="min-w-[150px]">
            <label className="block text-[10px] text-muted-foreground mb-0.5 font-medium uppercase tracking-wide">Department</label>
            <div className="relative">
              <Layers className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
              <select
                className="w-full pl-6 py-1 pr-2 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                value={department} onChange={e => setDepartment(e.target.value)}>
                <option value="">All Departments</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          {/* Branch filter */}
          <div className="min-w-[150px]">
            <label className="block text-[10px] text-muted-foreground mb-0.5 font-medium uppercase tracking-wide">Branch</label>
            <div className="relative">
              <Building2 className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
              <select
                className="w-full pl-6 py-1 pr-2 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                value={branchId} onChange={e => setBranchId(e.target.value)}>
                <option value="">All Branches</option>
                {branches.map(b => <option key={b.id} value={String(b.id)}>{b.name}</option>)}
              </select>
            </div>
          </div>

          {/* Employee filter */}
          <div className="min-w-[180px]">
            <label className="block text-[10px] text-muted-foreground mb-0.5 font-medium uppercase tracking-wide">Employee</label>
            <div className="relative">
              <User className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
              <select
                className="w-full pl-6 py-1 pr-2 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                value={empId} onChange={e => setEmpId(e.target.value)}>
                <option value="">All Employees</option>
                {employees.map(e => <option key={e.id} value={String(e.id)}>{e.fullName} ({e.employeeId})</option>)}
              </select>
            </div>
          </div>

          {/* Search */}
          <div className="flex-1 min-w-[150px]">
            <label className="block text-[10px] text-muted-foreground mb-0.5 font-medium uppercase tracking-wide">Search</label>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
              <input
                className="w-full pl-6 pr-6 py-1 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Name or code…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()} />
              {search && (
                <button className="absolute right-1.5 top-1/2 -translate-y-1/2"
                  onClick={() => { setSearch(""); setPage(1); fetchRows(1); }}>
                  <X className="w-3 h-3 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>

          <button onClick={handleSearch}
            className="px-3 py-1 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 self-end">
            Search
          </button>

          {/* Today shortcut */}
          {date !== todayStr() && (
            <button onClick={() => setDate(todayStr())}
              className="px-2.5 py-1 text-xs border border-border rounded-md bg-background hover:bg-muted self-end text-muted-foreground">
              Today
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {/* Table header bar */}
        <div className="px-3 py-2 border-b border-border bg-muted/30 flex items-center justify-between">
          <span className="text-xs font-semibold">
            {loading ? "Loading…" : `${total.toLocaleString()} records`}
            {!loading && total > 0 && (
              <span className="text-muted-foreground font-normal ml-1 text-[11px]">
                — showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)}
              </span>
            )}
            {!loading && date && (
              <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-normal">
                {fmtDate(date)}
              </span>
            )}
            {!loading && maxCols > 4 && rows.length > 0 && (
              <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-normal">
                {maxCols} punches · {totalPunches} total
              </span>
            )}
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}
                className="p-1 rounded border border-border bg-background hover:bg-muted disabled:opacity-40">
                <ChevronLeft className="w-3 h-3" />
              </button>
              <span className="text-xs px-2">{page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="p-1 rounded border border-border bg-background hover:bg-muted disabled:opacity-40">
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-700 text-white">
                <th colSpan={7} className="px-3 py-1.5 text-left text-[10px] font-semibold border-r border-slate-600">
                  Employee Info
                </th>
                <th colSpan={maxCols} className="px-3 py-1.5 text-center text-[10px] font-semibold border-r border-slate-600">
                  Punch Times {maxCols > 4 ? `(${maxCols})` : ""}
                </th>
                <th colSpan={2} className="px-3 py-1.5 text-center text-[10px] font-semibold">
                  Hours
                </th>
              </tr>
              <tr className="bg-muted/70 border-b border-border">
                <th className="px-2 py-1.5 text-left font-semibold text-muted-foreground whitespace-nowrap w-8">#</th>
                <th className="px-2 py-1.5 text-left font-semibold text-muted-foreground whitespace-nowrap">Date</th>
                <th className="px-2 py-1.5 text-left font-semibold text-muted-foreground whitespace-nowrap">Day</th>
                <th className="px-2 py-1.5 text-left font-semibold text-muted-foreground whitespace-nowrap">Employee</th>
                <th className="px-2 py-1.5 text-left font-semibold text-muted-foreground whitespace-nowrap">Code</th>
                <th className="px-2 py-1.5 text-left font-semibold text-muted-foreground whitespace-nowrap">Status</th>
                <th className="px-2 py-1.5 text-left font-semibold text-muted-foreground whitespace-nowrap border-r border-border">Source</th>
                {Array.from({ length: maxCols }, (_, pi) => {
                  const label  = punchLabel(pi);
                  const isLast = pi === maxCols - 1;
                  return (
                    <th key={pi} className={cn(
                      "px-2 py-1.5 text-center font-semibold whitespace-nowrap",
                      label === "IN" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700",
                      isLast && "border-r border-border"
                    )}>
                      <div className="text-[10px]">P{pi + 1}</div>
                      <div className="text-[9px] font-normal opacity-70">{label}</div>
                    </th>
                  );
                })}
                <th className="px-2 py-1.5 text-center font-semibold text-muted-foreground whitespace-nowrap">Total</th>
                <th className="px-2 py-1.5 text-center font-semibold text-muted-foreground whitespace-nowrap">OT</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7 + maxCols + 2} className="px-3 py-10 text-center text-muted-foreground">
                    <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2 text-primary" />
                    Loading records…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7 + maxCols + 2} className="px-3 py-10 text-center text-muted-foreground">
                    <Fingerprint className="w-7 h-7 mx-auto mb-2 opacity-30" />
                    No records found.{date ? ` No punches on ${fmtDate(date)}.` : " Try adjusting filters."}
                  </td>
                </tr>
              ) : rows.map((row, i) => {
                const sc       = STATUS_COLOR[row.status] ?? STATUS_COLOR.absent;
                const rowN     = (page - 1) * PAGE_SIZE + i + 1;
                const types    = row.punchTypes || [];
                const times    = row.punchTimes || [];
                const lastType = types[types.length - 1];
                const hasMissing = types.length > 0 && lastType === "in";

                return (
                  <tr key={row.id}
                    className={cn("border-b border-border/50 hover:bg-muted/20 transition-colors",
                      hasMissing ? "bg-orange-50/60" : i % 2 === 1 ? "bg-muted/10" : "bg-background")}>
                    <td className="px-2 py-1 text-muted-foreground text-right w-8 text-[11px]">{rowN}</td>
                    <td className="px-2 py-1 font-mono whitespace-nowrap text-[11px]">{fmtDate(row.date)}</td>
                    <td className="px-2 py-1 text-muted-foreground text-[11px]">{fmtDay(row.date)}</td>
                    <td className="px-2 py-1 font-medium text-foreground whitespace-nowrap max-w-[150px] truncate text-[11px]" title={row.employeeName}>
                      {hasMissing && <span className="mr-1 text-orange-500 text-[10px]" title="Missing out-punch">⚠</span>}
                      {row.employeeName}
                    </td>
                    <td className="px-2 py-1 font-mono text-muted-foreground whitespace-nowrap text-[11px]">{row.employeeCode}</td>
                    <td className="px-2 py-1">
                      <span className={cn("inline-flex items-center gap-1 px-1 py-0.5 rounded text-[10px] font-medium", sc.bg, sc.text)}>
                        <span className={cn("w-1 h-1 rounded-full flex-shrink-0", sc.dot)} />
                        {row.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-2 py-1 border-r border-border/50">
                      <span className={cn("px-1 py-0.5 rounded text-[10px] font-medium capitalize",
                        row.source === "biometric" ? "bg-blue-100 text-blue-700" :
                        row.source === "manual"    ? "bg-purple-100 text-purple-700" :
                        "bg-gray-100 text-gray-600")}>
                        {row.source}
                      </span>
                    </td>
                    {Array.from({ length: maxCols }, (_, pi) => {
                      const punchTime    = times[pi];
                      const pType        = types[pi];
                      const isIn         = pType === "in"  || (!pType && pi % 2 === 0 && !!punchTime);
                      const isOut        = pType === "out" || (!pType && pi % 2 === 1 && !!punchTime);
                      const isMissingSlot = hasMissing && pi === types.length;
                      const isLastCol    = pi === maxCols - 1;
                      return (
                        <td key={pi} className={cn(
                          "px-2 py-1 text-center font-mono whitespace-nowrap text-[11px]",
                          isLastCol && "border-r border-border/50"
                        )}>
                          {punchTime ? (
                            <span className={cn("font-semibold",
                              isIn  ? "text-emerald-700" :
                              isOut ? "text-red-700"     : "text-slate-600")}>
                              {punchTime}
                            </span>
                          ) : isMissingSlot ? (
                            <span className="px-1 py-0.5 rounded text-[9px] font-semibold bg-orange-100 text-orange-700 border border-orange-300">MISS</span>
                          ) : (
                            <span className="text-muted-foreground/25">—</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-2 py-1 text-center font-mono text-blue-700 font-medium text-[11px]">
                      {fmtHours(row.totalHours)}
                    </td>
                    <td className="px-2 py-1 text-center font-mono text-orange-600 text-[11px]">
                      {row.overtimeHours && row.overtimeHours > 0 ? fmtHours(row.overtimeHours) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-3 py-2 border-t border-border bg-muted/20 flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">
              Page {page} of {totalPages} · {PAGE_SIZE} rows/page
            </span>
            <div className="flex items-center gap-1">
              <button disabled={page <= 1} onClick={() => setPage(1)}
                className="px-2 py-0.5 text-[11px] rounded border border-border bg-background hover:bg-muted disabled:opacity-40">First</button>
              <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}
                className="p-1 rounded border border-border bg-background hover:bg-muted disabled:opacity-40">
                <ChevronLeft className="w-3 h-3" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
                const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                const pg = start + idx;
                return (
                  <button key={pg} onClick={() => setPage(pg)}
                    className={cn("w-6 h-6 text-[11px] rounded border transition-colors",
                      pg === page
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border bg-background hover:bg-muted")}>
                    {pg}
                  </button>
                );
              })}
              <button disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="p-1 rounded border border-border bg-background hover:bg-muted disabled:opacity-40">
                <ChevronRight className="w-3 h-3" />
              </button>
              <button disabled={page >= totalPages} onClick={() => setPage(totalPages)}
                className="px-2 py-0.5 text-[11px] rounded border border-border bg-background hover:bg-muted disabled:opacity-40">Last</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
