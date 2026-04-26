import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useListEmployees, useCreateEmployee, useUpdateEmployee, useDeleteEmployee,
  useListBranches
} from "@workspace/api-client-react";
import { PageHeader, Card, Button, Input, Label, Select } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  Search, Plus, Edit2, Trash2, Download, Mail,
  MapPin, X, Building2, Users, Layers,
  FileText, Upload, CheckCircle2, AlertCircle, UserCircle,
  Briefcase, Phone, Hash, CreditCard, Calendar,
  IdCard, Home, Shield, Camera, BadgeIndianRupee,
  Banknote, UserCheck, ListChecks, CheckCircle, Clock,
  CircleDashed, BadgeCheck, RefreshCw, ChevronDown, ChevronUp, Settings, Save,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const STATUS_STYLE: Record<string, string> = {
  active:     "bg-green-100 text-green-700 border border-green-200",
  on_leave:   "bg-yellow-100 text-yellow-700 border border-yellow-200",
  resigned:   "bg-orange-100 text-orange-700 border border-orange-200",
  terminated: "bg-red-100 text-red-700 border border-red-200",
};
const EMP_TYPE_STYLE: Record<string, string> = {
  permanent: "bg-blue-100 text-blue-700",
  contract:  "bg-purple-100 text-purple-700",
  casual:    "bg-gray-100 text-gray-600",
};

const TABS = ["Employee List", "Departments", "Designations", "Payroll"] as const;
type Tab = typeof TABS[number];

const DEPT_LIST = ["Operations","Finance & Accounts","Human Resources","Information Technology","Postal Services","Customer Service","Administration","Logistics & Delivery"];
const DESIGNATION_LIST = ["Postmaster","Assistant Postmaster","Supervisor","Postal Officer","Counter Clerk","Sorting Officer","Delivery Agent","Data Entry Operator","Accounts Officer","HR Officer","IT Officer","Driver","Security Officer","Clerical Assistant"];

function apiUrl(path: string) { return `${BASE}/api${path}`; }

function empDisplayName(emp: any) {
  if (emp.firstName && emp.lastName) return `${emp.firstName} ${emp.lastName}`;
  return emp.fullName || "";
}

function useGet(key: string[], path: string) {
  return useQuery({ queryKey: key, queryFn: () => fetch(apiUrl(path)).then(r => r.json()) });
}
function useMut(method: string, path: string, qk: string[]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: any) => fetch(apiUrl(typeof path === "function" ? (path as any)(body) : path), {
      method, headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk }),
  });
}

