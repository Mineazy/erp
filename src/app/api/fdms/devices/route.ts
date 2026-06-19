import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, badRequest, created, ok, getBody, getNextSequence, getBranchFilter } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  const branchFilter = getBranchFilter(session);
  const where: any = {};
  if (status) where.status = status;
  Object.assign(where, branchFilter);

  const items = await prisma.fdmsDevice.findMany({
    where,
    include: { branch: { select: { id: true, code: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return ok(items);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await getBody(request);
  const { serialNo, activationKey, certificate, privateKey, status } = body;
  if (!serialNo) return badRequest('Serial number is required');

  const deviceId = await getNextSequence(prisma, 'fdmsDevice', 'deviceId', 'FD');

  const item = await prisma.fdmsDevice.create({
    data: {
      deviceId,
      serialNo: serialNo as string,
      activationKey: activationKey as string | undefined,
      certificate: certificate as string | undefined,
      privateKey: privateKey as string | undefined,
      status: (status as string) || 'registered',
      branchId: (session.user as any)?.branchId || null,
    },
  });
  return created(item);
}
