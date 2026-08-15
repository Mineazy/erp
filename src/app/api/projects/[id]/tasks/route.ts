import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, badRequest, created, ok, getBody } from '@/lib/api';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const tasks = await prisma.erpProjectTask.findMany({
    where: { projectId: id },
    include: { assignee: { select: { id: true, firstName: true, lastName: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return ok(tasks);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const body = await getBody(request) as any;
    
    if (!body.title) return badRequest('Task title is required');

    const task = await prisma.erpProjectTask.create({
      data: {
        projectId: id,
        title: body.title,
        description: body.description,
        status: body.status || 'todo',
        priority: body.priority || 'medium',
        startDate: body.startDate ? new Date(body.startDate as string) : null,
        dueDate: body.dueDate ? new Date(body.dueDate as string) : null,
        assignedToId: body.assignedToId,
        estimatedHours: parseFloat(body.estimatedHours || '0'),
      },
      include: { assignee: { select: { id: true, firstName: true, lastName: true } } }
    });

    return created(task);
  } catch (error: any) {
    console.error('POST Task Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
