const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const session = await prisma.erpPosSession.create({
      data: {
        sessionNumber: 'POS-TEST',
        openedBy: 'test@example.com',
        openingBalance: 0,
      }
    });
    console.log('Session created:', session);
    await prisma.erpPosSession.delete({ where: { id: session.id } });
  } catch (e) {
    console.error('Error creating session:', e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
