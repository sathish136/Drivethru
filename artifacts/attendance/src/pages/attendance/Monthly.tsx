import { useState, useMemo, useEffect } from "react";
import { Calendar as CalendarIcon, Clock, X, AlertTriangle, CheckCircle2, ClipboardEdit, FileSpreadsheet, Download, Printer, FileDown, Search } from "lucide-react";
import { PageHeader, Card, Select } from "@/components/ui";
import { useMonthlySheet } from "@/hooks/use-attendance";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
function apiUrl(path: string) { return `${BASE}/api${path}`; }

const COMPANY_LOGO_URL = "/images/logo.png";
const LIVE_U_LOGO_URL = "/images/liveu-logo.png";
const LIVE_U_POWERED_BY = "Powered by Live U (Pvt) Ltd";

function getGeneratedBy(): string {
  try {
    const u = localStorage.getItem("user");
    if (u) { const p = JSON.parse(u); return p.fullName || p.username || "—"; }
  } catch {}
  return "—";
}
function getGeneratedAt(): string {
  const d = new Date();
  const dateStr = d.toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  const timeStr = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
  return `${dateStr} at ${timeStr}`;
}

// ─── helpers ────────────────────────────────────────────────────────────────
function parseTimeToDecimal(t: string | null | undefined): number {
  if (!t) return 0;
  const m = String(t).match(/(\d+):(\d+)/);
  if (m) return parseInt(m[1]) + parseInt(m[2]) / 60;
  const f = parseFloat(String(t).replace("h", ""));
  return isNaN(f) ? 0 : f;
}
function decimalToHHMM(dec: number): string {
  if (dec <= 0) return "0:00";
  const h = Math.floor(dec);
  const m = Math.round((dec - h) * 60);
  return `${h}:${String(m).padStart(2, "0")}`;
}
function fmtTime(t: string | null | undefined): string | null {
  if (!t) return null;
  const [h, m] = t.split(":");
  const hr = parseInt(h);
  return `${hr > 12 ? hr - 12 : hr || 12}:${m}${hr >= 12 ? "pm" : "am"}`;
}
function fmtHrs(h: number | null | undefined) {
  if (h == null) return "—";
  const hrs = Math.floor(h); const mins = Math.round((h - hrs) * 60);
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}
function isSundayFn(year: number, month: number, d: number) {
  return new Date(year, month - 1, d).getDay() === 0;
}
function getDayName(year: number, month: number, d: number) {
  return ["Su","Mo","Tu","We","Th","Fr","Sa"][new Date(year, month - 1, d).getDay()];
}

const STATUS_COLORS: Record<string, string> = {
  P: "#059669", present: "#059669", late: "#d97706",
  A: "#dc2626", absent: "#dc2626",
  H: "#7c3aed", holiday: "#7c3aed",
  HL: "#f59e0b", Half: "#f59e0b", half_day: "#f59e0b",
  SL: "#ea580c",
  LV: "#2563eb", leave: "#2563eb",
  S: "#374151", off_day: "#374151",
  DO: "#94a3b8", sunday: "#94a3b8",
};

function normaliseStatus(s: string, isSun: boolean): string {
  if (!s) return "A";
  const m: Record<string, string> = {
    present: "P", late: "P(L)", absent: isSun ? "S" : "A",
    half_day: "HD", leave: "LV", holiday: "H",
    off_day: "WO", sunday: "S",
  };
  return m[s] || s.toUpperCase();
}

// ─── Modal components (unchanged) ────────────────────────────────────────────
interface LeaveBalance {
  annualRemaining: number; casualRemaining: number;
  annualLeaveBalance: number; casualLeaveBalance: number;
  annualLeaveUsed: number; casualLeaveUsed: number;
}
interface SelectedCell {
  employeeId: number; branchId: number; employeeName: string;
  date: string; currentStatus: string; currentLeaveType: string | null;
  currentInTime1?: string | null; currentOutTime1?: string | null;
  currentInTime2?: string | null; currentOutTime2?: string | null;
  currentRemarks?: string | null;
}

