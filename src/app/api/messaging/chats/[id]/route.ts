import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, ok } from '@/lib/api';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const userId = (session.user as any).id;

  const participant = await prisma.erpChatParticipant.findUnique({
    where: { chatId_userId: { chatId: id, userId } },
  });

  if (!participant) return notFound('Chat not found');

  const chat = await prisma.erpChat.findUnique({
    where: { id },
    include: {
      participants: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  if (!chat) return notFound('Chat not found');

  return ok({
    id: chat.id,
    subject: chat.subject,
    createdAt: chat.createdAt.toISOString(),
    updatedAt: chat.updatedAt.toISOString(),
    participants: chat.participants.map((p) => ({
      id: p.id,
      chatId: p.chatId,
      userId: p.userId,
      joinedAt: p.joinedAt.toISOString(),
      lastReadAt: p.lastReadAt?.toISOString() ?? null,
      user: p.user,
    })),
  });
}
