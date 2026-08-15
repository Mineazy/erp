import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, ok } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  try {
    const employees = await prisma.erpEmployee.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        department: true,
        position: true,
      },
      orderBy: { firstName: 'asc' },
    });
    return ok(employees);
  } catch (error: any) {
    console.error('GET Employees Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
