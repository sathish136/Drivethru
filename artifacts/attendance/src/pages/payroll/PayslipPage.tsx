import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { Printer, ArrowLeft, AlertCircle, Scissors } from "lucide-react";
import drivethruLogo from "@/assets/drivethru-wave-logo.png";
import liveuLogo from "@/assets/liveu-logo.png";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
function apiUrl(path: string) { return `${BASE}/api${path}`; }

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

function fmtAmt(n: number | null | undefined): string {
  if (!n || n === 0) return "";
  return n.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtAmtOrDash(n: number | null | undefined): string {
  if (!n || n === 0) return "-";
  return n.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface PayrollRow {
  id: number;
  month: number;
  year: number;
  workingDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  halfDays: number;
  leaveDays: number;
  holidayDays: number;
  overtimeHours: number;
  basicSalary: number;
  transportAllowance: number;
  lunchIncentive: number;
  housingAllowance: number;
  otherAllowances: number;
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
  status: string;
  activeLoanInstallment?: number;
  computedLunchIncentive?: number;
  reqHoursPerDay?: number | null;
  lateMinutes?: number | null;
  lunchLateMinutes?: number | null;
  incompleteMinutes?: number | null;
  employee: {
    id: number;
    employeeId: string;
    fullName: string;
    designation: string;
    department: string;
    branchId: number;
    epfNumber?: string | null;
    etfNumber?: string | null;
  };
}

interface SlipRow {
  label: string;
  value?: string;
  indent?: boolean;
  bold?: boolean;
  italic?: boolean;
  borderTop?: boolean;
  borderBottom?: boolean;
  highlight?: boolean;
}

function buildSlipRows(row: PayrollRow) {
  const transport    = row.transportAllowance || 0;
  const housing      = row.housingAllowance || 0;
  const otherAllow   = row.otherAllowances || 0;
  const allowances   = transport + housing + otherAllow;
  const subTotal     = row.basicSalary + allowances;
  const noPayLeave   = row.absenceDeduction || 0;
  const halfDayDed   = row.halfDayDeduction || 0;
  const lateDeduction  = row.lateDeduction || 0;
  const lunchLateDed   = row.lunchLateDeduction || 0;
  const earlyExitDed   = row.incompleteDeduction || 0;
  const totalForEPF  = subTotal - noPayLeave - halfDayDed - lateDeduction - lunchLateDed - earlyExitDed;
  const overtimePay  = row.overtimePay || 0;
  const holidayOtPay = row.holidayOtPay || 0;
  const lunchIncentive = row.lunchIncentive || row.computedLunchIncentive || 0;
  const totalEarnings = totalForEPF + overtimePay + holidayOtPay + lunchIncentive;

  const epf8         = row.epfEmployee || 0;
  const loans        = row.loanDeduction || row.activeLoanInstallment || 0;
  const otherDeds    = row.otherDeductions || 0;
  const apit         = row.apit || 0;
  const totalRecoveries = epf8 + loans + otherDeds + apit;
  const balanceReceived = totalEarnings - totalRecoveries;

  const epf12 = row.epfEmployer || 0;
  const etf3  = row.etfEmployer || 0;

  const lateDayLabel = row.lateDays > 0 ? ` (${row.lateDays} day${row.lateDays !== 1 ? "s" : ""})` : "";
  const isEpfEtfExempt = epf8 === 0 && row.grossSalary > 10000;

  const slipRows: SlipRow[] = [
    { label: "Basic Salary",                      value: fmtAmt(row.basicSalary) },
    ...(transport  > 0 ? [{ label: "  Transport Allowance", value: fmtAmt(transport),  indent: true }] : []),
    ...(housing    > 0 ? [{ label: "  Housing Allowance",   value: fmtAmt(housing),    indent: true }] : []),
    ...(otherAllow > 0 ? [{ label: "  Other Allowances",    value: fmtAmt(otherAllow), indent: true }] : []),
    { label: "Sub Total",                         value: fmtAmt(subTotal), italic: true, borderTop: true },
    { label: "Less  :  No Pay Leave",             value: noPayLeave > 0 ? fmtAmt(noPayLeave) : "-", italic: true },
    ...(halfDayDed > 0    ? [{ label: "Less  :  Half Day Deduction",            value: fmtAmt(halfDayDed),    italic: true }] : []),
    ...(lateDeduction > 0 ? [{ label: `Less  :  Late Arrival${lateDayLabel}`,   value: fmtAmt(lateDeduction), italic: true }] : []),
    ...(lunchLateDed > 0  ? [{ label: "Less  :  Lunch Return Late",             value: fmtAmt(lunchLateDed),  italic: true }] : []),
    ...(earlyExitDed > 0  ? [{ label: "Less  :  Early Exit / Short Hours",      value: fmtAmt(earlyExitDed),  italic: true }] : []),
    { label: "Total for EPF / ETF",               value: fmtAmt(totalForEPF), bold: true, borderTop: true, highlight: true },
    { label: "Add  :  Overtime / Holiday Pay",    value: overtimePay > 0 || holidayOtPay > 0 ? fmtAmt(overtimePay + holidayOtPay) : "-", italic: true },
    { label: "Add  :  Lunch Incentive",           value: lunchIncentive > 0 ? fmtAmt(lunchIncentive) : "-", italic: true },
    { label: "Total Earnings",                    value: fmtAmt(totalEarnings), bold: true, borderTop: true },
    { label: isEpfEtfExempt ? "EPF / ETF" : "Recoveries  :  EPF 8%", value: isEpfEtfExempt ? "Exempt" : fmtAmtOrDash(epf8) },
    ...(loans > 0     ? [{ label: "  Loans / Advances",   value: fmtAmt(loans),     indent: true }] : []),
    ...(otherDeds > 0 ? [{ label: "  Other Deductions",   value: fmtAmt(otherDeds), indent: true }] : []),
    ...(apit > 0      ? [{ label: "  APIT (Income Tax)",  value: fmtAmt(apit),      indent: true }] : []),
    { label: "Less  :  Total Recoveries",         value: fmtAmt(totalRecoveries), italic: true, borderTop: true },
    { label: "Balance Received",                  value: fmtAmt(balanceReceived), bold: true, borderTop: true, borderBottom: true },
    { label: "" },
    { label: "EPF 12%  (Employer)",               value: fmtAmt(epf12) },
    { label: "EPF 8%   (Employee)",               value: fmtAmt(epf8) },
    { label: "ETF 3%   (Employer)",               value: fmtAmt(etf3) },
  ];

  return { slipRows, totalEarnings, balanceReceived, epf8, epf12, etf3 };
}

function PayslipCard({ row, copyLabel }: { row: PayrollRow; copyLabel: "OFFICE COPY" | "EMPLOYEE COPY" }) {
  const orgName = "Drivethru (Pvt) Ltd";
  const pvNumber = `PV ${String(row.id).padStart(5, "0")}`;
  const monthLabel = `${MONTHS[row.month - 1]} ${row.year}`;
  const epfNo = row.employee.epfNumber || row.employee.employeeId;
  const lastDay = new Date(row.year, row.month, 0);
  const dateStr = `${String(lastDay.getDate()).padStart(2,"0")}-${String(row.month).padStart(2,"0")}-${row.year}`;
  const generatedAt = new Date().toLocaleString("en-LK", {
    year: "numeric", month: "long", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true,
  });

  const { slipRows } = buildSlipRows(row);

  return (
    <div style={{ background: "white", boxShadow: "0 4px 24px rgba(0,0,0,0.10)", borderRadius: "16px", overflow: "hidden", maxWidth: "680px", margin: "0 auto" }}>

      {/* Hero header */}
      <div style={{ background: "linear-gradient(135deg,#0f172a 0%,#1e3a8a 60%,#2563eb 100%)", padding: "22px 32px 18px" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div style={{ background: "rgba(255,255,255,0.12)", borderRadius: "12px", padding: "7px", backdropFilter: "blur(4px)" }}>
              <img src={drivethruLogo} alt="Drivethru" style={{ height: "40px", width: "auto", display: "block" }} />
            </div>
            <div>
              <p style={{ color: "#fff", fontWeight: "700", fontSize: "16px", letterSpacing: "0.01em", lineHeight: 1.2 }}>{orgName}</p>
              <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "10px", fontWeight: "500", letterSpacing: "0.06em", textTransform: "uppercase", marginTop: "3px" }}>Employee Pay Sheet</p>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ background: copyLabel === "OFFICE COPY" ? "rgba(255,255,255,0.18)" : "rgba(251,191,36,0.25)", borderRadius: "20px", padding: "4px 14px", display: "inline-block", marginBottom: "4px", border: copyLabel === "EMPLOYEE COPY" ? "1px solid rgba(251,191,36,0.5)" : "none" }}>
              <span style={{ color: copyLabel === "EMPLOYEE COPY" ? "#fde68a" : "#fff", fontWeight: "700", fontSize: "11px", letterSpacing: "0.08em" }}>{copyLabel}</span>
            </div>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "10px" }}>Ref: {pvNumber}</p>
          </div>
        </div>
        <div style={{ marginTop: "14px", background: "rgba(255,255,255,0.1)", borderRadius: "10px", padding: "7px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "#fff", fontWeight: "700", fontSize: "13px", letterSpacing: "0.06em" }}>PAY SHEET</span>
          <span style={{ color: "#fff", fontWeight: "600", fontSize: "13px" }}>{monthLabel}</span>
        </div>
      </div>

      {/* Employee info strip */}
      <div style={{ background: "#eff6ff", borderBottom: "1px solid #bfdbfe", padding: "12px 32px" }}>
        <div className="flex justify-between items-center">
          <div>
            <p style={{ fontSize: "10px", color: "#64748b", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "2px" }}>Employee Name</p>
            <p style={{ fontSize: "14px", fontWeight: "700", color: "#1e3a8a" }}>{row.employee.fullName}</p>
            <p style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>{row.employee.designation} · {row.employee.department}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: "10px", color: "#64748b", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "2px" }}>EPF No.</p>
            <p style={{ fontSize: "14px", fontWeight: "700", color: "#1e3a8a" }}>{epfNo}</p>
            <p style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>ID: {row.employee.employeeId}</p>
          </div>
        </div>
      </div>

      {/* Payment Details */}
      <div style={{ padding: "16px 32px 0" }}>
        <p style={{ fontSize: "10px", fontWeight: "700", color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>Payment Details</p>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              <th style={{ textAlign: "left", padding: "7px 10px", color: "#475569", fontWeight: "600", fontSize: "11px", borderBottom: "2px solid #e2e8f0" }}>Description</th>
              <th style={{ textAlign: "right", padding: "7px 10px", color: "#475569", fontWeight: "600", fontSize: "11px", borderBottom: "2px solid #e2e8f0", width: "150px" }}>Amount (Rs.)</th>
            </tr>
          </thead>
          <tbody>
            {slipRows.map((r, i) => (
              <tr key={i} style={{
                borderTop: r.borderTop ? "2px solid #cbd5e1" : undefined,
                borderBottom: r.borderBottom ? "2px solid #cbd5e1" : undefined,
                background: r.highlight ? "#eff6ff" : "transparent",
              }}>
                <td style={{
                  padding: r.label ? "5px 10px" : "3px 10px",
                  paddingLeft: r.indent ? "28px" : "10px",
                  fontStyle: r.italic ? "italic" : "normal",
                  fontWeight: r.bold ? "700" : "400",
                  color: r.bold ? "#1e3a8a" : r.indent ? "#64748b" : "#374151",
                  fontSize: r.indent ? "11px" : "12px",
                }}>
                  {r.label}
                </td>
                <td style={{
                  textAlign: "right",
                  padding: "5px 10px",
                  fontStyle: r.italic ? "italic" : "normal",
                  fontWeight: r.bold ? "700" : "400",
                  color: r.bold ? "#1e3a8a" : r.indent ? "#64748b" : "#374151",
                  whiteSpace: "nowrap",
                  fontSize: r.indent ? "11px" : "12px",
                }}>
                  {r.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Attendance Summary */}
      <div style={{ margin: "14px 32px 4px" }}>
        <p style={{ fontSize: "10px", fontWeight: "700", color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "7px" }}>Attendance Summary</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: "6px", textAlign: "center" }}>
          {[
            { label: "Working",  val: row.workingDays },
            { label: "Present",  val: row.presentDays },
            { label: "Absent",   val: row.absentDays },
            { label: "Late",     val: row.lateDays },
            { label: "Leave",    val: row.leaveDays },
            { label: "OT hrs",   val: (row.overtimeHours || 0).toFixed(1) },
          ].map(s => (
            <div key={s.label} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "6px 2px" }}>
              <p style={{ fontSize: "8.5px", color: "#94a3b8", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.04em" }}>{s.label}</p>
              <p style={{ fontSize: "14px", fontWeight: "700", color: "#1e3a8a", marginTop: "2px" }}>{s.val}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Signature area */}
      <div style={{ padding: "16px 32px 10px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div style={{ borderBottom: "1.5px dotted #94a3b8", minWidth: "160px", height: "26px" }} />
            <p style={{ fontSize: "10px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: "4px" }}>Signature</p>
          </div>
          <div>
            <div style={{ borderBottom: "1.5px dotted #94a3b8", minWidth: "160px", height: "26px" }} />
            <p style={{ fontSize: "10px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: "4px" }}>Paying Authority</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ borderBottom: "1.5px dotted #94a3b8", minWidth: "120px", height: "26px", display: "flex", alignItems: "flex-end", justifyContent: "flex-end" }}>
              <span style={{ fontSize: "11px", color: "#475569", paddingBottom: "2px" }}>{dateStr}</span>
            </div>
            <p style={{ fontSize: "10px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: "4px" }}>Date</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: "#f8fafc", borderTop: "1px solid #e2e8f0", padding: "8px 32px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", marginBottom: "4px" }}>
          <div style={{ width: "5px", height: "5px", background: "#3a9ec2", borderRadius: "50%" }} />
          <p style={{ fontSize: "9px", color: "#94a3b8", textAlign: "center" }}>
            <span style={{ fontWeight: "600", color: "#64748b" }}>System Generated</span>
            &nbsp;·&nbsp;{generatedAt}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", borderTop: "1px dashed #e2e8f0", paddingTop: "5px" }}>
          <span style={{ fontSize: "8px", color: "#94a3b8", letterSpacing: "0.04em" }}>Powered by</span>
          <img src={liveuLogo} alt="Live U" style={{ height: "12px", width: "auto", display: "block", opacity: 0.75 }} />
          <span style={{ fontSize: "8px", color: "#64748b", fontWeight: "600" }}>Live U Pvt Ltd</span>
        </div>
      </div>
    </div>
  );
}

export default function PayslipPage() {
  const [, params] = useRoute("/payroll/payslip/:id");
  const [, navigate] = useLocation();
  const [row, setRow] = useState<PayrollRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = params?.id;
    if (!id) { setError("No payslip ID provided."); setLoading(false); return; }
    fetch(apiUrl(`/payroll/${id}`))
      .then(r => { if (!r.ok) throw new Error("Not found"); return r.json(); })
      .then(data => { setRow(data); setLoading(false); })
      .catch(() => { setError("Failed to load payslip. The record may not exist."); setLoading(false); });
  }, [params?.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Loading payslip…</p>
        </div>
      </div>
    );
  }

  if (error || !row) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center max-w-sm">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="font-semibold text-slate-700 mb-1">Payslip Not Found</p>
          <p className="text-slate-500 text-sm mb-4">{error}</p>
          <button
            onClick={() => navigate("/payroll")}
            className="text-sm text-primary hover:underline flex items-center gap-1 mx-auto"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Payroll
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4" style={{ fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif" }}>

      {/* Top toolbar */}
      <div className="print:hidden max-w-[680px] mx-auto mb-4 flex items-center justify-between">
        <button
          onClick={() => navigate("/payroll")}
          className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Payroll
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-all hover:opacity-90 shadow"
          style={{ background: "linear-gradient(135deg,#2563eb,#1d4ed8)" }}
        >
          <Printer className="w-4 h-4" /> Print Both Copies
        </button>
      </div>

      {/* Office Copy */}
      <div className="mb-0">
        <PayslipCard row={row} copyLabel="OFFICE COPY" />
      </div>

      {/* Cut line separator */}
      <div className="max-w-[680px] mx-auto my-5 flex items-center gap-3 print:my-4">
        <div style={{ flex: 1, borderTop: "2px dashed #94a3b8" }} />
        <div className="flex items-center gap-1.5 text-slate-400 print:text-gray-400">
          <Scissors className="w-4 h-4 rotate-90" />
          <span style={{ fontSize: "10px", fontWeight: "600", letterSpacing: "0.1em", textTransform: "uppercase" }}>Cut Here</span>
          <Scissors className="w-4 h-4 -rotate-90" />
        </div>
        <div style={{ flex: 1, borderTop: "2px dashed #94a3b8" }} />
      </div>

      {/* Employee Copy */}
      <div>
        <PayslipCard row={row} copyLabel="EMPLOYEE COPY" />
      </div>

    </div>
  );
}
