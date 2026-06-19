import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, badRequest, ok, generateCode, getNextSequence } from '@/lib/api';
import * as XLSX from 'xlsx';

const TEMPLATE_HEADERS = [
  'Code (leave empty to auto-generate)',
  'Name *',
  'Category',
  'Unit *',
  'Cost Price',
  'Selling Price *',
  'Stock',
  'Min Stock',
  'Location',
  'Barcode',
  'Description',
];

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const exampleRow = ['', 'Sample Product', 'Raw Materials', 'kg', '10.00', '15.00', '100', '10', 'Warehouse A', 'BARCODE001', 'Sample product description'];
  const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, exampleRow]);
  ws['!cols'] = TEMPLATE_HEADERS.map((h) => ({ wch: Math.max(h.length * 1.2, 18) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Products');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  return new Response(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="product_import_template.xlsx"',
    },
  });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  if (!file) return badRequest('No file uploaded');

  const buf = Buffer.from(await file.arrayBuffer());
  const wb = XLSX.read(buf, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

  if (rows.length === 0) return badRequest('File is empty');

  const results: { row: number; status: string; product?: any; error?: string }[] = [];

  const nextSeq = await prisma.erpReturn.count() + 1;
  const prefix = 'PRD';

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const rowNum = i + 2; // +2 because 1-indexed + header row

    try {
      const name = (r['Name *'] || r['Name'] || '').toString().trim();
      const unit = (r['Unit *'] || r['Unit'] || '').toString().trim();

      if (!name) { results.push({ row: rowNum, status: 'error', error: 'Name is required' }); continue; }
      if (!unit) { results.push({ row: rowNum, status: 'error', error: 'Unit is required' }); continue; }

      const codeRaw = (r['Code (leave empty to auto-generate)'] || r['Code'] || '').toString().trim();
      let code: string;
      if (codeRaw) {
        const existing = await prisma.erpProduct.findUnique({ where: { code: codeRaw } });
        if (existing) {
          results.push({ row: rowNum, status: 'error', error: `Code "${codeRaw}" already exists` });
          continue;
        }
        code = codeRaw;
      } else {
        code = await getNextSequence(prisma, 'erpProduct', 'code', prefix);
      }

      const sellingPriceRaw = (r['Selling Price *'] || r['Selling Price'] || '0').toString();
      const sellingPrice = parseFloat(sellingPriceRaw);
      if (isNaN(sellingPrice)) {
        results.push({ row: rowNum, status: 'error', error: 'Invalid Selling Price' });
        continue;
      }

      let categoryId: string | null = null;
      const categoryName = (r['Category'] || '').toString().trim();
      if (categoryName) {
        const cat = await prisma.erpProductCategory.findFirst({
          where: { name: { contains: categoryName } },
        });
        if (cat) categoryId = cat.id;
      }

      const product = await prisma.erpProduct.create({
        data: {
          code,
          name,
          unit,
          categoryId,
          costPrice: parseFloat((r['Cost Price'] || '0').toString()) || 0,
          sellingPrice,
          stock: parseFloat((r['Stock'] || '0').toString()) || 0,
          minStock: parseFloat((r['Min Stock'] || '0').toString()) || 0,
          location: (r['Location'] || '').toString().trim() || null,
          barcode: (r['Barcode'] || '').toString().trim() || null,
          description: (r['Description'] || '').toString().trim() || null,
        },
      });

      results.push({ row: rowNum, status: 'success', product: { id: product.id, code: product.code, name: product.name } });
    } catch (e: any) {
      results.push({ row: rowNum, status: 'error', error: e.message || 'Unknown error' });
    }
  }

  const successCount = results.filter((r) => r.status === 'success').length;
  const errorCount = results.filter((r) => r.status === 'error').length;

  return ok({
    total: rows.length,
    successCount,
    errorCount,
    results,
  });
}
