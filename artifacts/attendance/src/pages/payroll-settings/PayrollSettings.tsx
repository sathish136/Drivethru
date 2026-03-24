import { useState, useEffect, useCallback } from "react";
import { PageHeader, Card, Button, Input, Label } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  Percent, DollarSign, Save, RefreshCw, Check,
  Edit2, X, Info, AlertTriangle, SlidersHorizontal, Users, ChevronRight,
  Search, UserCheck, Undo2, Plus, Trash2, FileText, LayoutList,
  ChevronLeft, Building2, CalendarDays, HelpCircle, Copy, ToggleLeft,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
function apiUrl(path: string) { return `${BASE}/api${path}`; }

/* ─── Salary Scale defaults ──────────────────────────────── */
const DEFAULT_SALARY_SCALE: Record<string, number> = {
  "Postmaster General": 150000, "Deputy Postmaster General": 120000,
  "Regional Postmaster": 80000, "Sub Postmaster": 60000,
  "Postal Supervisor": 55000, "Senior Postal Officer": 50000,
  "Postal Officer": 45000, "Counter Clerk": 40000,
  "Sorting Officer": 38000, "Delivery Agent": 35000,
  "Accounts Officer": 55000, "HR Officer": 50000, "IT Officer": 55000,
  "PSB Officer": 48000, "Driver": 38000, "Security Officer": 35000,
  "Clerical Assistant": 32000, "Data Entry Operator": 35000,
};

/* ─── Types ──────────────────────────────────────────────── */
interface PayrollConfig {
  epfEmployeePercent: number; epfEmployerPercent: number; etfEmployerPercent: number;
  transportAllowance: number;
  housingAllowanceLow: number; housingAllowanceMid: number; housingAllowanceHigh: number;
  housingMidThreshold: number; housingHighThreshold: number;
  otherAllowances: number; lateDeductionPerInstance: number; overtimeMultiplier: number;
  salaryScale: Record<string, number>; employeeOverrides: Record<string, number>;
}
const DEFAULTS: PayrollConfig = {
  epfEmployeePercent: 8, epfEmployerPercent: 12, etfEmployerPercent: 3,
  transportAllowance: 5000,
  housingAllowanceLow: 3000, housingAllowanceMid: 7000, housingAllowanceHigh: 10000,
  housingMidThreshold: 50000, housingHighThreshold: 80000,
  otherAllowances: 1500, lateDeductionPerInstance: 100, overtimeMultiplier: 1.5,
  salaryScale: { ...DEFAULT_SALARY_SCALE }, employeeOverrides: {},
};

interface Employee {
  id: number; employeeId: string; fullName: string;
  designation: string; department: string; employeeType: string; status: string;
}

/* ─── Salary Structure Types ─────────────────────────────── */
interface SalaryComponent {
  _id: string;
  component: string;
  abbr: string;
  amount: number;
  dependsOn: string;
  isTaxApplicable: boolean;
  amountBasedOn: string;
  formula: string;
}
interface VariablePayItem {
  _id: string;
  salaryComponent: string;
  amount: number;
}
interface SalaryStructure {
  id?: number;
  name: string;
  currency: string;
  status: "active" | "inactive";
  earnings: SalaryComponent[];
  deductions: SalaryComponent[];
  variablePay: VariablePayItem[];
  createdAt?: string;
}
interface Assignment {
  assignment: { id: number; employeeId: number; salaryStructureId: number; basicAmount: number; effectiveDate: string };
  employee: { id: number; employeeId: string; fullName: string; designation: string; department: string; status: string };
  structure: { id: number; name: string };
}

function uid() { return Math.random().toString(36).slice(2); }
function blankComponent(): SalaryComponent {
  return { _id: uid(), component: "", abbr: "", amount: 0, dependsOn: "", isTaxApplicable: false, amountBasedOn: "", formula: "" };
}
function blankVariablePay(): VariablePayItem { return { _id: uid(), salaryComponent: "", amount: 0 }; }

const STATUTORY_DEFS = [
  { component: "EPF – Employee", abbr: "EPF_EE", pct: 8,  formula: "basic * 0.08" },
  { component: "EPF – Employer", abbr: "EPF_ER", pct: 12, formula: "basic * 0.12" },
  { component: "ETF",            abbr: "ETF",    pct: 3,  formula: "basic * 0.03" },
];
const STATUTORY_NAMES = STATUTORY_DEFS.map(d => d.component);

function blankStructure(): SalaryStructure {
  return {
    name: "", currency: "LKR", status: "active",
    earnings: [{ _id: uid(), component: "Basic", abbr: "BA", amount: 0, dependsOn: "", isTaxApplicable: false, amountBasedOn: "Basic Salary", formula: "" }],
    deductions: STATUTORY_DEFS.map(d => ({ _id: uid(), component: d.component, abbr: d.abbr, amount: 0, dependsOn: "", isTaxApplicable: false, amountBasedOn: "Basic Salary", formula: d.formula })),
    variablePay: [],
  };
}

type MainTab = "general" | "fitment" | "structures";
const MAIN_TABS: { key: MainTab; label: string; icon: React.ElementType; desc: string }[] = [
  { key: "general",    label: "General Settings",    icon: SlidersHorizontal, desc: "EPF/ETF, allowances & deductions" },
  { key: "fitment",    label: "Employee Fitment",    icon: Users,             desc: "Direct salary assignments per employee" },
  { key: "structures", label: "Salary Structures",   icon: LayoutList,        desc: "Create & assign individual salary structures" },
];

type StructureFormTab = "details" | "components" | "assign";

