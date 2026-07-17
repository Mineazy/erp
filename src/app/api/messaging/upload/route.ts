import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { getSession, unauthorized, badRequest } from '@/lib/api';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'chat');
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain', 'text/csv',
  'application/zip', 'application/x-rar-compressed',
  'application/json',
];

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) return badRequest('No file provided');

    if (file.size > MAX_FILE_SIZE) {
      return badRequest('File size exceeds 20 MB limit');
    }

    if (!ALLOWED_TYPES.includes(file.type) && !file.type.startsWith('image/')) {
      return badRequest('File type not supported');
    }

    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    const ext = path.extname(file.name) || '.bin';
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    const filePath = path.join(UPLOAD_DIR, safeName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    return NextResponse.json({
      name: file.name,
      url: `/uploads/chat/${safeName}`,
      size: file.size,
      type: file.type,
    });
  } catch {
    return badRequest('Upload failed');
  }
}
