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
    const type = searchParams.get('type');
    const sortBy = searchParams.get('sortBy') || 'date_desc';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    
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
    } else if (!search && !type) {
      whereClause.folderId = null; // Only show root documents if no folder, no search, no filter
    }

    if (search) {
      whereClause.title = { contains: search };
    }

    if (type) {
      if (type === 'image') whereClause.mimeType = { contains: 'image' };
      if (type === 'pdf') whereClause.mimeType = { contains: 'pdf' };
      if (type === 'spreadsheet') whereClause.mimeType = { contains: 'sheet' };
      if (type === 'archive') whereClause.mimeType = { contains: 'zip' };
    }

    if (user.role === 'user') {
      whereClause.OR = [
        { isRestricted: false },
        { uploadedBy: user.id },
        { shares: { some: { userId: user.id } } }
      ];
    }

    let orderByClause: any = { createdAt: 'desc' };
    if (sortBy === 'name_asc') orderByClause = { title: 'asc' };
    if (sortBy === 'name_desc') orderByClause = { title: 'desc' };
    if (sortBy === 'size_asc') orderByClause = { size: 'asc' };
    if (sortBy === 'size_desc') orderByClause = { size: 'desc' };
    if (sortBy === 'date_asc') orderByClause = { createdAt: 'asc' };
    if (sortBy === 'date_desc') orderByClause = { createdAt: 'desc' };

    const total = await prisma.erpDocument.count({ where: whereClause });
    const documents = await prisma.erpDocument.findMany({
      where: whereClause,
      include: {
        folder: true
      },
      orderBy: orderByClause,
      skip: (page - 1) * limit,
      take: limit,
    });

    return NextResponse.json({
      data: documents,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Failed to fetch documents:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
