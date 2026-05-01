import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileSpreadsheet, Download, Printer, FileDown } from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const LIVE_U_POWERED_BY = "Powered by Live U (Pvt) Ltd";
const COMPANY_LOGO_URL = "https://upload.wikimedia.org/wikipedia/en/c/c1/Sri_Lanka_Post_logo.png";
const LIVE_U_LOGO_URL = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQCzrc0k5wmNzmItazY38yj1_7K5zAFLMxn-Q&s";

function getGeneratedBy(): string {
  try {
    const u = localStorage.getItem("user");
    if (u) {
      const p = JSON.parse(u);
      return p.fullName || p.username || "—";
    }
  } catch {}
  return "—";
}

function getGeneratedAt(): string {
  const d = new Date();
  const dateStr = d.toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  const timeStr = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
  return `${dateStr} at ${timeStr}`;
}

export default function MonthlyAttendanceSheetPage() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedEmployee, setSelectedEmployee] = useState("all");
  const [selectedShiftType, setSelectedShiftType] = useState("all");
  const [selectedDepartment, setSelectedDepartment] = useState("all");

  const monthStart = new Date(selectedYear, selectedMonth - 1, 1);
  const monthEnd = new Date(selectedYear, selectedMonth, 0);
  const startDate = formatDate(monthStart);
  const endDate = formatDate(monthEnd);

  const { data: departments = [] } = useQuery<any[]>({ queryKey: ["/api/departments"] });
  const { data: staffCategories = [] } = useQuery<any[]>({ queryKey: ["/api/staff-categories"] });
  const { data: employees = [] } = useQuery<any[]>({ queryKey: ["/api/employees"] });
  const { data: monthlyAttendanceData, isLoading } = useQuery({
    queryKey: [
      "/api/reports/monthly-attendance",
      startDate,
      endDate,
      selectedEmployee,
      selectedShiftType,
      selectedDepartment,
    ],
    queryFn: async () => {
      const url = `/api/reports/monthly-attendance?startDate=${startDate}&endDate=${endDate}&employeeId=${selectedEmployee}&shiftType=${selectedShiftType}&departmentId=${selectedDepartment}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch monthly attendance sheet");
      return res.json();
    },
  });

  const activeStaffCategories = (staffCategories || []).filter((c: any) => c.isActive !== false);

  // Only categories that are assigned to at least one employee (employee master)
  const categoryIdsInUse = useMemo(() => {
    const ids = new Set<number>();
    (employees || []).forEach((emp: any) => {
      if (emp.staffCategoryId != null && emp.staffCategoryId !== "") ids.add(Number(emp.staffCategoryId));
    });
    return ids;
  }, [employees]);

  const employeeMasterCategories = useMemo(
    () => activeStaffCategories.filter((c: any) => categoryIdsInUse.has(Number(c.id))),
    [activeStaffCategories, categoryIdsInUse]
  );

  // Full display name: "Parent -- Child" when category has parentId
  const formatStaffCategoryDisplayName = (c: any, list: any[]) => {
    if (!c) return "";
    if (c.parentId != null) {
      const parent = list.find((p: any) => p.id === c.parentId);
      return parent ? `${parent.name} -- ${c.name}` : c.name;
    }
    return c.name;
  };

  const getShiftTypeName = () => {
    if (selectedShiftType === "all") return "All Staff Categories";
    const c = employeeMasterCategories.find(
      (x: any) => String(x.id) === String(selectedShiftType) || x.id === parseInt(selectedShiftType)
    );
    return c ? formatStaffCategoryDisplayName(c, activeStaffCategories) : "All Staff Categories";
  };

  const parseTimeToDecimal = (timeStr: string): number => {
    if (!timeStr) return 0;
    const parts = String(timeStr).match(/(\d+):(\d+)/);
    if (parts) return parseInt(parts[1], 10) + parseInt(parts[2], 10) / 60;
    const parsed = parseFloat(String(timeStr).replace("h", ""));
    return isNaN(parsed) ? 0 : parsed;
  };

  const formatDecimalHours = (decimalHours: number): string => {
    if (decimalHours === 0) return "0h 0m";
    const h = Math.floor(decimalHours);
    const m = Math.round((decimalHours - h) * 60);
    return `${h}h ${m}m`;
  };

  const formatDecimalToHHMM = (decimalHours: number): string => {
    if (decimalHours === 0) return "0:00";
    const h = Math.floor(decimalHours);
    const m = Math.round((decimalHours - h) * 60);
    return `${h}:${String(m).padStart(2, "0")}`;
  };

  // Total days for all categories: P=1, HL=0.5, SL=1, Ex-1/Ex-2=1
  const calcTotalDays = (dailyData: Record<number, any> | undefined): number => {
    if (!dailyData) return 0;
    return Object.values(dailyData).reduce((sum: number, d: any) => {
      const s = d?.status;
      if (s === "P") return sum + 1;
      if (s === "HL" || s === "Half Day") return sum + 0.5;
      if (s === "SL") return sum + 1;
      if (s === "Ex-1" || s === "Ex-2") return sum + 1;
      return sum;
    }, 0);
  };

  const formatTotalDays = (total: number): string => {
    if (total === 0) return "0 days";
    return total % 1 === 0 ? `${total} days` : `${total.toFixed(1)} days`;
  };

  const exportToExcel = () => {
    if (!monthlyAttendanceData || monthlyAttendanceData.length === 0) return;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days: Date[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) days.push(new Date(d));

    const wsData: any[][] = [];
    wsData.push(["SRI LANKA POST"]);
    wsData.push(["Human Resources Department"]);
    wsData.push([""]);
    wsData.push(["MONTHLY ATTENDANCE SHEET"]);
    wsData.push([""]);
    wsData.push([
      `Period: ${start.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })} to ${end.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })}`,
    ]);
    wsData.push([`Report Month: ${start.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}`]);
    wsData.push([`Total Employees: ${monthlyAttendanceData.length}`]);
    wsData.push([""]);
    wsData.push(["Applied Filters:"]);
    wsData.push([
      `Employee: ${selectedEmployee === "all" ? "All Employees" : selectedEmployee}   |   Staff Category: ${getShiftTypeName()}`,
    ]);
    wsData.push([""]);

    monthlyAttendanceData.forEach((emp: any) => {
      wsData.push([
        `EMPLOYEE: ${emp.fullName || "N/A"}   EID: ${emp.employeeId || "N/A"}   DEPT: ${emp.department || "N/A"}   SHIFT TYPE: ${emp.staffCategoryName || "N/A"}`,
        ...Array(days.length).fill(""),
      ]);
      wsData.push(["", ...days.map((d) => d.toLocaleDateString("en-GB", { weekday: "short" }).toUpperCase())]);
      wsData.push(["", ...days.map((d) => d.getDate().toString().padStart(2, "0"))]);
      ["IN TIME", "OUT TIME", "WORKED HRS", "STATUS", "OVERTIME"].forEach((rowLabel) => {
        const row: any[] = [rowLabel];
        days.forEach((day) => {
          const dayData = emp.dailyData?.[day.getDate()];
          let cell = "00:00";
          if (dayData) {
            if (rowLabel === "IN TIME") cell = dayData.inTime || "00:00";
            else if (rowLabel === "OUT TIME") cell = dayData.outTime || "00:00";
            else if (rowLabel === "WORKED HRS") cell = dayData.workedHours || "00:00";
            else if (rowLabel === "STATUS") {
              const s = dayData.status || "A";
              cell = s === "Holiday" || s === "HD" ? "H" : s === "Half Day" ? "HL" : s;
            } else if (rowLabel === "OVERTIME")
              cell =
                dayData.overtimeHours && parseFloat(dayData.overtimeHours) > 0
                  ? parseFloat(dayData.overtimeHours).toFixed(2)
                  : "00:00";
          }
          row.push(cell);
        });
        wsData.push(row);
      });
      wsData.push([""]);
    });
    wsData.push([""]);
    wsData.push([LIVE_U_POWERED_BY]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Monthly Attendance");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `monthly-attendance-${startDate}-to-${endDate}.xlsx`);
  };

  const buildPrintHtml = () => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days: Date[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) days.push(new Date(d));
    const generatedBy = getGeneratedBy();
    const generatedAt = getGeneratedAt();
    const reportTitle = "MONTHLY ATTENDANCE SHEET";
    const periodStr = `${new Date(startDate).toLocaleDateString("en-GB")} - ${new Date(endDate).toLocaleDateString("en-GB")}`;
    let html = `
