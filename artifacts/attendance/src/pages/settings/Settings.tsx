import { useState, useRef, useEffect } from "react";
import { useListHolidays, useCreateHoliday, useDeleteHoliday } from "@workspace/api-client-react";
import { PageHeader, Card, Button, Input, Label, Select } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  Calendar, Plus, Trash2, Copy, Check, Building, Clock,
  Fingerprint, Users, ChevronRight,
  Database, Download, AlertTriangle, CheckCircle2, Upload, X,
  Banknote, Percent, BadgeIndianRupee, Save, RefreshCw, Edit2
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
function apiUrl(path: string) { return `${BASE}/api${path}`; }

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const TYPE_STYLE: Record<string, string> = {
  statutory: "bg-blue-100 text-blue-700 border border-blue-200",
  poya:      "bg-purple-100 text-purple-700 border border-purple-200",
  public:    "bg-amber-100 text-amber-700 border border-amber-200",
};


type SettingsTab = "organisation" | "payroll" | "database";

const SETTINGS_TABS: { key: SettingsTab; label: string; icon: React.ElementType; description: string; color: string }[] = [
  { key: "organisation", label: "Organisation",       icon: Building,     description: "Name, country, timezone",       color: "text-emerald-600" },
  { key: "payroll",      label: "Payroll Settings",   icon: Banknote,     description: "Salary, deductions, EPF/ETF",   color: "text-orange-600"  },
  { key: "database",     label: "Backup & Restore",   icon: Download,     description: "Backup and restore all data",    color: "text-teal-600"    },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("organisation");

  const year = 2026;
  const { data: holidays, isLoading, refetch } = useListHolidays({ year });
  const addHoliday    = useCreateHoliday();
  const removeHoliday = useDeleteHoliday();

  const [copied, setCopied]       = useState(false);
  const [newHoliday, setNewHoliday] = useState({ name: "", date: "", type: "statutory", description: "" });
  const [showAdd, setShowAdd]     = useState(false);

  const [orgSaved,  setOrgSaved]  = useState(false);
  const [attSaved,  setAttSaved]  = useState(false);
  const [zkSaved,   setZkSaved]   = useState(false);

  const [logoUrl, setLogoUrl] = useState<string>(() => localStorage.getItem("org_logo") || "");
  const logoInputRef = useRef<HTMLInputElement>(null);

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setLogoUrl(result);
      localStorage.setItem("org_logo", result);
      window.dispatchEvent(new Event("org_logo_updated"));
    };
    reader.readAsDataURL(file);
  }

  function clearLogo() {
    setLogoUrl("");
    localStorage.removeItem("org_logo");
    window.dispatchEvent(new Event("org_logo_updated"));
    if (logoInputRef.current) logoInputRef.current.value = "";
  }

  const [mockImporting, setMockImporting] = useState(false);
  const [mockClearing,  setMockClearing]  = useState(false);
  const [mockMsg, setMockMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [checkinFile, setCheckinFile] = useState<File | null>(null);
  const [checkinImporting, setCheckinImporting] = useState(false);

  // Database backup/restore state
  const [dbStats, setDbStats] = useState<Record<string, number> | null>(null);
  const [dbStatsLoading, setDbStatsLoading] = useState(false);
  const [backupDownloading, setBackupDownloading] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreMsg, setRestoreMsg] = useState<{ type: "success" | "error"; text: string; log?: string[] } | null>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);
  const [checkinMsg, setCheckinMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const checkinInputRef = useRef<HTMLInputElement>(null);

  async function handleCheckinImport() {
    if (!checkinFile) return;
    setCheckinImporting(true); setCheckinMsg(null);
    try {
      const form = new FormData();
      form.append("file", checkinFile);
      const r = await fetch(apiUrl("/checkin-import/import"), { method: "POST", body: form });
      const d = await r.json();
      setCheckinMsg({ type: d.success ? "success" : "error", text: d.message });
      if (d.success) setCheckinFile(null);
    } catch { setCheckinMsg({ type: "error", text: "Upload failed. Check server connection." }); }
    setCheckinImporting(false);
  }

  async function handleImportMock() {
    if (!confirm("This will import sample data (branches, departments, designations, employees, holidays). Continue?")) return;
    setMockImporting(true); setMockMsg(null);
    try {
      const r = await fetch(apiUrl("/mock-data/import"), { method: "POST" });
      const d = await r.json();
      setMockMsg({ type: d.success ? "success" : "error", text: d.message });
    } catch { setMockMsg({ type: "error", text: "Request failed. Check server connection." }); }
    setMockImporting(false);
  }

  async function handleClearMock() {
    if (!confirm("WARNING: This will permanently delete ALL employees, departments, branches, shifts, and holidays. Are you sure?")) return;
    setMockClearing(true); setMockMsg(null);
    try {
      const r = await fetch(apiUrl("/mock-data/clear"), { method: "DELETE" });
      const d = await r.json();
      setMockMsg({ type: d.success ? "success" : "error", text: d.message });
    } catch { setMockMsg({ type: "error", text: "Request failed. Check server connection." }); }
    setMockClearing(false);
  }

  async function loadDbStats() {
    setDbStatsLoading(true);
    try {
      const r = await fetch(apiUrl("/backup/stats"));
      const d = await r.json();
      setDbStats(d);
    } catch { setDbStats(null); }
    setDbStatsLoading(false);
  }

  async function handleBackupDownload() {
    setBackupDownloading(true);
    try {
      const r = await fetch(apiUrl("/backup/export"));
      if (!r.ok) throw new Error("Export failed");
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { alert("Backup export failed. Please check server connection."); }
    setBackupDownloading(false);
  }

  async function handleRestore() {
    if (!restoreFile) return;
    if (!confirm("WARNING: This will overwrite existing data with the backup. All current records will be replaced. Continue?")) return;
    setRestoring(true); setRestoreMsg(null);
    try {
      const form = new FormData();
      form.append("backup", restoreFile);
      const r = await fetch(apiUrl("/backup/restore"), { method: "POST", body: form });
      const d = await r.json();
      if (d.success) {
        setRestoreMsg({ type: "success", text: d.message, log: d.log });
        setRestoreFile(null);
        if (restoreInputRef.current) restoreInputRef.current.value = "";
        loadDbStats();
      } else {
        setRestoreMsg({ type: "error", text: d.error || "Restore failed", log: d.log });
      }
    } catch { setRestoreMsg({ type: "error", text: "Restore request failed. Check server connection." }); }
    setRestoring(false);
  }

  interface DeptShiftRule {
    id: string;
    department: string;
    shift: string;
    minHours: number;
    maxHours: number | null;
    otEligible: boolean;
    otAfterHours: number | null;
    lateGraceMinutes: number | null;
    lunchMinHours: number | null;
    lunchMaxHours: number | null;
    flexible: boolean;
    multipleLogin: boolean;
    otMultiplier: number | null;
    offdayOtMultiplier: number | null;
    notes: string;
  }

  const DEFAULT_DEPT_RULES: DeptShiftRule[] = [
    { id: "1", department: "Kitchen",       shift: "Kitchen Shift", minHours: 9, maxHours: 12,   otEligible: true,  otAfterHours: 9.5, lateGraceMinutes: 15, lunchMinHours: 1, lunchMaxHours: 2, flexible: false, multipleLogin: false, otMultiplier: 1.5, offdayOtMultiplier: 1.5, notes: "Split shift"    },
    { id: "2", department: "House Keeping", shift: "Regular",       minHours: 9, maxHours: 9,    otEligible: true,  otAfterHours: 9.5, lateGraceMinutes: 15, lunchMinHours: 1, lunchMaxHours: 1, flexible: false, multipleLogin: false, otMultiplier: 1.5, offdayOtMultiplier: 1.5, notes: "Lunch tracking" },
    { id: "3", department: "Maintenance",   shift: "Regular",       minHours: 9, maxHours: 9,    otEligible: true,  otAfterHours: 9.5, lateGraceMinutes: 15, lunchMinHours: 1, lunchMaxHours: 1, flexible: false, multipleLogin: false, otMultiplier: 1.5, offdayOtMultiplier: 1.5, notes: "Standard"      },
    { id: "4", department: "Surf",          shift: "Flexible",      minHours: 0, maxHours: null, otEligible: true,  otAfterHours: 9,   lateGraceMinutes: null, lunchMinHours: null, lunchMaxHours: null, flexible: true, multipleLogin: true, otMultiplier: 1.5, offdayOtMultiplier: 1.5, notes: "Flexible work" },
    { id: "5", department: "Admin",         shift: "Regular",       minHours: 9, maxHours: 9,    otEligible: true,  otAfterHours: 9.5, lateGraceMinutes: 15, lunchMinHours: 1, lunchMaxHours: 1, flexible: false, multipleLogin: false, otMultiplier: 1.5, offdayOtMultiplier: 1.5, notes: "Office"        },
    { id: "6", department: "Security",      shift: "Night",         minHours: 9, maxHours: 12,   otEligible: true,  otAfterHours: 9,   lateGraceMinutes: 15, lunchMinHours: 1, lunchMaxHours: 1, flexible: false, multipleLogin: false, otMultiplier: 1.5, offdayOtMultiplier: 1.5, notes: "Night shift"   },
    { id: "7", department: "Manager",       shift: "Flexible",      minHours: 0, maxHours: null, otEligible: false, otAfterHours: null, lateGraceMinutes: null, lunchMinHours: null, lunchMaxHours: null, flexible: true, multipleLogin: true, otMultiplier: null, offdayOtMultiplier: 1.5, notes: "No OT"  },
  ];

  const BLANK_RULE: DeptShiftRule = { id: "", department: "", shift: "", minHours: 9, maxHours: 9, otEligible: true, otAfterHours: 9.5, lateGraceMinutes: 15, lunchMinHours: 1, lunchMaxHours: 1, flexible: false, multipleLogin: false, otMultiplier: 1.5, offdayOtMultiplier: 1.5, notes: "" };

  const [deptRules, setDeptRules] = useState<DeptShiftRule[]>(DEFAULT_DEPT_RULES);
  const [deptRulesLoading, setDeptRulesLoading] = useState(false);
  const [deptRulesSaving, setDeptRulesSaving] = useState(false);
  const [deptRulesSaved, setDeptRulesSaved] = useState(false);
  const [deptRulesError, setDeptRulesError] = useState<string | null>(null);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState<DeptShiftRule>(BLANK_RULE);
  const [ruleModalMode, setRuleModalMode] = useState<"add" | "edit">("add");

  async function loadDeptRules() {
    setDeptRulesLoading(true);
    try {
      const r = await fetch(apiUrl("/hr-settings"));
      const d = await r.json();
      if (Array.isArray(d.departmentRules) && d.departmentRules.length > 0) {
        const rules = d.departmentRules as DeptShiftRule[];
        if (rules[0] && "department" in rules[0] && "shift" in rules[0]) {
          setDeptRules(rules);
        }
      }
    } catch { /* keep defaults */ }
    setDeptRulesLoading(false);
  }

  async function saveDeptRules(rules: DeptShiftRule[]) {
    setDeptRulesSaving(true); setDeptRulesError(null);
    try {
      const r = await fetch(apiUrl("/hr-settings"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ departmentRules: rules }),
      });
      const d = await r.json();
      if (d.id || d.departmentRules) { setDeptRulesSaved(true); setTimeout(() => setDeptRulesSaved(false), 2500); }
      else setDeptRulesError(d.message || "Save failed");
    } catch { setDeptRulesError("Failed to save rules"); }
    setDeptRulesSaving(false);
  }

  function openAddRule() {
    setEditingRule({ ...BLANK_RULE, id: crypto.randomUUID() });
    setRuleModalMode("add");
    setShowRuleModal(true);
  }

  function openEditRule(rule: DeptShiftRule) {
    setEditingRule({ ...rule });
    setRuleModalMode("edit");
    setShowRuleModal(true);
  }

  function saveRule() {
    const updated = ruleModalMode === "add"
      ? [...deptRules, editingRule]
      : deptRules.map(r => r.id === editingRule.id ? editingRule : r);
    setDeptRules(updated);
    saveDeptRules(updated);
    setShowRuleModal(false);
  }

  function deleteRule(id: string) {
    if (!confirm("Delete this rule?")) return;
    const updated = deptRules.filter(r => r.id !== id);
    setDeptRules(updated);
    saveDeptRules(updated);
  }

  function setER<K extends keyof DeptShiftRule>(k: K, v: DeptShiftRule[K]) { setEditingRule(s => ({ ...s, [k]: v })); }

  const DEFAULT_SALARY_SCALE: Record<string, number> = {
    "General Manager":      150000,
    "Operations Manager":   120000,
    "F&B Manager":          100000,
    "HR Manager":            90000,
    "Accountant":            75000,
    "Admin Officer":         65000,
    "Kitchen Supervisor":    60000,
    "Kitchen Staff":         45000,
    "Room Supervisor":       60000,
    "Room Attendant":        45000,
    "Head Gardener":         50000,
    "Gardener":              40000,
    "Head Surf Instructor":  60000,
    "Surf Instructor":       45000,
    "Night Watcher":         40000,
    "Security Officer":      40000,
    "Cashier":               42000,
    "Driver":                38000,
  };

  const [payrollCfg, setPayrollCfg] = useState({
    epfEmployeePercent: 8, epfEmployerPercent: 12, etfEmployerPercent: 3,
    transportAllowance: 5000,
    housingAllowanceLow: 3000, housingAllowanceMid: 7000, housingAllowanceHigh: 10000,
    housingMidThreshold: 50000, housingHighThreshold: 80000,
    otherAllowances: 1500,
    overtimeMultiplier: 1.5,
    statutoryOtMultiplier: 2.0,
    poyaOtMultiplier: 1.5,
    publicHolidayOtMultiplier: 1.5,
    offDayOtMultiplier: 1.5,
    salaryScale: { ...DEFAULT_SALARY_SCALE } as Record<string, number>,
  });
  const [payrollLoading, setPayrollLoading] = useState(false);
  const [payrollSaved, setPayrollSaved] = useState(false);
  const [payrollError, setPayrollError] = useState<string | null>(null);
  const [editingDesignation, setEditingDesignation] = useState<string | null>(null);
  const [editSalaryValue, setEditSalaryValue] = useState("");

  useEffect(() => {
    if (activeTab === "database") { loadDbStats(); }
    if (activeTab === "hr") { loadDeptRules(); }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "payroll") return;
    setPayrollLoading(true);
    fetch(apiUrl("/payroll-settings"))
      .then(r => r.json())
      .then(d => {
        if (d.id) {
          setPayrollCfg({
            epfEmployeePercent: d.epfEmployeePercent,
            epfEmployerPercent: d.epfEmployerPercent,
            etfEmployerPercent: d.etfEmployerPercent,
            transportAllowance: d.transportAllowance,
            housingAllowanceLow: d.housingAllowanceLow,
            housingAllowanceMid: d.housingAllowanceMid,
            housingAllowanceHigh: d.housingAllowanceHigh,
            housingMidThreshold: d.housingMidThreshold,
            housingHighThreshold: d.housingHighThreshold,
            otherAllowances: d.otherAllowances,
            overtimeMultiplier: d.overtimeMultiplier,
            statutoryOtMultiplier: d.statutoryOtMultiplier ?? 2.0,
            poyaOtMultiplier: d.poyaOtMultiplier ?? 1.5,
            publicHolidayOtMultiplier: d.publicHolidayOtMultiplier ?? 1.5,
            offDayOtMultiplier: d.offDayOtMultiplier ?? 1.5,
            salaryScale: d.salaryScale || { ...DEFAULT_SALARY_SCALE },
          });
        }
      })
      .catch(() => setPayrollError("Failed to load payroll settings"))
      .finally(() => setPayrollLoading(false));
  }, [activeTab]);

  async function savePayrollSettings() {
    setPayrollLoading(true); setPayrollError(null);
    try {
      const r = await fetch(apiUrl("/payroll-settings"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payrollCfg),
      });
      const d = await r.json();
      if (d.id) { setPayrollSaved(true); setTimeout(() => setPayrollSaved(false), 2500); }
      else setPayrollError(d.message || "Save failed");
    } catch { setPayrollError("Failed to save payroll settings"); }
    setPayrollLoading(false);
  }

  function setPay(k: string, v: any) { setPayrollCfg(s => ({ ...s, [k]: v })); }

  function startEditSalary(designation: string) {
    setEditingDesignation(designation);
    setEditSalaryValue(String(payrollCfg.salaryScale[designation] ?? 40000));
  }

  function saveSalary(designation: string) {
    const val = parseInt(editSalaryValue);
    if (!isNaN(val) && val > 0) {
      setPayrollCfg(s => ({ ...s, salaryScale: { ...s.salaryScale, [designation]: val } }));
    }
    setEditingDesignation(null);
  }

  const serverUrl = `${window.location.origin}/api/biometric/push`;
  function handleCopy() { navigator.clipboard.writeText(serverUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }

  function handleAddHoliday() {
    addHoliday.mutate(
      { data: newHoliday },
      { onSuccess: () => { setNewHoliday({ name: "", date: "", type: "national", description: "" }); setShowAdd(false); refetch(); } }
    );
  }

  const byMonth: Record<number, any[]> = {};
  (holidays || []).forEach(h => {
    const m = new Date(h.date).getMonth();
    if (!byMonth[m]) byMonth[m] = [];
    byMonth[m].push(h);
  });

  const statutory = (holidays || []).filter(h => h.type === "statutory");
  const poya      = (holidays || []).filter(h => h.type === "poya");

  function saveFn(setter: (v: boolean) => void) {
    setter(true);
    setTimeout(() => setter(false), 2500);
  }

  const activeInfo = SETTINGS_TABS.find(t => t.key === activeTab)!;

  return (
    <div className="flex gap-5 max-w-6xl mx-auto h-full">

      {/* Left Sidebar Nav */}
      <div className="w-56 shrink-0">
        <div className="sticky top-0">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 px-1">Settings</p>
          <nav className="flex flex-col gap-1">
            {SETTINGS_TABS.map(({ key, label, icon: Icon, description, color }) => (
              <button key={key} onClick={() => setActiveTab(key)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150 group",
                  activeTab === key
                    ? "bg-primary/10 border border-primary/20 shadow-sm"
                    : "hover:bg-muted/60 border border-transparent"
                )}>
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                  activeTab === key ? "bg-primary/15" : "bg-muted group-hover:bg-muted/80"
                )}>
                  <Icon className={cn("w-4 h-4", activeTab === key ? color : "text-muted-foreground")} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={cn("text-xs font-semibold leading-tight", activeTab === key ? "text-foreground" : "text-muted-foreground group-hover:text-foreground")}>{label}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight mt-0.5 truncate">{description}</p>
                </div>
                {activeTab === key && <ChevronRight className="w-3 h-3 text-primary shrink-0" />}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Right Content Area */}
      <div className="flex-1 min-w-0 space-y-5">
        {/* Tab Header */}
        <div className="flex items-center gap-3 pb-1">
          <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", "bg-muted")}>
            <activeInfo.icon className={cn("w-5 h-5", activeInfo.color)} />
          </div>
          <div>
            <h2 className="font-bold text-base leading-tight">{activeInfo.label}</h2>
            <p className="text-xs text-muted-foreground">{activeInfo.description}</p>
          </div>
        </div>

        {/* ── Organisation ─────────────────────────────────── */}
        {activeTab === "organisation" && (
          <Card className="p-5 space-y-5">
            <div>
              <Label className="text-xs mb-2 block">Organisation Logo</Label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-muted overflow-hidden shrink-0">
                  {logoUrl
                    ? <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                    : <Building className="w-8 h-8 text-muted-foreground" />}
                </div>
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-muted-foreground">Logo is displayed in the sidebar.</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs">Organization Name</Label>
                <Input placeholder="e.g. drivethru" defaultValue="" />
              </div>
              <div>
                <Label className="text-xs">Short Name / Code</Label>
                <Input placeholder="e.g. IPO" defaultValue="" />
              </div>
              <div>
                <Label className="text-xs">Country</Label>
                <Input placeholder="e.g. Sri Lanka" defaultValue="" />
              </div>
              <div>
                <Label className="text-xs">Timezone</Label>
                <Select defaultValue="SLST">
                  <option value="SLST">Sri Lanka Standard Time (GMT+5:30)</option>
                  <option value="IST">India Standard Time (GMT+5:30)</option>
                  <option value="UTC">UTC (GMT+0)</option>
                  <option value="EST">Eastern Standard Time (GMT-5)</option>
                  <option value="PST">Pacific Standard Time (GMT-8)</option>
                  <option value="GST">Gulf Standard Time (GMT+4)</option>
                  <option value="SGT">Singapore Time (GMT+8)</option>
                  <option value="AEST">Australian Eastern Time (GMT+10)</option>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Financial Year Start</Label>
                <Select defaultValue="apr">
                  <option value="jan">January</option>
                  <option value="apr">April</option>
                  <option value="jul">July</option>
                  <option value="oct">October</option>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Currency</Label>
                <Select defaultValue="LKR">
                  <option value="LKR">LKR — Sri Lankan Rupee (Rs)</option>
                  <option value="INR">INR — Indian Rupee (₹)</option>
                  <option value="USD">USD — US Dollar ($)</option>
                  <option value="EUR">EUR — Euro (€)</option>
                  <option value="GBP">GBP — British Pound (£)</option>
                  <option value="AED">AED — UAE Dirham</option>
                  <option value="SGD">SGD — Singapore Dollar</option>
                  <option value="BDT">BDT — Bangladeshi Taka</option>
                  <option value="PKR">PKR — Pakistani Rupee</option>
                </Select>
              </div>
              <div className="col-span-2 md:col-span-3">
                <Label className="text-xs">Head Office Address</Label>
                <Input placeholder="Street, City, State, Country" defaultValue="" />
              </div>
              <div>
                <Label className="text-xs">Contact Email</Label>
                <Input type="email" placeholder="hr@yourorg.com" defaultValue="" />
              </div>
              <div>
                <Label className="text-xs">Contact Phone</Label>
                <Input placeholder="+94-XXXXXXXXXX" defaultValue="" />
              </div>
            </div>
            <div className="flex justify-end mt-5">
              <Button className="text-xs flex items-center gap-2" onClick={() => saveFn(setOrgSaved)}>
                {orgSaved ? <><Check className="w-3.5 h-3.5 text-green-400" />Saved!</> : "Save Organisation"}
              </Button>
            </div>
          </Card>
        )}

        {/* ── HR Settings ───────────────────────────────────── */}
        {activeTab === "hr" && (
          <div className="space-y-4">
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-violet-600" />
                  <span className="text-sm font-bold">Department Shift Rules</span>
                  <span className="text-xs text-muted-foreground ml-1">— per-department attendance & OT configuration</span>
                </div>
                <div className="flex items-center gap-2">
                  {deptRulesError && <span className="text-xs text-red-600">{deptRulesError}</span>}
                  {deptRulesSaved && <span className="text-xs text-emerald-600 flex items-center gap-1"><Check className="w-3 h-3" />Saved</span>}
                  {deptRulesSaving && <span className="text-xs text-muted-foreground">Saving…</span>}
                  <Button className="flex items-center gap-1.5 text-xs h-8 bg-primary text-primary-foreground" onClick={openAddRule}>
                    <Plus className="w-3.5 h-3.5" />Add Rule
                  </Button>
                </div>
              </div>

              {deptRulesLoading ? (
                <div className="flex items-center justify-center h-20">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs min-w-[900px]">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        {["Department","Shift","Min h","Max h","OT?","OT After","Grace","Lunch (hrs)","Flex","Multi Login","OT ×","Offday ×","Notes",""].map(h => (
                          <th key={h} className="text-left px-3 py-2 font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {deptRules.map((rule, i) => (
                        <tr key={rule.id} className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                          <td className="px-3 py-2 font-medium text-foreground whitespace-nowrap">{rule.department}</td>
                          <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{rule.shift}</td>
                          <td className="px-3 py-2 text-center">{rule.minHours}</td>
                          <td className="px-3 py-2 text-center">{rule.maxHours ?? <span className="text-muted-foreground">—</span>}</td>
                          <td className="px-3 py-2 text-center">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${rule.otEligible ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                              {rule.otEligible ? "Yes" : "No"}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center">{rule.otAfterHours != null ? `${rule.otAfterHours}h` : <span className="text-muted-foreground">—</span>}</td>
                          <td className="px-3 py-2 text-center">{rule.lateGraceMinutes != null ? `${rule.lateGraceMinutes} min` : <span className="text-muted-foreground">No</span>}</td>
                          <td className="px-3 py-2 text-center">
                            {rule.lunchMinHours != null
                              ? (rule.lunchMaxHours != null && rule.lunchMaxHours !== rule.lunchMinHours ? `${rule.lunchMinHours}–${rule.lunchMaxHours}` : `${rule.lunchMinHours}`)
                              : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${rule.flexible ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}`}>
                              {rule.flexible ? "Yes" : "No"}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${rule.multipleLogin ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}`}>
                              {rule.multipleLogin ? "Yes" : "No"}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center">{rule.otMultiplier != null ? `${rule.otMultiplier}×` : <span className="text-muted-foreground">—</span>}</td>
                          <td className="px-3 py-2 text-center">{rule.offdayOtMultiplier != null ? `${rule.offdayOtMultiplier}×` : <span className="text-muted-foreground">—</span>}</td>
                          <td className="px-3 py-2 text-muted-foreground max-w-[120px] truncate">{rule.notes || "—"}</td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1">
                              <button onClick={() => openEditRule(rule)} className="p-1 rounded hover:bg-primary/10 text-primary transition-colors">
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => deleteRule(rule.id)} className="p-1 rounded hover:bg-red-50 text-red-500 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {deptRules.length === 0 && (
                        <tr>
                          <td colSpan={14} className="px-3 py-8 text-center text-muted-foreground text-xs">
                            No department rules yet. Click "Add Rule" to create one.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            {/* Add / Edit Rule Modal */}
            {showRuleModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-border">
                  <div className="flex items-center justify-between p-5 border-b border-border">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-violet-600" />
                      <span className="font-bold text-sm">{ruleModalMode === "add" ? "Add" : "Edit"} Department Rule</span>
                    </div>
                    <button onClick={() => setShowRuleModal(false)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-5 space-y-4">
                    {/* Identity */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs font-medium mb-1 block">Department *</Label>
                        <Input value={editingRule.department} onChange={e => setER("department", e.target.value)} placeholder="e.g. Kitchen" />
                      </div>
                      <div>
                        <Label className="text-xs font-medium mb-1 block">Shift *</Label>
                        <Input value={editingRule.shift} onChange={e => setER("shift", e.target.value)} placeholder="e.g. Kitchen Shift" />
                      </div>
                    </div>

                    {/* Hours */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs font-medium mb-1 block">Min Hours / Day</Label>
                        <Input type="number" step="0.5" min="0" value={editingRule.minHours} onChange={e => setER("minHours", parseFloat(e.target.value) || 0)} />
                      </div>
                      <div>
                        <Label className="text-xs font-medium mb-1 block">Max Hours / Day <span className="text-muted-foreground font-normal">(blank = unlimited)</span></Label>
                        <Input type="number" step="0.5" min="0"
                          value={editingRule.maxHours ?? ""}
                          onChange={e => setER("maxHours", e.target.value === "" ? null : parseFloat(e.target.value))}
                          placeholder="—" />
                      </div>
                    </div>

                    {/* OT */}
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label className="text-xs font-medium mb-1 block">OT Eligible</Label>
                        <Select value={editingRule.otEligible ? "yes" : "no"} onChange={e => setER("otEligible", e.target.value === "yes")}>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs font-medium mb-1 block">OT After (hours) <span className="text-muted-foreground font-normal">(blank = N/A)</span></Label>
                        <Input type="number" step="0.5" min="0"
                          value={editingRule.otAfterHours ?? ""}
                          onChange={e => setER("otAfterHours", e.target.value === "" ? null : parseFloat(e.target.value))}
                          placeholder="—" />
                      </div>
                      <div>
                        <Label className="text-xs font-medium mb-1 block">OT Multiplier <span className="text-muted-foreground font-normal">(blank = N/A)</span></Label>
                        <Input type="number" step="0.1" min="0"
                          value={editingRule.otMultiplier ?? ""}
                          onChange={e => setER("otMultiplier", e.target.value === "" ? null : parseFloat(e.target.value))}
                          placeholder="—" />
                      </div>
                    </div>

                    {/* Offday OT / Grace */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs font-medium mb-1 block">Offday OT Multiplier <span className="text-muted-foreground font-normal">(blank = N/A)</span></Label>
                        <Input type="number" step="0.1" min="0"
                          value={editingRule.offdayOtMultiplier ?? ""}
                          onChange={e => setER("offdayOtMultiplier", e.target.value === "" ? null : parseFloat(e.target.value))}
                          placeholder="—" />
                      </div>
                      <div>
                        <Label className="text-xs font-medium mb-1 block">Late Grace (minutes) <span className="text-muted-foreground font-normal">(blank = no grace)</span></Label>
                        <Input type="number" step="1" min="0"
                          value={editingRule.lateGraceMinutes ?? ""}
                          onChange={e => setER("lateGraceMinutes", e.target.value === "" ? null : parseInt(e.target.value))}
                          placeholder="—" />
                      </div>
                    </div>

                    {/* Lunch */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs font-medium mb-1 block">Lunch Min (hrs) <span className="text-muted-foreground font-normal">(blank = N/A)</span></Label>
                        <Input type="number" step="0.5" min="0"
                          value={editingRule.lunchMinHours ?? ""}
                          onChange={e => setER("lunchMinHours", e.target.value === "" ? null : parseFloat(e.target.value))}
                          placeholder="—" />
                      </div>
                      <div>
                        <Label className="text-xs font-medium mb-1 block">Lunch Max (hrs) <span className="text-muted-foreground font-normal">(blank = same as min)</span></Label>
                        <Input type="number" step="0.5" min="0"
                          value={editingRule.lunchMaxHours ?? ""}
                          onChange={e => setER("lunchMaxHours", e.target.value === "" ? null : parseFloat(e.target.value))}
                          placeholder="—" />
                      </div>
                    </div>

                    {/* Flags */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs font-medium mb-1 block">Flexible Hours</Label>
                        <Select value={editingRule.flexible ? "yes" : "no"} onChange={e => setER("flexible", e.target.value === "yes")}>
                          <option value="no">No</option>
                          <option value="yes">Yes</option>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs font-medium mb-1 block">Multiple Login Allowed</Label>
                        <Select value={editingRule.multipleLogin ? "yes" : "no"} onChange={e => setER("multipleLogin", e.target.value === "yes")}>
                          <option value="no">No</option>
                          <option value="yes">Yes</option>
                        </Select>
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <Label className="text-xs font-medium mb-1 block">Notes</Label>
                      <Input value={editingRule.notes} onChange={e => setER("notes", e.target.value)} placeholder="Any additional notes…" />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 p-5 border-t border-border">
                    <Button variant="outline" className="text-xs h-9" onClick={() => setShowRuleModal(false)}>Cancel</Button>
                    <Button
                      className="text-xs h-9 bg-primary text-primary-foreground flex items-center gap-1.5"
                      onClick={saveRule}
                      disabled={!editingRule.department || !editingRule.shift || deptRulesSaving}
                    >
                      <Save className="w-3.5 h-3.5" />
                      {deptRulesSaving ? "Saving…" : ruleModalMode === "add" ? "Add Rule" : "Save Changes"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Payroll Config ────────────────────────────────── */}
        {activeTab === "payroll" && (
          <div className="space-y-4">
            {payrollError && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm bg-red-50 text-red-700 border border-red-200">
                <X className="w-4 h-4 shrink-0" />{payrollError}
                <button onClick={() => setPayrollError(null)} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
              </div>
            )}

            {/* Statutory Deductions */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
                <Percent className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold">Statutory Deductions & Contributions</span>
                <span className="text-xs text-muted-foreground ml-1">— These percentages are applied during payroll calculation</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs font-medium">EPF — Employee Contribution %</Label>
                  <div className="relative mt-1">
                    <Input type="number" step="0.01" min="0" max="100"
                      value={payrollCfg.epfEmployeePercent}
                      onChange={e => setPay("epfEmployeePercent", parseFloat(e.target.value))}
                      className="pr-8" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">Deducted from employee gross (default: 8%)</p>
                </div>
                <div>
                  <Label className="text-xs font-medium">EPF — Employer Contribution %</Label>
                  <div className="relative mt-1">
                    <Input type="number" step="0.01" min="0" max="100"
                      value={payrollCfg.epfEmployerPercent}
                      onChange={e => setPay("epfEmployerPercent", parseFloat(e.target.value))}
                      className="pr-8" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">Employer cost, not deducted from employee (default: 12%)</p>
                </div>
                <div>
                  <Label className="text-xs font-medium">ETF — Employer Contribution %</Label>
                  <div className="relative mt-1">
                    <Input type="number" step="0.01" min="0" max="100"
                      value={payrollCfg.etfEmployerPercent}
                      onChange={e => setPay("etfEmployerPercent", parseFloat(e.target.value))}
                      className="pr-8" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">Employer Provident Fund contribution (default: 3%)</p>
                </div>
              </div>
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
                <strong>Note:</strong> APIT (income tax) is automatically calculated per Sri Lanka IRD tax slabs (6%–30%) and cannot be configured manually.
              </div>
            </Card>

            {/* Earnings / Allowances */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
                <BadgeIndianRupee className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold">Earnings & Allowances</span>
                <span className="text-xs text-muted-foreground ml-1">— Fixed monthly amounts added to basic salary</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs font-medium">Transport Allowance (Rs.)</Label>
                  <Input type="number" min="0"
                    value={payrollCfg.transportAllowance}
                    onChange={e => setPay("transportAllowance", parseInt(e.target.value))}
                    className="mt-1" />
                  <p className="text-[10px] text-muted-foreground mt-1">Fixed amount for all employees</p>
                </div>
                <div>
                  <Label className="text-xs font-medium">Lunch Incentive Money (Rs.)</Label>
                  <Input type="number" min="0"
                    value={(payrollCfg as any).lunchIncentive ?? 0}
                    onChange={e => setPay("lunchIncentive", parseInt(e.target.value))}
                    className="mt-1" />
                  <p className="text-[10px] text-muted-foreground mt-1">Fixed monthly lunch incentive</p>
                </div>
                <div>
                  <Label className="text-xs font-medium">Other Allowances (Rs.)</Label>
                  <Input type="number" min="0"
                    value={payrollCfg.otherAllowances}
                    onChange={e => setPay("otherAllowances", parseInt(e.target.value))}
                    className="mt-1" />
                  <p className="text-[10px] text-muted-foreground mt-1">Miscellaneous allowances</p>
                </div>
                <div>
                  <Label className="text-xs font-medium">Weekday OT Multiplier</Label>
                  <Input type="number" step="0.1" min="1" max="5"
                    value={payrollCfg.overtimeMultiplier}
                    onChange={e => setPay("overtimeMultiplier", parseFloat(e.target.value))}
                    className="mt-1" />
                  <p className="text-[10px] text-muted-foreground mt-1">e.g. 1.5 = 1.5× hourly rate for regular OT</p>
                </div>
              </div>
            </Card>

            {/* Holiday OT Multipliers */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
                <Calendar className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-bold">Holiday OT Multipliers</span>
                <span className="text-xs text-muted-foreground ml-1">— Rate applied when working on a holiday</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-xs font-medium">Statutory Holiday</Label>
                  <div className="relative mt-1">
                    <Input type="number" step="0.1" min="1" max="5"
                      value={payrollCfg.statutoryOtMultiplier}
                      onChange={e => setPay("statutoryOtMultiplier", parseFloat(e.target.value))}
                      className="pr-6" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">×</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">Gazetted statutory days (default: 2.0×)</p>
                </div>
                <div>
                  <Label className="text-xs font-medium">Poya Day</Label>
                  <div className="relative mt-1">
                    <Input type="number" step="0.1" min="1" max="5"
                      value={payrollCfg.poyaOtMultiplier}
                      onChange={e => setPay("poyaOtMultiplier", parseFloat(e.target.value))}
                      className="pr-6" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">×</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">Full moon / Poya holidays (default: 1.5×)</p>
                </div>
                <div>
                  <Label className="text-xs font-medium">Public Holiday</Label>
                  <div className="relative mt-1">
                    <Input type="number" step="0.1" min="1" max="5"
                      value={payrollCfg.publicHolidayOtMultiplier}
                      onChange={e => setPay("publicHolidayOtMultiplier", parseFloat(e.target.value))}
                      className="pr-6" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">×</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">Other public holidays (default: 1.5×)</p>
                </div>
                <div>
                  <Label className="text-xs font-medium">Off-Day (Sunday)</Label>
                  <div className="relative mt-1">
                    <Input type="number" step="0.1" min="1" max="5"
                      value={payrollCfg.offDayOtMultiplier}
                      onChange={e => setPay("offDayOtMultiplier", parseFloat(e.target.value))}
                      className="pr-6" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">×</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">Working on weekly off-day (default: 1.5×)</p>
                </div>
              </div>
            </Card>

            {/* Deductions */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
                <X className="w-4 h-4 text-red-600" />
                <span className="text-sm font-bold">Deduction Rules</span>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-xs font-medium text-muted-foreground mb-1">Automatic Deductions</p>
                <p className="text-[10px] text-muted-foreground">
                  <strong>Late:</strong> (Late minutes × Minute Rate) — Minute Rate = Basic ÷ (Working Days × 8 × 60)<br />
                  <strong>Absence:</strong> (Basic ÷ Working Days) × Absent Days<br />
                  <strong>Half-day:</strong> (Daily Rate ÷ 2) × Half-day Count<br />
                  <strong>Incomplete hours:</strong> Shortfall minutes × Minute Rate (exempt: Surf Instructors)
                </p>
                <p className="text-[10px] text-blue-600 mt-1">All deductions are automatically computed from attendance records.</p>
              </div>
            </Card>

            {/* Salary Scale */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
                <Banknote className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold">Designation Salary Scale</span>
                <span className="text-xs text-muted-foreground ml-1">— Basic salary per designation (click to edit)</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/40 border-b border-border">
                      <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Designation</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">Basic Salary (Rs.)</th>
                      <th className="px-3 py-2 w-24 text-center text-xs font-semibold text-muted-foreground">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {Object.entries(payrollCfg.salaryScale).sort((a, b) => b[1] - a[1]).map(([designation, salary]) => (
                      <tr key={designation} className="hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-2 font-medium">{designation}</td>
                        <td className="px-3 py-2 text-right">
                          {editingDesignation === designation ? (
                            <div className="flex items-center justify-end gap-1">
                              <Input
                                type="number"
                                value={editSalaryValue}
                                onChange={e => setEditSalaryValue(e.target.value)}
                                onKeyDown={e => { if (e.key === "Enter") saveSalary(designation); if (e.key === "Escape") setEditingDesignation(null); }}
                                className="h-7 w-32 text-right text-sm"
                                autoFocus
                              />
                              <button onClick={() => saveSalary(designation)} className="p-1 rounded bg-primary/10 text-primary hover:bg-primary/20">
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => setEditingDesignation(null)} className="p-1 rounded hover:bg-muted">
                                <X className="w-3.5 h-3.5 text-muted-foreground" />
                              </button>
                            </div>
                          ) : (
                            <span className="font-mono font-semibold">Rs. {salary.toLocaleString("en-LK")}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {editingDesignation !== designation && (
                            <button
                              onClick={() => startEditSalary(designation)}
                              className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <div className="flex justify-end gap-3">
              {payrollError && <p className="text-xs text-red-600 self-center">{payrollError}</p>}
              <Button
                onClick={savePayrollSettings}
                disabled={payrollLoading}
                className="text-xs flex items-center gap-2"
              >
                {payrollLoading ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" />Saving…</> :
                 payrollSaved ? <><Check className="w-3.5 h-3.5 text-green-400" />Saved!</> :
                 <><Save className="w-3.5 h-3.5" />Save Payroll Configuration</>}
              </Button>
            </div>
          </div>
        )}

        {/* ── Holiday Settings ──────────────────────────────── */}
        {activeTab === "holidays" && (
          <div className="space-y-4">
            {/* Summary + Add */}
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex gap-4 text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
                    Statutory <span className="font-bold ml-0.5">({statutory.length})</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" />
                    Poya <span className="font-bold ml-0.5">({poya.length})</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                    Public <span className="font-bold ml-0.5">({(holidays || []).filter(h=>h.type==="public").length})</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-gray-400 inline-block" />
                    Total <span className="font-bold ml-0.5">({(holidays || []).length})</span>
                  </span>
                </div>
                <Button onClick={() => setShowAdd(v => !v)} className="text-xs flex items-center gap-1.5 h-8 px-3">
                  <Plus className="w-3.5 h-3.5" /> Add Holiday
                </Button>
              </div>

              {showAdd && (
                <div className="mt-4 p-4 bg-muted/40 rounded-lg border border-border">
                  <h4 className="text-xs font-semibold mb-3">New Holiday — {year}</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div><Label className="text-xs">Name</Label>
                      <Input placeholder="Holiday name" value={newHoliday.name} onChange={e => setNewHoliday(h => ({ ...h, name: e.target.value }))} /></div>
                    <div><Label className="text-xs">Date</Label>
                      <Input type="date" value={newHoliday.date} onChange={e => setNewHoliday(h => ({ ...h, date: e.target.value }))} /></div>
                    <div><Label className="text-xs">Type</Label>
                      <Select value={newHoliday.type} onChange={e => setNewHoliday(h => ({ ...h, type: e.target.value }))}>
                        <option value="statutory">Statutory (2.0× OT)</option>
                        <option value="poya">Poya Day (1.5× OT)</option>
                        <option value="public">Public Holiday (1.5× OT)</option>
                      </Select></div>
                    <div><Label className="text-xs">Description (optional)</Label>
                      <Input placeholder="Details..." value={newHoliday.description} onChange={e => setNewHoliday(h => ({ ...h, description: e.target.value }))} /></div>
                  </div>
                  <div className="flex gap-2 justify-end mt-3">
                    <Button variant="outline" className="text-xs h-8" onClick={() => setShowAdd(false)}>Cancel</Button>
                    <Button className="text-xs h-8" onClick={handleAddHoliday}
                      disabled={addHoliday.isPending || !newHoliday.name || !newHoliday.date}>
                      {addHoliday.isPending ? "Saving..." : "Add Holiday"}
                    </Button>
                  </div>
                </div>
              )}
            </Card>

            {/* Monthly Calendar Grid */}
            <Card className="p-4">
              <p className="text-xs font-semibold text-muted-foreground mb-3">Calendar View — {year}</p>
              {isLoading ? (
                <p className="text-sm text-muted-foreground text-center py-6">Loading holidays...</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {MONTH_NAMES.map((monthName, mi) => {
                    const monthHolidays = byMonth[mi] || [];
                    return (
                      <div key={mi} className={cn(
                        "rounded-lg border p-3",
                        monthHolidays.length > 0 ? "border-primary/20 bg-primary/5" : "border-border bg-muted/20"
                      )}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold">{monthName}</span>
                          {monthHolidays.length > 0 && (
                            <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
                              {monthHolidays.length} holiday{monthHolidays.length > 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                        {monthHolidays.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic">No public holidays</p>
                        ) : (
                          <ul className="space-y-1.5">
                            {monthHolidays.sort((a, b) => a.date.localeCompare(b.date)).map(h => (
                              <li key={h.id} className="flex items-start justify-between gap-1 group">
                                <div className="flex items-start gap-1.5 min-w-0">
                                  <span className="text-xs text-muted-foreground font-mono shrink-0 w-5">
                                    {new Date(h.date + "T00:00:00").getDate()}
                                  </span>
                                  <div className="min-w-0">
                                    <p className="text-xs font-medium leading-tight truncate">
                                      {h.name}
                                    </p>
                                    <span className={cn("text-xs px-1.5 py-0 rounded", TYPE_STYLE[h.type] || TYPE_STYLE.public)}>
                                      {h.type === "statutory" ? "Statutory" : h.type === "poya" ? "Poya" : "Public"}
                                    </span>
                                  </div>
                                </div>
                                <button onClick={() => { if(confirm(`Remove "${h.name}"?`)) removeHoliday.mutate({ id: h.id }, { onSuccess: refetch }); }}
                                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-500 shrink-0 transition-opacity">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Full List Table */}
            {!isLoading && (holidays || []).length > 0 && (
              <Card className="overflow-hidden">
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-xs font-semibold text-muted-foreground">Full Holiday List — {year}</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50">
                      <tr>
                        {["Date","Day","Holiday","Type",""].map(h => (
                          <th key={h} className="text-left py-2 px-3 text-muted-foreground font-semibold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {(holidays || []).sort((a, b) => a.date.localeCompare(b.date)).map(h => {
                        const d = new Date(h.date + "T00:00:00");
                        const day = d.toLocaleDateString("en-US", { weekday: "long" });
                        const isSun = d.getDay() === 0;
                        return (
                          <tr key={h.id} className={cn("hover:bg-muted/30", isSun && "bg-amber-50/50")}>
                            <td className="px-3 py-2 font-mono">{h.date}</td>
                            <td className={cn("px-3 py-2", isSun && "text-red-500 font-medium")}>{day}</td>
                            <td className="px-3 py-2 font-medium">{h.name}</td>
                            <td className="px-3 py-2">
                              <span className={cn("px-2 py-0.5 rounded text-xs", TYPE_STYLE[h.type] || TYPE_STYLE.public)}>
                                {h.type === "statutory" ? "Statutory" : h.type === "poya" ? "Poya" : "Public"}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right">
                              <button onClick={() => { if(confirm(`Remove "${h.name}"?`)) removeHoliday.mutate({ id: h.id }, { onSuccess: refetch }); }}
                                className="text-muted-foreground hover:text-red-500 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* ── Biometric / ADMS ──────────────────────────────── */}
        {activeTab === "biometric" && (
          <div className="space-y-4">
            <Card className="p-5 border-sky-200 bg-sky-50/30">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-sky-100">
                <Fingerprint className="w-4 h-4 text-sky-600" />
                <span className="text-sm font-bold">ZKTeco ZK Push (ADMS) — Server Details</span>
                <span className="ml-auto text-xs bg-sky-100 text-sky-700 px-2 py-0.5 rounded font-mono">ADMS Ready</span>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Configure ZKTeco biometric devices to push attendance data via the ADMS protocol.
                Enter these server details in each device's <strong>Cloud Server</strong> or <strong>ADMS settings</strong>.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">ADMS Server URL <span className="text-muted-foreground">(copy to device)</span></Label>
                  <div className="flex gap-2">
                    <Input readOnly value={serverUrl} className="bg-muted font-mono text-xs" />
                    <Button variant="outline" className="shrink-0 text-xs h-9 px-3" onClick={handleCopy}>
                      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Server Port</Label>
                  <Input readOnly value="80" className="bg-muted font-mono text-xs" />
                </div>
                <div>
                  <Label className="text-xs">Protocol</Label>
                  <Input readOnly value="HTTP (ADMS / ZK Push)" className="bg-muted text-xs" />
                </div>
                <div>
                  <Label className="text-xs">Heartbeat Interval (seconds)</Label>
                  <Input type="number" defaultValue="30" />
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
                <span className="text-sm font-bold">Device Setup Guide</span>
                <span className="text-xs text-muted-foreground ml-1">— ZKTeco F-Series / K-Series / G-Series</span>
              </div>
              <ol className="space-y-3">
                {[
                  { step: 1, text: "On the device: Menu → Cloud Server Settings (or ADMS)" },
                  { step: 2, text: "Enable: Cloud Service = ON" },
                  { step: 3, text: <>Server Address: <code className="bg-muted px-1.5 py-0.5 rounded font-mono">{window.location.host}</code></> },
                  { step: 4, text: <>Server Port: <code className="bg-muted px-1.5 py-0.5 rounded font-mono">80</code></> },
                  { step: 5, text: "Set device Serial Number — this is used as the Device ID in the system" },
                  { step: 6, text: "Save and restart the device — it will start pushing attendance immediately" },
                ].map(({ step, text }) => (
                  <li key={step} className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-700 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{step}</span>
                    <span className="text-xs text-muted-foreground leading-relaxed">{text}</span>
                  </li>
                ))}
              </ol>
            </Card>

            <div className="flex justify-end">
              <Button className="text-xs flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white" onClick={() => saveFn(setZkSaved)}>
                {zkSaved ? <><Check className="w-3.5 h-3.5" />Saved!</> : "Save ZK Settings"}
              </Button>
            </div>
          </div>
        )}

        {/* ── Mock Data ─────────────────────────────────────── */}
        {activeTab === "mockdata" && (
          <div className="space-y-4">
            {/* Status message */}
            {mockMsg && (
              <div className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl border text-sm",
                mockMsg.type === "success"
                  ? "bg-green-50 border-green-200 text-green-800"
                  : "bg-red-50 border-red-200 text-red-800"
              )}>
                {mockMsg.type === "success"
                  ? <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                  : <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />}
                <span>{mockMsg.text}</span>
                <button className="ml-auto text-xs opacity-60 hover:opacity-100" onClick={() => setMockMsg(null)}>✕</button>
              </div>
            )}

            {/* About card */}
            <Card className="p-5 border-rose-200 bg-rose-50/30">
              <div className="flex items-center gap-2 mb-3 pb-3 border-b border-rose-100">
                <Database className="w-4 h-4 text-rose-600" />
                <span className="text-sm font-bold">Sample / Demo Data</span>
                <span className="ml-auto text-xs bg-rose-100 text-rose-700 px-2 py-0.5 rounded font-mono">Demo</span>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Instantly populate the system with realistic sample data for testing and demonstration.
                Includes branches, all departments, designations, 50 sample employees, and 2026 public holidays.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                {[
                  { label: "Branches", value: "8", note: "Head office, regional & sub branches" },
                  { label: "Departments", value: "8", note: "OPS, FIN, HR, IT & more" },
                  { label: "Designations", value: "18", note: "Postmaster to Delivery Agent" },
                  { label: "Employees", value: "50", note: "Sample employees with full profiles" },
                  { label: "Holidays", value: "26", note: "National & religious — 2026" },
                  { label: "Shifts", value: "4", note: "General, Morning, Evening, Split" },
                ].map(({ label, value, note }) => (
                  <div key={label} className="bg-white rounded-lg border border-rose-100 p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
                    <p className="text-xl font-bold text-rose-700 leading-tight">{value}</p>
                    <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{note}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  className="flex items-center gap-2 text-xs bg-rose-600 hover:bg-rose-700 text-white"
                  onClick={handleImportMock}
                  disabled={mockImporting || mockClearing}
                >
                  <Download className="w-3.5 h-3.5" />
                  {mockImporting ? "Importing..." : "Import Sample Data"}
                </Button>
              </div>
            </Card>

            {/* Check-in Excel Import */}
            <Card className="p-5 border-blue-200 bg-blue-50/20">
              <div className="flex items-center gap-2 mb-3 pb-3 border-b border-blue-100">
                <Upload className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-bold">Import Employee Check-in Data</span>
                <span className="ml-auto text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-mono">.xlsx</span>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Upload an employee check-in Excel file (.xlsx) exported from your biometric / HR system.
                The system will parse IN/OUT logs, group them by employee and date, and create attendance records automatically.
                New employees found in the file will be added to the database.
              </p>

              {checkinMsg && (
                <div className={cn(
                  "flex items-start gap-3 px-4 py-3 rounded-xl border text-sm mb-4",
                  checkinMsg.type === "success"
                    ? "bg-green-50 border-green-200 text-green-800"
                    : "bg-red-50 border-red-200 text-red-800"
                )}>
                  {checkinMsg.type === "success"
                    ? <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                    : <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />}
                  <span>{checkinMsg.text}</span>
                  <button className="ml-auto text-xs opacity-60 hover:opacity-100 shrink-0" onClick={() => setCheckinMsg(null)}>✕</button>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 items-start">
                <div
                  className={cn(
                    "flex-1 border-2 border-dashed rounded-lg px-4 py-3 cursor-pointer text-xs text-muted-foreground hover:border-blue-400 hover:bg-blue-50 transition-colors",
                    checkinFile ? "border-blue-400 bg-blue-50 text-blue-700" : "border-border"
                  )}
                  onClick={() => checkinInputRef.current?.click()}
                >
                  <input
                    ref={checkinInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={e => setCheckinFile(e.target.files?.[0] ?? null)}
                  />
                  {checkinFile
                    ? <span className="flex items-center gap-2 font-medium"><CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />{checkinFile.name}</span>
                    : <span>Click to select an Excel file (.xlsx)…</span>
                  }
                </div>
                <div className="flex gap-2 shrink-0">
                  {checkinFile && (
                    <Button variant="outline" className="text-xs h-9 px-3" onClick={() => { setCheckinFile(null); if (checkinInputRef.current) checkinInputRef.current.value = ""; }}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  <Button
                    className="flex items-center gap-2 text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={handleCheckinImport}
                    disabled={!checkinFile || checkinImporting}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {checkinImporting ? "Importing..." : "Import"}
                  </Button>
                </div>
              </div>
            </Card>

            {/* Danger zone */}
            <Card className="p-5 border-red-200 bg-red-50/20">
              <div className="flex items-center gap-2 mb-3 pb-3 border-b border-red-100">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span className="text-sm font-bold text-red-700">Danger Zone</span>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Permanently deletes all employees, departments, designations, branches, shifts, and holidays from the database.
                This action cannot be undone. Use with caution.
              </p>
              <Button
                variant="outline"
                className="flex items-center gap-2 text-xs border-red-300 text-red-600 hover:bg-red-50"
                onClick={handleClearMock}
                disabled={mockImporting || mockClearing}
              >
                <Trash2 className="w-3.5 h-3.5" />
                {mockClearing ? "Clearing..." : "Clear All Data"}
              </Button>
            </Card>
          </div>
        )}

        {/* ─── Database Backup & Restore ─── */}
        {activeTab === "database" && (
          <div className="space-y-4">

            {/* Current Database Stats */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-teal-600" />
                  <span className="text-sm font-bold text-foreground">Current Database</span>
                </div>
                <Button
                  variant="outline"
                  className="flex items-center gap-1.5 text-xs h-8"
                  onClick={loadDbStats}
                  disabled={dbStatsLoading}
                >
                  <RefreshCw className={`w-3 h-3 ${dbStatsLoading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
              {dbStatsLoading ? (
                <div className="flex items-center justify-center h-20">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                </div>
              ) : dbStats ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Companies",       value: dbStats.companies,      icon: "🏢" },
                    { label: "Branches",        value: dbStats.branches,       icon: "🏬" },
                    { label: "Departments",     value: dbStats.departments,    icon: "📂" },
                    { label: "Designations",    value: dbStats.designations,   icon: "🏷️" },
                    { label: "Shifts",          value: dbStats.shifts,         icon: "🕐" },
                    { label: "Employees",       value: dbStats.employees,      icon: "👥" },
                    { label: "Holidays",        value: dbStats.holidays,       icon: "📅" },
                    { label: "Payroll Records", value: dbStats.payrollRecords, icon: "💰" },
                    { label: "Loans",           value: dbStats.staffLoans,     icon: "🏦" },
                  ].map(item => (
                    <div key={item.label} className="bg-muted rounded-xl p-3 text-center border border-border">
                      <div className="text-lg mb-0.5">{item.icon}</div>
                      <div className="text-xl font-bold text-foreground">{item.value ?? 0}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{item.label}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Click Refresh to load statistics</p>
              )}
            </Card>

            {/* Backup Export */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-1">
                <Download className="w-4 h-4 text-teal-600" />
                <span className="text-sm font-bold text-foreground">Export Backup</span>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Download a full JSON backup of all your data including employees, branches, payroll records, loans, settings, and holidays.
                Store this file safely — you can use it to restore the system at any time.
              </p>
              <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 flex items-start gap-3 mb-4">
                <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                  <Database className="w-4 h-4 text-teal-700" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-teal-800">What's included in the backup:</p>
                  <ul className="text-xs text-teal-700 mt-1 space-y-0.5 list-disc list-inside">
                    <li>Companies, branches, departments, designations, shifts</li>
                    <li>All employee records and profiles</li>
                    <li>Payroll records and payroll settings</li>
                    <li>Staff loans and advances</li>
                    <li>Holidays and system settings</li>
                  </ul>
                </div>
              </div>
              <Button
                className="flex items-center gap-2 text-sm bg-teal-600 hover:bg-teal-700 text-white"
                onClick={handleBackupDownload}
                disabled={backupDownloading}
              >
                <Download className="w-4 h-4" />
                {backupDownloading ? "Preparing download..." : "Download Backup (.json)"}
              </Button>
            </Card>

            {/* Restore */}
            <Card className="p-5 border-amber-200 bg-amber-50/20">
              <div className="flex items-center gap-2 mb-1">
                <Upload className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-bold text-foreground">Restore from Backup</span>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Upload a previously downloaded backup file to restore your data.
                <strong className="text-amber-700"> This will replace all existing records</strong> with the data from the backup file.
              </p>

              {restoreMsg && (
                <div className={`flex items-start gap-2 p-3 rounded-xl mb-4 text-xs ${
                  restoreMsg.type === "success"
                    ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                    : "bg-red-50 border border-red-200 text-red-800"
                }`}>
                  {restoreMsg.type === "success"
                    ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                    : <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />}
                  <div className="flex-1">
                    <p className="font-medium">{restoreMsg.text}</p>
                    {restoreMsg.log && restoreMsg.log.length > 0 && (
                      <ul className="mt-2 space-y-0.5 opacity-80">
                        {restoreMsg.log.map((l, i) => <li key={i}>✓ {l}</li>)}
                      </ul>
                    )}
                  </div>
                  <button onClick={() => setRestoreMsg(null)} className="shrink-0 opacity-50 hover:opacity-100">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-start gap-3">
                <div
                  className="flex-1 border-2 border-dashed border-amber-300 rounded-xl px-4 py-3 text-xs text-muted-foreground cursor-pointer hover:border-amber-400 hover:bg-amber-50 transition-colors"
                  onClick={() => restoreInputRef.current?.click()}
                >
                  <input
                    ref={restoreInputRef}
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={e => { setRestoreFile(e.target.files?.[0] ?? null); setRestoreMsg(null); }}
                  />
                  {restoreFile
                    ? <span className="flex items-center gap-2 font-medium text-foreground">
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />{restoreFile.name}
                        <span className="text-muted-foreground font-normal">({(restoreFile.size / 1024).toFixed(1)} KB)</span>
                      </span>
                    : <span>Click to select a backup file (.json)…</span>
                  }
                </div>
                <div className="flex gap-2 shrink-0">
                  {restoreFile && (
                    <Button
                      variant="outline"
                      className="text-xs h-9 px-3"
                      onClick={() => { setRestoreFile(null); setRestoreMsg(null); if (restoreInputRef.current) restoreInputRef.current.value = ""; }}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  <Button
                    className="flex items-center gap-2 text-xs h-9 bg-amber-600 hover:bg-amber-700 text-white"
                    onClick={handleRestore}
                    disabled={!restoreFile || restoring}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {restoring ? "Restoring..." : "Restore"}
                  </Button>
                </div>
              </div>
            </Card>

            {/* Warning */}
            <Card className="p-4 border-red-200 bg-red-50/20">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-red-700 mb-1">Important Notes</p>
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Always download a fresh backup before restoring to avoid losing recent data.</li>
                    <li>The restore process replaces all existing records — there is no partial restore.</li>
                    <li>Attendance check-in records are <strong>not included</strong> in the backup (use the check-in import separately).</li>
                    <li>After restore, refresh the page to see updated data.</li>
                  </ul>
                </div>
              </div>
            </Card>

          </div>
        )}
      </div>
    </div>
  );
}
