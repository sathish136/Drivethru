import { useState, useEffect, useMemo, useCallback, Fragment } from "react";
import {
  Clock, CheckCircle2, Banknote, AlertCircle, Search,
  ChevronDown, ChevronRight, RotateCcw, Pencil, X, Check,
  Building2, CalendarDays, Users, TrendingUp, Info,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
function apiUrl(path: string) { return `${BASE}/api${path}`; }

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function fmt(n: number) {
  return "Rs. " + Math.round(n).toLocaleString("en-LK");
}
function fmtHrs(h: number) {
  if (!h) return "0.00 h";
  return h.toFixed(2) + " h";
}

type OtStatus = "pending" | "approved" | "paid";

interface OtRow {
  id: number | null;
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  department: string;
  branchName: string;
  branchId: number;
  basicSalary: number;

  autoRegularOtHours: number;
  autoRegularOtAmount: number;
  autoHolidayOtHours: number;
  autoHolidayOtAmount: number;
  autoTotalOtAmount: number;

  isManualOverride: boolean;
  adjustedRegularOtHours: number | null;
  adjustedRegularOtAmount: number | null;
  adjustedHolidayOtHours: number | null;
  adjustedHolidayOtAmount: number | null;

  effectiveRegularOtHours: number;
  effectiveRegularOtAmount: number;
  effectiveHolidayOtHours: number;
  effectiveHolidayOtAmount: number;
  effectiveTotalOtAmount: number;

  notes: string | null;
  status: OtStatus;
}

interface Branch { id: number; name: string; }

interface EditState {
  regHours: string;
  regAmt: string;
  holHours: string;
  holAmt: string;
  notes: string;
}

function StatusBadge({ status }: { status: OtStatus }) {
  const map: Record<OtStatus, { cls: string; label: string }> = {
    pending:  { cls: "bg-amber-100 text-amber-700 border border-amber-200",       label: "Pending"  },
    approved: { cls: "bg-emerald-100 text-emerald-700 border border-emerald-200", label: "Approved" },
    paid:     { cls: "bg-blue-100 text-blue-700 border border-blue-200",          label: "Paid"     },
  };
  const c = map[status] ?? map.pending;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${c.cls}`}>
      {c.label}
    </span>
  );
}

/* ── Detail panel shown when a row is expanded ─────────────── */
function DetailPanel({
  row, editing, editState, setEditState, saving,
  onStartEdit, onSave, onCancel, onRemoveOverride, onApprove, onPay, actionLoading,
}: {
  row: OtRow;
  editing: boolean;
  editState: EditState | null;
  setEditState: (fn: (s: EditState | null) => EditState | null) => void;
  saving: boolean;
  onStartEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onRemoveOverride: () => void;
  onApprove: () => void;
  onPay: () => void;
  actionLoading: boolean;
}) {
  const regOtAmt   = row.isManualOverride && row.adjustedRegularOtAmount  != null ? row.adjustedRegularOtAmount  : row.autoRegularOtAmount;
  const holOtAmt   = row.isManualOverride && row.adjustedHolidayOtAmount  != null ? row.adjustedHolidayOtAmount  : row.autoHolidayOtAmount;
  const regOtHrs   = row.isManualOverride && row.adjustedRegularOtHours   != null ? row.adjustedRegularOtHours   : row.autoRegularOtHours;
  const holOtHrs   = row.isManualOverride && row.adjustedHolidayOtHours   != null ? row.adjustedHolidayOtHours   : row.autoHolidayOtHours;

  const regHourlyRate = row.basicSalary > 0 ? (row.basicSalary / 240 * 1.5).toFixed(2) : "—";
  const holHourlyRate = row.basicSalary > 0 ? (row.basicSalary / 240).toFixed(2) : "—";

  return (
    <tr>
      <td colSpan={6} className="px-0 pb-0">
        <div className="mx-3 mb-3 rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/60 to-white shadow-sm overflow-hidden">

          {/* ── Header bar ── */}
          <div className="flex items-center justify-between px-4 py-2 bg-blue-50 border-b border-blue-100">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-blue-800">{row.employeeName}</span>
              <span className="text-[10px] text-blue-500">#{row.employeeCode}</span>
              <span className="text-[10px] text-gray-400">·</span>
              <span className="text-[10px] text-gray-500">{row.department}</span>
              <span className="text-[10px] text-gray-400">·</span>
              <span className="flex items-center gap-0.5 text-[10px] text-gray-500">
                <Building2 className="w-3 h-3" />{row.branchName}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
              <Info className="w-3 h-3" />
              Basic: {fmt(row.basicSalary)}
            </div>
          </div>

          {/* ── OT breakdown grid ── */}
          <div className="grid grid-cols-2 gap-0 divide-x divide-gray-100">

            {/* Regular OT */}
            <div className="p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-xs font-bold text-gray-700">Regular OT</span>
                {row.isManualOverride && row.adjustedRegularOtHours != null && (
                  <span className="text-[9px] font-semibold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full">OVERRIDE</span>
                )}
              </div>

              {editing ? (
                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] font-semibold text-gray-500 block mb-1">Hours</label>
                    <input
                      type="number" min="0" step="0.5"
                      value={editState!.regHours}
                      onChange={e => {
                        const hrs = e.target.value;
                        const rate = row.basicSalary > 0 ? row.basicSalary / 240 * 1.5 : 0;
                        const amt = Math.round((parseFloat(hrs) || 0) * rate);
                        setEditState(s => s ? { ...s, regHours: hrs, regAmt: String(amt) } : s);
                      }}
                      className="w-full px-2.5 py-1.5 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-gray-500 block mb-1">Amount (Rs.) <span className="text-blue-400 font-normal">— auto from hrs</span></label>
                    <input
                      type="number" min="0" step="1"
                      value={editState!.regAmt}
                      onChange={e => setEditState(s => s ? { ...s, regAmt: e.target.value } : s)}
                      className="w-full px-2.5 py-1.5 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-gray-500">Hours</span>
                    <span className="text-sm font-bold text-gray-900">{fmtHrs(regOtHrs)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-gray-500">Amount</span>
                    <span className="text-sm font-bold text-blue-700">{fmt(regOtAmt)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-gray-100">
                    <span className="text-[10px] text-gray-400">Hourly rate</span>
                    <span className="text-[10px] text-gray-400">Rs. {regHourlyRate}</span>
                  </div>
                  {row.isManualOverride && row.adjustedRegularOtHours != null && (
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-gray-400">Auto (original)</span>
                      <span className="text-[10px] text-gray-400 line-through">{fmtHrs(row.autoRegularOtHours)} / {fmt(row.autoRegularOtAmount)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Holiday OT */}
            <div className="p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <CalendarDays className="w-3.5 h-3.5 text-orange-500" />
                <span className="text-xs font-bold text-gray-700">Holiday OT</span>
                {row.isManualOverride && row.adjustedHolidayOtHours != null && (
                  <span className="text-[9px] font-semibold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full">OVERRIDE</span>
                )}
              </div>

              {editing ? (
                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] font-semibold text-gray-500 block mb-1">Hours</label>
                    <input
                      type="number" min="0" step="0.5"
                      value={editState!.holHours}
                      onChange={e => {
                        const hrs = e.target.value;
                        const rate = row.basicSalary > 0 ? row.basicSalary / 240 * 1.5 : 0;
                        const amt = Math.round((parseFloat(hrs) || 0) * rate);
                        setEditState(s => s ? { ...s, holHours: hrs, holAmt: String(amt) } : s);
                      }}
                      className="w-full px-2.5 py-1.5 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-gray-500 block mb-1">Amount (Rs.) <span className="text-orange-400 font-normal">— auto from hrs</span></label>
                    <input
                      type="number" min="0" step="1"
                      value={editState!.holAmt}
                      onChange={e => setEditState(s => s ? { ...s, holAmt: e.target.value } : s)}
                      className="w-full px-2.5 py-1.5 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-gray-500">Hours</span>
                    <span className="text-sm font-bold text-gray-900">{fmtHrs(holOtHrs)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-gray-500">Amount</span>
                    <span className="text-sm font-bold text-orange-600">{fmt(holOtAmt)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-gray-100">
                    <span className="text-[10px] text-gray-400">Hourly rate (×1.5–2.0)</span>
                    <span className="text-[10px] text-gray-400">Rs. {holHourlyRate} base</span>
                  </div>
                  {row.isManualOverride && row.adjustedHolidayOtHours != null && (
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-gray-400">Auto (original)</span>
                      <span className="text-[10px] text-gray-400 line-through">{fmtHrs(row.autoHolidayOtHours)} / {fmt(row.autoHolidayOtAmount)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Notes + Total + Action bar ── */}
          <div className="flex items-center justify-between gap-3 px-4 py-3 bg-gray-50 border-t border-gray-100">
            <div className="flex items-center gap-3 flex-1">
              {/* Notes */}
              {editing ? (
                <div className="flex items-center gap-2 flex-1">
                  <label className="text-[10px] font-semibold text-gray-500 whitespace-nowrap">Notes:</label>
                  <input
                    type="text"
                    value={editState!.notes}
                    onChange={e => setEditState(s => s ? { ...s, notes: e.target.value } : s)}
                    placeholder="Reason for adjustment..."
                    className="flex-1 px-2.5 py-1.5 text-xs border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
              ) : (
                row.notes
                  ? <span className="text-[11px] text-gray-500 italic">"{row.notes}"</span>
                  : <span className="text-[11px] text-gray-400">No notes</span>
              )}
            </div>

            {/* Total */}
            <div className="text-right shrink-0">
              <div className="text-[10px] text-gray-400">Total OT</div>
              {editing && editState ? (
                <div className="text-base font-extrabold text-emerald-700">
                  {fmt((parseFloat(editState.regAmt) || 0) + (parseFloat(editState.holAmt) || 0))}
                </div>
              ) : (
                <div className="text-base font-extrabold text-gray-900">{fmt(row.effectiveTotalOtAmount)}</div>
              )}
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              {editing ? (
                <>
                  <button
                    onClick={onSave}
                    disabled={saving}
                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {saving ? "Saving…" : "Save Override"}
                  </button>
                  <button
                    onClick={onCancel}
                    className="flex items-center gap-1 px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-semibold rounded-lg transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  {row.status !== "paid" && (
                    <button
                      onClick={onStartEdit}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs font-semibold rounded-lg transition-colors"
                    >
                      <Pencil className="w-3 h-3" />
                      Adjust
                    </button>
                  )}
                  {row.isManualOverride && row.status !== "paid" && (
                    <button
                      onClick={onRemoveOverride}
                      className="flex items-center gap-1 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-700 text-xs font-semibold rounded-lg transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Revert
                    </button>
                  )}
                  {row.status === "pending" && (
                    <button
                      onClick={onApprove}
                      disabled={actionLoading}
                      className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {actionLoading ? "…" : "Approve"}
                    </button>
                  )}
                  {row.status === "approved" && (
                    <button
                      onClick={onPay}
                      disabled={actionLoading}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Banknote className="w-3.5 h-3.5" />
                      {actionLoading ? "…" : "Mark Paid"}
                    </button>
                  )}
                  {row.status === "paid" && (
                    <span className="text-xs text-blue-600 font-semibold">✓ Paid</span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}

/* ═══════════════════════════════════════════════════════════ */

export default function OtManagement() {
  const now = new Date();
  const [year,     setYear]     = useState(now.getFullYear());
  const [month,    setMonth]    = useState(now.getMonth() + 1);
  const [branchId, setBranchId] = useState<number | null>(null);
  const [search,   setSearch]   = useState("");

  const [rows,     setRows]     = useState<OtRow[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [success,  setSuccess]  = useState<string | null>(null);

  const [expandedId,    setExpandedId]    = useState<number | null>(null);
  const [editingId,     setEditingId]     = useState<number | null>(null);
  const [editState,     setEditState]     = useState<EditState | null>(null);
  const [saving,        setSaving]        = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  function showMsg(msg: string, isError = false) {
    if (isError) { setError(msg); setSuccess(null); }
    else         { setSuccess(msg); setError(null); }
    setTimeout(() => { setError(null); setSuccess(null); }, 3500);
  }

  useEffect(() => {
    fetch(apiUrl("/branches"))
      .then(r => r.json())
      .then(d => Array.isArray(d) ? setBranches(d) : [])
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ year: String(year), month: String(month) });
      if (branchId) params.set("branchId", String(branchId));
      const r = await fetch(apiUrl(`/ot-management?${params}`));
      const d = await r.json();
      if (Array.isArray(d)) setRows(d);
      else setError(d.message ?? "Failed to load OT data");
    } catch { setError("Network error"); }
    setLoading(false);
  }, [year, month, branchId]);

  useEffect(() => { load(); }, [load]);

  const summary = useMemo(() => ({
    totalRegHours:  rows.reduce((s, r) => s + r.effectiveRegularOtHours, 0),
    totalHolHours:  rows.reduce((s, r) => s + r.effectiveHolidayOtHours, 0),
    totalAmount:    rows.reduce((s, r) => s + r.effectiveTotalOtAmount, 0),
    pendingCount:   rows.filter(r => r.status === "pending").length,
    approvedCount:  rows.filter(r => r.status === "approved").length,
    paidCount:      rows.filter(r => r.status === "paid").length,
    overrideCount:  rows.filter(r => r.isManualOverride).length,
  }), [rows]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(r =>
      r.employeeName.toLowerCase().includes(q) ||
      r.employeeCode.toLowerCase().includes(q) ||
      r.department.toLowerCase().includes(q)
    );
  }, [rows, search]);

  function toggleExpand(empId: number) {
    if (expandedId === empId) {
      setExpandedId(null);
      if (editingId === empId) { setEditingId(null); setEditState(null); }
    } else {
      setExpandedId(empId);
      setEditingId(null);
      setEditState(null);
    }
  }

  function startEdit(row: OtRow) {
    setEditingId(row.employeeId);
    setEditState({
      regHours: String(row.isManualOverride && row.adjustedRegularOtHours  != null ? row.adjustedRegularOtHours  : row.autoRegularOtHours),
      regAmt:   String(row.isManualOverride && row.adjustedRegularOtAmount != null ? row.adjustedRegularOtAmount : row.autoRegularOtAmount),
      holHours: String(row.isManualOverride && row.adjustedHolidayOtHours  != null ? row.adjustedHolidayOtHours  : row.autoHolidayOtHours),
      holAmt:   String(row.isManualOverride && row.adjustedHolidayOtAmount != null ? row.adjustedHolidayOtAmount : row.autoHolidayOtAmount),
      notes:    row.notes ?? "",
    });
  }

  function cancelEdit() { setEditingId(null); setEditState(null); }

  async function saveOverride(row: OtRow) {
    if (!editState) return;
    setSaving(true);
    try {
      const r = await fetch(apiUrl(`/ot-management/${row.employeeId}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year, month,
          isManualOverride: true,
          autoRegularOtHours:  row.autoRegularOtHours,
          autoRegularOtAmount: row.autoRegularOtAmount,
          autoHolidayOtHours:  row.autoHolidayOtHours,
          autoHolidayOtAmount: row.autoHolidayOtAmount,
          adjustedRegularOtHours:  parseFloat(editState.regHours) || 0,
          adjustedRegularOtAmount: parseFloat(editState.regAmt)   || 0,
          adjustedHolidayOtHours:  parseFloat(editState.holHours) || 0,
          adjustedHolidayOtAmount: parseFloat(editState.holAmt)   || 0,
          notes: editState.notes,
        }),
      });
      const d = await r.json();
      if (d.success) { showMsg("OT override saved"); cancelEdit(); load(); }
      else showMsg(d.message ?? "Save failed", true);
    } catch { showMsg("Save failed", true); }
    setSaving(false);
  }

  async function removeOverride(row: OtRow) {
    if (!confirm(`Remove manual override for ${row.employeeName}?`)) return;
    await fetch(apiUrl(`/ot-management/${row.employeeId}/override?year=${year}&month=${month}`), { method: "DELETE" });
    showMsg("Override removed");
    load();
  }

  async function approveRow(row: OtRow) {
    setActionLoading(row.employeeId);
    try {
      const r = await fetch(apiUrl(`/ot-management/${row.employeeId}/approve`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, month,
          autoRegularOtHours: row.autoRegularOtHours, autoRegularOtAmount: row.autoRegularOtAmount,
          autoHolidayOtHours: row.autoHolidayOtHours, autoHolidayOtAmount: row.autoHolidayOtAmount }),
      });
      const d = await r.json();
      if (d.success) { showMsg("OT approved"); load(); }
      else showMsg(d.message ?? "Failed", true);
    } catch { showMsg("Approve failed", true); }
    setActionLoading(null);
  }

  async function payRow(row: OtRow) {
    setActionLoading(row.employeeId);
    try {
      const r = await fetch(apiUrl(`/ot-management/${row.employeeId}/pay`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, month }),
      });
      const d = await r.json();
      if (d.success) { showMsg("Marked as paid"); load(); }
      else showMsg(d.message ?? "Failed", true);
    } catch { showMsg("Failed", true); }
    setActionLoading(null);
  }

  async function approveAll() {
    const pending = rows.filter(r => r.status === "pending");
    if (!pending.length) { showMsg("No pending OT records", true); return; }
    if (!confirm(`Approve OT for all ${pending.length} pending employees?`)) return;
    setLoading(true);
    for (const row of pending) {
      await fetch(apiUrl(`/ot-management/${row.employeeId}/approve`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, month,
          autoRegularOtHours: row.autoRegularOtHours, autoRegularOtAmount: row.autoRegularOtAmount,
          autoHolidayOtHours: row.autoHolidayOtHours, autoHolidayOtAmount: row.autoHolidayOtAmount }),
      }).catch(() => {});
    }
    showMsg(`Approved ${pending.length} employees`);
    load();
  }

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  return (
    <div className="space-y-4 max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            OT Management
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">Click any row to expand details · Adjust and approve overtime per employee</p>
        </div>
        <button
          onClick={approveAll}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Approve All Pending
        </button>
      </div>

      {error   && <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700"><AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}</div>}
      {success && <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700"><CheckCircle2 className="w-3.5 h-3.5 shrink-0" />{success}</div>}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Month</label>
            <div className="relative">
              <select value={month} onChange={e => setMonth(Number(e.target.value))}
                className="pl-2 pr-7 py-1.5 text-xs border border-gray-200 rounded-lg bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-primary/30">
                {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
              <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Year</label>
            <div className="relative">
              <select value={year} onChange={e => setYear(Number(e.target.value))}
                className="pl-2 pr-7 py-1.5 text-xs border border-gray-200 rounded-lg bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-primary/30">
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Branch</label>
            <div className="relative">
              <select value={branchId ?? ""} onChange={e => setBranchId(e.target.value ? Number(e.target.value) : null)}
                className="pl-2 pr-7 py-1.5 text-xs border border-gray-200 rounded-lg bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-primary/30 min-w-[160px]">
                <option value="">All Branches</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Search</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Name, ID, department…" value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Regular OT</span>
          </div>
          <p className="text-lg font-bold text-gray-900">{summary.totalRegHours.toFixed(1)} h</p>
          <p className="text-[10px] text-gray-400">{rows.length} employees</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center">
              <CalendarDays className="w-3.5 h-3.5 text-orange-600" />
            </div>
            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Holiday OT</span>
          </div>
          <p className="text-lg font-bold text-gray-900">{summary.totalHolHours.toFixed(1)} h</p>
          <p className="text-[10px] text-gray-400">across all employees</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Banknote className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Total OT Amount</span>
          </div>
          <p className="text-lg font-bold text-gray-900">{fmt(summary.totalAmount)}</p>
          <p className="text-[10px] text-gray-400">{summary.overrideCount} manual override{summary.overrideCount !== 1 ? "s" : ""}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center">
              <Users className="w-3.5 h-3.5 text-purple-600" />
            </div>
            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Status</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-amber-600">{summary.pendingCount} Pending</span>
            <span className="text-gray-300">·</span>
            <span className="text-xs font-bold text-emerald-600">{summary.approvedCount} Approved</span>
            <span className="text-gray-300">·</span>
            <span className="text-xs font-bold text-blue-600">{summary.paidCount} Paid</span>
          </div>
          <p className="text-[10px] text-gray-400 mt-0.5">{MONTHS[month - 1]} {year}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="w-6 px-2 py-2.5" />
                <th className="px-3 py-2.5 text-left font-semibold text-gray-600 text-[11px]">Employee</th>
                <th className="px-3 py-2.5 text-left font-semibold text-gray-600 text-[11px]">Department / Branch</th>
                <th className="px-3 py-2.5 text-right font-semibold text-gray-600 text-[11px]">Total OT Amount</th>
                <th className="px-3 py-2.5 text-center font-semibold text-gray-600 text-[11px]">Status</th>
                <th className="px-3 py-2.5 text-center font-semibold text-gray-600 text-[11px]">Quick Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">Loading OT data…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">No employees found</td></tr>
              ) : filtered.map(row => {
                const isExpanded = expandedId === row.employeeId;
                const isEditing  = editingId  === row.employeeId;
                const hasOt      = row.effectiveTotalOtAmount > 0;

                return (
                  <Fragment key={row.employeeId}>
                    {/* ── Compact row ── */}
                    <tr
                      onClick={() => toggleExpand(row.employeeId)}
                      className={`cursor-pointer border-b border-gray-100 transition-colors
                        ${isExpanded ? "bg-blue-50/50 border-b-0" : "hover:bg-gray-50"}
                        ${row.isManualOverride ? "border-l-2 border-l-amber-400" : ""}`}
                    >
                      {/* Expand chevron */}
                      <td className="pl-3 pr-1 py-3 text-gray-400">
                        {isExpanded
                          ? <ChevronDown className="w-3.5 h-3.5 text-blue-500" />
                          : <ChevronRight className="w-3.5 h-3.5" />}
                      </td>

                      {/* Name */}
                      <td className="px-3 py-3">
                        <div className="font-semibold text-gray-900">{row.employeeName}</div>
                        <div className="text-[10px] text-gray-400">{row.employeeCode}</div>
                      </td>

                      {/* Dept / Branch */}
                      <td className="px-3 py-3">
                        <div className="text-gray-700">{row.department}</div>
                        <div className="text-[10px] text-gray-400 flex items-center gap-0.5">
                          <Building2 className="w-3 h-3" />{row.branchName}
                        </div>
                      </td>

                      {/* Total OT */}
                      <td className="px-3 py-3 text-right">
                        <div className={`font-bold ${hasOt ? "text-gray-900" : "text-gray-400"}`}>
                          {fmt(row.effectiveTotalOtAmount)}
                        </div>
                        {row.isManualOverride && (
                          <div className="text-[9px] text-amber-600 font-semibold">OVERRIDE</div>
                        )}
                        {!hasOt && (
                          <div className="text-[10px] text-gray-400">No OT</div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3 text-center" onClick={e => e.stopPropagation()}>
                        <StatusBadge status={row.status} />
                      </td>

                      {/* Quick action — stops propagation so row expand doesn't trigger */}
                      <td className="px-3 py-3 text-center" onClick={e => e.stopPropagation()}>
                        {row.status === "pending" && (
                          <button
                            onClick={() => approveRow(row)}
                            disabled={actionLoading === row.employeeId}
                            className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-[11px] font-semibold rounded-lg transition-colors disabled:opacity-50"
                          >
                            {actionLoading === row.employeeId ? "…" : "Approve"}
                          </button>
                        )}
                        {row.status === "approved" && (
                          <button
                            onClick={() => payRow(row)}
                            disabled={actionLoading === row.employeeId}
                            className="px-2.5 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 text-[11px] font-semibold rounded-lg transition-colors disabled:opacity-50"
                          >
                            {actionLoading === row.employeeId ? "…" : "Mark Paid"}
                          </button>
                        )}
                        {row.status === "paid" && (
                          <span className="text-[11px] text-blue-500 font-semibold">✓ Paid</span>
                        )}
                      </td>
                    </tr>

                    {/* ── Expanded detail panel ── */}
                    {isExpanded && (
                      <DetailPanel
                        key={`detail-${row.employeeId}`}
                        row={row}
                        editing={isEditing}
                        editState={editState}
                        setEditState={setEditState}
                        saving={saving}
                        onStartEdit={() => startEdit(row)}
                        onSave={() => saveOverride(row)}
                        onCancel={cancelEdit}
                        onRemoveOverride={() => removeOverride(row)}
                        onApprove={() => approveRow(row)}
                        onPay={() => payRow(row)}
                        actionLoading={actionLoading === row.employeeId}
                      />
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 flex items-center gap-3 text-[10px] text-gray-500">
          <span>Click a row to expand full OT details</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span> Amber left-border = manual override active</span>
          <span className="ml-auto font-medium">{filtered.length} of {rows.length} employees · {MONTHS[month - 1]} {year}</span>
        </div>
      </div>
    </div>
  );
}
