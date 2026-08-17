import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { readFile, stat } from 'fs/promises';
import path from 'path';
import mime from 'mime-types';
import { existsSync } from 'fs';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ path: string[] }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    
    // We want to ensure only authenticated users can access ANY upload,
    // and if it's a restricted document, we enforce access control.
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await props.params;
    const filePathArray = params.path;
    
    if (!filePathArray || filePathArray.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Securely construct the path
    const safePath = path.join(process.cwd(), 'public', 'uploads', ...filePathArray);
    
    // Ensure the resolved path is actually inside the uploads directory
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!safePath.startsWith(uploadsDir)) {
       return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!existsSync(safePath)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Add document authorization check if it's a document
    if (filePathArray[0] === 'documents') {
      const fileUrl = `/uploads/${filePathArray.join('/')}`;
      const document = await prisma.erpDocument.findFirst({
        where: { fileUrl }
      });

      if (document && document.isRestricted && user.role !== 'admin' && document.uploadedBy !== user.id) {
         // Check if it's shared with them
         const share = await prisma.erpDocumentShare.findUnique({
           where: { documentId_userId: { documentId: document.id, userId: user.id } }
         });
         
         if (!share) {
            return NextResponse.json({ error: 'Forbidden: Document is restricted' }, { status: 403 });
         }
      }
    }

    const fileStat = await stat(safePath);
    const fileBuffer = await readFile(safePath);
    const contentType = mime.lookup(safePath) || 'application/octet-stream';

    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Content-Length', fileStat.size.toString());
    // Add caching headers
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');

    return new NextResponse(fileBuffer, {
      status: 200,
      headers
    });
    
  } catch (error) {
    console.error('File serving error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
