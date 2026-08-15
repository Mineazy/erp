import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, ok, getBody } from '@/lib/api';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string, taskId: string }> }) {
  const { id, taskId } = await params;
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const body = await getBody(request) as any;

    const data: any = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.description !== undefined) data.description = body.description;
    if (body.status !== undefined) data.status = body.status;
    if (body.priority !== undefined) data.priority = body.priority;
    if (body.startDate !== undefined) data.startDate = body.startDate ? new Date(body.startDate as string) : null;
    if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate as string) : null;
    if (body.assignedToId !== undefined) data.assignedToId = body.assignedToId;
    if (body.estimatedHours !== undefined) data.estimatedHours = parseFloat(body.estimatedHours);
    if (body.status === 'done' && !data.completedAt) data.completedAt = new Date();
    else if (body.status !== 'done') data.completedAt = null;

    const task = await prisma.erpProjectTask.update({
      where: { id: taskId },
      data,
      include: { assignee: { select: { id: true, firstName: true, lastName: true } } }
    });

    return ok(task);
  } catch (error: any) {
    console.error('PUT Task Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string, taskId: string }> }) {
  const { id, taskId } = await params;
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    await prisma.erpProjectTask.delete({
      where: { id: taskId }
    });

    return ok({ success: true });
  } catch (error: any) {
    console.error('DELETE Task Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
