import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { Printer, ArrowLeft, AlertCircle } from "lucide-react";
import drivethruLogo from "@/assets/drivethru-wave-logo.png";
import liveuLogo from "@/assets/liveu-logo.png";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
function apiUrl(path: string) { return `${BASE}/api${path}`; }

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

function fmt(n: number | null | undefined): string {
  if (!n || n === 0) return "—";
  return n.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtZ(n: number | null | undefined): string {
  if (!n) return "—";
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

/* Pill badge helper */
function Pill({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{ background: color === "blue" ? "#eff6ff" : color === "green" ? "#f0fdf4" : color === "red" ? "#fef2f2" : color === "amber" ? "#fffbeb" : "#f8fafc", border: `1px solid ${color === "blue" ? "#bfdbfe" : color === "green" ? "#bbf7d0" : color === "red" ? "#fecaca" : color === "amber" ? "#fde68a" : "#e2e8f0"}`, borderRadius: "10px", padding: "7px 6px", textAlign: "center" as const }}>
      <p style={{ fontSize: "8.5px", color: "#94a3b8", fontWeight: "600", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>{label}</p>
      <p style={{ fontSize: "15px", fontWeight: "800", color: color === "blue" ? "#1e3a8a" : color === "green" ? "#15803d" : color === "red" ? "#b91c1c" : color === "amber" ? "#b45309" : "#1e293b", marginTop: "1px" }}>{value}</p>
    </div>
  );
}

/* Section heading */
function SectionHead({ icon, label, color }: { icon: string; label: string; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "6px" }}>
      <span style={{ fontSize: "13px" }}>{icon}</span>
      <p style={{ fontSize: "9.5px", fontWeight: "800", color, textTransform: "uppercase" as const, letterSpacing: "0.1em" }}>{label}</p>
    </div>
  );
}

/* Single row in a section table */
function Row({ label, value, indent, bold, italic, borderTop, negative, highlight }: {
  label: string; value?: string; indent?: boolean; bold?: boolean; italic?: boolean;
  borderTop?: boolean; negative?: boolean; highlight?: boolean;
}) {
  return (
    <tr style={{
      borderTop: borderTop ? "1.5px solid #e2e8f0" : undefined,
      background: highlight ? "#f0fdf4" : "transparent",
    }}>
      <td style={{ padding: "5px 10px", paddingLeft: indent ? "24px" : "10px", fontStyle: italic ? "italic" : "normal", fontWeight: bold ? "700" : indent ? "400" : "500", color: bold ? "#1e3a8a" : indent ? "#64748b" : "#374151", fontSize: indent ? "11px" : "12px" }}>
        {label}
      </td>
      <td style={{ textAlign: "right" as const, padding: "5px 10px", fontStyle: italic ? "italic" : "normal", fontWeight: bold ? "700" : "400", color: bold ? "#1e3a8a" : negative ? "#dc2626" : indent ? "#64748b" : "#374151", whiteSpace: "nowrap" as const, fontSize: indent ? "11px" : "12px" }}>
        {value ?? ""}
      </td>
    </tr>
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
          <button onClick={() => navigate("/payroll")} className="text-sm text-primary hover:underline flex items-center gap-1 mx-auto">
            <ArrowLeft className="w-4 h-4" /> Back to Payroll
          </button>
        </div>
      </div>
    );
  }

  const orgName    = "Drivethru (Pvt) Ltd";
  const pvNumber   = `PV ${String(row.id).padStart(5, "0")}`;
  const monthLabel = `${MONTHS[row.month - 1]} ${row.year}`;
  const epfNo      = row.employee.epfNumber || row.employee.employeeId;

  /* ── Earnings ── */
  const transport  = row.transportAllowance || 0;
  const lunch      = row.lunchIncentive || row.computedLunchIncentive || 0;
  const housing    = row.housingAllowance || 0;
  const otherAllow = row.otherAllowances || 0;
  const allowances = transport + lunch + housing + otherAllow;
  const subTotal   = row.basicSalary + allowances;

  /* ── Deductions before EPF ── */
  const noPayLeave   = row.absenceDeduction   || 0;
  const halfDayDed   = row.halfDayDeduction   || 0;
  const lateDeduction  = row.lateDeduction    || 0;
  const lunchLateDed   = row.lunchLateDeduction || 0;
  const earlyExitDed   = row.incompleteDeduction || 0;
  const totalForEPF  = subTotal - noPayLeave - halfDayDed - lateDeduction - lunchLateDed - earlyExitDed;

  /* ── Additions after EPF base ── */
  const otPay      = row.overtimePay  || 0;
  const holPay     = row.holidayOtPay || 0;
  const totalEarnings = totalForEPF + otPay + holPay;

  /* ── Recoveries ── */
  const epf8    = row.epfEmployee  || 0;
  const loans   = row.loanDeduction || row.activeLoanInstallment || 0;
  const otherDeds = row.otherDeductions || 0;
  const apit    = row.apit || 0;
  const totalRecoveries = epf8 + loans + otherDeds + apit;
  const balanceReceived = totalEarnings - totalRecoveries;

  /* ── Employer contributions ── */
  const epf12 = row.epfEmployer || 0;
  const etf3  = row.etfEmployer || 0;

  const lastDay = new Date(row.year, row.month, 0);
  const dateStr = `${String(lastDay.getDate()).padStart(2,"0")}-${String(row.month).padStart(2,"0")}-${row.year}`;

  const generatedAt = new Date().toLocaleString("en-LK", {
    year: "numeric", month: "long", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true,
  });

  const lateDayLabel = row.lateDays > 0 ? ` (${row.lateDays} day${row.lateDays !== 1 ? "s" : ""})` : "";

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4" style={{ fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif" }}>

      {/* Top toolbar */}
      <div className="print:hidden max-w-[700px] mx-auto mb-4 flex items-center justify-between">
        <button onClick={() => navigate("/payroll")} className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Payroll
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-all hover:opacity-90 shadow"
          style={{ background: "linear-gradient(135deg,#2563eb,#1d4ed8)" }}
        >
          <Printer className="w-4 h-4" /> Print Payslip
        </button>
      </div>

      {/* ═══════════════════════════ PAYSLIP CARD ═══════════════════════════ */}
      <div className="max-w-[700px] mx-auto bg-white shadow-2xl rounded-2xl overflow-hidden">

        {/* ── Hero header ── */}
        <div style={{ background: "linear-gradient(135deg,#0f172a 0%,#1e3a8a 60%,#2563eb 100%)", padding: "26px 30px 20px" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div style={{ background: "rgba(255,255,255,0.12)", borderRadius: "14px", padding: "8px", backdropFilter: "blur(4px)" }}>
                <img src={drivethruLogo} alt="Drivethru" style={{ height: "42px", width: "auto", display: "block" }} />
              </div>
              <div>
                <p style={{ color: "#fff", fontWeight: "700", fontSize: "16px", lineHeight: 1.2 }}>{orgName}</p>
                <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "10px", fontWeight: "600", letterSpacing: "0.07em", textTransform: "uppercase", marginTop: "3px" }}>Employee Pay Sheet</p>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: "20px", padding: "4px 14px", display: "inline-block", marginBottom: "4px" }}>
                <span style={{ color: "#fff", fontWeight: "700", fontSize: "10px", letterSpacing: "0.08em" }}>OFFICE COPY</span>
              </div>
              <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "10px" }}>Ref: {pvNumber}</p>
            </div>
          </div>
          <div style={{ marginTop: "16px", background: "rgba(255,255,255,0.1)", borderRadius: "10px", padding: "8px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#fff", fontWeight: "700", fontSize: "13px", letterSpacing: "0.06em" }}>PAY SHEET</span>
            <span style={{ color: "#fff", fontWeight: "600", fontSize: "13px" }}>{monthLabel}</span>
          </div>
        </div>

        {/* ── Employee info strip ── */}
        <div style={{ background: "#eff6ff", borderBottom: "1px solid #bfdbfe", padding: "14px 30px" }}>
          <div className="flex justify-between items-center">
            <div>
              <p style={{ fontSize: "9.5px", color: "#64748b", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "2px" }}>Employee Name</p>
              <p style={{ fontSize: "15px", fontWeight: "800", color: "#1e3a8a" }}>{row.employee.fullName}</p>
              <p style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>{row.employee.designation} · {row.employee.department}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: "9.5px", color: "#64748b", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "2px" }}>EPF No.</p>
              <p style={{ fontSize: "15px", fontWeight: "800", color: "#1e3a8a" }}>{epfNo}</p>
              <p style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>ID: {row.employee.employeeId}</p>
            </div>
          </div>
        </div>

        {/* ── Attendance pills ── */}
        <div style={{ padding: "16px 30px 0" }}>
          <SectionHead icon="📅" label="Attendance Summary" color="#2563eb" />
          <div className="grid grid-cols-6 gap-2">
            <Pill label="Working"  value={row.workingDays} color="blue" />
            <Pill label="Present"  value={row.presentDays} color="green" />
            <Pill label="Absent"   value={row.absentDays}  color={row.absentDays > 0 ? "red" : "slate"} />
            <Pill label="Late"     value={row.lateDays}    color={row.lateDays > 0 ? "amber" : "slate"} />
            <Pill label="Leave"    value={row.leaveDays || 0} color="slate" />
            <Pill label="OT hrs"   value={(row.overtimeHours || 0).toFixed(1)} color="blue" />
          </div>
        </div>

        {/* ── Two column: Earnings | Deductions ── */}
        <div style={{ padding: "16px 30px 0", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>

          {/* LEFT — Earnings */}
          <div style={{ border: "1.5px solid #bbf7d0", borderRadius: "12px", overflow: "hidden" }}>
            <div style={{ background: "linear-gradient(135deg,#15803d,#16a34a)", padding: "8px 12px" }}>
              <p style={{ fontSize: "9.5px", fontWeight: "800", color: "#fff", textTransform: "uppercase", letterSpacing: "0.08em" }}>💰 Earnings</p>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <tbody>
                <Row label="Basic Salary"     value={fmt(row.basicSalary)} bold />
                {transport  > 0 && <Row label="Transport Allowance" value={fmt(transport)}  indent />}
                {lunch      > 0 && <Row label="Lunch Incentive"     value={fmt(lunch)}      indent highlight />}
                {housing    > 0 && <Row label="Housing Allowance"   value={fmt(housing)}    indent />}
                {otherAllow > 0 && <Row label="Other Allowances"    value={fmt(otherAllow)} indent />}
                {allowances > 0 && (
                  <Row label="Sub Total" value={fmt(subTotal)} italic borderTop />
                )}
                {noPayLeave > 0   && <Row label="− No Pay Leave"          value={fmt(noPayLeave)}   italic negative />}
                {halfDayDed > 0   && <Row label="− Half Day"              value={fmt(halfDayDed)}   italic negative />}
                {lateDeduction > 0 && <Row label={`− Late Arrival${lateDayLabel}`} value={fmt(lateDeduction)} italic negative />}
                {lunchLateDed > 0  && <Row label="− Lunch Return Late"    value={fmt(lunchLateDed)} italic negative />}
                {earlyExitDed > 0  && <Row label="− Early Exit"           value={fmt(earlyExitDed)} italic negative />}
                <Row label="EPF / ETF Base"  value={fmt(totalForEPF)} bold borderTop />
                {otPay  > 0 && <Row label={`+ Overtime (${(row.overtimeHours || 0).toFixed(1)} hrs)`} value={fmt(otPay)} indent highlight />}
                {holPay > 0 && <Row label="+ Holiday / Off-Day Pay" value={fmt(holPay)} indent />}
                <Row label="Total Earnings"  value={fmt(totalEarnings)} bold borderTop />
              </tbody>
            </table>
          </div>

          {/* RIGHT — Deductions */}
          <div style={{ border: "1.5px solid #fecaca", borderRadius: "12px", overflow: "hidden" }}>
            <div style={{ background: "linear-gradient(135deg,#b91c1c,#dc2626)", padding: "8px 12px" }}>
              <p style={{ fontSize: "9.5px", fontWeight: "800", color: "#fff", textTransform: "uppercase", letterSpacing: "0.08em" }}>🔻 Recoveries</p>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <tbody>
                <Row label="EPF 8% (Employee)"  value={fmtZ(epf8)}     negative />
                {loans    > 0 && <Row label="Loans / Advances"  value={fmtZ(loans)}    negative indent />}
                {otherDeds > 0 && <Row label="Other Deductions" value={fmtZ(otherDeds)} negative indent />}
                {apit     > 0 && <Row label="APIT (Tax)"        value={fmtZ(apit)}     negative indent />}
                <Row label="Total Recoveries"  value={fmtZ(totalRecoveries)} bold borderTop negative />
              </tbody>
            </table>

            {/* Employer contributions box */}
            <div style={{ background: "#f8fafc", borderTop: "1.5px solid #e2e8f0", padding: "8px 12px" }}>
              <p style={{ fontSize: "9px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "6px" }}>Employer Contributions</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                {[
                  { label: "EPF 12%", value: epf12 },
                  { label: "EPF 8%",  value: epf8 },
                  { label: "ETF 3%",  value: etf3 },
                ].map(c => (
                  <div key={c.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "10.5px", color: "#64748b" }}>{c.label}</span>
                    <span style={{ fontSize: "10.5px", color: "#1e3a8a", fontWeight: "600" }}>Rs. {fmtZ(c.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Net Pay Banner ── */}
        <div style={{ margin: "16px 30px 0", background: "linear-gradient(135deg,#0f172a,#1e3a8a)", borderRadius: "14px", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.55)", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "2px" }}>Balance Received</p>
            <p style={{ fontSize: "9px", color: "rgba(255,255,255,0.4)" }}>Total Earnings − Total Recoveries</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: "24px", fontWeight: "900", color: "#fff", letterSpacing: "-0.01em" }}>
              Rs. {balanceReceived.toLocaleString("en-LK", { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* ── Signature area ── */}
        <div style={{ padding: "22px 30px 12px" }}>
          <div className="flex justify-between items-end">
            <div>
              <div style={{ borderBottom: "1.5px dotted #94a3b8", minWidth: "160px", height: "28px" }} />
              <p style={{ fontSize: "9.5px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: "4px" }}>Signature</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ borderBottom: "1.5px dotted #94a3b8", minWidth: "140px", height: "28px", display: "flex", alignItems: "flex-end", justifyContent: "flex-end" }}>
                <span style={{ fontSize: "11px", color: "#475569", paddingBottom: "2px" }}>{dateStr}</span>
              </div>
              <p style={{ fontSize: "9.5px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: "4px" }}>Date</p>
            </div>
          </div>
          <div style={{ marginTop: "18px" }}>
            <div style={{ borderBottom: "1.5px dotted #94a3b8", minWidth: "160px", height: "28px", display: "inline-block" }} />
            <p style={{ fontSize: "9.5px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: "4px" }}>Paying Authority</p>
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{ background: "#f8fafc", borderTop: "1px solid #e2e8f0", padding: "10px 30px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", marginBottom: "5px" }}>
            <div style={{ width: "5px", height: "5px", background: "#3a9ec2", borderRadius: "50%" }} />
            <p style={{ fontSize: "9px", color: "#94a3b8" }}>
              <span style={{ fontWeight: "600", color: "#64748b" }}>System Generated</span>&nbsp;·&nbsp;{generatedAt}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", borderTop: "1px dashed #e2e8f0", paddingTop: "6px" }}>
            <span style={{ fontSize: "8.5px", color: "#94a3b8", letterSpacing: "0.04em" }}>Powered by</span>
            <img src={liveuLogo} alt="Live U" style={{ height: "13px", width: "auto", display: "block", opacity: 0.75 }} />
            <span style={{ fontSize: "8.5px", color: "#64748b", fontWeight: "600" }}>Live U Pvt Ltd</span>
          </div>
        </div>

      </div>
    </div>
  );
}
