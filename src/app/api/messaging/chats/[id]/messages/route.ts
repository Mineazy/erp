import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, notFound, badRequest, ok, created } from '@/lib/api';

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

  const messages = await prisma.erpChatMessage.findMany({
    where: { chatId: id },
    orderBy: { createdAt: 'asc' },
    include: {
      sender: { select: { id: true, name: true, email: true } },
    },
  });

  await prisma.erpChatParticipant.update({
    where: { chatId_userId: { chatId: id, userId } },
    data: { lastReadAt: new Date() },
  });

  return ok(
    messages.map((m) => ({
      id: m.id,
      chatId: m.chatId,
      senderId: m.senderId,
      content: m.content,
      attachments: m.attachments as any[] | null,
      createdAt: m.createdAt.toISOString(),
      sender: m.sender,
    })),
  );
}

export async function POST(
  request: NextRequest,
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

  const body = await request.json();
  const { content, attachments } = body;

  if ((!content || typeof content !== 'string' || !content.trim()) && (!attachments || !Array.isArray(attachments) || attachments.length === 0)) {
    return badRequest('Message content or attachment is required');
  }

  const message = await prisma.erpChatMessage.create({
    data: {
      chatId: id,
      senderId: userId,
      content: (content || '').trim(),
      attachments: attachments || undefined,
    },
    include: {
      sender: { select: { id: true, name: true, email: true } },
    },
  });

  await prisma.erpChat.update({
    where: { id },
    data: { updatedAt: new Date() },
  });

  await prisma.erpChatParticipant.update({
    where: { chatId_userId: { chatId: id, userId } },
    data: { lastReadAt: new Date() },
  });

  return created({
    id: message.id,
    chatId: message.chatId,
    senderId: message.senderId,
    content: message.content,
    attachments: message.attachments as any[] | null,
    createdAt: message.createdAt.toISOString(),
    sender: message.sender,
  });
}
