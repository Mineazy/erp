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
      if (folderId === 'shared-documents') {
        // Force it to only return shared documents for this user
        whereClause.shares = { some: { userId: user.id } };
        
        // Mark shares as viewed
        await prisma.erpDocumentShare.updateMany({
          where: { userId: user.id, isViewed: false },
          data: { isViewed: true }
        });
      } else {
        whereClause.folderId = folderId;
      }
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

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasAccess = checkApiAccess(
      '/api/documents',
      'DELETE',
      user.role,
      user.department,
      user.permissions
    );

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    const { documentIds } = await request.json();
    if (!documentIds || !Array.isArray(documentIds)) {
      return NextResponse.json({ error: 'Invalid document IDs' }, { status: 400 });
    }

    if (action === 'unshare') {
      const result = await prisma.erpDocumentShare.deleteMany({
        where: {
          documentId: { in: documentIds },
          userId: user.id
        }
      });
      return NextResponse.json({ success: true, deletedCount: result.count });
    }

    // Fetch documents to verify ownership and get fileUrls
    const documents = await prisma.erpDocument.findMany({
      where: {
        id: { in: documentIds }
      }
    });

    const authorizedIds: string[] = [];
    const fs = await import('fs/promises');
    const path = await import('path');

    for (const doc of documents) {
      // Only admin, manager, or the uploader can delete
      if (user.role === 'admin' || user.role === 'manager' || doc.uploadedBy === user.id) {
        authorizedIds.push(doc.id);
        
        // Delete the physical file
        if (doc.fileUrl) {
          try {
            const relativeUrl = doc.fileUrl.startsWith('/') ? doc.fileUrl.slice(1) : doc.fileUrl;
            // The file is stored in uploads/documents/YYYY/MM
            const filePath = path.join(process.cwd(), relativeUrl.replace(/\//g, path.sep));
            await fs.unlink(filePath);
          } catch (err) {
            console.error(`Failed to delete physical file for doc ${doc.id}:`, err);
          }
        }
      }
    }

    if (authorizedIds.length === 0) {
      return NextResponse.json({ error: 'You do not have permission to delete these documents' }, { status: 403 });
    }

    await prisma.erpDocument.deleteMany({
      where: { id: { in: authorizedIds } }
    });

    return NextResponse.json({ success: true, deletedCount: authorizedIds.length });
  } catch (error) {
    console.error('Failed to delete documents:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
