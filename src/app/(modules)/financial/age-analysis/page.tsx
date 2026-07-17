'use client';

import { toast } from '@/components/ui/toast';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Download, Filter, RefreshCw } from 'lucide-react';

interface AgeAnalysisData {
  current: number;
  thirtyDays: number;
  sixtyDays: number;
  ninetyDays: number;
  over90Days: number;
  total: number;
  percentage: {
    current: number;
    thirtyDays: number;
    sixtyDays: number;
    ninetyDays: number;
    over90Days: number;
  };
}

interface AgeAnalysisReport {
  debtors: AgeAnalysisData;
  creditors: AgeAnalysisData;
  asAtDate: string;
}

export default function AgeAnalysisPage() {
  const [data, setData] = useState<AgeAnalysisReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [analysisType, setAnalysisType] = useState<'both' | 'debtors' | 'creditors'>('both');
  const [asAtDate, setAsAtDate] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (asAtDate) params.set('date', asAtDate);
      if (analysisType !== 'both') params.set('type', analysisType);
      const res = await fetch(`/api/financial/age-analysis?${params}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error('Failed to fetch age analysis', e);
      toast('Failed to load age analysis', 'error');
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

  const renderAnalysisTable = (title: string, analysisData: AgeAnalysisData) => (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between border-b pb-2">
            <span className="font-medium">Current (0-30 days)</span>
            <div className="text-right">
              <div>{formatCurrency(analysisData.current)}</div>
              <Badge variant="secondary" className="text-xs">
                {analysisData.percentage.current.toFixed(2)}%
              </Badge>
            </div>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="font-medium">31-60 Days</span>
            <div className="text-right">
              <div>{formatCurrency(analysisData.thirtyDays)}</div>
              <Badge variant="secondary" className="text-xs">
                {analysisData.percentage.thirtyDays.toFixed(2)}%
              </Badge>
            </div>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="font-medium">61-90 Days</span>
            <div className="text-right">
              <div>{formatCurrency(analysisData.sixtyDays)}</div>
              <Badge variant="secondary" className="text-xs">
                {analysisData.percentage.sixtyDays.toFixed(2)}%
              </Badge>
            </div>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="font-medium">91-120 Days</span>
            <div className="text-right">
              <div>{formatCurrency(analysisData.ninetyDays)}</div>
              <Badge variant="secondary" className="text-xs">
                {analysisData.percentage.ninetyDays.toFixed(2)}%
              </Badge>
            </div>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="font-medium">Over 120 Days</span>
            <div className="text-right">
              <div className={analysisData.over90Days > 0 ? 'text-red-600 font-semibold' : ''}>
                {formatCurrency(analysisData.over90Days)}
              </div>
              <Badge variant={analysisData.over90Days > 0 ? 'destructive' : 'secondary'} className="text-xs">
                {analysisData.percentage.over90Days.toFixed(2)}%
              </Badge>
            </div>
          </div>
          <div className="flex justify-between font-bold bg-blue-50 p-2">
            <span>TOTAL</span>
            <span>{formatCurrency(analysisData.total)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Age Analysis</h1>
          <p className="text-gray-500">Debtors & Creditors Aging Report</p>
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
              <label className="text-sm font-medium mb-2 block">As At Date</label>
              <Input
                type="date"
                value={asAtDate}
                onChange={(e) => setAsAtDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Analysis Type</label>
              <Select
                value={analysisType}
                onChange={(e) => setAnalysisType(e.target.value as any)}
              >
                <option value="both">Both Debtors & Creditors</option>
                <option value="debtors">Debtors Only</option>
                <option value="creditors">Creditors Only</option>
              </Select>
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
        <div className="grid gap-6">
          {(analysisType === 'both' || analysisType === 'debtors') &&
            renderAnalysisTable('Debtors Age Analysis', data.debtors)}
          {(analysisType === 'both' || analysisType === 'creditors') &&
            renderAnalysisTable('Creditors Age Analysis', data.creditors)}
        </div>
      ) : null}

      <Button variant="outline" className="w-full">
        <Download className="w-4 h-4 mr-2" />
        Export to PDF
      </Button>
    </div>
  );
}
