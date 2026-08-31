import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, unauthorized, ok, badRequest } from '@/lib/api';

async function getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number> {
  if (fromCurrency === toCurrency) return 1;
  const rate = await prisma.currencyRate.findFirst({
    where: { fromCurrency, toCurrency },
    orderBy: { date: 'desc' },
  });
  return rate ? Number(rate.rate) : 0;
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  try {
    const now = new Date();
    const periodStart = startDate ? new Date(startDate) : new Date(now.getFullYear(), 0, 1);
    const periodEnd = endDate ? new Date(endDate) : now;

    // Fetch exchange rates
    const zwdRate = await getExchangeRate('ZWD', 'USD');
    const zarRate = await getExchangeRate('ZAR', 'USD');

    // Fetch all tax transactions in the period
    const taxTransactions = await prisma.taxTransaction.findMany({
      where: { createdAt: { gte: periodStart, lte: periodEnd } },
      include: { taxType: true },
    });

    // Group by currency
    const byCurrency: Record<string, { taxableSupply: number; vatCollected: number; taxableAcquisition: number; vatRecoverable: number }> = {};

    for (const txn of taxTransactions) {
      const curr = txn.currency || 'USD';
      if (!byCurrency[curr]) {
        byCurrency[curr] = { taxableSupply: 0, vatCollected: 0, taxableAcquisition: 0, vatRecoverable: 0 };
      }

      const taxableAmt = Number(txn.taxableAmount);
      const taxAmt = Number(txn.taxAmount);
      const cat = (txn.taxType?.category || '').toLowerCase();

      if (cat.includes('output') || cat.includes('sales') || cat.includes('collected')) {
        byCurrency[curr].taxableSupply += taxableAmt;
        byCurrency[curr].vatCollected += taxAmt;
      } else if (cat.includes('input') || cat.includes('purchase') || cat.includes('recoverable')) {
        byCurrency[curr].taxableAcquisition += taxableAmt;
        byCurrency[curr].vatRecoverable += taxAmt;
      } else {
        // Default: treat as output if positive tax, input if negative
        if (taxAmt >= 0) {
          byCurrency[curr].taxableSupply += taxableAmt;
          byCurrency[curr].vatCollected += taxAmt;
        } else {
          byCurrency[curr].taxableAcquisition += taxableAmt;
          byCurrency[curr].vatRecoverable += Math.abs(taxAmt);
        }
      }
    }

    const buildCurrencyData = (curr: string, rate: number) => {
      const raw = byCurrency[curr] || { taxableSupply: 0, vatCollected: 0, taxableAcquisition: 0, vatRecoverable: 0 };
      const netVAT = raw.vatCollected - raw.vatRecoverable;
      return {
        currency: curr,
        taxableSupply: Math.round(raw.taxableSupply * 100) / 100,
        vatCollected: Math.round(raw.vatCollected * 100) / 100,
        taxableAcquisition: Math.round(raw.taxableAcquisition * 100) / 100,
        vatRecoverable: Math.round(raw.vatRecoverable * 100) / 100,
        netVAT: Math.round(netVAT * 100) / 100,
        exchangeRate: rate,
      };
    };

    const usd = buildCurrencyData('USD', 1);
    const zwd = buildCurrencyData('ZWD', zwdRate);
    const zar = buildCurrencyData('ZAR', zarRate);

    // Total in USD
    const toUSD = (amount: number, rate: number) => rate > 0 ? amount * rate : amount;
    const totalInUSD = {
      taxableSupply: Math.round((toUSD(usd.taxableSupply, 1) + toUSD(zwd.taxableSupply, zwdRate) + toUSD(zar.taxableSupply, zarRate)) * 100) / 100,
      vatCollected: Math.round((toUSD(usd.vatCollected, 1) + toUSD(zwd.vatCollected, zwdRate) + toUSD(zar.vatCollected, zarRate)) * 100) / 100,
      taxableAcquisition: Math.round((toUSD(usd.taxableAcquisition, 1) + toUSD(zwd.taxableAcquisition, zwdRate) + toUSD(zar.taxableAcquisition, zarRate)) * 100) / 100,
      vatRecoverable: Math.round((toUSD(usd.vatRecoverable, 1) + toUSD(zwd.vatRecoverable, zwdRate) + toUSD(zar.vatRecoverable, zarRate)) * 100) / 100,
      netVAT: Math.round((toUSD(usd.netVAT, 1) + toUSD(zwd.netVAT, zwdRate) + toUSD(zar.netVAT, zarRate)) * 100) / 100,
    };

    const data = {
      usd,
      zwd,
      zar,
      totalInUSD,
      period: startDate && endDate ? `${startDate} to ${endDate}` : `${periodStart.toISOString().slice(0, 10)} to ${periodEnd.toISOString().slice(0, 10)}`,
    };

    return ok(data);
  } catch (error) {
    console.error('Failed to fetch VAT report', error);
    return badRequest('Failed to fetch VAT report');
  }
}
