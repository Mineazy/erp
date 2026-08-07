import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  try {
    const res = await prisma.erpPosSession.updateMany({
      where: { status: "'open'" },
      data: { status: 'open', currency: 'USD' }
    });
    console.log('Fixed:', res);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
run();
