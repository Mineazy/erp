import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkApiAccess } from '@/lib/authz';
import { logAudit } from '@/lib/audit';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

import { vectorStore } from '@/lib/vector-store';

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

    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size exceeds the 5MB limit' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const relativePath = formData.get('relativePath') as string;

    // Create year/month subdirectories for better organization
    const date = new Date();
    const yearMonth = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`;
    const targetDir = path.join(UPLOAD_DIR, yearMonth);

    if (!existsSync(targetDir)) {
      await mkdir(targetDir, { recursive: true });
    }

    // Handle virtual shared-documents folder bypass
    let resolvedFolderId = (folderId === 'shared-documents') ? null : (folderId || null);

    // If a relativePath is provided (e.g. from folder upload), create the necessary folders
    if (relativePath) {
      const parts = relativePath.split('/');
      // The last part is the file name itself, which we don't need for folder creation
      parts.pop(); 
      
      for (const part of parts) {
        if (!part) continue;
        // Check if folder exists
        let folder = await prisma.erpDocumentFolder.findFirst({
          where: { 
            name: part, 
            parentId: resolvedFolderId, 
            userId: user.id 
          }
        });
        
        if (!folder) {
          folder = await prisma.erpDocumentFolder.create({
            data: {
              name: part,
              parentId: resolvedFolderId,
              userId: user.id,
              department: user.department || null
            }
          });
        }
        resolvedFolderId = folder.id;
      }
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
        folderId: resolvedFolderId,
        uploadedBy: user.id,
        uploaderName: user.name || 'Unknown',
        department: user.department || null,
        isRestricted,
      },
      include: {
        folder: true
      }
    });

    // Extract text for RAG (non-blocking)
    try {
      if (file.type === 'application/pdf') {
        const pdfParse = require('pdf-parse');
        pdfParse(buffer).then((data: any) => {
          const text = data.text;
          if (text && text.trim().length > 0) {
            // Simple chunking strategy (1000 chars)
            const chunks = text.match(/[\s\S]{1,1000}/g) || [];
            vectorStore.addDocuments(document.id, chunks, { title: document.title, fileName: document.fileName }).catch(e => console.error('Vector store add error:', e));
          }
        }).catch((e: any) => console.error('Failed to parse PDF for vector store:', e));
      } else if (file.type === 'text/plain' || document.fileName.endsWith('.txt')) {
        const text = buffer.toString('utf-8');
        const chunks = text.match(/[\s\S]{1,1000}/g) || [];
        if (chunks.length > 0) {
          vectorStore.addDocuments(document.id, chunks, { title: document.title, fileName: document.fileName }).catch(e => console.error('Vector store add error:', e));
        }
      }
    } catch (parseError) {
      console.error('Vector store indexing initialization failed:', parseError);
    }

    await logAudit({
      userId: user.id,
      userName: user.name || user.email,
      action: 'CREATE',
      entityType: 'Document',
      entityId: document.id,
      changes: { fileName: document.fileName, title: document.title, size: document.size },
    });

    return NextResponse.json(document);
  } catch (error) {
    console.error('Failed to upload document:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
