'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeftRight } from 'lucide-react';

export default function StockTransfersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Stock Transfers</h2>
        <p className="text-slate-500 mt-1">Manage stock movements between warehouses and branches</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5 text-mine-blue-600" />
            Transfer Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-500 text-sm">Stock transfers interface will be displayed here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
