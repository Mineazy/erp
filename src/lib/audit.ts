import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';

export async function logAudit({
  userId,
  userName,
  action,
  entityType,
  entityId,
  changes = {},
  ipAddress,
  userAgent,
}: {
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityId: string;
  changes?: any;
  ipAddress?: string;
  userAgent?: string;
}) {
  try {
    let resolvedIp = ipAddress;
    let resolvedUserAgent = userAgent;

    try {
      const headersList = await headers();
      resolvedIp = resolvedIp || headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || '127.0.0.1';
      resolvedUserAgent = resolvedUserAgent || headersList.get('user-agent') || 'Unknown';
    } catch {
      resolvedIp = resolvedIp || '127.0.0.1';
      resolvedUserAgent = resolvedUserAgent || 'System';
    }

    // Split in case of comma-separated reverse proxy IPs
    const cleanIp = resolvedIp ? resolvedIp.split(',')[0].trim() : '127.0.0.1';

    await prisma.auditLog.create({
      data: {
        entityType,
        entityId,
        action,
        userId,
        userName,
        changes: changes || {},
        ipAddress: cleanIp,
        userAgent: resolvedUserAgent,
      },
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}
