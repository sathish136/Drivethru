import { useState } from "react";
import { Plus, Search, MapPin, Briefcase } from "lucide-react";
import { PageHeader, Card, Table, Th, Tr, Td, Badge, Button, Input, Modal, Label, Select } from "@/components/ui";
import { useEmployees, useEmployeeMutations } from "@/hooks/use-employees";

export default function EmployeeList() {
  const { data, isLoading } = useEmployees();
  const { create } = useEmployeeMutations();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: "", fullName: "", designation: "", department: "", branchId: 1, email: "", phone: "", joiningDate: "", status: "active" as any
  });

  const employees = data?.employees || [
    { id: 1, employeeId: "EMP001", fullName: "Alice Walker", designation: "Branch Manager", department: "Operations", branchName: "Head Office", status: "active" },
    { id: 2, employeeId: "EMP002", fullName: "Bob Smith", designation: "Clerk", department: "Sorting", branchName: "North Regional", status: "active" },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    create.mutate({ data: formData }, {
      onSuccess: () => setIsModalOpen(false)
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Employees" 
        description="Manage post office staff, assign branches and shifts."
        action={
          <Button onClick={() => setIsModalOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Add Employee
          </Button>
        }
      />

      <Card className="p-4 flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by name or ID..." className="pl-9 max-w-md" />
        </div>
      </Card>

      <Card className="overflow-hidden">
        <Table>
          <thead>
            <Tr>
              <Th>Employee ID</Th>
              <Th>Name & Role</Th>
              <Th>Branch</Th>
              <Th>Status</Th>
              <Th className="text-right">Actions</Th>
            </Tr>
          </thead>
          <tbody>
            {employees.map((emp: any) => (
              <Tr key={emp.id}>
                <Td className="font-mono text-xs">{emp.employeeId}</Td>
                <Td>
                  <div className="font-semibold">{emp.fullName}</div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                    <Briefcase className="w-3 h-3" /> {emp.designation} ({emp.department})
                  </div>
                </Td>
                <Td>
                  <div className="flex items-center gap-1.5 text-sm">
                    <MapPin className="w-3 h-3 text-muted-foreground" /> {emp.branchName}
                  </div>
                </Td>
                <Td>
                  <Badge variant={emp.status === 'active' ? 'success' : 'neutral'}>
                    {emp.status.toUpperCase()}
                  </Badge>
                </Td>
                <Td className="text-right">
                  <Button variant="ghost" size="sm" className="text-primary hover:text-primary hover:bg-primary/10">Edit</Button>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add New Employee">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Employee ID</Label>
              <Input required value={formData.employeeId} onChange={e => setFormData({...formData, employeeId: e.target.value})} placeholder="e.g. EMP003" />
            </div>
            <div>
              <Label>Full Name</Label>
              <Input required value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} placeholder="John Doe" />
            </div>
            <div>
              <Label>Designation</Label>
              <Input required value={formData.designation} onChange={e => setFormData({...formData, designation: e.target.value})} placeholder="Clerk" />
            </div>
            <div>
              <Label>Department</Label>
              <Input required value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} placeholder="Sorting" />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="john@post.com" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="+1 234 567 890" />
            </div>
            <div className="col-span-2">
              <Label>Branch</Label>
              <Select value={formData.branchId} onChange={e => setFormData({...formData, branchId: parseInt(e.target.value)})}>
                <option value={1}>Head Office</option>
                <option value={2}>North Regional</option>
              </Select>
            </div>
          </div>
          <div className="pt-4 flex justify-end gap-3 border-t border-border mt-6">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Creating..." : "Save Employee"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
