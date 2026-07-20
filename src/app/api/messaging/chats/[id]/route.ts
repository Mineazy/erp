import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, ok, badRequest } from '@/lib/api';

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

// POST - Add a member to the group
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const userId = (session.user as any).id;

  // Verify the requester is a participant of this chat
  const requester = await prisma.erpChatParticipant.findUnique({
    where: { chatId_userId: { chatId: id, userId } },
  });
  if (!requester) return unauthorized();

  const body = await request.json();
  const { userId: targetUserId } = body;

  if (!targetUserId) return badRequest('Target User ID is required');

  // Verify target user exists
  const targetUser = await prisma.erpUser.findUnique({
    where: { id: targetUserId },
  });
  if (!targetUser) return notFound('User not found');

  // Check if already a participant
  const existing = await prisma.erpChatParticipant.findUnique({
    where: { chatId_userId: { chatId: id, userId: targetUserId } },
  });

  if (existing) {
    return badRequest('User is already in this chat');
  }

  // Add the participant
  await prisma.erpChatParticipant.create({
    data: {
      chatId: id,
      userId: targetUserId,
    },
  });

  // Create a system notification message that user joined
  await prisma.erpChatMessage.create({
    data: {
      chatId: id,
      senderId: userId, // Sender is the inviter
      content: `added ${targetUser.name} to the group`,
    },
  });

  // Return updated list
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

  return ok({
    id: chat?.id,
    subject: chat?.subject,
    participants: chat?.participants.map((p) => ({
      id: p.id,
      chatId: p.chatId,
      userId: p.userId,
      joinedAt: p.joinedAt.toISOString(),
      lastReadAt: p.lastReadAt?.toISOString() ?? null,
      user: p.user,
    })),
  });
}

// DELETE - Leave the group or remove a member
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return unauthorized();

  const userId = (session.user as any).id;

  // Verify requester is participant
  const requester = await prisma.erpChatParticipant.findUnique({
    where: { chatId_userId: { chatId: id, userId } },
  });
  if (!requester) return unauthorized();

  const url = new URL(request.url);
  const targetUserId = url.searchParams.get('userId') || userId; // Default is self (leave)

  const participant = await prisma.erpChatParticipant.findUnique({
    where: { chatId_userId: { chatId: id, userId: targetUserId } },
    include: { user: true },
  });

  if (!participant) return notFound('Participant not found');

  // Perform delete
  await prisma.erpChatParticipant.delete({
    where: { chatId_userId: { chatId: id, userId: targetUserId } },
  });

  // System notification
  await prisma.erpChatMessage.create({
    data: {
      chatId: id,
      senderId: userId,
      content: targetUserId === userId ? 'left the group' : `removed ${participant.user.name} from the group`,
    },
  });

  // Check if any participants remain
  const remainingCount = await prisma.erpChatParticipant.count({
    where: { chatId: id },
  });

  if (remainingCount === 0) {
    // Delete chat entirely if empty
    await prisma.erpChat.delete({
      where: { id },
    });
  }

  return ok({ success: true, left: targetUserId === userId });
}
