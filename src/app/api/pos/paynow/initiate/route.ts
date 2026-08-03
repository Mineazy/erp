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
    const { amount, phone, method, invoiceNumber } = body;

    if (!amount || !phone || !method) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // method should be 'ecocash' or 'onemoney'
    const mobileMethod = method.toLowerCase();
    if (!['ecocash', 'onemoney'].includes(mobileMethod)) {
      return NextResponse.json({ error: 'Invalid mobile money method' }, { status: 400 });
    }

    // @ts-ignore
    const { Paynow } = await import('paynow');
    
    // We get origin from request to set valid URLs (though mobile express doesn't strictly redirect)
    const origin = req.headers.get('origin') || 'http://localhost:3000';
    
    const paynow = new Paynow(INTEGRATION_ID, INTEGRATION_KEY);
    paynow.resultUrl = `${origin}/api/pos/paynow/webhook`;
    paynow.returnUrl = `${origin}/pos`;

    const invoiceRef = invoiceNumber || `POS-${Date.now()}`;
    const payment = paynow.createPayment(invoiceRef, 'user@example.com'); // email is required by SDK but not strictly used for USSD
    payment.add('POS Transaction', parseFloat(amount));

    console.log(`Initiating Paynow Mobile Payment: ${mobileMethod} for ${phone} amount ${amount}`);

    const response = await paynow.sendMobile(payment, phone, mobileMethod);

    if (response.success) {
      return NextResponse.json({
        success: true,
        instructions: response.instructions,
        pollUrl: response.pollUrl,
        invoiceNumber: invoiceRef,
      });
    } else {
      return NextResponse.json({
        success: false,
        error: response.error || 'Failed to initiate Paynow transaction'
      }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Paynow Initiate Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
