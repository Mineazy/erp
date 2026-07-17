'use client';

import { toast } from '@/components/ui/toast';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, Filter, RefreshCw } from 'lucide-react';

interface EquityChange {
  description: string;
  amount: number;
}

interface StatementOfChangesInEquityData {
  openingEquity: number;
  profitForPeriod: number;
  dividends: number;
  otherChanges: EquityChange[];
  closingEquity: number;
  period: string;
}

export default function StatementOfChangesInEquityPage() {
  const [data, setData] = useState<StatementOfChangesInEquityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      const res = await fetch(`/api/financial/statement-of-changes-in-equity?${params}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error('Failed to fetch statement of changes in equity', e);
      toast('Failed to load statement', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Statement of Changes in Equity</h1>
          <p className="text-gray-500">Equity Movement Report</p>
        </div>
        <Button onClick={() => fetchData()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <Button onClick={() => fetchData()} className="w-full">
            <Filter className="w-4 h-4 mr-2" />
            Apply Filters
          </Button>
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="p-8 text-center">Loading...</CardContent>
        </Card>
      ) : data ? (
        <Card>
          <CardHeader>
            <CardTitle>Statement of Changes in Equity</CardTitle>
            <CardDescription>{data.period}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between border-b pb-2">
                <span className="font-medium">Opening Equity</span>
                <span>{formatCurrency(data.openingEquity)}</span>
              </div>

              <div className="flex justify-between border-b pb-2">
                <span>Add: Profit for Period</span>
                <span className="text-green-600">{formatCurrency(data.profitForPeriod)}</span>
              </div>

              <div className="flex justify-between border-b pb-2">
                <span>Less: Dividends</span>
                <span className="text-red-600">({formatCurrency(data.dividends)})</span>
              </div>

              {data.otherChanges && data.otherChanges.length > 0 && (
                <>
                  <div className="mt-4 pt-2 border-t">
                    <h4 className="font-medium mb-2">Other Changes</h4>
                    {data.otherChanges.map((change, idx) => (
                      <div key={idx} className="flex justify-between border-b pb-2 ml-4">
                        <span>{change.description}</span>
                        <span>{formatCurrency(change.amount)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div className="flex justify-between text-lg font-bold bg-blue-50 p-2">
                <span>Closing Equity</span>
                <span className="text-blue-600">{formatCurrency(data.closingEquity)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Button variant="outline" className="w-full">
        <Download className="w-4 h-4 mr-2" />
        Export to PDF
      </Button>
    </div>
  );
}
