import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, badRequest, ok, getBody } from '@/lib/api';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await getBody(request);
  const { currentPassword, newPassword } = body;

  if (!currentPassword || !newPassword) {
    return badRequest('Current password and new password are required');
  }

  if ((newPassword as string).length < 6) {
    return badRequest('New password must be at least 6 characters');
  }

  const user = await prisma.erpUser.findUnique({
    where: { id: (session.user as { id: string }).id },
  });

  if (!user) return badRequest('User not found');

  const isValid = await bcrypt.compare(currentPassword as string, user.password);
  if (!isValid) return badRequest('Current password is incorrect');

  const hashed = await bcrypt.hash(newPassword as string, 12);
  await prisma.erpUser.update({
    where: { id: user.id },
    data: { password: hashed },
  });

  return ok({ success: true });
}
