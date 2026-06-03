import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation, useSearch } from "wouter";
import {
  ArrowLeft,
  RefreshCw,
  Download,
  FileSpreadsheet,
  Building2,
  Zap,
} from "lucide-react";
import drivethruLogo from "@/assets/drivethru-wave-logo.png";
import * as XLSX from "xlsx";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
function apiUrl(path: string) {
  return `${BASE}/api${path}`;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function n(v: number | null | undefined) {
  return v ?? 0;
}
function amtNum(v: number | null | undefined) {
  const x = v ?? 0;
  if (x === 0) return "-";
  return x.toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

interface PayrollRow {
  id: number;
  month: number;
  year: number;
  basicSalary: number;
  transportAllowance: number;
  housingAllowance: number;
  otherAllowances: number;
  overtimeHours: number;
  overtimePay: number;
  holidayOtPay: number;
  grossSalary: number;
  computedLunchIncentive?: number;
  epfEmployee: number;
  epfEmployer: number;
  etfEmployer: number;
  apit: number;
  lateDeduction: number;
  lunchLateDeduction: number;
  absenceDeduction: number;
  halfDayDeduction: number;
  incompleteDeduction: number;
  otherDeductions: number;
  loanDeduction: number;
  totalDeductions: number;
  netSalary: number;
  employee: {
    id: number;
    employeeId: string;
    fullName: string;
    epfNumber?: string | null;
    designation?: string;
    branchId?: number | null;
  };
}

interface Branch {
  id: number;
  name: string;
  code?: string;
}

type ReportTab = "summary" | "ot";

export default function SalaryReport() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);

  const now = new Date();
  const [month, setMonth] = useState(
    Number(params.get("month") || now.getMonth() + 1),
  );
  const [year, setYear] = useState(
    Number(params.get("year") || now.getFullYear()),
  );
  const [tab, setTab] = useState<ReportTab>("summary");
  const [rows, setRows] = useState<PayrollRow[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchTab, setBranchTab] = useState<number | null>(null); // null = All
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [payrollRes, branchRes] = await Promise.all([
        fetch(apiUrl(`/payroll?month=${month}&year=${year}&limit=500`)),
        fetch(apiUrl(`/branches`)),
      ]);
      const d = await payrollRes.json();
      setRows(Array.isArray(d) ? d : (d.data ?? []));
      const bd = await branchRes.json();
      setBranches(Array.isArray(bd) ? bd : (bd.data ?? []));
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  const regeneratePayroll = useCallback(async () => {
    setRegenerating(true);
    try {
      await fetch(apiUrl("/payroll/generate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, year }),
      });
      await fetchData();
    } finally {
      setRegenerating(false);
    }
  }, [month, year, fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Branches that actually have payroll data this month
  const activeBranches = useMemo(() => {
    const ids = new Set(rows.map((r) => r.employee.branchId).filter(Boolean));
    return branches
      .filter((b) => ids.has(b.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [rows, branches]);

  // Reset branch tab if it's no longer active
  useEffect(() => {
    if (branchTab !== null && !activeBranches.find((b) => b.id === branchTab)) {
      setBranchTab(null);
    }
  }, [activeBranches, branchTab]);

  // Rows filtered by selected branch tab
  const filteredRows = useMemo(
    () =>
      branchTab === null
        ? rows
        : rows.filter((r) => r.employee.branchId === branchTab),
    [rows, branchTab],
  );

  const currentBranchName =
    branchTab === null
      ? "All Branches"
      : (activeBranches.find((b) => b.id === branchTab)?.name ?? "Branch");

  const monthLabel = `${MONTHS[month - 1]} ${year}`;
  const monthLabel2 = `${MONTHS[month - 1]}_${year}`;

  const buildSummarySheetData = (sheetRows: PayrollRow[]) => {
    const d2 = sheetRows.map((r) => {
      const allowances =
        n(r.transportAllowance) + n(r.housingAllowance) + n(r.otherAllowances);
      const otAmt = n(r.overtimePay) + n(r.holidayOtPay);
      const lunchInc = n(r.computedLunchIncentive);
      const totalEarnings = n(r.basicSalary) + allowances + otAmt + lunchInc;
      const payDeduction =
        n(r.lateDeduction) +
        n(r.lunchLateDeduction) +
        n(r.absenceDeduction) +
        n(r.halfDayDeduction) +
        n(r.incompleteDeduction);
      const totalForEPF = n(r.basicSalary) + allowances - payDeduction;
      const advance = n(r.loanDeduction);
      const apit = n(r.apit);
      const balancePay =
        totalEarnings - n(r.epfEmployee) - payDeduction - apit;
      const net = totalEarnings - n(r.epfEmployee) - advance - apit;
      return {
        r,
        allowances,
        otAmt,
        lunchInc,
        totalEarnings,
        payDeduction,
        totalForEPF,
        advance,
        apit,
        balancePay,
        net,
      };
    });
    const headers = [
      "#",
      "EPF #",
      "Name",
      "Basic Salary",
      "OT Hrs",
      "OT Amount",
      "Lunch Inc.",
      "Total Earnings",
      "EPF 8%",
      "Total for EPF",
      "Advance",
      "APIT",
      "Balance Pay",
      "Net",
      "EPF 12%",
      "ETF 3%",
    ];
    const dataRows = d2.map((d, i) => [
      i + 1,
      d.r.employee.epfNumber || d.r.employee.employeeId,
      d.r.employee.fullName,
      n(d.r.basicSalary),
      d.r.overtimeHours > 0 ? d.r.overtimeHours : 0,
      d.otAmt > 0 ? d.otAmt : 0,
      d.lunchInc > 0 ? d.lunchInc : 0,
      d.totalEarnings,
      n(d.r.epfEmployee),
      d.totalForEPF,
      d.advance,
      d.apit,
      d.balancePay,
      d.net,
      n(d.r.epfEmployer),
      n(d.r.etfEmployer),
    ]);
    const tot = d2.reduce(
      (a, d) => ({
        basic: a.basic + n(d.r.basicSalary),
        otHrs: a.otHrs + d.r.overtimeHours,
        otAmt: a.otAmt + d.otAmt,
        lunchInc: a.lunchInc + d.lunchInc,
        earn: a.earn + d.totalEarnings,
        epf8: a.epf8 + n(d.r.epfEmployee),
        ded: a.ded + d.payDeduction,
        forEPF: a.forEPF + d.totalForEPF,
        adv: a.adv + d.advance,
        apit: a.apit + d.apit,
        bal: a.bal + d.balancePay,
        net: a.net + d.net,
        epf12: a.epf12 + n(d.r.epfEmployer),
        etf3: a.etf3 + n(d.r.etfEmployer),
      }),
      {
        basic: 0,
        otHrs: 0,
        otAmt: 0,
        lunchInc: 0,
        earn: 0,
        epf8: 0,
        ded: 0,
        forEPF: 0,
        adv: 0,
        apit: 0,
        bal: 0,
        net: 0,
        epf12: 0,
        etf3: 0,
      },
    );
    const totalRow = [
      `Total (${sheetRows.length})`,
      "",
      "",
      tot.basic,
      tot.otHrs,
      tot.otAmt,
      tot.lunchInc,
      tot.earn,
      tot.epf8,
      tot.forEPF,
      tot.adv,
      tot.apit,
      tot.bal,
      tot.net,
      tot.epf12,
      tot.etf3,
    ];
    return [headers, ...dataRows, totalRow];
  };

  const buildOtSheetData = (sheetRows: PayrollRow[]) => {
    const d2 = sheetRows
      .filter((r) => n(r.overtimePay) + n(r.holidayOtPay) > 0)
      .map((r) => ({ r, otAmt: n(r.overtimePay) + n(r.holidayOtPay) }));
    const headers = [
      "#",
      "EPF #",
      "Name",
      "Designation",
      "OT Hours",
      "Regular OT Pay",
      "Holiday OT Pay",
      "Total OT Pay",
      "EPF 12%",
      "ETF 3%",
    ];
    const dataRows = d2.map((d, i) => [
      i + 1,
      d.r.employee.epfNumber || d.r.employee.employeeId,
      d.r.employee.fullName,
      (d.r.employee as any).department || "",
      d.r.overtimeHours,
      n(d.r.overtimePay),
      n(d.r.holidayOtPay),
      d.otAmt,
      n(d.r.epfEmployer),
      n(d.r.etfEmployer),
    ]);
    const tot = d2.reduce(
      (a, d) => ({
        hrs: a.hrs + d.r.overtimeHours,
        ot: a.ot + n(d.r.overtimePay),
        hol: a.hol + n(d.r.holidayOtPay),
        total: a.total + d.otAmt,
      }),
      { hrs: 0, ot: 0, hol: 0, total: 0 },
    );
    const totalRow = [
      `Total (${d2.length})`,
      "",
      "",
      "",
      tot.hrs,
      tot.ot,
      tot.hol,
      tot.total,
      "",
      "",
    ];
    return [headers, ...dataRows, totalRow];
  };

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    const branchSuffix =
      branchTab === null
        ? "All_Branches"
        : currentBranchName.replace(/\s+/g, "_");

    if (tab === "summary") {
      if (branchTab === null && activeBranches.length > 1) {
        // One sheet per branch + one "All" summary sheet
        activeBranches.forEach((b) => {
          const bRows = rows.filter((r) => r.employee.branchId === b.id);
          const data = buildSummarySheetData(bRows);
          const ws = XLSX.utils.aoa_to_sheet(data);
          const sheetName = b.name.slice(0, 31);
          XLSX.utils.book_append_sheet(wb, ws, sheetName);
        });
        // All branches combined sheet
        const allData = buildSummarySheetData(rows);
        const wsAll = XLSX.utils.aoa_to_sheet(allData);
        XLSX.utils.book_append_sheet(wb, wsAll, "All Branches");
      } else {
        const data = buildSummarySheetData(filteredRows);
        const ws = XLSX.utils.aoa_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, currentBranchName.slice(0, 31));
      }
      XLSX.writeFile(wb, `Salary_Summary_${branchSuffix}_${monthLabel2}.xlsx`);
    } else {
      if (branchTab === null && activeBranches.length > 1) {
        activeBranches.forEach((b) => {
          const bRows = rows.filter((r) => r.employee.branchId === b.id);
          const data = buildOtSheetData(bRows);
          const ws = XLSX.utils.aoa_to_sheet(data);
          XLSX.utils.book_append_sheet(wb, ws, b.name.slice(0, 31));
        });
        const allData = buildOtSheetData(rows);
        const wsAll = XLSX.utils.aoa_to_sheet(allData);
        XLSX.utils.book_append_sheet(wb, wsAll, "All Branches");
      } else {
        const data = buildOtSheetData(filteredRows);
        const ws = XLSX.utils.aoa_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, currentBranchName.slice(0, 31));
      }
      XLSX.writeFile(wb, `OT_Cost_Report_${branchSuffix}_${monthLabel2}.xlsx`);
    }
  };

  const exportPDF = () => {
    const fmt = (v: number | null | undefined) => {
      const x = v ?? 0;
      if (x === 0) return "-";
      return x.toLocaleString("en-LK", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    };
    const ml = `${MONTHS[month - 1]} ${year}`;
    const branchLabel = branchTab === null ? "" : ` â€” ${currentBranchName}`;

    let tableHtml = "";

    if (tab === "summary") {
      const d2 = filteredRows.map((r) => {
        const allowances =
          n(r.transportAllowance) +
          n(r.housingAllowance) +
          n(r.otherAllowances);
        const otAmt = n(r.overtimePay) + n(r.holidayOtPay);
        const lunchInc = n(r.computedLunchIncentive);
        const totalEarnings = n(r.basicSalary) + allowances + otAmt + lunchInc;
        const payDeduction =
          n(r.lateDeduction) +
          n(r.lunchLateDeduction) +
          n(r.absenceDeduction) +
          n(r.halfDayDeduction) +
          n(r.incompleteDeduction);
        const totalForEPF = n(r.basicSalary) + allowances - payDeduction;
        const advance = n(r.loanDeduction);
        const apit = n(r.apit);
        const balancePay =
          totalEarnings - n(r.epfEmployee) - payDeduction - apit;
        return {
          r,
          allowances,
          otAmt,
          lunchInc,
          totalEarnings,
          payDeduction,
          totalForEPF,      advance,
      apit,
      balancePay,
      net: totalEarnings - n(r.epfEmployee) - advance - apit,
    };
  });
      const tot = d2.reduce(
        (a, d) => ({
          basic: a.basic + n(d.r.basicSalary),
          otHrs: a.otHrs + d.r.overtimeHours,
          otAmt: a.otAmt + d.otAmt,
          lunchInc: a.lunchInc + d.lunchInc,
          earn: a.earn + d.totalEarnings,
          epf8: a.epf8 + n(d.r.epfEmployee),
          ded: a.ded + d.payDeduction,
          forEPF: a.forEPF + d.totalForEPF,
          adv: a.adv + d.advance,
          apit: a.apit + d.apit,
          bal: a.bal + d.balancePay,
          epf12: a.epf12 + n(d.r.epfEmployer),
          etf3: a.etf3 + n(d.r.etfEmployer),
        }),
        {
          basic: 0,
          otHrs: 0,
          otAmt: 0,
          lunchInc: 0,
          earn: 0,
          epf8: 0,
          ded: 0,
          forEPF: 0,
          adv: 0,
          apit: 0,
          bal: 0,
          epf12: 0,
          etf3: 0,
        },
      );

      tableHtml = `<table>
        <thead><tr class="hdr">
          <th class="l">#</th><th class="l">EPF #</th><th class="l">Name</th>
          <th>Basic Salary</th><th>OT Hrs</th><th>OT Amount</th><th>Lunch Inc.</th><th>Total Earnings</th>
          <th>EPF 8%</th><th>Total for EPF</th><th>Advance</th>
          <th>APIT</th><th>Balance Pay</th><th>Net</th><th>EPF 12%</th><th>ETF 3%</th>
        </tr></thead>
        <tbody>${d2
          .map(
            (d, i) => `<tr class="${i % 2 === 0 ? "" : "alt"}">
          <td class="l sm">${i + 1}</td>
          <td class="l">${d.r.employee.epfNumber || d.r.employee.employeeId}</td>
          <td class="l name">${d.r.employee.fullName}</td>
          <td>${fmt(d.r.basicSalary)}</td>
          <td>${d.r.overtimeHours > 0 ? d.r.overtimeHours.toFixed(1) : "-"}</td>
          <td class="${d.otAmt > 0 ? "hi" : ""}">${fmt(d.otAmt)}</td>
          <td class="${d.lunchInc > 0 ? "teal" : ""}">${fmt(d.lunchInc)}</td>
          <td class="b">${fmt(d.totalEarnings)}</td>
          <td class="red">${fmt(d.r.epfEmployee)}</td>
          <td class="b">${fmt(d.totalForEPF)}</td>
          <td class="${d.advance > 0 ? "amber" : ""}">${fmt(d.advance)}</td>
          <td class="${d.apit > 0 ? "red" : ""}">${fmt(d.apit)}</td>
          <td class="b primary">${fmt(d.balancePay)}</td>
          <td class="b" style="color:#15803d;font-weight:700">${fmt(d.net)}</td>
          <td class="sm">${fmt(d.r.epfEmployer)}</td>
          <td class="sm">${fmt(d.r.etfEmployer)}</td>
        </tr>`,
          )
          .join("")}</tbody>
        <tfoot><tr class="tot">
          <td class="l" colspan="3">Total (${filteredRows.length} employees)</td>
          <td>${fmt(tot.basic)}</td>
          <td>${tot.otHrs > 0 ? tot.otHrs.toFixed(1) : "-"}</td>
          <td>${fmt(tot.otAmt)}</td>
          <td>${fmt(tot.lunchInc)}</td>
          <td>${fmt(tot.earn)}</td>
          <td>${fmt(tot.epf8)}</td>
          <td>${fmt(tot.forEPF)}</td>
          <td>${fmt(tot.adv)}</td>
          <td>${fmt(tot.apit)}</td>
          <td>${fmt(tot.bal)}</td>
          <td>${fmt(tot.earn - tot.epf8 - tot.adv - tot.apit)}</td>
          <td>${fmt(tot.epf12)}</td>
          <td>${fmt(tot.etf3)}</td>
        </tr></tfoot>
      </table>`;
    } else {
      const d2 = filteredRows
        .filter((r) => n(r.overtimePay) + n(r.holidayOtPay) > 0)
        .map((r) => ({
          r,
          otAmt: n(r.overtimePay) + n(r.holidayOtPay),
        }));
      const tot = d2.reduce(
        (a, d) => ({
          hrs: a.hrs + d.r.overtimeHours,
          ot: a.ot + n(d.r.overtimePay),
          hol: a.hol + n(d.r.holidayOtPay),
          total: a.total + d.otAmt,
        }),
        { hrs: 0, ot: 0, hol: 0, total: 0 },
      );
      tableHtml = `<table>
        <thead><tr class="hdr">
          <th class="l">#</th><th class="l">EPF #</th><th class="l">Name</th><th class="l">Designation</th>
          <th>OT Hours</th><th>Regular OT Pay</th><th>Holiday / Off-Day Pay</th><th>Total OT Cost</th>
        </tr></thead>
        <tbody>${d2
          .map(
            (d, i) => `<tr class="${i % 2 === 0 ? "" : "alt"}">
          <td class="l sm">${i + 1}</td>
          <td class="l">${d.r.employee.epfNumber || d.r.employee.employeeId}</td>
          <td class="l name">${d.r.employee.fullName}</td>
          <td class="l sm">${d.r.employee.designation ?? "-"}</td>
          <td class="b hi">${d.r.overtimeHours.toFixed(2)}</td>
          <td>${fmt(d.r.overtimePay)}</td>
          <td>${fmt(d.r.holidayOtPay)}</td>
          <td class="b hi">${fmt(d.otAmt)}</td>
        </tr>`,
          )
          .join("")}</tbody>
        <tfoot><tr class="tot">
          <td class="l" colspan="4">Total (${d2.length} employees)</td>
          <td>${tot.hrs.toFixed(2)}</td><td>${fmt(tot.ot)}</td>
          <td>${fmt(tot.hol)}</td><td>${fmt(tot.total)}</td>
        </tr></tfoot>
      </table>`;
    }

    const reportTitle =
      tab === "summary" ? "Salary Summary Sheet" : "Overtime Cost Report";
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
      <title>${reportTitle}${branchLabel} â€” ${ml}</title>
      <style>
        @page { size: A3 landscape; margin: 10mm; }
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: Arial, sans-serif; }
        body { background: #fff; color: #1e293b; font-size: 10px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; padding: 12px 16px 10px; border-bottom: 2px solid #1e3a8a; margin-bottom: 10px; }
        .company { font-size: 14px; font-weight: 700; color: #0f172a; }
        .sub { font-size: 10px; color: #64748b; margin-top: 2px; }
        .emp-count { text-align: right; }
        .emp-count .label { font-size: 9px; color: #64748b; }
        .emp-count .num { font-size: 22px; font-weight: 800; color: #1e3a8a; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #1e293b; color: #fff; padding: 5px 4px; text-align: right; font-size: 8px; text-transform: uppercase; letter-spacing: 0.04em; white-space: nowrap; }
        th.l { text-align: left; }
        td { padding: 4px 4px; text-align: right; white-space: nowrap; border-bottom: 1px solid #e2e8f0; font-size: 9.5px; }
        td.l { text-align: left; }
        td.name { max-width: 160px; overflow: hidden; text-overflow: ellipsis; }
        td.sm { font-size: 8.5px; color: #64748b; }
        td.b { font-weight: 700; }
        td.red { color: #dc2626; }
        td.amber { color: #b45309; background: #fef3c7; }
        td.hi { color: #7c3aed; font-weight: 600; }
        td.teal { color: #0f766e; font-weight: 600; }
        td.primary { color: #1e3a8a; font-weight: 700; }
        tr.alt td { background: #f8fafc; }
        tr.tot td { background: #1e293b; color: #fff; font-weight: 700; font-size: 9.5px; border-top: 2px solid #475569; padding: 5px 4px; }
        .footer { display: flex; justify-content: space-between; margin-top: 10px; padding: 6px 0; border-top: 1px solid #e2e8f0; font-size: 8.5px; color: #94a3b8; }
      </style>
    </head><body>
      <div class="header">
        <div>
          <div class="company">Drivethru (Pvt) Ltd${branchTab !== null ? ` â€” ${currentBranchName}` : ""}</div>
          <div class="sub">${reportTitle} â€” ${ml}</div>
        </div>
        <div class="emp-count">
          <div class="label">Total Employees</div>
          <div class="num">${filteredRows.length}</div>
        </div>
      </div>
      ${tableHtml}
      <div class="footer">
        <span>Generated: ${new Date().toLocaleString("en-LK")}</span>
        <span>Drivethru Attendance Management System</span>
      </div>
    </body></html>`;

    const win = window.open("", "_blank", "width=1200,height=800");
    if (!win) {
      alert("Please allow pop-ups to export PDF.");
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
    }, 600);
  };

  /* â”€â”€ Derived columns (from filtered rows) â”€â”€ */
  const derived = filteredRows.map((r) => {
    const allowances =
      n(r.transportAllowance) + n(r.housingAllowance) + n(r.otherAllowances);
    const otAmt = n(r.overtimePay) + n(r.holidayOtPay);
    const lunchInc = n(r.computedLunchIncentive);
    const totalEarnings = n(r.basicSalary) + allowances + otAmt + lunchInc;
    const payDeduction =
      n(r.lateDeduction) +
      n(r.lunchLateDeduction) +
      n(r.absenceDeduction) +
      n(r.halfDayDeduction) +
      n(r.incompleteDeduction);
    const totalForEPF = n(r.basicSalary) + allowances - payDeduction;
    const advance = n(r.loanDeduction);
    const apit = n(r.apit);
    const balancePay =
      totalEarnings - n(r.epfEmployee) - payDeduction - apit;
    const net = totalEarnings - n(r.epfEmployee) - advance - apit;
    return {
      ...r,
      allowances,
      otAmt,
      lunchInc,
      totalEarnings,
      payDeduction,
      totalForEPF,
      advance,
      apit,
      balancePay,
      net,
    };
  });

  /* â”€â”€ Totals â”€â”€ */
  const totals = derived.reduce(
    (acc, r) => ({
      basic: acc.basic + r.basicSalary,
      otHrs: acc.otHrs + r.overtimeHours,
      otAmt: acc.otAmt + r.otAmt,
      lunchInc: acc.lunchInc + r.lunchInc,
      totalEarnings: acc.totalEarnings + r.totalEarnings,
      epf8: acc.epf8 + n(r.epfEmployee),
      payDed: acc.payDed + r.payDeduction,
      totalForEPF: acc.totalForEPF + r.totalForEPF,
      advance: acc.advance + r.advance,
      apit: acc.apit + r.apit,
      balancePay: acc.balancePay + r.balancePay,
      net: acc.net + r.net,
      epf12: acc.epf12 + n(r.epfEmployer),
      etf3: acc.etf3 + n(r.etfEmployer),
    }),
    {
      basic: 0,
      otHrs: 0,
      otAmt: 0,
      lunchInc: 0,
      totalEarnings: 0,
      epf8: 0,
      payDed: 0,
      totalForEPF: 0,
      advance: 0,
      apit: 0,
      balancePay: 0,
      epf12: 0,
      etf3: 0,
    },
  );

  /* â”€â”€ OT tab totals â”€â”€ */
  const otTotals = derived.reduce(
    (acc, r) => ({
      hrs: acc.hrs + r.overtimeHours,
      otPay: acc.otPay + n(r.overtimePay),
      holPay: acc.holPay + n(r.holidayOtPay),
      total: acc.total + r.otAmt,
      epf12OT: acc.epf12OT + n(r.epfEmployer),
      etf3OT: acc.etf3OT + n(r.etfEmployer),
    }),
    { hrs: 0, otPay: 0, holPay: 0, total: 0, epf12OT: 0, etf3OT: 0 },
  );

  const colHead =
    "text-right text-[9px] font-bold text-slate-600 uppercase tracking-wide whitespace-nowrap py-2 px-2 border-b-2 border-slate-300";
  const colLeft =
    "text-left text-[9px] font-bold text-slate-600 uppercase tracking-wide whitespace-nowrap py-2 px-2 border-b-2 border-slate-300";
  const cell = "text-right text-[11px] py-1.5 px-2 whitespace-nowrap";
  const cellL = "text-left  text-[11px] py-1.5 px-2 whitespace-nowrap";
  const totalCell =
    "text-right text-[11px] font-bold py-2 px-2 whitespace-nowrap border-t-2 border-slate-400 bg-slate-50";
  const totalCellL =
    "text-left  text-[11px] font-bold py-2 px-2 whitespace-nowrap border-t-2 border-slate-400 bg-slate-50";

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Toolbar */}
      <div className="print:hidden sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm px-4 py-2 flex items-center gap-3 flex-wrap">
        <button
          onClick={() => navigate("/payroll")}
          className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Payroll
        </button>
        <div className="flex items-center gap-2 ml-4">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white"
          >
            {MONTHS.map((m, i) => (
              <option key={i} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white"
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <button
            onClick={fetchData}
            disabled={loading || regenerating}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
            />
            {loading ? "Loading…" : "Refresh"}
          </button>
          <button
            onClick={regeneratePayroll}
            disabled={loading || regenerating}
            title="Recalculate payroll from attendance — use this after changing holidays, OT settings, or attendance records"
            className="flex items-center gap-1.5 px-3 py-1.5 border border-amber-400 rounded-lg text-sm bg-amber-50 hover:bg-amber-100 text-amber-800 font-medium disabled:opacity-50"
          >
            <Zap
              className={`w-3.5 h-3.5 ${regenerating ? "animate-pulse" : ""}`}
            />
            {regenerating ? "Recalculating…" : "Recalculate"}
          </button>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          {(["summary", "ot"] as ReportTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t ? "bg-primary text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              {t === "summary" ? "Salary Summary" : "OT Cost"}
            </button>
          ))}
          <button
            onClick={exportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold ml-2"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
          </button>
          <button
            onClick={exportPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-semibold"
          >
            <Download className="w-3.5 h-3.5" /> PDF
          </button>
        </div>
      </div>

      {/* Branch Tabs */}
      {activeBranches.length > 1 && (
        <div className="print:hidden bg-white border-b border-slate-200 px-4 flex items-center gap-1 overflow-x-auto">
          <button
            onClick={() => setBranchTab(null)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              branchTab === null
                ? "border-primary text-primary"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            All Branches
            <span
              className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${branchTab === null ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-500"}`}
            >
              {rows.length}
            </span>
          </button>
          {activeBranches.map((b) => {
            const count = rows.filter(
              (r) => r.employee.branchId === b.id,
            ).length;
            const active = branchTab === b.id;
            return (
              <button
                key={b.id}
                onClick={() => setBranchTab(b.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                }`}
              >
                {b.name}
                <span
                  className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${active ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-500"}`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Report content */}
      <div className="p-4">
        <div className="bg-white shadow-sm rounded-xl overflow-hidden max-w-[1400px] mx-auto">
          {/* Print / screen header */}
          <div
            className="print:block"
            style={{
              padding: "18px 24px 12px",
              borderBottom: "2px solid #1e3a8a",
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={drivethruLogo} alt="" className="h-9 print:h-8" />
                <div>
                  <p className="font-bold text-base text-slate-900">
                    Drivethru (Pvt) Ltd
                    {branchTab !== null && (
                      <span className="ml-2 text-sm font-semibold text-primary">
                        â€” {currentBranchName}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500">
                    {tab === "summary"
                      ? "Salary Summary Sheet"
                      : "Overtime Cost Report"}{" "}
                    â€” {monthLabel}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">Total Employees</p>
                <p className="text-2xl font-bold text-primary">
                  {filteredRows.length}
                </p>
              </div>
            </div>
          </div>

          {/* â”€â”€ SALARY SUMMARY TAB â”€â”€ */}
          {tab === "summary" && (
            <div className="overflow-x-auto">
              {derived.length === 0 ? (
                <div className="text-center py-16 text-slate-400 text-sm">
                  {loading
                    ? "Loadingâ€¦"
                    : `No payroll data for ${currentBranchName} in ${monthLabel}`}
                </div>
              ) : (
                <table
                  className="w-full border-collapse"
                  style={{ minWidth: "1200px" }}
                >
                  <thead>
                    <tr className="bg-slate-800">
                      <th
                        className={colLeft
                          .replace("text-slate-600", "text-slate-200")
                          .replace("border-slate-300", "border-slate-600")}
                        style={{ minWidth: 36 }}
                      >
                        #
                      </th>
                      <th
                        className={colHead
                          .replace("text-slate-600", "text-slate-200")
                          .replace("border-slate-300", "border-slate-600")
                          .replace("text-right", "text-left")}
                        style={{ minWidth: 60 }}
                      >
                        EPF #
                      </th>
                      <th
                        className={colHead
                          .replace("text-slate-600", "text-slate-200")
                          .replace("border-slate-300", "border-slate-600")
                          .replace("text-right", "text-left")}
                        style={{ minWidth: 160 }}
                      >
                        Name
                      </th>
                      <th
                        className={colHead
                          .replace("text-slate-600", "text-slate-200")
                          .replace("border-slate-300", "border-slate-600")}
                      >
                        Basic Salary
                      </th>
                      <th
                        className={colHead
                          .replace("text-slate-600", "text-slate-200")
                          .replace("border-slate-300", "border-slate-600")}
                      >
                        OT Hrs
                      </th>
                      <th
                        className={colHead
                          .replace("text-slate-600", "text-slate-200")
                          .replace("border-slate-300", "border-slate-600")}
                      >
                        OT Amount
                      </th>
                      <th
                        className={colHead
                          .replace("text-slate-600", "text-slate-200")
                          .replace("border-slate-300", "border-slate-600")}
                      >
                        Lunch Inc.
                      </th>
                      <th
                        className={colHead
                          .replace("text-slate-600", "text-slate-200")
                          .replace("border-slate-300", "border-slate-600")}
                      >
                        Total Earnings
                      </th>
                      <th
                        className={colHead
                          .replace("text-slate-600", "text-slate-200")
                          .replace("border-slate-300", "border-slate-600")}
                      >
                        EPF 8%
                      </th>
                      <th
                        className={colHead
                          .replace("text-slate-600", "text-slate-200")
                          .replace("border-slate-300", "border-slate-600")}
                      >
                        Total for EPF
                      </th>
                      <th
                        className={colHead
                          .replace("text-slate-600", "text-slate-200")
                          .replace("border-slate-300", "border-slate-600")}
                      >
                        Advance
                      </th>
                      <th
                        className={colHead
                          .replace("text-slate-600", "text-slate-200")
                          .replace("border-slate-300", "border-slate-600")}
                      >
                        APIT
                      </th>
                      <th
                        className={colHead
                          .replace("text-slate-600", "text-slate-200")
                          .replace("border-slate-300", "border-slate-600")}
                      >
                        Balance Pay
                      </th>
                      <th
                        className={colHead
                          .replace("text-slate-600", "text-slate-200")
                          .replace("border-slate-300", "border-slate-600")
                          .replace("text-slate-200", "text-emerald-300")}
                      >
                        Net
                      </th>
                      <th
                        className={colHead
                          .replace("text-slate-600", "text-slate-200")
                          .replace("border-slate-300", "border-slate-600")}
                      >
                        EPF 12%
                      </th>
                      <th
                        className={colHead
                          .replace("text-slate-600", "text-slate-200")
                          .replace("border-slate-300", "border-slate-600")}
                      >
                        ETF 3%
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {derived.map((r, i) => (
                      <tr
                        key={r.id}
                        className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}
                        style={{ borderBottom: "1px solid #e2e8f0" }}
                      >
                        <td className={cellL + " text-slate-400 text-[10px]"}>
                          {i + 1}
                        </td>
                        <td className={cellL + " text-slate-500"}>
                          {r.employee.epfNumber || r.employee.employeeId}
                        </td>
                        <td
                          className={cellL + " font-medium text-slate-800"}
                          style={{ maxWidth: 200 }}
                        >
                          {r.employee.fullName}
                        </td>
                        <td className={cell}>{amtNum(r.basicSalary)}</td>
                        <td className={cell}>
                          {r.overtimeHours > 0
                            ? r.overtimeHours.toFixed(1)
                            : "-"}
                        </td>
                        <td
                          className={
                            cell +
                            (r.otAmt > 0 ? " text-violet-700 font-medium" : "")
                          }
                        >
                          {amtNum(r.otAmt)}
                        </td>
                        <td
                          className={
                            cell +
                            (r.lunchInc > 0 ? " text-teal-700 font-medium" : "")
                          }
                        >
                          {amtNum(r.lunchInc)}
                        </td>
                        <td className={cell + " font-medium"}>
                          {amtNum(r.totalEarnings)}
                        </td>
                        <td className={cell + " text-red-600"}>
                          {amtNum(n(r.epfEmployee))}
                        </td>
                        <td className={cell + " font-medium"}>
                          {amtNum(r.totalForEPF)}
                        </td>
                        <td
                          className={
                            cell +
                            (r.advance > 0
                              ? " text-amber-700 font-medium bg-amber-50"
                              : "")
                          }
                        >
                          {amtNum(r.advance)}
                        </td>
                        <td
                          className={cell + (r.apit > 0 ? " text-red-600" : "")}
                        >
                          {amtNum(r.apit)}
                        </td>
                        <td className={cell + " font-bold text-primary"}>
                          {amtNum(r.balancePay)}
                        </td>
                        <td className={cell + " font-bold text-emerald-700"}>
                          {amtNum(r.net)}
                        </td>
                        <td className={cell + " text-slate-500 text-[10px]"}>
                          {amtNum(n(r.epfEmployer))}
                        </td>
                        <td className={cell + " text-slate-500 text-[10px]"}>
                          {amtNum(n(r.etfEmployer))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-800">
                      <td
                        colSpan={3}
                        className={
                          totalCellL +
                          " text-white bg-slate-800 text-[10px] uppercase tracking-wide"
                        }
                      >
                        Total ({filteredRows.length} employees)
                      </td>
                      <td className={totalCell + " bg-slate-800 text-white"}>
                        {amtNum(totals.basic)}
                      </td>
                      <td className={totalCell + " bg-slate-800 text-white"}>
                        {totals.otHrs > 0 ? totals.otHrs.toFixed(1) : "-"}
                      </td>
                      <td className={totalCell + " bg-slate-800 text-white"}>
                        {amtNum(totals.otAmt)}
                      </td>
                      <td className={totalCell + " bg-slate-800 text-white"}>
                        {amtNum(totals.lunchInc)}
                      </td>
                      <td className={totalCell + " bg-slate-800 text-white"}>
                        {amtNum(totals.totalEarnings)}
                      </td>
                      <td className={totalCell + " bg-slate-800 text-white"}>
                        {amtNum(totals.epf8)}
                      </td>
                      <td className={totalCell + " bg-slate-800 text-white"}>
                        {amtNum(totals.totalForEPF)}
                      </td>
                      <td className={totalCell + " bg-slate-800 text-white"}>
                        {amtNum(totals.advance)}
                      </td>
                      <td className={totalCell + " bg-slate-800 text-white"}>
                        {amtNum(totals.apit)}
                      </td>
                      <td className={totalCell + " bg-slate-800 text-white"}>
                        {amtNum(totals.balancePay)}
                      </td>
                      <td className={totalCell + " bg-emerald-800 text-white font-bold"}>
                        {amtNum(totals.net)}
                      </td>
                      <td
                        className={
                          totalCell + " bg-slate-800 text-white text-[10px]"
                        }
                      >
                        {amtNum(totals.epf12)}
                      </td>
                      <td
                        className={
                          totalCell + " bg-slate-800 text-white text-[10px]"
                        }
                      >
                        {amtNum(totals.etf3)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          )}

          {/* â”€â”€ OT COST TAB â”€â”€ */}
          {tab === "ot" && (
            <div className="overflow-x-auto">
              {derived.filter((r) => r.otAmt > 0).length === 0 ? (
                <div className="text-center py-16 text-slate-400 text-sm">
                  No overtime recorded for {currentBranchName} in {monthLabel}
                </div>
              ) : (
                <table
                  className="w-full border-collapse"
                  style={{ minWidth: "700px" }}
                >
                  <thead>
                    <tr className="bg-slate-800">
                      <th
                        className={colLeft
                          .replace("text-slate-600", "text-slate-200")
                          .replace("border-slate-300", "border-slate-600")}
                        style={{ minWidth: 36 }}
                      >
                        #
                      </th>
                      <th
                        className={colHead
                          .replace("text-slate-600", "text-slate-200")
                          .replace("border-slate-300", "border-slate-600")
                          .replace("text-right", "text-left")}
                        style={{ minWidth: 60 }}
                      >
                        EPF #
                      </th>
                      <th
                        className={colHead
                          .replace("text-slate-600", "text-slate-200")
                          .replace("border-slate-300", "border-slate-600")
                          .replace("text-right", "text-left")}
                        style={{ minWidth: 180 }}
                      >
                        Name
                      </th>
                      <th
                        className={colHead
                          .replace("text-slate-600", "text-slate-200")
                          .replace("border-slate-300", "border-slate-600")
                          .replace("text-right", "text-left")}
                        style={{ minWidth: 140 }}
                      >
                        Designation
                      </th>
                      <th
                        className={colHead
                          .replace("text-slate-600", "text-slate-200")
                          .replace("border-slate-300", "border-slate-600")}
                      >
                        OT Hours
                      </th>
                      <th
                        className={colHead
                          .replace("text-slate-600", "text-slate-200")
                          .replace("border-slate-300", "border-slate-600")}
                      >
                        Regular OT Pay
                      </th>
                      <th
                        className={colHead
                          .replace("text-slate-600", "text-slate-200")
                          .replace("border-slate-300", "border-slate-600")}
                      >
                        Holiday / Off-Day Pay
                      </th>
                      <th
                        className={colHead
                          .replace("text-slate-600", "text-slate-200")
                          .replace("border-slate-300", "border-slate-600")}
                      >
                        Total OT Cost
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {derived
                      .filter((r) => r.otAmt > 0)
                      .map((r, i) => (
                        <tr
                          key={r.id}
                          className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}
                          style={{ borderBottom: "1px solid #e2e8f0" }}
                        >
                          <td className={cellL + " text-slate-400 text-[10px]"}>
                            {i + 1}
                          </td>
                          <td className={cellL + " text-slate-500"}>
                            {r.employee.epfNumber || r.employee.employeeId}
                          </td>
                          <td className={cellL + " font-medium text-slate-800"}>
                            {r.employee.fullName}
                          </td>
                          <td className={cellL + " text-slate-500 text-[10px]"}>
                            {r.employee.designation ?? "-"}
                          </td>
                          <td className={cell + " font-medium text-violet-700"}>
                            {r.overtimeHours.toFixed(2)}
                          </td>
                          <td className={cell}>{amtNum(n(r.overtimePay))}</td>
                          <td className={cell}>{amtNum(n(r.holidayOtPay))}</td>
                          <td className={cell + " font-bold text-violet-700"}>
                            {amtNum(r.otAmt)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-800">
                      <td
                        colSpan={4}
                        className={
                          totalCellL +
                          " text-white bg-slate-800 text-[10px] uppercase tracking-wide"
                        }
                      >
                        Total ({derived.filter((r) => r.otAmt > 0).length}{" "}
                        employees)
                      </td>
                      <td className={totalCell + " bg-slate-800 text-white"}>
                        {otTotals.hrs.toFixed(2)}
                      </td>
                      <td className={totalCell + " bg-slate-800 text-white"}>
                        {amtNum(otTotals.otPay)}
                      </td>
                      <td className={totalCell + " bg-slate-800 text-white"}>
                        {amtNum(otTotals.holPay)}
                      </td>
                      <td className={totalCell + " bg-slate-800 text-white"}>
                        {amtNum(otTotals.total)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-200 flex justify-between items-center">
            <p className="text-[10px] text-slate-400">
              Generated: {new Date().toLocaleString("en-LK")}
            </p>
            <p className="text-[10px] text-slate-400 font-medium">
              Drivethru Attendance Management System
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A3 landscape; margin: 10mm; }
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}
