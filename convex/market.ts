import { action } from "./_generated/server";
import { v } from "convex/values";

// Yahoo Finance public endpoints — free, no API key.
// NSE symbols get .NS, BSE get .BO. Indices start with ^.
function toYahoo(symbol: string): string {
  const s = (symbol ?? "").trim().toUpperCase();
  if (!s) return s;
  if (s.includes(".") || s.startsWith("^")) return s;
  return `${s}.NS`;
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

interface YahooQuote {
  symbol?: string;
  shortname?: string;
  longname?: string;
  price?: number;
  exchDisp?: string;
}

async function yahooSearch(query: string): Promise<YahooQuote[]> {
  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(
    query
  )}&quotesCount=12&newsCount=0`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { quotes?: YahooQuote[] };
  return data.quotes ?? [];
}

export const search = action({
  args: { query: v.string() },
  handler: async (_ctx, { query }) => {
    const q = query.trim();
    if (q.length < 1) return [];
    const results = await yahooSearch(q);
    // Keep only NSE / BSE equities (drop forex, crypto, US names, futures…)
    const rows = results
      .filter((r) => typeof r.symbol === "string")
      .filter(
        (r) => r.symbol!.endsWith(".NS") || r.symbol!.endsWith(".BO")
      )
      .map((r) => ({
        symbol: r.symbol as string,
        name: r.shortname || r.longname || r.symbol || "",
        exchange: (r.symbol as string).endsWith(".BO") ? "BSE" : "NSE",
      }));
    return rows.slice(0, 12);
  },
});

export const quotes = action({
  args: { symbols: v.array(v.string()) },
  handler: async (_ctx, { symbols }) => {
    const unique = [...new Set(symbols.map(toYahoo).filter(Boolean))].slice(0, 40);
    if (!unique.length) return [];
    const results: Array<{ symbol: string; price: number | null; name?: string }> = [];
    for (const sym of unique) {
      try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
          sym
        )}?range=1d&interval=1d`;
        const res = await fetch(url, {
          headers: { "User-Agent": UA, Accept: "application/json" },
        });
        if (!res.ok) {
          results.push({ symbol: sym, price: null });
          continue;
        }
        const data = (await res.json()) as {
          chart?: {
            result?: Array<{
              meta?: {
                regularMarketPrice?: number;
                shortName?: string;
                symbol?: string;
              };
            }>;
          };
        };
        const meta = data.chart?.result?.[0]?.meta;
        const price = meta?.regularMarketPrice;
        results.push({
          symbol: meta?.symbol ?? sym,
          price: typeof price === "number" ? price : null,
          name: meta?.shortName,
        });
      } catch {
        results.push({ symbol: sym, price: null });
      }
    }
    return results;
  },
});
