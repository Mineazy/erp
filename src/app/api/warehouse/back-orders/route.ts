import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    const orders = await prisma.erpBackOrder.findMany({
      where: search ? {
        OR: [
          { orderNumber: { contains: search } },
          { branch: { name: { contains: search } } },
        ]
      } : undefined,
      include: {
        branch: { select: { name: true } },
        lines: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    
    return NextResponse.json(orders);
  } catch (error) {
    console.error('Failed to fetch back orders:', error);
    return NextResponse.json({ error: 'Failed to fetch back orders' }, { status: 500 });
  }
}
