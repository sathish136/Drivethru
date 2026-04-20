import { useState, useEffect, useMemo, useRef } from "react";
import { useGetAttendanceReport, useGetMonthlyReport, useGetOvertimeReport, useListBranches, useListEmployees } from "@workspace/api-client-react";
import { PageHeader, Card, Input, Select, Label } from "@/components/ui";
import { cn } from "@/lib/utils";
import { Users, Clock, Calendar, Banknote, FileText, ChevronDown, X, Eye, Printer } from "lucide-react";
import drivethruLogo from "@/assets/drivethru-logo.png";
import liveuLogo from "@/assets/liveu-logo.png";
import html2pdf from "html2pdf.js";

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
function useHrRules() {
  const [rules, setRules] = useState<DeptShiftRule[]>([]);
  const [shifts, setShifts] = useState<{ id: number; name: string }[]>([]);
  useEffect(() => {
    const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
    const token = localStorage.getItem("auth_token") || "";
    const authOpts = { credentials: "include" as const, headers: { Authorization: `Bearer ${token}` } };
    Promise.all([
      fetch(`${BASE}/api/hr-settings`, authOpts).then(r => r.json()),
      fetch(`${BASE}/api/shifts`, authOpts).then(r => r.json()),
    ]).then(([hrData, shiftsData]) => {
      if (Array.isArray(hrData.departmentRules)) setRules(hrData.departmentRules as DeptShiftRule[]);
      if (Array.isArray(shiftsData)) setShifts(shiftsData);
    }).catch(() => {});
  }, []);
  return { rules, shifts };
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
  const metaHtml = meta.map(m =>
    `<div class="meta-item"><span class="meta-label">${m.label}</span><span class="meta-value">${m.value}</span></div>`
  ).join("");
  const wrapper = document.createElement("div");
  wrapper.style.cssText = "position:absolute;top:0;left:-9999px;width:1123px;background:#fff";
  wrapper.innerHTML = `<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body,div{font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;background:#fff;font-size:10.5px}
  .header{display:flex;align-items:center;justify-content:space-between;padding:16px 24px 12px;border-bottom:3px solid #1565a8;background:#f5f8ff}
  .header-left{display:flex;align-items:center;gap:12px}
  .header-logo{width:46px;height:46px;object-fit:contain;border-radius:12px;background:#fff;padding:4px;box-shadow:0 2px 8px rgba(0,0,0,.1)}
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
  </style>
  <div class="header">
    <div class="header-left">
      <img src="${drivethruLogo}" class="header-logo" alt="Drivethru"/>
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
      <img src="${liveuLogo}" class="footer-liveu" alt="Live U Pvt Ltd"/>
      <span class="footer-liveu-name">Live U Pvt Ltd</span>
    </div>
  </div>`;
  document.body.appendChild(wrapper);
  try {
    await html2pdf().set({
      margin: 8,
      filename: filename || `${title.replace(/\s+/g, "-")}.pdf`,
      image: { type: "jpeg", quality: 0.97 },
      html2canvas: { scale: 2, useCORS: true, allowTaint: true, logging: false, scrollX: 0, scrollY: 0 },
      jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
    }).from(wrapper).save();
  } finally {
    document.body.removeChild(wrapper);
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

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = useMemo(() =>
    employees.filter(e =>
      !search ||
      (e.fullName || "").toLowerCase().includes(search.toLowerCase()) ||
      (e.employeeId || "").toLowerCase().includes(search.toLowerCase())
    ), [employees, search]);

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
              autoFocus
              type="text"
              placeholder="Search by name or ID…"
              value={search}
              onChange={e => setSearch(e.target.value)}
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
  const [tab, setTab] = useState<Tab>("attendance");
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
      {tab==="monthly"    && <MonthlyReport/>}
      {tab==="individual" && <IndividualReport/>}
      {tab==="overtime"   && <OvertimeReport/>}
      {tab==="payroll"    && <PayrollReport/>}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   ATTENDANCE REPORT
══════════════════════════════════════════════════════════ */
function AttendanceReport() {
  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const [startDate, setStartDate]   = useState(prevMonth.toISOString().split("T")[0]);
  const [endDate, setEndDate]       = useState(now.toISOString().split("T")[0]);
  const [branchId, setBranchId]     = useState("");
  const [status, setStatus]         = useState("");
  const [empType, setEmpType]       = useState("");
  const [department, setDepartment] = useState("");
  const [empName, setEmpName]       = useState("");

  const dStart   = useDebounce(startDate, 400);
  const dEnd     = useDebounce(endDate, 400);
  const dBranch  = useDebounce(branchId, 200);
  const dStatus  = useDebounce(status, 200);

  const { rules: hrRules, shifts: shiftOptions } = useHrRules();

  const { data: branches } = useListBranches();
  const { data, isLoading } = useGetAttendanceReport({
    startDate: dStart, endDate: dEnd,
    ...(dBranch ? { branchId: Number(dBranch) } : {}),
    ...(dStatus ? { status: dStatus } : {}),
  });

  function getRemarks(r: any): string {
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

  const filtered = useMemo(() => (data?.records || []).filter((r: any) =>
    (!empType || r.employeeType === empType)
    && (!department || r.department === department)
    && (!empName || (r.employeeName || "").toLowerCase().includes(empName.toLowerCase()))
  ), [data, empType, department, empName]);

  const HEADERS = ["Date","Emp ID","Employee","Department","Branch","Designation","Status","In 1","Out 1 (Lunch)","In 2 (After Lunch)","Out 2","Lunch Break","Total Hrs","Late","OT Hrs","Remarks"];

  function calcMins(inT: string|null, outT: string|null): number {
    if (!inT || !outT) return 0;
    const [ih,im] = inT.split(":").map(Number);
    const [oh,om] = outT.split(":").map(Number);
    return Math.max(0, (oh*60+om)-(ih*60+im));
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

  const handleExport = async () => {
    const present  = filtered.filter((r: any) => r.status === "present" || r.status === "late").length;
    const absent   = filtered.filter((r: any) => r.status === "absent").length;
    const late     = filtered.filter((r: any) => r.status === "late").length;
    const halfDay  = filtered.filter((r: any) => r.status === "half_day").length;
    const leave    = filtered.filter((r: any) => r.status === "leave").length;
    const holiday  = filtered.filter((r: any) => r.status === "holiday").length;
    const offDay   = filtered.filter((r: any) => r.status === "off_day").length;
    const thead = `<tr>${HEADERS.map(h=>`<th>${h}</th>`).join("")}</tr>`;
    const tbody = filtered.map((r: any) => {
      const s1m = calcMins(r.inTime1, r.outTime1);
      const s2m = calcMins(r.inTime2, r.outTime2);
      const lb  = lunchBreakMins(r);
      const session1 = r.inTime1&&r.outTime1 ? `${r.inTime1} → ${r.outTime1} = ${fmtHM(s1m)}` : "—";
      const session2 = r.inTime2&&r.outTime2 ? `${r.inTime2} → ${r.outTime2} = ${fmtHM(s2m)}` : "—";
      const lbStr = lb>0 ? fmtHM(lb) : "—";
      const tot = r.totalHours!=null ? fmtTotal(r.totalHours) : "—";
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
      const remarks = getRemarks(r);
      const statusLabel = r.status==="late"?"PRESENT (LATE)":r.status==="half_day"?"HALF DAY":r.status==="off_day"?"DAY OFF":r.status.replace("_"," ").toUpperCase();
      return `<tr>
        <td>${r.date}</td><td>${r.employeeCode}</td><td>${r.employeeName}</td>
        <td>${r.department||""}</td><td>${r.branchName}</td><td>${r.designation||""}</td>
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
      title: "Attendance Report",
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
    const rows = filtered.map((r: any) => {
      const s1m = calcMins(r.inTime1, r.outTime1);
      const s2m = calcMins(r.inTime2, r.outTime2);
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
        r.designation||"", r.status==="late"?"PRESENT (LATE)":r.status==="half_day"?"HALF DAY":r.status==="off_day"?"DAY OFF":r.status.replace("_"," ").toUpperCase(),
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

  return (
    <div className="space-y-4">
      <FilterCard title="Attendance Report Filters" onExport={handleExport} onExportExcel={handleExportExcel}>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <div><Label className="text-xs">Start Date</Label>
            <Input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)}/></div>
          <div><Label className="text-xs">End Date</Label>
            <Input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)}/></div>
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
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
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

      <Card className="overflow-hidden">
        {isLoading ? <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr>
                  {["Date","Emp ID","Employee","Department","Branch","Designation","Status"].map(h=>(
                    <th key={h} className="px-3 py-2.5 text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                  <th className="px-3 py-2.5 text-center font-semibold text-blue-600 whitespace-nowrap bg-blue-50/50" colSpan={2}>Morning Session</th>
                  <th className="px-3 py-2.5 text-center font-semibold text-orange-600 whitespace-nowrap bg-orange-50/50" colSpan={2}>Afternoon Session</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-purple-600 whitespace-nowrap bg-purple-50/50">Lunch Break</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-green-700 whitespace-nowrap bg-green-50/50">Total Hrs</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground whitespace-nowrap">OT Hrs</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-indigo-600 whitespace-nowrap bg-indigo-50/30">Remarks</th>
                </tr>
                <tr className="border-b border-border">
                  {["Date","Emp ID","Employee","Department","Branch","Designation","Status"].map(h=>(
                    <th key={h} className="px-3 py-1"></th>
                  ))}
                  <th className="px-3 py-1 text-xs font-medium text-blue-500 bg-blue-50/30 text-center">In</th>
                  <th className="px-3 py-1 text-xs font-medium text-blue-500 bg-blue-50/30 text-center">Out (Lunch)</th>
                  <th className="px-3 py-1 text-xs font-medium text-orange-500 bg-orange-50/30 text-center">In</th>
                  <th className="px-3 py-1 text-xs font-medium text-orange-500 bg-orange-50/30 text-center">Out</th>
                  <th className="px-3 py-1 bg-purple-50/30"></th>
                  <th className="px-3 py-1 bg-green-50/30"></th>
                  <th className="px-3 py-1"></th>
                  <th className="px-3 py-1 bg-indigo-50/20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.slice(0,300).map((r:any)=>{
                  const s1m = calcMins(r.inTime1, r.outTime1);
                  const s2m = calcMins(r.inTime2, r.outTime2);
                  const lb  = lunchBreakMins(r);
                  const hasSession2 = r.inTime2 && r.outTime2;
                  const totalMins = s1m + s2m;
                  const totalH = Math.floor(totalMins/60), totalMin = totalMins%60;
                  return (
                  <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-2 font-mono whitespace-nowrap">{r.date}</td>
                    <td className="px-3 py-2 font-mono whitespace-nowrap text-muted-foreground">{r.employeeCode}</td>
                    <td className="px-3 py-2 font-medium whitespace-nowrap">{r.employeeName}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{r.department||"—"}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{r.branchName}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{r.designation||"—"}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex flex-col gap-0.5">
                        <span className={cn("px-2 py-0.5 rounded text-xs font-medium",STATUS_COLORS[r.status]||"bg-gray-100")}>
                          {fmtStatus(r.status)}
                        </span>
                        {r.status === "late" && r.inTime1 && (() => {
                          const lm = calcLateMinutes(r.inTime1);
                          if (lm <= 0) return null;
                          const display = lm >= 60
                            ? `+${Math.floor(lm/60)}h ${lm%60}m late`
                            : `+${lm}m late`;
                          return (
                            <span className="text-[10px] font-semibold text-red-500 text-center">
                              {display}
                            </span>
                          );
                        })()}
                      </div>
                    </td>
                    <td className="px-3 py-2 font-mono whitespace-nowrap text-blue-700 bg-blue-50/20">
                      {r.inTime1||"—"}
                    </td>
                    <td className="px-3 py-2 bg-blue-50/20 whitespace-nowrap">
                      {r.inTime1&&r.outTime1 ? (
                        <div className="font-mono text-blue-700">{r.outTime1}</div>
                      ) : <span className="text-muted-foreground">—</span>}
                      {s1m>0&&<div className="text-[10px] text-blue-500 font-medium">{fmtHM(s1m)}</div>}
                    </td>
                    <td className="px-3 py-2 font-mono whitespace-nowrap text-orange-700 bg-orange-50/20">
                      {r.inTime2||"—"}
                    </td>
                    <td className="px-3 py-2 bg-orange-50/20 whitespace-nowrap">
                      {r.inTime2&&r.outTime2 ? (
                        <div className="font-mono text-orange-700">{r.outTime2}</div>
                      ) : <span className="text-muted-foreground">—</span>}
                      {s2m>0&&<div className="text-[10px] text-orange-500 font-medium">{fmtHM(s2m)}</div>}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap bg-purple-50/20">
                      {lb>0 ? (
                        <span className="text-purple-700 font-medium">{fmtHM(lb)}</span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap bg-green-50/20">
                      {r.totalHours!=null ? (
                        <div>
                          {s1m>0&&<div className="text-[10px] text-muted-foreground">{r.inTime1} → {r.outTime1} = {fmtHM(s1m)}</div>}
                          {s2m>0&&<div className="text-[10px] text-muted-foreground">{r.inTime2} → {r.outTime2} = {fmtHM(s2m)}</div>}
                          <div className="font-semibold text-green-700 text-xs">✅ {totalH}:{String(totalMin).padStart(2,"0")} hrs</div>
                        </div>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-2 font-mono whitespace-nowrap">{r.overtimeHours>0?`${r.overtimeHours.toFixed(1)}h`:"—"}</td>
                    <td className="px-3 py-2 bg-indigo-50/10 max-w-[220px]">
                      {(() => {
                        const rm = getRemarks(r);
                        return rm ? (
                          <span className="text-[10px] leading-snug text-indigo-700 block" title={rm}>{rm}</span>
                        ) : <span className="text-muted-foreground text-[10px]">—</span>;
                      })()}
                    </td>
                  </tr>
                  );
                })}
                {!filtered.length&&<tr><td colSpan={15} className="text-center py-8 text-muted-foreground">No records found for the selected filters.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MONTHLY REPORT
══════════════════════════════════════════════════════════ */
function MonthlyReport() {
  const now = new Date();
  const [month, setMonth]           = useState(now.getMonth()+1);
  const [year, setYear]             = useState(now.getFullYear());
  const [branchId, setBranchId]     = useState("");
  const [empType, setEmpType]       = useState("");
  const [department, setDepartment] = useState("");
  const [empName, setEmpName]       = useState("");

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
    && (!empName || (e.employeeName || "").toLowerCase().includes(empName.toLowerCase()))
  ), [data, empType, department, empName]);

  const HEADERS = ["Emp ID","Employee","Department","Branch","Designation","Type","Present","Absent","Late (AM)","Lunch Late Days","Half Day","Leave","Holiday","Day Off","Work Hrs","OT Hrs","Late (AM) Min","Lunch Late Min","Att %","Remarks"];

  const handleExport = async () => {
    const thead = `<tr>${HEADERS.map(h=>`<th>${h}</th>`).join("")}</tr>`;
    const tbody = filtered.map((e: any) => `<tr>
      <td>${e.employeeCode}</td><td>${e.employeeName}</td><td>${e.department||""}</td>
      <td>${e.branchName}</td><td>${e.designation}</td><td>${e.employeeType||""}</td>
      <td>${e.presentDays}</td><td>${e.absentDays}</td><td>${e.lateDays}</td>
      <td>${e.lunchLateDays||0}</td><td>${e.halfDays}</td><td>${e.leaveDays}</td>
      <td>${e.holidayDays}</td><td>${e.offDays||0}</td>
      <td>${e.totalWorkHours.toFixed(1)}h</td><td>${e.overtimeHours.toFixed(1)}h</td>
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
      e.holidayDays, e.offDays||0,
      e.totalWorkHours.toFixed(1), e.overtimeHours.toFixed(1),
      e.totalMorningLateMinutes||0, e.totalLunchLateMinutes||0,
      `${e.attendancePercentage}%`,
      getEmpRemarks(e),
    ]);
    exportCsv(HEADERS, rows, `monthly-report-${getMonthName(dMonth)}-${dYear}.csv`);
  };

  return (
    <div className="space-y-4">
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
                  {HEADERS.filter(h => h !== "Remarks").map(h=><th key={h} className="px-3 py-2.5 text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>)}
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
                    <td className="px-3 py-2 text-center whitespace-nowrap text-violet-600 font-semibold">{e.offDays||0}</td>
                    <td className="px-3 py-2 text-center font-mono whitespace-nowrap">{e.totalWorkHours.toFixed(1)}h</td>
                    <td className="px-3 py-2 text-center font-mono whitespace-nowrap text-amber-600">{e.overtimeHours.toFixed(1)}h</td>
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
                {!filtered.length&&<tr><td colSpan={20} className="text-center py-8 text-muted-foreground">No data available for the selected period.</td></tr>}
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
function OvertimeReport() {
  const now = new Date();
  const [startDate, setStartDate] = useState(new Date(now.getFullYear(),now.getMonth(),1).toISOString().split("T")[0]);
  const [endDate, setEndDate]     = useState(now.toISOString().split("T")[0]);
  const [branchId, setBranchId]   = useState("");
  const [empType, setEmpType]     = useState("");
  const [empName, setEmpName]     = useState("");

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
    && (!empName || (e.employeeName || "").toLowerCase().includes(empName.toLowerCase()))
  ), [data, empType, empName]);

  const totalOT = filtered.reduce((s: number, e: any) => s + e.totalOvertimeHours, 0);

  const HEADERS = ["Emp ID","Employee","Branch","Designation","Type","OT Days","Total OT Hrs","Daily Breakdown"];

  const handleExport = async () => {
    const thead = `<tr>${HEADERS.map(h=>`<th>${h}</th>`).join("")}</tr>`;
    const tbody = filtered.map((e: any) => `<tr>
      <td>${e.employeeCode}</td><td>${e.employeeName}</td><td>${e.branchName}</td>
      <td>${e.designation}</td><td>${e.employeeType||""}</td>
      <td>${e.overtimeDays}</td><td>${e.totalOvertimeHours.toFixed(1)}h</td>
      <td>${e.records.slice(0,5).map((r:any)=>`${r.date}: ${r.overtimeHours.toFixed(1)}h`).join(" | ")}</td>
    </tr>`).join("");
    printReport({
      title: "Overtime Report",
      meta: [
        { label:"Period",           value:`${dStart} – ${dEnd}` },
        { label:"Total OT Hours",   value:`${totalOT.toFixed(1)}h` },
        { label:"Employees with OT",value:String(filtered.length) },
        { label:"Branch",           value:dBranch?(branches?.find(b=>String(b.id)===dBranch)?.name||"—"):"All Branches" },
      ],
      tableHtml: `<table><thead>${thead}</thead><tbody>${tbody}</tbody></table>`,
    });
  };

  const handleExportExcel = () => {
    const rows = filtered.map((e: any) => [
      e.employeeCode, e.employeeName, e.branchName, e.designation, e.employeeType||"",
      e.overtimeDays, e.totalOvertimeHours.toFixed(1),
      e.records.map((r: any) => `${r.date}: ${r.overtimeHours.toFixed(1)}h`).join(" | "),
    ]);
    exportCsv(HEADERS, rows, `overtime-report-${dStart}-${dEnd}.csv`);
  };

  return (
    <div className="space-y-4">
      <FilterCard title="Overtime Report Filters" onExport={handleExport} onExportExcel={handleExportExcel}>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <div><Label className="text-xs">Start Date</Label>
            <Input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)}/></div>
          <div><Label className="text-xs">End Date</Label>
            <Input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)}/></div>
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
        <Card className="p-3 flex gap-6 text-sm border-amber-200 bg-amber-50/30">
          <div><span className="text-muted-foreground">Total OT Hours: </span><strong className="text-amber-700">{totalOT.toFixed(1)}h</strong></div>
          <div><span className="text-muted-foreground">Employees with OT: </span><strong>{filtered.length}</strong></div>
        </Card>
      )}

      <Card className="overflow-hidden">
        {isLoading ? <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr>{HEADERS.map(h=><th key={h} className="px-3 py-2.5 text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((e:any)=>(
                  <tr key={e.employeeId} className="hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-2 font-mono whitespace-nowrap text-muted-foreground">{e.employeeCode}</td>
                    <td className="px-3 py-2 font-medium whitespace-nowrap">{e.employeeName}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{e.branchName}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{e.designation}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {e.employeeType?<span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium capitalize",
                        e.employeeType==="permanent"?"bg-blue-100 text-blue-700":e.employeeType==="contract"?"bg-purple-100 text-purple-700":"bg-orange-100 text-orange-700"
                      )}>{e.employeeType}</span>:"—"}
                    </td>
                    <td className="px-3 py-2 text-center whitespace-nowrap font-semibold text-amber-600">{e.overtimeDays}</td>
                    <td className="px-3 py-2 text-center whitespace-nowrap font-bold text-amber-700">{e.totalOvertimeHours.toFixed(1)}h</td>
                    <td className="px-3 py-2 whitespace-nowrap text-muted-foreground text-[10px]">
                      {e.records.slice(0,3).map((r:any)=>`${r.date}: ${r.overtimeHours.toFixed(1)}h`).join(" | ")}
                      {e.records.length>3&&` +${e.records.length-3} more`}
                    </td>
                  </tr>
                ))}
                {!filtered.length&&<tr><td colSpan={8} className="text-center py-8 text-muted-foreground">No overtime records found for this period.</td></tr>}
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

