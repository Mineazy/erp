import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function CustomerOrdersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Customer Orders</h1>
        <p className="text-slate-500 mt-2">Manage orders generated at the POS/tills.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Orders Overview</CardTitle>
          <CardDescription>View and manage all customer orders.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center border-2 border-dashed border-slate-200 rounded-lg bg-slate-50">
            <p className="text-slate-500">Customer orders table will be implemented here.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
