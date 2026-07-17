import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, badRequest, ok, created } from '@/lib/api';

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  const userId = (session.user as any).id;

  const participants = await prisma.erpChatParticipant.findMany({
    where: { userId },
    include: {
      chat: {
        include: {
          participants: {
            include: {
              user: {
                select: { id: true, name: true, email: true },
              },
            },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: {
              sender: {
                select: { id: true, name: true, email: true },
              },
            },
          },
        },
      },
    },
    orderBy: { chat: { updatedAt: 'desc' } },
  });

  const chats = await Promise.all(
    participants.map(async (p) => {
      const chat = p.chat;
      const unreadCount = await prisma.erpChatMessage.count({
        where: {
          chatId: chat.id,
          senderId: { not: userId },
          ...(p.lastReadAt ? { createdAt: { gt: p.lastReadAt } } : {}),
        },
      });

      return {
        id: chat.id,
        subject: chat.subject,
        createdAt: chat.createdAt.toISOString(),
        updatedAt: chat.updatedAt.toISOString(),
        participants: chat.participants.map((pp) => ({
          id: pp.id,
          chatId: pp.chatId,
          userId: pp.userId,
          joinedAt: pp.joinedAt.toISOString(),
          lastReadAt: pp.lastReadAt?.toISOString() ?? null,
          user: pp.user,
        })),
        lastMessage: chat.messages[0]
          ? {
              id: chat.messages[0].id,
              chatId: chat.messages[0].chatId,
              senderId: chat.messages[0].senderId,
              content: chat.messages[0].content,
              createdAt: chat.messages[0].createdAt.toISOString(),
              sender: chat.messages[0].sender,
            }
          : null,
        unreadCount,
      };
    }),
  );

  return ok(chats);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const userId = (session.user as any).id;
  const body = await request.json();
  const { participantIds, subject } = body;

  if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
    return badRequest('At least one participant is required');
  }

  const allParticipantIds = Array.from(new Set([...participantIds, userId]));

  const existingParticipants = await prisma.erpUser.findMany({
    where: { id: { in: allParticipantIds }, isActive: true },
    select: { id: true },
  });

  if (existingParticipants.length !== allParticipantIds.length) {
    return badRequest('One or more participants not found or inactive');
  }

  if (allParticipantIds.length === 1) {
    return badRequest('Cannot start a chat with yourself');
  }

  if (allParticipantIds.length === 2) {
    const existingChat = await prisma.erpChat.findFirst({
      where: {
        AND: [
          { participants: { some: { userId: allParticipantIds[0] } } },
          { participants: { some: { userId: allParticipantIds[1] } } },
        ],
      },
      include: {
        participants: true,
      },
    });

    if (existingChat && existingChat.participants.length === 2) {
      if (subject) {
        await prisma.erpChat.update({
          where: { id: existingChat.id },
          data: { subject },
        });
      }

      const chat = await prisma.erpChat.findUnique({
        where: { id: existingChat.id },
        include: {
          participants: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
      });

      if (!chat) return badRequest('Chat not found');

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
        lastMessage: null,
        unreadCount: 0,
      });
    }
  }

  const chat = await prisma.erpChat.create({
    data: {
      subject: subject || null,
      participants: {
        create: allParticipantIds.map((pid) => ({
          userId: pid,
        })),
      },
    },
    include: {
      participants: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  return created({
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
    lastMessage: null,
    unreadCount: 0,
  });
}