/* ════════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════════ */
export default function PayrollSettings() {
  const [tab, setTab] = useState<MainTab>("general");

  /* ── General Settings state ── */
  const [cfg, setCfg] = useState<PayrollConfig>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ── Fitment state ── */
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [empsLoading, setEmpsLoading] = useState(false);
  const [empSearch, setEmpSearch] = useState("");
  const [editingEmpId, setEditingEmpId] = useState<number | null>(null);
  const [editEmpVal, setEditEmpVal] = useState("");

  /* ── Salary Structures state ── */
  const [structures, setStructures] = useState<SalaryStructure[]>([]);
  const [structsLoading, setStructsLoading] = useState(false);
  const [selectedStruct, setSelectedStruct] = useState<SalaryStructure | null>(null);
  const [isNewStruct, setIsNewStruct] = useState(false);
  const [structFormTab, setStructFormTab] = useState<StructureFormTab>("details");
  const [structSaving, setStructSaving] = useState(false);
  const [structError, setStructError] = useState<string | null>(null);
  const [structSearch, setStructSearch] = useState("");

  /* ── Assignments state ── */
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [assignSearch, setAssignSearch] = useState("");
  const [assigningEmpId, setAssigningEmpId] = useState<number | null>(null);
  const [assignBasic, setAssignBasic] = useState("");
  const [assignDate, setAssignDate] = useState(new Date().toISOString().slice(0, 10));
  const [assignSaving, setAssignSaving] = useState(false);

  /* ── Show formula help ── */
  const [showFormulaHelp, setShowFormulaHelp] = useState(false);

  /* ─── Load payroll settings ─── */
  useEffect(() => {
    setLoading(true);
    fetch(apiUrl("/payroll-settings"))
      .then(r => r.json())
      .then(d => {
        if (d.id) {
          setCfg({
            epfEmployeePercent: d.epfEmployeePercent, epfEmployerPercent: d.epfEmployerPercent,
            etfEmployerPercent: d.etfEmployerPercent, transportAllowance: d.transportAllowance,
            housingAllowanceLow: d.housingAllowanceLow, housingAllowanceMid: d.housingAllowanceMid,
            housingAllowanceHigh: d.housingAllowanceHigh, housingMidThreshold: d.housingMidThreshold,
            housingHighThreshold: d.housingHighThreshold, otherAllowances: d.otherAllowances,
            lateDeductionPerInstance: d.lateDeductionPerInstance, overtimeMultiplier: d.overtimeMultiplier,
            salaryScale: d.salaryScale && typeof d.salaryScale === "object" ? d.salaryScale : { ...DEFAULT_SALARY_SCALE },
            employeeOverrides: d.employeeOverrides && typeof d.employeeOverrides === "object" ? d.employeeOverrides : {},
          });
        }
      })
      .catch(() => setError("Failed to load payroll settings"))
      .finally(() => setLoading(false));
  }, []);

  /* ─── Load employees for fitment ─── */
  useEffect(() => {
    if (tab !== "fitment" || employees.length > 0) return;
    setEmpsLoading(true);
    fetch(apiUrl("/employees"))
      .then(r => r.json())
      .then(d => setEmployees((d.employees ?? (Array.isArray(d) ? d : [])).filter((e: Employee) => e.status === "active")))
      .catch(() => setError("Failed to load employees"))
      .finally(() => setEmpsLoading(false));
  }, [tab]);

  /* ─── Load salary structures ─── */
  const loadStructures = useCallback(() => {
    setStructsLoading(true);
    fetch(apiUrl("/salary-structures"))
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) {
          setStructures(d.map(s => ({
            ...s,
            earnings: (s.earnings || []).map((e: any) => ({ _id: uid(), ...e })),
            deductions: (s.deductions || []).map((e: any) => ({ _id: uid(), ...e })),
            variablePay: (s.variablePay || []).map((v: any) => ({ _id: uid(), ...v })),
          })));
        }
      })
      .catch(() => setStructError("Failed to load salary structures"))
      .finally(() => setStructsLoading(false));
  }, []);

  useEffect(() => { if (tab === "structures") loadStructures(); }, [tab]);

  /* ─── Load assignments ─── */
  const loadAssignments = useCallback(() => {
    fetch(apiUrl("/salary-structures/assignments/all"))
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setAssignments(d); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (structFormTab === "assign" && selectedStruct?.id) {
      loadAssignments();
      if (allEmployees.length === 0) {
        fetch(apiUrl("/employees"))
          .then(r => r.json())
          .then(d => setAllEmployees((d.employees ?? (Array.isArray(d) ? d : [])).filter((e: Employee) => e.status === "active")))
          .catch(() => {});
      }
    }
  }, [structFormTab, selectedStruct?.id]);

  /* ─── General helpers ─── */
  function set(k: keyof PayrollConfig, v: any) { setCfg(s => ({ ...s, [k]: v })); }

  async function save() {
    setSaving(true); setError(null);
    try {
      const r = await fetch(apiUrl("/payroll-settings"), {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cfg),
      });
      const d = await r.json();
      if (d.id) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
      else setError(d.message || "Save failed");
    } catch { setError("Failed to save. Check server connection."); }
    setSaving(false);
  }

  function startEditEmp(emp: Employee) {
    setEditingEmpId(emp.id);
    setEditEmpVal(String(cfg.employeeOverrides[String(emp.id)] ?? cfg.salaryScale[emp.designation] ?? 40000));
  }
  function confirmEmpOverride(empId: number) {
    const v = parseInt(editEmpVal);
    if (!isNaN(v) && v > 0) setCfg(s => ({ ...s, employeeOverrides: { ...s.employeeOverrides, [String(empId)]: v } }));
    setEditingEmpId(null);
  }
  function clearEmpOverride(empId: number) {
    setCfg(s => { const next = { ...s.employeeOverrides }; delete next[String(empId)]; return { ...s, employeeOverrides: next }; });
    if (editingEmpId === empId) setEditingEmpId(null);
  }
  const filteredEmps = employees.filter(e =>
    `${e.fullName} ${e.employeeId} ${e.designation} ${e.department}`.toLowerCase().includes(empSearch.toLowerCase())
  );
  const overrideCount = Object.keys(cfg.employeeOverrides).length;

  /* ─── Salary Structure helpers ─── */
  function openNewStruct() {
    setSelectedStruct(blankStructure());
    setIsNewStruct(true);
    setStructFormTab("details");
    setStructError(null);
  }
  function openEditStruct(s: SalaryStructure) {
    setSelectedStruct({ ...s });
    setIsNewStruct(false);
    setStructFormTab("details");
    setStructError(null);
  }
  function closeStruct() { setSelectedStruct(null); setIsNewStruct(false); setStructError(null); setShowFormulaHelp(false); }

  function updateStruct(patch: Partial<SalaryStructure>) {
    setSelectedStruct(s => s ? { ...s, ...patch } : null);
  }

  /* Earnings / Deductions row helpers */
  function addEarning() { updateStruct({ earnings: [...(selectedStruct?.earnings ?? []), blankComponent()] }); }
  function removeEarning(id: string) { updateStruct({ earnings: selectedStruct?.earnings.filter(e => e._id !== id) ?? [] }); }
  function updateEarning(id: string, patch: Partial<SalaryComponent>) {
    updateStruct({ earnings: selectedStruct?.earnings.map(e => e._id === id ? { ...e, ...patch } : e) ?? [] });
  }
  function addDeduction() { updateStruct({ deductions: [...(selectedStruct?.deductions ?? []), blankComponent()] }); }
  function removeDeduction(id: string) { updateStruct({ deductions: selectedStruct?.deductions.filter(e => e._id !== id) ?? [] }); }
  function updateDeduction(id: string, patch: Partial<SalaryComponent>) {
    updateStruct({ deductions: selectedStruct?.deductions.map(e => e._id === id ? { ...e, ...patch } : e) ?? [] });
  }
  function addVariablePay() { updateStruct({ variablePay: [...(selectedStruct?.variablePay ?? []), blankVariablePay()] }); }
  function removeVariablePay(id: string) { updateStruct({ variablePay: selectedStruct?.variablePay.filter(v => v._id !== id) ?? [] }); }
  function updateVariablePay(id: string, patch: Partial<VariablePayItem>) {
    updateStruct({ variablePay: selectedStruct?.variablePay.map(v => v._id === id ? { ...v, ...patch } : v) ?? [] });
  }

  async function saveStructure() {
    if (!selectedStruct) return;
    if (!selectedStruct.name.trim()) { setStructError("Structure name is required."); return; }
    setStructSaving(true); setStructError(null);
    const body = {
      name: selectedStruct.name.trim(),
      currency: selectedStruct.currency,
      status: selectedStruct.status,
      earnings: selectedStruct.earnings.map(({ _id, ...rest }) => rest),
      deductions: selectedStruct.deductions.map(({ _id, ...rest }) => rest),
      variablePay: selectedStruct.variablePay.map(({ _id, ...rest }) => rest),
    };
    try {
      const url = isNewStruct ? apiUrl("/salary-structures") : apiUrl(`/salary-structures/${selectedStruct.id}`);
      const method = isNewStruct ? "POST" : "PUT";
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json();
      if (d.id) {
        const updated = {
          ...d,
          earnings: (d.earnings || []).map((e: any) => ({ _id: uid(), ...e })),
          deductions: (d.deductions || []).map((e: any) => ({ _id: uid(), ...e })),
          variablePay: (d.variablePay || []).map((v: any) => ({ _id: uid(), ...v })),
        };
        setSelectedStruct(updated);
        setIsNewStruct(false);
        loadStructures();
      } else setStructError(d.message || "Save failed");
    } catch { setStructError("Failed to save structure."); }
    setStructSaving(false);
  }

  async function deleteStructure(id: number) {
    if (!confirm("Delete this salary structure? This cannot be undone.")) return;
    try {
      await fetch(apiUrl(`/salary-structures/${id}`), { method: "DELETE" });
      if (selectedStruct?.id === id) closeStruct();
      loadStructures();
    } catch { setStructError("Failed to delete structure."); }
  }

  /* ─── Assignment helpers ─── */
  const currentStructAssignments = assignments.filter(a => a.structure.id === selectedStruct?.id);
  const assignedEmpIds = new Set(currentStructAssignments.map(a => a.employee.id));

  function startAssign(empId: number) {
    setAssigningEmpId(empId);
    const existing = currentStructAssignments.find(a => a.employee.id === empId);
    setAssignBasic(String(existing?.assignment.basicAmount ?? ""));
    setAssignDate(existing?.assignment.effectiveDate ?? new Date().toISOString().slice(0, 10));
  }

  async function confirmAssign(empId: number) {
    if (!selectedStruct?.id) return;
    setAssignSaving(true);
    const basicAmt = parseFloat(assignBasic) || 0;
    const today = assignDate || new Date().toISOString().slice(0, 10);
    try {
      await fetch(apiUrl("/salary-structures/assignments"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: empId,
          salaryStructureId: selectedStruct.id,
          basicAmount: basicAmt,
          effectiveDate: today,
        }),
      });
      loadAssignments();
      setAssigningEmpId(null);
    } catch { setStructError("Failed to assign structure."); }
    setAssignSaving(false);
  }

  async function removeAssignment(empId: number) {
    try {
      await fetch(apiUrl(`/salary-structures/assignments/${empId}`), { method: "DELETE" });
      loadAssignments();
    } catch { setStructError("Failed to remove assignment."); }
  }

  const filteredAssignEmps = allEmployees.filter(e =>
    `${e.fullName} ${e.employeeId} ${e.designation}`.toLowerCase().includes(assignSearch.toLowerCase())
  );

  /* ─── Loading state ─── */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-2 text-muted-foreground">
        <RefreshCw className="w-5 h-5 animate-spin" />
        <span className="text-sm">Loading payroll settings…</span>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-6xl">
      <PageHeader
        title="Payroll Settings"
        description="Configure salary structures, statutory contributions, allowances, and per-employee assignments"
      />

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm bg-red-50 text-red-700 border border-red-200">
          <AlertTriangle className="w-4 h-4 shrink-0" />{error}
          <button onClick={() => setError(null)} className="ml-auto p-0.5 rounded hover:bg-red-100"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* ── Main Tab Nav ── */}
      <div className="flex gap-1 p-1 bg-muted/50 rounded-xl border border-border w-fit">
        {MAIN_TABS.map(({ key, label, icon: Icon, desc }) => (
          <button key={key} onClick={() => setTab(key)}
            className={cn(
              "flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
              tab === key ? "bg-white shadow-sm text-foreground border border-border" : "text-muted-foreground hover:text-foreground hover:bg-white/60"
            )}>
            <Icon className={cn("w-4 h-4", tab === key ? "text-primary" : "text-muted-foreground")} />
            <span>{label}</span>
            {key === "fitment" && overrideCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-primary/10 text-primary rounded-full">{overrideCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════
          GENERAL SETTINGS TAB
      ══════════════════════════════════════════ */}
      {tab === "general" && (
        <div className="space-y-4">
          {/* Statutory Contributions */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-5 pb-3 border-b border-border">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <Percent className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-bold">Statutory Deductions & Contributions</p>
                <p className="text-xs text-muted-foreground">Applied automatically during payroll calculation</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                { key: "epfEmployeePercent", label: "EPF — Employee Contribution", hint: "Deducted from employee gross salary" },
                { key: "epfEmployerPercent", label: "EPF — Employer Contribution", hint: "Employer cost, not deducted from employee" },
                { key: "etfEmployerPercent", label: "ETF — Employer Contribution", hint: "Employees Trust Fund contribution" },
              ].map(({ key, label, hint }) => (
                <div key={key}>
                  <Label className="text-xs font-semibold">{label}</Label>
                  <div className="relative mt-1.5">
                    <Input type="number" step="0.01" min="0" max="100"
                      value={(cfg as any)[key]} onChange={e => set(key as keyof PayrollConfig, parseFloat(e.target.value))}
                      className="pr-8" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">%</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">{hint}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-700">
                <strong>APIT (income tax)</strong> is automatically calculated using Sri Lanka IRD progressive slabs (6%–30%) and cannot be manually configured.
              </p>
            </div>
          </Card>

          {/* Earnings & Allowances */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-5 pb-3 border-b border-border">
              <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-bold">Earnings & Allowances</p>
                <p className="text-xs text-muted-foreground">Fixed monthly amounts added on top of basic salary</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <Label className="text-xs font-semibold">Transport Allowance (Rs.)</Label>
                <Input type="number" min="0" value={cfg.transportAllowance}
                  onChange={e => set("transportAllowance", parseInt(e.target.value))} className="mt-1.5" />
                <p className="text-[10px] text-muted-foreground mt-1">Same fixed amount for all employees</p>
              </div>
              <div>
                <Label className="text-xs font-semibold">Other Allowances (Rs.)</Label>
                <Input type="number" min="0" value={cfg.otherAllowances}
                  onChange={e => set("otherAllowances", parseInt(e.target.value))} className="mt-1.5" />
                <p className="text-[10px] text-muted-foreground mt-1">Miscellaneous fixed allowances</p>
              </div>
              <div>
                <Label className="text-xs font-semibold">Overtime Rate Multiplier</Label>
                <Input type="number" step="0.1" min="1" max="5" value={cfg.overtimeMultiplier}
                  onChange={e => set("overtimeMultiplier", parseFloat(e.target.value))} className="mt-1.5" />
                <p className="text-[10px] text-muted-foreground mt-1">e.g. 1.5× = 1.5× hourly rate per OT hour</p>
              </div>
            </div>
            <div className="mt-5">
              <p className="text-xs font-semibold mb-1">Housing Allowance — Salary-Based Tiers</p>
              <p className="text-[10px] text-muted-foreground mb-3">Each employee is placed in a tier based on their basic salary.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border border-border rounded-xl p-4 bg-muted/20">
                  <p className="text-xs font-bold text-muted-foreground mb-3 uppercase tracking-wide">Low Tier</p>
                  <Label className="text-[10px]">Allowance Amount (Rs.)</Label>
                  <Input type="number" min="0" value={cfg.housingAllowanceLow}
                    onChange={e => set("housingAllowanceLow", parseInt(e.target.value))} className="mt-1 h-8 text-sm" />
                  <p className="text-[10px] text-muted-foreground mt-2">For basic below Rs. {cfg.housingMidThreshold.toLocaleString()}</p>
                </div>
                <div className="border border-blue-200 rounded-xl p-4 bg-blue-50/30">
                  <p className="text-xs font-bold text-blue-600 mb-3 uppercase tracking-wide">Mid Tier</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label className="text-[10px]">Allowance (Rs.)</Label>
                      <Input type="number" min="0" value={cfg.housingAllowanceMid}
                        onChange={e => set("housingAllowanceMid", parseInt(e.target.value))} className="mt-1 h-8 text-sm" /></div>
                    <div><Label className="text-[10px]">Min. Basic (Rs.)</Label>
                      <Input type="number" min="0" value={cfg.housingMidThreshold}
                        onChange={e => set("housingMidThreshold", parseInt(e.target.value))} className="mt-1 h-8 text-sm" /></div>
                  </div>
                </div>
                <div className="border border-amber-200 rounded-xl p-4 bg-amber-50/30">
                  <p className="text-xs font-bold text-amber-600 mb-3 uppercase tracking-wide">High Tier</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label className="text-[10px]">Allowance (Rs.)</Label>
                      <Input type="number" min="0" value={cfg.housingAllowanceHigh}
                        onChange={e => set("housingAllowanceHigh", parseInt(e.target.value))} className="mt-1 h-8 text-sm" /></div>
                    <div><Label className="text-[10px]">Min. Basic (Rs.)</Label>
                      <Input type="number" min="0" value={cfg.housingHighThreshold}
                        onChange={e => set("housingHighThreshold", parseInt(e.target.value))} className="mt-1 h-8 text-sm" /></div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Deduction Rules */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-5 pb-3 border-b border-border">
              <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                <X className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-bold">Deduction Rules</p>
                <p className="text-xs text-muted-foreground">Rules applied for attendance violations</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <Label className="text-xs font-semibold">Late Arrival Deduction (Rs. per instance)</Label>
                <Input type="number" min="0" value={cfg.lateDeductionPerInstance}
                  onChange={e => set("lateDeductionPerInstance", parseInt(e.target.value))} className="mt-1.5" />
                <p className="text-[10px] text-muted-foreground mt-1">Deducted once for each late-arrival record in the month</p>
              </div>
              <div className="p-4 rounded-xl bg-muted/30 border border-border">
                <p className="text-xs font-semibold mb-2">Auto-Calculated Deductions</p>
                <ul className="space-y-1.5 text-[11px] text-muted-foreground">
                  <li><strong className="text-foreground">Absence:</strong> (Basic ÷ Working Days) × Absent Days</li>
                  <li><strong className="text-foreground">Half-day:</strong> (Daily Rate ÷ 2) × Half-day Count</li>
                </ul>
                <p className="text-[10px] text-blue-600 mt-2">Derived from attendance data, not configurable.</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════════
          EMPLOYEE FITMENT TAB
      ══════════════════════════════════════════ */}
      {tab === "fitment" && (
        <div className="space-y-4">
          <Card className="p-4 bg-blue-50/40 border-blue-200">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                <UserCheck className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-blue-900">Employee Salary Fitment</p>
                <p className="text-xs text-blue-700 mt-0.5">
                  Assign a custom basic salary directly to specific employees. This overrides the designation-based salary scale for that employee during payroll generation.
                </p>
              </div>
            </div>
          </Card>

          {overrideCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20 text-xs text-primary font-medium">
              <UserCheck className="w-3.5 h-3.5" />
              {overrideCount} employee{overrideCount > 1 ? "s have" : " has"} a custom salary fitment applied
            </div>
          )}

          <Card className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search by name, ID, designation or department…" value={empSearch}
                  onChange={e => setEmpSearch(e.target.value)} className="pl-9" />
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {filteredEmps.length} of {employees.length} employees
              </span>
            </div>
            {empsLoading ? (
              <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
                <RefreshCw className="w-4 h-4 animate-spin" /><span className="text-sm">Loading employees…</span>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Employee</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Designation</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Scale Salary</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Fitment Salary</th>
                      <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground w-28">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredEmps.map(emp => {
                      const scaleSalary = cfg.salaryScale[emp.designation] ?? 40000;
                      const overrideSalary = cfg.employeeOverrides[String(emp.id)];
                      const hasOverride = overrideSalary !== undefined;
                      const isEditing = editingEmpId === emp.id;
                      return (
                        <tr key={emp.id} className={cn("transition-colors group", hasOverride ? "bg-primary/3 hover:bg-primary/5" : "hover:bg-muted/30")}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                                <span className="text-[10px] font-bold text-muted-foreground">
                                  {emp.fullName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium text-sm leading-tight">{emp.fullName}</p>
                                <p className="text-[10px] text-muted-foreground">{emp.employeeId}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm">{emp.designation}</p>
                            <p className="text-[10px] text-muted-foreground">{emp.department}</p>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-sm text-muted-foreground">Rs. {scaleSalary.toLocaleString("en-LK")}</td>
                          <td className="px-4 py-3 text-right">
                            {isEditing ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <Input type="number" value={editEmpVal} onChange={e => setEditEmpVal(e.target.value)}
                                  onKeyDown={e => { if (e.key === "Enter") confirmEmpOverride(emp.id); if (e.key === "Escape") setEditingEmpId(null); }}
                                  className="h-7 w-32 text-right text-sm font-mono" autoFocus />
                                <button onClick={() => confirmEmpOverride(emp.id)} className="p-1 rounded bg-green-100 text-green-700 hover:bg-green-200"><Check className="w-3.5 h-3.5" /></button>
                                <button onClick={() => setEditingEmpId(null)} className="p-1 rounded hover:bg-muted text-muted-foreground"><X className="w-3.5 h-3.5" /></button>
                              </div>
                            ) : hasOverride ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <span className="font-mono font-bold text-sm text-primary">Rs. {overrideSalary.toLocaleString("en-LK")}</span>
                                <span className="px-1.5 py-0.5 text-[9px] font-bold bg-primary/10 text-primary rounded-full uppercase tracking-wide">Fitment</span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">— using scale default —</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {!isEditing && (
                              <div className="flex items-center justify-center gap-1">
                                <button onClick={() => startEditEmp(emp)} title={hasOverride ? "Edit fitment" : "Set fitment"}
                                  className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                {hasOverride && (
                                  <button onClick={() => clearEmpOverride(emp.id)} title="Remove fitment"
                                    className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-muted-foreground hover:text-red-600">
                                    <Undo2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {filteredEmps.length === 0 && (
                      <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground text-sm">No employees match your search</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════════
          SALARY STRUCTURES TAB
      ══════════════════════════════════════════ */}
      {tab === "structures" && !selectedStruct && (
        <div className="space-y-4">
          {/* Info banner */}
          <Card className="p-4 bg-violet-50/40 border-violet-200">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                <LayoutList className="w-4 h-4 text-violet-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-violet-900">Salary Structures</p>
                <p className="text-xs text-violet-700 mt-0.5">
                  Create individual salary structures with custom earnings, deductions, and variable pay components. Each employee can be assigned their own unique structure with a specific basic amount.
                </p>
              </div>
              <Button onClick={openNewStruct} className="flex items-center gap-2 shrink-0">
                <Plus className="w-4 h-4" /> New Structure
              </Button>
            </div>
          </Card>

          {structError && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm bg-red-50 text-red-700 border border-red-200">
              <AlertTriangle className="w-4 h-4 shrink-0" />{structError}
              <button onClick={() => setStructError(null)} className="ml-auto p-0.5 rounded hover:bg-red-100"><X className="w-3.5 h-3.5" /></button>
            </div>
          )}

          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search structures…" value={structSearch} onChange={e => setStructSearch(e.target.value)} className="pl-9" />
          </div>

          {structsLoading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
              <RefreshCw className="w-5 h-5 animate-spin" /><span>Loading structures…</span>
            </div>
          ) : structures.length === 0 ? (
            <Card className="p-12 text-center">
              <LayoutList className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No salary structures yet</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">Create your first structure to define earnings and deductions for employees.</p>
              <Button onClick={openNewStruct} variant="outline" className="gap-2"><Plus className="w-4 h-4" /> Create First Structure</Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {structures
                .filter(s => s.name.toLowerCase().includes(structSearch.toLowerCase()))
                .map(s => {
                  const empCount = assignments.filter(a => a.structure.id === s.id).length;
                  return (
                    <Card key={s.id} className="p-4 hover:border-primary/40 transition-colors cursor-pointer group" onClick={() => openEditStruct(s)}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                            <FileText className="w-4.5 h-4.5 text-violet-600" />
                          </div>
                          <div>
                            <p className="text-sm font-bold leading-tight">{s.name}</p>
                            <p className="text-[10px] text-muted-foreground">{s.currency}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide",
                            s.status === "active" ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground")}>
                            {s.status}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                        <span className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5 text-green-500" />{s.earnings.length} earnings</span>
                        <span className="flex items-center gap-1"><X className="w-3.5 h-3.5 text-red-400" />{s.deductions.length} deductions</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="w-3.5 h-3.5" />{empCount} employee{empCount !== 1 ? "s" : ""} assigned
                        </span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={e => { e.stopPropagation(); openEditStruct(s); }}
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={e => { e.stopPropagation(); deleteStructure(s.id!); }}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════
          SALARY STRUCTURE FORM (Edit / Create)
      ══════════════════════════════════════════ */}
      {tab === "structures" && selectedStruct && (
        <div className="space-y-4">
          {/* Back + title */}
          <div className="flex items-center gap-3">
            <button onClick={closeStruct} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft className="w-4 h-4" /> Back to Structures
            </button>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold">{isNewStruct ? "New Salary Structure" : selectedStruct.name}</span>
            {!isNewStruct && (
              <span className={cn("ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide",
                selectedStruct.status === "active" ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground")}>
                {selectedStruct.status}
              </span>
            )}
          </div>

          {structError && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm bg-red-50 text-red-700 border border-red-200">
              <AlertTriangle className="w-4 h-4 shrink-0" />{structError}
              <button onClick={() => setStructError(null)} className="ml-auto p-0.5 rounded hover:bg-red-100"><X className="w-3.5 h-3.5" /></button>
            </div>
          )}

          {/* Sub-tab nav */}
          <div className="flex gap-0 border-b border-border">
            {([
              { key: "details" as const,    label: "Details",            icon: FileText },
              { key: "components" as const, label: "Earnings & Deductions", icon: DollarSign },
              { key: "assign" as const,     label: "Assign to Employee", icon: Users, disabled: isNewStruct },
            ]).map(({ key, label, icon: Icon, disabled }) => (
              <button key={key} disabled={!!disabled}
                onClick={() => !disabled && setStructFormTab(key)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px",
                  structFormTab === key
                    ? "border-primary text-primary"
                    : disabled
                    ? "border-transparent text-muted-foreground/40 cursor-not-allowed"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                )}>
                <Icon className="w-4 h-4" />{label}
                {key === "assign" && isNewStruct && <span className="text-[10px] text-muted-foreground/60">(save first)</span>}
              </button>
            ))}
          </div>

          {/* ── Details ── */}
          {structFormTab === "details" && (
            <Card className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="md:col-span-2">
                  <Label className="text-xs font-semibold">Structure Name <span className="text-red-500">*</span></Label>
                  <Input value={selectedStruct.name} onChange={e => updateStruct({ name: e.target.value })}
                    placeholder="e.g. Grade A Officer Structure" className="mt-1.5" />
                  <p className="text-[10px] text-muted-foreground mt-1">A descriptive name to identify this salary structure</p>
                </div>
                <div>
                  <Label className="text-xs font-semibold">Currency</Label>
                  <select value={selectedStruct.currency} onChange={e => updateStruct({ currency: e.target.value })}
                    className="mt-1.5 w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="LKR">LKR — Sri Lankan Rupee</option>
                    <option value="USD">USD — US Dollar</option>
                    <option value="EUR">EUR — Euro</option>
                    <option value="GBP">GBP — British Pound</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs font-semibold">Status</Label>
                  <div className="mt-2 flex items-center gap-3">
                    {(["active", "inactive"] as const).map(s => (
                      <label key={s} className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="status" value={s} checked={selectedStruct.status === s}
                          onChange={() => updateStruct({ status: s })} className="accent-primary" />
                        <span className={cn("text-sm capitalize", selectedStruct.status === s ? "font-medium" : "text-muted-foreground")}>{s}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* ── Earnings & Deductions ── */}
          {structFormTab === "components" && (() => {
            const statutory = selectedStruct.deductions.filter(d => STATUTORY_NAMES.includes(d.component));
            const others    = selectedStruct.deductions.filter(d => !STATUTORY_NAMES.includes(d.component));
            const basicAmt  = selectedStruct.earnings.find(e => e.component === "Basic")?.amount ?? selectedStruct.earnings[0]?.amount ?? 0;
            return (
              <div className="space-y-5">

                {/* ─ Earnings ─ */}
                <Card className="overflow-hidden">
                  <div className="flex items-center gap-2 px-5 py-3 border-b border-border bg-green-50/40">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-bold text-green-900">Earnings</span>
                    <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full">{selectedStruct.earnings.length}</span>
                  </div>
                  <div className="divide-y divide-border">
                    {selectedStruct.earnings.map((row, idx) => (
                      <div key={row._id} className="flex items-center gap-3 px-4 py-2.5">
                        <span className="text-xs text-muted-foreground w-5 shrink-0">{idx + 1}</span>
                        <Input
                          value={row.component}
                          onChange={e => updateEarning(row._id, { component: e.target.value })}
                          placeholder="Component name (e.g. Basic)"
                          className="h-8 text-sm flex-1"
                        />
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground shrink-0">{selectedStruct.currency}</span>
                          <Input
                            type="number" min="0"
                            value={row.amount}
                            onChange={e => updateEarning(row._id, { amount: parseFloat(e.target.value) || 0 })}
                            className="h-8 text-sm text-right w-32"
                          />
                        </div>
                        <button onClick={() => removeEarning(row._id)} className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    {selectedStruct.earnings.length === 0 && (
                      <div className="px-4 py-8 text-center text-sm text-muted-foreground">No earnings added. Click "Add Earning" below.</div>
                    )}
                  </div>
                  <div className="px-5 py-3 border-t border-border">
                    <button onClick={addEarning} className="flex items-center gap-2 text-sm text-primary font-medium hover:underline">
                      <Plus className="w-4 h-4" /> Add Earning
                    </button>
                  </div>
                </Card>

                {/* ─ Deductions ─ */}
                <Card className="overflow-hidden">
                  <div className="flex items-center gap-2 px-5 py-3 border-b border-border bg-red-50/40">
                    <X className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-bold text-red-900">Deductions</span>
                    <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-full">{selectedStruct.deductions.length}</span>
                  </div>

                  {/* Statutory rows */}
                  <div className="px-4 py-1.5 bg-muted/30 border-b border-border">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Statutory (Fixed)</span>
                  </div>
                  <div className="divide-y divide-border">
                    {STATUTORY_DEFS.map((def, idx) => {
                      const existing = statutory.find(d => d.component === def.component);
                      const computed = +(basicAmt * def.pct / 100).toFixed(2);
                      return (
                        <div key={def.component} className="flex items-center gap-3 px-4 py-3">
                          <span className="text-xs text-muted-foreground w-5 shrink-0">{idx + 1}</span>
                          <span className="text-sm font-medium flex-1">{def.component}</span>
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full shrink-0">{def.pct}%</span>
                          <div className="flex items-center gap-1.5 w-44 justify-end">
                            <span className="text-xs text-muted-foreground">{selectedStruct.currency}</span>
                            <span className="text-sm font-mono text-muted-foreground w-24 text-right">
                              {basicAmt > 0 ? computed.toLocaleString() : "—"}
                            </span>
                          </div>
                          <div className="w-7 shrink-0" />
                        </div>
                      );
                    })}
                  </div>

                  {/* Other deductions */}
                  <div className="px-4 py-1.5 bg-muted/30 border-t border-b border-border">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Other Deductions</span>
                  </div>
                  <div className="divide-y divide-border">
                    {others.map((row, idx) => (
                      <div key={row._id} className="flex items-center gap-3 px-4 py-2.5">
                        <span className="text-xs text-muted-foreground w-5 shrink-0">{idx + 1}</span>
                        <Input
                          value={row.component}
                          onChange={e => updateDeduction(row._id, { component: e.target.value })}
                          placeholder="Deduction name (e.g. Loan)"
                          className="h-8 text-sm flex-1"
                        />
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground shrink-0">{selectedStruct.currency}</span>
                          <Input
                            type="number" min="0"
                            value={row.amount}
                            onChange={e => updateDeduction(row._id, { amount: parseFloat(e.target.value) || 0 })}
                            className="h-8 text-sm text-right w-32"
                          />
                        </div>
                        <button onClick={() => removeDeduction(row._id)} className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    {others.length === 0 && (
                      <div className="px-4 py-6 text-center text-sm text-muted-foreground">No other deductions. Click "Add Deduction" to add one.</div>
                    )}
                  </div>
                  <div className="px-5 py-3 border-t border-border">
                    <button onClick={addDeduction} className="flex items-center gap-2 text-sm text-primary font-medium hover:underline">
                      <Plus className="w-4 h-4" /> Add Deduction
                    </button>
                  </div>
                </Card>

              </div>
            );
          })()}

          {/* ── Assign to Employee ── */}
          {structFormTab === "assign" && selectedStruct?.id && (
            <div className="space-y-4">
              <Card className="p-4 bg-violet-50/40 border-violet-200">
                <div className="flex items-start gap-2">
                  <Users className="w-4 h-4 text-violet-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-violet-700">
                    Assign this salary structure to individual employees. Each assignment can have a custom basic amount and effective date.
                    An employee can only be assigned to one salary structure at a time.
                  </p>
                </div>
              </Card>

              {currentStructAssignments.length > 0 && (
                <Card className="p-4">
                  <p className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
                    Currently Assigned ({currentStructAssignments.length})
                  </p>
                  <div className="space-y-2">
                    {currentStructAssignments.map(a => (
                      <div key={a.assignment.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                            <span className="text-[10px] font-bold text-violet-700">
                              {a.employee.fullName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium">{a.employee.fullName}</p>
                            <p className="text-[10px] text-muted-foreground">{a.employee.employeeId} · {a.employee.designation}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-xs font-mono font-bold">{selectedStruct.currency} {a.assignment.basicAmount.toLocaleString()}</p>
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1 justify-end">
                              <CalendarDays className="w-3 h-3" />{a.assignment.effectiveDate}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <button onClick={() => startAssign(a.employee.id)} title="Edit assignment"
                              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => removeAssignment(a.employee.id)} title="Remove assignment"
                              className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              <Card className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Search employees to assign…" value={assignSearch}
                      onChange={e => setAssignSearch(e.target.value)} className="pl-9" />
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {filteredAssignEmps.length} employees
                  </span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50 border-b border-border">
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Employee</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Designation</th>
                        <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">Status</th>
                        <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground w-40">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredAssignEmps.map(emp => {
                        const isAssigned = assignedEmpIds.has(emp.id);
                        const isAssigning = assigningEmpId === emp.id;
                        return (
                          <tr key={emp.id} className={cn("transition-colors", isAssigned ? "bg-violet-50/30" : "hover:bg-muted/20")}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                                  <span className="text-[10px] font-bold text-muted-foreground">
                                    {emp.fullName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                                  </span>
                                </div>
                                <div>
                                  <p className="font-medium text-sm">{emp.fullName}</p>
                                  <p className="text-[10px] text-muted-foreground">{emp.employeeId}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-sm">{emp.designation}</p>
                              <p className="text-[10px] text-muted-foreground">{emp.department}</p>
                            </td>
                            <td className="px-4 py-3 text-center">
                              {isAssigned
                                ? <span className="px-2 py-0.5 bg-violet-100 text-violet-700 text-[10px] font-bold rounded-full">Assigned</span>
                                : <span className="px-2 py-0.5 bg-muted text-muted-foreground text-[10px] rounded-full">Not Assigned</span>
                              }
                            </td>
                            <td className="px-4 py-3">
                              {isAssigning ? (
                                <div className="flex flex-col gap-1.5">
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="number"
                                      min="0"
                                      placeholder="Basic salary (LKR)"
                                      value={assignBasic}
                                      onChange={e => setAssignBasic(e.target.value)}
                                      className="h-7 w-36 rounded border border-border px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                                      autoFocus
                                    />
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <button onClick={() => confirmAssign(emp.id)} disabled={assignSaving || !assignBasic}
                                      className="flex items-center gap-1 px-2 py-1 rounded bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50">
                                      {assignSaving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Confirm
                                    </button>
                                    <button onClick={() => setAssigningEmpId(null)}
                                      className="px-2 py-1 rounded bg-muted text-muted-foreground text-xs hover:bg-muted/80">
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center gap-1">
                                  <button onClick={() => startAssign(emp.id)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border hover:bg-muted transition-colors">
                                    {isAssigned ? <><Edit2 className="w-3 h-3" /> Edit</> : <><Plus className="w-3 h-3" /> Assign</>}
                                  </button>
                                  {isAssigned && (
                                    <button onClick={() => removeAssignment(emp.id)}
                                      className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 border border-border transition-colors">
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {filteredAssignEmps.length === 0 && (
                        <tr><td colSpan={4} className="px-4 py-10 text-center text-sm text-muted-foreground">No employees found</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* ── Form Save Bar ── */}
          <div className="flex items-center justify-between py-2 sticky bottom-0 bg-background/90 backdrop-blur border-t border-border mt-4 pt-4">
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={closeStruct}>Cancel</Button>
              {!isNewStruct && (
                <button onClick={() => deleteStructure(selectedStruct.id!)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200">
                  <Trash2 className="w-4 h-4" /> Delete Structure
                </button>
              )}
            </div>
            <Button onClick={saveStructure} disabled={structSaving} className="flex items-center gap-2">
              {structSaving ? <><RefreshCw className="w-4 h-4 animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> {isNewStruct ? "Create Structure" : "Save Changes"}</>}
            </Button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          GLOBAL SAVE BAR (General + Fitment)
      ══════════════════════════════════════════ */}
      {(tab === "general" || tab === "fitment") && (
        <div className="flex items-center justify-between py-2 sticky bottom-0 bg-background/80 backdrop-blur border-t border-border mt-4 pt-4">
          <p className="text-xs text-muted-foreground">
            {tab === "fitment" ? "Fitment overrides are saved together with all payroll settings." : "Changes take effect on the next payroll generation run."}
          </p>
          <Button onClick={save} disabled={saving} className="flex items-center gap-2">
            {saving ? <><RefreshCw className="w-4 h-4 animate-spin" /> Saving…</> :
             saved  ? <><Check className="w-4 h-4 text-green-300" /> Saved!</> :
                      <><Save className="w-4 h-4" /> Save Payroll Settings</>}
          </Button>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   COMPONENT ROW (reused for Earnings & Deductions)
════════════════════════════════════════════════════════════ */
function ComponentRow({
  row, index, onChange, onRemove,
}: {
  row: SalaryComponent;
  index: number;
  onChange: (patch: Partial<SalaryComponent>) => void;
  onRemove: () => void;
}) {
  return (
    <tr className="hover:bg-muted/20 group">
      <td className="px-3 py-1.5 text-xs text-muted-foreground">{index + 1}</td>
      <td className="px-3 py-1.5">
        <Input value={row.component} onChange={e => onChange({ component: e.target.value })}
          placeholder="Component name" className="h-8 text-sm min-w-[140px]" />
      </td>
      <td className="px-3 py-1.5">
        <Input value={row.abbr} onChange={e => onChange({ abbr: e.target.value })}
          placeholder="Abbr" className="h-8 text-sm w-20" />
      </td>
      <td className="px-3 py-1.5">
        <Input type="number" min="0" value={row.amount} onChange={e => onChange({ amount: parseFloat(e.target.value) || 0 })}
          className="h-8 text-sm text-right w-24" />
      </td>
      <td className="px-3 py-1.5">
        <Input value={row.dependsOn} onChange={e => onChange({ dependsOn: e.target.value })}
          placeholder="e.g. basic" className="h-8 text-sm min-w-[110px]" />
      </td>
      <td className="px-3 py-1.5 text-center">
        <input type="checkbox" checked={row.isTaxApplicable} onChange={e => onChange({ isTaxApplicable: e.target.checked })}
          className="w-4 h-4 rounded accent-primary cursor-pointer" />
      </td>
      <td className="px-3 py-1.5">
        <select value={row.amountBasedOn} onChange={e => onChange({ amountBasedOn: e.target.value })}
          className="h-8 rounded-lg border border-input bg-background px-2 text-sm min-w-[120px] focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">—</option>
          <option value="Basic Salary">Basic Salary</option>
          <option value="Gross Salary">Gross Salary</option>
          <option value="Fixed Amount">Fixed Amount</option>
          <option value="Formula">Formula</option>
        </select>
      </td>
      <td className="px-3 py-1.5">
        <Input value={row.formula} onChange={e => onChange({ formula: e.target.value })}
          placeholder="e.g. basic * 0.1" className="h-8 text-sm font-mono min-w-[140px]" />
      </td>
      <td className="px-3 py-1.5 text-center">
        <button onClick={onRemove} className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </td>
    </tr>
  );
}
