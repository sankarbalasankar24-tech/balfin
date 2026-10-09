import { monthRange, monthKey, monthShift, monthLabel } from "./format";

export interface TxnRow {
  _id: string;
  kind: "expense" | "income" | "transfer";
  amount: number;
  categoryId?: string;
  toAccountId?: string;
  subcategory?: string;
  accountId?: string;
  note?: string;
  date: number;
  dedupeKey?: string;
}

export interface MonthAgg {
  income: number;
  expense: number;
  net: number;
  count: number;
  byCategorySpend: Array<{ id: string; name: string; amount: number; pct: number }>;
  byCategoryEarn: Array<{ id: string; name: string; amount: number; pct: number }>;
  bySubcategory: Array<{ key: string; name: string; amount: number }>;
  weekdaySpend: number[]; // 0=Sun..6=Sat
  dailyNet: Array<{ day: number; net: number }>;
}

export function aggregateMonth(
  txns: TxnRow[],
  catName: (id: string) => string,
  month: string
): MonthAgg {
  const { start, end } = monthRange(month);
  const rows = txns.filter((t) => t.date >= start && t.date < end);
  let income = 0,
    expense = 0;
  const spendMap = new Map<string, number>();
  const earnMap = new Map<string, number>();
  const subMap = new Map<string, number>();
  const weekday = [0, 0, 0, 0, 0, 0, 0];
  const daysInMonth = new Date(
    Number(month.slice(0, 4)),
    Number(month.slice(5, 7)),
    0
  ).getDate();
  const daily = Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1, net: 0 }));

  for (const t of rows) {
    if (t.kind === "transfer") continue; // account-to-account: not income/expense
    if (t.kind === "income") income += t.amount;
    else expense += t.amount;
    const map = t.kind === "income" ? earnMap : spendMap;
    map.set(t.categoryId!, (map.get(t.categoryId!) ?? 0) + t.amount);
    if (t.kind === "expense" && t.subcategory) {
      const key = `${catName(t.categoryId!)} › ${t.subcategory}`;
      subMap.set(key, (subMap.get(key) ?? 0) + t.amount);
    }
    const d = new Date(t.date);
    daily[d.getDate() - 1].net += t.kind === "income" ? t.amount : -t.amount;
    if (t.kind === "expense") weekday[d.getDay()] += t.amount;
  }

  const toPies = (m: Map<string, number>, total: number) =>
    [...m.entries()]
      .map(([id, amount]) => ({
        id,
        name: catName(id),
        amount,
        pct: total > 0 ? (amount / total) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

  return {
    income,
    expense,
    net: income - expense,
    count: rows.length,
    byCategorySpend: toPies(spendMap, expense),
    byCategoryEarn: toPies(earnMap, income),
    bySubcategory: [...subMap.entries()]
      .map(([key, amount]) => ({ key, name: key, amount }))
      .sort((a, b) => b.amount - a.amount),
    weekdaySpend: weekday,
    dailyNet: daily,
  };
}

export type Period = "month" | "3m" | "6m" | "1y" | "all";

export interface RangeAgg {
  start: number;
  end: number;
  label: string;
  income: number;
  expense: number;
  net: number;
  count: number;
  byCategorySpend: Array<{ id: string; name: string; amount: number; pct: number }>;
  byCategoryEarn: Array<{ id: string; name: string; amount: number; pct: number }>;
  series: Array<{ label: string; income: number; expense: number; net: number }>;
}

// Aggregation over any period: month (daily buckets), 3m/6m/1y/all (monthly buckets).
export function aggregateRange(
  txns: TxnRow[],
  catName: (id: string) => string,
  period: Period,
  anchorMonth: string
): RangeAgg {
  const anchor = monthRange(anchorMonth);
  let start: number;
  let end = anchor.end;
  let monthsBack: number;
  switch (period) {
    case "month":
      monthsBack = 0;
      break;
    case "3m":
      monthsBack = 2;
      break;
    case "6m":
      monthsBack = 5;
      break;
    case "1y":
      monthsBack = 11;
      break;
    case "all":
      monthsBack = 0;
      break;
  }
  if (period === "all") {
    let min = Date.now();
    for (const t of txns) if (t.date < min) min = t.date;
    start = txns.length ? new Date(new Date(min).getFullYear(), new Date(min).getMonth(), 1).getTime() : anchor.start;
  } else if (monthsBack > 0) {
    start = monthRange(monthShift(anchorMonth, -monthsBack)).start;
  } else {
    start = anchor.start;
  }

  const rows = txns.filter((t) => t.date >= start && t.date < end);
  let income = 0;
  let expense = 0;
  const spendMap = new Map<string, number>();
  const earnMap = new Map<string, number>();

  // monthly buckets between start and end
  const bucketKeys: string[] = [];
  if (period === "month") {
    // daily buckets
    const daysInMonth = new Date(
      Number(anchorMonth.slice(0, 4)),
      Number(anchorMonth.slice(5, 7)),
      0
    ).getDate();
    var series = Array.from({ length: daysInMonth }, (_, i) => ({
      label: String(i + 1),
      income: 0,
      expense: 0,
      net: 0,
    }));
    for (const t of rows) {
      const idx = new Date(t.date).getDate() - 1;
      if (series[idx] && t.kind !== "transfer") {
        if (t.kind === "income") series[idx].income += t.amount;
        else series[idx].expense += t.amount;
        series[idx].net = series[idx].income - series[idx].expense;
      }
    }
  } else {
    let k = anchorMonth;
    const back = period === "all" ? 0 : monthsBack;
    if (period === "all") {
      const firstKey = start ? monthKey(start) : anchorMonth;
      let cur = firstKey;
      while (cur <= anchorMonth && bucketKeys.length < 36) {
        bucketKeys.push(cur);
        cur = monthShift(cur, 1);
      }
    } else {
      for (let i = -back; i <= 0; i++) bucketKeys.push(monthShift(anchorMonth, i));
    }
    series = bucketKeys.map((key) => {
      const { start: s, end: e } = monthRange(key);
      let inc = 0;
      let exp = 0;
      for (const t of rows) {
        if (t.kind === "transfer") continue;
        if (t.date >= s && t.date < e) {
          if (t.kind === "income") inc += t.amount;
          else exp += t.amount;
        }
      }
      return { label: monthLabel(key).split(" ")[0].slice(0, 3), income: inc, expense: exp, net: inc - exp };
    });
  }

  for (const t of rows) {
    if (t.kind === "transfer") continue;
    if (t.kind === "income") income += t.amount;
    else expense += t.amount;
    const map = t.kind === "income" ? earnMap : spendMap;
    map.set(t.categoryId!, (map.get(t.categoryId!) ?? 0) + t.amount);
  }

  const toPies = (m: Map<string, number>, total: number) =>
    [...m.entries()]
      .map(([id, amount]) => ({
        id,
        name: catName(id),
        amount,
        pct: total > 0 ? (amount / total) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

  const label =
    period === "month"
      ? monthLabel(anchorMonth)
      : `${new Date(start).toLocaleDateString("en-IN", { month: "short", year: "numeric" })} → ${monthLabel(anchorMonth)}`;

  return {
    start,
    end,
    label,
    income,
    expense,
    net: income - expense,
    count: rows.length,
    byCategorySpend: toPies(spendMap, expense),
    byCategoryEarn: toPies(earnMap, income),
    series,
  };
}

export type SortKey = "date-desc" | "date-asc" | "amount-desc" | "amount-asc";

export function searchTxns(
  txns: TxnRow[],
  catName: (id: string) => string,
  opts: {
    q?: string;
    kind?: "all" | "expense" | "income" | "transfer";
    categoryId?: string;
    from?: number;
    to?: number;
    sort?: SortKey;
  }
): TxnRow[] {
  const q = opts.q?.trim().toLowerCase();
  const rows = txns.filter((t) => {
    if (opts.kind && opts.kind !== "all" && t.kind !== opts.kind) return false;
    if (opts.categoryId && t.categoryId !== opts.categoryId) return false;
    if (opts.from !== undefined && t.date < opts.from) return false;
    if (opts.to !== undefined && t.date >= opts.to + 86400000) return false;
    if (q) {
      const hay = `${t.note ?? ""} ${t.categoryId ? catName(t.categoryId) : "Transfer"} ${t.subcategory ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  switch (opts.sort) {
    case "date-asc":
      return rows.sort((a, b) => a.date - b.date);
    case "amount-desc":
      return rows.sort((a, b) => b.amount - a.amount || b.date - a.date);
    case "amount-asc":
      return rows.sort((a, b) => a.amount - b.amount || b.date - a.date);
    default:
      return rows.sort((a, b) => b.date - a.date);
  }
}
