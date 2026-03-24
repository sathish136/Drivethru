import { useState, useEffect, useCallback, useMemo } from "react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
function getApiUrl(path: string) { return `${BASE}/api/${path}`; }

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

interface Employee {
  id: number;
  employeeId: string;
  fullName: string;
  designation: string;
  department: string;
}

interface LoanRow {
  id: number;
  type: "loan" | "advance";
  totalAmount: number;
  monthlyInstallment: number;
  startMonth: number;
  startYear: number;
  paidAmount: number;
  remainingBalance: number;
  status: "active" | "completed" | "cancelled";
  description: string | null;
  createdAt: string;
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  designation: string;
  department: string;
}

interface Summary {
  activeCount: number;
  totalLoans: number;
  totalAdvances: number;
  totalOutstanding: number;
  totalMonthlyDeduction: number;
}

const EMPTY_FORM = {
  employeeId: "",
  type: "loan" as "loan" | "advance",
  totalAmount: "",
  monthlyInstallment: "",
  startMonth: String(new Date().getMonth() + 1),
  startYear: String(new Date().getFullYear()),
  description: "",
};

function addMonths(month: number, year: number, n: number) {
  const d = new Date(year, month - 1 + n, 1);
  return { month: d.getMonth() + 1, year: d.getFullYear() };
}

function calcSchedule(totalAmount: number, installment: number, startMonth: number, startYear: number) {
  if (!totalAmount || !installment || installment <= 0) return [];
  const months: { month: number; year: number; amount: number; balance: number }[] = [];
  let remaining = totalAmount;
  let i = 0;
  while (remaining > 0 && i < 120) {
    const amt = Math.min(remaining, installment);
    remaining = Math.max(0, remaining - amt);
    const { month, year } = addMonths(startMonth, startYear, i);
    months.push({ month, year, amount: amt, balance: remaining });
    i++;
  }
  return months;
}

