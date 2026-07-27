import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function SalesForecastingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Sales Forecasting</h1>
        <p className="text-slate-500 mt-2">Predict future sales demand based on historical data.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Demand Forecast</CardTitle>
          <CardDescription>Weekly, monthly, and yearly sales forecasts.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center border-2 border-dashed border-slate-200 rounded-lg bg-slate-50">
            <p className="text-slate-500">Sales forecasting models and charts will be implemented here.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
