import { PageHeader, Card, Button, Input, Label, Select } from "@/components/ui";

export default function Settings() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader 
        title="System Settings" 
        description="Configure organization details, rules, and ZK push integrations."
      />

      <div className="space-y-8">
        <Card className="p-6 space-y-6">
          <h3 className="text-lg font-bold border-b border-border pb-3">Organization & Rules</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label>Organization Name</Label>
              <Input defaultValue="National Post Office" />
            </div>
            <div>
              <Label>Timezone</Label>
              <Select>
                <option>UTC (GMT+0)</option>
                <option>EST (GMT-5)</option>
                <option>IST (GMT+5:30)</option>
              </Select>
            </div>
            <div>
              <Label>Late Threshold (Minutes)</Label>
              <Input type="number" defaultValue="15" />
            </div>
            <div>
              <Label>Overtime Threshold (Hours)</Label>
              <Input type="number" defaultValue="9" />
            </div>
          </div>
          <div className="flex justify-end">
            <Button>Save Organization Settings</Button>
          </div>
        </Card>

        <Card className="p-6 space-y-6 border-blue-200 bg-blue-50/10">
          <div className="flex justify-between items-center border-b border-blue-100 pb-3">
            <h3 className="text-lg font-bold text-blue-900">Biometric ZK Push Setup</h3>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-mono">ADMS Ready</span>
          </div>
          
          <p className="text-sm text-muted-foreground">
            Configure your ZKteco biometric machines to push data to this server. Enter this URL in the machine's Cloud Server Settings.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label>ADMS Server URL</Label>
              <Input readOnly value="http://your-server.com/api/biometric/push" className="bg-muted font-mono text-xs" />
            </div>
            <div>
              <Label>Server Port</Label>
              <Input readOnly value="80" className="bg-muted font-mono text-xs" />
            </div>
            <div className="md:col-span-2">
              <Label>API Key (Optional for secure endpoints)</Label>
              <Input defaultValue="zk-sk-18274hjsa812" type="password" />
            </div>
          </div>
          <div className="flex justify-end">
            <Button variant="secondary" className="bg-blue-600 text-white hover:bg-blue-700">Save ZK Settings</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
