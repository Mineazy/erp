'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase, Activity, DollarSign, Clock, Users } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
export default function ProjectsDashboard() {
  const [stats, setStats] = useState<any>({
    activeProjects: 0,
    totalBudget: 0,
    totalExpenses: 0,
    recentActivity: []
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [analyticsRes, projectsRes] = await Promise.all([
          fetch('/api/projects/analytics'),
          fetch('/api/projects?status=active')
        ]);

        let totalBudget = 0;
        let totalExpenses = 0;
        let activeProjectsCount = 0;
        let recentActivity = [];

        if (analyticsRes.ok) {
          const analyticsData = await analyticsRes.json();
          totalBudget = analyticsData.totalBudget || 0;
          totalExpenses = analyticsData.totalExpenses || 0;
          activeProjectsCount = analyticsData.activeProjectsCount || 0;
        }

        if (projectsRes.ok) {
          const projectsData = await projectsRes.json();
          const active = projectsData.items || [];
          recentActivity = active.slice(0, 5);
        }
        
        setStats({
          activeProjects: activeProjectsCount,
          totalBudget: totalBudget,
          totalExpenses: totalExpenses,
          recentActivity: recentActivity
        });
      } catch (e) {
        console.error(e);
      }
      setIsLoading(false);
    };
    fetchStats();
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Project Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Overview of all active projects and budgets</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-mine-blue-500 shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Active Projects</p>
              <h3 className="text-3xl font-bold text-slate-900">{isLoading ? '-' : stats.activeProjects}</h3>
            </div>
            <div className="h-12 w-12 rounded-full bg-mine-blue-50 flex items-center justify-center">
              <Briefcase className="h-6 w-6 text-mine-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Total Budget (Active)</p>
              <h3 className="text-3xl font-bold text-slate-900">
                ${isLoading ? '-' : stats.totalBudget.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-emerald-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Total Expenses (Active)</p>
              <h3 className="text-3xl font-bold text-slate-900">
                ${isLoading ? '-' : stats.totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="h-12 w-12 rounded-full bg-amber-50 flex items-center justify-center">
              <Activity className="h-6 w-6 text-amber-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Budget Variance</p>
              <h3 className="text-3xl font-bold text-slate-900">
                ${isLoading ? '-' : (stats.totalBudget - stats.totalExpenses).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="h-12 w-12 rounded-full bg-purple-50 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <Activity className="h-5 w-5 text-mine-blue-600" />
              Recent Active Projects
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-slate-500">Loading...</div>
            ) : stats.recentActivity.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No active projects.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {stats.recentActivity.map((p: any) => (
                  <Link href={`/projects/${p.id}`} key={p.id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors cursor-pointer group">
                    <div>
                      <p className="font-medium text-slate-900 group-hover:text-mine-blue-600 transition-colors">{p.name}</p>
                      <p className="text-sm text-slate-500">{p.projectNo} • {format(new Date(p.createdAt), 'MMM d, yyyy')}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-slate-900">${Number(p.budget).toLocaleString()}</p>
                      <p className="text-sm text-emerald-600 capitalize">{p.type}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
