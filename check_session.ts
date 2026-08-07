import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  try {
    const p = await prisma.erpPosSession.create({
      data: {
        sessionNumber: 'POS-TEST-123',
        openedBy: 'test',
        openingBalance: 0,
        branchId: null
      }
    });
    console.log('Created:', p);
    await prisma.erpPosSession.delete({ where: { id: p.id }});
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}
run();
