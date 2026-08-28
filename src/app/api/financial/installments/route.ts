import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, badRequest, ok, created, getBody, getNextSequence, getBranchFilter } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const sp = request.nextUrl.searchParams;
  const search = sp.get('search') || '';
  const status = sp.get('status');
  const customerId = sp.get('customerId');
  const productCategory = sp.get('productCategory');

  const where: any = {};
  const branchFilter = getBranchFilter(session);
  if (branchFilter?.branchId) where.branchId = branchFilter.branchId;
  if (customerId) where.customerId = customerId;
  if (status) where.status = status;
  if (productCategory) where.productCategory = productCategory;
  if (search) {
    where.OR = [
      { customerName: { contains: search } },
      { planNumber: { contains: search } },
      { productName: { contains: search } },
    ];
  }

  const plans = await prisma.erpInstallmentPlan.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      payments: { orderBy: { paymentDate: 'desc' } },
      arInvoice: { select: { invoiceNumber: true, id: true } },
    },
  });
  return ok(plans);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await getBody(request);
  const { customerId, customerName, productName, productCategory, productDescription, totalAmount, depositAmount, numberOfMonths, startDate, arInvoiceId, notes } = body;

  if (!customerName || !productName || !totalAmount || !numberOfMonths || !startDate) {
    return badRequest('Customer name, product, total amount, number of months and start date are required');
  }

  const total = parseFloat(totalAmount as string);
  const deposit = parseFloat(depositAmount as string) || 0;
  const balance = total - deposit;
  const months = parseInt(numberOfMonths as string);
  const monthlyPayment = balance / months;

  const planNumber = await getNextSequence(prisma, 'erpInstallmentPlan', 'planNumber', 'INST');
  const start = new Date(startDate as string);
  const end = new Date(start);
  end.setMonth(end.getMonth() + months);

  const plan = await prisma.erpInstallmentPlan.create({
    data: {
      planNumber: planNumber as string,
      arInvoiceId: (arInvoiceId as string) || null,
      customerId: (customerId as string) || `CUST-${(customerName as string).replace(/[^a-zA-Z0-9]/g, '-').toUpperCase().replace(/-+/g, '-').replace(/^-|-$/g, '')}`,
      customerName: customerName as string,
      productName: productName as string,
      productCategory: (productCategory as string) || null,
      productDescription: (productDescription as string) || null,
      totalAmount: total,
      depositAmount: deposit,
      balanceAmount: balance,
      monthlyPayment,
      numberOfMonths: months,
      startDate: start,
      endDate: end,
      status: 'active',
      notes: (notes as string) || null,
      branchId: (session.user as any)?.branchId || null,
    },
    include: {
      payments: true,
      arInvoice: { select: { invoiceNumber: true } },
    },
  });

  return created(plan);
}

export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await getBody(request);
  const { id: rawId, status } = body;

  if (!rawId) return badRequest('ID is required');
  const id = rawId as string;

  const data: any = {};
  if (status) data.status = status;

  const plan = await prisma.erpInstallmentPlan.update({
    where: { id },
    data,
    include: { payments: true },
  });

  return ok(plan);
}
