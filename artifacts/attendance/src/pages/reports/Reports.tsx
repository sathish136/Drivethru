import { useState, useEffect, useMemo } from "react";
import { useGetAttendanceReport, useGetMonthlyReport, useGetOvertimeReport, useListBranches } from "@workspace/api-client-react";
import { PageHeader, Card, Button, Input, Select, Label } from "@/components/ui";
import { cn } from "@/lib/utils";
import { FileDown, Users, Clock, Calendar, Banknote } from "lucide-react";

type Tab = "attendance" | "monthly" | "overtime" | "payroll";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
function apiUrl(path: string) { return `${BASE}/api${path}`; }

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const STATUS_COLORS: Record<string, string> = {
  present: "bg-green-100 text-green-700",
  absent: "bg-red-100 text-red-700",
  late: "bg-amber-100 text-amber-700",
  half_day: "bg-yellow-100 text-yellow-700",
  leave: "bg-purple-100 text-purple-700",
  holiday: "bg-gray-100 text-gray-700",
};

function fmt(n: number) { return `Rs. ${Math.round(n).toLocaleString("en-LK")}`; }
function getMonthName(m: number) { return MONTHS[m - 1]; }

export default function Reports() {
  const [tab, setTab] = useState<Tab>("attendance");

  return (
    <div className="space-y-4">
      <PageHeader title="Reports" description="Detailed attendance, monthly, overtime and payroll reports." />
      <div className="flex gap-1 border-b border-border">
        {([
          { id: "attendance", label: "Attendance Report",  icon: Users },
          { id: "monthly",    label: "Monthly Report",     icon: Calendar },
          { id: "overtime",   label: "Overtime Report",    icon: Clock },
          { id: "payroll",    label: "Payroll Report",     icon: Banknote },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
              tab === id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === "attendance" && <AttendanceReport />}
      {tab === "monthly"    && <MonthlyReport />}
      {tab === "overtime"   && <OvertimeReport />}
      {tab === "payroll"    && <PayrollReport />}
    </div>
  );
}

function AttendanceReport() {
  const now = new Date();
  const [startDate, setStartDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]);
  const [endDate, setEndDate]     = useState(now.toISOString().split("T")[0]);
  const [branchId, setBranchId]   = useState("");
  const [status, setStatus]       = useState("");
  const [empType, setEmpType]     = useState("");
  const [department, setDepartment] = useState("");
  const [empName, setEmpName]     = useState("");
  const [applied, setApplied] = useState({ startDate, endDate, branchId, status });

  const { data: branches } = useListBranches();
  const { data, isLoading } = useGetAttendanceReport({
    startDate: applied.startDate,
    endDate: applied.endDate,
    ...(applied.branchId ? { branchId: Number(applied.branchId) } : {}),
    ...(applied.status ? { status: applied.status } : {}),
  });

  const departments = useMemo(() => {
    const set = new Set((data?.records || []).map((r: any) => r.department).filter(Boolean));
    return Array.from(set).sort() as string[];
  }, [data]);

  const filtered = useMemo(() => {
    return (data?.records || []).filter((r: any) => {
      const matchType = !empType || (r as any).employeeType === empType;
      const matchDept = !department || r.department === department;
      const matchName = !empName || (r.employeeName || "").toLowerCase().includes(empName.toLowerCase());
      return matchType && matchDept && matchName;
    });
  }, [data, empType, department, empName]);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 items-end">
          <div>
            <Label className="text-xs">Start Date</Label>
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">End Date</Label>
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Branch</Label>
            <Select value={branchId} onChange={e => setBranchId(e.target.value)}>
              <option value="">All Branches</option>
              {branches?.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          </div>
          <div>
            <Label className="text-xs">Status</Label>
            <Select value={status} onChange={e => setStatus(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="late">Late</option>
              <option value="half_day">Half Day</option>
              <option value="leave">Leave</option>
              <option value="holiday">Holiday</option>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Employee Type</Label>
            <Select value={empType} onChange={e => setEmpType(e.target.value)}>
              <option value="">All Types</option>
              <option value="permanent">Permanent</option>
              <option value="contract">Contract</option>
              <option value="casual">Casual</option>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Department</Label>
            <Select value={department} onChange={e => setDepartment(e.target.value)}>
              <option value="">All Departments</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </Select>
          </div>
          <div>
            <Label className="text-xs">Employee Name</Label>
            <Input placeholder="Search name…" value={empName} onChange={e => setEmpName(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setApplied({ startDate, endDate, branchId, status })} className="flex-1">Apply</Button>
            <Button variant="outline"><FileDown className="w-4 h-4" /></Button>
          </div>
        </div>
      </Card>

      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {[
            { label: "Present",  val: filtered.filter((r: any) => r.status === "present").length,  cls: "text-green-600" },
            { label: "Absent",   val: filtered.filter((r: any) => r.status === "absent").length,   cls: "text-red-600" },
            { label: "Late",     val: filtered.filter((r: any) => r.status === "late").length,     cls: "text-amber-600" },
            { label: "Half Day", val: filtered.filter((r: any) => r.status === "half_day").length, cls: "text-yellow-600" },
            { label: "Leave",    val: filtered.filter((r: any) => r.status === "leave").length,    cls: "text-purple-600" },
            { label: "Holiday",  val: filtered.filter((r: any) => r.status === "holiday").length,  cls: "text-gray-600" },
          ].map(({ label, val, cls }) => (
            <Card key={label} className="p-3 text-center">
              <div className={cn("text-2xl font-bold", cls)}>{val}</div>
              <div className="text-xs text-muted-foreground mt-1">{label}</div>
            </Card>
          ))}
        </div>
      )}

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr>
                  {["Date","Emp ID","Employee","Department","Branch","Designation","Type","Status","In Time","Out Time","Total Hrs","OT Hrs"].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.slice(0, 300).map((r: any) => (
                  <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-2 font-mono whitespace-nowrap">{r.date}</td>
                    <td className="px-3 py-2 font-mono whitespace-nowrap text-muted-foreground">{r.employeeCode}</td>
                    <td className="px-3 py-2 font-medium whitespace-nowrap">{r.employeeName}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{r.department || "—"}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{r.branchName}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{r.designation || "—"}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {r.employeeType ? (
                        <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium capitalize",
                          r.employeeType === "permanent" ? "bg-blue-100 text-blue-700" :
                          r.employeeType === "contract"  ? "bg-purple-100 text-purple-700" :
                          "bg-orange-100 text-orange-700"
                        )}>{r.employeeType}</span>
                      ) : "—"}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={cn("px-2 py-0.5 rounded text-xs font-medium uppercase", STATUS_COLORS[r.status] || "bg-gray-100")}>
                        {r.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono whitespace-nowrap">{r.inTime1 || "—"}</td>
                    <td className="px-3 py-2 font-mono whitespace-nowrap">{r.outTime1 || "—"}</td>
                    <td className="px-3 py-2 font-mono whitespace-nowrap">{r.totalHours != null ? `${r.totalHours.toFixed(1)}h` : "—"}</td>
                    <td className="px-3 py-2 font-mono whitespace-nowrap">{r.overtimeHours != null && r.overtimeHours > 0 ? `${r.overtimeHours.toFixed(1)}h` : "—"}</td>
                  </tr>
                ))}
                {!filtered.length && (
                  <tr><td colSpan={12} className="text-center py-8 text-muted-foreground">No records found. Apply filters and click Apply.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function MonthlyReport() {
  const now = new Date();
  const [month, setMonth]     = useState(now.getMonth() + 1);
  const [year, setYear]       = useState(now.getFullYear());
  const [branchId, setBranchId] = useState("");
  const [empType, setEmpType]   = useState("");
  const [department, setDepartment] = useState("");
  const [empName, setEmpName]   = useState("");
  const [applied, setApplied] = useState({ month, year, branchId });
  const { data: branches } = useListBranches();
  const { data, isLoading } = useGetMonthlyReport({
    month: applied.month,
    year: applied.year,
    ...(applied.branchId ? { branchId: Number(applied.branchId) } : {}),
  });

  const departments = useMemo(() => {
    const set = new Set((data?.employees || []).map((e: any) => e.department).filter(Boolean));
    return Array.from(set).sort() as string[];
  }, [data]);

  const filtered = useMemo(() => {
    return (data?.employees || []).filter((e: any) => {
      const matchType = !empType || e.employeeType === empType;
      const matchDept = !department || e.department === department;
      const matchName = !empName || (e.employeeName || "").toLowerCase().includes(empName.toLowerCase());
      return matchType && matchDept && matchName;
    });
  }, [data, empType, department, empName]);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 items-end">
          <div>
            <Label className="text-xs">Month</Label>
            <Select value={month} onChange={e => setMonth(Number(e.target.value))}>
              {Array.from({length:12},(_,i)=><option key={i+1} value={i+1}>{getMonthName(i+1)}</option>)}
            </Select>
          </div>
          <div>
            <Label className="text-xs">Year</Label>
            <Select value={year} onChange={e => setYear(Number(e.target.value))}>
              {[2024,2025,2026,2027].map(y=><option key={y} value={y}>{y}</option>)}
            </Select>
          </div>
          <div>
            <Label className="text-xs">Branch</Label>
            <Select value={branchId} onChange={e => setBranchId(e.target.value)}>
              <option value="">All Branches</option>
              {branches?.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          </div>
          <div>
            <Label className="text-xs">Employee Type</Label>
            <Select value={empType} onChange={e => setEmpType(e.target.value)}>
              <option value="">All Types</option>
              <option value="permanent">Permanent</option>
              <option value="contract">Contract</option>
              <option value="casual">Casual</option>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Department</Label>
            <Select value={department} onChange={e => setDepartment(e.target.value)}>
              <option value="">All Departments</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </Select>
          </div>
          <div>
            <Label className="text-xs">Employee Name</Label>
            <Input placeholder="Search name…" value={empName} onChange={e => setEmpName(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setApplied({ month, year, branchId })} className="flex-1">Generate</Button>
            <Button variant="outline"><FileDown className="w-4 h-4" /></Button>
          </div>
        </div>
      </Card>

      {data && (
        <Card className="p-3 flex flex-wrap gap-6 text-sm border-green-200 bg-green-50/30">
          <div><span className="text-muted-foreground">Period: </span><strong>{getMonthName(data.month)} {data.year}</strong></div>
          <div><span className="text-muted-foreground">Showing: </span><strong>{filtered.length} of {data.totalEmployees} Employees</strong></div>
          <div><span className="text-muted-foreground">Working Days: </span><strong>{data.workingDays}</strong></div>
        </Card>
      )}

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Generating report...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr>
                  {["Emp ID","Employee","Department","Branch","Designation","Type","Present","Absent","Late","Half Day","Leave","Holiday","Work Hrs","OT Hrs","Att %"].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((e: any) => (
                  <tr key={e.employeeId} className="hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-2 font-mono whitespace-nowrap text-muted-foreground">{e.employeeCode}</td>
                    <td className="px-3 py-2 font-medium whitespace-nowrap">{e.employeeName}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{e.department || "—"}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{e.branchName}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{e.designation}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {e.employeeType ? (
                        <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium capitalize",
                          e.employeeType === "permanent" ? "bg-blue-100 text-blue-700" :
                          e.employeeType === "contract"  ? "bg-purple-100 text-purple-700" :
                          "bg-orange-100 text-orange-700"
                        )}>{e.employeeType}</span>
                      ) : "—"}
                    </td>
                    <td className="px-3 py-2 text-center whitespace-nowrap text-green-600 font-semibold">{e.presentDays}</td>
                    <td className="px-3 py-2 text-center whitespace-nowrap text-red-600 font-semibold">{e.absentDays}</td>
                    <td className="px-3 py-2 text-center whitespace-nowrap text-amber-600 font-semibold">{e.lateDays}</td>
                    <td className="px-3 py-2 text-center whitespace-nowrap text-yellow-600 font-semibold">{e.halfDays}</td>
                    <td className="px-3 py-2 text-center whitespace-nowrap text-purple-600 font-semibold">{e.leaveDays}</td>
                    <td className="px-3 py-2 text-center whitespace-nowrap text-gray-600 font-semibold">{e.holidayDays}</td>
                    <td className="px-3 py-2 text-center font-mono whitespace-nowrap">{e.totalWorkHours.toFixed(1)}h</td>
                    <td className="px-3 py-2 text-center font-mono whitespace-nowrap text-amber-600">{e.overtimeHours.toFixed(1)}h</td>
                    <td className="px-3 py-2 text-center whitespace-nowrap">
                      <span className={cn("px-2 py-0.5 rounded text-xs font-bold",
                        e.attendancePercentage >= 90 ? "bg-green-100 text-green-700" :
                        e.attendancePercentage >= 75 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"
                      )}>{e.attendancePercentage}%</span>
                    </td>
                  </tr>
                ))}
                {!filtered.length && (
                  <tr><td colSpan={15} className="text-center py-8 text-muted-foreground">Click Generate to load the monthly report.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function OvertimeReport() {
  const now = new Date();
  const [startDate, setStartDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]);
  const [endDate, setEndDate]     = useState(now.toISOString().split("T")[0]);
  const [branchId, setBranchId]   = useState("");
  const [empType, setEmpType]     = useState("");
  const [empName, setEmpName]     = useState("");
  const [applied, setApplied] = useState({ startDate, endDate, branchId });
  const { data: branches } = useListBranches();
  const { data, isLoading } = useGetOvertimeReport({
    startDate: applied.startDate,
    endDate: applied.endDate,
    ...(applied.branchId ? { branchId: Number(applied.branchId) } : {}),
  });

  const filtered = useMemo(() => {
    return (data?.employees || []).filter((e: any) => {
      const matchType = !empType || e.employeeType === empType;
      const matchName = !empName || (e.employeeName || "").toLowerCase().includes(empName.toLowerCase());
      return matchType && matchName;
    });
  }, [data, empType, empName]);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
          <div>
            <Label className="text-xs">Start Date</Label>
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">End Date</Label>
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Branch</Label>
            <Select value={branchId} onChange={e => setBranchId(e.target.value)}>
              <option value="">All Branches</option>
              {branches?.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          </div>
          <div>
            <Label className="text-xs">Employee Type</Label>
            <Select value={empType} onChange={e => setEmpType(e.target.value)}>
              <option value="">All Types</option>
              <option value="permanent">Permanent</option>
              <option value="contract">Contract</option>
              <option value="casual">Casual</option>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Employee Name</Label>
            <Input placeholder="Search name…" value={empName} onChange={e => setEmpName(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setApplied({ startDate, endDate, branchId })} className="flex-1">Apply</Button>
            <Button variant="outline"><FileDown className="w-4 h-4" /></Button>
          </div>
        </div>
      </Card>

      {data && (
        <Card className="p-3 flex gap-6 text-sm border-amber-200 bg-amber-50/30">
          <div><span className="text-muted-foreground">Total OT Hours: </span><strong className="text-amber-700">{filtered.reduce((s: number, e: any) => s + e.totalOvertimeHours, 0).toFixed(1)}h</strong></div>
          <div><span className="text-muted-foreground">Employees with OT: </span><strong>{filtered.length}</strong></div>
        </Card>
      )}

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr>
                  {["Emp ID","Employee","Branch","Designation","Type","OT Days","Total OT Hours","Daily Breakdown"].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((e: any) => (
                  <tr key={e.employeeId} className="hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-2 font-mono whitespace-nowrap text-muted-foreground">{e.employeeCode}</td>
                    <td className="px-3 py-2 font-medium whitespace-nowrap">{e.employeeName}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{e.branchName}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{e.designation}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {e.employeeType ? (
                        <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium capitalize",
                          e.employeeType === "permanent" ? "bg-blue-100 text-blue-700" :
                          e.employeeType === "contract"  ? "bg-purple-100 text-purple-700" :
                          "bg-orange-100 text-orange-700"
                        )}>{e.employeeType}</span>
                      ) : "—"}
                    </td>
                    <td className="px-3 py-2 text-center whitespace-nowrap font-semibold text-amber-600">{e.overtimeDays}</td>
                    <td className="px-3 py-2 text-center whitespace-nowrap font-bold text-amber-700">{e.totalOvertimeHours.toFixed(1)}h</td>
                    <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                      {e.records.slice(0,3).map((r: any) => `${r.date}: ${r.overtimeHours.toFixed(1)}h`).join(" | ")}
                      {e.records.length > 3 && ` +${e.records.length-3} more`}
                    </td>
                  </tr>
                ))}
                {!filtered.length && (
                  <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">No overtime records found for this period.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

interface PayrollRecord {
  id: number; employeeId: number; month: number; year: number;
  basicSalary: number; grossSalary: number; netSalary: number;
  epfEmployee: number; epfEmployer: number; etfEmployer: number; apit: number;
  totalDeductions: number; overtimePay: number; status: string;
  employee: { id: number; employeeId: string; fullName: string; designation: string; department: string; employeeType?: string };
}

function PayrollReport() {
  const now = new Date();
  const [month, setMonth]   = useState(now.getMonth() + 1);
  const [year, setYear]     = useState(now.getFullYear());
  const [empType, setEmpType] = useState("");
  const [status, setStatus] = useState("");
  const [empName, setEmpName] = useState("");
  const [data, setData]     = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const { data: branches } = useListBranches();

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(apiUrl(`/payroll?month=${month}&year=${year}`));
      const d = await r.json();
      setData(Array.isArray(d) ? d : []);
    } catch { setData([]); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [month, year]);

  const filtered = useMemo(() => {
    return data.filter(r => {
      const matchType   = !empType || r.employee.employeeType === empType;
      const matchStatus = !status  || r.status === status;
      const matchName   = !empName || (r.employee.fullName || "").toLowerCase().includes(empName.toLowerCase());
      return matchType && matchStatus && matchName;
    });
  }, [data, empType, status, empName]);

  const totals = useMemo(() => ({
    gross:       filtered.reduce((s, r) => s + r.grossSalary, 0),
    net:         filtered.reduce((s, r) => s + r.netSalary, 0),
    epfEmployee: filtered.reduce((s, r) => s + r.epfEmployee, 0),
    epfEmployer: filtered.reduce((s, r) => s + r.epfEmployer, 0),
    etf:         filtered.reduce((s, r) => s + r.etfEmployer, 0),
    apit:        filtered.reduce((s, r) => s + r.apit, 0),
    ot:          filtered.reduce((s, r) => s + r.overtimePay, 0),
  }), [filtered]);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
          <div>
            <Label className="text-xs">Month</Label>
            <Select value={month} onChange={e => setMonth(Number(e.target.value))}>
              {Array.from({length:12},(_,i)=><option key={i+1} value={i+1}>{getMonthName(i+1)}</option>)}
            </Select>
          </div>
          <div>
            <Label className="text-xs">Year</Label>
            <Select value={year} onChange={e => setYear(Number(e.target.value))}>
              {[2024,2025,2026,2027].map(y=><option key={y} value={y}>{y}</option>)}
            </Select>
          </div>
          <div>
            <Label className="text-xs">Employee Type</Label>
            <Select value={empType} onChange={e => setEmpType(e.target.value)}>
              <option value="">All Types</option>
              <option value="permanent">Permanent</option>
              <option value="contract">Contract</option>
              <option value="casual">Casual</option>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Status</Label>
            <Select value={status} onChange={e => setStatus(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Employee Name</Label>
            <Input placeholder="Search name…" value={empName} onChange={e => setEmpName(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button onClick={load} className="flex-1">Refresh</Button>
            <Button variant="outline"><FileDown className="w-4 h-4" /></Button>
          </div>
        </div>
      </Card>

      {filtered.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Employees", val: filtered.length,           fmt: false, cls: "text-primary" },
            { label: "Total Gross",     val: totals.gross,              fmt: true,  cls: "text-emerald-600" },
            { label: "Total Net Pay",   val: totals.net,                fmt: true,  cls: "text-blue-600" },
            { label: "Total EPF (Emp)", val: totals.epfEmployee,        fmt: true,  cls: "text-purple-600" },
            { label: "EPF Employer",    val: totals.epfEmployer,        fmt: true,  cls: "text-indigo-600" },
            { label: "ETF",             val: totals.etf,                fmt: true,  cls: "text-violet-600" },
            { label: "Total APIT",      val: totals.apit,               fmt: true,  cls: "text-amber-600" },
            { label: "Total OT Pay",    val: totals.ot,                 fmt: true,  cls: "text-orange-600" },
          ].map(({ label, val, fmt: f, cls }) => (
            <Card key={label} className="p-3">
              <div className={cn("text-lg font-bold", cls)}>{f ? fmt(val as number) : val}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
            </Card>
          ))}
        </div>
      )}

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading payroll data...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr>
                  {["Emp ID","Employee","Designation","Department","Type","Basic","Gross","EPF(Emp)","EPF(Er)","ETF","APIT","OT Pay","Deductions","Net Salary","Status"].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(r => (
                  <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-2 font-mono whitespace-nowrap text-muted-foreground">{r.employee.employeeId}</td>
                    <td className="px-3 py-2 font-medium whitespace-nowrap">{r.employee.fullName}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{r.employee.designation}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{r.employee.department || "—"}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {r.employee.employeeType ? (
                        <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium capitalize",
                          r.employee.employeeType === "permanent" ? "bg-blue-100 text-blue-700" :
                          r.employee.employeeType === "contract"  ? "bg-purple-100 text-purple-700" :
                          "bg-orange-100 text-orange-700"
                        )}>{r.employee.employeeType}</span>
                      ) : "—"}
                    </td>
                    <td className="px-3 py-2 font-mono whitespace-nowrap">{fmt(r.basicSalary)}</td>
                    <td className="px-3 py-2 font-mono whitespace-nowrap text-emerald-700 font-semibold">{fmt(r.grossSalary)}</td>
                    <td className="px-3 py-2 font-mono whitespace-nowrap text-purple-600">{fmt(r.epfEmployee)}</td>
                    <td className="px-3 py-2 font-mono whitespace-nowrap text-indigo-600">{fmt(r.epfEmployer)}</td>
                    <td className="px-3 py-2 font-mono whitespace-nowrap text-violet-600">{fmt(r.etfEmployer)}</td>
                    <td className="px-3 py-2 font-mono whitespace-nowrap text-amber-600">{fmt(r.apit)}</td>
                    <td className="px-3 py-2 font-mono whitespace-nowrap text-orange-600">{fmt(r.overtimePay)}</td>
                    <td className="px-3 py-2 font-mono whitespace-nowrap text-red-600">{fmt(r.totalDeductions)}</td>
                    <td className="px-3 py-2 font-mono whitespace-nowrap font-bold text-blue-700">{fmt(r.netSalary)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                        r.status === "paid"     ? "bg-emerald-100 text-emerald-700" :
                        r.status === "approved" ? "bg-blue-100 text-blue-700" :
                        "bg-amber-100 text-amber-700"
                      )}>{r.status}</span>
                    </td>
                  </tr>
                ))}
                {!filtered.length && (
                  <tr><td colSpan={15} className="text-center py-8 text-muted-foreground">No payroll records found for {getMonthName(month)} {year}.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
