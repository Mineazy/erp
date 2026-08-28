import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, badRequest, ok, created, getBody, getNextSequence, getBranchFilter } from '@/lib/api';
import { logAudit } from '@/lib/audit';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status');
  const segment = searchParams.get('segment');

  const branchFilter = getBranchFilter(session);
  const where: any = {};
  Object.assign(where, branchFilter);
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { code: { contains: search } },
      { contactPerson: { contains: search } },
      { email: { contains: search } },
      { loyaltyCardBarcode: { contains: search } },
    ];
  }
  if (status === 'active') where.isActive = true;
  else if (status === 'inactive') where.isActive = false;
  if (segment) where.segment = segment;

  const items = await prisma.erpCustomer.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
  return ok(items);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await getBody(request);
  const { name, type, contactPerson, email, phone, mobile, address, city, country, taxId, tinNumber, vatNumber, creditLimit, notes, segment, resellerDiscount, branchId } = body;

  if (!name) return badRequest('Name is required');

  const code = await getNextSequence(prisma, 'erpCustomer', 'code', 'CUS');

  const loyaltyCardBarcode = `LOYAL-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

  let item;
  try {
    item = await prisma.erpCustomer.create({
      data: {
        code,
        name: name as string,
        type: (type as string) || 'company',
        segment: (segment as string) || 'retail',
        resellerDiscount: parseFloat((resellerDiscount as string) || '0'),
        contactPerson: contactPerson as string,
        email: email as string,
        phone: phone as string,
        mobile: mobile as string,
        address: address as string,
        city: city as string,
        country: country as string,
        taxId: taxId as string,
        tinNumber: tinNumber as string || null,
        vatNumber: vatNumber as string || null,
        creditLimit: parseFloat((creditLimit as string) || '0'),
        notes: notes as string,
        loyaltyCardBarcode,
        branchId: branchId || (session.user as any)?.branchId || null,
      },
    });
  } catch (err: any) {
    if (err?.code === 'P2002') {
      const target = err?.meta?.target || '';
      if (target.includes('loyalty_card_barcode')) {
        return badRequest('A customer with this loyalty card barcode already exists');
      }
      if (target.includes('code')) {
        return badRequest('A customer with this code already exists');
      }
      return badRequest('A customer with this value already exists');
    }
    return badRequest(err.message || 'Failed to create customer');
  }

  const u = session.user as any;
  await logAudit({
    userId: u.email || u.id,
    userName: u.name || u.email,
    action: 'CREATE',
    entityType: 'Customer',
    entityId: item.id,
    changes: { code: item.code, name: item.name, segment: item.segment },
  });

  return created(item);
}
