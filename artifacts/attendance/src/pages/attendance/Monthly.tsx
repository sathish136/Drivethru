import { useState, useEffect } from "react";
import { Calendar as CalendarIcon, Clock, X, AlertTriangle, CheckCircle2, ClipboardEdit, BarChart2, Timer } from "lucide-react";
import { PageHeader, Card, Select } from "@/components/ui";
import { useMonthlySheet } from "@/hooks/use-attendance";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
function apiUrl(path: string) { return `${BASE}/api${path}`; }

function PdfIconButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} title="Export PDF"
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#E02B20] text-white hover:bg-[#C4241A] active:scale-95 transition-all shadow-sm">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect width="16" height="16" rx="2.5" fill="#E02B20"/><path d="M2 3.5C2 2.67 2.67 2 3.5 2H9.5L14 6.5V12.5C14 13.33 13.33 14 12.5 14H3.5C2.67 14 2 13.33 2 12.5V3.5Z" fill="white" fillOpacity="0.15"/><path d="M9.5 2V6H14" stroke="white" strokeOpacity="0.4" strokeWidth="0.8" fill="none"/><text x="3" y="12" fontSize="5" fontWeight="800" fill="white" fontFamily="Arial,sans-serif" letterSpacing="0.3">PDF</text></svg>
      Export PDF
    </button>
  );
}

function ExcelIconButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} title="Export Excel"
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1D6F42] text-white hover:bg-[#185C37] active:scale-95 transition-all shadow-sm">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect width="16" height="16" rx="2.5" fill="#1D6F42"/><path d="M2 3H9V13H2V3Z" fill="#21A366" fillOpacity="0.5"/><path d="M9 2H13.5C13.78 2 14 2.22 14 2.5V13.5C14 13.78 13.78 14 13.5 14H9V2Z" fill="white" fillOpacity="0.12"/><line x1="9" y1="2" x2="9" y2="14" stroke="white" strokeOpacity="0.3" strokeWidth="0.8"/><text x="2.5" y="11" fontSize="7.5" fontWeight="900" fill="white" fontFamily="Arial,sans-serif">X</text></svg>
      Export Excel
    </button>
  );
}

interface LeaveBalance {
  annualRemaining: number;
  casualRemaining: number;
  annualLeaveBalance: number;
  casualLeaveBalance: number;
  annualLeaveUsed: number;
  casualLeaveUsed: number;
}

interface SelectedCell {
  employeeId: number;
  branchId: number;
  employeeName: string;
  date: string;
  currentStatus: string;
  currentLeaveType: string | null;
  currentInTime1?: string | null;
  currentOutTime1?: string | null;
  currentInTime2?: string | null;
  currentOutTime2?: string | null;
  currentRemarks?: string | null;
}

