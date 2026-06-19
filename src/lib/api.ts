import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth';

export async function getSession() {
  return getServerSession(authOptions);
}

export function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export function notFound(message = 'Not found') {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function forbidden(message = 'Forbidden') {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function ok<T>(data: T) {
  return NextResponse.json(data);
}

export function created<T>(data: T) {
  return NextResponse.json(data, { status: 201 });
}

export async function getBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const text = await request.text();
    if (!text) return {};
    return JSON.parse(text);
  } catch {
    return {};
  }
}

export function generateCode(prefix: string, num: number): string {
  return `${prefix}-${String(num).padStart(3, '0')}`;
}

export async function getNextSequence(prisma: any, model: string, field: string, prefix: string): Promise<string> {
  const last = await prisma[model].findFirst({
    orderBy: { createdAt: 'desc' },
    select: { [field]: true },
  });
  let num = 1;
  if (last) {
    const match = last[field].match(/-(\d+)$/);
    if (match) num = parseInt(match[1]) + 1;
  }
  return generateCode(prefix, num);
}

export interface ApiListParams {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export function parseListParams(searchParams: URLSearchParams): ApiListParams {
  return {
    search: searchParams.get('search') || undefined,
    status: searchParams.get('status') || undefined,
    page: parseInt(searchParams.get('page') || '1', 10),
    limit: parseInt(searchParams.get('limit') || '50', 10),
    sort: searchParams.get('sort') || undefined,
    order: (searchParams.get('order') as 'asc' | 'desc') || undefined,
  };
}

export function getBranchFilter(session: any): { branchId?: string } | undefined {
  if (!session?.user) return undefined;
  const u = session.user as any;
  if (u.role === 'admin') return undefined;
  return u.branchId ? { branchId: u.branchId } : undefined;
}
