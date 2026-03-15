import { useState } from "react";
import { Download, Calendar as CalendarIcon, Clock, ToggleLeft, ToggleRight } from "lucide-react";
import { PageHeader, Card, Button, Select } from "@/components/ui";
import { useMonthlySheet } from "@/hooks/use-attendance";
import { cn } from "@/lib/utils";

export default function MonthlySheet() {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear]   = useState(new Date().getFullYear());
  const [showTimes, setShowTimes] = useState(true);
  const { data, isLoading } = useMonthlySheet({ month, year });

  const daysInMonth = new Date(year, month, 0).getDate();
  const daysArray   = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const rows: any[] = data?.rows || [];

  const STATUS_CFG: Record<string, { bg: string; text: string; label: string }> = {
    present:  { bg: "bg-green-100",  text: "text-green-800",  label: "P"  },
    late:     { bg: "bg-amber-100",  text: "text-amber-800",  label: "L"  },
    absent:   { bg: "bg-red-100",    text: "text-red-800",    label: "A"  },
    half_day: { bg: "bg-yellow-100", text: "text-yellow-800", label: "HD" },
    leave:    { bg: "bg-blue-100",   text: "text-blue-800",   label: "LV" },
    holiday:  { bg: "bg-gray-200",   text: "text-gray-700",   label: "H"  },
  };

  function fmtTime(t: string | null | undefined) {
    if (!t) return null;
    const [h, m] = t.split(":");
    const hr = parseInt(h);
    return `${hr > 12 ? hr - 12 : hr || 12}:${m}${hr >= 12 ? "pm" : "am"}`;
  }

  function fmtHrs(h: number | null | undefined) {
    if (h == null) return "—";
    const hrs = Math.floor(h);
    const mins = Math.round((h - hrs) * 60);
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  }

  const dayNames = ["Su","Mo","Tu","We","Th","Fr","Sa"];
  function getDayName(d: number) {
    return dayNames[new Date(year, month - 1, d).getDay()];
  }
  function isSunday(d: number) { return new Date(year, month - 1, d).getDay() === 0; }

  const yearOptions = [2023, 2024, 2025, 2026, 2027];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Monthly Attendance Sheet"
        description="Grid view with in/out times, work hours, and OT per employee."
        action={
          <Button variant="outline" className="gap-2 text-xs h-9">
            <Download className="w-4 h-4" /> Export
          </Button>
        }
      />

      <Card className="p-3 flex flex-wrap items-center gap-3 bg-white/50">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-muted-foreground" />
          <Select value={month} onChange={e => setMonth(parseInt(e.target.value))} className="w-32">
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>{new Date(2000, i, 1).toLocaleString("default", { month: "long" })}</option>
            ))}
          </Select>
        </div>
        <Select value={year} onChange={e => setYear(parseInt(e.target.value))} className="w-24">
          {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
        </Select>

        <div className="ml-auto flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Show times</span>
          <button
            onClick={() => setShowTimes(v => !v)}
            className={cn("relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
              showTimes ? "bg-primary" : "bg-muted-foreground/30")}
          >
            <span className={cn("inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform",
              showTimes ? "translate-x-4" : "translate-x-0.5")} />
          </button>
        </div>
      </Card>

      {isLoading ? (
        <Card className="p-12 text-center text-sm text-muted-foreground">Loading attendance data...</Card>
      ) : rows.length === 0 ? (
        <Card className="p-12 text-center text-sm text-muted-foreground">No attendance records found for this period.</Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="w-full overflow-x-auto">
            <table className="text-xs border-collapse min-w-max">
              <thead>
                <tr>
                  <th className="px-4 py-2.5 bg-muted/60 font-semibold border-b border-r border-border sticky left-0 z-20 min-w-[220px] text-left shadow-[1px_0_0_0_hsl(var(--border))]">
                    Employee
                  </th>
                  {daysArray.map(day => (
                    <th key={day} className={cn(
                      "px-1 py-1 bg-muted/60 font-semibold border-b border-border text-center",
                      showTimes ? "min-w-[72px]" : "min-w-[34px]",
                      isSunday(day) && "bg-red-50/80 text-red-600"
                    )}>
                      <div className="font-bold leading-tight">{day}</div>
                      <div className={cn("text-[9px] font-normal leading-tight", isSunday(day) ? "text-red-400" : "text-muted-foreground")}>
                        {getDayName(day)}
                      </div>
                    </th>
                  ))}
                  <th className="px-2 py-2.5 bg-green-50 text-green-700 font-bold border-b border-border text-center min-w-[36px]">P</th>
                  <th className="px-2 py-2.5 bg-red-50 text-red-600 font-bold border-b border-border text-center min-w-[36px]">A</th>
                  <th className="px-2 py-2.5 bg-amber-50 text-amber-600 font-bold border-b border-border text-center min-w-[36px]">L</th>
                  <th className="px-3 py-2.5 bg-blue-50 text-blue-700 font-bold border-b border-border text-center min-w-[60px]">Total Hrs</th>
                  <th className="px-3 py-2.5 bg-orange-50 text-orange-700 font-bold border-b border-border text-center min-w-[56px]">OT Hrs</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row: any, idx: number) => (
                  <tr key={idx} className="hover:bg-muted/20 border-b border-border/50 group">
                    <td className="px-3 py-2 bg-card border-r border-border sticky left-0 z-10 shadow-[1px_0_0_0_hsl(var(--border))] group-hover:bg-muted/10">
                      <div className="font-semibold text-foreground truncate max-w-[200px]">{row.employeeName}</div>
                      <div className="text-[10px] text-muted-foreground">{row.employeeCode} · {row.designation}</div>
                    </td>
                    {daysArray.map(day => {
                      const entry = row.dailyStatus?.find((d: any) => d.day === day);
                      const st    = entry?.status || "absent";
                      const cfg   = STATUS_CFG[st] || STATUS_CFG.absent;
                      const inT   = fmtTime(entry?.inTime);
                      const outT  = fmtTime(entry?.outTime);
                      const hrs   = entry?.hours;

                      return (
                        <td key={day} className={cn(
                          "px-0.5 py-0.5 text-center align-middle",
                          isSunday(day) && "bg-red-50/30"
                        )}>
                          {showTimes ? (
                            <div className={cn("rounded px-0.5 py-0.5 flex flex-col items-center gap-0", cfg.bg)}>
                              <span className={cn("text-[10px] font-bold leading-tight", cfg.text)}>{cfg.label}</span>
                              {inT && (
                                <span className="text-[8px] leading-tight text-gray-600 font-mono">{inT}</span>
                              )}
                              {outT && (
                                <span className="text-[8px] leading-tight text-gray-500 font-mono">{outT}</span>
                              )}
                              {hrs != null && (
                                <span className="text-[8px] leading-tight font-semibold text-gray-700">{fmtHrs(hrs)}</span>
                              )}
                            </div>
                          ) : (
                            <div className={cn("w-7 h-7 mx-auto flex items-center justify-center rounded text-[10px] font-bold", cfg.bg, cfg.text)}>
                              {cfg.label}
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-2 py-2 text-center font-bold text-green-700 bg-green-50/40">{row.presentDays ?? 0}</td>
                    <td className="px-2 py-2 text-center font-bold text-red-600 bg-red-50/40">{row.absentDays ?? 0}</td>
                    <td className="px-2 py-2 text-center font-bold text-amber-600 bg-amber-50/40">{row.lateDays ?? 0}</td>
                    <td className="px-3 py-2 text-center font-mono font-semibold text-blue-700 bg-blue-50/30">{fmtHrs(row.totalWorkHours)}</td>
                    <td className={cn(
                      "px-3 py-2 text-center font-mono font-semibold bg-orange-50/30",
                      row.overtimeHours > 0 ? "text-orange-600" : "text-muted-foreground"
                    )}>
                      {row.overtimeHours > 0 ? fmtHrs(row.overtimeHours) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground bg-card p-3 rounded-xl border border-border">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-green-100 border border-green-200 rounded inline-block" /> P = Present</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-red-100 border border-red-200 rounded inline-block" /> A = Absent</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-amber-100 border border-amber-200 rounded inline-block" /> L = Late</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-yellow-100 border border-yellow-200 rounded inline-block" /> HD = Half Day</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-blue-100 border border-blue-200 rounded inline-block" /> LV = Leave</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-gray-200 border border-gray-300 rounded inline-block" /> H = Holiday</span>
        <span className="ml-auto text-muted-foreground/70">Toggle "Show times" above to switch between compact and detailed view</span>
      </div>
    </div>
  );
}