function PayrollReport() {
  const now = new Date();
  const [month, setMonth]     = useState(now.getMonth()+1);
  const [year, setYear]       = useState(now.getFullYear());
  const [empType, setEmpType] = useState("");
  const [status, setStatus]   = useState("");
  const [empName, setEmpName] = useState("");
  const [data, setData]       = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(false);

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
    && (!empName || (r.employee.fullName || "").toLowerCase().includes(empName.toLowerCase()))
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

  const { data: empData, isLoading: empLoading } = useListEmployees({ limit: 1000 });
  const { rules: hrRules, shifts: shiftOptions } = useHrRules();

  const employees = useMemo(() => {
    const list = (empData?.employees || []) as any[];
    return [...list].sort((a, b) => (a.fullName || "").localeCompare(b.fullName || ""));
  }, [empData]);

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
    { query: { enabled: !!activeEmpId && showReport } }
  );

  const records: any[] = useMemo(() => (data?.records || []).sort((a: any, b: any) => a.date.localeCompare(b.date)), [data]);

  function getRemarks(r: any): string {
    const shiftName = r.shiftName ?? shiftOptions.find((s: any) => s.id === Number(r.shiftId))?.name ?? null;
    const rule = clientFindRule(hrRules, r.department ?? "", shiftName);
    return rule?.remarks ?? "";
  }

  const summary = useMemo(() => {
    let present = 0, absent = 0, late = 0, halfDay = 0, leave = 0, holiday = 0, offDay = 0;
    let totalHours = 0, totalOT = 0, totalLateMins = 0;
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
      totalOT += r.overtimeHours || 0;
      totalLateMins += (r.morningLateMinutes || 0) + (r.lunchLateMinutes || 0);
    }
    const effectiveDays = daysInMonth - holiday - offDay;
    const attPct = effectiveDays > 0 ? Math.round(((present + halfDay * 0.5) / effectiveDays) * 100) : 0;
    return { present, absent, late, halfDay, leave, holiday, offDay, totalHours, totalOT, totalLateMins, attPct };
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
      const period = `${getMonthName(month)} ${year}`;
      const generated = new Date().toLocaleString("en-LK", { dateStyle: "long", timeStyle: "short" });
      const pagesHtml: string[] = [];

      for (const eid of empIds) {
        const emp = employees.find((e: any) => String(e.id) === eid);
        if (!emp) continue;

        let recs: any[] = [];
        try {
          const token = localStorage.getItem("auth_token") || "";
          const params = new URLSearchParams({ startDate, endDate, employeeId: eid });
          const res = await fetch(`${BASE}/api/reports/attendance?${params}`, {
            credentials: "include",
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const d = await res.json();
            recs = (d.records || []).sort((a: any, b: any) => a.date.localeCompare(b.date));
          } else {
            console.error(`Attendance fetch failed for employee ${eid}: ${res.status} ${res.statusText}`);
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
        let rowsHtml = "";
        for (let d = 1; d <= daysInMonth; d++) {
          const dateStr = `${year}-${String(month).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
          const dow = new Date(dateStr + "T00:00:00Z").getUTCDay();
          const dayName = DAY_NAMES[dow];
          const r = recMap.get(dateStr);
          if (!r) {
            rowsHtml += `<tr><td>${d}</td><td>${dayName}</td><td colspan="9" style="text-align:center;color:#ccc">—</td></tr>`;
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
          const otStr = (r.overtimeHours || 0) > 0 ? `${r.overtimeHours.toFixed(1)}h` : "—";
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
            <td>${lateStr}</td><td>${otStr}</td>
          </tr>`;
        }

        pagesHtml.push(`<div class="report-wrap">
<div class="header">
  <div class="header-left">
    <img src="${drivethruLogo}" class="header-logo" alt="Drivethru"/>
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
  <div class="emp-field"><div class="emp-label">Branch</div><div class="emp-value">${emp.branchName||emp.branch||"—"}</div></div>
  <div class="emp-field"><div class="emp-label">Period</div><div class="emp-value">${period}</div></div>
  <div class="emp-field"><div class="emp-label">Working Days</div><div class="emp-value">${daysInMonth}</div></div>
</div>
<div class="summary-bar">${sumCardsHtml}</div>
<table><thead><tr>
  <th>#</th><th>Day</th><th>Status</th>
  <th>In 1</th><th>Out 1 (Lunch)</th><th>In 2</th><th>Out 2</th>
  <th>Lunch Break</th><th>Total Hrs</th><th>Late</th><th>OT</th>
</tr></thead><tbody>${rowsHtml}</tbody></table>
<div class="footer">
  <div class="footer-note">System-generated report. For internal use only. © ${new Date().getFullYear()} Drivethru Pvt Ltd</div>
  <div class="footer-right">
    <span style="font-size:9px;color:#9ca3af">Powered by</span>
    <img src="${liveuLogo}" style="height:20px;object-fit:contain;opacity:.85" alt="Live U"/>
    <span class="footer-liveu-name">Live U Pvt Ltd</span>
  </div>
</div>
</div>`);
      }

      if (pagesHtml.length === 0) { alert("No data available for the selected employees."); return; }

      const wrapper = document.createElement("div");
      wrapper.style.cssText = "position:absolute;top:0;left:-9999px;width:1123px;background:#fff";
      wrapper.innerHTML = `<style>
  *{box-sizing:border-box;margin:0;padding:0}
  div,span,td,th{font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;font-size:10.5px}
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
  th{color:#fff;padding:7px 9px;text-align:left;font-size:8.5px;font-weight:600;white-space:nowrap;letter-spacing:.03em}
  td{padding:5px 9px;font-size:9px;border-bottom:1px solid #f0f0f0;white-space:nowrap}
  .footer{display:flex;align-items:center;justify-content:space-between;padding:10px 24px;border-top:1px solid #e5e7eb;background:#f5f8ff;margin-top:8px}
  .footer-note{font-size:8.5px;color:#9ca3af}
  .footer-right{display:flex;align-items:center;gap:6px}
  .footer-liveu-name{font-size:9.5px;font-weight:700;color:#1565a8}
  </style>${pagesHtml.join("")}`;
      document.body.appendChild(wrapper);
      const safeMonth = `${getMonthName(month)}-${year}`.replace(/\s+/g, "-");
      const outFile = empIds.length === 1
        ? `attendance-${employees.find((e: any) => String(e.id) === empIds[0])?.employeeId || "employee"}-${safeMonth}.pdf`
        : `attendance-all-${empIds.length}-employees-${safeMonth}.pdf`;
      try {
        await html2pdf().set({
          margin: 8,
          filename: outFile,
          image: { type: "jpeg", quality: 0.97 },
          html2canvas: { scale: 2, useCORS: true, allowTaint: true, logging: false, scrollX: 0, scrollY: 0 },
          jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
          pagebreak: { mode: ["css", "legacy"] },
        }).from(wrapper).save();
      } finally {
        document.body.removeChild(wrapper);
      }
    } finally {
      setGeneratingPdfs(false);
    }
  }

  function handleGeneratePdf() { handleGenerateAllPdfs(); }

  const selectedEmps = useMemo(() => empIds.map(id => employees.find((e: any) => String(e.id) === id)).filter(Boolean), [employees, empIds]);

  return (
    <div className="space-y-4">
      <Card className="p-0">
        <div className="px-4 py-3 border-b border-border bg-muted/30 rounded-t-xl">
          <span className="text-sm font-semibold text-foreground">Individual Monthly Report</span>
        </div>
        <div className="p-4 space-y-4 overflow-visible relative">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-start">
            <div>
              <Label className="text-xs">Employee(s)</Label>
              <MultiEmployeeSelect employees={employees} selectedIds={empIds} onChange={ids => { setEmpIds(ids); setShowReport(false); }} loading={empLoading} />
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
            <div className="flex gap-2 pt-5">
              <button
                disabled={empIds.length === 0}
                onClick={() => setShowReport(true)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
                  empIds.length > 0
                    ? "bg-primary text-white hover:bg-primary/90 shadow-sm active:scale-95"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                )}
              >
                <Eye className="w-4 h-4"/> View Report
              </button>
              <button
                disabled={empIds.length === 0 || generatingPdfs}
                onClick={handleGenerateAllPdfs}
                className={cn(
                  "flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap",
                  empIds.length > 0 && !generatingPdfs
                    ? "bg-[#E02B20] text-white hover:bg-[#C4241A] shadow-sm active:scale-95"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                )}
              >
                <Printer className="w-4 h-4"/>
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
                      <th className="px-3 py-2.5 text-center font-semibold text-blue-600 bg-blue-50/50" colSpan={2}>Morning Session</th>
                      <th className="px-3 py-2.5 text-center font-semibold text-orange-600 bg-orange-50/50" colSpan={2}>Afternoon Session</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-purple-600 bg-purple-50/50">Lunch</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-green-700 bg-green-50/50">Total Hrs</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-red-500">Late</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground">OT</th>
                    </tr>
                    <tr className="border-b border-border">
                      <th className="px-3 py-1" colSpan={4}></th>
                      <th className="px-3 py-1 text-xs font-medium text-blue-500 bg-blue-50/30 text-center">In</th>
                      <th className="px-3 py-1 text-xs font-medium text-blue-500 bg-blue-50/30 text-center">Out</th>
                      <th className="px-3 py-1 text-xs font-medium text-orange-500 bg-orange-50/30 text-center">In</th>
                      <th className="px-3 py-1 text-xs font-medium text-orange-500 bg-orange-50/30 text-center">Out</th>
                      <th className="px-3 py-1 bg-purple-50/30"></th>
                      <th className="px-3 py-1 bg-green-50/30"></th>
                      <th className="px-3 py-1" colSpan={2}></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(() => {
                      const recMap = new Map(records.map((r: any) => [r.date, r]));
                      return Array.from({length: daysInMonth}, (_, i) => {
                        const d = i + 1;
                        const dateStr = `${year}-${String(month).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
                        const dow = new Date(dateStr + "T00:00:00Z").getUTCDay();
                        const dayName = DAY_NAMES[dow];
                        const r = recMap.get(dateStr);
                        const isWeekend = dow === 0 || dow === 6;
                        if (!r) {
                          return (
                            <tr key={dateStr} className={cn("transition-colors", isWeekend ? "bg-slate-50/60" : "")}>
                              <td className="px-3 py-2 font-mono text-muted-foreground">{d}</td>
                              <td className="px-3 py-2 text-muted-foreground">{dayName}</td>
                              <td className="px-3 py-2 font-mono text-muted-foreground">{dateStr}</td>
                              <td className="px-3 py-2" colSpan={9}><span className="text-muted-foreground text-[10px]">No record</span></td>
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
                              {(r.overtimeHours||0)>0 ? <span className="text-orange-600 font-semibold">{r.overtimeHours.toFixed(1)}h</span> : <span className="text-muted-foreground">—</span>}
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
