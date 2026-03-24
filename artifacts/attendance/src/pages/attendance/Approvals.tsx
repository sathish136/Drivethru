import { useState, useEffect, useCallback } from "react";
import { PageHeader, Card, Badge, Button, Input } from "@/components/ui";
import { CheckCircle2, XCircle, Clock, User, Calendar, Search, RefreshCw, AlertTriangle, Fingerprint, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
function apiUrl(path: string) { return `${BASE}/api${path}`; }

interface PendingRecord {
  id: number;
  employeeId: number;
  employeeName: string;
  employeeCode: string;
  date: string;
  status: string;
  inTime1: string | null;
  outTime1: string | null;
  inTime2: string | null;
  outTime2: string | null;
  approvalStatus: string;
  approvalNote: string | null;
  manualNote: string | null;
  createdAt: string;
}

function formatTime(t: string | null) {
  if (!t) return "—";
  try { return new Date(t).toLocaleTimeString("en-LK", { hour: "2-digit", minute: "2-digit", hour12: true }); }
  catch { return t; }
}
function formatDate(d: string) {
  try { return new Date(d).toLocaleDateString("en-LK", { weekday: "short", year: "numeric", month: "short", day: "numeric" }); }
  catch { return d; }
}

export default function Approvals() {
  const [records, setRecords] = useState<PendingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [processing, setProcessing] = useState<Record<number, "approve" | "reject" | null>>({});
  const [done, setDone] = useState<Record<number, "approved" | "rejected">>({});

  const load = useCallback(() => {
    setLoading(true); setError(null);
    fetch(apiUrl("/attendance/pending-approvals"))
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setRecords(d); else setError("Unexpected response"); })
      .catch(() => setError("Failed to load pending approvals"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDecision(id: number, action: "approve" | "reject") {
    setProcessing(p => ({ ...p, [id]: action }));
    try {
      const r = await fetch(apiUrl(`/attendance/${id}/approve`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note: notes[id] || "" }),
      });
      const d = await r.json();
      if (d.id || d.success) {
        setDone(prev => ({ ...prev, [id]: action === "approve" ? "approved" : "rejected" }));
      } else {
        setError(d.message || "Action failed");
      }
    } catch { setError("Failed to process approval"); }
    setProcessing(p => ({ ...p, [id]: null }));
  }

  const filtered = records.filter(r => {
    if (done[r.id]) return false;
    return !search || r.employeeName?.toLowerCase().includes(search.toLowerCase()) ||
      r.employeeCode?.toLowerCase().includes(search.toLowerCase());
  });

  const pendingCount = records.filter(r => !done[r.id]).length;

  return (
    <div className="space-y-5 max-w-5xl">
      <PageHeader
        title="Attendance Approvals"
        description="Review and approve or reject manually-entered attendance punches"
      />

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm bg-red-50 text-red-700 border border-red-200">
          <AlertTriangle className="w-4 h-4 shrink-0" />{error}
          <button onClick={() => setError(null)} className="ml-auto p-1 rounded hover:bg-red-100">
            <XCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by name or employee code…" value={search}
            onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button variant="outline" onClick={load} className="gap-2 shrink-0">
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
        {pendingCount > 0 && (
          <span className="px-3 py-1.5 rounded-full text-sm font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            {pendingCount} pending
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
          <RefreshCw className="w-5 h-5 animate-spin" /><span>Loading pending approvals…</span>
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-14 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
          <p className="text-base font-semibold text-muted-foreground">No pending approvals</p>
          <p className="text-sm text-muted-foreground mt-1">All manual punch records have been reviewed.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(rec => (
            <Card key={rec.id} className="p-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0 border border-amber-200">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-sm">{rec.employeeName}</span>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded font-mono">{rec.employeeCode}</span>
                    <Badge variant="warning">Pending</Badge>
                    <span className={cn("text-xs px-2 py-0.5 rounded font-semibold uppercase tracking-wide",
                      rec.status === "present" ? "bg-green-100 text-green-700" :
                      rec.status === "late"    ? "bg-yellow-100 text-yellow-700" :
                      rec.status === "half_day"? "bg-blue-100 text-blue-700" :
                      "bg-muted text-muted-foreground")}>
                      {rec.status.replace("_", " ")}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(rec.date)}</span>
                    <span className="flex items-center gap-1"><Fingerprint className="w-3 h-3 text-violet-400" />Manual Entry</span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                    {[
                      { label: "In 1", val: formatTime(rec.inTime1) },
                      { label: "Out 1", val: formatTime(rec.outTime1) },
                      { label: "In 2", val: formatTime(rec.inTime2) },
                      { label: "Out 2", val: formatTime(rec.outTime2) },
                    ].map(({ label, val }) => (
                      <div key={label} className="p-2.5 rounded-lg bg-muted/40 border border-border text-center">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
                        <p className="text-sm font-mono font-semibold">{val}</p>
                      </div>
                    ))}
                  </div>

                  {rec.manualNote && (
                    <div className="mb-3 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-700 flex items-start gap-2">
                      <SlidersHorizontal className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span><strong>Submitter note:</strong> {rec.manualNote}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Approval note (optional)…"
                      value={notes[rec.id] || ""}
                      onChange={e => setNotes(n => ({ ...n, [rec.id]: e.target.value }))}
                      className="flex-1 text-sm h-9"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleDecision(rec.id, "approve")}
                      disabled={!!processing[rec.id]}
                      className="gap-1.5 bg-green-600 hover:bg-green-700 text-white shrink-0"
                    >
                      {processing[rec.id] === "approve" ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDecision(rec.id, "reject")}
                      disabled={!!processing[rec.id]}
                      className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50 shrink-0"
                    >
                      {processing[rec.id] === "reject" ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                      Reject
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
