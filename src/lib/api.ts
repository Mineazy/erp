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

export function getBody(request: Request): Promise<Record<string, unknown>> {
  return request.json();
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
    page: parseInt(searchParams.get('page') || '1'),
    limit: parseInt(searchParams.get('limit') || '50'),
    sort: searchParams.get('sort') || 'createdAt',
    order: (searchParams.get('order') as 'asc' | 'desc') || 'desc',
  };
}
