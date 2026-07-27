'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package } from 'lucide-react';

export default function StorageLocationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Storage Locations</h2>
        <p className="text-slate-500 mt-1">Manage warehouse zones, aisles, shelves, and bins</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-mine-blue-600" />
            Location Hierarchy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-500 text-sm">Storage locations mapping interface will be displayed here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
