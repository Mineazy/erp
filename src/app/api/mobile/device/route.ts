import { NextRequest, NextResponse } from 'next/server';
import { getSession, unauthorized } from '@/lib/api';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  // The mobile POS sends device registration pings here.
  // We just acknowledge it as there's no strict MobileDevice model requirement yet.
  return NextResponse.json({ success: true });
}
