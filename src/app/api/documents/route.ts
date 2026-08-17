import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkApiAccess } from '@/lib/authz';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get('folderId');
    const search = searchParams.get('search');
    
    const hasAccess = checkApiAccess(
      '/api/documents',
      'GET',
      user.role,
      user.department,
      user.permissions
    );

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let whereClause: any = {};
    if (folderId) {
      whereClause.folderId = folderId;
    } else if (!search) {
      whereClause.folderId = null; // Only show root documents if no folder and no search
    }

    if (search) {
      whereClause.title = { contains: search };
    }

    // Regular users shouldn't see restricted documents unless they uploaded it or are admin/manager
    if (user.role === 'user') {
      whereClause.OR = [
        { isRestricted: false },
        { uploadedBy: user.id }
      ];
    }

    const documents = await prisma.erpDocument.findMany({
      where: whereClause,
      include: {
        folder: true
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(documents);
  } catch (error) {
    console.error('Failed to fetch documents:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
