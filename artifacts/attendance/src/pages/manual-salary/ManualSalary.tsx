import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Calculator, Plus, Search, Pencil, Trash2, CheckCircle2, Clock,
  FileText, X, TrendingUp, ChevronDown, AlertCircle, DollarSign,
  UserRound, Banknote, RefreshCw, Lock, Unlock, Building2, Loader2,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
function api(path: string) { return `${BASE}/api/${path}`; }

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

type Status = "draft" | "finalized" | "paid";

interface Employee {
  id: number;
  employeeId: string;
  fullName: string;
  designation: string;
  department: string;
  branchId: number;
}

interface SalaryRow {
  id: number;
  month: number;
  year: number;
  presentDays: number;
  absentDays: number;
  otHours: number;
  otAmount: number;
  basicSalary: number;
  transportAllowance: number;
  lunchAllowance: number;
  housingAllowance: number;
  otherAllowances: number;
  epfDeduction: number;
  loanDeduction: number;
  absenceDeduction: number;
  otherDeductions: number;
  grossSalary: number;
  netSalary: number;
  status: Status;
  notes: string | null;
  createdAt: string;
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  designation: string;
  department: string;
}

interface AttendanceSummary {
  presentDays: number;
  absentDays: number;
  otHours: number;
}

interface SalaryStructureData {
  structureId: number;
  structureName: string;
  basicAmount: number;
  transportAllowance: number;
  lunchAllowance: number;
  housingAllowance: number;
  otherAllowances: number;
}

const now = new Date();
const EMPTY_FORM = {
  employeeId: "",
  month: String(now.getMonth() + 1),
  year: String(now.getFullYear()),
  presentDays: "",
  absentDays: "",
  otHours: "",
  otAmount: "",
  basicSalary: "",
  transportAllowance: "",
  lunchAllowance: "",
  housingAllowance: "",
  otherAllowances: "",
  epfDeduction: "",
  loanDeduction: "",
  absenceDeduction: "",
  otherDeductions: "",
  status: "draft" as Status,
  notes: "",
};

