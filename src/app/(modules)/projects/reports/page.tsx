'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Briefcase, Activity, DollarSign, ListTodo, FileText, Download } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

const fetchImageAsBase64 = async (url: string) => {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export default function ProjectReports() {
  const [data, setData] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnalyticsAndProjects = async () => {
      try {
        const [analyticsRes, projectsRes] = await Promise.all([
          fetch('/api/projects/analytics'),
          fetch('/api/projects?status=all')
        ]);
        
        if (analyticsRes.ok) {
          setData(await analyticsRes.json());
        }
        if (projectsRes.ok) {
          const pData = await projectsRes.json();
          setProjects(pData.items || []);
        }
      } catch (e) {
        console.error(e);
      }
      setIsLoading(false);
    };
    fetchAnalyticsAndProjects();
  }, []);

  const downloadReport = async (projectSummary: any) => {
    try {
      // Fetch detailed project info
      const res = await fetch(`/api/projects/${projectSummary.id}`);
      if (!res.ok) throw new Error('Failed to fetch project details');
      const project = await res.json();

      const doc = new jsPDF();
      let logoBase64: any = null;
      try { logoBase64 = await fetchImageAsBase64('/logo.png'); } catch (e) { console.error('Logo not found', e); }
      
      if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', 14, 10, 60, 20);
      }
      
      doc.setFontSize(22);
      doc.setTextColor(40, 40, 40);
      doc.text('PROJECT ANALYSIS REPORT', 200, 30, { align: 'right' });
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 200, 40, { align: 'right' });

      doc.setFontSize(14);
      doc.setTextColor(41, 128, 185);
      doc.text('Project Overview', 14, 65);
      
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      
      const totalTasks = project.tasks?.length || 0;
      const completedTasks = project.tasks?.filter((t: any) => t.status === 'done' || t.status === 'completed').length || 0;
      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      
      const totalExpenses = project.expenses?.reduce((sum: number, exp: any) => sum + Number(exp.amount), 0) || 0;
      
      const overviewData = [
        ['Project Name:', project.name, 'Status:', project.status.toUpperCase()],
        ['Project No:', project.projectNo, 'Type:', project.type.toUpperCase()],
        ['Start Date:', project.startDate ? format(new Date(project.startDate), 'PP') : 'N/A', 'End Date:', project.endDate ? format(new Date(project.endDate), 'PP') : 'N/A'],
        ['Budget:', `$${Number(project.budget).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 'Total Expenses:', `$${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}`],
        ['Client:', project.client?.name || 'N/A', 'Manager:', project.manager ? `${project.manager.firstName} ${project.manager.lastName}` : 'N/A'],
        ['Progress:', `${progress}% (${completedTasks}/${totalTasks} tasks completed)`, '', '']
      ];

      autoTable(doc, {
        startY: 70,
        body: overviewData,
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 2 },
        columnStyles: {
          0: { fontStyle: 'bold', textColor: [40, 40, 40], cellWidth: 35 },
          1: { cellWidth: 60 },
          2: { fontStyle: 'bold', textColor: [40, 40, 40], cellWidth: 35 },
          3: { cellWidth: 60 }
        }
      });

      let finalY = (doc as any).lastAutoTable.finalY + 15;

      // Tasks Table
      if (project.tasks && project.tasks.length > 0) {
        doc.setFontSize(14);
        doc.setTextColor(41, 128, 185);
        doc.text('Tasks Summary', 14, finalY);
        
        autoTable(doc, {
          startY: finalY + 5,
          head: [['Task', 'Status', 'Priority', 'Assignee']],
          body: project.tasks.map((t: any) => [
            t.title,
            t.status.toUpperCase(),
            t.priority.toUpperCase(),
            t.assignee ? `${t.assignee.firstName} ${t.assignee.lastName}` : 'Unassigned'
          ]),
          theme: 'striped',
          headStyles: { fillColor: [41, 128, 185] },
          styles: { fontSize: 9 }
        });
        finalY = (doc as any).lastAutoTable.finalY + 15;
      }

      // Expenses Table
      if (project.expenses && project.expenses.length > 0) {
        if (finalY > 250) {
          doc.addPage();
          finalY = 20;
        }
        
        doc.setFontSize(14);
        doc.setTextColor(41, 128, 185);
        doc.text('Expenses Log', 14, finalY);
        
        autoTable(doc, {
          startY: finalY + 5,
          head: [['Date', 'Category', 'Description', 'Amount']],
          body: project.expenses.map((e: any) => [
            format(new Date(e.expenseDate), 'PP'),
            e.category,
            e.description || '—',
            `$${Number(e.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
          ]),
          theme: 'striped',
          headStyles: { fillColor: [41, 128, 185] },
          styles: { fontSize: 9 }
        });
      }

      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Page ${i} of ${pageCount} | Mineazy ERP`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 10, { align: 'center' });
      }

      doc.save(`${project.projectNo}_Analysis_Report.pdf`);
    } catch (e) {
      console.error(e);
      alert('Failed to generate report');
    }
  };

  if (isLoading) {
    return <div className="p-6 text-center text-slate-500">Loading analytics...</div>;
  }

  if (!data) {
    return <div className="p-6 text-center text-red-500">Failed to load analytics data.</div>;
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Reports & Analytics</h1>
        <p className="text-slate-500 text-sm mt-1">High-level metrics and financial summaries across all projects</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-mine-blue-500 shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Active Projects</p>
              <h3 className="text-3xl font-bold text-slate-900">{data.activeProjectsCount}</h3>
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
                ${data.totalBudget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                ${data.totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
              <p className="text-sm font-medium text-slate-500 mb-1">Total Tasks</p>
              <h3 className="text-3xl font-bold text-slate-900">{data.totalTasksCount}</h3>
            </div>
            <div className="h-12 w-12 rounded-full bg-purple-50 flex items-center justify-center">
              <ListTodo className="h-6 w-6 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Project Status Distribution</CardTitle>
            <CardDescription>Breakdown of projects by their current status</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {data.projectStatusDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.projectStatusDistribution}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    nameKey="name"
                    label
                  >
                    {data.projectStatusDistribution.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400">No project data available</div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Task Completion Overview</CardTitle>
            <CardDescription>Total tasks across all projects</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {data.taskStatusDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.taskStatusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="value"
                    nameKey="name"
                    paddingAngle={5}
                    label
                  >
                    {data.taskStatusDistribution.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400">No task data available</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg">Budget vs. Actuals (Top 5 Active Projects)</CardTitle>
          <CardDescription>Comparison of planned budget against logged expenses</CardDescription>
        </CardHeader>
        <CardContent className="h-[400px]">
          {data.topBudgetVsActuals.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.topBudgetVsActuals}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `$${value}`} />
                <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
                <Legend />
                <Bar dataKey="budget" name="Budget" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400">No active project financial data available</div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-mine-blue-600" />
            Project Reports
          </CardTitle>
          <CardDescription>Downloadable analysis reports for all projects</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Project ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Budget</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-slate-500">No projects found.</TableCell>
                </TableRow>
              ) : (
                projects.map((project) => (
                  <TableRow key={project.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-mono text-sm text-slate-500">{project.projectNo}</TableCell>
                    <TableCell className="font-medium text-slate-900">{project.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize text-slate-600">
                        {project.type.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={
                        project.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                        project.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                        project.status === 'on_hold' ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-700'
                      }>
                        {project.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium text-slate-700">
                      ${Number(project.budget).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => downloadReport(project)}>
                        <Download className="h-4 w-4 mr-2" />
                        Download Report
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
