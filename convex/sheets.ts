import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// ---------- settings ----------

export const getConfig = query({
  handler: async (ctx) => {
    return await ctx.db.query("sheetSync").first();
  },
});

export const setEndpoint = mutation({
  args: { endpoint: v.string() },
  handler: async (ctx, { endpoint }) => {
    const url = endpoint.trim();
    if (url && !url.startsWith("https://script.google.com/")) {
      throw new Error("Paste the Apps Script Web app URL (https://script.google.com/...)");
    }
    const existing = await ctx.db.query("sheetSync").first();
    const patch = { endpoint: url || undefined, lastStatus: "pending" as const, lastError: undefined };
    if (existing) await ctx.db.patch(existing._id, patch);
    else await ctx.db.insert("sheetSync", patch);
  },
});

export const setBackupFrequency = mutation({
  args: { frequency: v.string() },
  handler: async (ctx, { frequency }) => {
    const existing = await ctx.db.query("sheetSync").first();
    const patch = { backupFrequency: frequency };
    if (existing) await ctx.db.patch(existing._id, patch);
    else await ctx.db.insert("sheetSync", patch);
  },
});

export const markStatus = mutation({
  args: { status: v.string(), error: v.optional(v.string()) },
  handler: async (ctx, { status, error }) => {
    const existing = await ctx.db.query("sheetSync").first();
    if (!existing) return;
    await ctx.db.patch(existing._id, {
      lastStatus: status,
      lastError: error,
      lastPushedAt: status === "synced" ? Date.now() : existing.lastPushedAt,
    });
  },
});

// ---------- payload builder ----------

function csvCell(v: unknown): string {
  const s = String(v ?? "");
  return `"${s.replace(/"/g, '""')}"`;
}

// One row per money movement across the whole ledger, tabulated so each
// category lands in its own Google Sheet column.
export const buildPayload = query({
  args: {},
  handler: async (ctx) => {
    const [accounts, cats, txns, stocks, exits, divs, mfs, deposits, flows] = await Promise.all([
      ctx.db.query("accounts").collect(),
      ctx.db.query("categories").collect(),
      ctx.db.query("transactions").withIndex("by_date").order("asc").collect(),
      ctx.db.query("stocks").collect(),
      ctx.db.query("stockExits").collect(),
      ctx.db.query("dividends").collect(),
      ctx.db.query("mutualFunds").collect(),
      ctx.db.query("deposits").collect(),
      ctx.db.query("depositFlows").collect(),
    ]);
    const budgets = await ctx.db.query("budgets").collect();

    const accName = new Map(accounts.map((a) => [a._id, a.name]));
    const catName = new Map(cats.map((c) => [c._id, c.name]));
    const depName = new Map(deposits.map((d) => [d._id, `${d.kind.toUpperCase()} · ${d.name}`]));
    const stockName = new Map(stocks.map((s) => [s._id, s.name ? `${s.symbol} · ${s.name}` : s.symbol]));
    const dt = (ms: number) => new Date(ms).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

    type Row = (string | number)[];
    const rows: Row[] = [];

    // Transactions: Date | Type | Category | Subcategory | Account | Description | Debit | Credit
    for (const t of txns) {
      rows.push([
        dt(t.date),
        t.kind === "income" ? "Income" : "Expense",
        catName.get(t.categoryId) ?? "Unknown",
        t.subcategory ?? "",
        t.accountId ? accName.get(t.accountId) ?? "" : "",
        t.note ?? "",
        t.kind === "expense" ? t.amount : "",
        t.kind === "income" ? t.amount : "",
      ]);
    }

    // Stock buys: Date | Type | Category | Description | Debit
    for (const s of stocks) {
      rows.push([
        dt(s.buyDate),
        "Investment",
        "Stock — Buy",
        `${stockName.get(s._id) ?? s.symbol} — ${s.quantity} qty @ ${s.buyPrice}`,
        "",
        "",
        s.quantity * s.buyPrice + (s.buyCharges ?? 0),
        "",
      ]);
    }
    // Stock exits
    for (const e of exits) {
      rows.push([
        dt(e.exitDate),
        "Investment",
        "Stock — Sell",
        `${stockName.get(e.stockId) ?? e.stockId} — ${e.quantity} qty @ ${e.exitPrice}`,
        "",
        "",
        "",
        e.exitPrice * e.quantity - (e.charges ?? 0),
      ]);
    }
    // Dividends
    for (const d of divs) {
      rows.push([dt(d.date), "Investment", "Dividend", stockName.get(d.stockId) ?? d.stockId, "", d.note ?? "", "", d.amount]);
    }
    // Mutual funds
    for (const f of mfs) {
      rows.push([
        dt(f.buyDate ?? Date.now()),
        "Investment",
        "Mutual Fund",
        `${f.name} — ${f.units} units @ NAV ${f.avgNav}`,
        "",
        "",
        f.units * f.avgNav,
        "",
      ]);
    }
    // Deposits + flows
    for (const d of deposits) {
      rows.push([
        dt(d.startDate ?? Date.now()),
        "Investment",
        `${d.kind.toUpperCase()} — Opened`,
        `${d.name}${d.institution ? ` (${d.institution})` : ""}${d.ratePct ? ` @ ${d.ratePct}%` : ""}`,
        "",
        "",
        "",
        "",
      ]);
    }
    for (const f of flows) {
      rows.push([
        dt(f.date),
        "Investment",
        depName.get(f.depositId) ?? "Deposit",
        `${f.type === "withdrawal" ? "Withdrawal" : f.type === "interest" ? "Interest credit" : "Deposit"}`,
        "",
        f.note ?? "",
        f.type === "withdrawal" ? f.amount : "",
        f.type === "withdrawal" ? "" : f.amount,
      ]);
    }

    // Monthly summary block (second table inside the same sheet tab)
    const monthMap = new Map<string, { inc: number; exp: number }>();
    for (const t of txns) {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const cur = monthMap.get(key) ?? { inc: 0, exp: 0 };
      if (t.kind === "income") cur.inc += t.amount;
      else cur.exp += t.amount;
      monthMap.set(key, cur);
    }
    const budgetByMonth = new Map(budgets.map((b) => [b.month, b]));
    const months = [...monthMap.keys()].sort();
    const summary: Row[] = months.map((mkey) => {
      const agg = monthMap.get(mkey)!;
      const b = budgetByMonth.get(mkey);
      return [
        mkey,
        agg.inc,
        agg.exp,
        agg.inc - agg.exp,
        b?.expenseBudget ?? "",
        b?.savingsGoal ?? "",
      ];
    });

    return {
      txns: {
        headers: ["Date", "Type", "Category", "Subcategory", "Account", "Description", "Debit", "Credit"],
        rows: rows.map((r) => r.map((c) => (typeof c === "number" ? Math.round(c * 100) / 100 : c))),
      },
      summary: {
        headers: ["Month", "Income", "Expense", "Net", "Budget", "Savings goal"],
        rows: summary.map((r) => r.map((c) => (typeof c === "number" ? Math.round(c * 100) / 100 : c))),
      },
      accounts: accounts.map((a) => ({ name: a.name, type: a.type, bankName: a.bankName ?? "", openingBalance: a.openingBalance })),
      generatedAt: Date.now(),
    };
  },
});

