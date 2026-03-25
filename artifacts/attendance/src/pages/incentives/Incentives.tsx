import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Gift, Plus, Search, Pencil, Trash2, CheckCircle2, Clock, Banknote,
  ChevronDown, X, Filter, TrendingUp, Users, DollarSign,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
function getApiUrl(path: string) { return `${BASE}/api/${path}`; }

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const INCENTIVE_TYPES = [
  { value: "performance", label: "Performance Bonus",  color: "bg-purple-100 text-purple-800" },
  { value: "attendance",  label: "Attendance Bonus",   color: "bg-blue-100 text-blue-800"   },
  { value: "festival",    label: "Festival Bonus",     color: "bg-orange-100 text-orange-800"},
  { value: "lunch",       label: "Lunch Incentive",    color: "bg-yellow-100 text-yellow-800"},
  { value: "other",       label: "Other",              color: "bg-gray-100 text-gray-800"   },
] as const;

const STATUS_CONFIG = {
  pending:  { label: "Pending",  color: "bg-yellow-100 text-yellow-800", icon: Clock        },
  approved: { label: "Approved", color: "bg-green-100 text-green-800",   icon: CheckCircle2 },
  paid:     { label: "Paid",     color: "bg-blue-100 text-blue-800",     icon: Banknote     },
} as const;

