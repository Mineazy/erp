import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return Response.json({ error: 'Email and password required' }, { status: 400 });
    }

    const user = await prisma.erpUser.findUnique({
      where: { email },
      select: { id: true, password: true, role: true, isActive: true, branchId: true },
    });

    if (!user || !user.isActive) {
      return Response.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return Response.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const canChooseBranch = user.role === 'admin' || user.role === 'manager';

    return Response.json({
      role: user.role,
      branchId: user.branchId,
      canChooseBranch,
    });
  } catch (error: any) {
    console.error('[Pre-check] Error:', error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
