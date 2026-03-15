import { Users, UserCheck, UserMinus, Clock, CalendarIcon } from "lucide-react";
import { PageHeader, Card, Table, Th, Tr, Td, Badge } from "@/components/ui";
import { useDashboardSummary } from "@/hooks/use-attendance";

export default function Dashboard() {
  const { data, isLoading } = useDashboardSummary();

  if (isLoading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading dashboard...</div>;

  // Mock data if API fails to return valid format
  const summary = data || {
    totalEmployees: 1250,
    presentToday: 1100,
    absentToday: 45,
    lateToday: 80,
    onLeaveToday: 25,
    attendancePercentageToday: 88,
    recentAttendance: [
      { id: 1, employeeName: "John Doe", employeeCode: "EMP001", branchName: "Head Office", status: "present", inTime1: "08:05" },
      { id: 2, employeeName: "Sarah Smith", employeeCode: "EMP042", branchName: "North Regional", status: "late", inTime1: "09:15" },
    ],
    branchWiseSummary: [
      { branchId: 1, branchName: "Head Office", present: 200, absent: 5, total: 205 },
      { branchId: 2, branchName: "North Regional", present: 140, absent: 10, total: 150 },
    ]
  };

  const statCards = [
    { title: "Total Employees", value: summary.totalEmployees, icon: Users, color: "text-blue-500", bg: "bg-blue-50" },
    { title: "Present Today", value: summary.presentToday, icon: UserCheck, color: "text-green-500", bg: "bg-green-50" },
    { title: "Absent Today", value: summary.absentToday, icon: UserMinus, color: "text-red-500", bg: "bg-red-50" },
    { title: "Late Arrivals", value: summary.lateToday, icon: Clock, color: "text-amber-500", bg: "bg-amber-50" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Dashboard overview" 
        description="Daily attendance and workforce metrics across all branches." 
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <Card key={i} className="p-6 flex items-center gap-4 hover:-translate-y-1 transition-transform duration-300">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg} ${stat.color}`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-lg">Recent Punches</h3>
            <Badge variant="neutral" className="flex items-center gap-1">
              <Clock className="w-3 h-3" /> Live
            </Badge>
          </div>
          <div className="flex-1 overflow-auto">
            <Table>
              <thead>
                <Tr>
                  <Th>Employee</Th>
                  <Th>Branch</Th>
                  <Th>Status</Th>
                  <Th>Time In</Th>
                </Tr>
              </thead>
              <tbody>
                {summary.recentAttendance?.map((record: any) => (
                  <Tr key={record.id}>
                    <Td>
                      <div className="font-medium">{record.employeeName}</div>
                      <div className="text-xs text-muted-foreground">{record.employeeCode}</div>
                    </Td>
                    <Td>{record.branchName}</Td>
                    <Td>
                      <Badge variant={record.status === 'present' ? 'success' : record.status === 'late' ? 'warning' : 'danger'}>
                        {record.status?.toUpperCase() || 'UNKNOWN'}
                      </Badge>
                    </Td>
                    <Td className="font-mono text-xs">{record.inTime1 || '-'}</Td>
                  </Tr>
                ))}
                {!summary.recentAttendance?.length && (
                  <Tr><Td colSpan={4} className="text-center text-muted-foreground py-8">No recent activity</Td></Tr>
                )}
              </tbody>
            </Table>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-6">Branch Summary</h3>
          <div className="space-y-4">
            {summary.branchWiseSummary?.map((branch: any) => {
              const percent = Math.round((branch.present / branch.total) * 100);
              return (
                <div key={branch.branchId} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{branch.branchName}</span>
                    <span className="text-muted-foreground">{percent}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${percent}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{branch.present} Present</span>
                    <span>{branch.total} Total</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
