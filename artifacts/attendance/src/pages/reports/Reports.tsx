import { useState, useEffect, useMemo, useRef } from "react";
import { useGetAttendanceReport, useGetMonthlyReport, useGetOvertimeReport, useListBranches, useListEmployees, useListShifts } from "@workspace/api-client-react";
import { PageHeader, Card, Input, Select, Label } from "@/components/ui";
import { cn } from "@/lib/utils";
import { Users, Clock, Calendar, Banknote, FileText, ChevronDown, X, Eye, Printer } from "lucide-react";
import drivethruLogo from "@/assets/drivethru-logo.png";
import liveuLogo from "@/assets/liveu-logo.png";

interface DeptShiftRule {
  id: string; department: string; shift: string;
  lateGraceMinutes: number | null; otAfterHours: number | null;
  otEligible: boolean; flexible: boolean; remarks: string;
  [key: string]: any;
}
function clientFindRule(rules: DeptShiftRule[], department: string, shiftName?: string | null): DeptShiftRule | null {
  if (!rules.length) return null;
  const dept  = (department ?? "").toLowerCase().trim();
  const shift = (shiftName  ?? "").toLowerCase().trim();
  if (shift) {
    const both = rules.find(r =>
      r.department.toLowerCase().trim() === dept && r.shift.toLowerCase().trim() === shift
    );
    if (both) return both;
  }
  const exactDept = rules.find(r => r.department.toLowerCase().trim() === dept);
  if (exactDept) return exactDept;
  const partial = rules.find(r => {
    const rd = r.department.toLowerCase().trim();
    return dept.includes(rd) || rd.includes(dept);
  });
  return partial ?? null;
}
function useEmployeeOffDays() {
  const [offDaysByEmpId, setOffDaysByEmpId] = useState<Map<number, number[]>>(new Map());
  useEffect(() => {
    const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
    const token = localStorage.getItem("auth_token") || "";
    const authOpts = { credentials: "include" as const, headers: { Authorization: `Bearer ${token}` } };
    Promise.all([
      fetch(`${BASE}/api/weekoffs`, authOpts).then(r => r.json()),
      fetch(`${BASE}/api/employees?limit=1000`, authOpts).then(r => r.json()),
    ]).then(([schedules, empResp]) => {
      const schedMap = new Map<number, number[]>();
      if (Array.isArray(schedules)) {
        for (const s of schedules) {
          if (s && typeof s.id === "number") schedMap.set(s.id, Array.isArray(s.offDays) ? s.offDays : []);
        }
      }
      const list: any[] = Array.isArray(empResp) ? empResp : (empResp?.employees || []);
      const m = new Map<number, number[]>();
      for (const e of list) {
        if (e?.weekoffScheduleId && schedMap.has(e.weekoffScheduleId)) {
          m.set(Number(e.id), schedMap.get(e.weekoffScheduleId)!);
        }
      }
      setOffDaysByEmpId(m);
    }).catch(() => {});
  }, []);
  return offDaysByEmpId;
}

function useHrRules() {
  const [shifts, setShifts] = useState<{ id: number; name: string }[]>([]);
  useEffect(() => {
    const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
    const token = localStorage.getItem("auth_token") || "";
    const authOpts = { credentials: "include" as const, headers: { Authorization: `Bearer ${token}` } };
    fetch(`${BASE}/api/shifts`, authOpts).then(r => r.json()).then((shiftsData) => {
      if (Array.isArray(shiftsData)) setShifts(shiftsData);
    }).catch(() => {});
  }, []);
  return { rules: [] as DeptShiftRule[], shifts };
}

type Tab = "attendance" | "monthly" | "overtime" | "payroll" | "individual";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
function apiUrl(path: string) { return `${BASE}/api${path}`; }

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const STATUS_COLORS: Record<string, string> = {
  present:  "bg-green-100 text-green-700",
  absent:   "bg-red-100 text-red-700",
  late:     "bg-amber-50 text-amber-700",
  half_day: "bg-yellow-100 text-yellow-700",
  leave:    "bg-purple-100 text-purple-700",
  holiday:  "bg-gray-100 text-gray-700",
  off_day:  "bg-violet-100 text-violet-700",
};
function fmtStatus(st: string) {
  if (st === "late") return "PRESENT (LATE)";
  if (st === "half_day") return "HALF DAY";
  if (st === "off_day") return "DAY OFF";
  return st.replace("_", " ").toUpperCase();
}
function calcLateMinutes(inTime: string | null): number {
  if (!inTime) return 0;
  const [h, m] = inTime.split(":").map(Number);
  const inMins = h * 60 + m;
  const cutoff = 8 * 60 + 15;
  return Math.max(0, inMins - cutoff);
}

function fmtAmt(n: number) { return `Rs. ${Math.round(n).toLocaleString("en-LK")}`; }
function getMonthName(m: number) { return MONTHS[m - 1]; }

