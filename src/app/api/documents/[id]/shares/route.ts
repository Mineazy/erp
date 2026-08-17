import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const documentId = params.id;
    const document = await prisma.erpDocument.findUnique({ where: { id: documentId } });
    if (!document) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (document.uploadedBy !== user.id && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const shares = await prisma.erpDocumentShare.findMany({
      where: { documentId },
      include: {
        user: { select: { id: true, name: true, email: true, department: true } },
      }
    });

    return NextResponse.json(shares);
  } catch (error) {
    console.error('Failed to fetch document shares:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const documentId = params.id;
    const document = await prisma.erpDocument.findUnique({ where: { id: documentId } });
    if (!document) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (document.uploadedBy !== user.id && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { userIds } = body;
    if (!userIds || !Array.isArray(userIds)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const createdShares = [];
    for (const targetUserId of userIds) {
      const existing = await prisma.erpDocumentShare.findUnique({
        where: { documentId_userId: { documentId, userId: targetUserId } }
      });
      if (!existing) {
        const share = await prisma.erpDocumentShare.create({
          data: {
            documentId,
            userId: targetUserId,
            sharedBy: user.id
          },
          include: {
            user: { select: { id: true, name: true, email: true, department: true } }
          }
        });

        await logAudit({
          userId: user.id,
          userName: user.name || user.email,
          action: 'CREATE',
          entityType: 'DocumentShare',
          entityId: share.id,
          changes: { documentId, targetUserId }
        });

        createdShares.push(share);
      }
    }

    return NextResponse.json({ success: true, added: createdShares });
  } catch (error) {
    console.error('Failed to add document shares:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
