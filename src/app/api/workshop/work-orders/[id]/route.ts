import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, ok, getBody, badRequest } from '@/lib/api';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const item = await prisma.erpWorkOrder.findUnique({
    where: { id: id },
    include: { parts: true },
  });
  if (!item) return notFound('Work order not found');
  return ok(item);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();
  const userEmail = (session.user as any).email || 'unknown';

  const existing = await prisma.erpWorkOrder.findUnique({ where: { id: id }, include: { parts: true } });
  if (!existing) return notFound('Work order not found');

  const body = await getBody(request);
  const { equipmentId, type, priority, description, assignedTo, scheduledDate, completedAt, labourHours, labourCost, partsCost, totalCost, status, failureMode, downtimeHours, notes } = body;
  const parts = body.parts as any[];

  try {
    const result = await prisma.$transaction(async (tx) => {
      let lineData: any[] = [];
      let totalPartsCost = 0;

      if (parts && parts.length > 0) {
        lineData = parts.map((l: any) => ({
          productId: l.productId,
          productName: l.productName,
          quantity: parseFloat(l.quantity),
          unitCost: parseFloat(l.unitCost),
          totalCost: parseFloat(l.quantity) * parseFloat(l.unitCost),
        }));
        totalPartsCost = lineData.reduce((sum: number, l: any) => sum + l.totalCost, 0);
        await tx.erpWorkOrderPart.deleteMany({ where: { woId: id } });
      }

      const isCompleting = status === 'completed' && existing.status !== 'completed';

      const updateData: any = {
        ...(equipmentId !== undefined && { equipmentId: equipmentId as string }),
        ...(type !== undefined && { type: type as string }),
        ...(priority !== undefined && { priority: priority as string }),
        ...(description !== undefined && { description: description as string }),
        ...(assignedTo !== undefined && { assignedTo: assignedTo as string | null }),
        ...(scheduledDate !== undefined && { scheduledDate: scheduledDate ? new Date(scheduledDate as string) : null }),
        ...(completedAt !== undefined && { completedAt: completedAt ? new Date(completedAt as string) : null }),
        ...(labourHours !== undefined && { labourHours: parseFloat(labourHours as string) }),
        ...(labourCost !== undefined && { labourCost: parseFloat(labourCost as string) }),
        ...(partsCost !== undefined && { partsCost: parseFloat(partsCost as string) }),
        ...(totalCost !== undefined && { totalCost: parseFloat(totalCost as string) }),
        ...(status !== undefined && { status: status as string }),
        ...(failureMode !== undefined && { failureMode: failureMode as string | null }),
        ...(downtimeHours !== undefined && { downtimeHours: parseFloat(downtimeHours as string) }),
        ...(notes !== undefined && { notes: notes as string | null }),
      };

      if (parts && parts.length > 0) {
        updateData.partsCost = totalPartsCost;
        updateData.parts = { create: lineData };
      }

      const item = await tx.erpWorkOrder.update({
        where: { id: id },
        data: updateData,
        include: { parts: true },
      });

      if (isCompleting) {
        // Deduct inventory for parts consumed
        const dcWarehouse = await tx.erpWarehouse.findFirst({
          where: { OR: [{ code: 'DC' }, { name: { contains: 'DC Warehouse' } }] }
        });

        if (!dcWarehouse) throw new Error('DC Warehouse not found for part deduction.');

        const partsToDeduct = parts && parts.length > 0 ? lineData : existing.parts;
        let totalExpense = 0;

        for (const part of partsToDeduct) {
          const qty = Number(part.quantity);
          if (qty <= 0) continue;

          // Deduct from DC warehouse
          const stock = await tx.erpWarehouseStock.findFirst({
            where: { warehouseId: dcWarehouse.id, productId: part.productId }
          });
          
          if (!stock || Number(stock.quantity) < qty) {
            throw new Error(`Insufficient stock in DC Warehouse for part ${part.productName}`);
          }

          await tx.erpWarehouseStock.update({
            where: { id: stock.id },
            data: { quantity: { decrement: qty } }
          });

          // Stock movement
          const { getNextSequence } = await import('@/lib/api');
          const movementNo = await getNextSequence(tx as any, 'erpStockMovement', 'movementNo', 'MOV');
          await tx.erpStockMovement.create({
            data: {
              movementNo,
              type: 'out',
              productId: part.productId,
              productName: part.productName,
              quantity: qty,
              fromWarehouseId: dcWarehouse.id,
              referenceType: 'work_order',
              referenceId: id,
              notes: `Consumed for Work Order ${existing.woNumber}`,
              userId: userEmail,
            }
          });

          totalExpense += Number(part.totalCost);
        }

        // Post Journal Entry for expense
        if (totalExpense > 0) {
          const { getNextSequence } = await import('@/lib/api');
          const entryNumber = await getNextSequence(tx as any, 'erpJournalEntry', 'entryNumber', 'JNL');
          
          // Try to find accounts
          const invAccount = await tx.erpChartOfAccounts.findFirst({ where: { name: { contains: 'Inventory' }, type: 'Asset' } });
          const expAccount = await tx.erpChartOfAccounts.findFirst({ where: { name: { contains: 'Maintenance' }, type: 'Expense' } });

          if (invAccount && expAccount) {
            await tx.erpJournalEntry.create({
              data: {
                entryNumber,
                description: `Parts consumption for Work Order ${existing.woNumber}`,
                entryDate: new Date(),
                period: new Date().toISOString().slice(0, 7),
                status: 'posted',
                postedAt: new Date(),
                postedBy: userEmail,
                lines: {
                  create: [
                    { accountId: expAccount.id, description: 'Maintenance Expense', debit: totalExpense, credit: 0 },
                    { accountId: invAccount.id, description: 'Inventory Deduction', debit: 0, credit: totalExpense }
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
    return badRequest(err.message || 'Failed to update work order');
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const existing = await prisma.erpWorkOrder.findUnique({ where: { id: id } });
  if (!existing) return notFound('Work order not found');

  await prisma.erpWorkOrder.delete({ where: { id: id } });
  return ok({ success: true });
}
