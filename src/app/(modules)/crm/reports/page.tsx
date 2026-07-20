'use client';

import { toast } from '@/components/ui/toast';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Search, Users, Trophy, DollarSign, Calendar, Star, TrendingUp } from 'lucide-react';

interface ReportOption {
  name: string;
  type: string;
  icon: any;
  desc: string;
  category: string;
}

export default function CRMReportsPage() {
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('2026-01-01');
  const [dateTo, setDateTo] = useState('2026-12-31');

  const reportsList: ReportOption[] = [
    { name: 'Customer Loyalty Ledger', type: 'loyalty_ledger', icon: Trophy, desc: 'Tracks points balance, barcode card ids, and card balances', category: 'Loyalty' },
    { name: 'VIP Customer Spend Analysis', type: 'vip_spend', icon: DollarSign, desc: 'Identifies Big Spenders and calculates average customer ticket size', category: 'Analytics' },
    { name: 'Customer Registration Summary', type: 'customer_reg', icon: Users, desc: 'Shows registration date metrics and customer growth charts', category: 'Marketing' },
    { name: 'Supplier Performance Ratings', type: 'supplier_ratings', icon: Star, desc: 'Supplier order accuracy, on-time deliveries, and item return logs', category: 'Suppliers' },
  ];

  const filteredReports = reportsList.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.desc.toLowerCase().includes(search.toLowerCase())
  );

  const downloadReport = (reportName: string, format: 'csv' | 'pdf') => {
    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = `${reportName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${timestamp}`;

    if (format === 'csv') {
      const headers = ['CRM Report', reportName, 'Period', `${dateFrom} to ${dateTo}`];
      const rows = [
        [],
        ['Customer Name', 'Barcode ID', 'Loyalty Points', 'Card Balance ($)', 'Total Spent ($)', 'VIP Status'],
        ['John Doe', 'LOYAL-101', '12', '5.40', '12,500.00', 'VIP ★'],
        ['Jane Smith', 'LOYAL-102', '3', '0.00', '3,400.00', 'Standard'],
        ['Mining Corp Inc', 'LOYAL-103', '520', '45.00', '520,000.00', 'VIP ★'],
        ['Alistair Vance', 'LOYAL-104', '0', '0.50', '250.00', 'Standard'],
      ];

      const csvContent = [headers, ...rows].map(e => e.map(val => `"${val}"`).join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${fileName}.csv`);
      link.click();
    } else {
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;
      
      const reportRows = [
        ['Customer Name', 'Barcode ID', 'Loyalty Points', 'Card Balance ($)', 'Total Spent ($)', 'VIP Status'],
        ['John Doe', 'LOYAL-101', '12', '5.40', '12,500.00', 'VIP ★'],
        ['Jane Smith', 'LOYAL-102', '3', '0.00', '3,400.00', 'Standard'],
        ['Mining Corp Inc', 'LOYAL-103', '520', '45.00', '520,000.00', 'VIP ★'],
        ['Alistair Vance', 'LOYAL-104', '0', '0.50', '250.00', 'Standard'],
      ];
      
      let tableHtml = '<table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px;">';
      reportRows.forEach((row, rIdx) => {
        tableHtml += '<tr>';
        row.forEach((cell) => {
          const style = rIdx === 0 
            ? 'background: #f1f5f9; color: #0f172a; font-weight: 700; border-bottom: 2px solid #cbd5e1; padding: 12px 10px; border-top: 1px solid #e2e8f0;' 
            : 'border-bottom: 1px solid #e2e8f0; padding: 10px; color: #334155;';
          tableHtml += `<td style="${style}">${cell}</td>`;
        });
        tableHtml += '</tr>';
      });
      tableHtml += '</table>';

      printWindow.document.write(`
        <html>
          <head>
            <title>${reportName}</title>
            <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1e293b; background-color: #ffffff; }
              .header { border-bottom: 3px solid #4f46e5; padding-bottom: 20px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: flex-end; }
              .logo { font-size: 26px; font-weight: 800; color: #4f46e5; letter-spacing: 0.5px; }
              .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; font-size: 13px; color: #64748b; line-height: 1.6; margin-bottom: 25px; }
              .meta-title { font-weight: bold; color: #0f172a; font-size: 16px; margin-bottom: 5px; }
              .footer { text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; margin-top: 40px; }
            </style>
          </head>
          <body>
            <div class="header">
              <div>
                <img src="${window.location.origin}/logo.PNG" style="height: 45px; width: auto; margin-bottom: 5px; display: block;" alt="Logo" />
                <div style="font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; margin-top: 4px;">Official Audit Document</div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 18px; font-weight: bold; color: #0f172a;">${reportName}</div>
                <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Generated: ${new Date().toLocaleString()}</div>
              </div>
            </div>
            
            <div class="meta-box">
              <div class="meta-title">Report Metadata & Scope</div>
              <div><strong>Scope Period:</strong> ${dateFrom} to ${dateTo}</div>
              <div><strong>Document Status:</strong> verified & signed</div>
              <div><strong>Confidentiality:</strong> Internal Corporate Audiences Only</div>
            </div>

            ${tableHtml}

            <div class="footer">
              Mineazy ERP Reports & Analytics System. Confidential Audit Document. &copy; 2026
            </div>
            <script>
              window.onload = function() {
                window.print();
                setTimeout(function() { window.close(); }, 500);
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
    toast(`CRM report "${reportName}" downloaded in ${format.toUpperCase()} format!`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-mine-blue-800" />
            CRM & Customer Analytics
          </h2>
          <p className="text-slate-500 mt-1">Loyalty points trackers, VIP metrics, and supplier ratings</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md">
          <CardContent className="p-5 space-y-2">
            <p className="text-xs uppercase tracking-wider opacity-75 font-semibold">Total Customers</p>
            <h3 className="text-2xl font-bold font-mono">1,420</h3>
            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-medium">+12% growth this month</span>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md">
          <CardContent className="p-5 space-y-2">
            <p className="text-xs uppercase tracking-wider opacity-75 font-semibold">VIP Big Spenders</p>
            <h3 className="text-2xl font-bold font-mono">38</h3>
            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-medium">Spent $5,000+ YTD</span>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-md">
          <CardContent className="p-5 space-y-2">
            <p className="text-xs uppercase tracking-wider opacity-75 font-semibold">Outstanding Points</p>
            <h3 className="text-2xl font-bold font-mono">14,500 pts</h3>
            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-medium">Valued at $1.00/point</span>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md">
          <CardContent className="p-5 space-y-2">
            <p className="text-xs uppercase tracking-wider opacity-75 font-semibold">Loyalty Card Credits</p>
            <h3 className="text-2xl font-bold font-mono">$1,250.00</h3>
            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-medium">Accumulated loose change</span>
          </CardContent>
        </Card>
      </div>

      {/* Date Controls & Filters */}
      <Card>
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-400" />
            Report Parameters
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">From Date</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full text-sm border border-slate-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-mine-blue-500 text-slate-700" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">To Date</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full text-sm border border-slate-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-mine-blue-500 text-slate-700" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Search Reports</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input type="text" placeholder="Search by report type..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full text-sm border border-slate-200 rounded-md pl-8 pr-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-mine-blue-500 text-slate-700" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-mine-blue-800" />
            Standard CRM Reports
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Report Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReports.map((report) => {
                const IconComponent = report.icon;
                return (
                  <TableRow key={report.type}>
                    <TableCell className="font-semibold text-slate-800 flex items-center gap-2">
                      <div className="p-1 rounded bg-slate-50 border border-slate-100">
                        <IconComponent className="h-4 w-4 text-mine-blue-700" />
                      </div>
                      {report.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant={report.category === 'Loyalty' ? 'success' : report.category === 'Suppliers' ? 'warning' : 'secondary'}>{report.category}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">{report.desc}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button size="sm" variant="outline" onClick={() => downloadReport(report.name, 'csv')} className="text-xs gap-1">
                          <Download className="h-3 w-3" />
                          CSV
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => downloadReport(report.name, 'pdf')} className="text-xs gap-1">
                          <Download className="h-3 w-3" />
                          PDF
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredReports.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-slate-400 py-8">No matching reports found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
