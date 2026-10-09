import { useMemo, useState } from "react";
import { useFinance } from "@/finance/FinanceContext";
import AppShell, { useEntryEdit } from "@/finance/AppShell";
import { fmtMoney, fmtDate, monthKey } from "@/finance/format";
import { searchTxns, aggregateMonth, type SortKey } from "@/finance/analytics";
import { CatIcon } from "@/finance/icons";
import { Search, X, CalendarDays, ArrowDownUp, TrendingUp, ArrowUpNarrowWide, ArrowDownWideNarrow, ArrowLeftRight } from "lucide-react";

export default function Ledger() {
  const { ready, transactions, categories, catName, accountName } = useFinance();
  const { openEntry } = useEntryEdit();

  const [q, setQ] = useState("");
  const [kind, setKind] = useState<"all" | "expense" | "income">("all");
  const [catId, setCatId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState<SortKey>("date-desc");

  const results = useMemo(
    () =>
      searchTxns(transactions, catName, {
        q,
        kind,
        categoryId: catId || undefined,
        from: from ? new Date(from).getTime() : undefined,
        to: to ? new Date(to).getTime() : undefined,
        sort,
      }),
    [transactions, catName, q, kind, catId, from, to, sort]
  );

  const groups = useMemo(() => {
    const map = new Map<string, typeof results>();
    for (const t of results) {
      const key = new Date(t.date).toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return [...map.entries()];
  }, [results]);

  const groupNet = (rows: typeof results) =>
    rows.reduce((s, t) => s + (t.kind === "income" ? t.amount : t.kind === "expense" ? -t.amount : 0), 0);

  const totals = useMemo(() => {
    let inc = 0, exp = 0;
    for (const t of results) {
      if (t.kind === "income") inc += t.amount;
      else if (t.kind === "expense") exp += t.amount;
    }
    return { inc, exp, net: inc - exp };
  }, [results]);

  // month-end forecast: if the month's pace holds, where does net land?
  const forecast = useMemo(() => {
    const month = monthKey(Date.now());
    const agg = aggregateMonth(transactions, catName, month);
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const elapsed = now.getDate();
    if (elapsed < 1) return null;
    const dailyBurn = agg.expense / elapsed;
    const dailyEarn = agg.income / elapsed;
    const projExpense = dailyBurn * daysInMonth;
    const projIncome = dailyEarn * daysInMonth;
    return { projNet: projIncome - projExpense, projExpense, daysLeft: daysInMonth - elapsed };
  }, [transactions, catName]);

  const activeFilters = Boolean(catId || from || to);

  const renderRow = (t: (typeof results)[number]) => (
    <button key={t._id} onClick={() => openEntry(t._id)} className="flex w-full items-center justify-between text-left active:opacity-80">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border ${
            t.kind === "income"
              ? "border-primary/20 bg-primary/10 text-primary-bright"
              : t.kind === "transfer"
                ? "border-secondary/30 bg-secondary-deep/20 text-secondary"
                : "border-tertiary-deep/30 bg-tertiary-deep/15 text-tertiary-deep"
          }`}
        >
          {t.kind === "transfer" ? <ArrowLeftRight size={17} /> : <CatIcon name={categories.find((c) => c._id === t.categoryId)?.icon} size={17} />}
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold leading-tight">
              {t.note || (t.kind === "transfer" ? "Account transfer" : t.categoryId ? catName(t.categoryId) : "Entry")}
            </p>
            <span
              className={`flex-shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
                t.kind === "income"
                  ? "bg-primary/20 text-primary-bright"
                  : t.kind === "transfer"
                    ? "bg-secondary-deep/30 text-secondary"
                    : "bg-tertiary-deep/20 text-tertiary"
              }`}
            >
              {t.kind === "income" ? "Income" : t.kind === "transfer" ? "Transfer" : t.categoryId ? catName(t.categoryId) : "Entry"}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-ink-faint">
            {t.kind === "transfer" && t.accountId && t.toAccountId && (
              <span className="truncate">
                {accountName(t.accountId)} → {accountName(t.toAccountId)}
              </span>
            )}
            {t.kind !== "transfer" && t.subcategory && <span>{t.subcategory}</span>}
            {t.kind !== "transfer" && t.accountId && (
              <>
                {t.subcategory && <span className="text-ink-faint/50">•</span>}
                <span>{accountName(t.accountId)}</span>
              </>
            )}
            <span className="text-ink-faint/50">•</span>
            <span>
              {new Date(t.date).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true })}
            </span>
          </div>
        </div>
      </div>
      <div className="text-right">
        <span
          className={`text-sm font-bold tabular ${
            t.kind === "income" ? "text-primary-bright" : t.kind === "transfer" ? "text-ink-faint" : "text-ink"
          }`}
        >
          {t.kind === "income" ? "+" : t.kind === "expense" ? "−" : "→"}
          {fmtMoney(t.amount)}
        </span>
      </div>
    </button>
  );

  return (
    <AppShell title="Ledger" subtitle="Search every entry — keyword, category or date">
      {/* search bar with kinetic accent */}
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search notes, categories, accounts…"
          className="w-full rounded-full border border-white/10 bg-surface-low py-3 pl-11 pr-10 text-sm outline-none transition-all placeholder:text-ink-faint focus:border-primary focus:ring-1 focus:ring-primary"
        />
        {q && (
          <button onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint" aria-label="Clear">
            <X size={15} />
          </button>
        )}
      </div>

      {/* filter pill carousel */}
      <div className="no-scrollbar mt-2 flex items-center gap-2 overflow-x-auto py-1">
        {(["all", "expense", "income"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={`flex-shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold capitalize transition active:scale-[0.98] ${
              kind === k
                ? k === "expense"
                  ? "border-tertiary-deep/40 bg-tertiary-deep/20 text-tertiary"
                  : k === "income"
                    ? "border-primary/30 bg-primary/15 text-primary-bright"
                    : "border-primary/30 bg-primary/15 text-primary-bright"
                : "border-white/10 bg-card text-ink"
            }`}
          >
            {k === "all" ? "All entries" : k}
          </button>
        ))}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`ml-auto flex flex-shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition active:scale-[0.98] ${
            activeFilters ? "border-secondary/40 bg-secondary-deep/30 text-secondary" : "border-white/10 bg-card text-ink"
          }`}
        >
          <ArrowDownUp size={13} className="text-secondary" />
          Filters
        </button>
      </div>

      {/* sort: date and amount, both bidirectional */}
      <div className="no-scrollbar flex items-center gap-2 overflow-x-auto py-1">
        <span className="flex-shrink-0 text-[10px] font-bold uppercase tracking-wider text-ink-faint">Sort</span>
        <button
          onClick={() => setSort(sort === "date-desc" ? "date-asc" : "date-desc")}
          className={`flex flex-shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition active:scale-[0.98] ${
            sort.startsWith("date") ? "border-primary/30 bg-primary/15 text-primary-bright" : "border-white/10 bg-card text-ink"
          }`}
        >
          Date {sort === "date-desc" ? <ArrowDownWideNarrow size={12} /> : <ArrowUpNarrowWide size={12} />}
        </button>
        <button
          onClick={() => setSort(sort === "amount-desc" ? "amount-asc" : "amount-desc")}
          className={`flex flex-shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition active:scale-[0.98] ${
            sort.startsWith("amount") ? "border-primary/30 bg-primary/15 text-primary-bright" : "border-white/10 bg-card text-ink"
          }`}
        >
          Amount {sort === "amount-desc" ? <ArrowDownWideNarrow size={12} /> : <ArrowUpNarrowWide size={12} />}
        </button>
      </div>

      {showFilters && (
        <div className="animate-fade relative z-20 mt-2 grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-surface-low p-2.5 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.5)]">
          <select value={catId} onChange={(e) => setCatId(e.target.value)} className="rounded-xl border border-white/10 bg-card px-3 py-2 text-xs [color-scheme:dark]">
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-1.5">
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-xl border border-white/10 bg-card px-2 py-2 text-xs [color-scheme:dark]" />
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-xl border border-white/10 bg-card px-2 py-2 text-xs [color-scheme:dark]" />
          </div>
        </div>
      )}

      {/* summary metric strip */}
      <div className="mt-3 flex items-center justify-between rounded-2xl border border-white/10 bg-surface-low p-3.5">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-card-high text-primary">
            <Search size={14} />
          </span>
          <div>
            <p className="text-[11px] text-ink-faint">Active selection</p>
            <p className="text-xs font-semibold">{results.length} transactions</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-ink-faint">Net delta</p>
          <p className={`text-sm font-bold tracking-tight tabular ${totals.net >= 0 ? "text-primary-bright" : "text-tertiary"}`}>
            {fmtMoney(totals.net, { sign: true })}
          </p>
        </div>
      </div>

      {/* month-end forecast strip */}
      {forecast && !activeFilters && !q && kind === "all" && (
        <div className="mt-3 flex items-center justify-between rounded-2xl border border-secondary-deep/40 bg-card p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary-deep/30 text-secondary">
              <TrendingUp size={17} />
            </span>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">Month-End Forecast</span>
              <p className="mt-0.5 text-xs">
                Projected net:{" "}
                <span className={`font-bold ${forecast.projNet >= 0 ? "text-primary-bright" : "text-tertiary"}`}>
                  {fmtMoney(forecast.projNet, { sign: true, compact: true })}
                </span>{" "}
                if pace holds
              </p>
            </div>
          </div>
          <span className="flex items-center gap-1 text-[10px] text-ink-faint">
            <CalendarDays size={12} /> {forecast.daysLeft}d left
          </span>
        </div>
      )}

      {/* transaction feed — day-grouped for date sorts, flat for amount sorts */}
      <div className="mt-3 space-y-3">
        {!ready ? (
          <p className="py-16 text-center text-sm text-ink-faint">Loading…</p>
        ) : results.length === 0 ? (
          <p className="py-16 text-center text-sm text-ink-faint">Nothing matches this search.</p>
        ) : sort.startsWith("amount") ? (
          <div className="space-y-3 rounded-2xl border border-white/5 bg-card p-3 shadow-[0_4px_16px_-2px_rgba(0,0,0,0.35)]">
            {results.map((t, i) => (
              <div key={t._id}>
                {i > 0 && <div className="mb-3 border-t border-white/5" />}
                {renderRow(t)}
              </div>
            ))}
          </div>
        ) : (
          groups.map(([day, rows]) => {
            const net = groupNet(rows);
            const isToday = day === new Date().toDateString();
            return (
              <section key={day} className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-xs font-semibold text-ink-faint">
                    {isToday ? "Today" : fmtDate(rows[0].date)}
                  </h2>
                  <span className={`text-[11px] font-bold tabular ${net >= 0 ? "text-primary-bright" : "text-ink-faint"}`}>
                    {fmtMoney(net, { sign: true })} Net
                  </span>
                </div>
                <div className="space-y-3 rounded-2xl border border-white/5 bg-card p-3 shadow-[0_4px_16px_-2px_rgba(0,0,0,0.35)]">
                  {rows.map((t, i) => (
                    <div key={t._id}>
                      {i > 0 && <div className="mb-3 border-t border-white/5" />}
                      {renderRow(t)}
                    </div>
                  ))}
                </div>
              </section>
            );
          })
        )}
      </div>
    </AppShell>
  );
}
