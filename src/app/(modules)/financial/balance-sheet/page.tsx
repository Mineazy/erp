'use client';

import { toast } from '@/components/ui/toast';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Download, Filter, RefreshCw } from 'lucide-react';

interface BalanceSheetData {
  assets: {
    current: number;
    fixed: number;
    other: number;
    total: number;
  };
  liabilities: {
    current: number;
    longTerm: number;
    other: number;
    total: number;
  };
  equity: {
    share: number;
    retained: number;
    other: number;
    total: number;
  };
  period: string;
}

export default function BalanceSheetPage() {
  const [data, setData] = useState<BalanceSheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [asAtDate, setAsAtDate] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (asAtDate) params.set('date', asAtDate);
      const res = await fetch(`/api/financial/balance-sheet?${params}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error('Failed to fetch balance sheet', e);
      toast('Failed to load balance sheet', 'error');
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
          <h1 className="text-3xl font-bold">Balance Sheet</h1>
          <p className="text-gray-500">Statement of Financial Position</p>
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
          <div>
            <label className="text-sm font-medium mb-2 block">As At Date</label>
            <Input
              type="date"
              value={asAtDate}
              onChange={(e) => setAsAtDate(e.target.value)}
            />
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
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Balance Sheet</CardTitle>
              <CardDescription>As At {data.period}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* ASSETS */}
                <div>
                  <h3 className="text-lg font-bold mb-3">ASSETS</h3>
                  <div className="space-y-2 ml-4">
                    <div className="flex justify-between border-b pb-2">
                      <span>Current Assets</span>
                      <span>{formatCurrency(data.assets.current)}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span>Fixed Assets</span>
                      <span>{formatCurrency(data.assets.fixed)}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span>Other Assets</span>
                      <span>{formatCurrency(data.assets.other)}</span>
                    </div>
                    <div className="flex justify-between font-bold bg-gray-50 p-2">
                      <span>TOTAL ASSETS</span>
                      <span>{formatCurrency(data.assets.total)}</span>
                    </div>
                  </div>
                </div>

                {/* LIABILITIES */}
                <div>
                  <h3 className="text-lg font-bold mb-3">LIABILITIES</h3>
                  <div className="space-y-2 ml-4">
                    <div className="flex justify-between border-b pb-2">
                      <span>Current Liabilities</span>
                      <span>{formatCurrency(data.liabilities.current)}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span>Long-Term Liabilities</span>
                      <span>{formatCurrency(data.liabilities.longTerm)}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span>Other Liabilities</span>
                      <span>{formatCurrency(data.liabilities.other)}</span>
                    </div>
                    <div className="flex justify-between font-bold bg-gray-50 p-2">
                      <span>TOTAL LIABILITIES</span>
                      <span>{formatCurrency(data.liabilities.total)}</span>
                    </div>
                  </div>
                </div>

                {/* EQUITY */}
                <div>
                  <h3 className="text-lg font-bold mb-3">EQUITY</h3>
                  <div className="space-y-2 ml-4">
                    <div className="flex justify-between border-b pb-2">
                      <span>Share Capital</span>
                      <span>{formatCurrency(data.equity.share)}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span>Retained Earnings</span>
                      <span>{formatCurrency(data.equity.retained)}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span>Other Equity</span>
                      <span>{formatCurrency(data.equity.other)}</span>
                    </div>
                    <div className="flex justify-between font-bold bg-blue-50 p-2">
                      <span>TOTAL EQUITY</span>
                      <span>{formatCurrency(data.equity.total)}</span>
                    </div>
                  </div>
                </div>

                {/* Verification */}
                <div className="border-t pt-4">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total Liabilities + Equity</span>
                    <span>
                      {formatCurrency(data.liabilities.total + data.equity.total)}
                    </span>
                  </div>
                  <Badge
                    className="mt-2"
                    variant={
                      Math.abs(data.assets.total - (data.liabilities.total + data.equity.total)) < 0.01
                        ? 'default'
                        : 'destructive'
                    }
                  >
                    {Math.abs(data.assets.total - (data.liabilities.total + data.equity.total)) < 0.01
                      ? 'Balanced'
                      : 'Out of Balance'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Button variant="outline" className="w-full">
        <Download className="w-4 h-4 mr-2" />
        Export to PDF
      </Button>
    </div>
  );
}
