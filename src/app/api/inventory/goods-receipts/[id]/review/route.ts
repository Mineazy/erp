import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, badRequest, ok, getNextSequence } from '@/lib/api';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getSession();
  if (!session || !session.user) return unauthorized();

  const body = await request.json();
  const { status, comments, signature } = body;

  if (!['Approved', 'Rejected'].includes(status)) {
    return badRequest('Invalid status. Must be Approved or Rejected');
  }

  const receipt = await prisma.erpGoodsReceipt.findUnique({
    where: { id },
    include: { lines: true }
  });

  if (!receipt) return notFound('Goods receipt not found');
  if (receipt.status === 'Approved') return badRequest('Already approved');

  // Perform updates in a transaction if approved
  if (status === 'Approved') {
    await prisma.$transaction(async (tx) => {
      // 1. Update receipt status
      await tx.erpGoodsReceipt.update({
        where: { id },
        data: {
          status: 'Approved',
          notes: comments || receipt.notes,
          reviewedBy: session.user!.name,
          reviewerSignature: signature || null,
          approvedAt: new Date()
        }
      });

      // 2. Update inventory and log stock movements
      for (const line of receipt.lines) {
        const acceptedQty = Number(line.acceptedQty);
        if (acceptedQty > 0) {
          // Update global product stock
          await tx.erpProduct.update({
            where: { id: line.productId },
            data: { stock: { increment: acceptedQty } }
          });

          // Create stock movement
          const movementNo = await getNextSequence(tx as any, 'erpStockMovement', 'movementNo', 'SMV');
          await tx.erpStockMovement.create({
            data: {
              movementNo,
              type: 'IN',
              productId: line.productId,
              productName: line.productName,
              quantity: acceptedQty,
              referenceType: 'Goods Receipt',
              referenceId: receipt.receiptNo,
              notes: 'From Goods Receipt Approval',
              userId: (session.user as any).id || session.user!.name || 'system',
              branchId: receipt.branchId
            }
          });
        }
      }
    });
  } else {
    // Just update the status to Rejected
    await prisma.erpGoodsReceipt.update({
      where: { id },
      data: {
        status: 'Rejected',
        notes: comments || receipt.notes,
        reviewedBy: session.user!.name,
        reviewerSignature: signature || null,
      }
    });
  }

  return ok({ success: true, message: `Goods receipt ${status}` });
}
