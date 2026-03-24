import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  Plus, Trash2, Edit2, Check, X, RefreshCw, Save,
  AlertTriangle, ChevronRight, Settings2,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
function apiUrl(path: string) { return `${BASE}/api${path}`; }

interface SalaryComponent {
  id: string;
  no: number;
  component: string;
  abbr: string;
  amount: number;
  dependsOnPayroll: boolean;
  isTaxExempt: boolean;
  isAccrual: boolean;
  hasFormula: boolean;
  formula: string;
}

const DEFAULT_EARNINGS: SalaryComponent[] = [
  { id: "basic", no: 1, component: "Basic", abbr: "B", amount: 40000, dependsOnPayroll: true, isTaxExempt: true, isAccrual: false, hasFormula: false, formula: "" },
  { id: "transport", no: 2, component: "Transport Allowance", abbr: "TA", amount: 5000, dependsOnPayroll: false, isTaxExempt: false, isAccrual: false, hasFormula: false, formula: "" },
  { id: "housing", no: 3, component: "Housing Allowance", abbr: "HA", amount: 3000, dependsOnPayroll: false, isTaxExempt: false, isAccrual: false, hasFormula: false, formula: "" },
  { id: "other", no: 4, component: "Other Allowances", abbr: "OA", amount: 1500, dependsOnPayroll: false, isTaxExempt: false, isAccrual: false, hasFormula: false, formula: "" },
];

const DEFAULT_DEDUCTIONS: SalaryComponent[] = [
  { id: "epf8", no: 1, component: "EPF - 8%", abbr: "epf", amount: 0, dependsOnPayroll: false, isTaxExempt: false, isAccrual: false, hasFormula: true, formula: "B * 0.08" },
  { id: "epf12", no: 2, component: "EPF - 12%", abbr: "epf12", amount: 0, dependsOnPayroll: false, isTaxExempt: false, isAccrual: false, hasFormula: true, formula: "B * 0.12" },
  { id: "etf3", no: 3, component: "ETF - 3%", abbr: "etf3", amount: 0, dependsOnPayroll: false, isTaxExempt: false, isAccrual: false, hasFormula: true, formula: "B * 0.03" },
  { id: "late", no: 4, component: "Late Deduction", abbr: "LD", amount: 100, dependsOnPayroll: false, isTaxExempt: false, isAccrual: false, hasFormula: false, formula: "" },
];

const DEFAULT_BENEFITS: { no: number; earningComponent: string; benefitAmount: number }[] = [];

type Tab = "details" | "earnings" | "account";

interface PayrollConfig {
  epfEmployeePercent: number;
  epfEmployerPercent: number;
  etfEmployerPercent: number;
  transportAllowance: number;
  housingAllowanceLow: number;
  otherAllowances: number;
  lateDeductionPerInstance: number;
  overtimeMultiplier: number;
  salaryScale: Record<string, number>;
  employeeOverrides: Record<string, number>;
}

function CheckboxCell({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn(
        "w-4 h-4 border rounded flex items-center justify-center transition-colors mx-auto",
        checked ? "bg-primary border-primary" : "bg-white border-gray-300"
      )}
    >
      {checked && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
    </button>
  );
}

