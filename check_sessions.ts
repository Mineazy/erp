import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  try {
    const sessions = await prisma.erpPosSession.findMany({ orderBy: { createdAt: 'desc' }, take: 5 });
    console.log(sessions);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
run();
