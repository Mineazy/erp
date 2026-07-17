'use client';

import { toast, dismissToast } from '@/components/ui/toast';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Download, Filter, RefreshCw } from 'lucide-react';

interface IncomeStatementData {
  revenue: number;
  costOfGoodsSold: number;
  grossProfit: number;
  operatingExpenses: number;
  operatingProfit: number;
  otherIncome: number;
  financeCharges: number;
  profitBeforeTax: number;
  taxExpense: number;
  netProfit: number;
  period: string;
}

export default function IncomeStatementPage() {
  const [data, setData] = useState<IncomeStatementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      const res = await fetch(`/api/financial/income-statement?${params}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error('Failed to fetch income statement', e);
      toast('Failed to load income statement', 'error');
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
          <h1 className="text-3xl font-bold">Income Statement</h1>
          <p className="text-gray-500">Profit and Loss Report</p>
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
            <CardTitle>Income Statement</CardTitle>
            <CardDescription>{data.period}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between border-b pb-2">
                <span className="font-medium">Revenue</span>
                <span>{formatCurrency(data.revenue)}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span>Cost of Goods Sold</span>
                <span>({formatCurrency(data.costOfGoodsSold)})</span>
              </div>
              <div className="flex justify-between border-b pb-2 font-semibold bg-gray-50 p-2">
                <span>Gross Profit</span>
                <span>{formatCurrency(data.grossProfit)}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span>Operating Expenses</span>
                <span>({formatCurrency(data.operatingExpenses)})</span>
              </div>
              <div className="flex justify-between border-b pb-2 font-semibold bg-gray-50 p-2">
                <span>Operating Profit</span>
                <span>{formatCurrency(data.operatingProfit)}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span>Other Income</span>
                <span>{formatCurrency(data.otherIncome)}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span>Finance Charges</span>
                <span>({formatCurrency(data.financeCharges)})</span>
              </div>
              <div className="flex justify-between border-b pb-2 font-semibold bg-gray-50 p-2">
                <span>Profit Before Tax</span>
                <span>{formatCurrency(data.profitBeforeTax)}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span>Tax Expense</span>
                <span>({formatCurrency(data.taxExpense)})</span>
              </div>
              <div className="flex justify-between text-lg font-bold bg-blue-50 p-2">
                <span>Net Profit</span>
                <span className="text-green-600">{formatCurrency(data.netProfit)}</span>
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
