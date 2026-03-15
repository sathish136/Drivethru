import { PageHeader, Card, Table, Th, Tr, Td, Badge, Button } from "@/components/ui";
import { Plus, Network } from "lucide-react";
import { useBranches } from "@/hooks/use-core";

export default function Branches() {
  const { data, isLoading } = useBranches();
  
  const branches = data || [
    { id: 1, name: "Central Head Office", code: "HO-01", type: "head_office", employeeCount: 150, managerName: "Jane Director", isActive: true },
    { id: 2, name: "North Regional Office", code: "RO-N", type: "regional", employeeCount: 45, managerName: "Mark Region", isActive: true },
    { id: 3, name: "Downtown Sub Branch", code: "SB-DT", type: "sub_branch", employeeCount: 12, managerName: "Sam Sub", isActive: true },
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Branch Management" 
        description="Organize 50+ post office branches across head, regional, and sub-branch hierarchies."
        action={
          <Button className="gap-2">
            <Plus className="w-4 h-4" /> Add Branch
          </Button>
        }
      />

      <Card className="overflow-hidden">
        <Table>
          <thead>
            <Tr>
              <Th>Code</Th>
              <Th>Branch Name</Th>
              <Th>Type & Hierarchy</Th>
              <Th>Manager</Th>
              <Th className="text-center">Staff</Th>
              <Th>Status</Th>
              <Th className="text-right">Actions</Th>
            </Tr>
          </thead>
          <tbody>
            {branches.map((b: any) => (
              <Tr key={b.id}>
                <Td className="font-mono text-xs">{b.code}</Td>
                <Td className="font-semibold">{b.name}</Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <Network className="w-3.5 h-3.5 text-muted-foreground" />
                    <Badge variant={b.type === 'head_office' ? 'primary' : b.type === 'regional' ? 'info' : 'neutral'}>
                      {b.type.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                </Td>
                <Td className="text-sm">{b.managerName}</Td>
                <Td className="text-center font-medium">{b.employeeCount}</Td>
                <Td>
                  <Badge variant={b.isActive ? 'success' : 'danger'}>{b.isActive ? 'Active' : 'Closed'}</Badge>
                </Td>
                <Td className="text-right">
                  <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10">Configure</Button>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
