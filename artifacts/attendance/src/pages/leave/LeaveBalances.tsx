import { useState, useEffect, useCallback } from "react";
import { PageHeader, Card, Button, Input, Label } from "@/components/ui";
import {
  RefreshCw, AlertTriangle, X, Search, CheckCircle2,
  CalendarDays, Users, Edit2, Save, RotateCcw, Download, FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
function apiUrl(path: string) { return `${BASE}/api${path}`; }

interface LeaveBalance {
  employeeId: number;
  employeeCode: string;
  fullName: string;
  designation: string;
  department: string;
  year: number;
  leaveBalance?: number;
  leaveUsed?: number;
  leaveRemaining?: number;
  annualLeaveBalance?: number;
  annualLeaveUsed?: number;
  lastAccrualDate: string | null;
  balanceId: number | null;
}

interface EditState { leaveBalance: string; leaveUsed: string; }

export default function LeaveBalances() {
  const year = new Date().getFullYear();
  const [records, setRecords] = useState<LeaveBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editState, setEditState] = useState<EditState>({ leaveBalance: "21", leaveUsed: "0" });
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true); setError(null);
    fetch(apiUrl(`/leave-balances?year=${year}`))
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setRecords(d); else setError("Unexpected response"); })
      .catch(() => setError("Failed to load leave balances"))
      .finally(() => setLoading(false));
  }, [year]);

  useEffect(() => { load(); }, [load]);

  const getLeaveBalance = (r: LeaveBalance) => r.leaveBalance ?? r.annualLeaveBalance ?? 21;
  const getLeaveUsed = (r: LeaveBalance) => r.leaveUsed ?? r.annualLeaveUsed ?? 0;
  const getLeaveRemaining = (r: LeaveBalance) => r.leaveRemaining ?? (getLeaveBalance(r) - getLeaveUsed(r));

  function startEdit(rec: LeaveBalance) {
    setEditId(rec.employeeId);
    setEditState({
      leaveBalance: String(getLeaveBalance(rec)),
      leaveUsed: String(getLeaveUsed(rec)),
    });
  }

  async function saveOverride(empId: number) {
    setSaving(true);
    try {
      const r = await fetch(apiUrl(`/leave-balances/${empId}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year,
          leaveBalance: parseFloat(editState.leaveBalance) || 0,
          leaveUsed: parseFloat(editState.leaveUsed) || 0,
        }),
      });
      const d = await r.json();
      if (d.id || d.employeeId) {
        setEditId(null);
        setActionMsg("Leave balance updated.");
        load();
      } else { setError(d.message || "Save failed"); }
    } catch { setError("Failed to save balance"); }
    setSaving(false);
    setTimeout(() => setActionMsg(null), 3000);
  }

  async function syncUsed() {
    setSyncing(true); setError(null);
    try {
      const r = await fetch(apiUrl("/leave-balances/sync-used"), { method: "POST" });
      const d = await r.json();
      setActionMsg(d.message || "Sync complete.");
      load();
    } catch { setError("Failed to sync used leave"); }
    setSyncing(false);
    setTimeout(() => setActionMsg(null), 4000);
  }

  const filtered = records.filter(r =>
    !search ||
    r.fullName?.toLowerCase().includes(search.toLowerCase()) ||
    r.employeeCode?.toLowerCase().includes(search.toLowerCase()) ||
    r.department?.toLowerCase().includes(search.toLowerCase())
  );

  const totalEmployees = records.length;

  function exportReport() {
    const dataToExport = search ? filtered : records;
    const headers = [
      "Employee ID",
      "Full Name",
      "Department",
      "Designation",
      "Total Leave (days)",
      "Used (days)",
      "Remaining (days)",
      "Year",
    ];
    const rows = dataToExport.map(rec => {
      const bal = getLeaveBalance(rec);
      const used = getLeaveUsed(rec);
      const rem = getLeaveRemaining(rec);
      return [
        rec.employeeCode,
        rec.fullName,
        rec.department,
        rec.designation,
        bal.toFixed(1),
        used.toFixed(1),
        rem.toFixed(1),
        rec.year,
      ];
    });

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leave-balances-${year}${search ? "-filtered" : ""}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportPDF() {
    const dataToExport = search ? filtered : records;
    const tableRows = dataToExport.map((rec, i) => {
      const bal = getLeaveBalance(rec);
      const used = getLeaveUsed(rec);
      const rem = getLeaveRemaining(rec);
      const remColor = rem < 0 ? "#dc2626" : rem < 5 ? "#d97706" : "#15803d";
      const bg = i % 2 === 0 ? "#ffffff" : "#f9fafb";
      return `
        <tr style="background:${bg}">
          <td style="padding:7px 10px;border-bottom:1px solid #e5e7eb;font-size:12px;font-family:monospace">${rec.employeeCode}</td>
          <td style="padding:7px 10px;border-bottom:1px solid #e5e7eb;font-size:12px">${rec.fullName}</td>
          <td style="padding:7px 10px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#6b7280">${rec.department}</td>
          <td style="padding:7px 10px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#6b7280">${rec.designation}</td>
          <td style="padding:7px 10px;border-bottom:1px solid #e5e7eb;font-size:12px;text-align:center;font-weight:600">${bal.toFixed(1)}</td>
          <td style="padding:7px 10px;border-bottom:1px solid #e5e7eb;font-size:12px;text-align:center;color:#6b7280">${used.toFixed(1)}</td>
          <td style="padding:7px 10px;border-bottom:1px solid #e5e7eb;font-size:12px;text-align:center;font-weight:700;color:${remColor}">${rem.toFixed(1)}</td>
        </tr>`;
    }).join("");

    const html = `
      <div style="font-family:Arial,sans-serif;padding:32px;max-width:900px;margin:0 auto">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
          <div>
            <h1 style="margin:0;font-size:22px;font-weight:700;color:#111827">Leave Balance Report</h1>
            <p style="margin:4px 0 0;font-size:13px;color:#6b7280">Year ${year} · Total entitlement: 21 days per employee</p>
          </div>
          <div style="text-align:right;font-size:12px;color:#9ca3af">
            Generated: ${new Date().toLocaleDateString("en-GB", { day:"numeric", month:"long", year:"numeric" })}<br/>
            ${dataToExport.length} employee${dataToExport.length !== 1 ? "s" : ""}${search ? " (filtered)" : ""}
          </div>
        </div>
        <hr style="border:none;border-top:2px solid #3b82f6;margin:16px 0"/>

        <div style="display:flex;gap:16px;margin-bottom:20px">
          ${[
            ["Total Employees", dataToExport.length, "#3b82f6"],
            ["Avg Remaining", (dataToExport.reduce((s,r) => s + getLeaveRemaining(r), 0) / (dataToExport.length || 1)).toFixed(1) + " days", "#15803d"],
            ["Avg Used", (dataToExport.reduce((s,r) => s + getLeaveUsed(r), 0) / (dataToExport.length || 1)).toFixed(1) + " days", "#9333ea"],
          ].map(([label, value, color]) => `
            <div style="flex:1;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px 16px">
              <div style="font-size:20px;font-weight:700;color:${color}">${value}</div>
              <div style="font-size:11px;color:#9ca3af;margin-top:2px">${label}</div>
            </div>`).join("")}
        </div>

        <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
          <thead>
            <tr style="background:#1e40af;color:#fff">
              <th style="padding:10px;text-align:left;font-size:11px;font-weight:600;letter-spacing:.5px">EMPLOYEE ID</th>
              <th style="padding:10px;text-align:left;font-size:11px;font-weight:600;letter-spacing:.5px">FULL NAME</th>
              <th style="padding:10px;text-align:left;font-size:11px;font-weight:600;letter-spacing:.5px">DEPARTMENT</th>
              <th style="padding:10px;text-align:left;font-size:11px;font-weight:600;letter-spacing:.5px">DESIGNATION</th>
              <th style="padding:10px;text-align:center;font-size:11px;font-weight:600;letter-spacing:.5px">TOTAL</th>
              <th style="padding:10px;text-align:center;font-size:11px;font-weight:600;letter-spacing:.5px">USED</th>
              <th style="padding:10px;text-align:center;font-size:11px;font-weight:600;letter-spacing:.5px">REMAINING</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>

        <p style="margin-top:24px;font-size:10px;color:#9ca3af;text-align:center">
          Post Office Attendance Management System · Leave Balance Report ${year}
        </p>
      </div>`;

    const el = document.createElement("div");
    el.innerHTML = html;
    document.body.appendChild(el);

    const html2pdf = (await import("html2pdf.js")).default;
    await html2pdf()
      .set({
        margin: 0,
        filename: `leave-balances-${year}${search ? "-filtered" : ""}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
      })
      .from(el)
      .save();

    document.body.removeChild(el);
  }
  const avgRemaining = records.length
    ? (records.reduce((s, r) => s + getLeaveRemaining(r), 0) / records.length).toFixed(1)
    : "0";
  const avgUsed = records.length
    ? (records.reduce((s, r) => s + getLeaveUsed(r), 0) / records.length).toFixed(1)
    : "0";

  return (
    <div className="space-y-5 max-w-6xl">
      <PageHeader
        title="Leave Balances"
        description={`Common leave balances for ${year} — 21 days total entitlement per employee`}
      />

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm bg-red-50 text-red-700 border border-red-200">
          <AlertTriangle className="w-4 h-4 shrink-0" />{error}
          <button onClick={() => setError(null)} className="ml-auto p-1 rounded hover:bg-red-100"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {actionMsg && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm bg-green-50 text-green-700 border border-green-200">
          <CheckCircle2 className="w-4 h-4 shrink-0" />{actionMsg}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by name, code, or department…" value={search}
            onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button variant="outline" onClick={load} className="gap-2 shrink-0">
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
        <Button
          variant="outline"
          onClick={syncUsed}
          disabled={syncing}
          className="gap-2 shrink-0"
        >
          {syncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
          Sync Used Leave
        </Button>
        <Button
          onClick={exportReport}
          disabled={records.length === 0}
          className="gap-2 shrink-0 bg-green-600 hover:bg-green-700 text-white"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
        <Button
          onClick={exportPDF}
          disabled={records.length === 0}
          className="gap-2 shrink-0 bg-rose-600 hover:bg-rose-700 text-white"
        >
          <FileText className="w-4 h-4" />
          Export PDF
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Employees", value: totalEmployees, icon: Users, color: "blue" },
          {
            label: "Avg Leave Remaining",
            value: avgRemaining,
            icon: CalendarDays, color: "green",
          },
          {
            label: "Avg Leave Used",
            value: avgUsed,
            icon: CalendarDays, color: "violet",
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="p-4 flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
              color === "blue" ? "bg-blue-50" : color === "green" ? "bg-green-50" : "bg-violet-50")}>
              <Icon className={cn("w-5 h-5", color === "blue" ? "text-blue-600" : color === "green" ? "text-green-600" : "text-violet-600")} />
            </div>
            <div>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
          <RefreshCw className="w-5 h-5 animate-spin" /><span>Loading leave balances…</span>
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Employee</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Department</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Total</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Used</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Remaining</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-muted-foreground">
                      {search ? "No employees match your search." : "No leave balance records found."}
                    </td>
                  </tr>
                ) : filtered.map(rec => {
                  const isEditing = editId === rec.employeeId;
                  return (
                    <tr key={rec.employeeId} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold">{rec.fullName}</div>
                        <div className="text-xs text-muted-foreground font-mono">{rec.employeeCode}</div>
                        <div className="text-xs text-muted-foreground">{rec.designation}</div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-sm">{rec.department}</td>
                      <td className="px-4 py-3 text-center">
                        {isEditing ? (
                          <Input type="number" step="0.5" min="0" className="w-20 text-center h-8 text-sm mx-auto"
                            value={editState.leaveBalance}
                            onChange={e => setEditState(s => ({ ...s, leaveBalance: e.target.value }))} />
                        ) : (
                          <span className="font-bold text-base text-foreground">
                            {(rec.leaveBalance ?? rec.annualLeaveBalance ?? 21).toFixed(1)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isEditing ? (
                          <Input type="number" step="0.5" min="0" className="w-20 text-center h-8 text-sm mx-auto"
                            value={editState.leaveUsed}
                            onChange={e => setEditState(s => ({ ...s, leaveUsed: e.target.value }))} />
                        ) : (
                          <span className="text-muted-foreground">{(rec.leaveUsed ?? rec.annualLeaveUsed ?? 0).toFixed(1)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {(() => {
                          const bal = rec.leaveBalance ?? rec.annualLeaveBalance ?? 21;
                          const used = rec.leaveUsed ?? rec.annualLeaveUsed ?? 0;
                          const rem = rec.leaveRemaining ?? (bal - used);
                          return (
                            <span className={cn("font-bold text-base",
                              rem < 0 ? "text-red-600"
                              : rem < 5 ? "text-amber-600"
                              : "text-green-700"
                            )}>
                              {rem.toFixed(1)}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => saveOverride(rec.employeeId)} disabled={saving}
                              className="p-1.5 rounded-lg hover:bg-green-100 text-green-600" title="Save">
                              {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                            </button>
                            <button onClick={() => setEditId(null)}
                              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground" title="Cancel">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => startEdit(rec)}
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground" title="Override balance">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
