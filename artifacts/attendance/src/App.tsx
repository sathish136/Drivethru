import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";

import { AppLayout } from "@/components/Layout";
import Login from "@/pages/auth/Login";
import Dashboard from "@/pages/Dashboard";
import TodayAttendance from "@/pages/attendance/Today";
import MonthlySheet from "@/pages/attendance/Monthly";
import EmployeeList from "@/pages/employees/Employees";
import Branches from "@/pages/branches/Branches";
import Shifts from "@/pages/shifts/Shifts";
import Reports from "@/pages/reports/Reports";
import Biometric from "@/pages/biometric/Biometric";
import Settings from "@/pages/settings/Settings";
import Users from "@/pages/users/Users";
import Payroll from "@/pages/payroll/Payroll";
import PayslipPage from "@/pages/payroll/PayslipPage";
import PayrollSettings from "@/pages/payroll-settings/PayrollSettings";
import ActivityLogs from "@/pages/activity-logs/ActivityLogs";
import HRSettings from "@/pages/hr-settings/HRSettings";
import Holidays from "@/pages/holidays/Holidays";
import Approvals from "@/pages/attendance/Approvals";
import LeaveBalances from "@/pages/leave/LeaveBalances";
import LeaveEntry from "@/pages/leave/LeaveEntry";
import Loans from "@/pages/loans/Loans";
import Incentives from "@/pages/incentives/Incentives";
import WeekOffs from "@/pages/weekoffs/WeekOffs";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false },
  },
});

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  return (
    <AppLayout>
      <Component />
    </AppLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/"><ProtectedRoute component={Dashboard} /></Route>
      <Route path="/attendance/today"><ProtectedRoute component={TodayAttendance} /></Route>
      <Route path="/attendance/monthly"><ProtectedRoute component={MonthlySheet} /></Route>
      <Route path="/attendance/approvals"><ProtectedRoute component={Approvals} /></Route>
      <Route path="/attendance/leave-entry"><ProtectedRoute component={LeaveEntry} /></Route>
      <Route path="/leave-balances"><ProtectedRoute component={LeaveBalances} /></Route>
      <Route path="/employees"><ProtectedRoute component={EmployeeList} /></Route>
      <Route path="/branches"><ProtectedRoute component={Branches} /></Route>
      <Route path="/shifts"><ProtectedRoute component={Shifts} /></Route>
      <Route path="/reports"><ProtectedRoute component={Reports} /></Route>
      <Route path="/payroll/payslip/:id" component={PayslipPage} />
      <Route path="/payroll"><ProtectedRoute component={Payroll} /></Route>
      <Route path="/payroll-settings"><ProtectedRoute component={PayrollSettings} /></Route>
      <Route path="/biometric"><ProtectedRoute component={Biometric} /></Route>
      <Route path="/settings"><ProtectedRoute component={Settings} /></Route>
      <Route path="/users"><ProtectedRoute component={Users} /></Route>
      <Route path="/hr-settings"><ProtectedRoute component={HRSettings} /></Route>
      <Route path="/holidays"><ProtectedRoute component={Holidays} /></Route>
      <Route path="/activity-logs"><ProtectedRoute component={ActivityLogs} /></Route>
      <Route path="/loans"><ProtectedRoute component={Loans} /></Route>
      <Route path="/incentives"><ProtectedRoute component={Incentives} /></Route>
      <Route path="/weekoffs"><ProtectedRoute component={WeekOffs} /></Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
