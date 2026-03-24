import { useState, useEffect, useCallback } from "react";
import { PageHeader, Card, Button, Input, Label } from "@/components/ui";
import {
  RefreshCw, AlertTriangle, X, Search, CheckCircle2,
  CalendarDays, Users, Edit2, Save, RotateCcw,
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
  annualLeaveBalance: number;
  casualLeaveBalance: number;
  annualLeaveUsed: number;
  casualLeaveUsed: number;
  lastAccrualDate: string | null;
  balanceId: number | null;
}

interface EditState { annual: string; casual: string; }

export default function LeaveBalances() {
  const year = new Date().getFullYear();
  const [records, setRecords] = useState<LeaveBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editState, setEditState] = useState<EditState>({ annual: "0", casual: "0" });
  const [saving, setSaving] = useState(false);
  const [accruing, setAccruing] = useState(false);
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

  function startEdit(rec: LeaveBalance) {
    setEditId(rec.employeeId);
    setEditState({ annual: String(rec.annualLeaveBalance), casual: String(rec.casualLeaveBalance) });
  }

  async function saveOverride(empId: number) {
    setSaving(true);
    try {
      const r = await fetch(apiUrl(`/leave-balances/${empId}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year,
          annualLeaveBalance: parseFloat(editState.annual) || 0,
          casualLeaveBalance: parseFloat(editState.casual) || 0,
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

  async function accrueAll() {
    setAccruing(true); setError(null);
    try {
      const r = await fetch(apiUrl("/leave-balances/accrue"), { method: "POST" });
      const d = await r.json();
      setActionMsg(d.message || "Accrual done.");
      load();
    } catch { setError("Failed to run accrual"); }
    setAccruing(false);
    setTimeout(() => setActionMsg(null), 4000);
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

  return (
    <div className="space-y-5 max-w-6xl">
      <PageHeader
        title="Leave Balances"
        description={`Annual & casual leave balances for ${year} — accrues at 1.5 days per week`}
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
          onClick={accrueAll}
          disabled={accruing}
          className="gap-2 shrink-0 bg-blue-600 hover:bg-blue-700 text-white"
        >
          {accruing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CalendarDays className="w-4 h-4" />}
          Run Accrual (1.5 days/week)
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
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Employees", value: records.length, icon: Users, color: "blue" },
          {
            label: "Avg Annual Balance",
            value: records.length ? (records.reduce((s, r) => s + r.annualLeaveBalance, 0) / records.length).toFixed(1) : "0",
            icon: CalendarDays, color: "green",
          },
          {
            label: "Avg Casual Balance",
            value: records.length ? (records.reduce((s, r) => s + r.casualLeaveBalance, 0) / records.length).toFixed(1) : "0",
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
                  <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Annual Balance</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Annual Used</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Casual Balance</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Casual Used</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Last Accrual</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-muted-foreground">
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
                            value={editState.annual} onChange={e => setEditState(s => ({ ...s, annual: e.target.value }))} />
                        ) : (
                          <span className={cn("font-bold text-base", rec.annualLeaveBalance < 3 ? "text-red-600" : "text-green-700")}>
                            {rec.annualLeaveBalance.toFixed(1)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-muted-foreground">{rec.annualLeaveUsed.toFixed(1)}</td>
                      <td className="px-4 py-3 text-center">
                        {isEditing ? (
                          <Input type="number" step="0.5" min="0" className="w-20 text-center h-8 text-sm mx-auto"
                            value={editState.casual} onChange={e => setEditState(s => ({ ...s, casual: e.target.value }))} />
                        ) : (
                          <span className={cn("font-bold text-base", rec.casualLeaveBalance < 2 ? "text-amber-600" : "text-blue-700")}>
                            {rec.casualLeaveBalance.toFixed(1)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-muted-foreground">{rec.casualLeaveUsed.toFixed(1)}</td>
                      <td className="px-4 py-3 text-center text-xs text-muted-foreground">
                        {rec.lastAccrualDate
                          ? new Date(rec.lastAccrualDate).toLocaleDateString("en-LK", { day: "numeric", month: "short" })
                          : <span className="italic">Never</span>}
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