function ComponentTable({
  rows, onUpdate, onDelete, onAdd, addLabel, currency = "LKR",
}: {
  rows: SalaryComponent[];
  onUpdate: (id: string, field: keyof SalaryComponent, value: any) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
  addLabel: string;
  currency?: string;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");

  function startEdit(id: string, field: string, val: string) {
    setEditingId(id); setEditingField(field); setEditVal(val);
  }

  function confirmEdit() {
    if (!editingId || !editingField) return;
    if (editingField === "amount") {
      const v = parseFloat(editVal);
      if (!isNaN(v)) onUpdate(editingId, "amount", v);
    } else {
      onUpdate(editingId, editingField as keyof SalaryComponent, editVal);
    }
    setEditingId(null); setEditingField(null);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") confirmEdit();
    if (e.key === "Escape") { setEditingId(null); setEditingField(null); }
  }

  const isEditing = (id: string, field: string) => editingId === id && editingField === field;

  function EditableCell({ id, field, value, className = "" }: { id: string; field: string; value: string; className?: string }) {
    if (isEditing(id, field)) {
      return (
        <input
          autoFocus
          value={editVal}
          onChange={e => setEditVal(e.target.value)}
          onBlur={confirmEdit}
          onKeyDown={handleKey}
          className={cn("border border-primary rounded px-1.5 py-0.5 text-xs outline-none w-full", className)}
        />
      );
    }
    return (
      <span
        className="cursor-pointer hover:text-primary group-hover:underline decoration-dashed underline-offset-2"
        onClick={() => startEdit(id, field, value)}
      >
        {value || <span className="text-gray-300 italic">—</span>}
      </span>
    );
  }

  return (
    <div className="border border-gray-200 rounded overflow-hidden text-sm">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="w-8 px-3 py-2">
              <input type="checkbox" className="w-3.5 h-3.5 accent-primary" />
            </th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 w-10">No.</th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Component <span className="text-red-500">*</span></th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 w-24">Abbr</th>
            <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 w-36">Amount ({currency})</th>
            <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 w-20">Depen...</th>
            <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 w-20">Is Tax ...</th>
            <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 w-20">Accru...</th>
            <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 w-20">Amoun...</th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Formula</th>
            <th className="px-3 py-2 w-10">
              <Settings2 className="w-3.5 h-3.5 text-gray-400 mx-auto" />
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row) => (
            <tr key={row.id} className="group hover:bg-blue-50/30 transition-colors">
              <td className="px-3 py-2.5 text-center">
                <input type="checkbox" className="w-3.5 h-3.5 accent-primary" />
              </td>
              <td className="px-3 py-2.5 text-xs text-gray-400">{row.no}</td>
              <td className="px-3 py-2.5 font-semibold text-gray-800">
                <EditableCell id={row.id} field="component" value={row.component} />
              </td>
              <td className="px-3 py-2.5 text-gray-500">
                <EditableCell id={row.id} field="abbr" value={row.abbr} className="w-20" />
              </td>
              <td className="px-3 py-2.5 text-right text-gray-700">
                {isEditing(row.id, "amount") ? (
                  <input
                    autoFocus
                    value={editVal}
                    onChange={e => setEditVal(e.target.value)}
                    onBlur={confirmEdit}
                    onKeyDown={handleKey}
                    className="border border-primary rounded px-1.5 py-0.5 text-xs outline-none w-28 text-right ml-auto block"
                  />
                ) : (
                  <span
                    className="cursor-pointer hover:text-primary"
                    onClick={() => startEdit(row.id, "amount", String(row.amount))}
                  >
                    Rs {row.amount.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                )}
              </td>
              <td className="px-3 py-2.5 text-center">
                <CheckboxCell checked={row.dependsOnPayroll} onChange={v => onUpdate(row.id, "dependsOnPayroll", v)} />
              </td>
              <td className="px-3 py-2.5 text-center">
                <CheckboxCell checked={row.isTaxExempt} onChange={v => onUpdate(row.id, "isTaxExempt", v)} />
              </td>
              <td className="px-3 py-2.5 text-center">
                <CheckboxCell checked={row.isAccrual} onChange={v => onUpdate(row.id, "isAccrual", v)} />
              </td>
              <td className="px-3 py-2.5 text-center">
                <CheckboxCell checked={row.hasFormula} onChange={v => onUpdate(row.id, "hasFormula", v)} />
              </td>
              <td className="px-3 py-2.5 text-gray-500 font-mono text-xs">
                {row.hasFormula
                  ? <EditableCell id={row.id} field="formula" value={row.formula} className="w-28 font-mono" />
                  : <span className="text-gray-300">—</span>}
              </td>
              <td className="px-3 py-2.5 text-center">
                <button
                  onClick={() => onDelete(row.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500"
                  title="Remove"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="border-t border-gray-100 px-3 py-2">
        <button
          onClick={onAdd}
          className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> {addLabel}
        </button>
      </div>
    </div>
  );
}

export default function PayrollSettings() {
  const [tab, setTab] = useState<Tab>("earnings");
  const [earnings, setEarnings] = useState<SalaryComponent[]>(DEFAULT_EARNINGS);
  const [deductions, setDeductions] = useState<SalaryComponent[]>(DEFAULT_DEDUCTIONS);
  const [benefits, setBenefits] = useState(DEFAULT_BENEFITS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* General settings (kept for API compatibility) */
  const [cfg, setCfg] = useState<PayrollConfig>({
    epfEmployeePercent: 8, epfEmployerPercent: 12, etfEmployerPercent: 3,
    transportAllowance: 5000, housingAllowanceLow: 3000, otherAllowances: 1500,
    lateDeductionPerInstance: 100, overtimeMultiplier: 1.5,
    salaryScale: {}, employeeOverrides: {},
  });

  useEffect(() => {
    setLoading(true);
    fetch(apiUrl("/payroll-settings"))
      .then(r => r.json())
      .then(d => {
        if (d.id) {
          setCfg(prev => ({
            ...prev,
            epfEmployeePercent: d.epfEmployeePercent ?? prev.epfEmployeePercent,
            epfEmployerPercent: d.epfEmployerPercent ?? prev.epfEmployerPercent,
            etfEmployerPercent: d.etfEmployerPercent ?? prev.etfEmployerPercent,
            transportAllowance: d.transportAllowance ?? prev.transportAllowance,
            housingAllowanceLow: d.housingAllowanceLow ?? prev.housingAllowanceLow,
            otherAllowances: d.otherAllowances ?? prev.otherAllowances,
            lateDeductionPerInstance: d.lateDeductionPerInstance ?? prev.lateDeductionPerInstance,
            overtimeMultiplier: d.overtimeMultiplier ?? prev.overtimeMultiplier,
            salaryScale: d.salaryScale ?? prev.salaryScale,
            employeeOverrides: d.employeeOverrides ?? prev.employeeOverrides,
          }));
          /* Sync table rows from loaded config */
          setEarnings(e => e.map(row => {
            if (row.id === "transport") return { ...row, amount: d.transportAllowance ?? row.amount };
            if (row.id === "housing") return { ...row, amount: d.housingAllowanceLow ?? row.amount };
            if (row.id === "other") return { ...row, amount: d.otherAllowances ?? row.amount };
            return row;
          }));
          setDeductions(de => de.map(row => {
            if (row.id === "epf8") return { ...row, formula: `B * ${((d.epfEmployeePercent ?? 8) / 100).toFixed(2)}` };
            if (row.id === "epf12") return { ...row, formula: `B * ${((d.epfEmployerPercent ?? 12) / 100).toFixed(2)}` };
            if (row.id === "etf3") return { ...row, formula: `B * ${((d.etfEmployerPercent ?? 3) / 100).toFixed(2)}` };
            if (row.id === "late") return { ...row, amount: d.lateDeductionPerInstance ?? row.amount };
            return row;
          }));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true); setError(null);
    /* Derive config values from table rows */
    const epfRow = deductions.find(r => r.id === "epf8");
    const epf12Row = deductions.find(r => r.id === "epf12");
    const etfRow = deductions.find(r => r.id === "etf3");
    const lateRow = deductions.find(r => r.id === "late");
    const transportRow = earnings.find(r => r.id === "transport");
    const housingRow = earnings.find(r => r.id === "housing");
    const otherRow = earnings.find(r => r.id === "other");

    const payload = {
      ...cfg,
      transportAllowance: transportRow?.amount ?? cfg.transportAllowance,
      housingAllowanceLow: housingRow?.amount ?? cfg.housingAllowanceLow,
      otherAllowances: otherRow?.amount ?? cfg.otherAllowances,
      lateDeductionPerInstance: lateRow?.amount ?? cfg.lateDeductionPerInstance,
      epfEmployeePercent: epfRow ? parseFloat((epfRow.formula.split("*")[1] ?? "0.08").trim()) * 100 : cfg.epfEmployeePercent,
      epfEmployerPercent: epf12Row ? parseFloat((epf12Row.formula.split("*")[1] ?? "0.12").trim()) * 100 : cfg.epfEmployerPercent,
      etfEmployerPercent: etfRow ? parseFloat((etfRow.formula.split("*")[1] ?? "0.03").trim()) * 100 : cfg.etfEmployerPercent,
    };

    try {
      const r = await fetch(apiUrl("/payroll-settings"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (d.id) { setSaved(true); setTimeout(() => setSaved(false), 2500); }
      else setError(d.message || "Save failed");
    } catch { setError("Failed to save."); }
    setSaving(false);
  }

  function updateRow(list: SalaryComponent[], setList: React.Dispatch<React.SetStateAction<SalaryComponent[]>>, id: string, field: keyof SalaryComponent, value: any) {
    setList(list.map(r => r.id === id ? { ...r, [field]: value } : r));
  }

  function deleteRow(list: SalaryComponent[], setList: React.Dispatch<React.SetStateAction<SalaryComponent[]>>, id: string) {
    setList(list.filter(r => r.id !== id).map((r, i) => ({ ...r, no: i + 1 })));
  }

  function addRow(list: SalaryComponent[], setList: React.Dispatch<React.SetStateAction<SalaryComponent[]>>) {
    const newRow: SalaryComponent = {
      id: `row-${Date.now()}`, no: list.length + 1,
      component: "New Component", abbr: "NC", amount: 0,
      dependsOnPayroll: false, isTaxExempt: false, isAccrual: false,
      hasFormula: false, formula: "",
    };
    setList([...list, newRow]);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-2 text-muted-foreground">
        <RefreshCw className="w-5 h-5 animate-spin" />
        <span className="text-sm">Loading payroll settings…</span>
      </div>
    );
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: "details",  label: "Details" },
    { key: "earnings", label: "Earnings & Deductions" },
    { key: "account",  label: "Account" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Blue breadcrumb header */}
      <div className="bg-primary text-white px-6 py-3 flex items-center gap-1.5 text-sm">
        <span className="opacity-70">Payroll</span>
        <ChevronRight className="w-3.5 h-3.5 opacity-70" />
        <span className="opacity-70">Salary Structure</span>
        <ChevronRight className="w-3.5 h-3.5 opacity-70" />
        <span className="font-semibold">Drivethru</span>
        <span className="ml-3 px-2.5 py-0.5 text-xs font-semibold bg-white/20 rounded-full border border-white/30">
          Active
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 border border-white/30 rounded text-xs font-medium transition-colors"
          >
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            {saving ? "Saving…" : saved ? "Saved!" : "Save"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-6 flex items-center gap-0">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px",
              tab === key
                ? "border-gray-800 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="mx-6 mt-4 flex items-center gap-2 px-4 py-3 rounded text-sm bg-red-50 text-red-700 border border-red-200">
          <AlertTriangle className="w-4 h-4 shrink-0" />{error}
          <button onClick={() => setError(null)} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Tab: Details */}
      {tab === "details" && (
        <div className="p-6 space-y-4 max-w-2xl">
          <div className="bg-white border border-gray-200 rounded p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Structure Name</label>
                <input defaultValue="Drivethru" className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm outline-none focus:border-primary" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Company</label>
                <input defaultValue="Drivethru Post Office" className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm outline-none focus:border-primary" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Currency</label>
                <input defaultValue="LKR" className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm outline-none focus:border-primary" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Payroll Frequency</label>
                <select className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm outline-none focus:border-primary bg-white">
                  <option>Monthly</option>
                  <option>Bi-weekly</option>
                  <option>Weekly</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Earnings & Deductions */}
      {tab === "earnings" && (
        <div className="p-6 space-y-6">
          {/* Earnings */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Earnings</p>
            <ComponentTable
              rows={earnings}
              onUpdate={(id, field, value) => updateRow(earnings, setEarnings, id, field, value)}
              onDelete={(id) => deleteRow(earnings, setEarnings, id)}
              onAdd={() => addRow(earnings, setEarnings)}
              addLabel="Add Row"
            />
          </div>

          {/* Deductions */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Deductions</p>
            <ComponentTable
              rows={deductions}
              onUpdate={(id, field, value) => updateRow(deductions, setDeductions, id, field, value)}
              onDelete={(id) => deleteRow(deductions, setDeductions, id)}
              onAdd={() => addRow(deductions, setDeductions)}
              addLabel="Add Row"
            />
          </div>

          {/* Flexible Benefits */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-0.5">Flexible Benefits</p>
            <p className="text-xs text-gray-400 mb-2">Enter yearly benefit amounts</p>
            <div className="border border-gray-200 rounded overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="w-8 px-3 py-2">
                      <input type="checkbox" className="w-3.5 h-3.5 accent-primary" />
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 w-10">No.</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Earning Component <span className="text-red-500">*</span></th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Benefit Amount <span className="text-red-500">*</span></th>
                    <th className="px-3 py-2 w-10">
                      <Settings2 className="w-3.5 h-3.5 text-gray-400 mx-auto" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {benefits.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-4 text-center text-xs text-gray-400 italic">No flexible benefits configured</td>
                    </tr>
                  )}
                  {benefits.map((b, i) => (
                    <tr key={i} className="border-t border-gray-100 hover:bg-blue-50/30 group">
                      <td className="px-3 py-2.5 text-center"><input type="checkbox" className="w-3.5 h-3.5 accent-primary" /></td>
                      <td className="px-3 py-2.5 text-xs text-gray-400">{b.no}</td>
                      <td className="px-3 py-2.5 text-gray-700">{b.earningComponent}</td>
                      <td className="px-3 py-2.5 text-right text-gray-700">Rs {b.benefitAmount.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-center">
                        <button onClick={() => setBenefits(benefits.filter((_, j) => j !== i))}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500">
                          <X className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="border-t border-gray-100 px-3 py-2">
                <button
                  onClick={() => setBenefits([...benefits, { no: benefits.length + 1, earningComponent: "Basic", benefitAmount: 0 }])}
                  className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Row
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Account */}
      {tab === "account" && (
        <div className="p-6 max-w-2xl">
          <div className="bg-white border border-gray-200 rounded p-5 space-y-4">
            <p className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-3">Account Settings</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Mode of Payment</label>
                <select className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm outline-none focus:border-primary bg-white">
                  <option>Bank Transfer</option>
                  <option>Cash</option>
                  <option>Cheque</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Payment Account</label>
                <input defaultValue="Payroll Payable" className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm outline-none focus:border-primary" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
