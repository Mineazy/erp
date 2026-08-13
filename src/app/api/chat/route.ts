import { google } from '@ai-sdk/google';
import { streamText, tool } from 'ai';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAiTools } from '@/lib/ai-tools';

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { messages } = await req.json();
    const userRole = (session.user as any).role || 'user';

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
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('AI Chat Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
