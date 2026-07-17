import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, ok } from '@/lib/api';

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  const userId = (session.user as any).id;

  const chats = await prisma.erpChatParticipant.findMany({
    where: { userId },
    select: {
      chatId: true,
      lastReadAt: true,
    },
  });

  let totalUnread = 0;

  for (const participant of chats) {
    const where: any = { chatId: participant.chatId };
    if (participant.lastReadAt) {
      where.createdAt = { gt: participant.lastReadAt };
    }

    const senderParticipant = await prisma.erpChatParticipant.findFirst({
      where: { chatId: participant.chatId, userId },
    });

    if (!senderParticipant) continue;

    const count = await prisma.erpChatMessage.count({
      where: {
        chatId: participant.chatId,
        senderId: { not: userId },
        ...(participant.lastReadAt
          ? { createdAt: { gt: participant.lastReadAt } }
          : {}),
      },
    });
    totalUnread += count;
  }

  return ok({ totalUnread });
}
