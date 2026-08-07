import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';

const prisma = new PrismaClient();

async function run() {
  try {
    const path = 'C:\\Users\\Administrator\\Downloads\\product_import_template (1).xlsx';
    const workbook = XLSX.readFile(path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet) as any[];

    console.log(`Loaded ${data.length} rows from Excel.`);

    // Pre-fetch categories
    const categoryCache = new Map<string, string>();
    const existingCats = await prisma.erpProductCategory.findMany();
    for (const cat of existingCats) {
      categoryCache.set(cat.name.toUpperCase(), cat.id);
    }

    let updatedCount = 0;
    
    // We update sequentially to avoid exhausting Prisma's connection pool
    for (const row of data) {
      if (!row.Code) continue;

      const code = String(row.Code);
      const sellingPrice = row['Selling Price'] ? Number(row['Selling Price']) : 0;
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

      await prisma.erpProduct.updateMany({
         where: { code: code },
         data: {
            sellingPrice: sellingPrice,
            categoryId: categoryId
         }
      });
      
      updatedCount++;
      if (updatedCount % 500 === 0) {
        console.log(`Processed ${updatedCount} / ${data.length} products...`);
      }
    }

    console.log(`Finished updating all ${updatedCount} products!`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
