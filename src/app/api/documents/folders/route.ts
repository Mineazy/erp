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
    const parentId = searchParams.get('parentId');
    
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

    const folders = await prisma.erpDocumentFolder.findMany({
      where: {
        parentId: parentId || null,
      },
      include: {
        _count: {
          select: { documents: true, children: true }
        }
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(folders);
  } catch (error) {
    console.error('Failed to fetch folders:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasAccess = checkApiAccess(
      '/api/documents',
      'POST',
      user.role,
      user.department,
      user.permissions
    );

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const json = await request.json();
    const { name, description, parentId } = json;

    if (!name) {
      return NextResponse.json({ error: 'Folder name is required' }, { status: 400 });
    }

    const folder = await prisma.erpDocumentFolder.create({
      data: {
        name,
        description,
        parentId: parentId || null,
        department: user.department || null,
      },
    });

    return NextResponse.json(folder);
  } catch (error) {
    console.error('Failed to create folder:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