// ---------- push ----------

export const pushToSheet = action({
  args: {},
  handler: async (ctx) => {
    const cfg = await ctx.runQuery(api.sheets.getConfig);
    if (!cfg?.endpoint) throw new Error("No Sheets endpoint configured");
    const payload = await ctx.runQuery(api.sheets.buildPayload, {});
    const res = await fetch(cfg.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Sheets responded ${res.status}: ${text.slice(0, 200)}`);
    }
  },
});

// Scheduled auto-backup: a Convex cron (crons.ts) calls this every evening
// IST; it pushes when today matches the user's chosen cadence.
export const scheduledSync = action({
  args: {},
  handler: async (ctx) => {
    const cfg = await ctx.runQuery(api.sheets.getConfig);
    if (!cfg?.endpoint) return; // nothing linked yet
    const freq = cfg.backupFrequency ?? "daily";
    // Evaluate the cadence in IST (UTC+5:30) so "daily" means the same
    // evening regardless of the deployment's clock.
    const ist = new Date(Date.now() + 5.5 * 3600 * 1000);
    const dow = ist.getUTCDay(); // 0 = Sunday
    const dom = ist.getUTCDate(); // 1..31
    if (freq === "weekly" && dow !== 0) return;
    if (freq === "monthly" && dom !== 1) return;
    try {
      await ctx.runAction(api.sheets.pushToSheet, {});
      await ctx.runMutation(api.sheets.markStatus, { status: "synced" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await ctx.runMutation(api.sheets.markStatus, { status: "error", error: msg });
    }
  },
});

// Push + record status; called after every data mutation and by the manual button.
export const syncNow = action({
  args: {},
  handler: async (ctx) => {
    try {
      await ctx.runAction(api.sheets.pushToSheet, {});
      await ctx.runMutation(api.sheets.markStatus, { status: "synced" });
      return "synced";
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await ctx.runMutation(api.sheets.markStatus, { status: "error", error: msg });
      throw err;
    }
  },
});
