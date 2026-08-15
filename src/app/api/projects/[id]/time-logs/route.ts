import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, badRequest, created, ok, getBody } from '@/lib/api';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const timeLogs = await prisma.erpProjectTimeLog.findMany({
    where: { projectId: id },
    include: {
      employee: { select: { id: true, firstName: true, lastName: true } },
      task: { select: { id: true, title: true } },
    },
    orderBy: { logDate: 'desc' },
  });

  return ok(timeLogs);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const body = await getBody(request) as any;
    
    if (!body.employeeId || !body.hours) {
      return badRequest('Employee and hours are required');
    }

    const timeLog = await prisma.erpProjectTimeLog.create({
      data: {
        projectId: id,
        taskId: body.taskId || null,
        employeeId: body.employeeId,
        logDate: body.logDate ? new Date(body.logDate as string) : new Date(),
        hours: parseFloat(body.hours),
        description: body.description,
        billable: body.billable !== undefined ? body.billable : true,
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true } },
        task: { select: { id: true, title: true } },
      }
    });

    return created(timeLog);
  } catch (error: any) {
    console.error('POST Time Log Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
