import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, badRequest, created, ok, getBody, getNextSequence, getBranchFilter } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { searchParams } = request.nextUrl;
  const status = searchParams.get('status');
  const type = searchParams.get('type');
  const search = searchParams.get('search');

  const branchFilter = getBranchFilter(session);
  const where: any = {};
  Object.assign(where, branchFilter);
  
  if (status && status !== 'all') where.status = status;
  if (type && type !== 'all') where.type = type;
  
  if (search) {
    where.name = { contains: search, mode: 'insensitive' };
  }

  const [items, total] = await Promise.all([
    prisma.erpProject.findMany({
      where,
      include: {
        manager: { select: { id: true, firstName: true, lastName: true } },
        client: { select: { id: true, name: true } },
        _count: { select: { tasks: true, timeLogs: true, expenses: true, members: true } },
        tasks: { select: { status: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.erpProject.count({ where }),
  ]);

  return ok({ items, total });
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const body = await getBody(request) as any;
    
    if (!body.name) return badRequest('Project name is required');

    const projectNo = await getNextSequence(prisma, 'erpProject', 'projectNo', 'PRJ');
    const branchId = (session.user as any)?.branchId || null;

    const project = await prisma.erpProject.create({
      data: {
        projectNo,
        name: body.name,
        description: body.description,
        type: body.type || 'construction',
        status: body.status || 'planning',
        startDate: body.startDate ? new Date(body.startDate as string) : null,
        endDate: body.endDate ? new Date(body.endDate as string) : null,
        budget: parseFloat(body.budget || '0'),
        currency: body.currency || 'USD',
        managerId: body.managerId,
        clientId: body.clientId,
        branchId,
      },
    });

    return created(project);
  } catch (error: any) {
    console.error('POST Project Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
