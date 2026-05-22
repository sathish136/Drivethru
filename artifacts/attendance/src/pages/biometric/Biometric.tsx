import { useState, useRef, useEffect } from "react";
import { useListBiometricDevices, useCreateBiometricDevice, useUpdateBiometricDevice, useDeleteBiometricDevice, useTestBiometricDevice, useListBranches, useListBiometricLogs } from "@workspace/api-client-react";
import { PageHeader, Card, Button, Input, Select, Label } from "@/components/ui";
import { cn } from "@/lib/utils";
import { Plus, Edit2, Trash2, Wifi, WifiOff, AlertCircle, RefreshCw, Info, Copy, Upload, Database, CheckCircle2, XCircle, FileText, User, Calendar, Clock, Radio, Server } from "lucide-react";

const BASE_API = import.meta.env.BASE_URL.replace(/\/$/, "");

async function fetchAdmsStatus(): Promise<{ active: boolean; port: number; onlineCount: number; devices: { serialNumber: string; name: string; ipAddress: string; lastSync: string | null }[] }> {
  try {
    const r = await fetch(`${BASE_API}/api/biometric/adms-status`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}` },
    });
    return r.ok ? r.json() : { active: false, port: 8081, onlineCount: 0, devices: [] };
  } catch { return { active: false, port: 8081, onlineCount: 0, devices: [] }; }
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const DEVICE_STATUS: Record<string, { cls: string; icon: React.ElementType }> = {
  online: { cls: "bg-green-100 text-green-700", icon: Wifi },
  offline: { cls: "bg-gray-100 text-gray-600", icon: WifiOff },
  error: { cls: "bg-red-100 text-red-700", icon: AlertCircle },
};

type AdmsStatus = { active: boolean; port: number; onlineCount: number; devices: { serialNumber: string; name: string; ipAddress: string; lastSync: string | null }[] };
type Tab = "devices" | "logs" | "pdf-import" | "sqlite" | "setup";

interface DeviceForm {
  name: string; serialNumber: string; model: string;
  ipAddress: string; port: number; branchId: number;
  pushMethod: "zkpush" | "sdk"; apiKey: string; isActive: boolean;
}

const EMPTY_FORM: DeviceForm = {
  name: "", serialNumber: "", model: "ZKTeco F18",
  ipAddress: "", port: 4370, branchId: 0,
  pushMethod: "zkpush", apiKey: "", isActive: true,
};

export default function Biometric() {
  const [tab, setTab] = useState<Tab>("devices");
  const [admsStatus, setAdmsStatus] = useState<AdmsStatus | null>(null);

  useEffect(() => {
    fetchAdmsStatus().then(setAdmsStatus);
    const id = setInterval(() => fetchAdmsStatus().then(setAdmsStatus), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-4">
      <PageHeader title="Biometric Devices" description="Manage ZKTeco biometric devices and ZK Push ADMS configuration." />

      {admsStatus && (
        <div className={cn(
          "flex items-center gap-3 px-4 py-2.5 rounded-lg border text-xs font-medium",
          admsStatus.active
            ? "bg-green-50 border-green-200 text-green-800"
            : "bg-amber-50 border-amber-200 text-amber-800"
        )}>
          <Radio className={cn("w-3.5 h-3.5 flex-shrink-0", admsStatus.active ? "text-green-600" : "text-amber-600")} />
          <span>
            {admsStatus.active
              ? <>ZK Push ADMS server <strong>active on port 8081</strong> — point your ZKTeco devices here and they will appear automatically.</>
              : <>ZK Push ADMS server is <strong>not running</strong>. Restart the API server to enable auto-discovery.</>
            }
          </span>
          {admsStatus.active && admsStatus.onlineCount > 0 && (
            <span className="ml-auto flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
              <Wifi className="w-3 h-3" />{admsStatus.onlineCount} online
            </span>
          )}
        </div>
      )}

      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {([
          { id: "devices", label: "Devices" },
          { id: "logs", label: "Push Logs" },
          { id: "pdf-import", label: "PDF Import" },
          { id: "sqlite", label: "SQLite Sync" },
          { id: "setup", label: "ZK Push Setup Guide" },
        ] as const).map(({ id, label }) => (
          <button key={id} onClick={() => setTab(id)}
            className={cn("px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
              tab === id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            )}>
            {label}
          </button>
        ))}
      </div>

      {tab === "devices" && <DevicesTab />}
      {tab === "logs" && <LogsTab />}
      {tab === "pdf-import" && <PdfImportTab />}
      {tab === "sqlite" && <SqliteSyncTab />}
      {tab === "setup" && <SetupGuide />}
    </div>
  );
}

function DevicesTab() {
  const { data: devices, isLoading, refetch } = useListBiometricDevices();
  const { data: branches } = useListBranches();

  // Auto-refresh every 30 s so newly-connected devices appear without page reload
  useEffect(() => {
    const id = setInterval(() => refetch(), 30_000);
    return () => clearInterval(id);
  }, [refetch]);
  const create = useCreateBiometricDevice();
  const update = useUpdateBiometricDevice();
  const remove = useDeleteBiometricDevice();
  const test = useTestBiometricDevice();

  const [showForm, setShowForm] = useState(false);
  const [showAdmsAdd, setShowAdmsAdd] = useState(false);
  const [admsAddSn, setAdmsAddSn] = useState("");
  const [admsAddIp, setAdmsAddIp] = useState("");
  const [admsAddLoading, setAdmsAddLoading] = useState(false);
  const [admsAddError, setAdmsAddError] = useState<string | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<DeviceForm>(EMPTY_FORM);
  const [testResults, setTestResults] = useState<Record<number, { success: boolean; message: string }>>({});

  function openCreate() { setForm(EMPTY_FORM); setEditId(null); setShowForm(true); setShowAdmsAdd(false); }
  function openEdit(d: any) {
    setForm({ name: d.name, serialNumber: d.serialNumber, model: d.model, ipAddress: d.ipAddress, port: d.port, branchId: d.branchId, pushMethod: d.pushMethod, apiKey: d.apiKey || "", isActive: d.isActive });
    setEditId(d.id); setShowForm(true); setShowAdmsAdd(false);
  }
  function handleSave() {
    const payload = { ...form, apiKey: form.apiKey || null };
    if (editId) {
      update.mutate({ id: editId, data: payload }, { onSuccess: () => { setShowForm(false); refetch(); } });
    } else {
      create.mutate({ data: payload }, { onSuccess: () => { setShowForm(false); refetch(); } });
    }
  }
  function handleTest(id: number) {
    test.mutate({ id }, { onSuccess: (data) => setTestResults(r => ({ ...r, [id]: data })) });
  }
  function handleDelete(id: number) {
    if (!confirm("Delete this device? All associated logs will also be removed.")) return;
    remove.mutate({ id }, { onSuccess: () => refetch(), onError: () => alert("Failed to delete device.") });
  }
  async function handleAdmsAdd() {
    if (!admsAddSn.trim()) { setAdmsAddError("Serial number is required."); return; }
    setAdmsAddLoading(true); setAdmsAddError(null);
    try {
      const r = await fetch(`${BASE}/api/biometric/devices/adms-add`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}` },
        body: JSON.stringify({ serialNumber: admsAddSn.trim(), ip: admsAddIp.trim() || undefined }),
      });
      const data = await r.json();
      if (!data.success) { setAdmsAddError(data.message || "Failed to add device."); }
      else { setShowAdmsAdd(false); setAdmsAddSn(""); setAdmsAddIp(""); refetch(); }
    } catch { setAdmsAddError("Network error. Try again."); }
    finally { setAdmsAddLoading(false); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Server className="w-3.5 h-3.5 text-primary" />
          Devices connecting to port <strong>8081</strong> appear here automatically — no manual entry needed for ZK Push devices.
        </p>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => refetch()} className="flex items-center gap-2 text-xs">
            <RefreshCw className="w-3.5 h-3.5" />Refresh
          </Button>
          <Button variant="outline" onClick={() => { setShowAdmsAdd(v => !v); setShowForm(false); setAdmsAddError(null); }} className="flex items-center gap-2 text-xs border-green-300 text-green-700 hover:bg-green-50">
            <Radio className="w-3.5 h-3.5" />Add via ADMS
          </Button>
          <Button onClick={openCreate} className="flex items-center gap-2 text-xs">
            <Plus className="w-4 h-4" />Add Device
          </Button>
        </div>
      </div>

      {showAdmsAdd && (
        <Card className="p-4 border-green-200 bg-green-50/30">
          <h3 className="font-semibold text-sm mb-3 text-green-900 flex items-center gap-2">
            <Radio className="w-4 h-4 text-green-600" />Add Device via ADMS (port 8081)
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            Enter the serial number of a ZKTeco device that has already connected to port 8081. It will be registered directly in the device list.
          </p>
          <div className="flex gap-3 items-end flex-wrap">
            <div className="flex-1 min-w-[180px]">
              <Label className="text-xs">Serial Number <span className="text-red-500">*</span></Label>
              <Input placeholder="e.g. AABBCC123456" value={admsAddSn} onChange={e => setAdmsAddSn(e.target.value)} />
            </div>
            <div className="flex-1 min-w-[160px]">
              <Label className="text-xs">IP Address (optional)</Label>
              <Input placeholder="192.168.1.201" value={admsAddIp} onChange={e => setAdmsAddIp(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setShowAdmsAdd(false); setAdmsAddError(null); }}>Cancel</Button>
              <Button onClick={handleAdmsAdd} disabled={admsAddLoading} className="bg-green-600 hover:bg-green-700">
                {admsAddLoading ? "Adding..." : "Add Directly"}
              </Button>
            </div>
          </div>
          {admsAddError && <p className="text-xs text-red-600 mt-2">{admsAddError}</p>}
        </Card>
      )}

      {showForm && (
        <Card className="p-5 border-primary/30 bg-primary/5">
          <h3 className="font-semibold text-sm mb-4">{editId ? "Edit Device" : "Add New Device"}</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {([
              { key: "name", label: "Device Name", type: "text", placeholder: "e.g. Main Gate BIO" },
              { key: "serialNumber", label: "Serial Number", type: "text", placeholder: "XXXXXXXX" },
              { key: "model", label: "Model", type: "text", placeholder: "ZKTeco F18" },
              { key: "ipAddress", label: "IP Address", type: "text", placeholder: "192.168.1.201" },
              { key: "port", label: "Port", type: "number", placeholder: "4370" },
              { key: "apiKey", label: "API Key (Optional)", type: "text", placeholder: "zk-secret-key" },
            ] as const).map(({ key, label, type, placeholder }) => (
              <div key={key}>
                <Label className="text-xs">{label}</Label>
                <Input type={type} placeholder={placeholder} value={(form as any)[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: type === "number" ? Number(e.target.value) : e.target.value }))} />
              </div>
            ))}
            <div>
              <Label className="text-xs">Branch</Label>
              <Select value={form.branchId || ""} onChange={e => setForm(f => ({ ...f, branchId: Number(e.target.value) }))}>
                <option value="">Select Branch</option>
                {branches?.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Select>
            </div>
            <div>
              <Label className="text-xs">Push Method</Label>
              <Select value={form.pushMethod} onChange={e => setForm(f => ({ ...f, pushMethod: e.target.value as any }))}>
                <option value="zkpush">ZK Push (ADMS)</option>
                <option value="sdk">SDK Direct</option>
              </Select>
            </div>
            <div className="flex items-center gap-2 pt-5">
              <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} className="accent-primary" id="isActiveChk" />
              <label htmlFor="isActiveChk" className="text-sm">Active</label>
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={create.isPending || update.isPending}>
              {create.isPending || update.isPending ? "Saving..." : "Save Device"}
            </Button>
          </div>
        </Card>
      )}

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading devices...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr>
                  {["Device Name","Model","Serial No.","Branch","IP Address","ADMS Port","Push Method","Status","Last Seen","Actions"].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(devices || []).map((d: any) => {
                  const st = DEVICE_STATUS[d.status] || DEVICE_STATUS.offline;
                  const StatusIcon = st.icon;
                  const tr = testResults[d.id];
                  return (
                    <tr key={d.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-2 font-medium">{d.name}</td>
                      <td className="px-3 py-2 text-muted-foreground">{d.model}</td>
                      <td className="px-3 py-2 font-mono text-muted-foreground">{d.serialNumber}</td>
                      <td className="px-3 py-2 text-muted-foreground whitespace-nowrap max-w-[100px] truncate">{d.branchName}</td>
                      <td className="px-3 py-2 font-mono">{d.ipAddress}</td>
                      <td className="px-3 py-2 font-mono">{d.port}</td>
                      <td className="px-3 py-2">
                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">
                          {d.pushMethod === "zkpush" ? "ZK Push" : "SDK"}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className={cn("flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium w-fit", st.cls)}>
                          <StatusIcon className="w-3 h-3" />
                          {d.status}
                        </span>
                        {tr && <span className={cn("text-xs mt-0.5 block", tr.success ? "text-green-600" : "text-red-600")}>{tr.message}</span>}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{d.lastSync ? new Date(d.lastSync).toLocaleString() : "Never"}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <button onClick={() => handleTest(d.id)} className="p-1.5 hover:bg-green-100 text-green-600 rounded" title="Test Connection">
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => openEdit(d)} className="p-1.5 hover:bg-muted rounded text-muted-foreground">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(d.id)}
                            className="p-1.5 hover:bg-red-100 text-red-500 rounded" title="Remove device">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!devices?.length && (
                  <tr><td colSpan={10} className="text-center py-10 text-muted-foreground">
                    <Server className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="font-medium text-foreground mb-1">No devices connected yet</p>
                    <p className="text-xs">Configure your ZKTeco device to push to <strong>port 8081</strong> on this server — it will appear here automatically.</p>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function LogsTab() {
  const { data, isLoading } = useListBiometricLogs({});
  return (
    <Card className="overflow-hidden">
      {isLoading ? (
        <div className="p-8 text-center text-sm text-muted-foreground">Loading logs...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/50">
              <tr>
                {["Device","Biometric ID","Employee","Punch Time","Punch Type","Processed"].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(data?.logs || []).map(l => (
                <tr key={l.id} className="hover:bg-muted/30">
                  <td className="px-3 py-2 font-medium">{l.deviceName}</td>
                  <td className="px-3 py-2 font-mono text-muted-foreground">{l.biometricId}</td>
                  <td className="px-3 py-2">{l.employeeName}</td>
                  <td className="px-3 py-2 font-mono">{new Date(l.punchTime).toLocaleString()}</td>
                  <td className="px-3 py-2">
                    <span className={cn("px-2 py-0.5 rounded text-xs font-medium",
                      l.punchType === "in" ? "bg-green-100 text-green-700" :
                      l.punchType === "out" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
                    )}>{l.punchType.toUpperCase()}</span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={l.processed ? "text-green-600" : "text-amber-600"}>
                      {l.processed ? "✓ Processed" : "Pending"}
                    </span>
                  </td>
                </tr>
              ))}
              {!data?.logs?.length && (
                <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">No biometric push logs yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2 mt-1">
        <code className="flex-1 bg-muted px-3 py-2 rounded-lg text-xs font-mono border border-border truncate">{value}</code>
        <button onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          className="p-2 hover:bg-muted rounded-lg border border-border transition-colors">
          <Copy className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
        {copied && <span className="text-xs text-green-600">Copied!</span>}
      </div>
    </div>
  );
}

function SetupGuide() {
  const domain = typeof window !== "undefined" ? window.location.host : "your-domain.com";
  const hostOnly = domain.split(":")[0];
  return (
    <div className="space-y-4 max-w-4xl">
      <Card className="p-5 border-green-200 bg-green-50/20">
        <div className="flex items-center gap-3 mb-4">
          <Radio className="w-5 h-5 text-green-600" />
          <h3 className="font-semibold text-sm text-green-900">Built-in ZK Push ADMS Server — Port 8081</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          This system runs a native ZKTeco ADMS push server on <strong>port 8081</strong>. No Python service or external middleware is needed. Configure each device to push directly here and it will auto-register and appear in the Devices tab.
        </p>

        <div className="space-y-5">
          <div>
            <h4 className="font-semibold text-sm mb-2">Step 1: Server details to enter on the device</h4>
            <div className="space-y-2">
              <CopyField label="ADMS Server Address / Domain" value={hostOnly} />
              <CopyField label="ADMS Server Port" value="8081" />
              <CopyField label="Full URL (for reference)" value={`http://${hostOnly}:8081/iclock/cdata`} />
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-3">Step 2: Configure each ZKTeco Device</h4>
            <div className="space-y-2">
              {[
                ["1. Access Device Menu", "Press Menu on the device → Comm. Settings → Cloud Server Settings (ADMS)"],
                ["2. Enable ADMS / Cloud Server", "Set ADMS Enable = Yes / On"],
                ["3. Server Address", `Enter: ${hostOnly}`],
                ["4. Server Port", "Enter: 8081"],
                ["5. Upload Interval", "Set to 1 minute for near real-time (5 minutes is fine too)"],
                ["6. Enable Attendance Push", "Enable Attendance Push and Real-time Upload if shown"],
                ["7. Save & Restart", "Save settings and restart the device — it will connect within seconds"],
              ].map(([title, desc]) => (
                <div key={title} className="flex gap-3 p-3 bg-card rounded-lg border border-border">
                  <div className="text-xs">
                    <div className="font-semibold text-foreground">{title}</div>
                    <div className="text-muted-foreground mt-0.5">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-2">Step 3: Auto-Discovery</h4>
            <p className="text-xs text-muted-foreground">
              Once the device connects to port 8081, it will appear automatically in the <strong>Devices</strong> tab with status <span className="text-green-700 font-medium">online</span>. No manual device registration is required. The device is marked <span className="text-gray-600 font-medium">offline</span> after 3 minutes without a heartbeat.
            </p>
          </div>

          <div className="border border-amber-200 bg-amber-50/30 rounded-lg p-4">
            <h4 className="font-semibold text-sm text-amber-800 mb-2">⚠ Important Notes</h4>
            <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
              <li>Port 8081 must be reachable from the device's network — check firewall / NAT rules</li>
              <li>Each employee must have a <strong>Biometric ID</strong> set in their profile matching the PIN stored on the device</li>
              <li>Supported models: F18, F19, F21, K40, MA300, UA300, FR1200, iClock series, and all ADMS-compatible ZKTeco devices</li>
              <li>No Python bio_sync or sync service needed — this server handles everything natively</li>
              <li>The device list auto-refreshes every 30 seconds</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-2">Supported Device Models</h4>
            <div className="flex flex-wrap gap-2">
              {["ZKTeco F18","ZKTeco F19","ZKTeco F21","ZKTeco K40","ZKTeco MA300","ZKTeco UA300","ZKTeco FR1200","ZKTeco G4","ZKTeco iClock880","ZKTeco MB360"].map(m => (
                <span key={m} className="bg-muted px-2 py-1 rounded text-xs font-mono">{m}</span>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

type SyncResult = {
  success: boolean;
  message: string;
  stats?: {
    created: number;
    updated: number;
    skipped: number;
    unmatched?: number;
    totalPunches: number;
    totalDays?: number;
  };
};

type ParsedRow = { date: string; time: string };

function PdfImportTab() {
  const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<"upload" | "preview" | "done">("upload");
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [result, setResult] = useState<SyncResult | null>(null);

  const [employees, setEmployees] = useState<{ id: number; fullName: string; employeeId: string }[]>([]);
  const [empLoading, setEmpLoading] = useState(false);

  async function loadEmployees() {
    if (employees.length > 0) return;
    setEmpLoading(true);
    try {
      const resp = await fetch(`${BASE_URL}/api/employees?limit=500&status=active`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}` },
      });
      const data = await resp.json();
      setEmployees((data.employees || []).map((e: any) => ({ id: e.id, fullName: e.fullName, employeeId: e.employeeId })));
    } catch {}
    finally { setEmpLoading(false); }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setParsedRows([]);
    setParseError(null);
    setStep("upload");
    setResult(null);
  }

  async function handleParse() {
    if (!file) return;
    setParsing(true);
    setParseError(null);
    try {
      const form = new FormData();
      form.append("pdf", file);
      const resp = await fetch(`${BASE_URL}/api/biometric/parse-pdf`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}` },
        body: form,
      });
      const data = await resp.json();
      if (!data.success) {
        setParseError(data.message || "Failed to parse PDF.");
      } else {
        setParsedRows(data.rows || []);
        setStep("preview");
        loadEmployees();
      }
    } catch (err) {
      setParseError("Network error: " + (err as Error).message);
    } finally {
      setParsing(false);
    }
  }

  async function handleImport() {
    if (!selectedEmployeeId || parsedRows.length === 0) return;
    setImporting(true);
    setResult(null);
    try {
      const resp = await fetch(`${BASE_URL}/api/biometric/import-pdf-rows`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}`,
        },
        body: JSON.stringify({ employeeId: Number(selectedEmployeeId), rows: parsedRows }),
      });
      const data = await resp.json();
      setResult(data);
      if (data.success) setStep("done");
    } catch (err) {
      setResult({ success: false, message: "Network error: " + (err as Error).message });
    } finally {
      setImporting(false);
    }
  }

  function handleReset() {
    setFile(null);
    setParsedRows([]);
    setParseError(null);
    setSelectedEmployeeId("");
    setResult(null);
    setStep("upload");
    if (fileRef.current) fileRef.current.value = "";
  }

  // Group by date for preview
  const byDate = parsedRows.reduce<Record<string, string[]>>((acc, r) => {
    if (!acc[r.date]) acc[r.date] = [];
    acc[r.date].push(r.time);
    return acc;
  }, {});
  const dateKeys = Object.keys(byDate).sort();

  const selectedEmp = employees.find(e => String(e.id) === selectedEmployeeId);

  return (
    <div className="space-y-4 max-w-3xl">
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <FileText className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-sm">Import from AccSoft Raw Data Report PDF</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Upload a <strong>Raw Data Report</strong> exported from AccSoft Timetrack. The system will extract
          date and time entries from the PDF, then you choose which employee to assign them to.
        </p>

        {step === "upload" && (
          <>
            <div
              className="border-2 border-dashed border-border rounded-xl p-8 text-center space-y-3 cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <FileText className="w-10 h-10 text-muted-foreground mx-auto" />
              <div>
                <p className="text-sm font-medium">{file ? file.name : "Select AccSoft PDF report"}</p>
                {file && <p className="text-xs text-muted-foreground mt-0.5">{(file.size / 1024).toFixed(1)} KB</p>}
                {!file && <p className="text-xs text-muted-foreground mt-1">Click to browse or drag & drop a PDF file</p>}
              </div>
              {file && <p className="text-xs text-primary underline">Change file</p>}
            </div>
            <input ref={fileRef} type="file" accept=".pdf,application/pdf" className="hidden" onChange={handleFileChange} />

            {parseError && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-700">{parseError}</p>
              </div>
            )}

            <div className="border border-blue-200 bg-blue-50/30 rounded-lg p-3">
              <p className="text-xs text-blue-800 font-medium mb-1">Supported format:</p>
              <ul className="text-xs text-blue-700 space-y-0.5 list-disc list-inside">
                <li>AccSoft Timetrack <strong>Raw Data Report</strong> PDF</li>
                <li>Columns extracted: <strong>Trn Date</strong> and <strong>Time</strong> only</li>
                <li>You will select the employee after parsing</li>
              </ul>
            </div>

            <Button onClick={handleParse} disabled={!file || parsing} className="w-full">
              {parsing
                ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Parsing PDF...</>
                : <><Upload className="w-4 h-4 mr-2" /> Parse PDF</>
              }
            </Button>
          </>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  Parsed {parsedRows.length} punch entries across {dateKeys.length} days
                </span>
              </div>
              <button onClick={handleReset} className="text-xs text-muted-foreground hover:text-foreground underline">
                Upload different file
              </button>
            </div>

            {/* Employee selector */}
            <div className="p-4 bg-muted/40 border border-border rounded-xl space-y-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                <Label className="text-sm font-semibold">Assign to Employee</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Select which employee these attendance records belong to. All {parsedRows.length} punches will be saved under this employee.
              </p>
              <Select
                value={selectedEmployeeId}
                onChange={e => setSelectedEmployeeId(e.target.value)}
                className="w-full"
              >
                <option value="">-- Select Employee --</option>
                {empLoading && <option disabled>Loading employees...</option>}
                {employees.map(e => (
                  <option key={e.id} value={String(e.id)}>
                    {e.fullName} ({e.employeeId})
                  </option>
                ))}
              </Select>
            </div>

            {/* Preview table */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Preview — date × punches
              </p>
              <div className="border border-border rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Date</th>
                      <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Punches</th>
                      <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Times</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {dateKeys.map(date => {
                      const times = byDate[date].sort();
                      return (
                        <tr key={date} className="hover:bg-muted/30">
                          <td className="px-3 py-2 font-mono font-medium">{date}</td>
                          <td className="px-3 py-2">
                            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-semibold">
                              {times.length}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            <div className="flex flex-wrap gap-1">
                              {times.map((t, i) => (
                                <span key={i} className="flex items-center gap-0.5 bg-muted px-1.5 py-0.5 rounded font-mono text-[10px]">
                                  <Clock className="w-2.5 h-2.5" />{t}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {result && !result.success && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-700">{result.message}</p>
              </div>
            )}

            <Button
              onClick={handleImport}
              disabled={!selectedEmployeeId || importing}
              className="w-full"
            >
              {importing
                ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Importing...</>
                : <><Upload className="w-4 h-4 mr-2" /> Import {parsedRows.length} Punches for {selectedEmp?.fullName || "Selected Employee"}</>
              }
            </Button>
          </div>
        )}

        {step === "done" && result && (
          <div className="space-y-4">
            <div className={cn("p-4 rounded-xl border flex items-start gap-3", result.success ? "bg-green-50/40 border-green-200" : "bg-red-50/40 border-red-200")}>
              {result.success
                ? <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                : <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              }
              <div className="flex-1">
                <p className={cn("text-sm font-semibold", result.success ? "text-green-800" : "text-red-800")}>
                  {result.success ? "Import Successful" : "Import Failed"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{result.message}</p>
                {result.stats && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                    {[
                      { label: "Total Punches", value: result.stats.totalPunches, color: "text-foreground" },
                      { label: "Days Processed", value: result.stats.totalDays ?? 0, color: "text-blue-700" },
                      { label: "Created", value: result.stats.created, color: "text-green-700" },
                      { label: "Updated", value: result.stats.updated, color: "text-amber-700" },
                    ].map(s => (
                      <div key={s.label} className="bg-background border border-border rounded-lg p-3 text-center">
                        <p className={cn("text-xl font-bold", s.color)}>{s.value}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <Button variant="outline" onClick={handleReset} className="w-full">
              Import Another PDF
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

function SqliteSyncTab() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setResult(null);
  }

  async function handleSync() {
    if (!file) return;
    setLoading(true);
    setResult(null);
    try {
      const isTxt = /\.(txt|log|csv|tsv|dat)$/i.test(file.name);
      const form = new FormData();
      form.append(isTxt ? "file" : "db", file);
      const endpoint = isTxt ? "/api/biometric/sync-txt" : "/api/biometric/sync-sqlite";
      const resp = await fetch(`${BASE}${endpoint}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}` },
        body: form,
      });
      const data = await resp.json();
      setResult(data);
    } catch (err) {
      setResult({ success: false, message: "Network error: " + (err as Error).message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Database className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-sm">Sync from ZKTeco Push Server Database</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Upload the <span className="font-mono font-medium">push.db</span> SQLite file generated by the ZKTeco ADMS push server.
          Attendance logs are matched to employees using the <strong>Biometric ID</strong> field. Make sure each
          employee has their Biometric ID set before syncing.
        </p>

        <div className="border-2 border-dashed border-border rounded-xl p-6 text-center space-y-3">
          <Upload className="w-8 h-8 text-muted-foreground mx-auto" />
          <div>
            <p className="text-sm font-medium">{file ? file.name : "Select push.db file"}</p>
            {file && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            )}
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            className="text-xs text-primary underline hover:no-underline"
          >
            {file ? "Change file" : "Browse file"}
          </button>
          <input ref={fileRef} type="file" accept=".db,.sqlite,.sqlite3,.txt,.log,.csv,.tsv,.dat" className="hidden" onChange={handleFileChange} />
        </div>

        <div className="border border-amber-200 bg-amber-50/40 rounded-lg p-3">
          <p className="text-xs text-amber-800 font-medium mb-1">Before syncing, ensure:</p>
          <ul className="text-xs text-amber-700 space-y-0.5 list-disc list-inside">
            <li>Each employee in this app has the correct <strong>Biometric ID</strong> matching their PIN on the ZKTeco device</li>
            <li>The file is the <span className="font-mono">push.db</span> from the ZKTeco ADMS push server (not the device itself)</li>
            <li>Existing attendance records for the same employee + date will be overwritten with the biometric data</li>
          </ul>
        </div>

        <Button
          onClick={handleSync}
          disabled={!file || loading}
          className="w-full"
        >
          {loading ? (
            <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Syncing...</>
          ) : (
            <><Upload className="w-4 h-4 mr-2" /> Sync Attendance from push.db</>
          )}
        </Button>
      </Card>

      {result && (
        <Card className={cn("p-5", result.success ? "border-green-200 bg-green-50/30" : "border-red-200 bg-red-50/30")}>
          <div className="flex items-start gap-3">
            {result.success
              ? <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
              : <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            }
            <div className="flex-1">
              <p className={cn("text-sm font-semibold", result.success ? "text-green-800" : "text-red-800")}>
                {result.success ? "Sync Successful" : "Sync Failed"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{result.message}</p>
              {result.stats && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4">
                  {[
                    { label: "Total Punches", value: result.stats.totalPunches, color: "text-foreground" },
                    { label: "Created", value: result.stats.created, color: "text-green-700" },
                    { label: "Updated", value: result.stats.updated, color: "text-blue-700" },
                    { label: "Skipped", value: result.stats.skipped, color: "text-amber-700" },
                    { label: "Unmatched", value: result.stats.unmatched, color: "text-red-700" },
                  ].map(s => (
                    <div key={s.label} className="bg-background border border-border rounded-lg p-3 text-center">
                      <p className={cn("text-xl font-bold", s.color)}>{s.value}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
              )}
              {result.stats && result.stats.unmatched > 0 && (
                <p className="text-xs text-amber-700 mt-3">
                  {result.stats.unmatched} punch(es) had no matching employee. Go to Employee Management and set the Biometric ID for those employees, then sync again.
                </p>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
