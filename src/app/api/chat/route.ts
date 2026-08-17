import { google } from '@ai-sdk/google';
import { streamText, tool } from 'ai';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAiTools } from '@/lib/ai-tools';
import { prisma } from '@/lib/prisma';

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { messages, sessionId } = await req.json();
    const userRole = (session.user as any).role || 'user';

    // Save user message to database
    const latestMessage = messages[messages.length - 1];
    if (sessionId && latestMessage && latestMessage.role === 'user') {
      try {
        await prisma.erpAiChatMessage.create({
          data: {
            sessionId,
            role: 'user',
            content: latestMessage.content
          }
        });
        
        await prisma.erpAiChatSession.update({
          where: { id: sessionId },
          data: { updatedAt: new Date() }
        });
      } catch (dbError) {
        console.error('Failed to save user message:', dbError);
      }
    }

    const systemPrompt = `You are Ezzie, the AI Assistant for the Mineazy ERP system.
You provide insights, analysis, and answers based on live system data.
The current user interacting with you has the role of: "${userRole}".
You must tailor your responses and analysis to fit the responsibilities and permissions of a ${userRole}.
Do not share sensitive financial data if the user's role is not "admin" or "accountant".
When queried for information, always attempt to use the available tools to fetch live data from the system rather than guessing.`;

    const result = await streamText({
      model: google('gemini-1.5-pro'),
      system: systemPrompt,
      messages,
      tools: getAiTools(userRole),
      onFinish: async ({ text, toolCalls }) => {
        if (sessionId) {
          try {
            let contentToSave = text;
            
            // If there's no direct text but there are tool calls, represent them in content
            if (!contentToSave && toolCalls && toolCalls.length > 0) {
              contentToSave = `[Tool Call] ${toolCalls.map(tc => tc.toolName).join(', ')}`;
            }
            
            if (contentToSave) {
              await prisma.erpAiChatMessage.create({
                data: {
                  sessionId,
                  role: 'assistant',
                  content: contentToSave
                }
              });
            }
          } catch (dbError) {
            console.error('Failed to save assistant message:', dbError);
          }
        }
      }
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('AI Chat Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
