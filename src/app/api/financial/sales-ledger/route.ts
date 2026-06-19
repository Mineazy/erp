import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, ok, getBranchFilter } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get('customerId');
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');
  const status = searchParams.get('status');

  const branchFilter = getBranchFilter(session);
  const where: any = {};
  Object.assign(where, branchFilter);
  if (customerId) where.customerId = customerId;
  if (status) where.status = status;
  if (dateFrom || dateTo) {
    where.invoiceDate = {};
    if (dateFrom) where.invoiceDate.gte = new Date(dateFrom);
    if (dateTo) where.invoiceDate.lte = new Date(dateTo);
  }

  const invoices = await prisma.erpAccountReceivable.findMany({
    where,
    orderBy: [{ customerName: 'asc' }, { invoiceDate: 'asc' }],
  });

  const customersWithBalance = await prisma.erpAccountReceivable.groupBy({
    by: ['customerId', 'customerName'],
    _sum: { balance: true, amount: true },
    _count: { id: true },
    where: { ...(status ? { status } : {}), ...branchFilter },
    orderBy: { customerName: 'asc' },
  });

  const customerTotals = await prisma.erpAccountReceivable.groupBy({
    by: ['customerId', 'customerName', 'status'],
    _sum: { balance: true },
    where: { ...(status ? { status } : {}), ...branchFilter },
  });

  const overdueCustomerIds = (
    await prisma.erpAccountReceivable.findMany({
      where: { status: 'overdue', ...branchFilter },
      select: { customerId: true },
      distinct: ['customerId'],
    })
  ).map((r) => r.customerId);

  const customerDetails = await prisma.erpCustomer.findMany({
    where: customerId ? { id: customerId } : {},
    select: { id: true, email: true, phone: true, city: true },
  });
  const customerDetailMap = Object.fromEntries(
    customerDetails.map((c) => [c.id, c]),
  );

  const balances: Record<string, number> = {};
  const ledger = invoices.map((inv) => {
    const prev = balances[inv.customerId] || 0;
    const debit = Number(inv.amount);
    const credit = Number(inv.paidAmount);
    const running = prev + debit - credit;
    balances[inv.customerId] = running;
    return {
      id: inv.id,
      date: inv.invoiceDate,
      documentNo: inv.invoiceNumber,
      customerId: inv.customerId,
      customerName: inv.customerName,
      description: inv.description || `Invoice ${inv.invoiceNumber}`,
      debit,
      credit,
      balance: running,
      status: inv.status,
    };
  });

  const summaries = customersWithBalance.map((c) => {
    const statusBreakdown = customerTotals
      .filter((t) => t.customerId === c.customerId)
      .map((t) => ({ status: t.status, balance: Number(t._sum.balance) }));
    const details = customerDetailMap[c.customerId];
    return {
      customerId: c.customerId,
      customerName: c.customerName,
      totalInvoiced: Number(c._sum.amount),
      totalOutstanding: Number(c._sum.balance),
      invoiceCount: c._count.id,
      isOverdue: overdueCustomerIds.includes(c.customerId),
      email: details?.email || null,
      phone: details?.phone || null,
      city: details?.city || null,
      statusBreakdown,
    };
  });

  const totalOutstanding = summaries.reduce((s, c) => s + c.totalOutstanding, 0);
  const totalInvoiced = summaries.reduce((s, c) => s + c.totalInvoiced, 0);
  const overdueCount = summaries.filter((c) => c.isOverdue).length;
  const activeCustomers = summaries.filter((c) => c.totalOutstanding > 0).length;

  return ok({
    transactions: ledger,
    summaries,
    totals: {
      totalOutstanding,
      totalInvoiced,
      overdueCount,
      activeCustomers,
      totalCustomers: summaries.length,
    },
  });
}
