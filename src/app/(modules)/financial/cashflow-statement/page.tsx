'use client';

import { toast } from '@/components/ui/toast';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Download, Filter, RefreshCw } from 'lucide-react';

interface CashflowStatementData {
  operatingActivities: number;
  investingActivities: number;
  financingActivities: number;
  netCashFlow: number;
  openingCashBalance: number;
  closingCashBalance: number;
  period: string;
}

export default function CashflowStatementPage() {
  const [data, setData] = useState<CashflowStatementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      const res = await fetch(`/api/financial/cashflow-statement?${params}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error('Failed to fetch cashflow statement', e);
      toast('Failed to load cashflow statement', 'error');
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

  const getStatusColor = (value: number) => {
    return value >= 0 ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Cashflow Statement</h1>
          <p className="text-gray-500">Cash Movement Report</p>
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
            <CardTitle>Cashflow Statement</CardTitle>
            <CardDescription>{data.period}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between border-b pb-2 font-semibold">
                <span>Operating Activities</span>
                <span className={getStatusColor(data.operatingActivities)}>
                  {formatCurrency(data.operatingActivities)}
                </span>
              </div>
              <div className="flex justify-between border-b pb-2 font-semibold">
                <span>Investing Activities</span>
                <span className={getStatusColor(data.investingActivities)}>
                  {formatCurrency(data.investingActivities)}
                </span>
              </div>
              <div className="flex justify-between border-b pb-2 font-semibold">
                <span>Financing Activities</span>
                <span className={getStatusColor(data.financingActivities)}>
                  {formatCurrency(data.financingActivities)}
                </span>
              </div>
              <div className="flex justify-between border-b pb-2 bg-gray-50 p-2 font-semibold">
                <span>Net Cash Flow</span>
                <span className={getStatusColor(data.netCashFlow)}>
                  {formatCurrency(data.netCashFlow)}
                </span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span>Opening Cash Balance</span>
                <span>{formatCurrency(data.openingCashBalance)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold bg-blue-50 p-2">
                <span>Closing Cash Balance</span>
                <span className="text-blue-600">{formatCurrency(data.closingCashBalance)}</span>
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
