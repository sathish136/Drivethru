import { useState, useEffect, useMemo } from "react";
import {
  PageHeader, Card, Button, Input, Label, Badge, Th, Td, Tr,
} from "@/components/ui";
import {
  Search, CheckCircle2, AlertTriangle, RefreshCw,
  CalendarDays, User, CalendarClock, Sun, MoonStar,
  Wallet, TrendingDown, Hourglass, Sparkles,
  Undo2, Trash2, X, ChevronRight,
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

type LeaveTypeId = "leave" | "half_day" | "no_pay";

interface LeaveTypeMeta {
  id: LeaveTypeId;
  label: string;
  short: string;
  desc: string;
  iconBg: string;
  iconColor: string;
  ring: string;
  selectedBg: string;
  badge: "info" | "warning" | "danger";
  deduct: number;
  Icon: typeof Sun;
}

const LEAVE_TYPES: LeaveTypeMeta[] = [
  {
    id: "leave",
    label: "Full Day Leave",
    short: "Leave",
    desc: "Deducts 1 day from balance",
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    ring: "ring-blue-500/40",
    selectedBg: "bg-blue-50/60 border-blue-400",
    badge: "info",
    deduct: 1,
    Icon: Sun,
  },
  {
    id: "half_day",
    label: "Half Day Leave",
    short: "Half Day",
    desc: "Deducts 0.5 day from balance",
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    ring: "ring-amber-500/40",
    selectedBg: "bg-amber-50/60 border-amber-400",
    badge: "warning",
    deduct: 0.5,
    Icon: MoonStar,
  },
  {
    id: "no_pay",
    label: "No-Pay Leave",
    short: "No-Pay",
    desc: "Salary deducted for the day",
    iconBg: "bg-rose-50",
    iconColor: "text-rose-600",
    ring: "ring-rose-500/40",
    selectedBg: "bg-rose-50/60 border-rose-400",
    badge: "danger",
    deduct: 0,
    Icon: Wallet,
  },
];

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(d: string) {
  if (!d) return "";
  const [y, m, day] = d.split("-").map(Number);
  return `${MONTH_NAMES[m - 1]} ${day}, ${y}`;
}

function relativeDay(d: string) {
  if (!d) return "";
  const target = new Date(d + "T00:00:00");
  const today = new Date(todayStr() + "T00:00:00");
  const diff = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff > 1 && diff < 7) return `In ${diff} days`;
  if (diff < -1 && diff > -7) return `${Math.abs(diff)} days ago`;
  return "";
}