function fmt(n: number) {
  return "Rs. " + n.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function StatusBadge({ status }: { status: Status }) {
  const cfg: Record<Status, string> = {
    draft:     "bg-gray-100 text-gray-600 border border-gray-200",
    finalized: "bg-blue-100 text-blue-700 border border-blue-200",
    paid:      "bg-green-100 text-green-700 border border-green-200",
  };
  const labels: Record<Status, string> = { draft: "Draft", finalized: "Finalized", paid: "Paid" };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${cfg[status]}`}>
      {status === "paid"      && <CheckCircle2 size={10} />}
      {status === "finalized" && <FileText size={10} />}
      {status === "draft"     && <Clock size={10} />}
      {labels[status]}
    </span>
  );
}

function SectionHeader({ icon, label, badge }: { icon: React.ReactNode; label: string; badge?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-2.5 pb-1.5 border-b border-green-100">
      <span className="text-green-600">{icon}</span>
      <span className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide">{label}</span>
      {badge}
    </div>
  );
}

function AutoBadge({ label }: { label: string }) {
  return (
    <span className="ml-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium bg-green-100 text-green-700 border border-green-200">
      <RefreshCw size={8} /> {label}
    </span>
  );
}

function OverrideBadge() {
  return (
    <span className="ml-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium bg-amber-100 text-amber-700 border border-amber-200">
      <Unlock size={8} /> Override
    </span>
  );
}

function NumField({
  label, name, value, onChange, prefix = "Rs.", locked, readOnlyValue, onUnlock, loading,
}: {
  label: string; name: string; value: string; onChange: (n: string, v: string) => void;
  prefix?: string; locked?: boolean; readOnlyValue?: string | number; onUnlock?: () => void; loading?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-0.5">
        <label className="text-[10px] font-medium text-gray-500">{label}</label>
        {locked && onUnlock && (
          <button
            type="button"
            onClick={onUnlock}
            title="Override value"
            className="p-0.5 rounded hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition-colors"
          >
            <Lock size={9} />
          </button>
        )}
      </div>
      <div className={`flex items-center border rounded overflow-hidden focus-within:ring-1 focus-within:ring-green-500 ${locked ? "bg-gray-50" : "bg-white"}`}>
        <span className="px-1.5 bg-gray-50 text-[10px] text-gray-400 border-r">{prefix}</span>
        {locked ? (
          <span className="flex-1 text-xs px-2 py-1.5 text-gray-500 flex items-center gap-1">
            {loading ? <Loader2 size={10} className="animate-spin" /> : (readOnlyValue ?? "—")}
          </span>
        ) : (
          <input
            type="number"
            min="0"
            step="0.01"
            value={value}
            onChange={e => onChange(name, e.target.value)}
            className="flex-1 text-xs px-2 py-1.5 outline-none bg-white"
            placeholder="0.00"
          />
        )}
      </div>
    </div>
  );
}

export default function ManualSalary() {
  const [rows, setRows]         = useState<SalaryRow[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const [filterMonth,  setFilterMonth]  = useState(String(now.getMonth() + 1));
  const [filterYear,   setFilterYear]   = useState(String(now.getFullYear()));
  const [filterStatus, setFilterStatus] = useState("");
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId]       = useState<number | null>(null);
  const [form, setForm]           = useState({ ...EMPTY_FORM });
  const [deleteId, setDeleteId]   = useState<number | null>(null);

  // Auto-fetch states
  const [attSummary,      setAttSummary]      = useState<AttendanceSummary | null>(null);
  const [attLoading,      setAttLoading]      = useState(false);
  const [attOverride,     setAttOverride]     = useState(false);

  const [structData,      setStructData]      = useState<SalaryStructureData | null>(null);
  const [structLoading,   setStructLoading]   = useState(false);
  const [structOverride,  setStructOverride]  = useState(false);

  const token = localStorage.getItem("auth_token") ?? "";
  const headers = useMemo(() => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  }), [token]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterMonth)  params.set("month",  filterMonth);
      if (filterYear)   params.set("year",   filterYear);
      if (filterStatus) params.set("status", filterStatus);
      const r = await fetch(`${api("manual-salary")}?${params}`, { headers });
      if (!r.ok) throw new Error("Failed");
      setRows(await r.json());
    } catch { setError("Failed to load entries"); }
    finally  { setLoading(false); }
  }, [filterMonth, filterYear, filterStatus, headers]);

  const loadEmployees = useCallback(async () => {
    const r = await fetch(`${api("employees")}?limit=500`, { headers });
    if (r.ok) {
      const data = await r.json();
      setEmployees(Array.isArray(data) ? data : (data.employees ?? []));
    }
  }, [headers]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadEmployees(); }, [loadEmployees]);

  // Auto-fetch attendance when employee + month + year change
  const attFetchRef = useRef(0);
  useEffect(() => {
    if (!form.employeeId || !form.month || !form.year) {
      setAttSummary(null);
      return;
    }
    const id = ++attFetchRef.current;
    setAttLoading(true);
    setAttSummary(null);
    const params = new URLSearchParams({
      employeeId: form.employeeId,
      month: form.month,
      year: form.year,
    });
    fetch(`${api("manual-salary/attendance-lookup")}?${params}`, { headers })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (id !== attFetchRef.current) return;
        if (data) {
          setAttSummary(data);
          if (!attOverride) {
            setForm(f => ({
              ...f,
              presentDays: String(data.presentDays),
              absentDays:  String(data.absentDays),
              otHours:     String(data.otHours),
            }));
          }
        }
      })
      .catch(() => {})
      .finally(() => { if (id === attFetchRef.current) setAttLoading(false); });
  }, [form.employeeId, form.month, form.year, headers]);

  // Auto-fetch salary structure when employee changes
  const structFetchRef = useRef(0);
  useEffect(() => {
    if (!form.employeeId) {
      setStructData(null);
      return;
    }
    const id = ++structFetchRef.current;
    setStructLoading(true);
    setStructData(null);
    fetch(`${api(`salary-structures/assignment/${form.employeeId}`)}`, { headers })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (id !== structFetchRef.current) return;
        if (data && !data.error) {
          setStructData(data);
          if (!structOverride) {
            setForm(f => ({
              ...f,
              basicSalary:        String(data.basicAmount),
              transportAllowance: String(data.transportAllowance),
              lunchAllowance:     String(data.lunchAllowance),
              housingAllowance:   String(data.housingAllowance),
              otherAllowances:    String(data.otherAllowances),
            }));
          }
        }
      })
      .catch(() => {})
      .finally(() => { if (id === structFetchRef.current) setStructLoading(false); });
  }, [form.employeeId, headers]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(r =>
      r.employeeName.toLowerCase().includes(q) ||
      r.employeeCode.toLowerCase().includes(q) ||
      r.department.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const summary = useMemo(() => ({
    total:     rows.length,
    draft:     rows.filter(r => r.status === "draft").length,
    finalized: rows.filter(r => r.status === "finalized").length,
    paid:      rows.filter(r => r.status === "paid").length,
    totalNet:  rows.reduce((s, r) => s + r.netSalary, 0),
  }), [rows]);

  function openAdd() {
    setEditId(null);
    setForm({ ...EMPTY_FORM });
    setAttSummary(null);
    setStructData(null);
    setAttOverride(false);
    setStructOverride(false);
    setModalOpen(true);
  }

  function openEdit(row: SalaryRow) {
    setEditId(row.id);
    setAttOverride(true);
    setStructOverride(true);
    setForm({
      employeeId:         String(row.employeeId),
      month:              String(row.month),
      year:               String(row.year),
      presentDays:        String(row.presentDays),
      absentDays:         String(row.absentDays),
      otHours:            String(row.otHours),
      otAmount:           String(row.otAmount),
      basicSalary:        String(row.basicSalary),
      transportAllowance: String(row.transportAllowance),
      lunchAllowance:     String(row.lunchAllowance),
      housingAllowance:   String(row.housingAllowance),
      otherAllowances:    String(row.otherAllowances),
      epfDeduction:       String(row.epfDeduction),
      loanDeduction:      String(row.loanDeduction),
      absenceDeduction:   String(row.absenceDeduction),
      otherDeductions:    String(row.otherDeductions),
      status:             row.status,
      notes:              row.notes ?? "",
    });
    setModalOpen(true);
  }

  function setField(name: string, value: string) {
    setForm(f => ({ ...f, [name]: value }));
  }

  function unlockAtt() {
    setAttOverride(true);
  }

  function unlockStruct() {
    setStructOverride(true);
  }

  function refetchAtt() {
    if (!attSummary) return;
    setForm(f => ({
      ...f,
      presentDays: String(attSummary.presentDays),
      absentDays:  String(attSummary.absentDays),
      otHours:     String(attSummary.otHours),
    }));
    setAttOverride(false);
  }

  function refetchStruct() {
    if (!structData) return;
    setForm(f => ({
      ...f,
      basicSalary:        String(structData.basicAmount),
      transportAllowance: String(structData.transportAllowance),
      lunchAllowance:     String(structData.lunchAllowance),
      housingAllowance:   String(structData.housingAllowance),
      otherAllowances:    String(structData.otherAllowances),
    }));
    setStructOverride(false);
  }

  const gross = useMemo(() =>
    Number(form.basicSalary || 0) +
    Number(form.transportAllowance || 0) +
    Number(form.lunchAllowance || 0) +
    Number(form.housingAllowance || 0) +
    Number(form.otherAllowances || 0) +
    Number(form.otAmount || 0),
  [form]);

  const totalDed = useMemo(() =>
    Number(form.epfDeduction || 0) +
    Number(form.loanDeduction || 0) +
    Number(form.absenceDeduction || 0) +
    Number(form.otherDeductions || 0),
  [form]);

  const net = gross - totalDed;

  async function handleSave() {
    if (!form.employeeId || !form.month || !form.year) {
      setError("Employee, month and year are required.");
      return;
    }
    setSaving(true);
    try {
      const url    = editId ? api(`manual-salary/${editId}`) : api("manual-salary");
      const method = editId ? "PUT" : "POST";
      const r = await fetch(url, { method, headers, body: JSON.stringify(form) });
      if (!r.ok) throw new Error("Failed to save");
      setModalOpen(false);
      await load();
    } catch { setError("Failed to save entry"); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await fetch(api(`manual-salary/${deleteId}`), { method: "DELETE", headers });
      setDeleteId(null);
      await load();
    } catch { setError("Failed to delete"); }
  }

  async function handleStatus(id: number, status: Status) {
    try {
      await fetch(api(`manual-salary/${id}/status`), {
        method: "PATCH", headers, body: JSON.stringify({ status }),
      });
      await load();
    } catch { setError("Failed to update status"); }
  }

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  return (
    <div className="p-4 space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-green-100 rounded">
            <Calculator size={16} className="text-green-600" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-gray-800">Manual Salary</h1>
            <p className="text-[10px] text-gray-500">Manage employee salary entries with attendance auto-fill</p>
          </div>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
        >
          <Plus size={13} /> Add Entry
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          <AlertCircle size={13} /> {error}
          <button onClick={() => setError(null)} className="ml-auto"><X size={12} /></button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Entries", value: summary.total,     color: "text-gray-700",  bg: "bg-gray-50 border-gray-200" },
          { label: "Draft",         value: summary.draft,     color: "text-gray-500",  bg: "bg-gray-50 border-gray-200" },
          { label: "Finalized",     value: summary.finalized, color: "text-blue-600",  bg: "bg-blue-50 border-blue-200" },
          { label: "Paid",          value: summary.paid,      color: "text-green-600", bg: "bg-green-50 border-green-200" },
        ].map(c => (
          <div key={c.label} className={`rounded border p-3 ${c.bg}`}>
            <p className="text-[10px] text-gray-500">{c.label}</p>
            <p className={`text-lg font-bold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>
      <div className="rounded border bg-green-50 border-green-200 p-3 flex items-center gap-2">
        <Banknote size={14} className="text-green-600" />
        <span className="text-[11px] text-green-700 font-medium">
          Total Net Salary ({MONTHS[Number(filterMonth) - 1]} {filterYear}):
        </span>
        <span className="text-sm font-bold text-green-700 ml-auto">{fmt(summary.totalNet)}</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
          className="text-xs border rounded px-2 py-1.5 bg-white focus:ring-1 focus:ring-green-400 outline-none">
          {MONTHS.map((m, i) => <option key={m} value={String(i + 1)}>{m}</option>)}
        </select>
        <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
          className="text-xs border rounded px-2 py-1.5 bg-white focus:ring-1 focus:ring-green-400 outline-none">
          {years.map(y => <option key={y} value={String(y)}>{y}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="text-xs border rounded px-2 py-1.5 bg-white focus:ring-1 focus:ring-green-400 outline-none">
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="finalized">Finalized</option>
          <option value="paid">Paid</option>
        </select>
        <div className="flex items-center gap-1.5 border rounded px-2 py-1.5 bg-white flex-1 min-w-[180px] focus-within:ring-1 focus-within:ring-green-400">
          <Search size={12} className="text-gray-400" />
          <input
            type="text"
            placeholder="Search employee…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="text-xs outline-none flex-1"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border rounded overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-xs text-gray-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-400">
            No entries found. Click "Add Entry" to create one.
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-3 py-2 font-medium text-gray-500">Employee</th>
                <th className="text-left px-3 py-2 font-medium text-gray-500">Month/Year</th>
                <th className="text-right px-3 py-2 font-medium text-gray-500">Present</th>
                <th className="text-right px-3 py-2 font-medium text-gray-500">OT Hrs</th>
                <th className="text-right px-3 py-2 font-medium text-gray-500">Basic</th>
                <th className="text-right px-3 py-2 font-medium text-gray-500">Allowances</th>
                <th className="text-right px-3 py-2 font-medium text-gray-500">Deductions</th>
                <th className="text-right px-3 py-2 font-medium text-gray-500 text-green-700">Net Salary</th>
                <th className="text-center px-3 py-2 font-medium text-gray-500">Status</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(row => {
                const allowTotal = row.transportAllowance + row.lunchAllowance + row.housingAllowance + row.otherAllowances;
                const dedTotal   = row.epfDeduction + row.loanDeduction + row.absenceDeduction + row.otherDeductions;
                return (
                  <tr key={row.id} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <div className="font-medium text-gray-800">{row.employeeName}</div>
                      <div className="text-[10px] text-gray-400">{row.employeeCode} · {row.department}</div>
                    </td>
                    <td className="px-3 py-2 text-gray-600">{MONTHS[row.month - 1]} {row.year}</td>
                    <td className="px-3 py-2 text-right text-gray-700">{row.presentDays}</td>
                    <td className="px-3 py-2 text-right text-gray-700">{row.otHours}</td>
                    <td className="px-3 py-2 text-right text-gray-700">{fmt(row.basicSalary)}</td>
                    <td className="px-3 py-2 text-right text-blue-600">{fmt(allowTotal)}</td>
                    <td className="px-3 py-2 text-right text-red-500">{fmt(dedTotal)}</td>
                    <td className="px-3 py-2 text-right font-semibold text-green-700">{fmt(row.netSalary)}</td>
                    <td className="px-3 py-2 text-center"><StatusBadge status={row.status} /></td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1 justify-end">
                        {row.status === "draft" && (
                          <button onClick={() => handleStatus(row.id, "finalized")} title="Mark Finalized"
                            className="p-1 rounded hover:bg-blue-50 text-blue-500">
                            <FileText size={12} />
                          </button>
                        )}
                        {row.status === "finalized" && (
                          <button onClick={() => handleStatus(row.id, "paid")} title="Mark Paid"
                            className="p-1 rounded hover:bg-green-50 text-green-600">
                            <CheckCircle2 size={12} />
                          </button>
                        )}
                        <button onClick={() => openEdit(row)}
                          className="p-1 rounded hover:bg-gray-100 text-gray-500">
                          <Pencil size={12} />
                        </button>
                        <button onClick={() => setDeleteId(row.id)}
                          className="p-1 rounded hover:bg-red-50 text-red-400">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl my-4">

            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-green-600 rounded-t-lg">
              <div className="flex items-center gap-2">
                <Calculator size={15} className="text-white" />
                <h2 className="text-sm font-semibold text-white">
                  {editId ? "Edit Salary Entry" : "New Manual Salary Entry"}
                </h2>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-green-200 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <div className="p-4 space-y-4">

              {/* Employee & Period */}
              <div>
                <SectionHeader icon={<UserRound size={13} />} label="Employee & Period" />
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-3 sm:col-span-1">
                    <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Employee *</label>
                    <select
                      value={form.employeeId}
                      onChange={e => setField("employeeId", e.target.value)}
                      disabled={!!editId}
                      className="w-full text-xs border rounded px-2 py-1.5 bg-white disabled:bg-gray-50 focus:ring-1 focus:ring-green-400 outline-none"
                    >
                      <option value="">Select employee…</option>
                      {employees.map(e => (
                        <option key={e.id} value={String(e.id)}>
                          {e.fullName} ({e.employeeId})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Month *</label>
                    <select value={form.month} onChange={e => setField("month", e.target.value)}
                      className="w-full text-xs border rounded px-2 py-1.5 bg-white focus:ring-1 focus:ring-green-400 outline-none">
                      {MONTHS.map((m, i) => <option key={m} value={String(i + 1)}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Year *</label>
                    <select value={form.year} onChange={e => setField("year", e.target.value)}
                      className="w-full text-xs border rounded px-2 py-1.5 bg-white focus:ring-1 focus:ring-green-400 outline-none">
                      {years.map(y => <option key={y} value={String(y)}>{y}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Attendance Section */}
              <div>
                <SectionHeader
                  icon={<UserRound size={13} />}
                  label="Attendance"
                  badge={
                    <div className="ml-auto flex items-center gap-1.5">
                      {attLoading && <Loader2 size={10} className="animate-spin text-green-500" />}
                      {attSummary && !attOverride && <AutoBadge label="From Attendance" />}
                      {attSummary && attOverride  && (
                        <>
                          <OverrideBadge />
                          <button
                            type="button"
                            onClick={refetchAtt}
                            className="flex items-center gap-0.5 text-[9px] text-green-600 hover:underline"
                          >
                            <RefreshCw size={8} /> Reset
                          </button>
                        </>
                      )}
                      {!attSummary && !attLoading && form.employeeId && (
                        <span className="text-[9px] text-gray-400">No attendance data found</span>
                      )}
                    </div>
                  }
                />

                {attSummary && !attOverride ? (
                  /* Locked auto-filled attendance */
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: "Present Days", value: attSummary.presentDays, prefix: "Days" },
                      { label: "Absent Days",  value: attSummary.absentDays,  prefix: "Days" },
                      { label: "OT Hours",     value: attSummary.otHours,     prefix: "Hrs"  },
                    ].map(({ label, value, prefix }) => (
                      <div key={label}>
                        <div className="flex items-center justify-between mb-0.5">
                          <label className="text-[10px] font-medium text-gray-500">{label}</label>
                          <button
                            type="button"
                            onClick={unlockAtt}
                            title="Override value"
                            className="p-0.5 rounded hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition-colors"
                          >
                            <Lock size={9} />
                          </button>
                        </div>
                        <div className="flex items-center border rounded overflow-hidden bg-gray-50">
                          <span className="px-1.5 bg-gray-100 text-[10px] text-gray-400 border-r">{prefix}</span>
                          <span className="flex-1 text-xs px-2 py-1.5 text-gray-600 font-medium">{value}</span>
                        </div>
                      </div>
                    ))}
                    {/* OT Amount is always editable */}
                    <div>
                      <label className="block text-[10px] font-medium text-gray-500 mb-0.5">OT Amount</label>
                      <div className="flex items-center border rounded overflow-hidden bg-white focus-within:ring-1 focus-within:ring-green-500">
                        <span className="px-1.5 bg-gray-50 text-[10px] text-gray-400 border-r">Rs.</span>
                        <input type="number" min="0" step="0.01" value={form.otAmount}
                          onChange={e => setField("otAmount", e.target.value)}
                          className="flex-1 text-xs px-2 py-1.5 outline-none bg-white" placeholder="0.00" />
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Unlocked manual attendance */
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <NumField label="Present Days" name="presentDays" value={form.presentDays} onChange={setField} prefix="Days" />
                    <NumField label="Absent Days"  name="absentDays"  value={form.absentDays}  onChange={setField} prefix="Days" />
                    <NumField label="OT Hours"     name="otHours"     value={form.otHours}      onChange={setField} prefix="Hrs"  />
                    <NumField label="OT Amount"    name="otAmount"    value={form.otAmount}      onChange={setField} />
                  </div>
                )}
              </div>

              {/* Salary Components */}
              <div>
                <SectionHeader
                  icon={<DollarSign size={13} />}
                  label="Salary Components"
                  badge={
                    <div className="ml-auto flex items-center gap-1.5">
                      {structLoading && <Loader2 size={10} className="animate-spin text-green-500" />}
                      {structData && !structOverride && (
                        <AutoBadge label={structData.structureName} />
                      )}
                      {structData && structOverride && (
                        <>
                          <OverrideBadge />
                          <button
                            type="button"
                            onClick={refetchStruct}
                            className="flex items-center gap-0.5 text-[9px] text-green-600 hover:underline"
                          >
                            <RefreshCw size={8} /> Reset
                          </button>
                        </>
                      )}
                      {!structData && !structLoading && form.employeeId && (
                        <span className="text-[9px] text-gray-400">No salary structure assigned</span>
                      )}
                    </div>
                  }
                />

                {structData && !structOverride ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { label: "Basic Salary",        value: structData.basicAmount,        prefix: "Rs." },
                      { label: "Transport Allowance", value: structData.transportAllowance, prefix: "Rs." },
                      { label: "Lunch Allowance",     value: structData.lunchAllowance,     prefix: "Rs." },
                      { label: "Housing Allowance",   value: structData.housingAllowance,   prefix: "Rs." },
                      { label: "Other Allowances",    value: structData.otherAllowances,    prefix: "Rs." },
                    ].map(({ label, value, prefix }) => (
                      <div key={label}>
                        <div className="flex items-center justify-between mb-0.5">
                          <label className="text-[10px] font-medium text-gray-500">{label}</label>
                          <button
                            type="button"
                            onClick={unlockStruct}
                            title="Override value"
                            className="p-0.5 rounded hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition-colors"
                          >
                            <Lock size={9} />
                          </button>
                        </div>
                        <div className="flex items-center border rounded overflow-hidden bg-gray-50">
                          <span className="px-1.5 bg-gray-100 text-[10px] text-gray-400 border-r">{prefix}</span>
                          <span className="flex-1 text-xs px-2 py-1.5 text-gray-600 font-medium">
                            {value.toLocaleString("en-LK", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <NumField label="Basic Salary"         name="basicSalary"        value={form.basicSalary}        onChange={setField} />
                    <NumField label="Transport Allowance"  name="transportAllowance" value={form.transportAllowance} onChange={setField} />
                    <NumField label="Lunch Allowance"      name="lunchAllowance"     value={form.lunchAllowance}     onChange={setField} />
                    <NumField label="Housing Allowance"    name="housingAllowance"   value={form.housingAllowance}   onChange={setField} />
                    <NumField label="Other Allowances"     name="otherAllowances"    value={form.otherAllowances}    onChange={setField} />
                  </div>
                )}
              </div>

              {/* Deductions */}
              <div>
                <SectionHeader icon={<TrendingUp size={13} className="rotate-180" />} label="Deductions" />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <NumField label="EPF (Employee)"    name="epfDeduction"     value={form.epfDeduction}     onChange={setField} />
                  <NumField label="Loan Deduction"    name="loanDeduction"    value={form.loanDeduction}    onChange={setField} />
                  <NumField label="Absence Deduction" name="absenceDeduction" value={form.absenceDeduction} onChange={setField} />
                  <NumField label="Other Deductions"  name="otherDeductions"  value={form.otherDeductions}  onChange={setField} />
                </div>
              </div>

              {/* Net Salary Summary */}
              <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-[10px] text-gray-500 mb-0.5">Gross Salary</p>
                    <p className="text-xs font-semibold text-gray-700">{fmt(gross)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 mb-0.5">Total Deductions</p>
                    <p className="text-xs font-semibold text-red-500">{fmt(totalDed)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-green-700 font-medium mb-0.5">Net Salary</p>
                    <p className="text-sm font-bold text-green-700">{fmt(net)}</p>
                  </div>
                </div>
              </div>

              {/* Status & Notes */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Status</label>
                  <select value={form.status} onChange={e => setField("status", e.target.value)}
                    className="w-full text-xs border rounded px-2 py-1.5 bg-white focus:ring-1 focus:ring-green-400 outline-none">
                    <option value="draft">Draft</option>
                    <option value="finalized">Finalized</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Notes</label>
                  <input type="text" value={form.notes} onChange={e => setField("notes", e.target.value)}
                    placeholder="Optional notes…"
                    className="w-full text-xs border rounded px-2 py-1.5 focus:ring-1 focus:ring-green-400 outline-none" />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-2 px-4 py-3 border-t bg-gray-50 rounded-b-lg">
              <button onClick={() => setModalOpen(false)}
                className="px-3 py-1.5 text-xs border rounded text-gray-600 hover:bg-gray-100 transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="px-4 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 transition-colors">
                {saving ? "Saving…" : editId ? "Update Entry" : "Save Entry"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl p-5 w-full max-w-xs">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle size={16} className="text-red-500" />
              <h3 className="text-sm font-semibold text-gray-800">Delete Entry?</h3>
            </div>
            <p className="text-xs text-gray-500 mb-4">This will permanently delete this manual salary entry.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteId(null)}
                className="px-3 py-1.5 text-xs border rounded text-gray-600 hover:bg-gray-100">
                Cancel
              </button>
              <button onClick={handleDelete}
                className="px-3 py-1.5 text-xs bg-red-500 text-white rounded hover:bg-red-600">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
