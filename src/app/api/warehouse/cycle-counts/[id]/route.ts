import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, ok, getBody, badRequest } from '@/lib/api';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const item = await prisma.erpCycleCount.findUnique({
    where: { id: id },
    include: { lines: true },
  });
  if (!item) return notFound('Cycle count not found');
  return ok(item);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();
  const userEmail = (session.user as any).email || 'unknown';

  const existing = await prisma.erpCycleCount.findUnique({ where: { id: id }, include: { lines: true } });
  if (!existing) return notFound('Cycle count not found');

  const body = await getBody(request);
  const lines = body.lines as any[];

  try {
    const result = await prisma.$transaction(async (tx) => {
      const data: any = {};
      if (body.warehouseId !== undefined) data.warehouseId = body.warehouseId as string;
      if (body.status !== undefined) data.status = body.status as string;
      if (body.countedBy !== undefined) data.countedBy = body.countedBy as string;
      if (body.countedAt !== undefined) data.countedAt = body.countedAt ? new Date(body.countedAt as string) : null;
      if (body.approvedBy !== undefined) data.approvedBy = body.approvedBy as string | null;
      if (body.notes !== undefined) data.notes = body.notes as string | null;

      let lineData: any[] = [];
      if (lines) {
        if (!lines.length) throw new Error('At least one line item required');
        lineData = lines.map((l: any) => {
          const expected = parseFloat(l.expectedQty || '0');
          const counted = parseFloat(l.countedQty || '0');
          return {
            productId: l.productId,
            productName: l.productName,
            expectedQty: expected,
            countedQty: counted,
            variance: counted - expected,
            notes: l.notes || '',
          };
        });
        await tx.erpCycleCountLine.deleteMany({ where: { countId: id } });
        data.lines = { create: lineData };
      }

      const isApproving = data.status === 'approved' && existing.status !== 'approved';

      const item = await tx.erpCycleCount.update({
        where: { id: id },
        data,
        include: { lines: true },
      });

      if (isApproving) {
        const linesToProcess = lines ? lineData : existing.lines;
        let totalAdjustmentValue = 0;

        for (const line of linesToProcess) {
          const diff = Number(line.variance);
          if (diff === 0) continue;

          // Find product cost
          const product = await tx.erpProduct.findUnique({ where: { id: line.productId } });
          const cost = product ? Number(product.costPrice || 0) : 0;
          totalAdjustmentValue += diff * cost;

          // Update stock
          const stock = await tx.erpWarehouseStock.findFirst({
            where: { warehouseId: item.warehouseId, productId: line.productId }
          });
          
          if (stock) {
            await tx.erpWarehouseStock.update({
              where: { id: stock.id },
              data: { quantity: { increment: diff } }
            });
          } else if (diff > 0) {
            await tx.erpWarehouseStock.create({
              data: {
                warehouseId: item.warehouseId,
                productId: line.productId,
                quantity: diff
              }
            });
          }

          // Create stock movement
          const { getNextSequence } = await import('@/lib/api');
          const movementNo = await getNextSequence(tx as any, 'erpStockMovement', 'movementNo', 'MOV');
          await tx.erpStockMovement.create({
            data: {
              movementNo,
              type: diff > 0 ? 'in' : 'out',
              productId: line.productId,
              productName: line.productName,
              quantity: Math.abs(diff),
              referenceType: 'cycle_count',
              referenceId: id,
              fromWarehouseId: diff < 0 ? item.warehouseId : null,
              toWarehouseId: diff > 0 ? item.warehouseId : null,
              notes: `Cycle count variance adjustment`,
              userId: userEmail,
            }
          });
        }

        // Generate GL entry if variance has value
        if (Math.abs(totalAdjustmentValue) > 0) {
          const { getNextSequence } = await import('@/lib/api');
          const entryNumber = await getNextSequence(tx as any, 'erpJournalEntry', 'entryNumber', 'JNL');
          
          const invAccount = await tx.erpChartOfAccounts.findFirst({ where: { name: { contains: 'Inventory' }, type: 'Asset' } });
          const adjAccount = await tx.erpChartOfAccounts.findFirst({ where: { name: { contains: 'Inventory Shrinkage' }, type: 'Expense' } });

          if (invAccount && adjAccount) {
            const val = Math.abs(totalAdjustmentValue);
            const isLoss = totalAdjustmentValue < 0;

            await tx.erpJournalEntry.create({
              data: {
                entryNumber,
                description: `Cycle count adjustment for ${existing.countNo}`,
                entryDate: new Date(),
                period: new Date().toISOString().slice(0, 7),
                status: 'posted',
                postedAt: new Date(),
                postedBy: userEmail,
                lines: {
                  create: [
                    { accountId: isLoss ? adjAccount.id : invAccount.id, description: 'Inventory Adjustment', debit: val, credit: 0 },
                    { accountId: isLoss ? invAccount.id : adjAccount.id, description: 'Inventory Adjustment', debit: 0, credit: val }
                  ]
                }
              }
            });
          }
        }
      }

      return item;
    });

    return ok(result);
  } catch (err: any) {
    return badRequest(err.message || 'Failed to process cycle count');
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.erpCycleCount.findUnique({ where: { id: id } });
  if (!existing) return notFound('Cycle count not found');

  await prisma.erpCycleCount.delete({ where: { id: id } });
  return ok({ success: true });
}
