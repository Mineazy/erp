import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as XLSX from 'xlsx';

const prisma = new PrismaClient();

async function run() {
  try {
    const path = 'C:\\Users\\Administrator\\.gemini\\antigravity\\brain\\1cee8fc1-e346-403e-bf41-26fe45bb885d\\.user_uploaded\\media_1786105693257.csv';
    const csvBuffer = fs.readFileSync(path);
    const workbook = XLSX.read(csvBuffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet) as any[];

    console.log(`Loaded ${data.length} rows from CSV.`);

    // Pre-fetch categories
    const categoryCache = new Map<string, string>();
    const existingCats = await prisma.erpProductCategory.findMany();
    for (const cat of existingCats) {
      categoryCache.set(cat.name.toUpperCase(), cat.id);
    }

    let updatedCount = 0;
    
    for (const row of data) {
      if (!row['Item No']) continue;

      const code = String(row['Item No']).trim();
      const name = String(row['Name']).trim();
      // Skip category header rows if any (e.g. ABBR,ABBRASIVES,,,)
      if (!row['Selling Price'] && !row['Category'] && !row['Unit']) {
         continue;
      }
      
      let sellingPriceStr = String(row['Selling Price'] || '0').replace(/,/g, '');
      const sellingPrice = parseFloat(sellingPriceStr) || 0;
      
      let categoryName = row.Category ? String(row.Category).trim() : 'Uncategorized';
      
      let categoryId = categoryCache.get(categoryName.toUpperCase());
      
      if (!categoryId) {
         const newCat = await prisma.erpProductCategory.create({
            data: { name: categoryName }
         });
         categoryId = newCat.id;
         categoryCache.set(categoryName.toUpperCase(), categoryId);
         console.log(`Created new category: ${categoryName}`);
      }

      const res = await prisma.erpProduct.updateMany({
         where: { 
           // Since DB codes are like FL-BS003, we match by name or endsWith code
           OR: [
             { code: { endsWith: code } },
             { name: name }
           ]
         },
         data: {
            sellingPrice: sellingPrice,
            categoryId: categoryId
         }
      });
      
      updatedCount += res.count;
      
      if (updatedCount % 2000 < 50) {
        process.stdout.write('.');
      }
    }

    console.log(`\nFinished updating ${updatedCount} products across branches!`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
