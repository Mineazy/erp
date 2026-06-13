'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  TrendingUp, TrendingDown, DollarSign, Receipt, CreditCard, Wallet,
  ArrowUpRight, ArrowDownRight, RefreshCw, MoreHorizontal,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend,
} from 'recharts';

const revenueData = [
  { month: 'Jan', revenue: 45000, expenses: 32000 },
  { month: 'Feb', revenue: 52000, expenses: 35000 },
  { month: 'Mar', revenue: 48000, expenses: 31000 },
  { month: 'Apr', revenue: 61000, expenses: 38000 },
  { month: 'May', revenue: 55000, expenses: 36000 },
  { month: 'Jun', revenue: 67000, expenses: 40000 },
];

const recentTransactions = [
  { id: '1', date: '2026-05-24', description: 'Invoice #INV-2026-0042 - ABC Corp', type: 'receipt', amount: 12500, status: 'completed' },
  { id: '2', date: '2026-05-23', description: 'Bill #BILL-2026-0018 - Supplier Ltd', type: 'payment', amount: 8400, status: 'completed' },
  { id: '3', date: '2026-05-22', description: 'Sales Order #SO-2026-0035 - XYZ Mining', type: 'receipt', amount: 22000, status: 'pending' },
  { id: '4', date: '2026-05-21', description: 'Purchase Order #PO-2026-0012 - Equip Co', type: 'payment', amount: 15600, status: 'completed' },
  { id: '5', date: '2026-05-20', description: 'Invoice #INV-2026-0040 - DEF Services', type: 'receipt', amount: 5800, status: 'completed' },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 shadow-lg rounded-lg p-3">
        <p className="text-sm font-medium text-slate-900 mb-1">{label}</p>
        {payload.map((entry: any, idx: number) => (
          <p key={idx} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: ${entry.value.toLocaleString()}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function DashboardPage() {
  const [refreshing, setRefreshing] = useState(false);

  const stats = [
    {
      title: 'Total Revenue',
      value: 328000,
      change: 12.5,
      icon: DollarSign,
      color: 'text-mine-blue-600',
      bg: 'bg-mine-blue-50',
    },
    {
      title: 'Outstanding AR',
      value: 84500,
      change: -3.2,
      icon: Receipt,
      color: 'text-mine-amber-600',
      bg: 'bg-mine-amber-50',
    },
    {
      title: 'Outstanding AP',
      value: 62300,
      change: 5.8,
      icon: CreditCard,
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
    {
      title: 'Cash Balance',
      value: 195200,
      change: 8.1,
      icon: Wallet,
      color: 'text-mine-green-600',
      bg: 'bg-mine-green-50',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Dashboard</h2>
          <p className="text-slate-500 mt-1">Welcome back! Here is your business overview.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { setRefreshing(true); setTimeout(() => setRefreshing(false), 1000); }}
          loading={refreshing}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const isPositive = stat.change >= 0;
          const TrendIcon = isPositive ? TrendingUp : TrendingDown;
          return (
            <Card key={stat.title} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2 rounded-lg ${stat.bg}`}>
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <Badge variant={isPositive ? 'success' : 'destructive'} className="text-xs">
                    <TrendIcon className="h-3 w-3 mr-1" />
                    {Math.abs(stat.change)}%
                  </Badge>
                </div>
                <p className="text-sm text-slate-500 mb-1">{stat.title}</p>
                <p className="text-2xl font-bold text-slate-900">
                  ${stat.value.toLocaleString()}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Revenue vs Expenses</CardTitle>
            <CardDescription>Monthly financial overview for 2026</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="revenue" fill="#1e40af" radius={[4, 4, 0, 0]} name="Revenue" />
                  <Bar dataKey="expenses" fill="#0f766e" radius={[4, 4, 0, 0]} name="Expenses" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Transactions</CardTitle>
            <CardDescription>Last 5 activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-start gap-3 pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                  <div className={`p-1.5 rounded-full ${tx.type === 'receipt' ? 'bg-green-50' : 'bg-red-50'}`}>
                    {tx.type === 'receipt' ? (
                      <ArrowUpRight className="h-3.5 w-3.5 text-green-600" />
                    ) : (
                      <ArrowDownRight className="h-3.5 w-3.5 text-red-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{tx.description}</p>
                    <p className="text-xs text-slate-500">{tx.date}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium ${tx.type === 'receipt' ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.type === 'receipt' ? '+' : '-'}${tx.amount.toLocaleString()}
                    </p>
                    <Badge
                      variant={tx.status === 'completed' ? 'success' : 'warning'}
                      className="text-[10px] px-1.5 py-0"
                    >
                      {tx.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