<!DOCTYPE html><html><head><title>${reportTitle}</title>
<style>
  @page { size: A4 landscape; margin: 8mm; }
  body { font-family: Arial, sans-serif; font-size: 8px; line-height: 1.15; margin: 0; padding: 4px; color: #000; }
  table { width: 100%; border-collapse: collapse; }
</style></head><body>
  <div style="display: flex; align-items: center; justify-content: center; gap: 20px; padding: 16px 20px; margin-bottom: 20px; background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 1px solid #e2e8f0; border-radius: 10px;">
    <img src="${COMPANY_LOGO_URL}" alt="Sri Lanka Post" style="height: 56px; width: auto; display: block;" />
    <div style="text-align: left;">
      <p style="margin: 0 0 2px 0; font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em;">Sri Lanka Post</p>
      <h1 style="margin: 0 0 4px 0; font-size: 20px; font-weight: 800; letter-spacing: 0.04em; color: #0f172a;">SRI LANKA POST</h1>
      <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 600; color: #475569;">Human Resources Department</p>
      <p style="margin: 0; font-size: 14px; font-weight: 700; color: #800000; letter-spacing: 0.05em;">${reportTitle}</p>
    </div>
  </div>`;
    const standardTimeRowConfigs = [
      { label: "IN TIME", key: "inTime", labelBg: "#f59e0b", rowBg: "#fef3c7", textColor: "#92400e" },
      { label: "OUT TIME", key: "outTime", labelBg: "#10b981", rowBg: "#d1fae5", textColor: "#065f46" },
      { label: "WORKED HRS", key: "workedHours", labelBg: "#3b82f6", rowBg: "#dbeafe", textColor: "#1e40af" },
      { label: "STATUS", key: "status", labelBg: "#6b7280", rowBg: "#f3f4f6", textColor: "#374151" },
      { label: "OVERTIME", key: "overtime", labelBg: "#f97316", rowBg: "#fed7aa", textColor: "#c2410c" },
    ];
    const splitTurnsTimeRowConfigs = [
      { label: "IN TIME", key: "inTime1", labelBg: "#f59e0b", rowBg: "#fef3c7", textColor: "#92400e" },
      { label: "OUT TIME", key: "outTime1", labelBg: "#10b981", rowBg: "#d1fae5", textColor: "#065f46" },
      { label: "IN TIME", key: "inTime2", labelBg: "#f59e0b", rowBg: "#fef3c7", textColor: "#92400e" },
      { label: "OUT TIME", key: "outTime2", labelBg: "#10b981", rowBg: "#d1fae5", textColor: "#065f46" },
      { label: "WORKED HRS", key: "workedHoursSplit", labelBg: "#3b82f6", rowBg: "#dbeafe", textColor: "#1e40af" },
      { label: "STATUS", key: "statusSplit", labelBg: "#6b7280", rowBg: "#f3f4f6", textColor: "#374151" },
      { label: "OVERTIME", key: "overtimeTotal", labelBg: "#f97316", rowBg: "#fed7aa", textColor: "#c2410c" },
    ];
    monthlyAttendanceData!.forEach((emp: any, empIndex: number) => {
      const isSplitTurnsPrint = emp.isSplitTurns === true || (emp.staffCategoryName || "").includes("Split Turns");
      const timeRowConfigs = isSplitTurnsPrint ? splitTurnsTimeRowConfigs : standardTimeRowConfigs;
      const totalWorkedHours = Object.values(emp.dailyData || {}).reduce((s: number, d: any) => s + (d?.workedHours ? parseTimeToDecimal(d.workedHours) : 0), 0);
      const totalOvertimeHours = Object.values(emp.dailyData || {}).reduce((s: number, d: any) => {
        const otValue = d?.overtime || d?.overtimeHours;
        if (otValue && otValue !== "0" && otValue !== "0.00" && otValue !== "0:00" && otValue !== "-" && otValue !== null && otValue !== undefined) {
          return s + parseTimeToDecimal(String(otValue));
        }
        return s;
      }, 0);
      const totalDays = calcTotalDays(emp.dailyData);
      html += `
  <div style="margin-bottom: 40px; page-break-inside: avoid; border: 2px solid #000000; background: #ffffff;">
    <div style="background: #f8f9fa; border-bottom: 2px solid #000000; padding: 15px;">
      <table style="width: 100%; border-collapse: collapse;"><tr>
        <td style="text-align: left; font-weight: bold; font-size: 16px; color: #000000;">MONTHLY ATTENDANCE RECORD</td>
        <td style="text-align: right; font-size: 14px; color: #000000;">Period: ${periodStr}</td>
      </tr></table>
      <table style="width: 100%; border-collapse: collapse; margin-top: 10px;"><tr>
        <td style="padding: 5px; font-size: 13px; font-weight: bold; width: 25%;">Employee Name: ${emp.fullName || "N/A"}</td>
        <td style="padding: 5px; font-size: 13px; font-weight: bold; width: 25%;">Employee ID: ${emp.employeeId || "N/A"}</td>
        <td style="padding: 5px; font-size: 13px; font-weight: bold; width: 25%;">Department: ${emp.department || "N/A"}</td>
        <td style="padding: 5px; font-size: 13px; font-weight: bold; width: 25%;">Staff Category: ${emp.staffCategoryName || "N/A"}</td>
      </tr></table>
    </div>
    <div style="padding: 8px;">
      <table style="width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 8px;">
        <thead>
          <tr style="background: #e9ecef;">
            <th style="border: 1px solid #000000; padding: 3px; text-align: center; font-weight: bold; font-size: 9px; background: #e9ecef; color: #000000; width: 70px;">TIME DETAILS</th>`;
      days.forEach((day) => {
        const sun = day.getDay() === 0 ? " background: #fef2f2; color: #b91c1c;" : "";
        html += `<th style="border: 1px solid #000000; padding: 2px; text-align: center; font-weight: bold; font-size: 8px; background: #e9ecef; color: #000000; min-width: 28px;${sun}">${day.toLocaleDateString("en-GB", { weekday: "short" }).toUpperCase()}</th>`;
      });
      html += `<th style="border: 1px solid #000000; padding: 2px; text-align: center; font-weight: bold; font-size: 8px; background: #e9ecef; color: #000000;">TOTAL</th></tr>
          <tr style="background: #f8f9fa;">
            <th style="border: 1px solid #000000; padding: 2px; text-align: center; font-weight: bold; background: #f8f9fa; color: #000000; font-size: 8px;">DATE</th>`;
      days.forEach((day) => {
        html += `<th style="border: 1px solid #000000; padding: 1px; text-align: center; font-weight: bold; font-size: 8px; background: #f8f9fa; color: #000000;">${day.getDate().toString().padStart(2, "0")}</th>`;
      });
      html += `<th style="border: 1px solid #000000; padding: 1px; text-align: center; font-weight: bold; font-size: 8px; background: #f8f9fa; color: #000000;">—</th></tr></thead><tbody>`;
      timeRowConfigs.forEach((config) => {
        html += `<tr><td style="border: 1px solid #000000; padding: 3px; font-weight: bold; text-align: center; background-color: ${config.labelBg}; color: white; font-size: 9px;">${config.label}</td>`;
        days.forEach((day) => {
          const dayData = emp.dailyData?.[day.getDate()];
          let value = "-";
          let cellStyle = `border: 1px solid #000000; padding: 2px; text-align: center; font-weight: bold; font-size: 8px; color: ${config.textColor}; background: ${config.rowBg};`;
          if (dayData) {
            if (config.key === "overtimeTotal") {
              // Handle overtime - API returns HH:MM format (e.g., "7:45") in dayData.overtime
              // Also check dayData.overtimeHours as fallback
              const otValue = dayData.overtime || dayData.overtimeHours;
              if (otValue && otValue !== "0" && otValue !== "0.00" && otValue !== "-" && otValue !== "0:00" && otValue !== null && otValue !== undefined) {
                // If already in HH:MM format, use as is
                if (typeof otValue === "string" && otValue.includes(":")) {
                  value = otValue;
                } else {
                  // If it's a decimal number, convert to HH:MM
                  const ot = parseTimeToDecimal(String(otValue).replace("h", ""));
                  const hours = Math.floor(ot);
                  const minutes = Math.round((ot - hours) * 60);
                  value = `${hours}:${String(minutes).padStart(2, "0")}`;
                }
              } else value = "-";
            } else if (config.key === "workedHoursSplit") value = dayData.workedHours || "-";
            else if (config.key === "statusSplit") {
              const s = dayData.status || "A";
              value = s === "Holiday" || s === "HD" ? "H" : s === "Half Day" ? "HL" : s === "A" ? "L" : s;
              const statusColors: Record<string, string> = { P: "#059669", A: "#dc2626", H: "#7c3aed", HL: "#f59e0b", SL: "#ea580c", S: "" }; // SL = Short Leave (orange)
              const dayOfWeek = day.getDay();
              if (value === "S") statusColors["S"] = dayOfWeek === 0 ? "#dc2626" : "#000000";
              cellStyle = `border: 1px solid #000000; padding: 2px; text-align: center; font-weight: bold; font-size: 8px; color: ${statusColors[value] || "#374151"}; background: ${config.rowBg};`;
            } else if (config.key === "inTime") value = dayData.inTime || "-";
            else if (config.key === "outTime") value = dayData.outTime || "-";
            else if (config.key === "inTime1") value = dayData.inTime1 ?? "-";
            else if (config.key === "outTime1") value = dayData.outTime1 ?? "-";
            else if (config.key === "inTime2") value = dayData.inTime2 ?? "-";
            else if (config.key === "outTime2") value = dayData.outTime2 ?? "-";
            else if (config.key === "workedHours") value = dayData.workedHours || "00:00";
            else if (config.key === "status") {
              const s = dayData.status || "A";
              value = s === "Holiday" || s === "HD" ? "H" : s === "Half Day" ? "HL" : s === "A" ? "L" : s;
              const statusColors: Record<string, string> = { P: "#059669", A: "#dc2626", H: "#7c3aed", HL: "#f59e0b", SL: "#ea580c", S: "" }; // SL = Short Leave (orange)
              const dayOfWeek = day.getDay();
              if (value === "S") statusColors["S"] = dayOfWeek === 0 ? "#dc2626" : "#000000";
              cellStyle = `border: 1px solid #000000; padding: 2px; text-align: center; font-weight: bold; font-size: 8px; color: ${statusColors[value] || "#374151"}; background: ${config.rowBg};`;
            } else if (config.key === "overtime") {
              // Handle overtime - API returns HH:MM format (e.g., "7:45") in dayData.overtime
              // Also check dayData.overtimeHours as fallback
              const otValue = dayData.overtime || dayData.overtimeHours;
              if (otValue && otValue !== "0" && otValue !== "0.00" && otValue !== "-" && otValue !== "0:00" && otValue !== null && otValue !== undefined) {
                // If already in HH:MM format, use as is
                if (typeof otValue === "string" && otValue.includes(":")) {
                  value = otValue;
                } else {
                  // If it's a decimal number, convert to HH:MM
                  const ot = parseTimeToDecimal(String(otValue).replace("h", ""));
                  const hours = Math.floor(ot);
                  const minutes = Math.round((ot - hours) * 60);
                  value = `${hours}:${String(minutes).padStart(2, "0")}`;
                }
              } else value = "-";
            }
          }
          html += `<td style="${cellStyle}">${value}</td>`;
        });
        if (isSplitTurnsPrint) {
          if (config.key === "workedHoursSplit") html += `<td style="border: 1px solid #000000; padding: 2px; text-align: center; font-weight: bold; background: ${config.rowBg}; font-size: 8px;">${formatDecimalToHHMM(totalWorkedHours)}</td>`;
          else if (config.key === "statusSplit") html += `<td style="border: 1px solid #000000; padding: 2px; text-align: center; font-weight: bold; background: ${config.rowBg}; font-size: 8px;">${formatTotalDays(totalDays)}</td>`;
          else if (config.key === "overtimeTotal") {
            const totalOtDisplay = totalOvertimeHours > 0 ? formatDecimalToHHMM(totalOvertimeHours) : "-";
            html += `<td style="border: 1px solid #000000; padding: 2px; text-align: center; font-weight: bold; background: ${config.rowBg}; font-size: 8px;">${totalOtDisplay}</td>`;
          } else html += `<td style="border: 1px solid #000000; padding: 2px; text-align: center; font-weight: bold; background: ${config.rowBg}; font-size: 8px;">—</td>`;
        } else if (config.key === "workedHours") html += `<td style="border: 1px solid #000000; padding: 2px; text-align: center; font-weight: bold; background: ${config.rowBg}; font-size: 8px;">${formatDecimalToHHMM(totalWorkedHours)}</td>`;
        else if (config.key === "status") html += `<td style="border: 1px solid #000000; padding: 2px; text-align: center; font-weight: bold; background: ${config.rowBg}; font-size: 8px;">${formatTotalDays(totalDays)}</td>`;
        else if (config.key === "overtime") {
          const totalOtDisplay = totalOvertimeHours > 0 ? formatDecimalToHHMM(totalOvertimeHours) : "-";
          html += `<td style="border: 1px solid #000000; padding: 2px; text-align: center; font-weight: bold; background: ${config.rowBg}; font-size: 8px;">${totalOtDisplay}</td>`;
        }
        else html += `<td style="border: 1px solid #000000; padding: 2px; text-align: center; font-weight: bold; background: ${config.rowBg}; font-size: 8px;">—</td>`;
        html += "</tr>";
      });
      html += `
        </tbody></table>
    </div>
    <div style="background: #f8f9fa; padding: 15px; border-top: 2px solid #000000; border-bottom: 2px solid #000000;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="font-size: 13px; font-weight: bold; color: #000000; width: 50%;">MONTHLY SUMMARY - ${emp.fullName || "N/A"} (${emp.employeeId || "N/A"})</td>
            <td style="font-size: 13px; font-weight: bold; color: #000000; text-align: right;">Total Working Hours: ${formatDecimalToHHMM(totalWorkedHours)} | Total Overtime Hours: ${formatDecimalToHHMM(totalOvertimeHours)}</td></tr>
        <tr><td colspan="2" style="text-align: center; font-size: 11px; color: #000000; padding-top: 10px;">Generated: ${new Date().toLocaleDateString("en-GB")} | Sri Lanka Post | Confidential Document</td></tr>
        <tr><td colspan="2" style="text-align: center; font-size: 10px; color: #475569; padding-top: 6px;"><strong>Generated by:</strong> ${generatedBy} &nbsp;|&nbsp; <strong>Generated at:</strong> ${generatedAt}</td></tr>
        <tr><td colspan="2" style="text-align: center; padding-top: 12px; border-top: 1px solid #eee;">
          <img src="${LIVE_U_LOGO_URL}" alt="Live U" style="height: 24px; width: auto; vertical-align: middle; margin-right: 6px;" />
          <span style="font-size: 9px; color: #666;">${LIVE_U_POWERED_BY}</span>
        </td></tr>
      </table>
    </div>
  </div>`;
      if (empIndex < monthlyAttendanceData!.length - 1) {
        html += '<div style="page-break-before: always; height: 30px;"></div>';
      }
    });
    html += "</body></html>";
    return html;
  };

  const openPrintDialog = () => {
    if (!monthlyAttendanceData || monthlyAttendanceData.length === 0) return;
    const html = buildPrintHtml();
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
      w.focus();
      setTimeout(() => { w.print(); w.close(); }, 400);
    }
  };

  const handlePrint = () => openPrintDialog();
  const exportToPdf = () => openPrintDialog();

  if (isLoading) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
            <span className="ml-3 text-slate-600">Loading monthly attendance sheet...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  const days: Date[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) days.push(new Date(d));

  return (
    <div className="p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <FileSpreadsheet className="w-7 h-7 text-primary" />
          Monthly Attendance Sheet
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(parseInt(v, 10))}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                <SelectItem key={m} value={String(m)}>
                  {new Date(2000, m - 1, 1).toLocaleString("en-GB", { month: "long" })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(parseInt(v, 10))}>
            <SelectTrigger className="w-[110px]">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {[now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2].map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Employee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Employees</SelectItem>
              {employees.map((e: any) => (
                <SelectItem key={e.id} value={String(e.id)}>{e.fullName || e.employeeId} ({e.employeeId})</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((d: any) => (
                <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedShiftType} onValueChange={setSelectedShiftType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Staff Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Staff Categories</SelectItem>
              {employeeMasterCategories.map((c: any) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {formatStaffCategoryDisplayName(c, activeStaffCategories)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={exportToExcel} disabled={!monthlyAttendanceData?.length} className="gap-1.5">
            <Download className="w-4 h-4" />
            Export to Excel
          </Button>
          <Button onClick={handlePrint} disabled={!monthlyAttendanceData?.length} variant="outline" className="gap-1.5">
            <Printer className="w-4 h-4" />
            Print
          </Button>
          <Button onClick={exportToPdf} disabled={!monthlyAttendanceData?.length} variant="outline" className="gap-1.5">
            <FileDown className="w-4 h-4" />
            Export PDF
          </Button>
        </div>
      </div>

      {!monthlyAttendanceData || monthlyAttendanceData.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-500">
            No data available for the selected period.
          </CardContent>
        </Card>
      ) : (
        <Card className="border border-gray-200">
          <CardHeader className="py-3">
            <CardTitle className="text-lg font-semibold text-gray-900">
              {start.toLocaleDateString("en-GB", { month: "long", year: "numeric" })} — Monthly Attendance Sheet
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto pt-0">
            {monthlyAttendanceData.map((employee: any) => {
              const isSplitTurnsEmployee = employee.isSplitTurns === true || (employee.staffCategoryName || "").includes("Split Turns");
              const totalHours = Object.values(employee.dailyData || {}).reduce(
                (sum: number, dayData: any) => sum + (dayData?.workedHours ? parseTimeToDecimal(dayData.workedHours) : 0),
                0
              );
              const totalOvertime = Object.values(employee.dailyData || {}).reduce(
                (sum: number, dayData: any) => {
                  const otValue = dayData?.overtime || dayData?.overtimeHours;
                  if (otValue && otValue !== "0" && otValue !== "0.00" && otValue !== "0:00" && otValue !== "-" && otValue !== null && otValue !== undefined) {
                    return sum + parseTimeToDecimal(String(otValue));
                  }
                  return sum;
                },
                0
              );
              const totalDays = calcTotalDays(employee.dailyData);

              return (
                <div key={employee.id} className="mb-5">
                  <div className="p-2 bg-blue-50 border border-gray-300">
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <div><strong>Name:</strong> {employee.fullName}</div>
                      <div><strong>EMP ID:</strong> {employee.employeeId}</div>
                      <div><strong>Department:</strong> {employee.department || "Unassigned"}</div>
                      <div><strong>Staff Category:</strong> {employee.staffCategoryName || "N/A"}</div>
                    </div>
                  </div>
                  <table className="w-full border-collapse text-xs mt-1">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border p-1 font-semibold text-left align-top w-28"></th>
                        {days.map((day) => (
                          <th
                            key={day.toISOString()}
                            className={`border p-1 text-center align-top ${day.getDay() === 0 ? "bg-red-50 text-red-600 font-semibold" : ""}`}
                          >
                            <div>{day.toLocaleDateString("en-US", { weekday: "short" })}</div>
                            <div>{day.getDate()}</div>
                          </th>
                        ))}
                        <th className="border p-1 text-center align-top bg-blue-100"><strong>Total</strong></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(isSplitTurnsEmployee
                        ? [
                            { field: "In Time", key: "row1-in", getValue: (d: any) => d?.inTime1 ?? d?.inTime ?? "" },
                            { field: "Out Time", key: "row1-out", getValue: (d: any) => d?.outTime1 ?? d?.outTime ?? "" },
                            { field: "In Time", key: "row2-in", getValue: (d: any) => d?.inTime2 ?? "" },
                            { field: "Out Time", key: "row2-out", getValue: (d: any) => d?.outTime2 ?? "" },
                            { field: "Worked Hours", key: "wh-split", getValue: (d: any) => d?.workedHours ?? "" },
                            { field: "Status", key: "status-split", getValue: (d: any) => d?.status ?? "" },
                            { field: "Overtime", key: "ot-total", getValue: (d: any) => (d?.overtime || d?.overtimeHours) ?? "" },
                          ]
                        : [
                            { field: "In Time", key: "in", getValue: (d: any) => d?.inTime ?? "" },
                            { field: "Out Time", key: "out", getValue: (d: any) => d?.outTime ?? "" },
                            { field: "Worked Hours", key: "wh", getValue: (d: any) => d?.workedHours ?? "" },
                            { field: "Status", key: "status", getValue: (d: any) => d?.status ?? "" },
                            { field: "Overtime", key: "ot", getValue: (d: any) => (d?.overtime || d?.overtimeHours) ?? "" },
                          ]
                      ).map(({ field, key, getValue }) => (
                        <tr key={key}>
                          <td className="border p-1 font-semibold">{field}</td>
                          {days.map((day) => {
                            const dayData = employee.dailyData?.[day.getDate()];
                            const isSunday = day.getDay() === 0;
                            let value = "";
                            if (dayData) {
                              value = getValue(dayData);
                            }
                            if (field === "Overtime" && value !== "" && value !== "-") {
                              const otValue = dayData?.overtime || dayData?.overtimeHours;
                              if (otValue && otValue !== "0" && otValue !== "0.00" && otValue !== "0:00" && otValue !== "-" && otValue !== null && otValue !== undefined) {
                                const otStr = String(otValue).replace("h", "");
                                if (otStr.includes(":")) {
                                  value = otStr;
                                } else {
                                  const otDecimal = parseFloat(otStr);
                                  if (!isNaN(otDecimal) && otDecimal > 0) {
                                    const hours = Math.floor(otDecimal);
                                    const minutes = Math.round((otDecimal - hours) * 60);
                                    value = `${hours}:${String(minutes).padStart(2, "0")}`;
                                  } else {
                                    value = "-";
                                  }
                                }
                              } else {
                                value = "-";
                              }
                            }
                            const rawStatus = field === "Status" ? value : "";
                            const isHoliday =
                              field === "Status" &&
                              (rawStatus === "H" || rawStatus === "Holiday" || rawStatus === "HD");
                            let displayValue = value;
                            if (field === "Status") {
                              if (rawStatus === "H" || rawStatus === "Holiday" || rawStatus === "HD") displayValue = "H";
                              else if (rawStatus === "HL" || rawStatus === "Half Day") displayValue = "HL";
                              else if (rawStatus === "A") displayValue = "L";
                              else if (rawStatus === "S") displayValue = "S";
                            }

                            let statusClass = "";
                            if (field === "Status" && rawStatus) {
                              if (isHoliday) statusClass = "bg-purple-100 text-purple-700 font-semibold";
                              else if (rawStatus === "P") statusClass = "text-green-600 font-semibold";
                              else if (rawStatus === "A") statusClass = "text-red-600 font-semibold";
                              else if (rawStatus === "S") statusClass = isSunday ? "text-red-600 font-semibold" : "text-gray-900 font-semibold";
                              else if (rawStatus === "SL") statusClass = "text-orange-600 font-semibold"; // Short Leave styling
                              else if (rawStatus === "HL") statusClass = "text-blue-600 font-semibold";
                              else statusClass = "text-gray-600";
                              if (isSunday && !isHoliday && rawStatus !== "S") statusClass += " text-red-600 font-semibold";
                            }
                            const holidayBg =
                              dayData &&
                              (dayData.status === "H" || dayData.status === "Holiday" || dayData.status === "HD")
                                ? "bg-purple-50"
                                : "";

                            return (
                              <td
                                key={day.getDate()}
                                className={`border p-1 text-center min-h-8 ${holidayBg} ${statusClass}`}
                              >
                                {field === "Status" ? displayValue : value}
                              </td>
                            );
                          })}
                          <td className="border p-1 text-center bg-blue-100 font-semibold">
                            {isSplitTurnsEmployee
                              ? key === "wh-split"
                                ? formatDecimalHours(totalHours)
                                : key === "status-split"
                                  ? formatTotalDays(totalDays)
                                  : key === "ot-total"
                                    ? (totalOvertime > 0 ? formatDecimalHours(totalOvertime) : "-")
                                    : "-"
                              : field === "Worked Hours"
                                ? formatDecimalHours(totalHours)
                                : field === "Status"
                                  ? formatTotalDays(totalDays)
                                  : field === "Overtime"
                                    ? totalOvertime > 0 ? formatDecimalHours(totalOvertime) : "-"
                                    : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
