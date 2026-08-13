const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const { parse } = require('csv-parse');

const prisma = new PrismaClient();

async function run() {
  const branches = await prisma.erpBranch.findMany();
  const branchMap = new Map();
  branches.forEach(b => {
    branchMap.set(b.code, b.id);
  });
  console.log('Branches found:', branchMap.size);

  const products = await prisma.erpProduct.findMany({ select: { id: true, code: true } });
  const productMap = new Map();
  products.forEach(p => {
    productMap.set(p.code, p.id);
  });
  console.log('Products found:', productMap.size);
  console.log('Sample product codes in DB:', Array.from(productMap.keys()).slice(0, 10));

  const records = [];
  const parser = fs.createReadStream('stock.csv').pipe(parse({
    columns: false,
    skip_empty_lines: true
  }));

  let header1 = null;
  let header2 = null;
  let lineCount = 0;
  let skippedProducts = 0;

  for await (const record of parser) {
    if (lineCount === 0) {
      header1 = record;
      console.log('Header 1:', header1);
    } else if (lineCount === 1) {
      header2 = record;
      console.log('Header 2:', header2);
    } else {
      const code = record[0];
      const productId = productMap.get(code);
      if (lineCount < 5) console.log(`Row ${lineCount}: code=${code} found=${!!productId}`);
      if (productId) {
        for (let i = 2; i <= 18; i++) {
          const bCode = header2[i].trim();
          const branchId = branchMap.get(bCode);
          if (branchId) {
            let qtyStr = record[i] ? record[i].trim() : '';
            let qty = parseFloat(qtyStr);
            if (isNaN(qty)) qty = 0;
            if (qty < 0) qty = 0; 

            if (qty > 0) {
              records.push({
                productId,
                branchId,
                quantity: qty,
                minQuantity: 0
              });
            }
          }
        }
      } else {
        skippedProducts++;
      }
    }
    lineCount++;
  }

  console.log(`Prepared ${records.length} branch stock records. Skipped ${skippedProducts} missing products. Starting import...`);
  
  await prisma.erpBranchStock.deleteMany({});
  console.log('Cleared old stock records.');

  let batchSize = 1000;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    await prisma.erpBranchStock.createMany({
      data: batch
    });
    console.log(`Inserted ${i + batch.length} / ${records.length}`);
  }

  console.log('Import finished successfully!');
  await prisma.$disconnect();
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
