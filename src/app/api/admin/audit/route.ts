import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, ok } from '@/lib/api';
import bcrypt from 'bcryptjs';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const branchId = searchParams.get('branchId');
  const department = searchParams.get('department');
  const role = searchParams.get('role');
  const moduleName = searchParams.get('module');
  const userId = searchParams.get('userId');
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');

  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  // 1. Seed logs if none exist to enable immediate demonstration of search/filter
  const logCount = await prisma.auditLog.count();
  if (logCount === 0) {
    let branch = await prisma.erpBranch.findFirst();
    if (!branch) {
      branch = await prisma.erpBranch.create({
        data: {
          code: 'HQ',
          name: 'Headquarters',
          isActive: true,
        },
      });
    }

    const hashedPassword = await bcrypt.hash('admin123', 12);
    const departments = ['Purchasing', 'Finance', 'Warehouse', 'Business', 'Admin'];

    // Ensure seed users exist so mappings succeed
    for (const dep of departments) {
      const email = `${dep.toLowerCase()}@mineazy.com`;
      const exists = await prisma.erpUser.findUnique({ where: { email } });
      if (!exists) {
        await prisma.erpUser.create({
          data: {
            email,
            password: hashedPassword,
            name: `${dep} Department User`,
            role: dep === 'Admin' ? 'admin' : 'user',
            department: dep,
            branchId: branch.id,
            isActive: true,
          },
        });
      }
    }

    const seedLogsData: any[] = [
      {
        userId: 'purchasing@mineazy.com',
        userName: 'Purchasing Department User',
        action: 'LOGIN',
        entityType: 'UserSession',
        entityId: 'session-1',
        changes: { status: 'SUCCESS' },
        createdAt: new Date(Date.now() - 3600000 * 2),
      },
      {
        userId: 'purchasing@mineazy.com',
        userName: 'Purchasing Department User',
        action: 'CREATE',
        entityType: 'PurchaseOrder',
        entityId: 'po-1002',
        changes: { supplier: 'ZimSteel Ltd', totalAmount: 15400 },
        createdAt: new Date(Date.now() - 3600000 * 1.8),
      },
      {
        userId: 'finance@mineazy.com',
        userName: 'Finance Department User',
        action: 'LOGIN',
        entityType: 'UserSession',
        entityId: 'session-2',
        changes: { status: 'SUCCESS' },
        createdAt: new Date(Date.now() - 3600000 * 4),
      },
      {
        userId: 'finance@mineazy.com',
        userName: 'Finance Department User',
        action: 'CREATE',
        entityType: 'JournalEntry',
        entityId: 'je-902',
        changes: { ref: 'JV-2026-004', amount: 24500 },
        createdAt: new Date(Date.now() - 3600000 * 3.5),
      },
      {
        userId: 'warehouse@mineazy.com',
        userName: 'Warehouse Department User',
        action: 'CREATE',
        entityType: 'StockMovement',
        entityId: 'mv-5509',
        changes: { from: 'HQ', to: 'BYO', qty: 250 },
        createdAt: new Date(Date.now() - 3600000 * 5.8),
      },
      {
        userId: 'business@mineazy.com',
        userName: 'Business Department User',
        action: 'CREATE',
        entityType: 'Customer',
        entityId: 'cust-908',
        changes: { name: 'Apex Mining Corp', segment: 'reseller' },
        createdAt: new Date(Date.now() - 3600000 * 7.5),
      },
      {
        userId: 'admin@mineazy.com',
        userName: 'Admin Department User',
        action: 'UPDATE',
        entityType: 'UserRole',
        entityId: 'user-bob-id',
        changes: { email: 'bob@mineazy.com', newRole: 'manager' },
        createdAt: new Date(Date.now() - 3600000 * 0.2),
      },
    ];

    const actions = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'];
    const entities = ['Product', 'Customer', 'Supplier', 'Vehicle', 'Branch', 'StockCount', 'Invoice', 'FuelToken'];

    for (let i = 0; i < 45; i++) {
      const dep = departments[i % departments.length];
      const act = actions[i % actions.length];
      const ent = entities[i % entities.length];
      const userEmail = `${dep.toLowerCase()}@mineazy.com`;

      seedLogsData.push({
        userId: userEmail,
        userName: `${dep} Department User`,
        action: act,
        entityType: act === 'LOGIN' || act === 'LOGOUT' ? 'UserSession' : ent,
        entityId: `id-${1000 + i}`,
        changes: { info: `Simulated ${act} activity`, detail: `${act} on ${ent}` },
        createdAt: new Date(Date.now() - i * 1800000 - 3600000 * 8),
      });
    }

    await prisma.auditLog.createMany({
      data: seedLogsData.map(log => ({
        entityType: log.entityType,
        entityId: log.entityId,
        action: log.action,
        userId: log.userId,
        userName: log.userName,
        changes: log.changes,
        ipAddress: `192.168.1.10${log.userId.charCodeAt(0) % 9}`,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
        createdAt: log.createdAt,
      })),
    });
  }

  // 2. Fetch all users to resolve branch, department, and role in memory
  const users = await prisma.erpUser.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      department: true,
      branchId: true,
      branch: { select: { id: true, name: true } },
    },
  });

  const userMap = new Map<string, typeof users[0]>();
  for (const u of users) {
    userMap.set(u.id, u);
    userMap.set(u.email.toLowerCase(), u);
  }

  // 3. Build query filter rules
  const where: any = {};

  if (search) {
    where.OR = [
      { userName: { contains: search } },
      { action: { contains: search } },
      { entityType: { contains: search } },
    ];
  }

  if (moduleName) {
    where.entityType = moduleName;
  }

  if (userId) {
    where.OR = [
      { userId: userId },
      { userName: { contains: userId } },
    ];
  }

  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom);
    if (dateTo) where.createdAt.lte = new Date(dateTo);
  }

  // Filter by user properties by resolving user identifiers first
  if (branchId) {
    const filteredUsers = users.filter(u => u.branchId === branchId);
    const ids = [...filteredUsers.map(u => u.id), ...filteredUsers.map(u => u.email.toLowerCase())];
    where.userId = { in: ids };
  }

  if (department) {
    const filteredUsers = users.filter(u => u.department && u.department.toLowerCase() === department.toLowerCase());
    const ids = [...filteredUsers.map(u => u.id), ...filteredUsers.map(u => u.email.toLowerCase())];
    if (where.userId) {
      const existingIn = where.userId.in || [];
      where.userId = { in: existingIn.filter((id: string) => ids.includes(id)) };
    } else {
      where.userId = { in: ids };
    }
  }

  if (role) {
    const filteredUsers = users.filter(u => u.role && u.role.toLowerCase() === role.toLowerCase());
    const ids = [...filteredUsers.map(u => u.id), ...filteredUsers.map(u => u.email.toLowerCase())];
    if (where.userId) {
      const existingIn = where.userId.in || [];
      where.userId = { in: existingIn.filter((id: string) => ids.includes(id)) };
    } else {
      where.userId = { in: ids };
    }
  }

  // 4. Retrieve matching logs
  const allLogs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  // 5. Map logs with user properties
  const mappedLogs = allLogs.map(log => {
    const userKey = log.userId ? log.userId.toLowerCase() : '';
    const user = userMap.get(userKey) || userMap.get(log.userName?.toLowerCase());
    return {
      id: log.id,
      entityType: log.entityType,
      entityId: log.entityId,
      action: log.action,
      userId: log.userId,
      userName: log.userName,
      changes: log.changes,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      createdAt: log.createdAt,
      userDepartment: user?.department || 'System',
      userBranch: user?.branch?.name || 'Central',
      userRole: user?.role || 'system',
    };
  });

  // 6. Sort logs by department name
  mappedLogs.sort((a, b) => {
    const depA = a.userDepartment.toLowerCase();
    const depB = b.userDepartment.toLowerCase();
    if (depA < depB) return -1;
    if (depA > depB) return 1;
    // secondary sort: createdAt desc
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const total = mappedLogs.length;
  const slicedLogs = mappedLogs.slice((page - 1) * limit, page * limit);

  return ok({
    items: slicedLogs,
    total,
    page,
    limit,
  });
}
