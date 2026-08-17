import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string, userId: string }> }) {
  try {
    const params = await props.params;
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const documentId = params.id;
    const targetUserId = params.userId;

    const document = await prisma.erpDocument.findUnique({ where: { id: documentId } });
    if (!document) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (document.uploadedBy !== user.id && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.erpDocumentShare.deleteMany({
      where: {
        documentId,
        userId: targetUserId,
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete document share:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
