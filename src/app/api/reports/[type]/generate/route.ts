import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized } from '@/lib/api';

function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function fmtNum(n: any): string {
  const v = typeof n === 'string' ? parseFloat(n) : Number(n || 0);
  return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function htmlDoc(title: string, content: string, dateFrom?: string, dateTo?: string): string {
  const period = dateFrom || dateTo
    ? `<p>Period: ${dateFrom || '...'} — ${dateTo || '...'}</p>`
    : '';
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>${title}</title>
<style>
  @page { margin: 20mm 15mm; }
  body { font-family: Arial, sans-serif; font-size: 10pt; color: #333; line-height: 1.5; }
  .header { text-align: center; margin-bottom: 18px; border-bottom: 2px solid #1e40af; padding-bottom: 8px; }
  .header h1 { color: #1e40af; font-size: 16pt; margin: 0 0 4px; }
  .header p { color: #666; font-size: 8pt; margin: 2px 0; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 9pt; }
  th { background: #1e40af; color: #fff; padding: 5px 7px; text-align: left; font-weight: 600; }
  td { padding: 4px 7px; border-bottom: 1px solid #e2e8f0; }
  tr:nth-child(even) td { background: #f8fafc; }
  .r { text-align: right; }
  .c { text-align: center; }
  .b { font-weight: 700; }
  .totals td { border-top: 2px solid #333; font-weight: 700; background: #f1f5f9; }
  .sc { display: flex; gap: 10px; margin: 10px 0; flex-wrap: wrap; }
  .scd { border: 1px solid #e2e8f0; border-radius: 5px; padding: 8px 12px; flex: 1; min-width: 130px; }
  .scd .l { font-size: 7pt; color: #666; }
  .scd .v { font-size: 13pt; font-weight: 700; color: #1e40af; }
  h2 { color: #1e40af; font-size: 12pt; margin: 16px 0 6px; border-bottom: 1px solid #ddd; padding-bottom: 3px; }
  .footer { text-align: center; color: #999; font-size: 7pt; margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 6px; }
</style></head>
<body>
<div class="header"><h1>${title}</h1><p>Mineazy ERP — Generated: ${new Date().toLocaleString()}</p>${period}</div>
${content}
<div class="footer">Mineazy ERP System — Confidential</div>
</body></html>`;
}

function tbl(headers: string[], rows: string[][], totals?: string[]): string {
  const h = headers.map(h => `<th>${h}</th>`).join('');
  const r = rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('');
  const t = totals ? `<tr class="totals">${totals.map(c => `<td class="b">${c}</td>`).join('')}</tr>` : '';
  return `<table><thead><tr>${h}</tr></thead><tbody>${r}${t}</tbody></table>`;
}

function sc(label: string, value: string): string {
  return `<div class="scd"><div class="l">${label}</div><div class="v">${value}</div></div>`;
}

async function trialBalance(dateFrom?: string, dateTo?: string): Promise<string> {
  const accounts = await prisma.erpChartOfAccounts.findMany({ where: { isHeader: false }, orderBy: { code: 'asc' } });
  const dateFilter: any = {};
  if (dateFrom) dateFilter.gte = new Date(dateFrom);
  if (dateTo) dateFilter.lte = new Date(dateTo);

  let totalDebit = 0, totalCredit = 0;
  const rows: string[][] = [];
  for (const acct of accounts) {
    const lineWhere: any = { accountId: acct.id };
    if (dateFrom || dateTo) {
      lineWhere.entry = {};
      if (dateFilter.gte) lineWhere.entry.entryDate = { ...(lineWhere.entry.entryDate || {}), gte: dateFilter.gte };
      if (dateFilter.lte) lineWhere.entry.entryDate = { ...(lineWhere.entry.entryDate || {}), lte: dateFilter.lte };
    }
    const lines = await prisma.erpJournalLine.findMany({ where: lineWhere });
    let dr = 0, cr = 0;
    for (const l of lines) { dr += Number(l.debit); cr += Number(l.credit); }
    const bal = dr - cr;
    if (bal === 0 && !dateFrom && !dateTo) continue;
    rows.push([
      acct.code, acct.name, acct.type.replace('_', ' '),
      bal >= 0 ? fmtNum(bal) : '—',
      bal < 0 ? fmtNum(-bal) : '—'
    ]);
    totalDebit += bal >= 0 ? bal : 0;
    totalCredit += bal < 0 ? -bal : 0;
  }
  rows.push([], ['', '', '', '', '']);
  rows.push(['', 'TOTAL', '', fmtNum(totalDebit), fmtNum(totalCredit)]);

  const headers = ['Code', 'Account Name', 'Type', 'Debit', 'Credit'];
  const cards = [
    sc('Total Accounts', String(accounts.length)),
    sc('Total Debit', fmtNum(totalDebit)),
    sc('Total Credit', fmtNum(totalCredit)),
  ];
  return `<div class="sc">${cards.join('')}</div>` + tbl(headers, rows);
}

async function generalLedger(dateFrom?: string, dateTo?: string): Promise<string> {
  const entryWhere: any = {};
  if (dateFrom || dateTo) {
    entryWhere.entryDate = {};
    if (dateFrom) entryWhere.entryDate.gte = new Date(dateFrom);
    if (dateTo) entryWhere.entryDate.lte = new Date(dateTo);
  }

  const entries = await prisma.erpJournalEntry.findMany({
    where: entryWhere,
    orderBy: { entryDate: 'asc' },
    include: {
      lines: { include: { account: true }, orderBy: { id: 'asc' } },
    },
  });

  let html = '';
  let grandTotDr = 0, grandTotCr = 0;
  for (const entry of entries) {
    html += `<h2>${entry.entryNumber} — ${fmtDate(entry.entryDate)} — ${entry.description}</h2>`;
    const rows: string[][] = [];
    let totDr = 0, totCr = 0;
    for (const l of entry.lines) {
      const dr = Number(l.debit), cr = Number(l.credit);
      rows.push([l.account.code, l.account.name, l.description || '', fmtNum(dr), fmtNum(cr)]);
      totDr += dr; totCr += cr;
    }
    grandTotDr += totDr; grandTotCr += totCr;
    rows.push(['', '', 'TOTAL', fmtNum(totDr), fmtNum(totCr)]);
    html += tbl(['Account Code', 'Account Name', 'Description', 'Debit', 'Credit'], rows);
  }

  html += `<h2>Grand Totals</h2>` + tbl(['', '', '', 'Debit', 'Credit'], [['', '', 'GRAND TOTAL', fmtNum(grandTotDr), fmtNum(grandTotCr)]]);
  html = `<div class="sc">${sc('Total Entries', String(entries.length))}${sc('Total Debit', fmtNum(grandTotDr))}${sc('Total Credit', fmtNum(grandTotCr))}</div>` + html;
  return html;
}

async function vatReturn(dateFrom?: string, dateTo?: string): Promise<string> {
  const where: any = { referenceType: { in: ['ar_invoice', 'ap_bill', 'sales_order', 'purchase_order'] } };
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom);
    if (dateTo) where.createdAt.lte = new Date(dateTo);
  }

  const taxes = await prisma.taxTransaction.findMany({
    where,
    include: { taxType: true },
    orderBy: { createdAt: 'asc' },
  });

  const rows: string[][] = [];
  let totalTaxable = 0, totalTax = 0;
  for (const t of taxes) {
    const taxable = Number(t.taxableAmount), tax = Number(t.taxAmount);
    rows.push([
      t.taxType.code, t.taxType.name || t.taxType.code, String(t.rate) + '%',
      t.reference, t.referenceType.replace(/_/g, ' '),
      fmtNum(taxable), fmtNum(tax),
      fmtDate(t.createdAt),
    ]);
    totalTaxable += taxable; totalTax += tax;
  }

  const byType: Record<string, { taxable: number; tax: number }> = {};
  for (const t of taxes) {
    const code = t.taxType.code;
    if (!byType[code]) byType[code] = { taxable: 0, tax: 0 };
    byType[code].taxable += Number(t.taxableAmount);
    byType[code].tax += Number(t.taxAmount);
  }
  const summaryRows = Object.entries(byType).map(([code, v]) =>
    [code, fmtNum(v.taxable), fmtNum(v.tax), v.taxable ? fmtNum((v.tax / v.taxable) * 100) + '%' : '—']
  );

  const headers = ['Tax Code', 'Name', 'Rate', 'Reference', 'Type', 'Taxable', 'Tax', 'Date'];
  const sumHeaders = ['Tax Code', 'Total Taxable', 'Total Tax', 'Eff. Rate'];
  return `<div class="sc">${sc('Transactions', String(taxes.length))}${sc('Total Taxable', fmtNum(totalTaxable))}${sc('Total Tax', fmtNum(totalTax))}</div>`
    + `<h2>Summary by Tax Code</h2>` + tbl(sumHeaders, summaryRows)
    + `<h2>Transaction Details</h2>` + tbl(headers, rows, ['', '', '', '', '', 'TOTAL', fmtNum(totalTaxable), fmtNum(totalTax), '']);
}

async function payeReturn(dateFrom?: string, dateTo?: string): Promise<string> {
  const payeTypes = await prisma.taxType.findMany({ where: { code: { contains: 'PAYE' } } });
  const payeIds = payeTypes.map(t => t.id);

  const where: any = { taxTypeId: { in: payeIds } };
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom);
    if (dateTo) where.createdAt.lte = new Date(dateTo);
  }

  const taxes = await prisma.taxTransaction.findMany({
    where,
    include: { taxType: true },
    orderBy: { createdAt: 'asc' },
  });

  const rows: string[][] = [];
  let totalTaxable = 0, totalTax = 0;
  for (const t of taxes) {
    const taxable = Number(t.taxableAmount), tax = Number(t.taxAmount);
    rows.push([
      t.taxType.code, t.reference, fmtNum(taxable), fmtNum(tax),
      String(t.rate) + '%', fmtDate(t.createdAt),
    ]);
    totalTaxable += taxable; totalTax += tax;
  }

  const headers = ['Tax Code', 'Reference', 'Taxable Amount', 'PAYE Amount', 'Rate', 'Date'];
  return `<div class="sc">${sc('Total Employees/Entries', String(taxes.length))}${sc('Total Taxable', fmtNum(totalTaxable))}${sc('Total PAYE', fmtNum(totalTax))}</div>`
    + tbl(headers, rows, ['', 'TOTAL', fmtNum(totalTaxable), fmtNum(totalTax), '', '']);
}

async function arAging(dateFrom?: string, dateTo?: string): Promise<string> {
  const now = dateTo ? new Date(dateTo) : new Date();
  const where: any = { status: { notIn: ['paid', 'cancelled'] } };
  if (dateFrom) where.invoiceDate = { gte: new Date(dateFrom) };
  if (dateTo) where.invoiceDate = { ...(where.invoiceDate || {}), lte: new Date(dateTo) };

  const invoices = await prisma.erpAccountReceivable.findMany({
    where,
    orderBy: [{ customerName: 'asc' }, { invoiceDate: 'asc' }],
  });

  const buckets: Record<string, { current: number; d30: number; d60: number; d90: number; total: number }> = {};
  let totalCur = 0, total30 = 0, total60 = 0, total90 = 0;
  for (const inv of invoices) {
    const bal = Number(inv.balance);
    if (bal <= 0) continue;
    const days = Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24));
    if (!buckets[inv.customerName]) buckets[inv.customerName] = { current: 0, d30: 0, d60: 0, d90: 0, total: 0 };
    if (days <= 0) buckets[inv.customerName].current += bal;
    else if (days <= 30) buckets[inv.customerName].d30 += bal;
    else if (days <= 60) buckets[inv.customerName].d60 += bal;
    else buckets[inv.customerName].d90 += bal;
    buckets[inv.customerName].total += bal;
  }

  const rows: string[][] = [];
  let gCur = 0, g30 = 0, g60 = 0, g90 = 0, gTot = 0;
  for (const [name, b] of Object.entries(buckets)) {
    rows.push([name, fmtNum(b.current), fmtNum(b.d30), fmtNum(b.d60), fmtNum(b.d90), fmtNum(b.total)]);
    gCur += b.current; g30 += b.d30; g60 += b.d60; g90 += b.d90; gTot += b.total;
  }

  const headers = ['Customer', 'Current', '1–30 Days', '31–60 Days', '61+ Days', 'Total'];
  return `<div class="sc">${sc('Customers with Balances', String(Object.keys(buckets).length))}${sc('Total Outstanding', fmtNum(gTot))}${sc('Overdue (30+)', fmtNum(g30 + g60 + g90))}</div>`
    + tbl(headers, rows, ['TOTAL', fmtNum(gCur), fmtNum(g30), fmtNum(g60), fmtNum(g90), fmtNum(gTot)]);
}

async function apAging(dateFrom?: string, dateTo?: string): Promise<string> {
  const now = dateTo ? new Date(dateTo) : new Date();
  const where: any = { status: { notIn: ['paid', 'cancelled'] } };
  if (dateFrom) where.billDate = { gte: new Date(dateFrom) };
  if (dateTo) where.billDate = { ...(where.billDate || {}), lte: new Date(dateTo) };

  const bills = await prisma.erpAccountPayable.findMany({
    where,
    orderBy: [{ supplierName: 'asc' }, { billDate: 'asc' }],
  });

  const buckets: Record<string, { current: number; d30: number; d60: number; d90: number; total: number }> = {};
  for (const bill of bills) {
    const bal = Number(bill.balance);
    if (bal <= 0) continue;
    const days = Math.floor((now.getTime() - new Date(bill.dueDate).getTime()) / (1000 * 60 * 60 * 24));
    if (!buckets[bill.supplierName]) buckets[bill.supplierName] = { current: 0, d30: 0, d60: 0, d90: 0, total: 0 };
    if (days <= 0) buckets[bill.supplierName].current += bal;
    else if (days <= 30) buckets[bill.supplierName].d30 += bal;
    else if (days <= 60) buckets[bill.supplierName].d60 += bal;
    else buckets[bill.supplierName].d90 += bal;
    buckets[bill.supplierName].total += bal;
  }

  const rows: string[][] = [];
  let gCur = 0, g30 = 0, g60 = 0, g90 = 0, gTot = 0;
  for (const [name, b] of Object.entries(buckets)) {
    rows.push([name, fmtNum(b.current), fmtNum(b.d30), fmtNum(b.d60), fmtNum(b.d90), fmtNum(b.total)]);
    gCur += b.current; g30 += b.d30; g60 += b.d60; g90 += b.d90; gTot += b.total;
  }

  const headers = ['Supplier', 'Current', '1–30 Days', '31–60 Days', '61+ Days', 'Total'];
  return `<div class="sc">${sc('Suppliers with Balances', String(Object.keys(buckets).length))}${sc('Total Outstanding', fmtNum(gTot))}${sc('Overdue (30+)', fmtNum(g30 + g60 + g90))}</div>`
    + tbl(headers, rows, ['TOTAL', fmtNum(gCur), fmtNum(g30), fmtNum(g60), fmtNum(g90), fmtNum(gTot)]);
}

async function stockStatus(): Promise<string> {
  const products = await prisma.erpProduct.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });

  const rows: string[][] = [];
  let totalValue = 0, totalStock = 0;
  const lowStock: string[] = [];
  for (const p of products) {
    const stock = Number(p.stock);
    const cost = Number(p.costPrice);
    const value = stock * cost;
    rows.push([
      p.code, p.name, p.unit,
      fmtNum(stock), fmtNum(Number(p.minStock || 0)), fmtNum(cost), fmtNum(value),
      stock < Number(p.minStock) ? '⚠ Low' : 'OK',
    ]);
    totalValue += value;
    totalStock += stock;
    if (stock < Number(p.minStock)) lowStock.push(p.name);
  }

  const headers = ['Code', 'Product', 'Unit', 'Stock', 'Min Stock', 'Cost', 'Value', 'Status'];
  return `<div class="sc">${sc('Products', String(products.length))}${sc('Total Stock', fmtNum(totalStock))}${sc('Total Value', fmtNum(totalValue))}${sc('Low Stock Items', String(lowStock.length))}</div>`
    + (lowStock.length ? `<p style="color:#b91c1c;font-size:9pt">⚠ Low stock: ${lowStock.join(', ')}</p>` : '')
    + tbl(headers, rows);
}

async function salesLedgerReport(dateFrom?: string, dateTo?: string): Promise<string> {
  const where: any = {};
  if (dateFrom || dateTo) {
    where.invoiceDate = {};
    if (dateFrom) where.invoiceDate.gte = new Date(dateFrom);
    if (dateTo) where.invoiceDate.lte = new Date(dateTo);
  }

  const invoices = await prisma.erpAccountReceivable.findMany({
    where, orderBy: [{ customerName: 'asc' }, { invoiceDate: 'asc' }],
  });

  const custMap: Record<string, { name: string; invoices: typeof invoices; total: number; balance: number }> = {};
  for (const inv of invoices) {
    if (!custMap[inv.customerId]) custMap[inv.customerId] = { name: inv.customerName, invoices: [], total: 0, balance: 0 };
    custMap[inv.customerId].invoices.push(inv);
    custMap[inv.customerId].total += Number(inv.amount);
    custMap[inv.customerId].balance += Number(inv.balance);
  }

  let html = '';
  let grandTotal = 0, grandBalance = 0, grandInvoices = 0;
  for (const [cid, c] of Object.entries(custMap)) {
    html += `<h2>${c.name}</h2>`;
    html += `<p>Total Invoiced: <strong>$${fmtNum(c.total)}</strong> | Outstanding: <strong>$${fmtNum(c.balance)}</strong> | Invoices: ${c.invoices.length}</p>`;
    const rows = c.invoices.map(inv => [
      inv.invoiceNumber, fmtDate(inv.invoiceDate), fmtDate(inv.dueDate),
      fmtNum(inv.amount), fmtNum(inv.paidAmount), fmtNum(inv.balance),
      inv.status,
    ]);
    html += tbl(['Invoice #', 'Date', 'Due Date', 'Amount', 'Paid', 'Balance', 'Status'], rows,
      ['', '', 'TOTAL', fmtNum(c.total), '—', fmtNum(c.balance), '']);
    grandTotal += c.total; grandBalance += c.balance; grandInvoices += c.invoices.length;
  }

  html = `<div class="sc">${sc('Customers', String(Object.keys(custMap).length))}${sc('Total Invoiced', fmtNum(grandTotal))}${sc('Total Outstanding', fmtNum(grandBalance))}${sc('Total Invoices', String(grandInvoices))}</div>` + html;
  return html;
}

async function salesJournalReport(dateFrom?: string, dateTo?: string): Promise<string> {
  const where: any = {};
  if (dateFrom || dateTo) {
    where.invoiceDate = {};
    if (dateFrom) where.invoiceDate.gte = new Date(dateFrom);
    if (dateTo) where.invoiceDate.lte = new Date(dateTo);
  }

  const invoices = await prisma.erpAccountReceivable.findMany({
    where, orderBy: [{ invoiceDate: 'asc' }, { invoiceNumber: 'asc' }],
  });

  const allAccts = await prisma.erpChartOfAccounts.findMany({ where: { isHeader: false }, orderBy: { code: 'asc' } });
  const drAcct = allAccts.find(a => a.type === 'asset' && /receivable/i.test(a.name)) || allAccts.find(a => a.type === 'asset');
  const crAcct = allAccts.find(a => a.type === 'revenue' && /revenue|sales|income/i.test(a.name)) || allAccts.find(a => a.type === 'revenue');

  const rows: string[][] = [];
  let totalDr = 0, totalCr = 0;
  for (const inv of invoices) {
    const amt = Number(inv.amount);
    rows.push([inv.invoiceNumber, fmtDate(inv.invoiceDate), inv.customerName,
      drAcct?.code || '—', drAcct?.name || 'Accounts Receivable', fmtNum(amt), '—', 'DR']);
    rows.push([inv.invoiceNumber, fmtDate(inv.invoiceDate), inv.customerName,
      crAcct?.code || '—', crAcct?.name || 'Sales Revenue', '—', fmtNum(amt), 'CR']);
    totalDr += amt; totalCr += amt;
  }
  rows.push(['', '', '', '', 'TOTAL', fmtNum(totalDr), fmtNum(totalCr), '']);

  const headers = ['Document', 'Date', 'Customer', 'Acct Code', 'Account', 'Debit', 'Credit', 'Type'];
  return `<div class="sc">${sc('Invoices', String(invoices.length))}${sc('Total Lines', String(rows.length - 1))}${sc('Total Debit', fmtNum(totalDr))}${sc('Total Credit', fmtNum(totalCr))}</div>`
    + `<p>Debit Account: <strong>${drAcct?.name || 'N/A'}</strong> (${drAcct?.code || '—'}) | Credit Account: <strong>${crAcct?.name || 'N/A'}</strong> (${crAcct?.code || '—'})</p>`
    + tbl(headers, rows);
}

async function purchasesLedgerReport(dateFrom?: string, dateTo?: string): Promise<string> {
  const where: any = {};
  if (dateFrom || dateTo) {
    where.billDate = {};
    if (dateFrom) where.billDate.gte = new Date(dateFrom);
    if (dateTo) where.billDate.lte = new Date(dateTo);
  }

  const bills = await prisma.erpAccountPayable.findMany({
    where, orderBy: [{ supplierName: 'asc' }, { billDate: 'asc' }],
  });

  const suppMap: Record<string, { name: string; bills: typeof bills; total: number; balance: number }> = {};
  for (const bill of bills) {
    if (!suppMap[bill.supplierId]) suppMap[bill.supplierId] = { name: bill.supplierName, bills: [], total: 0, balance: 0 };
    suppMap[bill.supplierId].bills.push(bill);
    suppMap[bill.supplierId].total += Number(bill.amount);
    suppMap[bill.supplierId].balance += Number(bill.balance);
  }

  let html = '';
  let grandTotal = 0, grandBalance = 0, grandBills = 0;
  for (const [, s] of Object.entries(suppMap)) {
    html += `<h2>${s.name}</h2>`;
    html += `<p>Total Billed: <strong>$${fmtNum(s.total)}</strong> | Outstanding: <strong>$${fmtNum(s.balance)}</strong> | Bills: ${s.bills.length}</p>`;
    const rows = s.bills.map(bill => [
      bill.billNumber, fmtDate(bill.billDate), fmtDate(bill.dueDate),
      fmtNum(bill.amount), fmtNum(bill.paidAmount), fmtNum(bill.balance),
      bill.status,
    ]);
    html += tbl(['Bill #', 'Date', 'Due Date', 'Amount', 'Paid', 'Balance', 'Status'], rows,
      ['', '', 'TOTAL', fmtNum(s.total), '—', fmtNum(s.balance), '']);
    grandTotal += s.total; grandBalance += s.balance; grandBills += s.bills.length;
  }

  html = `<div class="sc">${sc('Suppliers', String(Object.keys(suppMap).length))}${sc('Total Billed', fmtNum(grandTotal))}${sc('Total Outstanding', fmtNum(grandBalance))}${sc('Total Bills', String(grandBills))}</div>` + html;
  return html;
}

async function purchasesJournalReport(dateFrom?: string, dateTo?: string): Promise<string> {
  const where: any = {};
  if (dateFrom || dateTo) {
    where.billDate = {};
    if (dateFrom) where.billDate.gte = new Date(dateFrom);
    if (dateTo) where.billDate.lte = new Date(dateTo);
  }

  const bills = await prisma.erpAccountPayable.findMany({
    where, orderBy: [{ billDate: 'asc' }, { billNumber: 'asc' }],
  });

  const allAccts = await prisma.erpChartOfAccounts.findMany({ where: { isHeader: false }, orderBy: { code: 'asc' } });
  const drAcct = allAccts.find(a => a.type === 'expense' && /purchases|cogs?cost of sales?|inventory|materials/i.test(a.name)) || allAccts.find(a => a.type === 'expense');
  const crAcct = allAccts.find(a => a.type === 'liability' && /payable/i.test(a.name)) || allAccts.find(a => a.type === 'liability');

  const rows: string[][] = [];
  let totalDr = 0, totalCr = 0;
  for (const bill of bills) {
    const amt = Number(bill.amount);
    rows.push([bill.billNumber, fmtDate(bill.billDate), bill.supplierName,
      drAcct?.code || '—', drAcct?.name || 'Purchases', fmtNum(amt), '—', 'DR']);
    rows.push([bill.billNumber, fmtDate(bill.billDate), bill.supplierName,
      crAcct?.code || '—', crAcct?.name || 'Accounts Payable', '—', fmtNum(amt), 'CR']);
    totalDr += amt; totalCr += amt;
  }
  rows.push(['', '', '', '', 'TOTAL', fmtNum(totalDr), fmtNum(totalCr), '']);

  const headers = ['Document', 'Date', 'Supplier', 'Acct Code', 'Account', 'Debit', 'Credit', 'Type'];
  return `<div class="sc">${sc('Bills', String(bills.length))}${sc('Total Lines', String(rows.length - 1))}${sc('Total Debit', fmtNum(totalDr))}${sc('Total Credit', fmtNum(totalCr))}</div>`
    + `<p>Debit Account: <strong>${drAcct?.name || 'N/A'}</strong> (${drAcct?.code || '—'}) | Credit Account: <strong>${crAcct?.name || 'N/A'}</strong> (${crAcct?.code || '—'})</p>`
    + tbl(headers, rows);
}

const handlers: Record<string, (df?: string, dt?: string) => Promise<string>> = {
  trial_balance: trialBalance,
  general_ledger: generalLedger,
  vat_return: vatReturn,
  paye_return: payeReturn,
  ar_aging: arAging,
  ap_aging: apAging,
  stock_status: stockStatus,
  sales_ledger: salesLedgerReport,
  sales_journal: salesJournalReport,
  purchases_ledger: purchasesLedgerReport,
  purchases_journal: purchasesJournalReport,
};

const friendlyNames: Record<string, string> = {
  trial_balance: 'Trial Balance',
  general_ledger: 'General Ledger',
  vat_return: 'VAT Return',
  paye_return: 'PAYE Return',
  ar_aging: 'Accounts Receivable Aging',
  ap_aging: 'Accounts Payable Aging',
  stock_status: 'Stock Status',
  sales_ledger: 'Sales Ledger',
  sales_journal: 'Sales Journal',
  purchases_ledger: 'Purchases Ledger',
  purchases_journal: 'Purchases Journal',
};

export async function POST(request: NextRequest, { params }: { params: Promise<{ type: string }> }) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { type } = await params;
  const { searchParams } = new URL(request.url);
  const dateFrom = searchParams.get('dateFrom') || undefined;
  const dateTo = searchParams.get('dateTo') || undefined;

  const handler = handlers[type];
  if (!handler) {
    return new Response(`<html><body><h1>Unknown Report Type</h1><p>Report type "${type}" not found.</p></body></html>`, {
      status: 404,
      headers: { 'Content-Type': 'text/html' },
    });
  }

  const title = friendlyNames[type] || type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const content = await handler(dateFrom, dateTo);
  const html = htmlDoc(title, content, dateFrom, dateTo);

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html',
      'Content-Disposition': `attachment; filename="${type}.html"`,
    },
  });
}
