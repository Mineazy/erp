import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, badRequest, ok, created, getNextSequence } from '@/lib/api';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'receipts');

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status');

  const where: any = {};
  if (search) {
    where.OR = [
      { receiptNo: { contains: search } },
      { insightPoNumber: { contains: search } },
      { supplierName: { contains: search } },
    ];
  }
  if (status) where.status = status;

  const items = await prisma.erpGoodsReceipt.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      lines: true,
    },
  });

  return ok(items);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || !session.user) return unauthorized();

  let body: any;
  let files: File[] = [];

  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    body = JSON.parse((formData.get('payload') as string) || '{}');
    // Get all files attached
    Array.from(formData.entries()).forEach(([key, value]) => {
      if (value instanceof File) {
        files.push(value);
      }
    });
  } else {
    body = await request.json();
  }

  const { 
    insightPoNumber, supplierId, supplierName, deliveryNoteNumber, invoiceNumber,
    receivedAt, notes, lines, capturedBy 
  } = body;

  if (!lines || !Array.isArray(lines) || lines.length === 0) {
    return badRequest('At least one line item is required');
  }

  if (!insightPoNumber) return badRequest('Insight PO Number is required');
  if (!deliveryNoteNumber) return badRequest('Delivery Note Number is required');

  const receiptNo = await getNextSequence(prisma, 'erpGoodsReceipt', 'receiptNo', 'GRV');

  // Handle file uploads
  const attachments = [];
  if (files.length > 0) {
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }
    for (const file of files) {
      const ext = path.extname(file.name) || '';
      const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
      const filePath = path.join(UPLOAD_DIR, safeName);
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(filePath, buffer);
      
      attachments.push({
        name: file.name,
        type: file.type,
        size: file.size,
        url: `/uploads/receipts/${safeName}`
      });
    }
  }

  const receipt = await prisma.erpGoodsReceipt.create({
    data: {
      receiptNo,
      insightPoNumber,
      supplierId: supplierId || null,
      supplierName: supplierName || 'Unknown Supplier',
      deliveryNoteNumber,
      invoiceNumber: invoiceNumber || null,
      receivedAt: receivedAt ? new Date(receivedAt as string) : new Date(),
      notes: notes || null,
      capturedBy: capturedBy || session.user!.name,
      status: 'Pending Review',
      branchId: (session.user as any)?.branchId || null,
      attachments: attachments.length > 0 ? JSON.stringify(attachments) : undefined,
      lines: {
        create: lines.map((line: any) => ({
          productId: line.productId,
          productName: line.productName,
          orderedQty: parseFloat(line.orderedQty) || 0,
          quantity: parseFloat(line.quantity) || 0,
          damagedQty: parseFloat(line.damagedQty) || 0,
          acceptedQty: parseFloat(line.acceptedQty) || 0,
          remarks: line.remarks || null,
          batchNo: line.batchNo || null,
          serialNo: line.serialNo || null,
          location: line.location || null,
        })),
      },
    },
    include: { lines: true },
  });

  return created(receipt);
}
