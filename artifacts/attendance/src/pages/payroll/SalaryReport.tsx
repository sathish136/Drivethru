import { useState, useEffect, useCallback } from "react";
import { useLocation, useSearch } from "wouter";
import { ArrowLeft, Printer, RefreshCw, Download, FileSpreadsheet } from "lucide-react";
import drivethruLogo from "@/assets/drivethru-wave-logo.png";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
function apiUrl(path: string) { return `${BASE}/api${path}`; }

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

function n(v: number | null | undefined) { return v ?? 0; }
function amt(v: number | null | undefined) {
  const x = n(v);
  if (x === 0) return "-";
  return x.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function amtNum(v: number | null | undefined) {
  const x = v ?? 0;
  if (x === 0) return "-";
  return x.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
  };
}

type ReportTab = "summary" | "ot";

export default function SalaryReport() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);

  const now = new Date();
  const [month, setMonth] = useState(Number(params.get("month") || now.getMonth() + 1));
  const [year,  setYear]  = useState(Number(params.get("year")  || now.getFullYear()));
  const [tab,   setTab]   = useState<ReportTab>("summary");
  const [rows,  setRows]  = useState<PayrollRow[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(apiUrl(`/payroll?month=${month}&year=${year}&limit=500`));
      const d = await r.json();
      setRows(Array.isArray(d) ? d : (d.data ?? []));
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const monthLabel2 = `${MONTHS[month - 1]}_${year}`;

  const exportExcel = () => {
    const derived2 = rows.map(r => {
      const allowances    = n(r.transportAllowance) + n(r.housingAllowance) + n(r.otherAllowances);
      const otAmt         = n(r.overtimePay) + n(r.holidayOtPay);
      const totalEarnings = n(r.basicSalary) + allowances + otAmt;
      const payDeduction  = n(r.lateDeduction) + n(r.lunchLateDeduction) + n(r.absenceDeduction) + n(r.halfDayDeduction) + n(r.incompleteDeduction);
      const totalForEPF   = n(r.basicSalary) + allowances - payDeduction;
      const advance       = n(r.loanDeduction);
      const apit          = n(r.apit);
      const balancePay    = totalEarnings - n(r.epfEmployee) - payDeduction - advance - apit;
      return { r, allowances, otAmt, totalEarnings, payDeduction, totalForEPF, advance, apit, balancePay };
    });

    if (tab === "summary") {
      const headers = ["#","EPF #","Name","Basic Salary","OT Hrs","OT Amount","Total Earnings","EPF 8%","Deduction","Total for EPF","Advance","APIT","Balance Pay","EPF 12%","ETF 3%"];
      const dataRows = derived2.map((d, i) => [
        i + 1,
        d.r.employee.epfNumber || d.r.employee.employeeId,
        d.r.employee.fullName,
        n(d.r.basicSalary).toFixed(2),
        d.r.overtimeHours > 0 ? d.r.overtimeHours.toFixed(1) : "",
        d.otAmt > 0 ? d.otAmt.toFixed(2) : "",
        d.totalEarnings.toFixed(2),
        n(d.r.epfEmployee).toFixed(2),
        d.payDeduction > 0 ? d.payDeduction.toFixed(2) : "",
        d.totalForEPF.toFixed(2),
        d.advance > 0 ? d.advance.toFixed(2) : "",
        d.apit > 0 ? d.apit.toFixed(2) : "",
        d.balancePay.toFixed(2),
        n(d.r.epfEmployer).toFixed(2),
        n(d.r.etfEmployer).toFixed(2),
      ]);
      const csv = [headers, ...dataRows].map(row => row.map(v => `"${v}"`).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `Salary_Summary_${monthLabel2}.csv`; a.click(); URL.revokeObjectURL(url);
    } else {
      const headers = ["#","EPF #","Name","Department","OT Hours","Regular OT Pay","Holiday OT Pay","Total OT Pay","EPF 12%","ETF 3%"];
      const dataRows = derived2.filter(d => d.otAmt > 0).map((d, i) => [
        i + 1,
        d.r.employee.epfNumber || d.r.employee.employeeId,
        d.r.employee.fullName,
        (d.r.employee as any).department || "",
        d.r.overtimeHours.toFixed(2),
        n(d.r.overtimePay).toFixed(2),
        n(d.r.holidayOtPay).toFixed(2),
        d.otAmt.toFixed(2),
        n(d.r.epfEmployer).toFixed(2),
        n(d.r.etfEmployer).toFixed(2),
      ]);
      const csv = [headers, ...dataRows].map(row => row.map(v => `"${v}"`).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `OT_Cost_Report_${monthLabel2}.csv`; a.click(); URL.revokeObjectURL(url);
    }
  };


  const monthLabel = `${MONTHS[month - 1]} ${year}`;

  /* ── Derived columns ── */
  const derived = rows.map(r => {
    const allowances      = n(r.transportAllowance) + n(r.housingAllowance) + n(r.otherAllowances);
    const otAmt           = n(r.overtimePay) + n(r.holidayOtPay);
    const totalEarnings   = n(r.basicSalary) + allowances + otAmt;
    const payDeduction    = n(r.lateDeduction) + n(r.lunchLateDeduction) + n(r.absenceDeduction) + n(r.halfDayDeduction) + n(r.incompleteDeduction);
    const totalForEPF     = n(r.basicSalary) + allowances - payDeduction;
    const advance         = n(r.loanDeduction);
    const apit            = n(r.apit);
    const balancePay      = totalEarnings - n(r.epfEmployee) - payDeduction - advance - apit;
    return { ...r, allowances, otAmt, totalEarnings, payDeduction, totalForEPF, advance, apit, balancePay };
  });

  /* ── Totals ── */
  const totals = derived.reduce((acc, r) => ({
    basic:        acc.basic        + r.basicSalary,
    otHrs:        acc.otHrs        + r.overtimeHours,
    otAmt:        acc.otAmt        + r.otAmt,
    totalEarnings:acc.totalEarnings+ r.totalEarnings,
    epf8:         acc.epf8         + n(r.epfEmployee),
    payDed:       acc.payDed       + r.payDeduction,
    totalForEPF:  acc.totalForEPF  + r.totalForEPF,
    advance:      acc.advance      + r.advance,
    apit:         acc.apit         + r.apit,
    balancePay:   acc.balancePay   + r.balancePay,
    epf12:        acc.epf12        + n(r.epfEmployer),
    etf3:         acc.etf3         + n(r.etfEmployer),
  }), { basic:0, otHrs:0, otAmt:0, totalEarnings:0, epf8:0, payDed:0, totalForEPF:0, advance:0, apit:0, balancePay:0, epf12:0, etf3:0 });

  /* ── OT tab totals ── */
  const otTotals = derived.reduce((acc, r) => ({
    hrs:       acc.hrs       + r.overtimeHours,
    otPay:     acc.otPay     + n(r.overtimePay),
    holPay:    acc.holPay    + n(r.holidayOtPay),
    total:     acc.total     + r.otAmt,
    epf12OT:   acc.epf12OT   + n(r.epfEmployer),
    etf3OT:    acc.etf3OT    + n(r.etfEmployer),
  }), { hrs:0, otPay:0, holPay:0, total:0, epf12OT:0, etf3OT:0 });

  const colHead = "text-right text-[9px] font-bold text-slate-600 uppercase tracking-wide whitespace-nowrap py-2 px-2 border-b-2 border-slate-300";
  const colLeft = "text-left text-[9px] font-bold text-slate-600 uppercase tracking-wide whitespace-nowrap py-2 px-2 border-b-2 border-slate-300";
  const cell    = "text-right text-[11px] py-1.5 px-2 whitespace-nowrap";
  const cellL   = "text-left  text-[11px] py-1.5 px-2 whitespace-nowrap";
  const totalCell = "text-right text-[11px] font-bold py-2 px-2 whitespace-nowrap border-t-2 border-slate-400 bg-slate-50";
  const totalCellL= "text-left  text-[11px] font-bold py-2 px-2 whitespace-nowrap border-t-2 border-slate-400 bg-slate-50";

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Toolbar (screen only) */}
      <div className="print:hidden sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm px-4 py-2 flex items-center gap-3">
        <button
          onClick={() => navigate("/payroll")}
          className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Payroll
        </button>
        <div className="flex items-center gap-2 ml-4">
          <select value={month} onChange={e => setMonth(Number(e.target.value))}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white">
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white">
            {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={fetchData} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white hover:bg-slate-50 disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          {(["summary","ot"] as ReportTab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t ? "bg-primary text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              {t === "summary" ? "Salary Summary" : "OT Cost"}
            </button>
          ))}
          <button onClick={exportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold ml-2">
            <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
          </button>
          <button onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-semibold">
            <Download className="w-3.5 h-3.5" /> PDF
          </button>
        </div>
      </div>

      {/* Report content */}
      <div className="p-4">
        <div className="bg-white shadow-sm rounded-xl overflow-hidden max-w-[1400px] mx-auto">

          {/* Print header */}
          <div className="print:block" style={{ padding: "18px 24px 12px", borderBottom: "2px solid #1e3a8a" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={drivethruLogo} alt="" className="h-9 print:h-8" />
                <div>
                  <p className="font-bold text-base text-slate-900">Drivethru (Pvt) Ltd</p>
                  <p className="text-xs text-slate-500">
                    {tab === "summary" ? "Salary Summary Sheet" : "Overtime Cost Report"} — {monthLabel}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">Total Employees</p>
                <p className="text-2xl font-bold text-primary">{rows.length}</p>
              </div>
            </div>
          </div>

          {/* ── SALARY SUMMARY TAB ── */}
          {tab === "summary" && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse" style={{ minWidth: "1200px" }}>
                <thead>
                  <tr className="bg-slate-800">
                    <th className={colLeft.replace("text-slate-600","text-slate-200").replace("border-slate-300","border-slate-600")} style={{ minWidth: 36 }}>#</th>
                    <th className={colHead.replace("text-slate-600","text-slate-200").replace("border-slate-300","border-slate-600").replace("text-right","text-left")} style={{ minWidth: 60 }}>EPF #</th>
                    <th className={colHead.replace("text-slate-600","text-slate-200").replace("border-slate-300","border-slate-600").replace("text-right","text-left")} style={{ minWidth: 160 }}>Name</th>
                    <th className={colHead.replace("text-slate-600","text-slate-200").replace("border-slate-300","border-slate-600")}>Basic Salary</th>
                    <th className={colHead.replace("text-slate-600","text-slate-200").replace("border-slate-300","border-slate-600")}>OT Hrs</th>
                    <th className={colHead.replace("text-slate-600","text-slate-200").replace("border-slate-300","border-slate-600")}>OT Amount</th>
                    <th className={colHead.replace("text-slate-600","text-slate-200").replace("border-slate-300","border-slate-600")}>Total Earnings</th>
                    <th className={colHead.replace("text-slate-600","text-slate-200").replace("border-slate-300","border-slate-600")}>EPF 8%</th>
                    <th className={colHead.replace("text-slate-600","text-slate-200").replace("border-slate-300","border-slate-600")}>Deduction</th>
                    <th className={colHead.replace("text-slate-600","text-slate-200").replace("border-slate-300","border-slate-600")}>Total for EPF</th>
                    <th className={colHead.replace("text-slate-600","text-slate-200").replace("border-slate-300","border-slate-600")}>Advance</th>
                    <th className={colHead.replace("text-slate-600","text-slate-200").replace("border-slate-300","border-slate-600")}>APIT</th>
                    <th className={colHead.replace("text-slate-600","text-slate-200").replace("border-slate-300","border-slate-600")}>Balance Pay</th>
                    <th className={colHead.replace("text-slate-600","text-slate-200").replace("border-slate-300","border-slate-600")}>EPF 12%</th>
                    <th className={colHead.replace("text-slate-600","text-slate-200").replace("border-slate-300","border-slate-600")}>ETF 3%</th>
                  </tr>
                </thead>
                <tbody>
                  {derived.map((r, i) => (
                    <tr key={r.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"} style={{ borderBottom: "1px solid #e2e8f0" }}>
                      <td className={cellL + " text-slate-400 text-[10px]"}>{i + 1}</td>
                      <td className={cellL + " text-slate-500"}>{r.employee.epfNumber || r.employee.employeeId}</td>
                      <td className={cellL + " font-medium text-slate-800"} style={{ maxWidth: 200 }}>{r.employee.fullName}</td>
                      <td className={cell}>{amtNum(r.basicSalary)}</td>
                      <td className={cell}>{r.overtimeHours > 0 ? r.overtimeHours.toFixed(1) : "-"}</td>
                      <td className={cell + (r.otAmt > 0 ? " text-violet-700 font-medium" : "")}>{amtNum(r.otAmt)}</td>
                      <td className={cell + " font-medium"}>{amtNum(r.totalEarnings)}</td>
                      <td className={cell + " text-red-600"}>{amtNum(n(r.epfEmployee))}</td>
                      <td className={cell + (r.payDeduction > 0 ? " text-red-600" : "")}>{amtNum(r.payDeduction)}</td>
                      <td className={cell + " font-medium"}>{amtNum(r.totalForEPF)}</td>
                      <td className={cell + (r.advance > 0 ? " text-amber-700 font-medium bg-amber-50" : "")}>{amtNum(r.advance)}</td>
                      <td className={cell + (r.apit > 0 ? " text-red-600" : "")}>{amtNum(r.apit)}</td>
                      <td className={cell + " font-bold text-primary"}>{amtNum(r.balancePay)}</td>
                      <td className={cell + " text-slate-500 text-[10px]"}>{amtNum(n(r.epfEmployer))}</td>
                      <td className={cell + " text-slate-500 text-[10px]"}>{amtNum(n(r.etfEmployer))}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-800">
                    <td colSpan={3} className={totalCellL + " text-white bg-slate-800 text-[10px] uppercase tracking-wide"}>Total ({rows.length} employees)</td>
                    <td className={totalCell + " bg-slate-800 text-white"}>{amtNum(totals.basic)}</td>
                    <td className={totalCell + " bg-slate-800 text-white"}>{totals.otHrs > 0 ? totals.otHrs.toFixed(1) : "-"}</td>
                    <td className={totalCell + " bg-slate-800 text-white"}>{amtNum(totals.otAmt)}</td>
                    <td className={totalCell + " bg-slate-800 text-white"}>{amtNum(totals.totalEarnings)}</td>
                    <td className={totalCell + " bg-slate-800 text-white"}>{amtNum(totals.epf8)}</td>
                    <td className={totalCell + " bg-slate-800 text-white"}>{amtNum(totals.payDed)}</td>
                    <td className={totalCell + " bg-slate-800 text-white"}>{amtNum(totals.totalForEPF)}</td>
                    <td className={totalCell + " bg-slate-800 text-white"}>{amtNum(totals.advance)}</td>
                    <td className={totalCell + " bg-slate-800 text-white"}>{amtNum(totals.apit)}</td>
                    <td className={totalCell + " bg-slate-800 text-white"}>{amtNum(totals.balancePay)}</td>
                    <td className={totalCell + " bg-slate-800 text-white text-[10px]"}>{amtNum(totals.epf12)}</td>
                    <td className={totalCell + " bg-slate-800 text-white text-[10px]"}>{amtNum(totals.etf3)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* ── OT COST TAB ── */}
          {tab === "ot" && (
            <div className="overflow-x-auto">
              {derived.filter(r => r.otAmt > 0).length === 0 ? (
                <div className="text-center py-16 text-slate-400 text-sm">No overtime recorded for {monthLabel}</div>
              ) : (
                <table className="w-full border-collapse" style={{ minWidth: "700px" }}>
                  <thead>
                    <tr className="bg-slate-800">
                      <th className={colLeft.replace("text-slate-600","text-slate-200").replace("border-slate-300","border-slate-600")} style={{ minWidth: 36 }}>#</th>
                      <th className={colHead.replace("text-slate-600","text-slate-200").replace("border-slate-300","border-slate-600").replace("text-right","text-left")} style={{ minWidth: 60 }}>EPF #</th>
                      <th className={colHead.replace("text-slate-600","text-slate-200").replace("border-slate-300","border-slate-600").replace("text-right","text-left")} style={{ minWidth: 180 }}>Name</th>
                      <th className={colHead.replace("text-slate-600","text-slate-200").replace("border-slate-300","border-slate-600").replace("text-right","text-left")} style={{ minWidth: 140 }}>Designation</th>
                      <th className={colHead.replace("text-slate-600","text-slate-200").replace("border-slate-300","border-slate-600")}>OT Hours</th>
                      <th className={colHead.replace("text-slate-600","text-slate-200").replace("border-slate-300","border-slate-600")}>Regular OT Pay</th>
                      <th className={colHead.replace("text-slate-600","text-slate-200").replace("border-slate-300","border-slate-600")}>Holiday / Off-Day Pay</th>
                      <th className={colHead.replace("text-slate-600","text-slate-200").replace("border-slate-300","border-slate-600")}>Total OT Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {derived.filter(r => r.otAmt > 0).map((r, i) => (
                      <tr key={r.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"} style={{ borderBottom: "1px solid #e2e8f0" }}>
                        <td className={cellL + " text-slate-400 text-[10px]"}>{i + 1}</td>
                        <td className={cellL + " text-slate-500"}>{r.employee.epfNumber || r.employee.employeeId}</td>
                        <td className={cellL + " font-medium text-slate-800"}>{r.employee.fullName}</td>
                        <td className={cellL + " text-slate-500 text-[10px]"}>{r.employee.designation ?? "-"}</td>
                        <td className={cell + " font-medium text-violet-700"}>{r.overtimeHours.toFixed(2)}</td>
                        <td className={cell}>{amtNum(n(r.overtimePay))}</td>
                        <td className={cell}>{amtNum(n(r.holidayOtPay))}</td>
                        <td className={cell + " font-bold text-violet-700"}>{amtNum(r.otAmt)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-800">
                      <td colSpan={4} className={totalCellL + " text-white bg-slate-800 text-[10px] uppercase tracking-wide"}>
                        Total ({derived.filter(r => r.otAmt > 0).length} employees)
                      </td>
                      <td className={totalCell + " bg-slate-800 text-white"}>{otTotals.hrs.toFixed(2)}</td>
                      <td className={totalCell + " bg-slate-800 text-white"}>{amtNum(otTotals.otPay)}</td>
                      <td className={totalCell + " bg-slate-800 text-white"}>{amtNum(otTotals.holPay)}</td>
                      <td className={totalCell + " bg-slate-800 text-white"}>{amtNum(otTotals.total)}</td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-200 flex justify-between items-center">
            <p className="text-[10px] text-slate-400">Generated: {new Date().toLocaleString("en-LK")}</p>
            <p className="text-[10px] text-slate-400 font-medium">Drivethru Attendance Management System</p>
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
