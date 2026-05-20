import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Calculator, Plus, Search, Pencil, Trash2, CheckCircle2, Clock,
  FileText, X, AlertCircle, DollarSign, UserRound, Banknote,
  RefreshCw, Lock, Loader2, TrendingDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader, Card, Button, Input, Select, Label, Table, Th, Td, Tr, Badge } from "@/components/ui";

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

interface StructureData {
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

function fmtRs(n: number) {
  return "Rs. " + n.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtRsShort(n: number) {
  return n.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const STATUS_CFG: Record<Status, { cls: string; label: string }> = {
  draft:     { cls: "bg-amber-100 text-amber-700 border border-amber-200",   label: "Draft"     },
  finalized: { cls: "bg-blue-100 text-blue-700 border border-blue-200",      label: "Finalized" },
  paid:      { cls: "bg-emerald-100 text-emerald-700 border border-emerald-200", label: "Paid"  },
};

function StatusPill({ status }: { status: Status }) {
  const { cls, label } = STATUS_CFG[status];
  return (
    <span className={cn("inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold", cls)}>
      {status === "paid"      && <CheckCircle2 size={10} />}
      {status === "finalized" && <FileText size={10} />}
      {status === "draft"     && <Clock size={10} />}
      {label}
    </span>
  );
}

function SectionTitle({ icon, children, color = "green" }: {
  icon?: React.ReactNode; children: React.ReactNode; color?: "green" | "blue" | "red" | "slate";
}) {
  const colors = {
    green: "text-green-700 border-green-200",
    blue:  "text-blue-600 border-blue-200",
    red:   "text-red-600 border-red-200",
    slate: "text-slate-500 border-slate-200",
  };
  return (
    <div className={cn("flex items-center gap-1.5 pb-2 mb-3 border-b text-[11px] font-bold uppercase tracking-widest", colors[color])}>
      {icon}
      {children}
    </div>
  );
}

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-1">
      <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{children}</label>
      {hint}
    </div>
  );
}

function ReadonlyField({ prefix, value, loading, onUnlock }: {
  prefix: string; value: number; loading?: boolean; onUnlock?: () => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm shadow-sm">
      <span className="text-xs text-slate-400 font-medium mr-1">{prefix}</span>
      <span className="flex-1 text-slate-700 font-semibold">
        {loading ? <Loader2 size={12} className="animate-spin inline" /> : value}
      </span>
      {onUnlock && (
        <button type="button" onClick={onUnlock} title="Override"
          className="ml-1 p-0.5 rounded hover:bg-amber-100 text-slate-400 hover:text-amber-600 transition-colors">
          <Lock size={10} />
        </button>
      )}
    </div>
  );
}

function EditableField({ prefix, name, value, onChange }: {
  prefix: string; name: string; value: string; onChange: (n: string, v: string) => void;
}) {
  return (
    <div className="flex items-center rounded-lg border border-slate-200 bg-white shadow-sm focus-within:ring-2 focus-within:ring-green-500/30 focus-within:border-green-400 transition-all overflow-hidden">
      <span className="px-2.5 text-xs text-slate-400 font-medium bg-slate-50 border-r border-slate-200 py-2 shrink-0">{prefix}</span>
      <input
        type="number" min="0" step="0.01"
        value={value}
        onChange={e => onChange(name, e.target.value)}
        className="flex-1 px-2.5 py-2 text-sm text-slate-700 outline-none bg-white placeholder:text-slate-300"
        placeholder="0.00"
      />
    </div>
  );
}

export default function ManualSalary() {
  const [rows,      setRows]      = useState<SalaryRow[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const [filterMonth,  setFilterMonth]  = useState(String(now.getMonth() + 1));
  const [filterYear,   setFilterYear]   = useState(String(now.getFullYear()));
  const [filterStatus, setFilterStatus] = useState("");
  const [search,       setSearch]       = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editId,    setEditId]    = useState<number | null>(null);
  const [form,      setForm]      = useState({ ...EMPTY_FORM });
  const [deleteId,  setDeleteId]  = useState<number | null>(null);

  // Attendance auto-fill
  const [attData,     setAttData]     = useState<AttendanceSummary | null>(null);
  const [attLoading,  setAttLoading]  = useState(false);
  const [attOverride, setAttOverride] = useState(false);

  // Salary structure auto-fill
  const [structData,     setStructData]     = useState<StructureData | null>(null);
  const [structLoading,  setStructLoading]  = useState(false);
  const [structOverride, setStructOverride] = useState(false);

  const token   = localStorage.getItem("auth_token") ?? "";
  const headers = useMemo(() => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  }), [token]);

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (filterMonth)  p.set("month",  filterMonth);
      if (filterYear)   p.set("year",   filterYear);
      if (filterStatus) p.set("status", filterStatus);
      const r = await fetch(`${api("manual-salary")}?${p}`, { headers });
      if (!r.ok) throw new Error();
      setRows(await r.json());
    } catch { setError("Failed to load entries"); }
    finally  { setLoading(false); }
  }, [filterMonth, filterYear, filterStatus, headers]);

  const loadEmployees = useCallback(async () => {
    const r = await fetch(`${api("employees")}?limit=500`, { headers });
    if (r.ok) {
      const d = await r.json();
      setEmployees(Array.isArray(d) ? d : (d.employees ?? []));
    }
  }, [headers]);

  useEffect(() => { loadRows(); },      [loadRows]);
  useEffect(() => { loadEmployees(); }, [loadEmployees]);

  // Auto-fetch attendance when employee + month + year all set
  const attRef = useRef(0);
  useEffect(() => {
    if (!form.employeeId || !form.month || !form.year) { setAttData(null); return; }
    const id = ++attRef.current;
    setAttLoading(true);
    setAttData(null);
    const p = new URLSearchParams({ employeeId: form.employeeId, month: form.month, year: form.year });
    fetch(`${api("manual-salary/attendance-lookup")}?${p}`, { headers })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (attRef.current !== id) return;
        if (data) {
          setAttData(data);
          if (!attOverride)
            setForm(f => ({ ...f, presentDays: String(data.presentDays), absentDays: String(data.absentDays), otHours: String(data.otHours) }));
        }
      })
      .catch(() => {})
      .finally(() => { if (attRef.current === id) setAttLoading(false); });
  }, [form.employeeId, form.month, form.year, headers]);

  // Auto-fetch salary structure when employee changes
  const structRef = useRef(0);
  useEffect(() => {
    if (!form.employeeId) { setStructData(null); return; }
    const id = ++structRef.current;
    setStructLoading(true);
    setStructData(null);
    fetch(`${api(`salary-structures/assignment/${form.employeeId}`)}`, { headers })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (structRef.current !== id) return;
        if (data && !data.error && !data.message) {
          setStructData(data);
          if (!structOverride)
            setForm(f => ({
              ...f,
              basicSalary:        String(data.basicAmount),
              transportAllowance: String(data.transportAllowance),
              lunchAllowance:     String(data.lunchAllowance),
              housingAllowance:   String(data.housingAllowance),
              otherAllowances:    String(data.otherAllowances),
            }));
        }
      })
      .catch(() => {})
      .finally(() => { if (structRef.current === id) setStructLoading(false); });
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
    total:    rows.length,
    draft:    rows.filter(r => r.status === "draft").length,
    finalized:rows.filter(r => r.status === "finalized").length,
    paid:     rows.filter(r => r.status === "paid").length,
    totalNet: rows.reduce((s, r) => s + r.netSalary, 0),
  }), [rows]);

  const gross = useMemo(() =>
    [form.basicSalary, form.transportAllowance, form.lunchAllowance,
     form.housingAllowance, form.otherAllowances, form.otAmount]
    .reduce((s, v) => s + Number(v || 0), 0), [form]);

  const totalDed = useMemo(() =>
    [form.epfDeduction, form.loanDeduction, form.absenceDeduction, form.otherDeductions]
    .reduce((s, v) => s + Number(v || 0), 0), [form]);

  const net = gross - totalDed;

  function setField(name: string, value: string) { setForm(f => ({ ...f, [name]: value })); }

  function openAdd() {
    setEditId(null); setForm({ ...EMPTY_FORM });
    setAttData(null); setStructData(null);
    setAttOverride(false); setStructOverride(false);
    setModalOpen(true);
  }

  function openEdit(row: SalaryRow) {
    setEditId(row.id);
    setAttOverride(true); setStructOverride(true);
    setForm({
      employeeId: String(row.employeeId), month: String(row.month), year: String(row.year),
      presentDays: String(row.presentDays), absentDays: String(row.absentDays),
      otHours: String(row.otHours), otAmount: String(row.otAmount),
      basicSalary: String(row.basicSalary), transportAllowance: String(row.transportAllowance),
      lunchAllowance: String(row.lunchAllowance), housingAllowance: String(row.housingAllowance),
      otherAllowances: String(row.otherAllowances), epfDeduction: String(row.epfDeduction),
      loanDeduction: String(row.loanDeduction), absenceDeduction: String(row.absenceDeduction),
      otherDeductions: String(row.otherDeductions), status: row.status, notes: row.notes ?? "",
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.employeeId || !form.month || !form.year) { setError("Employee, month and year are required."); return; }
    setSaving(true);
    try {
      const url = editId ? api(`manual-salary/${editId}`) : api("manual-salary");
      const r   = await fetch(url, { method: editId ? "PUT" : "POST", headers, body: JSON.stringify(form) });
      if (!r.ok) throw new Error();
      setModalOpen(false); await loadRows();
    } catch { setError("Failed to save entry"); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await fetch(api(`manual-salary/${deleteId}`), { method: "DELETE", headers });
      setDeleteId(null); await loadRows();
    } catch { setError("Failed to delete"); }
  }

  async function handleStatus(id: number, status: Status) {
    try {
      await fetch(api(`manual-salary/${id}/status`), { method: "PATCH", headers, body: JSON.stringify({ status }) });
      await loadRows();
    } catch { setError("Failed to update status"); }
  }

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  // Selected employee info (for modal header)
  const selectedEmp = employees.find(e => String(e.id) === form.employeeId);

  return (
    <div className="p-6 space-y-6">

      <PageHeader
        title="Manual Salary"
        description="Manage employee salary entries — attendance and structure auto-filled"
        action={
          <Button onClick={openAdd} size="sm" className="gap-1.5">
            <Plus size={14} /> Add Entry
          </Button>
        }
      />

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle size={14} className="shrink-0" /> {error}
          <button onClick={() => setError(null)} className="ml-auto p-0.5 rounded hover:bg-red-100"><X size={13} /></button>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Entries", value: summary.total,     icon: <FileText size={16} />,      color: "text-slate-700",  bg: "bg-white",      iconBg: "bg-slate-100  text-slate-500"   },
          { label: "Draft",         value: summary.draft,     icon: <Clock size={16} />,         color: "text-amber-700",  bg: "bg-amber-50",   iconBg: "bg-amber-100  text-amber-600"   },
          { label: "Finalized",     value: summary.finalized, icon: <FileText size={16} />,      color: "text-blue-700",   bg: "bg-blue-50",    iconBg: "bg-blue-100   text-blue-600"    },
          { label: "Paid",          value: summary.paid,      icon: <CheckCircle2 size={16} />,  color: "text-emerald-700",bg: "bg-emerald-50", iconBg: "bg-emerald-100 text-emerald-600"},
        ].map(c => (
          <Card key={c.label} className={cn("p-4 flex items-center gap-3 border", c.bg)}>
            <div className={cn("p-2 rounded-lg", c.iconBg)}>{c.icon}</div>
            <div>
              <p className="text-xs text-slate-500 font-medium">{c.label}</p>
              <p className={cn("text-2xl font-bold", c.color)}>{c.value}</p>
            </div>
          </Card>
        ))}
      </div>

      <Card className="flex items-center gap-3 px-5 py-3.5 bg-green-50 border-green-200">
        <Banknote size={16} className="text-green-600 shrink-0" />
        <span className="text-sm text-green-700 font-medium">
          Total Net Salary — {MONTHS[Number(filterMonth) - 1]} {filterYear}
        </span>
        <span className="text-base font-bold text-green-700 ml-auto">{fmtRs(summary.totalNet)}</span>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="w-32 text-sm">
          {MONTHS.map((m, i) => <option key={m} value={String(i + 1)}>{m}</option>)}
        </Select>
        <Select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="w-24 text-sm">
          {years.map(y => <option key={y} value={String(y)}>{y}</option>)}
        </Select>
        <Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-32 text-sm">
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="finalized">Finalized</option>
          <option value="paid">Paid</option>
        </Select>
        <div className="flex items-center gap-2 flex-1 min-w-[200px] rounded-lg border border-border bg-card px-3 py-2 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
          <Search size={13} className="text-slate-400 shrink-0" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search employee…"
            className="flex-1 text-sm outline-none bg-transparent text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        {loading ? (
          <div className="p-10 text-center text-sm text-slate-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <Calculator size={20} className="text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-500">No entries found</p>
            <p className="text-xs text-slate-400 mt-1">Click "Add Entry" to create a manual salary entry</p>
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Employee</Th>
                <Th>Period</Th>
                <Th className="text-right">Present</Th>
                <Th className="text-right">OT Hrs</Th>
                <Th className="text-right">Basic</Th>
                <Th className="text-right">Allowances</Th>
                <Th className="text-right">Deductions</Th>
                <Th className="text-right">Net Salary</Th>
                <Th className="text-center">Status</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(row => {
                const allowTotal = row.transportAllowance + row.lunchAllowance + row.housingAllowance + row.otherAllowances;
                const dedTotal   = row.epfDeduction + row.loanDeduction + row.absenceDeduction + row.otherDeductions;
                return (
                  <Tr key={row.id}>
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold shrink-0">
                          {row.employeeName.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-800">{row.employeeName}</div>
                          <div className="text-[11px] text-slate-400">{row.employeeCode} · {row.department}</div>
                        </div>
                      </div>
                    </Td>
                    <Td className="text-sm text-slate-600">{MONTHS[row.month - 1]} {row.year}</Td>
                    <Td className="text-right text-sm font-medium">{row.presentDays}</Td>
                    <Td className="text-right text-sm">{row.otHours}</Td>
                    <Td className="text-right text-sm">{fmtRs(row.basicSalary)}</Td>
                    <Td className="text-right text-sm text-blue-600">{fmtRs(allowTotal)}</Td>
                    <Td className="text-right text-sm text-red-500">{fmtRs(dedTotal)}</Td>
                    <Td className="text-right text-sm font-bold text-emerald-700">{fmtRs(row.netSalary)}</Td>
                    <Td className="text-center"><StatusPill status={row.status} /></Td>
                    <Td>
                      <div className="flex items-center gap-1 justify-end">
                        {row.status === "draft" && (
                          <button onClick={() => handleStatus(row.id, "finalized")} title="Mark Finalized"
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors"><FileText size={13} /></button>
                        )}
                        {row.status === "finalized" && (
                          <button onClick={() => handleStatus(row.id, "paid")} title="Mark Paid"
                            className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600 transition-colors"><CheckCircle2 size={13} /></button>
                        )}
                        <button onClick={() => openEdit(row)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"><Pencil size={13} /></button>
                        <button onClick={() => setDeleteId(row.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors"><Trash2 size={13} /></button>
                      </div>
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>

      {/* ── ADD / EDIT MODAL ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto"
          onClick={() => setModalOpen(false)}>
          <div
            className="bg-slate-50 rounded-2xl shadow-2xl w-full max-w-2xl my-6 flex flex-col overflow-hidden"
            style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
            onClick={e => e.stopPropagation()}
          >
            {/* Gradient header */}
            <div style={{ background: "linear-gradient(135deg, #14532d 0%, #166534 55%, #16a34a 100%)" }}
              className="px-6 py-5 shrink-0">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold text-lg shadow-inner">
                    {selectedEmp ? selectedEmp.fullName.charAt(0) : <Calculator size={20} />}
                  </div>
                  <div>
                    <h2 className="text-white font-bold text-base leading-tight">
                      {editId ? "Edit Salary Entry" : "New Manual Salary Entry"}
                    </h2>
                    <p className="text-white/60 text-xs mt-0.5">
                      {selectedEmp
                        ? `${selectedEmp.fullName} · ${selectedEmp.designation}`
                        : "Select an employee to begin"}
                    </p>
                  </div>
                </div>
                <button onClick={() => setModalOpen(false)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white/80">
                  <X size={18} />
                </button>
              </div>

              {/* Key figures strip — only when we have values */}
              {(gross > 0 || totalDed > 0) && (
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {[
                    { label: "Gross",       value: fmtRsShort(gross) },
                    { label: "Deductions",  value: fmtRsShort(totalDed) },
                    { label: "Net Salary",  value: fmtRsShort(net) },
                  ].map(s => (
                    <div key={s.label} className="bg-white/10 rounded-xl px-3 py-2 text-center backdrop-blur-sm">
                      <p className="text-white/60 text-[10px] font-semibold uppercase tracking-wide">{s.label}</p>
                      <p className="text-white font-bold text-sm mt-0.5">{s.value}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 p-6 space-y-6 bg-slate-50">

              {/* Employee & Period */}
              <section>
                <SectionTitle icon={<UserRound size={12} />} color="slate">Employee &amp; Period</SectionTitle>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-3 sm:col-span-1">
                    <FieldLabel>Employee *</FieldLabel>
                    <Select
                      value={form.employeeId}
                      onChange={e => setField("employeeId", e.target.value)}
                      disabled={!!editId}
                      className="text-sm"
                    >
                      <option value="">Select employee…</option>
                      {employees.map(e => (
                        <option key={e.id} value={String(e.id)}>{e.fullName} ({e.employeeId})</option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <FieldLabel>Month *</FieldLabel>
                    <Select value={form.month} onChange={e => setField("month", e.target.value)} className="text-sm">
                      {MONTHS.map((m, i) => <option key={m} value={String(i + 1)}>{m}</option>)}
                    </Select>
                  </div>
                  <div>
                    <FieldLabel>Year *</FieldLabel>
                    <Select value={form.year} onChange={e => setField("year", e.target.value)} className="text-sm">
                      {years.map(y => <option key={y} value={String(y)}>{y}</option>)}
                    </Select>
                  </div>
                </div>
              </section>

              {/* Attendance */}
              <section>
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-green-200">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-green-700">
                    <UserRound size={12} /> Attendance
                  </div>
                  <div className="flex items-center gap-2">
                    {attLoading && <Loader2 size={11} className="animate-spin text-green-500" />}
                    {attData && !attOverride && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700 border border-green-200">
                        <RefreshCw size={9} /> From Attendance
                      </span>
                    )}
                    {attData && attOverride && (
                      <>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                          <Lock size={9} /> Override
                        </span>
                        <button type="button" onClick={() => {
                          setAttOverride(false);
                          if (attData) setForm(f => ({ ...f, presentDays: String(attData.presentDays), absentDays: String(attData.absentDays), otHours: String(attData.otHours) }));
                        }} className="text-[10px] text-green-600 hover:underline flex items-center gap-0.5">
                          <RefreshCw size={9} /> Reset
                        </button>
                      </>
                    )}
                    {!attData && !attLoading && form.employeeId && (
                      <span className="text-[10px] text-slate-400">No attendance records</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* Present Days */}
                  <div>
                    <FieldLabel hint={attData && !attOverride ? <button type="button" onClick={() => setAttOverride(true)} className="p-0.5 rounded hover:bg-amber-100 text-slate-400 hover:text-amber-600 transition-colors"><Lock size={9} /></button> : undefined}>
                      Present Days
                    </FieldLabel>
                    {attData && !attOverride
                      ? <ReadonlyField prefix="Days" value={attData.presentDays} loading={attLoading} />
                      : <EditableField prefix="Days" name="presentDays" value={form.presentDays} onChange={setField} />
                    }
                  </div>
                  {/* Absent Days */}
                  <div>
                    <FieldLabel hint={attData && !attOverride ? <button type="button" onClick={() => setAttOverride(true)} className="p-0.5 rounded hover:bg-amber-100 text-slate-400 hover:text-amber-600 transition-colors"><Lock size={9} /></button> : undefined}>
                      Absent Days
                    </FieldLabel>
                    {attData && !attOverride
                      ? <ReadonlyField prefix="Days" value={attData.absentDays} loading={attLoading} />
                      : <EditableField prefix="Days" name="absentDays" value={form.absentDays} onChange={setField} />
                    }
                  </div>
                  {/* OT Hours */}
                  <div>
                    <FieldLabel hint={attData && !attOverride ? <button type="button" onClick={() => setAttOverride(true)} className="p-0.5 rounded hover:bg-amber-100 text-slate-400 hover:text-amber-600 transition-colors"><Lock size={9} /></button> : undefined}>
                      OT Hours
                    </FieldLabel>
                    {attData && !attOverride
                      ? <ReadonlyField prefix="Hrs" value={attData.otHours} loading={attLoading} />
                      : <EditableField prefix="Hrs" name="otHours" value={form.otHours} onChange={setField} />
                    }
                  </div>
                  {/* OT Amount always editable */}
                  <div>
                    <FieldLabel>OT Amount</FieldLabel>
                    <EditableField prefix="Rs." name="otAmount" value={form.otAmount} onChange={setField} />
                  </div>
                </div>
              </section>

              {/* Salary Components */}
              <section>
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-green-200">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-green-700">
                    <DollarSign size={12} /> Salary Components
                  </div>
                  <div className="flex items-center gap-2">
                    {structLoading && <Loader2 size={11} className="animate-spin text-green-500" />}
                    {structData && !structOverride && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700 border border-green-200">
                        <RefreshCw size={9} /> {structData.structureName}
                      </span>
                    )}
                    {structData && structOverride && (
                      <>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                          <Lock size={9} /> Override
                        </span>
                        <button type="button" onClick={() => {
                          setStructOverride(false);
                          if (structData) setForm(f => ({
                            ...f,
                            basicSalary: String(structData.basicAmount),
                            transportAllowance: String(structData.transportAllowance),
                            lunchAllowance: String(structData.lunchAllowance),
                            housingAllowance: String(structData.housingAllowance),
                            otherAllowances: String(structData.otherAllowances),
                          }));
                        }} className="text-[10px] text-green-600 hover:underline flex items-center gap-0.5">
                          <RefreshCw size={9} /> Reset
                        </button>
                      </>
                    )}
                    {!structData && !structLoading && form.employeeId && (
                      <span className="text-[10px] text-slate-400">No structure assigned</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { label: "Basic Salary",        name: "basicSalary",        structVal: structData?.basicAmount },
                    { label: "Transport Allowance", name: "transportAllowance", structVal: structData?.transportAllowance },
                    { label: "Lunch Allowance",     name: "lunchAllowance",     structVal: structData?.lunchAllowance },
                    { label: "Housing Allowance",   name: "housingAllowance",   structVal: structData?.housingAllowance },
                    { label: "Other Allowances",    name: "otherAllowances",    structVal: structData?.otherAllowances },
                  ].map(({ label, name, structVal }) => (
                    <div key={name}>
                      <FieldLabel hint={structData && !structOverride
                        ? <button type="button" onClick={() => setStructOverride(true)} className="p-0.5 rounded hover:bg-amber-100 text-slate-400 hover:text-amber-600 transition-colors"><Lock size={9} /></button>
                        : undefined}>
                        {label}
                      </FieldLabel>
                      {structData && !structOverride && structVal !== undefined
                        ? <ReadonlyField prefix="Rs." value={structVal} />
                        : <EditableField prefix="Rs." name={name} value={(form as any)[name]} onChange={setField} />
                      }
                    </div>
                  ))}
                </div>
              </section>

              {/* Deductions */}
              <section>
                <SectionTitle icon={<TrendingDown size={12} />} color="red">Deductions</SectionTitle>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "EPF (Employee)",    name: "epfDeduction"     },
                    { label: "Loan Deduction",    name: "loanDeduction"    },
                    { label: "Absence Deduction", name: "absenceDeduction" },
                    { label: "Other Deductions",  name: "otherDeductions"  },
                  ].map(({ label, name }) => (
                    <div key={name}>
                      <FieldLabel>{label}</FieldLabel>
                      <EditableField prefix="Rs." name={name} value={(form as any)[name]} onChange={setField} />
                    </div>
                  ))}
                </div>
              </section>

              {/* Status & Notes */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>Status</FieldLabel>
                  <Select value={form.status} onChange={e => setField("status", e.target.value)} className="text-sm">
                    <option value="draft">Draft</option>
                    <option value="finalized">Finalized</option>
                    <option value="paid">Paid</option>
                  </Select>
                </div>
                <div>
                  <FieldLabel>Notes</FieldLabel>
                  <Input value={form.notes} onChange={e => setField("notes", e.target.value)}
                    placeholder="Optional notes…" className="text-sm" />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="shrink-0 flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-white rounded-b-2xl">
              <div className="text-sm text-slate-500">
                Net: <span className="font-bold text-emerald-700">{fmtRs(net)}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setModalOpen(false)}>Cancel</Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? "Saving…" : editId ? "Update Entry" : "Save Entry"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-xs">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle size={18} className="text-red-500" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Delete Entry?</h3>
            </div>
            <p className="text-xs text-slate-500 mb-5">This will permanently remove this manual salary entry and cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setDeleteId(null)}>Cancel</Button>
              <Button variant="danger" size="sm" onClick={handleDelete}>Delete</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
