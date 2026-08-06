import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const branches = await prisma.erpBranch.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        code: true
      },
      orderBy: { name: 'asc' }
    });
    return NextResponse.json(branches);
  } catch (error) {
    console.error('Error fetching branches:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
