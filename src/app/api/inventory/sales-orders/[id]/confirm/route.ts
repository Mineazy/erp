import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, badRequest, ok, getNextSequence } from '@/lib/api';

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const order = await prisma.erpSalesOrder.findUnique({
    where: { id },
    include: { lines: true },
  });
  if (!order) return notFound('Sales order not found');

  if (!order.branchId) return badRequest('Sales order has no branch assigned');
  if (order.status !== 'draft') return badRequest('Only draft orders can be confirmed');

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Check stock
      for (const line of order.lines) {
        const branchStock = await tx.erpBranchStock.findUnique({
          where: { branchId_productId: { branchId: order.branchId as string, productId: line.productId } }
        });
        if (!branchStock || Number(branchStock.quantity) < Number(line.quantity)) {
          throw new Error(`Insufficient stock for ${line.productName}`);
        }
      }

      // 2. Deduct stock & create movements
      for (const line of order.lines) {
        await tx.erpBranchStock.update({
          where: { branchId_productId: { branchId: order.branchId as string, productId: line.productId } },
          data: { quantity: { decrement: line.quantity } },
        });
        
        const movementNo = await getNextSequence(tx as any, 'erpStockMovement', 'movementNo', 'MOV');
        await tx.erpStockMovement.create({
          data: {
            movementNo,
            type: 'out',
            productId: line.productId,
            productName: line.productName,
            quantity: line.quantity,
            referenceType: 'sales_order',
            referenceId: id,
            userId: (session.user as any).email || 'unknown',
            branchId: order.branchId,
          },
        });
      }

      // 3. Create AR Invoice
      const invoiceNumber = await getNextSequence(tx as any, 'erpAccountReceivable', 'invoiceNumber', 'INV');
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30); // Net 30 default

      const ar = await tx.erpAccountReceivable.create({
        data: {
          invoiceNumber,
          customerId: order.customerId,
          customerName: order.customerName,
          invoiceDate: new Date(),
          dueDate,
          amount: order.total,
          balance: order.total,
          currency: order.currency,
          description: `Auto-generated from Sales Order ${order.orderNumber}`,
          branchId: order.branchId,
          status: 'pending',
        }
      });

      // 4. Update Sales Order
      const updated = await tx.erpSalesOrder.update({
        where: { id },
        data: { status: 'confirmed' },
      });

      return { updated, invoiceNumber: ar.invoiceNumber };
    });

    return ok(result.updated);
  } catch (error: any) {
    return badRequest(error.message || 'Failed to confirm sales order');
  }
}
