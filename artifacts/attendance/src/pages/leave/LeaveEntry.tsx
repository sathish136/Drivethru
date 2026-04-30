import { useState, useEffect } from "react";
import {
  PageHeader, Card, Button, Input, Label,
  Badge, Table, Th, Td, Tr,
} from "@/components/ui";
import {
  Search, CheckCircle2, AlertTriangle,
  RefreshCw, CalendarDays, User, CalendarClock,
  Undo2, Trash2,
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
  leaveBalance: number;
  leaveUsed: number;
  leaveRemaining: number;
  annualRemaining: number;
  casualRemaining: number;
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
    id: "leave",
    label: "Leave",
    desc: "Full day — deducts 1 day from leave balance (21 days total)",
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    badge: "info" as const,
    balanceKey: "leaveRemaining" as keyof LeaveBalance,
    deduct: 1,
  },
  {
    id: "half_day",
    label: "Half Day Leave",
    desc: "Half day — deducts 0.5 day from leave balance",
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    badge: "warning" as const,
    balanceKey: "leaveRemaining" as keyof LeaveBalance,
    deduct: 0.5,
  },
  {
    id: "no_pay",
    label: "No-Pay Leave",
    desc: "Salary will be deducted for this day",
    iconBg: "bg-red-50",
    iconColor: "text-red-600",
    badge: "danger" as const,
    balanceKey: null,
    deduct: 0,
  },
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function LeaveEntry() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [empSearch, setEmpSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [date, setDate] = useState(todayStr());
  const [leaveType, setLeaveType] = useState<string>("leave");
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
    loadRecent();
  }, []);

  useEffect(() => {
    if (!selectedEmp) { setBalance(null); return; }
    const year = new Date(date || todayStr()).getFullYear();
    setBalanceLoading(true);
    fetch(apiUrl(`/leave-balances/employee/${selectedEmp.id}?year=${year}`))
      .then(r => r.json())
      .then(d => setBalance(d))
      .catch(() => setBalance(null))
      .finally(() => setBalanceLoading(false));
  }, [selectedEmp, date]);

  function loadRecent() {
    setRecentLoading(true);
    fetch(apiUrl("/attendance/recent-leaves?limit=15"))
      .then(r => r.json())
      .then(d => setRecent(Array.isArray(d) ? d : []))
      .catch(() => setRecent([]))
      .finally(() => setRecentLoading(false));
  }

  const [removingId, setRemovingId] = useState<number | null>(null);

  async function handleRemove(entry: RecentEntry, mode: "cancel" | "delete") {
    const action = mode === "cancel" ? "cancel" : "delete";
    const confirmMsg =
      mode === "cancel"
        ? `Cancel ${entry.status === "half_day" ? "half-day " : ""}leave for ${entry.employeeName} on ${entry.date}? The leave balance will be restored.`
        : `Delete leave entry for ${entry.employeeName} on ${entry.date}? Balance will NOT be restored.`;
    if (!window.confirm(confirmMsg)) return;
    setRemovingId(entry.id);
    setSuccessMsg("");
    setErrorMsg("");
    try {
      const res = await fetch(apiUrl(`/attendance/leave/${entry.id}?mode=${mode}`), { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(data.message || `Failed to ${action} leave entry.`);
      } else {
        setSuccessMsg(
          mode === "cancel"
            ? `Leave for ${entry.employeeName} on ${entry.date} was cancelled and balance restored.`
            : `Leave entry for ${entry.employeeName} on ${entry.date} was deleted.`
        );
        if (selectedEmp) {
          const year = new Date(date).getFullYear();
          fetch(apiUrl(`/leave-balances/employee/${selectedEmp.id}?year=${year}`))
            .then(r => r.json()).then(setBalance).catch(() => {});
        }
        loadRecent();
      }
    } catch {
      setErrorMsg("Network error. Please try again.");
    } finally {
      setRemovingId(null);
    }
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
        setSuccessMsg(`${typeLabel} recorded for ${selectedEmp.fullName} on ${date}.`);
        const year = new Date(date).getFullYear();
        const updated = await fetch(apiUrl(`/leave-balances/employee/${selectedEmp.id}?year=${year}`))
          .then(r => r.json()).catch(() => null);
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
    setDate(todayStr());
    setLeaveType("leave");
    setBalance(null);
    setSuccessMsg("");
    setErrorMsg("");
  }

  const selectedTypeDef = LEAVE_TYPES.find(t => t.id === leaveType)!;
  const remainingForType =
    selectedTypeDef.balanceKey && balance
      ? (balance[selectedTypeDef.balanceKey] as number)
      : null;
  const noBalance = remainingForType !== null && remainingForType <= 0;

  const leaveTypeLabel = (entry: RecentEntry) => {
    if (entry.status === "half_day") return "Half Day";
    if (entry.leaveType === "leave" || entry.leaveType === "annual" || entry.leaveType === "casual") return "Leave";
    if (entry.leaveType === "no_pay") return "No-Pay";
    if (entry.status === "absent") return "No-Pay";
    return entry.leaveType || entry.status;
  };

  const leaveBadgeVariant = (entry: RecentEntry): "info" | "warning" | "danger" => {
    if (entry.status === "half_day") return "warning";
    if (entry.leaveType === "no_pay" || entry.status === "absent") return "danger";
    return "info";
  };

  return (
    <div className="space-y-5 max-w-5xl">
      <PageHeader
        title="Leave Entry"
        description="Manually record leave for an employee — Leave (21 days) or No-Pay."
      />

      {successMsg && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm bg-green-50 text-green-700 border border-green-200">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm bg-red-50 text-red-700 border border-red-200">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {errorMsg}
        </div>
      )}

      <div className="space-y-5">

        {/* ── Form (full width) ── */}
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Employee */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-primary" />
              </div>
              <span className="font-semibold text-sm text-foreground">Select Employee</span>
            </div>

            <div className="relative">
              <Label htmlFor="emp-search">Employee Name / ID</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="emp-search"
                  type="text"
                  value={empSearch}
                  onChange={e => { setEmpSearch(e.target.value); setShowDropdown(true); setSelectedEmp(null); }}
                  onFocus={() => setShowDropdown(true)}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                  placeholder="Search by name or employee ID…"
                  className="pl-9"
                />
              </div>

              {showDropdown && filteredEmps.length > 0 && (
                <div className="absolute z-30 mt-1 w-full bg-card border border-border rounded-xl shadow-xl overflow-hidden max-h-56 overflow-y-auto">
                  {filteredEmps.map(emp => (
                    <button
                      key={emp.id}
                      type="button"
                      onMouseDown={() => selectEmployee(emp)}
                      className="w-full text-left px-4 py-2.5 hover:bg-muted/60 transition-colors flex flex-col gap-0.5 border-b border-border/40 last:border-0"
                    >
                      <span className="text-sm font-medium text-foreground">{emp.fullName}</span>
                      <span className="text-xs text-muted-foreground">{emp.employeeId} · {emp.designation || emp.department}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedEmp && (
              <div className="mt-3 flex flex-wrap items-center gap-3 bg-primary/5 border border-primary/20 rounded-lg px-4 py-3">
                <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                  {selectedEmp.fullName.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm text-foreground">{selectedEmp.fullName}</p>
                  <p className="text-xs text-muted-foreground">{selectedEmp.employeeId} · {selectedEmp.designation}</p>
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <CalendarClock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Leave balance:</span>
                  {balanceLoading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                  ) : balance ? (
                    <Badge variant={balance.leaveRemaining < 3 ? "danger" : "info"}>
                      {balance.leaveRemaining} / {balance.leaveBalance} days
                    </Badge>
                  ) : (
                    <Badge variant="neutral">—</Badge>
                  )}
                </div>
              </div>
            )}
          </Card>

          {/* Date + leave type */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <CalendarDays className="w-4 h-4 text-primary" />
              </div>
              <span className="font-semibold text-sm text-foreground">Leave Details</span>
            </div>

            <div className="mb-4">
              <Label htmlFor="leave-date">Leave Date</Label>
              <Input
                id="leave-date"
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                required
              />
            </div>

            <div>
              <Label>Leave Type</Label>
              <div className="space-y-2 mt-1">
                {LEAVE_TYPES.map(type => {
                  const rem = type.balanceKey && balance ? (balance[type.balanceKey] as number) : null;
                  const isSelected = leaveType === type.id;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setLeaveType(type.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all duration-150",
                        isSelected
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border bg-card hover:bg-muted/40"
                      )}
                    >
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", type.iconBg)}>
                        <CalendarClock className={cn("w-4 h-4", type.iconColor)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm font-semibold", isSelected ? "text-primary" : "text-foreground")}>
                          {type.label}
                        </p>
                        <p className="text-xs text-muted-foreground">{type.desc}</p>
                      </div>
                      {rem !== null ? (
                        <Badge variant={rem > 0 ? type.badge : "danger"}>
                          {rem} day{rem !== 1 ? "s" : ""} left
                        </Badge>
                      ) : (
                        <Badge variant="neutral">No limit</Badge>
                      )}
                      <div className={cn(
                        "w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-all",
                        isSelected ? "border-primary bg-primary" : "border-border"
                      )}>
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {noBalance && (
              <div className="mt-3 flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>No <strong>Leave</strong> balance remaining. Please use No-Pay Leave instead.</span>
              </div>
            )}
          </Card>

          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={!selectedEmp || !date || !leaveType || submitting || (noBalance && leaveType !== "no_pay")}
              className="flex-1"
            >
              {submitting ? (
                <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Saving…</>
              ) : "Submit Leave"}
            </Button>
            <Button type="button" variant="outline" onClick={handleReset}>
              Clear
            </Button>
          </div>
        </form>

      </div>

      {/* ── Recent Leave Entries ── */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">Recent Leave Entries</span>
          </div>
          <Button variant="ghost" size="sm" onClick={loadRecent} className="gap-1.5 text-xs h-7">
            <RefreshCw className={cn("w-3.5 h-3.5", recentLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>

        {recentLoading ? (
          <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
            <RefreshCw className="w-4 h-4 animate-spin" /><span className="text-sm">Loading…</span>
          </div>
        ) : recent.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">
            No leave entries recorded yet.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <Th>Employee</Th>
                <Th>Date</Th>
                <Th>Leave Type</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {recent.map(entry => {
                const isBusy = removingId === entry.id;
                const isLeaveType =
                  entry.leaveType === "leave" ||
                  entry.leaveType === "annual" ||
                  entry.leaveType === "casual";
                const canCancel = isLeaveType && entry.status !== "absent";
                return (
                  <Tr key={entry.id}>
                    <Td>
                      <div className="font-semibold text-foreground">{entry.employeeName}</div>
                      <div className="text-xs text-muted-foreground font-mono">{entry.employeeCode}</div>
                    </Td>
                    <Td className="text-muted-foreground">{entry.date}</Td>
                    <Td>
                      <Badge variant={leaveBadgeVariant(entry)}>
                        {leaveTypeLabel(entry)}
                      </Badge>
                    </Td>
                    <Td>
                      <Badge
                        variant={
                          entry.status === "leave"
                            ? "default"
                            : entry.status === "half_day"
                              ? "warning"
                              : "danger"
                        }
                      >
                        {entry.status === "half_day" ? "half day" : entry.status}
                      </Badge>
                    </Td>
                    <Td>
                      <div className="flex items-center justify-end gap-1.5">
                        {canCancel && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemove(entry, "cancel")}
                            disabled={isBusy}
                            className="h-7 px-2 text-xs gap-1"
                            title="Cancel leave and restore balance"
                          >
                            {isBusy ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <Undo2 className="w-3 h-3" />
                            )}
                            Cancel
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemove(entry, "delete")}
                          disabled={isBusy}
                          className="h-7 px-2 text-xs gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Delete entry (does not restore balance)"
                        >
                          {isBusy ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <Trash2 className="w-3 h-3" />
                          )}
                          Delete
                        </Button>
                      </div>
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
