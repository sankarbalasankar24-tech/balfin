import { isLongTerm, daysBetween } from "./format";

export interface StockRow {
  _id: string;
  symbol: string;
  name?: string;
  exchange?: string;
  quantity: number;
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
  exits: ExitRow[];
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
  const exitedQty = my.reduce((s, e) => s + e.quantity, 0);
  const remainingQty = Math.max(0, stock.quantity - exitedQty);
  const buyCharges = stock.buyCharges ?? 0;
  const totalQty = Math.max(1, stock.quantity);

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
    exits: my,
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

  for (const p of positions) {
    realizedPL += p.realizedPL;
    charges += p.realizedCharges;
    dividends += p.dividends;
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
  };
}

export function mfValue(f: MFRow, liveNav: number | null) {
  const nav = liveNav ?? f.manualNav ?? f.avgNav;
  const invested = f.units * f.avgNav;
  const value = f.units * nav;
  return { nav, invested, value, pl: value - invested };
}
