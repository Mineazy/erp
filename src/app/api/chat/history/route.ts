import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch the most recent chat session for this user
    let chatSession = await prisma.erpAiChatSession.findFirst({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!chatSession) {
      // Create a new session if none exists
      chatSession = await prisma.erpAiChatSession.create({
        data: {
          userId: user.id,
          title: 'New Conversation',
        },
        include: {
          messages: true
        }
      });
    }

    // Format messages for Vercel AI SDK
    const formattedMessages = chatSession.messages.map(msg => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      createdAt: msg.createdAt,
    }));

    return NextResponse.json({
      sessionId: chatSession.id,
      messages: formattedMessages
    });
  } catch (error) {
    console.error('Failed to fetch chat history:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
