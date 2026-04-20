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
  CheckCircle2,
  AlertCircle,
  Info,
  Search,
  LogIn,
  Star,
  PlayCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
};

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
    steps: [
      { title: "Open the application", description: "Navigate to the application URL in your browser. You will see the Drivethru login screen." },
      { title: "Enter your username", description: "Type the username assigned to you by your system administrator in the USERNAME field." },
      { title: "Enter your password", description: "Enter your password in the PASSWORD field. Click the eye icon to toggle visibility." },
      { title: "Click Sign In", description: "Press the Sign In button or hit Enter. You will be redirected to the Dashboard upon success.", tip: "If you forget your password, contact your system administrator to reset it." },
    ],
    notes: ["Default admin credentials are set during initial system setup.", "Sessions are stored securely in your browser."],
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
    steps: [
      { title: "View workforce summary", description: "The top stat cards show Total Employees, Present Today, Absent Today, and Late Arrivals at a glance." },
      { title: "Check monthly attendance rate", description: "The monthly attendance percentage is shown as a large indicator, color-coded green/amber/red." },
      { title: "Monitor branch status", description: "Scroll down to see branch-wise attendance cards. Each branch shows its own present/absent count and a colored status badge." },
      { title: "Check biometric device health", description: "Device status tiles show whether ZKTeco biometric machines are Online or Offline for each branch.", tip: "Red device tiles mean the biometric device is not syncing — contact IT support." },
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
    steps: [
      { title: "Open Today's Attendance", description: "Click Attendance → Today's Attendance from the left sidebar." },
      { title: "Filter by branch or department", description: "Use the Branch dropdown at the top to narrow records to a specific office location." },
      { title: "Read the status column", description: "Each row shows the employee's Check-In time, Check-Out time, late minutes (if any), and a colored status badge." },
      { title: "Search for an employee", description: "Use the search box to find a specific employee by name or ID.", tip: "Grayed-out rows indicate the employee has not yet checked in today." },
    ],
    notes: ["Punch data is pulled automatically from ZKTeco devices every few minutes.", "Manual adjustments can be made through the Approvals module."],
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
    steps: [
      { title: "Select month and year", description: "Use the month/year pickers at the top of the page to choose the period you want to review." },
      { title: "Choose a branch", description: "Filter by branch to see only employees assigned to that location." },
      { title: "Read the grid", description: "Each column is a date. Cells are color-coded: Green = Present, Red = Absent, Yellow = Late, Blue = Leave, Gray = Holiday/Weekend." },
      { title: "Hover for details", description: "Hover over any cell to see exact punch-in and punch-out times for that day.", tip: "Click on a cell to open a detail panel showing all punches recorded for that employee on that day." },
      { title: "Export data", description: "Use the Export button to download the monthly sheet as a CSV or Excel file for payroll processing." },
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
    steps: [
      { title: "View pending requests", description: "The Approvals page lists all pending correction requests submitted by employees or HR." },
      { title: "Review the request", description: "Each row shows the employee name, date, original punch data, and the requested correction." },
      { title: "Approve or Reject", description: "Click the green Approve button to accept the correction, or the red Reject button to deny it. Add a comment if needed.", tip: "Approved corrections update the attendance record immediately and affect payroll calculations." },
      { title: "Add a manual entry", description: "Use the Add Manual Entry button to insert a punch record for an employee who missed the biometric scan." },
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
    steps: [
      { title: "Click Add Leave", description: "Press the Add Leave or New Leave Entry button at the top right." },
      { title: "Select employee", description: "Search and select the employee who is taking leave from the dropdown." },
      { title: "Choose leave type", description: "Select the leave type (Annual, Sick, Casual, No Pay, etc.) from the dropdown." },
      { title: "Set dates", description: "Pick the start and end dates for the leave period. Half-day options may be available." },
      { title: "Save the entry", description: "Click Save or Submit. The employee's attendance for those days will be marked as Leave.", tip: "Leave entries automatically deduct from the employee's leave balance tracked in Leave Balances." },
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
    steps: [
      { title: "View all employees", description: "The employee list shows all active staff with their ID, name, department, designation, branch, and join date." },
      { title: "Add a new employee", description: "Click the Add Employee button. Fill in the form with personal details, designation, department, branch, shift, and EPF/ETF numbers." },
      { title: "Edit an employee", description: "Click on any employee row or the edit (pencil) icon to open their profile and make changes." },
      { title: "Deactivate an employee", description: "Use the status toggle or the deactivate option to mark resigned/terminated staff as inactive.", tip: "Inactive employees will not appear in attendance tracking but their historical records are preserved." },
      { title: "Filter and search", description: "Use the search bar and filter dropdowns to find employees by branch, department, or designation." },
    ],
    notes: ["Employee EPF numbers are required for payroll processing.", "Each employee must be assigned a shift for attendance rules to apply correctly."],
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
    steps: [
      { title: "Select payroll month", description: "Choose the month and year for payroll processing using the date pickers at the top." },
      { title: "Calculate payroll", description: "Click the Calculate / Run Payroll button. The system reads attendance, overtime, leaves, loans, and incentives automatically." },
      { title: "Review individual records", description: "Each employee row shows Basic Salary, Allowances, Overtime Pay, Deductions, EPF, ETF, and Net Salary." },
      { title: "Edit overrides", description: "Click on an employee to manually override any computed value if needed before finalizing.", tip: "Always double-check overtime hours and no-pay deductions before finalizing payroll." },
      { title: "Generate payslips", description: "Click Generate Payslips to create individual payslip PDFs. Each payslip includes an Office Copy and System Generated copy." },
      { title: "Finalize payroll", description: "Once reviewed, click Finalize to lock the payroll for the month. Finalized payroll cannot be edited." },
    ],
    notes: ["EPF: Employee 8%, Employer 12%. ETF: Employer 3%.", "APIT (income tax) is auto-calculated based on salary bands."],
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
    steps: [
      { title: "Set up allowance types", description: "Define Transport Allowance, Housing Allowance, Meal Allowance, and any other recurring additions to salary." },
      { title: "Configure deduction rules", description: "Set up deduction categories such as late deductions per minute, no-pay per day rates, and loan recovery schedules." },
      { title: "Verify EPF/ETF rates", description: "Confirm that Employee EPF (8%), Employer EPF (12%), and ETF (3%) rates match current Sri Lanka labour regulations." },
      { title: "Save and apply", description: "Click Save Settings. Changes take effect from the next payroll cycle.", tip: "Consult your HR manager before changing statutory rates to ensure compliance." },
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
    steps: [
      { title: "Set the global grace period", description: "Define how many minutes after shift start an employee can clock in without being marked Late (e.g., 15 minutes)." },
      { title: "Configure late deduction rules", description: "Set whether late arrivals result in deductions and define the deduction formula (per minute, flat rate, etc.)." },
      { title: "Set up overtime rules", description: "Specify at what point OT begins — e.g., after 9.5 hours worked, or after a specific clock-out time." },
      { title: "Configure lunch return rules", description: "Enable Lunch Return Late detection — set the allowed lunch break duration and deduction for exceeding it." },
      { title: "Apply per-department rules", description: "Override global rules for specific departments using the department-level settings panel.", tip: "Changes to HR Settings apply from the next attendance day forward; existing records are not retroactively modified." },
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
    steps: [
      { title: "View existing shifts", description: "The shifts list shows all configured shifts with their start time, end time, and total working hours." },
      { title: "Create a new shift", description: "Click Add Shift. Enter the shift name (e.g., 'Morning Shift'), start time, end time, and lunch break duration." },
      { title: "Assign shift type", description: "Choose between Fixed shift (same time every day) or Flexible shift (window-based start time)." },
      { title: "Assign to employees", description: "Go to the Employees module and set each employee's assigned shift from their profile.", tip: "Employees must have a shift assigned for attendance rules and overtime calculations to work correctly." },
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
    summary: "Manage the public holiday calendar. Days marked as holidays are excluded from attendance and payroll calculations.",
    steps: [
      { title: "View the holiday list", description: "The page shows all configured public holidays for the year with their dates and names." },
      { title: "Add a holiday", description: "Click Add Holiday. Enter the holiday name and date. You can add national holidays, poya days, and company-specific days off." },
      { title: "Edit or delete", description: "Click the edit icon to rename a holiday or change its date. Click delete to remove it from the calendar.", tip: "Holidays are applied globally — they affect all branches unless branch-specific overrides are configured." },
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
    steps: [
      { title: "Select your week-off pattern", description: "Choose the default days off for your organization — typically Saturday and Sunday, or Sunday only." },
      { title: "Set branch-specific overrides", description: "If different branches have different week-off schedules, configure them per branch." },
      { title: "Save changes", description: "Click Save. Week-off days will be excluded from attendance calculations and payroll.", tip: "Employees who work on week-off days may be eligible for overtime or compensatory off based on HR Settings." },
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
    steps: [
      { title: "View leave balances", description: "The page shows each employee's total entitled leave days, used days, and remaining balance for each leave type." },
      { title: "Adjust balances", description: "Click the edit icon next to an employee to manually adjust their leave balance (e.g., for carry-forward leaves)." },
      { title: "Filter by employee or branch", description: "Use the search and filter options to find specific employees.", tip: "Leave balances are automatically deducted when leave entries are saved in the Leave Entry module." },
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
    steps: [
      { title: "Add a new loan/advance", description: "Click Add Loan. Select the employee, enter the loan amount, issue date, and repayment start month." },
      { title: "Set repayment schedule", description: "Enter the monthly installment amount. The system will show the number of months to full repayment." },
      { title: "Track repayments", description: "The loan record shows the outstanding balance as monthly deductions are processed during payroll.", tip: "Loans are automatically deducted during payroll calculation — no manual entry needed each month." },
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
    summary: "Record one-time or recurring incentive payments for employees — bonuses, performance awards, or special allowances.",
    steps: [
      { title: "Add an incentive", description: "Click Add Incentive. Select the employee, choose the type (Performance Bonus, Festival Bonus, etc.), and enter the amount." },
      { title: "Set the payroll month", description: "Specify which payroll month this incentive should be included in." },
      { title: "Save", description: "Click Save. The incentive will appear as an addition in the employee's payslip for that month.", tip: "Incentives are separate from regular salary and are clearly itemized on the payslip." },
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
    summary: "Manage your organization's branch locations. Each branch can have its own employees, biometric devices, and shift schedules.",
    steps: [
      { title: "View all branches", description: "The branch list shows all registered locations with their name, address, and employee count." },
      { title: "Add a new branch", description: "Click Add Branch. Enter the branch name, address, and any contact information." },
      { title: "Edit branch details", description: "Click on a branch to update its information or assign a branch manager.", tip: "Employees and biometric devices are linked to branches — ensure branches are set up before adding employees." },
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
    steps: [
      { title: "Select report type", description: "Choose from Attendance Summary, Late Report, Leave Report, Payroll Summary, OT Report, or Absent Report." },
      { title: "Set the date range", description: "Pick the start and end dates (or select a month) for the report period." },
      { title: "Choose branch/department filters", description: "Optionally filter the report to a specific branch or department." },
      { title: "Generate and export", description: "Click Generate Report to view on screen. Click Export to download as CSV or PDF.", tip: "Use the Payroll Summary report to cross-check totals before processing bank transfers." },
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
    steps: [
      { title: "View registered devices", description: "All configured biometric machines are listed with their IP address, branch, and online/offline status." },
      { title: "Add a device", description: "Click Add Device. Enter the device name, IP address, port number, branch, and connection method (ZK Push or SDK)." },
      { title: "Test connection", description: "Click Test Connection to verify the device is reachable on the network." },
      { title: "Sync punch logs", description: "Click Sync Now to pull the latest punch records from the device into the system.", tip: "Ensure biometric devices and the server are on the same network or connected via VPN for sync to work." },
    ],
    notes: ["ZK Push method is recommended for cloud-hosted setups.", "SDK method requires direct IP connectivity to the device."],
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
    steps: [
      { title: "View system users", description: "The user list shows all accounts with their username, role, and last login time." },
      { title: "Add a user", description: "Click Add User. Enter a username, email, assign a role, and set a temporary password." },
      { title: "Edit roles", description: "Click on a user to change their role or reset their password.", tip: "Assign the minimum necessary role. Only Admins can access User Management and System Settings." },
      { title: "Deactivate a user", description: "Toggle the status switch to disable an account without deleting it." },
    ],
    notes: ["Role permissions: Admin = full access. HR Manager = attendance and payroll. Branch Manager = branch-level data. Viewer = read-only."],
  },
  {
    id: "activity-logs",
    label: "Activity Logs",
    icon: ListChecks,
    color: "text-gray-600",
    bg: "bg-gray-50 border-gray-200",
    group: "System",
    path: "/activity-logs",
    summary: "An audit trail of all system actions — who made what changes, and when.",
    steps: [
      { title: "Browse recent activity", description: "Logs are displayed in reverse chronological order showing user, action type, affected record, and timestamp." },
      { title: "Filter by user or module", description: "Use the filters to narrow down logs to a specific user or module (e.g., only payroll changes)." },
      { title: "Search by keyword", description: "Type in the search box to find entries related to a specific employee name or action.", tip: "Review activity logs regularly to detect unauthorized changes to payroll or attendance records." },
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
    summary: "Configure organization-level settings: company name, logo, and other system preferences.",
    steps: [
      { title: "Update company information", description: "Enter your organization name, address, and contact details. These appear on payslips and reports." },
      { title: "Upload company logo", description: "Click the logo area to upload your organization's logo. It will appear in the sidebar and on all generated documents." },
      { title: "Set system preferences", description: "Configure the default language, date format, currency, and other display preferences." },
      { title: "Save changes", description: "Click Save Settings. Some changes may require a page refresh to take effect.", tip: "Uploading a high-resolution logo (at least 200×200 px) ensures it looks sharp on payslips." },
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
      {/* Sidebar module list */}
      <aside className="w-72 shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
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
                {openGroup === group ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </button>
              {openGroup === group && (
                <div>
                  {modules.map(mod => {
                    const Icon = mod.icon;
                    const active = selectedModule?.id === mod.id;
                    return (
                      <button
                        key={mod.id}
                        onClick={() => setSelectedModule(mod)}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                          active
                            ? "bg-emerald-50 border-r-2 border-emerald-500 text-emerald-700"
                            : "text-gray-700 hover:bg-gray-50"
                        )}
                      >
                        <Icon className={cn("w-4 h-4 shrink-0", active ? "text-emerald-600" : mod.color)} />
                        <span className="text-sm truncate">{mod.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-gray-200 bg-emerald-50">
          <p className="text-xs text-emerald-700 font-medium">{MODULES.length} modules documented</p>
          <p className="text-xs text-gray-500 mt-0.5">Click any module to view its guide</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {!selectedModule ? (
          <WelcomeScreen onSelect={setSelectedModule} groups={grouped} />
        ) : (
          <ModuleGuide module={selectedModule} onBack={() => setSelectedModule(null)} />
        )}
      </main>
    </div>
  );
}

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
          Welcome to the Drivethru Attendance Management user guide. Select any module below to see step-by-step instructions, tips, and important notes.
        </p>
      </div>

      {/* Quick start banner */}
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

      {/* Module groups */}
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
                  className={cn(
                    "text-left p-4 rounded-xl border-2 hover:shadow-md transition-all group",
                    mod.bg
                  )}
                >
                  <div className="flex items-start gap-3">
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
                  <div className="mt-3 flex items-center gap-1 text-xs font-medium text-emerald-600">
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

function ModuleGuide({ module: mod, onBack }: { module: Module; onBack: () => void }) {
  const Icon = mod.icon;
  const groupIdx = GROUPS.indexOf(mod.group);
  const groupModules = MODULES.filter(m => m.group === mod.group);
  const currentIdx = groupModules.findIndex(m => m.id === mod.id);
  const prev = currentIdx > 0 ? groupModules[currentIdx - 1] : null;
  const next = currentIdx < groupModules.length - 1 ? groupModules[currentIdx + 1] : null;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-6">
        <button onClick={onBack} className="hover:text-emerald-600 transition-colors">
          User Guide
        </button>
        <ChevronRight className="w-3 h-3" />
        <span className={cn("font-medium px-2 py-0.5 rounded-full", GROUP_COLORS[mod.group] || "bg-gray-100 text-gray-700")}>
          {mod.group}
        </span>
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

      {/* Visual flow diagram */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Step-by-Step Guide</h2>
        <div className="space-y-0">
          {mod.steps.map((step, idx) => (
            <div key={idx} className="flex gap-4">
              {/* Timeline connector */}
              <div className="flex flex-col items-center">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-sm border-2",
                  idx === 0
                    ? "bg-emerald-600 border-emerald-600 text-white"
                    : idx === mod.steps.length - 1
                    ? "bg-gray-800 border-gray-800 text-white"
                    : "bg-white border-gray-300 text-gray-600"
                )}>
                  {idx === mod.steps.length - 1 ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                </div>
                {idx < mod.steps.length - 1 && (
                  <div className="w-0.5 flex-1 bg-gray-200 my-1" style={{ minHeight: "24px" }} />
                )}
              </div>

              {/* Step content */}
              <div className={cn("flex-1 pb-6", idx === mod.steps.length - 1 ? "pb-2" : "")}>
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                  <h3 className="font-semibold text-gray-800 text-sm mb-1.5">{step.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{step.description}</p>
                  {step.tip && (
                    <div className="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <Star className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-700 leading-relaxed">{step.tip}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notes / important info */}
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

      {/* Navigation between modules */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        {prev ? (
          <button
            onClick={() => {
              const el = document.querySelector("[data-module-id='" + prev.id + "']");
              if (el) (el as HTMLButtonElement).click();
            }}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-emerald-600 transition-colors"
          >
          </button>
        ) : (
          <div />
        )}
        <button
          onClick={onBack}
          className="text-xs text-gray-500 hover:text-emerald-600 transition-colors px-3 py-1.5 border border-gray-200 rounded-lg"
        >
          ← Back to all modules
        </button>
        {next ? (
          <button
            onClick={() => {}}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-emerald-600 transition-colors"
          >
          </button>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}
