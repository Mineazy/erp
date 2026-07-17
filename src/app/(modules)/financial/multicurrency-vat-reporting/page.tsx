'use client';

import { toast } from '@/components/ui/toast';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Download, Filter, RefreshCw } from 'lucide-react';

interface VATData {
  currency: string;
  taxableSupply: number;
  vatCollected: number;
  taxableAcquisition: number;
  vatRecoverable: number;
  netVAT: number;
  exchangeRate: number;
}

interface MultiCurrencyVATReport {
  usd: VATData;
  zwd: VATData;
  zar: VATData;
  totalInUSD: {
    taxableSupply: number;
    vatCollected: number;
    taxableAcquisition: number;
    vatRecoverable: number;
    netVAT: number;
  };
  period: string;
}

export default function MultiCurrencyVATReportingPage() {
  const [data, setData] = useState<MultiCurrencyVATReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      const res = await fetch(`/api/financial/multicurrency-vat-reporting?${params}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error('Failed to fetch VAT report', e);
      toast('Failed to load VAT report', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getCurrencySymbol = (currency: string) => {
    const symbols: { [key: string]: string } = {
      USD: '$',
      ZWD: 'ZIG$',
      ZAR: 'R',
    };
    return symbols[currency] || currency;
  };

  const formatCurrency = (value: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(value);
  };

  const renderCurrencyTable = (currencyData: VATData, label: string) => (
    <Card>
      <CardHeader>
        <CardTitle>
          {label} ({getCurrencySymbol(currencyData.currency)})
        </CardTitle>
        {currencyData.currency !== 'USD' && (
          <CardDescription>Exchange Rate: 1 {currencyData.currency} = {currencyData.exchangeRate.toFixed(4)} USD</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between border-b pb-2">
            <span className="font-medium">Taxable Supplies</span>
            <span>{formatCurrency(currencyData.taxableSupply, currencyData.currency)}</span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="font-medium">VAT Collected</span>
            <span className="text-green-600">{formatCurrency(currencyData.vatCollected, currencyData.currency)}</span>
          </div>

          <div className="flex justify-between border-b pb-2">
            <span className="font-medium">Taxable Acquisitions</span>
            <span>{formatCurrency(currencyData.taxableAcquisition, currencyData.currency)}</span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="font-medium">VAT Recoverable</span>
            <span className="text-blue-600">({formatCurrency(currencyData.vatRecoverable, currencyData.currency)})</span>
          </div>

          <div className="flex justify-between font-bold bg-blue-50 p-2">
            <span>Net VAT Payable/(Receivable)</span>
            <span
              className={currencyData.netVAT >= 0 ? 'text-red-600' : 'text-green-600'}
            >
              {formatCurrency(currencyData.netVAT, currencyData.currency)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Multi-Currency VAT Reporting</h1>
          <p className="text-gray-500">VAT Returns (USD$, ZIG$, RSA Rand)</p>
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
        <div className="space-y-6">
          {/* Currency-specific reports */}
          <div className="grid gap-4">
            {renderCurrencyTable(data.usd, 'United States Dollar')}
            {renderCurrencyTable(data.zwd, 'Zimbabwe Dollar')}
            {renderCurrencyTable(data.zar, 'South African Rand')}
          </div>

          {/* Summary in USD */}
          <Card className="border-2 border-blue-500">
            <CardHeader>
              <CardTitle>Summary (USD$ Equivalent)</CardTitle>
              <CardDescription>{data.period}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between border-b pb-2">
                  <span className="font-medium">Total Taxable Supplies</span>
                  <span>{formatCurrency(data.totalInUSD.taxableSupply)}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="font-medium">Total VAT Collected</span>
                  <span className="text-green-600">{formatCurrency(data.totalInUSD.vatCollected)}</span>
                </div>

                <div className="flex justify-between border-b pb-2">
                  <span className="font-medium">Total Taxable Acquisitions</span>
                  <span>{formatCurrency(data.totalInUSD.taxableAcquisition)}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="font-medium">Total VAT Recoverable</span>
                  <span className="text-blue-600">({formatCurrency(data.totalInUSD.vatRecoverable)})</span>
                </div>

                <div className="flex justify-between text-lg font-bold bg-blue-50 p-2">
                  <span>TOTAL NET VAT PAYABLE</span>
                  <span
                    className={data.totalInUSD.netVAT >= 0 ? 'text-red-600' : 'text-green-600'}
                  >
                    {formatCurrency(data.totalInUSD.netVAT)}
                  </span>
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
