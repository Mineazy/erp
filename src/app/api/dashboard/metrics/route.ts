import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, ok } from '@/lib/api';

export async function GET(_request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const [
    products,
    activeProducts,
    customers,
    suppliers,
    salesOrders,
    openSalesOrders,
    purchaseOrders,
    openPurchaseOrders,
    arAgg,
    apAgg,
    openSessions,
    pendingReturns,
    cashbookAgg,
    recentAR,
    recentAP,
    posToday,
  ] = await Promise.all([
    prisma.erpProduct.count(),
    prisma.erpProduct.count({ where: { isActive: true } }),
    prisma.erpCustomer.count({ where: { isActive: true } }),
    prisma.erpSupplier.count({ where: { isActive: true } }),
    prisma.erpSalesOrder.count(),
    prisma.erpSalesOrder.count({ where: { status: { in: ['draft', 'confirmed', 'processing'] } } }),
    prisma.erpPurchaseOrder.count(),
    prisma.erpPurchaseOrder.count({ where: { status: { in: ['draft', 'sent', 'confirmed'] } } }),
    prisma.erpAccountReceivable.aggregate({ _sum: { balance: true }, _count: true }),
    prisma.erpAccountPayable.aggregate({ _sum: { balance: true }, _count: true }),
    prisma.erpPosSession.count({ where: { status: 'open' } }),
    prisma.erpReturn.count({ where: { status: 'pending' } }),
    prisma.erpCashbook.aggregate({ _sum: { amount: true } }),
    prisma.erpAccountReceivable.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: { invoiceDate: true, invoiceNumber: true, customerName: true, amount: true, balance: true, status: true } }),
    prisma.erpAccountPayable.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: { billDate: true, billNumber: true, supplierName: true, amount: true, balance: true, status: true } }),
    prisma.erpPosTransaction.findMany({ where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } }, select: { total: true } }),
  ]);

  const lowStockProducts = await prisma.erpProduct.findMany({
    where: { isActive: true, stock: { gt: 0 } },
    select: { stock: true, minStock: true },
  });
  const lowStockItems = lowStockProducts.filter(p => Number(p.stock) <= Number(p.minStock)).length;
  const outOfStockItems = await prisma.erpProduct.count({ where: { stock: 0 } });

  let posSalesToday = 0;
  for (const t of posToday) { posSalesToday += Number(t.total); }

  // Monthly revenue/expenses from AR/AP (last 12 months)
  const now = new Date();
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const monthly: { month: string; revenue: number; expenses: number }[] = [];

  const arRecords = await prisma.erpAccountReceivable.findMany({
    where: { invoiceDate: { gte: twelveMonthsAgo } },
    select: { invoiceDate: true, amount: true },
  });

  const apRecords = await prisma.erpAccountPayable.findMany({
    where: { billDate: { gte: twelveMonthsAgo } },
    select: { billDate: true, amount: true },
  });

  const monthMap: Record<string, { revenue: number; expenses: number }> = {};
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (const ar of arRecords) {
    const d = new Date(ar.invoiceDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!monthMap[key]) monthMap[key] = { revenue: 0, expenses: 0 };
    monthMap[key].revenue += Number(ar.amount);
  }

  for (const ap of apRecords) {
    const d = new Date(ap.billDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!monthMap[key]) monthMap[key] = { revenue: 0, expenses: 0 };
    monthMap[key].expenses += Number(ap.amount);
  }

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthly.push({
      month: monthNames[d.getMonth()],
      revenue: monthMap[key]?.revenue || 0,
      expenses: monthMap[key]?.expenses || 0,
    });
  }

  // Recent transactions (mix of AR and AP)
  const recentTransactions: { id: string; date: string; description: string; type: string; amount: number; status: string }[] = [];

  for (const ar of recentAR) {
    recentTransactions.push({
      id: `ar-${ar.invoiceNumber}`,
      date: ar.invoiceDate.toISOString().split('T')[0],
      description: `Invoice #${ar.invoiceNumber} - ${ar.customerName || ''}`,
      type: 'receipt',
      amount: Number(ar.amount),
      status: ar.status === 'paid' ? 'completed' : ar.status,
    });
  }

  for (const ap of recentAP) {
    recentTransactions.push({
      id: `ap-${ap.billNumber}`,
      date: ap.billDate.toISOString().split('T')[0],
      description: `Bill #${ap.billNumber} - ${ap.supplierName || ''}`,
      type: 'payment',
      amount: Number(ap.amount),
      status: ap.status === 'paid' ? 'completed' : ap.status,
    });
  }

  recentTransactions.sort((a, b) => b.date.localeCompare(a.date));
  const top5 = recentTransactions.slice(0, 5);

  return ok({
    stats: {
      totalProducts: products,
      activeProducts,
      totalCustomers: customers,
      totalSuppliers: suppliers,
      totalSalesOrders: salesOrders,
      openSalesOrders,
      totalPurchaseOrders: purchaseOrders,
      openPurchaseOrders,
      totalRevenue: Number((await prisma.erpAccountReceivable.aggregate({ _sum: { amount: true }, where: { status: { not: 'cancelled' } } }))._sum.amount || 0),
      outstandingAR: Number(arAgg._sum.balance || 0),
      outstandingAP: Number(apAgg._sum.balance || 0),
      openSessions,
      pendingReturns,
      lowStockItems,
      outOfStockItems,
      posSalesToday,
    },
    chart: { monthly },
    recentTransactions: top5,
  });
}
