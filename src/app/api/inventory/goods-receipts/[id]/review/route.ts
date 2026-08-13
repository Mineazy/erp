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

      // 2. Update inventory and log stock movements, and calculate total cost
      let totalCost = 0;
      let supplierId = receipt.supplierId;
      let supplierName = receipt.supplierName;

      for (const line of receipt.lines) {
        const acceptedQty = Number(line.acceptedQty);
        if (acceptedQty > 0) {
          // Update branch stock
          if (receipt.branchId) {
            await tx.erpBranchStock.upsert({
              where: { branchId_productId: { branchId: receipt.branchId, productId: line.productId } },
              create: { branchId: receipt.branchId, productId: line.productId, quantity: acceptedQty },
              update: { quantity: { increment: acceptedQty } }
            });
          }

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
          
          // Determine cost
          let unitCost = 0;
          if (receipt.insightPoNumber) {
            const po = await tx.erpPurchaseOrder.findFirst({
              where: { poNumber: receipt.insightPoNumber },
              include: { lines: true }
            });
            if (po) {
              if (!supplierId) supplierId = po.supplierId;
              if (!supplierName) supplierName = po.supplierName;
              const poLine = po.lines.find(l => l.productId === line.productId);
              if (poLine) {
                unitCost = Number(poLine.unitPrice);
              }
            }
          }
          
          if (unitCost === 0) {
            const product = await tx.erpProduct.findUnique({ where: { id: line.productId } });
            if (product && product.costPrice) {
              unitCost = Number(product.costPrice);
            }
          }
          totalCost += unitCost * acceptedQty;
        }
      }

      // 3. Financial Integration (AP Bill and GL Journal)
      if (totalCost > 0) {
        try {
          const { ensureDefaultAccounts } = await import('@/lib/financial');
          const defaultAccounts = await ensureDefaultAccounts(tx as any);
          
          const fallbackSupplierName = supplierName || 'Unknown Supplier';
          const finalSupplierId = supplierId || `SUP-${fallbackSupplierName.replace(/[^a-zA-Z0-9]/g, '-').toUpperCase().replace(/-+/g, '-').replace(/^-|-$/g, '')}`;

          // Create AP Bill
          const billNumber = await getNextSequence(tx as any, 'erpAccountPayable', 'billNumber', 'BILL');
          await tx.erpAccountPayable.create({
            data: {
              billNumber,
              supplierId: finalSupplierId,
              supplierName: fallbackSupplierName,
              billDate: new Date(),
              dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 days default
              amount: totalCost,
              balance: totalCost,
              currency: 'USD',
              description: `Goods Receipt ${receipt.receiptNo}`,
              branchId: receipt.branchId,
            }
          });

          // Create Journal Entry
          const entryNumber = await getNextSequence(tx as any, 'erpJournalEntry', 'entryNumber', 'JNL');
          await tx.erpJournalEntry.create({
            data: {
              entryNumber,
              description: `Inventory Received from GR ${receipt.receiptNo}`,
              entryDate: new Date(),
              period: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
              status: 'posted',
              branchId: receipt.branchId,
              lines: {
                create: [
                  { accountId: defaultAccounts['Inventory Asset'], debit: totalCost, credit: 0 },
                  { accountId: defaultAccounts['Accounts Payable'], debit: 0, credit: totalCost },
                ]
              }
            }
          });
        } catch (finErr) {
          console.error('Financial integration failed for GR:', finErr);
          // throw finErr; // Uncomment if we want financial errors to block GR approval
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
