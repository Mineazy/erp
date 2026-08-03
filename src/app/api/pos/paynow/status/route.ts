import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const INTEGRATION_ID = process.env.PAYNOW_INTEGRATION_ID || '26025';
const INTEGRATION_KEY = process.env.PAYNOW_INTEGRATION_KEY || 'c5c6dc21-a1ff-4031-9b47-7329478c81c0';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { pollUrl } = body;

    if (!pollUrl) {
      return NextResponse.json({ error: 'Missing pollUrl' }, { status: 400 });
    }

    // @ts-ignore
    const { Paynow } = await import('paynow');
    
    const paynow = new Paynow(INTEGRATION_ID, INTEGRATION_KEY);
    
    // Use the SDK to poll the transaction status
    const status = await paynow.pollTransaction(pollUrl);
    
    return NextResponse.json({
      success: true,
      status: status.status, // e.g., 'Paid', 'Created', 'Sent', 'Cancelled'
      paynowReference: status.paynowreference,
      data: status,
    });
  } catch (error: any) {
    console.error('Paynow Status Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
