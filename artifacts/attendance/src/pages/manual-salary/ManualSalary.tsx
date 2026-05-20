import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Calculator, Plus, Search, Pencil, Trash2, CheckCircle2, Clock,
  FileText, X, AlertCircle, DollarSign, UserRound, Banknote,
  Loader2, TrendingDown, Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader, Card, Button, Input, Select, Badge } from "@/components/ui";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
function api(p: string) { return `${BASE}/api/${p}`; }

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

type Status = "draft" | "finalized" | "paid";

interface Employee {
  id: number; employeeId: string; fullName: string;
  designation: string; department: string; branchId: number;
}

interface SalaryRow {
  id: number; month: number; year: number;
  presentDays: number; absentDays: number; otHours: number; otAmount: number;
  basicSalary: number; transportAllowance: number; lunchAllowance: number;
  housingAllowance: number; otherAllowances: number;
  epfDeduction: number; loanDeduction: number; absenceDeduction: number; otherDeductions: number;
  grossSalary: number; netSalary: number; status: Status; notes: string | null; createdAt: string;
  employeeId: number; employeeCode: string; employeeName: string; designation: string; department: string;
}

interface AttendanceSummary { presentDays: number; absentDays: number; otHours: number; }

interface EarningItem  { component?: string; name?: string; amount?: number; type?: string; percentage?: number; formula?: string; }
interface DeductionItem { component?: string; name?: string; amount?: number; percentage?: number; type?: string; }

interface StructureData {
  structureId: number; structureName: string; basicAmount: number;
  transportAllowance: number; lunchAllowance: number;
  housingAllowance: number; otherAllowances: number;
  earnings: EarningItem[]; deductions: DeductionItem[];
}

const now = new Date();

const EMPTY_FORM = {
  employeeId: "", month: String(now.getMonth() + 1), year: String(now.getFullYear()),
  presentDays: "", absentDays: "", otHours: "", otAmount: "",
  basicSalary: "", transportAllowance: "", lunchAllowance: "",
  housingAllowance: "", otherAllowances: "",
  epfDeduction: "", loanDeduction: "", absenceDeduction: "", otherDeductions: "",
  status: "draft" as Status, notes: "",
};

