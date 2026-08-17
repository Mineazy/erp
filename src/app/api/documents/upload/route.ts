import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkApiAccess } from '@/lib/authz';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'documents');

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

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const folderId = formData.get('folderId') as string;
    const isRestricted = formData.get('isRestricted') === 'true';

    if (!file || !title) {
      return NextResponse.json({ error: 'File and title are required' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create year/month subdirectories for better organization
    const date = new Date();
    const yearMonth = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`;
    const targetDir = path.join(UPLOAD_DIR, yearMonth);

    if (!existsSync(targetDir)) {
      await mkdir(targetDir, { recursive: true });
    }

    // Generate unique filename
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const originalExt = path.extname(file.name);
    const safeName = `${uniqueSuffix}${originalExt}`;
    const filePath = path.join(targetDir, safeName);
    const fileUrl = `/uploads/documents/${yearMonth}/${safeName}`;

    await writeFile(filePath, buffer);

    const document = await prisma.erpDocument.create({
      data: {
        title,
        description: description || null,
        fileName: file.name,
        fileUrl,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        folderId: folderId || null,
        uploadedBy: user.id,
        uploaderName: user.name || 'Unknown',
        department: user.department || null,
        isRestricted,
      },
      include: {
        folder: true
      }
    });

    return NextResponse.json(document);
  } catch (error) {
    console.error('Failed to upload document:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
