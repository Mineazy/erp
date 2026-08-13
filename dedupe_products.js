const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const products = await prisma.erpProduct.findMany();
  console.log(`Found ${products.length} total products.`);

  const uniqueCodes = new Set();
  const toDelete = [];
  const toUpdate = [];

  for (const p of products) {
    let cleanCode = p.code;
    const parts = p.code.split('-');
    // If it looks like BRANCH-CODE
    if (parts.length > 1) {
      // Find the first dash and take everything after it
      cleanCode = p.code.substring(p.code.indexOf('-') + 1);
    }

    if (uniqueCodes.has(cleanCode)) {
      toDelete.push(p.id);
    } else {
      uniqueCodes.add(cleanCode);
      if (cleanCode !== p.code) {
        toUpdate.push({ id: p.id, code: cleanCode });
      }
    }
  }

  console.log(`Unique products: ${uniqueCodes.size}`);
  console.log(`To delete: ${toDelete.length}`);
  console.log(`To update: ${toUpdate.length}`);

  // Delete duplicates
  let batchSize = 500;
  for (let i = 0; i < toDelete.length; i += batchSize) {
    const batch = toDelete.slice(i, i + batchSize);
    await prisma.erpProduct.deleteMany({
      where: { id: { in: batch } }
    });
    console.log(`Deleted ${i + batch.length} / ${toDelete.length}`);
  }

  // Update codes
  for (let i = 0; i < toUpdate.length; i++) {
    await prisma.erpProduct.update({
      where: { id: toUpdate[i].id },
      data: { code: toUpdate[i].code }
    });
    if (i % 500 === 0) console.log(`Updated ${i} / ${toUpdate.length}`);
  }
  console.log(`Updated ${toUpdate.length} / ${toUpdate.length}`);

  console.log('Deduplication finished successfully!');
  await prisma.$disconnect();
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
