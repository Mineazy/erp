import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function SeasonalityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Seasonality</h1>
        <p className="text-slate-500 mt-2">Analyze seasonal trends and peak demand periods.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Seasonal Trends</CardTitle>
          <CardDescription>Historical seasonal trends and product performance.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center border-2 border-dashed border-slate-200 rounded-lg bg-slate-50">
            <p className="text-slate-500">Seasonality analysis charts will be implemented here.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
