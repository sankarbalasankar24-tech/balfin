import { isLongTerm, daysBetween } from "./format";

export interface StockRow {
  _id: string;
  symbol: string;
  name?: string;
  exchange?: string;
  quantity: number;
  bonuses?: number; // bonus shares credited — held at zero cost
  buyPrice: number;
  buyDate: number;
  buyCharges?: number;
  closed: boolean;
}

export interface ExitRow {
  _id: string;
  stockId: string;
  quantity: number;
  exitPrice: number;
  exitDate: number;
  charges?: number;
}

export interface DividendRow {
  _id: string;
  stockId: string;
  amount: number;
  date: number;
  note?: string;
}

export interface MFRow {
  _id: string;
  name: string;
  units: number;
  avgNav: number;
  navSymbol?: string;
  manualNav?: number;
  buyDate?: number;
}

export interface PositionSummary {
  stock: StockRow;
  exitedQty: number;
  remainingQty: number;
  bonuses: number;
  exits: ExitRow[];
  dividendRows: DividendRow[];
  dividends: number;
  realizedPL: number;
  realizedCharges: number;
  unrealizedPL: number | null;
  currentValue: number | null;
  investedRemaining: number;
  investedTotal: number;
  longTerm: boolean;
  daysHeld: number;
}

// Realized P&L per exit: (exitPrice - buyPrice) * qty - allocated charges.
// Buy charges are allocated across exits proportionally by quantity.
export function summarizePosition(
  stock: StockRow,
  exits: ExitRow[],
  dividends: DividendRow[],
  livePrice: number | null
): PositionSummary {
  const my = exits
    .filter((e) => e.stockId === stock._id)
    .sort((a, b) => a.exitDate - b.exitDate);
  const bonuses = stock.bonuses ?? 0;
  const exitedQty = my.reduce((s, e) => s + e.quantity, 0);
  const remainingQty = Math.max(0, stock.quantity + bonuses - exitedQty);
  const buyCharges = stock.buyCharges ?? 0;
  // Charges spread over bought + bonus units (bonus units carry no cost).
  const totalQty = Math.max(1, stock.quantity + bonuses);

  let realizedPL = 0;
  let realizedCharges = buyCharges;
  for (const e of my) {
    const buyAlloc = (buyCharges * e.quantity) / totalQty;
    const sellCharges = e.charges ?? 0;
    realizedCharges += sellCharges;
    realizedPL += (e.exitPrice - stock.buyPrice) * e.quantity - buyAlloc - sellCharges;
  }

  const divs = dividends.filter((d) => d.stockId === stock._id);
  const dividendTotal = divs.reduce((s, d) => s + d.amount, 0);

  const unrealizedPL =
    remainingQty > 0 && livePrice !== null
      ? (livePrice - stock.buyPrice) * remainingQty - (buyCharges * remainingQty) / totalQty
      : null;
  const currentValue = remainingQty > 0 && livePrice !== null ? livePrice * remainingQty : null;

  const lastExit = my.length > 0 ? my[my.length - 1] : undefined;
  const refDate = remainingQty > 0 ? Date.now() : lastExit?.exitDate ?? Date.now();

  return {
    stock,
    exitedQty,
    remainingQty,
    bonuses,
    exits: my,
    dividendRows: divs,
    dividends: dividendTotal,
    realizedPL,
    realizedCharges,
    unrealizedPL,
    currentValue,
    investedRemaining: remainingQty * stock.buyPrice,
    investedTotal: stock.quantity * stock.buyPrice,
    longTerm: isLongTerm(stock.buyDate, refDate),
    daysHeld: daysBetween(stock.buyDate, refDate),
  };
}

export interface PortfolioTotals {
  invested: number;
  currentValue: number;
  unrealizedPL: number | null;
  realizedPL: number;
  charges: number;
  dividends: number;
  longTermValue: number;
  shortTermValue: number;
  longTermPL: number | null;
  shortTermPL: number | null;
  // all-time (every rupee ever put in, incl. fully exited legs)
  investedAllTime: number;
  totalPL: number | null;
  totalGainPct: number | null;
  cagrPct: number | null;
  // combined (open + realized) per LT/ST section
  ltCombinedPL: number | null;
  stCombinedPL: number | null;
  ltInvested: number;
  stInvested: number;
}

