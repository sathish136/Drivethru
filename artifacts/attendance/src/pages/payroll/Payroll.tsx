import { useState, useCallback, useEffect, useMemo } from "react";
import { PageHeader, Card, Button, Select } from "@/components/ui";
import { cn } from "@/lib/utils";
import drivethruLogo from "@/assets/drivethru-brand.svg";
import {
  Banknote, RefreshCw, CheckCircle, CreditCard,
  Users, TrendingUp, Minus, Eye, X, Printer,
  ChevronDown, ChevronUp, AlertCircle, UserCheck,
  Search, Filter, Building2, Briefcase, ListChecks,
  BadgeCheck, Clock, CircleDashed, ChevronRight,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
function apiUrl(path: string) { return `${BASE}/api${path}`; }

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

function fmt(n: number) {
  return `Rs. ${Math.round(n).toLocaleString("en-LK")}`;
}

type PayStatus = "draft" | "approved" | "paid";

interface PayrollRow {
  id: number;
  employeeId: number;
  branchId: number;
  month: number;
  year: number;
  workingDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  leaveDays: number;
  holidayDays: number;
  overtimeHours: number;
  basicSalary: number;
  transportAllowance: number;
  housingAllowance: number;
  otherAllowances: number;
  overtimePay: number;
  grossSalary: number;
  epfEmployee: number;
  epfEmployer: number;
  etfEmployer: number;
  apit: number;
  lateDeduction: number;
  absenceDeduction: number;
  otherDeductions: number;
  totalDeductions: number;
  netSalary: number;
  status: PayStatus;
  generatedAt: string;
  approvedAt?: string;
  paidAt?: string;
  employee: {
    id: number;
    employeeId: string;
    fullName: string;
    designation: string;
    department: string;
    branchId: number;
    employeeType?: string;
  };
}

interface EmpForPayroll {
  id: number;
  employeeId: string;
  fullName: string;
  designation: string;
  department: string;
  branchId: number;
  employeeType: string | null;
  status: string;
  epfNumber: string | null;
  etfNumber: string | null;
  basicSalary: number;
  hasPayroll: boolean;
  payrollStatus: PayStatus | null;
  currentNetSalary: number | null;
  currentGrossSalary: number | null;
}

interface BranchInfo {
  id: number;
  name: string;
}

interface Summary {
  totalEmployees: number;
  totalGross: number;
  totalNet: number;
  totalEPF: number;
  totalETF: number;
  totalAPIT: number;
  totalOTPay: number;
  statusCounts: { draft: number; approved: number; paid: number };
}

const STATUS_STYLES: Record<PayStatus, string> = {
  draft:    "bg-amber-100 text-amber-700 border border-amber-200",
  approved: "bg-blue-100 text-blue-700 border border-blue-200",
  paid:     "bg-emerald-100 text-emerald-700 border border-emerald-200",
};

const EMP_TYPE_LABELS: Record<string, string> = {
  permanent: "Permanent",
  contract: "Contract",
  casual: "Casual",
};

function PayslipModal({ row, onClose }: { row: PayrollRow; onClose: () => void }) {
  const customLogo = localStorage.getItem("org_logo");
  const logo = customLogo || drivethruLogo;
  const orgName = "Drivethru";

  const earnings = [
    { label: "Basic Salary",        val: row.basicSalary },
    { label: "Transport Allowance", val: row.transportAllowance },
    { label: "Housing Allowance",   val: row.housingAllowance },
    { label: "Other Allowances",    val: row.otherAllowances },
    { label: "Overtime Pay",        val: row.overtimePay },
  ].filter(e => e.val > 0 || e.label === "Basic Salary");

  const deductions = [
    { label: "EPF – Employee (8%)", val: row.epfEmployee },
    { label: "APIT (Income Tax)",   val: row.apit },
    { label: "Absence Deduction",   val: row.absenceDeduction },
    { label: "Late Deduction",      val: row.lateDeduction },
    { label: "Other Deductions",    val: row.otherDeductions },
  ].filter(d => d.val > 0 || d.label === "EPF – Employee (8%)");

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-t-2xl px-7 py-6 print:rounded-none">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-700 flex items-center justify-center p-2">
                <img src={logo} alt={orgName} className="w-full h-full object-contain" />
              </div>
              <div>
                <h2 className="text-white font-black text-2xl leading-tight tracking-tight">{orgName}</h2>
                <p className="text-white/70 text-xs mt-0.5 uppercase tracking-widest font-semibold">
                  Employee Pay Slip
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right mr-2">
                <p className="text-white/60 text-xs uppercase tracking-wide">Pay Period</p>
                <p className="text-white font-bold text-base">{MONTHS[row.month - 1]} {row.year}</p>
              </div>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />Print
              </button>
              <button onClick={onClose} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>

        </div>

        <div className="px-7 py-5 space-y-5">

          {/* ── Employee Info ── */}
          <div className="grid grid-cols-3 gap-4 border border-slate-100 rounded-xl p-4 bg-slate-50/50">
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold mb-0.5">Employee Name</p>
              <p className="font-bold text-slate-800 text-sm">{row.employee.fullName}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold mb-0.5">Employee ID</p>
              <p className="font-semibold text-slate-700 text-sm">{row.employee.employeeId}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold mb-0.5">Status</p>
              <span className={cn("inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide", STATUS_STYLES[row.status])}>
                {row.status}
              </span>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold mb-0.5">Designation</p>
              <p className="font-semibold text-slate-700 text-sm">{row.employee.designation}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold mb-0.5">Department</p>
              <p className="font-semibold text-slate-700 text-sm">{row.employee.department}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold mb-0.5">Pay Period</p>
              <p className="font-semibold text-slate-700 text-sm">{MONTHS[row.month - 1]} {row.year}</p>
            </div>
          </div>

          {/* ── Attendance Summary ── */}
          <div className="grid grid-cols-5 gap-2">
            {[
              { label: "Working Days", val: row.workingDays, color: "bg-blue-50 text-blue-700 border-blue-100" },
              { label: "Present",      val: row.presentDays,  color: "bg-emerald-50 text-emerald-700 border-emerald-100" },
              { label: "Absent",       val: row.absentDays,   color: "bg-red-50 text-red-600 border-red-100" },
              { label: "Late",         val: row.lateDays,     color: "bg-amber-50 text-amber-700 border-amber-100" },
              { label: "OT Hours",     val: row.overtimeHours.toFixed(1), color: "bg-purple-50 text-purple-700 border-purple-100" },
            ].map(s => (
              <div key={s.label} className={cn("rounded-xl border p-3 text-center", s.color)}>
                <p className="text-[10px] font-semibold uppercase tracking-wide opacity-70">{s.label}</p>
                <p className="font-black text-lg mt-0.5">{s.val}</p>
              </div>
            ))}
          </div>

          {/* ── Earnings & Deductions ── */}
          <div className="grid grid-cols-2 gap-4">
            {/* Earnings */}
            <div className="border border-emerald-100 rounded-xl overflow-hidden">
              <div className="bg-emerald-600 px-4 py-2.5 flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-white" />
                <span className="text-white text-xs font-bold uppercase tracking-wide">Earnings</span>
              </div>
              <div className="px-4 py-3 space-y-2">
                {earnings.map(e => (
                  <div key={e.label} className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">{e.label}</span>
                    <span className="font-semibold text-slate-800">{fmt(e.val)}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2 mt-1 border-t border-emerald-100">
                  <span className="text-sm font-bold text-emerald-700">Gross Salary</span>
                  <span className="font-bold text-emerald-700">{fmt(row.grossSalary)}</span>
                </div>
              </div>
            </div>

            {/* Deductions */}
            <div className="border border-red-100 rounded-xl overflow-hidden">
              <div className="bg-red-500 px-4 py-2.5 flex items-center gap-2">
                <Minus className="w-3.5 h-3.5 text-white" />
                <span className="text-white text-xs font-bold uppercase tracking-wide">Deductions</span>
              </div>
              <div className="px-4 py-3 space-y-2">
                {deductions.map(d => (
                  <div key={d.label} className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">{d.label}</span>
                    <span className="font-semibold text-red-600">{fmt(d.val)}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2 mt-1 border-t border-red-100">
                  <span className="text-sm font-bold text-red-600">Total Deductions</span>
                  <span className="font-bold text-red-600">{fmt(row.totalDeductions)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Employer Contributions ── */}
          <div className="border border-indigo-100 rounded-xl overflow-hidden">
            <div className="bg-indigo-50 border-b border-indigo-100 px-4 py-2 flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5 text-indigo-600" />
              <span className="text-indigo-700 text-xs font-bold uppercase tracking-wide">Employer Contributions</span>
              <span className="text-[10px] text-indigo-400 ml-1">(not deducted from employee)</span>
            </div>
            <div className="px-4 py-3 grid grid-cols-3 gap-4 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">EPF – Employer (12%)</span>
                <span className="font-semibold text-indigo-700">{fmt(row.epfEmployer)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">ETF (3%)</span>
                <span className="font-semibold text-indigo-700">{fmt(row.etfEmployer)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">Total Employer Cost</span>
                <span className="font-bold text-indigo-800">{fmt(row.grossSalary + row.epfEmployer + row.etfEmployer)}</span>
              </div>
            </div>
          </div>

          {/* ── Net Salary ── */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl px-6 py-5 flex items-center justify-between">
            <div>
              <p className="text-white/70 text-xs uppercase tracking-widest font-semibold mb-1">Net Salary (Take Home)</p>
              <p className="text-3xl font-black text-white">{fmt(row.netSalary)}</p>
            </div>
            <div className="text-right">
              <div className="text-white/60 text-xs space-y-0.5">
                <p>Gross: <span className="text-white font-semibold">{fmt(row.grossSalary)}</span></p>
                <p>Deductions: <span className="text-red-300 font-semibold">− {fmt(row.totalDeductions)}</span></p>
              </div>
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="flex items-center justify-between pt-1 pb-2 text-[10px] text-slate-400 border-t border-slate-100">
            <p>Generated: {new Date(row.generatedAt).toLocaleDateString("en-LK", { day: "2-digit", month: "long", year: "numeric" })}</p>
            <p>This is a computer-generated payslip and does not require a signature.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function GeneratePayrollModal({
  month, year, onClose, onGenerated,
}: {
  month: number;
  year: number;
  onClose: () => void;
  onGenerated: () => void;
}) {
  const [employees, setEmployees] = useState<EmpForPayroll[]>([]);
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filterBranch, setFilterBranch] = useState<string>("all");
  const [filterDept, setFilterDept] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const [selected, setSelected] = useState<Set<number>>(new Set());

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(apiUrl(`/payroll/employees-for-payroll?month=${month}&year=${year}`));
        const data = await res.json();
        setEmployees(data.employees ?? []);
        setBranches(data.branches ?? []);
        const defaultSelected = new Set<number>(
          (data.employees ?? []).filter((e: EmpForPayroll) => !e.hasPayroll).map((e: EmpForPayroll) => e.id)
        );
        setSelected(defaultSelected);
      } catch {
        setError("Failed to load employees. Check server connection.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [month, year]);

  const departments = useMemo(() => {
    const set = new Set(employees.map(e => e.department));
    return Array.from(set).sort();
  }, [employees]);

  const filtered = useMemo(() => {
    return employees.filter(e => {
      const q = search.toLowerCase();
      const matchSearch = !q || e.fullName.toLowerCase().includes(q) ||
        e.employeeId.toLowerCase().includes(q) ||
        e.designation.toLowerCase().includes(q);
      const matchBranch = filterBranch === "all" || e.branchId === parseInt(filterBranch);
      const matchDept = filterDept === "all" || e.department === filterDept;
      const matchType = filterType === "all" || e.employeeType === filterType;
      const matchStatus = filterStatus === "all" ||
        (filterStatus === "assigned" && e.hasPayroll) ||
        (filterStatus === "unassigned" && !e.hasPayroll);
      return matchSearch && matchBranch && matchDept && matchType && matchStatus;
    });
  }, [employees, search, filterBranch, filterDept, filterType, filterStatus]);

  const allFilteredSelected = filtered.length > 0 && filtered.every(e => selected.has(e.id));

  const toggleAll = () => {
    if (allFilteredSelected) {
      const s = new Set(selected);
      filtered.forEach(e => s.delete(e.id));
      setSelected(s);
    } else {
      const s = new Set(selected);
      filtered.forEach(e => s.add(e.id));
      setSelected(s);
    }
  };

  const selectAllActive = () => {
    setSelected(new Set(employees.map(e => e.id)));
  };

  const selectOnlyNew = () => {
    setSelected(new Set(employees.filter(e => !e.hasPayroll).map(e => e.id)));
  };

  const clearAll = () => setSelected(new Set());

  const generate = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Generate payroll for ${selected.size} employee(s) for ${MONTHS[month - 1]} ${year}? Existing draft records for selected employees will be overwritten.`)) return;
    setGenerating(true);
    setError(null);
    try {
      const r = await fetch(apiUrl("/payroll/generate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, year, employeeIds: Array.from(selected) }),
      });
      const d = await r.json();
      if (d.success) {
        onGenerated();
        onClose();
      } else {
        setError(d.message ?? "Generation failed.");
      }
    } catch {
      setError("Failed to connect to server.");
    } finally {
      setGenerating(false);
    }
  };

  const branchName = (id: number) => branches.find(b => b.id === id)?.name ?? `Branch ${id}`;

  const selectedCount = selected.size;
  const alreadyHavePayroll = Array.from(selected).filter(id => employees.find(e => e.id === id)?.hasPayroll).length;
  const newlyAdded = selectedCount - alreadyHavePayroll;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-background rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5 border-b border-border flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-bold text-lg flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-primary" />
              Assign Employees to Payroll
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Select which employees to include in <strong>{MONTHS[month - 1]} {year}</strong> payroll
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-4 border-b border-border shrink-0 space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, ID or designation…"
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background"
              />
            </div>
            <Select value={filterBranch} onChange={e => setFilterBranch(e.target.value)} className="text-xs w-40">
              <option value="all">All Branches</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
            <Select value={filterDept} onChange={e => setFilterDept(e.target.value)} className="text-xs w-36">
              <option value="all">All Departments</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </Select>
            <Select value={filterType} onChange={e => setFilterType(e.target.value)} className="text-xs w-32">
              <option value="all">All Types</option>
              <option value="permanent">Permanent</option>
              <option value="contract">Contract</option>
              <option value="casual">Casual</option>
            </Select>
            <Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="text-xs w-36">
              <option value="all">All Employees</option>
              <option value="unassigned">Not Yet Assigned</option>
              <option value="assigned">Already Assigned</option>
            </Select>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Quick select:</span>
            <button onClick={selectAllActive} className="text-xs px-2.5 py-1 rounded-lg border border-border hover:bg-muted transition-colors">
              All Active Employees ({employees.length})
            </button>
            <button onClick={selectOnlyNew} className="text-xs px-2.5 py-1 rounded-lg border border-border hover:bg-muted transition-colors text-primary border-primary/30 bg-primary/5">
              Only New (Without Payroll) ({employees.filter(e => !e.hasPayroll).length})
            </button>
            <button onClick={clearAll} className="text-xs px-2.5 py-1 rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground">
              Clear All
            </button>
            <span className="ml-auto text-xs text-muted-foreground">{filtered.length} employees shown</span>
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground text-sm">Loading employees…</div>
          ) : error ? (
            <div className="p-6 text-center text-red-600 text-sm">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-sm">No employees match your filters.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                <tr className="border-b border-border">
                  <th className="p-3 w-10">
                    <input type="checkbox" checked={allFilteredSelected} onChange={toggleAll} className="rounded" />
                  </th>
                  <th className="p-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Employee</th>
                  <th className="p-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Designation</th>
                  <th className="p-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Branch</th>
                  <th className="p-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Type</th>
                  <th className="p-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Basic Salary</th>
                  <th className="p-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Payroll Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((emp, i) => (
                  <tr
                    key={emp.id}
                    className={cn(
                      "border-b border-border/60 hover:bg-muted/30 transition-colors cursor-pointer",
                      i % 2 === 0 ? "bg-background" : "bg-muted/10",
                      selected.has(emp.id) && "bg-primary/5 hover:bg-primary/8"
                    )}
                    onClick={() => {
                      const s = new Set(selected);
                      s.has(emp.id) ? s.delete(emp.id) : s.add(emp.id);
                      setSelected(s);
                    }}
                  >
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selected.has(emp.id)}
                        onChange={() => {}}
                        onClick={e => e.stopPropagation()}
                        className="rounded pointer-events-none"
                      />
                    </td>
                    <td className="p-3">
                      <p className="font-medium text-foreground">{emp.fullName}</p>
                      <p className="text-xs text-muted-foreground">{emp.employeeId}</p>
                    </td>
                    <td className="p-3">
                      <p className="text-sm">{emp.designation}</p>
                      <p className="text-xs text-muted-foreground">{emp.department}</p>
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">{branchName(emp.branchId)}</td>
                    <td className="p-3">
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium",
                        emp.employeeType === "permanent" ? "bg-blue-100 text-blue-700" :
                        emp.employeeType === "contract" ? "bg-purple-100 text-purple-700" :
                        "bg-orange-100 text-orange-700"
                      )}>
                        {EMP_TYPE_LABELS[emp.employeeType ?? "permanent"] ?? emp.employeeType}
                      </span>
                    </td>
                    <td className="p-3 text-right font-medium text-sm">{fmt(emp.basicSalary)}</td>
                    <td className="p-3">
                      {emp.hasPayroll ? (
                        <div className="flex flex-col gap-0.5">
                          <span className={cn("inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium w-fit",
                            STATUS_STYLES[emp.payrollStatus!]
                          )}>
                            {emp.payrollStatus === "paid" ? <BadgeCheck className="w-3 h-3" /> :
                             emp.payrollStatus === "approved" ? <CheckCircle className="w-3 h-3" /> :
                             <Clock className="w-3 h-3" />}
                            {emp.payrollStatus?.toUpperCase()}
                          </span>
                          <span className="text-xs text-muted-foreground">Net: {fmt(emp.currentNetSalary ?? 0)}</span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-muted text-muted-foreground w-fit">
                          <CircleDashed className="w-3 h-3" />
                          Not Generated
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="p-4 border-t border-border shrink-0">
          {error && (
            <div className="mb-3 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1.5">
                <ListChecks className="w-4 h-4 text-primary" />
                <strong className="text-foreground">{selectedCount}</strong> selected
              </span>
              {newlyAdded > 0 && (
                <span className="text-emerald-600 text-xs">+{newlyAdded} new</span>
              )}
              {alreadyHavePayroll > 0 && (
                <span className="text-amber-600 text-xs">↺ {alreadyHavePayroll} will be regenerated</span>
              )}
            </div>

            <div className="ml-auto flex items-center gap-2">
              <Button
                onClick={onClose}
                className="text-xs bg-secondary text-secondary-foreground hover:bg-secondary/80"
              >
                Cancel
              </Button>
              <Button
                onClick={generate}
                disabled={generating || selectedCount === 0}
                className="text-xs flex items-center gap-2"
              >
                <Banknote className="w-3.5 h-3.5" />
                {generating ? "Generating…" : `Generate Payroll for ${selectedCount} Employee${selectedCount !== 1 ? "s" : ""}`}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Payroll() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [payroll, setPayroll] = useState<PayrollRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [payslip, setPayslip] = useState<PayrollRow | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<string>("employee.fullName");
  const [sortAsc, setSortAsc] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const fetchPayroll = useCallback(async () => {
    setLoading(true); setMsg(null);
    try {
      const [pr, sr] = await Promise.all([
        fetch(apiUrl(`/payroll?month=${month}&year=${year}`)).then(r => r.json()),
        fetch(apiUrl(`/payroll/summary?month=${month}&year=${year}`)).then(r => r.json()),
      ]);
      setPayroll(Array.isArray(pr) ? pr : []);
      setSummary(sr.totalEmployees !== undefined ? sr : null);
    } catch {
      setMsg({ type: "error", text: "Failed to load payroll data." });
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => { fetchPayroll(); }, [fetchPayroll]);

  const updateStatus = async (id: number, status: PayStatus) => {
    await fetch(apiUrl(`/payroll/${id}/status`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setPayroll(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    if (summary) {
      const old = payroll.find(r => r.id === id)?.status;
      if (old) {
        setSummary(s => s ? { ...s, statusCounts: { ...s.statusCounts, [old]: s.statusCounts[old as keyof typeof s.statusCounts] - 1, [status]: s.statusCounts[status] + 1 } } : s);
      }
    }
  };

  const bulkUpdateStatus = async (status: PayStatus) => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    await fetch(apiUrl("/payroll/bulk-status"), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, status }),
    });
    setPayroll(prev => prev.map(r => ids.includes(r.id) ? { ...r, status } : r));
    setSelected(new Set());
    setMsg({ type: "success", text: `${ids.length} records updated to ${status}` });
  };

  const toggleSort = (field: string) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(true); }
  };

  const filtered = payroll
    .filter(r => {
      const q = search.toLowerCase();
      const matchSearch = !q || r.employee.fullName.toLowerCase().includes(q) ||
        r.employee.employeeId.toLowerCase().includes(q) ||
        r.employee.designation.toLowerCase().includes(q);
      const matchStatus = statusFilter === "all" || r.status === statusFilter;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      let av: any = sortField === "employee.fullName" ? a.employee.fullName :
        sortField === "netSalary" ? a.netSalary :
        sortField === "grossSalary" ? a.grossSalary :
        sortField === "status" ? a.status : a.employee.fullName;
      let bv: any = sortField === "employee.fullName" ? b.employee.fullName :
        sortField === "netSalary" ? b.netSalary :
        sortField === "grossSalary" ? b.grossSalary :
        sortField === "status" ? b.status : b.employee.fullName;
      if (typeof av === "string") return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortAsc ? av - bv : bv - av;
    });

  const allSelected = filtered.length > 0 && filtered.every(r => selected.has(r.id));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payroll Management"
        subtitle="Generate, review and process monthly payroll for Sri Lanka Post employees."
      />

      {msg && (
        <div className={cn("flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border",
          msg.type === "success" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200")}>
          {msg.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {msg.text}
          <button onClick={() => setMsg(null)} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Select value={String(month)} onChange={e => setMonth(Number(e.target.value))} className="w-36">
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </Select>
            <Select value={String(year)} onChange={e => setYear(Number(e.target.value))} className="w-24">
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </Select>
          </div>
          <Button
            onClick={fetchPayroll}
            disabled={loading}
            className="text-xs flex items-center gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/80"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            {loading ? "Loading…" : "Refresh"}
          </Button>
          <Button
            onClick={() => setShowGenerateModal(true)}
            className="text-xs flex items-center gap-2"
          >
            <UserCheck className="w-3.5 h-3.5" />
            Assign &amp; Generate Payroll
          </Button>
          {selected.size > 0 && (
            <>
              <Button
                onClick={() => bulkUpdateStatus("approved")}
                className="text-xs flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <CheckCircle className="w-3.5 h-3.5" />Approve ({selected.size})
              </Button>
              <Button
                onClick={() => bulkUpdateStatus("paid")}
                className="text-xs flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CreditCard className="w-3.5 h-3.5" />Mark Paid ({selected.size})
              </Button>
            </>
          )}
        </div>
      </Card>

      {summary && summary.totalEmployees > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Employees", val: summary.totalEmployees, icon: Users, color: "text-blue-600", bg: "bg-blue-50", fmt: (v: number) => v.toString() },
              { label: "Total Gross",    val: summary.totalGross, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50", fmt },
              { label: "Total Net Pay",  val: summary.totalNet,   icon: Banknote,   color: "text-primary",     bg: "bg-primary/5",  fmt },
              { label: "Total EPF",      val: summary.totalEPF,   icon: CreditCard, color: "text-violet-600", bg: "bg-violet-50",  fmt },
            ].map(s => (
              <Card key={s.label} className="p-4">
                <div className="flex items-start gap-3">
                  <div className={cn("p-2 rounded-lg", s.bg)}>
                    <s.icon className={cn("w-4 h-4", s.color)} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className={cn("font-bold text-base mt-0.5 truncate", s.color)}>{s.fmt(s.val)}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="flex gap-3 flex-wrap items-center">
            {[
              { label: "Draft",    count: summary.statusCounts.draft,    color: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock },
              { label: "Approved", count: summary.statusCounts.approved,  color: "bg-blue-100 text-blue-700 border-blue-200", icon: CheckCircle },
              { label: "Paid",     count: summary.statusCounts.paid,      color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: BadgeCheck },
            ].map(s => (
              <div key={s.label} className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium", s.color)}>
                <s.icon className="w-3.5 h-3.5" />
                {s.label}: <span className="font-bold">{s.count}</span>
              </div>
            ))}
            <button
              onClick={() => setShowGenerateModal(true)}
              className="ml-auto text-xs text-primary flex items-center gap-1 hover:underline"
            >
              Manage employee assignments <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </>
      )}

      {payroll.length > 0 && (
        <Card className="overflow-hidden p-0">
          <div className="p-4 border-b border-border flex items-center gap-3 flex-wrap">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, ID or designation…"
              className="border border-border rounded-lg px-3 py-1.5 text-sm flex-1 min-w-48 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background"
            />
            <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-32 text-xs">
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
            </Select>
            <span className="text-xs text-muted-foreground">{filtered.length} records</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="p-3 w-8">
                    <input type="checkbox" checked={allSelected}
                      onChange={e => setSelected(e.target.checked ? new Set(filtered.map(r => r.id)) : new Set())}
                      className="rounded" />
                  </th>
                  {[
                    { label: "Employee",    field: "employee.fullName" },
                    { label: "Type",        field: null },
                    { label: "Attendance",  field: null },
                    { label: "Basic",       field: null },
                    { label: "Gross Salary", field: "grossSalary" },
                    { label: "Deductions",  field: null },
                    { label: "Net Salary",  field: "netSalary" },
                    { label: "Status",      field: "status" },
                    { label: "Actions",     field: null },
                  ].map(col => (
                    <th key={col.label}
                      className={cn("p-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide",
                        col.field && "cursor-pointer hover:text-foreground")}
                      onClick={() => col.field && toggleSort(col.field)}>
                      <div className="flex items-center gap-1">
                        {col.label}
                        {col.field && sortField === col.field && (
                          sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, i) => (
                  <tr key={row.id}
                    className={cn("border-b border-border/60 hover:bg-muted/30 transition-colors",
                      i % 2 === 0 ? "bg-background" : "bg-muted/10",
                      selected.has(row.id) && "bg-primary/5")}>
                    <td className="p-3">
                      <input type="checkbox" checked={selected.has(row.id)}
                        onChange={e => {
                          const s = new Set(selected);
                          e.target.checked ? s.add(row.id) : s.delete(row.id);
                          setSelected(s);
                        }} className="rounded" />
                    </td>
                    <td className="p-3">
                      <p className="font-medium text-foreground">{row.employee.fullName}</p>
                      <p className="text-xs text-muted-foreground">{row.employee.employeeId} · {row.employee.designation}</p>
                    </td>
                    <td className="p-3">
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium",
                        row.employee.employeeType === "permanent" ? "bg-blue-100 text-blue-700" :
                        row.employee.employeeType === "contract" ? "bg-purple-100 text-purple-700" :
                        "bg-orange-100 text-orange-700"
                      )}>
                        {EMP_TYPE_LABELS[row.employee.employeeType ?? "permanent"] ?? "Permanent"}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1 text-[11px]">
                        <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">P:{row.presentDays}</span>
                        <span className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded">A:{row.absentDays}</span>
                        <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">L:{row.lateDays}</span>
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground">{fmt(row.basicSalary)}</td>
                    <td className="p-3 font-medium">{fmt(row.grossSalary)}</td>
                    <td className="p-3 text-red-600 text-sm">{fmt(row.totalDeductions)}</td>
                    <td className="p-3 font-bold text-primary">{fmt(row.netSalary)}</td>
                    <td className="p-3">
                      <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", STATUS_STYLES[row.status])}>
                        {row.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setPayslip(row)}
                          className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                          title="View Payslip"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {row.status === "draft" && (
                          <button
                            onClick={() => updateStatus(row.id, "approved")}
                            className="p-1.5 rounded-lg hover:bg-blue-50 transition-colors text-blue-600"
                            title="Approve"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {row.status === "approved" && (
                          <button
                            onClick={() => updateStatus(row.id, "paid")}
                            className="p-1.5 rounded-lg hover:bg-emerald-50 transition-colors text-emerald-600"
                            title="Mark as Paid"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <div className="py-12 text-center text-muted-foreground text-sm">
              No payroll records match your filter.
            </div>
          )}
        </Card>
      )}

      {payroll.length === 0 && !loading && (
        <Card className="p-12 text-center">
          <UserCheck className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-muted-foreground font-medium mb-1">No payroll data for {MONTHS[month - 1]} {year}</p>
          <p className="text-xs text-muted-foreground mb-4">
            Click "Assign &amp; Generate Payroll" to select employees and calculate their salaries from attendance records.
          </p>
          <Button onClick={() => setShowGenerateModal(true)} className="text-xs mx-auto flex items-center gap-2">
            <UserCheck className="w-3.5 h-3.5" />
            Assign &amp; Generate Payroll
          </Button>
        </Card>
      )}

      {payslip && <PayslipModal row={payslip} onClose={() => setPayslip(null)} />}

      {showGenerateModal && (
        <GeneratePayrollModal
          month={month}
          year={year}
          onClose={() => setShowGenerateModal(false)}
          onGenerated={() => {
            setShowGenerateModal(false);
            setMsg({ type: "success", text: `Payroll generated successfully for ${MONTHS[month - 1]} ${year}.` });
            fetchPayroll();
          }}
        />
      )}
    </div>
  );
}
