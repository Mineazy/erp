'use client';

import { toast } from '@/components/ui/toast';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Crown, Search, TrendingUp, DollarSign, Percent, ShieldAlert, Award, Star, RefreshCw } from 'lucide-react';

interface Customer {
  id: string;
  code: string;
  name: string;
  type: string;
  contactPerson: string;
  email: string;
  phone: string;
  city: string;
  balance: number;
  isActive: boolean;
  totalSpent: number;
}

export default function BigSpendersPage() {
  const [data, setData] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/crm/customers');
      if (!res.ok) throw new Error('Failed to fetch customers');
      const customers = await res.json();
      setData(customers);
    } catch {
      toast('Failed to load spenders list', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Sort by total spent descending
  const sortedSpenders = [...data]
    .map(c => ({
      ...c,
      totalSpent: Number(c.totalSpent || 0),
      balance: Number(c.balance || 0),
    }))
    .sort((a, b) => b.totalSpent - a.totalSpent);

  const filteredSpenders = sortedSpenders.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.code.toLowerCase().includes(search.toLowerCase())
  );

  // VIP Metrics Calculations
  const grandTotalSpend = sortedSpenders.reduce((sum, c) => sum + c.totalSpent, 0);
  const avgLifetimeSpend = sortedSpenders.length > 0 ? grandTotalSpend / sortedSpenders.length : 0;
  
  // Top 10% Revenue Share
  const top10PercentCount = Math.max(1, Math.round(sortedSpenders.length * 0.1));
  const top10PercentSpend = sortedSpenders.slice(0, top10PercentCount).reduce((sum, c) => sum + c.totalSpent, 0);
  const top10PercentShare = grandTotalSpend > 0 ? (top10PercentSpend / grandTotalSpend) * 100 : 0;

  const vipSpendersCount = sortedSpenders.filter(c => c.totalSpent >= 10000).length;

  const getSpenderSegment = (totalSpent: number) => {
    if (totalSpent >= 15000) return { label: 'VIP Spender', className: 'bg-rose-100 text-rose-800 border-rose-200' };
    if (totalSpent >= 5000) return { label: 'Key Account', className: 'bg-amber-100 text-amber-800 border-amber-200' };
    return { label: 'Core Retail', className: 'bg-slate-100 text-slate-800 border-slate-200' };
  };

  const handleIssueCoupon = (customer: any) => {
    toast(`VIP Coupon generated and sent to ${customer.email || 'customer email'}!`, 'success');
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Crown className="h-7 w-7 text-rose-500 animate-bounce" />
            Big Spenders VIP Board
          </h2>
          <p className="text-slate-500 mt-1">Identify and reward high-value customer accounts by lifetime expenditure</p>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh Metrics
        </Button>
      </div>

      {/* VIP Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-rose-900 to-rose-950 text-white overflow-hidden relative">
          <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-10">
            <Crown className="h-40 w-40" />
          </div>
          <CardContent className="p-6 space-y-2">
            <p className="text-rose-200 text-xs font-semibold uppercase tracking-wider">Total Customer Spend</p>
            <p className="text-3xl font-extrabold">${loading ? '...' : grandTotalSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <div className="flex items-center gap-2 pt-1 text-xs text-rose-200">
              <DollarSign className="h-4 w-4" />
              <span>Cumulative Lifetime Revenue</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-800 to-indigo-950 text-white overflow-hidden relative">
          <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-10">
            <Percent className="h-40 w-40" />
          </div>
          <CardContent className="p-6 space-y-2">
            <p className="text-indigo-200 text-xs font-semibold uppercase tracking-wider">Top 10% Revenue Share</p>
            <p className="text-3xl font-extrabold">{loading ? '...' : top10PercentShare.toFixed(1)}%</p>
            <div className="flex items-center gap-2 pt-1 text-xs text-indigo-200">
              <TrendingUp className="h-4 w-4" />
              <span>Share of Wallet from Top Spenders</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-800 to-slate-950 text-white overflow-hidden relative">
          <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-10">
            <Star className="h-40 w-40" />
          </div>
          <CardContent className="p-6 space-y-2">
            <p className="text-slate-200 text-xs font-semibold uppercase tracking-wider">Avg Customer Spend</p>
            <p className="text-3xl font-extrabold">${loading ? '...' : avgLifetimeSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <div className="flex items-center gap-2 pt-1 text-xs text-slate-200">
              <Award className="h-4 w-4" />
              <span>Average Spend per Account</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-700 to-amber-900 text-white overflow-hidden relative">
          <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-10">
            <Star className="h-40 w-40" />
          </div>
          <CardContent className="p-6 space-y-2">
            <p className="text-amber-200 text-xs font-semibold uppercase tracking-wider">Active VIPs</p>
            <p className="text-3xl font-extrabold">{loading ? '...' : vipSpendersCount}</p>
            <div className="flex items-center gap-2 pt-1 text-xs text-amber-200">
              <Star className="h-4 w-4" />
              <span>Customers with spent &ge; $10k</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leaderboard Table */}
      <Card className="border border-slate-100 shadow-xl bg-white/95">
        <CardHeader className="pb-3 border-b border-slate-50">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Crown className="h-5 w-5 text-rose-500" />
              Spender Leaderboard
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search spenders name or code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 w-64 bg-slate-50/50"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/75">
              <TableRow>
                <TableHead className="w-16 text-center font-semibold text-slate-600">Rank</TableHead>
                <TableHead className="font-semibold text-slate-600">Customer Code</TableHead>
                <TableHead className="font-semibold text-slate-600">Customer Name</TableHead>
                <TableHead className="font-semibold text-slate-600 text-right">Lifetime Spend</TableHead>
                <TableHead className="font-semibold text-slate-600 text-right">Outstanding Bal.</TableHead>
                <TableHead className="font-semibold text-slate-600">VIP Level</TableHead>
                <TableHead className="font-semibold text-slate-600 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="h-5 w-5 animate-spin text-rose-500" />
                      <span>Computing VIP Expenditures...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredSpenders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-slate-400">No high-spend accounts found</TableCell>
                </TableRow>
              ) : (
                filteredSpenders.map((customer, index) => {
                  const rank = index + 1;
                  const segment = getSpenderSegment(customer.totalSpent);
                  
                  // Render special styling for podium finishes
                  const getRankBadge = (r: number) => {
                    if (r === 1) return <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-amber-100 text-amber-800 border border-amber-200 font-extrabold shadow-sm">👑</span>;
                    if (r === 2) return <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-slate-200 text-slate-800 border border-slate-350 font-extrabold shadow-sm">🥈</span>;
                    if (r === 3) return <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-amber-700/10 text-amber-900 border border-amber-700/20 font-extrabold shadow-sm">🥉</span>;
                    return <span className="font-mono text-slate-500 text-xs font-bold">{r}</span>;
                  };

                  return (
                    <TableRow key={customer.id} className="hover:bg-slate-50/75 transition-colors">
                      <TableCell className="text-center">{getRankBadge(rank)}</TableCell>
                      <TableCell className="font-mono text-xs font-semibold text-slate-700">{customer.code}</TableCell>
                      <TableCell className="text-slate-800 font-semibold">{customer.name}</TableCell>
                      <TableCell className="text-right font-mono font-bold text-emerald-700">
                        ${customer.totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-mono text-slate-600">
                        ${customer.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${segment.className} border font-bold uppercase tracking-wider text-[10px]`}>
                          {segment.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleIssueCoupon(customer)}
                          className="h-8 border-rose-200 hover:border-rose-350 hover:bg-rose-50/50 text-rose-700 hover:text-rose-900 text-xs font-semibold transition-all shadow-sm"
                        >
                          <Award className="h-3.5 w-3.5 mr-1" />
                          Issue VIP Coupon
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
