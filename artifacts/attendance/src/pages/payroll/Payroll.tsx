import React, { useState, useCallback, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { PageHeader, Card, Button, Select } from "@/components/ui";
import { cn } from "@/lib/utils";
import drivethruLogo from "@/assets/drivethru-wave-logo.png";
import {
  Banknote, RefreshCw, CheckCircle, CreditCard,
  Users, TrendingUp, Minus, Eye, X, Printer,
  ChevronDown, ChevronUp, AlertCircle, UserCheck,
  Search, Filter, Building2, Briefcase, ListChecks,
  BadgeCheck, Clock, CircleDashed, ChevronRight,
  RotateCcw, FileText, CalendarDays, Receipt, Info,
  Trash2, TriangleAlert,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
function apiUrl(path: string) { return `${BASE}/api${path}`; }

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

function fmt(n: number) {
  return `Rs. ${Math.round(n).toLocaleString("en-LK")}`;
}

type PayStatus = "draft" | "approved" | "paid";

interface PayrollRow {
  id: number;
  employeeId: number;
  branchId: number;
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
  absenceDeduction: number;
  otherDeductions: number;
  loanDeduction: number;
  totalDeductions: number;
  netSalary: number;
  status: PayStatus;
  generatedAt: string;
  approvedAt?: string;
  paidAt?: string;
  employee: {
    id: number;
    employeeId: string;
    fullName: string;
    designation: string;
    department: string;
    branchId: number;
    employeeType?: string;
    epfNumber?: string | null;
    etfNumber?: string | null;
  };
}

interface EmpForPayroll {
  id: number;
  employeeId: string;
  fullName: string;
  designation: string;
  department: string;
  branchId: number;
  employeeType: string | null;
  status: string;
  epfNumber: string | null;
  etfNumber: string | null;
  basicSalary: number;
  hasPayroll: boolean;
  payrollStatus: PayStatus | null;
  currentNetSalary: number | null;
  currentGrossSalary: number | null;
}

interface BranchInfo {
  id: number;
  name: string;
}

interface Summary {
  totalEmployees: number;
  totalGross: number;
  totalNet: number;
  totalEPF: number;
  totalETF: number;
  totalAPIT: number;
  totalOTPay: number;
  statusCounts: { draft: number; approved: number; paid: number };
}

const STATUS_STYLES: Record<PayStatus, string> = {
  draft:    "bg-amber-100 text-amber-700 border border-amber-200",
  approved: "bg-blue-100 text-blue-700 border border-blue-200",
  paid:     "bg-emerald-100 text-emerald-700 border border-emerald-200",
};

const EMP_TYPE_LABELS: Record<string, string> = {
  permanent: "Permanent",
  contract: "Contract",
  casual: "Casual",
};

function fmtAmt(n: number | null | undefined): string {
  if (!n || n === 0) return "";
  return n.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function PayslipModal({ row, onClose }: { row: PayrollRow; onClose: () => void }) {
  const orgName = "Drivethru (Pvt) Ltd";
  const pvNumber = `PV ${String(row.id).padStart(5, "0")}`;
  const monthLabel = `${MONTHS[row.month - 1]} ${row.year}`;
  const epfNo = row.employee.epfNumber || row.employee.employeeId;

  /* ── Calculations matching Excel format ── */
  const allowances = (row.transportAllowance || 0) + (row.housingAllowance || 0) + (row.otherAllowances || 0);
  const subTotal      = row.basicSalary + allowances;
  const noPayLeave    = row.absenceDeduction || 0;
  const lateDeduction = row.lateDeduction || 0;
  /* totalForEPF matches backend: lateDeduction already reduces grossSalary before EPF is computed */
  const totalForEPF   = subTotal - noPayLeave - lateDeduction;
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

  /* Date for signature line */
  const lastDay = new Date(row.year, row.month, 0);
  const dateStr = `${String(lastDay.getDate()).padStart(2,"0")}-${String(row.month).padStart(2,"0")}-${row.year}`;

  type SlipRow = { label: string; value?: string; indent?: boolean; bold?: boolean; italic?: boolean; borderTop?: boolean; borderBottom?: boolean; rightAlign?: boolean };
  const lateDayLabel = row.lateDays > 0 ? ` (${row.lateDays} day${row.lateDays !== 1 ? "s" : ""})` : "";
  const rows: SlipRow[] = [
    { label: "Basic Salary",            value: fmtAmt(row.basicSalary) },
    ...(allowances > 0 ? [{ label: "Allowances", value: fmtAmt(allowances) }] : [{ label: "Holiday Pay", value: "" }]),
    { label: "Sub Total",               value: fmtAmt(subTotal), italic: true, borderTop: true },
    { label: "Less  :  No Pay Leave",   value: noPayLeave > 0 ? fmtAmt(noPayLeave) : "-", italic: true },
    ...(lateDeduction > 0 ? [{ label: `Less  :  Late Arrival${lateDayLabel}`, value: fmtAmt(lateDeduction), italic: true }] : []),
    { label: "Total for EPF / ETF",     value: fmtAmt(totalForEPF), bold: true },
    { label: "Add  :  Overtime",        value: overtime > 0 ? fmtAmt(overtime) : "", italic: true },
    { label: "Total Earnings",          value: fmtAmt(totalEarnings), borderTop: true },
    { label: "Recoveries  :  EPF 8%",   value: fmtAmt(epf8) },
    ...(loans > 0       ? [{ label: "Loans",              value: fmtAmt(loans),    indent: true }] : []),
    ...(otherDeds > 0   ? [{ label: "Other Deductions",   value: fmtAmt(otherDeds), indent: true }] : []),
    ...(apit > 0        ? [{ label: "APIT (Income Tax)",  value: fmtAmt(apit),     indent: true }] : []),
    { label: "Less  :  Total Recoveries", value: fmtAmt(totalRecoveries), italic: true, borderTop: true },
    { label: "Balance Received",        value: fmtAmt(balanceReceived), bold: true, borderTop: true, borderBottom: true },
    { label: "" },
    { label: "EPF 12%",                 value: fmtAmt(epf12) },
    { label: "EPF 8%",                  value: fmtAmt(epf8) },
    { label: "ETF 3%",                  value: fmtAmt(etf3) },
  ];

  const generatedAt = new Date().toLocaleString("en-LK", {
    year: "numeric", month: "long", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true,
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white shadow-2xl w-full max-w-[560px] max-h-[95vh] overflow-y-auto rounded-2xl"
        onClick={e => e.stopPropagation()}
        style={{ fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif" }}
      >
        {/* ── Screen-only toolbar ── */}
        <div className="print:hidden flex items-center justify-between px-5 py-3 border-b border-slate-100 rounded-t-2xl bg-white">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Payslip · {monthLabel}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg,#3a9ec2,#2277a0)" }}
            >
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>

        {/* ── Payslip body (printable) ── */}
        <div>

          {/* ── Hero header with logo ── */}
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

            {/* Month banner */}
            <div style={{ marginTop: "18px", background: "rgba(255,255,255,0.1)", borderRadius: "10px", padding: "8px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#fff", fontWeight: "700", fontSize: "13px", letterSpacing: "0.06em" }}>PAY SHEET</span>
              <span style={{ color: "#fff", fontWeight: "600", fontSize: "13px" }}>{monthLabel}</span>
            </div>
          </div>

          {/* ── Employee info strip ── */}
          <div style={{ background: "#f0f9ff", borderBottom: "1px solid #bae6fd", padding: "14px 32px" }}>
            <div className="flex justify-between items-center">
              <div>
                <p style={{ fontSize: "10px", color: "#64748b", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "2px" }}>Employee Name</p>
                <p style={{ fontSize: "14px", fontWeight: "700", color: "#0e2a3d" }}>{row.employee.fullName}</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: "10px", color: "#64748b", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "2px" }}>EPF No.</p>
                <p style={{ fontSize: "14px", fontWeight: "700", color: "#0e2a3d" }}>{epfNo}</p>
              </div>
            </div>
          </div>

          {/* ── Payment details ── */}
          <div style={{ padding: "20px 32px 0" }}>
            <p style={{ fontSize: "10px", fontWeight: "700", color: "#3a9ec2", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "10px" }}>Payment Details</p>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th style={{ textAlign: "left", padding: "8px 10px", color: "#475569", fontWeight: "600", fontSize: "11px", borderBottom: "2px solid #e2e8f0", borderRadius: "6px 0 0 0" }}>Description</th>
                  <th style={{ textAlign: "right", padding: "8px 10px", color: "#475569", fontWeight: "600", fontSize: "11px", borderBottom: "2px solid #e2e8f0", width: "140px" }}>Amount (Rs.)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={i}
                    style={{
                      borderTop: r.borderTop ? "2px solid #e2e8f0" : undefined,
                      borderBottom: r.borderBottom ? "2px solid #e2e8f0" : undefined,
                      background: r.bold && r.borderTop ? "#f0f9ff" : "transparent",
                    }}
                  >
                    <td style={{
                      padding: r.label ? "6px 10px" : "4px 10px",
                      paddingLeft: r.indent ? "28px" : "10px",
                      fontStyle: r.italic ? "italic" : "normal",
                      fontWeight: r.bold ? "700" : "400",
                      color: r.bold ? "#0e2a3d" : "#374151",
                    }}>
                      {r.label}
                    </td>
                    <td style={{
                      textAlign: "right",
                      padding: "6px 10px",
                      fontStyle: r.italic ? "italic" : "normal",
                      fontWeight: r.bold ? "700" : "400",
                      color: r.bold ? "#0e2a3d" : "#374151",
                      whiteSpace: "nowrap",
                    }}>
                      {r.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Attendance summary ── */}
          <div className="print:hidden mx-8 mt-5 mb-1">
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

          {/* ── Signature area ── */}
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

          {/* ── Late arrivals policy note ── */}
          {lateDeduction > 0 && (
            <div style={{ margin: "0 32px 12px", padding: "8px 12px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "8px" }}>
              <p style={{ fontSize: "9.5px", color: "#92400e", lineHeight: "1.5", margin: 0 }}>
                <span style={{ fontWeight: "700" }}>Late Arrivals  ·  </span>
                Late arrivals exceeding the grace period will result in a reduction from the employee's hourly working rate.
                {row.lateDays > 0 && <span> This payslip reflects a deduction for <strong>{row.lateDays} late day{row.lateDays !== 1 ? "s" : ""}</strong>.</span>}
              </p>
            </div>
          )}

          {/* ── System generated footer ── */}
          <div style={{ background: "#f8fafc", borderTop: "1px solid #e2e8f0", padding: "10px 32px", borderRadius: "0 0 16px 16px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
            <div style={{ width: "6px", height: "6px", background: "#3a9ec2", borderRadius: "50%", flexShrink: 0 }} />
            <p style={{ fontSize: "9.5px", color: "#94a3b8", textAlign: "center" }}>
              <span style={{ fontWeight: "600", color: "#64748b" }}>System Generated</span>
              &nbsp;·&nbsp;{generatedAt}
              &nbsp;·&nbsp;Drivethru Attendance Management System
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}

type DetailTab = "details" | "payment-days" | "earnings" | "net-pay";

function PayrollDetailModal({ row, onClose }: { row: PayrollRow; onClose: () => void }) {
  const [tab, setTab] = useState<DetailTab>("details");
  const monthLabel = `${MONTHS[row.month - 1]} ${row.year}`;

  const allowances = (row.transportAllowance || 0) + (row.housingAllowance || 0) + (row.otherAllowances || 0);
  const subTotal = row.basicSalary + allowances;
  const noPayLeave = row.absenceDeduction || 0;
  const lateDeduction = row.lateDeduction || 0;
  const totalForEPF = subTotal - noPayLeave - lateDeduction;
  const overtime = row.overtimePay || 0;
  const totalEarnings = totalForEPF + overtime;
  const epf8 = row.epfEmployee || 0;
  const loans = row.loanDeduction || 0;
  const otherDeds = row.otherDeductions || 0;
  const apit = row.apit || 0;
  const totalRecoveries = epf8 + loans + otherDeds + apit;
  const epf12 = row.epfEmployer || 0;
  const etf3 = row.etfEmployer || 0;
  const totalEmployerCost = row.netSalary + epf12 + etf3;
  const paymentDays = row.presentDays + row.leaveDays + row.holidayDays;

  const tabs: { id: DetailTab; label: string }[] = [
    { id: "details",      label: "Details" },
    { id: "payment-days", label: "Payment Days" },
    { id: "earnings",     label: "Earnings & Deductions" },
    { id: "net-pay",      label: "Net Pay Info" },
  ];

  function Field({
    label, value, required, accent,
  }: { label: string; value: string | number; required?: boolean; accent?: "emerald" | "red" | "blue" | "amber" | "violet" }) {
    const accentStyles: Record<string, string> = {
      emerald: "bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold",
      red:     "bg-red-50 border-red-200 text-red-700 font-semibold",
      blue:    "bg-blue-50 border-blue-200 text-blue-800 font-semibold",
      amber:   "bg-amber-50 border-amber-200 text-amber-800 font-semibold",
      violet:  "bg-violet-50 border-violet-200 text-violet-800 font-semibold",
    };
    return (
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
          {label}
          {required && <span className="text-red-400 text-[10px]">*</span>}
        </label>
        <div className={cn(
          "px-3.5 py-2.5 rounded-lg border text-sm bg-white shadow-sm transition-colors",
          accent ? accentStyles[accent] : "border-slate-200 text-slate-700"
        )}>
          {value === "" || value === null || value === undefined ? <span className="text-slate-300">—</span> : value}
        </div>
      </div>
    );
  }

  function SectionTitle({ children, color = "slate" }: { children: React.ReactNode; color?: string }) {
    const colors: Record<string, string> = {
      slate:   "text-slate-500 border-slate-200",
      emerald: "text-emerald-600 border-emerald-200",
      red:     "text-red-600 border-red-200",
      violet:  "text-violet-600 border-violet-200",
    };
    return (
      <div className={cn("flex items-center gap-2 pb-2 mb-4 border-b text-[11px] font-bold uppercase tracking-widest", colors[color])}>
        {children}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3"
      onClick={onClose}>
      <div
        className="bg-slate-50 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[94vh] flex flex-col overflow-hidden"
        style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
        onClick={e => e.stopPropagation()}
      >

        {/* ── Gradient header ── */}
        <div style={{ background: "linear-gradient(135deg, #0e2a3d 0%, #1a4a6e 55%, #3a9ec2 100%)" }} className="shrink-0 px-6 py-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center text-white font-bold text-lg shadow-inner">
                {row.employee.fullName.charAt(0)}
              </div>
              <div>
                <h2 className="text-white font-bold text-lg leading-tight">{row.employee.fullName}</h2>
                <p className="text-white/70 text-xs mt-0.5">{row.employee.employeeId} &nbsp;·&nbsp; {row.employee.designation} &nbsp;·&nbsp; {row.employee.department}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white/80">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Key figures strip */}
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              { label: "Gross Salary",  value: fmt(row.grossSalary) },
              { label: "Total Deductions", value: fmt(totalRecoveries) },
              { label: "Net Salary",    value: fmt(row.netSalary) },
            ].map(s => (
              <div key={s.label} className="bg-white/10 rounded-xl px-4 py-2.5 text-center backdrop-blur-sm">
                <p className="text-white/60 text-[10px] font-semibold uppercase tracking-wide">{s.label}</p>
                <p className="text-white font-bold text-base mt-0.5">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Status + period */}
          <div className="mt-3 flex items-center gap-3">
            <span className={cn("text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border",
              row.status === "paid"     ? "bg-emerald-400/20 border-emerald-400/40 text-emerald-200" :
              row.status === "approved" ? "bg-blue-400/20 border-blue-400/40 text-blue-200" :
              "bg-amber-400/20 border-amber-400/40 text-amber-200"
            )}>{row.status}</span>
            <span className="text-white/50 text-[11px]">{monthLabel}</span>
            <span className="text-white/40 text-[10px] ml-auto">PV {String(row.id).padStart(5, "0")}</span>
          </div>
        </div>

        {/* ── Tab navigation ── */}
        <div className="bg-white border-b border-slate-200 shrink-0 px-6 flex gap-0">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "text-[13px] font-medium px-4 py-3.5 border-b-2 transition-all whitespace-nowrap",
                tab === t.id
                  ? "border-[#3a9ec2] text-[#1a4a6e] font-semibold"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab body ── */}
        <div className="overflow-y-auto flex-1 p-6 bg-slate-50">

          {/* Details */}
          {tab === "details" && (
            <div className="space-y-6">
              <div>
                <SectionTitle>Employee Information</SectionTitle>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Employee ID"    value={row.employee.employeeId} required />
                  <Field label="Full Name"      value={row.employee.fullName} required />
                  <Field label="Designation"    value={row.employee.designation} />
                  <Field label="Department"     value={row.employee.department} />
                  <Field label="Employee Type"  value={EMP_TYPE_LABELS[row.employee.employeeType ?? "permanent"] ?? "Permanent"} />
                  <Field label="Pay Period"     value={monthLabel} required />
                </div>
              </div>
              <div>
                <SectionTitle>Statutory Numbers</SectionTitle>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="EPF Number" value={row.employee.epfNumber || row.employee.employeeId} />
                  <Field label="ETF Number" value={row.employee.etfNumber || "—"} />
                </div>
              </div>
              <div>
                <SectionTitle>Record Information</SectionTitle>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Record Reference" value={`PV ${String(row.id).padStart(5, "0")}`} />
                  <Field label="Status" value={row.status.toUpperCase()}
                    accent={row.status === "paid" ? "emerald" : row.status === "approved" ? "blue" : "amber"} />
                  <Field label="Generated On" value={row.generatedAt ? new Date(row.generatedAt).toLocaleDateString("en-LK", { year:"numeric", month:"long", day:"2-digit" }) : "—"} />
                  {row.approvedAt && <Field label="Approved On" value={new Date(row.approvedAt).toLocaleDateString("en-LK", { year:"numeric", month:"long", day:"2-digit" })} />}
                  {row.paidAt    && <Field label="Paid On"     value={new Date(row.paidAt).toLocaleDateString("en-LK", { year:"numeric", month:"long", day:"2-digit" })} />}
                </div>
              </div>
            </div>
          )}

          {/* Payment Days */}
          {tab === "payment-days" && (
            <div className="space-y-6">
              <div>
                <SectionTitle>Attendance Breakdown</SectionTitle>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Working Days"        value={row.workingDays} required />
                  <Field label="Punched Days"        value={row.presentDays} />
                  <Field label="Absent Days"         value={row.absentDays}  accent={row.absentDays > 0 ? "red" : undefined} />
                  <Field label="Late Days"           value={row.lateDays}    accent={row.lateDays > 0 ? "amber" : undefined} />
                  <Field label="Leave Days"          value={row.leaveDays} />
                  <Field label="Holiday Days"        value={row.holidayDays} />
                  <Field label="Overtime Hours"      value={`${row.overtimeHours.toFixed(2)} hrs`} accent={row.overtimeHours > 0 ? "emerald" : undefined} />
                  <Field label="Loss of Pay Days"    value={row.absentDays}  accent={row.absentDays > 0 ? "red" : undefined} />
                </div>
              </div>
              <div>
                <SectionTitle color="emerald">Payment Summary</SectionTitle>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Payment Days"        value={paymentDays}   required accent="emerald" />
                  <Field label="Late Deduction"      value={lateDeduction > 0 ? fmt(lateDeduction) : "0"} accent={lateDeduction > 0 ? "red" : undefined} />
                  <Field label="No-Pay Deduction"    value={noPayLeave > 0 ? fmt(noPayLeave) : "0"}    accent={noPayLeave > 0 ? "red" : undefined} />
                  <Field label="Total Deduction Days" value={row.absentDays + row.lateDays} />
                </div>
              </div>
            </div>
          )}

          {/* Earnings & Deductions */}
          {tab === "earnings" && (
            <div className="space-y-6">
              <div>
                <SectionTitle color="emerald">Earnings</SectionTitle>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Basic Salary"        value={fmt(row.basicSalary)}       accent="emerald" required />
                  <Field label="Transport Allowance" value={row.transportAllowance > 0 ? fmt(row.transportAllowance) : "0"} />
                  <Field label="Housing Allowance"   value={row.housingAllowance > 0 ? fmt(row.housingAllowance) : "0"} />
                  <Field label="Other Allowances"    value={row.otherAllowances > 0 ? fmt(row.otherAllowances) : "0"} />
                  <Field label="Sub Total"           value={fmt(subTotal)} />
                  <Field label="Overtime Pay"        value={overtime > 0 ? fmt(overtime) : "0"} accent={overtime > 0 ? "emerald" : undefined} />
                  <Field label="Total for EPF / ETF" value={fmt(totalForEPF)} />
                  <Field label="Gross Salary"        value={fmt(row.grossSalary)} accent="emerald" />
                </div>
              </div>
              <div>
                <SectionTitle color="red">Deductions / Recoveries</SectionTitle>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="No-Pay Leave"         value={noPayLeave > 0 ? fmt(noPayLeave) : "0"}   accent={noPayLeave > 0 ? "red" : undefined} />
                  <Field label="Late Arrival Deduction" value={lateDeduction > 0 ? fmt(lateDeduction) : "0"} accent={lateDeduction > 0 ? "red" : undefined} />
                  <Field label="EPF 8% (Employee)"    value={fmt(epf8)}  accent="red" />
                  <Field label="Loan Recovery"         value={loans > 0 ? fmt(loans) : "0"}       accent={loans > 0 ? "red" : undefined} />
                  <Field label="Other Deductions"      value={otherDeds > 0 ? fmt(otherDeds) : "0"} accent={otherDeds > 0 ? "red" : undefined} />
                  <Field label="APIT (Income Tax)"     value={apit > 0 ? fmt(apit) : "0"}         accent={apit > 0 ? "red" : undefined} />
                  <Field label="Total Recoveries"      value={fmt(totalRecoveries)} accent="red" />
                  <Field label="Balance Received"      value={fmt(row.netSalary)}   accent="emerald" />
                </div>
              </div>
            </div>
          )}

          {/* Net Pay Info */}
          {tab === "net-pay" && (
            <div className="space-y-6">
              <div>
                <SectionTitle color="emerald">Summary</SectionTitle>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Total Earnings"         value={fmt(totalEarnings)}    accent="emerald" />
                  <Field label="Total Recoveries"       value={fmt(totalRecoveries)}  accent="red" />
                  <Field label="Net Salary (Take Home)" value={fmt(row.netSalary)}    accent="emerald" required />
                  <Field label="Gross Salary"           value={fmt(row.grossSalary)} />
                </div>
              </div>
              <div>
                <SectionTitle color="violet">Statutory Contributions</SectionTitle>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="EPF 8% (Employee)"   value={fmt(epf8)}         accent="red" />
                  <Field label="EPF 12% (Employer)"  value={fmt(epf12)}        accent="violet" />
                  <Field label="Total EPF (20%)"     value={fmt(epf8 + epf12)} accent="violet" />
                  <Field label="ETF 3% (Employer)"   value={fmt(etf3)}         accent="violet" />
                  {apit > 0 && <Field label="APIT (Income Tax)" value={fmt(apit)} accent="red" />}
                  <Field label="Total Employer Cost" value={fmt(totalEmployerCost)} accent="blue" />
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

function GeneratePayrollModal({
  month, year, onClose, onGenerated,
}: {
  month: number;
  year: number;
  onClose: () => void;
  onGenerated: () => void;
}) {
  const [employees, setEmployees] = useState<EmpForPayroll[]>([]);
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filterBranch, setFilterBranch] = useState<string>("all");
  const [filterDept, setFilterDept] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const [selected, setSelected] = useState<Set<number>>(new Set());

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(apiUrl(`/payroll/employees-for-payroll?month=${month}&year=${year}`));
        const data = await res.json();
        setEmployees(data.employees ?? []);
        setBranches(data.branches ?? []);
        const defaultSelected = new Set<number>(
          (data.employees ?? []).filter((e: EmpForPayroll) => !e.hasPayroll).map((e: EmpForPayroll) => e.id)
        );
        setSelected(defaultSelected);
      } catch {
        setError("Failed to load employees. Check server connection.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [month, year]);

  const departments = useMemo(() => {
    const set = new Set(employees.map(e => e.department));
    return Array.from(set).sort();
  }, [employees]);

  const filtered = useMemo(() => {
    return employees.filter(e => {
      const q = search.toLowerCase();
      const matchSearch = !q || e.fullName.toLowerCase().includes(q) ||
        e.employeeId.toLowerCase().includes(q) ||
        e.designation.toLowerCase().includes(q);
      const matchBranch = filterBranch === "all" || e.branchId === parseInt(filterBranch);
      const matchDept = filterDept === "all" || e.department === filterDept;
      const matchType = filterType === "all" || e.employeeType === filterType;
      const matchStatus = filterStatus === "all" ||
        (filterStatus === "assigned" && e.hasPayroll) ||
        (filterStatus === "unassigned" && !e.hasPayroll);
      return matchSearch && matchBranch && matchDept && matchType && matchStatus;
    });
  }, [employees, search, filterBranch, filterDept, filterType, filterStatus]);

  const allFilteredSelected = filtered.length > 0 && filtered.every(e => selected.has(e.id));

  const toggleAll = () => {
    if (allFilteredSelected) {
      const s = new Set(selected);
      filtered.forEach(e => s.delete(e.id));
      setSelected(s);
    } else {
      const s = new Set(selected);
      filtered.forEach(e => s.add(e.id));
      setSelected(s);
    }
  };

  const selectAllActive = () => {
    setSelected(new Set(employees.map(e => e.id)));
  };

  const selectOnlyNew = () => {
    setSelected(new Set(employees.filter(e => !e.hasPayroll).map(e => e.id)));
  };

  const clearAll = () => setSelected(new Set());

  const generate = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Generate payroll for ${selected.size} employee(s) for ${MONTHS[month - 1]} ${year}? Existing draft records for selected employees will be overwritten.`)) return;
    setGenerating(true);
    setError(null);
    try {
      const r = await fetch(apiUrl("/payroll/generate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, year, employeeIds: Array.from(selected) }),
      });
      const d = await r.json();
      if (d.success) {
        onGenerated();
        onClose();
      } else {
        setError(d.message ?? "Generation failed.");
      }
    } catch {
      setError("Failed to connect to server.");
    } finally {
      setGenerating(false);
    }
  };

  const branchName = (id: number) => branches.find(b => b.id === id)?.name ?? `Branch ${id}`;

  const selectedCount = selected.size;
  const alreadyHavePayroll = Array.from(selected).filter(id => employees.find(e => e.id === id)?.hasPayroll).length;
  const newlyAdded = selectedCount - alreadyHavePayroll;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-background rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5 border-b border-border flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-bold text-lg flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-primary" />
              Assign Employees to Payroll
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Select which employees to include in <strong>{MONTHS[month - 1]} {year}</strong> payroll
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-4 border-b border-border shrink-0 space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, ID or designation…"
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background"
              />
            </div>
            <Select value={filterBranch} onChange={e => setFilterBranch(e.target.value)} className="text-xs w-40">
              <option value="all">All Branches</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
            <Select value={filterDept} onChange={e => setFilterDept(e.target.value)} className="text-xs w-36">
              <option value="all">All Departments</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </Select>
            <Select value={filterType} onChange={e => setFilterType(e.target.value)} className="text-xs w-32">
              <option value="all">All Types</option>
              <option value="permanent">Permanent</option>
              <option value="contract">Contract</option>
              <option value="casual">Casual</option>
            </Select>
            <Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="text-xs w-36">
              <option value="all">All Employees</option>
              <option value="unassigned">Not Yet Assigned</option>
              <option value="assigned">Already Assigned</option>
            </Select>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Quick select:</span>
            <button onClick={selectAllActive} className="text-xs px-2.5 py-1 rounded-lg border border-border hover:bg-muted transition-colors">
              All Active Employees ({employees.length})
            </button>
            <button onClick={selectOnlyNew} className="text-xs px-2.5 py-1 rounded-lg border border-border hover:bg-muted transition-colors text-primary border-primary/30 bg-primary/5">
              Only New (Without Payroll) ({employees.filter(e => !e.hasPayroll).length})
            </button>
            <button onClick={clearAll} className="text-xs px-2.5 py-1 rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground">
              Clear All
            </button>
            <span className="ml-auto text-xs text-muted-foreground">{filtered.length} employees shown</span>
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground text-sm">Loading employees…</div>
          ) : error ? (
            <div className="p-6 text-center text-red-600 text-sm">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-sm">No employees match your filters.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                <tr className="border-b border-border">
                  <th className="p-3 w-10">
                    <input type="checkbox" checked={allFilteredSelected} onChange={toggleAll} className="rounded" />
                  </th>
                  <th className="p-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Employee</th>
                  <th className="p-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Designation</th>
                  <th className="p-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Branch</th>
                  <th className="p-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Type</th>
                  <th className="p-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Basic Salary</th>
                  <th className="p-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Payroll Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((emp, i) => (
                  <tr
                    key={emp.id}
                    className={cn(
                      "border-b border-border/60 hover:bg-muted/30 transition-colors cursor-pointer",
                      i % 2 === 0 ? "bg-background" : "bg-muted/10",
                      selected.has(emp.id) && "bg-primary/5 hover:bg-primary/8"
                    )}
                    onClick={() => {
                      const s = new Set(selected);
                      s.has(emp.id) ? s.delete(emp.id) : s.add(emp.id);
                      setSelected(s);
                    }}
                  >
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selected.has(emp.id)}
                        onChange={() => {}}
                        onClick={e => e.stopPropagation()}
                        className="rounded pointer-events-none"
                      />
                    </td>
                    <td className="p-3">
                      <p className="font-medium text-foreground">{emp.fullName}</p>
                      <p className="text-xs text-muted-foreground">{emp.employeeId}</p>
                    </td>
                    <td className="p-3">
                      <p className="text-sm">{emp.designation}</p>
                      <p className="text-xs text-muted-foreground">{emp.department}</p>
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">{branchName(emp.branchId)}</td>
                    <td className="p-3">
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium",
                        emp.employeeType === "permanent" ? "bg-blue-100 text-blue-700" :
                        emp.employeeType === "contract" ? "bg-purple-100 text-purple-700" :
                        "bg-orange-100 text-orange-700"
                      )}>
                        {EMP_TYPE_LABELS[emp.employeeType ?? "permanent"] ?? emp.employeeType}
                      </span>
                    </td>
                    <td className="p-3 text-right font-medium text-sm">{fmt(emp.basicSalary)}</td>
                    <td className="p-3">
                      {emp.hasPayroll ? (
                        <div className="flex flex-col gap-0.5">
                          <span className={cn("inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium w-fit",
                            STATUS_STYLES[emp.payrollStatus!]
                          )}>
                            {emp.payrollStatus === "paid" ? <BadgeCheck className="w-3 h-3" /> :
                             emp.payrollStatus === "approved" ? <CheckCircle className="w-3 h-3" /> :
                             <Clock className="w-3 h-3" />}
                            {emp.payrollStatus?.toUpperCase()}
                          </span>
                          <span className="text-xs text-muted-foreground">Net: {fmt(emp.currentNetSalary ?? 0)}</span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-muted text-muted-foreground w-fit">
                          <CircleDashed className="w-3 h-3" />
                          Not Generated
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="p-4 border-t border-border shrink-0">
          {error && (
            <div className="mb-3 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1.5">
                <ListChecks className="w-4 h-4 text-primary" />
                <strong className="text-foreground">{selectedCount}</strong> selected
              </span>
              {newlyAdded > 0 && (
                <span className="text-emerald-600 text-xs">+{newlyAdded} new</span>
              )}
              {alreadyHavePayroll > 0 && (
                <span className="text-amber-600 text-xs">↺ {alreadyHavePayroll} will be regenerated</span>
              )}
            </div>

            <div className="ml-auto flex items-center gap-2">
              <Button
                onClick={onClose}
                className="text-xs bg-secondary text-secondary-foreground hover:bg-secondary/80"
              >
                Cancel
              </Button>
              <Button
                onClick={generate}
                disabled={generating || selectedCount === 0}
                className="text-xs flex items-center gap-2"
              >
                <Banknote className="w-3.5 h-3.5" />
                {generating ? "Generating…" : `Generate Payroll for ${selectedCount} Employee${selectedCount !== 1 ? "s" : ""}`}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Payroll() {
  const [, navigate] = useLocation();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [payroll, setPayroll] = useState<PayrollRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [payslip, setPayslip] = useState<PayrollRow | null>(null);
  const [detailRow, setDetailRow] = useState<PayrollRow | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<string>("employee.fullName");
  const [sortAsc, setSortAsc] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const toggleExpand = (id: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const fetchPayroll = useCallback(async () => {
    setLoading(true); setMsg(null);
    try {
      const [pr, sr] = await Promise.all([
        fetch(apiUrl(`/payroll?month=${month}&year=${year}`)).then(r => r.json()),
        fetch(apiUrl(`/payroll/summary?month=${month}&year=${year}`)).then(r => r.json()),
      ]);
      setPayroll(Array.isArray(pr) ? pr : []);
      setSummary(sr.totalEmployees !== undefined ? sr : null);
    } catch {
      setMsg({ type: "error", text: "Failed to load payroll data." });
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => { fetchPayroll(); }, [fetchPayroll]);

  const updateStatus = async (id: number, status: PayStatus) => {
    await fetch(apiUrl(`/payroll/${id}/status`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setPayroll(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    if (summary) {
      const old = payroll.find(r => r.id === id)?.status;
      if (old) {
        setSummary(s => s ? { ...s, statusCounts: { ...s.statusCounts, [old]: s.statusCounts[old as keyof typeof s.statusCounts] - 1, [status]: s.statusCounts[status] + 1 } } : s);
      }
    }
  };

  const bulkUpdateStatus = async (status: PayStatus) => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    await fetch(apiUrl("/payroll/bulk-status"), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, status }),
    });
    setPayroll(prev => prev.map(r => ids.includes(r.id) ? { ...r, status } : r));
    setSelected(new Set());
    setMsg({ type: "success", text: `${ids.length} records updated to ${status}` });
  };

  const deleteRecord = async (id: number) => {
    if (!confirm("Delete this payroll record? This cannot be undone.")) return;
    const res = await fetch(apiUrl(`/payroll/${id}`), { method: "DELETE" });
    if (res.ok) {
      setPayroll(prev => prev.filter(r => r.id !== id));
      setSelected(prev => { const s = new Set(prev); s.delete(id); return s; });
      setMsg({ type: "success", text: "Payroll record deleted." });
    } else {
      setMsg({ type: "error", text: "Failed to delete record." });
    }
  };

  const bulkDelete = async () => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    if (!confirm(`Delete ${ids.length} selected payroll record(s)? This cannot be undone.`)) return;
    const res = await fetch(apiUrl("/payroll/bulk"), {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    if (res.ok) {
      setPayroll(prev => prev.filter(r => !ids.includes(r.id)));
      setSelected(new Set());
      setMsg({ type: "success", text: `${ids.length} payroll record(s) deleted.` });
    } else {
      setMsg({ type: "error", text: "Failed to delete records." });
    }
  };

  const toggleSort = (field: string) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(true); }
  };

  const filtered = payroll
    .filter(r => {
      const q = search.toLowerCase();
      const matchSearch = !q || r.employee.fullName.toLowerCase().includes(q) ||
        r.employee.employeeId.toLowerCase().includes(q) ||
        r.employee.designation.toLowerCase().includes(q);
      const matchStatus = statusFilter === "all" || r.status === statusFilter;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      let av: any = sortField === "employee.fullName" ? a.employee.fullName :
        sortField === "netSalary" ? a.netSalary :
        sortField === "grossSalary" ? a.grossSalary :
        sortField === "status" ? a.status : a.employee.fullName;
      let bv: any = sortField === "employee.fullName" ? b.employee.fullName :
        sortField === "netSalary" ? b.netSalary :
        sortField === "grossSalary" ? b.grossSalary :
        sortField === "status" ? b.status : b.employee.fullName;
      if (typeof av === "string") return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortAsc ? av - bv : bv - av;
    });

  const allSelected = filtered.length > 0 && filtered.every(r => selected.has(r.id));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payroll Management"
        subtitle="Generate, review and process monthly payroll for Sri Lanka Post employees."
      />

      {msg && (
        <div className={cn("flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border",
          msg.type === "success" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200")}>
          {msg.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {msg.text}
          <button onClick={() => setMsg(null)} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Select value={String(month)} onChange={e => setMonth(Number(e.target.value))} className="w-36">
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </Select>
            <Select value={String(year)} onChange={e => setYear(Number(e.target.value))} className="w-24">
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </Select>
          </div>
          <Button
            onClick={fetchPayroll}
            disabled={loading}
            className="text-xs flex items-center gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/80"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            {loading ? "Loading…" : "Refresh"}
          </Button>
          <Button
            onClick={() => setShowGenerateModal(true)}
            className="text-xs flex items-center gap-2"
          >
            <UserCheck className="w-3.5 h-3.5" />
            Assign &amp; Generate Payroll
          </Button>
          {selected.size > 0 && (
            <>
              <Button
                onClick={() => bulkUpdateStatus("approved")}
                className="text-xs flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <CheckCircle className="w-3.5 h-3.5" />Approve ({selected.size})
              </Button>
              <Button
                onClick={() => bulkUpdateStatus("paid")}
                className="text-xs flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CreditCard className="w-3.5 h-3.5" />Mark Paid ({selected.size})
              </Button>
              <Button
                onClick={bulkDelete}
                className="text-xs flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white"
              >
                <Trash2 className="w-3.5 h-3.5" />Delete ({selected.size})
              </Button>
            </>
          )}
        </div>
      </Card>

      {summary && summary.totalEmployees > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Employees", val: summary.totalEmployees, icon: Users, color: "text-blue-600", bg: "bg-blue-50", fmt: (v: number) => v.toString() },
              { label: "Total Gross",    val: summary.totalGross, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50", fmt },
              { label: "Total Net Pay",  val: summary.totalNet,   icon: Banknote,   color: "text-primary",     bg: "bg-primary/5",  fmt },
              { label: "Total EPF",      val: summary.totalEPF,   icon: CreditCard, color: "text-violet-600", bg: "bg-violet-50",  fmt },
            ].map(s => (
              <Card key={s.label} className="p-4">
                <div className="flex items-start gap-3">
                  <div className={cn("p-2 rounded-lg", s.bg)}>
                    <s.icon className={cn("w-4 h-4", s.color)} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className={cn("font-bold text-base mt-0.5 truncate", s.color)}>{s.fmt(s.val)}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="flex gap-3 flex-wrap items-center">
            {[
              { label: "Draft",    count: summary.statusCounts.draft,    color: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock },
              { label: "Approved", count: summary.statusCounts.approved,  color: "bg-blue-100 text-blue-700 border-blue-200", icon: CheckCircle },
              { label: "Paid",     count: summary.statusCounts.paid,      color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: BadgeCheck },
            ].map(s => (
              <div key={s.label} className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium", s.color)}>
                <s.icon className="w-3.5 h-3.5" />
                {s.label}: <span className="font-bold">{s.count}</span>
              </div>
            ))}
            <button
              onClick={() => setShowGenerateModal(true)}
              className="ml-auto text-xs text-primary flex items-center gap-1 hover:underline"
            >
              Manage employee assignments <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </>
      )}

      {payroll.length > 0 && payroll.every(r => (r.presentDays ?? 0) === 0) && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 flex gap-3 items-start">
          <TriangleAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">All Employees Showing as Absent</p>
            <p className="text-xs text-amber-700 mt-1">
              No attendance records were found for <strong>{MONTHS[month - 1]} {year}</strong> when payroll was generated,
              so everyone was counted as 0 present days. To fix this:
            </p>
            <ol className="text-xs text-amber-700 mt-1.5 ml-3 list-decimal space-y-0.5">
              <li>Go to <strong>Today's Attendance</strong> or <strong>Monthly Sheet</strong> and record attendance for {MONTHS[month - 1]} {year}.</li>
              <li>Come back here, select all records (checkbox at top), and click <strong>Delete</strong> to remove the incorrect records.</li>
              <li>Click <strong>Assign &amp; Generate Payroll</strong> again to regenerate with correct attendance data.</li>
            </ol>
          </div>
        </div>
      )}

      {payroll.length > 0 && (
        <Card className="overflow-hidden p-0">
          <div className="p-4 border-b border-border flex items-center gap-3 flex-wrap">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, ID or designation…"
              className="border border-border rounded-lg px-3 py-1.5 text-sm flex-1 min-w-48 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background"
            />
            <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-32 text-xs">
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
            </Select>
            <span className="text-xs text-muted-foreground">{filtered.length} records</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="p-3 w-8">
                    <input type="checkbox" checked={allSelected}
                      onChange={e => setSelected(e.target.checked ? new Set(filtered.map(r => r.id)) : new Set())}
                      className="rounded" />
                  </th>
                  <th className="p-3 w-8" />
                  {[
                    { label: "Employee",    field: "employee.fullName" },
                    { label: "Type",        field: null },
                    { label: "Attendance",  field: null },
                    { label: "Earnings",    field: null },
                    { label: "Gross Salary", field: "grossSalary" },
                    { label: "Deductions",  field: null },
                    { label: "Net Salary",  field: "netSalary" },
                    { label: "Status",      field: "status" },
                    { label: "Actions",     field: null },
                  ].map(col => (
                    <th key={col.label}
                      className={cn("p-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide",
                        col.field && "cursor-pointer hover:text-foreground")}
                      onClick={() => col.field && toggleSort(col.field)}>
                      <div className="flex items-center gap-1">
                        {col.label}
                        {col.field && sortField === col.field && (
                          sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, i) => {
                  const isExpanded = expandedRows.has(row.id);
                  const allowances = (row.transportAllowance || 0) + (row.housingAllowance || 0) + (row.otherAllowances || 0);
                  const subTotal = row.basicSalary + allowances;
                  const totalForEPF = subTotal - (row.absenceDeduction || 0) - (row.lateDeduction || 0);
                  const totalEarnings = totalForEPF + (row.overtimePay || 0);
                  return (
                    <React.Fragment key={row.id}>
                      <tr
                        className={cn("border-b border-border/60 hover:bg-muted/30 transition-colors",
                          i % 2 === 0 ? "bg-background" : "bg-muted/10",
                          selected.has(row.id) && "bg-primary/5",
                          isExpanded && "border-b-0")}>
                        <td className="p-3">
                          <input type="checkbox" checked={selected.has(row.id)}
                            onChange={e => {
                              const s = new Set(selected);
                              e.target.checked ? s.add(row.id) : s.delete(row.id);
                              setSelected(s);
                            }} className="rounded" />
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => toggleExpand(row.id)}
                            className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground"
                            title={isExpanded ? "Collapse details" : "Expand details"}
                          >
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </td>
                        <td className="p-3">
                          <p className="font-medium text-foreground">{row.employee.fullName}</p>
                          <p className="text-xs text-muted-foreground">{row.employee.employeeId} · {row.employee.designation}</p>
                        </td>
                        <td className="p-3">
                          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium",
                            row.employee.employeeType === "permanent" ? "bg-blue-100 text-blue-700" :
                            row.employee.employeeType === "contract" ? "bg-purple-100 text-purple-700" :
                            "bg-orange-100 text-orange-700"
                          )}>
                            {EMP_TYPE_LABELS[row.employee.employeeType ?? "permanent"] ?? "Permanent"}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex gap-1 text-[11px]">
                            <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">P:{row.presentDays}</span>
                            <span className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded">A:{row.absentDays}</span>
                            <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">L:{row.lateDays}</span>
                            {row.overtimeHours > 0 && <span className="bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded">OT:{row.overtimeHours.toFixed(1)}h</span>}
                          </div>
                        </td>
                        <td className="p-3">
                          <p className="text-sm text-muted-foreground">{fmt(row.basicSalary)}</p>
                          {allowances > 0 && <p className="text-[11px] text-muted-foreground/70">+{fmt(allowances)} allowances</p>}
                        </td>
                        <td className="p-3 font-medium">{fmt(row.grossSalary)}</td>
                        <td className="p-3">
                          <p className="text-red-600 text-sm font-medium">{fmt(row.totalDeductions)}</p>
                          <p className="text-[11px] text-muted-foreground">EPF {fmt(row.epfEmployee)}{row.apit > 0 ? ` · APIT ${fmt(row.apit)}` : ""}</p>
                        </td>
                        <td className="p-3 font-bold text-primary">{fmt(row.netSalary)}</td>
                        <td className="p-3">
                          <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", STATUS_STYLES[row.status])}>
                            {row.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setPayslip(row)}
                              className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                              title="Quick view payslip"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDetailRow(row)}
                              className="p-1.5 rounded-lg hover:bg-violet-50 transition-colors text-violet-600"
                              title="Detailed view"
                            >
                              <ListChecks className="w-3.5 h-3.5" />
                            </button>
                            {row.status === "draft" && (
                              <button
                                onClick={() => updateStatus(row.id, "approved")}
                                className="p-1.5 rounded-lg hover:bg-blue-50 transition-colors text-blue-600"
                                title="Approve"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {row.status === "approved" && (
                              <button
                                onClick={() => updateStatus(row.id, "paid")}
                                className="p-1.5 rounded-lg hover:bg-emerald-50 transition-colors text-emerald-600"
                                title="Mark as Paid"
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {(row.status === "approved" || row.status === "paid") && (
                              <button
                                onClick={() => {
                                  if (confirm("Reset this record back to Draft?")) updateStatus(row.id, "draft");
                                }}
                                className="p-1.5 rounded-lg hover:bg-amber-50 transition-colors text-amber-600"
                                title="Reset to Draft"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => deleteRecord(row.id)}
                              className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-red-500"
                              title="Delete record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${row.id}-detail`} className={cn("border-b border-border/60", i % 2 === 0 ? "bg-background" : "bg-muted/10")}>
                          <td colSpan={11} className="px-6 pb-4 pt-0">
                            <div className="rounded-xl border border-border bg-slate-50 p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                              {/* Earnings */}
                              <div>
                                <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest mb-2 flex items-center gap-1">
                                  <TrendingUp className="w-3 h-3" /> Earnings
                                </p>
                                <div className="space-y-1 text-xs">
                                  <div className="flex justify-between"><span className="text-muted-foreground">Basic Salary</span><span className="font-medium">{fmt(row.basicSalary)}</span></div>
                                  {(row.transportAllowance || 0) > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Transport</span><span>{fmt(row.transportAllowance)}</span></div>}
                                  {(row.housingAllowance || 0) > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Housing</span><span>{fmt(row.housingAllowance)}</span></div>}
                                  {(row.otherAllowances || 0) > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Other Allowances</span><span>{fmt(row.otherAllowances)}</span></div>}
                                  <div className="flex justify-between border-t border-border/60 pt-1"><span className="text-muted-foreground italic text-[11px]">Sub Total</span><span className="italic">{fmt(subTotal)}</span></div>
                                  {(row.absenceDeduction || 0) > 0 && <div className="flex justify-between text-red-600"><span>No-Pay Leave</span><span>−{fmt(row.absenceDeduction)}</span></div>}
                                  {(row.lateDeduction || 0) > 0 && <div className="flex justify-between text-amber-600"><span>Late Deduction ({row.lateDays}d)</span><span>−{fmt(row.lateDeduction)}</span></div>}
                                  <div className="flex justify-between border-t border-border/60 pt-1 font-semibold"><span>For EPF / ETF</span><span>{fmt(totalForEPF)}</span></div>
                                  {(row.overtimePay || 0) > 0 && <div className="flex justify-between text-violet-700"><span>Overtime ({row.overtimeHours.toFixed(1)}h)</span><span>+{fmt(row.overtimePay)}</span></div>}
                                  <div className="flex justify-between border-t-2 border-emerald-300 pt-1 font-bold text-emerald-700"><span>Total Earnings</span><span>{fmt(totalEarnings)}</span></div>
                                </div>
                              </div>
                              {/* Deductions / Recoveries */}
                              <div>
                                <p className="text-[10px] font-bold text-red-700 uppercase tracking-widest mb-2 flex items-center gap-1">
                                  <Minus className="w-3 h-3" /> Deductions
                                </p>
                                <div className="space-y-1 text-xs">
                                  <div className="flex justify-between"><span className="text-muted-foreground">EPF 8% (Employee)</span><span className="font-medium text-red-600">{fmt(row.epfEmployee)}</span></div>
                                  {(row.loanDeduction || 0) > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Loan Recovery</span><span className="text-red-600">{fmt(row.loanDeduction)}</span></div>}
                                  {(row.otherDeductions || 0) > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Other Deductions</span><span className="text-red-600">{fmt(row.otherDeductions)}</span></div>}
                                  {(row.apit || 0) > 0 && <div className="flex justify-between"><span className="text-muted-foreground">APIT (Income Tax)</span><span className="text-red-600">{fmt(row.apit)}</span></div>}
                                  <div className="flex justify-between border-t-2 border-red-300 pt-1 font-bold text-red-700"><span>Total Recoveries</span><span>{fmt(row.totalDeductions)}</span></div>
                                  <div className="flex justify-between border-t border-border/60 pt-2 font-bold text-primary text-sm"><span>Balance (Net Pay)</span><span>{fmt(row.netSalary)}</span></div>
                                </div>
                              </div>
                              {/* Statutory / Employer */}
                              <div>
                                <p className="text-[10px] font-bold text-violet-700 uppercase tracking-widest mb-2 flex items-center gap-1">
                                  <CreditCard className="w-3 h-3" /> Statutory (Employer Cost)
                                </p>
                                <div className="space-y-1 text-xs">
                                  <div className="flex justify-between"><span className="text-muted-foreground">EPF 12% (Employer)</span><span className="font-medium">{fmt(row.epfEmployer)}</span></div>
                                  <div className="flex justify-between"><span className="text-muted-foreground">ETF 3% (Employer)</span><span className="font-medium">{fmt(row.etfEmployer)}</span></div>
                                  <div className="flex justify-between border-t border-border/60 pt-1 font-semibold text-violet-700"><span>Total Employer Cost</span><span>{fmt(row.netSalary + (row.epfEmployer || 0) + (row.etfEmployer || 0))}</span></div>
                                </div>
                                <div className="mt-3 pt-3 border-t border-border/60">
                                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">EPF Numbers</p>
                                  {row.employee.epfNumber && <p className="text-xs text-muted-foreground">EPF: {row.employee.epfNumber}</p>}
                                  {row.employee.etfNumber && <p className="text-xs text-muted-foreground">ETF: {row.employee.etfNumber}</p>}
                                </div>
                                <button
                                  onClick={() => navigate(`/payroll/payslip/${row.id}`)}
                                  className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs font-medium text-primary border border-primary/30 rounded-lg py-1.5 hover:bg-primary/5 transition-colors"
                                >
                                  <FileText className="w-3.5 h-3.5" /> Open Full Payslip
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <div className="py-12 text-center text-muted-foreground text-sm">
              No payroll records match your filter.
            </div>
          )}
        </Card>
      )}

      {payroll.length === 0 && !loading && (
        <Card className="p-12 text-center">
          <UserCheck className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-muted-foreground font-medium mb-1">No payroll data for {MONTHS[month - 1]} {year}</p>
          <p className="text-xs text-muted-foreground mb-4">
            Click "Assign &amp; Generate Payroll" to select employees and calculate their salaries from attendance records.
          </p>
          <Button onClick={() => setShowGenerateModal(true)} className="text-xs mx-auto flex items-center gap-2">
            <UserCheck className="w-3.5 h-3.5" />
            Assign &amp; Generate Payroll
          </Button>
        </Card>
      )}

      {payslip   && <PayslipModal       row={payslip}    onClose={() => setPayslip(null)} />}
      {detailRow && <PayrollDetailModal row={detailRow}  onClose={() => setDetailRow(null)} />}

      {showGenerateModal && (
        <GeneratePayrollModal
          month={month}
          year={year}
          onClose={() => setShowGenerateModal(false)}
          onGenerated={() => {
            setShowGenerateModal(false);
            setMsg({ type: "success", text: `Payroll generated successfully for ${MONTHS[month - 1]} ${year}.` });
            fetchPayroll();
          }}
        />
      )}
    </div>
  );
}
