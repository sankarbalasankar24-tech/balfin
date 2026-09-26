export const CURRENCIES: Record<string, { symbol: string; label: string }> = {
  INR: { symbol: "₹", label: "Indian Rupee" },
  USD: { symbol: "$", label: "US Dollar" },
  EUR: { symbol: "€", label: "Euro" },
  GBP: { symbol: "£", label: "British Pound" },
};

let currentCurrency = "INR";
export function setCurrency(code: string) {
  if (CURRENCIES[code]) currentCurrency = code;
}
export function currencyCode() {
  return currentCurrency;
}

export function fmtMoney(n: number, opts?: { sign?: boolean; compact?: boolean }): string {
  const symbol = CURRENCIES[currentCurrency]?.symbol ?? "₹";
  const abs = Math.abs(n);
  const sign = n < 0 ? "−" : opts?.sign ? "+" : "";
  if (opts?.compact && abs >= 100000) {
    if (abs >= 10000000) return `${sign}${symbol}${(abs / 10000000).toFixed(2)} Cr`;
    return `${sign}${symbol}${(abs / 100000).toFixed(2)} L`;
  }
  return `${sign}${symbol}${abs.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: abs % 1 !== 0 ? 2 : 0,
  })}`;
}

export function fmtDate(ms: number): string {
  return new Date(ms).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function fmtDateTime(ms: number): string {
  return new Date(ms).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function monthKey(ms: number | Date): string {
  const d = typeof ms === "number" ? new Date(ms) : ms;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

export function monthShift(key: string, delta: number): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return monthKey(d);
}

export function monthRange(key: string): { start: number; end: number } {
  const [y, m] = key.split("-").map(Number);
  return {
    start: new Date(y, m - 1, 1).getTime(),
    end: new Date(y, m, 1).getTime(),
  };
}

export function daysBetween(fromMs: number, toMs: number): number {
  return Math.max(0, Math.floor((toMs - fromMs) / 86400000));
}

export function isLongTerm(buyMs: number, refMs = Date.now()): boolean {
  return refMs - buyMs >= 365 * 86400000; // Indian LTCG rule
}