export default function Loans() {
  const [loans, setLoans] = useState<LoanRow[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editLoan, setEditLoan] = useState<LoanRow | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState("active");
  const [filterType, setFilterType] = useState("");
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<LoanRow | null>(null);
  const [detailLoan, setDetailLoan] = useState<LoanRow | null>(null);
  const [empSearch, setEmpSearch] = useState("");
  const [showEmpDrop, setShowEmpDrop] = useState(false);

  const fmt = (n: number) =>
    "Rs. " + n.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [loansRes, empsRes, sumRes] = await Promise.all([
        fetch(getApiUrl("loans")),
        fetch(getApiUrl("employees?limit=500&status=active")),
        fetch(getApiUrl("loans/summary")),
      ]);
      const loansData = await loansRes.json();
      const empsRaw = await empsRes.json();
      const sumData = await sumRes.json();
      setLoans(Array.isArray(loansData) ? loansData : []);
      let empArr: Employee[] = [];
      if (Array.isArray(empsRaw)) empArr = empsRaw;
      else if (Array.isArray(empsRaw?.employees)) empArr = empsRaw.employees;
      else if (Array.isArray(empsRaw?.data)) empArr = empsRaw.data;
      setEmployees(empArr);
      setSummary(sumData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const totalMonths = useMemo(() => {
    const ta = Number(form.totalAmount);
    const mi = Number(form.monthlyInstallment);
    if (!ta || !mi || mi <= 0) return 0;
    return Math.ceil(ta / mi);
  }, [form.totalAmount, form.monthlyInstallment]);

  const endMonthYear = useMemo(() => {
    if (!totalMonths) return null;
    return addMonths(Number(form.startMonth), Number(form.startYear), totalMonths - 1);
  }, [totalMonths, form.startMonth, form.startYear]);

  const schedule = useMemo(() =>
    calcSchedule(Number(form.totalAmount), Number(form.monthlyInstallment), Number(form.startMonth), Number(form.startYear)),
    [form.totalAmount, form.monthlyInstallment, form.startMonth, form.startYear]
  );

  const filteredEmps = useMemo(() => {
    if (!empSearch.trim()) return employees.slice(0, 50);
    const q = empSearch.toLowerCase();
    return employees.filter(e =>
      e.fullName?.toLowerCase().includes(q) || e.employeeId?.toLowerCase().includes(q)
    ).slice(0, 50);
  }, [employees, empSearch]);

  const selectedEmp = useMemo(() =>
    employees.find(e => String(e.id) === form.employeeId), [employees, form.employeeId]);

  const openNew = () => {
    setEditLoan(null);
    setForm({ ...EMPTY_FORM });
    setEmpSearch("");
    setShowEmpDrop(false);
    setShowModal(true);
  };

  const openEdit = (l: LoanRow) => {
    setEditLoan(l);
    setForm({
      employeeId: String(l.employeeId),
      type: l.type,
      totalAmount: String(l.totalAmount),
      monthlyInstallment: String(l.monthlyInstallment),
      startMonth: String(l.startMonth),
      startYear: String(l.startYear),
      description: l.description ?? "",
    });
    setEmpSearch("");
    setShowEmpDrop(false);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.employeeId || !form.totalAmount || !form.monthlyInstallment) {
      alert("Please fill all required fields.");
      return;
    }
    if (Number(form.monthlyInstallment) <= 0 || Number(form.totalAmount) <= 0) {
      alert("Amounts must be greater than 0.");
      return;
    }
    setSaving(true);
    try {
      const url = editLoan ? getApiUrl(`loans/${editLoan.id}`) : getApiUrl("loans");
      const method = editLoan ? "PUT" : "POST";
      const body = editLoan
        ? { monthlyInstallment: Number(form.monthlyInstallment), description: form.description || null }
        : {
            employeeId: Number(form.employeeId),
            type: form.type,
            totalAmount: Number(form.totalAmount),
            monthlyInstallment: Number(form.monthlyInstallment),
            startMonth: Number(form.startMonth),
            startYear: Number(form.startYear),
            description: form.description || null,
          };
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) { const err = await res.json(); alert(err.error || "Failed to save"); return; }
      setShowModal(false);
      await fetchAll();
    } catch {
      alert("Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (l: LoanRow) => {
    if (!confirm(`Cancel this ${l.type} for ${l.employeeName}?`)) return;
    await fetch(getApiUrl(`loans/${l.id}`), {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled" }),
    });
    await fetchAll();
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    await fetch(getApiUrl(`loans/${confirmDelete.id}`), { method: "DELETE" });
    setConfirmDelete(null);
    await fetchAll();
  };

  const visible = loans.filter(l => {
    if (filterStatus && l.status !== filterStatus) return false;
    if (filterType && l.type !== filterType) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!l.employeeName?.toLowerCase().includes(q) && !l.employeeCode?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const pct = (l: LoanRow) =>
    l.totalAmount > 0 ? Math.min(100, Math.round((l.paidAmount / l.totalAmount) * 100)) : 0;

  const loanMonths = (l: LoanRow) =>
    l.monthlyInstallment > 0 ? Math.ceil(l.totalAmount / l.monthlyInstallment) : 0;

  const loanEndDate = (l: LoanRow) => {
    const m = loanMonths(l);
    if (!m) return null;
    return addMonths(l.startMonth, l.startYear, m - 1);
  };

  const years = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 1 + i);

  const statusBadge = (s: string) => {
    if (s === "active")    return "bg-emerald-100 text-emerald-700 border border-emerald-200";
    if (s === "completed") return "bg-blue-100 text-blue-700 border border-blue-200";
    return "bg-red-100 text-red-600 border border-red-200";
  };

  const typeBadge = (t: string) =>
    t === "loan"
      ? "bg-amber-100 text-amber-700 border border-amber-200"
      : "bg-violet-100 text-violet-700 border border-violet-200";

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-5">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Staff Loans & Advances</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Manage employee loan and salary advance deductions</p>
          </div>
          <button
            onClick={openNew}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 active:opacity-80 transition-opacity shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Add Loan / Advance
          </button>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Active Records</p>
              <p className="text-3xl font-bold text-foreground mt-1">{summary.activeCount}</p>
              <p className="text-xs text-muted-foreground mt-0.5">total active</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Active Loans</p>
              <p className="text-3xl font-bold text-primary mt-1">{summary.totalLoans}</p>
              <p className="text-xs text-muted-foreground mt-0.5">long-term</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Advances</p>
              <p className="text-3xl font-bold text-primary mt-1">{summary.totalAdvances}</p>
              <p className="text-xs text-muted-foreground mt-0.5">salary advance</p>
            </div>
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 shadow-sm">
              <p className="text-xs text-primary uppercase tracking-wide font-medium">Total Outstanding</p>
              <p className="text-lg font-bold text-foreground mt-1 leading-tight">{fmt(summary.totalOutstanding)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">remaining balance</p>
            </div>
            <div className="bg-primary rounded-xl p-4 shadow-sm">
              <p className="text-xs text-primary-foreground/70 uppercase tracking-wide font-medium">Monthly Deduction</p>
              <p className="text-lg font-bold text-primary-foreground mt-1 leading-tight">{fmt(summary.totalMonthlyDeduction)}</p>
              <p className="text-xs text-primary-foreground/60 mt-0.5">auto payroll deduction</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-card border border-border rounded-xl p-3 flex flex-wrap gap-3 items-center shadow-sm">
          <div className="relative flex-1 min-w-[180px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by name or employee ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full border border-border rounded-lg pl-9 pr-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
            />
          </div>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All Types</option>
            <option value="loan">Loan</option>
            <option value="advance">Advance</option>
          </select>
          <span className="text-sm text-muted-foreground whitespace-nowrap">{visible.length} record{visible.length !== 1 ? "s" : ""}</span>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center h-48 bg-card border border-border rounded-xl shadow-sm">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : visible.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-16 text-center shadow-sm">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-muted rounded-full mb-4">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p className="text-muted-foreground font-medium">No records found</p>
            <p className="text-muted-foreground text-sm mt-1">Add a loan or advance to get started</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-muted border-b border-border">
                    {["Employee","Type","Total Amount","Monthly Deduction","Duration","Start → End","Paid","Remaining","Progress","Status","Actions"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {visible.map(l => {
                    const months = loanMonths(l);
                    const end = loanEndDate(l);
                    const progress = pct(l);
                    return (
                      <tr key={l.id} className="hover:bg-muted/40 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-foreground text-sm">{l.employeeName}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{l.employeeCode} · {l.department}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${typeBadge(l.type)}`}>
                            {l.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-foreground">{fmt(l.totalAmount)}</td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-medium text-primary">{fmt(l.monthlyInstallment)}</span>
                          <span className="text-xs text-muted-foreground">/mo</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-bold text-foreground">{months}</span>
                          <span className="text-xs text-muted-foreground ml-1">mo</span>
                        </td>
                        <td className="px-4 py-3 text-xs whitespace-nowrap">
                          <div className="font-medium text-foreground">{MONTHS[l.startMonth - 1]?.slice(0, 3)} {l.startYear}</div>
                          {end && <div className="text-muted-foreground">→ {MONTHS[end.month - 1]?.slice(0, 3)} {end.year}</div>}
                        </td>
                        <td className="px-4 py-3 text-sm text-emerald-600 font-medium">{fmt(l.paidAmount)}</td>
                        <td className="px-4 py-3 text-sm font-bold text-red-600">{fmt(l.remainingBalance)}</td>
                        <td className="px-4 py-3">
                          <div className="w-28">
                            <div className="flex justify-between items-center text-xs mb-1">
                              <span className="text-muted-foreground font-medium">{progress}%</span>
                              <span className="text-muted-foreground text-[10px]">
                                {Math.round((l.paidAmount / (l.monthlyInstallment || 1)))} / {months}
                              </span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-1.5">
                              <div
                                className="h-1.5 rounded-full bg-primary transition-all"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${statusBadge(l.status)}`}>
                            {l.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setDetailLoan(l)}
                              className="text-xs text-muted-foreground hover:text-primary font-medium px-2 py-1 rounded hover:bg-primary/10 transition-colors"
                            >
                              Schedule
                            </button>
                            {l.status === "active" && (
                              <>
                                <button onClick={() => openEdit(l)} className="text-xs text-primary font-medium px-2 py-1 rounded hover:bg-primary/10 transition-colors">
                                  Edit
                                </button>
                                <button onClick={() => handleCancel(l)} className="text-xs text-muted-foreground hover:text-foreground font-medium px-2 py-1 rounded hover:bg-muted transition-colors">
                                  Cancel
                                </button>
                              </>
                            )}
                            {l.status !== "active" && (
                              <button onClick={() => setConfirmDelete(l)} className="text-xs text-muted-foreground hover:text-foreground font-medium px-2 py-1 rounded hover:bg-muted transition-colors">
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ─── Add / Edit Modal ─── */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-foreground/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-border" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 rounded-t-2xl flex items-center justify-between z-10">
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  {editLoan ? "Edit Loan / Advance" : "New Loan / Advance"}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {editLoan ? "Update installment amount or notes" : "Configure deduction details"}
                </p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-muted transition-colors">
                <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Employee Picker */}
              {!editLoan && (
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">
                    Employee <span className="text-primary">*</span>
                  </label>
                  <div className="relative">
                    <div
                      className="w-full border border-border rounded-xl px-3 py-2.5 text-sm cursor-pointer flex items-center justify-between focus-within:ring-2 focus-within:ring-ring bg-background"
                      onClick={() => setShowEmpDrop(v => !v)}
                    >
                      {selectedEmp ? (
                        <div>
                          <span className="font-medium text-foreground">{selectedEmp.fullName}</span>
                          <span className="text-muted-foreground ml-2 text-xs">({selectedEmp.employeeId})</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Select employee...</span>
                      )}
                      <svg className={`w-4 h-4 text-muted-foreground transition-transform ${showEmpDrop ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    {showEmpDrop && (
                      <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
                        <div className="p-2 border-b border-border">
                          <input
                            autoFocus
                            type="text"
                            placeholder="Search name or ID..."
                            value={empSearch}
                            onChange={e => setEmpSearch(e.target.value)}
                            className="w-full text-sm px-3 py-1.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                          />
                        </div>
                        <div className="max-h-52 overflow-y-auto">
                          {filteredEmps.length === 0 ? (
                            <div className="p-4 text-sm text-muted-foreground text-center">No employees found</div>
                          ) : filteredEmps.map(e => (
                            <div
                              key={e.id}
                              onClick={() => { setForm(f => ({ ...f, employeeId: String(e.id) })); setShowEmpDrop(false); setEmpSearch(""); }}
                              className={`px-4 py-2.5 cursor-pointer hover:bg-primary/8 transition-colors flex items-center justify-between ${form.employeeId === String(e.id) ? "bg-primary/10" : ""}`}
                            >
                              <div>
                                <div className="text-sm font-medium text-foreground">{e.fullName}</div>
                                <div className="text-xs text-muted-foreground">{e.designation} · {e.department}</div>
                              </div>
                              <span className="text-xs text-muted-foreground font-mono">{e.employeeId}</span>
                            </div>
                          ))}
                        </div>
                        {employees.length > 50 && (
                          <div className="p-2 border-t border-border text-center text-xs text-muted-foreground">
                            Type to search all {employees.length} employees
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Edit: employee info */}
              {editLoan && (
                <div className="bg-muted rounded-xl p-4 border border-border">
                  <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide mb-1">Employee</p>
                  <p className="font-semibold text-foreground">{editLoan.employeeName}</p>
                  <p className="text-sm text-muted-foreground">{editLoan.employeeCode} · {editLoan.department}</p>
                </div>
              )}

              {/* Type */}
              {!editLoan && (
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Type <span className="text-primary">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {(["loan", "advance"] as const).map(t => (
                      <label
                        key={t}
                        className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          form.type === t
                            ? t === "loan"
                              ? "border-amber-400 bg-amber-50 shadow-sm"
                              : "border-violet-400 bg-violet-50 shadow-sm"
                            : "border-border hover:border-muted-foreground/30 hover:bg-muted/60"
                        }`}
                      >
                        <input type="radio" name="type" value={t} checked={form.type === t} onChange={() => setForm(f => ({ ...f, type: t }))} className="sr-only" />
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          form.type === t
                            ? t === "loan" ? "bg-amber-500 text-white" : "bg-violet-500 text-white"
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {t === "loan" ? (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                        </div>
                        <div>
                          <p className={`font-semibold capitalize text-sm ${form.type === t ? (t === "loan" ? "text-amber-700" : "text-violet-700") : "text-foreground"}`}>{t}</p>
                          <p className="text-xs text-muted-foreground">{t === "loan" ? "Long-term repayment" : "Salary advance"}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Amounts */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">
                    Total Amount (Rs.) <span className="text-primary">*</span>
                  </label>
                  <input
                    type="number" min="0"
                    disabled={!!editLoan}
                    value={form.totalAmount}
                    onChange={e => setForm(f => ({ ...f, totalAmount: e.target.value }))}
                    className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:bg-muted disabled:text-muted-foreground placeholder:text-muted-foreground"
                    placeholder="e.g. 50000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">
                    Monthly Installment (Rs.) <span className="text-primary">*</span>
                  </label>
                  <input
                    type="number" min="1"
                    value={form.monthlyInstallment}
                    onChange={e => setForm(f => ({ ...f, monthlyInstallment: e.target.value }))}
                    className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                    placeholder="e.g. 5000"
                  />
                </div>
              </div>

              {/* Start Month/Year */}
              {!editLoan && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Deduction Starts <span className="text-primary">*</span>
                    </label>
                    <select
                      value={form.startMonth}
                      onChange={e => setForm(f => ({ ...f, startMonth: e.target.value }))}
                      className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">Year</label>
                    <select
                      value={form.startYear}
                      onChange={e => setForm(f => ({ ...f, startYear: e.target.value }))}
                      className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {/* Computed Summary */}
              {form.totalAmount && form.monthlyInstallment && Number(form.monthlyInstallment) > 0 && (
                <div className="bg-primary/8 border border-primary/20 rounded-xl p-4">
                  <p className="text-xs text-primary font-semibold uppercase tracking-wide mb-3">Repayment Plan</p>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-foreground">{totalMonths}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Total Months</p>
                    </div>
                    <div className="border-x border-primary/20">
                      <p className="text-sm font-bold text-foreground">
                        {MONTHS[Number(form.startMonth) - 1]?.slice(0, 3)} {form.startYear}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">Starts</p>
                    </div>
                    <div>
                      {endMonthYear && (
                        <>
                          <p className="text-sm font-bold text-foreground">
                            {MONTHS[endMonthYear.month - 1]?.slice(0, 3)} {endMonthYear.year}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">Ends</p>
                        </>
                      )}
                    </div>
                  </div>
                  {/* Schedule preview */}
                  {schedule.length > 0 && (
                    <div className="mt-3 border-t border-primary/15 pt-3">
                      <p className="text-xs text-primary font-medium mb-2">Month-by-Month Deduction</p>
                      <div className="space-y-0.5 max-h-40 overflow-y-auto">
                        {schedule.map((s, idx) => (
                          <div key={idx} className="flex items-center text-xs py-1 border-b border-primary/10 last:border-0 gap-2">
                            <span className="text-muted-foreground w-5 text-right flex-shrink-0">{idx + 1}</span>
                            <span className="text-foreground font-medium flex-1">{MONTHS[s.month - 1]} {s.year}</span>
                            <span className="text-primary font-semibold">Rs. {s.amount.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            <span className="text-muted-foreground w-32 text-right">Bal: Rs. {s.balance.toLocaleString("en-LK", { maximumFractionDigits: 0 })}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Notes / Purpose</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none placeholder:text-muted-foreground"
                  placeholder="Optional notes..."
                />
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-card border-t border-border px-6 py-4 rounded-b-2xl flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 border border-border text-foreground py-2.5 rounded-xl text-sm font-semibold hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.employeeId}
                className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Saving...
                  </span>
                ) : editLoan ? "Save Changes" : "Add Record"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Schedule Detail Modal ─── */}
      {detailLoan && (
        <div className="fixed inset-0 z-50 bg-foreground/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDetailLoan(null)}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-bold text-foreground">Repayment Schedule</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold mr-2 capitalize ${typeBadge(detailLoan.type)}`}>{detailLoan.type}</span>
                  {detailLoan.employeeName}
                </p>
              </div>
              <button onClick={() => setDetailLoan(null)} className="p-2 rounded-lg hover:bg-muted transition-colors">
                <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-3 bg-muted border-b border-border grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="font-bold text-foreground text-sm">{fmt(detailLoan.totalAmount)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Monthly</p>
                <p className="font-bold text-primary text-sm">{fmt(detailLoan.monthlyInstallment)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Duration</p>
                <p className="font-bold text-foreground text-sm">{loanMonths(detailLoan)} months</p>
              </div>
            </div>
            <div className="px-6 py-2.5 bg-muted/60 border-b border-border grid grid-cols-2 gap-3 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Starts</p>
                <p className="font-semibold text-foreground text-sm">{MONTHS[detailLoan.startMonth - 1]} {detailLoan.startYear}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ends</p>
                {(() => { const e = loanEndDate(detailLoan); return e ? <p className="font-semibold text-foreground text-sm">{MONTHS[e.month - 1]} {e.year}</p> : <p className="text-muted-foreground text-sm">—</p>; })()}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-3">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground uppercase border-b border-border">
                    <th className="pb-2 text-left font-semibold">#</th>
                    <th className="pb-2 text-left font-semibold">Month</th>
                    <th className="pb-2 text-right font-semibold">Deduction</th>
                    <th className="pb-2 text-right font-semibold">Balance</th>
                    <th className="pb-2 text-center font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {calcSchedule(detailLoan.totalAmount, detailLoan.monthlyInstallment, detailLoan.startMonth, detailLoan.startYear).map((s, idx) => {
                    const cumPaid = (idx + 1) * detailLoan.monthlyInstallment;
                    const isPaid = cumPaid <= detailLoan.paidAmount;
                    const isCurrent = !isPaid && (cumPaid - detailLoan.monthlyInstallment) < detailLoan.paidAmount;
                    return (
                      <tr key={idx} className={isPaid ? "bg-primary/5" : isCurrent ? "bg-primary/10" : ""}>
                        <td className="py-2 text-muted-foreground text-xs">{idx + 1}</td>
                        <td className="py-2 font-medium text-foreground">{MONTHS[s.month - 1]?.slice(0, 3)} {s.year}</td>
                        <td className="py-2 text-right font-semibold text-foreground text-xs">
                          Rs. {s.amount.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-2 text-right text-muted-foreground text-xs">
                          Rs. {s.balance.toLocaleString("en-LK", { maximumFractionDigits: 0 })}
                        </td>
                        <td className="py-2 text-center text-xs">
                          {isPaid
                            ? <span className="text-primary font-medium">✓ Paid</span>
                            : isCurrent
                            ? <span className="text-primary font-bold">● Now</span>
                            : <span className="text-muted-foreground">—</span>
                          }
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── Delete Confirm ─── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-foreground/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-foreground">Delete Record?</h3>
                <p className="text-sm text-muted-foreground">This cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground bg-muted rounded-lg p-3">
              Permanently delete the <strong className="text-foreground">{confirmDelete.type}</strong> record for <strong className="text-foreground">{confirmDelete.employeeName}</strong>?
            </p>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 border border-border text-foreground py-2.5 rounded-xl text-sm font-semibold hover:bg-muted transition-colors">
                Cancel
              </button>
              <button onClick={handleDelete} className="flex-1 bg-foreground text-background py-2.5 rounded-xl text-sm font-semibold hover:opacity-80 transition-opacity">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
