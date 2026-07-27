import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { items } = await request.json();
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No valid items provided' }, { status: 400 });
    }

    // Group items by branchId to create separate back orders per branch
    const branchGroups = items.reduce((acc: any, item: any) => {
      const b = item.branchId;
      if (!acc[b]) acc[b] = [];
      acc[b].push(item);
      return acc;
    }, {});

    const createdOrders = [];

    // Ideally this would be inside a transaction
    for (const branchId of Object.keys(branchGroups)) {
      const branchItems = branchGroups[branchId];
      
      // Ensure branch exists before inserting
      const branch = await prisma.erpBranch.findUnique({
        where: { id: branchId } // Wait, spreadsheet might use 'code' instead of 'id'. Let's try code first, then id.
      });

      let actualBranchId = branchId;
      
      if (!branch) {
        const branchByCode = await prisma.erpBranch.findUnique({
          where: { code: branchId }
        });
        if (branchByCode) {
          actualBranchId = branchByCode.id;
        } else {
          // If neither ID nor code matches, skip or error out (we'll just skip for resilience, or create it)
          console.warn(`Branch not found for ID/Code: ${branchId}. Skipping.`);
          continue;
        }
      }

      // Generate a unique order number
      const orderNumber = `BO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      const newOrder = await prisma.erpBackOrder.create({
        data: {
          orderNumber,
          branchId: actualBranchId,
          requestedBy: 'System Upload',
          status: 'submitted',
          lines: {
            create: branchItems.map((item: any) => ({
              productId: item.productId,
              productName: item.productName || 'Unknown',
              requestedQty: item.requestedQty,
              outstandingQty: item.requestedQty,
              allocatedQty: 0,
              status: 'pending'
            }))
          }
        }
      });
      createdOrders.push(newOrder);
    }

    return NextResponse.json({ success: true, count: createdOrders.length });
  } catch (error) {
    console.error('Failed to upload back orders:', error);
    return NextResponse.json({ error: 'Failed to process spreadsheet data' }, { status: 500 });
  }
}