function ManualAttendanceModal({ cell, onClose, onSuccess }: { cell: SelectedCell; onClose: () => void; onSuccess: () => void }) {
  const normTime = (t?: string | null) => (t ? t.slice(0, 5) : "");
  const initialStatus = (["present","late","half_day","absent"].includes(cell.currentStatus) ? cell.currentStatus : "present") as "present"|"late"|"half_day"|"absent";
  const [status, setStatus] = useState<"present"|"late"|"half_day"|"absent">(initialStatus);
  const [inTime1, setInTime1] = useState(normTime(cell.currentInTime1));
  const [outTime1, setOutTime1] = useState(normTime(cell.currentOutTime1));
  const [inTime2, setInTime2] = useState(normTime(cell.currentInTime2));
  const [outTime2, setOutTime2] = useState(normTime(cell.currentOutTime2));
  const [remarks, setRemarks] = useState(cell.currentRemarks ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [success, setSuccess] = useState(false);

  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const dateObj = new Date(cell.date + "T00:00:00");
  const formattedDate = `${dateObj.getDate()} ${MONTHS[dateObj.getMonth()]} ${dateObj.getFullYear()} (${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][dateObj.getDay()]})`;

  const STATUS_OPTIONS = [
    { value: "present", label: "Present", desc: "Full day, on time", color: "green" },
    { value: "late", label: "Late", desc: "Arrived after grace period", color: "amber" },
    { value: "half_day", label: "Half Day", desc: "Partial attendance", color: "yellow" },
    { value: "absent", label: "Absent", desc: "No attendance recorded", color: "red" },
  ] as const;

  async function handleSubmit() {
    setSubmitting(true); setError(null);
    try {
      const body: any = { employeeId: cell.employeeId, date: cell.date, status, remarks: remarks || undefined };
      if (inTime1) body.inTime1 = inTime1; if (outTime1) body.outTime1 = outTime1;
      if (inTime2) body.inTime2 = inTime2; if (outTime2) body.outTime2 = outTime2;
      const r = await fetch(apiUrl("/attendance/manual-entry"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json();
      if (!r.ok) setError(d.message || "Failed to save manual attendance");
      else { setSuccess(true); setTimeout(() => { onSuccess(); onClose(); }, 1200); }
    } catch { setError("Network error. Please try again."); }
    setSubmitting(false);
  }

  const colorMap = {
    green: { border: "border-green-500", bg: "bg-green-50", text: "text-green-700", dot: "border-green-500 bg-green-500" },
    amber: { border: "border-amber-500", bg: "bg-amber-50", text: "text-amber-700", dot: "border-amber-500 bg-amber-500" },
    yellow: { border: "border-yellow-500", bg: "bg-yellow-50", text: "text-yellow-700", dot: "border-yellow-500 bg-yellow-500" },
    red: { border: "border-red-500", bg: "bg-red-50", text: "text-red-700", dot: "border-red-500 bg-red-500" },
  };

  return (
    <div className="px-6 py-5 space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
        <CalendarIcon className="w-4 h-4 text-blue-500 shrink-0" />
        <span className="font-medium text-foreground">{formattedDate}</span>
        <span className="ml-auto text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground font-semibold">Manual Override</span>
      </div>
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Attendance Status</p>
        <div className="grid grid-cols-2 gap-2">
          {STATUS_OPTIONS.map(opt => {
            const c = colorMap[opt.color]; const selected = status === opt.value;
            return (
              <button key={opt.value} onClick={() => setStatus(opt.value)} className={cn("flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all text-left", selected ? `${c.border} ${c.bg} ${c.text}` : "border-border hover:border-muted-foreground/40 text-foreground")}>
                <div className={cn("w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0", selected ? c.dot : "border-muted-foreground/50")}>
                  {selected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div><div className="font-semibold text-xs leading-tight">{opt.label}</div><div className="text-[10px] text-muted-foreground leading-tight">{opt.desc}</div></div>
              </button>
            );
          })}
        </div>
      </div>
      {status !== "absent" && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Punch Times <span className="normal-case font-normal">(optional)</span></p>
          <div className="grid grid-cols-2 gap-2">
            {[["In Time 1", inTime1, setInTime1], ["Out Time 1", outTime1, setOutTime1], ["In Time 2", inTime2, setInTime2], ["Out Time 2", outTime2, setOutTime2]].map(([label, val, setter]) => (
              <div key={label as string}>
                <label className="text-[10px] text-muted-foreground font-medium block mb-1">{label as string}</label>
                <input type="time" value={val as string} onChange={e => (setter as any)(e.target.value)} className="w-full text-xs border border-border rounded-lg px-2 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            ))}
          </div>
        </div>
      )}
      <div>
        <label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide block mb-1">Remarks <span className="normal-case font-normal">(optional)</span></label>
        <textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={2} placeholder="e.g. Biometric not captured, site visit..." className="w-full text-xs border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
      </div>
      {error && <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200"><X className="w-4 h-4 text-red-500 shrink-0 mt-0.5" /><p className="text-xs text-red-700">{error}</p></div>}
      {success && <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-green-50 border border-green-200"><CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /><p className="text-xs text-green-700 font-medium">Attendance saved successfully!</p></div>}
      <div className="flex items-center gap-3 pt-1">
        <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
        <button onClick={handleSubmit} disabled={submitting || success} className={cn("flex-1 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all", !submitting && !success ? "bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98]" : "bg-muted-foreground/30 cursor-not-allowed")}>
          {submitting ? "Saving…" : success ? "Saved!" : "Save Attendance"}
        </button>
      </div>
    </div>
  );
}

function LeaveEntryInner({ cell, year, onClose, onSuccess }: { cell: SelectedCell; year: number; onClose: () => void; onSuccess: () => void }) {
  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [selectedType, setSelectedType] = useState<"annual"|"casual"|"no_pay"|null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setLoadingBalance(true);
    fetch(apiUrl(`/leave-balances/employee/${cell.employeeId}?year=${year}`))
      .then(r => r.json()).then(d => { setBalance(d); setLoadingBalance(false); })
      .catch(() => { setBalance(null); setLoadingBalance(false); });
  }, [cell.employeeId, year]);

  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const dateObj = new Date(cell.date + "T00:00:00");
  const formattedDate = `${dateObj.getDate()} ${MONTHS[dateObj.getMonth()]} ${dateObj.getFullYear()} (${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][dateObj.getDay()]})`;

  async function handleSubmit() {
    if (!selectedType) return;
    setSubmitting(true); setError(null);
    try {
      const r = await fetch(apiUrl("/attendance/mark-leave"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ employeeId: cell.employeeId, date: cell.date, leaveType: selectedType }) });
      const d = await r.json();
      if (!r.ok) setError(d.message || "Failed to mark leave");
      else { setSuccess(true); setTimeout(() => { onSuccess(); onClose(); }, 1200); }
    } catch { setError("Network error. Please try again."); }
    setSubmitting(false);
  }

  const annualOk = (balance?.annualRemaining ?? 0) >= 1;
  const casualOk = (balance?.casualRemaining ?? 0) >= 1;

  return (
    <>
      <div className="px-6 py-5 space-y-5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
          <CalendarIcon className="w-4 h-4 text-blue-500 shrink-0" />
          <span className="font-medium text-foreground">{formattedDate}</span>
          {cell.currentStatus === "leave" && <span className="ml-auto text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-semibold">{cell.currentLeaveType === "annual" ? "Annual Leave" : cell.currentLeaveType === "casual" ? "Casual Leave" : "Leave"}</span>}
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Available Leave Balance</p>
          {loadingBalance ? <div className="flex gap-3">{[1,2].map(i => <div key={i} className="flex-1 h-16 rounded-xl bg-muted/50 animate-pulse" />)}</div> : (
            <div className="grid grid-cols-2 gap-3">
              {[{label:"Annual Leave",ok:annualOk,rem:balance?.annualRemaining??0,used:balance?.annualLeaveUsed??0,total:balance?.annualLeaveBalance??0},{label:"Casual Leave",ok:casualOk,rem:balance?.casualRemaining??0,used:balance?.casualLeaveUsed??0,total:balance?.casualLeaveBalance??0}].map(({label,ok,rem,used,total})=>(
                <div key={label} className={cn("rounded-xl border-2 p-3 text-center",ok?"border-green-200 bg-green-50":"border-red-200 bg-red-50")}>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">{label}</p>
                  <p className={cn("text-2xl font-bold",ok?"text-green-700":"text-red-600")}>{rem.toFixed(1)}</p>
                  <p className="text-[10px] text-muted-foreground">days remaining</p>
                  <p className="text-[10px] text-muted-foreground">{used} used / {total} total</p>
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Select Leave Type</p>
          <div className="space-y-2">
            {[{type:"annual" as const,label:"Annual Leave",ok:annualOk,rem:balance?.annualRemaining,color:"blue"},{type:"casual" as const,label:"Casual Leave",ok:casualOk,rem:balance?.casualRemaining,color:"purple"}].map(({type,label,ok,rem,color})=>(
              <button key={type} onClick={()=>setSelectedType(type)} disabled={!ok}
                className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all text-left",
                  selectedType===type?`border-${color}-500 bg-${color}-50 text-${color}-700`:ok?`border-border hover:border-${color}-300 hover:bg-${color}-50/50 text-foreground`:"border-dashed border-muted-foreground/30 bg-muted/20 text-muted-foreground cursor-not-allowed opacity-60")}>
                <div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",selectedType===type?`border-${color}-500 bg-${color}-500`:"border-muted-foreground/50")}>{selectedType===type&&<div className="w-2 h-2 rounded-full bg-white"/>}</div>
                <div className="flex-1"><span>{label}</span>{!ok&&<span className="ml-2 text-xs text-red-500">(no balance)</span>}</div>
                {ok&&<span className="text-xs text-green-600 font-semibold">{(rem??0).toFixed(1)} days left</span>}
              </button>
            ))}
            <button onClick={()=>setSelectedType("no_pay")} className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all text-left",selectedType==="no_pay"?"border-orange-500 bg-orange-50 text-orange-700":"border-border hover:border-orange-300 hover:bg-orange-50/50 text-foreground")}>
              <div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",selectedType==="no_pay"?"border-orange-500 bg-orange-500":"border-muted-foreground/50")}>{selectedType==="no_pay"&&<div className="w-2 h-2 rounded-full bg-white"/>}</div>
              <div className="flex-1">No-Pay Leave</div>
              <span className="text-xs text-orange-600 font-semibold">Salary deducted</span>
            </button>
          </div>
        </div>
        {selectedType==="no_pay"&&<div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-orange-50 border border-orange-200"><AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5"/><p className="text-xs text-orange-700">This day will be marked as absent and <strong>1 day's salary will be deducted</strong> during payroll calculation.</p></div>}
        {error&&<div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200"><X className="w-4 h-4 text-red-500 shrink-0 mt-0.5"/><p className="text-xs text-red-700">{error}</p></div>}
        {success&&<div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-green-50 border border-green-200"><CheckCircle2 className="w-4 h-4 text-green-500 shrink-0"/><p className="text-xs text-green-700 font-medium">Leave recorded successfully!</p></div>}
      </div>
      <div className="px-6 py-4 border-t border-border flex items-center gap-3 bg-muted/20">
        <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
        <button onClick={handleSubmit} disabled={!selectedType||submitting||success} className={cn("flex-1 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all",selectedType&&!submitting&&!success?"bg-blue-600 hover:bg-blue-700 active:scale-[0.98]":"bg-muted-foreground/30 cursor-not-allowed")}>
          {submitting?"Saving…":success?"Saved!":"Confirm Leave"}
        </button>
      </div>
    </>
  );
}

function CellActionModal({ cell, year, onClose, onSuccess }: { cell: SelectedCell; year: number; onClose: () => void; onSuccess: () => void }) {
  const [tab, setTab] = useState<"manual"|"leave">("manual");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-gradient-to-r from-indigo-50 to-blue-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center"><ClipboardEdit className="w-4 h-4 text-indigo-600"/></div>
            <div><p className="font-semibold text-sm text-foreground">Attendance Entry</p><p className="text-xs text-muted-foreground">{cell.employeeName}</p></div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><X className="w-4 h-4 text-muted-foreground"/></button>
        </div>
        <div className="flex border-b border-border">
          {(["manual","leave"] as const).map(t=>(
            <button key={t} onClick={()=>setTab(t)} className={cn("flex-1 py-2.5 text-xs font-semibold transition-colors border-b-2",tab===t?"border-indigo-500 text-indigo-600 bg-indigo-50/50":"border-transparent text-muted-foreground hover:text-foreground")}>
              {t==="manual"?"Manual Attendance":"Mark Leave"}
            </button>
          ))}
        </div>
        {tab==="manual"?<ManualAttendanceModal cell={cell} onClose={onClose} onSuccess={onSuccess}/>:<LeaveEntryInner cell={cell} year={year} onClose={onClose} onSuccess={onSuccess}/>}
      </div>
    </div>
  );
}

// ─── Row configs for the timesheet ──────────────────────────────────────────
const STANDARD_ROWS = [
  { label: "IN TIME",    key: "inTime",      labelBg: "#f59e0b", rowBg: "#fef3c7", textColor: "#92400e" },
  { label: "OUT TIME",   key: "outTime",     labelBg: "#10b981", rowBg: "#d1fae5", textColor: "#065f46" },
  { label: "WORKED HRS", key: "workedHours", labelBg: "#3b82f6", rowBg: "#dbeafe", textColor: "#1e40af" },
  { label: "STATUS",     key: "status",      labelBg: "#6b7280", rowBg: "#f3f4f6", textColor: "#374151" },
  { label: "OVERTIME",   key: "overtime",    labelBg: "#f97316", rowBg: "#fed7aa", textColor: "#c2410c" },
];
const SPLIT_ROWS = [
  { label: "IN TIME",    key: "inTime",      labelBg: "#f59e0b", rowBg: "#fef3c7", textColor: "#92400e" },
  { label: "OUT TIME",   key: "outTime",     labelBg: "#10b981", rowBg: "#d1fae5", textColor: "#065f46" },
  { label: "IN TIME 2",  key: "inTime2",     labelBg: "#f59e0b", rowBg: "#fef3c7", textColor: "#92400e" },
  { label: "OUT TIME 2", key: "outTime2",    labelBg: "#10b981", rowBg: "#d1fae5", textColor: "#065f46" },
  { label: "WORKED HRS", key: "workedHours", labelBg: "#3b82f6", rowBg: "#dbeafe", textColor: "#1e40af" },
  { label: "STATUS",     key: "status",      labelBg: "#6b7280", rowBg: "#f3f4f6", textColor: "#374151" },
  { label: "OVERTIME",   key: "overtime",    labelBg: "#f97316", rowBg: "#fed7aa", textColor: "#c2410c" },
];

// ─── Main component ──────────────────────────────────────────────────────────
export default function MonthlySheet() {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear]   = useState(new Date().getFullYear());
  const { data, isLoading, refetch } = useMonthlySheet({ month, year });
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);
  const [empFilter, setEmpFilter]   = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [searchText, setSearchText] = useState("");

  const daysInMonth = new Date(year, month, 0).getDate();
  const daysArray   = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const allRows: any[] = data?.rows || [];

  // Department list derived from data
  const departments = useMemo(() => {
    const set = new Set<string>();
    allRows.forEach(r => { if (r.department) set.add(r.department); });
    return Array.from(set).sort();
  }, [allRows]);

  // Filtered rows
  const rows = useMemo(() => {
    return allRows.filter(r => {
      if (empFilter !== "all" && String(r.employeeId) !== empFilter) return false;
      if (deptFilter !== "all" && r.department !== deptFilter) return false;
      if (searchText.trim()) {
        const q = searchText.toLowerCase();
        if (!r.employeeName?.toLowerCase().includes(q) && !r.employeeCode?.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [allRows, empFilter, deptFilter, searchText]);

  const yearOptions = [2023, 2024, 2025, 2026, 2027];
  const monthName = new Date(year, month - 1, 1).toLocaleString("default", { month: "long" });

  function handleCellClick(row: any, day: number) {
    if (isSundayFn(year, month, day)) return;
    const dateStr = `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    const entry = row.dailyStatus?.find((d: any) => d.day === day);
    const status = entry?.status || "absent";
    if (status === "holiday") return;
    setSelectedCell({
      employeeId: row.employeeId, branchId: row.branchId, employeeName: row.employeeName,
      date: dateStr, currentStatus: status, currentLeaveType: entry?.leaveType ?? null,
      currentInTime1: entry?.inTime ?? null, currentOutTime1: entry?.outTime ?? null,
      currentInTime2: entry?.inTime2 ?? null, currentOutTime2: entry?.outTime2 ?? null,
      currentRemarks: entry?.remarks ?? null,
    });
  }

  // ── Cell value getter ──────────────────────────────────────────────────────
  function getCellValue(key: string, entry: any, day: number): string {
    if (!entry) return key === "status" ? (isSundayFn(year, month, day) ? "S" : "—") : "—";
    const isSun = isSundayFn(year, month, day);
    switch (key) {
      case "inTime":      return entry.inTime ?? "—";
      case "outTime":     return entry.outTime ?? "—";
      case "inTime2":     return entry.inTime2 ?? "—";
      case "outTime2":    return entry.outTime2 ?? "—";
      case "workedHours": return entry.hours != null ? decimalToHHMM(entry.hours) : "—";
      case "overtime":    return entry.overtimeHours != null && entry.overtimeHours > 0 ? decimalToHHMM(entry.overtimeHours) : "—";
      case "status": {
        const s = entry.status || "absent";
        return normaliseStatus(s, isSun);
      }
      default: return "—";
    }
  }

  function getStatusColor(val: string): string {
    return STATUS_COLORS[val] || STATUS_COLORS[val.toLowerCase()] || "#374151";
  }

  // ── PDF print ─────────────────────────────────────────────────────────────
  const buildPrintHtml = () => {
    const start = new Date(year, month - 1, 1);
    const end   = new Date(year, month, 0);
    const periodStr = `${start.toLocaleDateString("en-GB")} - ${end.toLocaleDateString("en-GB")}`;
    const generatedBy = getGeneratedBy();
    const generatedAt = getGeneratedAt();

    let html = `<!DOCTYPE html><html><head><title>Monthly Attendance – ${monthName} ${year}</title>
<style>
  @page { size: A4 landscape; margin: 8mm; }
  body { font-family: Arial, sans-serif; font-size: 8px; line-height: 1.15; margin: 0; padding: 4px; color: #000; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #000; }
</style></head><body>
<div style="display:flex;align-items:center;justify-content:center;gap:20px;padding:12px 20px;margin-bottom:16px;background:linear-gradient(135deg,#f8fafc,#f1f5f9);border:1px solid #e2e8f0;border-radius:10px;">
  <img src="${COMPANY_LOGO_URL}" alt="Sri Lanka Post" style="height:52px;width:auto;" onerror="this.style.display='none'"/>
  <div>
    <p style="margin:0 0 2px;font-size:10px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.08em;">Sri Lanka Post</p>
    <h1 style="margin:0 0 3px;font-size:18px;font-weight:800;color:#0f172a;">SRI LANKA POST</h1>
    <p style="margin:0 0 3px;font-size:11px;font-weight:600;color:#475569;">Human Resources Department</p>
    <p style="margin:0;font-size:13px;font-weight:700;color:#800000;letter-spacing:.05em;">MONTHLY ATTENDANCE SHEET</p>
  </div>
</div>`;

    rows.forEach((row: any, idx: number) => {
      const hasSplit = !!(row.dailyStatus?.some((e: any) => e.inTime2));
      const rowCfgs = hasSplit ? SPLIT_ROWS : STANDARD_ROWS;
      const totalHours    = (row.dailyStatus || []).reduce((s: number, e: any) => s + (e?.hours ?? 0), 0);
      const totalOvertime = (row.dailyStatus || []).reduce((s: number, e: any) => s + (e?.overtimeHours ?? 0), 0);
      const totalDays     = (row.dailyStatus || []).reduce((s: number, e: any) => {
        const st = e?.status || "";
        if (st === "present" || st === "late") return s + 1;
        if (st === "half_day") return s + 0.5;
        if (st === "leave") return s + 1;
        return s;
      }, 0);

      html += `<div style="margin-bottom:32px;page-break-inside:avoid;border:2px solid #000;background:#fff;">
  <div style="background:#f8f9fa;border-bottom:2px solid #000;padding:12px;">
    <table><tr>
      <td style="font-weight:bold;font-size:15px;color:#000;">MONTHLY ATTENDANCE RECORD</td>
      <td style="text-align:right;font-size:13px;color:#000;">Period: ${periodStr}</td>
    </tr></table>
    <table style="margin-top:8px;"><tr>
      <td style="padding:4px;font-size:12px;font-weight:bold;width:25%;">Employee: ${row.employeeName || "N/A"}</td>
      <td style="padding:4px;font-size:12px;font-weight:bold;width:25%;">EMP ID: ${row.employeeCode || "N/A"}</td>
      <td style="padding:4px;font-size:12px;font-weight:bold;width:25%;">Department: ${row.department || "N/A"}</td>
      <td style="padding:4px;font-size:12px;font-weight:bold;width:25%;">Designation: ${row.designation || "N/A"}</td>
    </tr></table>
  </div>
  <div style="padding:6px;">
    <table style="font-size:8px;">
      <thead>
        <tr style="background:#e9ecef;">
          <th style="padding:3px;text-align:center;font-size:9px;background:#e9ecef;width:72px;">TIME DETAILS</th>`;

      daysArray.forEach(day => {
        const sun = isSundayFn(year, month, day) ? " background:#fef2f2;color:#b91c1c;" : "";
        html += `<th style="padding:2px;text-align:center;font-size:8px;min-width:28px;${sun}">${getDayName(year,month,day).toUpperCase()}</th>`;
      });
      html += `<th style="padding:2px;text-align:center;font-size:8px;">TOTAL</th></tr>
        <tr style="background:#f8f9fa;">
          <th style="padding:2px;text-align:center;font-size:8px;">DATE</th>`;
      daysArray.forEach(day => {
        html += `<th style="padding:1px;text-align:center;font-size:8px;">${String(day).padStart(2,"0")}</th>`;
      });
      html += `<th style="padding:1px;text-align:center;font-size:8px;">—</th></tr>
      </thead><tbody>`;

      rowCfgs.forEach(cfg => {
        html += `<tr><td style="padding:3px;font-weight:bold;text-align:center;background:${cfg.labelBg};color:white;font-size:9px;">${cfg.label}</td>`;
        daysArray.forEach(day => {
          const entry = row.dailyStatus?.find((e: any) => e.day === day);
          const val   = getCellValue(cfg.key, entry, day);
          let style   = `padding:2px;text-align:center;font-weight:bold;font-size:8px;color:${cfg.textColor};background:${cfg.rowBg};`;
          if (cfg.key === "status") {
            style = `padding:2px;text-align:center;font-weight:bold;font-size:8px;color:${getStatusColor(val)};background:${cfg.rowBg};`;
          }
          html += `<td style="${style}">${val}</td>`;
        });
        // Totals column
        if (cfg.key === "workedHours") html += `<td style="padding:2px;text-align:center;font-weight:bold;background:${cfg.rowBg};font-size:8px;">${decimalToHHMM(totalHours)}</td>`;
        else if (cfg.key === "status")  html += `<td style="padding:2px;text-align:center;font-weight:bold;background:${cfg.rowBg};font-size:8px;">${totalDays} days</td>`;
        else if (cfg.key === "overtime") html += `<td style="padding:2px;text-align:center;font-weight:bold;background:${cfg.rowBg};font-size:8px;">${totalOvertime > 0 ? decimalToHHMM(totalOvertime) : "—"}</td>`;
        else html += `<td style="padding:2px;text-align:center;background:${cfg.rowBg};font-size:8px;">—</td>`;
        html += "</tr>";
      });

      html += `</tbody></table>
  </div>
  <div style="background:#f8f9fa;padding:12px;border-top:2px solid #000;">
    <table><tr>
      <td style="font-size:12px;font-weight:bold;color:#000;width:50%;">MONTHLY SUMMARY — ${row.employeeName || "N/A"} (${row.employeeCode || "N/A"})</td>
      <td style="font-size:12px;font-weight:bold;color:#000;text-align:right;">Total Hours: ${decimalToHHMM(totalHours)} &nbsp;|&nbsp; Overtime: ${totalOvertime>0?decimalToHHMM(totalOvertime):"—"}</td>
    </tr>
    <tr><td colspan="2" style="text-align:center;font-size:10px;color:#000;padding-top:8px;">Generated: ${new Date().toLocaleDateString("en-GB")} | Sri Lanka Post | Confidential Document</td></tr>
    <tr><td colspan="2" style="text-align:center;font-size:9px;color:#475569;padding-top:4px;"><strong>Generated by:</strong> ${generatedBy} &nbsp;|&nbsp; <strong>Generated at:</strong> ${generatedAt}</td></tr>
    <tr><td colspan="2" style="text-align:center;padding-top:10px;border-top:1px solid #eee;">
      <img src="${LIVE_U_LOGO_URL}" alt="Live U" style="height:20px;width:auto;vertical-align:middle;margin-right:6px;" onerror="this.style.display='none'"/>
      <span style="font-size:9px;color:#666;">${LIVE_U_POWERED_BY}</span>
    </td></tr></table>
  </div>
</div>`;
      if (idx < rows.length - 1) html += '<div style="page-break-before:always;height:20px;"></div>';
    });

    html += "</body></html>";
    return html;
  };

  const handlePrint = () => {
    if (!rows.length) return;
    const w = window.open("", "_blank");
    if (w) { w.document.write(buildPrintHtml()); w.document.close(); w.focus(); setTimeout(() => { w.print(); w.close(); }, 400); }
  };

  // ── Excel / CSV export ────────────────────────────────────────────────────
  const handleExportExcel = () => {
    const escape = (v: string | number) => { const s = String(v ?? ""); return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g,'""')}"` : s; };
    const dayHeaders = daysArray.map(d => `${getDayName(year,month,d)} ${d}`);
    const headers = ["Emp ID","Employee","Designation","Department",...dayHeaders,"Present","Absent","Late","Total Hrs","OT Hrs"];
    const csvRows = rows.map((row: any) => {
      const dayStatuses = daysArray.map(day => {
        const entry = row.dailyStatus?.find((e: any) => e.day === day);
        return entry ? normaliseStatus(entry.status, isSundayFn(year, month, day)) : (isSundayFn(year, month, day) ? "S" : "A");
      });
      const totalOT = (row.dailyStatus||[]).reduce((s:number,e:any)=>s+(e?.overtimeHours??0),0);
      return [row.employeeCode, row.employeeName, row.designation||"", row.department||"",
        ...dayStatuses, row.presentDays??0, row.absentDays??0, row.lateDays??0,
        row.totalWorkHours!=null?row.totalWorkHours.toFixed(1):"", totalOT>0?totalOT.toFixed(1):"0"];
    });
    const csv = [headers,...csvRows].map(r=>r.map(escape).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download=`monthly-sheet-${monthName}-${year}.csv`; a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {selectedCell && (
        <CellActionModal cell={selectedCell} year={year}
          onClose={() => setSelectedCell(null)}
          onSuccess={() => { setSelectedCell(null); refetch?.(); }} />
      )}

      <PageHeader
        title="Monthly Attendance Sheet"
        description="Detailed per-employee timesheet with IN / OUT times, worked hours and overtime. Click any day to edit."
        action={
          <div className="flex items-center gap-2">
            <button onClick={handleExportExcel} disabled={!rows.length}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1D6F42] text-white hover:bg-[#185C37] active:scale-95 transition-all shadow-sm disabled:opacity-50">
              <Download className="w-3.5 h-3.5"/>Export Excel
            </button>
            <button onClick={handlePrint} disabled={!rows.length}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#E02B20] text-white hover:bg-[#C4241A] active:scale-95 transition-all shadow-sm disabled:opacity-50">
              <Printer className="w-3.5 h-3.5"/>Print / PDF
            </button>
          </div>
        }
      />

      {/* Filters */}
      <Card className="p-3 flex flex-wrap items-center gap-3 bg-white/50">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-muted-foreground" />
          <Select value={month} onChange={e => setMonth(parseInt(e.target.value))} className="w-32">
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i+1} value={i+1}>{new Date(2000,i,1).toLocaleString("default",{month:"long"})}</option>
            ))}
          </Select>
        </div>
        <Select value={year} onChange={e => setYear(parseInt(e.target.value))} className="w-24">
          {yearOptions.map(y=><option key={y} value={y}>{y}</option>)}
        </Select>

        <div className="w-px h-5 bg-border" />

        {/* Department filter */}
        <Select value={deptFilter} onChange={e=>setDeptFilter(e.target.value)} className="w-40">
          <option value="all">All Departments</option>
          {departments.map(d=><option key={d} value={d}>{d}</option>)}
        </Select>

        {/* Employee filter */}
        <Select value={empFilter} onChange={e=>setEmpFilter(e.target.value)} className="w-48">
          <option value="all">All Employees</option>
          {allRows.map((r:any)=><option key={r.employeeId} value={String(r.employeeId)}>{r.employeeName} ({r.employeeCode})</option>)}
        </Select>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground"/>
          <input value={searchText} onChange={e=>setSearchText(e.target.value)} placeholder="Search name / ID…"
            className="pl-7 pr-3 py-1.5 text-xs border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 w-44"/>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-primary"/>
          <span className="text-xs font-semibold text-primary">{rows.length} employee{rows.length !== 1 ? "s" : ""}</span>
          <span className="text-xs text-muted-foreground">— {monthName} {year}</span>
        </div>
      </Card>

      {isLoading ? (
        <Card className="p-12 text-center text-sm text-muted-foreground">Loading attendance data…</Card>
      ) : rows.length === 0 ? (
        <Card className="p-12 text-center text-sm text-muted-foreground">No attendance records found for this period.</Card>
      ) : (
        <div className="space-y-5">
          {rows.map((row: any) => {
            const hasSplit  = !!(row.dailyStatus?.some((e: any) => e.inTime2));
            const rowCfgs   = hasSplit ? SPLIT_ROWS : STANDARD_ROWS;
            const totalHours    = (row.dailyStatus||[]).reduce((s:number,e:any)=>s+(e?.hours??0),0);
            const totalOvertime = (row.dailyStatus||[]).reduce((s:number,e:any)=>s+(e?.overtimeHours??0),0);
            const totalDays     = (row.dailyStatus||[]).reduce((s:number,e:any)=>{
              const st = e?.status||"";
              if (st==="present"||st==="late") return s+1;
              if (st==="half_day") return s+0.5;
              if (st==="leave") return s+1;
              return s;
            },0);

            return (
              <Card key={row.employeeId} className="overflow-hidden border border-gray-200 shadow-sm">
                {/* Employee header */}
                <div className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-gray-200 px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-1 text-xs flex-1">
                      <div><span className="text-muted-foreground font-medium">Name: </span><span className="font-bold text-gray-900">{row.employeeName}</span></div>
                      <div><span className="text-muted-foreground font-medium">EMP ID: </span><span className="font-bold text-gray-900">{row.employeeCode}</span></div>
                      <div><span className="text-muted-foreground font-medium">Department: </span><span className="font-semibold text-gray-800">{row.department || "—"}</span></div>
                      <div><span className="text-muted-foreground font-medium">Designation: </span><span className="font-semibold text-gray-800">{row.designation || "—"}</span></div>
                    </div>
                    {/* Summary badges */}
                    <div className="flex flex-wrap gap-2 text-[10px] font-bold shrink-0">
                      <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700">P: {row.presentDays ?? 0}</span>
                      <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700">A: {row.absentDays ?? 0}</span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Late: {row.lateDays ?? 0}</span>
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Hrs: {decimalToHHMM(totalHours)}</span>
                      {totalOvertime > 0 && <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">OT: {decimalToHHMM(totalOvertime)}</span>}
                    </div>
                  </div>
                </div>

                {/* Timesheet table */}
                <div className="overflow-x-auto">
                  <table className="border-collapse text-[10px] w-full min-w-max">
                    <thead>
                      <tr>
                        <th className="border border-gray-300 px-2 py-1.5 bg-gray-100 text-gray-700 font-bold text-center min-w-[80px] text-[9px]">TIME DETAILS</th>
                        {daysArray.map(day => (
                          <th key={day} className={cn(
                            "border border-gray-300 px-1 py-1 text-center font-bold min-w-[34px] text-[9px]",
                            isSundayFn(year, month, day) ? "bg-red-50 text-red-600" : "bg-gray-50 text-gray-700"
                          )}>
                            <div>{getDayName(year, month, day)}</div>
                            <div className="font-bold">{String(day).padStart(2,"0")}</div>
                          </th>
                        ))}
                        <th className="border border-gray-300 px-1 py-1.5 bg-indigo-50 text-indigo-700 font-bold text-center min-w-[46px] text-[9px]">TOTAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rowCfgs.map(cfg => (
                        <tr key={cfg.key}>
                          <td style={{background:cfg.labelBg}} className="border border-gray-300 px-1 py-1 text-center text-white font-bold text-[9px]">
                            {cfg.label}
                          </td>
                          {daysArray.map(day => {
                            const entry  = row.dailyStatus?.find((e: any) => e.day === day);
                            const val    = getCellValue(cfg.key, entry, day);
                            const isSun  = isSundayFn(year, month, day);
                            const clickable = !isSun && entry?.status !== "holiday" && (cfg.key === "status" || cfg.key === "inTime");
                            const isStatusRow = cfg.key === "status";
                            const color = isStatusRow ? getStatusColor(val) : cfg.textColor;
                            return (
                              <td key={day}
                                style={{ background: cfg.rowBg, color, cursor: clickable ? "pointer" : "default" }}
                                onClick={() => clickable && cfg.key === "inTime" && handleCellClick(row, day)}
                                className={cn(
                                  "border border-gray-300 px-0.5 py-0.5 text-center font-bold text-[9px]",
                                  clickable && cfg.key === "inTime" && "hover:ring-2 hover:ring-indigo-400 hover:ring-inset transition-all"
                                )}>
                                {val}
                              </td>
                            );
                          })}
                          {/* Total column per row */}
                          {cfg.key === "workedHours" ? (
                            <td style={{background:cfg.rowBg}} className="border border-gray-300 px-1 py-0.5 text-center font-bold text-[9px] text-blue-700">{decimalToHHMM(totalHours)}</td>
                          ) : cfg.key === "status" ? (
                            <td style={{background:cfg.rowBg}} className="border border-gray-300 px-1 py-0.5 text-center font-bold text-[9px] text-gray-700">{totalDays} d</td>
                          ) : cfg.key === "overtime" ? (
                            <td style={{background:cfg.rowBg}} className="border border-gray-300 px-1 py-0.5 text-center font-bold text-[9px] text-orange-700">{totalOvertime > 0 ? decimalToHHMM(totalOvertime) : "—"}</td>
                          ) : (
                            <td style={{background:cfg.rowBg}} className="border border-gray-300 px-1 py-0.5 text-center text-[9px] text-gray-400">—</td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Footer hint */}
                <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-[10px] text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3"/>
                  <span>Click any <strong>IN TIME</strong> cell to manually edit attendance for that day.</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground bg-card p-3 rounded-xl border border-border">
        {[["#059669","P = Present"],["#d97706","P(L) = Late"],["#dc2626","A = Absent"],["#f59e0b","HD = Half Day"],["#2563eb","LV = Leave"],["#7c3aed","H = Holiday"],["#374151","WO = Week Off"],["#94a3b8","S = Sunday"]].map(([color,label])=>(
          <span key={label} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm inline-block" style={{background:color as string}}/>
            {label}
          </span>
        ))}
        <span className="ml-auto text-muted-foreground/70 flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-indigo-400"/>Click IN TIME cell to edit
        </span>
      </div>
    </div>
  );
}
