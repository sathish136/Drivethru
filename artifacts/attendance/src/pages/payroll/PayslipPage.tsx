import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { Printer, ArrowLeft, AlertCircle } from "lucide-react";
import drivethruLogo from "@/assets/drivethru-wave-logo.png";

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

interface PayrollRow {
  id: number;
  month: number;
  year: number;
  workingDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  leaveDays: number;
  holidayDays: number;
  overtimeHours: number;
  basicSalary: number;
  transportAllowance: number;
  housingAllowance: number;
  otherAllowances: number;
  overtimePay: number;
  grossSalary: number;
  epfEmployee: number;
  epfEmployer: number;
  etfEmployer: number;
  apit: number;
  lateDeduction: number;
  lunchLateDeduction: number;
  absenceDeduction: number;
  otherDeductions: number;
  loanDeduction: number;
  totalDeductions: number;
  netSalary: number;
  status: string;
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

  const orgName = "Drivethru (Pvt) Ltd";
  const pvNumber = `PV ${String(row.id).padStart(5, "0")}`;
  const monthLabel = `${MONTHS[row.month - 1]} ${row.year}`;
  const epfNo = row.employee.epfNumber || row.employee.employeeId;

  const allowances    = (row.transportAllowance || 0) + (row.housingAllowance || 0) + (row.otherAllowances || 0);
  const subTotal      = row.basicSalary + allowances;
  const noPayLeave    = row.absenceDeduction || 0;
  const lateDeduction = row.lateDeduction || 0;
  const lunchLateDed  = row.lunchLateDeduction || 0;
  const totalForEPF   = subTotal - noPayLeave - lateDeduction - lunchLateDed;
  const overtime      = row.overtimePay || 0;
  const totalEarnings = totalForEPF + overtime;

  const epf8          = row.epfEmployee || 0;
  const loans         = row.loanDeduction || 0;
  const otherDeds     = row.otherDeductions || 0;
  const apit          = row.apit || 0;
  const totalRecoveries = epf8 + loans + otherDeds + apit;
  const balanceReceived = totalEarnings - totalRecoveries;

  const epf12 = row.epfEmployer || 0;
  const etf3  = row.etfEmployer || 0;

  const lastDay = new Date(row.year, row.month, 0);
  const dateStr = `${String(lastDay.getDate()).padStart(2,"0")}-${String(row.month).padStart(2,"0")}-${row.year}`;
  const lateDayLabel = row.lateDays > 0 ? ` (${row.lateDays} day${row.lateDays !== 1 ? "s" : ""})` : "";

  const generatedAt = new Date().toLocaleString("en-LK", {
    year: "numeric", month: "long", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true,
  });

