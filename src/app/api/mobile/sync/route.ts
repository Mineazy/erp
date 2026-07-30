import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, badRequest } from '@/lib/api';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { deviceId, users, orders } = body;

    if (!deviceId) {
      return badRequest('Device ID is required');
    }

    if (!orders || !Array.isArray(orders)) {
      return ok({ synced: 0 });
    }

    let syncedCount = 0;

    for (const order of orders) {
      // Check if order already exists to prevent duplicates
      const existing = await prisma.erpSalesOrder.findUnique({
        where: { orderNumber: order.orderNumber },
      });

      if (existing) {
        continue;
      }

      // Create new sales order
      await prisma.erpSalesOrder.create({
        data: {
          orderNumber: order.orderNumber,
          customerId: order.customerId || 'walk-in',
          customerName: order.customerName || 'Walk-In Customer',
          orderDate: new Date(order.createdAt || Date.now()),
          status: 'mobile_pending', // Special status to be picked up by POS
          subtotal: parseFloat(order.subtotal || '0'),
          taxAmount: parseFloat(order.tax || '0'),
          total: parseFloat(order.grandTotal || '0'),
          notes: `Created from Mobile POS (Device: ${deviceId}, User: ${order.salesRepName || 'Unknown'})`,
          lines: {
            create: order.items.map((item: any) => ({
              productId: item.productId || 'UNKNOWN',
              productName: item.name || 'Unknown Item',
              quantity: parseFloat(item.qty || '1'),
              unitPrice: parseFloat(item.unitPrice || '0'),
              total: parseFloat(item.qty || '1') * parseFloat(item.unitPrice || '0'),
            })),
          },
        },
      });
      
      syncedCount++;
    }

    return ok({ synced: syncedCount, success: true });
  } catch (error: any) {
    console.error('Mobile Sync Error:', error);
    return badRequest(error.message || 'Failed to sync');
  }
}
