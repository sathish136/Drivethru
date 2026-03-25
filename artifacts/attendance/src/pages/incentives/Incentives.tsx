import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Gift, Plus, Search, Pencil, Trash2, CheckCircle2, Clock, Banknote,
  X, TrendingUp,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
function getApiUrl(path: string) { return `${BASE}/api/${path}`; }

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const INCENTIVE_TYPES = [
  { value: "performance", label: "Performance Bonus",  color: "bg-purple-100 text-purple-700 border border-purple-200"  },
  { value: "attendance",  label: "Attendance Bonus",   color: "bg-blue-100 text-blue-700 border border-blue-200"        },
  { value: "festival",    label: "Festival Bonus",     color: "bg-orange-100 text-orange-700 border border-orange-200"  },
  { value: "lunch",       label: "Lunch Incentive",    color: "bg-yellow-100 text-yellow-700 border border-yellow-200"  },
  { value: "other",       label: "Other",              color: "bg-gray-100 text-gray-600 border border-gray-200"        },
] as const;

type IncentiveType   = "performance" | "attendance" | "festival" | "lunch" | "other";
type IncentiveStatus = "pending" | "approved" | "paid";

interface Employee {
  id: number;
  employeeId: string;
  fullName: string;
  designation: string;
  department: string;
}

interface IncentiveRow {
  id: number;
  month: number;
  year: number;
  type: IncentiveType;
  amount: number;
  reason: string | null;
  status: IncentiveStatus;
  notes: string | null;
  createdAt: string;
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  designation: string;
  department: string;
}

interface Summary {
  totalCount: number;
  totalAmount: number;
  pendingCount: number;
  approvedCount: number;
  paidCount: number;
  pendingAmount: number;
  approvedAmount: number;
  paidAmount: number;
  byType: Record<string, number>;
}

const now = new Date();
const EMPTY_FORM = {
  employeeId: "",
  month: String(now.getMonth() + 1),
  year: String(now.getFullYear()),
  type: "performance" as IncentiveType,
  amount: "",
  reason: "",
  status: "pending" as IncentiveStatus,
  notes: "",
};

