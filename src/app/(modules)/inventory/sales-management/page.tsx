import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function SalesManagementPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Sales Management</h1>
        <p className="text-slate-500 mt-2">Analyze sales performance across branches and products.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sales Analysis</CardTitle>
          <CardDescription>Comprehensive sales data and trend analysis.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center border-2 border-dashed border-slate-200 rounded-lg bg-slate-50">
            <p className="text-slate-500">Sales charts and performance metrics will be implemented here.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
