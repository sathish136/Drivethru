import { useState } from "react";
import { Plus, Clock } from "lucide-react";
import { PageHeader, Card, Table, Th, Tr, Td, Badge, Button, Modal, Label, Input, Select } from "@/components/ui";
import { useShifts, useShiftMutations } from "@/hooks/use-core";

export default function Shifts() {
  const { data, isLoading } = useShifts();
  const { create } = useShiftMutations();
  const [isOpen, setIsOpen] = useState(false);

  const shifts = data || [
    { id: 1, name: "Standard Day Shift", type: "normal", startTime1: "08:00", endTime1: "17:00", totalHours: 9, isActive: true },
    { id: 2, name: "Split Operations", type: "split", startTime1: "06:00", endTime1: "10:00", startTime2: "14:00", endTime2: "18:00", totalHours: 8, isActive: true }
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Shift Settings" 
        description="Configure normal and split shifts, grace periods, and overtime rules."
        action={
          <Button onClick={() => setIsOpen(true)} className="gap-2">
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
              <Th>Total Hrs</Th>
              <Th>Status</Th>
              <Th className="text-right">Actions</Th>
            </Tr>
          </thead>
          <tbody>
            {shifts.map((s: any) => (
              <Tr key={s.id}>
                <Td className="font-semibold">{s.name}</Td>
                <Td>
                  <Badge variant={s.type === 'normal' ? 'info' : 'warning'}>{s.type.toUpperCase()}</Badge>
                </Td>
                <Td>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span className="font-mono bg-muted px-1 rounded">{s.startTime1}</span> to <span className="font-mono bg-muted px-1 rounded">{s.endTime1}</span>
                    </div>
                    {s.type === 'split' && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground border-t border-border pt-1 mt-1">
                        <Clock className="w-3 h-3" />
                        <span className="font-mono bg-muted px-1 rounded">{s.startTime2}</span> to <span className="font-mono bg-muted px-1 rounded">{s.endTime2}</span>
                      </div>
                    )}
                  </div>
                </Td>
                <Td className="font-medium">{s.totalHours}h</Td>
                <Td>
                  <Badge variant={s.isActive ? 'success' : 'neutral'}>{s.isActive ? 'Active' : 'Inactive'}</Badge>
                </Td>
                <Td className="text-right">
                  <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10">Edit</Button>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Create Shift">
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setIsOpen(false); }}>
          <div className="space-y-4">
            <div>
              <Label>Shift Name</Label>
              <Input required placeholder="e.g. Morning Shift" />
            </div>
            <div>
              <Label>Shift Type</Label>
              <Select>
                <option value="normal">Normal (Single Session)</option>
                <option value="split">Split (Two Sessions)</option>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Time</Label>
                <Input type="time" required />
              </div>
              <div>
                <Label>End Time</Label>
                <Input type="time" required />
              </div>
            </div>
          </div>
          <div className="pt-4 flex justify-end gap-3 border-t border-border mt-6">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit">Save Shift</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