function fmt(n: number) {
  return "Rs. " + n.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function TypeBadge({ type }: { type: IncentiveType }) {
  const cfg = INCENTIVE_TYPES.find(t => t.value === type)!;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function StatusBadge({ status }: { status: IncentiveStatus }) {
  const map = {
    pending:  { cls: "bg-yellow-100 text-yellow-700 border border-yellow-200", label: "Pending"  },
    approved: { cls: "bg-emerald-100 text-emerald-700 border border-emerald-200", label: "Approved" },
    paid:     { cls: "bg-blue-100 text-blue-700 border border-blue-200",     label: "Paid"    },
  };
  const cfg = map[status];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

export default function Incentives() {
  const [rows, setRows]           = useState<IncentiveRow[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [summary, setSummary]     = useState<Summary | null>(null);
  const [loading, setLoading]     = useState(true);

  const [showModal, setShowModal]       = useState(false);
  const [editRow, setEditRow]           = useState<IncentiveRow | null>(null);
  const [form, setForm]                 = useState({ ...EMPTY_FORM });
  const [saving, setSaving]             = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<IncentiveRow | null>(null);

  const [filterMonth,  setFilterMonth]  = useState("");
  const [filterYear,   setFilterYear]   = useState(String(now.getFullYear()));
  const [filterType,   setFilterType]   = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [search, setSearch]             = useState("");

  const [empSearch,   setEmpSearch]   = useState("");
  const [showEmpDrop, setShowEmpDrop] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params    = new URLSearchParams();
      const sumParams = new URLSearchParams();
      if (filterMonth)  { params.set("month",  filterMonth); sumParams.set("month", filterMonth); }
      if (filterYear)   { params.set("year",   filterYear);  sumParams.set("year",  filterYear);  }
      if (filterType)   params.set("type",   filterType);
      if (filterStatus) params.set("status", filterStatus);

      const [incRes, empsRes, sumRes] = await Promise.all([
        fetch(getApiUrl(`incentives?${params}`)),
        fetch(getApiUrl("employees?limit=500&status=active")),
        fetch(getApiUrl(`incentives/summary?${sumParams}`)),
      ]);
      const incData  = await incRes.json();
      const empsRaw  = await empsRes.json();
      const sumData  = await sumRes.json();

      setRows(Array.isArray(incData) ? incData : []);
      let empArr: Employee[] = [];
      if (Array.isArray(empsRaw))             empArr = empsRaw;
      else if (Array.isArray(empsRaw?.employees)) empArr = empsRaw.employees;
      else if (Array.isArray(empsRaw?.data))      empArr = empsRaw.data;
      setEmployees(empArr);
      setSummary(sumData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filterMonth, filterYear, filterType, filterStatus]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(r =>
      r.employeeName?.toLowerCase().includes(q) ||
      r.employeeCode?.toLowerCase().includes(q) ||
      r.designation?.toLowerCase().includes(q) ||
      r.reason?.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const filteredEmps = useMemo(() => {
    if (!empSearch.trim()) return employees.slice(0, 50);
    const q = empSearch.toLowerCase();
    return employees.filter(e =>
      e.fullName?.toLowerCase().includes(q) || e.employeeId?.toLowerCase().includes(q)
    ).slice(0, 50);
  }, [employees, empSearch]);

  const selectedEmp = useMemo(
    () => employees.find(e => String(e.id) === form.employeeId),
    [employees, form.employeeId]
  );

  function openAdd() {
    setEditRow(null);
    setForm({ ...EMPTY_FORM });
    setEmpSearch("");
    setShowEmpDrop(false);
    setShowModal(true);
  }

  function openEdit(row: IncentiveRow) {
    setEditRow(row);
    setEmpSearch("");
    setShowEmpDrop(false);
    setForm({
      employeeId: String(row.employeeId),
      month:  String(row.month),
      year:   String(row.year),
      type:   row.type,
      amount: String(row.amount),
      reason: row.reason  || "",
      status: row.status,
      notes:  row.notes   || "",
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.employeeId || !form.amount) return;
    setSaving(true);
    try {
      const body = {
        employeeId: Number(form.employeeId),
        month:  Number(form.month),
        year:   Number(form.year),
        type:   form.type,
        amount: Number(form.amount),
        reason: form.reason || null,
        status: form.status,
        notes:  form.notes  || null,
      };
      const url    = editRow ? getApiUrl(`incentives/${editRow.id}`) : getApiUrl("incentives");
      const method = editRow ? "PUT" : "POST";
      const res    = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error("Save failed");
      setShowModal(false);
      await fetchAll();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(row: IncentiveRow) {
    await fetch(getApiUrl(`incentives/${row.id}`), { method: "DELETE" });
    setConfirmDelete(null);
    await fetchAll();
  }

  async function handleStatusChange(row: IncentiveRow, status: IncentiveStatus) {
    await fetch(getApiUrl(`incentives/${row.id}`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await fetchAll();
  }

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  /* ─────────────────────────── RENDER ─────────────────────────── */
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-5">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Incentives</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Manage employee performance and special bonuses</p>
          </div>
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 active:opacity-80 transition-opacity shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Incentive
          </button>
        </div>

        {/* ── Summary Cards ── */}
        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Total Incentives</p>
              <p className="text-lg font-bold text-foreground mt-1 leading-tight">{fmt(summary.totalAmount)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{summary.totalCount} record{summary.totalCount !== 1 ? "s" : ""}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Pending</p>
              <p className="text-lg font-bold text-yellow-600 mt-1 leading-tight">{fmt(summary.pendingAmount)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{summary.pendingCount} record{summary.pendingCount !== 1 ? "s" : ""}</p>
            </div>
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 shadow-sm">
              <p className="text-xs text-primary uppercase tracking-wide font-medium">Approved</p>
              <p className="text-lg font-bold text-foreground mt-1 leading-tight">{fmt(summary.approvedAmount)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{summary.approvedCount} approved</p>
            </div>
            <div className="bg-primary rounded-xl p-4 shadow-sm">
              <p className="text-xs text-primary-foreground/70 uppercase tracking-wide font-medium">Paid</p>
              <p className="text-lg font-bold text-primary-foreground mt-1 leading-tight">{fmt(summary.paidAmount)}</p>
              <p className="text-xs text-primary-foreground/60 mt-0.5">{summary.paidCount} paid out</p>
            </div>
          </div>
        )}

        {/* ── Type Breakdown ── */}
        {summary && Object.keys(summary.byType).length > 0 && (
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-3">Breakdown by Type</p>
            <div className="flex flex-wrap gap-4">
              {INCENTIVE_TYPES.filter(t => summary.byType[t.value]).map(t => (
                <div key={t.value} className="flex items-center gap-2">
                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${t.color}`}>{t.label}</span>
                  <span className="text-sm font-bold text-foreground">{fmt(summary.byType[t.value] || 0)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Filters ── */}
        <div className="bg-card border border-border rounded-xl p-3 flex flex-wrap gap-3 items-center shadow-sm">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, reason..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full border border-border rounded-lg pl-9 pr-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
            />
          </div>
          <select
            value={filterMonth}
            onChange={e => setFilterMonth(e.target.value)}
            className="border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All Months</option>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select
            value={filterYear}
            onChange={e => setFilterYear(e.target.value)}
            className="border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All Years</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All Types</option>
            {INCENTIVE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="paid">Paid</option>
          </select>
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {filtered.length} record{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* ── Table ── */}
        {loading ? (
          <div className="flex items-center justify-center h-48 bg-card border border-border rounded-xl shadow-sm">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-16 text-center shadow-sm">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-muted rounded-full mb-4">
              <Gift className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground font-medium">No incentive records found</p>
            <p className="text-muted-foreground text-sm mt-1">Add an incentive to get started</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-muted border-b border-border">
                    {["Employee","Period","Type","Amount","Reason","Status","Actions"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map(row => (
                    <tr key={row.id} className="hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-foreground text-sm">{row.employeeName}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{row.employeeCode} · {row.department}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap">
                        {MONTHS[row.month - 1]?.slice(0, 3)} {row.year}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <TypeBadge type={row.type} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm font-semibold text-primary">{fmt(row.amount)}</span>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <span className="text-sm text-foreground line-clamp-1">{row.reason || <span className="text-muted-foreground">—</span>}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={row.status} />
                          {row.status === "pending" && (
                            <button
                              onClick={() => handleStatusChange(row, "approved")}
                              className="text-xs text-primary font-medium px-2 py-1 rounded hover:bg-primary/10 transition-colors"
                            >
                              Approve
                            </button>
                          )}
                          {row.status === "approved" && (
                            <button
                              onClick={() => handleStatusChange(row, "paid")}
                              className="text-xs text-blue-600 font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                            >
                              Mark Paid
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEdit(row)}
                            className="text-xs text-primary font-medium px-2 py-1 rounded hover:bg-primary/10 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setConfirmDelete(row)}
                            className="text-xs text-muted-foreground hover:text-foreground font-medium px-2 py-1 rounded hover:bg-muted transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ─── Add / Edit Modal ─── */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 bg-foreground/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-card rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-border"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 rounded-t-2xl flex items-center justify-between z-10">
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  {editRow ? "Edit Incentive" : "New Incentive"}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {editRow ? "Update incentive details" : "Record a bonus or incentive payment"}
                </p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-muted transition-colors">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Employee Picker — new only */}
              {!editRow && (
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

              {/* Edit: show employee info */}
              {editRow && (
                <div className="bg-muted rounded-xl p-4 border border-border">
                  <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide mb-1">Employee</p>
                  <p className="font-semibold text-foreground">{editRow.employeeName}</p>
                  <p className="text-sm text-muted-foreground">{editRow.employeeCode} · {editRow.department}</p>
                </div>
              )}

              {/* Month & Year */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">
                    Month <span className="text-primary">*</span>
                  </label>
                  <select
                    value={form.month}
                    onChange={e => setForm(f => ({ ...f, month: e.target.value }))}
                    className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">
                    Year <span className="text-primary">*</span>
                  </label>
                  <select
                    value={form.year}
                    onChange={e => setForm(f => ({ ...f, year: e.target.value }))}
                    className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Incentive Type <span className="text-primary">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {INCENTIVE_TYPES.map(t => (
                    <label
                      key={t.value}
                      className={`flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all text-sm font-medium ${
                        form.type === t.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-muted-foreground/30 hover:bg-muted/60 text-foreground"
                      }`}
                    >
                      <input
                        type="radio"
                        name="incType"
                        value={t.value}
                        checked={form.type === t.value}
                        onChange={() => setForm(f => ({ ...f, type: t.value as IncentiveType }))}
                        className="sr-only"
                      />
                      {t.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">
                  Amount (Rs.) <span className="text-primary">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                />
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Reason</label>
                <input
                  type="text"
                  placeholder="e.g. Excellent performance in Q1 2026"
                  value={form.reason}
                  onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Status</label>
                <select
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value as IncentiveStatus }))}
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="paid">Paid</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Notes</label>
                <textarea
                  rows={2}
                  placeholder="Additional notes..."
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground resize-none"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-card border-t border-border px-6 py-4 rounded-b-2xl flex items-center justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium text-foreground border border-border rounded-xl hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.employeeId || !form.amount}
                className="px-5 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity shadow-sm"
              >
                {saving ? "Saving..." : editRow ? "Update Incentive" : "Add Incentive"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Delete Confirm Modal ─── */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 bg-foreground/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="bg-card rounded-2xl shadow-2xl w-full max-w-sm border border-border"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Delete Incentive</h3>
                  <p className="text-xs text-muted-foreground">This action cannot be undone</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                Delete the{" "}
                <span className="font-semibold text-foreground">
                  {INCENTIVE_TYPES.find(t => t.value === confirmDelete.type)?.label}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-foreground">{fmt(confirmDelete.amount)}</span>{" "}
                for{" "}
                <span className="font-semibold text-foreground">{confirmDelete.employeeName}</span>?
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="px-4 py-2 text-sm font-medium text-foreground border border-border rounded-xl hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(confirmDelete)}
                  className="px-4 py-2 text-sm font-semibold bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
