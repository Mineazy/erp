import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, badRequest, ok, getBody, notFound } from '@/lib/api';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const project = await prisma.erpProject.findUnique({
    where: { id: id },
    include: {
      manager: { select: { id: true, firstName: true, lastName: true } },
      client: { select: { id: true, name: true, code: true } },
      tasks: {
        include: {
          assignee: { select: { id: true, firstName: true, lastName: true } },
          extensions: { orderBy: { createdAt: 'desc' } },
        },
        orderBy: { createdAt: 'desc' },
      },
      expenses: {
        include: { recordedBy: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { expenseDate: 'desc' },
      },
      timeLogs: {
        include: { employee: { select: { id: true, firstName: true, lastName: true } }, task: { select: { id: true, title: true } } },
        orderBy: { logDate: 'desc' },
      },
      members: {
        include: { employee: { select: { id: true, firstName: true, lastName: true, department: true } } }
      }
    }
  });

  if (!project) return notFound('Project not found');

  return ok(project);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const body = await getBody(request) as any;

    const data: any = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.description !== undefined) data.description = body.description;
    if (body.type !== undefined) data.type = body.type;
    if (body.status !== undefined) data.status = body.status;
    if (body.startDate !== undefined) data.startDate = body.startDate ? new Date(body.startDate as string) : null;
    if (body.endDate !== undefined) data.endDate = body.endDate ? new Date(body.endDate as string) : null;
    if (body.budget !== undefined) data.budget = parseFloat(body.budget);
    if (body.currency !== undefined) data.currency = body.currency;
    if (body.managerId !== undefined) data.managerId = body.managerId;
    if (body.clientId !== undefined) data.clientId = body.clientId;

    const project = await prisma.erpProject.update({
      where: { id: id },
      data,
    });

    return ok(project);
  } catch (error: any) {
    console.error('PUT Project Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    await prisma.erpProject.delete({
      where: { id: id }
    });

    return ok({ success: true });
  } catch (error: any) {
    console.error('DELETE Project Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