  type SlipRow = { label: string; value?: string; indent?: boolean; bold?: boolean; italic?: boolean; borderTop?: boolean; borderBottom?: boolean };
  const slipRows: SlipRow[] = [
    { label: "Basic Salary",            value: fmtAmt(row.basicSalary) },
    ...(allowances > 0 ? [{ label: "Allowances", value: fmtAmt(allowances) }] : [{ label: "Holiday Pay", value: "" }]),
    { label: "Sub Total",               value: fmtAmt(subTotal), italic: true, borderTop: true },
    { label: "Less  :  No Pay Leave",   value: noPayLeave > 0 ? fmtAmt(noPayLeave) : "-", italic: true },
    ...(lateDeduction > 0 ? [{ label: `Less  :  Late Arrival${lateDayLabel}`, value: fmtAmt(lateDeduction), italic: true }] : []),
    ...(lunchLateDed > 0 ? [{ label: "Less  :  Lunch Return Late", value: fmtAmt(lunchLateDed), italic: true }] : []),
    { label: "Total for EPF / ETF",     value: fmtAmt(totalForEPF), bold: true },
    { label: "Add  :  Overtime",        value: overtime > 0 ? fmtAmt(overtime) : "", italic: true },
    { label: "Total Earnings",          value: fmtAmt(totalEarnings), borderTop: true },
    { label: "Recoveries  :  EPF 8%",   value: fmtAmt(epf8) },
    ...(loans > 0     ? [{ label: "Loans",              value: fmtAmt(loans),    indent: true }] : []),
    ...(otherDeds > 0 ? [{ label: "Other Deductions",   value: fmtAmt(otherDeds), indent: true }] : []),
    ...(apit > 0      ? [{ label: "APIT (Income Tax)",  value: fmtAmt(apit),     indent: true }] : []),
    { label: "Less  :  Total Recoveries", value: fmtAmt(totalRecoveries), italic: true, borderTop: true },
    { label: "Balance Received",        value: fmtAmt(balanceReceived), bold: true, borderTop: true, borderBottom: true },
    { label: "" },
    { label: "EPF 12%",                 value: fmtAmt(epf12) },
    { label: "EPF 8%",                  value: fmtAmt(epf8) },
    { label: "ETF 3%",                  value: fmtAmt(etf3) },
  ];

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4" style={{ fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif" }}>
      {/* Top toolbar */}
      <div className="print:hidden max-w-[600px] mx-auto mb-4 flex items-center justify-between">
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
          style={{ background: "linear-gradient(135deg,#3a9ec2,#2277a0)" }}
        >
          <Printer className="w-4 h-4" /> Print Payslip
        </button>
      </div>

      {/* Payslip card */}
      <div className="max-w-[600px] mx-auto bg-white shadow-2xl rounded-2xl overflow-hidden">

        {/* Hero header */}
        <div style={{ background: "linear-gradient(135deg,#0e2a3d 0%,#1a4a6e 60%,#3a9ec2 100%)", padding: "28px 32px 22px" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div style={{ background: "rgba(255,255,255,0.12)", borderRadius: "14px", padding: "8px", backdropFilter: "blur(4px)" }}>
                <img src={drivethruLogo} alt="Drivethru" style={{ height: "44px", width: "auto", display: "block" }} />
              </div>
              <div>
                <p style={{ color: "#fff", fontWeight: "700", fontSize: "17px", letterSpacing: "0.01em", lineHeight: 1.2 }}>{orgName}</p>
                <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "11px", fontWeight: "500", letterSpacing: "0.06em", textTransform: "uppercase", marginTop: "3px" }}>Employee Pay Sheet</p>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: "20px", padding: "4px 14px", display: "inline-block", marginBottom: "4px" }}>
                <span style={{ color: "#fff", fontWeight: "700", fontSize: "11px", letterSpacing: "0.08em" }}>OFFICE COPY</span>
              </div>
              <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "10px" }}>Ref: {pvNumber}</p>
            </div>
          </div>
          <div style={{ marginTop: "18px", background: "rgba(255,255,255,0.1)", borderRadius: "10px", padding: "8px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#fff", fontWeight: "700", fontSize: "13px", letterSpacing: "0.06em" }}>PAY SHEET</span>
            <span style={{ color: "#fff", fontWeight: "600", fontSize: "13px" }}>{monthLabel}</span>
          </div>
        </div>

        {/* Employee info strip */}
        <div style={{ background: "#f0f9ff", borderBottom: "1px solid #bae6fd", padding: "14px 32px" }}>
          <div className="flex justify-between items-center">
            <div>
              <p style={{ fontSize: "10px", color: "#64748b", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "2px" }}>Employee Name</p>
              <p style={{ fontSize: "14px", fontWeight: "700", color: "#0e2a3d" }}>{row.employee.fullName}</p>
              <p style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>{row.employee.designation} · {row.employee.department}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: "10px", color: "#64748b", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "2px" }}>EPF No.</p>
              <p style={{ fontSize: "14px", fontWeight: "700", color: "#0e2a3d" }}>{epfNo}</p>
              <p style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>ID: {row.employee.employeeId}</p>
            </div>
          </div>
        </div>

        {/* Payment details table */}
        <div style={{ padding: "20px 32px 0" }}>
          <p style={{ fontSize: "10px", fontWeight: "700", color: "#3a9ec2", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "10px" }}>Payment Details</p>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th style={{ textAlign: "left", padding: "8px 10px", color: "#475569", fontWeight: "600", fontSize: "11px", borderBottom: "2px solid #e2e8f0" }}>Description</th>
                <th style={{ textAlign: "right", padding: "8px 10px", color: "#475569", fontWeight: "600", fontSize: "11px", borderBottom: "2px solid #e2e8f0", width: "140px" }}>Amount (Rs.)</th>
              </tr>
            </thead>
            <tbody>
              {slipRows.map((r, i) => (
                <tr key={i} style={{
                  borderTop: r.borderTop ? "2px solid #e2e8f0" : undefined,
                  borderBottom: r.borderBottom ? "2px solid #e2e8f0" : undefined,
                  background: r.bold && r.borderTop ? "#f0f9ff" : "transparent",
                }}>
                  <td style={{ padding: r.label ? "6px 10px" : "4px 10px", paddingLeft: r.indent ? "28px" : "10px", fontStyle: r.italic ? "italic" : "normal", fontWeight: r.bold ? "700" : "400", color: r.bold ? "#0e2a3d" : "#374151" }}>
                    {r.label}
                  </td>
                  <td style={{ textAlign: "right", padding: "6px 10px", fontStyle: r.italic ? "italic" : "normal", fontWeight: r.bold ? "700" : "400", color: r.bold ? "#0e2a3d" : "#374151", whiteSpace: "nowrap" }}>
                    {r.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Attendance summary */}
        <div className="mx-8 mt-5 mb-1">
          <p style={{ fontSize: "10px", fontWeight: "700", color: "#3a9ec2", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>Attendance Summary</p>
          <div className="grid grid-cols-5 gap-2 text-center">
            {[
              { label: "Working", val: row.workingDays },
              { label: "Present",  val: row.presentDays },
              { label: "Absent",   val: row.absentDays },
              { label: "Late",     val: row.lateDays },
              { label: "OT hrs",   val: row.overtimeHours.toFixed(1) },
            ].map(s => (
              <div key={s.label} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "8px 4px" }}>
                <p style={{ fontSize: "9px", color: "#94a3b8", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.04em" }}>{s.label}</p>
                <p style={{ fontSize: "15px", fontWeight: "700", color: "#0e2a3d", marginTop: "2px" }}>{s.val}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Signature area */}
        <div style={{ padding: "24px 32px 12px" }}>
          <div className="flex justify-between items-end">
            <div>
              <div style={{ borderBottom: "1.5px dotted #94a3b8", minWidth: "160px", height: "28px" }} />
              <p style={{ fontSize: "10px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: "4px" }}>Signature</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ borderBottom: "1.5px dotted #94a3b8", minWidth: "140px", height: "28px", display: "flex", alignItems: "flex-end", justifyContent: "flex-end" }}>
                <span style={{ fontSize: "11px", color: "#475569", paddingBottom: "2px" }}>{dateStr}</span>
              </div>
              <p style={{ fontSize: "10px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: "4px" }}>Date</p>
            </div>
          </div>
          <div style={{ marginTop: "18px" }}>
            <div style={{ borderBottom: "1.5px dotted #94a3b8", minWidth: "160px", height: "28px", display: "inline-block" }} />
            <p style={{ fontSize: "10px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: "4px" }}>Paying Authority</p>
          </div>
        </div>

        {/* Late arrivals / lunch return late note */}
        {(lateDeduction > 0 || lunchLateDed > 0) && (
          <div style={{ margin: "0 32px 12px", padding: "8px 12px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "8px" }}>
            <p style={{ fontSize: "9.5px", color: "#92400e", lineHeight: "1.5", margin: 0 }}>
              <span style={{ fontWeight: "700" }}>Attendance Deductions  ·  </span>
              {lateDeduction > 0 && <>Late arrivals exceeding the grace period are deducted at the per-minute working rate{row.lateDays > 0 && <span> (<strong>{row.lateDays} day{row.lateDays !== 1 ? "s" : ""}</strong>)</span>}. </>}
              {lunchLateDed > 0 && <>Returning late from lunch beyond the allocated break time is also deducted at the per-minute rate. </>}
            </p>
          </div>
        )}

        {/* Footer */}
        <div style={{ background: "#f8fafc", borderTop: "1px solid #e2e8f0", padding: "10px 32px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
          <div style={{ width: "6px", height: "6px", background: "#3a9ec2", borderRadius: "50%", flexShrink: 0 }} />
          <p style={{ fontSize: "9.5px", color: "#94a3b8", textAlign: "center" }}>
            <span style={{ fontWeight: "600", color: "#64748b" }}>System Generated</span>
            &nbsp;·&nbsp;{generatedAt}
            &nbsp;·&nbsp;Drivethru Attendance Management System
          </p>
        </div>

      </div>
    </div>
  );
}
