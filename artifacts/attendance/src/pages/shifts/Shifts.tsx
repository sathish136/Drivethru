import { useState } from "react";
import { Plus, Clock, Pencil, Trash2 } from "lucide-react";
import { PageHeader, Card, Table, Th, Tr, Td, Badge, Button, Modal, Label, Input, Select } from "@/components/ui";
import { useShifts, useShiftMutations } from "@/hooks/use-core";

const EMPTY_FORM = { name: "", type: "normal", startTime1: "", endTime1: "", graceMinutes: 10, overtimeThreshold: 60 };

export default function Shifts() {
  const { data, isLoading } = useShifts();
  const { create, update, remove } = useShiftMutations();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editShift, setEditShift] = useState<any | null>(null);
  const [form, setForm] = useState<any>(EMPTY_FORM);

  const shifts = data || [];

  function openCreate() {
    setForm(EMPTY_FORM);
    setIsCreateOpen(true);
  }

  function openEdit(s: any) {
    setForm({
      name: s.name,
      type: s.type,
      startTime1: s.startTime1,
      endTime1: s.endTime1,
      graceMinutes: s.graceMinutes ?? 10,
      overtimeThreshold: s.overtimeThreshold ?? 60,
    });
    setEditShift(s);
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    create.mutate({ data: { ...form, isActive: true } }, { onSuccess: () => { setIsCreateOpen(false); setForm(EMPTY_FORM); } });
  }

  function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    update.mutate({ id: editShift.id, data: form }, { onSuccess: () => setEditShift(null) });
  }

  function handleDelete(s: any) {
    if (!confirm(`Delete shift "${s.name}"? This cannot be undone.`)) return;
    remove.mutate({ id: s.id });
  }

  function field(key: string, value: any) {
    setForm((f: any) => ({ ...f, [key]: value }));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shift Settings"
        description="Configure normal and split shifts, grace periods, and overtime rules."
        action={
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" /> Create Shift
          </Button>
        }
      />

      <Card className="overflow-hidden">
        <Table>
          <thead>
            <Tr>
              <Th>Shift Name</Th>
              <Th>Type</Th>
              <Th>Schedule</Th>
              <Th>Grace</Th>
              <Th>Status</Th>
              <Th className="text-right">Actions</Th>
            </Tr>
          </thead>
          <tbody>
            {isLoading ? (
              <Tr><Td colSpan={6} className="text-center text-muted-foreground py-8">Loading…</Td></Tr>
            ) : shifts.length === 0 ? (
              <Tr><Td colSpan={6} className="text-center text-muted-foreground py-8">No shifts found. Create one above.</Td></Tr>
            ) : shifts.map((s: any) => (
              <Tr key={s.id}>
                <Td className="font-semibold">{s.name}</Td>
                <Td>
                  <Badge variant={s.type === "normal" ? "info" : "warning"}>{s.type.toUpperCase()}</Badge>
                </Td>
                <Td>
                  <div className="flex items-center gap-1.5 text-xs">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <span className="font-mono bg-muted px-1 rounded">{s.startTime1}</span>
                    to
                    <span className="font-mono bg-muted px-1 rounded">{s.endTime1}</span>
                  </div>
                </Td>
                <Td className="text-xs text-muted-foreground">{s.graceMinutes ?? "—"} min</Td>
                <Td>
                  <Badge variant={s.isActive ? "success" : "neutral"}>{s.isActive ? "Active" : "Inactive"}</Badge>
                </Td>
                <Td className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10 gap-1" onClick={() => openEdit(s)}>
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-50 gap-1" onClick={() => handleDelete(s)}
                      disabled={remove.isPending}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>

      {/* Create Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create Shift">
        <form className="space-y-4" onSubmit={handleCreate}>
          <div>
            <Label>Shift Name</Label>
            <Input required placeholder="e.g. Morning Shift" value={form.name} onChange={e => field("name", e.target.value)} />
          </div>
          <div>
            <Label>Shift Type</Label>
            <Select value={form.type} onChange={e => field("type", e.target.value)}>
              <option value="normal">Normal (Single Session)</option>
              <option value="split">Split (Two Sessions)</option>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start Time</Label>
              <Input type="time" required value={form.startTime1} onChange={e => field("startTime1", e.target.value)} />
            </div>
            <div>
              <Label>End Time</Label>
              <Input type="time" required value={form.endTime1} onChange={e => field("endTime1", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Grace Period (minutes)</Label>
              <Input type="number" min={0} value={form.graceMinutes} onChange={e => field("graceMinutes", Number(e.target.value))} />
            </div>
            <div>
              <Label>Overtime Threshold (minutes)</Label>
              <Input type="number" min={0} value={form.overtimeThreshold} onChange={e => field("overtimeThreshold", Number(e.target.value))} />
            </div>
          </div>
          <div className="pt-4 flex justify-end gap-3 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>{create.isPending ? "Saving…" : "Save Shift"}</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editShift} onClose={() => setEditShift(null)} title="Edit Shift">
        <form className="space-y-4" onSubmit={handleUpdate}>
          <div>
            <Label>Shift Name</Label>
            <Input required value={form.name} onChange={e => field("name", e.target.value)} />
          </div>
          <div>
            <Label>Shift Type</Label>
            <Select value={form.type} onChange={e => field("type", e.target.value)}>
              <option value="normal">Normal (Single Session)</option>
              <option value="split">Split (Two Sessions)</option>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start Time</Label>
              <Input type="time" required value={form.startTime1} onChange={e => field("startTime1", e.target.value)} />
            </div>
            <div>
              <Label>End Time</Label>
              <Input type="time" required value={form.endTime1} onChange={e => field("endTime1", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Grace Period (minutes)</Label>
              <Input type="number" min={0} value={form.graceMinutes} onChange={e => field("graceMinutes", Number(e.target.value))} />
            </div>
            <div>
              <Label>Overtime Threshold (minutes)</Label>
              <Input type="number" min={0} value={form.overtimeThreshold} onChange={e => field("overtimeThreshold", Number(e.target.value))} />
            </div>
          </div>
          <div className="pt-4 flex justify-end gap-3 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setEditShift(null)}>Cancel</Button>
            <Button type="submit" disabled={update.isPending}>{update.isPending ? "Saving…" : "Save Changes"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