/* ─── Simple debounce hook ─── */
function useDebounce<T>(value: T, ms: number): T {
  const [v, setV] = useState<T>(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/* ─── PDF download helper ─── */
async function printReport(opts: {
  title: string;
  meta: { label: string; value: string }[];
  tableHtml: string;
  filename?: string;
}) {
  const { title, meta, tableHtml, filename } = opts;
  if (!tableHtml || tableHtml.trim().length === 0) {
    throw new Error("Report table is empty.");
  }
  const metaHtml = meta.map(m =>
    `<div class="meta-item"><span class="meta-label">${m.label}</span><span class="meta-value">${m.value}</span></div>`
  ).join("");
  const drivethruLogoUrl = /^https?:\/\//.test(drivethruLogo)
    ? drivethruLogo
    : `${window.location.origin}${drivethruLogo}`;
  const liveuLogoUrl = /^https?:\/\//.test(liveuLogo)
    ? liveuLogo
    : `${window.location.origin}${liveuLogo}`;
  const safeTitle = (filename || title || "report").replace(/[\\/:*?"<>|]+/g, "-");
  const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${safeTitle}</title><style>
  @page{size:A4 landscape;margin:8mm}
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;background:#fff;font-size:10.5px}
  .header{display:flex;align-items:center;justify-content:space-between;padding:16px 24px 12px;border-bottom:3px solid #1565a8;background:#f5f8ff}
  .header-left{display:flex;align-items:center;gap:12px}
  .header-logo{width:46px;height:46px;object-fit:contain;border-radius:12px;background:#fff;padding:4px}
  .company{font-size:18px;font-weight:700;color:#1565a8;line-height:1.15}
  .company-sub{font-size:9.5px;color:#6b7280;text-transform:uppercase;letter-spacing:.08em;margin-top:1px}
  .header-right{text-align:right}
  .report-title{font-size:13px;font-weight:700;color:#1565a8}
  .report-date{font-size:9px;color:#9ca3af;margin-top:3px}
  .meta-bar{display:flex;flex-wrap:wrap;background:#fff;border-bottom:1px solid #e5e7eb}
  .meta-item{padding:8px 18px;border-right:1px solid #f0f0f0}
  .meta-label{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#9ca3af;font-weight:600}
  .meta-value{display:block;font-size:11.5px;font-weight:700;color:#111827;margin-top:1px}
  table{width:100%;border-collapse:collapse}
  thead tr{background:#1565a8}
  th{color:#fff;padding:7px 9px;text-align:left;font-size:9px;font-weight:600;white-space:nowrap;letter-spacing:.03em}
  td{padding:5px 9px;font-size:9.5px;border-bottom:1px solid #f0f0f0;white-space:nowrap}
  tbody tr:nth-child(even) td{background:#f8fbff}
  tfoot td{padding:6px 9px;font-size:10px;font-weight:700;background:#e8f0fe;border-top:2px solid #1565a8}
  .footer{display:flex;align-items:center;justify-content:space-between;padding:10px 24px;border-top:1px solid #e5e7eb;background:#f5f8ff;margin-top:8px}
  .footer-note{font-size:8.5px;color:#9ca3af}
  .footer-right{display:flex;align-items:center;gap:6px}
  .footer-powered{font-size:9px;color:#9ca3af}
  .footer-liveu{height:20px;object-fit:contain;opacity:.85}
  .footer-liveu-name{font-size:9.5px;font-weight:700;color:#1565a8;letter-spacing:.02em}
  </style></head><body>
  <div class="header">
    <div class="header-left">
      <img src="${drivethruLogoUrl}" class="header-logo" alt="Drivethru"/>
      <div><div class="company">Drivethru Pvt Ltd</div><div class="company-sub">Attendance Management System</div></div>
    </div>
    <div class="header-right">
      <div class="report-title">${title}</div>
      <div class="report-date">Generated: ${new Date().toLocaleString("en-LK",{dateStyle:"long",timeStyle:"short"})}</div>
    </div>
  </div>
  <div class="meta-bar">${metaHtml}</div>
  ${tableHtml}
  <div class="footer">
    <div class="footer-note">System-generated report. For internal use only. © ${new Date().getFullYear()} Drivethru Pvt Ltd</div>
    <div class="footer-right">
      <span class="footer-powered">Powered by</span>
      <img src="${liveuLogoUrl}" class="footer-liveu" alt="Live U Pvt Ltd"/>
      <span class="footer-liveu-name">Live U Pvt Ltd</span>
    </div>
  </div></body></html>`;
  try {
    const blob = new Blob([fullHtml], { type: "text/html" });
    if (blob.size <= 0) throw new Error("Generated report HTML is empty.");
    const blobUrl = URL.createObjectURL(blob);
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.top = "-9999px";
    iframe.style.left = "-9999px";
    iframe.style.width = "1px";
    iframe.style.height = "1px";
    iframe.style.opacity = "0";
    iframe.src = blobUrl;
    document.body.appendChild(iframe);
    iframe.addEventListener("load", () => {
      setTimeout(() => {
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
          URL.revokeObjectURL(blobUrl);
        }, 2000);
      }, 400);
    });
  } catch (err) {
    console.error("PDF export failed:", err);
    alert("PDF export failed. Please try again after filtering valid records.");
    throw err;
  }
}

/* ─── CSV export helper ─── */
function exportCsv(headers: string[], rows: (string | number)[][], filename: string) {
  const escape = (v: string | number) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers, ...rows].map(r => r.map(escape).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ─── Mini Adobe PDF icon button ─── */
function PdfIconButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title="Export PDF"
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#E02B20] text-white hover:bg-[#C4241A] active:scale-95 transition-all shadow-sm"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="16" height="16" rx="2.5" fill="#E02B20"/>
        <path d="M2 3.5C2 2.67 2.67 2 3.5 2H9.5L14 6.5V12.5C14 13.33 13.33 14 12.5 14H3.5C2.67 14 2 13.33 2 12.5V3.5Z" fill="white" fillOpacity="0.15"/>
        <path d="M9.5 2V6H14" stroke="white" strokeOpacity="0.4" strokeWidth="0.8" fill="none"/>
        <text x="3" y="12" fontSize="5" fontWeight="800" fill="white" fontFamily="Arial,sans-serif" letterSpacing="0.3">PDF</text>
      </svg>
      Export PDF
    </button>
  );
}

/* ─── Mini Excel icon button ─── */
function ExcelIconButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title="Export Excel"
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1D6F42] text-white hover:bg-[#185C37] active:scale-95 transition-all shadow-sm"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="16" height="16" rx="2.5" fill="#1D6F42"/>
        <path d="M2 3H9V13H2V3Z" fill="#21A366" fillOpacity="0.5"/>
        <path d="M9 2H13.5C13.78 2 14 2.22 14 2.5V13.5C14 13.78 13.78 14 13.5 14H9V2Z" fill="white" fillOpacity="0.12"/>
        <line x1="9" y1="2" x2="9" y2="14" stroke="white" strokeOpacity="0.3" strokeWidth="0.8"/>
        <text x="2.5" y="11" fontSize="7.5" fontWeight="900" fill="white" fontFamily="Arial,sans-serif">X</text>
        <line x1="9.5" y1="5.5" x2="13.5" y2="5.5" stroke="white" strokeOpacity="0.35" strokeWidth="0.7"/>
        <line x1="9.5" y1="8" x2="13.5" y2="8" stroke="white" strokeOpacity="0.35" strokeWidth="0.7"/>
        <line x1="9.5" y1="10.5" x2="13.5" y2="10.5" stroke="white" strokeOpacity="0.35" strokeWidth="0.7"/>
      </svg>
      Export Excel
    </button>
  );
}

/* ── Filter card wrapper with title + PDF + Excel buttons ── */
function FilterCard({ title, onExport, onExportExcel, children }: { title: string; onExport: () => void; onExportExcel: () => void; children: React.ReactNode }) {
  return (
    <Card className="p-0 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <span className="text-sm font-semibold text-foreground">{title}</span>
        <div className="flex items-center gap-2">
          <ExcelIconButton onClick={onExportExcel} />
          <PdfIconButton onClick={onExport} />
        </div>
      </div>
      <div className="p-4">{children}</div>
    </Card>
  );
}

/* ─── Searchable multi-select employee picker ─── */
function MultiEmployeeSelect({
  employees,
  selectedIds,
  onChange,
  loading = false,
}: {
  employees: any[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  loading?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => searchInputRef.current?.focus(), 30);
    }
  }, [open]);

  const filtered = useMemo(() => {
    if (!search) return employees;
    const q = search.toLowerCase();
    return employees.filter(e =>
      (e.fullName || "").toLowerCase().includes(q) ||
      (e.employeeId || "").toLowerCase().includes(q) ||
      (e.firstName || "").toLowerCase().includes(q) ||
      (e.lastName || "").toLowerCase().includes(q)
    );
  }, [employees, search]);

  const toggle = (id: string) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter(i => i !== id) : [...selectedIds, id]);
  };

  const selectedEmps = employees.filter(e => selectedIds.includes(String(e.id)));

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => { setOpen(v => !v); setSearch(""); }}
        className="flex w-full items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
      >
        <span className={selectedIds.length === 0 ? "text-muted-foreground" : ""}>
          {selectedIds.length === 0
            ? "— Select Employees —"
            : selectedIds.length === 1
            ? selectedEmps[0]?.fullName || "1 selected"
            : `${selectedIds.length} employees selected`}
        </span>
        <ChevronDown className={cn("w-4 h-4 text-muted-foreground shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {selectedEmps.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {selectedEmps.map(e => (
            <span key={e.id} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
              {e.fullName}
              <button type="button" onClick={() => toggle(String(e.id))} className="hover:text-red-500 transition-colors ml-0.5">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {selectedEmps.length > 1 && (
            <button type="button" onClick={() => onChange([])} className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-red-50 text-red-500 text-xs font-medium border border-red-200 hover:bg-red-100 transition-colors">
              <X className="w-3 h-3" /> Clear all
            </button>
          )}
        </div>
      )}

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-card border border-border rounded-lg shadow-xl overflow-hidden" style={{ minWidth: "280px" }}>
          <div className="p-2 border-b border-border">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search by name or ID…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onInput={e => setSearch((e.target as HTMLInputElement).value)}
              className="w-full px-2.5 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:border-primary"
            />
          </div>
          <div className="flex items-center gap-3 px-3 py-1.5 bg-muted/40 border-b border-border">
            <button type="button" onClick={() => onChange(filtered.map(e => String(e.id)))} className="text-xs text-primary hover:underline">Select all ({filtered.length})</button>
            <span className="text-muted-foreground text-xs">·</span>
            <button type="button" onClick={() => onChange([])} className="text-xs text-red-500 hover:underline">Clear</button>
          </div>
          <div className="max-h-56 overflow-y-auto">
            {loading ? (
              <div className="px-3 py-5 text-center text-xs text-muted-foreground">Loading employees…</div>
            ) : filtered.length === 0 ? (
              <div className="px-3 py-5 text-center text-xs text-muted-foreground">No employees found</div>
            ) : (
              filtered.map(e => (
                <label key={e.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-muted/40 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(String(e.id))}
                    onChange={() => toggle(String(e.id))}
                    className="accent-primary w-3.5 h-3.5"
                  />
                  <span className="text-sm flex-1 font-medium">{e.fullName}</span>
                  <span className="text-xs text-muted-foreground font-mono">{e.employeeId}</span>
                </label>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════ */
export default function Reports() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const initialTab = (params.get("tab") as Tab) || "attendance";
  const initialEmp = params.get("emp") || "";
  const initialMonth = params.get("month") ? Number(params.get("month")) : undefined;
  const initialYear  = params.get("year")  ? Number(params.get("year"))  : undefined;

  const [tab, setTab] = useState<Tab>(initialTab);
  return (
    <div className="space-y-4">
      <PageHeader title="Reports" description="Detailed attendance, monthly, overtime and payroll reports." />
      <div className="flex gap-1 border-b border-border flex-wrap">
        {([
          { id:"attendance", label:"Attendance Report",        icon:Users },
          { id:"monthly",    label:"Monthly Report",           icon:Calendar },
          { id:"individual", label:"Individual Monthly Report", icon:FileText },
          { id:"overtime",   label:"Overtime Report",          icon:Clock },
          { id:"payroll",    label:"Payroll Report",           icon:Banknote },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={cn("flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
              tab===id?"border-primary text-primary":"border-transparent text-muted-foreground hover:text-foreground"
            )}>
            <Icon className="w-4 h-4"/>{label}
          </button>
        ))}
      </div>
      {tab==="attendance" && <AttendanceReport/>}
      {tab==="monthly"    && <MonthlyReport initialEmpName={initialEmp} initialMonth={initialMonth} initialYear={initialYear}/>}
      {tab==="individual" && <IndividualReport/>}
      {tab==="overtime"   && <OvertimeReport initialEmpName={initialEmp} initialMonth={initialMonth} initialYear={initialYear}/>}
      {tab==="payroll"    && <PayrollReport/>}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   ATTENDANCE REPORT
══════════════════════════════════════════════════════════ */
function AttendanceReport() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const toLocalDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const [startDate, setStartDate]   = useState(() => toLocalDate(new Date(now.getFullYear(), now.getMonth(), 1)));
  const [endDate, setEndDate]       = useState(() => toLocalDate(now));
  const [branchId, setBranchId]     = useState("");
  const [status, setStatus]         = useState("");
  const [department, setDepartment] = useState("");
  const [empName, setEmpName]       = useState("");
  const [shiftId, setShiftId]       = useState("");

  const dStart   = useDebounce(startDate, 400);
  const dEnd     = useDebounce(endDate, 400);
  const dBranch  = useDebounce(branchId, 200);
  const dStatus  = useDebounce(status, 200);

  const { rules: hrRules } = useHrRules();
  const { data: shiftsData } = useListShifts();
  const shiftOptions: any[] = Array.isArray(shiftsData) ? shiftsData : (shiftsData as any)?.shifts ?? [];
  const empOffDays = useEmployeeOffDays();

  const { data: branches } = useListBranches();
  const dDept = useDebounce(department, 300);
  const { data, isLoading } = useGetAttendanceReport({
    startDate: dStart, endDate: dEnd,
    ...(dBranch ? { branchId: Number(dBranch) } : {}),
    ...(dStatus ? { status: dStatus } : {}),
    ...(dDept ? { department: dDept } : {}),
  });

  // Fetch all employees to read their assigned shift from Employee Management
  const { data: empListData } = useListEmployees({ limit: 500 });
  const empShiftMap = useMemo(() => {
    const allEmps: any[] = empListData?.employees || [];
    const map: Record<number, number | null> = {};
    for (const e of allEmps) {
      map[Number(e.id)] = e.shiftId ? Number(e.shiftId) : null;
    }
    return map;
  }, [empListData]);

  // Map employeeId -> shift name (from Employee Management assigned shift)
  const empShiftNameMap = useMemo(() => {
    const map: Record<number, string> = {};
    for (const [empId, sId] of Object.entries(empShiftMap)) {
      if (sId != null) {
        const found = shiftOptions.find((s: any) => s.id === sId);
        if (found) map[Number(empId)] = found.name;
      }
    }
    return map;
  }, [empShiftMap, shiftOptions]);

  function getRemarks(r: any): string {
    if (typeof r.remarks === "string" && r.remarks.trim()) return r.remarks;
    const shiftName = r.shiftName
      ?? shiftOptions.find((s: any) => s.id === Number(r.shiftId))?.name
      ?? null;
    const rule = clientFindRule(hrRules, r.department ?? "", shiftName);
    return rule?.remarks ?? "";
  }

  const departments = useMemo(() => {
    const set = new Set((data?.records || []).map((r: any) => r.department).filter(Boolean));
    return Array.from(set).sort() as string[];
  }, [data]);

  const filtered = useMemo(() => (data?.records || []).filter((r: any) => {
    // For shift filter: use the shift assigned to the employee in Employee Management
    const empAssignedShiftId = empShiftMap[Number(r.employeeId)] ?? null;
    const shiftMatch = !shiftId || String(empAssignedShiftId) === shiftId;
    return (
      (!department || r.department === department)
      && shiftMatch
      && (!empName || (r.employeeName || "").toLowerCase().includes(empName.toLowerCase()) || String(r.employeeId || "").toLowerCase().includes(empName.toLowerCase()))
    );
  }).sort((a: any, b: any) => {
    const dateCmp = (a.date || "").localeCompare(b.date || "");
    if (dateCmp !== 0) return dateCmp;
    return (a.employeeName || "").localeCompare(b.employeeName || "");
  }), [data, department, shiftId, empName, empShiftMap]);

  // Auto-detect night-shift view: true when ALL non-off/holiday rows in the
  // filtered set belong to employees on a night shift (assigned shift startTime ≥ 18:00).
  // This is driven by the isNightShift flag returned by the API, which is based on
  // the employee's assigned shift — not the actual punch time, so it works for ANY
  // department whose employees are linked to a night-shift schedule.
  const isNightShiftView = useMemo(() => {
    if (!filtered.length) return false;
    const relevant = filtered.filter((r: any) => !["off_day","holiday"].includes(r.status));
    if (!relevant.length) return false;
    return relevant.every((r: any) => r.isNightShift === true);
  }, [filtered]);

  /* Auto-collapse sidebar when the night-shift 12-punch table is visible (needs extra width) */
  useEffect(() => {
    if (isNightShiftView) {
      window.dispatchEvent(new Event("sidebar_force_collapse"));
    } else {
      window.dispatchEvent(new Event("sidebar_force_expand"));
    }
  }, [isNightShiftView]);

  const HEADERS = isNightShiftView
    ? ["Shift Date","Next Day","Emp ID","Employee","Department","Branch","Shift","Status","P1","P2","P3","P4","P5","P6","P7","P8","P9","P10","P11","P12","P13","Total Hrs","OT Hrs","Remarks"]
    : ["Date","Emp ID","Employee","Department","Branch","Shift","Status","1st In","1st Out","2nd In","2nd Out","Lunch Break","Total Hrs","Late","OT Hrs","Remarks"];
  const NIGHT_WATCHER_POLICY_HEADERS = [
    "Date",
    "Day",
    "Status",
    "Shift",
    "1st In",
    "1st Out",
    "2nd In",
    "Actual Off Punch",
    "Current Total",
    "Policy OT by Off Time",
    "Policy Remark",
  ];

  function calcMins(inT: string|null, outT: string|null, nightAware = false): number {
    if (!inT || !outT) return 0;
    const [ih,im] = inT.split(":").map(Number);
    const [oh,om] = outT.split(":").map(Number);
    let diff = (oh*60+om)-(ih*60+im);
    if (nightAware && diff < 0) diff += 24 * 60;
    return Math.max(0, diff);
  }
  function fmtHM(mins: number): string {
    const h = Math.floor(mins/60), m = mins%60;
    return `${h}h ${String(m).padStart(2,"0")}m`;
  }
  function fmtTotal(totalHours: number|null): string {
    if (totalHours==null) return "—";
    const h = Math.floor(totalHours), m = Math.round((totalHours-h)*60);
    return `${h}:${String(m).padStart(2,"0")} hrs`;
  }
  function lunchBreakMins(r: any): number {
    if (!r.outTime1 || !r.inTime2) return 0;
    const [oh,om] = r.outTime1.split(":").map(Number);
    const [ih,im] = r.inTime2.split(":").map(Number);
    return Math.max(0,(ih*60+im)-(oh*60+om));
  }
  function toDdMmYyyy(dateStr: string): string {
    const [y, m, d] = dateStr.split("-");
    return `${d}-${m}-${y}`;
  }
  function otHoursToPolicy(otHours: number, isHoliday = false): string {
    if (!otHours || otHours <= 0) return "—";
    if (isHoliday) {
      // Holiday: 11 OT hrs (8 base + 3), cap 11
      return `${Math.min(11, Math.round(otHours))}.0 hrs`;
    }
    // Night Watcher regular OT: 0/1/2/3 discrete hours
    const discrete = Math.max(0, Math.min(3, Math.round(otHours)));
    return `${discrete}.0 hrs`;
  }
  function policyRemark(status: string, otHours: number, isHoliday = false): string {
    if (status === "no_record") return "No punch data";
    if (status === "half_day") return "Half day record; needs manual check against normal night shift policy";
    if (status === "absent") return "Absent/invalid against policy shift; manual review needed";
    if (isHoliday && otHours > 0) return "Holiday worked: 8 base + 3 = 11 OT hrs";
    if (otHours <= 0) return "No OT eligible by off time";
    const discrete = Math.max(0, Math.min(3, Math.round(otHours)));
    if (discrete >= 3) return "All hourly checkpoints satisfied (05:00/06:00/07:00)";
    return `${discrete}:00 hrs after missed hourly checkpoint deduction`;
  }
  function buildNightWatcherPolicyRows() {
    if (!filtered.length) return [] as (string | number)[][];
    const first = filtered[0];
    const shift = first.shiftName || "—";
    const mapByDate = new Map(filtered.map((r: any) => [r.date, r]));
    const [sy, sm, sd] = dStart.split("-").map(Number);
    const [ey, em, ed] = dEnd.split("-").map(Number);
    const start = new Date(Date.UTC(sy, sm - 1, sd));
    const end = new Date(Date.UTC(ey, em - 1, ed));
    const rows: (string | number)[][] = [];
    for (let dt = new Date(start); dt <= end; dt.setUTCDate(dt.getUTCDate() + 1)) {
      const dateStr = dt.toISOString().slice(0, 10);
      const day = DAY_NAMES[dt.getUTCDay()];
      const r = mapByDate.get(dateStr);
      if (!r) {
        rows.push([toDdMmYyyy(dateStr), day, "No record", shift, "—", "—", "—", "—", "—", "—", policyRemark("no_record", 0)]);
        continue;
      }
      const st = r.status;
      const statusLabel = st === "late" ? "PRESENT" : st === "half_day" ? "HALF DAY" : st === "off_day" ? "DAY OFF" : st.replace("_", " ").toUpperCase();
      const offPunch = r.outTime2 || r.outTime1 || "—";
      const isHol = !!(r as any).holidayWorked;
      rows.push([
        toDdMmYyyy(dateStr),
        day,
        statusLabel + (isHol ? " (HOLIDAY)" : ""),
        r.shiftName || shift,
        r.inTime1 || "—",
        r.outTime1 || "—",
        r.inTime2 || "—",
        offPunch,
        fmtTotal(r.totalHours),
        otHoursToPolicy(r.overtimeHours || 0, isHol),
        policyRemark(st, r.overtimeHours || 0, isHol),
      ]);
    }
    return rows;
  }

  const handleExport = async () => {
    if (!filtered.length) {
      alert("No records found for selected filters. Nothing to export.");
      return;
    }
    const singleEmp = new Set(filtered.map((r: any) => r.employeeId)).size === 1;
    const firstRule = singleEmp ? clientFindRule(hrRules, filtered[0]?.department ?? "", filtered[0]?.shiftName ?? null) : null;
    const isNightWatcher = singleEmp && (
      !!firstRule?.nightWatcherPayroll ||
      /night\s*watcher/i.test(String(filtered[0]?.shiftName || "")) ||
      /night\s*watcher/i.test(String(filtered[0]?.designation || ""))
    );
    if (singleEmp && isNightWatcher) {
      const firstRec: any = filtered[0];
      const policyRows = buildNightWatcherPolicyRows();
      if (!policyRows.length) {
        alert("No policy rows available for export.");
        return;
      }
      const theadPolicy = `<tr>${NIGHT_WATCHER_POLICY_HEADERS.map(h=>`<th>${h}</th>`).join("")}</tr>`;
      const tbodyPolicy = policyRows.map((row) => `<tr>${row.map((c) => `<td>${String(c)}</td>`).join("")}</tr>`).join("");
      await printReport({
        title: "Attendance Report (Policy Format)",
        meta: [
          { label: "Period", value: `${dStart} – ${dEnd}` },
          { label: "Employee", value: firstRec?.employeeName || "—" },
          { label: "Emp ID", value: firstRec?.employeeCode || "—" },
          { label: "Department", value: firstRec?.department || "—" },
          { label: "Branch", value: firstRec?.branchName || "—" },
        ],
        tableHtml: `<table><thead>${theadPolicy}</thead><tbody>${tbodyPolicy}</tbody></table>`,
      });
      return;
    }
    const present  = filtered.filter((r: any) => r.status === "present" || r.status === "late").length;
    const absent   = filtered.filter((r: any) => r.status === "absent").length;
    const late     = filtered.filter((r: any) => r.status === "late").length;
    const halfDay  = filtered.filter((r: any) => r.status === "half_day").length;
    const leave    = filtered.filter((r: any) => r.status === "leave").length;
    const holiday  = filtered.filter((r: any) => r.status === "holiday").length;
    const offDay   = filtered.filter((r: any) => r.status === "off_day").length;
    const thead = `<tr>${HEADERS.map(h=>`<th>${h}</th>`).join("")}</tr>`;
    const tbody = filtered.map((r: any) => {
      const statusLabel = r.status==="late"?"PRESENT (LATE)":r.status==="half_day"?"HALF DAY":r.status==="off_day"?"DAY OFF":r.status.replace("_"," ").toUpperCase();
      const tot = r.totalHours!=null ? fmtTotal(r.totalHours) : "—";
      const remarks = getRemarks(r);
      if (isNightShiftView) {
        const rp: string[] = r.rawPunches ?? [];
        const punchCells = Array.from({length:13}, (_,i) => `<td>${rp[i]||"—"}</td>`).join("");
        return `<tr>
          <td>${r.date}</td><td>${r.morningDate||"—"}</td>
          <td>${r.employeeCode}</td><td>${r.employeeName}</td>
          <td>${r.department||""}</td><td>${r.branchName}</td>
          <td>${r.shiftName||""}</td>
          <td>${statusLabel}</td>
          ${punchCells}
          <td>${tot}</td>
          <td>${r.overtimeHours>0?r.overtimeHours.toFixed(1)+"h":"—"}</td>
          <td>${remarks||"—"}</td>
        </tr>`;
      }
      const s1m = calcMins(r.inTime1, r.outTime1);
      const s2m = calcMins(r.inTime2, r.outTime2);
      const lb  = lunchBreakMins(r);
      const lbStr = lb>0 ? fmtHM(lb) : "—";
      const morningLate = r.morningLateMinutes || 0;
      const lunchLate = r.lunchLateMinutes || 0;
      const totalLateMin = morningLate + lunchLate;
      const lateStr = (() => {
        if (totalLateMin <= 0) return "—";
        const h = Math.floor(totalLateMin / 60), m = totalLateMin % 60;
        const hrsStr = `${h}.${String(m).padStart(2, "0")} hr`;
        const tag = (morningLate > 0 && lunchLate > 0) ? " (AM+Lunch)"
          : lunchLate > 0 ? " (Lunch)" : "";
        return totalLateMin < 60
          ? `${totalLateMin} min${tag}`
          : `${totalLateMin} min / ${hrsStr}${tag}`;
      })();
      return `<tr>
        <td>${r.date}</td><td>${r.employeeCode}</td><td>${r.employeeName}</td>
        <td>${r.department||""}</td><td>${r.branchName}</td>
        <td>${r.shiftName||""}</td>
        <td>${statusLabel}</td>
        <td>${r.inTime1||"—"}</td><td>${r.outTime1||"—"}</td>
        <td>${r.inTime2||"—"}</td><td>${r.outTime2||"—"}</td>
        <td>${lbStr}</td><td>${tot}</td>
        <td>${lateStr}</td>
        <td>${r.overtimeHours>0?r.overtimeHours.toFixed(1)+"h":"—"}</td>
        <td>${remarks||"—"}</td>
      </tr>`;
    }).join("");
    await printReport({
      title: isNightShiftView ? "Attendance Report (Night Shift)" : "Attendance Report",
      meta: [
        { label:"Period",        value:`${dStart} – ${dEnd}` },
        { label:"Total Records", value:String(filtered.length) },
        { label:"Present",       value:String(present) },
        { label:"Absent",        value:String(absent) },
        { label:"Late",          value:String(late) },
        { label:"Half Day",      value:String(halfDay) },
        { label:"Leave",         value:String(leave) },
        { label:"Holiday",       value:String(holiday) },
        { label:"Day Off",       value:String(offDay) },
        { label:"Branch",        value:dBranch?(branches?.find(b=>String(b.id)===dBranch)?.name||"—"):"All Branches" },
      ],
      tableHtml: `<table><thead>${thead}</thead><tbody>${tbody}</tbody></table>`,
    });
  };

  const handleExportExcel = () => {
    if (!filtered.length) {
      alert("No records found for selected filters. Nothing to export.");
      return;
    }
    const singleEmp = new Set(filtered.map((r: any) => r.employeeId)).size === 1;
    const firstRule = singleEmp ? clientFindRule(hrRules, filtered[0]?.department ?? "", filtered[0]?.shiftName ?? null) : null;
    const isNightWatcher = singleEmp && (
      !!firstRule?.nightWatcherPayroll ||
      /night\s*watcher/i.test(String(filtered[0]?.shiftName || "")) ||
      /night\s*watcher/i.test(String(filtered[0]?.designation || ""))
    );
    if (singleEmp && isNightWatcher) {
      const rows = buildNightWatcherPolicyRows().map((r) => {
        // Force Excel to keep date text format and avoid "#####".
        const copied = [...r];
        copied[0] = `'${String(copied[0])}`;
        return copied;
      });
      exportCsv(NIGHT_WATCHER_POLICY_HEADERS, rows, `attendance-policy-${dStart}-${dEnd}.csv`);
      return;
    }
    const rows = filtered.map((r: any) => {
      const statusLabel = r.status==="late"?"PRESENT (LATE)":r.status==="half_day"?"HALF DAY":r.status==="off_day"?"DAY OFF":r.status.replace("_"," ").toUpperCase();
      if (isNightShiftView) {
        const rp: string[] = r.rawPunches ?? [];
        const punchCols = Array.from({length:13}, (_,i) => rp[i] || "");
        return [
          `'${r.date}`, r.morningDate||"", r.employeeCode, r.employeeName, r.department||"", r.branchName,
          r.shiftName||"", statusLabel,
          ...punchCols,
          r.totalHours!=null?fmtTotal(r.totalHours):"",
          r.overtimeHours>0?r.overtimeHours.toFixed(1):"",
          getRemarks(r),
        ];
      }
      const s1m = calcMins(r.inTime1, r.outTime1, r.isNightShift);
      const s2m = calcMins(r.inTime2, r.outTime2, r.isNightShift);
      const lb = lunchBreakMins(r);
      const morningLate = r.morningLateMinutes || 0;
      const lunchLate = r.lunchLateMinutes || 0;
      const totalLateMin = morningLate + lunchLate;
      const lateStr = (() => {
        if (totalLateMin <= 0) return "";
        const h = Math.floor(totalLateMin / 60), m = totalLateMin % 60;
        const hrsStr = `${h}.${String(m).padStart(2, "0")} hr`;
        const tag = (morningLate > 0 && lunchLate > 0) ? " (AM+Lunch)"
          : lunchLate > 0 ? " (Lunch)" : "";
        return totalLateMin < 60
          ? `${totalLateMin} min${tag}`
          : `${totalLateMin} min / ${hrsStr}${tag}`;
      })();
      return [
        r.date, r.employeeCode, r.employeeName, r.department||"", r.branchName,
        r.shiftName||"", statusLabel,
        r.inTime1||"", r.outTime1||"", r.inTime2||"", r.outTime2||"",
        lb>0?fmtHM(lb):"",
        r.totalHours!=null?fmtTotal(r.totalHours):"",
        lateStr,
        r.overtimeHours>0?r.overtimeHours.toFixed(1):"",
        getRemarks(r),
      ];
    });
    exportCsv(HEADERS, rows, `attendance-report-${dStart}-${dEnd}.csv`);
  };

  const _attMonth = startDate ? new Date(startDate + "T00:00:00").getMonth()+1 : new Date().getMonth()+1;
  const _attYear  = startDate ? new Date(startDate + "T00:00:00").getFullYear() : new Date().getFullYear();

  return (
    <div className="space-y-4">
      <SeasonBadge month={_attMonth} year={_attYear} />
      <FilterCard title="Attendance Report Filters" onExport={handleExport} onExportExcel={handleExportExcel}>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-1.5">
          <div><Label className="text-xs">Start Date</Label>
            <Input type="date" value={startDate} onChange={e=>{ if (e.target.value) setStartDate(e.target.value); }}/></div>
          <div><Label className="text-xs">End Date</Label>
            <Input type="date" value={endDate} onChange={e=>{ if (e.target.value) setEndDate(e.target.value); }}/></div>
          <div><Label className="text-xs">Branch</Label>
            <Select value={branchId} onChange={e=>setBranchId(e.target.value)}>
              <option value="">All Branches</option>
              {branches?.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
            </Select></div>
          <div><Label className="text-xs">Status</Label>
            <Select value={status} onChange={e=>setStatus(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="present">Present</option><option value="absent">Absent</option>
              <option value="late">Late</option><option value="half_day">Half Day</option>
              <option value="leave">Leave</option><option value="holiday">Holiday</option>
              <option value="off_day">Day Off</option>
            </Select></div>
          <div><Label className="text-xs">Department</Label>
            <Select value={department} onChange={e=>setDepartment(e.target.value)}>
              <option value="">All Departments</option>
              {departments.map(d=><option key={d} value={d}>{d}</option>)}
            </Select></div>
          <div><Label className="text-xs">Shift</Label>
            <Select value={shiftId} onChange={e=>setShiftId(e.target.value)}>
              <option value="">All Shifts</option>
              {shiftOptions?.filter((s:any)=>s.isActive!==false).map((s:any)=><option key={s.id} value={s.id}>{s.name}</option>)}
            </Select></div>
          <div><Label className="text-xs">Employee Name</Label>
            <Input placeholder="Search name…" value={empName} onChange={e=>setEmpName(e.target.value)}/></div>
        </div>
      </FilterCard>

      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
          {[
            {label:"Present",  val:filtered.filter((r:any)=>r.status==="present"||r.status==="late").length,  cls:"text-green-600"},
            {label:"Absent",   val:filtered.filter((r:any)=>r.status==="absent").length,   cls:"text-red-600"},
            {label:"Late",     val:filtered.filter((r:any)=>r.status==="late").length,     cls:"text-amber-600"},
            {label:"Half Day", val:filtered.filter((r:any)=>r.status==="half_day").length, cls:"text-yellow-600"},
            {label:"Leave",    val:filtered.filter((r:any)=>r.status==="leave").length,    cls:"text-purple-600"},
            {label:"Holiday",  val:filtered.filter((r:any)=>r.status==="holiday").length,  cls:"text-gray-600"},
            {label:"Day Off",  val:filtered.filter((r:any)=>r.status==="off_day").length,  cls:"text-violet-600"},
          ].map(({label,val,cls})=>(
            <Card key={label} className="p-3 text-center">
              <div className={cn("text-2xl font-bold",cls)}>{val}</div>
              <div className="text-xs text-muted-foreground mt-1">{label}</div>
            </Card>
          ))}
        </div>
      )}

      {isNightShiftView && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-medium">
          <span className="text-base">🌙</span>
          Night Shift View — punches from the shift date (evening) and next calendar day (morning) are merged into one row. Showing 13 punch columns (P1–P13) for hourly punches; Lunch Break column hidden.
        </div>
      )}

      <Card className="overflow-hidden">
        {isLoading ? <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div> : (
          <div className="overflow-x-auto">
            {isNightShiftView ? (
              /* ── Night-shift 12-punch table ── */
              <table className="w-full table-fixed text-xs">
                <colgroup>
                  <col style={{width:"82px"}}/>
                  <col style={{width:"78px"}}/>
                  <col style={{width:"80px"}}/>
                  <col style={{width:"140px"}}/>
                  <col style={{width:"80px"}}/>
                  <col style={{width:"95px"}}/>
                  <col style={{width:"90px"}}/>
                  <col style={{width:"88px"}}/>
                  {Array.from({length:13}).map((_,i)=><col key={i} style={{width:"52px"}}/>)}
                  <col style={{width:"70px"}}/>
                  <col style={{width:"58px"}}/>
                  <col/>
                </colgroup>
                <thead className="bg-indigo-900/90 text-white">
                  <tr>
                    {["Shift Date","Next Day","Emp ID","Employee","Dept","Branch","Shift","Status"].map(h=>(
                      <th key={h} className="px-2 py-2.5 text-left font-semibold whitespace-nowrap overflow-hidden" rowSpan={2}>{h}</th>
                    ))}
                    <th className="px-2 py-1.5 text-center font-semibold whitespace-nowrap bg-indigo-700/60 text-[10px]" colSpan={6}>Evening Punches (P1–P6)</th>
                    <th className="px-2 py-1.5 text-center font-semibold whitespace-nowrap bg-violet-700/60 text-[10px]" colSpan={7}>Morning Punches (P7–P13)</th>
                    <th className="px-2 py-2.5 text-left font-semibold whitespace-nowrap bg-green-800/50 text-[10px]" rowSpan={2}>Total</th>
                    <th className="px-2 py-2.5 text-left font-semibold whitespace-nowrap text-[10px]" rowSpan={2}>OT</th>
                    {/* Remarks column hidden — re-enable later */}
                  </tr>
                  <tr className="border-b border-indigo-600">
                    {[1,2,3,4,5,6].map(n=>(
                      <th key={n} className="px-1 py-1 text-[9px] font-medium bg-indigo-700/40 text-center">P{n}</th>
                    ))}
                    {[7,8,9,10,11,12,13].map(n=>(
                      <th key={n} className="px-1 py-1 text-[9px] font-medium bg-violet-700/40 text-center">P{n}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.slice(0,300).map((r:any)=>{
                    // Use rawPunches from API; fall back to the 4 stored fields if empty
                    const sourcePunches: string[] =
                      (r.rawPunches && r.rawPunches.length > 0)
                        ? r.rawPunches
                        : [r.inTime1, r.outTime1, r.inTime2, r.outTime2].filter(Boolean);
                    const punches: (string|null)[] = Array.from({length:13}, (_,i) =>
                      sourcePunches[i] ?? null
                    );
                    const totalHrs = r.totalHours ?? 0;
                    const totalH = Math.floor(totalHrs), totalMin = Math.round((totalHrs - totalH) * 60);
                    return (
                    <tr key={r.id > 0 ? r.id : `synth-${r.employeeId}-${r.date}`} className="hover:bg-indigo-50/30 transition-colors align-middle">
                      <td className="px-2 py-2 whitespace-nowrap">
                        <div className="font-mono text-xs">{r.date}</div>
                        {r.isNightShiftMerged && (
                          <div className="text-[9px] text-indigo-400 font-medium">🌙 overnight</div>
                        )}
                      </td>
                      <td className="px-2 py-2 font-mono text-[10px] whitespace-nowrap text-indigo-500">
                        {r.morningDate || "—"}
                      </td>
                      <td className="px-2 py-2 font-mono whitespace-nowrap text-muted-foreground text-[10px]">{r.employeeCode}</td>
                      <td className="px-2 py-2 font-medium truncate text-[11px]" title={r.employeeName}>{r.employeeName}</td>
                      <td className="px-2 py-2 text-muted-foreground truncate text-[10px]">{r.department||"—"}</td>
                      <td className="px-2 py-2 text-muted-foreground truncate text-[10px]">{r.branchName}</td>
                      <td className="px-2 py-2">
                        <div className="font-medium text-indigo-700 text-[10px] truncate">{empShiftNameMap[Number(r.employeeId)]||"—"}</div>
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap">
                        <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium",STATUS_COLORS[r.status]||"bg-gray-100")}>
                          {fmtStatus(r.status)}
                        </span>
                      </td>
                      {/* P1–P13 punch columns */}
                      {punches.map((pt, idx) => {
                        const isEvening = idx < 6;
                        return (
                          <td key={idx} className={cn(
                            "px-1 py-2 font-mono text-[10px] text-center whitespace-nowrap",
                            isEvening ? "bg-indigo-50/30 text-indigo-700" : "bg-violet-50/30 text-violet-700"
                          )}>
                            {pt ?? <span className="text-muted-foreground/40">—</span>}
                          </td>
                        );
                      })}
                      <td className="px-2 py-2 whitespace-nowrap bg-green-50/20">
                        {totalHrs > 0 ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-green-700 text-[10px]">✅ {totalH}:{String(totalMin).padStart(2,"0")}</span>
                            {r.holidayType && (
                              <span className={`text-[9px] font-semibold ${
                                r.holidayType==="statutory" ? "text-red-600"
                                  : r.holidayType==="poya" ? "text-amber-600"
                                  : "text-blue-600"}`}>
                                ×{Number(r.holidayMultiplier).toFixed(1)}
                              </span>
                            )}
                          </div>
                        ) : <span className="text-muted-foreground/50">—</span>}
                      </td>
                      <td className="px-2 py-2 font-mono whitespace-nowrap text-[10px]">
                        {r.overtimeHours>0?`${r.overtimeHours.toFixed(1)}h`:"—"}
                        {r.holidayWorked && r.overtimeHours>0 && (
                          <span className="ml-0.5 text-[9px] text-orange-600 font-semibold">×{Number(r.holidayMultiplier).toFixed(1)}</span>
                        )}
                      </td>
                      {/* Remarks cell hidden — re-enable later */}
                    </tr>
                    );
                  })}
                  {!filtered.length && <tr><td colSpan={23} className="text-center py-8 text-muted-foreground">No records found for the selected filters.</td></tr>}
                </tbody>
              </table>
            ) : (
              /* ── Standard day-shift table ── */
              <table className="w-full table-fixed text-xs">
                <colgroup>
                  <col style={{width:"82px"}}/>
                  <col style={{width:"100px"}}/>
                  <col style={{width:"155px"}}/>
                  <col style={{width:"120px"}}/>
                  <col style={{width:"130px"}}/>
                  <col style={{width:"120px"}}/>
                  <col style={{width:"110px"}}/>
                  <col style={{width:"52px"}}/>
                  <col style={{width:"85px"}}/>
                  <col style={{width:"78px"}}/>
                  <col style={{width:"52px"}}/>
                  <col style={{width:"85px"}}/>
                  <col style={{width:"175px"}}/>
                  <col style={{width:"60px"}}/>
                  <col/>
                </colgroup>
                <thead className="bg-muted/50">
                  <tr>
                    {["Date","Emp ID","Employee","Department","Branch","Shift","Status"].map(h=>(
                      <th key={h} className="px-3 py-2.5 text-left font-semibold text-muted-foreground whitespace-nowrap overflow-hidden" rowSpan={2}>{h}</th>
                    ))}
                    <th className="px-3 py-2 text-center font-semibold text-blue-600 whitespace-nowrap bg-blue-50/50" colSpan={2}>1st Session</th>
                    <th className="px-3 py-2 text-center font-semibold text-purple-600 whitespace-nowrap bg-purple-50/50" rowSpan={2}>Lunch Break</th>
                    <th className="px-3 py-2 text-center font-semibold text-orange-600 whitespace-nowrap bg-orange-50/50" colSpan={2}>2nd Session</th>
                    <th className="px-3 py-2.5 text-left font-semibold text-green-700 whitespace-nowrap bg-green-50/40" rowSpan={2}>Total Hrs</th>
                    <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground whitespace-nowrap" rowSpan={2}>OT Hrs</th>
                    {/* Remarks column hidden — re-enable later */}
                  </tr>
                  <tr className="border-b border-border">
                    <th className="px-3 py-1 text-[10px] font-medium text-blue-500 bg-blue-50/30 text-center">In</th>
                    <th className="px-3 py-1 text-[10px] font-medium text-blue-500 bg-blue-50/30 text-center">Out</th>
                    <th className="px-3 py-1 text-[10px] font-medium text-orange-500 bg-orange-50/30 text-center">In</th>
                    <th className="px-3 py-1 text-[10px] font-medium text-orange-500 bg-orange-50/30 text-center">Out</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.slice(0,300).map((r:any)=>{
                    const s1m = calcMins(r.inTime1, r.outTime1, r.isNightShift);
                    const s2m = calcMins(r.inTime2, r.outTime2, r.isNightShift);
                    const lb  = lunchBreakMins(r);
                    const totalMins = s1m + s2m;
                    const totalH = Math.floor(totalMins/60), totalMin = totalMins%60;
                    const has1 = !!(r.inTime1 && r.outTime1);
                    const has2 = !!(r.inTime2 && r.outTime2);
                    const onlyIn = !!(r.inTime1 && !r.outTime1 && !r.inTime2 && !r.outTime2);
                    return (
                    <tr key={r.id > 0 ? r.id : `synth-${r.employeeId}-${r.date}`} className="hover:bg-muted/30 transition-colors align-top">
                      <td className="px-3 py-2 font-mono whitespace-nowrap">{r.date}</td>
                      <td className="px-3 py-2 font-mono whitespace-nowrap text-muted-foreground">{r.employeeCode}</td>
                      <td className="px-3 py-2 font-medium truncate" title={r.employeeName}>{r.employeeName}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-muted-foreground truncate">{r.department||"—"}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-muted-foreground truncate">{r.branchName}</td>
                      <td className="px-3 py-2">
                        <div className="font-medium text-slate-700 text-[10px] truncate">{empShiftNameMap[Number(r.employeeId)]||"—"}</div>
                        {/* shiftTime hidden — re-enable later */}
                        {r.isNightShift && <span className="text-[10px] text-indigo-500 font-semibold">🌙</span>}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          <span className={cn("px-2 py-0.5 rounded text-xs font-medium",STATUS_COLORS[r.status]||"bg-gray-100")}>
                            {fmtStatus(r.status)}
                          </span>
                          {r.status === "late" && (() => {
                            const lm = (r as any).morningLateMinutes > 0
                              ? (r as any).morningLateMinutes
                              : calcLateMinutes(r.inTime1);
                            if (lm <= 0) return null;
                            const display = lm >= 60
                              ? `+${Math.floor(lm/60)}h ${lm%60}m late`
                              : `+${lm}m late`;
                            return <span className="text-[10px] font-semibold text-red-500 text-center">{display}</span>;
                          })()}
                        </div>
                      </td>
                      <td className="px-3 py-2 font-mono whitespace-nowrap text-blue-700 bg-blue-50/20 text-center">
                        {r.inTime1||"—"}
                      </td>
                      <td className="px-3 py-2 bg-blue-50/20 whitespace-nowrap text-center">
                        {has1 ? (
                          <div>
                            <div className="font-mono text-blue-700">{r.outTime1}</div>
                            <div className="text-[10px] text-blue-500 font-medium">{fmtHM(s1m)}</div>
                          </div>
                        ) : onlyIn ? (
                          <span className="text-red-500 text-[10px] font-semibold">Missing</span>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap bg-purple-50/20 text-center">
                        {lb > 0 ? (
                          <span className="font-mono text-purple-700 font-medium">{fmtHM(lb)}</span>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-3 py-2 font-mono whitespace-nowrap text-orange-700 bg-orange-50/20 text-center">
                        {r.inTime2||"—"}
                      </td>
                      <td className="px-3 py-2 bg-orange-50/20 whitespace-nowrap text-center">
                        {has2 ? (
                          <div>
                            <div className="font-mono text-orange-700">{r.outTime2}</div>
                            <div className="text-[10px] text-orange-500 font-medium">{fmtHM(s2m)}</div>
                          </div>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap bg-green-50/20">
                        {totalMins > 0 ? (
                          <div className="flex flex-col gap-0.5">
                            {has1 && <div className="text-[10px] text-muted-foreground font-mono">{r.inTime1} → {r.outTime1} = {fmtHM(s1m)}</div>}
                            {has2 && <div className="text-[10px] text-muted-foreground font-mono">{r.inTime2} → {r.outTime2} = {fmtHM(s2m)}</div>}
                            <span className="font-semibold text-green-700 text-xs">✅ {totalH}:{String(totalMin).padStart(2,"0")} hrs</span>
                            {r.weekOffWorked && (
                              <span className="text-violet-600 text-[10px] font-semibold">(Week Off Worked)</span>
                            )}
                            {r.holidayType && (
                              <span className={`text-[10px] font-semibold ${
                                r.holidayType==="statutory" ? "text-red-600"
                                  : r.holidayType==="poya" ? "text-amber-600"
                                  : "text-blue-600"}`}>
                                {r.holidayType==="statutory"?"Statutory":r.holidayType==="poya"?"Poya":"Public"} Holiday × {Number(r.holidayMultiplier).toFixed(1)}
                              </span>
                            )}
                          </div>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-3 py-2 font-mono whitespace-nowrap">
                        {r.overtimeHours>0?`${r.overtimeHours.toFixed(1)}h`:"—"}
                        {r.holidayWorked && r.overtimeHours>0 && (
                          <span className="ml-1 text-[10px] text-orange-600 font-semibold">×{Number(r.holidayMultiplier).toFixed(1)}</span>
                        )}
                      </td>
                      {/* Remarks cell hidden — re-enable later */}
                    </tr>
                    );
                  })}
                  {!filtered.length&&<tr><td colSpan={11} className="text-center py-8 text-muted-foreground">No records found for the selected filters.</td></tr>}
                </tbody>
              </table>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MONTHLY REPORT
══════════════════════════════════════════════════════════ */
function MonthlyReport({ initialEmpName="", initialMonth, initialYear }: { initialEmpName?: string; initialMonth?: number; initialYear?: number }) {
  const now = new Date();
  const [month, setMonth]           = useState(initialMonth ?? now.getMonth()+1);
  const [year, setYear]             = useState(initialYear  ?? now.getFullYear());
  const [branchId, setBranchId]     = useState("");
  const [empType, setEmpType]       = useState("");
  const [department, setDepartment] = useState("");
  const [empName, setEmpName]       = useState(initialEmpName);

  const { rules: hrRules } = useHrRules();
  function getEmpRemarks(e: any): string {
    const rule = clientFindRule(hrRules, e.department ?? "", e.shiftName ?? null);
    return rule?.remarks ?? "";
  }

  const dMonth  = useDebounce(month, 200);
  const dYear   = useDebounce(year, 200);
  const dBranch = useDebounce(branchId, 200);

  const { data: branches } = useListBranches();
  const { data, isLoading } = useGetMonthlyReport({
    month: dMonth, year: dYear,
    ...(dBranch ? { branchId: Number(dBranch) } : {}),
  });

  const departments = useMemo(() => {
    const set = new Set((data?.employees || []).map((e: any) => e.department).filter(Boolean));
    return Array.from(set).sort() as string[];
  }, [data]);

  const filtered = useMemo(() => (data?.employees || []).filter((e: any) =>
    (!empType || e.employeeType === empType)
    && (!department || e.department === department)
    && (!empName || (e.employeeName || "").toLowerCase().includes(empName.toLowerCase()) || String(e.employeeId || "").toLowerCase().includes(empName.toLowerCase()))
  ), [data, empType, department, empName]);

  const HEADERS = ["Emp ID","Employee","Department","Branch","Designation","Type","Present","Absent","Late (AM)","Lunch Late Days","Half Day","Leave","Holiday","Hol.Worked","Day Off","Work Hrs","OT Hrs","Reg OT","Holiday OT","Late (AM) Min","Lunch Late Min","Att %","Remarks"];

  const handleExport = async () => {
    const thead = `<tr>${HEADERS.map(h=>`<th>${h}</th>`).join("")}</tr>`;
    const tbody = filtered.map((e: any) => `<tr>
      <td>${e.employeeCode}</td><td>${e.employeeName}</td><td>${e.department||""}</td>
      <td>${e.branchName}</td><td>${e.designation}</td><td>${e.employeeType||""}</td>
      <td>${e.presentDays}</td><td>${e.absentDays}</td><td>${e.lateDays}</td>
      <td>${e.lunchLateDays||0}</td><td>${e.halfDays}</td><td>${e.leaveDays}</td>
      <td>${e.holidayDays}</td><td>${e.holidayWorkedDays||0}</td><td>${e.offDays||0}</td>
      <td>${e.totalWorkHours.toFixed(1)}h</td><td>${e.overtimeHours.toFixed(1)}h</td>
      <td>${(e.regularOtHours||0).toFixed(1)}h</td><td>${(e.holidayOtHours||0).toFixed(1)}h</td>
      <td>${e.totalMorningLateMinutes||0} min</td><td>${e.totalLunchLateMinutes||0} min</td>
      <td>${e.attendancePercentage}%</td>
      <td>${getEmpRemarks(e)||"—"}</td>
    </tr>`).join("");
    await printReport({
      title: "Monthly Attendance Report",
      meta: [
        { label:"Period",        value:`${getMonthName(dMonth)} ${dYear}` },
        { label:"Working Days",  value:String(data?.workingDays??"—") },
        { label:"Total Employees", value:String(filtered.length) },
        { label:"Branch",        value:dBranch?(branches?.find(b=>String(b.id)===dBranch)?.name||"—"):"All Branches" },
      ],
      tableHtml: `<table><thead>${thead}</thead><tbody>${tbody}</tbody></table>`,
    });
  };

  const handleExportExcel = () => {
    const rows = filtered.map((e: any) => [
      e.employeeCode, e.employeeName, e.department||"", e.branchName, e.designation, e.employeeType||"",
      e.presentDays, e.absentDays, e.lateDays, e.lunchLateDays||0, e.halfDays, e.leaveDays,
      e.holidayDays, e.holidayWorkedDays||0, e.offDays||0,
      e.totalWorkHours.toFixed(1), e.overtimeHours.toFixed(1),
      (e.regularOtHours||0).toFixed(1), (e.holidayOtHours||0).toFixed(1),
      e.totalMorningLateMinutes||0, e.totalLunchLateMinutes||0,
      `${e.attendancePercentage}%`,
      getEmpRemarks(e),
    ]);
    exportCsv(HEADERS, rows, `monthly-report-${getMonthName(dMonth)}-${dYear}.csv`);
  };

  return (
    <div className="space-y-4">
      <SeasonBadge month={month} year={year} />
      <FilterCard title="Monthly Report Filters" onExport={handleExport} onExportExcel={handleExportExcel}>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div><Label className="text-xs">Month</Label>
            <Select value={month} onChange={e=>setMonth(Number(e.target.value))}>
              {Array.from({length:12},(_,i)=><option key={i+1} value={i+1}>{getMonthName(i+1)}</option>)}
            </Select></div>
          <div><Label className="text-xs">Year</Label>
            <Select value={year} onChange={e=>setYear(Number(e.target.value))}>
              {[2024,2025,2026,2027].map(y=><option key={y} value={y}>{y}</option>)}
            </Select></div>
          <div><Label className="text-xs">Branch</Label>
            <Select value={branchId} onChange={e=>setBranchId(e.target.value)}>
              <option value="">All Branches</option>
              {branches?.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
            </Select></div>
          <div><Label className="text-xs">Employee Type</Label>
            <Select value={empType} onChange={e=>setEmpType(e.target.value)}>
              <option value="">All Types</option>
              <option value="permanent">Permanent</option><option value="contract">Contract</option>
              <option value="casual">Casual</option>
            </Select></div>
          <div><Label className="text-xs">Department</Label>
            <Select value={department} onChange={e=>setDepartment(e.target.value)}>
              <option value="">All Departments</option>
              {departments.map(d=><option key={d} value={d}>{d}</option>)}
            </Select></div>
          <div><Label className="text-xs">Employee Name</Label>
            <Input placeholder="Search name…" value={empName} onChange={e=>setEmpName(e.target.value)}/></div>
        </div>
      </FilterCard>

      {data && (
        <Card className="p-3 flex flex-wrap gap-6 text-sm border-green-200 bg-green-50/30">
          <div><span className="text-muted-foreground">Period: </span><strong>{getMonthName(data.month)} {data.year}</strong></div>
          <div><span className="text-muted-foreground">Showing: </span><strong>{filtered.length} of {data.totalEmployees} Employees</strong></div>
          <div><span className="text-muted-foreground">Working Days: </span><strong>{data.workingDays}</strong></div>
        </Card>
      )}

      <Card className="overflow-hidden">
        {isLoading ? <div className="p-8 text-center text-sm text-muted-foreground">Generating report…</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr>
                  {["Emp ID","Employee","Department","Branch","Designation","Type"].map(h=><th key={h} className="px-3 py-2.5 text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>)}
                  {["Present","Absent","Late (AM)","Lunch Late","Half Day","Leave"].map(h=><th key={h} className="px-3 py-2.5 text-center font-semibold text-muted-foreground whitespace-nowrap">{h}</th>)}
                  <th className="px-3 py-2.5 text-center font-semibold text-gray-600 whitespace-nowrap bg-gray-50/50">Holiday</th>
                  <th className="px-3 py-2.5 text-center font-semibold text-orange-600 whitespace-nowrap bg-orange-50/50" title="Days employee worked on a public holiday">Hol. Worked</th>
                  <th className="px-3 py-2.5 text-center font-semibold text-violet-600 whitespace-nowrap">Day Off</th>
                  <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground whitespace-nowrap">Work Hrs</th>
                  <th className="px-3 py-2.5 text-center font-semibold text-amber-600 whitespace-nowrap">OT Hrs</th>
                  <th className="px-3 py-2.5 text-center font-semibold text-amber-500 whitespace-nowrap bg-amber-50/30">Reg OT</th>
                  <th className="px-3 py-2.5 text-center font-semibold text-red-600 whitespace-nowrap bg-red-50/40" title="Overtime earned by working on public holidays">Holiday OT</th>
                  <th className="px-3 py-2.5 text-center font-semibold text-red-500 whitespace-nowrap">Late (AM) Min</th>
                  <th className="px-3 py-2.5 text-center font-semibold text-orange-500 whitespace-nowrap">Lunch Late Min</th>
                  <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground whitespace-nowrap">Att %</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-indigo-600 whitespace-nowrap bg-indigo-50/30">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((e:any)=>(
                  <tr key={e.employeeId} className="hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-2 font-mono whitespace-nowrap text-muted-foreground">{e.employeeCode}</td>
                    <td className="px-3 py-2 font-medium whitespace-nowrap">{e.employeeName}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{e.department||"—"}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{e.branchName}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{e.designation}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {e.employeeType?<span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium capitalize",
                        e.employeeType==="permanent"?"bg-blue-100 text-blue-700":e.employeeType==="contract"?"bg-purple-100 text-purple-700":"bg-orange-100 text-orange-700"
                      )}>{e.employeeType}</span>:"—"}
                    </td>
                    <td className="px-3 py-2 text-center whitespace-nowrap text-green-600 font-semibold">{e.presentDays}</td>
                    <td className="px-3 py-2 text-center whitespace-nowrap text-red-600 font-semibold">{e.absentDays}</td>
                    <td className="px-3 py-2 text-center whitespace-nowrap text-amber-600 font-semibold">{e.lateDays}</td>
                    <td className="px-3 py-2 text-center whitespace-nowrap text-orange-500 font-semibold">{e.lunchLateDays||0}</td>
                    <td className="px-3 py-2 text-center whitespace-nowrap text-yellow-600 font-semibold">{e.halfDays}</td>
                    <td className="px-3 py-2 text-center whitespace-nowrap text-purple-600 font-semibold">{e.leaveDays}</td>
                    <td className="px-3 py-2 text-center whitespace-nowrap text-gray-600 font-semibold">{e.holidayDays}</td>
                    <td className="px-3 py-2 text-center whitespace-nowrap bg-orange-50/30">
                      {(e.holidayWorkedDays||0) > 0
                        ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-bold">{e.holidayWorkedDays}</span>
                        : <span className="text-muted-foreground text-xs">—</span>}
                    </td>
                    <td className="px-3 py-2 text-center whitespace-nowrap text-violet-600 font-semibold">{e.offDays||0}</td>
                    <td className="px-3 py-2 text-center font-mono whitespace-nowrap">{e.totalWorkHours.toFixed(1)}h</td>
                    <td className="px-3 py-2 text-center font-mono whitespace-nowrap text-amber-600 font-semibold">{e.overtimeHours.toFixed(1)}h</td>
                    <td className="px-3 py-2 text-center font-mono whitespace-nowrap text-amber-500 bg-amber-50/20">{(e.regularOtHours||0).toFixed(1)}h</td>
                    <td className="px-3 py-2 text-center whitespace-nowrap bg-red-50/30">
                      {(e.holidayOtHours||0) > 0
                        ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-bold">{(e.holidayOtHours||0).toFixed(1)}h</span>
                        : <span className="text-muted-foreground text-xs">—</span>}
                    </td>
                    <td className="px-3 py-2 text-center font-mono whitespace-nowrap text-red-500">{e.totalMorningLateMinutes||0}m</td>
                    <td className="px-3 py-2 text-center font-mono whitespace-nowrap text-orange-500">{e.totalLunchLateMinutes||0}m</td>
                    <td className="px-3 py-2 text-center whitespace-nowrap">
                      <span className={cn("px-2 py-0.5 rounded text-xs font-bold",
                        e.attendancePercentage>=90?"bg-green-100 text-green-700":e.attendancePercentage>=75?"bg-yellow-100 text-yellow-700":"bg-red-100 text-red-700"
                      )}>{e.attendancePercentage}%</span>
                    </td>
                    <td className="px-3 py-2 bg-indigo-50/10 max-w-[200px]">
                      {(() => {
                        const rm = getEmpRemarks(e);
                        return rm ? (
                          <span className="text-[10px] leading-snug text-indigo-700 block" title={rm}>{rm}</span>
                        ) : <span className="text-muted-foreground text-[10px]">—</span>;
                      })()}
                    </td>
                  </tr>
                ))}
                {!filtered.length&&<tr><td colSpan={23} className="text-center py-8 text-muted-foreground">No data available for the selected period.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   OVERTIME REPORT
══════════════════════════════════════════════════════════ */
const OT_DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function OvertimeReport({ initialEmpName="", initialMonth, initialYear }: { initialEmpName?: string; initialMonth?: number; initialYear?: number }) {
  const now = new Date();
  const defStart = (initialMonth && initialYear)
    ? `${initialYear}-${String(initialMonth).padStart(2,"0")}-01`
    : new Date(now.getFullYear(),now.getMonth(),1).toISOString().split("T")[0];
  const defEnd = (initialMonth && initialYear)
    ? new Date(initialYear, initialMonth, 0).toISOString().split("T")[0]
    : now.toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(defStart);
  const [endDate, setEndDate]     = useState(defEnd);
  const [branchId, setBranchId]   = useState("");
  const [empType, setEmpType]     = useState("");
  const [empName, setEmpName]     = useState(initialEmpName);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const dStart  = useDebounce(startDate, 400);
  const dEnd    = useDebounce(endDate, 400);
  const dBranch = useDebounce(branchId, 200);

  const { data: branches } = useListBranches();
  const { data, isLoading } = useGetOvertimeReport({
    startDate: dStart, endDate: dEnd,
    ...(dBranch ? { branchId: Number(dBranch) } : {}),
  });

  const filtered = useMemo(() => (data?.employees || []).filter((e: any) =>
    (!empType || e.employeeType === empType)
    && (!empName || (e.employeeName || "").toLowerCase().includes(empName.toLowerCase()) || String(e.employeeId || "").toLowerCase().includes(empName.toLowerCase()))
  ), [data, empType, empName]);

  const totalOT = filtered.reduce((s: number, e: any) => s + e.totalOvertimeHours, 0);
  const totalHolOT = filtered.reduce((s: number, e: any) => s + (e.holidayOtHours||0), 0);

  const toggleExpand = (id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const HEADERS = ["Emp ID","Employee","Branch","Designation","Type","OT Days","Total OT Hrs","Regular OT","Holiday OT Days","Holiday OT Hrs","Daily Breakdown"];

  const handleExport = async () => {
    const thead = `<tr>${HEADERS.map(h=>`<th>${h}</th>`).join("")}</tr>`;
    const tbody = filtered.map((e: any) => `<tr>
      <td>${e.employeeCode}</td><td>${e.employeeName}</td><td>${e.branchName}</td>
      <td>${e.designation}</td><td>${e.employeeType||""}</td>
      <td>${e.overtimeDays}</td><td>${e.totalOvertimeHours.toFixed(1)}h</td>
      <td>${(e.regularOtHours||0).toFixed(1)}h</td>
      <td>${e.holidayOtDays||0}</td>
      <td>${(e.holidayOtHours||0).toFixed(1)}h</td>
      <td>${e.records.map((r:any)=>`${r.date}: ${r.overtimeHours.toFixed(1)}h${r.holidayName?" ["+r.holidayName+"]":""}`).join(" | ")}</td>
    </tr>`).join("");
    printReport({
      title: "Overtime Report",
      meta: [
        { label:"Period",              value:`${dStart} – ${dEnd}` },
        { label:"Total OT Hours",      value:`${totalOT.toFixed(1)}h` },
        { label:"Holiday OT Hours",    value:`${totalHolOT.toFixed(1)}h` },
        { label:"Employees with OT",   value:String(filtered.length) },
        { label:"Branch",              value:dBranch?(branches?.find(b=>String(b.id)===dBranch)?.name||"—"):"All Branches" },
      ],
      tableHtml: `<table><thead>${thead}</thead><tbody>${tbody}</tbody></table>`,
    });
  };

  const handleExportExcel = () => {
    const rows = filtered.map((e: any) => [
      e.employeeCode, e.employeeName, e.branchName, e.designation, e.employeeType||"",
      e.overtimeDays, e.totalOvertimeHours.toFixed(1),
      (e.regularOtHours||0).toFixed(1),
      e.holidayOtDays||0,
      (e.holidayOtHours||0).toFixed(1),
      e.records.map((r: any) => `${r.date}: ${r.overtimeHours.toFixed(1)}h${r.holidayName?" ["+r.holidayName+"]":""}`).join(" | "),
    ]);
    exportCsv(HEADERS, rows, `overtime-report-${dStart}-${dEnd}.csv`);
  };

  const _otMonth = startDate ? new Date(startDate + "T00:00:00").getMonth()+1 : new Date().getMonth()+1;
  const _otYear  = startDate ? new Date(startDate + "T00:00:00").getFullYear() : new Date().getFullYear();

  const COLS = 10;

  return (
    <div className="space-y-4">
      <SeasonBadge month={_otMonth} year={_otYear} />
      <FilterCard title="Overtime Report Filters" onExport={handleExport} onExportExcel={handleExportExcel}>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <div><Label className="text-xs">Start Date</Label>
            <Input type="date" value={startDate} onChange={e=>{ if (e.target.value) setStartDate(e.target.value); }}/></div>
          <div><Label className="text-xs">End Date</Label>
            <Input type="date" value={endDate} onChange={e=>{ if (e.target.value) setEndDate(e.target.value); }}/></div>
          <div><Label className="text-xs">Branch</Label>
            <Select value={branchId} onChange={e=>setBranchId(e.target.value)}>
              <option value="">All Branches</option>
              {branches?.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
            </Select></div>
          <div><Label className="text-xs">Employee Type</Label>
            <Select value={empType} onChange={e=>setEmpType(e.target.value)}>
              <option value="">All Types</option>
              <option value="permanent">Permanent</option><option value="contract">Contract</option>
              <option value="casual">Casual</option>
            </Select></div>
          <div><Label className="text-xs">Employee Name</Label>
            <Input placeholder="Search name…" value={empName} onChange={e=>setEmpName(e.target.value)}/></div>
        </div>
      </FilterCard>

      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label:"Total OT Hours",    val:`${totalOT.toFixed(1)}h`,                      cls:"text-amber-700",   bg:"bg-amber-50 border-amber-200" },
            { label:"Holiday OT Hours",  val:`${totalHolOT.toFixed(1)}h`,                   cls:"text-red-600",     bg:"bg-red-50 border-red-200" },
            { label:"Regular OT Hours",  val:`${(totalOT-totalHolOT).toFixed(1)}h`,          cls:"text-orange-600",  bg:"bg-orange-50 border-orange-200" },
            { label:"Employees with OT", val:String(filtered.length),                        cls:"text-blue-700",    bg:"bg-blue-50 border-blue-200" },
          ].map(({ label, val, cls, bg }) => (
            <Card key={label} className={`p-3 border ${bg}`}>
              <div className={`text-lg font-bold ${cls}`}>{val}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{label}</div>
            </Card>
          ))}
        </div>
      )}

      <Card className="overflow-hidden">
        {isLoading ? <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/60 border-b border-border">
                  <th className="px-3 py-2.5 w-8"></th>
                  {["Emp ID","Employee","Branch","Designation","Type"].map(h=>(
                    <th key={h} className="px-3 py-2.5 text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                  <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground whitespace-nowrap">OT Days</th>
                  <th className="px-3 py-2.5 text-center font-semibold text-amber-700 whitespace-nowrap">Total OT</th>
                  <th className="px-3 py-2.5 text-center font-semibold text-amber-500 whitespace-nowrap">Reg OT</th>
                  <th className="px-3 py-2.5 text-center font-semibold text-orange-600 whitespace-nowrap">Hol. Days</th>
                  <th className="px-3 py-2.5 text-center font-semibold text-red-600 whitespace-nowrap">Holiday OT</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e: any) => {
                  const isOpen = expandedIds.has(e.employeeId);
                  return (
                    <React.Fragment key={e.employeeId}>
                      <tr
                        key={e.employeeId}
                        onClick={() => toggleExpand(e.employeeId)}
                        className={cn(
                          "cursor-pointer border-b border-border transition-colors select-none",
                          isOpen ? "bg-amber-50/60" : "hover:bg-muted/30"
                        )}
                      >
                        <td className="px-3 py-2 text-muted-foreground">
                          <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", isOpen && "rotate-180")} />
                        </td>
                        <td className="px-3 py-2 font-mono whitespace-nowrap text-muted-foreground">{e.employeeCode}</td>
                        <td className="px-3 py-2 font-semibold whitespace-nowrap">{e.employeeName}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{e.branchName}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{e.designation}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {e.employeeType ? (
                            <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium capitalize",
                              e.employeeType==="permanent" ? "bg-blue-100 text-blue-700" :
                              e.employeeType==="contract"  ? "bg-purple-100 text-purple-700" :
                              "bg-orange-100 text-orange-700"
                            )}>{e.employeeType}</span>
                          ) : "—"}
                        </td>
                        <td className="px-3 py-2 text-center whitespace-nowrap font-semibold text-amber-600">{e.overtimeDays}</td>
                        <td className="px-3 py-2 text-center whitespace-nowrap font-bold text-amber-700">{e.totalOvertimeHours.toFixed(1)}h</td>
                        <td className="px-3 py-2 text-center whitespace-nowrap font-semibold text-amber-500">{(e.regularOtHours||0).toFixed(1)}h</td>
                        <td className="px-3 py-2 text-center whitespace-nowrap">
                          {(e.holidayOtDays||0) > 0
                            ? <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold">{e.holidayOtDays}</span>
                            : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-3 py-2 text-center whitespace-nowrap">
                          {(e.holidayOtHours||0) > 0
                            ? <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">{(e.holidayOtHours||0).toFixed(1)}h</span>
                            : <span className="text-muted-foreground">—</span>}
                        </td>
                      </tr>

                      {isOpen && (
                        <tr key={`${e.employeeId}-detail`} className="bg-amber-50/30">
                          <td colSpan={COLS + 1} className="px-0 py-0">
                            <div className="border-t border-amber-200 mx-4 my-3 rounded-lg overflow-hidden border border-amber-200 shadow-sm">
                              <div className="px-3 py-2 bg-amber-100/60 border-b border-amber-200 flex items-center justify-between">
                                <span className="text-xs font-semibold text-amber-900">Daily OT Breakdown — {e.employeeName}</span>
                                <span className="text-[10px] text-amber-700">{e.records.length} OT day{e.records.length !== 1 ? "s" : ""} · Total: {e.totalOvertimeHours.toFixed(1)}h</span>
                              </div>
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="bg-amber-50">
                                    <th className="px-3 py-1.5 text-left font-semibold text-muted-foreground w-8">#</th>
                                    <th className="px-3 py-1.5 text-left font-semibold text-muted-foreground">Date</th>
                                    <th className="px-3 py-1.5 text-left font-semibold text-muted-foreground">Day</th>
                                    <th className="px-3 py-1.5 text-center font-semibold text-orange-600">OT Hours</th>
                                    <th className="px-3 py-1.5 text-left font-semibold text-muted-foreground">Type</th>
                                    <th className="px-3 py-1.5 text-left font-semibold text-muted-foreground">Holiday / Remarks</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-amber-100">
                                  {e.records.map((r: any, idx: number) => {
                                    const dow = new Date(r.date + "T00:00:00Z").getUTCDay();
                                    const isHol = !!r.holidayType;
                                    const holColor =
                                      r.holidayType === "statutory" ? "bg-blue-100 text-blue-700" :
                                      r.holidayType === "poya"      ? "bg-purple-100 text-purple-700" :
                                      r.holidayType === "public"    ? "bg-amber-100 text-amber-700" : "";
                                    return (
                                      <tr key={r.date} className={cn("transition-colors", isHol ? "bg-blue-50/40" : "hover:bg-amber-50/50")}>
                                        <td className="px-3 py-1.5 text-muted-foreground font-mono">{idx + 1}</td>
                                        <td className="px-3 py-1.5 font-mono whitespace-nowrap">{r.date}</td>
                                        <td className="px-3 py-1.5 text-muted-foreground">{OT_DAY_NAMES[dow]}</td>
                                        <td className="px-3 py-1.5 text-center">
                                          <span className={cn("font-bold", isHol ? "text-blue-700" : "text-orange-600")}>{r.overtimeHours.toFixed(1)}h</span>
                                        </td>
                                        <td className="px-3 py-1.5">
                                          {isHol
                                            ? <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-semibold capitalize", holColor)}>{r.holidayType}</span>
                                            : <span className="text-muted-foreground text-[10px]">Regular</span>}
                                        </td>
                                        <td className="px-3 py-1.5 text-muted-foreground">
                                          {r.holidayName || "—"}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                                <tfoot>
                                  <tr className="bg-amber-100/60 border-t border-amber-200">
                                    <td colSpan={3} className="px-3 py-1.5 text-xs font-bold text-amber-900">TOTAL</td>
                                    <td className="px-3 py-1.5 text-center font-bold text-orange-600">{e.totalOvertimeHours.toFixed(1)}h</td>
                                    <td colSpan={2} className="px-3 py-1.5 text-[10px] text-muted-foreground">
                                      Reg: {(e.regularOtHours||0).toFixed(1)}h &nbsp;·&nbsp; Holiday: {(e.holidayOtHours||0).toFixed(1)}h
                                    </td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {!filtered.length && (
                  <tr><td colSpan={COLS + 1} className="text-center py-8 text-muted-foreground">No overtime records found for this period.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   PAYROLL REPORT
══════════════════════════════════════════════════════════ */
interface PayrollRecord {
  id:number; employeeId:number; month:number; year:number;
  workingDays:number; presentDays:number; absentDays:number; lateDays:number; halfDays:number;
  basicSalary:number; grossSalary:number; netSalary:number;
  epfEmployee:number; epfEmployer:number; etfEmployer:number; apit:number;
  lateDeduction:number; lunchLateDeduction:number; absenceDeduction:number;
  halfDayDeduction:number; incompleteDeduction:number; loanDeduction:number;
  totalDeductions:number; overtimePay:number; holidayOtPay:number; status:string;
  employee:{ id:number; employeeId:string; fullName:string; designation:string; department:string; employeeType?:string };
}

function useOffSeasonStatus(month: number, _year?: number) {
  const [settings, setSettings] = useState<{ enabled: boolean; months: number[] } | null>(null);
  useEffect(() => {
    const token = localStorage.getItem("auth_token") || "";
    fetch(apiUrl("/payroll-settings"), { credentials: "include", headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        let months: number[] = [5,6,7,8,9];
        if (Array.isArray(d.offSeasonMonths)) months = d.offSeasonMonths;
        else try { months = JSON.parse(d.offSeasonMonths ?? "[5,6,7,8,9]"); } catch {}
        setSettings({ enabled: d.offSeasonEnabled ?? false, months });
      })
      .catch(() => {});
  }, []);
  return useMemo(() => {
    if (!settings?.enabled) return false;
    return settings.months.includes(month);
  }, [settings, month]);
}

function SeasonBadge({ month, year }: { month: number; year?: number }) {
  const isOff = useOffSeasonStatus(month, year);
  const label = isOff ? "Off Season" : "Main Season";
  const cls   = isOff
    ? "bg-blue-50 border-blue-200 text-blue-800"
    : "bg-green-50 border-green-200 text-green-800";
  const icon  = isOff ? "⛅" : "🌿";
  return (
    <div className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm ${cls}`}>
      <span>{icon}</span>
      <span className="font-semibold">{label}</span>
      {isOff && <span className="text-xs opacity-75">— No OT, no late deductions, no incomplete hours deduction</span>}
    </div>
  );
}

function PayrollReport() {
  const now = new Date();
  const [month, setMonth]     = useState(now.getMonth()+1);
  const [year, setYear]       = useState(now.getFullYear());
  const [empType, setEmpType] = useState("");
  const [status, setStatus]   = useState("");
  const [empName, setEmpName] = useState("");
  const [data, setData]       = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const isOffSeason = useOffSeasonStatus(month, year);

  const dMonth = useDebounce(month, 300);
  const dYear  = useDebounce(year, 300);

  useEffect(() => {
    setLoading(true);
    const token = localStorage.getItem("auth_token") || "";
    fetch(apiUrl(`/payroll?month=${dMonth}&year=${dYear}`), {
      credentials: "include",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => setData(Array.isArray(d) ? d : []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [dMonth, dYear]);

  const filtered = useMemo(() => data.filter(r =>
    (!empType || r.employee.employeeType === empType)
    && (!status || r.status === status)
    && (!empName || (r.employee.fullName || "").toLowerCase().includes(empName.toLowerCase()) || String(r.employee.employeeId || "").toLowerCase().includes(empName.toLowerCase()))
  ), [data, empType, status, empName]);

  const totals = useMemo(() => ({
    gross:            filtered.reduce((s,r)=>s+r.grossSalary,0),
    net:              filtered.reduce((s,r)=>s+r.netSalary,0),
    epfEmployee:      filtered.reduce((s,r)=>s+r.epfEmployee,0),
    epfEmployer:      filtered.reduce((s,r)=>s+r.epfEmployer,0),
    etf:              filtered.reduce((s,r)=>s+r.etfEmployer,0),
    apit:             filtered.reduce((s,r)=>s+r.apit,0),
    ot:               filtered.reduce((s,r)=>s+(r.overtimePay||0)+(r.holidayOtPay||0),0),
    lateDed:          filtered.reduce((s,r)=>s+(r.lateDeduction||0)+(r.lunchLateDeduction||0),0),
    earlyExitDed:     filtered.reduce((s,r)=>s+(r.incompleteDeduction||0),0),
    absenceDed:       filtered.reduce((s,r)=>s+(r.absenceDeduction||0),0),
    halfDayDed:       filtered.reduce((s,r)=>s+(r.halfDayDeduction||0),0),
    loanDed:          filtered.reduce((s,r)=>s+(r.loanDeduction||0),0),
  }), [filtered]);

  const HEADERS = [
    "Emp ID","Employee","Designation","Department","Type",
    "Working Days","Present","Absent","Late Days","Half Days",
    "Basic Salary","OT / Holiday Pay","Gross Salary",
    "Late Deduction","Early Exit Deduction","Absence Deduction","Half Day Deduction","Loan Deduction",
    "EPF (Emp)","EPF (Employer)","ETF","APIT",
    "Total Deductions","Net Salary","Status"
  ];

  const handleExport = async () => {
    const thead = `<tr>${HEADERS.map(h=>`<th>${h}</th>`).join("")}</tr>`;
    const tbody = filtered.map(r=>`<tr>
      <td>${r.employee.employeeId}</td><td>${r.employee.fullName}</td>
      <td>${r.employee.designation}</td><td>${r.employee.department||""}</td>
      <td>${r.employee.employeeType||""}</td>
      <td>${r.workingDays||0}</td><td>${r.presentDays||0}</td><td>${r.absentDays||0}</td>
      <td>${r.lateDays||0}</td><td>${r.halfDays||0}</td>
      <td>Rs.${Math.round(r.basicSalary).toLocaleString()}</td>
      <td>Rs.${Math.round((r.overtimePay||0)+(r.holidayOtPay||0)).toLocaleString()}</td>
      <td>Rs.${Math.round(r.grossSalary).toLocaleString()}</td>
      <td>${(r.lateDeduction||0)+(r.lunchLateDeduction||0)>0?"Rs."+Math.round((r.lateDeduction||0)+(r.lunchLateDeduction||0)).toLocaleString():"—"}</td>
      <td>${(r.incompleteDeduction||0)>0?"Rs."+Math.round(r.incompleteDeduction||0).toLocaleString():"—"}</td>
      <td>${(r.absenceDeduction||0)>0?"Rs."+Math.round(r.absenceDeduction||0).toLocaleString():"—"}</td>
      <td>${(r.halfDayDeduction||0)>0?"Rs."+Math.round(r.halfDayDeduction||0).toLocaleString():"—"}</td>
      <td>${(r.loanDeduction||0)>0?"Rs."+Math.round(r.loanDeduction||0).toLocaleString():"—"}</td>
      <td>Rs.${Math.round(r.epfEmployee).toLocaleString()}</td>
      <td>Rs.${Math.round(r.epfEmployer).toLocaleString()}</td>
      <td>Rs.${Math.round(r.etfEmployer).toLocaleString()}</td>
      <td>${r.apit>0?"Rs."+Math.round(r.apit).toLocaleString():"—"}</td>
      <td>Rs.${Math.round(r.totalDeductions).toLocaleString()}</td>
      <td><strong>Rs.${Math.round(r.netSalary).toLocaleString()}</strong></td>
      <td>${r.status.toUpperCase()}</td>
    </tr>`).join("");
    const tfoot = `<tr>
      <td colspan="10"><strong>TOTALS (${filtered.length} employees)</strong></td>
      <td>Rs.${Math.round(totals.ot).toLocaleString()}</td>
      <td><strong>Rs.${Math.round(totals.gross).toLocaleString()}</strong></td>
      <td>Rs.${Math.round(totals.lateDed).toLocaleString()}</td>
      <td>Rs.${Math.round(totals.earlyExitDed).toLocaleString()}</td>
      <td>Rs.${Math.round(totals.absenceDed).toLocaleString()}</td>
      <td>Rs.${Math.round(totals.halfDayDed).toLocaleString()}</td>
      <td>Rs.${Math.round(totals.loanDed).toLocaleString()}</td>
      <td>Rs.${Math.round(totals.epfEmployee).toLocaleString()}</td>
      <td>Rs.${Math.round(totals.epfEmployer).toLocaleString()}</td>
      <td>Rs.${Math.round(totals.etf).toLocaleString()}</td>
      <td>Rs.${Math.round(totals.apit).toLocaleString()}</td>
      <td></td>
      <td><strong>Rs.${Math.round(totals.net).toLocaleString()}</strong></td>
      <td></td>
    </tr>`;
    printReport({
      title: "Payroll Report",
      meta: [
        { label:"Period",           value:`${getMonthName(dMonth)} ${dYear}` },
        { label:"Total Employees",  value:String(filtered.length) },
        { label:"Total Gross",      value:`Rs.${Math.round(totals.gross).toLocaleString()}` },
        { label:"Total Net Pay",    value:`Rs.${Math.round(totals.net).toLocaleString()}` },
        { label:"EPF (Employee)",   value:`Rs.${Math.round(totals.epfEmployee).toLocaleString()}` },
        { label:"EPF (Employer)",   value:`Rs.${Math.round(totals.epfEmployer).toLocaleString()}` },
        { label:"ETF",              value:`Rs.${Math.round(totals.etf).toLocaleString()}` },
        { label:"APIT",             value:`Rs.${Math.round(totals.apit).toLocaleString()}` },
        { label:"Late Deductions",  value:`Rs.${Math.round(totals.lateDed).toLocaleString()}` },
        { label:"Early Exit Ded.",  value:`Rs.${Math.round(totals.earlyExitDed).toLocaleString()}` },
      ],
      tableHtml: `<table><thead>${thead}</thead><tbody>${tbody}</tbody><tfoot>${tfoot}</tfoot></table>`,
    });
  };

  const handleExportExcel = () => {
    const rows = filtered.map(r => [
      r.employee.employeeId, r.employee.fullName, r.employee.designation, r.employee.department||"",
      r.employee.employeeType||"",
      r.workingDays||0, r.presentDays||0, r.absentDays||0, r.lateDays||0, r.halfDays||0,
      Math.round(r.basicSalary),
      Math.round((r.overtimePay||0)+(r.holidayOtPay||0)),
      Math.round(r.grossSalary),
      Math.round((r.lateDeduction||0)+(r.lunchLateDeduction||0)),
      Math.round(r.incompleteDeduction||0),
      Math.round(r.absenceDeduction||0),
      Math.round(r.halfDayDeduction||0),
      Math.round(r.loanDeduction||0),
      Math.round(r.epfEmployee), Math.round(r.epfEmployer), Math.round(r.etfEmployer),
      Math.round(r.apit), Math.round(r.totalDeductions),
      Math.round(r.netSalary), r.status.toUpperCase(),
    ]);
    exportCsv(HEADERS, rows, `payroll-report-${getMonthName(dMonth)}-${dYear}.csv`);
  };

  return (
    <div className="space-y-4">
      <SeasonBadge month={month} year={year} />
      <FilterCard title="Payroll Report Filters" onExport={handleExport} onExportExcel={handleExportExcel}>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <div><Label className="text-xs">Month</Label>
            <Select value={month} onChange={e=>setMonth(Number(e.target.value))}>
              {Array.from({length:12},(_,i)=><option key={i+1} value={i+1}>{getMonthName(i+1)}</option>)}
            </Select></div>
          <div><Label className="text-xs">Year</Label>
            <Select value={year} onChange={e=>setYear(Number(e.target.value))}>
              {[2024,2025,2026,2027].map(y=><option key={y} value={y}>{y}</option>)}
            </Select></div>
          <div><Label className="text-xs">Employee Type</Label>
            <Select value={empType} onChange={e=>setEmpType(e.target.value)}>
              <option value="">All Types</option>
              <option value="permanent">Permanent</option><option value="contract">Contract</option>
              <option value="casual">Casual</option>
            </Select></div>
          <div><Label className="text-xs">Status</Label>
            <Select value={status} onChange={e=>setStatus(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="draft">Draft</option><option value="approved">Approved</option>
              <option value="paid">Paid</option>
            </Select></div>
          <div><Label className="text-xs">Employee Name</Label>
            <Input placeholder="Search name…" value={empName} onChange={e=>setEmpName(e.target.value)}/></div>
        </div>
      </FilterCard>

      {filtered.length>0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {label:"Total Employees",    val:filtered.length,         fmt:false,cls:"text-primary"},
            {label:"Total Gross",        val:totals.gross,            fmt:true, cls:"text-emerald-600"},
            {label:"Total Net Pay",      val:totals.net,              fmt:true, cls:"text-blue-600"},
            {label:"Total OT / Holiday", val:totals.ot,               fmt:true, cls:"text-orange-600"},
            {label:"Late Deductions",    val:totals.lateDed,          fmt:true, cls:"text-amber-600"},
            {label:"Early Exit Ded.",    val:totals.earlyExitDed,     fmt:true, cls:"text-red-500"},
            {label:"Absence Deductions", val:totals.absenceDed,       fmt:true, cls:"text-red-600"},
            {label:"EPF (Employee)",     val:totals.epfEmployee,      fmt:true, cls:"text-purple-600"},
            {label:"EPF (Employer)",     val:totals.epfEmployer,      fmt:true, cls:"text-indigo-600"},
            {label:"ETF",                val:totals.etf,              fmt:true, cls:"text-violet-600"},
            {label:"Total APIT",         val:totals.apit,             fmt:true, cls:"text-amber-700"},
            {label:"Loans / Advances",   val:totals.loanDed,          fmt:true, cls:"text-rose-600"},
          ].map(({label,val,fmt:f,cls})=>(
            <Card key={label} className="p-3">
              <div className={cn("text-lg font-bold",cls)}>{f?fmtAmt(val as number):val}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
            </Card>
          ))}
        </div>
      )}

      <Card className="overflow-hidden">
        {loading ? <div className="p-8 text-center text-sm text-muted-foreground">Loading payroll data…</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr>
                  {["Emp ID","Employee","Designation","Department","Type"].map(h=>(
                    <th key={h} className="px-3 py-2.5 text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                  <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground whitespace-nowrap" colSpan={4}>Attendance</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground whitespace-nowrap">Basic</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-orange-600 whitespace-nowrap">OT/Holiday</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-emerald-700 whitespace-nowrap">Gross</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-amber-600 whitespace-nowrap">Late Ded.</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-red-500 whitespace-nowrap">Early Exit Ded.</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-red-600 whitespace-nowrap">Absence Ded.</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-yellow-600 whitespace-nowrap">Half Day Ded.</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-rose-600 whitespace-nowrap">Loan Ded.</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-purple-600 whitespace-nowrap">EPF(Emp)</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-indigo-600 whitespace-nowrap">EPF(Er)</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-violet-600 whitespace-nowrap">ETF</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-amber-700 whitespace-nowrap">APIT</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-red-700 whitespace-nowrap">Total Ded.</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-blue-700 whitespace-nowrap">Net Salary</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground whitespace-nowrap">Status</th>
                </tr>
                <tr className="border-b border-border bg-muted/20">
                  {["","","","",""].map((_,i)=><th key={i} className="px-3 py-1"/>)}
                  {["Working","Present","Absent","Late"].map(h=>(
                    <th key={h} className="px-3 py-1 text-[10px] font-medium text-muted-foreground text-center">{h}</th>
                  ))}
                  {Array(13).fill(null).map((_,i)=><th key={i} className="px-3 py-1"/>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(r=>{
                  const lateTotalDed = (r.lateDeduction||0)+(r.lunchLateDeduction||0);
                  const earlyExitD  = r.incompleteDeduction||0;
                  const absenceD    = r.absenceDeduction||0;
                  const halfDayD    = r.halfDayDeduction||0;
                  const loanD       = r.loanDeduction||0;
                  const otTotal     = (r.overtimePay||0)+(r.holidayOtPay||0);
                  return (
                  <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-2 font-mono whitespace-nowrap text-muted-foreground">{r.employee.employeeId}</td>
                    <td className="px-3 py-2 font-medium whitespace-nowrap">{r.employee.fullName}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{r.employee.designation}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{r.employee.department||"—"}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {r.employee.employeeType?<span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium capitalize",
                        r.employee.employeeType==="permanent"?"bg-blue-100 text-blue-700":r.employee.employeeType==="contract"?"bg-purple-100 text-purple-700":"bg-orange-100 text-orange-700"
                      )}>{r.employee.employeeType}</span>:"—"}
                    </td>
                    <td className="px-3 py-2 text-center whitespace-nowrap text-muted-foreground">{r.workingDays||0}</td>
                    <td className="px-3 py-2 text-center whitespace-nowrap text-green-600 font-semibold">{r.presentDays||0}</td>
                    <td className="px-3 py-2 text-center whitespace-nowrap text-red-600 font-semibold">{r.absentDays||0}</td>
                    <td className="px-3 py-2 text-center whitespace-nowrap text-amber-600 font-semibold">{r.lateDays||0}</td>
                    <td className="px-3 py-2 font-mono whitespace-nowrap">{fmtAmt(r.basicSalary)}</td>
                    <td className="px-3 py-2 font-mono whitespace-nowrap text-orange-600">{otTotal>0?fmtAmt(otTotal):"—"}</td>
                    <td className="px-3 py-2 font-mono whitespace-nowrap text-emerald-700 font-semibold">{fmtAmt(r.grossSalary)}</td>
                    <td className="px-3 py-2 font-mono whitespace-nowrap text-amber-600">{lateTotalDed>0?fmtAmt(lateTotalDed):"—"}</td>
                    <td className="px-3 py-2 font-mono whitespace-nowrap text-red-500">{earlyExitD>0?fmtAmt(earlyExitD):"—"}</td>
                    <td className="px-3 py-2 font-mono whitespace-nowrap text-red-600">{absenceD>0?fmtAmt(absenceD):"—"}</td>
                    <td className="px-3 py-2 font-mono whitespace-nowrap text-yellow-600">{halfDayD>0?fmtAmt(halfDayD):"—"}</td>
                    <td className="px-3 py-2 font-mono whitespace-nowrap text-rose-600">{loanD>0?fmtAmt(loanD):"—"}</td>
                    <td className="px-3 py-2 font-mono whitespace-nowrap text-purple-600">{fmtAmt(r.epfEmployee)}</td>
                    <td className="px-3 py-2 font-mono whitespace-nowrap text-indigo-600">{fmtAmt(r.epfEmployer)}</td>
                    <td className="px-3 py-2 font-mono whitespace-nowrap text-violet-600">{fmtAmt(r.etfEmployer)}</td>
                    <td className="px-3 py-2 font-mono whitespace-nowrap text-amber-700">{r.apit>0?fmtAmt(r.apit):"—"}</td>
                    <td className="px-3 py-2 font-mono whitespace-nowrap text-red-700 font-semibold">{fmtAmt(r.totalDeductions)}</td>
                    <td className="px-3 py-2 font-mono whitespace-nowrap font-bold text-blue-700">{fmtAmt(r.netSalary)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                        r.status==="paid"?"bg-emerald-100 text-emerald-700":r.status==="approved"?"bg-blue-100 text-blue-700":"bg-amber-100 text-amber-700"
                      )}>{r.status}</span>
                    </td>
                  </tr>
                  );
                })}
                {!filtered.length&&<tr><td colSpan={22} className="text-center py-8 text-muted-foreground">No payroll records found for {getMonthName(dMonth)} {dYear}.</td></tr>}
              </tbody>
              {filtered.length>0 && (
                <tfoot className="bg-muted/70">
                  <tr>
                    <td colSpan={9} className="px-3 py-2 text-xs font-bold">TOTALS ({filtered.length} employees)</td>
                    <td className="px-3 py-2 font-mono text-xs text-orange-600 font-semibold">{totals.ot>0?fmtAmt(totals.ot):"—"}</td>
                    <td className="px-3 py-2 font-mono text-xs text-emerald-700 font-bold">{fmtAmt(totals.gross)}</td>
                    <td className="px-3 py-2 font-mono text-xs text-amber-600">{totals.lateDed>0?fmtAmt(totals.lateDed):"—"}</td>
                    <td className="px-3 py-2 font-mono text-xs text-red-500">{totals.earlyExitDed>0?fmtAmt(totals.earlyExitDed):"—"}</td>
                    <td className="px-3 py-2 font-mono text-xs text-red-600">{totals.absenceDed>0?fmtAmt(totals.absenceDed):"—"}</td>
                    <td className="px-3 py-2 font-mono text-xs text-yellow-600">{totals.halfDayDed>0?fmtAmt(totals.halfDayDed):"—"}</td>
                    <td className="px-3 py-2 font-mono text-xs text-rose-600">{totals.loanDed>0?fmtAmt(totals.loanDed):"—"}</td>
                    <td className="px-3 py-2 font-mono text-xs text-purple-600">{fmtAmt(totals.epfEmployee)}</td>
                    <td className="px-3 py-2 font-mono text-xs text-indigo-600">{fmtAmt(totals.epfEmployer)}</td>
                    <td className="px-3 py-2 font-mono text-xs text-violet-600">{fmtAmt(totals.etf)}</td>
                    <td className="px-3 py-2 font-mono text-xs text-amber-700">{totals.apit>0?fmtAmt(totals.apit):"—"}</td>
                    <td className="px-3 py-2 font-mono text-xs"></td>
                    <td className="px-3 py-2 font-mono text-xs text-blue-700 font-bold">{fmtAmt(totals.net)}</td>
                    <td className="px-3 py-2"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   INDIVIDUAL MONTHLY REPORT
══════════════════════════════════════════════════════════ */
const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function IndividualReport() {
  const now = new Date();
  const [month, setMonth]         = useState(now.getMonth() + 1);
  const [year, setYear]           = useState(now.getFullYear());
  const [empIds, setEmpIds]       = useState<string[]>([]);
  const [activeEmpId, setActiveEmpId] = useState<string>("");
  const [showReport, setShowReport] = useState(false);
  const [deptFilter, setDeptFilter] = useState("");

  const { data: empData, isLoading: empLoading } = useListEmployees({ limit: 1000 });
  const { rules: hrRules } = useHrRules();
  const { data: shiftsData2 } = useListShifts();
  const shiftOptions: any[] = Array.isArray(shiftsData2) ? shiftsData2 : (shiftsData2 as any)?.shifts ?? [];
  const empOffDays = useEmployeeOffDays();

  const [payrollCfg, setPayrollCfg] = useState<{ salaryScale: Record<string,number>; employeeOverrides: Record<string,number> } | null>(null);
  useEffect(() => {
    const token = localStorage.getItem("auth_token") || "";
    fetch(apiUrl("/payroll-settings"), { credentials: "include", headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setPayrollCfg({ salaryScale: d.salaryScale ?? {}, employeeOverrides: d.employeeOverrides ?? {} }))
      .catch(() => {});
  }, []);

  // Fetch salary structure assignment for the selected employee (has priority over payrollCfg)
  const [empStructBasic, setEmpStructBasic] = useState<number | null>(null);
  const [empStructLoaded, setEmpStructLoaded] = useState(false);
  useEffect(() => {
    if (!activeEmpId) { setEmpStructBasic(null); setEmpStructLoaded(false); return; }
    setEmpStructLoaded(false);
    const token = localStorage.getItem("auth_token") || "";
    fetch(apiUrl(`/salary-structures/assignment/${activeEmpId}`), { credentials: "include", headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) { setEmpStructBasic(null); setEmpStructLoaded(true); return; }
        let basic: number | null = d.basicAmount > 0 ? d.basicAmount : null;
        if (!basic && Array.isArray(d.earnings)) {
          const basicEarning = d.earnings.find((e: any) => (e.component ?? e.name ?? "").toLowerCase() === "basic");
          if (basicEarning) basic = Number(basicEarning.amount) || null;
        }
        setEmpStructBasic(basic);
        setEmpStructLoaded(true);
      })
      .catch(() => { setEmpStructBasic(null); setEmpStructLoaded(true); });
  }, [activeEmpId]);

  const employees = useMemo(() => {
    const list = (empData?.employees || []) as any[];
    return [...list].sort((a, b) => (a.fullName || "").localeCompare(b.fullName || ""));
  }, [empData]);

  const departments = useMemo(() => {
    const set = new Set(employees.map((e: any) => e.department).filter(Boolean));
    return Array.from(set).sort() as string[];
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    if (!deptFilter) return employees;
    return employees.filter((e: any) => e.department === deptFilter);
  }, [employees, deptFilter]);

  useEffect(() => {
    if (empIds.length > 0 && !empIds.includes(activeEmpId)) {
      setActiveEmpId(empIds[0]);
      setShowReport(false);
    } else if (empIds.length === 0) {
      setActiveEmpId("");
      setShowReport(false);
    }
  }, [empIds]);

  const selectedEmp = useMemo(() => employees.find((e: any) => String(e.id) === activeEmpId), [employees, activeEmpId]);

  const daysInMonth = new Date(year, month, 0).getDate();
  const startDate = `${year}-${String(month).padStart(2,"0")}-01`;
  const endDate   = `${year}-${String(month).padStart(2,"0")}-${String(daysInMonth).padStart(2,"0")}`;

  const { data, isLoading } = useGetAttendanceReport(
    { startDate, endDate, employeeId: activeEmpId ? Number(activeEmpId) : undefined },
    { enabled: !!activeEmpId && showReport } as any
  );

  const records: any[] = useMemo(() => (data?.records || []).sort((a: any, b: any) => a.date.localeCompare(b.date)), [data]);

  function getRemarks(r: any): string {
    if (typeof r.remarks === "string" && r.remarks.trim()) return r.remarks;
    const shiftName = r.shiftName ?? shiftOptions.find((s: any) => s.id === Number(r.shiftId))?.name ?? null;
    const rule = clientFindRule(hrRules, r.department ?? "", shiftName);
    return rule?.remarks ?? "";
  }

  const summary = useMemo(() => {
    let present = 0, absent = 0, late = 0, halfDay = 0, leave = 0, holiday = 0, offDay = 0;
    let totalHours = 0, totalOT = 0, totalRegularOT = 0, totalHolidayOT = 0, holidayWorkedDays = 0, totalLateMins = 0;
    for (const r of records) {
      const st = r.status;
      if (st === "present") present++;
      else if (st === "absent") absent++;
      else if (st === "late") { late++; present++; }
      else if (st === "half_day") halfDay++;
      else if (st === "leave") leave++;
      else if (st === "holiday") holiday++;
      else if (st === "off_day") offDay++;
      totalHours += r.totalHours || 0;
      const ot = r.overtimeHours || 0;
      totalOT += ot;
      if ((r as any).holidayWorked) { totalHolidayOT += ot; holidayWorkedDays++; }
      else totalRegularOT += ot;
      totalLateMins += (r.morningLateMinutes || 0) + (r.lunchLateMinutes || 0);
    }
    const effectiveDays = daysInMonth - holiday - offDay;
    const attPct = effectiveDays > 0 ? Math.round(((present + halfDay * 0.5) / effectiveDays) * 100) : 0;
    return { present, absent, late, halfDay, leave, holiday, offDay, totalHours, totalOT, totalRegularOT, totalHolidayOT, holidayWorkedDays, totalLateMins, attPct };
  }, [records, daysInMonth]);

  function fmtHM(mins: number) {
    const h = Math.floor(mins / 60), m = mins % 60;
    return `${h}h ${String(m).padStart(2,"0")}m`;
  }
  function fmtTotal(h: number | null) {
    if (h == null) return "—";
    const hh = Math.floor(h), mm = Math.round((h - hh) * 60);
    return `${hh}:${String(mm).padStart(2,"0")}`;
  }
  function statusColor(st: string) {
    const map: Record<string, string> = {
      present:"bg-green-100 text-green-700", late:"bg-amber-100 text-amber-700",
      absent:"bg-red-100 text-red-700", half_day:"bg-yellow-100 text-yellow-700",
      leave:"bg-purple-100 text-purple-700", holiday:"bg-gray-100 text-gray-600",
      off_day:"bg-violet-100 text-violet-700",
    };
    return map[st] || "bg-gray-100 text-gray-600";
  }

  const [generatingPdfs, setGeneratingPdfs] = useState(false);

  async function handleGenerateAllPdfs() {
    if (empIds.length === 0) return;
    setGeneratingPdfs(true);
    try {
      async function toDataUrl(url: string): Promise<string> {
        try {
          const res = await fetch(url);
          const blob = await res.blob();
          return await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } catch { return url; }
      }
      const [logoData, liveuData] = await Promise.all([toDataUrl(drivethruLogo), toDataUrl(liveuLogo)]);

      const period = `${getMonthName(month)} ${year}`;
      const generated = new Date().toLocaleString("en-LK", { dateStyle: "long", timeStyle: "short" });
      const pagesHtml: string[] = [];

      for (const eid of empIds) {
        const emp = employees.find((e: any) => String(e.id) === eid);
        if (!emp) continue;

        let recs: any[] = [];
        let pdfStructBasic: number | null = null;
        try {
          const token = localStorage.getItem("auth_token") || "";
          const [attRes, structRes] = await Promise.all([
            fetch(`${BASE}/api/reports/attendance?${new URLSearchParams({ startDate, endDate, employeeId: eid })}`, {
              credentials: "include", headers: { Authorization: `Bearer ${token}` },
            }),
            fetch(`${BASE}/api/salary-structures/assignment/${eid}`, {
              credentials: "include", headers: { Authorization: `Bearer ${token}` },
            }),
          ]);
          if (attRes.ok) {
            const d = await attRes.json();
            recs = (d.records || []).sort((a: any, b: any) => a.date.localeCompare(b.date));
          }
          if (structRes.ok) {
            const sd = await structRes.json();
            let basic: number | null = sd?.basicAmount > 0 ? sd.basicAmount : null;
            if (!basic && Array.isArray(sd?.earnings)) {
              const basicEarning = sd.earnings.find((e: any) => (e.component ?? e.name ?? "").toLowerCase() === "basic");
              if (basicEarning) basic = Number(basicEarning.amount) || null;
            }
            pdfStructBasic = basic;
          }
        } catch (err) { console.error("Fetch error for employee", eid, err); }

        let present = 0, absent = 0, late = 0, halfDay = 0, leave = 0, holiday = 0, offDay = 0;
        let totalHours = 0, totalOT = 0, totalLateMins = 0;
        for (const r of recs) {
          const st = r.status;
          if (st === "present") present++;
          else if (st === "absent") absent++;
          else if (st === "late") { late++; present++; }
          else if (st === "half_day") halfDay++;
          else if (st === "leave") leave++;
          else if (st === "holiday") holiday++;
          else if (st === "off_day") offDay++;
          totalHours += r.totalHours || 0;
          totalOT += r.overtimeHours || 0;
          totalLateMins += (r.morningLateMinutes || 0) + (r.lunchLateMinutes || 0);
        }
        const effectiveDays = daysInMonth - holiday - offDay;
        const attPct = effectiveDays > 0 ? Math.round(((present + halfDay * 0.5) / effectiveDays) * 100) : 0;

        const sumCardsHtml = [
          { label:"Present", val:present, color:"#16a34a" },
          { label:"Absent", val:absent, color:"#dc2626" },
          { label:"Late Days", val:late, color:"#d97706" },
          { label:"Half Day", val:halfDay, color:"#ca8a04" },
          { label:"Leave", val:leave, color:"#9333ea" },
          { label:"Holiday", val:holiday, color:"#6b7280" },
          { label:"Day Off", val:offDay, color:"#7c3aed" },
          { label:"Total Hours", val:`${Math.floor(totalHours)}:${String(Math.round((totalHours%1)*60)).padStart(2,"00")}`, color:"#0369a1" },
          { label:"OT Hours", val:`${totalOT.toFixed(1)}h`, color:"#ea580c" },
          { label:"Late (Total)", val:totalLateMins>0?(totalLateMins<60?`${totalLateMins}m`:fmtHM(totalLateMins)):"0m", color:"#dc2626" },
          { label:"Att. %", val:`${attPct}%`, color:attPct>=90?"#16a34a":attPct>=75?"#ca8a04":"#dc2626" },
        ].map(c => `<div style="padding:8px 14px;border-right:1px solid #e5e7eb;text-align:center;min-width:70px">
          <div style="font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#9ca3af;font-weight:600">${c.label}</div>
          <div style="font-size:14px;font-weight:800;color:${c.color};margin-top:2px">${c.val}</div>
        </div>`).join("");

        const recMap = new Map(recs.map((r: any) => [r.date, r]));
        const offDaysListPdf = empOffDays.get(Number(emp.id)) || [];
        let rowsHtml = "";
        for (let d = 1; d <= daysInMonth; d++) {
          const dateStr = `${year}-${String(month).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
          const dow = new Date(dateStr + "T00:00:00Z").getUTCDay();
          const dayName = DAY_NAMES[dow];
          const r = recMap.get(dateStr);
          if (!r) {
            if (offDaysListPdf.includes(dow)) {
              rowsHtml += `<tr style="background:#ede9fe"><td>${d}</td><td>${dayName}</td><td style="font-weight:700;color:#6d28d9">WEEK OFF</td><td colspan="9" style="text-align:center;color:#9ca3af">Scheduled week off</td></tr>`;
            } else {
              rowsHtml += `<tr><td>${d}</td><td>${dayName}</td><td colspan="10" style="text-align:center;color:#ccc">—</td></tr>`;
            }
            continue;
          }
          const st = r.status;
          const statusLabel = st==="late"?"PRESENT (LATE)":st==="half_day"?"HALF DAY":st==="off_day"?"DAY OFF":st.replace("_"," ").toUpperCase();
          const stColorMap: Record<string,string> = {
            present:"#dcfce7",late:"#fef3c7",absent:"#fee2e2",half_day:"#fefce8",
            leave:"#f3e8ff",holiday:"#f3f4f6",off_day:"#ede9fe",
          };
          const bg = stColorMap[st] || "#f9fafb";
          const lm = (r.morningLateMinutes || 0) + (r.lunchLateMinutes || 0);
          const lateStr = lm > 0 ? (lm < 60 ? `${lm}m` : `${Math.floor(lm/60)}h${lm%60}m`) : "—";
          const isHolWorked = !!(r as any).holidayWorked;
          const holMultiplier = (r as any).holidayMultiplier;
          const holName = (r as any).holidayName || "Holiday";
          const otVal = r.overtimeHours || 0;
          const otStr = otVal > 0 ? `<span style="color:#ea580c;font-weight:600">${otVal.toFixed(1)}h</span>` : "—";
          const remarksStr = isHolWorked ? `<span style="color:#b45309">Holiday OT ×${holMultiplier ?? ""} — ${holName}</span>` : "—";
          const lbMins = (() => {
            if (!r.outTime1 || !r.inTime2) return 0;
            const [oh,om] = r.outTime1.split(":").map(Number);
            const [ih,im] = r.inTime2.split(":").map(Number);
            return Math.max(0,(ih*60+im)-(oh*60+om));
          })();
          rowsHtml += `<tr style="background:${bg}">
            <td>${d}</td><td>${dayName}</td>
            <td style="font-weight:700">${statusLabel}</td>
            <td>${r.inTime1||"—"}</td><td>${r.outTime1||"—"}</td>
            <td>${r.inTime2||"—"}</td><td>${r.outTime2||"—"}</td>
            <td>${lbMins>0?fmtHM(lbMins):"—"}</td>
            <td>${fmtTotal(r.totalHours)}</td>
            <td>${lateStr}</td><td>${otStr}</td><td>${remarksStr}</td>
          </tr>`;
        }

        // Night Watcher OT table for PDF
        const empIsNW = !!(
          clientFindRule(hrRules, (emp as any).department ?? "", shiftOptions.find((s: any) => s.id === (emp as any).shiftId)?.name ?? null)?.nightWatcherPayroll ||
          /night\s*watcher/i.test((emp as any).designation || "") ||
          /night\s*watcher/i.test(shiftOptions.find((s: any) => s.id === (emp as any).shiftId)?.name || "")
        );
        // Resolve basic salary: salary structure > payroll overrides > salary scale > NOT ASSIGNED
        const pdfEmpIdStr = String((emp as any).id ?? "");
        const pdfDesignation = (emp as any).designation ?? "";
        let empBasicForNW: number | null = pdfStructBasic;
        let empNwHasValidBasic = empBasicForNW !== null;
        if (!empNwHasValidBasic && payrollCfg) {
          const fromOverride = payrollCfg.employeeOverrides[pdfEmpIdStr];
          if (fromOverride !== undefined) { empBasicForNW = fromOverride; empNwHasValidBasic = true; }
          else {
            const fromScale = payrollCfg.salaryScale[pdfDesignation];
            if (fromScale !== undefined) { empBasicForNW = fromScale; empNwHasValidBasic = true; }
          }
        }
        const empNwOtRate = empNwHasValidBasic ? Math.round(((empBasicForNW ?? 0) / 240 * 1.5) * 100) / 100 : 0;
        // Build full-calendar rows for PDF (all days, like reference screenshot)
        const pdfRecMap = new Map(recs.map((r: any) => [r.date as string, r]));
        const nwTotalOt = recs.reduce((s: number, r: any) => s + (r.overtimeHours || 0), 0);
        const nwCalRows: string[] = [];
        for (let d = 1; d <= daysInMonth; d++) {
          const dateStr = `${year}-${String(month).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
          const r = pdfRecMap.get(dateStr);
          const ot = r ? (r.overtimeHours || 0) : 0;
          const isHol = r ? !!(r as any).holidayWorked : false;
          const isAbsent = !r || r.status === "absent";
          const isOff = r?.status === "off_day";
          const isHoliday = r?.status === "holiday";
          const isPresent = !isAbsent && !isOff && !isHoliday && ot > 0;
          const amount = Math.round(ot * empNwOtRate * 100) / 100;
          const dow2 = new Date(dateStr + "T00:00:00Z").getUTCDay();
          const bgStyle = isHol ? 'background:#dbeafe' : isAbsent || isOff || isHoliday ? 'background:#f8fafc' : 'background:#f9fafb';
          const absenceLabel = isAbsent ? '<span style="color:#dc2626;font-weight:700">ABSENT</span>'
            : isOff ? '<span style="color:#7c3aed">DAY OFF</span>'
            : isHoliday ? '<span style="color:#6b7280">HOLIDAY</span>'
            : isHol ? '<span style="color:#1d4ed8">Holiday worked</span>' : '';
          nwCalRows.push(`<tr style="${bgStyle}">
            <td style="padding:3px 8px;font-size:8.5px;border-bottom:1px solid #f0f0f0">${d}</td>
            <td style="padding:3px 8px;font-size:8.5px;border-bottom:1px solid #f0f0f0;font-family:monospace">${dateStr}</td>
            <td style="padding:3px 8px;font-size:8.5px;border-bottom:1px solid #f0f0f0;text-align:right;color:#ea580c;font-weight:700">${isPresent ? ot.toFixed(1) : '—'}</td>
            <td style="padding:3px 8px;font-size:8.5px;border-bottom:1px solid #f0f0f0;text-align:right;color:#1d4ed8">${empNwOtRate.toFixed(2)}</td>
            <td style="padding:3px 8px;font-size:8.5px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:700;color:${isHol?'#1d4ed8':'#15803d'}">${isPresent ? amount.toFixed(2) : '0.00'}</td>
            <td style="padding:3px 8px;font-size:8.5px;border-bottom:1px solid #f0f0f0">${absenceLabel}</td>
          </tr>`);
        }
        const nwOtTableHtml = empIsNW ? (
          !empNwHasValidBasic
            ? `<div style="margin-top:14px;border:1px solid #fde68a;border-radius:6px;overflow:hidden">
  <div style="background:#fffbeb;padding:8px 14px;border-bottom:1px solid #fde68a">
    <span style="font-weight:700;color:#92400e;font-size:10px">NIGHT WATCHER OT SUMMARY</span>
  </div>
  <div style="padding:16px 20px;background:#fff7ed;border:1px solid #fed7aa;border-radius:4px;margin:12px;text-align:center">
    <span style="color:#c2410c;font-size:10px;font-weight:700">&#9888; Salary structure not assigned — OT amount cannot be calculated. Please assign a salary structure to this employee.</span>
  </div>
</div>`
            : `<div style="margin-top:14px;border:1px solid #fde68a;border-radius:6px;overflow:hidden">
  <div style="background:#fffbeb;padding:8px 14px;border-bottom:1px solid #fde68a;display:flex;justify-content:space-between;align-items:center">
    <span style="font-weight:700;color:#92400e;font-size:10px">NIGHT WATCHER OT SUMMARY</span>
    <span style="font-size:9px;color:#b45309">OT Rate = Basic/240×1.5 = Rs. ${empNwOtRate.toFixed(2)}/hr &nbsp;|&nbsp; Normal: 3 hrs · Holiday: 11 hrs (8+3)</span>
  </div>
  <table style="width:100%;border-collapse:collapse">
    <thead><tr style="background:#1565a8">
      <th style="color:#fff;padding:5px 8px;text-align:left;font-size:8.5px">#</th>
      <th style="color:#fff;padding:5px 8px;text-align:left;font-size:8.5px">Date</th>
      <th style="color:#fff;padding:5px 8px;text-align:right;font-size:8.5px">OT Hours</th>
      <th style="color:#fff;padding:5px 8px;text-align:right;font-size:8.5px">OT Rate</th>
      <th style="color:#fff;padding:5px 8px;text-align:right;font-size:8.5px">Amount</th>
      <th style="color:#fff;padding:5px 8px;text-align:left;font-size:8.5px">Absence</th>
    </tr></thead>
    <tbody>${nwCalRows.join("")}</tbody>
    <tfoot><tr style="background:#e8f0fe">
      <td colspan="2" style="padding:5px 8px;font-size:9px;font-weight:700;border-top:2px solid #1565a8">TOTAL — Absence: ${absent}</td>
      <td style="padding:5px 8px;font-size:9px;font-weight:700;text-align:right;color:#ea580c;border-top:2px solid #1565a8">${nwTotalOt.toFixed(1)}</td>
      <td style="border-top:2px solid #1565a8"></td>
      <td style="padding:5px 8px;font-size:9px;font-weight:700;text-align:right;color:#15803d;border-top:2px solid #1565a8">${(Math.round(nwTotalOt * empNwOtRate * 100)/100).toFixed(2)}</td>
      <td style="border-top:2px solid #1565a8"></td>
    </tr></tfoot>
  </table>
</div>`
        ) : "";

        pagesHtml.push(`<div class="report-wrap">
<div class="header">
  <div class="header-left">
    <img src="${logoData}" class="header-logo" alt="Drivethru"/>
    <div><div class="company">Drivethru Pvt Ltd</div><div class="company-sub">Attendance Management System</div></div>
  </div>
  <div class="header-right">
    <div class="report-title">Individual Monthly Attendance Report</div>
    <div class="report-date">Generated: ${generated}</div>
  </div>
</div>
<div class="emp-card">
  <div class="emp-field"><div class="emp-label">Employee Name</div><div class="emp-value">${emp.fullName||""}</div></div>
  <div class="emp-field"><div class="emp-label">Employee ID</div><div class="emp-value">${emp.employeeId||""}</div></div>
  <div class="emp-field"><div class="emp-label">Designation</div><div class="emp-value">${emp.designation||"—"}</div></div>
  <div class="emp-field"><div class="emp-label">Department</div><div class="emp-value">${emp.department||"—"}</div></div>
  <div class="emp-field"><div class="emp-label">Branch</div><div class="emp-value">${emp.branchName||"—"}</div></div>
  <div class="emp-field"><div class="emp-label">Period</div><div class="emp-value">${period}</div></div>
  <div class="emp-field"><div class="emp-label">Working Days</div><div class="emp-value">${daysInMonth}</div></div>
</div>
<div class="summary-bar">${sumCardsHtml}</div>
<table><thead><tr>
  <th>#</th><th>Day</th><th>Status</th>
  <th>1st In</th><th>1st Out</th><th>2nd In</th><th>2nd Out</th>
  <th>Lunch Break</th><th>Total Hrs</th><th>Late</th><th>OT</th><th>Remarks</th>
</tr></thead><tbody>${rowsHtml}</tbody></table>
${nwOtTableHtml}
<div class="footer">
  <div class="footer-note">System-generated report. For internal use only. © ${new Date().getFullYear()} Drivethru Pvt Ltd</div>
  <div class="footer-right">
    <span style="font-size:9px;color:#9ca3af">Powered by</span>
    <img src="${liveuData}" style="height:20px;object-fit:contain;opacity:.85" alt="Live U"/>
    <span class="footer-liveu-name">Live U Pvt Ltd</span>
  </div>
</div>
</div>`);
      }

      if (pagesHtml.length === 0) { alert("No data available for the selected employees."); return; }

      const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Attendance Report</title><style>
  @page{size:A4 landscape;margin:8mm}
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;background:#fff;font-size:10.5px}
  .report-wrap{page-break-after:always}
  .report-wrap:last-child{page-break-after:avoid}
  .header{display:flex;align-items:center;justify-content:space-between;padding:16px 24px 12px;border-bottom:3px solid #1565a8;background:#f5f8ff}
  .header-left{display:flex;align-items:center;gap:12px}
  .header-logo{width:46px;height:46px;object-fit:contain;border-radius:12px;background:#fff;padding:4px}
  .company{font-size:18px;font-weight:700;color:#1565a8}
  .company-sub{font-size:9.5px;color:#6b7280;text-transform:uppercase;letter-spacing:.08em;margin-top:1px}
  .header-right{text-align:right}
  .report-title{font-size:13px;font-weight:700;color:#1565a8}
  .report-date{font-size:9px;color:#9ca3af;margin-top:3px}
  .emp-card{display:flex;flex-wrap:wrap;background:#fff;border:1px solid #e5e7eb;border-radius:8px;margin:14px 24px;overflow:hidden}
  .emp-field{padding:8px 16px;border-right:1px solid #f0f0f0;flex:1;min-width:130px}
  .emp-label{font-size:8.5px;text-transform:uppercase;letter-spacing:.07em;color:#9ca3af;font-weight:600}
  .emp-value{font-size:11.5px;font-weight:700;color:#111827;margin-top:2px}
  .summary-bar{display:flex;flex-wrap:wrap;background:#f8faff;border:1px solid #e5e7eb;border-radius:8px;margin:0 24px 14px;overflow:hidden}
  table{width:100%;border-collapse:collapse}
  thead tr{background:#1565a8}
  th{color:#fff;padding:7px 9px;text-align:left;font-size:8.5px;font-weight:600;white-space:nowrap;letter-spacing:.03em;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  td{padding:5px 9px;font-size:9px;border-bottom:1px solid #f0f0f0;white-space:nowrap}
  tr{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .footer{display:flex;align-items:center;justify-content:space-between;padding:10px 24px;border-top:1px solid #e5e7eb;background:#f5f8ff;margin-top:8px}
  .footer-note{font-size:8.5px;color:#9ca3af}
  .footer-right{display:flex;align-items:center;gap:6px}
  .footer-liveu-name{font-size:9.5px;font-weight:700;color:#1565a8}
  </style></head><body>${pagesHtml.join("")}</body></html>`;

      const blob = new Blob([fullHtml], { type: "text/html" });
      const blobUrl = URL.createObjectURL(blob);
      const printWin = window.open(blobUrl, "_blank");
      if (printWin) {
        printWin.addEventListener("load", () => {
          setTimeout(() => { printWin.print(); }, 500);
        });
      } else {
        alert("Please allow popups for this site to generate the PDF report.");
      }
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } finally {
      setGeneratingPdfs(false);
    }
  }

  function handleExportExcel() {
    if (!selectedEmp || records.length === 0) return;
    // Night Watcher: export full-calendar OT summary matching the reference format
    if (isNightWatcher) {
      const NW_HEADERS = ["#","Date","OT Hours","OT Rate","Amount","Absence"];
      const recMap = new Map(records.map((r: any) => [r.date, r]));
      const nwRows: (string | number)[][] = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
        const dow = new Date(dateStr + "T00:00:00Z").getUTCDay();
        const r = recMap.get(dateStr);
        const ot = r ? (r.overtimeHours || 0) : 0;
        const isHol = r ? !!r.holidayWorked : false;
        const isAbsent = !r || r.status === "absent";
        const isOff = r?.status === "off_day";
        const isHoliday = r?.status === "holiday";
        const amount = Math.round(ot * nwOtRate * 100) / 100;
        const absenceNote = isAbsent ? "ABSENT" : isOff ? "DAY OFF" : isHoliday ? "HOLIDAY" : isHol ? "Holiday worked" : "";
        const otHrsStr = ot > 0 ? ot.toFixed(1) : "";
        nwRows.push([d, `'${dateStr}`, otHrsStr, nwOtRate.toFixed(2), amount.toFixed(2), absenceNote]);
      }
      const totalOt = records.reduce((s: number, r: any) => s + (r.overtimeHours || 0), 0);
      nwRows.push(["TOTAL", "", totalOt.toFixed(1), "", (Math.round(totalOt * nwOtRate * 100) / 100).toFixed(2), `Absence: ${summary.absent}`]);
      const safeMonth = `${getMonthName(month)}-${year}`;
      exportCsv(NW_HEADERS, nwRows, `night-watcher-ot-${(selectedEmp as any).employeeId}-${safeMonth}.csv`);
      return;
    }
    const HEADERS = ["#","Date","Day","Status","1st In","1st Out","2nd In","2nd Out","Lunch Break","Total Hrs","Late","OT Hrs","Remarks"];
    const offDaysListXls = empOffDays.get(Number(selectedEmp.id)) || [];
    const rows = Array.from({ length: daysInMonth }, (_, i) => {
      const d = i + 1;
      const dateStr = `${year}-${String(month).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
      const dow = new Date(dateStr + "T00:00:00Z").getUTCDay();
      const dayName = DAY_NAMES[dow];
      const r = records.find((x: any) => x.date === dateStr);
      if (!r) {
        if (offDaysListXls.includes(dow)) return [d, dateStr, dayName, "WEEK OFF", "","","","","","","","",""];
        return [d, dateStr, dayName, "No Record", "","","","","","","","",""];
      }
      const st = r.status;
      const statusLabel = st==="late"?"PRESENT (LATE)":st==="half_day"?"HALF DAY":st==="off_day"?"DAY OFF":st.replace("_"," ").toUpperCase();
      const lm = (r.morningLateMinutes || 0) + (r.lunchLateMinutes || 0);
      const lateStr = lm > 0 ? (lm < 60 ? `${lm}m` : fmtHM(lm)) : "";
      const lbMins = (() => {
        if (!r.outTime1 || !r.inTime2) return 0;
        const [oh,om] = r.outTime1.split(":").map(Number);
        const [ih,im] = r.inTime2.split(":").map(Number);
        return Math.max(0,(ih*60+im)-(oh*60+om));
      })();
      return [
        d, dateStr, dayName, statusLabel,
        r.inTime1||"", r.outTime1||"", r.inTime2||"", r.outTime2||"",
        lbMins > 0 ? fmtHM(lbMins) : "",
        fmtTotal(r.totalHours),
        lateStr,
        (r.overtimeHours||0) > 0 ? (r.overtimeHours as number).toFixed(1) : "",
        (r as any).holidayWorked ? `Holiday OT ×${(r as any).holidayMultiplier ?? ""} (${(r as any).holidayName || "Holiday"})` : "",
      ];
    });
    const safeMonth = `${getMonthName(month)}-${year}`;
    exportCsv(HEADERS, rows, `attendance-${selectedEmp.employeeId}-${safeMonth}.csv`);
  }


  const selectedEmps = useMemo(() => empIds.map(id => employees.find((e: any) => String(e.id) === id)).filter(Boolean), [employees, empIds]);

  // Night Watcher detection for selected employee
  const empShiftNameForRule = useMemo(() => {
    if (!selectedEmp) return null;
    return shiftOptions.find((s: any) => s.id === (selectedEmp as any).shiftId)?.name ?? null;
  }, [selectedEmp, shiftOptions]);
  const empRuleForNW = useMemo(() => {
    if (!selectedEmp) return null;
    return clientFindRule(hrRules, (selectedEmp as any).department ?? "", empShiftNameForRule);
  }, [selectedEmp, hrRules, empShiftNameForRule]);
  const isNightWatcher = !!(
    empRuleForNW?.nightWatcherPayroll ||
    /night\s*watcher/i.test((selectedEmp as any)?.designation || "") ||
    /night\s*watcher/i.test(empShiftNameForRule || "")
  );
  const nwOtInfo = useMemo((): { rate: number; hasValidBasic: boolean } => {
    if (!isNightWatcher) return { rate: 0, hasValidBasic: false };
    const empId = String((selectedEmp as any)?.id ?? "");
    const designation = (selectedEmp as any)?.designation ?? "";
    // Priority 1: salary structure assignment
    if (empStructBasic !== null) {
      return { rate: Math.round((empStructBasic / 240 * 1.5) * 100) / 100, hasValidBasic: true };
    }
    // Priority 2: payroll settings override or salary scale
    if (payrollCfg) {
      const fromOverride = payrollCfg.employeeOverrides[empId];
      if (fromOverride !== undefined) {
        return { rate: Math.round((fromOverride / 240 * 1.5) * 100) / 100, hasValidBasic: true };
      }
      const fromScale = payrollCfg.salaryScale[designation];
      if (fromScale !== undefined) {
        return { rate: Math.round((fromScale / 240 * 1.5) * 100) / 100, hasValidBasic: true };
      }
    }
    // No valid basic salary found
    return { rate: 0, hasValidBasic: false };
  }, [isNightWatcher, selectedEmp, payrollCfg, empStructBasic]);
  const nwOtRate = nwOtInfo.rate;
  const nwHasValidBasic = nwOtInfo.hasValidBasic;

  const isOffSeasonInd = useOffSeasonStatus(month, year);

  return (
    <div className="space-y-4">
      <SeasonBadge month={month} year={year} />
      <Card className="p-0 overflow-visible">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30 rounded-t-xl">
          <span className="text-sm font-semibold text-foreground">Individual Monthly Report</span>
          <div className="flex items-center gap-2">
            <ExcelIconButton onClick={handleExportExcel} />
            <PdfIconButton onClick={handleGenerateAllPdfs} />
          </div>
        </div>
        <div className="p-4 space-y-4 overflow-visible relative">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-start">
            <div>
              <Label className="text-xs">Department</Label>
              <Select value={deptFilter} onChange={e => { setDeptFilter(e.target.value); setEmpIds([]); setActiveEmpId(""); setShowReport(false); }}>
                <option value="">— All Departments —</option>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </Select>
            </div>
            <div>
              <Label className="text-xs">Employee(s)</Label>
              <MultiEmployeeSelect employees={filteredEmployees} selectedIds={empIds} onChange={ids => { setEmpIds(ids); setShowReport(false); }} loading={empLoading} />
            </div>
            <div>
              <Label className="text-xs">Month</Label>
              <Select value={month} onChange={e => { setMonth(Number(e.target.value)); setShowReport(false); }}>
                {Array.from({length:12},(_,i)=><option key={i+1} value={i+1}>{getMonthName(i+1)}</option>)}
              </Select>
            </div>
            <div>
              <Label className="text-xs">Year</Label>
              <Select value={year} onChange={e => { setYear(Number(e.target.value)); setShowReport(false); }}>
                {[2024,2025,2026,2027].map(y=><option key={y} value={y}>{y}</option>)}
              </Select>
            </div>
            <div className="flex gap-1.5 pt-5">
              <button
                disabled={empIds.length === 0}
                onClick={() => setShowReport(true)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all",
                  empIds.length > 0
                    ? "bg-primary text-white hover:bg-primary/90 shadow-sm active:scale-95"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                )}
              >
                <Eye className="w-3.5 h-3.5"/> View Report
              </button>
              <button
                disabled={empIds.length === 0 || generatingPdfs}
                onClick={handleGenerateAllPdfs}
                className={cn(
                  "flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap",
                  empIds.length > 0 && !generatingPdfs
                    ? "bg-[#E02B20] text-white hover:bg-[#C4241A] shadow-sm active:scale-95"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                )}
              >
                <Printer className="w-3.5 h-3.5"/>
                {generatingPdfs ? `Generating… (${empIds.length})` : empIds.length > 1 ? `Generate ${empIds.length} PDFs` : "Generate PDF"}
              </button>
            </div>
          </div>

          {empIds.length > 1 && (
            <div>
              <Label className="text-xs mb-1.5">Viewing Employee</Label>
              <div className="flex flex-wrap gap-1.5">
                {selectedEmps.map((e: any) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => { setActiveEmpId(String(e.id)); setShowReport(false); }}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                      String(e.id) === activeEmpId
                        ? "bg-primary text-white border-primary shadow-sm"
                        : "bg-card text-foreground border-border hover:border-primary/50 hover:text-primary"
                    )}
                  >
                    <div className="w-5 h-5 rounded-full bg-current/20 flex items-center justify-center text-[10px] font-bold shrink-0">
                      {(e.fullName || "?")[0].toUpperCase()}
                    </div>
                    {e.fullName}
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedEmp && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
              <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                {(selectedEmp.fullName||"?")[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-blue-900">{selectedEmp.fullName}</div>
                <div className="text-xs text-blue-600 truncate">{selectedEmp.employeeId} · {selectedEmp.designation} · {selectedEmp.department} · {selectedEmp.branchName}</div>
              </div>
              <div className="text-xs font-medium text-blue-700 bg-blue-100 px-2 py-1 rounded">{getMonthName(month)} {year}</div>
            </div>
          )}
        </div>
      </Card>

      {activeEmpId && showReport && (
        <>
          {summary && records.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-11 gap-2">
              {[
                {label:"Present",   val:summary.present,   cls:"text-green-600"},
                {label:"Absent",    val:summary.absent,    cls:"text-red-600"},
                {label:"Late Days", val:summary.late,      cls:"text-amber-600"},
                {label:"Half Day",  val:summary.halfDay,   cls:"text-yellow-600"},
                {label:"Leave",     val:summary.leave,     cls:"text-purple-600"},
                {label:"Holiday",   val:summary.holiday,   cls:"text-gray-500"},
                {label:"Day Off",   val:summary.offDay,    cls:"text-violet-600"},
                {label:"Work Hrs",  val:`${Math.floor(summary.totalHours)}:${String(Math.round((summary.totalHours%1)*60)).padStart(2,"0")}`, cls:"text-blue-600"},
                {label:"OT Hrs",    val:`${summary.totalOT.toFixed(1)}h`,                                                                     cls:"text-orange-600"},
                {label:"Late Min",  val:summary.totalLateMins>0?`${summary.totalLateMins}m`:"0",                                              cls:"text-red-500"},
                {label:"Att %",     val:`${summary.attPct}%`,                                                                                  cls:summary.attPct>=90?"text-green-600":summary.attPct>=75?"text-yellow-600":"text-red-600"},
              ].map(({label,val,cls})=>(
                <Card key={label} className="p-2 text-center">
                  <div className={cn("text-lg font-bold",cls)}>{val}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{label}</div>
                </Card>
              ))}
            </div>
          )}

          {isNightWatcher && !isLoading && records.length > 0 && (() => {
            // Show "not assigned" notice if salary structure hasn't loaded yet or is missing
            if (!empStructLoaded) return null;
            if (!nwHasValidBasic) {
              return (
                <Card className="overflow-hidden">
                  <div className="px-4 py-3 border-b border-border bg-amber-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-amber-900">Night Watcher OT Summary</span>
                    </div>
                    <span className="text-[10px] text-amber-600">Normal: 3 hrs · Holiday: 11 hrs (8+3) · Cap: 11 hrs</span>
                  </div>
                  <div className="p-6 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
                      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
                      Salary structure not assigned — OT amount cannot be calculated. Please assign a salary structure to this employee.
                    </div>
                  </div>
                </Card>
              );
            }

            // Build a full calendar map: date → record (API synthesises absent rows for all days)
            const recMap = new Map(records.map((r: any) => [r.date, r]));
            const calRows: { date: string; dow: number; r: any | null }[] = [];
            for (let d = 1; d <= daysInMonth; d++) {
              const dateStr = `${year}-${String(month).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
              const dow = new Date(dateStr + "T00:00:00Z").getUTCDay();
              calRows.push({ date: dateStr, dow, r: recMap.get(dateStr) ?? null });
            }
            return (
            <Card className="overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-amber-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-amber-900">Night Watcher OT Summary</span>
                  <span className="text-[10px] text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded font-mono">
                    OT Rate = Basic / 240 × 1.5 = Rs. {nwOtRate.toFixed(2)} / hr
                  </span>
                </div>
                <span className="text-[10px] text-amber-600">Normal: 3 hrs · Holiday: 11 hrs (8+3) · Cap: 11 hrs</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-muted-foreground w-8">#</th>
                      <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Date</th>
                      <th className="px-3 py-2 text-right font-semibold text-orange-600">OT Hours</th>
                      <th className="px-3 py-2 text-right font-semibold text-blue-600">OT Rate</th>
                      <th className="px-3 py-2 text-right font-semibold text-emerald-700">Amount</th>
                      <th className="px-3 py-2 text-left font-semibold text-red-600">Absence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {calRows.filter(({ r }) => {
                      const ot = r ? (r.overtimeHours || 0) : 0;
                      return ot > 0;
                    }).map(({ date, dow, r }, idx) => {
                      const ot = r ? (r.overtimeHours || 0) : 0;
                      const isHol = r ? !!r.holidayWorked : false;
                      const amount = Math.round(ot * nwOtRate * 100) / 100;
                      const rowCls = isHol ? "bg-blue-50" : "hover:bg-muted/20";
                      return (
                        <tr key={date} className={rowCls}>
                          <td className="px-3 py-1.5 text-muted-foreground font-mono">{idx + 1}</td>
                          <td className="px-3 py-1.5 font-mono whitespace-nowrap">
                            {date}
                            <span className="ml-1.5 text-muted-foreground text-[10px]">{DAY_NAMES[dow]}</span>
                          </td>
                          <td className="px-3 py-1.5 text-right font-mono font-semibold">
                            <span className={isHol ? "text-blue-700" : "text-orange-600"}>{ot.toFixed(1)}</span>
                          </td>
                          <td className="px-3 py-1.5 text-right font-mono text-blue-600">{nwOtRate.toFixed(2)}</td>
                          <td className="px-3 py-1.5 text-right font-mono font-semibold">
                            <span className={isHol ? "text-blue-700" : "text-emerald-700"}>{amount.toLocaleString("en-LK", { minimumFractionDigits: 2 })}</span>
                          </td>
                          <td className="px-3 py-1.5">
                            {isHol ? <span className="text-[10px] text-blue-700">Holiday worked</span> : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-muted/70">
                    <tr>
                      <td colSpan={2} className="px-3 py-2 text-xs font-bold">TOTAL</td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-orange-600">{summary.totalOT.toFixed(1)}</td>
                      <td className="px-3 py-2"></td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-emerald-700">
                        {(Math.round(summary.totalOT * nwOtRate * 100) / 100).toLocaleString("en-LK", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        Abs: <span className="font-semibold text-red-600">{summary.absent}</span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
            );
          })()}

          <Card className="overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Loading attendance data…</div>
            ) : records.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">No attendance records found for {getMonthName(month)} {year}.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground w-8">#</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground">Day</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground">Date</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground">Status</th>
                      <th className="px-3 py-2.5 text-center font-semibold text-blue-600 bg-blue-50/50" colSpan={2}>1st Session</th>
                      <th className="px-3 py-2.5 text-center font-semibold text-orange-600 bg-orange-50/50" colSpan={2}>2nd Session</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-purple-600 bg-purple-50/50">Lunch</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-green-700 bg-green-50/50">Total Hrs</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-red-500">Late</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-orange-600">OT</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground">Remarks</th>
                    </tr>
                    <tr className="border-b border-border">
                      <th className="px-3 py-1" colSpan={4}></th>
                      <th className="px-3 py-1 text-xs font-medium text-blue-500 bg-blue-50/30 text-center">In</th>
                      <th className="px-3 py-1 text-xs font-medium text-blue-500 bg-blue-50/30 text-center">Out</th>
                      <th className="px-3 py-1 text-xs font-medium text-orange-500 bg-orange-50/30 text-center">In</th>
                      <th className="px-3 py-1 text-xs font-medium text-orange-500 bg-orange-50/30 text-center">Out</th>
                      <th className="px-3 py-1 bg-purple-50/30"></th>
                      <th className="px-3 py-1 bg-green-50/30"></th>
                      <th className="px-3 py-1" colSpan={3}></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(() => {
                      const recMap = new Map(records.map((r: any) => [r.date, r]));
                      const offDaysList = selectedEmp ? (empOffDays.get(Number(selectedEmp.id)) || []) : [];
                      return Array.from({length: daysInMonth}, (_, i) => {
                        const d = i + 1;
                        const dateStr = `${year}-${String(month).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
                        const dow = new Date(dateStr + "T00:00:00Z").getUTCDay();
                        const dayName = DAY_NAMES[dow];
                        const r = recMap.get(dateStr);
                        const isWeekend = dow === 0 || dow === 6;
                        const isOff = offDaysList.includes(dow);
                        if (!r) {
                          return (
                            <tr key={dateStr} className={cn("transition-colors", isOff ? "bg-violet-50/60" : isWeekend ? "bg-slate-50/60" : "")}>
                              <td className="px-3 py-2 font-mono text-muted-foreground">{d}</td>
                              <td className="px-3 py-2 text-muted-foreground">{dayName}</td>
                              <td className="px-3 py-2 font-mono text-muted-foreground">{dateStr}</td>
                              {isOff ? (
                                <td className="px-3 py-2" colSpan={10}><span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-violet-100 text-violet-700">WEEK OFF</span></td>
                              ) : (
                                <td className="px-3 py-2" colSpan={10}><span className="text-muted-foreground text-[10px]">No record</span></td>
                              )}
                            </tr>
                          );
                        }
                        const lm = (r.morningLateMinutes || 0) + (r.lunchLateMinutes || 0);
                        const lbMins = (() => {
                          if (!r.outTime1 || !r.inTime2) return 0;
                          const [oh,om] = r.outTime1.split(":").map(Number);
                          const [ih,im] = r.inTime2.split(":").map(Number);
                          return Math.max(0,(ih*60+im)-(oh*60+om));
                        })();
                        return (
                          <tr key={dateStr} className="hover:bg-muted/30 transition-colors">
                            <td className="px-3 py-2 font-mono text-muted-foreground">{d}</td>
                            <td className="px-3 py-2 font-medium">{dayName}</td>
                            <td className="px-3 py-2 font-mono whitespace-nowrap">{dateStr}</td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <span className={cn("px-2 py-0.5 rounded text-[10px] font-semibold", statusColor(r.status))}>
                                {fmtStatus(r.status)}
                              </span>
                            </td>
                            <td className="px-3 py-2 font-mono text-blue-700 bg-blue-50/20">{r.inTime1||"—"}</td>
                            <td className="px-3 py-2 font-mono text-blue-700 bg-blue-50/20">{r.outTime1||"—"}</td>
                            <td className="px-3 py-2 font-mono text-orange-700 bg-orange-50/20">{r.inTime2||"—"}</td>
                            <td className="px-3 py-2 font-mono text-orange-700 bg-orange-50/20">{r.outTime2||"—"}</td>
                            <td className="px-3 py-2 bg-purple-50/20">
                              {lbMins>0 ? <span className="text-purple-700">{fmtHM(lbMins)}</span> : <span className="text-muted-foreground">—</span>}
                            </td>
                            <td className="px-3 py-2 font-semibold text-green-700 bg-green-50/20 font-mono">
                              {r.totalHours!=null ? fmtTotal(r.totalHours)+" hrs" : "—"}
                            </td>
                            <td className="px-3 py-2">
                              {lm > 0 ? (
                                <span className="text-red-500 font-semibold">{lm < 60 ? `${lm}m` : fmtHM(lm)}</span>
                              ) : <span className="text-muted-foreground">—</span>}
                            </td>
                            <td className="px-3 py-2 font-mono">
                              {(r.overtimeHours||0) > 0
                                ? <span className="text-orange-600 font-semibold">{r.overtimeHours.toFixed(1)}h</span>
                                : <span className="text-muted-foreground">—</span>}
                            </td>
                            <td className="px-3 py-2 text-[10px] text-muted-foreground">
                              {(r as any).holidayWorked
                                ? <span className="text-amber-700">Holiday OT ×{(r as any).holidayMultiplier ?? ""} — {(r as any).holidayName || "Holiday"}</span>
                                : "—"}
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {empIds.length === 0 && (
        <Card className="p-12 text-center">
          <FileText className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3"/>
          <div className="text-sm font-medium text-muted-foreground">Select one or more employees above, then click View Report</div>
          <div className="text-xs text-muted-foreground/60 mt-1">You can select multiple employees and switch between their reports. Use Generate PDF to export.</div>
        </Card>
      )}
    </div>
  );
}