function ManualAttendanceModal({
  cell,
  onClose,
  onSuccess,
}: {
  cell: SelectedCell;
  onClose: () => void;
  onSuccess: () => void;
}) {
  // Normalize "HH:MM:SS" → "HH:MM" so <input type="time"> shows the value.
  const normTime = (t?: string | null) => (t ? t.slice(0, 5) : "");
  const initialStatus = (["present","late","half_day","absent"].includes(cell.currentStatus)
    ? cell.currentStatus
    : "present") as "present" | "late" | "half_day" | "absent";
  const [status, setStatus] = useState<"present" | "late" | "half_day" | "absent">(initialStatus);
  const [inTime1, setInTime1] = useState(normTime(cell.currentInTime1));
  const [outTime1, setOutTime1] = useState(normTime(cell.currentOutTime1));
  const [inTime2, setInTime2] = useState(normTime(cell.currentInTime2));
  const [outTime2, setOutTime2] = useState(normTime(cell.currentOutTime2));
  const [remarks, setRemarks] = useState(cell.currentRemarks ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    setSubmitting(true);
    setError(null);
    try {
      const body: any = { employeeId: cell.employeeId, date: cell.date, status, remarks: remarks || undefined };
      if (inTime1) body.inTime1 = inTime1;
      if (outTime1) body.outTime1 = outTime1;
      if (inTime2) body.inTime2 = inTime2;
      if (outTime2) body.outTime2 = outTime2;

      const r = await fetch(apiUrl("/attendance/manual-entry"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) {
        setError(d.message || "Failed to save manual attendance");
      } else {
        setSuccess(true);
        setTimeout(() => { onSuccess(); onClose(); }, 1200);
      }
    } catch {
      setError("Network error. Please try again.");
    }
    setSubmitting(false);
  }

  const colorMap = { green: { border: "border-green-500", bg: "bg-green-50", text: "text-green-700", dot: "border-green-500 bg-green-500" }, amber: { border: "border-amber-500", bg: "bg-amber-50", text: "text-amber-700", dot: "border-amber-500 bg-amber-500" }, yellow: { border: "border-yellow-500", bg: "bg-yellow-50", text: "text-yellow-700", dot: "border-yellow-500 bg-yellow-500" }, red: { border: "border-red-500", bg: "bg-red-50", text: "text-red-700", dot: "border-red-500 bg-red-500" } };

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
            const c = colorMap[opt.color];
            const selected = status === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setStatus(opt.value)}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all text-left",
                  selected ? `${c.border} ${c.bg} ${c.text}` : "border-border hover:border-muted-foreground/40 text-foreground"
                )}
              >
                <div className={cn("w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0",
                  selected ? c.dot : "border-muted-foreground/50")}>
                  {selected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div>
                  <div className="font-semibold text-xs leading-tight">{opt.label}</div>
                  <div className="text-[10px] text-muted-foreground leading-tight">{opt.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {status !== "absent" && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Punch Times <span className="normal-case font-normal">(optional)</span></p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-muted-foreground font-medium block mb-1">In Time 1</label>
              <input type="time" value={inTime1} onChange={e => setInTime1(e.target.value)}
                className="w-full text-xs border border-border rounded-lg px-2 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground font-medium block mb-1">Out Time 1</label>
              <input type="time" value={outTime1} onChange={e => setOutTime1(e.target.value)}
                className="w-full text-xs border border-border rounded-lg px-2 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground font-medium block mb-1">In Time 2 <span className="text-muted-foreground/60">(2nd session)</span></label>
              <input type="time" value={inTime2} onChange={e => setInTime2(e.target.value)}
                className="w-full text-xs border border-border rounded-lg px-2 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground font-medium block mb-1">Out Time 2 <span className="text-muted-foreground/60">(2nd session)</span></label>
              <input type="time" value={outTime2} onChange={e => setOutTime2(e.target.value)}
                className="w-full text-xs border border-border rounded-lg px-2 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
        </div>
      )}

      <div>
        <label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide block mb-1">Remarks <span className="normal-case font-normal">(optional)</span></label>
        <textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={2} placeholder="e.g. Biometric not captured, site visit..."
          className="w-full text-xs border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
      </div>

      {error && (
        <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200">
          <X className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-green-50 border border-green-200">
          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
          <p className="text-xs text-green-700 font-medium">Attendance saved successfully!</p>
        </div>
      )}

      <div className="flex items-center gap-3 pt-1">
        <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting || success}
          className={cn(
            "flex-1 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all",
            !submitting && !success ? "bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98]" : "bg-muted-foreground/30 cursor-not-allowed"
          )}
        >
          {submitting ? "Saving…" : success ? "Saved!" : "Save Attendance"}
        </button>
      </div>
    </div>
  );
}

