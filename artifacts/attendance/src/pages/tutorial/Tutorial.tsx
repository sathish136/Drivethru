import { useState } from "react";
import {
  LayoutGrid,
  UserRound,
  ClipboardList,
  CalendarCheck,
  Timer,
  MapPinned,
  Cog,
  BarChart3,
  Wallet,
  ListChecks,
  ShieldCheck,
  BookOpen,
  ClipboardCheck,
  CalendarClock,
  Banknote,
  CalendarDays,
  Gift,
  CalendarOff,
  Fingerprint,
  Sliders,
  ChevronRight,
  ChevronDown,
  Info,
  Search,
  LogIn,
  Star,
  PlayCircle,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ─────────────────────────── types ─────────────────────────── */
type Step = { title: string; description: string; tip?: string };
type Module = {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  group: string;
  path: string;
  summary: string;
  steps: Step[];
  notes?: string[];
  mockup: React.ReactNode;
};

/* ─────────────────────────── marker bubble ─────────────────────────── */
function M({ n, className }: { n: number; className?: string }) {
  return (
    <span
      className={cn(
        "absolute z-10 w-6 h-6 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center shadow-lg border-2 border-white ring-1 ring-red-400",
        className
      )}
    >
      {n}
    </span>
  );
}

/* ─────────────────────── MOCKUP ILLUSTRATIONS ─────────────────────── */

const LoginMockup = () => (
  <div className="relative bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm text-[10px] select-none">
    <div className="flex h-52">
      <div className="w-1/2 bg-blue-700 p-4 flex flex-col gap-2">
        <div className="text-white font-bold text-sm leading-tight">Smart Workforce Management</div>
        <div className="text-blue-200 text-[10px] leading-relaxed">Attendance, payroll &amp; HR unified.</div>
        <div className="mt-auto flex gap-1 flex-wrap">
          {["Shift & OT","EPF/ETF Payroll","Leave Workflows"].map(f => (
            <span key={f} className="bg-blue-600 text-blue-100 px-1.5 py-0.5 rounded text-[9px]">{f}</span>
          ))}
        </div>
      </div>
      <div className="w-1/2 p-4 flex flex-col gap-2 relative">
        <div className="text-gray-800 font-semibold text-xs">Welcome back 👋</div>
        <div className="text-gray-400 text-[9px] mb-1">Sign in to your Drivethru dashboard</div>
        <div className="relative">
          <M n={1} className="-top-2 -right-2" />
          <div className="border border-gray-300 rounded px-2 py-1 text-gray-400 text-[9px] bg-gray-50">USERNAME</div>
        </div>
        <div className="relative">
          <M n={2} className="-top-2 -right-2" />
          <div className="border border-gray-300 rounded px-2 py-1 text-gray-400 text-[9px] bg-gray-50">PASSWORD ••••••</div>
        </div>
        <div className="relative">
          <M n={3} className="-top-2 -right-2" />
          <div className="bg-blue-700 text-white text-center rounded py-1.5 text-[10px] font-semibold mt-1 cursor-pointer">Sign In →</div>
        </div>
      </div>
    </div>
  </div>
);

const DashboardMockup = () => (
  <div className="relative bg-gray-50 rounded-xl overflow-hidden border border-gray-200 shadow-sm text-[10px] select-none p-3">
    <div className="text-xs font-semibold text-gray-700 mb-2">Dashboard — Overview</div>
    <div className="grid grid-cols-4 gap-1.5 mb-2">
      {[
        { label: "Total Employees", val: "124", c: "bg-blue-50 border-blue-200" },
        { label: "Present Today", val: "98", c: "bg-green-50 border-green-200" },
        { label: "Absent Today", val: "12", c: "bg-red-50 border-red-200" },
        { label: "Late Arrivals", val: "14", c: "bg-yellow-50 border-yellow-200" },
      ].map((s, i) => (
        <div key={i} className={cn("relative border rounded-lg p-2", s.c)}>
          <M n={i + 1} className="-top-2 -right-2" />
          <div className="font-bold text-gray-800 text-sm">{s.val}</div>
          <div className="text-[9px] text-gray-500 leading-tight">{s.label}</div>
        </div>
      ))}
    </div>
    <div className="flex gap-2">
      <div className="flex-1 bg-white border border-gray-200 rounded-lg p-2 relative">
        <M n={5} className="-top-2 -right-2" />
        <div className="text-[9px] text-gray-500 mb-1">Monthly Rate</div>
        <div className="text-lg font-bold text-green-600">87%</div>
        <div className="w-full h-2 bg-gray-100 rounded-full mt-1"><div className="h-2 bg-green-500 rounded-full" style={{width:"87%"}} /></div>
      </div>
      <div className="flex-1 bg-white border border-gray-200 rounded-lg p-2 relative">
        <M n={6} className="-top-2 -right-2" />
        <div className="text-[9px] text-gray-500 mb-1">Branch Status</div>
        {["Main Office ● Online","Colombo ● Online","Kandy ● Offline"].map((b, i) => (
          <div key={i} className="text-[9px] text-gray-600 flex items-center gap-1">
            <span className={cn("w-1.5 h-1.5 rounded-full", i < 2 ? "bg-green-500" : "bg-red-400")} />
            {b}
          </div>
        ))}
      </div>
    </div>
  </div>
);

const TodayMockup = () => (
  <div className="relative bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm text-[10px] select-none p-3">
    <div className="flex items-center justify-between mb-2">
      <div className="text-xs font-semibold text-gray-700">Today's Attendance</div>
      <div className="relative">
        <M n={1} className="-top-2 -right-2" />
        <div className="border border-gray-300 rounded px-2 py-0.5 text-gray-500 text-[9px] flex items-center gap-1">
          <Search className="w-2.5 h-2.5" /> Search employee
        </div>
      </div>
    </div>
    <div className="relative mb-2">
      <M n={2} className="-top-2 -right-2" />
      <div className="flex gap-1">
        <div className="border border-gray-300 rounded px-2 py-0.5 text-[9px] text-gray-500">Branch ▾</div>
        <div className="border border-gray-300 rounded px-2 py-0.5 text-[9px] text-gray-500">Dept ▾</div>
      </div>
    </div>
    <table className="w-full text-[9px]">
      <thead><tr className="bg-gray-50 border-b border-gray-200">
        {["Employee","Check In","Check Out","Late","Status"].map(h => (
          <th key={h} className="text-left px-1 py-1 text-gray-500 font-medium">{h}</th>
        ))}
      </tr></thead>
      <tbody>
        {[
          { name:"Nimal S.", ci:"08:02","co":"17:01",late:"-",s:"Present",sc:"bg-green-100 text-green-700" },
          { name:"Kamala P.",ci:"08:19","co":"17:05",late:"4m",s:"Late",sc:"bg-yellow-100 text-yellow-700" },
          { name:"Amal F.", ci:"—","co":"—",late:"—",s:"Absent",sc:"bg-red-100 text-red-700" },
        ].map((r, i) => (
          <tr key={i} className="border-b border-gray-100">
            <td className="px-1 py-1">{r.name}</td>
            <td className="px-1 py-1">{r.ci}</td>
            <td className="px-1 py-1">{r.co}</td>
            <td className="px-1 py-1 text-red-500">{r.late}</td>
            <td className="px-1 py-1 relative">
              {i === 1 && <M n={3} className="-top-2 -right-1" />}
              {i === 2 && <M n={4} className="-top-2 -right-1" />}
              <span className={cn("px-1.5 py-0.5 rounded-full text-[9px]", r.sc)}>{r.s}</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const MonthlyMockup = () => (
  <div className="relative bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm text-[10px] select-none p-3">
    <div className="flex items-center justify-between mb-2">
      <div className="text-xs font-semibold text-gray-700">Monthly Sheet</div>
      <div className="flex gap-1">
        <div className="relative"><M n={1} className="-top-2 -right-2" /><div className="border rounded px-2 py-0.5 text-[9px] text-gray-500 border-gray-300">April 2026 ▾</div></div>
        <div className="relative"><M n={2} className="-top-2 -right-2" /><div className="border rounded px-2 py-0.5 text-[9px] text-gray-500 border-gray-300">Branch ▾</div></div>
      </div>
    </div>
    <div className="overflow-hidden">
      <div className="flex text-[8px] text-gray-400 border-b pb-1 mb-1 gap-px">
        <div className="w-20 shrink-0">Employee</div>
        {[1,2,3,4,5,6,7,8,9,10].map(d => <div key={d} className="w-5 text-center shrink-0">{d}</div>)}
      </div>
      {[
        { name:"Nimal S.", days:["P","P","P","H","P","P","W","P","L","P"], },
        { name:"Kamala P.", days:["P","L","P","H","A","P","W","P","P","P"], },
        { name:"Amal F.", days:["A","P","P","H","P","L","W","A","P","P"], },
      ].map((row, ri) => (
        <div key={ri} className={cn("flex gap-px items-center", ri === 0 && "relative")}>
          {ri === 0 && <M n={3} className="-top-2 -right-2" />}
          <div className="w-20 shrink-0 text-[9px] py-0.5 truncate">{row.name}</div>
          {row.days.map((d, di) => (
            <div key={di} className={cn(
              "w-5 h-5 text-[8px] flex items-center justify-center rounded shrink-0 font-semibold",
              d==="P"?"bg-green-100 text-green-700":
              d==="A"?"bg-red-100 text-red-600":
              d==="L"?"bg-blue-100 text-blue-600":
              d==="H"?"bg-gray-200 text-gray-500":
              "bg-gray-100 text-gray-400"
            )}>{d}</div>
          ))}
        </div>
      ))}
    </div>
    <div className="mt-2 flex gap-2 text-[9px]">
      {[{c:"bg-green-100 text-green-700",l:"P = Present"},{c:"bg-red-100 text-red-600",l:"A = Absent"},{c:"bg-blue-100 text-blue-600",l:"L = Leave"},{c:"bg-gray-200 text-gray-500",l:"H = Holiday"}].map(({c,l}) => (
        <span key={l} className={cn("px-1.5 py-0.5 rounded",c)}>{l}</span>
      ))}
    </div>
  </div>
);

const ApprovalsMockup = () => (
  <div className="relative bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm text-[10px] select-none p-3">
    <div className="flex items-center justify-between mb-2">
      <div className="text-xs font-semibold text-gray-700">Attendance Approvals</div>
      <div className="relative">
        <M n={4} className="-top-2 -right-2" />
        <div className="bg-emerald-600 text-white rounded px-2 py-0.5 text-[9px]">+ Add Manual Entry</div>
      </div>
    </div>
    {[
      { emp:"Nimal S.", date:"19 Apr", req:"Missing check-out — add 17:00", stat:"Pending" },
      { emp:"Kamala P.", date:"18 Apr", req:"Late correction — 08:05 → 08:00", stat:"Pending" },
    ].map((r, i) => (
      <div key={i} className={cn("border border-gray-200 rounded-lg p-2 mb-2 relative", i===0 && "border-yellow-300 bg-yellow-50")}>
        {i===0 && <M n={1} className="-top-2 -right-2" />}
        <div className="flex items-start justify-between">
          <div>
            <div className="font-semibold text-gray-800 text-[10px]">{r.emp}</div>
            <div className="text-gray-500 text-[9px]">{r.date} · {r.req}</div>
          </div>
          <div className="flex gap-1 relative">
            {i === 0 && <M n={2} className="-top-2 -left-2" />}
            {i === 0 && <M n={3} className="-top-2 right-16" />}
            <div className="bg-green-100 text-green-700 text-[9px] px-2 py-0.5 rounded font-medium">Approve</div>
            <div className="bg-red-100 text-red-600 text-[9px] px-2 py-0.5 rounded font-medium">Reject</div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

const LeaveMockup = () => (
  <div className="relative bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm text-[10px] select-none p-3">
    <div className="flex items-center justify-between mb-3">
      <div className="text-xs font-semibold text-gray-700">Leave Entry</div>
      <div className="bg-emerald-600 text-white rounded px-2 py-0.5 text-[9px]">+ Add Leave</div>
    </div>
    <div className="border border-gray-200 rounded-lg p-3 space-y-2 relative">
      <M n={1} className="-top-2 -right-2" />
      <div className="relative">
        <M n={2} className="-top-2 -left-2" />
        <div className="text-[9px] text-gray-500 mb-0.5">Employee</div>
        <div className="border border-gray-300 rounded px-2 py-1 text-[9px] bg-gray-50">Nimal Seneviratne ▾</div>
      </div>
      <div className="relative">
        <M n={3} className="-top-2 -left-2" />
        <div className="text-[9px] text-gray-500 mb-0.5">Leave Type</div>
        <div className="border border-gray-300 rounded px-2 py-1 text-[9px] bg-gray-50">Annual Leave ▾</div>
      </div>
      <div className="grid grid-cols-2 gap-2 relative">
        <M n={4} className="-top-2 -right-2" />
        <div>
          <div className="text-[9px] text-gray-500 mb-0.5">From</div>
          <div className="border border-gray-300 rounded px-2 py-1 text-[9px] bg-gray-50">21 Apr 2026</div>
        </div>
        <div>
          <div className="text-[9px] text-gray-500 mb-0.5">To</div>
          <div className="border border-gray-300 rounded px-2 py-1 text-[9px] bg-gray-50">23 Apr 2026</div>
        </div>
      </div>
      <div className="relative">
        <M n={5} className="-top-2 -right-2" />
        <div className="bg-emerald-600 text-white text-center rounded py-1 text-[9px] font-semibold">Save Leave Entry</div>
      </div>
    </div>
  </div>
);

const EmployeesMockup = () => (
  <div className="relative bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm text-[10px] select-none p-3">
    <div className="flex items-center justify-between mb-2">
      <div className="text-xs font-semibold text-gray-700">Employees</div>
      <div className="relative">
        <M n={2} className="-top-2 -right-2" />
        <div className="bg-emerald-600 text-white rounded px-2 py-0.5 text-[9px]">+ Add Employee</div>
      </div>
    </div>
    <div className="relative mb-2">
      <M n={1} className="-top-2 -right-2" />
      <div className="flex gap-1">
        <div className="flex-1 border border-gray-300 rounded px-2 py-0.5 text-[9px] text-gray-400 flex items-center gap-1"><Search className="w-2.5 h-2.5" />Search...</div>
        <div className="border border-gray-300 rounded px-2 py-0.5 text-[9px] text-gray-500">Branch ▾</div>
      </div>
    </div>
    <table className="w-full text-[9px]">
      <thead><tr className="bg-gray-50 border-b"><th className="text-left px-1 py-1 text-gray-500">ID</th><th className="text-left px-1 py-1 text-gray-500">Name</th><th className="text-left px-1 py-1 text-gray-500">Dept</th><th className="text-left px-1 py-1 text-gray-500">Shift</th><th className="text-left px-1 py-1 text-gray-500">Actions</th></tr></thead>
      <tbody>
        {[
          { id:"E001", name:"Nimal S.", dept:"Operations", shift:"Morning" },
          { id:"E002", name:"Kamala P.", dept:"Finance", shift:"Morning" },
        ].map((r,i) => (
          <tr key={i} className="border-b border-gray-100">
            <td className="px-1 py-1 text-gray-400">{r.id}</td>
            <td className="px-1 py-1 font-medium relative">
              {i===0 && <M n={3} className="-top-2 -left-2" />}
            </td>
            <td className="px-1 py-1 text-gray-500">{r.dept}</td>
            <td className="px-1 py-1 text-gray-500">{r.shift}</td>
            <td className="px-1 py-1 relative">
              {i===0 && <M n={4} className="-top-2 -right-2" />}
              <div className="flex gap-1">
                <span className="bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded text-[8px]">Edit</span>
                <span className="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded text-[8px]">Off</span>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const PayrollMockup = () => (
  <div className="relative bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm text-[10px] select-none p-3">
    <div className="flex items-center justify-between mb-2">
      <div className="text-xs font-semibold text-gray-700">Payroll — April 2026</div>
      <div className="flex gap-1 relative">
        <M n={1} className="-top-2 -right-2" />
        <div className="border border-gray-300 rounded px-2 py-0.5 text-[9px] text-gray-500">April 2026 ▾</div>
        <div className="bg-emerald-600 text-white rounded px-2 py-0.5 text-[9px] relative">
          <M n={2} className="-top-2 -right-2" />
          Calculate
        </div>
      </div>
    </div>
    <table className="w-full text-[9px]">
      <thead><tr className="bg-gray-50 border-b">
        {["Employee","Basic","Allowances","OT","Deductions","Net"].map(h => (
          <th key={h} className="text-left px-1 py-1 text-gray-500">{h}</th>
        ))}
      </tr></thead>
      <tbody>
        {[
          { n:"Nimal S.", b:"45,000", a:"5,500", ot:"2,200", d:"3,960", net:"48,740", marker:3 },
          { n:"Kamala P.", b:"38,000", a:"4,000", ot:"0", d:"3,040", net:"38,960", marker:4 },
        ].map((r,i) => (
          <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
            <td className="px-1 py-1 font-medium">{r.n}</td>
            <td className="px-1 py-1">{r.b}</td>
            <td className="px-1 py-1 text-green-600">{r.a}</td>
            <td className="px-1 py-1 text-blue-600">{r.ot}</td>
            <td className="px-1 py-1 text-red-500">-{r.d}</td>
            <td className="px-1 py-1 font-bold text-gray-800 relative">
              {i===0 && <M n={r.marker} className="-top-2 -right-2" />}
              {r.net}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    <div className="mt-2 flex gap-1.5 relative">
      <M n={5} className="-top-2 left-8" />
      <div className="bg-blue-100 text-blue-700 rounded px-2 py-1 text-[9px] font-medium">Generate Payslips</div>
      <div className="bg-gray-800 text-white rounded px-2 py-1 text-[9px] font-medium relative">
        <M n={6} className="-top-2 -right-2" />
        Finalize Payroll
      </div>
    </div>
  </div>
);

const PayrollSettingsMockup = () => (
  <div className="relative bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm text-[10px] select-none p-3">
    <div className="text-xs font-semibold text-gray-700 mb-3">Payroll Settings</div>
    <div className="space-y-2">
      <div className="border border-gray-200 rounded-lg p-2 relative">
        <M n={1} className="-top-2 -right-2" />
        <div className="font-semibold text-gray-700 text-[10px] mb-1">Allowances</div>
        {["Transport: Rs 3,500","Housing: Rs 2,000","Meal: Rs 1,000"].map(a => (
          <div key={a} className="flex justify-between text-[9px] text-gray-600 py-0.5 border-b border-gray-100 last:border-0">
            <span>{a}</span><span className="bg-blue-50 text-blue-600 px-1 rounded">Edit</span>
          </div>
        ))}
      </div>
      <div className="border border-gray-200 rounded-lg p-2 relative">
        <M n={2} className="-top-2 -right-2" />
        <div className="font-semibold text-gray-700 text-[10px] mb-1">Deductions</div>
        {["Late deduction: Rs 15/min","No-pay per day: 1/22 salary"].map(d => (
          <div key={d} className="text-[9px] text-gray-600 py-0.5">{d}</div>
        ))}
      </div>
      <div className="border border-gray-200 rounded-lg p-2 relative">
        <M n={3} className="-top-2 -right-2" />
        <div className="font-semibold text-gray-700 text-[10px] mb-1">EPF / ETF Rates</div>
        <div className="grid grid-cols-3 gap-1 text-[9px]">
          <div className="bg-blue-50 rounded p-1 text-center"><div className="font-bold text-blue-700">8%</div><div className="text-gray-500">Emp EPF</div></div>
          <div className="bg-green-50 rounded p-1 text-center"><div className="font-bold text-green-700">12%</div><div className="text-gray-500">Emp EPF</div></div>
          <div className="bg-amber-50 rounded p-1 text-center"><div className="font-bold text-amber-700">3%</div><div className="text-gray-500">ETF</div></div>
        </div>
      </div>
    </div>
  </div>
);

const HRSettingsMockup = () => (
  <div className="relative bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm text-[10px] select-none p-3">
    <div className="text-xs font-semibold text-gray-700 mb-3">HR Settings — Attendance Rules</div>
    <div className="space-y-2">
      {[
        { n:1, label:"Grace Period (Late)", val:"15 minutes", desc:"Employees clocking in within 15 min of shift start are not marked Late" },
        { n:2, label:"Late Deduction", val:"Rs 15 / min", desc:"Per-minute deduction applied after grace period" },
        { n:3, label:"Overtime Starts After", val:"9.5 hours worked", desc:"OT is calculated for hours beyond this threshold" },
        { n:4, label:"Lunch Break Duration", val:"60 minutes", desc:"Longer lunch returns trigger Lunch Return Late status" },
      ].map(({ n, label, val, desc }) => (
        <div key={n} className="flex items-start gap-2 border border-gray-200 rounded-lg p-2 relative">
          <M n={n} className="-top-2 -right-2" />
          <div className="flex-1">
            <div className="flex justify-between">
              <span className="font-medium text-gray-700">{label}</span>
              <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded text-[9px] font-bold">{val}</span>
            </div>
            <div className="text-[9px] text-gray-400 mt-0.5">{desc}</div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const ShiftsMockup = () => (
  <div className="relative bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm text-[10px] select-none p-3">
    <div className="flex items-center justify-between mb-2">
      <div className="text-xs font-semibold text-gray-700">Shifts</div>
      <div className="relative"><M n={2} className="-top-2 -right-2" /><div className="bg-emerald-600 text-white rounded px-2 py-0.5 text-[9px]">+ Add Shift</div></div>
    </div>
    <div className="space-y-2">
      {[
        { n:1, name:"Morning Shift", start:"08:00", end:"17:00", break:"60 min", type:"Fixed" },
        { n:3, name:"General Shift", start:"09:00", end:"18:00", break:"60 min", type:"Flexible" },
      ].map(({ n, name, start, end, break: br, type }) => (
        <div key={n} className="border border-gray-200 rounded-lg p-2 relative">
          <M n={n} className="-top-2 -right-2" />
          <div className="flex justify-between items-center">
            <div className="font-medium text-gray-700">{name}</div>
            <span className={cn("text-[9px] px-1.5 py-0.5 rounded", type==="Fixed"?"bg-blue-50 text-blue-600":"bg-purple-50 text-purple-600")}>{type}</span>
          </div>
          <div className="text-[9px] text-gray-500 mt-0.5 flex gap-3">
            <span>Start: {start}</span><span>End: {end}</span><span>Break: {br}</span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const HolidaysMockup = () => (
  <div className="relative bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm text-[10px] select-none p-3">
    <div className="flex items-center justify-between mb-2">
      <div className="text-xs font-semibold text-gray-700">Holidays — 2026</div>
      <div className="relative"><M n={2} className="-top-2 -right-2" /><div className="bg-emerald-600 text-white rounded px-2 py-0.5 text-[9px]">+ Add Holiday</div></div>
    </div>
    <div className="space-y-1.5">
      {[
        { date:"14 Apr", name:"Sinhala & Tamil New Year", n:1 },
        { date:"01 May", name:"Labour Day", n:3 },
        { date:"26 May", name:"Vesak Poya Day", n:null },
      ].map(({ date, name, n }) => (
        <div key={name} className={cn("flex justify-between items-center border rounded-lg p-2 relative", n===1?"border-pink-200 bg-pink-50":"border-gray-200")}>
          {n && <M n={n} className="-top-2 -right-2" />}
          <div>
            <div className="font-medium text-gray-700">{name}</div>
            <div className="text-[9px] text-gray-400">{date}, 2026</div>
          </div>
          <div className="flex gap-1">
            <span className="bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded text-[8px]">Edit</span>
            <span className="bg-red-100 text-red-500 px-1.5 py-0.5 rounded text-[8px]">Delete</span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const WeekOffsMockup = () => (
  <div className="relative bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm text-[10px] select-none p-3">
    <div className="text-xs font-semibold text-gray-700 mb-3">Week Offs Configuration</div>
    <div className="relative mb-3">
      <M n={1} className="-top-2 -right-2" />
      <div className="font-medium text-gray-600 mb-1.5 text-[10px]">Default Week-off Days</div>
      <div className="flex gap-1.5">
        {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => (
          <div key={d} className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-[9px] font-semibold border-2",
            ["Sat","Sun"].includes(d) ? "bg-emerald-600 text-white border-emerald-600" : "bg-gray-50 text-gray-600 border-gray-200"
          )}>{d}</div>
        ))}
      </div>
    </div>
    <div className="border border-gray-200 rounded-lg p-2 relative">
      <M n={2} className="-top-2 -right-2" />
      <div className="font-medium text-gray-600 mb-1 text-[10px]">Branch Overrides</div>
      <div className="text-[9px] text-gray-500">Kandy Branch — Friday off (special schedule)</div>
    </div>
    <div className="mt-2 relative">
      <M n={3} className="-top-2 -right-2" />
      <div className="bg-emerald-600 text-white rounded py-1 text-center text-[9px] font-semibold">Save Week-off Settings</div>
    </div>
  </div>
);

const LeaveBalancesMockup = () => (
  <div className="relative bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm text-[10px] select-none p-3">
    <div className="text-xs font-semibold text-gray-700 mb-2">Leave Balances</div>
    <table className="w-full text-[9px]">
      <thead><tr className="bg-gray-50 border-b">
        {["Employee","Annual","Sick","Casual","Remaining","Actions"].map(h => (
          <th key={h} className="text-left px-1 py-1 text-gray-500">{h}</th>
        ))}
      </tr></thead>
      <tbody>
        {[
          { n:"Nimal S.", an:"14/14", si:"7/7", ca:"3/5", rem:"24", marker:1 },
          { n:"Kamala P.", an:"12/14", si:"5/7", ca:"5/5", rem:"22", marker:2 },
        ].map((r, i) => (
          <tr key={i} className="border-b border-gray-100 relative">
            <M n={r.marker} className="-top-2 right-0" />
            <td className="px-1 py-1 font-medium">{r.n}</td>
            <td className="px-1 py-1">{r.an}</td>
            <td className="px-1 py-1">{r.si}</td>
            <td className="px-1 py-1">{r.ca}</td>
            <td className="px-1 py-1 font-bold text-emerald-600">{r.rem}</td>
            <td className="px-1 py-1"><span className="bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded text-[8px]">Adjust</span></td>
          </tr>
        ))}
      </tbody>
    </table>
    <div className="mt-2 text-[9px] text-gray-400 italic">Balances auto-update when leave entries are saved.</div>
  </div>
);

const LoansMockup = () => (
  <div className="relative bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm text-[10px] select-none p-3">
    <div className="flex items-center justify-between mb-2">
      <div className="text-xs font-semibold text-gray-700">Loans & Advances</div>
      <div className="relative"><M n={1} className="-top-2 -right-2" /><div className="bg-emerald-600 text-white rounded px-2 py-0.5 text-[9px]">+ Add Loan</div></div>
    </div>
    <div className="space-y-2">
      {[
        { n:2, emp:"Nimal S.", amt:"50,000", monthly:"5,000", balance:"35,000", mo:"7" },
        { n:3, emp:"Amal F.", amt:"20,000", monthly:"4,000", balance:"8,000", mo:"2" },
      ].map(({ n, emp, amt, monthly, balance, mo }) => (
        <div key={emp} className="border border-gray-200 rounded-lg p-2 relative">
          <M n={n} className="-top-2 -right-2" />
          <div className="flex justify-between items-start">
            <div>
              <div className="font-medium text-gray-700">{emp}</div>
              <div className="text-[9px] text-gray-500">Total: Rs {amt} · Monthly: Rs {monthly}</div>
            </div>
            <div className="text-right">
              <div className="font-bold text-red-500 text-[10px]">Rs {balance}</div>
              <div className="text-[9px] text-gray-400">{mo} months left</div>
            </div>
          </div>
          <div className="mt-1 w-full h-1.5 bg-gray-100 rounded-full">
            <div className="h-1.5 bg-emerald-500 rounded-full" style={{ width: mo === "7" ? "30%" : "60%" }} />
          </div>
        </div>
      ))}
    </div>
  </div>
);

const IncentivesMockup = () => (
  <div className="relative bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm text-[10px] select-none p-3">
    <div className="flex items-center justify-between mb-2">
      <div className="text-xs font-semibold text-gray-700">Incentives</div>
      <div className="relative"><M n={1} className="-top-2 -right-2" /><div className="bg-emerald-600 text-white rounded px-2 py-0.5 text-[9px]">+ Add Incentive</div></div>
    </div>
    <div className="border border-gray-200 rounded-lg p-3 space-y-2 relative">
      <M n={2} className="-top-2 -right-2" />
      <div>
        <div className="text-[9px] text-gray-500 mb-0.5">Employee</div>
        <div className="border border-gray-300 rounded px-2 py-1 text-[9px] bg-gray-50">Kamala Perera ▾</div>
      </div>
      <div className="relative">
        <M n={3} className="-top-2 -right-2" />
        <div className="text-[9px] text-gray-500 mb-0.5">Type</div>
        <div className="border border-gray-300 rounded px-2 py-1 text-[9px] bg-gray-50">Performance Bonus ▾</div>
      </div>
      <div className="grid grid-cols-2 gap-2 relative">
        <M n={4} className="-top-2 -right-2" />
        <div>
          <div className="text-[9px] text-gray-500 mb-0.5">Amount</div>
          <div className="border border-gray-300 rounded px-2 py-1 text-[9px] bg-gray-50">Rs 5,000</div>
        </div>
        <div>
          <div className="text-[9px] text-gray-500 mb-0.5">Payroll Month</div>
          <div className="border border-gray-300 rounded px-2 py-1 text-[9px] bg-gray-50">April 2026</div>
        </div>
      </div>
      <div className="bg-emerald-600 text-white text-center rounded py-1 text-[9px] font-semibold">Save Incentive</div>
    </div>
  </div>
);

const BranchesMockup = () => (
  <div className="relative bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm text-[10px] select-none p-3">
    <div className="flex items-center justify-between mb-2">
      <div className="text-xs font-semibold text-gray-700">Branch Management</div>
      <div className="relative"><M n={2} className="-top-2 -right-2" /><div className="bg-emerald-600 text-white rounded px-2 py-0.5 text-[9px]">+ Add Branch</div></div>
    </div>
    <div className="grid grid-cols-2 gap-2">
      {[
        { n:1, name:"Main Office", loc:"Colombo 03", emp:48, status:"Active" },
        { n:3, name:"Kandy Branch", loc:"Kandy City", emp:32, status:"Active" },
        { n:null, name:"Galle Branch", loc:"Galle Fort", emp:24, status:"Active" },
      ].map(({ n, name, loc, emp, status }) => (
        <div key={name} className={cn("border rounded-lg p-2 relative", n===1?"border-emerald-300 bg-emerald-50":"border-gray-200")}>
          {n && <M n={n} className="-top-2 -right-2" />}
          <div className="font-medium text-gray-700">{name}</div>
          <div className="text-[9px] text-gray-400">{loc}</div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[9px] text-gray-500">{emp} employees</span>
            <span className="bg-green-100 text-green-700 text-[8px] px-1.5 rounded">{status}</span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const ReportsMockup = () => (
  <div className="relative bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm text-[10px] select-none p-3">
    <div className="text-xs font-semibold text-gray-700 mb-2">Reports</div>
    <div className="grid grid-cols-3 gap-1.5 mb-3">
      {[
        { n:1, label:"Attendance Summary", active:true },
        { n:null, label:"Late Report", active:false },
        { n:null, label:"Leave Report", active:false },
        { n:null, label:"Payroll Summary", active:false },
        { n:null, label:"OT Report", active:false },
        { n:null, label:"Absent Report", active:false },
      ].map(({ n, label, active }) => (
        <div key={label} className={cn("border rounded-lg p-2 text-[9px] text-center cursor-pointer relative", active?"border-emerald-400 bg-emerald-50 text-emerald-700 font-semibold":"border-gray-200 text-gray-500")}>
          {n && <M n={n} className="-top-2 -right-2" />}
          {label}
        </div>
      ))}
    </div>
    <div className="flex gap-1.5 mb-2">
      <div className="relative flex-1"><M n={2} className="-top-2 -right-2" /><div className="border border-gray-300 rounded px-2 py-1 text-[9px] text-gray-500">01 Apr 2026</div></div>
      <div className="flex-1"><div className="border border-gray-300 rounded px-2 py-1 text-[9px] text-gray-500">30 Apr 2026</div></div>
      <div className="relative"><M n={3} className="-top-2 -right-2" /><div className="border border-gray-300 rounded px-2 py-1 text-[9px] text-gray-500">All Branches ▾</div></div>
    </div>
    <div className="flex gap-1.5 relative">
      <M n={4} className="-top-2 right-0" />
      <div className="flex-1 bg-emerald-600 text-white text-center rounded py-1 text-[9px] font-semibold">Generate Report</div>
      <div className="bg-gray-100 text-gray-600 rounded px-2 py-1 text-[9px]">Export CSV</div>
      <div className="bg-gray-100 text-gray-600 rounded px-2 py-1 text-[9px]">Export PDF</div>
    </div>
  </div>
);

const BiometricMockup = () => (
  <div className="relative bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm text-[10px] select-none p-3">
    <div className="flex items-center justify-between mb-2">
      <div className="text-xs font-semibold text-gray-700">Biometric Devices</div>
      <div className="relative"><M n={2} className="-top-2 -right-2" /><div className="bg-emerald-600 text-white rounded px-2 py-0.5 text-[9px]">+ Add Device</div></div>
    </div>
    <div className="space-y-2">
      {[
        { n:1, name:"Main Office — ZKTeco K40", ip:"192.168.1.100", status:"Online", method:"ZK Push" },
        { n:null, name:"Kandy — ZKTeco F22", ip:"10.0.1.55", status:"Offline", method:"SDK" },
      ].map(({ n, name, ip, status, method }) => (
        <div key={name} className="border border-gray-200 rounded-lg p-2 relative">
          {n && <M n={n} className="-top-2 -right-2" />}
          <div className="flex items-start justify-between">
            <div>
              <div className="font-medium text-gray-700">{name}</div>
              <div className="text-[9px] text-gray-500">IP: {ip} · {method}</div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-medium", status==="Online"?"bg-green-100 text-green-700":"bg-red-100 text-red-600")}>{status}</span>
              <div className="flex gap-1 relative">
                {n && <M n={3} className="-top-2 right-10" />}
                {n && <M n={4} className="-top-2 -right-2" />}
                <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[8px]">Test</span>
                <span className="bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded text-[8px]">Sync</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const UsersMockup = () => (
  <div className="relative bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm text-[10px] select-none p-3">
    <div className="flex items-center justify-between mb-2">
      <div className="text-xs font-semibold text-gray-700">User Management</div>
      <div className="relative"><M n={2} className="-top-2 -right-2" /><div className="bg-emerald-600 text-white rounded px-2 py-0.5 text-[9px]">+ Add User</div></div>
    </div>
    <table className="w-full text-[9px]">
      <thead><tr className="bg-gray-50 border-b">
        {["Username","Role","Last Login","Status","Actions"].map(h => (
          <th key={h} className="text-left px-1 py-1 text-gray-500">{h}</th>
        ))}
      </tr></thead>
      <tbody>
        {[
          { u:"admin", role:"Admin", ll:"Today 08:22", status:true, marker:1 },
          { u:"hr_manager", role:"HR Manager", ll:"Yesterday", status:true, marker:3 },
          { u:"branch_colombo", role:"Branch Manager", ll:"2 days ago", status:false, marker:null },
        ].map((r, i) => (
          <tr key={i} className="border-b border-gray-100">
            <td className="px-1 py-1 font-medium relative">
              {r.marker && i < 2 && <M n={r.marker} className="-top-2 -left-2" />}
              {r.u}
            </td>
            <td className="px-1 py-1">
              <span className={cn("px-1.5 py-0.5 rounded text-[8px]",
                r.role==="Admin"?"bg-red-100 text-red-600":
                r.role==="HR Manager"?"bg-blue-100 text-blue-600":"bg-gray-100 text-gray-600"
              )}>{r.role}</span>
            </td>
            <td className="px-1 py-1 text-gray-400">{r.ll}</td>
            <td className="px-1 py-1">
              <div className={cn("w-6 h-3 rounded-full relative", r.status?"bg-emerald-500":"bg-gray-300")}>
                <div className={cn("absolute top-0.5 w-2 h-2 rounded-full bg-white", r.status?"right-0.5":"left-0.5")} />
              </div>
            </td>
            <td className="px-1 py-1 relative">
              {i===1 && <M n={4} className="-top-2 -right-2" />}
              <span className="bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded text-[8px]">Edit</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const ActivityLogsMockup = () => (
  <div className="relative bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm text-[10px] select-none p-3">
    <div className="flex items-center justify-between mb-2">
      <div className="text-xs font-semibold text-gray-700">Activity Logs</div>
      <div className="relative">
        <M n={2} className="-top-2 -right-2" />
        <div className="flex gap-1">
          <div className="border border-gray-300 rounded px-2 py-0.5 text-[9px] text-gray-500">User ▾</div>
          <div className="border border-gray-300 rounded px-2 py-0.5 text-[9px] text-gray-500">Module ▾</div>
        </div>
      </div>
    </div>
    <div className="space-y-1.5">
      {[
        { n:1, user:"admin", action:"Finalized payroll for April 2026", time:"10 min ago", type:"Payroll" },
        { n:null, user:"hr_manager", action:"Approved attendance correction for Nimal S.", time:"45 min ago", type:"Attendance" },
        { n:null, user:"admin", action:"Added new employee: Priya K.", time:"2 hrs ago", type:"Employee" },
        { n:null, user:"hr_manager", action:"Updated HR Settings — grace period changed", time:"Yesterday", type:"Settings" },
      ].map(({ n, user, action, time, type }) => (
        <div key={action} className="flex items-start gap-2 border border-gray-100 rounded-lg p-2 bg-gray-50 relative">
          {n && <M n={n} className="-top-2 -right-2" />}
          <div className="w-1 h-full bg-blue-400 rounded shrink-0 self-stretch min-h-[20px]" />
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start">
              <span className="font-medium text-gray-700">{user}</span>
              <div className="flex items-center gap-1 shrink-0">
                <span className="bg-blue-50 text-blue-600 text-[8px] px-1.5 rounded">{type}</span>
                <span className="text-[9px] text-gray-400">{time}</span>
              </div>
            </div>
            <div className="text-[9px] text-gray-500 truncate">{action}</div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const SettingsMockup = () => (
  <div className="relative bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm text-[10px] select-none p-3">
    <div className="text-xs font-semibold text-gray-700 mb-3">System Settings</div>
    <div className="space-y-3">
      <div className="border border-gray-200 rounded-lg p-3 relative">
        <M n={1} className="-top-2 -right-2" />
        <div className="font-semibold text-gray-600 text-[10px] mb-2">Organization Information</div>
        <div className="space-y-1.5">
          {[{l:"Company Name",v:"Drivethru Pvt Ltd"},{l:"Address",v:"123 Main St, Colombo 03"},{l:"Phone",v:"+94 11 234 5678"}].map(({l,v}) => (
            <div key={l} className="grid grid-cols-2 gap-2">
              <span className="text-[9px] text-gray-400">{l}</span>
              <div className="border border-gray-200 rounded px-1.5 py-0.5 text-[9px] text-gray-700">{v}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="border border-gray-200 rounded-lg p-2 flex items-center gap-3 relative">
        <M n={2} className="-top-2 -right-2" />
        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
          <span className="text-xs">Logo</span>
        </div>
        <div>
          <div className="font-medium text-gray-700">Company Logo</div>
          <div className="text-[9px] text-gray-400">Click to upload (min 200×200 px)</div>
        </div>
      </div>
      <div className="relative">
        <M n={4} className="-top-2 -right-2" />
        <div className="bg-emerald-600 text-white text-center rounded py-1 text-[9px] font-semibold">Save Settings</div>
      </div>
    </div>
  </div>
);

/* ─────────────────────── DATA ─────────────────────── */
const MODULES: Module[] = [
  {
    id: "login",
    label: "Login & Access",
    icon: LogIn,
    color: "text-blue-600",
    bg: "bg-blue-50 border-blue-200",
    group: "Getting Started",
    path: "/login",
    summary: "Sign in to the Drivethru Attendance System using your credentials provided by your administrator.",
    mockup: <LoginMockup />,
    steps: [
      { title: "Open the application URL", description: "Navigate to the application URL in your browser. You will see the Drivethru login screen with a blue panel on the left and the sign-in form on the right." },
      { title: "Enter your username (marker 1)", description: "Type the username assigned to you by your system administrator in the USERNAME field." },
      { title: "Enter your password (marker 2)", description: "Enter your password. Click the eye icon on the right to toggle visibility between visible and hidden characters." },
      { title: "Click Sign In (marker 3)", description: "Press the Sign In button or hit Enter on your keyboard. You will be taken to the Dashboard on a successful login.", tip: "If you get an 'Invalid credentials' error, double-check for caps lock. Contact your admin to reset your password." },
    ],
    notes: ["Default admin credentials are set during system setup.", "Sessions are stored securely in your browser local storage."],
  },
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutGrid,
    color: "text-emerald-600",
    bg: "bg-emerald-50 border-emerald-200",
    group: "Overview",
    path: "/",
    summary: "The Dashboard gives a real-time snapshot of workforce presence, branch performance, and biometric device status.",
    mockup: <DashboardMockup />,
    steps: [
      { title: "Read the stat cards (markers 1–4)", description: "The four cards at the top show Total Employees, Present Today, Absent Today, and Late Arrivals at a glance. Green = good, Red = needs attention." },
      { title: "Check monthly attendance rate (marker 5)", description: "The large percentage indicator shows this month's overall attendance rate with a color-coded progress bar (green ≥80%, amber 60–80%, red <60%)." },
      { title: "Monitor branch performance (marker 6)", description: "Branch tiles show each location's attendance percentage and biometric device online/offline status.", tip: "A red device indicator means the biometric machine at that branch is not syncing — contact IT support." },
    ],
  },
  {
    id: "today-attendance",
    label: "Today's Attendance",
    icon: ClipboardList,
    color: "text-sky-600",
    bg: "bg-sky-50 border-sky-200",
    group: "Attendance",
    path: "/attendance/today",
    summary: "See who has checked in today, their punch times, and computed status (Present, Late, Absent, On Leave).",
    mockup: <TodayMockup />,
    steps: [
      { title: "Search for an employee (marker 1)", description: "Use the search box at the top right to quickly find a specific employee by name or employee ID." },
      { title: "Filter by branch or department (marker 2)", description: "Use the Branch and Department dropdowns to narrow the list to a specific office or team." },
      { title: "Read the attendance row (marker 3)", description: "Each row shows check-in time, check-out time, late minutes (in red), and a colored status badge — Green = Present, Yellow = Late, Red = Absent, Blue = Leave." },
      { title: "Identify absent employees (marker 4)", description: "Rows with dashes (—) in check-in/out columns and a red Absent badge indicate the employee has not punched in at all today.", tip: "Grayed-out rows indicate the employee has not yet checked in. Punch data updates automatically from biometric devices." },
    ],
    notes: ["Punch data is pulled from ZKTeco devices every few minutes.", "Manual punch adjustments must go through the Approvals module."],
  },
  {
    id: "monthly-sheet",
    label: "Monthly Sheet",
    icon: CalendarCheck,
    color: "text-violet-600",
    bg: "bg-violet-50 border-violet-200",
    group: "Attendance",
    path: "/attendance/monthly",
    summary: "A full calendar grid showing every employee's attendance status for each day of a selected month.",
    mockup: <MonthlyMockup />,
    steps: [
      { title: "Select month and year (marker 1)", description: "Use the month/year picker at the top to choose the period you want to review." },
      { title: "Choose a branch (marker 2)", description: "Filter by branch to see only employees assigned to that location." },
      { title: "Read the color-coded grid (marker 3)", description: "Each column is a date. Cells are color-coded: P (green) = Present, A (red) = Absent, L (blue) = Leave, H (gray) = Holiday, W = Week Off." },
      { title: "Export the sheet", description: "Use the Export button to download the monthly data as CSV or Excel for payroll processing.", tip: "Hover over any cell to see exact punch-in and punch-out times for that employee on that day." },
    ],
  },
  {
    id: "approvals",
    label: "Approvals",
    icon: ClipboardCheck,
    color: "text-orange-600",
    bg: "bg-orange-50 border-orange-200",
    group: "Attendance",
    path: "/attendance/approvals",
    summary: "Manage requests for attendance corrections, manual punch entries, and missing check-in/out records.",
    mockup: <ApprovalsMockup />,
    steps: [
      { title: "Review pending requests (marker 1)", description: "Highlighted cards show pending correction requests. Each shows the employee name, date, and what correction is requested." },
      { title: "Approve a correction (marker 2)", description: "Click the green Approve button to accept the correction. The attendance record updates immediately." },
      { title: "Reject a correction (marker 3)", description: "Click the red Reject button to deny the request. You can add a comment explaining the reason." },
      { title: "Add a manual entry (marker 4)", description: "Use the Add Manual Entry button to insert a punch record for an employee who missed the biometric scan entirely.", tip: "Approved corrections affect payroll — double-check before approving. All actions are saved in Activity Logs." },
    ],
    notes: ["All approval actions are logged in Activity Logs for audit purposes."],
  },
  {
    id: "leave-entry",
    label: "Leave Entry",
    icon: CalendarClock,
    color: "text-teal-600",
    bg: "bg-teal-50 border-teal-200",
    group: "Attendance",
    path: "/attendance/leave-entry",
    summary: "Record leave requests for employees — annual leave, sick leave, casual leave, and more.",
    mockup: <LeaveMockup />,
    steps: [
      { title: "Click Add Leave (marker 1)", description: "Press the Add Leave button at the top right to open the leave entry form." },
      { title: "Select the employee (marker 2)", description: "Search for and select the employee who is taking leave from the dropdown list." },
      { title: "Choose leave type (marker 3)", description: "Select the leave type: Annual, Sick, Casual, No Pay, or other types configured in your system." },
      { title: "Set the date range (marker 4)", description: "Pick the start and end dates. For a single day, set both dates the same. Half-day options may appear." },
      { title: "Save the entry (marker 5)", description: "Click Save. The employee's attendance will be marked as Leave on those dates and their leave balance will deduct automatically.", tip: "Always check the employee's remaining Leave Balance before adding Annual Leave entries." },
    ],
  },
  {
    id: "employees",
    label: "Employees",
    icon: UserRound,
    color: "text-indigo-600",
    bg: "bg-indigo-50 border-indigo-200",
    group: "HR Management",
    path: "/employees",
    summary: "Manage the master employee database — add new staff, update profiles, assign departments and designations.",
    mockup: <EmployeesMockup />,
    steps: [
      { title: "Filter and search (marker 1)", description: "Use the search box or Branch/Department dropdowns to narrow the employee list quickly." },
      { title: "Add a new employee (marker 2)", description: "Click Add Employee. Fill in the form: personal details, designation, department, branch, shift assignment, and EPF/ETF numbers." },
      { title: "View an employee profile (marker 3)", description: "Click on any employee row to open their full profile including contact info, documents, and attendance summary." },
      { title: "Edit or deactivate (marker 4)", description: "Use the Edit button to update an employee's details. Use the status toggle to deactivate resigned/terminated staff.", tip: "Deactivated employees are hidden from active lists but their historical attendance and payroll records are preserved." },
    ],
    notes: ["Employee EPF numbers are required for payroll processing.", "Each employee must be assigned a shift for attendance rules to apply."],
  },
  {
    id: "payroll",
    label: "Payroll",
    icon: Wallet,
    color: "text-green-600",
    bg: "bg-green-50 border-green-200",
    group: "HR Management",
    path: "/payroll",
    summary: "Process monthly payroll for all employees — calculate salaries, deductions, EPF/ETF, and generate payslips.",
    mockup: <PayrollMockup />,
    steps: [
      { title: "Select payroll month (marker 1)", description: "Use the month/year picker at the top to choose the payroll period." },
      { title: "Calculate payroll (marker 2)", description: "Click Calculate. The system reads attendance, overtime, leaves, loans, and incentives for every employee automatically." },
      { title: "Review individual records (marker 3)", description: "Each row shows Basic Salary, Allowances (green), Overtime (blue), Deductions (red), and Net Salary. Click a row to edit overrides." },
      { title: "Generate payslips (marker 5)", description: "Click Generate Payslips to create individual payslip PDFs. Each includes an Office Copy and System Generated copy." },
      { title: "Finalize payroll (marker 6)", description: "Once reviewed, click Finalize to lock payroll for the month. Finalized payroll cannot be changed.", tip: "Always verify overtime hours and no-pay deductions before finalizing. Use the Reports module to cross-check totals." },
    ],
    notes: ["EPF: Employee 8%, Employer 12%. ETF: Employer 3%.", "APIT (income tax) is auto-calculated based on salary bands.", "Loan recoveries and incentives are automatically included."],
  },
  {
    id: "payroll-settings",
    label: "Payroll Settings",
    icon: Sliders,
    color: "text-cyan-600",
    bg: "bg-cyan-50 border-cyan-200",
    group: "HR Management",
    path: "/payroll-settings",
    summary: "Configure salary components, allowances, deduction rules, and EPF/ETF rates used in payroll calculations.",
    mockup: <PayrollSettingsMockup />,
    steps: [
      { title: "Set up allowances (marker 1)", description: "Define recurring additions to salary: Transport, Housing, Meal Allowance, and any others. Edit each by clicking the Edit button next to it." },
      { title: "Configure deduction rules (marker 2)", description: "Set the rate for late deductions per minute, no-pay per working day, and other recurring deduction categories." },
      { title: "Verify EPF/ETF rates (marker 3)", description: "Confirm Employee EPF (8%), Employer EPF (12%), and ETF (3%) match current Sri Lanka labour regulations. Update if rates change.", tip: "Changes to Payroll Settings apply from the next payroll cycle only. Consult your HR manager before changing statutory rates." },
    ],
  },
  {
    id: "hr-settings",
    label: "HR Settings",
    icon: BookOpen,
    color: "text-rose-600",
    bg: "bg-rose-50 border-rose-200",
    group: "HR Management",
    path: "/hr-settings",
    summary: "Configure attendance rules: late grace periods, lunch return policies, overtime eligibility, and department-specific rules.",
    mockup: <HRSettingsMockup />,
    steps: [
      { title: "Set the grace period (marker 1)", description: "Define how many minutes after shift start an employee can clock in without being marked Late. The default is 15 minutes." },
      { title: "Configure late deduction rate (marker 2)", description: "Set whether late arrivals result in deductions and define the formula (e.g., Rs 15 per minute beyond grace period)." },
      { title: "Set up overtime rules (marker 3)", description: "Specify when OT begins — e.g., after 9.5 hours of work, or after a specific clock-out time like 18:30." },
      { title: "Configure lunch return policy (marker 4)", description: "Enable Lunch Return Late detection. Set the allowed break duration and the deduction rate for returning late from lunch.", tip: "HR Settings changes apply from the next attendance day forward — existing records are not retroactively changed." },
    ],
  },
  {
    id: "shifts",
    label: "Shifts",
    icon: Timer,
    color: "text-amber-600",
    bg: "bg-amber-50 border-amber-200",
    group: "HR Management",
    path: "/shifts",
    summary: "Define and manage work shifts — set shift start/end times, break durations, and assign shifts to employees.",
    mockup: <ShiftsMockup />,
    steps: [
      { title: "View existing shifts (marker 1)", description: "Each card shows the shift name, start/end times, break duration, and whether it is Fixed or Flexible." },
      { title: "Create a new shift (marker 2)", description: "Click Add Shift. Enter the shift name, start time, end time, and lunch break duration in minutes." },
      { title: "Choose Fixed vs Flexible", description: "Fixed shifts have a strict start time. Flexible shifts allow a window — useful for roles with varying start times.", tip: "Employees without a shift assigned will not have attendance rules or overtime applied to their records." },
    ],
  },
  {
    id: "holidays",
    label: "Holidays",
    icon: CalendarDays,
    color: "text-pink-600",
    bg: "bg-pink-50 border-pink-200",
    group: "HR Management",
    path: "/holidays",
    summary: "Manage the public holiday calendar. Days marked as holidays are excluded from attendance and payroll.",
    mockup: <HolidaysMockup />,
    steps: [
      { title: "View the holiday list (marker 1)", description: "All configured holidays for the year are shown as cards with their date and name." },
      { title: "Add a holiday (marker 2)", description: "Click Add Holiday. Enter the holiday name and date. Add national holidays, poya days, and any company-specific days off." },
      { title: "Edit or delete (marker 3)", description: "Click Edit to rename a holiday or change its date. Click Delete to remove it from the calendar.", tip: "Holidays are applied globally to all branches unless you configure branch-specific overrides in Week Offs." },
    ],
  },
  {
    id: "weekoffs",
    label: "Week Offs",
    icon: CalendarOff,
    color: "text-slate-600",
    bg: "bg-slate-50 border-slate-200",
    group: "HR Management",
    path: "/weekoffs",
    summary: "Define which days of the week are non-working days (e.g., Saturday and Sunday off).",
    mockup: <WeekOffsMockup />,
    steps: [
      { title: "Select week-off days (marker 1)", description: "Click the day buttons to toggle them on/off. Highlighted (green) days are non-working days. Typically Saturday and Sunday." },
      { title: "Set branch overrides (marker 2)", description: "If a specific branch has a different schedule, add a branch override with its own week-off pattern." },
      { title: "Save settings (marker 3)", description: "Click Save Week-off Settings. These days will be excluded from attendance calculations and shown as W in the Monthly Sheet.", tip: "Employees who work on week-off days may be eligible for overtime — configure this in HR Settings." },
    ],
  },
  {
    id: "leave-balances",
    label: "Leave Balances",
    icon: CalendarClock,
    color: "text-teal-700",
    bg: "bg-teal-50 border-teal-200",
    group: "HR Management",
    path: "/leave-balances",
    summary: "View and manage annual leave entitlements and current balances for each employee.",
    mockup: <LeaveBalancesMockup />,
    steps: [
      { title: "View all balances (markers 1–2)", description: "The table shows each employee's total entitled days, used days, and remaining balance for Annual, Sick, and Casual leave types." },
      { title: "Adjust a balance", description: "Click the Adjust button next to an employee to manually set their balance — useful for carry-forward leaves at year start.", tip: "Leave balances are automatically deducted when leave entries are saved in the Leave Entry module. No manual update needed." },
    ],
  },
  {
    id: "loans",
    label: "Loans & Advances",
    icon: Banknote,
    color: "text-yellow-700",
    bg: "bg-yellow-50 border-yellow-200",
    group: "HR Management",
    path: "/loans",
    summary: "Track salary advances and loans issued to employees. Repayments are automatically deducted from payroll.",
    mockup: <LoansMockup />,
    steps: [
      { title: "Add a new loan (marker 1)", description: "Click Add Loan. Select the employee, enter the loan amount, issue date, and the month repayments should start." },
      { title: "Set monthly installment (marker 2)", description: "Enter the monthly deduction amount. The system shows how many months until full repayment and a progress bar." },
      { title: "Track repayments (marker 3)", description: "The outstanding balance reduces automatically each month as payroll is processed. No manual entry needed.", tip: "Loan deductions appear clearly on the employee's payslip under Deductions." },
    ],
  },
  {
    id: "incentives",
    label: "Incentives",
    icon: Gift,
    color: "text-purple-600",
    bg: "bg-purple-50 border-purple-200",
    group: "HR Management",
    path: "/incentives",
    summary: "Record one-time or recurring incentive payments — bonuses, performance awards, or special allowances.",
    mockup: <IncentivesMockup />,
    steps: [
      { title: "Click Add Incentive (marker 1)", description: "Press the Add Incentive button to open the incentive form." },
      { title: "Select employee and type (markers 2–3)", description: "Choose the employee and the incentive type: Performance Bonus, Festival Bonus, Attendance Bonus, etc." },
      { title: "Enter amount and payroll month (marker 4)", description: "Enter the incentive amount and specify which month's payroll it should be included in." },
      { title: "Save", description: "Click Save. The incentive will appear as an addition in the employee's payslip for the selected month.", tip: "Incentives are clearly itemized on the payslip, separate from regular salary and allowances." },
    ],
  },
  {
    id: "branches",
    label: "Branches",
    icon: MapPinned,
    color: "text-lime-700",
    bg: "bg-lime-50 border-lime-200",
    group: "Organization",
    path: "/branches",
    summary: "Manage your organization's branch locations. Each branch can have its own employees and biometric devices.",
    mockup: <BranchesMockup />,
    steps: [
      { title: "View all branches (marker 1)", description: "Branch cards show the location name, address, employee count, and active status." },
      { title: "Add a new branch (marker 2)", description: "Click Add Branch. Enter the branch name, city/address, and any contact information." },
      { title: "Edit branch details (marker 3)", description: "Click on a branch card to update its information or assign a branch manager.", tip: "Set up branches before adding employees — employees and biometric devices are linked to specific branches." },
    ],
  },
  {
    id: "reports",
    label: "Reports",
    icon: BarChart3,
    color: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
    group: "Analytics",
    path: "/reports",
    summary: "Generate and export attendance, payroll, leave, and overtime reports for any period.",
    mockup: <ReportsMockup />,
    steps: [
      { title: "Select report type (marker 1)", description: "Click one of the report type cards: Attendance Summary, Late Report, Leave Report, Payroll Summary, OT Report, or Absent Report." },
      { title: "Set the date range (marker 2)", description: "Pick the start and end dates, or select a predefined month range for the report period." },
      { title: "Choose filters (marker 3)", description: "Optionally filter by branch or department to narrow the report scope." },
      { title: "Generate and export (marker 4)", description: "Click Generate Report to view results on screen. Use Export CSV or Export PDF to download.", tip: "Use the Payroll Summary report to cross-check salary totals before processing bank transfers." },
    ],
  },
  {
    id: "biometric",
    label: "Biometric",
    icon: Fingerprint,
    color: "text-red-600",
    bg: "bg-red-50 border-red-200",
    group: "System",
    path: "/biometric",
    summary: "Connect and manage ZKTeco fingerprint/face recognition devices. Sync punch logs to the system.",
    mockup: <BiometricMockup />,
    steps: [
      { title: "View registered devices (marker 1)", description: "All configured biometric machines are listed with their IP address, branch, connection method, and online/offline status." },
      { title: "Add a device (marker 2)", description: "Click Add Device. Enter the device name, IP address, port, branch, and connection method (ZK Push or SDK)." },
      { title: "Test connection (marker 3)", description: "Click Test Connection to verify the device is reachable on the network. A green confirmation indicates success." },
      { title: "Sync punch logs (marker 4)", description: "Click Sync Now to pull the latest punch records from the device into the system.", tip: "Biometric devices and the server must be on the same network or connected via VPN. ZK Push is recommended for cloud setups." },
    ],
    notes: ["ZK Push method: device pushes data to server — good for cloud hosting.", "SDK method: server connects to device — requires direct IP access."],
  },
  {
    id: "users",
    label: "User Management",
    icon: ShieldCheck,
    color: "text-indigo-700",
    bg: "bg-indigo-50 border-indigo-200",
    group: "System",
    path: "/users",
    summary: "Manage system user accounts and their access roles — Admin, HR Manager, Branch Manager, Viewer.",
    mockup: <UsersMockup />,
    steps: [
      { title: "View system users (marker 1)", description: "The user table shows all accounts: username, role badge, last login time, and active status toggle." },
      { title: "Add a user (marker 2)", description: "Click Add User. Enter a username, email, assign a role, and set a temporary password. The user must change it on first login." },
      { title: "Edit roles or reset password (markers 3–4)", description: "Click Edit on any user to change their role or trigger a password reset.", tip: "Assign the minimum necessary role. Only Admins can access User Management and System Settings." },
    ],
    notes: ["Admin = full access.", "HR Manager = attendance and payroll.", "Branch Manager = branch-level data only.", "Viewer = read-only access."],
  },
  {
    id: "activity-logs",
    label: "Activity Logs",
    icon: ListChecks,
    color: "text-gray-600",
    bg: "bg-gray-50 border-gray-200",
    group: "System",
    path: "/activity-logs",
    summary: "An audit trail of all system actions — who made what changes and when.",
    mockup: <ActivityLogsMockup />,
    steps: [
      { title: "Browse recent activity (marker 1)", description: "Logs are shown newest first. Each entry shows the user who acted, the action taken, affected module, and timestamp." },
      { title: "Filter by user or module (marker 2)", description: "Use the User and Module dropdowns to narrow down logs to a specific person or area of the system." },
      { title: "Search by keyword", description: "Type an employee name, action, or keyword in the search box to find specific entries.", tip: "Review activity logs regularly to detect any unauthorized changes to payroll or attendance records." },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    icon: Cog,
    color: "text-zinc-600",
    bg: "bg-zinc-50 border-zinc-200",
    group: "System",
    path: "/settings",
    summary: "Configure organization-level settings: company name, logo, and system preferences.",
    mockup: <SettingsMockup />,
    steps: [
      { title: "Update company information (marker 1)", description: "Enter your organization name, address, and contact details. These appear on all generated payslips and reports." },
      { title: "Upload company logo (marker 2)", description: "Click the logo box to upload your organization's logo. It will appear in the sidebar and on all documents." },
      { title: "Save changes (marker 4)", description: "Click Save Settings. Some changes (like logo) may require a page refresh to appear.", tip: "Upload a high-resolution logo (at least 200×200 px) to ensure it looks sharp on printed payslips." },
    ],
  },
];

const GROUPS = ["Getting Started", "Overview", "Attendance", "HR Management", "Organization", "Analytics", "System"];

const GROUP_COLORS: Record<string, string> = {
  "Getting Started": "bg-blue-100 text-blue-800",
  "Overview": "bg-emerald-100 text-emerald-800",
  "Attendance": "bg-sky-100 text-sky-800",
  "HR Management": "bg-violet-100 text-violet-800",
  "Organization": "bg-lime-100 text-lime-800",
  "Analytics": "bg-amber-100 text-amber-800",
  "System": "bg-red-100 text-red-800",
};

/* ─────────────────────────────── main component ─────────────────────────────── */
export default function Tutorial() {
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [openGroup, setOpenGroup] = useState<string | null>("Getting Started");
  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? MODULES.filter(
        m =>
          m.label.toLowerCase().includes(search.toLowerCase()) ||
          m.summary.toLowerCase().includes(search.toLowerCase()) ||
          m.group.toLowerCase().includes(search.toLowerCase())
      )
    : MODULES;

  const grouped = GROUPS.map(g => ({
    group: g,
    modules: filtered.filter(m => m.group === g),
  })).filter(g => g.modules.length > 0);

  return (
    <div className="flex h-full bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <PlayCircle className="w-5 h-5 text-emerald-600" />
            <h2 className="font-semibold text-gray-800 text-sm">User Guide</h2>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search modules..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {grouped.map(({ group, modules }) => (
            <div key={group} className="mb-1">
              <button
                onClick={() => setOpenGroup(openGroup === group ? null : group)}
                className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:bg-gray-50"
              >
                <span>{group}</span>
                {openGroup === group ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
              {openGroup === group && modules.map(mod => {
                const Icon = mod.icon;
                const active = selectedModule?.id === mod.id;
                return (
                  <button
                    key={mod.id}
                    onClick={() => setSelectedModule(mod)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                      active ? "bg-emerald-50 border-r-2 border-emerald-500 text-emerald-700" : "text-gray-700 hover:bg-gray-50"
                    )}
                  >
                    <Icon className={cn("w-4 h-4 shrink-0", active ? "text-emerald-600" : mod.color)} />
                    <span className="text-sm truncate">{mod.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div className="p-3 border-t border-gray-200 bg-emerald-50">
          <p className="text-xs text-emerald-700 font-medium">{MODULES.length} modules documented</p>
          <p className="text-xs text-gray-500 mt-0.5">Click any module to view its guide</p>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {!selectedModule ? (
          <WelcomeScreen onSelect={setSelectedModule} groups={grouped} />
        ) : (
          <ModuleGuide
            module={selectedModule}
            onBack={() => setSelectedModule(null)}
            allModules={MODULES}
            onSelect={setSelectedModule}
          />
        )}
      </main>
    </div>
  );
}

/* ─────────────────────────────── welcome screen ─────────────────────────────── */
function WelcomeScreen({
  onSelect,
  groups,
}: {
  onSelect: (m: Module) => void;
  groups: { group: string; modules: Module[] }[];
}) {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-100 mb-4">
          <PlayCircle className="w-8 h-8 text-emerald-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">How to Use the System</h1>
        <p className="text-gray-500 text-base max-w-2xl mx-auto">
          Step-by-step guides for every module, with annotated screen illustrations. Red numbered markers show exactly what to click.
        </p>
      </div>

      <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-2xl p-6 mb-8 text-white flex items-center gap-5">
        <div className="flex-1">
          <p className="text-sm font-semibold text-emerald-100 mb-1">New to the system?</p>
          <h2 className="text-xl font-bold mb-1">Start here — Login & Access</h2>
          <p className="text-sm text-emerald-100">Learn how to sign in and navigate the system for the first time.</p>
        </div>
        <button
          onClick={() => onSelect(MODULES[0])}
          className="shrink-0 bg-white text-emerald-700 font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-emerald-50 transition-colors"
        >
          Get Started →
        </button>
      </div>

      {groups.map(({ group, modules }) => (
        <div key={group} className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", GROUP_COLORS[group] || "bg-gray-100 text-gray-700")}>
              {group}
            </span>
            <span className="text-xs text-gray-400">{modules.length} module{modules.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {modules.map(mod => {
              const Icon = mod.icon;
              return (
                <button
                  key={mod.id}
                  onClick={() => onSelect(mod)}
                  className={cn("text-left p-4 rounded-xl border-2 hover:shadow-md transition-all group", mod.bg)}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className={cn("p-2 rounded-lg bg-white shadow-sm shrink-0", mod.color)}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-800 text-sm mb-1 group-hover:text-emerald-700 transition-colors">
                        {mod.label}
                      </h3>
                      <p className="text-xs text-gray-500 line-clamp-2">{mod.summary}</p>
                    </div>
                  </div>
                  {/* mini mockup preview */}
                  <div className="transform scale-[0.52] origin-top-left" style={{ height: "110px", overflow: "hidden" }}>
                    <div style={{ width: "192%", pointerEvents: "none" }}>
                      {mod.mockup}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-xs font-medium text-emerald-600">
                    <span>{mod.steps.length} steps</span>
                    <ChevronRight className="w-3 h-3" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────── module guide ─────────────────────────────── */
function ModuleGuide({
  module: mod,
  onBack,
  allModules,
  onSelect,
}: {
  module: Module;
  onBack: () => void;
  allModules: Module[];
  onSelect: (m: Module) => void;
}) {
  const Icon = mod.icon;
  const groupModules = allModules.filter(m => m.group === mod.group);
  const currentIdx = groupModules.findIndex(m => m.id === mod.id);
  const prev = currentIdx > 0 ? groupModules[currentIdx - 1] : null;
  const next = currentIdx < groupModules.length - 1 ? groupModules[currentIdx + 1] : null;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-6">
        <button onClick={onBack} className="hover:text-emerald-600 transition-colors">User Guide</button>
        <ChevronRight className="w-3 h-3" />
        <span className={cn("font-medium px-2 py-0.5 rounded-full", GROUP_COLORS[mod.group] || "bg-gray-100 text-gray-700")}>{mod.group}</span>
        <ChevronRight className="w-3 h-3" />
        <span className="text-gray-700 font-medium">{mod.label}</span>
      </div>

      {/* Module header */}
      <div className={cn("rounded-2xl border-2 p-6 mb-8", mod.bg)}>
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-white shadow-sm shrink-0">
            <Icon className={cn("w-7 h-7", mod.color)} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{mod.label}</h1>
            <p className="text-gray-600 text-sm leading-relaxed">{mod.summary}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="text-xs bg-white border border-gray-200 text-gray-600 px-2.5 py-1 rounded-full font-medium">
                Route: {mod.path}
              </span>
              <span className={cn("text-xs px-2.5 py-1 rounded-full font-medium", GROUP_COLORS[mod.group] || "bg-gray-100 text-gray-700")}>
                {mod.group}
              </span>
              <span className="text-xs bg-white border border-gray-200 text-gray-600 px-2.5 py-1 rounded-full font-medium">
                {mod.steps.length} steps
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Two-column layout: mockup + steps */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Annotated screen illustration */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Screen Reference</h2>
          <div className="relative">
            <div className="bg-gray-100 rounded-xl p-3">
              {mod.mockup}
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
              <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">1</span>
              <span>Red numbered markers show the UI elements referenced in each step.</span>
            </div>
          </div>
        </div>

        {/* Step-by-step guide */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Step-by-Step Guide</h2>
          <div className="space-y-0">
            {mod.steps.map((step, idx) => (
              <div key={idx} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-bold text-xs border-2",
                    idx === 0
                      ? "bg-emerald-600 border-emerald-600 text-white"
                      : idx === mod.steps.length - 1
                      ? "bg-gray-800 border-gray-800 text-white"
                      : "bg-white border-gray-300 text-gray-600"
                  )}>
                    {idx === mod.steps.length - 1 ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                  </div>
                  {idx < mod.steps.length - 1 && (
                    <div className="w-0.5 flex-1 bg-gray-200 my-1" style={{ minHeight: "16px" }} />
                  )}
                </div>
                <div className={cn("flex-1 pb-4", idx === mod.steps.length - 1 ? "pb-0" : "")}>
                  <div className="bg-white rounded-xl border border-gray-200 p-3.5 shadow-sm">
                    <h3 className="font-semibold text-gray-800 text-sm mb-1">{step.title}</h3>
                    <p className="text-xs text-gray-600 leading-relaxed">{step.description}</p>
                    {step.tip && (
                      <div className="mt-2.5 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                        <Star className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-700 leading-relaxed">{step.tip}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Notes */}
      {mod.notes && mod.notes.length > 0 && (
        <div className="mb-8 bg-blue-50 border border-blue-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-semibold text-blue-800">Important Notes</h3>
          </div>
          <ul className="space-y-2">
            {mod.notes.map((note, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-blue-700">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0 mt-1.5" />
                {note}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Prev / Next navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        {prev ? (
          <button
            onClick={() => onSelect(prev)}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-emerald-600 transition-colors"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            <span>{prev.label}</span>
          </button>
        ) : <div />}
        <button
          onClick={onBack}
          className="text-xs text-gray-500 hover:text-emerald-600 transition-colors px-3 py-1.5 border border-gray-200 rounded-lg"
        >
          ← All modules
        </button>
        {next ? (
          <button
            onClick={() => onSelect(next)}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-emerald-600 transition-colors"
          >
            <span>{next.label}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : <div />}
      </div>
    </div>
  );
}
