import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Warehouse, Building2, Package, ClipboardCheck, ArrowLeftRight, AlertTriangle, TrendingUp, Bell } from 'lucide-react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { formatDistanceToNow } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function WarehouseDashboard() {
  const [
    totalWarehouses,
    totalBranches,
    warehouseStocks,
    branchStocks,
    pendingReceipts,
    pendingTransfers,
    pendingBackOrders,
    recentActivity,
    lowStockResult
  ] = await Promise.all([
    prisma.erpWarehouse.count({ where: { code: { not: 'L99' } } }),
    prisma.erpBranch.count(),
    prisma.erpWarehouseStock.aggregate({ where: { warehouse: { code: { not: 'L99' } } }, _sum: { quantity: true } }),
    prisma.erpBranchStock.aggregate({ _sum: { quantity: true } }),
    prisma.erpGoodsReceipt.count({ where: { status: 'Pending Review' } }),
    prisma.erpStockTransfer.count({ where: { status: { in: ['draft', 'pending'] } } }),
    prisma.erpBackOrder.count({ where: { status: 'submitted' } }),
    prisma.erpStockMovement.findMany({
      orderBy: { createdAt: 'desc' },
      take: 4,
    }),
    prisma.$queryRaw`SELECT COUNT(*) as count FROM erp_branch_stocks WHERE quantity <= min_quantity AND min_quantity > 0`
  ]);

  const totalStockOnHand = Number(warehouseStocks._sum.quantity || 0) + Number(branchStocks._sum.quantity || 0);
  const lowStockAlerts = Number((lowStockResult as any[])[0]?.count || 0);
  
  const formatStock = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Warehouse Dashboard</h2>
        <p className="text-slate-500 mt-1">Overview of warehouse operations and inventory</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 bg-blue-100 text-blue-600 flex items-center justify-center rounded-xl">
              <Warehouse className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Warehouses</p>
              <h3 className="text-2xl font-bold text-slate-900">{totalWarehouses}</h3>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 bg-purple-100 text-purple-600 flex items-center justify-center rounded-xl">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Branches</p>
              <h3 className="text-2xl font-bold text-slate-900">{totalBranches}</h3>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 bg-green-100 text-green-600 flex items-center justify-center rounded-xl">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Stock on Hand</p>
              <h3 className="text-2xl font-bold text-slate-900">{formatStock(totalStockOnHand)}</h3>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 bg-amber-100 text-amber-600 flex items-center justify-center rounded-xl">
              <ClipboardCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Pending Receipts</p>
              <h3 className="text-2xl font-bold text-slate-900">{pendingReceipts}</h3>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 bg-orange-100 text-orange-600 flex items-center justify-center rounded-xl">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Pending Back Orders</p>
              <h3 className="text-2xl font-bold text-slate-900">{pendingBackOrders}</h3>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 bg-indigo-100 text-indigo-600 flex items-center justify-center rounded-xl">
              <ArrowLeftRight className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Pending Transfers</p>
              <h3 className="text-2xl font-bold text-slate-900">{pendingTransfers}</h3>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 bg-red-100 text-red-600 flex items-center justify-center rounded-xl">
              <Bell className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Low Stock Alerts</p>
              <h3 className="text-2xl font-bold text-slate-900">{lowStockAlerts}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-mine-blue-600" />
              Warehouse Performance Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                <span className="text-sm font-medium">Order Fulfillment Rate</span>
                <span className="text-sm font-bold text-green-600">94.2%</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                <span className="text-sm font-medium">Inventory Accuracy</span>
                <span className="text-sm font-bold text-green-600">98.5%</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                <span className="text-sm font-medium">Space Utilization</span>
                <span className="text-sm font-bold text-amber-600">82.1%</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                <span className="text-sm font-medium">On-Time Deliveries</span>
                <span className="text-sm font-bold text-green-600">91.8%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Warehouse className="h-5 w-5 text-mine-blue-600" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.length === 0 ? (
                <p className="text-slate-500 text-sm">No recent activity</p>
              ) : (
                recentActivity.map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="mt-1 h-2 w-2 rounded-full bg-mine-blue-500 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {item.type.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </p>
                      <p className="text-sm text-slate-500">{item.notes || `Movement of ${item.productName}`}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
