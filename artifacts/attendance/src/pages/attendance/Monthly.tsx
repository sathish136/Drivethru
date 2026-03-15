import { useState } from "react";
import { Download, Calendar as CalendarIcon } from "lucide-react";
import { PageHeader, Card, Button, Select } from "@/components/ui";
import { useMonthlySheet } from "@/hooks/use-attendance";
import { cn } from "@/lib/utils";

export default function MonthlySheet() {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const { data, isLoading } = useMonthlySheet({ month, year });

  const daysInMonth = new Date(year, month, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Mocking data for visual completeness
  const rows = data?.rows || [
    {
      employeeCode: "EMP001", employeeName: "Alice Walker", designation: "Manager",
      presentDays: 20, absentDays: 1, lateDays: 1, totalWorkHours: 160,
      dailyStatus: Array.from({length: daysInMonth}, (_, i) => ({ day: i+1, status: Math.random() > 0.1 ? 'P' : 'A' }))
    },
    {
      employeeCode: "EMP002", employeeName: "Bob Smith", designation: "Clerk",
      presentDays: 18, absentDays: 4, lateDays: 0, totalWorkHours: 144,
      dailyStatus: Array.from({length: daysInMonth}, (_, i) => ({ day: i+1, status: Math.random() > 0.2 ? 'P' : 'L' }))
    }
  ];

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'P': return 'bg-green-100 text-green-800 font-bold';
      case 'A': return 'bg-red-100 text-red-800 font-bold';
      case 'L': return 'bg-amber-100 text-amber-800 font-bold';
      case 'HD': return 'bg-yellow-100 text-yellow-800 font-bold';
      case 'LV': return 'bg-blue-100 text-blue-800 font-bold';
      case 'H': return 'bg-gray-200 text-gray-800 font-bold';
      default: return 'bg-transparent text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Monthly Attendance Sheet" 
        description="Excel-like grid view of monthly attendance records."
        action={
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" /> Export Excel
          </Button>
        }
      />

      <Card className="p-4 flex gap-4 bg-white/50">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-muted-foreground" />
          <Select value={month} onChange={e => setMonth(parseInt(e.target.value))} className="w-32">
            {Array.from({length: 12}, (_, i) => (
              <option key={i+1} value={i+1}>{new Date(2000, i, 1).toLocaleString('default', { month: 'long' })}</option>
            ))}
          </Select>
        </div>
        <Select value={year} onChange={e => setYear(parseInt(e.target.value))} className="w-24">
          {[2023, 2024, 2025].map(y => <option key={y} value={y}>{y}</option>)}
        </Select>
      </Card>

      <Card className="overflow-hidden">
        <div className="w-full overflow-x-auto custom-scrollbar">
          <table className="w-full text-xs text-left border-collapse min-w-max">
            <thead>
              <tr>
                <th className="px-4 py-3 bg-muted/50 font-semibold border-b border-r border-border sticky left-0 z-10 w-64 min-w-[250px] shadow-[1px_0_0_0_hsl(var(--border))]">Employee</th>
                {daysArray.map(day => (
                  <th key={day} className="px-2 py-3 bg-muted/50 font-semibold border-b border-border text-center min-w-[32px]">{day}</th>
                ))}
                <th className="px-3 py-3 bg-primary/10 text-primary font-bold border-b border-border text-center">P</th>
                <th className="px-3 py-3 bg-red-50 text-red-600 font-bold border-b border-border text-center">A</th>
                <th className="px-3 py-3 bg-amber-50 text-amber-600 font-bold border-b border-border text-center">L</th>
                <th className="px-4 py-3 bg-muted/50 font-bold border-b border-border text-center">Total Hrs</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row: any, idx: number) => (
                <tr key={idx} className="hover:bg-muted/20 border-b border-border/50">
                  <td className="px-4 py-2 bg-card border-r border-border sticky left-0 z-10 shadow-[1px_0_0_0_hsl(var(--border))]">
                    <div className="font-semibold text-foreground truncate">{row.employeeName}</div>
                    <div className="text-[10px] text-muted-foreground">{row.employeeCode} • {row.designation}</div>
                  </td>
                  {daysArray.map(day => {
                    const status = row.dailyStatus.find((d:any) => d.day === day)?.status || '-';
                    return (
                      <td key={day} className="px-1 py-1 text-center">
                        <div className={cn("w-7 h-7 flex items-center justify-center rounded text-[10px]", getStatusColor(status))}>
                          {status}
                        </div>
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-center font-bold text-green-600 bg-green-50/30">{row.presentDays}</td>
                  <td className="px-3 py-2 text-center font-bold text-red-600 bg-red-50/30">{row.absentDays}</td>
                  <td className="px-3 py-2 text-center font-bold text-amber-600 bg-amber-50/30">{row.lateDays}</td>
                  <td className="px-4 py-2 text-center font-mono font-medium">{row.totalWorkHours}h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      
      <div className="flex gap-4 text-xs text-muted-foreground bg-card p-4 rounded-xl border border-border">
        <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-green-100 border border-green-200 rounded"></div> P = Present</span>
        <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div> A = Absent</span>
        <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-amber-100 border border-amber-200 rounded"></div> L = Late</span>
        <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-yellow-100 border border-yellow-200 rounded"></div> HD = Half Day</span>
        <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-blue-100 border border-blue-200 rounded"></div> LV = Leave</span>
        <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-gray-200 border border-gray-300 rounded"></div> H = Holiday</span>
      </div>
    </div>
  );
}
