'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  TrendingUp, TrendingDown, DollarSign, Receipt, CreditCard, Wallet,
  ArrowUpRight, ArrowDownRight, RefreshCw, Package, ShoppingCart, Truck,
  RotateCcw, LogIn, AlertTriangle, Users, Building2,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

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
  const [data, setData] = useState<any>(null);

  const fetchMetrics = async () => {
    try {
      const res = await fetch('/api/dashboard/metrics');
      if (res.ok) setData(await res.json());
    } catch (_) {}
  };

  useEffect(() => { fetchMetrics(); }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchMetrics();
    setTimeout(() => setRefreshing(false), 300);
  };

  const stats = !data ? [] : [
    {
      title: 'Total Revenue',
      value: data.stats.totalRevenue,
      icon: DollarSign,
      color: 'text-mine-blue-600',
      bg: 'bg-mine-blue-50',
    },
    {
      title: 'Outstanding AR',
      value: data.stats.outstandingAR,
      icon: Receipt,
      color: 'text-mine-amber-600',
      bg: 'bg-mine-amber-50',
    },
    {
      title: 'Outstanding AP',
      value: data.stats.outstandingAP,
      icon: CreditCard,
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
    {
      title: 'POS Sales Today',
      value: data.stats.posSalesToday,
      icon: Wallet,
      color: 'text-mine-green-600',
      bg: 'bg-mine-green-50',
    },
  ];

  const secondaryStats = !data ? [] : [
    { title: 'Products', value: data.stats.activeProducts, total: data.stats.totalProducts, icon: Package, color: 'text-mine-blue-600', bg: 'bg-mine-blue-50' },
    { title: 'Open Sales Orders', value: data.stats.openSalesOrders, icon: ShoppingCart, color: 'text-mine-amber-600', bg: 'bg-mine-amber-50' },
    { title: 'Open Purchases', value: data.stats.openPurchaseOrders, icon: Truck, color: 'text-purple-600', bg: 'bg-purple-50' },
    { title: 'Open POS Sessions', value: data.stats.openSessions, icon: LogIn, color: 'text-mine-green-600', bg: 'bg-mine-green-50' },
    { title: 'Pending Returns', value: data.stats.pendingReturns, icon: RotateCcw, color: 'text-red-600', bg: 'bg-red-50' },
    { title: 'Low Stock', value: data.stats.lowStockItems, icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50' },
    { title: 'Customers', value: data.stats.totalCustomers, icon: Users, color: 'text-cyan-600', bg: 'bg-cyan-50' },
    { title: 'Suppliers', value: data.stats.totalSuppliers, icon: Building2, color: 'text-slate-600', bg: 'bg-slate-100' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Dashboard</h2>
          <p className="text-slate-500 mt-1">Welcome back! Here is your business overview.</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} loading={refreshing}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {!data ? (
        <div className="text-center py-12 text-slate-400">Loading dashboard data...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card key={stat.title} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-2 rounded-lg ${stat.bg}`}>
                        <Icon className={`h-5 w-5 ${stat.color}`} />
                      </div>
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

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            {secondaryStats.map((s) => {
              const Icon = s.icon;
              return (
                <Card key={s.title} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-3 text-center">
                    <Icon className={`h-4 w-4 mx-auto mb-1 ${s.color}`} />
                    <p className="text-lg font-bold text-slate-900">{s.value}</p>
                    <p className="text-[10px] text-slate-500 truncate">{s.title}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Revenue vs Expenses</CardTitle>
                <CardDescription>Monthly financial overview (AR vs AP)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.chart.monthly} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} />
                      <YAxis tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip content={<CustomTooltip />} />
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
                <CardDescription>Latest AR & AP activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.recentTransactions.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-4">No recent transactions</p>
                  ) : (
                    data.recentTransactions.map((tx: any) => (
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
                          <Badge variant={tx.status === 'completed' ? 'success' : 'warning'} className="text-[10px] px-1.5 py-0">
                            {tx.status}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