type IncentiveType = "performance" | "attendance" | "festival" | "lunch" | "other";
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
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function StatusBadge({ status }: { status: IncentiveStatus }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${cfg.color}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

export default function Incentives() {
  const [rows, setRows]         = useState<IncentiveRow[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [summary, setSummary]   = useState<Summary | null>(null);
  const [loading, setLoading]   = useState(true);

  const [showModal, setShowModal]   = useState(false);
  const [editRow, setEditRow]       = useState<IncentiveRow | null>(null);
  const [form, setForm]             = useState({ ...EMPTY_FORM });
  const [saving, setSaving]         = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<IncentiveRow | null>(null);

  const [filterMonth,  setFilterMonth]  = useState("");
  const [filterYear,   setFilterYear]   = useState(String(now.getFullYear()));
  const [filterType,   setFilterType]   = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [search, setSearch]             = useState("");

  const [empSearch, setEmpSearch]   = useState("");
  const [showEmpDrop, setShowEmpDrop] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterMonth)  params.set("month",  filterMonth);
      if (filterYear)   params.set("year",   filterYear);
      if (filterType)   params.set("type",   filterType);
      if (filterStatus) params.set("status", filterStatus);

      const sumParams = new URLSearchParams();
      if (filterMonth) sumParams.set("month", filterMonth);
      if (filterYear)  sumParams.set("year",  filterYear);

      const [incRes, empsRes, sumRes] = await Promise.all([
        fetch(getApiUrl(`incentives?${params}`)),
        fetch(getApiUrl("employees?status=active")),
        fetch(getApiUrl(`incentives/summary?${sumParams}`)),
      ]);
      const [inc, emps, sum] = await Promise.all([
        incRes.json(), empsRes.json(), sumRes.json(),
      ]);
      setRows(Array.isArray(inc) ? inc : []);
      setEmployees(Array.isArray(emps) ? emps : []);
      setSummary(sum);
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
      r.employeeName.toLowerCase().includes(q) ||
      r.employeeCode.toLowerCase().includes(q) ||
      r.designation?.toLowerCase().includes(q) ||
      r.department?.toLowerCase().includes(q) ||
      r.reason?.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const empOptions = useMemo(() => {
    if (!empSearch.trim()) return employees.slice(0, 20);
    const q = empSearch.toLowerCase();
    return employees.filter(e =>
      e.fullName.toLowerCase().includes(q) ||
      e.employeeId.toLowerCase().includes(q) ||
      e.designation?.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [employees, empSearch]);

  function openAdd() {
    setEditRow(null);
    setForm({ ...EMPTY_FORM });
    setEmpSearch("");
    setShowModal(true);
  }

  function openEdit(row: IncentiveRow) {
    setEditRow(row);
    const emp = employees.find(e => e.id === row.employeeId);
    setEmpSearch(emp ? `${emp.fullName} (${emp.employeeId})` : "");
    setForm({
      employeeId: String(row.employeeId),
      month: String(row.month),
      year:  String(row.year),
      type:  row.type,
      amount: String(row.amount),
      reason: row.reason || "",
      status: row.status,
      notes: row.notes || "",
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.employeeId || !form.amount) return;
    setSaving(true);
    try {
      const body = {
        employeeId: Number(form.employeeId),
        month: Number(form.month),
        year:  Number(form.year),
        type:  form.type,
        amount: Number(form.amount),
        reason: form.reason || null,
        status: form.status,
        notes:  form.notes || null,
      };
      const url    = editRow ? getApiUrl(`incentives/${editRow.id}`) : getApiUrl("incentives");
      const method = editRow ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
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
    try {
      await fetch(getApiUrl(`incentives/${row.id}`), { method: "DELETE" });
      setConfirmDelete(null);
      await fetchAll();
    } catch (e) {
      console.error(e);
    }
  }

  async function handleStatusChange(row: IncentiveRow, status: IncentiveStatus) {
    try {
      await fetch(getApiUrl(`incentives/${row.id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      await fetchAll();
    } catch (e) {
      console.error(e);
    }
  }

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gift className="w-5 h-5 text-green-600" />
          <h1 className="text-base font-semibold text-gray-900">Incentives</h1>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
            {filtered.length} record{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium px-3 py-1.5 rounded"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Incentive
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-lg border p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 bg-green-50 rounded">
                <TrendingUp className="w-3.5 h-3.5 text-green-600" />
              </div>
              <span className="text-xs text-gray-500">Total Incentives</span>
            </div>
            <p className="text-sm font-semibold text-gray-900">{fmt(summary.totalAmount)}</p>
            <p className="text-xs text-gray-500">{summary.totalCount} records</p>
          </div>
          <div className="bg-white rounded-lg border p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 bg-yellow-50 rounded">
                <Clock className="w-3.5 h-3.5 text-yellow-600" />
              </div>
              <span className="text-xs text-gray-500">Pending</span>
            </div>
            <p className="text-sm font-semibold text-gray-900">{fmt(summary.pendingAmount)}</p>
            <p className="text-xs text-gray-500">{summary.pendingCount} records</p>
          </div>
          <div className="bg-white rounded-lg border p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 bg-green-50 rounded">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
              </div>
              <span className="text-xs text-gray-500">Approved</span>
            </div>
            <p className="text-sm font-semibold text-gray-900">{fmt(summary.approvedAmount)}</p>
            <p className="text-xs text-gray-500">{summary.approvedCount} records</p>
          </div>
          <div className="bg-white rounded-lg border p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 bg-blue-50 rounded">
                <Banknote className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <span className="text-xs text-gray-500">Paid</span>
            </div>
            <p className="text-sm font-semibold text-gray-900">{fmt(summary.paidAmount)}</p>
            <p className="text-xs text-gray-500">{summary.paidCount} records</p>
          </div>
        </div>
      )}

      {/* Type Breakdown */}
      {summary && Object.keys(summary.byType).length > 0 && (
        <div className="bg-white rounded-lg border p-3">
          <p className="text-xs font-medium text-gray-700 mb-2">Breakdown by Type</p>
          <div className="flex flex-wrap gap-3">
            {INCENTIVE_TYPES.filter(t => summary.byType[t.value]).map(t => (
              <div key={t.value} className="flex items-center gap-2">
                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${t.color}`}>{t.label}</span>
                <span className="text-xs font-semibold text-gray-900">{fmt(summary.byType[t.value] || 0)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg border p-3">
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search employee, reason..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>
          <select
            value={filterMonth}
            onChange={e => setFilterMonth(e.target.value)}
            className="text-xs border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-green-500"
          >
            <option value="">All Months</option>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select
            value={filterYear}
            onChange={e => setFilterYear(e.target.value)}
            className="text-xs border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-green-500"
          >
            <option value="">All Years</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="text-xs border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-green-500"
          >
            <option value="">All Types</option>
            {INCENTIVE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="text-xs border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-green-500"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="paid">Paid</option>
          </select>
          {(filterMonth || filterType || filterStatus || search) && (
            <button
              onClick={() => { setFilterMonth(""); setFilterType(""); setFilterStatus(""); setSearch(""); }}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-500 px-2 py-1.5 border rounded"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-gray-600 whitespace-nowrap">Employee</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600 whitespace-nowrap">Period</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600 whitespace-nowrap">Type</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600 whitespace-nowrap">Amount</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600 whitespace-nowrap">Reason</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600 whitespace-nowrap">Status</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600 whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <Gift className="w-8 h-8" />
                      <p className="text-sm">No incentive records found</p>
                      <button onClick={openAdd} className="text-xs text-green-600 hover:underline">
                        Add the first incentive
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map(row => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{row.employeeName}</div>
                      <div className="text-gray-400">{row.employeeCode} · {row.designation}</div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-gray-700">
                      {MONTHS[row.month - 1]} {row.year}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <TypeBadge type={row.type} />
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-right font-medium text-gray-900">
                      {fmt(row.amount)}
                    </td>
                    <td className="px-3 py-2 max-w-48">
                      <span className="line-clamp-1 text-gray-600">{row.reason || "—"}</span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <StatusBadge status={row.status} />
                        {row.status === "pending" && (
                          <button
                            onClick={() => handleStatusChange(row, "approved")}
                            className="text-xs text-green-600 hover:text-green-700 ml-1"
                            title="Approve"
                          >
                            Approve
                          </button>
                        )}
                        {row.status === "approved" && (
                          <button
                            onClick={() => handleStatusChange(row, "paid")}
                            className="text-xs text-blue-600 hover:text-blue-700 ml-1"
                            title="Mark Paid"
                          >
                            Mark Paid
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(row)}
                          className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(row)}
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-5 py-3.5 border-b">
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-green-600" />
                <h2 className="text-sm font-semibold text-gray-900">
                  {editRow ? "Edit Incentive" : "Add Incentive"}
                </h2>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3.5">
              {/* Employee */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Employee *</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search employee..."
                    value={empSearch}
                    onChange={e => { setEmpSearch(e.target.value); setShowEmpDrop(true); if (!e.target.value) setForm(f => ({ ...f, employeeId: "" })); }}
                    onFocus={() => setShowEmpDrop(true)}
                    className="w-full text-xs border rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-green-500"
                  />
                  {showEmpDrop && empOptions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded shadow-lg max-h-44 overflow-y-auto">
                      {empOptions.map(e => (
                        <button
                          key={e.id}
                          type="button"
                          className="w-full text-left px-3 py-1.5 text-xs hover:bg-green-50"
                          onClick={() => {
                            setForm(f => ({ ...f, employeeId: String(e.id) }));
                            setEmpSearch(`${e.fullName} (${e.employeeId})`);
                            setShowEmpDrop(false);
                          }}
                        >
                          <span className="font-medium">{e.fullName}</span>
                          <span className="text-gray-400 ml-2">{e.employeeId} · {e.designation}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Month & Year */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Month *</label>
                  <select
                    value={form.month}
                    onChange={e => setForm(f => ({ ...f, month: e.target.value }))}
                    className="w-full text-xs border rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-green-500"
                  >
                    {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Year *</label>
                  <select
                    value={form.year}
                    onChange={e => setForm(f => ({ ...f, year: e.target.value }))}
                    className="w-full text-xs border rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-green-500"
                  >
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              {/* Type & Amount */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Type *</label>
                  <select
                    value={form.type}
                    onChange={e => setForm(f => ({ ...f, type: e.target.value as IncentiveType }))}
                    className="w-full text-xs border rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-green-500"
                  >
                    {INCENTIVE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Amount (Rs.) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={form.amount}
                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                    className="w-full text-xs border rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-green-500"
                  />
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Reason</label>
                <input
                  type="text"
                  placeholder="e.g. Excellent performance Q1 2026"
                  value={form.reason}
                  onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                  className="w-full text-xs border rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-green-500"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value as IncentiveStatus }))}
                  className="w-full text-xs border rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-green-500"
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="paid">Paid</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  placeholder="Additional notes..."
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full text-xs border rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-green-500 resize-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t">
              <button
                onClick={() => setShowModal(false)}
                className="text-xs px-3 py-1.5 border rounded text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.employeeId || !form.amount}
                className="text-xs px-4 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded font-medium"
              >
                {saving ? "Saving..." : editRow ? "Update" : "Add Incentive"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-red-50 rounded-full">
                <Trash2 className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Delete Incentive</h3>
                <p className="text-xs text-gray-500">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-xs text-gray-600 mb-4">
              Are you sure you want to delete the{" "}
              <span className="font-medium">{INCENTIVE_TYPES.find(t => t.value === confirmDelete.type)?.label}</span>{" "}
              of <span className="font-medium">{fmt(confirmDelete.amount)}</span> for{" "}
              <span className="font-medium">{confirmDelete.employeeName}</span>?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="text-xs px-3 py-1.5 border rounded text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="text-xs px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