function CellActionModal({
  cell,
  year,
  onClose,
  onSuccess,
}: {
  cell: SelectedCell;
  year: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [tab, setTab] = useState<"manual" | "leave">("manual");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-gradient-to-r from-indigo-50 to-blue-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
              <ClipboardEdit className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <p className="font-semibold text-sm text-foreground">Attendance Entry</p>
              <p className="text-xs text-muted-foreground">{cell.employeeName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="flex border-b border-border">
          <button
            onClick={() => setTab("manual")}
            className={cn(
              "flex-1 py-2.5 text-xs font-semibold transition-colors border-b-2",
              tab === "manual" ? "border-indigo-500 text-indigo-600 bg-indigo-50/50" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Manual Attendance
          </button>
          <button
            onClick={() => setTab("leave")}
            className={cn(
              "flex-1 py-2.5 text-xs font-semibold transition-colors border-b-2",
              tab === "leave" ? "border-blue-500 text-blue-600 bg-blue-50/50" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Mark Leave
          </button>
        </div>

        {tab === "manual" ? (
          <ManualAttendanceModal cell={cell} onClose={onClose} onSuccess={onSuccess} />
        ) : (
          <LeaveEntryInner cell={cell} year={year} onClose={onClose} onSuccess={onSuccess} />
        )}
      </div>
    </div>
  );
}

function LeaveEntryInner({
  cell,
  year,
  onClose,
  onSuccess,
}: {
  cell: SelectedCell;
  year: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [selectedType, setSelectedType] = useState<"annual" | "casual" | "no_pay" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setLoadingBalance(true);
    fetch(apiUrl(`/leave-balances/employee/${cell.employeeId}?year=${year}`))
      .then(r => r.json())
      .then(d => { setBalance(d); setLoadingBalance(false); })
      .catch(() => { setBalance(null); setLoadingBalance(false); });
  }, [cell.employeeId, year]);

  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const dateObj = new Date(cell.date + "T00:00:00");
  const formattedDate = `${dateObj.getDate()} ${MONTHS[dateObj.getMonth()]} ${dateObj.getFullYear()} (${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][dateObj.getDay()]})`;

  async function handleSubmit() {
    if (!selectedType) return;
    setSubmitting(true);
    setError(null);
    try {
      const r = await fetch(apiUrl("/attendance/mark-leave"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: cell.employeeId, date: cell.date, leaveType: selectedType }),
      });
      const d = await r.json();
      if (!r.ok) {
        setError(d.message || "Failed to mark leave");
      } else {
        setSuccess(true);
        setTimeout(() => { onSuccess(); onClose(); }, 1200);
      }
    } catch {
      setError("Network error. Please try again.");
    }
    setSubmitting(false);
  }

  const annualOk = (balance?.annualRemaining ?? 0) >= 1;
  const casualOk = (balance?.casualRemaining ?? 0) >= 1;

  return (
    <>
    <div className="px-6 py-5 space-y-5">
          {/* Date */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
            <CalendarIcon className="w-4 h-4 text-blue-500 shrink-0" />
            <span className="font-medium text-foreground">{formattedDate}</span>
            {cell.currentStatus === "leave" && (
              <span className="ml-auto text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-semibold">
                {cell.currentLeaveType === "annual" ? "Annual Leave" : cell.currentLeaveType === "casual" ? "Casual Leave" : "Leave"}
              </span>
            )}
          </div>

          {/* Leave balance */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Available Leave Balance</p>
            {loadingBalance ? (
              <div className="flex gap-3">
                {[1,2].map(i => <div key={i} className="flex-1 h-16 rounded-xl bg-muted/50 animate-pulse" />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className={cn("rounded-xl border-2 p-3 text-center transition-all",
                  annualOk ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50")}>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Annual Leave</p>
                  <p className={cn("text-2xl font-bold", annualOk ? "text-green-700" : "text-red-600")}>
                    {(balance?.annualRemaining ?? 0).toFixed(1)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">days remaining</p>
                  <p className="text-[10px] text-muted-foreground">{balance?.annualLeaveUsed ?? 0} used / {balance?.annualLeaveBalance ?? 0} total</p>
                </div>
                <div className={cn("rounded-xl border-2 p-3 text-center transition-all",
                  casualOk ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50")}>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Casual Leave</p>
                  <p className={cn("text-2xl font-bold", casualOk ? "text-green-700" : "text-red-600")}>
                    {(balance?.casualRemaining ?? 0).toFixed(1)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">days remaining</p>
                  <p className="text-[10px] text-muted-foreground">{balance?.casualLeaveUsed ?? 0} used / {balance?.casualLeaveBalance ?? 0} total</p>
                </div>
              </div>
            )}
          </div>

          {/* Leave type selection */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Select Leave Type</p>
            <div className="space-y-2">
              {/* Annual Leave */}
              <button
                onClick={() => setSelectedType("annual")}
                disabled={!annualOk}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all text-left",
                  selectedType === "annual"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : annualOk
                    ? "border-border hover:border-blue-300 hover:bg-blue-50/50 text-foreground"
                    : "border-dashed border-muted-foreground/30 bg-muted/20 text-muted-foreground cursor-not-allowed opacity-60"
                )}
              >
                <div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",
                  selectedType === "annual" ? "border-blue-500 bg-blue-500" : "border-muted-foreground/50")}>
                  {selectedType === "annual" && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <div className="flex-1">
                  <span>Annual Leave</span>
                  {!annualOk && <span className="ml-2 text-xs text-red-500">(no balance)</span>}
                </div>
                {annualOk && <span className="text-xs text-green-600 font-semibold">{(balance?.annualRemaining ?? 0).toFixed(1)} days left</span>}
              </button>

              {/* Casual Leave */}
              <button
                onClick={() => setSelectedType("casual")}
                disabled={!casualOk}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all text-left",
                  selectedType === "casual"
                    ? "border-purple-500 bg-purple-50 text-purple-700"
                    : casualOk
                    ? "border-border hover:border-purple-300 hover:bg-purple-50/50 text-foreground"
                    : "border-dashed border-muted-foreground/30 bg-muted/20 text-muted-foreground cursor-not-allowed opacity-60"
                )}
              >
                <div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",
                  selectedType === "casual" ? "border-purple-500 bg-purple-500" : "border-muted-foreground/50")}>
                  {selectedType === "casual" && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <div className="flex-1">
                  <span>Casual Leave</span>
                  {!casualOk && <span className="ml-2 text-xs text-red-500">(no balance)</span>}
                </div>
                {casualOk && <span className="text-xs text-green-600 font-semibold">{(balance?.casualRemaining ?? 0).toFixed(1)} days left</span>}
              </button>

              {/* No-Pay Leave */}
              <button
                onClick={() => setSelectedType("no_pay")}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all text-left",
                  selectedType === "no_pay"
                    ? "border-orange-500 bg-orange-50 text-orange-700"
                    : "border-border hover:border-orange-300 hover:bg-orange-50/50 text-foreground"
                )}
              >
                <div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",
                  selectedType === "no_pay" ? "border-orange-500 bg-orange-500" : "border-muted-foreground/50")}>
                  {selectedType === "no_pay" && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <div className="flex-1">No-Pay Leave</div>
                <span className="text-xs text-orange-600 font-semibold">Salary deducted</span>
              </button>
            </div>
          </div>

          {/* Warning for no-pay */}
          {selectedType === "no_pay" && (
            <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-orange-50 border border-orange-200">
              <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
              <p className="text-xs text-orange-700">This day will be marked as absent and <strong>1 day's salary will be deducted</strong> during payroll calculation.</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200">
              <X className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-green-50 border border-green-200">
              <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
              <p className="text-xs text-green-700 font-medium">Leave recorded successfully!</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-border flex items-center gap-3 bg-muted/20">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedType || submitting || success}
            className={cn(
              "flex-1 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all",
              selectedType && !submitting && !success
                ? "bg-blue-600 hover:bg-blue-700 active:scale-[0.98]"
                : "bg-muted-foreground/30 cursor-not-allowed"
            )}
          >
            {submitting ? "Saving…" : success ? "Saved!" : "Confirm Leave"}
          </button>
        </div>
    </>
  );
}

export default function MonthlySheet() {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear]   = useState(new Date().getFullYear());
  const [showTimes, setShowTimes] = useState(true);
  const { data, isLoading, refetch } = useMonthlySheet({ month, year });

  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);

  const daysInMonth = new Date(year, month, 0).getDate();
  const daysArray   = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const rows: any[] = data?.rows || [];

  const STATUS_CFG: Record<string, { bg: string; text: string; label: string }> = {
    present:  { bg: "bg-green-100",  text: "text-green-800",  label: "P"  },
    late:     { bg: "bg-green-100",  text: "text-amber-700",  label: "P(L)" },
    absent:   { bg: "bg-red-100",    text: "text-red-800",    label: "A"  },
    half_day: { bg: "bg-yellow-100", text: "text-yellow-800", label: "H"  },
    leave:    { bg: "bg-blue-100",   text: "text-blue-800",   label: "LV" },
    holiday:  { bg: "bg-gray-200",   text: "text-gray-700",   label: "HL" },
    off_day:  { bg: "bg-purple-100", text: "text-purple-700", label: "WO" },
    sunday:   { bg: "bg-slate-100",  text: "text-slate-400",  label: "DO" },
  };

  function fmtTime(t: string | null | undefined) {
    if (!t) return null;
    const [h, m] = t.split(":");
    const hr = parseInt(h);
    return `${hr > 12 ? hr - 12 : hr || 12}:${m}${hr >= 12 ? "pm" : "am"}`;
  }

  function fmtHrs(h: number | null | undefined) {
    if (h == null) return "—";
    const hrs = Math.floor(h);
    const mins = Math.round((h - hrs) * 60);
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  }

  const dayNames = ["Su","Mo","Tu","We","Th","Fr","Sa"];
  function getDayName(d: number) { return dayNames[new Date(year, month - 1, d).getDay()]; }
  function isSunday(d: number) { return new Date(year, month - 1, d).getDay() === 0; }

  const yearOptions = [2023, 2024, 2025, 2026, 2027];
  const monthName = new Date(year, month - 1, 1).toLocaleString("default", { month: "long" });

  function handleCellClick(row: any, day: number) {
    if (isSunday(day)) return;
    const dateStr = `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    const entry = row.dailyStatus?.find((d: any) => d.day === day);
    const status = entry?.status || "absent";
    if (status === "holiday") return;
    setSelectedCell({
      employeeId: row.employeeId,
      branchId: row.branchId,
      employeeName: row.employeeName,
      date: dateStr,
      currentStatus: status,
      currentLeaveType: entry?.leaveType ?? null,
      currentInTime1: entry?.inTime ?? null,
      currentOutTime1: entry?.outTime ?? null,
      currentInTime2: entry?.inTime2 ?? null,
      currentOutTime2: entry?.outTime2 ?? null,
      currentRemarks: entry?.remarks ?? null,
    });
  }

  const handleExportPdf = () => {
    const dayHeader = daysArray.map(d => `<th style="min-width:28px;text-align:center;padding:4px 2px;font-size:8px;background:#1565a8;color:#fff;">${d}<br/><span style="font-size:7px;opacity:.8">${getDayName(d)}</span></th>`).join("");
    const bodyRows = rows.map((row: any) =>
      `<tr>
        <td style="padding:4px 8px;white-space:nowrap;font-weight:600;border-bottom:1px solid #f0f0f0">${row.employeeName}<br/><span style="font-size:8px;color:#9ca3af">${row.employeeCode}</span></td>
        ${daysArray.map(day => {
          const e = row.dailyStatus?.find((d: any) => d.day === day);
          const st = e?.status || "absent";
          const isSun = new Date(year, month - 1, day).getDay() === 0;
          const effectiveSt2 = (st === "absent" && isSun) ? "sunday" : st;
          const colors: Record<string,string> = { present:"#dcfce7", late:"#dcfce7", absent:"#fee2e2", half_day:"#fef9c3", leave:"#dbeafe", holiday:"#f3f4f6", off_day:"#f3e8ff", sunday:"#f1f5f9" };
          const labels: Record<string,string> = { present:"P", late:"P(L)", absent:"A", half_day:"H", leave:"LV", holiday:"HL", off_day:"WO", sunday:"DO" };
          return `<td style="padding:2px;text-align:center;border-bottom:1px solid #f0f0f0"><div style="background:${colors[effectiveSt2]||"#f3f4f6"};border-radius:3px;padding:2px;font-size:8px;font-weight:700">${labels[effectiveSt2]||"A"}</div></td>`;
        }).join("")}
        <td style="text-align:center;font-weight:700;color:#16a34a;padding:4px;border-bottom:1px solid #f0f0f0">${row.presentDays??0}</td>
        <td style="text-align:center;font-weight:700;color:#dc2626;padding:4px;border-bottom:1px solid #f0f0f0">${row.absentDays??0}</td>
        <td style="text-align:center;font-weight:700;color:#d97706;padding:4px;border-bottom:1px solid #f0f0f0">${row.lateDays??0}</td>
        <td style="text-align:center;font-family:monospace;color:#1d4ed8;padding:4px;border-bottom:1px solid #f0f0f0">${fmtHrs(row.totalWorkHours)}</td>
        <td style="text-align:center;font-family:monospace;color:#ea580c;padding:4px;border-bottom:1px solid #f0f0f0">${row.overtimeHours>0?fmtHrs(row.overtimeHours):"—"}</td>
      </tr>`
    ).join("");
    const w = window.open("", "_blank", "width=1400,height=900");
    if (!w) { alert("Please allow popups to export PDF."); return; }
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Monthly Sheet – ${monthName} ${year}</title>
    <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:9px;color:#1a1a1a}
    table{width:100%;border-collapse:collapse}th{background:#1565a8;color:#fff;padding:5px 4px;font-size:8px}
    @media print{@page{margin:6mm;size:landscape}}</style></head><body>
    <div style="padding:12px 20px 8px;border-bottom:3px solid #1565a8;background:#f5f8ff;display:flex;justify-content:space-between;align-items:center">
      <div><div style="font-size:16px;font-weight:700;color:#1565a8">Monthly Attendance Sheet</div>
      <div style="font-size:10px;color:#6b7280">${monthName} ${year} · ${rows.length} Employees</div></div>
      <div style="font-size:9px;color:#9ca3af">Generated: ${new Date().toLocaleString()}</div>
    </div>
    <table><thead><tr>
      <th style="text-align:left;min-width:160px;padding:6px 8px">Employee</th>
      ${dayHeader}
      <th style="background:#16a34a">P</th><th style="background:#dc2626">A</th><th style="background:#d97706">L</th>
      <th style="background:#1d4ed8">Total Hrs</th><th style="background:#ea580c">OT Hrs</th>
    </tr></thead><tbody>${bodyRows}</tbody></table>
    <script>window.addEventListener("load",function(){setTimeout(function(){window.print();},300);});<\/script>
    </body></html>`);
    w.document.close();
  };

  const handleExportExcel = () => {
    const escape = (v: string | number) => { const s = String(v??""); return s.includes(",")||s.includes('"')?`"${s.replace(/"/g,'""')}"`:s; };
    const dayHeaders = daysArray.map(d => `${getDayName(d)} ${d}`);
    const headers = ["Emp ID","Employee","Designation",...dayHeaders,"Present","Absent","Late","Total Hrs","OT Hrs"];
    const csvRows = rows.map((row: any) => {
      const dayStatuses = daysArray.map(day => {
        const e = row.dailyStatus?.find((d: any) => d.day === day);
        const isSun = new Date(year, month - 1, day).getDay() === 0;
        const st = e?.status || "absent";
        const effectiveSt3 = (st === "absent" && isSun) ? "sunday" : st;
        const labels: Record<string,string> = { present:"P", late:"P(L)", absent:"A", half_day:"H", leave:"LV", holiday:"HL", off_day:"WO", sunday:"DO" };
        return labels[effectiveSt3] || "A";
      });
      return [row.employeeCode, row.employeeName, row.designation||"", ...dayStatuses,
        row.presentDays??0, row.absentDays??0, row.lateDays??0,
        row.totalWorkHours!=null?row.totalWorkHours.toFixed(1):"", row.overtimeHours>0?row.overtimeHours.toFixed(1):"0"];
    });
    const csv = [headers,...csvRows].map(r=>r.map(escape).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download=`monthly-sheet-${monthName}-${year}.csv`; a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  };

  return (
    <div className="space-y-4">
      {selectedCell && (
        <CellActionModal
          cell={selectedCell}
          year={year}
          onClose={() => setSelectedCell(null)}
          onSuccess={() => { setSelectedCell(null); refetch?.(); }}
        />
      )}

      <PageHeader
        title="Monthly Attendance Sheet"
        description="Click any day cell to manually set attendance or mark leave. Grid shows in/out times, work hours, and OT per employee."
        action={
          <div className="flex items-center gap-2">
            <ExcelIconButton onClick={handleExportExcel} />
            <PdfIconButton onClick={handleExportPdf} />
          </div>
        }
      />

      <Card className="p-3 flex flex-wrap items-center gap-3 bg-white/50">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-muted-foreground" />
          <Select value={month} onChange={e => setMonth(parseInt(e.target.value))} className="w-32">
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>{new Date(2000, i, 1).toLocaleString("default", { month: "long" })}</option>
            ))}
          </Select>
        </div>
        <Select value={year} onChange={e => setYear(parseInt(e.target.value))} className="w-24">
          {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
        </Select>

        <div className="ml-auto flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground bg-indigo-50 border border-indigo-200 text-indigo-600 px-2 py-0.5 rounded font-medium">
              Click a cell to set attendance or leave
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Show times</span>
            <button
              onClick={() => setShowTimes(v => !v)}
              className={cn("relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                showTimes ? "bg-primary" : "bg-muted-foreground/30")}
            >
              <span className={cn("inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform",
                showTimes ? "translate-x-4" : "translate-x-0.5")} />
            </button>
          </div>
        </div>
      </Card>

      {isLoading ? (
        <Card className="p-12 text-center text-sm text-muted-foreground">Loading attendance data...</Card>
      ) : rows.length === 0 ? (
        <Card className="p-12 text-center text-sm text-muted-foreground">No attendance records found for this period.</Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="w-full overflow-x-auto">
            <table className="text-xs border-collapse min-w-max">
              <thead>
                <tr>
                  <th className="px-4 py-2.5 bg-muted/60 font-semibold border-b border-r border-border sticky left-0 z-20 min-w-[220px] text-left shadow-[1px_0_0_0_hsl(var(--border))]">
                    Employee
                  </th>
                  {daysArray.map(day => (
                    <th key={day} className={cn(
                      "px-1 py-1 bg-muted/60 font-semibold border-b border-border text-center",
                      showTimes ? "min-w-[68px]" : "min-w-[34px]",
                      isSunday(day) && "bg-red-50/80 text-red-600"
                    )}>
                      <div className="font-bold leading-tight">{day}</div>
                      <div className={cn("text-[9px] font-normal leading-tight", isSunday(day) ? "text-red-400" : "text-muted-foreground")}>
                        {getDayName(day)}
                      </div>
                    </th>
                  ))}
                  <th className="px-2 py-2.5 bg-green-50 text-green-700 font-bold border-b border-border text-center min-w-[36px]">P</th>
                  <th className="px-2 py-2.5 bg-red-50 text-red-600 font-bold border-b border-border text-center min-w-[36px]">A</th>
                  <th className="px-2 py-2.5 bg-amber-50 text-amber-600 font-bold border-b border-border text-center min-w-[36px]">L</th>
                  <th className="px-3 py-2.5 bg-blue-50 text-blue-700 font-bold border-b border-border text-center min-w-[60px]">Total Hrs</th>
                  <th className="px-3 py-2.5 bg-orange-50 text-orange-700 font-bold border-b border-border text-center min-w-[56px]">OT Hrs</th>
                  <th className="px-3 py-2.5 bg-indigo-50 text-indigo-700 font-bold border-b border-border text-center min-w-[80px]">Reports</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row: any, idx: number) => (
                  <tr key={idx} className="hover:bg-muted/20 border-b border-border/50 group">
                    <td className="px-3 py-2 bg-card border-r border-border sticky left-0 z-10 shadow-[1px_0_0_0_hsl(var(--border))] group-hover:bg-muted/10">
                      <div className="font-semibold text-foreground truncate max-w-[200px]">{row.employeeName}</div>
                      <div className="text-[10px] text-muted-foreground">{row.employeeCode} · {row.designation}</div>
                    </td>
                    {daysArray.map(day => {
                      const entry = row.dailyStatus?.find((d: any) => d.day === day);
                      const st    = entry?.status || "absent";
                      const effectiveSt = (st === "absent" && isSunday(day)) ? "sunday" : st;
                      const cfg   = STATUS_CFG[effectiveSt] || STATUS_CFG.absent;
                      const inT   = fmtTime(entry?.inTime);
                      const outT  = fmtTime(entry?.outTime);
                      const inT2  = fmtTime(entry?.inTime2);
                      const outT2 = fmtTime(entry?.outTime2);
                      const hrs   = entry?.hours;
                      const clickable = !isSunday(day) && effectiveSt !== "holiday";

                      return (
                        <td key={day} className={cn(
                          "px-0.5 py-0.5 text-center align-middle",
                          isSunday(day) && "bg-red-50/30"
                        )}>
                          {showTimes ? (
                            <div
                              onClick={() => clickable && handleCellClick(row, day)}
                              title={clickable ? "Click to set attendance or leave" : undefined}
                              className={cn(
                                "rounded px-0.5 py-0.5 flex flex-col items-center gap-0",
                                cfg.bg,
                                clickable && "cursor-pointer hover:ring-2 hover:ring-indigo-400 hover:ring-offset-1 transition-all"
                              )}>
                              <span className={cn("text-[10px] font-bold leading-tight", cfg.text)}>{cfg.label}</span>
                              {entry?.leaveType && effectiveSt === "leave" && (
                                <span className="text-[7px] text-blue-600 font-semibold leading-tight uppercase">{entry.leaveType}</span>
                              )}
                              {inT && <span className="text-[8px] leading-tight text-blue-600 font-mono">{inT}</span>}
                              {outT && <span className="text-[8px] leading-tight text-blue-400 font-mono">{outT}</span>}
                              {inT2 && <span className="text-[8px] leading-tight text-orange-600 font-mono">{inT2}</span>}
                              {outT2 && <span className="text-[8px] leading-tight text-orange-400 font-mono">{outT2}</span>}
                              {hrs != null && <span className="text-[8px] leading-tight font-semibold text-gray-700">{fmtHrs(hrs)}</span>}
                            </div>
                          ) : (
                            <div
                              onClick={() => clickable && handleCellClick(row, day)}
                              title={clickable ? "Click to set attendance or leave" : undefined}
                              className={cn(
                                "w-7 h-7 mx-auto flex items-center justify-center rounded text-[10px] font-bold",
                                cfg.bg, cfg.text,
                                clickable && "cursor-pointer hover:ring-2 hover:ring-indigo-400 hover:ring-offset-1 transition-all"
                              )}>
                              {cfg.label}
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-2 py-2 text-center font-bold text-green-700 bg-green-50/40">{row.presentDays ?? 0}</td>
                    <td className="px-2 py-2 text-center font-bold text-red-600 bg-red-50/40">{row.absentDays ?? 0}</td>
                    <td className="px-2 py-2 text-center font-bold text-amber-600 bg-amber-50/40">{row.lateDays ?? 0}</td>
                    <td className="px-3 py-2 text-center font-mono font-semibold text-blue-700 bg-blue-50/30">{fmtHrs(row.totalWorkHours)}</td>
                    <td className={cn(
                      "px-3 py-2 text-center font-mono font-semibold bg-orange-50/30",
                      row.overtimeHours > 0 ? "text-orange-600" : "text-muted-foreground"
                    )}>
                      {row.overtimeHours > 0 ? fmtHrs(row.overtimeHours) : "—"}
                    </td>
                    <td className="px-2 py-1.5 text-center bg-indigo-50/20">
                      <div className="flex flex-col gap-1 items-center">
                        <a
                          href={`${BASE}/reports?tab=monthly&emp=${encodeURIComponent(row.employeeName)}&month=${month}&year=${year}`}
                          title="View Monthly Report"
                          className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors whitespace-nowrap"
                        >
                          <BarChart2 className="w-3 h-3" />Monthly
                        </a>
                        <a
                          href={`${BASE}/reports?tab=overtime&emp=${encodeURIComponent(row.employeeName)}&month=${month}&year=${year}`}
                          title="View OT Report"
                          className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors whitespace-nowrap"
                        >
                          <Timer className="w-3 h-3" />OT
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground bg-card p-3 rounded-xl border border-border">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-green-100 border border-green-200 rounded inline-block" /> P = Present</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-red-100 border border-red-200 rounded inline-block" /> A = Absent</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-amber-100 border border-amber-200 rounded inline-block" /> L = Late</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-yellow-100 border border-yellow-200 rounded inline-block" /> HD = Half Day</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-blue-100 border border-blue-200 rounded inline-block" /> LV = Leave</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-gray-200 border border-gray-300 rounded inline-block" /> HL = Holiday</span>
        <span className="ml-auto text-muted-foreground/70 flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-blue-400" /> Click any cell to assign leave
        </span>
      </div>
    </div>
  );
}
