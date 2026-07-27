'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardCheck } from 'lucide-react';

export default function GoodsReceivingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Goods Receiving</h2>
        <p className="text-slate-500 mt-1">Receive purchase orders and record short/over deliveries</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-mine-blue-600" />
            Pending Goods Receipts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-500 text-sm">Goods receiving interface will be displayed here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