// ── Mini Dashboard ─────────────────────────────────────────────────────────────
function EmployeeMiniDashboard({ allEmployees, onFilter }: { allEmployees: any[]; onFilter: (status: string) => void }) {
  const total = allEmployees.length;
  const active = allEmployees.filter(e => e.status === "active").length;
  const onLeave = allEmployees.filter(e => e.status === "on_leave").length;
  const resigned = allEmployees.filter(e => e.status === "resigned").length;
  const terminated = allEmployees.filter(e => e.status === "terminated").length;

  const permanent = allEmployees.filter(e => e.employeeType === "permanent").length;
  const contract = allEmployees.filter(e => e.employeeType === "contract").length;
  const casual = allEmployees.filter(e => e.employeeType === "casual").length;

  const deptMap: Record<string, number> = {};
  allEmployees.forEach(e => { if (e.department) deptMap[e.department] = (deptMap[e.department] || 0) + 1; });
  const topDepts = Object.entries(deptMap).sort((a, b) => b[1] - a[1]).slice(0, 4);

  return (
    <div className="grid grid-cols-12 gap-3 mb-1">
      {/* Left: Status breakdown */}
      <div className="col-span-12 md:col-span-5 bg-card border border-border rounded-xl p-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" /> Employee Status
        </p>
        <div className="flex items-end gap-3 mb-3">
          <span className="text-4xl font-bold text-foreground">{total}</span>
          <span className="text-xs text-muted-foreground mb-1">Total Employees</span>
        </div>
        <div className="space-y-2">
          {[
            { label: "Active",     val: active,     color: "bg-green-500",  status: "active" },
            { label: "On Leave",   val: onLeave,    color: "bg-yellow-400", status: "on_leave" },
            { label: "Resigned",   val: resigned,   color: "bg-orange-400", status: "resigned" },
            { label: "Terminated", val: terminated, color: "bg-red-500",    status: "terminated" },
          ].map(s => (
            <button key={s.label} onClick={() => onFilter(s.status)}
              className="w-full flex items-center gap-2 text-xs hover:bg-muted/40 rounded px-1 py-0.5 transition-colors group">
              <div className={cn("w-2 h-2 rounded-full shrink-0", s.color)} />
              <span className="flex-1 text-left text-muted-foreground group-hover:text-foreground">{s.label}</span>
              <span className="font-semibold text-foreground">{s.val}</span>
              <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full", s.color)} style={{ width: total ? `${(s.val / total) * 100}%` : "0%" }} />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Middle: Employment Type */}
      <div className="col-span-12 md:col-span-3">
        <div className="bg-card border border-border rounded-xl p-4 h-full">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Briefcase className="w-3.5 h-3.5" /> Employment Type
          </p>
          <div className="space-y-3">
            {[
              { label: "Permanent", val: permanent, cls: "text-blue-600 bg-blue-50", bar: "bg-blue-400" },
              { label: "Contract",  val: contract,  cls: "text-purple-600 bg-purple-50", bar: "bg-purple-400" },
              { label: "Casual",    val: casual,    cls: "text-gray-600 bg-gray-50", bar: "bg-gray-400" },
            ].map(t => (
              <div key={t.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">{t.label}</span>
                  <span className={cn("text-xs font-bold px-2 py-0.5 rounded", t.cls)}>{t.val}</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full", t.bar)} style={{ width: total ? `${(t.val / total) * 100}%` : "0%" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Department breakdown */}
      <div className="col-span-12 md:col-span-4 bg-card border border-border rounded-xl p-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5" /> Top Departments
        </p>
        {topDepts.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No data yet</p>
        ) : (
          <div className="space-y-3">
            {topDepts.map(([dept, count]) => (
              <div key={dept}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs truncate max-w-[160px] text-muted-foreground">{dept}</span>
                  <span className="text-xs font-bold text-foreground">{count}</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${total ? (count / total) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Active headcount</span>
          <span className="text-xs font-bold text-green-600">{active} / {total}</span>
        </div>
      </div>
    </div>
  );
}

// ── Document Upload Row ────────────────────────────────────────────────────────
function DocUploadRow({
  label, fieldName, currentUrl, empId, onUploaded
}: {
  label: string; fieldName: string; currentUrl?: string; empId?: number; onUploaded: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !empId) return;
    setUploading(true); setError("");
    try {
      const fd = new FormData();
      fd.append(fieldName, file);
      const resp = await fetch(apiUrl(`/employees/${empId}/documents`), { method: "POST", body: fd });
      if (!resp.ok) throw new Error("Upload failed");
      onUploaded();
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <FileText className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-xs font-medium">{label}</p>
          {currentUrl ? (
            <a href={currentUrl} target="_blank" rel="noreferrer"
              className="text-xs text-primary flex items-center gap-1 hover:underline">
              View uploaded file
            </a>
          ) : (
            <p className="text-xs text-muted-foreground">No file uploaded</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {currentUrl && <CheckCircle2 className="w-4 h-4 text-green-500" />}
        {error && <span className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</span>}
        <input ref={fileRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          onChange={handleFile} />
        <Button variant="outline" className="text-xs h-7 px-2.5" disabled={uploading || !empId}
          onClick={() => fileRef.current?.click()}>
          {uploading ? (
            <span className="flex items-center gap-1.5"><Upload className="w-3 h-3 animate-pulse" />Uploading...</span>
          ) : (
            <span className="flex items-center gap-1.5"><Upload className="w-3 h-3" />{currentUrl ? "Replace" : "Upload"}</span>
          )}
        </Button>
      </div>
    </div>
  );
}

// ── Employee Profile Drawer ────────────────────────────────────────────────────
const EMPTY_EMP = {
  employeeId:"", firstName:"", lastName:"", gender:"male", dateOfBirth:"", phone:"", email:"",
  address:"", nicNumber:"", panNumber:"", aadharNumber:"",
  designation:"", department:"", branchId:1, shiftId:"", weekoffScheduleId:"", joiningDate:"",
  employeeType:"permanent", reportingManagerId:"", biometricId:"", status:"active",
  epfNumber:"", etfNumber:"", basicSalary:"", remarks:"",
};

/* ── HR Policy helpers (client-side mirror of hr-rules.ts) ─── */
const DEFAULT_HR_RULE = {
  id: "_default", department: "General", shift: "Regular",
  minHours: 9, maxHours: 9, otEligible: true, otAfterHours: 9.5,
  lateGraceMinutes: 15, lunchMinHours: 1, lunchMaxHours: 1,
  flexible: false, multipleLogin: false, otMultiplier: 1.5,
  offdayOtMultiplier: 1.5, holidayOtMultiplier: 1.5,
  weeklyLeaveDays: 1.5, halfDayHours: 5, notes: "Default fallback rule",
};

function findHrRule(rules: any[], department: string, shiftName?: string | null) {
  const dept  = (department ?? "").toLowerCase().trim();
  const shift = (shiftName  ?? "").toLowerCase().trim();
  if (shift) {
    const both = rules.find(r =>
      r.department.toLowerCase().trim() === dept && r.shift.toLowerCase().trim() === shift
    );
    if (both) return { rule: both, matchType: "exact" };
  }
  const exactDept = rules.find(r => r.department.toLowerCase().trim() === dept);
  if (exactDept) return { rule: exactDept, matchType: "department" };
  const partial = rules.find(r => {
    const rd = r.department.toLowerCase().trim();
    return dept.includes(rd) || rd.includes(dept);
  });
  if (partial) return { rule: partial, matchType: "partial" };
  return { rule: DEFAULT_HR_RULE, matchType: "default" };
}

function EmployeeDrawer({ emp, branches, onClose, onSaved }: { emp?: any; branches: any[]; onClose: () => void; onSaved: () => void }) {
  const [tab, setTab] = useState<"personal"|"professional"|"documents"|"payroll"|"policy">("personal");
  const { data: deptData } = useGet(["departments"], "/departments");
  const { data: desigData } = useGet(["designations"], "/designations");
  const { data: hrSettingsData } = useGet(["hr-settings-policy"], "/hr-settings");
  const { data: shiftsData } = useGet(["shifts-for-policy"], "/shifts");
  const { data: weekoffData } = useGet(["weekoff-schedules"], "/weekoffs");
  const allWeekoffs: any[] = Array.isArray(weekoffData) ? weekoffData : [];
  const deptOptions: string[] = Array.isArray(deptData) ? deptData.filter((d: any) => d.isActive).map((d: any) => d.name) : [];
  const desigOptions: string[] = Array.isArray(desigData) ? desigData.filter((d: any) => d.isActive).map((d: any) => d.name) : [];
  const hrRules: any[] = Array.isArray(hrSettingsData?.departmentRules) ? hrSettingsData.departmentRules : [];
  const allShifts: any[] = Array.isArray(shiftsData) ? shiftsData : [];
  const [form, setForm] = useState(emp ? {
    ...EMPTY_EMP, ...emp,
    firstName: emp.firstName || "",
    lastName: emp.lastName || (emp.fullName && !emp.firstName ? emp.fullName : ""),
    branchId: emp.branchId || 1,
    dateOfBirth: emp.dateOfBirth || "",
    shiftId: emp.shiftId || "",
    weekoffScheduleId: emp.weekoffScheduleId ? String(emp.weekoffScheduleId) : "",
    reportingManagerId: emp.reportingManagerId || "",
    nicNumber: emp.nicNumber || "",
    aadharNumber: emp.aadharNumber || "",
    panNumber: emp.panNumber || "",
    epfNumber: emp.epfNumber || "",
    etfNumber: emp.etfNumber || "",
    basicSalary: emp.basicSalary || "",
    remarks: emp.remarks || "",
  } : { ...EMPTY_EMP });
  const empShiftName = allShifts.find((s: any) => s.id === Number(form.shiftId))?.name ?? null;
  const { rule: matchedRule, matchType } = findHrRule(hrRules, form.department, empShiftName);
  const [policyEditMode, setPolicyEditMode] = useState<"view"|"edit"|"create">("view");
  const [policyForm, setPolicyForm] = useState<any>(null);
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>("");
  function openPolicyEdit() {
    setSelectedPolicyId(matchedRule?.id || "");
    setPolicyForm({ ...matchedRule });
    setPolicyEditMode("edit");
  }
  function openPolicyCreate() {
    setSelectedPolicyId("");
    setPolicyForm(null);
    setPolicyEditMode("edit");
  }
  const [photoPreview, setPhotoPreview] = useState<string>(emp?.photoUrl || "");
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);
  const [regionalInfo, setRegionalInfo] = useState<{ prefix: string; nextId: string; regionalName: string } | null>(null);
  const [empIdError, setEmpIdError] = useState<string>("");

  useEffect(() => {
    if (emp) return;
    const branchId = Number(form.branchId);
    if (!branchId) return;
    fetch(apiUrl(`/employees/next-id?branchId=${branchId}`))
      .then(r => r.json())
      .then(data => {
        if (!data.noRegional) {
          setRegionalInfo({ prefix: data.prefix, nextId: data.nextId, regionalName: data.regionalName });
          setForm(f => ({ ...f, employeeId: data.nextId }));
          setEmpIdError("");
        } else {
          setRegionalInfo(null);
        }
      })
      .catch(() => {});
  }, [form.branchId, emp]);

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !emp?.id) return;
    setPhotoUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
      const fd = new FormData();
      fd.append("photo", file);
      const resp = await fetch(apiUrl(`/employees/${emp.id}/documents`), { method: "POST", body: fd });
      if (resp.ok) { const d = await resp.json(); setPhotoPreview(d.employee?.photoUrl || photoPreview); onSaved(); }
    } finally {
      setPhotoUploading(false);
      if (photoRef.current) photoRef.current.value = "";
    }
  }
  const createEmp = useCreateEmployee();
  const updateEmp = useUpdateEmployee();

  function set(k: string, v: any) { setForm(f => ({ ...f, [k]: v })); }

  function handleSave() {
    setEmpIdError("");
    if (!form.department) {
      setTab("professional");
      alert("Please select a Department before saving.");
      return;
    }
    if (!form.designation) {
      setTab("professional");
      alert("Please select a Designation before saving.");
      return;
    }
    const payload = {
      ...form,
      fullName: `${form.firstName} ${form.lastName}`.trim() || form.firstName || "Employee",
      branchId: Number(form.branchId),
      shiftId: form.shiftId ? Number(form.shiftId) : null,
      weekoffScheduleId: form.weekoffScheduleId ? Number(form.weekoffScheduleId) : null,
      reportingManagerId: form.reportingManagerId ? Number(form.reportingManagerId) : null,
    };
    const onError = (data: any) => {
      if (data?.code === "INVALID_EMPLOYEE_ID") {
        setEmpIdError(data.message || "Invalid Employee ID");
        setTab("professional");
      }
    };
    if (emp?.id) {
      updateEmp.mutate({ id: emp.id, data: payload }, {
        onSuccess: (data) => { if (data?.code === "INVALID_EMPLOYEE_ID") { onError(data); } else { onSaved(); } }
      });
    } else {
      createEmp.mutate({ data: payload }, {
        onSuccess: (data) => { if (data?.code === "INVALID_EMPLOYEE_ID") { onError(data); } else { onSaved(); } }
      });
    }
  }

  const isPending = createEmp.isPending || updateEmp.isPending;
  const isSaved = !!emp?.id;

  const initials = form.firstName && form.lastName
    ? `${form.firstName[0]}${form.lastName[0]}`.toUpperCase()
    : form.firstName?.[0]?.toUpperCase() || "E";

  const DRAWER_TABS = [
    { key: "personal", label: "Personal", icon: UserCircle, step: 1 },
    { key: "professional", label: "Professional", icon: Briefcase, step: 2 },
    { key: "payroll", label: "Payroll", icon: BadgeIndianRupee, step: 3 },
    { key: "documents", label: "Documents", icon: FileText, step: 4 },
    { key: "policy", label: "Policy", icon: Settings, step: 5 },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-2xl bg-background border-l border-border shadow-2xl flex flex-col h-full overflow-hidden">

        {/* Drawer Header */}
        <div className="px-5 pt-5 pb-4 border-b border-border bg-gradient-to-r from-primary/5 to-background">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0 overflow-hidden">
                {photoPreview
                  ? <img src={photoPreview} alt="avatar" className="w-full h-full object-cover" />
                  : <span className="text-base font-bold text-primary">{initials}</span>
                }
              </div>
              <div>
                <h2 className="font-bold text-base leading-tight">{emp ? "Edit Employee Profile" : "New Employee"}</h2>
                {emp
                  ? <p className="text-xs text-muted-foreground mt-0.5">{emp.employeeId} · {empDisplayName(emp)}</p>
                  : <p className="text-xs text-muted-foreground mt-0.5">Fill in the details below</p>
                }
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl transition-colors mt-0.5">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Step Tabs */}
          <div className="flex gap-2 mt-4">
            {DRAWER_TABS.map(({ key, label, icon: Icon, step }) => (
              <button key={key} onClick={() => setTab(key)}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-200 flex-1 justify-center",
                  tab === key
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}>
                <span className={cn(
                  "w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0",
                  tab === key ? "bg-white/20" : "bg-background"
                )}>{step}</span>
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {tab === "personal" && (
            <>
              {/* Photo Upload */}
              <div className="flex flex-col items-center gap-2 py-3">
                <div className="relative group">
                  <div className="w-20 h-20 rounded-full border-2 border-border bg-muted/40 overflow-hidden flex items-center justify-center shadow-sm">
                    {photoPreview
                      ? <img src={photoPreview} alt="Profile" className="w-full h-full object-cover" />
                      : <UserCircle className="w-10 h-10 text-muted-foreground/50" />
                    }
                  </div>
                  <button type="button"
                    disabled={!emp?.id || photoUploading}
                    onClick={() => photoRef.current?.click()}
                    className={cn(
                      "absolute bottom-0 right-0 w-7 h-7 rounded-full border-2 border-background flex items-center justify-center shadow transition-all",
                      emp?.id
                        ? "bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
                        : "bg-muted text-muted-foreground cursor-not-allowed"
                    )}>
                    {photoUploading
                      ? <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      : <Camera className="w-3.5 h-3.5" />
                    }
                  </button>
                  <input ref={photoRef} type="file" className="hidden" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoUpload} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {emp?.id
                    ? (photoPreview ? "Click camera to change photo" : "Click camera icon to upload photo")
                    : "Save employee first to upload photo"
                  }
                </p>
              </div>

              {/* Basic Info Section */}
              <div className="rounded-xl border border-border bg-muted/20 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/40 border-b border-border">
                  <UserCircle className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Basic Information</span>
                </div>
                <div className="grid grid-cols-2 gap-4 p-4">
                  <div>
                    <Label className="text-xs font-semibold mb-1.5 block">First Name <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <Input className="pl-8" placeholder="e.g. Rahul" value={form.firstName} onChange={e => set("firstName", e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold mb-1.5 block">Last Name</Label>
                    <div className="relative">
                      <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <Input className="pl-8" placeholder="e.g. Sharma" value={form.lastName} onChange={e => set("lastName", e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold mb-1.5 block">Gender</Label>
                    <Select value={form.gender} onChange={e => set("gender", e.target.value)}>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold mb-1.5 block">Date of Birth</Label>
                    <div className="relative">
                      <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                      <Input type="date" className="pl-8" value={form.dateOfBirth} onChange={e => set("dateOfBirth", e.target.value)} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Section */}
              <div className="rounded-xl border border-border bg-muted/20 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/40 border-b border-border">
                  <Phone className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Contact Details</span>
                </div>
                <div className="grid grid-cols-2 gap-4 p-4">
                  <div>
                    <Label className="text-xs font-semibold mb-1.5 block">Phone <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <Input className="pl-8" placeholder="9XXXXXXXXX" value={form.phone} onChange={e => set("phone", e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold mb-1.5 block">Email <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <Input type="email" className="pl-8" placeholder="name@company.com" value={form.email} onChange={e => set("email", e.target.value)} />
                    </div>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs font-semibold mb-1.5 block">Address</Label>
                    <div className="relative">
                      <Home className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <Input className="pl-8" placeholder="House No., Street, City, State, PIN" value={form.address} onChange={e => set("address", e.target.value)} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Identity Section */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-primary/10 border-b border-primary/20">
                  <Shield className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[11px] font-bold text-primary uppercase tracking-widest">Government Identity</span>
                </div>
                <div className="grid grid-cols-2 gap-4 p-4">
                  <div>
                    <Label className="text-xs font-semibold mb-1.5 block">
                      NIC Number
                      <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">(National Identity Card)</span>
                    </Label>
                    <div className="relative">
                      <IdCard className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <Input className="pl-8 font-mono tracking-wider" placeholder="e.g. 199012345678" value={form.nicNumber} onChange={e => set("nicNumber", e.target.value)} maxLength={12} />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">Sri Lankan National Identity Card number (9 or 12 digits).</p>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold mb-1.5 block">
                      Passport No.
                      <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">(If applicable)</span>
                    </Label>
                    <div className="relative">
                      <CreditCard className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <Input className="pl-8 font-mono tracking-wider uppercase" placeholder="e.g. N1234567" value={form.panNumber} onChange={e => set("panNumber", e.target.value.toUpperCase())} maxLength={15} />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">Optional — for non-citizen or foreign staff only.</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {tab === "professional" && (
            <div className="space-y-5">
              {/* Employment Info */}
              <div className="rounded-xl border border-border bg-muted/20 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/40 border-b border-border">
                  <Briefcase className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Employment Information</span>
                </div>
                <div className="grid grid-cols-2 gap-4 p-4">
                  <div className="col-span-2">
                    <Label className="text-xs font-semibold mb-1.5 block">
                      Employee ID <span className="text-red-500">*</span>
                      {regionalInfo && !emp && (
                        <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                          <Building2 className="w-2.5 h-2.5" />
                          {regionalInfo.regionalName} Regional · prefix: <span className="font-mono font-bold">{regionalInfo.prefix}</span>
                        </span>
                      )}
                    </Label>
                    <div className="relative">
                      <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <Input
                        className={cn("pl-8 font-mono uppercase", empIdError ? "border-red-400 focus:border-red-500" : "")}
                        placeholder={regionalInfo ? `${regionalInfo.prefix}001` : "EMP-0001"}
                        value={form.employeeId}
                        onChange={e => { set("employeeId", e.target.value.toUpperCase()); setEmpIdError(""); }}
                        disabled={!!emp}
                      />
                    </div>
                    {empIdError ? (
                      <p className="text-xs text-red-500 flex items-start gap-1 mt-1.5">
                        <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />{empIdError}
                      </p>
                    ) : regionalInfo && !emp ? (
                      <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
                        Suggested next ID: <span className="font-mono font-semibold text-foreground">{regionalInfo.nextId}</span>
                        — must be unique across all {regionalInfo.regionalName} branches
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <Label className="text-xs font-semibold mb-1.5 block">Status</Label>
                    <Select value={form.status} onChange={e => set("status", e.target.value)}>
                      <option value="active">✅ Active</option>
                      <option value="on_leave">🟡 On Leave</option>
                      <option value="resigned">🟠 Resigned</option>
                      <option value="terminated">🔴 Terminated</option>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold mb-1.5 block">Employee Type</Label>
                    <Select value={form.employeeType} onChange={e => set("employeeType", e.target.value)}>
                      <option value="permanent">Permanent</option>
                      <option value="contract">Contract</option>
                      <option value="casual">Casual</option>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold mb-1.5 block">Joining Date <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                      <Input type="date" className="pl-8" value={form.joiningDate} onChange={e => set("joiningDate", e.target.value)} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Role & Placement */}
              <div className="rounded-xl border border-border bg-muted/20 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/40 border-b border-border">
                  <Building2 className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Role & Placement</span>
                </div>
                <div className="grid grid-cols-2 gap-4 p-4">
                  <div>
                    <Label className="text-xs font-semibold mb-1.5 block">Department <span className="text-red-500">*</span></Label>
                    <Select value={form.department} onChange={e => set("department", e.target.value)}>
                      <option value="">— Select Department —</option>
                      {(deptOptions.length > 0 ? deptOptions : DEPT_LIST).map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </Select>
                    {deptOptions.length === 0 && (
                      <p className="text-[10px] text-amber-600 mt-1">No departments found. Add them in the Departments tab first.</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs font-semibold mb-1.5 block">Designation <span className="text-red-500">*</span></Label>
                    <Select value={form.designation} onChange={e => set("designation", e.target.value)}>
                      <option value="">— Select Designation —</option>
                      {(desigOptions.length > 0 ? desigOptions : DESIGNATION_LIST).map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </Select>
                    {desigOptions.length === 0 && (
                      <p className="text-[10px] text-amber-600 mt-1">No designations found. Add them in the Designations tab first.</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs font-semibold mb-1.5 block">Branch <span className="text-red-500">*</span></Label>
                    <Select value={form.branchId} onChange={e => set("branchId", Number(e.target.value))}>
                      {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold mb-1.5 block">Week Off Schedule</Label>
                    <Select value={form.weekoffScheduleId} onChange={e => set("weekoffScheduleId", e.target.value)}>
                      <option value="">— No Schedule —</option>
                      {allWeekoffs.map((w: any) => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </Select>
                    {form.weekoffScheduleId && (() => {
                      const sched = allWeekoffs.find((w: any) => String(w.id) === String(form.weekoffScheduleId));
                      const DAY_S = ["Su","Mo","Tu","We","Th","Fr","Sa"];
                      if (!sched) return null;
                      return (
                        <div className="flex gap-1 mt-1.5 flex-wrap">
                          {DAY_S.map((d, i) => {
                            const isOff  = sched.offDays?.includes(i);
                            const isHalf = sched.halfDays?.includes(i);
                            return (
                              <span key={i} className={cn(
                                "text-[10px] font-bold px-1.5 py-0.5 rounded",
                                isOff  ? "bg-red-100 text-red-700" :
                                isHalf ? "bg-amber-100 text-amber-700" :
                                "bg-green-50 text-green-700"
                              )}>{d}</span>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                  <div>
                    <Label className="text-xs font-semibold mb-1.5 block">Biometric Device ID</Label>
                    <div className="relative">
                      <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <Input className="pl-8" placeholder="e.g. 101" value={form.biometricId} onChange={e => set("biometricId", e.target.value)} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "payroll" && (
            <div className="space-y-5">
              {/* Salary */}
              <div className="rounded-xl border border-border bg-muted/20 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/40 border-b border-border">
                  <BadgeIndianRupee className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Salary Details</span>
                </div>
                <div className="grid grid-cols-2 gap-4 p-4">
                  <div className="col-span-2">
                    <Label className="text-xs font-semibold mb-1.5 block">Basic Salary (LKR)</Label>
                    <div className="relative">
                      <BadgeIndianRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <Input type="number" className="pl-8" placeholder="e.g. 45000" value={form.basicSalary} onChange={e => set("basicSalary", e.target.value)} />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">Monthly basic salary in Sri Lankan Rupees (LKR).</p>
                  </div>
                </div>
              </div>

              {/* EPF / ETF */}
              <div className="rounded-xl border border-border bg-muted/20 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/40 border-b border-border">
                  <Shield className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Provident Fund Details</span>
                </div>
                <div className="grid grid-cols-2 gap-4 p-4">
                  <div>
                    <Label className="text-xs font-semibold mb-1.5 block">EPF Number</Label>
                    <div className="relative">
                      <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <Input className="pl-8 font-mono" placeholder="Employees' Provident Fund No." value={form.epfNumber} onChange={e => set("epfNumber", e.target.value)} />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">EPF — Employees' Provident Fund number.</p>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold mb-1.5 block">ETF Number</Label>
                    <div className="relative">
                      <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <Input className="pl-8 font-mono" placeholder="Employees' Trust Fund No." value={form.etfNumber} onChange={e => set("etfNumber", e.target.value)} />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">ETF — Employees' Trust Fund number.</p>
                  </div>
                </div>
              </div>

              {/* Remarks / Attendance Rules */}
              <div className="rounded-xl border border-border bg-muted/20 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/40 border-b border-border">
                  <FileText className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Remarks / Attendance Rules</span>
                </div>
                <div className="p-4">
                  <Label className="text-xs font-semibold mb-1.5 block">Remarks</Label>
                  <textarea
                    className="w-full min-h-[90px] resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground/60"
                    placeholder="e.g. Late deduction after 8:15 am / OT after 5:30pm"
                    value={form.remarks}
                    onChange={e => set("remarks", e.target.value)}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Attendance and payroll rules specific to this employee (late deduction rules, OT thresholds, etc.)
                  </p>
                </div>
              </div>

              {/* Summary */}
              {(form.basicSalary || form.epfNumber || form.etfNumber) && (
                <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                  <p className="text-xs font-semibold text-green-800 mb-2">Payroll Summary</p>
                  <div className="space-y-1 text-xs text-green-700">
                    {form.basicSalary && <div className="flex justify-between"><span>Basic Salary</span><span className="font-mono font-bold">LKR {parseFloat(form.basicSalary).toLocaleString("en-LK")}</span></div>}
                    {form.epfNumber && <div className="flex justify-between"><span>EPF No.</span><span className="font-mono">{form.epfNumber}</span></div>}
                    {form.etfNumber && <div className="flex justify-between"><span>ETF No.</span><span className="font-mono">{form.etfNumber}</span></div>}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === "policy" && (
            <div className="space-y-4">
              {/* ── Match Summary Banner ── */}
              <div className={cn(
                "rounded-xl border p-4 flex items-start gap-3",
                matchType === "exact"      && "border-primary/40 bg-primary/5",
                matchType === "department" && "border-blue-300 bg-blue-50",
                matchType === "partial"    && "border-amber-300 bg-amber-50",
                matchType === "default"    && "border-dashed border-muted-foreground/30 bg-muted/20",
              )}>
                <Settings className={cn("w-4 h-4 mt-0.5 shrink-0",
                  matchType === "exact"      && "text-primary",
                  matchType === "department" && "text-blue-600",
                  matchType === "partial"    && "text-amber-600",
                  matchType === "default"    && "text-muted-foreground",
                )} />
                <div className="flex-1 min-w-0">
                  <p className={cn("text-xs font-bold",
                    matchType === "exact"      && "text-primary",
                    matchType === "department" && "text-blue-700",
                    matchType === "partial"    && "text-amber-700",
                    matchType === "default"    && "text-muted-foreground",
                  )}>
                    {matchType === "exact"      && "Exact Rule Match"}
                    {matchType === "department" && "Department Rule Match"}
                    {matchType === "partial"    && "Partial Department Match"}
                    {matchType === "default"    && "No Specific Policy — Default Fallback"}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {!form.department && !form.shiftId
                      ? "Set a department and shift to see the applicable policy."
                      : matchType === "exact"
                        ? `Matched on department "${matchedRule.department}" + shift "${matchedRule.shift}".`
                        : matchType === "department"
                          ? `Matched by department "${matchedRule.department}" (no shift-specific rule).`
                          : matchType === "partial"
                            ? `Partially matched department "${matchedRule.department}" from "${form.department}".`
                            : `No rule found for "${form.department || "this department"}" — using organisation defaults.`}
                  </p>
                </div>
                {policyEditMode === "view" && (
                  <div className="flex gap-1.5 shrink-0">
                    {matchType !== "default" && (
                      <button
                        onClick={openPolicyEdit}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                      >
                        <Edit2 className="w-3 h-3" />Edit Rule
                      </button>
                    )}
                    {matchType === "default" && form.department && (
                      <button
                        onClick={openPolicyCreate}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                      >
                        <Plus className="w-3 h-3" />Create Rule
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* ── Policy Selector (Edit Rule dropdown) ── */}
              {policyEditMode === "edit" && (
                <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
                  <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/30">
                    <div className="flex items-center gap-2">
                      <Edit2 className="w-3.5 h-3.5 text-primary" />
                      <span className="text-sm font-bold">Select Policy Rule</span>
                    </div>
                    <button onClick={() => setPolicyEditMode("view")} className="p-1.5 rounded-lg hover:bg-muted">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-5 space-y-4">
                    <div>
                      <Label className="text-xs font-medium mb-1.5 block">HR Policy Rule</Label>
                      <Select
                        value={selectedPolicyId}
                        onChange={e => {
                          setSelectedPolicyId(e.target.value);
                          const sel = hrRules.find((r: any) => r.id === e.target.value);
                          if (sel) setPolicyForm(sel);
                        }}
                      >
                        <option value="">— Select a saved policy —</option>
                        {hrRules.map((r: any) => (
                          <option key={r.id} value={r.id}>
                            {r.department}{r.shift ? ` — ${r.shift}` : ""}
                          </option>
                        ))}
                      </Select>
                      {hrRules.length === 0 && (
                        <p className="text-[11px] text-muted-foreground mt-1.5">No HR policies saved yet. Add them in HR Settings first.</p>
                      )}
                    </div>

                    {/* Preview of selected policy */}
                    {policyForm && selectedPolicyId && (
                      <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
                        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Policy Preview</p>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                          <div><span className="text-muted-foreground">Min Hours/Day</span><span className="float-right font-medium">{policyForm.minHours ?? "—"}h</span></div>
                          <div><span className="text-muted-foreground">Max Hours/Day</span><span className="float-right font-medium">{policyForm.maxHours != null ? `${policyForm.maxHours}h` : "—"}</span></div>
                          <div><span className="text-muted-foreground">Late Grace</span><span className="float-right font-medium">{policyForm.lateGraceMinutes != null ? `${policyForm.lateGraceMinutes} min` : "—"}</span></div>
                          <div><span className="text-muted-foreground">Half-Day Threshold</span><span className="float-right font-medium">{policyForm.halfDayHours != null ? `${policyForm.halfDayHours}h` : "—"}</span></div>
                          <div><span className="text-muted-foreground">OT Eligible</span><span className="float-right font-medium">{policyForm.otEligible ? "Yes" : "No"}</span></div>
                          <div><span className="text-muted-foreground">OT After</span><span className="float-right font-medium">{policyForm.otAfterHours != null ? `${policyForm.otAfterHours}h` : "—"}</span></div>
                          <div><span className="text-muted-foreground">OT Multiplier</span><span className="float-right font-medium">{policyForm.otMultiplier != null ? `×${policyForm.otMultiplier}` : "—"}</span></div>
                          <div><span className="text-muted-foreground">Off-Day OT</span><span className="float-right font-medium">{policyForm.offdayOtMultiplier != null ? `×${policyForm.offdayOtMultiplier}` : "—"}</span></div>
                          <div><span className="text-muted-foreground">Holiday OT</span><span className="float-right font-medium">{policyForm.holidayOtMultiplier != null ? `×${policyForm.holidayOtMultiplier}` : "—"}</span></div>
                          <div><span className="text-muted-foreground">Flexible Hours</span><span className="float-right font-medium">{policyForm.flexible ? "Yes" : "No"}</span></div>
                          <div><span className="text-muted-foreground">Multiple Login</span><span className="float-right font-medium">{policyForm.multipleLogin ? "Allowed" : "Not Allowed"}</span></div>
                          <div><span className="text-muted-foreground">Weekly Leave Days</span><span className="float-right font-medium">{policyForm.weeklyLeaveDays != null ? `${policyForm.weeklyLeaveDays} days` : "—"}</span></div>
                          <div><span className="text-muted-foreground">Lunch Min</span><span className="float-right font-medium">{policyForm.lunchMinHours != null ? `${policyForm.lunchMinHours}h` : "—"}</span></div>
                          <div><span className="text-muted-foreground">Lunch Max</span><span className="float-right font-medium">{policyForm.lunchMaxHours != null ? `${policyForm.lunchMaxHours}h` : "—"}</span></div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 px-5 py-4 border-t border-border bg-muted/20">
                    <Button variant="outline" className="text-xs h-9" onClick={() => setPolicyEditMode("view")}>Cancel</Button>
                    <Button
                      className="text-xs h-9 flex items-center gap-1.5"
                      onClick={() => setPolicyEditMode("view")}
                      disabled={!selectedPolicyId}
                    >
                      <Save className="w-3.5 h-3.5" />
                      Apply Policy
                    </Button>
                  </div>
                </div>
              )}

              {/* ── View Mode Details ── */}
              {policyEditMode === "view" && (
                <>
                  {/* Attendance Rules */}
                  <div className="rounded-xl border border-border bg-muted/20 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/40 border-b border-border">
                      <Clock className="w-3.5 h-3.5 text-primary" />
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Attendance Rules</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3 p-4">
                      {[
                        { label: "Min. Work Hours / Day", value: `${matchedRule.minHours}h` },
                        { label: "Max. Work Hours / Day", value: `${matchedRule.maxHours}h` },
                        { label: "Late Grace Period", value: `${matchedRule.lateGraceMinutes} min` },
                        { label: "Half-Day Threshold", value: `${matchedRule.halfDayHours}h` },
                        { label: "Flexible Hours", value: matchedRule.flexible ? "Yes" : "No" },
                        { label: "Multiple Login", value: matchedRule.multipleLogin ? "Allowed" : "Not Allowed" },
                      ].map(item => (
                        <div key={item.label} className="flex flex-col gap-0.5">
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{item.label}</span>
                          <span className="text-xs font-medium text-foreground">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Overtime Rules */}
                  <div className="rounded-xl border border-border bg-muted/20 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/40 border-b border-border">
                      <BadgeIndianRupee className="w-3.5 h-3.5 text-primary" />
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Overtime Rules</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3 p-4">
                      {[
                        { label: "OT Eligible", value: matchedRule.otEligible ? "Yes" : "No" },
                        { label: "OT After", value: `${matchedRule.otAfterHours}h` },
                        { label: "OT Multiplier", value: `×${matchedRule.otMultiplier}` },
                        { label: "Off-Day OT Multiplier", value: `×${matchedRule.offdayOtMultiplier}` },
                        { label: "Holiday OT Multiplier", value: `×${matchedRule.holidayOtMultiplier}` },
                      ].map(item => (
                        <div key={item.label} className="flex flex-col gap-0.5">
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{item.label}</span>
                          <span className="text-xs font-medium text-foreground">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Leave & Break Rules */}
                  <div className="rounded-xl border border-border bg-muted/20 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/40 border-b border-border">
                      <Shield className="w-3.5 h-3.5 text-primary" />
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Leave & Break Rules</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3 p-4">
                      {[
                        { label: "Weekly Leave Days", value: `${matchedRule.weeklyLeaveDays} days` },
                        { label: "Lunch Min. Hours", value: `${matchedRule.lunchMinHours}h` },
                        { label: "Lunch Max. Hours", value: `${matchedRule.lunchMaxHours}h` },
                      ].map(item => (
                        <div key={item.label} className="flex flex-col gap-0.5">
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{item.label}</span>
                          <span className="text-xs font-medium text-foreground">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {matchedRule.notes && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                      <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1">Policy Notes</p>
                      <p className="text-xs text-amber-800">{matchedRule.notes}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {tab === "documents" && (
            <div className="space-y-3">
              {!isSaved ? (
                <div className="rounded-lg border border-dashed border-border p-6 text-center">
                  <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-medium text-muted-foreground">Save employee profile first</p>
                  <p className="text-xs text-muted-foreground mt-1">Create the employee record before uploading documents.</p>
                  <Button onClick={handleSave} disabled={isPending} className="mt-3 text-xs h-8">
                    {isPending ? "Saving..." : "Save Profile Now"}
                  </Button>
                </div>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">Upload documents in PDF, JPG, PNG, or DOC format (max 10MB each).</p>
                  <DocUploadRow label="NIC (National Identity Card)" fieldName="aadharDoc" currentUrl={emp?.aadharDocUrl} empId={emp?.id} onUploaded={onSaved} />
                  <DocUploadRow label="Passport Copy" fieldName="panDoc" currentUrl={emp?.panDocUrl} empId={emp?.id} onUploaded={onSaved} />
                  <DocUploadRow label="Certificates" fieldName="certificatesDoc" currentUrl={emp?.certificatesDocUrl} empId={emp?.id} onUploaded={onSaved} />
                  <DocUploadRow label="Resume / CV" fieldName="resumeDoc" currentUrl={emp?.resumeDocUrl} empId={emp?.id} onUploaded={onSaved} />
                  <div className="rounded-lg bg-muted/50 p-3 mt-2">
                    <p className="text-xs font-medium mb-1.5">Document Status</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: "NIC (National Identity Card)", url: emp?.aadharDocUrl },
                        { label: "Passport Copy", url: emp?.panDocUrl },
                        { label: "Certificates", url: emp?.certificatesDocUrl },
                        { label: "Resume / CV", url: emp?.resumeDocUrl },
                      ].map(doc => (
                        <div key={doc.label} className="flex items-center gap-1.5 text-xs">
                          {doc.url
                            ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                            : <AlertCircle className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                          <span className={doc.url ? "text-foreground" : "text-muted-foreground"}>{doc.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {tab !== "documents" && tab !== "policy" && (
          <div className="border-t border-border px-5 py-4 flex justify-end gap-3 bg-muted/20">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? "Saving..." : emp ? "Update Employee" : "Create Employee"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Departments Tab ────────────────────────────────────────────────────────────
function DepartmentsTab() {
  const qc = useQueryClient();
  const { data: depts, isLoading } = useGet(["departments"], "/departments");
  const createD = useMut("POST", "/departments", ["departments"]);
  const updateD = useMutation({
    mutationFn: ({ id, data }: any) => fetch(apiUrl(`/departments/${id}`), {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data)
    }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["departments"] }),
  });
  const deleteD = useMutation({
    mutationFn: (id: number) => fetch(apiUrl(`/departments/${id}`), { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["departments"] }),
  });
  const [form, setForm] = useState({ name:"", code:"", description:"" });
  const [editId, setEditId] = useState<number|null>(null);
  const [showForm, setShowForm] = useState(false);

  function openEdit(d: any) { setForm({ name: d.name, code: d.code, description: d.description || "" }); setEditId(d.id); setShowForm(true); }
  function openNew() { setForm({ name:"", code:"", description:"" }); setEditId(null); setShowForm(true); }
  function handleSave() {
    if (editId) updateD.mutate({ id: editId, data: form }, { onSuccess: () => setShowForm(false) });
    else createD.mutate(form, { onSuccess: () => setShowForm(false) });
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={openNew} className="text-xs flex items-center gap-1.5 h-8 px-3"><Plus className="w-3.5 h-3.5" />Add Department</Button>
      </div>
      {showForm && (
        <Card className="p-4 border-primary/20 bg-primary/5">
          <p className="text-xs font-semibold mb-3">{editId ? "Edit Department" : "New Department"}</p>
          <div className="grid grid-cols-3 gap-3">
            <div><Label className="text-xs">Department Name</Label><Input placeholder="e.g. Operations" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} /></div>
            <div><Label className="text-xs">Code</Label><Input placeholder="OPS" value={form.code} onChange={e => setForm(f => ({...f, code: e.target.value.toUpperCase()}))} /></div>
            <div><Label className="text-xs">Description</Label><Input placeholder="Short description" value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} /></div>
          </div>
          <div className="flex gap-2 justify-end mt-3">
            <Button variant="outline" className="text-xs h-8" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button className="text-xs h-8" onClick={handleSave}>Save</Button>
          </div>
        </Card>
      )}
      <Card className="overflow-hidden">
        {isLoading ? <p className="text-center py-8 text-sm text-muted-foreground">Loading...</p> : (
          <table className="w-full text-xs">
            <thead className="bg-muted/50">
              <tr>{["Code","Department Name","Description","Status","Actions"].map(h => <th key={h} className="px-3 py-2.5 text-left font-semibold text-muted-foreground">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(Array.isArray(depts) ? depts : []).map((d: any) => (
                <tr key={d.id} className="hover:bg-muted/30">
                  <td className="px-3 py-2.5 font-mono font-medium text-primary">{d.code}</td>
                  <td className="px-3 py-2.5 font-medium">{d.name}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{d.description || "—"}</td>
                  <td className="px-3 py-2.5">
                    <span className={cn("px-2 py-0.5 rounded text-xs", d.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500")}>
                      {d.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(d)} className="p-1.5 hover:bg-muted rounded"><Edit2 className="w-3 h-3" /></button>
                      <button onClick={() => { if(confirm(`Delete "${d.name}"?`)) deleteD.mutate(d.id); }} className="p-1.5 hover:bg-red-100 text-red-500 rounded"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!(Array.isArray(depts) ? depts : []).length && <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">No departments found.</td></tr>}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

// ── Designations Tab ───────────────────────────────────────────────────────────
function DesignationsTab() {
  const qc = useQueryClient();
  const { data: desigs, isLoading } = useGet(["designations"], "/designations");
  const { data: depts } = useGet(["departments"], "/departments");
  const createDes = useMut("POST", "/designations", ["designations"]);
  const updateDes = useMutation({
    mutationFn: ({ id, data }: any) => fetch(apiUrl(`/designations/${id}`), {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data)
    }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["designations"] }),
  });
  const deleteDes = useMutation({
    mutationFn: (id: number) => fetch(apiUrl(`/designations/${id}`), { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["designations"] }),
  });
  const [form, setForm] = useState({ name:"", code:"", departmentId:"", level:1, description:"" });
  const [editId, setEditId] = useState<number|null>(null);
  const [showForm, setShowForm] = useState(false);

  const LEVEL_LABEL = ["","Staff","Officer","Supervisor","Manager","Head"];

  function openEdit(d: any) { setForm({ name: d.name, code: d.code, departmentId: d.departmentId || "", level: d.level || 1, description: d.description || "" }); setEditId(d.id); setShowForm(true); }
  function openNew() { setForm({ name:"", code:"", departmentId:"", level:1, description:"" }); setEditId(null); setShowForm(true); }
  function handleSave() {
    const payload = { ...form, departmentId: form.departmentId ? Number(form.departmentId) : null };
    if (editId) updateDes.mutate({ id: editId, data: payload }, { onSuccess: () => setShowForm(false) });
    else createDes.mutate(payload, { onSuccess: () => setShowForm(false) });
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={openNew} className="text-xs flex items-center gap-1.5 h-8 px-3"><Plus className="w-3.5 h-3.5" />Add Designation</Button>
      </div>
      {showForm && (
        <Card className="p-4 border-primary/20 bg-primary/5">
          <p className="text-xs font-semibold mb-3">{editId ? "Edit Designation" : "New Designation"}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div><Label className="text-xs">Designation Name</Label><Input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} /></div>
            <div><Label className="text-xs">Code</Label><Input value={form.code} onChange={e => setForm(f => ({...f, code: e.target.value.toUpperCase()}))} /></div>
            <div>
              <Label className="text-xs">Department</Label>
              <Select value={form.departmentId} onChange={e => setForm(f => ({...f, departmentId: e.target.value}))}>
                <option value="">— Any —</option>
                {(Array.isArray(depts) ? depts : []).map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </Select>
            </div>
            <div>
              <Label className="text-xs">Level</Label>
              <Select value={form.level} onChange={e => setForm(f => ({...f, level: Number(e.target.value)}))}>
                {[1,2,3,4,5].map(l => <option key={l} value={l}>{l} – {LEVEL_LABEL[l]}</option>)}
              </Select>
            </div>
            <div className="col-span-2 md:col-span-4"><Label className="text-xs">Description</Label><Input value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} /></div>
          </div>
          <div className="flex gap-2 justify-end mt-3">
            <Button variant="outline" className="text-xs h-8" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button className="text-xs h-8" onClick={handleSave}>Save</Button>
          </div>
        </Card>
      )}
      <Card className="overflow-hidden">
        {isLoading ? <p className="text-center py-8 text-sm text-muted-foreground">Loading...</p> : (
          <table className="w-full text-xs">
            <thead className="bg-muted/50">
              <tr>{["Code","Designation","Department","Level","Status","Actions"].map(h => <th key={h} className="px-3 py-2.5 text-left font-semibold text-muted-foreground">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(Array.isArray(desigs) ? desigs : []).map((d: any) => (
                <tr key={d.id} className="hover:bg-muted/30">
                  <td className="px-3 py-2.5 font-mono text-primary font-medium">{d.code}</td>
                  <td className="px-3 py-2.5 font-medium">{d.name}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{d.departmentName || "—"}</td>
                  <td className="px-3 py-2.5"><span className="px-2 py-0.5 bg-muted rounded text-xs">{LEVEL_LABEL[d.level] || "Staff"}</span></td>
                  <td className="px-3 py-2.5">
                    <span className={cn("px-2 py-0.5 rounded text-xs", d.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500")}>
                      {d.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(d)} className="p-1.5 hover:bg-muted rounded"><Edit2 className="w-3 h-3" /></button>
                      <button onClick={() => { if(confirm(`Delete "${d.name}"?`)) deleteDes.mutate(d.id); }} className="p-1.5 hover:bg-red-100 text-red-500 rounded"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!(Array.isArray(desigs) ? desigs : []).length && <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No designations found.</td></tr>}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

// ── Salary scale (mirrors server) ──────────────────────────────────────────────
const SALARY_SCALE: Record<string, number> = {
  "Postmaster General": 150000, "Deputy Postmaster General": 120000,
  "Regional Postmaster": 80000, "Sub Postmaster": 60000,
  "Postal Supervisor": 55000, "Senior Postal Officer": 50000,
  "Postal Officer": 45000, "Counter Clerk": 40000,
  "Sorting Officer": 38000, "Delivery Agent": 35000,
  "Accounts Officer": 55000, "HR Officer": 50000, "IT Officer": 55000,
  "PSB Officer": 48000, "Driver": 38000, "Security Officer": 35000,
  "Clerical Assistant": 32000, "Data Entry Operator": 35000,
};
const MONTHS_LIST = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const PAY_STATUS_STYLE: Record<string, string> = {
  draft:    "bg-amber-100 text-amber-700",
  approved: "bg-blue-100 text-blue-700",
  paid:     "bg-emerald-100 text-emerald-700",
};

// ── Payroll Tab ────────────────────────────────────────────────────────────────
function PayrollTab() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [sortField, setSortField] = useState("name");
  const [sortAsc, setSortAsc] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [payrollMap, setPayrollMap] = useState<Record<number, any>>({});
  const [loadingPayroll, setLoadingPayroll] = useState(false);

  const { data } = useListEmployees({ limit: 500 });
  const allEmployees: any[] = (data?.employees || []).filter((e: any) => e.status === "active");

  const loadPayrollStatus = async () => {
    setLoadingPayroll(true);
    try {
      const res = await fetch(apiUrl(`/payroll/employees-for-payroll?month=${month}&year=${year}`));
      const json = await res.json();
      const map: Record<number, any> = {};
      (json.employees || []).forEach((e: any) => { map[e.id] = e; });
      setPayrollMap(map);
    } catch {}
    setLoadingPayroll(false);
  };

  useEffect(() => { loadPayrollStatus(); }, [month, year]);

  const filtered = useMemo(() => {
    let list = allEmployees;
    if (filterType !== "all") list = list.filter((e: any) => e.employeeType === filterType);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((e: any) =>
        empDisplayName(e).toLowerCase().includes(q) ||
        (e.employeeId || "").toLowerCase().includes(q) ||
        (e.designation || "").toLowerCase().includes(q) ||
        (e.department || "").toLowerCase().includes(q)
      );
    }
    return [...list].sort((a: any, b: any) => {
      const av = sortField === "name" ? empDisplayName(a) :
                 sortField === "salary" ? (SALARY_SCALE[a.designation] ?? 40000) :
                 sortField === "type" ? (a.employeeType || "") : empDisplayName(a);
      const bv = sortField === "name" ? empDisplayName(b) :
                 sortField === "salary" ? (SALARY_SCALE[b.designation] ?? 40000) :
                 sortField === "type" ? (b.employeeType || "") : empDisplayName(b);
      if (typeof av === "number") return sortAsc ? av - bv : bv - av;
      return sortAsc ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
  }, [allEmployees, filterType, search, sortField, sortAsc]);

  const allFilteredSelected = filtered.length > 0 && filtered.every((e: any) => selected.has(e.id));

  const toggleAll = () => {
    if (allFilteredSelected) {
      const s = new Set(selected); filtered.forEach((e: any) => s.delete(e.id)); setSelected(s);
    } else {
      const s = new Set(selected); filtered.forEach((e: any) => s.add(e.id)); setSelected(s);
    }
  };

  const quickSelect = (type: string) => {
    if (type === "all") setSelected(new Set(allEmployees.map((e: any) => e.id)));
    else if (type === "none") setSelected(new Set());
    else if (type === "new") setSelected(new Set(allEmployees.filter((e: any) => !payrollMap[e.id]?.hasPayroll).map((e: any) => e.id)));
    else setSelected(new Set(allEmployees.filter((e: any) => e.employeeType === type).map((e: any) => e.id)));
  };

  const generatePayroll = async () => {
    if (selected.size === 0) return;
    const hasPaid = Array.from(selected).some(id => payrollMap[id]?.payrollStatus === "paid");
    if (hasPaid && !confirm("Some selected employees already have PAID payroll. Regenerating will overwrite those records. Continue?")) return;
    else if (!hasPaid && !confirm(`Generate payroll for ${selected.size} employee(s) for ${MONTHS_LIST[month - 1]} ${year}?`)) return;
    setGenerating(true); setMsg(null);
    try {
      const r = await fetch(apiUrl("/payroll/generate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, year, employeeIds: Array.from(selected) }),
      });
      const d = await r.json();
      if (d.success) {
        setMsg({ type: "success", text: `✓ Payroll generated for ${d.count} employee(s) — ${MONTHS_LIST[month - 1]} ${year}` });
        await loadPayrollStatus();
        setSelected(new Set());
      } else {
        setMsg({ type: "error", text: d.message || "Generation failed." });
      }
    } catch {
      setMsg({ type: "error", text: "Could not connect to server." });
    }
    setGenerating(false);
  };

  const totalBasic = allEmployees.reduce((s: number, e: any) => s + (SALARY_SCALE[e.designation] ?? 40000), 0);
  const withPayroll = allEmployees.filter((e: any) => payrollMap[e.id]?.hasPayroll).length;

  const toggleSort = (f: string) => {
    if (sortField === f) setSortAsc(!sortAsc);
    else { setSortField(f); setSortAsc(true); }
  };

  return (
    <div className="space-y-4">
      {/* Period + Stats */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Select value={String(month)} onChange={e => setMonth(Number(e.target.value))} className="w-36 text-xs h-8">
            {MONTHS_LIST.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </Select>
          <Select value={String(year)} onChange={e => setYear(Number(e.target.value))} className="w-22 text-xs h-8">
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </Select>
          <button onClick={loadPayrollStatus} className="p-1.5 rounded-lg border border-border hover:bg-muted transition-colors" title="Refresh payroll status">
            <RefreshCw className={cn("w-3.5 h-3.5 text-muted-foreground", loadingPayroll && "animate-spin")} />
          </button>
        </div>
        <div className="flex gap-2 ml-auto flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 border border-border rounded-lg px-3 py-1.5">
            <Users className="w-3.5 h-3.5" /><span className="font-semibold text-foreground">{allEmployees.length}</span> Active
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
            <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" /><span className="font-semibold text-emerald-700">{withPayroll}</span> Have Payroll
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
            <CircleDashed className="w-3.5 h-3.5 text-amber-600" /><span className="font-semibold text-amber-700">{allEmployees.length - withPayroll}</span> Pending
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5">
            <Banknote className="w-3.5 h-3.5 text-blue-600" />Rs.&nbsp;<span className="font-semibold text-blue-700">{Math.round(totalBasic).toLocaleString("en-LK")}</span> Est. Basic
          </div>
        </div>
      </div>

      {msg && (
        <div className={cn("flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border",
          msg.type === "success" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200")}>
          {msg.type === "success" ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)} className="ml-auto p-0.5 hover:opacity-70"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Quick Select + Search */}
      <Card className="p-3 space-y-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">Quick Select:</span>
          {[
            { label: `All Active (${allEmployees.length})`, key: "all", cls: "border-border hover:bg-muted" },
            { label: `Permanent (${allEmployees.filter((e:any)=>e.employeeType==="permanent").length})`, key: "permanent", cls: "border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100" },
            { label: `Contract (${allEmployees.filter((e:any)=>e.employeeType==="contract").length})`, key: "contract", cls: "border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100" },
            { label: `Casual (${allEmployees.filter((e:any)=>e.employeeType==="casual").length})`, key: "casual", cls: "border-orange-200 text-orange-700 bg-orange-50 hover:bg-orange-100" },
            { label: `Not Yet Assigned (${allEmployees.filter((e:any)=>!payrollMap[e.id]?.hasPayroll).length})`, key: "new", cls: "border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100" },
          ].map(opt => (
            <button
              key={opt.key}
              onClick={() => quickSelect(opt.key)}
              className={cn("text-xs px-2.5 py-1 rounded-lg border transition-colors font-medium", opt.cls)}
            >
              {opt.label}
            </button>
          ))}
          <button
            onClick={() => quickSelect("none")}
            className="text-xs px-2.5 py-1 rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground ml-1"
          >
            Clear All
          </button>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, ID, designation, department…"
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background"
            />
          </div>
          <Select value={filterType} onChange={e => setFilterType(e.target.value)} className="text-xs h-8 w-32">
            <option value="all">All Types</option>
            <option value="permanent">Permanent</option>
            <option value="contract">Contract</option>
            <option value="casual">Casual</option>
          </Select>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden p-0">
        <div className="px-4 py-3 border-b border-border flex items-center gap-3 bg-muted/20">
          <ListChecks className="w-4 h-4 text-primary" />
          <p className="text-xs font-semibold text-foreground flex-1">
            Employee Payroll Assignment — {MONTHS_LIST[month - 1]} {year}
          </p>
          <span className="text-xs text-muted-foreground">{filtered.length} employees shown</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                <th className="px-3 py-2.5 w-10">
                  <input type="checkbox" checked={allFilteredSelected} onChange={toggleAll} className="rounded" />
                </th>
                {[
                  { label: "Emp ID", f: null },
                  { label: "Name", f: "name" },
                  { label: "Designation / Dept", f: null },
                  { label: "Type", f: "type" },
                  { label: "Basic Salary", f: "salary" },
                  { label: "EPF / ETF No.", f: null },
                  { label: `Payroll Status (${MONTHS_LIST[month-1]} ${year})`, f: null },
                ].map(col => (
                  <th
                    key={col.label}
                    onClick={() => col.f && toggleSort(col.f)}
                    className={cn("px-3 py-2.5 text-left font-semibold text-muted-foreground whitespace-nowrap uppercase tracking-wide text-[10px]",
                      col.f && "cursor-pointer hover:text-foreground")}
                  >
                    <span className="flex items-center gap-1">
                      {col.label}
                      {col.f && sortField === col.f && (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-10 text-muted-foreground">No employees match your filters.</td></tr>
              ) : (
                filtered.map((emp: any, i: number) => {
                  const ps = payrollMap[emp.id];
                  const basicSalary = SALARY_SCALE[emp.designation] ?? 40000;
                  const isSelected = selected.has(emp.id);
                  return (
                    <tr
                      key={emp.id}
                      onClick={() => {
                        const s = new Set(selected);
                        s.has(emp.id) ? s.delete(emp.id) : s.add(emp.id);
                        setSelected(s);
                      }}
                      className={cn(
                        "cursor-pointer hover:bg-muted/40 transition-colors",
                        i % 2 === 0 ? "bg-background" : "bg-muted/10",
                        isSelected && "bg-primary/5 hover:bg-primary/8"
                      )}
                    >
                      <td className="px-3 py-2.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          onClick={e => e.stopPropagation()}
                          className="rounded pointer-events-none"
                        />
                      </td>
                      <td className="px-3 py-2.5 font-mono text-primary font-medium whitespace-nowrap">{emp.employeeId}</td>
                      <td className="px-3 py-2.5">
                        <div className="font-semibold text-foreground whitespace-nowrap">{empDisplayName(emp)}</div>
                        <div className="text-[10px] text-muted-foreground">{emp.email}</div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="text-foreground">{emp.designation || "—"}</div>
                        <div className="text-[10px] text-muted-foreground">{emp.department || ""}</div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium", EMP_TYPE_STYLE[emp.employeeType] || EMP_TYPE_STYLE.permanent)}>
                          {emp.employeeType?.[0]?.toUpperCase() + emp.employeeType?.slice(1) || "Permanent"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-mono font-semibold whitespace-nowrap">
                        Rs. {basicSalary.toLocaleString("en-LK")}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-muted-foreground whitespace-nowrap">
                        <div>{emp.epfNumber || "—"}</div>
                        <div className="text-[10px]">{emp.etfNumber || "—"}</div>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {ps?.hasPayroll ? (
                          <div className="space-y-0.5">
                            <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium text-[10px]", PAY_STATUS_STYLE[ps.payrollStatus] || "bg-muted text-muted-foreground")}>
                              {ps.payrollStatus === "paid" && <BadgeCheck className="w-2.5 h-2.5" />}
                              {ps.payrollStatus === "approved" && <CheckCircle className="w-2.5 h-2.5" />}
                              {ps.payrollStatus === "draft" && <Clock className="w-2.5 h-2.5" />}
                              {ps.payrollStatus?.toUpperCase()}
                            </span>
                            <div className="text-[10px] text-muted-foreground">Net: Rs. {Math.round(ps.currentNetSalary || 0).toLocaleString("en-LK")}</div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium text-[10px]">
                            <CircleDashed className="w-2.5 h-2.5" /> Not Generated
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Bottom action bar */}
      <div className="sticky bottom-0 bg-background border border-border rounded-xl shadow-lg px-4 py-3 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-3 text-sm flex-wrap">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <ListChecks className="w-4 h-4 text-primary" />
            <strong className="text-foreground">{selected.size}</strong> employee{selected.size !== 1 ? "s" : ""} selected
          </span>
          {selected.size > 0 && (() => {
            const regen = Array.from(selected).filter(id => payrollMap[id]?.hasPayroll).length;
            const fresh = selected.size - regen;
            return (
              <span className="text-xs text-muted-foreground flex gap-2">
                {fresh > 0 && <span className="text-emerald-600 font-medium">+{fresh} new</span>}
                {regen > 0 && <span className="text-amber-600 font-medium">↺ {regen} regenerate</span>}
              </span>
            );
          })()}
        </div>
        <div className="ml-auto flex gap-2">
          {selected.size > 0 && (
            <button
              onClick={() => setSelected(new Set())}
              className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground"
            >
              Clear Selection
            </button>
          )}
          <Button
            onClick={generatePayroll}
            disabled={generating || selected.size === 0}
            className="text-xs flex items-center gap-2 h-8"
          >
            <Banknote className="w-3.5 h-3.5" />
            {generating ? "Generating…" : selected.size === 0
              ? "Select employees to generate payroll"
              : `Generate Payroll for ${selected.size} Employee${selected.size !== 1 ? "s" : ""}`}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function Employees() {
  const [activeTab, setActiveTab] = useState<Tab>("Employee List");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterBranchId, setFilterBranchId] = useState("");
  const [drawerEmp, setDrawerEmp] = useState<any | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data: branchRes } = useListBranches();
  const branches: any[] = branchRes || [];
  const { data: deptData } = useGet(["departments"], "/departments");
  const allDeptNames: string[] = Array.isArray(deptData) ? deptData.filter((d: any) => d.isActive).map((d: any) => d.name) : [];

  const params: any = { limit: 500 };
  if (filterStatus) params.status = filterStatus;
  if (filterDept) params.department = filterDept;
  if (filterType) params.employeeType = filterType;

  const { data, isLoading, refetch } = useListEmployees(params);
  const deleteEmp = useDeleteEmployee();

  const allEmployees = data?.employees || [];

  const employees = useMemo(() => {
    let list = allEmployees;
    if (filterBranchId) {
      list = list.filter((e: any) => e.branchId === Number(filterBranchId));
    }
    if (!search) return list;
    const s = search.toLowerCase();
    return list.filter((e: any) =>
      empDisplayName(e).toLowerCase().includes(s) ||
      e.employeeId.toLowerCase().includes(s) ||
      (e.nicNumber || "").toLowerCase().includes(s) ||
      (e.panNumber || "").toLowerCase().includes(s) ||
      (e.email || "").toLowerCase().includes(s)
    );
  }, [allEmployees, search, filterBranchId]);

  function exportCSV() {
    const headers = ["Employee ID","Biometric ID","First Name","Last Name","Gender","Designation","Department","Branch","Type","Status","Phone","Email","NIC Number","Passport No.","Basic Salary (LKR)","EPF No.","ETF No.","Joining Date"];
    const rows = employees.map((e: any) => [
      e.employeeId, e.biometricId || "", e.firstName || "", e.lastName || e.fullName || "",
      e.gender, e.designation, e.department,
      e.branchName, e.employeeType, e.status, e.phone, e.email,
      e.nicNumber || "", e.panNumber || "", e.basicSalary || "", e.epfNumber || "", e.etfNumber || "", e.joiningDate
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "employees.csv"; a.click();
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Employee Management" description="Manage staff profiles, departments, and designations." />

      {/* Mini Dashboard */}
      <EmployeeMiniDashboard
        allEmployees={allEmployees}
        onFilter={status => { setFilterStatus(status); setActiveTab("Employee List"); }}
      />

      {/* Tab Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 p-1 bg-muted/60 rounded-xl border border-border">
          {TABS.map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200",
                activeTab === t
                  ? "bg-background text-primary shadow-sm border border-border"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              )}>
              {t === "Employee List" && <Users className="w-3.5 h-3.5" />}
              {t === "Departments" && <Building2 className="w-3.5 h-3.5" />}
              {t === "Designations" && <Layers className="w-3.5 h-3.5" />}
              {t === "Payroll" && <BadgeIndianRupee className="w-3.5 h-3.5" />}
              {t}
              {t === "Employee List" && (
                <span className={cn(
                  "ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold tabular-nums",
                  activeTab === t ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                )}>{allEmployees.length}</span>
              )}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {activeTab === "Employee List" && (
            <>
              <Button variant="outline" onClick={exportCSV} className="text-xs h-8 px-3 flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5" /> Export CSV
              </Button>
              <Button onClick={() => { setDrawerEmp(null); setDrawerOpen(true); }} className="text-xs h-8 px-3 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Add Employee
              </Button>
            </>
          )}
        </div>
      </div>

      {activeTab === "Employee List" && (
        <>
          <Card className="p-3 flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input placeholder="Search name, ID, NIC, email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-xs" />
            </div>
            <Select
              value={filterBranchId}
              onChange={e => setFilterBranchId(e.target.value)}
              className="h-8 text-xs w-48"
            >
              <option value="">All Locations</option>
              {branches.map((b: any) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </Select>
            <Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="h-8 text-xs w-32">
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="on_leave">On Leave</option>
              <option value="resigned">Resigned</option>
              <option value="terminated">Terminated</option>
            </Select>
            <Select value={filterDept} onChange={e => setFilterDept(e.target.value)} className="h-8 text-xs w-40">
              <option value="">All Departments</option>
              {(allDeptNames.length > 0 ? allDeptNames : DEPT_LIST).map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </Select>
            <Select value={filterType} onChange={e => setFilterType(e.target.value)} className="h-8 text-xs w-28">
              <option value="">All Types</option>
              <option value="permanent">Permanent</option>
              <option value="contract">Contract</option>
              <option value="casual">Casual</option>
            </Select>
            {(search || filterStatus || filterDept || filterType || filterBranchId) && (
              <button
                onClick={() => { setSearch(""); setFilterStatus(""); setFilterDept(""); setFilterType(""); setFilterBranchId(""); }}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" /> Clear
              </button>
            )}
            <span className="ml-auto text-xs text-muted-foreground">{employees.length} employee{employees.length !== 1 ? "s" : ""}</span>
          </Card>

          <Card className="overflow-hidden">
            {isLoading ? (
              <p className="text-center py-10 text-sm text-muted-foreground">Loading employees...</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      {["Emp ID","Name","Designation / Dept","Branch","Type","NIC / Passport","Status","Actions"].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {employees.map((emp: any) => (
                      <tr key={emp.id} className="hover:bg-muted/30 transition-colors group">
                        <td className="px-3 py-2.5 font-mono text-xs text-primary font-medium">{emp.employeeId}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-muted/60 border border-border overflow-hidden shrink-0 flex items-center justify-center">
                              {emp.photoUrl
                                ? <img src={emp.photoUrl} alt={empDisplayName(emp)} className="w-full h-full object-cover" />
                                : <span className="text-[10px] font-bold text-muted-foreground">
                                    {(emp.firstName?.[0] || emp.fullName?.[0] || "E").toUpperCase()}
                                  </span>
                              }
                            </div>
                            <div>
                              <div className="font-medium">{empDisplayName(emp)}</div>
                              <div className="text-muted-foreground flex items-center gap-1"><Mail className="w-2.5 h-2.5" /> {emp.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="font-medium">{emp.designation}</div>
                          <div className="text-muted-foreground">{emp.department}</div>
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground">
                          <div className="flex items-center gap-1"><MapPin className="w-3 h-3 shrink-0" /><span className="truncate max-w-[120px]">{emp.branchName}</span></div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={cn("px-1.5 py-0.5 rounded text-xs font-medium", EMP_TYPE_STYLE[emp.employeeType] || EMP_TYPE_STYLE.permanent)}>
                            {emp.employeeType?.[0]?.toUpperCase() + emp.employeeType?.slice(1) || "Permanent"}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-muted-foreground text-xs">
                          <div>{emp.nicNumber || "—"}</div>
                          {emp.panNumber && <div className="text-primary">{emp.panNumber}</div>}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={cn("px-2 py-0.5 rounded text-xs font-medium", STATUS_STYLE[emp.status] || STATUS_STYLE.active)}>
                            {emp.status === "on_leave" ? "On Leave" : emp.status?.[0]?.toUpperCase() + emp.status?.slice(1) || "Active"}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { setDrawerEmp(emp); setDrawerOpen(true); }} className="p-1.5 hover:bg-muted rounded text-muted-foreground" title="Edit">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => { if(confirm(`Delete "${empDisplayName(emp)}"?`)) deleteEmp.mutate({ id: emp.id }, { onSuccess: () => refetch() }); }}
                              className="p-1.5 hover:bg-red-100 text-red-500 rounded" title="Delete">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!employees.length && (
                      <tr><td colSpan={8} className="text-center py-10 text-muted-foreground">No employees found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {activeTab === "Departments" && <DepartmentsTab />}
      {activeTab === "Designations" && <DesignationsTab />}
      {activeTab === "Payroll" && <PayrollTab />}

      {drawerOpen && (
        <EmployeeDrawer
          emp={drawerEmp}
          branches={branches}
          onClose={() => setDrawerOpen(false)}
          onSaved={() => { setDrawerOpen(false); refetch(); }}
        />
      )}
    </div>
  );
}
