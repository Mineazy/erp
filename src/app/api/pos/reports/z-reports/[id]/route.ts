import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, ok } from '@/lib/api';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const report = await prisma.erpZReport.findUnique({
    where: { id },
    include: {
      session: {
        include: {
          transactions: {
            where: { status: 'completed' },
            include: { payments: true }
          }
        }
      },
      branch: { select: { id: true, name: true, code: true, address: true, city: true, phone: true } }
    },
  });

  if (!report) return notFound('Z Report not found');

  return ok(report);
}
