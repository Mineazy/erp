import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, ok } from '@/lib/api';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> },
) {
  const { id, messageId } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const userId = (session.user as any).id;

  const participant = await prisma.erpChatParticipant.findUnique({
    where: { chatId_userId: { chatId: id, userId } },
  });

  if (!participant) return notFound('Chat not found');

  const message = await prisma.erpChatMessage.findUnique({
    where: { id: messageId },
  });

  if (!message || message.chatId !== id) {
    return notFound('Message not found');
  }

  await prisma.erpChatParticipant.update({
    where: { chatId_userId: { chatId: id, userId } },
    data: { lastReadAt: new Date() },
  });

  return ok({ success: true });
}
