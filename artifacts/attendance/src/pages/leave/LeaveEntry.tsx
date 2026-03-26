import { useState, useEffect } from "react";
import { PageHeader, Card, Button, Label } from "@/components/ui";
import {
  CalendarClock, Search, CheckCircle2, AlertTriangle,
  ClipboardList, User, CalendarDays, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
function apiUrl(path: string) { return `${BASE}/api${path}`; }

interface Employee {
  id: number;
  employeeId: string;
  fullName: string;
  designation: string;
  department: string;
}

interface LeaveBalance {
  annualRemaining: number;
  casualRemaining: number;
  annualLeaveUsed: number;
  casualLeaveUsed: number;
}

interface RecentEntry {
  id: number;
  employeeCode: string;
  employeeName: string;
  date: string;
  leaveType: string;
  status: string;
}

const LEAVE_TYPES = [
  {
    id: "annual",
    label: "Annual Leave",
    desc: "Deducted from annual leave balance",
    color: "border-blue-200 bg-blue-50 data-[selected=true]:border-blue-500 data-[selected=true]:bg-blue-100",
    badge: "bg-blue-100 text-blue-700",
    balanceKey: "annualRemaining" as keyof LeaveBalance,
  },
  {
    id: "casual",
    label: "Casual Leave",
    desc: "Deducted from casual leave balance",
    color: "border-amber-200 bg-amber-50 data-[selected=true]:border-amber-500 data-[selected=true]:bg-amber-100",
    badge: "bg-amber-100 text-amber-700",
    balanceKey: "casualRemaining" as keyof LeaveBalance,
  },
  {
    id: "no_pay",
    label: "No-Pay Leave",
    desc: "Salary will be deducted for this day",
    color: "border-red-200 bg-red-50 data-[selected=true]:border-red-500 data-[selected=true]:bg-red-100",
    badge: "bg-red-100 text-red-700",
    balanceKey: null,
  },
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function LeaveEntry() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [empSearch, setEmpSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [date, setDate] = useState(today());
  const [leaveType, setLeaveType] = useState<string>("annual");
  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [recent, setRecent] = useState<RecentEntry[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);

  useEffect(() => {
    fetch(apiUrl("/employees?limit=500"))
      .then(r => r.json())
      .then(d => setEmployees(d.employees || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedEmp) { setBalance(null); return; }
    const year = new Date(date || today()).getFullYear();
    setBalanceLoading(true);
    fetch(apiUrl(`/leave-balances/employee/${selectedEmp.id}?year=${year}`))
      .then(r => r.json())
      .then(d => setBalance(d))
      .catch(() => setBalance(null))
      .finally(() => setBalanceLoading(false));
  }, [selectedEmp, date]);

  useEffect(() => { loadRecent(); }, []);

  function loadRecent() {
    setRecentLoading(true);
    fetch(apiUrl("/attendance/recent-leaves?limit=15"))
      .then(r => r.json())
      .then(d => setRecent(Array.isArray(d) ? d : []))
      .catch(() => setRecent([]))
      .finally(() => setRecentLoading(false));
  }

  const filteredEmps = employees.filter(e => {
    const q = empSearch.toLowerCase();
    return (
      e.fullName.toLowerCase().includes(q) ||
      e.employeeId.toLowerCase().includes(q) ||
      (e.department || "").toLowerCase().includes(q)
    );
  }).slice(0, 10);

  function selectEmployee(emp: Employee) {
    setSelectedEmp(emp);
    setEmpSearch(emp.fullName);
    setShowDropdown(false);
    setSuccessMsg("");
    setErrorMsg("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEmp || !date || !leaveType) return;
    setSubmitting(true);
    setSuccessMsg("");
    setErrorMsg("");
    try {
      const res = await fetch(apiUrl("/attendance/mark-leave"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: selectedEmp.id, date, leaveType }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.message || "Failed to mark leave. Please try again.");
      } else {
        const typeLabel = LEAVE_TYPES.find(t => t.id === leaveType)?.label || leaveType;
        setSuccessMsg(`Leave marked: ${selectedEmp.fullName} — ${typeLabel} on ${date}`);
        const year = new Date(date).getFullYear();
        const updated = await fetch(apiUrl(`/leave-balances/employee/${selectedEmp.id}?year=${year}`)).then(r => r.json()).catch(() => null);
        if (updated) setBalance(updated);
        loadRecent();
      }
    } catch {
      setErrorMsg("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    setSelectedEmp(null);
    setEmpSearch("");
    setDate(today());
    setLeaveType("annual");
    setBalance(null);
    setSuccessMsg("");
    setErrorMsg("");
  }

  const selectedType = LEAVE_TYPES.find(t => t.id === leaveType)!;
  const remainingForType =
    selectedType.balanceKey && balance
      ? (balance[selectedType.balanceKey] as number)
      : null;
  const noBalance = remainingForType !== null && remainingForType <= 0;

  return (
    <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto">
      <PageHeader
        title="Leave Entry"
        description="Manually record leave for an employee — Annual, Casual, or No-Pay."
        icon={<CalendarClock className="w-5 h-5" />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Form ── */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 flex flex-col gap-4">
          {/* Employee selector */}
          <Card className="p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b pb-3 mb-1">
              <User className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm">Select Employee</span>
            </div>

            <div className="relative">
              <Label className="text-xs text-muted-foreground mb-1.5 block">Employee Name / ID</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={empSearch}
                  onChange={e => { setEmpSearch(e.target.value); setShowDropdown(true); setSelectedEmp(null); }}
                  onFocus={() => setShowDropdown(true)}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                  placeholder="Search by name or employee ID…"
                  className="w-full pl-9 pr-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-background"
                />
              </div>

              {showDropdown && filteredEmps.length > 0 && (
                <div className="absolute z-30 mt-1 w-full bg-card border border-border rounded-xl shadow-xl overflow-hidden max-h-56 overflow-y-auto">
                  {filteredEmps.map(emp => (
                    <button
                      key={emp.id}
                      type="button"
                      onMouseDown={() => selectEmployee(emp)}
                      className="w-full text-left px-4 py-2.5 hover:bg-muted/60 transition-colors flex flex-col gap-0.5"
                    >
                      <span className="text-sm font-medium text-foreground">{emp.fullName}</span>
                      <span className="text-xs text-muted-foreground">{emp.employeeId} · {emp.designation || emp.department}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedEmp && (
              <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-lg px-4 py-3">
                <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                  {selectedEmp.fullName.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-foreground">{selectedEmp.fullName}</p>
                  <p className="text-xs text-muted-foreground">{selectedEmp.employeeId} · {selectedEmp.designation}</p>
                </div>
              </div>
            )}
          </Card>

          {/* Date + leave type */}
          <Card className="p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b pb-3 mb-1">
              <CalendarDays className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm">Leave Details</span>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Leave Date</Label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                required
                className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-background"
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Leave Type</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {LEAVE_TYPES.map(type => {
                  const rem = type.balanceKey && balance ? (balance[type.balanceKey] as number) : null;
                  const depleted = rem !== null && rem <= 0;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      data-selected={leaveType === type.id}
                      onClick={() => setLeaveType(type.id)}
                      className={cn(
                        "flex flex-col gap-1.5 p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer",
                        type.color,
                        depleted && leaveType !== type.id && "opacity-60"
                      )}
                    >
                      <span className="font-semibold text-sm text-foreground">{type.label}</span>
                      <span className="text-xs text-muted-foreground leading-snug">{type.desc}</span>
                      {rem !== null && (
                        <span className={cn("text-[11px] font-bold mt-0.5 px-2 py-0.5 rounded-full w-fit", type.badge)}>
                          {rem} day{rem !== 1 ? "s" : ""} left
                        </span>
                      )}
                      {type.balanceKey === null && (
                        <span className="text-[11px] font-medium text-red-600 mt-0.5">No limit</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {noBalance && (
              <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>No <strong>{selectedType.label}</strong> balance remaining. Choose Casual Leave or No-Pay Leave instead.</span>
              </div>
            )}

            {successMsg && (
              <div className="flex items-start gap-2.5 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <Button
                type="submit"
                disabled={!selectedEmp || !date || !leaveType || submitting || (noBalance && leaveType !== "no_pay")}
                className="flex-1"
              >
                {submitting ? "Saving…" : "Submit Leave"}
              </Button>
              <Button type="button" variant="outline" onClick={handleReset}>
                Clear
              </Button>
            </div>
          </Card>
        </form>

        {/* ── Balance Panel ── */}
        <div className="flex flex-col gap-4">
          <Card className="p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b pb-3 mb-1">
              <CalendarClock className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm">Leave Balance</span>
            </div>

            {!selectedEmp && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Select an employee to view their leave balance.
              </p>
            )}

            {selectedEmp && balanceLoading && (
              <p className="text-sm text-muted-foreground text-center py-4 animate-pulse">Loading…</p>
            )}

            {selectedEmp && !balanceLoading && balance && (
              <div className="flex flex-col gap-3">
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 flex flex-col gap-1">
                  <span className="text-xs font-medium text-blue-600 uppercase tracking-wide">Annual Leave</span>
                  <div className="flex items-end gap-1.5">
                    <span className="text-3xl font-bold text-blue-700">{balance.annualRemaining}</span>
                    <span className="text-sm text-blue-500 pb-0.5">/ {balance.annualRemaining + balance.annualLeaveUsed} days</span>
                  </div>
                  <span className="text-xs text-blue-500">{balance.annualLeaveUsed} used this year</span>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex flex-col gap-1">
                  <span className="text-xs font-medium text-amber-600 uppercase tracking-wide">Casual Leave</span>
                  <div className="flex items-end gap-1.5">
                    <span className="text-3xl font-bold text-amber-700">{balance.casualRemaining}</span>
                    <span className="text-sm text-amber-500 pb-0.5">/ {balance.casualRemaining + balance.casualLeaveUsed} days</span>
                  </div>
                  <span className="text-xs text-amber-500">{balance.casualLeaveUsed} used this year</span>
                </div>

                <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex flex-col gap-1">
                  <span className="text-xs font-medium text-red-600 uppercase tracking-wide">No-Pay Leave</span>
                  <p className="text-xs text-red-500 mt-1">Always available — salary deducted per day.</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* ── Recent Leave Entries ── */}
      <Card className="p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b pb-3 mb-1">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">Recent Leave Entries</span>
          </div>
          <button
            onClick={loadRecent}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="Refresh"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", recentLoading && "animate-spin")} />
          </button>
        </div>

        {recentLoading && (
          <p className="text-sm text-muted-foreground text-center py-6 animate-pulse">Loading…</p>
        )}

        {!recentLoading && recent.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">No recent leave entries found.</p>
        )}

        {!recentLoading && recent.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground uppercase tracking-wide">
                  <th className="text-left pb-2 pr-4 font-medium">Employee</th>
                  <th className="text-left pb-2 pr-4 font-medium">Date</th>
                  <th className="text-left pb-2 pr-4 font-medium">Leave Type</th>
                  <th className="text-left pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {recent.map(entry => (
                  <tr key={entry.id} className="hover:bg-muted/40 transition-colors">
                    <td className="py-2.5 pr-4">
                      <span className="font-medium text-foreground">{entry.employeeName}</span>
                      <span className="text-muted-foreground text-xs ml-1.5">{entry.employeeCode}</span>
                    </td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{entry.date}</td>
                    <td className="py-2.5 pr-4">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-xs font-semibold",
                        entry.leaveType === "annual" && "bg-blue-100 text-blue-700",
                        entry.leaveType === "casual" && "bg-amber-100 text-amber-700",
                        entry.leaveType === "no_pay" && "bg-red-100 text-red-700",
                        !entry.leaveType && "bg-muted text-muted-foreground",
                      )}>
                        {entry.leaveType === "annual" ? "Annual"
                          : entry.leaveType === "casual" ? "Casual"
                          : entry.leaveType === "no_pay" ? "No-Pay"
                          : "—"}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-xs font-semibold",
                        entry.status === "leave" && "bg-purple-100 text-purple-700",
                        entry.status === "absent" && "bg-red-100 text-red-700",
                      )}>
                        {entry.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
