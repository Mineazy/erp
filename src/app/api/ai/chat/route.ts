import { openai } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

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
      model: openai('gpt-4o') as any,
      system: systemPrompt,
      messages,
      tools: {
        getInventoryStatus: tool({
          description: 'Get the current inventory status, including low stock products, total value, and product counts.',
          parameters: z.object({ dummy: z.string().optional() }),
          execute: async ({ dummy }: any) => {
            const products = await prisma.erpProduct.findMany({
              where: { isActive: true },
              select: { name: true, stock: true, minStock: true, sellingPrice: true }
            });
            
            const lowStock = products.filter(p => p.stock <= (p.minStock || 0));
            const totalValue = products.reduce((sum, p) => sum + (Number(p.stock) * Number(p.sellingPrice)), 0);
            
            return {
              totalActiveProducts: products.length,
              lowStockCount: lowStock.length,
              lowStockItems: lowStock.map(p => p.name),
              estimatedTotalValue: totalValue
            };
          },
        } as any),
        getRecentSales: tool({
          description: 'Get a summary of recent POS transactions.',
          parameters: z.object({
            limit: z.number().optional().describe('Number of recent transactions to fetch (default: 5)')
          }),
          execute: async ({ limit }: any) => {
            const limitNum = limit || 5;
            const transactions = await prisma.erpPosTransaction.findMany({
              take: limitNum,
              orderBy: { createdAt: 'desc' },
              select: { id: true, transactionNumber: true, total: true, status: true, createdAt: true }
            });
            return transactions;
          },
        } as any),
        getFinancialSummary: tool({
          description: 'Get a summary of the financial status (Revenue and Expenses). Restricted to admins and accountants.',
          parameters: z.object({ dummy: z.string().optional() }),
          execute: async ({ dummy }: any) => {
            if (userRole !== 'admin' && userRole !== 'accountant') {
              return { error: 'Access Denied: Your role does not permit access to financial summaries.' };
            }
            // Just returning a simple mock or quick aggregation for now
            const journals = await prisma.erpJournalEntry.findMany({
              where: { status: 'POSTED' },
              take: 100
            });
            
            // Simplified summary
            return {
              totalPostedJournals: journals.length,
              message: 'Full financial aggregation would require deeper ledger queries, but there are ' + journals.length + ' posted journals.'
            };
          },
        } as any),
      },
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('AI Chat Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
