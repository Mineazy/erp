const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const models = Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$') && typeof prisma[k].findMany === 'function');
  
  for (const model of models) {
    try {
      const records = await prisma[model].findMany({ take: 1000 });
      for (const record of records) {
        let needsUpdate = false;
        const updateData = {};
        for (const [key, value] of Object.entries(record)) {
          if (typeof value === 'string' && value.startsWith("'") && value.endsWith("'") && value.length > 1) {
            updateData[key] = value.substring(1, value.length - 1);
            needsUpdate = true;
          }
        }
        if (needsUpdate && record.id) {
          await prisma[model].update({
            where: { id: record.id },
            data: updateData
          });
          console.log(`Updated ${model} ${record.id}`);
        }
      }
    } catch (e) {
      console.log(`Skipped ${model}`);
    }
  }
}

main().then(() => prisma.$disconnect());
