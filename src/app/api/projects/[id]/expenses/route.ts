import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, badRequest, created, ok, getBody } from '@/lib/api';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const expenses = await prisma.erpProjectExpense.findMany({
    where: { projectId: id },
    include: { recordedBy: { select: { id: true, firstName: true, lastName: true } } },
    orderBy: { expenseDate: 'desc' },
  });

  return ok(expenses);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const body = await getBody(request) as any;
    
    if (!body.category || !body.amount || !body.recordedById) {
      return badRequest('Category, amount, and recordedBy are required');
    }

    const expense = await prisma.erpProjectExpense.create({
      data: {
        projectId: id,
        expenseDate: body.expenseDate ? new Date(body.expenseDate as string) : new Date(),
        category: body.category,
        description: body.description || '',
        amount: parseFloat(body.amount),
        currency: body.currency || 'USD',
        recordedById: body.recordedById,
        status: body.status || 'pending',
        receiptUrl: body.receiptUrl,
      },
      include: { recordedBy: { select: { id: true, firstName: true, lastName: true } } }
    });

    // Update project budget optionally? 
    // The user didn't mention automatic deduction, but we can do it later if needed.

    return created(expense);
  } catch (error: any) {
    console.error('POST Expense Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
