import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useListEmployees, useCreateEmployee, useUpdateEmployee, useDeleteEmployee,
  useListBranches, useListShifts
} from "@workspace/api-client-react";
import { PageHeader, Card, Button, Input, Label, Select } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  Search, Plus, Edit2, Trash2, Download, Mail,
  MapPin, X, Building2, Users,
  FileText, Upload, CheckCircle2, AlertCircle, UserCircle,
  Briefcase, Phone, Hash, CreditCard, Calendar,
  IdCard, Home, Shield, Camera, BadgeIndianRupee,
  Banknote, UserCheck, ListChecks, CheckCircle, Clock,
  CircleDashed, BadgeCheck, RefreshCw, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Settings, Save, Check, Network,
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

const TABS = ["Employee List", "Departments", "Shift Details", "Payroll"] as const;
type Tab = typeof TABS[number];

const DEPT_LIST = ["Operations","Finance & Accounts","Human Resources","Information Technology","Postal Services","Customer Service","Administration","Logistics & Delivery"];

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
  const total      = allEmployees.length;
  const active     = allEmployees.filter(e => e.status === "active").length;
  const onLeave    = allEmployees.filter(e => e.status === "on_leave").length;
  const resigned   = allEmployees.filter(e => e.status === "resigned").length;
  const terminated = allEmployees.filter(e => e.status === "terminated").length;
  const STATUS_ITEMS = [
    { label: "Active",     val: active,     dot: "bg-green-500",  status: "active",      badge: "bg-green-100 text-green-700" },
    { label: "On Leave",   val: onLeave,    dot: "bg-yellow-400", status: "on_leave",    badge: "bg-yellow-100 text-yellow-700" },
    { label: "Resigned",   val: resigned,   dot: "bg-orange-400", status: "resigned",    badge: "bg-orange-100 text-orange-700" },
    { label: "Terminated", val: terminated, dot: "bg-red-500",    status: "terminated",  badge: "bg-red-100 text-red-700" },
  ];

  return (
    <div className="flex flex-wrap items-stretch gap-2">
      {/* Total */}
      <div className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 flex items-center gap-3 min-w-[120px] shadow-sm">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Users className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide leading-none mb-1">Total</p>
          <p className="text-2xl font-extrabold text-slate-800 leading-none tabular-nums">{total}</p>
        </div>
      </div>

      {/* Divider */}
      <div className="w-px bg-slate-200 self-stretch hidden md:block" />

      {/* Status badges */}
      {STATUS_ITEMS.map(s => (
        <button key={s.label} onClick={() => onFilter(s.status)}
          className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 flex items-center gap-3 hover:border-primary/50 hover:shadow-md transition-all group shadow-sm">
          <div className={cn("w-2.5 h-2.5 rounded-full shrink-0 shadow-sm", s.dot)} />
          <div className="text-left">
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide leading-none mb-1 group-hover:text-slate-600">{s.label}</p>
            <p className="text-xl font-extrabold text-slate-700 leading-none tabular-nums">{s.val}</p>
          </div>
          <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden ml-1 hidden sm:block">
            <div className={cn("h-full rounded-full transition-all", s.dot)} style={{ width: total ? `${(s.val / total) * 100}%` : "0%" }} />
          </div>
        </button>
      ))}

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
  department:"", branchId:"", shiftId:"", weekoffScheduleId:"", joiningDate:"",
  employeeType:"permanent", reportingManagerId:"", biometricId:"", status:"active",
  epfNumber:"", etfNumber:"", basicSalary:"", remarks:"",
};


