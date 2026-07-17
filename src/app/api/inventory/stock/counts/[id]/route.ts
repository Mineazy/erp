import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, ok, getBody } from '@/lib/api';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const count = await prisma.erpInventoryCount.findUnique({
    where: { id },
    include: { lines: true },
  });
  if (!count) return notFound('Inventory count not found');

  return ok(count);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.erpInventoryCount.findUnique({ where: { id }, include: { lines: true } });
  if (!existing) return notFound('Inventory count not found');

  const body = await getBody(request);
  const { notes, status } = body;
  const lines = (body.lines || undefined) as any[] | undefined;

  const updateData: Record<string, unknown> = {};
  if (notes !== undefined) updateData.notes = notes;
  if (status !== undefined) updateData.status = status;

  if (lines) {
    for (const line of lines) {
      if (line.id) {
        const countedQty = parseFloat(line.countedQty) || 0;
        const currentLine = existing.lines.find((l) => l.id === line.id);
        if (currentLine) {
          const variance = countedQty - Number(currentLine.systemQty);
          await prisma.erpInventoryCountLine.update({
            where: { id: line.id },
            data: {
              ...(line.countedQty !== undefined && { countedQty }),
              ...(line.notes !== undefined && { notes: line.notes as string }),
              variance,
            },
          });
        }
      }
    }
  }

  const updated = await prisma.erpInventoryCount.update({
    where: { id },
    data: updateData as any,
    include: { lines: true },
  });

  return ok(updated);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.erpInventoryCount.findUnique({ where: { id } });
  if (!existing) return notFound('Inventory count not found');

  await prisma.erpInventoryCount.delete({ where: { id } });
  return ok({ success: true });
}
