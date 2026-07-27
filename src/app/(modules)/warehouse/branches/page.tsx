'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2 } from 'lucide-react';

export default function BranchesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Branches Management</h2>
        <p className="text-slate-500 mt-1">Manage remote branches and track their inventory</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-mine-blue-600" />
            Branch Directory
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-500 text-sm">Branch management interface will be displayed here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
