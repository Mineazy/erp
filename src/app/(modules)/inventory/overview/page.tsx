import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function InventoryOverviewPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Inventory Overview</h1>
        <p className="text-slate-500 mt-2">High-level view of current stock and inventory valuation.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stock Status</CardTitle>
          <CardDescription>Available, reserved, and current stock by branch and category.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center border-2 border-dashed border-slate-200 rounded-lg bg-slate-50">
            <p className="text-slate-500">Inventory overview metrics and tables will be implemented here.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