function fmtRs(n: number) {
  return "Rs. " + n.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtShort(n: number) {
  return n.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function num(v: string | number) { return Number(v) || 0; }

const STATUS_CFG: Record<Status, { cls: string; label: string }> = {
  draft:     { cls: "bg-amber-100 text-amber-700 border border-amber-200",       label: "Draft"     },
  finalized: { cls: "bg-blue-100 text-blue-700 border border-blue-200",          label: "Finalized" },
  paid:      { cls: "bg-emerald-100 text-emerald-700 border border-emerald-200", label: "Paid"      },
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

/* ── Section header ── */
function SectionHead({ icon, title, badge }: { icon: React.ReactNode; title: string; badge?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200">
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-green-700">
        {icon}{title}
      </div>
      {badge}
    </div>
  );
}

/* ── Field wrapper ── */
function Field({ label, hint, children }: { label: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{label}</label>
        {hint}
      </div>
      {children}
    </div>
  );
}

/* ── Editable number field with prefix ── */
function NumField({ prefix, name, value, onChange, disabled }: {
  prefix: string; name: string; value: string;
  onChange: (n: string, v: string) => void; disabled?: boolean;
}) {
  return (
    <div className={cn(
      "flex items-center rounded-lg border overflow-hidden transition-all",
      disabled
        ? "border-slate-100 bg-slate-50"
        : "border-slate-200 bg-white shadow-sm focus-within:ring-2 focus-within:ring-green-500/25 focus-within:border-green-400"
    )}>
      <span className="px-2.5 text-xs text-slate-400 font-medium bg-slate-50 border-r border-slate-200 py-2 shrink-0 select-none">{prefix}</span>
      <input
        type="number" min="0" step="0.01"
        value={value}
        disabled={disabled}
        onChange={e => onChange(name, e.target.value)}
        className="flex-1 px-2.5 py-2 text-sm text-slate-700 outline-none bg-transparent placeholder:text-slate-300 disabled:text-slate-400"
        placeholder="0.00"
      />
    </div>
  );
}

/* ── Inline formula hint chip ── */
function FormulaHint({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5">
      <Info size={8} className="shrink-0" /> {children}
    </span>
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

  const [attData,    setAttData]    = useState<AttendanceSummary | null>(null);
  const [attLoading, setAttLoading] = useState(false);
  const [structData, setStructData] = useState<StructureData | null>(null);
  const [structLoading, setStructLoading] = useState(false);

  const token   = localStorage.getItem("auth_token") ?? "";
  const headers = useMemo(() => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  }), [token]);

  /* ── Load rows & employees ── */
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

  /* ── Auto-fetch attendance → pre-fill (always editable) ── */
  const attRef = useRef(0);
  useEffect(() => {
    if (!form.employeeId || !form.month || !form.year) { setAttData(null); return; }
    const id = ++attRef.current;
    setAttLoading(true);
    const p = new URLSearchParams({ employeeId: form.employeeId, month: form.month, year: form.year });
    fetch(`${api("manual-salary/attendance-lookup")}?${p}`, { headers })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (attRef.current !== id) return;
        if (data) {
          setAttData(data);
          setForm(f => ({
            ...f,
            presentDays: String(data.presentDays),
            absentDays:  String(data.absentDays),
            otHours:     String(data.otHours),
          }));
        }
      })
      .catch(() => {})
      .finally(() => { if (attRef.current === id) setAttLoading(false); });
  }, [form.employeeId, form.month, form.year, headers]);

  /* ── Auto-fetch salary structure → pre-fill ── */
  const structRef = useRef(0);
  useEffect(() => {
    if (!form.employeeId) { setStructData(null); return; }
    const id = ++structRef.current;
    setStructLoading(true);
    fetch(`${api(`salary-structures/assignment/${form.employeeId}`)}`, { headers })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (structRef.current !== id) return;
        if (data && !data.error) {
          setStructData(data);
          // Pre-fill salary components from structure
          setForm(f => ({
            ...f,
            basicSalary:        String(data.basicAmount ?? 0),
            transportAllowance: String(data.transportAllowance ?? 0),
            lunchAllowance:     String(data.lunchAllowance ?? 0),
            housingAllowance:   String(data.housingAllowance ?? 0),
            otherAllowances:    String(data.otherAllowances ?? 0),
          }));
          // Also auto-calc EPF from structure deductions
          const epfItem = (data.deductions as DeductionItem[]).find(d => {
            const n = (d.component ?? d.name ?? "").toLowerCase();
            return n.includes("epf") || n.includes("pf");
          });
          if (epfItem) {
            const pct = epfItem.percentage ?? (epfItem.amount && data.basicAmount ? (epfItem.amount / data.basicAmount) * 100 : 8);
            const epfAmt = (data.basicAmount ?? 0) * (pct / 100);
            setForm(f => ({ ...f, epfDeduction: String(Math.round(epfAmt * 100) / 100) }));
          } else {
            // Default 8%
            const epfAmt = (data.basicAmount ?? 0) * 0.08;
            setForm(f => ({ ...f, epfDeduction: String(Math.round(epfAmt * 100) / 100) }));
          }
        }
      })
      .catch(() => {})
      .finally(() => { if (structRef.current === id) setStructLoading(false); });
  }, [form.employeeId, headers]);

  /* ── Auto-calc OT amount when OT hours or basic changes ── */
  const otAutoCalcRef = useRef(false);
  useEffect(() => {
    if (!otAutoCalcRef.current) return; // only auto-update when user changes fields interactively
    const basic   = num(form.basicSalary);
    const otHours = num(form.otHours);
    if (basic > 0 && otHours > 0) {
      const dailyRate  = basic / 26;
      const hourlyRate = dailyRate / 8;
      const otAmt      = Math.round(otHours * hourlyRate * 1.5 * 100) / 100;
      setForm(f => ({ ...f, otAmount: String(otAmt) }));
    }
  }, [form.basicSalary, form.otHours]);

  /* ── Auto-recalc EPF when basic changes ── */
  useEffect(() => {
    if (!structData) return;
    const basic = num(form.basicSalary);
    if (basic <= 0) return;
    const epfItem = structData.deductions.find(d => {
      const n = (d.component ?? d.name ?? "").toLowerCase();
      return n.includes("epf") || n.includes("pf");
    });
    const pct    = epfItem?.percentage ?? 8;
    const epfAmt = Math.round(basic * (pct / 100) * 100) / 100;
    setForm(f => ({ ...f, epfDeduction: String(epfAmt) }));
  }, [form.basicSalary, structData]);

  /* ── Derived calculations ── */
  const gross = useMemo(() =>
    [form.basicSalary, form.transportAllowance, form.lunchAllowance,
     form.housingAllowance, form.otherAllowances, form.otAmount]
    .reduce((s, v) => s + num(v), 0), [form]);

  const totalDed = useMemo(() =>
    [form.epfDeduction, form.loanDeduction, form.absenceDeduction, form.otherDeductions]
    .reduce((s, v) => s + num(v), 0), [form]);

  const net = gross - totalDed;

  /* ── EPF % for hint display ── */
  const epfRate = useMemo(() => {
    if (!structData) return 8;
    const epfItem = structData.deductions.find(d => {
      const n = (d.component ?? d.name ?? "").toLowerCase();
      return n.includes("epf") || n.includes("pf");
    });
    return epfItem?.percentage ?? 8;
  }, [structData]);

  /* ── OT formula hint values ── */
  const otHourlyRate = useMemo(() => {
    const basic = num(form.basicSalary);
    if (!basic) return 0;
    return basic / 26 / 8;
  }, [form.basicSalary]);

  /* ── Lunch component type hint ── */
  const lunchItem = useMemo(() => {
    if (!structData) return null;
    return structData.earnings.find(e => {
      const n = (e.component ?? e.name ?? "").toLowerCase();
      return n.includes("lunch") || n.includes("incentive");
    }) ?? null;
  }, [structData]);

  function setField(name: string, value: string) {
    otAutoCalcRef.current = true;
    setForm(f => ({ ...f, [name]: value }));
  }

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
    setEditId(null); setForm({ ...EMPTY_FORM });
    setAttData(null); setStructData(null);
    otAutoCalcRef.current = false;
    setModalOpen(true);
  }

  function openEdit(row: SalaryRow) {
    setEditId(row.id); otAutoCalcRef.current = false;
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
  const selectedEmp = employees.find(e => String(e.id) === form.employeeId);

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Manual Salary"
        description="Manage employee salary entries — attendance and structure auto-filled"
        action={
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110"
            style={{ background: "linear-gradient(135deg,#166534,#16a34a)" }}
          >
            <Plus size={14} /> Add Entry
          </button>
        }
      />

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle size={14} className="shrink-0" /> {error}
          <button onClick={() => setError(null)} className="ml-auto"><X size={13} /></button>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Entries", value: summary.total,     icon: <FileText size={15} />,      clr: "text-slate-700",   ib: "bg-slate-100 text-slate-500"    },
          { label: "Draft",         value: summary.draft,     icon: <Clock size={15} />,         clr: "text-amber-700",   ib: "bg-amber-100 text-amber-600"    },
          { label: "Finalized",     value: summary.finalized, icon: <FileText size={15} />,      clr: "text-blue-700",    ib: "bg-blue-100 text-blue-600"      },
          { label: "Paid",          value: summary.paid,      icon: <CheckCircle2 size={15} />,  clr: "text-emerald-700", ib: "bg-emerald-100 text-emerald-600"},
        ].map(c => (
          <Card key={c.label} className="p-4 flex items-center gap-3">
            <div className={cn("p-2 rounded-lg shrink-0", c.ib)}>{c.icon}</div>
            <div>
              <p className="text-xs text-slate-500 font-medium">{c.label}</p>
              <p className={cn("text-2xl font-bold", c.clr)}>{c.value}</p>
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
        {[
          <select key="m" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none">
            {MONTHS.map((m, i) => <option key={m} value={String(i + 1)}>{m}</option>)}
          </select>,
          <select key="y" value={filterYear} onChange={e => setFilterYear(e.target.value)}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none">
            {years.map(y => <option key={y} value={String(y)}>{y}</option>)}
          </select>,
          <select key="s" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none">
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="finalized">Finalized</option>
            <option value="paid">Paid</option>
          </select>,
        ]}
        <div className="flex items-center gap-2 flex-1 min-w-[200px] rounded-lg border border-border bg-card px-3 py-2 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
          <Search size={13} className="text-slate-400 shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search employee…"
            className="flex-1 text-sm outline-none bg-transparent placeholder:text-muted-foreground" />
        </div>
      </div>

      {/* Table */}
      <Card>
        {loading ? (
          <div className="p-10 text-center text-sm text-slate-400 flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin" /> Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <Calculator size={20} className="text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-500">No entries found</p>
            <p className="text-xs text-slate-400 mt-1">Click "Add Entry" to create a manual salary record</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {["Employee","Period","Present","OT Hrs","Basic","Allowances","Deductions","Net Salary","Status",""].map((h, i) => (
                    <th key={i} className={cn("px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap", i >= 2 && i <= 7 ? "text-right" : i === 8 ? "text-center" : "")}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(row => {
                  const allowTotal = row.transportAllowance + row.lunchAllowance + row.housingAllowance + row.otherAllowances;
                  const dedTotal   = row.epfDeduction + row.loanDeduction + row.absenceDeduction + row.otherDeductions;
                  return (
                    <tr key={row.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold shrink-0">
                            {row.employeeName.charAt(0)}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-slate-800 leading-tight">{row.employeeName}</div>
                            <div className="text-[11px] text-slate-400">{row.employeeCode} · {row.department}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{MONTHS[row.month - 1]} {row.year}</td>
                      <td className="px-4 py-3 text-right text-sm font-medium">{row.presentDays}</td>
                      <td className="px-4 py-3 text-right text-sm text-slate-500">{row.otHours}</td>
                      <td className="px-4 py-3 text-right text-sm whitespace-nowrap">{fmtRs(row.basicSalary)}</td>
                      <td className="px-4 py-3 text-right text-sm text-blue-600 whitespace-nowrap">{fmtRs(allowTotal)}</td>
                      <td className="px-4 py-3 text-right text-sm text-red-500 whitespace-nowrap">{fmtRs(dedTotal)}</td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-emerald-700 whitespace-nowrap">{fmtRs(row.netSalary)}</td>
                      <td className="px-4 py-3 text-center"><StatusPill status={row.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          {row.status === "draft"     && <button onClick={() => handleStatus(row.id,"finalized")} title="Finalize" className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500"><FileText size={13}/></button>}
                          {row.status === "finalized" && <button onClick={() => handleStatus(row.id,"paid")}      title="Mark Paid" className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600"><CheckCircle2 size={13}/></button>}
                          <button onClick={() => openEdit(row)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><Pencil size={13}/></button>
                          <button onClick={() => setDeleteId(row.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><Trash2 size={13}/></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ═══════════════════════ MODAL ═══════════════════════ */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto"
          onClick={() => setModalOpen(false)}>
          <div
            className="bg-slate-50 rounded-2xl shadow-2xl w-full max-w-2xl my-6 flex flex-col overflow-hidden"
            style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
            onClick={e => e.stopPropagation()}
          >
            {/* ── Gradient header ── */}
            <div style={{ background: "linear-gradient(135deg,#14532d 0%,#166534 55%,#16a34a 100%)" }} className="px-6 py-5 shrink-0">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold text-lg shadow-inner">
                    {selectedEmp ? selectedEmp.fullName.charAt(0) : <Calculator size={20}/>}
                  </div>
                  <div>
                    <h2 className="text-white font-bold text-base leading-tight">
                      {editId ? "Edit Salary Entry" : "New Manual Salary Entry"}
                    </h2>
                    <p className="text-white/60 text-xs mt-0.5">
                      {selectedEmp
                        ? `${selectedEmp.fullName} · ${selectedEmp.designation}`
                        : "Select an employee to auto-fill attendance & structure"}
                    </p>
                  </div>
                </div>
                <button onClick={() => setModalOpen(false)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white/80">
                  <X size={18}/>
                </button>
              </div>

              {/* Live summary strip */}
              {(gross > 0 || totalDed > 0) && (
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {[
                    { label: "Gross Salary",    value: fmtShort(gross) },
                    { label: "Total Deductions",value: fmtShort(totalDed) },
                    { label: "Net Salary",       value: fmtShort(net) },
                  ].map(s => (
                    <div key={s.label} className="bg-white/10 rounded-xl px-3 py-2.5 text-center backdrop-blur-sm">
                      <p className="text-white/60 text-[10px] font-semibold uppercase tracking-wide">{s.label}</p>
                      <p className="text-white font-bold text-sm mt-0.5">Rs. {s.value}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Scrollable body ── */}
            <div className="overflow-y-auto flex-1 p-6 space-y-6">

              {/* EMPLOYEE & PERIOD */}
              <section>
                <SectionHead icon={<UserRound size={12}/>} title="Employee & Period" />
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-3 sm:col-span-1">
                    <Field label="Employee *">
                      <select
                        value={form.employeeId}
                        onChange={e => setField("employeeId", e.target.value)}
                        disabled={!!editId}
                        className="w-full rounded-lg border border-slate-200 bg-white shadow-sm px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/25 focus:border-green-400 appearance-none disabled:bg-slate-50 disabled:text-slate-400"
                      >
                        <option value="">Select employee…</option>
                        {employees.map(e => (
                          <option key={e.id} value={String(e.id)}>{e.fullName} ({e.employeeId})</option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  <div>
                    <Field label="Month *">
                      <select value={form.month} onChange={e => setField("month", e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white shadow-sm px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/25 focus:border-green-400 appearance-none">
                        {MONTHS.map((m, i) => <option key={m} value={String(i+1)}>{m}</option>)}
                      </select>
                    </Field>
                  </div>
                  <div>
                    <Field label="Year *">
                      <select value={form.year} onChange={e => setField("year", e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white shadow-sm px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/25 focus:border-green-400 appearance-none">
                        {years.map(y => <option key={y} value={String(y)}>{y}</option>)}
                      </select>
                    </Field>
                  </div>
                </div>
              </section>

              {/* ATTENDANCE */}
              <section>
                <SectionHead
                  icon={<UserRound size={12}/>}
                  title="Attendance"
                  badge={
                    <div className="flex items-center gap-2">
                      {attLoading && <Loader2 size={11} className="animate-spin text-green-500"/>}
                      {attData && !attLoading && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200">
                          Auto-filled from attendance records
                        </span>
                      )}
                      {!attData && !attLoading && form.employeeId && (
                        <span className="text-[10px] text-slate-400">No attendance records found</span>
                      )}
                    </div>
                  }
                />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <Field label="Present Days">
                      <NumField prefix="Days" name="presentDays" value={form.presentDays} onChange={setField}/>
                    </Field>
                  </div>
                  <div>
                    <Field label="Absent Days">
                      <NumField prefix="Days" name="absentDays" value={form.absentDays} onChange={setField}/>
                    </Field>
                  </div>
                  <div>
                    <Field label="OT Hours">
                      <NumField prefix="Hrs" name="otHours" value={form.otHours} onChange={setField}/>
                    </Field>
                  </div>
                  <div>
                    <Field
                      label="OT Amount"
                      hint={otHourlyRate > 0
                        ? <FormulaHint>× Rs.{otHourlyRate.toFixed(0)}/hr × 1.5</FormulaHint>
                        : undefined
                      }
                    >
                      <NumField prefix="Rs." name="otAmount" value={form.otAmount} onChange={setField}/>
                    </Field>
                    {num(form.otHours) > 0 && otHourlyRate > 0 && (
                      <p className="text-[10px] text-slate-400 mt-1">
                        = {num(form.otHours)} hrs × Rs.{otHourlyRate.toFixed(2)} × 1.5
                      </p>
                    )}
                  </div>
                </div>
              </section>

              {/* SALARY COMPONENTS */}
              <section>
                <SectionHead
                  icon={<DollarSign size={12}/>}
                  title="Salary Components"
                  badge={
                    <div className="flex items-center gap-2">
                      {structLoading && <Loader2 size={11} className="animate-spin text-green-500"/>}
                      {structData && !structLoading && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          From: {structData.structureName}
                        </span>
                      )}
                      {!structData && !structLoading && form.employeeId && (
                        <span className="text-[10px] text-slate-400">No structure assigned</span>
                      )}
                    </div>
                  }
                />

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">

                  {/* Basic Salary */}
                  <div>
                    <Field label="Basic Salary">
                      <NumField prefix="Rs." name="basicSalary" value={form.basicSalary} onChange={setField}/>
                    </Field>
                  </div>

                  {/* Transport Allowance */}
                  <div>
                    <Field label="Transport Allowance">
                      <NumField prefix="Rs." name="transportAllowance" value={form.transportAllowance} onChange={setField}/>
                    </Field>
                    {structData && (
                      <p className="text-[10px] text-slate-400 mt-1">
                        {structData.earnings.find(e => (e.component ?? e.name ?? "").toLowerCase().includes("transport"))
                          ? `Fixed · ${structData.earnings.find(e => (e.component ?? e.name ?? "").toLowerCase().includes("transport"))?.type ?? "Flat Amount"}`
                          : "Flat Amount"}
                      </p>
                    )}
                  </div>

                  {/* Lunch Allowance */}
                  <div>
                    <Field
                      label="Lunch Allowance"
                      hint={lunchItem
                        ? <FormulaHint>{lunchItem.type ?? (lunchItem.percentage ? `${lunchItem.percentage}%` : "Fixed")}</FormulaHint>
                        : undefined
                      }
                    >
                      <NumField prefix="Rs." name="lunchAllowance" value={form.lunchAllowance} onChange={setField}/>
                    </Field>
                    {lunchItem && (
                      <p className="text-[10px] text-slate-400 mt-1">
                        {lunchItem.percentage
                          ? `${lunchItem.percentage}% of Basic = Rs.${(num(form.basicSalary) * lunchItem.percentage / 100).toFixed(2)}`
                          : `Fixed · Rs.${lunchItem.amount?.toFixed(2) ?? "0.00"} / month`}
                      </p>
                    )}
                  </div>

                  {/* Housing Allowance */}
                  <div>
                    <Field label="Housing Allowance">
                      <NumField prefix="Rs." name="housingAllowance" value={form.housingAllowance} onChange={setField}/>
                    </Field>
                  </div>

                  {/* Other Allowances */}
                  <div>
                    <Field label="Other Allowances">
                      <NumField prefix="Rs." name="otherAllowances" value={form.otherAllowances} onChange={setField}/>
                    </Field>
                  </div>

                </div>
              </section>

              {/* DEDUCTIONS */}
              <section>
                <SectionHead icon={<TrendingDown size={12}/>} title="Deductions" />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

                  {/* EPF — auto-calculated from structure % */}
                  <div>
                    <Field
                      label="EPF (Employee)"
                      hint={<FormulaHint>{epfRate}% of Basic</FormulaHint>}
                    >
                      <NumField prefix="Rs." name="epfDeduction" value={form.epfDeduction} onChange={setField}/>
                    </Field>
                    {num(form.basicSalary) > 0 && (
                      <p className="text-[10px] text-slate-400 mt-1">
                        {epfRate}% × Rs.{fmtShort(num(form.basicSalary))} = Rs.{fmtShort(num(form.basicSalary) * epfRate / 100)}
                      </p>
                    )}
                  </div>

                  <div>
                    <Field label="Loan Deduction">
                      <NumField prefix="Rs." name="loanDeduction" value={form.loanDeduction} onChange={setField}/>
                    </Field>
                  </div>
                  <div>
                    <Field label="Absence Deduction">
                      <NumField prefix="Rs." name="absenceDeduction" value={form.absenceDeduction} onChange={setField}/>
                    </Field>
                  </div>
                  <div>
                    <Field label="Other Deductions">
                      <NumField prefix="Rs." name="otherDeductions" value={form.otherDeductions} onChange={setField}/>
                    </Field>
                  </div>

                </div>
              </section>

              {/* STATUS & NOTES */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Field label="Status">
                    <select value={form.status} onChange={e => setField("status", e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white shadow-sm px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/25 focus:border-green-400 appearance-none">
                      <option value="draft">Draft</option>
                      <option value="finalized">Finalized</option>
                      <option value="paid">Paid</option>
                    </select>
                  </Field>
                </div>
                <div>
                  <Field label="Notes">
                    <input value={form.notes} onChange={e => setField("notes", e.target.value)}
                      placeholder="Optional notes…"
                      className="w-full rounded-lg border border-slate-200 bg-white shadow-sm px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/25 focus:border-green-400" />
                  </Field>
                </div>
              </div>

            </div>{/* end body */}

            {/* ── Footer ── */}
            <div className="shrink-0 flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-white rounded-b-2xl">
              <div className="text-sm text-slate-500 flex items-center gap-2">
                Net:
                <span className="font-bold text-emerald-700 text-base">{fmtRs(net)}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors">
                  Cancel
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110 disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg,#166534,#16a34a)" }}>
                  {saving ? "Saving…" : editId ? "Update Entry" : "Save Entry"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-xs" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertCircle size={18} className="text-red-500"/>
              </div>
              <h3 className="text-sm font-bold text-slate-800">Delete Entry?</h3>
            </div>
            <p className="text-xs text-slate-500 mb-5">This will permanently remove this manual salary entry and cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteId(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 hover:bg-slate-50 text-slate-600">Cancel</button>
              <button onClick={handleDelete}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-red-500 hover:bg-red-600">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
