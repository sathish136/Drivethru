import { useState } from "react";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { PageHeader, Card, Select } from "@/components/ui";
import { useMonthlySheet } from "@/hooks/use-attendance";
import { cn } from "@/lib/utils";
import drivethruLogo from "@/assets/drivethru-logo.png";
import liveuLogo from "@/assets/liveu-logo.png";

/* ─── Mini PDF icon button ─── */
function PdfIconButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} title="Export PDF"
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#E02B20] text-white hover:bg-[#C4241A] active:scale-95 transition-all shadow-sm">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="16" height="16" rx="2.5" fill="#E02B20"/>
        <path d="M2 3.5C2 2.67 2.67 2 3.5 2H9.5L14 6.5V12.5C14 13.33 13.33 14 12.5 14H3.5C2.67 14 2 13.33 2 12.5V3.5Z" fill="white" fillOpacity="0.15"/>
        <path d="M9.5 2V6H14" stroke="white" strokeOpacity="0.4" strokeWidth="0.8" fill="none"/>
        <text x="3" y="12" fontSize="5" fontWeight="800" fill="white" fontFamily="Arial,sans-serif" letterSpacing="0.3">PDF</text>
      </svg>
      Export PDF
    </button>
  );
}

/* ─── Mini Excel icon button ─── */
function ExcelIconButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} title="Export Excel"
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1D6F42] text-white hover:bg-[#185C37] active:scale-95 transition-all shadow-sm">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="16" height="16" rx="2.5" fill="#1D6F42"/>
        <path d="M2 3H9V13H2V3Z" fill="#21A366" fillOpacity="0.5"/>
        <path d="M9 2H13.5C13.78 2 14 2.22 14 2.5V13.5C14 13.78 13.78 14 13.5 14H9V2Z" fill="white" fillOpacity="0.12"/>
        <line x1="9" y1="2" x2="9" y2="14" stroke="white" strokeOpacity="0.3" strokeWidth="0.8"/>
        <text x="2.5" y="11" fontSize="7.5" fontWeight="900" fill="white" fontFamily="Arial,sans-serif">X</text>
        <line x1="9.5" y1="5.5" x2="13.5" y2="5.5" stroke="white" strokeOpacity="0.35" strokeWidth="0.7"/>
        <line x1="9.5" y1="8" x2="13.5" y2="8" stroke="white" strokeOpacity="0.35" strokeWidth="0.7"/>
        <line x1="9.5" y1="10.5" x2="13.5" y2="10.5" stroke="white" strokeOpacity="0.35" strokeWidth="0.7"/>
      </svg>
      Export Excel
    </button>
  );
}

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
    late:     { bg: "bg-green-100",  text: "text-amber-700",  label: "P(L)" },
    absent:   { bg: "bg-red-100",    text: "text-red-800",    label: "A"  },
    half_day: { bg: "bg-yellow-100", text: "text-yellow-800", label: "H"  },
    leave:    { bg: "bg-blue-100",   text: "text-blue-800",   label: "LV" },
    holiday:  { bg: "bg-gray-200",   text: "text-gray-700",   label: "HL" },
    sunday:   { bg: "bg-slate-100",  text: "text-slate-400",  label: "DO" },
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
  const monthName = new Date(year, month - 1, 1).toLocaleString("default", { month: "long" });

  const handleExportPdf = () => {
    const colors: Record<string,string> = { present:"#dcfce7", late:"#fef3c7", absent:"#fee2e2", half_day:"#fef9c3", leave:"#dbeafe", holiday:"#f3f4f6", sunday:"#f1f5f9" };
    const textColors: Record<string,string> = { present:"#15803d", late:"#b45309", absent:"#dc2626", half_day:"#a16207", leave:"#1d4ed8", holiday:"#6b7280", sunday:"#94a3b8" };
    const labels: Record<string,string> = { present:"P", late:"P(L)", absent:"A", half_day:"H", leave:"LV", holiday:"HL", sunday:"DO" };

    const dayHeader = daysArray.map(d => {
      const isSun = new Date(year, month - 1, d).getDay() === 0;
      return `<th class="day-th${isSun?" sun-col":""}">${d}<br/><span class="day-name">${getDayName(d)}</span></th>`;
    }).join("");

    const bodyRows = rows.map((row: any, idx: number) => {
      const cells = daysArray.map(day => {
        const e = row.dailyStatus?.find((d: any) => d.day === day);
        const st = e?.status || "absent";
        const isSun = new Date(year, month - 1, day).getDay() === 0;
        const eff = (st === "absent" && isSun) ? "sunday" : st;
        const bg = colors[eff] || "#f3f4f6";
        const tc = textColors[eff] || "#6b7280";
        const lbl = labels[eff] || "A";
        const isSunCol = new Date(year, month - 1, day).getDay() === 0;
        return `<td class="day-cell${isSunCol?" sun-col":""}"><div style="background:${bg};color:${tc};border-radius:3px;padding:2px 1px;font-size:7.5px;font-weight:700;line-height:1.2;text-align:center">${lbl}</div></td>`;
      }).join("");
      const evenRow = idx % 2 === 1 ? "background:#f8fbff;" : "";
      return `<tr style="${evenRow}">
        <td class="emp-cell">${row.employeeName}<br/><span class="emp-code">${row.employeeCode} · ${row.designation||""}</span></td>
        ${cells}
        <td class="sum-cell" style="color:#15803d">${row.presentDays??0}</td>
        <td class="sum-cell" style="color:#dc2626">${row.absentDays??0}</td>
        <td class="sum-cell" style="color:#b45309">${row.lateDays??0}</td>
        <td class="sum-cell" style="color:#a16207">${row.halfDays??0}</td>
        <td class="sum-cell" style="color:#1d4ed8;font-family:monospace">${fmtHrs(row.totalWorkHours)}</td>
        <td class="sum-cell" style="color:#ea580c;font-family:monospace">${row.overtimeHours>0?fmtHrs(row.overtimeHours):"—"}</td>
      </tr>`;
    }).join("");

    const w = window.open("", "_blank", "width=1600,height=900");
    if (!w) { alert("Please allow popups to export PDF."); return; }
    w.document.write(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<title>Monthly Attendance Sheet – ${monthName} ${year}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;background:#fff;font-size:9px}
  .page-header{display:flex;align-items:center;justify-content:space-between;padding:12px 20px 10px;border-bottom:3px solid #1565a8;background:#f5f8ff}
  .header-left{display:flex;align-items:center;gap:10px}
  .header-logo{width:40px;height:40px;object-fit:contain;border-radius:10px;background:#fff;padding:3px;box-shadow:0 2px 6px rgba(0,0,0,.1)}
  .company{font-size:16px;font-weight:700;color:#1565a8;line-height:1.15}
  .company-sub{font-size:8.5px;color:#6b7280;text-transform:uppercase;letter-spacing:.08em;margin-top:1px}
  .header-right{text-align:right}
  .report-title{font-size:12px;font-weight:700;color:#1565a8}
  .report-date{font-size:8px;color:#9ca3af;margin-top:2px}
  .meta-bar{display:flex;background:#fff;border-bottom:1px solid #e5e7eb}
  .meta-item{padding:7px 16px;border-right:1px solid #f0f0f0}
  .meta-label{display:block;font-size:8px;text-transform:uppercase;letter-spacing:.06em;color:#9ca3af;font-weight:600}
  .meta-value{display:block;font-size:10.5px;font-weight:700;color:#111827;margin-top:1px}
  .legend{display:flex;gap:10px;padding:5px 20px;background:#fafafa;border-bottom:1px solid #e5e7eb;flex-wrap:wrap}
  .legend-item{display:flex;align-items:center;gap:4px;font-size:7.5px;color:#6b7280}
  .legend-dot{width:12px;height:12px;border-radius:2px;display:inline-block}
  table{width:100%;border-collapse:collapse;table-layout:fixed}
  .emp-th{text-align:left;width:160px;padding:5px 8px;font-size:8px;background:#1565a8;color:#fff;white-space:nowrap}
  .day-th{width:22px;text-align:center;padding:3px 1px;font-size:7.5px;font-weight:700;background:#1565a8;color:#fff;white-space:nowrap}
  .day-name{font-size:6.5px;opacity:.8;display:block;margin-top:1px}
  .sun-col{background:#0f4c8a !important}
  .sum-th{width:38px;text-align:center;padding:4px 2px;font-size:7.5px;font-weight:700;background:#374151;color:#fff;white-space:nowrap}
  .emp-cell{padding:4px 8px;white-space:nowrap;font-weight:600;font-size:8.5px;border-bottom:1px solid #f0f0f0;overflow:hidden;text-overflow:ellipsis;max-width:160px}
  .emp-code{font-size:7px;color:#9ca3af;font-weight:400;display:block;margin-top:1px}
  .day-cell{padding:2px 1px;text-align:center;border-bottom:1px solid #f0f0f0;border-right:1px solid #f5f5f5}
  .sum-cell{text-align:center;font-weight:700;font-size:8.5px;padding:4px 2px;border-bottom:1px solid #f0f0f0;border-left:1px solid #e5e7eb;white-space:nowrap}
  .footer{display:flex;align-items:center;justify-content:space-between;padding:8px 20px;border-top:1px solid #e5e7eb;background:#f5f8ff;margin-top:auto}
  .footer-note{font-size:7.5px;color:#9ca3af}
  .footer-right{display:flex;align-items:center;gap:5px}
  .footer-powered{font-size:8px;color:#9ca3af}
  .footer-liveu{height:18px;object-fit:contain;opacity:.8}
  .footer-liveu-name{font-size:8.5px;font-weight:700;color:#1565a8}
  @media print{@page{margin:5mm;size:landscape} body{font-size:8px} .day-th{width:18px} .emp-th{width:140px} .sum-th{width:32px}}
</style></head><body>
<div class="page-header">
  <div class="header-left">
    <img src="${drivethruLogo}" class="header-logo" alt="Drivethru"/>
    <div>
      <div class="company">Drivethru Pvt Ltd</div>
      <div class="company-sub">Attendance Management System</div>
    </div>
  </div>
  <div class="header-right">
    <div class="report-title">Monthly Attendance Sheet</div>
    <div class="report-date">Generated: ${new Date().toLocaleString("en-LK",{dateStyle:"long",timeStyle:"short"})}</div>
  </div>
</div>
<div class="meta-bar">
  <div class="meta-item"><span class="meta-label">Period</span><span class="meta-value">${monthName} ${year}</span></div>
  <div class="meta-item"><span class="meta-label">Total Employees</span><span class="meta-value">${rows.length}</span></div>
  <div class="meta-item"><span class="meta-label">Working Days</span><span class="meta-value">${daysInMonth}</span></div>
</div>
<div class="legend">
  <span class="legend-item"><span class="legend-dot" style="background:#dcfce7"></span> P = Present</span>
  <span class="legend-item"><span class="legend-dot" style="background:#fef3c7"></span> P(L) = Present (Late)</span>
  <span class="legend-item"><span class="legend-dot" style="background:#fee2e2"></span> A = Absent</span>
  <span class="legend-item"><span class="legend-dot" style="background:#fef9c3"></span> H = Half Day</span>
  <span class="legend-item"><span class="legend-dot" style="background:#dbeafe"></span> LV = Leave</span>
  <span class="legend-item"><span class="legend-dot" style="background:#f3f4f6"></span> HL = Holiday</span>
  <span class="legend-item"><span class="legend-dot" style="background:#f1f5f9"></span> DO = Day Off</span>
</div>
<table>
  <thead><tr>
    <th class="emp-th">Employee</th>
    ${dayHeader}
    <th class="sum-th" style="background:#15803d">P</th>
    <th class="sum-th" style="background:#dc2626">A</th>
    <th class="sum-th" style="background:#b45309">L</th>
    <th class="sum-th" style="background:#a16207">H</th>
    <th class="sum-th" style="background:#1d4ed8">Work Hrs</th>
    <th class="sum-th" style="background:#ea580c">OT Hrs</th>
  </tr></thead>
  <tbody>${bodyRows}</tbody>
</table>
<div class="footer">
  <div class="footer-note">System-generated report. For internal use only. © ${new Date().getFullYear()} Drivethru Pvt Ltd</div>
  <div class="footer-right">
    <span class="footer-powered">Powered by</span>
    <img src="${liveuLogo}" class="footer-liveu" alt="Live U Pvt Ltd"/>
    <span class="footer-liveu-name">Live U Pvt Ltd</span>
  </div>
</div>
<script>window.addEventListener("load",function(){setTimeout(function(){window.print();},350);});<\/script>
</body></html>`);
    w.document.close();
  };

  const handleExportExcel = () => {
    const escape = (v: string | number) => { const s = String(v??""); return s.includes(",")||s.includes('"')?`"${s.replace(/"/g,'""')}"`:s; };
    const dayHeaders = daysArray.map(d => `${getDayName(d)} ${d}`);
    const headers = ["Emp ID","Employee","Designation",...dayHeaders,"Present","Absent","Late","Total Hrs","OT Hrs"];
    const csvRows = rows.map((row: any) => {
      const dayStatuses = daysArray.map(day => {
        const e = row.dailyStatus?.find((d: any) => d.day === day);
        const isSun = new Date(year, month - 1, day).getDay() === 0;
        const st = e?.status || "absent";
        const effectiveSt3 = (st === "absent" && isSun) ? "sunday" : st;
        const labels: Record<string,string> = { present:"P", late:"P(L)", absent:"A", half_day:"H", leave:"LV", holiday:"HL", sunday:"DO" };
        return labels[effectiveSt3] || "A";
      });
      return [row.employeeCode, row.employeeName, row.designation||"", ...dayStatuses,
        row.presentDays??0, row.absentDays??0, row.lateDays??0,
        row.totalWorkHours!=null?row.totalWorkHours.toFixed(1):"", row.overtimeHours>0?row.overtimeHours.toFixed(1):"0"];
    });
    const csv = [headers,...csvRows].map(r=>r.map(escape).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download=`monthly-sheet-${monthName}-${year}.csv`; a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Monthly Attendance Sheet"
        description="Grid view with in/out times, work hours, and OT per employee."
        action={
          <div className="flex items-center gap-2">
            <ExcelIconButton onClick={handleExportExcel} />
            <PdfIconButton onClick={handleExportPdf} />
          </div>
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
                      showTimes ? "min-w-[68px]" : "min-w-[34px]",
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
                      const effectiveSt = (st === "absent" && isSunday(day)) ? "sunday" : st;
                      const cfg   = STATUS_CFG[effectiveSt] || STATUS_CFG.absent;
                      const inT   = fmtTime(entry?.inTime);
                      const outT  = fmtTime(entry?.outTime);
                      const inT2  = fmtTime(entry?.inTime2);
                      const outT2 = fmtTime(entry?.outTime2);
                      const hrs   = entry?.hours;

                      return (
                        <td key={day} className={cn(
                          "px-0.5 py-0.5 text-center align-middle",
                          isSunday(day) && "bg-red-50/30"
                        )}>
                          {showTimes ? (
                            <div className={cn("rounded px-0.5 py-0.5 flex flex-col items-center gap-0", cfg.bg)}>
                              <span className={cn("text-[10px] font-bold leading-tight", cfg.text)}>{cfg.label}</span>
                              {/* Session 1 */}
                              {inT && (
                                <span className="text-[8px] leading-tight text-blue-600 font-mono">{inT}</span>
                              )}
                              {outT && (
                                <span className="text-[8px] leading-tight text-blue-400 font-mono">{outT}</span>
                              )}
                              {/* Session 2 */}
                              {inT2 && (
                                <span className="text-[8px] leading-tight text-orange-600 font-mono">{inT2}</span>
                              )}
                              {outT2 && (
                                <span className="text-[8px] leading-tight text-orange-400 font-mono">{outT2}</span>
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
