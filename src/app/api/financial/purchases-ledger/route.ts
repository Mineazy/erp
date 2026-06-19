import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, ok, getBranchFilter } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { searchParams } = new URL(request.url);
  const supplierId = searchParams.get('supplierId');
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');
  const status = searchParams.get('status');

  const branchFilter = getBranchFilter(session);
  const where: any = {};
  Object.assign(where, branchFilter);
  if (supplierId) where.supplierId = supplierId;
  if (status) where.status = status;
  if (dateFrom || dateTo) {
    where.billDate = {};
    if (dateFrom) where.billDate.gte = new Date(dateFrom);
    if (dateTo) where.billDate.lte = new Date(dateTo);
  }

  const bills = await prisma.erpAccountPayable.findMany({
    where,
    orderBy: [{ supplierName: 'asc' }, { billDate: 'asc' }],
  });

  const suppliersWithBalance = await prisma.erpAccountPayable.groupBy({
    by: ['supplierId', 'supplierName'],
    _sum: { balance: true, amount: true },
    _count: { id: true },
    where: { ...(status ? { status } : {}), ...branchFilter },
    orderBy: { supplierName: 'asc' },
  });

  const supplierTotals = await prisma.erpAccountPayable.groupBy({
    by: ['supplierId', 'supplierName', 'status'],
    _sum: { balance: true },
    where: { ...(status ? { status } : {}), ...branchFilter },
  });

  const overdueSupplierIds = (
    await prisma.erpAccountPayable.findMany({
      where: { status: 'overdue', ...branchFilter },
      select: { supplierId: true },
      distinct: ['supplierId'],
    })
  ).map((r) => r.supplierId);

  const supplierDetails = await prisma.erpSupplier.findMany({
    where: supplierId ? { id: supplierId } : {},
    select: { id: true, email: true, phone: true, city: true },
  });
  const supplierDetailMap = Object.fromEntries(
    supplierDetails.map((s) => [s.id, s]),
  );

  const balances: Record<string, number> = {};
  const ledger = bills.map((bill) => {
    const prev = balances[bill.supplierId] || 0;
    const debit = Number(bill.paidAmount);
    const credit = Number(bill.amount);
    const running = prev + credit - debit;
    balances[bill.supplierId] = running;
    return {
      id: bill.id,
      date: bill.billDate,
      documentNo: bill.billNumber,
      supplierId: bill.supplierId,
      supplierName: bill.supplierName,
      description: bill.description || `Bill ${bill.billNumber}`,
      debit,
      credit,
      balance: running,
      status: bill.status,
    };
  });

  const summaries = suppliersWithBalance.map((s) => {
    const statusBreakdown = supplierTotals
      .filter((t) => t.supplierId === s.supplierId)
      .map((t) => ({ status: t.status, balance: Number(t._sum.balance) }));
    const details = supplierDetailMap[s.supplierId];
    return {
      supplierId: s.supplierId,
      supplierName: s.supplierName,
      totalBilled: Number(s._sum.amount),
      totalOutstanding: Number(s._sum.balance),
      billCount: s._count.id,
      isOverdue: overdueSupplierIds.includes(s.supplierId),
      email: details?.email || null,
      phone: details?.phone || null,
      city: details?.city || null,
      statusBreakdown,
    };
  });

  const totalOutstanding = summaries.reduce((s, c) => s + c.totalOutstanding, 0);
  const totalBilled = summaries.reduce((s, c) => s + c.totalBilled, 0);
  const overdueCount = summaries.filter((s) => s.isOverdue).length;
  const activeSuppliers = summaries.filter((s) => s.totalOutstanding > 0).length;

  return ok({
    transactions: ledger,
    summaries,
    totals: {
      totalOutstanding,
      totalBilled,
      overdueCount,
      activeSuppliers,
      totalSuppliers: summaries.length,
    },
  });
}