export default function LeaveEntry() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [empSearch, setEmpSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [date, setDate] = useState(todayStr());
  const [leaveType, setLeaveType] = useState<LeaveTypeId>("leave");
  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [recent, setRecent] = useState<RecentEntry[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<{ id: number; mode: "cancel" | "delete" } | null>(null);

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

  async function refreshBalance() {
    if (!selectedEmp) return;
    const year = new Date(date).getFullYear();
    const updated = await fetch(apiUrl(`/leave-balances/employee/${selectedEmp.id}?year=${year}`))
      .then(r => r.json()).catch(() => null);
    if (updated) setBalance(updated);
  }

  const filteredEmps = useMemo(() => employees.filter(e => {
    const q = empSearch.toLowerCase();
    return (
      e.fullName.toLowerCase().includes(q) ||
      e.employeeId.toLowerCase().includes(q) ||
      (e.department || "").toLowerCase().includes(q)
    );
  }).slice(0, 8), [employees, empSearch]);

  function selectEmployee(emp: Employee) {
    setSelectedEmp(emp);
    setEmpSearch("");
    setShowDropdown(false);
    setSuccessMsg("");
    setErrorMsg("");
  }

  function clearEmployee() {
    setSelectedEmp(null);
    setEmpSearch("");
    setBalance(null);
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
        const def = LEAVE_TYPES.find(t => t.id === leaveType)!;
        setSuccessMsg(`${def.label} recorded for ${selectedEmp.fullName} on ${formatDate(date)}.`);
        await refreshBalance();
        loadRecent();
      }
    } catch {
      setErrorMsg("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    clearEmployee();
    setDate(todayStr());
    setLeaveType("leave");
    setSuccessMsg("");
    setErrorMsg("");
  }

  async function handleRemove(entry: RecentEntry, mode: "cancel" | "delete") {
    setConfirm(null);
    setRemovingId(entry.id);
    setSuccessMsg("");
    setErrorMsg("");
    try {
      const res = await fetch(apiUrl(`/attendance/leave/${entry.id}?mode=${mode}`), { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(data.message || `Failed to ${mode} leave entry.`);
      } else {
        setSuccessMsg(
          mode === "cancel"
            ? `Leave for ${entry.employeeName} cancelled. Balance restored.`
            : `Leave entry for ${entry.employeeName} deleted.`
        );
        await refreshBalance();
        loadRecent();
      }
    } catch {
      setErrorMsg("Network error. Please try again.");
    } finally {
      setRemovingId(null);
    }
  }

  const selectedTypeDef = LEAVE_TYPES.find(t => t.id === leaveType)!;
  const remainingForType = leaveType !== "no_pay" && balance ? balance.leaveRemaining : null;
  const insufficient =
    remainingForType !== null && remainingForType < selectedTypeDef.deduct;

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
    <div className="space-y-6 max-w-6xl mx-auto pb-8">
      <PageHeader
        title="Leave Entry"
        description="Record annual leave, half-day or no-pay leave for any employee."
      />

      {/* Toast-style notifications */}
      {(successMsg || errorMsg) && (
        <div
          role="status"
          className={cn(
            "flex items-start gap-3 px-4 py-3 rounded-xl text-sm border shadow-sm transition-all",
            successMsg
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-red-50 text-red-800 border-red-200"
          )}
        >
          {successMsg ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
          )}
          <div className="flex-1 min-w-0">{successMsg || errorMsg}</div>
          <button
            onClick={() => { setSuccessMsg(""); setErrorMsg(""); }}
            className="opacity-70 hover:text-current shrink-0"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Stat strip (visible once an employee is selected) ── */}
      {selectedEmp && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            icon={Wallet}
            label="Annual Entitlement"
            value={balance?.leaveBalance ?? 21}
            unit="days"
            tone="neutral"
            loading={balanceLoading}
          />
          <StatCard
            icon={TrendingDown}
            label="Used This Year"
            value={balance?.leaveUsed ?? 0}
            unit="days"
            tone="warning"
            loading={balanceLoading}
          />
          <StatCard
            icon={Hourglass}
            label="Remaining"
            value={balance?.leaveRemaining ?? 0}
            unit="days"
            tone={(balance?.leaveRemaining ?? 0) < 3 ? "danger" : "success"}
            loading={balanceLoading}
            highlight
          />
          <StatCard
            icon={Sparkles}
            label="Half Days Available"
            value={(balance?.leaveRemaining ?? 0) * 2}
            unit="halves"
            tone="info"
            loading={balanceLoading}
          />
        </div>
      )}

      {/* ── Main form ── */}
      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-border bg-gradient-to-r from-primary/5 to-transparent flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <CalendarClock className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground leading-tight">New Leave Entry</h2>
            <p className="text-xs text-muted-foreground">Pick an employee, choose a date, and select the leave type.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-6">
          {/* STEP 1 — Employee */}
          <section>
            <SectionLabel step="1" title="Employee" required />
            {selectedEmp ? (
              <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3">
                <div className="w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                  {selectedEmp.fullName.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm text-foreground truncate">{selectedEmp.fullName}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    <span className="font-mono">{selectedEmp.employeeId}</span>
                    <span className="mx-1.5">·</span>
                    {selectedEmp.designation || selectedEmp.department}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearEmployee}
                  className="h-8 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                  Change
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="emp-search"
                  type="text"
                  value={empSearch}
                  onChange={e => { setEmpSearch(e.target.value); setShowDropdown(true); }}
                  onFocus={() => setShowDropdown(true)}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                  placeholder="Search by name, employee ID or department…"
                  className="pl-10 h-11"
                />
                {showDropdown && empSearch.length > 0 && (
                  <div className="absolute z-30 mt-1.5 w-full bg-card border border-border rounded-xl shadow-xl overflow-hidden max-h-64 overflow-y-auto">
                    {filteredEmps.length === 0 ? (
                      <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                        No employees match "{empSearch}".
                      </div>
                    ) : (
                      filteredEmps.map(emp => (
                        <button
                          key={emp.id}
                          type="button"
                          onMouseDown={() => selectEmployee(emp)}
                          className="w-full text-left px-4 py-2.5 hover:bg-muted/60 transition-colors flex items-center gap-3 border-b border-border/40 last:border-0 group"
                        >
                          <div className="w-8 h-8 rounded-full bg-muted text-foreground/70 group-hover:bg-primary/15 group-hover:text-primary flex items-center justify-center text-xs font-bold shrink-0 transition-colors">
                            {emp.fullName.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{emp.fullName}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              <span className="font-mono">{emp.employeeId}</span>
                              <span className="mx-1.5">·</span>
                              {emp.designation || emp.department}
                            </p>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* STEP 2 — Date */}
          <section>
            <SectionLabel step="2" title="Date" required />
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <CalendarDays className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="leave-date"
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  required
                  className="pl-10 h-11"
                />
              </div>
              <div className="flex items-center gap-2">
                {(["today", "yesterday", "tomorrow"] as const).map(q => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      if (q === "yesterday") d.setDate(d.getDate() - 1);
                      if (q === "tomorrow") d.setDate(d.getDate() + 1);
                      setDate(d.toISOString().slice(0, 10));
                    }}
                    className="px-3 h-11 rounded-lg border border-border text-xs font-medium text-foreground/80 hover:bg-muted transition-colors capitalize"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
            {date && (
              <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1.5">
                <CalendarClock className="w-3.5 h-3.5" />
                {formatDate(date)}
                {relativeDay(date) && (
                  <span className="text-foreground/70">· {relativeDay(date)}</span>
                )}
              </p>
            )}
          </section>

          {/* STEP 3 — Leave type */}
          <section>
            <SectionLabel step="3" title="Leave Type" required />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {LEAVE_TYPES.map(type => {
                const isSelected = leaveType === type.id;
                const Icon = type.Icon;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setLeaveType(type.id)}
                    className={cn(
                      "relative flex flex-col gap-2 p-4 rounded-xl border-2 text-left transition-all duration-150",
                      isSelected
                        ? `${type.selectedBg} ring-4 ${type.ring} shadow-sm`
                        : "border-border bg-card hover:border-foreground/20 hover:bg-muted/30"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", type.iconBg)}>
                        <Icon className={cn("w-5 h-5", type.iconColor)} />
                      </div>
                      {isSelected && (
                        <CheckCircle2 className={cn("w-5 h-5", type.iconColor)} />
                      )}
                    </div>
                    <div>
                      <p className={cn("text-sm font-semibold", isSelected ? "text-foreground" : "text-foreground/90")}>
                        {type.label}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                        {type.desc}
                      </p>
                    </div>
                    {type.deduct > 0 ? (
                      <Badge variant={type.badge} className="self-start">
                        −{type.deduct} day
                      </Badge>
                    ) : (
                      <Badge variant="neutral" className="self-start">
                        No balance impact
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>

            {insufficient && (
              <div className="mt-3 flex items-start gap-2.5 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-700">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>
                  Only <strong>{remainingForType}</strong> day{remainingForType === 1 ? "" : "s"} of leave left —
                  not enough for {selectedTypeDef.label.toLowerCase()}. Pick <strong>No-Pay Leave</strong> instead.
                </span>
              </div>
            )}
          </section>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              className="sm:w-auto"
            >
              Reset Form
            </Button>
            <Button
              type="submit"
              disabled={!selectedEmp || !date || submitting || insufficient}
              className="flex-1 h-11"
            >
              {submitting ? (
                <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Saving…</>
              ) : (
                <><CheckCircle2 className="w-4 h-4 mr-2" /> Submit Leave Entry</>
              )}
            </Button>
          </div>
        </form>
      </Card>

      {/* ── Recent Leave Entries ── */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
              <CalendarClock className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground leading-tight">Recent Leave Entries</h2>
              <p className="text-xs text-muted-foreground">Last 15 leave entries across all employees</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={loadRecent} className="gap-1.5 text-xs h-8">
            <RefreshCw className={cn("w-3.5 h-3.5", recentLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>

        {recentLoading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading…</span>
          </div>
        ) : recent.length === 0 ? (
          <div className="text-center py-16 px-6">
            <div className="w-14 h-14 mx-auto rounded-full bg-muted flex items-center justify-center mb-3">
              <CalendarClock className="w-6 h-6 text-muted-foreground/60" />
            </div>
            <p className="text-sm font-medium text-foreground">No leave entries yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Submitted leave records will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
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
                    <Tr key={entry.id} className="group hover:bg-muted/20 transition-colors">
                      <Td>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-foreground/70 shrink-0">
                            {entry.employeeName.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-foreground truncate">{entry.employeeName}</div>
                            <div className="text-xs text-muted-foreground font-mono">{entry.employeeCode}</div>
                          </div>
                        </div>
                      </Td>
                      <Td>
                        <div className="text-foreground">{formatDate(entry.date)}</div>
                        <div className="text-xs text-muted-foreground">{relativeDay(entry.date) || entry.date}</div>
                      </Td>
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
                        <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                          {confirm?.id === entry.id ? (
                            <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200">
                              <span className="text-xs font-medium text-amber-900">
                                {confirm.mode === "cancel"
                                  ? "Cancel & restore balance?"
                                  : "Permanently delete?"}
                              </span>
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => handleRemove(entry, confirm.mode)}
                                disabled={isBusy}
                                className={cn(
                                  "h-7 px-2.5 text-xs gap-1 text-white",
                                  confirm.mode === "delete"
                                    ? "bg-rose-600 hover:bg-rose-700"
                                    : "bg-amber-600 hover:bg-amber-700"
                                )}
                              >
                                {isBusy ? (
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="w-3 h-3" />
                                )}
                                Yes
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setConfirm(null)}
                                disabled={isBusy}
                                className="h-7 px-2 text-xs"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              {canCancel && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setConfirm({ id: entry.id, mode: "cancel" })}
                                  disabled={isBusy || removingId !== null}
                                  className="h-8 px-2.5 text-xs gap-1.5"
                                  title="Cancel leave and restore balance"
                                >
                                  <Undo2 className="w-3.5 h-3.5" />
                                  Cancel
                                </Button>
                              )}
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setConfirm({ id: entry.id, mode: "delete" })}
                                disabled={isBusy || removingId !== null}
                                className="h-8 px-2.5 text-xs gap-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                title="Delete entry without restoring balance"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete
                              </Button>
                            </>
                          )}
                        </div>
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ── Small helper components ───────────────────────────────── */

function SectionLabel({ step, title, required }: { step: string; title: string; required?: boolean }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
        {step}
      </span>
      <Label className="text-sm font-semibold text-foreground mb-0">
        {title}
        {required && <span className="text-rose-500 ml-1">*</span>}
      </Label>
    </div>
  );
}

const TONES = {
  neutral: { iconBg: "bg-slate-100", iconColor: "text-slate-600", value: "text-foreground" },
  info:    { iconBg: "bg-blue-50",   iconColor: "text-blue-600",   value: "text-blue-700" },
  success: { iconBg: "bg-emerald-50",iconColor: "text-emerald-600",value: "text-emerald-700" },
  warning: { iconBg: "bg-amber-50",  iconColor: "text-amber-600",  value: "text-amber-700" },
  danger:  { iconBg: "bg-rose-50",   iconColor: "text-rose-600",   value: "text-rose-700" },
} as const;

function StatCard({
  icon: Icon, label, value, unit, tone, loading, highlight,
}: {
  icon: typeof Sun;
  label: string;
  value: number;
  unit: string;
  tone: keyof typeof TONES;
  loading?: boolean;
  highlight?: boolean;
}) {
  const t = TONES[tone];
  return (
    <Card className={cn(
      "p-4 transition-all",
      highlight && "ring-2 ring-primary/10 border-primary/30"
    )}>
      <div className="flex items-center gap-2.5 mb-2">
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", t.iconBg)}>
          <Icon className={cn("w-4 h-4", t.iconColor)} />
        </div>
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">
          {label}
        </span>
      </div>
      {loading ? (
        <div className="h-8 w-20 bg-muted rounded animate-pulse" />
      ) : (
        <div className="flex items-baseline gap-1.5">
          <span className={cn("text-2xl font-bold leading-none tabular-nums", t.value)}>
            {Number.isInteger(value) ? value : value.toFixed(1)}
          </span>
          <span className="text-xs text-muted-foreground">{unit}</span>
        </div>
      )}
    </Card>
  );
}
