import { useState, useEffect, useMemo } from "react";
import { useGetAttendanceReport, useGetMonthlyReport, useGetOvertimeReport, useListBranches } from "@workspace/api-client-react";
import { PageHeader, Card, Input, Select, Label } from "@/components/ui";
import { cn } from "@/lib/utils";
import { Users, Clock, Calendar, Banknote } from "lucide-react";
import drivethruLogo from "@/assets/drivethru-logo.png";
import liveuLogo from "@/assets/liveu-logo.png";

type Tab = "attendance" | "monthly" | "overtime" | "payroll";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
function apiUrl(path: string) { return `${BASE}/api${path}`; }

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const STATUS_COLORS: Record<string, string> = {
  present:  "bg-green-100 text-green-700",
  absent:   "bg-red-100 text-red-700",
  late:     "bg-amber-100 text-amber-700",
  half_day: "bg-yellow-100 text-yellow-700",
  leave:    "bg-purple-100 text-purple-700",
  holiday:  "bg-gray-100 text-gray-700",
};

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

/* ─── Print-to-PDF window ─── */
function printReport(opts: {
  title: string;
  meta: { label: string; value: string }[];
  tableHtml: string;
}) {
  const { title, meta, tableHtml } = opts;
  const metaHtml = meta.map(m =>
    `<div class="meta-item"><span class="meta-label">${m.label}</span><span class="meta-value">${m.value}</span></div>`
  ).join("");
  const w = window.open("", "_blank", "width=1200,height=850");
  if (!w) { alert("Please allow popups to export PDF."); return; }
  w.document.write(`<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"/>
<title>${title} – Drivethru</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;background:#fff;font-size:10.5px}
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
  .footer{display:flex;align-items:center;justify-content:space-between;padding:10px 24px;border-top:1px solid #e5e7eb;background:#f5f8ff;margin-top:auto}
  .footer-note{font-size:8.5px;color:#9ca3af}
  .footer-right{display:flex;align-items:center;gap:6px}
  .footer-powered{font-size:9px;color:#9ca3af}
  .footer-liveu{height:18px;object-fit:contain;opacity:.75}
  @media print{@page{margin:8mm;size:landscape} body{font-size:9px}}
</style>
</head><body>
<div class="header">
  <div class="header-left">
    <img src="${drivethruLogo}" class="header-logo" alt="Drivethru"/>
    <div>
      <div class="company">Drivethru Pvt Ltd</div>
      <div class="company-sub">Attendance Management System</div>
    </div>
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
  </div>
</div>
<script>window.addEventListener("load",function(){setTimeout(function(){window.print();},350);});<\/script>
</body></html>`);
  w.document.close();
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

/* ══════════════════════════════════════════════════════════ */
export default function Reports() {
  const [tab, setTab] = useState<Tab>("attendance");
  return (
    <div className="space-y-4">
      <PageHeader title="Reports" description="Detailed attendance, monthly, overtime and payroll reports." />
      <div className="flex gap-1 border-b border-border">
        {([
          { id:"attendance", label:"Attendance Report", icon:Users },
          { id:"monthly",    label:"Monthly Report",    icon:Calendar },
          { id:"overtime",   label:"Overtime Report",   icon:Clock },
          { id:"payroll",    label:"Payroll Report",    icon:Banknote },
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
  const [startDate, setStartDate]   = useState(new Date(now.getFullYear(),now.getMonth(),1).toISOString().split("T")[0]);
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

  const { data: branches } = useListBranches();
  const { data, isLoading } = useGetAttendanceReport({
    startDate: dStart, endDate: dEnd,
    ...(dBranch ? { branchId: Number(dBranch) } : {}),
    ...(dStatus ? { status: dStatus } : {}),
  });

  const departments = useMemo(() => {
    const set = new Set((data?.records || []).map((r: any) => r.department).filter(Boolean));
    return Array.from(set).sort() as string[];
  }, [data]);

  const filtered = useMemo(() => (data?.records || []).filter((r: any) =>
    (!empType || r.employeeType === empType)
    && (!department || r.department === department)
    && (!empName || (r.employeeName || "").toLowerCase().includes(empName.toLowerCase()))
  ), [data, empType, department, empName]);

  const HEADERS = ["Date","Emp ID","Employee","Department","Branch","Designation","Status","In Time","Out Time","Total Hrs","OT Hrs"];

  const handleExport = () => {
    const present = filtered.filter((r: any) => r.status === "present").length;
    const absent  = filtered.filter((r: any) => r.status === "absent").length;
    const late    = filtered.filter((r: any) => r.status === "late").length;
    const thead = `<tr>${HEADERS.map(h=>`<th>${h}</th>`).join("")}</tr>`;
    const tbody = filtered.map((r: any) => `<tr>
      <td>${r.date}</td><td>${r.employeeCode}</td><td>${r.employeeName}</td>
      <td>${r.department||""}</td><td>${r.branchName}</td><td>${r.designation||""}</td>
      <td>${r.status.replace("_"," ").toUpperCase()}</td>
      <td>${r.inTime1||"—"}</td><td>${r.outTime1||"—"}</td>
      <td>${r.totalHours!=null?r.totalHours.toFixed(1)+"h":"—"}</td>
      <td>${r.overtimeHours>0?r.overtimeHours.toFixed(1)+"h":"—"}</td>
    </tr>`).join("");
    printReport({
      title: "Attendance Report",
      meta: [
        { label:"Period",        value:`${dStart} – ${dEnd}` },
        { label:"Total Records", value:String(filtered.length) },
        { label:"Present",       value:String(present) },
        { label:"Absent",        value:String(absent) },
        { label:"Late",          value:String(late) },
        { label:"Branch",        value:dBranch?(branches?.find(b=>String(b.id)===dBranch)?.name||"—"):"All Branches" },
      ],
      tableHtml: `<table><thead>${thead}</thead><tbody>${tbody}</tbody></table>`,
    });
  };

  const handleExportExcel = () => {
    const rows = filtered.map((r: any) => [
      r.date, r.employeeCode, r.employeeName, r.department||"", r.branchName,
      r.designation||"", r.status.replace("_"," ").toUpperCase(),
      r.inTime1||"", r.outTime1||"",
      r.totalHours!=null?r.totalHours.toFixed(1):"",
      r.overtimeHours>0?r.overtimeHours.toFixed(1):"",
    ]);
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {[
            {label:"Present",  val:filtered.filter((r:any)=>r.status==="present").length,  cls:"text-green-600"},
            {label:"Absent",   val:filtered.filter((r:any)=>r.status==="absent").length,   cls:"text-red-600"},
            {label:"Late",     val:filtered.filter((r:any)=>r.status==="late").length,     cls:"text-amber-600"},
            {label:"Half Day", val:filtered.filter((r:any)=>r.status==="half_day").length, cls:"text-yellow-600"},
            {label:"Leave",    val:filtered.filter((r:any)=>r.status==="leave").length,    cls:"text-purple-600"},
            {label:"Holiday",  val:filtered.filter((r:any)=>r.status==="holiday").length,  cls:"text-gray-600"},
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
                <tr>{HEADERS.map(h=><th key={h} className="px-3 py-2.5 text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.slice(0,300).map((r:any)=>(
                  <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-2 font-mono whitespace-nowrap">{r.date}</td>
                    <td className="px-3 py-2 font-mono whitespace-nowrap text-muted-foreground">{r.employeeCode}</td>
                    <td className="px-3 py-2 font-medium whitespace-nowrap">{r.employeeName}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{r.department||"—"}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{r.branchName}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{r.designation||"—"}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={cn("px-2 py-0.5 rounded text-xs font-medium uppercase",STATUS_COLORS[r.status]||"bg-gray-100")}>
                        {r.status.replace("_"," ")}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono whitespace-nowrap">{r.inTime1||"—"}</td>
                    <td className="px-3 py-2 font-mono whitespace-nowrap">{r.outTime1||"—"}</td>
                    <td className="px-3 py-2 font-mono whitespace-nowrap">{r.totalHours!=null?`${r.totalHours.toFixed(1)}h`:"—"}</td>
                    <td className="px-3 py-2 font-mono whitespace-nowrap">{r.overtimeHours>0?`${r.overtimeHours.toFixed(1)}h`:"—"}</td>
                  </tr>
                ))}
                {!filtered.length&&<tr><td colSpan={12} className="text-center py-8 text-muted-foreground">No records found for the selected filters.</td></tr>}
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

  const HEADERS = ["Emp ID","Employee","Department","Branch","Designation","Type","Present","Absent","Late","Half Day","Leave","Holiday","Work Hrs","OT Hrs","Att %"];

  const handleExport = () => {
    const thead = `<tr>${HEADERS.map(h=>`<th>${h}</th>`).join("")}</tr>`;
    const tbody = filtered.map((e: any) => `<tr>
      <td>${e.employeeCode}</td><td>${e.employeeName}</td><td>${e.department||""}</td>
      <td>${e.branchName}</td><td>${e.designation}</td><td>${e.employeeType||""}</td>
      <td>${e.presentDays}</td><td>${e.absentDays}</td><td>${e.lateDays}</td>
      <td>${e.halfDays}</td><td>${e.leaveDays}</td><td>${e.holidayDays}</td>
      <td>${e.totalWorkHours.toFixed(1)}h</td><td>${e.overtimeHours.toFixed(1)}h</td>
      <td>${e.attendancePercentage}%</td>
    </tr>`).join("");
    printReport({
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
      e.presentDays, e.absentDays, e.lateDays, e.halfDays, e.leaveDays, e.holidayDays,
      e.totalWorkHours.toFixed(1), e.overtimeHours.toFixed(1), `${e.attendancePercentage}%`,
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
                <tr>{HEADERS.map(h=><th key={h} className="px-3 py-2.5 text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>)}</tr>
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
                    <td className="px-3 py-2 text-center whitespace-nowrap text-yellow-600 font-semibold">{e.halfDays}</td>
                    <td className="px-3 py-2 text-center whitespace-nowrap text-purple-600 font-semibold">{e.leaveDays}</td>
                    <td className="px-3 py-2 text-center whitespace-nowrap text-gray-600 font-semibold">{e.holidayDays}</td>
                    <td className="px-3 py-2 text-center font-mono whitespace-nowrap">{e.totalWorkHours.toFixed(1)}h</td>
                    <td className="px-3 py-2 text-center font-mono whitespace-nowrap text-amber-600">{e.overtimeHours.toFixed(1)}h</td>
                    <td className="px-3 py-2 text-center whitespace-nowrap">
                      <span className={cn("px-2 py-0.5 rounded text-xs font-bold",
                        e.attendancePercentage>=90?"bg-green-100 text-green-700":e.attendancePercentage>=75?"bg-yellow-100 text-yellow-700":"bg-red-100 text-red-700"
                      )}>{e.attendancePercentage}%</span>
                    </td>
                  </tr>
                ))}
                {!filtered.length&&<tr><td colSpan={15} className="text-center py-8 text-muted-foreground">No data available for the selected period.</td></tr>}
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

  const handleExport = () => {
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
  basicSalary:number; grossSalary:number; netSalary:number;
  epfEmployee:number; epfEmployer:number; etfEmployer:number; apit:number;
  totalDeductions:number; overtimePay:number; status:string;
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
    fetch(apiUrl(`/payroll?month=${dMonth}&year=${dYear}`))
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
    gross:       filtered.reduce((s,r)=>s+r.grossSalary,0),
    net:         filtered.reduce((s,r)=>s+r.netSalary,0),
    epfEmployee: filtered.reduce((s,r)=>s+r.epfEmployee,0),
    epfEmployer: filtered.reduce((s,r)=>s+r.epfEmployer,0),
    etf:         filtered.reduce((s,r)=>s+r.etfEmployer,0),
    apit:        filtered.reduce((s,r)=>s+r.apit,0),
    ot:          filtered.reduce((s,r)=>s+r.overtimePay,0),
  }), [filtered]);

  const HEADERS = ["Emp ID","Employee","Designation","Department","Type","Basic Salary","Gross Salary","EPF (Emp)","EPF (Employer)","ETF","APIT","OT Pay","Total Deductions","Net Salary","Status"];

  const handleExport = () => {
    const thead = `<tr>${HEADERS.map(h=>`<th>${h}</th>`).join("")}</tr>`;
    const tbody = filtered.map(r=>`<tr>
      <td>${r.employee.employeeId}</td><td>${r.employee.fullName}</td>
      <td>${r.employee.designation}</td><td>${r.employee.department||""}</td>
      <td>${r.employee.employeeType||""}</td>
      <td>Rs.${Math.round(r.basicSalary).toLocaleString()}</td>
      <td>Rs.${Math.round(r.grossSalary).toLocaleString()}</td>
      <td>Rs.${Math.round(r.epfEmployee).toLocaleString()}</td>
      <td>Rs.${Math.round(r.epfEmployer).toLocaleString()}</td>
      <td>Rs.${Math.round(r.etfEmployer).toLocaleString()}</td>
      <td>Rs.${Math.round(r.apit).toLocaleString()}</td>
      <td>Rs.${Math.round(r.overtimePay).toLocaleString()}</td>
      <td>Rs.${Math.round(r.totalDeductions).toLocaleString()}</td>
      <td><strong>Rs.${Math.round(r.netSalary).toLocaleString()}</strong></td>
      <td>${r.status.toUpperCase()}</td>
    </tr>`).join("");
    const tfoot = `<tr>
      <td colspan="5"><strong>TOTALS (${filtered.length} employees)</strong></td>
      <td></td>
      <td><strong>Rs.${Math.round(totals.gross).toLocaleString()}</strong></td>
      <td>Rs.${Math.round(totals.epfEmployee).toLocaleString()}</td>
      <td>Rs.${Math.round(totals.epfEmployer).toLocaleString()}</td>
      <td>Rs.${Math.round(totals.etf).toLocaleString()}</td>
      <td>Rs.${Math.round(totals.apit).toLocaleString()}</td>
      <td>Rs.${Math.round(totals.ot).toLocaleString()}</td>
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
      ],
      tableHtml: `<table><thead>${thead}</thead><tbody>${tbody}</tbody><tfoot>${tfoot}</tfoot></table>`,
    });
  };

  const handleExportExcel = () => {
    const rows = filtered.map(r => [
      r.employee.employeeId, r.employee.fullName, r.employee.designation, r.employee.department||"",
      r.employee.employeeType||"",
      Math.round(r.basicSalary), Math.round(r.grossSalary),
      Math.round(r.epfEmployee), Math.round(r.epfEmployer), Math.round(r.etfEmployer),
      Math.round(r.apit), Math.round(r.overtimePay), Math.round(r.totalDeductions),
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
            {label:"Total Employees",val:filtered.length,    fmt:false,cls:"text-primary"},
            {label:"Total Gross",    val:totals.gross,       fmt:true, cls:"text-emerald-600"},
            {label:"Total Net Pay",  val:totals.net,         fmt:true, cls:"text-blue-600"},
            {label:"EPF (Employee)", val:totals.epfEmployee, fmt:true, cls:"text-purple-600"},
            {label:"EPF (Employer)", val:totals.epfEmployer, fmt:true, cls:"text-indigo-600"},
            {label:"ETF",            val:totals.etf,         fmt:true, cls:"text-violet-600"},
            {label:"Total APIT",     val:totals.apit,        fmt:true, cls:"text-amber-600"},
            {label:"Total OT Pay",   val:totals.ot,          fmt:true, cls:"text-orange-600"},
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
                <tr>{["Emp ID","Employee","Designation","Department","Type","Basic","Gross","EPF(Emp)","EPF(Er)","ETF","APIT","OT Pay","Deductions","Net Salary","Status"].map(h=>(
                  <th key={h} className="px-3 py-2.5 text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(r=>(
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
                    <td className="px-3 py-2 font-mono whitespace-nowrap">{fmtAmt(r.basicSalary)}</td>
                    <td className="px-3 py-2 font-mono whitespace-nowrap text-emerald-700 font-semibold">{fmtAmt(r.grossSalary)}</td>
                    <td className="px-3 py-2 font-mono whitespace-nowrap text-purple-600">{fmtAmt(r.epfEmployee)}</td>
                    <td className="px-3 py-2 font-mono whitespace-nowrap text-indigo-600">{fmtAmt(r.epfEmployer)}</td>
                    <td className="px-3 py-2 font-mono whitespace-nowrap text-violet-600">{fmtAmt(r.etfEmployer)}</td>
                    <td className="px-3 py-2 font-mono whitespace-nowrap text-amber-600">{fmtAmt(r.apit)}</td>
                    <td className="px-3 py-2 font-mono whitespace-nowrap text-orange-600">{fmtAmt(r.overtimePay)}</td>
                    <td className="px-3 py-2 font-mono whitespace-nowrap text-red-600">{fmtAmt(r.totalDeductions)}</td>
                    <td className="px-3 py-2 font-mono whitespace-nowrap font-bold text-blue-700">{fmtAmt(r.netSalary)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                        r.status==="paid"?"bg-emerald-100 text-emerald-700":r.status==="approved"?"bg-blue-100 text-blue-700":"bg-amber-100 text-amber-700"
                      )}>{r.status}</span>
                    </td>
                  </tr>
                ))}
                {!filtered.length&&<tr><td colSpan={15} className="text-center py-8 text-muted-foreground">No payroll records found for {getMonthName(dMonth)} {dYear}.</td></tr>}
              </tbody>
              {filtered.length>0 && (
                <tfoot className="bg-muted/70">
                  <tr>
                    <td colSpan={5} className="px-3 py-2 text-xs font-bold">TOTALS ({filtered.length} employees)</td>
                    <td className="px-3 py-2 font-mono text-xs"></td>
                    <td className="px-3 py-2 font-mono text-xs text-emerald-700 font-bold">{fmtAmt(totals.gross)}</td>
                    <td className="px-3 py-2 font-mono text-xs text-purple-600">{fmtAmt(totals.epfEmployee)}</td>
                    <td className="px-3 py-2 font-mono text-xs text-indigo-600">{fmtAmt(totals.epfEmployer)}</td>
                    <td className="px-3 py-2 font-mono text-xs text-violet-600">{fmtAmt(totals.etf)}</td>
                    <td className="px-3 py-2 font-mono text-xs text-amber-600">{fmtAmt(totals.apit)}</td>
                    <td className="px-3 py-2 font-mono text-xs text-orange-600">{fmtAmt(totals.ot)}</td>
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
