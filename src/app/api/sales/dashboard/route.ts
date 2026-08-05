import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, ok, getBranchFilter } from '@/lib/api';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const url = new URL(request.url);
  const branchId = url.searchParams.get('branchId') || undefined;

  // Ensure user can access the requested branch or their assigned branch
  const userBranchFilter = getBranchFilter(session);
  const effectiveBranchId = branchId || userBranchFilter?.branchId || undefined;

  const branchFilter = effectiveBranchId ? { branchId: effectiveBranchId } : {};

  // Limit to the last 5 years to prevent massive memory usage
  const fiveYearsAgo = new Date();
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
  fiveYearsAgo.setMonth(0, 1);
  fiveYearsAgo.setHours(0, 0, 0, 0);

  const dateFilter = { createdAt: { gte: fiveYearsAgo } };

  // Fetch POS Transactions
  const posTx = await prisma.erpPosTransaction.findMany({
    where: { ...branchFilter, status: 'completed', ...dateFilter },
    select: {
      total: true,
      createdAt: true,
      branchId: true,
      lines: {
        select: {
          quantity: true,
          productId: true,
        }
      }
    }
  });

  // Fetch Sales Orders
  const salesOrders = await prisma.erpSalesOrder.findMany({
    where: { ...branchFilter, status: { in: ['completed', 'confirmed'] }, ...dateFilter },
    select: {
      total: true,
      createdAt: true,
      branchId: true,
      lines: {
        select: {
          quantity: true,
          productId: true,
        }
      }
    }
  });

  // Fetch all products to get their cost prices
  const allProducts = await prisma.erpProduct.findMany({
    select: { id: true, costPrice: true }
  });
  const productCostMap = new Map(allProducts.map(p => [p.id, Number(p.costPrice || 0)]));

  // Fetch Purchases (Purchase Orders)
  const purchaseOrders = await prisma.erpPurchaseOrder.findMany({
    where: { ...branchFilter, status: { in: ['completed', 'received', 'approved'] }, ...dateFilter },
    select: {
      total: true,
      createdAt: true,
      branchId: true,
    }
  });

  const now = new Date();
  const currentYear = now.getFullYear();

  let totalSales = 0;
  let totalCost = 0;
  let posCount = 0;
  let soCount = 0;

  const monthlySales = Array(12).fill(0);
  const monthlyPurchases = Array(12).fill(0);
  const quarterlySales = Array(4).fill(0);
  const halfYearlySales = Array(2).fill(0);
  const yearlySales = Array(5).fill(0);

  const processSalesItem = (item: any, isTx: boolean) => {
    const amount = Number(item.total);
    const date = new Date(item.createdAt);
    totalSales += amount;
    if (isTx) posCount++;
    else soCount++;

    item.lines.forEach((line: any) => {
      totalCost += Number(line.quantity) * (productCostMap.get(line.productId) || 0);
    });

    if (date.getFullYear() === currentYear) {
      monthlySales[date.getMonth()] += amount;
      quarterlySales[Math.floor(date.getMonth() / 3)] += amount;
      halfYearlySales[Math.floor(date.getMonth() / 6)] += amount;
    }

    const yearDiff = currentYear - date.getFullYear();
    if (yearDiff >= 0 && yearDiff < 5) {
      yearlySales[yearDiff] += amount;
    }
  };

  posTx.forEach(tx => processSalesItem(tx, true));
  salesOrders.forEach(so => processSalesItem(so, false));

  purchaseOrders.forEach(po => {
    const amount = Number(po.total);
    const date = new Date(po.createdAt);
    if (date.getFullYear() === currentYear) {
      monthlyPurchases[date.getMonth()] += amount;
    }
  });

  const grossProfit = totalSales - totalCost;
  const totalTransactions = posCount + soCount;
  const basketValue = totalTransactions > 0 ? totalSales / totalTransactions : 0;

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyData = months.map((month, index) => ({
    name: month,
    sales: monthlySales[index],
    purchases: monthlyPurchases[index]
  }));

  const quarterlyData = [
    { name: 'Q1', sales: quarterlySales[0] },
    { name: 'Q2', sales: quarterlySales[1] },
    { name: 'Q3', sales: quarterlySales[2] },
    { name: 'Q4', sales: quarterlySales[3] },
  ];

  const halfYearlyData = [
    { name: 'H1', sales: halfYearlySales[0] },
    { name: 'H2', sales: halfYearlySales[1] },
  ];

  const yearlyData = yearlySales.map((sales, i) => ({
    name: (currentYear - i).toString(),
    sales
  })).reverse();

  let branchBreakdown: any[] = [];
  if (!effectiveBranchId) {
    const branchSalesMap = new Map();
    const branchProfitMap = new Map();

    const processBranch = (item: any) => {
      const bId = item.branchId || 'Unknown';
      const amount = Number(item.total);
      branchSalesMap.set(bId, (branchSalesMap.get(bId) || 0) + amount);

      let cost = 0;
      item.lines.forEach((l: any) => {
        cost += Number(l.quantity) * (productCostMap.get(l.productId) || 0);
      });
      branchProfitMap.set(bId, (branchProfitMap.get(bId) || 0) + (amount - cost));
    };

    posTx.forEach(processBranch);
    salesOrders.forEach(processBranch);

    const branches = await prisma.erpBranch.findMany({ select: { id: true, name: true } });
    const branchNames = new Map(branches.map(b => [b.id, b.name]));

    branchSalesMap.forEach((sales, bId) => {
      branchBreakdown.push({
        name: branchNames.get(bId) || 'Unknown Branch',
        sales: sales,
        profit: branchProfitMap.get(bId) || 0
      });
    });
    
    // Sort by sales descending
    branchBreakdown.sort((a, b) => b.sales - a.sales);
  }

  return ok({
    metrics: {
      totalSales,
      totalCost,
      grossProfit,
      grossProfitMargin: totalSales > 0 ? (grossProfit / totalSales) * 100 : 0,
      totalTransactions,
      basketValue,
    },
    monthlyData,
    quarterlyData,
    halfYearlyData,
    yearlyData,
    branchBreakdown
  });
}
