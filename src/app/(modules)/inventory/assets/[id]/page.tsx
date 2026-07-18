'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/lib/use-toast';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface Asset {
  id: string;
  assetNo: string;
  name: string;
  description?: string;
  category: { name: string };
  status: string;
  location?: string;
  purchaseCost: number;
  purchaseDate: string;
  salvageValue: number;
  assignedTo?: string;
  custodian?: string;
  serialNo?: string;
  lastInspection?: string;
  nextInspection?: string;
  depreciations: any[];
  maintenances: any[];
  transfers: any[];
  checkouts: any[];
}

export default function AssetDetailsPage() {
  const params = useParams();
  const { toast } = useToast();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [accumulated, setAccumulated] = useState(0);
  const [currentValue, setCurrentValue] = useState(0);

  useEffect(() => {
    fetchAsset();
  }, [params.id]);

  const fetchAsset = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/inventory/assets/${params.id}`);
      const data = await res.json();

      if (data.success) {
        setAsset(data.data);
        calculateDepreciation(data.data);
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to fetch asset', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const calculateDepreciation = (asset: Asset) => {
    const acc = asset.depreciations.reduce((sum, d) => sum + Number(d.depreciationExp), 0);
    setAccumulated(acc);
    setCurrentValue(Number(asset.purchaseCost) - acc);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      operational: 'bg-green-100 text-green-800',
      maintenance: 'bg-yellow-100 text-yellow-800',
      disposed: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-16">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Asset not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/inventory/assets">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">{asset.name}</h1>
          <p className="text-gray-600">{asset.assetNo}</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Purchase Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">₱{asset.purchaseCost.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Accumulated Depreciation</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">₱{accumulated.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Current Value</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">₱{currentValue.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={getStatusColor(asset.status)}>{asset.status}</Badge>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Asset Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-600">Category</p>
            <p className="text-lg font-semibold">{asset.category.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Serial Number</p>
            <p className="text-lg font-semibold">{asset.serialNo || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Location</p>
            <p className="text-lg font-semibold">{asset.location || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Assigned To</p>
            <p className="text-lg font-semibold">{asset.assignedTo || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Custodian</p>
            <p className="text-lg font-semibold">{asset.custodian || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Purchase Date</p>
            <p className="text-lg font-semibold">{new Date(asset.purchaseDate).toLocaleDateString()}</p>
          </div>
          {asset.description && (
            <div className="col-span-2">
              <p className="text-sm text-gray-600">Description</p>
              <p className="text-lg font-semibold">{asset.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="depreciation">
        <TabsList>
          <TabsTrigger value="depreciation">Depreciation</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="transfers">Transfers</TabsTrigger>
          <TabsTrigger value="checkouts">Checkouts</TabsTrigger>
        </TabsList>

        <TabsContent value="depreciation">
          <Card>
            <CardHeader>
              <CardTitle>Depreciation History</CardTitle>
            </CardHeader>
            <CardContent>
              {asset.depreciations.length === 0 ? (
                <p className="text-gray-600">No depreciation records</p>
              ) : (
                <div className="space-y-4">
                  {asset.depreciations.map((dep, idx) => (
                    <div key={idx} className="flex justify-between items-center p-4 border rounded">
                      <div>
                        <p className="font-semibold">{dep.period}</p>
                        <p className="text-sm text-gray-600">{dep.status}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">₱{Number(dep.depreciationExp).toLocaleString()}</p>
                        <p className="text-sm text-gray-600">Closing: ₱{Number(dep.closingValue).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance">
          <Card>
            <CardHeader>
              <CardTitle>Maintenance Records</CardTitle>
            </CardHeader>
            <CardContent>
              {asset.maintenances.length === 0 ? (
                <p className="text-gray-600">No maintenance records</p>
              ) : (
                <div className="space-y-4">
                  {asset.maintenances.map((maint, idx) => (
                    <div key={idx} className="flex justify-between items-start p-4 border rounded">
                      <div>
                        <p className="font-semibold">{maint.type}</p>
                        <p className="text-sm text-gray-600">{new Date(maint.maintenanceDate).toLocaleDateString()}</p>
                        <p className="text-sm mt-1">{maint.description}</p>
                      </div>
                      <p className="font-semibold">₱{Number(maint.cost).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transfers">
          <Card>
            <CardHeader>
              <CardTitle>Transfer History</CardTitle>
            </CardHeader>
            <CardContent>
              {asset.transfers.length === 0 ? (
                <p className="text-gray-600">No transfer records</p>
              ) : (
                <div className="space-y-4">
                  {asset.transfers.map((transfer, idx) => (
                    <div key={idx} className="flex justify-between items-start p-4 border rounded">
                      <div>
                        <p className="font-semibold">{transfer.fromLocation} → {transfer.toLocation}</p>
                        <p className="text-sm text-gray-600">{new Date(transfer.transferDate).toLocaleDateString()}</p>
                        <p className="text-sm mt-1">By: {transfer.transferredBy}</p>
                      </div>
                      <Badge>{transfer.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checkouts">
          <Card>
            <CardHeader>
              <CardTitle>Checkout History</CardTitle>
            </CardHeader>
            <CardContent>
              {asset.checkouts.length === 0 ? (
                <p className="text-gray-600">No checkout records</p>
              ) : (
                <div className="space-y-4">
                  {asset.checkouts.map((checkout, idx) => (
                    <div key={idx} className="flex justify-between items-start p-4 border rounded">
                      <div>
                        <p className="font-semibold">Checked out by: {checkout.checkedOutBy}</p>
                        <p className="text-sm text-gray-600">{new Date(checkout.checkedOutAt).toLocaleDateString()}</p>
                        {checkout.checkedInAt && (
                          <p className="text-sm mt-1">Returned: {new Date(checkout.checkedInAt).toLocaleDateString()}</p>
                        )}
                      </div>
                      <Badge>{checkout.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