// ── Employee Connections + Heatmap Tab ─────────────────────────────────────────
function EmployeeConnectionsTab({ emp }: { emp: any }) {
  const [heatmap, setHeatmap] = useState<Record<string, string>>({});
  const [heatLoading, setHeatLoading] = useState(true);
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!emp?.id) return;
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - 364);
    const startDate = start.toISOString().slice(0, 10);
    const endDate = today.toISOString().slice(0, 10);

    setHeatLoading(true);
    fetch(apiUrl(`/attendance?employeeId=${emp.id}&startDate=${startDate}&endDate=${endDate}&limit=9999`))
      .then(r => r.json())
      .then(data => {
        const map: Record<string, string> = {};
        (data.records || []).forEach((r: any) => { map[r.date] = r.status; });
        setHeatmap(map);
        setCounts(c => ({ ...c, attendance: data.total ?? (data.records?.length ?? 0) }));
      })
      .catch(() => {})
      .finally(() => setHeatLoading(false));

    fetch(apiUrl(`/biometric/logs?employeeId=${emp.id}&limit=9999`))
      .then(r => r.json())
      .then(data => setCounts(c => ({ ...c, biometric: data.total ?? 0 })))
      .catch(() => {});

    fetch(apiUrl(`/incentives?employeeId=${emp.id}`))
      .then(r => r.json())
      .then(data => setCounts(c => ({ ...c, incentives: Array.isArray(data) ? data.length : 0 })))
      .catch(() => {});

    fetch(apiUrl(`/loans?employeeId=${emp.id}`))
      .then(r => r.json())
      .then(data => setCounts(c => ({ ...c, loans: Array.isArray(data) ? data.length : 0 })))
      .catch(() => {});

    fetch(apiUrl(`/leave-balances/employee/${emp.id}`))
      .then(r => r.json())
      .then(data => {
        const annual = data?.annualLeaveBalance ?? data?.annualLeave ?? 0;
        const casual = data?.casualLeaveBalance ?? data?.casualLeave ?? 0;
        setCounts(c => ({ ...c, leaveAnnual: Number(annual), leaveCasual: Number(casual) }));
      })
      .catch(() => {});
  }, [emp?.id]);

  // Build 52-week grid anchored to this Sunday
  const today = new Date();
  const startSun = new Date(today);
  startSun.setDate(today.getDate() - today.getDay()); // this Sunday
  const weeks: Date[][] = [];
  for (let w = 51; w >= 0; w--) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      const day = new Date(startSun);
      day.setDate(startSun.getDate() - w * 7 + d);
      week.push(day);
    }
    weeks.push(week);
  }

  // Month labels (show label at first week of each month)
  const monthLabels: Record<number, string> = {};
  let lastMonth = -1;
  weeks.forEach((week, i) => {
    const m = week[0].getMonth();
    if (m !== lastMonth) {
      monthLabels[i] = week[0].toLocaleString("default", { month: "short" }).toUpperCase();
      lastMonth = m;
    }
  });

  const STATUS_CLS: Record<string, string> = {
    present:  "bg-green-500",
    late:     "bg-amber-400",
    absent:   "bg-red-500",
    half_day: "bg-yellow-400",
    leave:    "bg-purple-400",
    holiday:  "bg-slate-400",
  };
  const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  function dotCls(date: Date) {
    if (date > today) return "bg-transparent";
    const ds = date.toISOString().slice(0, 10);
    const st = heatmap[ds];
    if (!st) return (date.getDay() === 0 || date.getDay() === 6) ? "bg-slate-200" : "bg-muted/60";
    return STATUS_CLS[st] ?? "bg-slate-300";
  }

  function CountBadge({ n }: { n?: number }) {
    if (!n) return null;
    return (
      <span className="mr-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary tabular-nums">
        {n > 99 ? "99+" : n}
      </span>
    );
  }

  function ConnItem({ label, count }: { label: string; count?: number }) {
    return (
      <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-medium text-foreground select-none">
        <CountBadge n={count} />
        <span className="flex-1">{label}</span>
        <Plus className="w-3 h-3 text-muted-foreground shrink-0" />
      </div>
    );
  }

  const CONN_GROUPS = [
    {
      title: "Attendance",
      items: [
        { label: "Attendance Records", count: counts.attendance },
        { label: "Biometric Logs",     count: counts.biometric  },
      ],
    },
    {
      title: "Leave",
      items: [
        { label: "Annual Leave Balance",  count: counts.leaveAnnual  },
        { label: "Casual Leave Balance",  count: counts.leaveCasual  },
      ],
    },
    {
      title: "Payroll & Finance",
      items: [
        { label: "Incentives",  count: counts.incentives },
        { label: "Staff Loans", count: counts.loans      },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Attendance Heatmap */}
      <div>
        {heatLoading ? (
          <div className="h-28 flex items-center justify-center text-xs text-muted-foreground animate-pulse">
            Loading attendance heatmap…
          </div>
        ) : (
          <div className="overflow-x-auto pb-1">
            <div className="inline-flex flex-col gap-0.5 min-w-max">
              {/* Month row */}
              <div className="flex gap-[3px] mb-0.5 pl-8">
                {weeks.map((_, i) => (
                  <div key={i} style={{ width: 11 }} className="text-[8px] text-muted-foreground leading-none">
                    {monthLabels[i] ?? ""}
                  </div>
                ))}
              </div>

              {/* Day rows (Sun–Sat) */}
              {DAY_LABELS.map((lbl, dayIdx) => (
                <div key={dayIdx} className="flex items-center gap-[3px]">
                  <span className="w-7 text-[8px] text-muted-foreground text-right pr-1 shrink-0">
                    {dayIdx % 2 === 1 ? lbl : ""}
                  </span>
                  {weeks.map((week, wi) => {
                    const d = week[dayIdx];
                    const ds = d.toISOString().slice(0, 10);
                    return (
                      <div
                        key={wi}
                        title={`${ds}: ${heatmap[ds] ?? "no data"}`}
                        className={cn("w-[11px] h-[11px] rounded-sm transition-opacity hover:opacity-80", dotCls(d))}
                      />
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-3 flex-wrap">
              {[
                { label: "Present",  cls: "bg-green-500"  },
                { label: "Late",     cls: "bg-amber-400"  },
                { label: "Absent",   cls: "bg-red-500"    },
                { label: "Half Day", cls: "bg-yellow-400" },
                { label: "Leave",    cls: "bg-purple-400" },
                { label: "Holiday",  cls: "bg-slate-400"  },
              ].map(({ label, cls }) => (
                <div key={label} className="flex items-center gap-1">
                  <div className={cn("w-[11px] h-[11px] rounded-sm", cls)} />
                  <span className="text-[10px] text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <p className="text-[10px] text-muted-foreground mt-2">
          Attendance heatmap for this employee — last 12 months
        </p>
      </div>

      {/* Connections */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-bold text-foreground">Connections</span>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          <div className="flex-1 border-t border-border" />
        </div>
        <div className="grid grid-cols-3 gap-x-8 gap-y-6">
          {CONN_GROUPS.map(g => (
            <div key={g.title}>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">{g.title}</p>
              <div className="flex flex-col gap-1.5">
                {g.items.map(it => (
                  <ConnItem key={it.label} label={it.label} count={it.count} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Employee Profile Drawer ─────────────────────────────────────────────────────
function EmployeeDrawer({ emp, branches, onClose, onSaved }: { emp?: any; branches: any[]; onClose: () => void; onSaved: () => void }) {
  const [tab, setTab] = useState<"overview"|"details"|"documents"|"payroll"|"connections">("overview");
  const { data: deptData } = useGet(["departments"], "/departments");
  const { data: weekoffData } = useGet(["weekoff-schedules"], "/weekoffs");
  const { data: shiftsData } = useGet(["shifts-list"], "/shifts");
  const allWeekoffs: any[] = Array.isArray(weekoffData) ? weekoffData : [];
  const allShifts: any[] = Array.isArray(shiftsData) ? shiftsData.filter((s: any) => s.isActive) : [];
  const deptOptions: string[] = Array.isArray(deptData) ? deptData.filter((d: any) => d.isActive).map((d: any) => d.name) : [];
  const [form, setForm] = useState(emp ? {
    ...EMPTY_EMP,
    ...Object.fromEntries(Object.entries(emp).map(([k, v]) => [k, v === null ? "" : v])),
    firstName: emp.firstName || "",
    lastName: emp.lastName || (emp.fullName && !emp.firstName ? emp.fullName : ""),
    branchId: emp.branchId || "",
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

  const [photoPreview, setPhotoPreview] = useState<string>(emp?.photoUrl || "");
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);
  const [regionalInfo, setRegionalInfo] = useState<{ prefix: string; nextId: string; regionalName: string; branchName: string } | null>(null);
  const [empIdError, setEmpIdError] = useState<string>("");

  /* ── Per-employee salary structure state ── */
  const [currentAssignment, setCurrentAssignment] = useState<any>(null);
  const [assignBasicAmt, setAssignBasicAmt] = useState("");
  const [assignEffDate, setAssignEffDate] = useState(new Date().toISOString().slice(0, 10));
  const [empEarnings, setEmpEarnings] = useState<Array<{ id: string; component: string; amount: number }>>([]);
  const [empCustomDeds, setEmpCustomDeds] = useState<Array<{ id: string; component: string; amount: number }>>([]);
  const [assignSaving, setAssignSaving] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assignSuccess, setAssignSuccess] = useState(false);

  const SS_STAT_NAMES = ["EPF – Employee", "EPF – Employer", "ETF"];
  function newRow() { return { id: Math.random().toString(36).slice(2), component: "", amount: 0 }; }

  /* ── Load existing salary assignment when payroll tab opens ── */
  useEffect(() => {
    if (tab !== "payroll" || !emp?.id) return;
    fetch(apiUrl(`/salary-structures/assignment/${emp.id}`))
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d && !d.error) {
          setCurrentAssignment(d);
          setAssignBasicAmt(String(d.basicAmount || ""));
          const earns = (d.earnings || []).filter((e: any) => (e.component || "").toLowerCase() !== "basic");
          setEmpEarnings(earns.map((e: any) => ({ id: Math.random().toString(36).slice(2), component: e.component || "", amount: Number(e.amount) || 0 })));
          const deds = (d.deductions || []).filter((d: any) => !SS_STAT_NAMES.includes(d.component));
          setEmpCustomDeds(deds.map((d: any) => ({ id: Math.random().toString(36).slice(2), component: d.component || "", amount: Number(d.amount) || 0 })));
        }
      })
      .catch(() => {});
  }, [tab, emp?.id]);

  async function saveAssignment() {
    if (!emp?.id) { setAssignError("Save the employee record first."); return; }
    setAssignSaving(true); setAssignError(null);
    try {
      const r = await fetch(apiUrl(`/salary-structures/employee/${emp.id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          basicAmount: parseFloat(assignBasicAmt) || 0,
          effectiveDate: assignEffDate,
          earnings: empEarnings.map(({ id: _, ...rest }) => rest),
          deductions: empCustomDeds.map(({ id: _, ...rest }) => rest),
        }),
      });
      if (r.ok) {
        setCurrentAssignment((p: any) => ({ ...p, basicAmount: parseFloat(assignBasicAmt) || 0 }));
        setAssignSuccess(true);
        setTimeout(() => setAssignSuccess(false), 3000);
      } else {
        const d = await r.json();
        setAssignError(d.message || "Failed to save");
      }
    } catch { setAssignError("Failed to save. Check connection."); }
    setAssignSaving(false);
  }

  async function removeAssignment() {
    if (!emp?.id) return;
    setAssignSaving(true);
    try {
      await fetch(apiUrl(`/salary-structures/assignments/${emp.id}`), { method: "DELETE" });
      setCurrentAssignment(null);
      setAssignBasicAmt("");
      setEmpEarnings([]);
      setEmpCustomDeds([]);
    } catch {}
    setAssignSaving(false);
  }

  useEffect(() => {
    if (emp) return;
    const branchId = Number(form.branchId);
    if (!branchId) return;
    fetch(apiUrl(`/employees/next-id?branchId=${branchId}`))
      .then(r => r.json())
      .then(data => {
        if (!data.noRegional) {
          setRegionalInfo({ prefix: data.prefix, nextId: data.nextId, regionalName: data.regionalName, branchName: data.branchName || "" });
          setEmpIdError("");
        } else {
          setRegionalInfo(null);
        }
      })
      .catch(() => {});
  }, [form.branchId, emp]);

  useEffect(() => {
    if (emp) return;
    const bioNum = parseInt(String(form.biometricId), 10);
    if (!form.biometricId || isNaN(bioNum) || bioNum <= 0) return;
    const branchObj2 = branches.find((b: any) => b.id === Number(form.branchId));
    const branchName = branchObj2?.name || regionalInfo?.branchName || "";
    const words = branchName.replace(/[-–]/g, " ").split(/\s+/).filter((w: string) => w.length > 1);
    const prefix = words.length === 1
      ? words[0]
      : words.length > 1
        ? words.map((w: string) => w[0].toUpperCase()).join("")
        : (regionalInfo?.prefix || "EMP");
    const newId = `${prefix}${String(bioNum).padStart(5, "0")}`;
    setForm(f => ({ ...f, employeeId: newId }));
    setEmpIdError("");
  }, [form.biometricId, form.branchId]);

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
    if (!form.branchId) {
      setTab("overview");
      alert("Please select a Branch before saving.");
      return;
    }
    if (!form.department) {
      setTab("overview");
      alert("Please select a Department before saving.");
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
        setTab("overview");
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

  const displayName = form.firstName || form.lastName
    ? `${form.firstName} ${form.lastName}`.trim().toUpperCase()
    : (emp ? empDisplayName(emp).toUpperCase() : "NEW EMPLOYEE");

  const initials = form.firstName && form.lastName
    ? `${form.firstName[0]}${form.lastName[0]}`.toUpperCase()
    : form.firstName?.[0]?.toUpperCase() || "E";

  const PROFILE_TABS = [
    { key: "overview",     label: "Overview"    },
    { key: "details",      label: "Details"     },
    { key: "documents",    label: "Documents"   },
    { key: "payroll",      label: "Payroll"     },
    { key: "connections",  label: "Connections" },
  ] as const;

  const INP = "w-full rounded border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary transition-colors text-foreground placeholder:text-muted-foreground/50";
  const SEL = `${INP} appearance-none`;
  const LBL = "block text-[10px] font-semibold text-muted-foreground mb-1 uppercase tracking-wide";

  function FLabel({ label, required }: { label: string; required?: boolean }) {
    return <label className={LBL}>{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>;
  }

  const weekoffSched = allWeekoffs.find((w: any) => String(w.id) === String(form.weekoffScheduleId));
  const DAY_S = ["Su","Mo","Tu","We","Th","Fr","Sa"];
  const selectedShift = allShifts.find((s: any) => String(s.id) === String(form.shiftId));
  const branchObj = branches.find((b: any) => b.id === Number(form.branchId));
  const docList = [
    { label: "NIC (National Identity Card)", fieldName: "aadharDoc", url: emp?.aadharDocUrl },
    { label: "Passport Copy",                fieldName: "panDoc",     url: emp?.panDocUrl     },
    { label: "Certificates",                 fieldName: "certificatesDoc", url: emp?.certificatesDocUrl },
    { label: "Resume / CV",                  fieldName: "resumeDoc",  url: emp?.resumeDocUrl  },
  ];

  return (
    <div className="flex overflow-hidden bg-background" style={{height:"calc(100vh - 56px)"}}>

      {/* ── Left Sidebar ── */}
      <div className="w-56 shrink-0 border-r border-border flex flex-col bg-muted/10 overflow-y-auto">

        {/* Photo */}
        <div className="flex flex-col items-center pt-6 pb-4 px-4 border-b border-border">
          <div className="relative group mb-3">
            <div className="w-28 h-28 rounded-xl border-2 border-border bg-muted overflow-hidden flex items-center justify-center shadow-sm">
              {photoPreview
                ? <img src={photoPreview} alt="Profile" className="w-full h-full object-cover" />
                : <span className="text-3xl font-bold text-muted-foreground/40">{initials}</span>
              }
            </div>
            <button type="button"
              disabled={!emp?.id || photoUploading}
              onClick={() => photoRef.current?.click()}
              className={cn(
                "absolute bottom-1 right-1 w-7 h-7 rounded-full border-2 border-background flex items-center justify-center shadow transition-all",
                emp?.id ? "bg-primary text-white hover:bg-primary/90 cursor-pointer" : "bg-muted text-muted-foreground cursor-not-allowed"
              )}>
              {photoUploading
                ? <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : <Camera className="w-3 h-3" />
              }
            </button>
            <input ref={photoRef} type="file" className="hidden" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoUpload} />
          </div>

          {/* Name + Status */}
          <p className="font-bold text-sm text-foreground text-center leading-tight">{displayName}</p>
          {emp && (
            <span className={cn("mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold", STATUS_STYLE[emp.status] || STATUS_STYLE.active)}>
              {emp.status === "on_leave" ? "On Leave" : (emp.status?.[0]?.toUpperCase() + emp.status?.slice(1)) || "Active"}
            </span>
          )}
          {emp && (
            <p className="mt-1 text-[10px] text-muted-foreground font-mono">{emp.employeeId}</p>
          )}
        </div>

        {/* Meta sections */}
        <div className="flex-1 px-3 py-3 space-y-4 text-xs">

          {/* Employment info pills */}
          {emp && (
            <div className="space-y-1.5">
              {emp.department && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Briefcase className="w-3 h-3 shrink-0" />
                  <span className="truncate">{emp.department}</span>
                </div>
              )}
              {branchObj && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span className="truncate">{branchObj.name}</span>
                </div>
              )}
              {selectedShift && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="w-3 h-3 shrink-0" />
                  <span className="truncate">{selectedShift.name}</span>
                </div>
              )}
              {emp.phone && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Phone className="w-3 h-3 shrink-0" />
                  <span className="truncate">{emp.phone}</span>
                </div>
              )}
              {emp.email && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Mail className="w-3 h-3 shrink-0" />
                  <span className="truncate text-[10px]">{emp.email}</span>
                </div>
              )}
            </div>
          )}

          {/* Divider */}
          {emp && <div className="border-t border-border" />}

          {/* Documents status */}
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-1">
              <FileText className="w-3 h-3" /> Documents
            </p>
            <div className="space-y-1">
              {docList.map(d => (
                <div key={d.label} className="flex items-center gap-1.5 text-[10px]">
                  {d.url
                    ? <CheckCircle className="w-3 h-3 text-green-500 shrink-0" />
                    : <CircleDashed className="w-3 h-3 text-muted-foreground/50 shrink-0" />}
                  <span className={d.url ? "text-foreground" : "text-muted-foreground/70"}>{d.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Payroll summary */}
          {(form.basicSalary || form.epfNumber) && (
            <>
              <div className="border-t border-border" />
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-1">
                  <BadgeIndianRupee className="w-3 h-3" /> Payroll
                </p>
                <div className="space-y-1 text-[10px]">
                  {form.basicSalary && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Basic</span>
                      <span className="font-mono font-semibold text-foreground">LKR {Number(form.basicSalary).toLocaleString()}</span>
                    </div>
                  )}
                  {form.epfNumber && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>EPF</span><span className="font-mono">{form.epfNumber}</span>
                    </div>
                  )}
                  {form.etfNumber && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>ETF</span><span className="font-mono">{form.etfNumber}</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Right Content ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <div className="shrink-0 border-b border-border bg-background px-5 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <button onClick={onClose} className="hover:text-foreground transition-colors flex items-center gap-1">
              <ChevronLeft className="w-3.5 h-3.5" /> Employee
            </button>
            <span className="text-border">›</span>
            <span className="text-foreground font-medium">{emp ? emp.employeeId : "New Employee"}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-3 py-1.5 text-xs border border-border rounded-lg hover:bg-muted transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isPending}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              {isPending ? "Saving…" : emp ? "Save" : "Create Employee"}
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="shrink-0 border-b border-border bg-background px-5 flex gap-0">
          {PROFILE_TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key as any)}
              className={cn(
                "px-4 py-3 text-xs font-medium border-b-2 transition-all whitespace-nowrap",
                tab === key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ── OVERVIEW TAB ── */}
          {tab === "overview" && (
            <div className="space-y-6">
              {/* Error banner */}
              {empIdError && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />{empIdError}
                </div>
              )}

              {/* Main fields grid */}
              <div>
                <div className="grid grid-cols-3 gap-x-6 gap-y-4">
                  <div>
                    <FLabel label="Employee ID" required />
                    <input
                      className={cn(INP, "font-mono", empIdError ? "border-red-400" : "")}
                      placeholder="Auto-filled from Biometric ID"
                      value={form.employeeId}
                      onChange={e => { set("employeeId", e.target.value); setEmpIdError(""); }}
                      disabled={!!emp}
                    />
                    {!emp && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">Auto-fills when Biometric ID is entered (Joining tab)</p>
                    )}
                  </div>
                  <div>
                    <FLabel label="First Name" required />
                    <input className={INP} placeholder="First name" value={form.firstName} onChange={e => set("firstName", e.target.value)} />
                  </div>
                  <div>
                    <FLabel label="Last Name" />
                    <input className={INP} placeholder="Last name" value={form.lastName} onChange={e => set("lastName", e.target.value)} />
                  </div>

                  <div>
                    <FLabel label="Gender" />
                    <select className={SEL} value={form.gender} onChange={e => set("gender", e.target.value)}>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <FLabel label="Date of Birth" />
                    <input type="date" className={INP} value={form.dateOfBirth} onChange={e => set("dateOfBirth", e.target.value)} />
                  </div>
                  <div>
                    <FLabel label="Status" />
                    <select className={SEL} value={form.status} onChange={e => set("status", e.target.value)}>
                      <option value="active">Active</option>
                      <option value="on_leave">On Leave</option>
                      <option value="resigned">Resigned</option>
                      <option value="terminated">Terminated</option>
                    </select>
                  </div>

                  <div>
                    <FLabel label="Type of Employment" />
                    <select className={SEL} value={form.employeeType} onChange={e => set("employeeType", e.target.value)}>
                      <option value="permanent">Permanent</option>
                      <option value="contract">Contract</option>
                      <option value="casual">Casual</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Company Details divider */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs font-bold text-foreground">Company Details</span>
                  <div className="flex-1 border-t border-border" />
                </div>
                <div className="grid grid-cols-3 gap-x-6 gap-y-4">
                  <div>
                    <FLabel label="Department" required />
                    <select className={SEL} value={form.department} onChange={e => set("department", e.target.value)}>
                      <option value="">— Select —</option>
                      {(deptOptions.length > 0 ? deptOptions : DEPT_LIST).map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <FLabel label="Branch" required />
                    <select className={SEL} value={form.branchId} onChange={e => set("branchId", Number(e.target.value))}>
                      <option value="">— Select Branch —</option>
                      {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <FLabel label="Shift" />
                    <select className={SEL} value={form.shiftId} onChange={e => set("shiftId", e.target.value)}>
                      <option value="">— No Shift —</option>
                      {allShifts.map((s: any) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── DETAILS TAB (Joining + Contacts + Personal merged) ── */}
          {tab === "details" && (
            <div className="space-y-6">

              {/* Joining */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs font-bold text-foreground">Joining</span>
                  <div className="flex-1 border-t border-border" />
                </div>
                <div className="grid grid-cols-3 gap-x-6 gap-y-4">
                  <div>
                    <FLabel label="Date of Joining" required />
                    <input type="date" className={INP} value={form.joiningDate} onChange={e => set("joiningDate", e.target.value)} />
                  </div>
                  <div>
                    <FLabel label="Biometric Device ID" />
                    <input className={INP} placeholder="e.g. 50" value={form.biometricId} onChange={e => set("biometricId", e.target.value)} />
                    {!emp && form.biometricId && (
                      <p className="text-[10px] text-primary mt-0.5">
                        Employee ID will be auto-set to <span className="font-mono font-semibold">{form.employeeId}</span>
                      </p>
                    )}
                  </div>
                  <div>
                    <FLabel label="Week Off Schedule" />
                    <select className={SEL} value={form.weekoffScheduleId} onChange={e => set("weekoffScheduleId", e.target.value)}>
                      <option value="">— No Schedule —</option>
                      {allWeekoffs.map((w: any) => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                    {weekoffSched && (
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {DAY_S.map((d, i) => (
                          <span key={i} className={cn(
                            "text-[10px] font-bold px-1 py-0.5 rounded",
                            weekoffSched.offDays?.includes(i) ? "bg-red-100 text-red-700" :
                            weekoffSched.halfDays?.includes(i) ? "bg-amber-100 text-amber-700" :
                            "bg-green-50 text-green-700"
                          )}>{d}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs font-bold text-foreground">Contact</span>
                  <div className="flex-1 border-t border-border" />
                </div>
                <div className="grid grid-cols-3 gap-x-6 gap-y-4">
                  <div>
                    <FLabel label="Phone" />
                    <input className={INP} placeholder="+94 XX XXX XXXX" value={form.phone} onChange={e => set("phone", e.target.value)} />
                  </div>
                  <div>
                    <FLabel label="Email" />
                    <input type="email" className={INP} placeholder="name@example.com" value={form.email} onChange={e => set("email", e.target.value)} />
                  </div>
                  <div className="col-span-3">
                    <FLabel label="Address" />
                    <input className={INP} placeholder="House No., Street, City, State, Postal Code" value={form.address} onChange={e => set("address", e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Identity */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs font-bold text-foreground">Identity</span>
                  <div className="flex-1 border-t border-border" />
                </div>
                <div className="grid grid-cols-3 gap-x-6 gap-y-4">
                  <div>
                    <FLabel label="NIC Number" />
                    <input className={cn(INP, "font-mono")} placeholder="e.g. 199012345678" value={form.nicNumber} onChange={e => set("nicNumber", e.target.value)} maxLength={12} />
                    <p className="text-[10px] text-muted-foreground mt-0.5">National Identity Card (9 or 12 digits)</p>
                  </div>
                  <div>
                    <FLabel label="Passport No." />
                    <input className={cn(INP, "font-mono uppercase")} placeholder="e.g. N1234567" value={form.panNumber} onChange={e => set("panNumber", e.target.value.toUpperCase())} maxLength={15} />
                    <p className="text-[10px] text-muted-foreground mt-0.5">Optional — for non-citizen staff only</p>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ── DOCUMENTS TAB ── */}
          {tab === "documents" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold text-foreground">Document Uploads</span>
                <div className="flex-1 border-t border-border" />
              </div>
              {!isSaved ? (
                <div className="rounded-xl border border-dashed border-border p-8 text-center">
                  <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">Save employee profile first</p>
                  <p className="text-xs text-muted-foreground mt-1">Create the employee record before uploading documents.</p>
                  <button onClick={handleSave} disabled={isPending}
                    className="mt-4 px-4 py-1.5 text-xs font-semibold bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60">
                    {isPending ? "Saving..." : "Save Profile Now"}
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground mb-3">Upload documents in PDF, JPG, PNG, or DOC format (max 10MB each).</p>
                  {docList.map(d => (
                    <DocUploadRow key={d.label} label={d.label} fieldName={d.fieldName} currentUrl={d.url} empId={emp?.id} onUploaded={onSaved} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── PAYROLL TAB ── */}
          {tab === "payroll" && (() => {
            const basic = parseFloat(assignBasicAmt) || 0;
            const epfEe = +(basic * 0.08).toFixed(2);
            const epfEr = +(basic * 0.12).toFixed(2);
            const etf   = +(basic * 0.03).toFixed(2);
            const totalEarnings = basic + empEarnings.reduce((s, e) => s + (e.amount || 0), 0);
            const totalCustomDeds = empCustomDeds.reduce((s, d) => s + (d.amount || 0), 0);
            const totalDeductions = epfEe + epfEr + etf + totalCustomDeds;
            const netPay = totalEarnings - epfEe - totalCustomDeds;
            const fmt = (n: number) => n.toLocaleString("en-LK", { minimumFractionDigits: 2 });
            const Amt = ({ n, cls = "" }: { n: number; cls?: string }) => (
              <span className={cls}>
                <span className="amt-currency">LKR</span>
                <span className="amt-number">{fmt(n)}</span>
              </span>
            );

            return (
              <div className="space-y-5">

                {/* ── Alerts ── */}
                {!emp?.id && (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    Save the employee record first before configuring salary.
                  </div>
                )}
                {assignError && (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />{assignError}
                    <button onClick={() => setAssignError(null)} className="ml-auto"><X className="w-3 h-3" /></button>
                  </div>
                )}
                {assignSuccess && (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-green-50 border border-green-200 text-xs text-green-700">
                    <Check className="w-3.5 h-3.5 shrink-0" />Salary structure saved successfully.
                  </div>
                )}

                {/* ── Basic Salary + Date ── */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <BadgeIndianRupee className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-bold text-foreground">Salary Details</span>
                    <div className="flex-1 border-t border-border" />
                    {currentAssignment && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">Saved</span>}
                  </div>
                  <div className="grid grid-cols-3 gap-x-5 gap-y-3">
                    <div>
                      <FLabel label="Basic Salary (LKR)" />
                      <input type="number" min="0" className={INP} placeholder="e.g. 45000"
                        value={assignBasicAmt} onChange={e => setAssignBasicAmt(e.target.value)} disabled={!emp?.id} />
                    </div>
                    <div>
                      <FLabel label="Effective Date" />
                      <input type="date" className={INP} value={assignEffDate}
                        onChange={e => setAssignEffDate(e.target.value)} disabled={!emp?.id} />
                    </div>
                  </div>
                </div>

                {/* ══ SALARY STRUCTURE TABLE ══════════════════════════════ */}
                <div className="rounded-lg border border-border overflow-hidden text-xs">

                  {/* ── EARNINGS section ── */}
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-green-700 text-white">
                        <th className="px-3 py-2 text-left font-semibold w-8">#</th>
                        <th className="px-3 py-2 text-left font-semibold">Earnings Component</th>
                        <th className="px-3 py-2 text-center font-semibold w-32">Basis</th>
                        <th className="px-3 py-2 text-right font-semibold w-36">Amount (LKR)</th>
                        <th className="w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {/* Basic — fixed row */}
                      <tr className="bg-green-50/50 border-b border-green-100">
                        <td className="px-3 py-2 text-muted-foreground">1</td>
                        <td className="px-3 py-2 font-medium text-foreground">Basic Salary</td>
                        <td className="px-3 py-2 text-center">
                          <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-semibold">Fixed</span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Amt n={basic} cls="font-bold text-green-700" />
                        </td>
                        <td />
                      </tr>
                      {/* Additional earnings */}
                      {empEarnings.map((row, i) => (
                        <tr key={row.id} className="border-b border-green-50 hover:bg-green-50/30">
                          <td className="px-3 py-1.5 text-muted-foreground">{i + 2}</td>
                          <td className="px-3 py-1.5">
                            <input className={cn(INP, "h-7 w-full")} placeholder="Component name"
                              value={row.component} onChange={e => setEmpEarnings(p => p.map(r => r.id === row.id ? { ...r, component: e.target.value } : r))} />
                          </td>
                          <td className="px-3 py-1.5 text-center">
                            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-semibold">Fixed</span>
                          </td>
                          <td className="px-3 py-1.5">
                            <input type="number" min="0" className={cn(INP, "h-7 w-full text-right amt-number")} placeholder="0"
                              value={row.amount || ""} onChange={e => setEmpEarnings(p => p.map(r => r.id === row.id ? { ...r, amount: parseFloat(e.target.value) || 0 } : r))} />
                          </td>
                          <td className="px-1 py-1.5 text-center">
                            <button onClick={() => setEmpEarnings(p => p.filter(r => r.id !== row.id))}
                              className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500">
                              <X className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {empEarnings.length === 0 && (
                        <tr className="border-b border-green-50">
                          <td colSpan={5} className="px-3 py-2 text-[10px] text-muted-foreground italic">No additional earnings. Click + Add to include allowances.</td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="bg-green-50 border-t-2 border-green-300">
                        <td colSpan={2} className="px-3 py-2">
                          <button onClick={() => setEmpEarnings(p => [...p, newRow()])} disabled={!emp?.id}
                            className="flex items-center gap-1 text-[10px] font-semibold text-green-700 hover:text-green-900 disabled:opacity-40">
                            <Plus className="w-3 h-3" /> Add Earning
                          </button>
                        </td>
                        <td className="px-3 py-2 text-center text-[10px] font-bold text-green-800 uppercase tracking-wide">Total Earnings</td>
                        <td className="px-3 py-2 text-right">
                          <Amt n={totalEarnings} cls="font-bold text-green-800" />
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>

                  {/* ── DEDUCTIONS section ── */}
                  <table className="w-full border-collapse border-t-2 border-border">
                    <thead>
                      <tr className="bg-red-600 text-white">
                        <th className="px-3 py-2 text-left font-semibold w-8">#</th>
                        <th className="px-3 py-2 text-left font-semibold">Deduction Component</th>
                        <th className="px-3 py-2 text-center font-semibold w-32">Rate / Basis</th>
                        <th className="px-3 py-2 text-right font-semibold w-36">Amount (LKR)</th>
                        <th className="w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {/* Statutory rows */}
                      {[
                        { label: "EPF – Employee", pct: "8%", basis: "Basic × 8%", val: epfEe },
                        { label: "EPF – Employer", pct: "12%", basis: "Basic × 12%", val: epfEr },
                        { label: "ETF",             pct: "3%",  basis: "Basic × 3%",  val: etf },
                      ].map((d, i) => (
                        <tr key={d.label} className="border-b border-red-50 hover:bg-red-50/30">
                          <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                          <td className="px-3 py-2 text-foreground font-medium">
                            {d.label}
                            <span className="ml-2 text-[10px] text-muted-foreground font-normal">(statutory)</span>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-semibold">{d.pct}</span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            {basic > 0
                              ? <Amt n={d.val} cls="font-semibold text-red-700" />
                              : <span className="text-muted-foreground">—</span>
                            }
                          </td>
                          <td />
                        </tr>
                      ))}
                      {/* Custom deduction rows */}
                      {empCustomDeds.map((row, i) => (
                        <tr key={row.id} className="border-b border-red-50 hover:bg-red-50/30">
                          <td className="px-3 py-1.5 text-muted-foreground">{i + 4}</td>
                          <td className="px-3 py-1.5">
                            <input className={cn(INP, "h-7 w-full")} placeholder="e.g. Loan Installment"
                              value={row.component} onChange={e => setEmpCustomDeds(p => p.map(r => r.id === row.id ? { ...r, component: e.target.value } : r))} />
                          </td>
                          <td className="px-3 py-1.5 text-center">
                            <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[10px] font-semibold">Fixed</span>
                          </td>
                          <td className="px-3 py-1.5">
                            <input type="number" min="0" className={cn(INP, "h-7 w-full text-right amt-number")} placeholder="0"
                              value={row.amount || ""} onChange={e => setEmpCustomDeds(p => p.map(r => r.id === row.id ? { ...r, amount: parseFloat(e.target.value) || 0 } : r))} />
                          </td>
                          <td className="px-1 py-1.5 text-center">
                            <button onClick={() => setEmpCustomDeds(p => p.filter(r => r.id !== row.id))}
                              className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500">
                              <X className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-red-50 border-t-2 border-red-300">
                        <td colSpan={2} className="px-3 py-2">
                          <button onClick={() => setEmpCustomDeds(p => [...p, newRow()])} disabled={!emp?.id}
                            className="flex items-center gap-1 text-[10px] font-semibold text-red-700 hover:text-red-900 disabled:opacity-40">
                            <Plus className="w-3 h-3" /> Add Deduction
                          </button>
                        </td>
                        <td className="px-3 py-2 text-center text-[10px] font-bold text-red-800 uppercase tracking-wide">Total Deductions</td>
                        <td className="px-3 py-2 text-right">
                          <Amt n={totalDeductions} cls="font-bold text-red-800" />
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>

                  {/* ── NET PAY footer ── */}
                  {basic > 0 && (
                    <div className="flex items-center justify-between px-4 py-3 bg-primary/5 border-t-2 border-primary/30">
                      <div>
                        <p className="font-bold text-foreground">Estimated Net Pay</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Gross Earnings − EPF (Employee) − Other Deductions</p>
                      </div>
                      <Amt n={netPay} cls="text-xl font-bold text-primary" />
                    </div>
                  )}
                </div>

                {/* ── Save button ── */}
                {emp?.id && (
                  <div className="flex items-center gap-2">
                    <button onClick={saveAssignment} disabled={assignSaving}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-white hover:bg-primary/90 transition-all disabled:opacity-60">
                      {assignSaving ? <RefreshCw className="w-3 h-3 animate-spin" /> : assignSuccess ? <Check className="w-3 h-3" /> : <Save className="w-3 h-3" />}
                      {assignSuccess ? "Saved!" : "Save Salary Structure"}
                    </button>
                    {currentAssignment && (
                      <button onClick={removeAssignment} disabled={assignSaving}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 transition-colors">
                        <Trash2 className="w-3 h-3" /> Clear
                      </button>
                    )}
                  </div>
                )}

                {/* ── Provident Fund ── */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-bold text-foreground">Provident Fund</span>
                    <div className="flex-1 border-t border-border" />
                  </div>
                  <div className="grid grid-cols-3 gap-x-6 gap-y-4">
                    <div>
                      <FLabel label="EPF Number" />
                      <input className={cn(INP, "font-mono")} placeholder="Employees' Provident Fund No." value={form.epfNumber} onChange={e => set("epfNumber", e.target.value)} />
                    </div>
                    <div>
                      <FLabel label="ETF Number" />
                      <input className={cn(INP, "font-mono")} placeholder="Employees' Trust Fund No." value={form.etfNumber} onChange={e => set("etfNumber", e.target.value)} />
                    </div>
                  </div>
                </div>

                {/* ── Remarks ── */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-bold text-foreground">Remarks</span>
                    <div className="flex-1 border-t border-border" />
                  </div>
                  <textarea
                    className="w-full min-h-[70px] resize-y rounded-lg border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary transition-colors placeholder:text-muted-foreground/50"
                    placeholder="e.g. Late deduction after 8:15 am / OT after 5:30pm"
                    value={form.remarks} onChange={e => set("remarks", e.target.value)}
                  />
                </div>

              </div>
            );
          })()}

          {tab === "connections" && (
            emp?.id
              ? <EmployeeConnectionsTab emp={emp} />
              : <div className="flex flex-col items-center justify-center h-40 text-xs text-muted-foreground gap-2">
                  <Network className="w-8 h-8 opacity-30" />
                  <p>Save the employee record first to view connections.</p>
                </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ── Departments Tab ────────────────────────────────────────────────────────────
function DepartmentsTab({ onFilterByDept }: { onFilterByDept: (dept: string) => void }) {
  const qc = useQueryClient();
  const { data: depts, isLoading } = useGet(["departments"], "/departments");
  const { data: emps } = useGet(["employees-all"], "/employees?limit=9999&page=1");
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
  const [form, setForm] = useState({ name:"", description:"" });
  const [editId, setEditId] = useState<number|null>(null);
  const [showForm, setShowForm] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number|null>(null);

  // Build a map: department name (lowercase) → employee count
  const empCountByDept = useMemo(() => {
    const map: Record<string, number> = {};
    const list = Array.isArray(emps) ? emps : (emps as any)?.employees ?? [];
    list.forEach((e: any) => {
      const key = (e.department || "").toLowerCase().trim();
      if (key) map[key] = (map[key] || 0) + 1;
    });
    return map;
  }, [emps]);

  function openEdit(d: any) { setForm({ name: d.name, description: d.description || "" }); setEditId(d.id); setShowForm(true); }
  function openNew() { setForm({ name:"", description:"" }); setEditId(null); setShowForm(true); }
  function handleSave() {
    const code = form.name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) || "DEPT";
    const payload = { ...form, code };
    if (editId) updateD.mutate({ id: editId, data: payload }, { onSuccess: () => setShowForm(false) });
    else createD.mutate(payload, { onSuccess: () => setShowForm(false) });
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={openNew} className="text-xs flex items-center gap-1.5 h-8 px-3"><Plus className="w-3.5 h-3.5" />Add Department</Button>
      </div>
      {showForm && (
        <Card className="p-4 border-primary/20 bg-primary/5">
          <p className="text-xs font-semibold mb-3">{editId ? "Edit Department" : "New Department"}</p>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Department Name</Label><Input placeholder="e.g. Kitchen" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} /></div>
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
              <tr>{["Department Name","Description","Employees","Status","Actions"].map(h => <th key={h} className="px-3 py-2.5 text-left font-semibold text-muted-foreground">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(Array.isArray(depts) ? depts : []).map((d: any) => {
                const count = empCountByDept[(d.name || "").toLowerCase().trim()] || 0;
                const isConfirming = confirmDeleteId === d.id;
                return (
                  <tr key={d.id} className={cn("transition-colors", isConfirming ? "bg-red-50" : "hover:bg-muted/30")}>
                    <td className="px-3 py-2.5 font-medium">{d.name}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{d.description || "—"}</td>
                    <td className="px-3 py-2.5">
                      <button
                        onClick={() => count > 0 && onFilterByDept(d.name)}
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold transition-colors",
                          count > 0 ? "bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer" : "bg-muted text-muted-foreground cursor-default"
                        )}
                      >
                        <Users className="w-3 h-3" />
                        {count}
                      </button>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={cn("px-2 py-0.5 rounded text-xs", d.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500")}>
                        {d.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      {isConfirming ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-red-600 font-medium whitespace-nowrap">Delete?</span>
                          <button onClick={() => { deleteD.mutate(d.id); setConfirmDeleteId(null); }}
                            className="flex items-center gap-1 px-2 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-xs font-medium">Yes</button>
                          <button onClick={() => setConfirmDeleteId(null)}
                            className="flex items-center gap-1 px-2 py-1 rounded bg-muted hover:bg-muted/80 text-xs font-medium">No</button>
                        </div>
                      ) : (
                        <div className="flex gap-1">
                          <button onClick={() => openEdit(d)} className="p-1.5 hover:bg-muted rounded"><Edit2 className="w-3 h-3" /></button>
                          <button onClick={() => setConfirmDeleteId(d.id)} className="p-1.5 hover:bg-red-100 text-red-500 rounded"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!(Array.isArray(depts) ? depts : []).length && <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">No departments found.</td></tr>}
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

// ── Shift Details Tab ──────────────────────────────────────────────────────────
type ShiftRow = {
  id: number; name: string; type: string; startTime1: string; endTime1: string;
  graceMinutes: number; overtimeThreshold: number; category: string; isActive: boolean;
};

function ShiftDetailsTab() {
  const qc = useQueryClient();
  const { data: shiftsRaw, isLoading } = useGet(["shifts-detail"], "/shifts");
  const { data: empsRaw, isLoading: empsLoading } = useGet(["employees-for-shift"], "/employees?limit=500");
  const shifts: ShiftRow[] = Array.isArray(shiftsRaw) ? shiftsRaw.filter((s: any) => s.isActive) : [];
  const allEmps: any[] = Array.isArray(empsRaw?.employees) ? empsRaw.employees : (Array.isArray(empsRaw) ? empsRaw : []);

  // Group employees by shiftId
  const empsByShift = useMemo(() => {
    const map: Record<number, any[]> = {};
    for (const e of allEmps) {
      if (e.shiftId) {
        if (!map[e.shiftId]) map[e.shiftId] = [];
        map[e.shiftId].push(e);
      }
    }
    return map;
  }, [allEmps]);

  const [rows, setRows] = useState<Record<number, Partial<ShiftRow>>>({});
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState<number | null>(null);
  const [savedId, setSavedId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [manageShift, setManageShift] = useState<ShiftRow | null>(null);
  const [manageSaving, setManageSaving] = useState(false);
  const [manageSearch, setManageSearch] = useState("");
  // local set of employee ids selected for the managed shift
  const [manageSelected, setManageSelected] = useState<Set<number>>(new Set());

  function openManage(s: ShiftRow) {
    setManageShift(s);
    setManageSearch("");
    setManageSelected(new Set((empsByShift[s.id] || []).map((e: any) => e.id)));
  }

  async function saveManage() {
    if (!manageShift) return;
    setManageSaving(true);
    const currentIds = new Set((empsByShift[manageShift.id] || []).map((e: any) => e.id));
    const toAssign = [...manageSelected].filter(id => !currentIds.has(id));
    const toUnassign = [...currentIds].filter(id => !manageSelected.has(id));
    const all = [
      ...toAssign.map(id => ({ id, shiftId: manageShift.id })),
      ...toUnassign.map(id => ({ id, shiftId: null })),
    ];
    await Promise.all(all.map(({ id, shiftId }) =>
      fetch(apiUrl(`/employees/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shiftId }),
      })
    ));
    setManageSaving(false);
    setManageShift(null);
    qc.invalidateQueries({ queryKey: ["employees-for-shift"] });
    qc.invalidateQueries({ queryKey: ["employees"] });
  }

  function getRow(s: ShiftRow): ShiftRow {
    return { ...s, ...(rows[s.id] ?? {}) };
  }

  function patch(id: number, field: keyof ShiftRow, value: any) {
    setRows(r => ({ ...r, [id]: { ...(r[id] ?? {}), [field]: value } }));
  }

  function calcHours(start: string, end: string) {
    if (!start || !end) return "—";
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    let mins = (eh * 60 + em) - (sh * 60 + sm);
    if (mins < 0) mins += 24 * 60;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  async function saveRow(s: ShiftRow) {
    const r = getRow(s);
    setSaving(s.id);
    await fetch(apiUrl(`/shifts/${s.id}`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: r.name, type: r.type,
        startTime1: r.startTime1, endTime1: r.endTime1,
        graceMinutes: r.graceMinutes, overtimeThreshold: r.overtimeThreshold,
        category: r.category,
      }),
    });
    setSaving(null);
    setSavedId(s.id);
    setTimeout(() => setSavedId(null), 1800);
    setEditingId(null);
    qc.invalidateQueries({ queryKey: ["shifts-detail"] });
  }

  function cancelRow(id: number) {
    setRows(r => { const n = { ...r }; delete n[id]; return n; });
    setEditingId(null);
  }

  const CATEGORY_BADGE: Record<string, string> = {
    REGULAR:  "bg-blue-100 text-blue-700",
    NIGHT:    "bg-indigo-100 text-indigo-700",
    FLEXIBLE: "bg-emerald-100 text-emerald-700",
  };

  const TH = "px-3 py-2.5 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap";
  const TD = "px-3 py-2 align-middle";

  const filteredManageEmps = useMemo(() => {
    if (!manageShift) return [];
    const q = manageSearch.toLowerCase();
    return allEmps.filter((e: any) =>
      e.status === "active" &&
      (!q || empDisplayName(e).toLowerCase().includes(q) || (e.employeeId || "").toLowerCase().includes(q))
    );
  }, [allEmps, manageShift, manageSearch]);

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/20">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <span className="font-bold text-sm">Shift Configurations</span>
            <span className="text-[11px] text-muted-foreground">— click a row to edit inline</span>
          </div>
          <span className="text-[11px] text-muted-foreground">{shifts.length} active shifts</span>
        </div>

        {isLoading ? (
          <div className="text-center py-10 text-sm text-muted-foreground">Loading…</div>
        ) : shifts.length === 0 ? (
          <div className="text-center py-10 text-sm text-muted-foreground">No active shifts found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className={TH}>Shift Name</th>
                  <th className={TH}>Type</th>
                  <th className={TH}>Start Time</th>
                  <th className={TH}>End Time</th>
                  <th className={TH}>Working Hrs</th>
                  <th className={TH}>Late Threshold (min)</th>
                  <th className={TH}>OT Eligible After (min)</th>
                  <th className={TH}>Flexible Hrs</th>
                  <th className={TH}>Linked Employees</th>
                  <th className={TH + " text-right"}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {shifts.map(s => {
                  const r = getRow(s);
                  const isEditing = editingId === s.id;
                  const isSaving = saving === s.id;
                  const justSaved = savedId === s.id;
                  const linked = empsByShift[s.id] || [];
                  const isExpanded = expandedId === s.id;
                  return (
                    <>
                    <tr
                      key={s.id}
                      className={cn(
                        "transition-colors",
                        isEditing ? "bg-primary/5 border-l-2 border-l-primary" :
                        isExpanded ? "bg-muted/30" :
                        "hover:bg-muted/40 cursor-pointer"
                      )}
                      onClick={() => { if (!isEditing) setEditingId(s.id); }}
                    >
                      {/* Shift Name */}
                      <td className={TD}>
                        {isEditing ? (
                          <Input
                            className="h-7 text-xs w-40"
                            value={r.name}
                            onChange={e => patch(s.id, "name", e.target.value)}
                            onClick={e => e.stopPropagation()}
                          />
                        ) : (
                          <span className="font-semibold">{r.name}</span>
                        )}
                      </td>

                      {/* Type */}
                      <td className={TD}>
                        {isEditing ? (
                          <select
                            className="h-7 text-xs w-24 rounded-md border border-input bg-background text-foreground px-2 focus:outline-none focus:ring-1 focus:ring-primary"
                            value={r.type}
                            onChange={e => { e.stopPropagation(); patch(s.id, "type", e.target.value); }}
                            onClick={(e: any) => e.stopPropagation()}
                          >
                            <option value="normal">Normal</option>
                            <option value="split">Split</option>
                          </select>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-[10px] font-bold uppercase">
                            {r.type === "split" ? "Split" : "Normal"}
                          </span>
                        )}
                      </td>

                      {/* Start Time */}
                      <td className={TD}>
                        {isEditing ? (
                          <Input
                            type="time"
                            className="h-7 text-xs w-28"
                            value={r.startTime1}
                            onChange={e => patch(s.id, "startTime1", e.target.value)}
                            onClick={e => e.stopPropagation()}
                          />
                        ) : (
                          <span className="font-mono tabular-nums">{r.startTime1}</span>
                        )}
                      </td>

                      {/* End Time */}
                      <td className={TD}>
                        {isEditing ? (
                          <Input
                            type="time"
                            className="h-7 text-xs w-28"
                            value={r.endTime1}
                            onChange={e => patch(s.id, "endTime1", e.target.value)}
                            onClick={e => e.stopPropagation()}
                          />
                        ) : (
                          <span className="font-mono tabular-nums">{r.endTime1}</span>
                        )}
                      </td>

                      {/* Working Hrs (computed, read-only) */}
                      <td className={TD}>
                        <span className="font-semibold text-primary">{calcHours(r.startTime1, r.endTime1)}</span>
                      </td>

                      {/* Late Threshold */}
                      <td className={TD}>
                        {isEditing ? (
                          <Input
                            type="number" min={0} max={120}
                            className="h-7 text-xs w-20"
                            value={r.graceMinutes}
                            onChange={e => patch(s.id, "graceMinutes", Number(e.target.value))}
                            onClick={e => e.stopPropagation()}
                          />
                        ) : (
                          <span className={cn(
                            "px-1.5 py-0.5 rounded text-[11px] font-semibold",
                            r.graceMinutes === 0 ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"
                          )}>
                            {r.graceMinutes === 0 ? "No grace" : `${r.graceMinutes} min`}
                          </span>
                        )}
                      </td>

                      {/* OT Eligible After */}
                      <td className={TD}>
                        {isEditing ? (
                          <Input
                            type="number" min={0} max={180}
                            className="h-7 text-xs w-20"
                            value={r.overtimeThreshold}
                            onChange={e => patch(s.id, "overtimeThreshold", Number(e.target.value))}
                            onClick={e => e.stopPropagation()}
                          />
                        ) : (
                          <span className={cn(
                            "px-1.5 py-0.5 rounded text-[11px] font-semibold",
                            r.overtimeThreshold === 0 ? "bg-muted text-muted-foreground" : "bg-amber-100 text-amber-700"
                          )}>
                            {r.overtimeThreshold === 0 ? "Not eligible" : `${r.overtimeThreshold} min`}
                          </span>
                        )}
                      </td>

                      {/* Flexible Hours */}
                      <td className={TD}>
                        {isEditing ? (
                          <select
                            className="h-7 text-xs w-32 rounded-md border border-input bg-background text-foreground px-2 focus:outline-none focus:ring-1 focus:ring-primary"
                            value={r.category}
                            onChange={e => { e.stopPropagation(); patch(s.id, "category", e.target.value); }}
                            onClick={(e: any) => e.stopPropagation()}
                          >
                            <option value="REGULAR">No (Fixed)</option>
                            <option value="FLEXIBLE">Yes (Flexible)</option>
                            <option value="NIGHT">Night</option>
                          </select>
                        ) : (
                          <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold uppercase", CATEGORY_BADGE[r.category] || CATEGORY_BADGE.REGULAR)}>
                            {r.category === "FLEXIBLE" ? "Flexible" : r.category === "NIGHT" ? "Night" : "Fixed"}
                          </span>
                        )}
                      </td>

                      {/* Linked Employees */}
                      <td className={TD} onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : s.id)}
                            className={cn(
                              "flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold transition-colors",
                              linked.length > 0
                                ? "bg-primary/10 text-primary hover:bg-primary/20"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                            )}
                          >
                            <Users className="w-3 h-3" />
                            {empsLoading ? "…" : linked.length}
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className={TD + " text-right"} onClick={e => e.stopPropagation()}>
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => cancelRow(s.id)}
                              className="flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground hover:bg-muted"
                            >
                              <X className="w-3 h-3" /> Cancel
                            </button>
                            <button
                              onClick={() => saveRow(s)}
                              disabled={isSaving}
                              className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-primary text-white hover:bg-primary/90 disabled:opacity-60"
                            >
                              <Save className="w-3 h-3" />
                              {isSaving ? "Saving…" : "Save"}
                            </button>
                          </div>
                        ) : justSaved ? (
                          <span className="flex items-center justify-end gap-1 text-emerald-600 text-[11px] font-semibold">
                            <Check className="w-3 h-3" /> Saved
                          </span>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openManage(s)}
                              className="flex items-center gap-1 px-2 py-1 rounded text-xs text-primary hover:bg-primary/10 font-medium"
                            >
                              <UserCheck className="w-3 h-3" /> Assign
                            </button>
                            <button
                              onClick={() => setEditingId(s.id)}
                              className="flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
                            >
                              <Edit2 className="w-3 h-3" /> Edit
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>

                    {/* Expanded employee list */}
                    {isExpanded && (
                      <tr key={`${s.id}-expanded`} className="bg-muted/10">
                        <td colSpan={10} className="px-4 py-3">
                          {linked.length === 0 ? (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                              <Users className="w-3.5 h-3.5" />
                              No employees linked to this shift.
                              <button
                                onClick={() => openManage(s)}
                                className="text-primary underline underline-offset-2 hover:no-underline"
                              >
                                Assign employees
                              </button>
                            </div>
                          ) : (
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                  Employees on {s.name} ({linked.length})
                                </span>
                                <button
                                  onClick={() => openManage(s)}
                                  className="flex items-center gap-1 px-2 py-1 rounded text-xs text-primary hover:bg-primary/10 font-medium"
                                >
                                  <UserCheck className="w-3 h-3" /> Manage
                                </button>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {linked.map((e: any) => (
                                  <div key={e.id} className="flex items-center gap-1.5 bg-background border border-border rounded-lg px-2 py-1 text-xs">
                                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                      <span className="text-[9px] font-bold text-primary">
                                        {empDisplayName(e).charAt(0).toUpperCase()}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="font-semibold text-foreground">{empDisplayName(e)}</span>
                                      <span className="ml-1.5 text-muted-foreground font-mono text-[10px]">{e.employeeId}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <p className="text-[11px] text-muted-foreground mt-2 px-1">
        Click any row or the Edit button to edit inline. Working hours are calculated automatically from start/end times.
      </p>

      {/* Manage Employees Modal */}
      {manageShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setManageShift(null)} />
          <div className="relative bg-background border border-border rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <UserCheck className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-sm">Assign Employees</p>
                  <p className="text-[11px] text-muted-foreground">{manageShift.name} · {manageShift.startTime1}–{manageShift.endTime1}</p>
                </div>
              </div>
              <button onClick={() => setManageShift(null)} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search */}
            <div className="px-4 pt-3 pb-2 shrink-0">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  className="w-full pl-8 pr-3 h-8 text-xs rounded-lg border border-border bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="Search by name or employee ID…"
                  value={manageSearch}
                  onChange={e => setManageSearch(e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[11px] text-muted-foreground">{manageSelected.size} selected</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setManageSelected(new Set(filteredManageEmps.map((e: any) => e.id)))}
                    className="text-[11px] text-primary hover:underline"
                  >Select all shown</button>
                  <span className="text-muted-foreground text-[11px]">·</span>
                  <button
                    onClick={() => setManageSelected(new Set())}
                    className="text-[11px] text-muted-foreground hover:text-foreground hover:underline"
                  >Clear all</button>
                </div>
              </div>
            </div>

            {/* Employee list */}
            <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-1">
              {filteredManageEmps.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground">No active employees found.</div>
              ) : filteredManageEmps.map((e: any) => {
                const checked = manageSelected.has(e.id);
                const isCurrentShift = e.shiftId === manageShift.id;
                const otherShift = !isCurrentShift && e.shiftId
                  ? shifts.find(s => s.id === e.shiftId)
                  : null;
                return (
                  <label
                    key={e.id}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors",
                      checked ? "bg-primary/5 border border-primary/20" : "hover:bg-muted/50 border border-transparent"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        setManageSelected(prev => {
                          const next = new Set(prev);
                          if (next.has(e.id)) next.delete(e.id); else next.add(e.id);
                          return next;
                        });
                      }}
                      className="w-3.5 h-3.5 accent-primary shrink-0"
                    />
                    <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-primary">{empDisplayName(e).charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-xs text-foreground truncate">{empDisplayName(e)}</span>
                        <span className="text-[10px] font-mono text-muted-foreground shrink-0">{e.employeeId}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-muted-foreground truncate">{e.department || "—"}</span>
                        {otherShift && (
                          <span className="text-[10px] px-1 py-0 rounded bg-amber-100 text-amber-700 shrink-0">
                            Currently: {otherShift.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-border shrink-0">
              <button
                onClick={() => setManageShift(null)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveManage}
                disabled={manageSaving}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-primary text-white hover:bg-primary/90 disabled:opacity-60 transition-colors"
              >
                <Save className="w-3 h-3" />
                {manageSaving ? "Saving…" : "Save Assignments"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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

  // Salary assignments from Payroll Settings → Salary Structures
  const { data: salaryAssignmentsRaw } = useGet(["salary-assignments-all"], "/salary-structures/assignments/all");
  // Build map: employee DB id → basicAmount
  const salaryAssignMap = useMemo(() => {
    const map: Record<number, number> = {};
    (Array.isArray(salaryAssignmentsRaw) ? salaryAssignmentsRaw : []).forEach((row: any) => {
      const empId = row.assignment?.employeeId ?? row.employee?.id;
      const basic = row.assignment?.basicAmount;
      if (empId != null && basic != null) map[empId] = Number(basic);
    });
    return map;
  }, [salaryAssignmentsRaw]);

  // Resolve basic salary: assignment → employee.basicSalary → SALARY_SCALE → 0
  function getBasic(emp: any): number {
    if (salaryAssignMap[emp.id] != null) return salaryAssignMap[emp.id];
    if (emp.basicSalary) return Number(emp.basicSalary);
    return 0;
  }

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
        (e.department || "").toLowerCase().includes(q)
      );
    }
    return [...list].sort((a: any, b: any) => {
      const av = sortField === "name" ? empDisplayName(a) :
                 sortField === "salary" ? getBasic(a) :
                 sortField === "type" ? (a.employeeType || "") : empDisplayName(a);
      const bv = sortField === "name" ? empDisplayName(b) :
                 sortField === "salary" ? getBasic(b) :
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

  const totalBasic = allEmployees.reduce((s: number, e: any) => s + getBasic(e), 0);
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
                  { label: "Department", f: null },
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
                  const basicSalary = getBasic(emp);
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
                        <div className="text-foreground">{emp.department || "—"}</div>
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

  const qc = useQueryClient();
  const { data: branchRes } = useListBranches();
  const branches: any[] = branchRes || [];
  const { data: deptData } = useGet(["departments"], "/departments");
  const allDeptNames: string[] = Array.isArray(deptData) ? deptData.filter((d: any) => d.isActive).map((d: any) => d.name) : [];
  const { data: shiftsRaw } = useListShifts();
  const allShifts: any[] = Array.isArray(shiftsRaw) ? shiftsRaw : (shiftsRaw as any)?.shifts ?? [];

  async function quickAssignShift(empId: number, newShiftId: string) {
    await fetch(apiUrl(`/employees/${empId}`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shiftId: newShiftId ? Number(newShiftId) : null }),
    });
    qc.invalidateQueries({ queryKey: ["employees"] });
    refetch();
  }

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
    const headers = ["Employee ID","Biometric ID","First Name","Last Name","Gender","Department","Branch","Type","Status","Phone","Email","NIC Number","Passport No.","Basic Salary (LKR)","EPF No.","ETF No.","Joining Date"];
    const rows = employees.map((e: any) => [
      e.employeeId, e.biometricId || "", e.firstName || "", e.lastName || e.fullName || "",
      e.gender, e.department,
      e.branchName, e.employeeType, e.status, e.phone, e.email,
      e.nicNumber || "", e.panNumber || "", e.basicSalary || "", e.epfNumber || "", e.etfNumber || "", e.joiningDate
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "employees.csv"; a.click();
  }

  if (drawerOpen) {
    return (
      <EmployeeDrawer
        emp={drawerEmp}
        branches={branches}
        onClose={() => setDrawerOpen(false)}
        onSaved={() => { setDrawerOpen(false); refetch(); }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Employee Management" description="Manage staff profiles and departments." />

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
                "flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200",
                activeTab === t
                  ? "bg-white text-primary shadow-sm border border-slate-200"
                  : "text-slate-500 hover:text-slate-700 hover:bg-white/60"
              )}>
              {t === "Employee List" && <Users className="w-3.5 h-3.5" />}
              {t === "Departments" && <Building2 className="w-3.5 h-3.5" />}
              {t === "Shift Details" && <Clock className="w-3.5 h-3.5" />}
              {t === "Payroll" && <BadgeIndianRupee className="w-3.5 h-3.5" />}
              {t}
              {t === "Employee List" && (
                <span className={cn(
                  "ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold tabular-nums",
                  activeTab === t ? "bg-primary/10 text-primary" : "bg-slate-200 text-slate-500"
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
          <Card className="px-3 py-2.5 flex flex-wrap gap-2 items-center bg-white border border-slate-200 shadow-sm">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <Input placeholder="Search name, ID, NIC, email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-xs border-slate-300 bg-slate-50 focus:bg-white placeholder:text-slate-400" />
            </div>
            <Select
              value={filterBranchId}
              onChange={e => setFilterBranchId(e.target.value)}
              className="h-8 text-xs w-48 border-slate-300 text-slate-600"
            >
              <option value="">All Locations</option>
              {branches.map((b: any) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </Select>
            <Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="h-8 text-xs w-32 border-slate-300 text-slate-600">
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="on_leave">On Leave</option>
              <option value="resigned">Resigned</option>
              <option value="terminated">Terminated</option>
            </Select>
            <Select value={filterDept} onChange={e => setFilterDept(e.target.value)} className="h-8 text-xs w-40 border-slate-300 text-slate-600">
              <option value="">All Departments</option>
              {(allDeptNames.length > 0 ? allDeptNames : DEPT_LIST).map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </Select>
            <Select value={filterType} onChange={e => setFilterType(e.target.value)} className="h-8 text-xs w-28 border-slate-300 text-slate-600">
              <option value="">All Types</option>
              <option value="permanent">Permanent</option>
              <option value="contract">Contract</option>
              <option value="casual">Casual</option>
            </Select>
            {(search || filterStatus || filterDept || filterType || filterBranchId) && (
              <button
                onClick={() => { setSearch(""); setFilterStatus(""); setFilterDept(""); setFilterType(""); setFilterBranchId(""); }}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700"
              >
                <X className="w-3.5 h-3.5" /> Clear
              </button>
            )}
            <span className="ml-auto text-xs font-semibold text-slate-500">{employees.length} employee{employees.length !== 1 ? "s" : ""}</span>
          </Card>

          <Card className="overflow-hidden">
            {isLoading ? (
              <p className="text-center py-10 text-sm text-muted-foreground">Loading employees...</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 sticky top-0 border-b border-slate-200">
                    <tr>
                      {["Emp ID","Bio ID","Name","Department","Branch","Shift","Status","Actions"].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {employees.map((emp: any) => {
                      const initial = (emp.firstName?.[0] || emp.fullName?.[0] || "E").toUpperCase();
                      const avatarColors = ["bg-violet-100 text-violet-700","bg-sky-100 text-sky-700","bg-amber-100 text-amber-700","bg-emerald-100 text-emerald-700","bg-rose-100 text-rose-700","bg-indigo-100 text-indigo-700"];
                      const avatarColor = avatarColors[(emp.id || 0) % avatarColors.length];
                      return (
                      <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs font-semibold text-primary tracking-tight">{emp.employeeId}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">{emp.biometricId || "—"}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className={cn("w-8 h-8 rounded-full overflow-hidden shrink-0 flex items-center justify-center font-bold text-xs", emp.photoUrl ? "" : avatarColor)}>
                              {emp.photoUrl
                                ? <img src={emp.photoUrl} alt={empDisplayName(emp)} className="w-full h-full object-cover" />
                                : initial
                              }
                            </div>
                            <span className="font-semibold text-slate-800">{empDisplayName(emp)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600 font-medium">{emp.department}</td>
                        <td className="px-4 py-3 text-slate-500">
                          <div className="flex items-center gap-1"><MapPin className="w-3 h-3 shrink-0 text-slate-400" /><span className="truncate max-w-[130px]">{emp.branchName}</span></div>
                        </td>
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          <select
                            value={emp.shiftId || ""}
                            onChange={e => quickAssignShift(emp.id, e.target.value)}
                            className="text-[10px] border border-slate-200 rounded-md px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary min-w-[110px] cursor-pointer"
                          >
                            <option value="">— No Shift —</option>
                            {allShifts.filter((s: any) => s.isActive !== false).map((s: any) => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide", STATUS_STYLE[emp.status] || STATUS_STYLE.active)}>
                            {emp.status === "on_leave" ? "On Leave" : emp.status?.[0]?.toUpperCase() + emp.status?.slice(1) || "Active"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { setDrawerEmp(emp); setDrawerOpen(true); }} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700" title="Edit">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => { if(confirm(`Delete "${empDisplayName(emp)}"?`)) deleteEmp.mutate({ id: emp.id }, { onSuccess: () => refetch() }); }}
                              className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg" title="Delete">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      );
                    })}
                    {!employees.length && (
                      <tr><td colSpan={9} className="text-center py-12 text-slate-400 font-medium">No employees found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {activeTab === "Departments" && <DepartmentsTab onFilterByDept={dept => { setFilterDept(dept); setActiveTab("Employee List"); }} />}
      {activeTab === "Designations" && <DesignationsTab />}
      {activeTab === "Shift Details" && <ShiftDetailsTab />}
      {activeTab === "Payroll" && <PayrollTab />}

    </div>
  );
}