// Money-weighted annualised return (CAGR) across all flows —
// buys/exits count from their own dates, dividends are payouts.
export function portfolioCagrPct(
  positions: PositionSummary[]
): number | null {
  let net = 0;
  let weighted = 0;
  const now = Date.now();
  for (const p of positions) {
    const buyMs = p.stock.buyDate;
    net -= p.stock.quantity * p.stock.buyPrice + (p.stock.buyCharges ?? 0);
    weighted +=
      (p.stock.quantity * p.stock.buyPrice + (p.stock.buyCharges ?? 0)) *
      ((now - buyMs) / (365 * 86400000));
    for (const e of p.exits) {
      const amt = e.exitPrice * e.quantity - (e.charges ?? 0);
      net += amt;
      weighted += amt * ((now - e.exitDate) / (365 * 86400000));
    }
    for (const d of p.dividendRows ?? []) {
      net += d.amount;
      weighted += d.amount * ((now - d.date) / (365 * 86400000));
    }
    if (p.remainingQty > 0 && p.currentValue !== null) {
      net += p.currentValue;
      weighted += p.currentValue * 1; // valued today
    }
  }
  if (weighted <= 0 || !isFinite(net)) return null;
  const cagr = (net / weighted) * 100;
  return isFinite(cagr) ? cagr : null;
}

export function portfolioTotals(positions: PositionSummary[]): PortfolioTotals {
  let invested = 0;
  let currentValue = 0;
  let hasLive = false;
  let realizedPL = 0;
  let charges = 0;
  let dividends = 0;
  let longTermValue = 0;
  let shortTermValue = 0;
  let ltPL = 0;
  let stPL = 0;
  let hasLT = false;
  let hasST = false;
  let ltRealized = 0;
  let stRealized = 0;
  let ltInvestedAll = 0;
  let stInvestedAll = 0;
  let investedAllTime = 0;

  for (const p of positions) {
    realizedPL += p.realizedPL;
    charges += p.realizedCharges;
    dividends += p.dividends;
    investedAllTime += p.investedTotal + (p.stock.buyCharges ?? 0);
    if (p.longTerm) {
      ltRealized += p.realizedPL;
      ltInvestedAll += p.investedTotal + (p.stock.buyCharges ?? 0);
    } else {
      stRealized += p.realizedPL;
      stInvestedAll += p.investedTotal + (p.stock.buyCharges ?? 0);
    }
    if (p.remainingQty > 0) {
      invested += p.investedRemaining;
      const val = p.currentValue ?? p.investedRemaining;
      currentValue += val;
      if (p.currentValue !== null) hasLive = true;
      const pl = p.unrealizedPL ?? 0;
      if (p.longTerm) {
        longTermValue += val;
        ltPL += pl;
        if (p.unrealizedPL !== null) hasLT = true;
      } else {
        shortTermValue += val;
        stPL += pl;
        if (p.unrealizedPL !== null) hasST = true;
      }
    }
  }

  const totalPL =
    hasLive || realizedPL !== 0 || dividends > 0
      ? (hasLive ? currentValue - invested : 0) + realizedPL + dividends
      : null;
  const cagr = portfolioCagrPct(positions);

  return {
    invested,
    currentValue,
    unrealizedPL: hasLive ? currentValue - invested : null,
    realizedPL,
    charges,
    dividends,
    longTermValue,
    shortTermValue,
    longTermPL: hasLT ? ltPL : null,
    shortTermPL: hasST ? stPL : null,
    investedAllTime,
    totalPL,
    totalGainPct:
      totalPL !== null && investedAllTime > 0
        ? (totalPL / investedAllTime) * 100
        : null,
    cagrPct: cagr,
    ltCombinedPL:
      hasLT || ltRealized !== 0 ? (hasLT ? ltPL : 0) + ltRealized : null,
    stCombinedPL:
      hasST || stRealized !== 0 ? (hasST ? stPL : 0) + stRealized : null,
    ltInvested: ltInvestedAll,
    stInvested: stInvestedAll,
  };
}

export function mfValue(f: MFRow, liveNav: number | null) {
  const nav = liveNav ?? f.manualNav ?? f.avgNav;
  const invested = f.units * f.avgNav;
  const value = f.units * nav;
  return { nav, invested, value, pl: value - invested };
}
