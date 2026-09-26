import { useMemo, useState } from "react";
import { useFinance } from "@/finance/FinanceContext";
import AppShell, { useEntryEdit } from "@/finance/AppShell";
import { fmtMoney, monthKey, monthLabel, monthShift } from "@/finance/format";
import { aggregateMonth, aggregateRange, type Period } from "@/finance/analytics";
import { portfolioTotals, mfValue, summarizePosition } from "@/finance/portfolio";
import { SpendEarnArea, CategoryPie, WeekdayBars, PIE_COLORS } from "@/finance/ChartBits";
import { CatIcon } from "@/finance/icons";
import { ChevronLeft, ChevronRight, Wallet, LineChart, Eye, EyeOff } from "lucide-react";

const TABS = ["Overview", "Patterns", "Recent"] as const;
const PERIODS: Array<{ key: Period; label: string }> = [
  { key: "month", label: "Month" },
  { key: "3m", label: "3M" },
  { key: "6m", label: "6M" },
  { key: "1y", label: "1Y" },
  { key: "all", label: "All" },
];

export default function Overview() {
  const {
    ready, transactions, categories, budgets, accounts, stocks, exits, dividends,
    mutualFunds, quotes, catName, accountName,
  } = useFinance();
  const { openEntry } = useEntryEdit();
  const [month, setMonth] = useState(monthKey(Date.now()));
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
  const [period, setPeriod] = useState<Period>("month");
  const [hide, setHide] = useState(false);

  const agg = useMemo(() => aggregateMonth(transactions, catName, month), [transactions, catName, month]);
  const prevKey = monthShift(month, -1);
  const prev = useMemo(() => aggregateMonth(transactions, catName, prevKey), [transactions, catName, prevKey]);
  const range = useMemo(
    () => aggregateRange(transactions, catName, period, month),
    [transactions, catName, period, month]
  );

  // portfolio
  const positions = useMemo(
    () => stocks.map((s) => summarizePosition(s, exits, dividends, quotes[s.symbol] ?? null)),
    [stocks, exits, dividends, quotes]
  );
  const portfolio = useMemo(() => portfolioTotals(positions), [positions]);
  const combinedPL =
    portfolio.unrealizedPL === null && portfolio.realizedPL === 0
      ? null
      : (portfolio.unrealizedPL ?? 0) + portfolio.realizedPL;
  const ltCombined =
    portfolio.longTermPL === null && portfolio.realizedPL === 0
      ? null
      : (portfolio.longTermPL ?? 0) + portfolio.realizedPL;

  const mfTotals = useMemo(() => {
    let invested = 0, value = 0;
    for (const f of mutualFunds) {
      const v = mfValue(f, f.navSymbol ? quotes[f.navSymbol] ?? null : null);
      invested += v.invested;
      value += v.value;
    }
    return { invested, value };
  }, [mutualFunds, quotes]);

  const accountBalances = useMemo(() => {
    let bal = 0;
    for (const a of accounts) {
      let flow = 0;
      for (const t of transactions) if (t.accountId === a._id) flow += t.kind === "income" ? t.amount : -t.amount;
      bal += a.openingBalance + flow;
    }
    return bal;
  }, [accounts, transactions]);

  const allTimeIncome = transactions.filter((t) => t.kind === "income").reduce((s, t) => s + t.amount, 0);
  const totalWorth = accountBalances + portfolio.currentValue + mfTotals.value;
  const investmentsValue = portfolio.currentValue + mfTotals.value;

  const budget = budgets.find((b) => b.month === month);
  const incomeGoal = budget?.incomeGoal ?? 0;
  const spendLimit = budget?.expenseBudget ?? 0;
  const savingsGoal = budget?.savingsGoal ?? 0;

  const netTrend = (() => {
    const delta = agg.net - prev.net;
    const pct = prev.net !== 0 ? (delta / Math.abs(prev.net)) * 100 : 0;
    return { delta, pct };
  })();
  const upDown = (n: number) => (
    <span className={n >= 0 ? "text-income" : "text-expense"}>
      {n >= 0 ? "▲" : "▼"} {Math.abs(n).toFixed(0)}%
    </span>
  );

  if (!ready) {
    return (
      <AppShell title="Overview" subtitle="Loading…">
        <div className="py-20 text-center text-sm text-ink-faint">Connecting to your database…</div>
      </AppShell>
    );
  }

  const m = (v: string) => (hide ? "••••" : v);

  return (
    <AppShell title="Overview" subtitle={period === "month" ? monthLabel(month) : range.label}>
      {/* month switcher */}
      <div className="mb-3 flex items-center justify-between">
        <button onClick={() => setMonth(monthShift(month, -1))} className="rounded-full p-2 hover:bg-surface-2" aria-label="Previous month">
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-medium">{monthLabel(month)}</span>
        <button
          onClick={() => setMonth(monthShift(month, 1))}
          disabled={month >= monthKey(Date.now())}
          className="rounded-full p-2 hover:bg-surface-2 disabled:opacity-30"
          aria-label="Next month"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* hero */}
      <section className="card relative overflow-hidden p-5">
        <div className="absolute right-3 top-3">
          <button onClick={() => setHide(!hide)} className="rounded-full p-1.5 text-ink-faint hover:bg-surface-2" aria-label="Toggle privacy">
            {hide ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
        <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Net flow this month</p>
        <p className="mt-1 font-display text-4xl font-semibold tabular">{m(fmtMoney(agg.net, { sign: true }))}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-income/10 px-3 py-1 text-xs font-medium text-income tabular">↑ {m(fmtMoney(agg.income))}</span>
          <span className="rounded-full bg-expense/10 px-3 py-1 text-xs font-medium text-expense tabular">↓ {m(fmtMoney(agg.expense))}</span>
          <span className="rounded-full bg-surface-2 px-3 py-1 text-xs text-ink-faint">{agg.count} entries</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl bg-surface-2 px-3 py-2">
            vs {monthLabel(prevKey).split(" ")[0]}: {upDown(netTrend.pct)} {fmtMoney(netTrend.delta, { sign: true })}
          </div>
          <div className="rounded-xl bg-surface-2 px-3 py-2">
            {budget ? (agg.expense <= spendLimit ? "✓ Budget met" : "Over budget") : "No budget set"}
          </div>
        </div>
        {savingsGoal > 0 && (
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-xs text-ink-soft">
              <span>Savings goal</span>
              <span className="tabular">{fmtMoney(Math.max(0, agg.net))} / {fmtMoney(savingsGoal)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full bg-income" style={{ width: `${Math.min(100, (Math.max(0, agg.net) / savingsGoal) * 100)}%` }} />
            </div>
          </div>
        )}
      </section>

      {/* all-time snapshot */}
      <section className="card mt-3 p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">All-time position</p>
        <p className="mt-1 font-display text-3xl font-semibold tabular">{m(fmtMoney(totalWorth, { compact: true }))}</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-surface-2 p-3">
            <div className="flex items-center gap-1.5 text-xs text-ink-soft"><Wallet size={13} /> Liquid funds</div>
            <p className="mt-1 text-lg font-semibold tabular">{m(fmtMoney(accountBalances, { compact: true }))}</p>
            <p className="text-[11px] text-ink-faint">{allTimeIncome > 0 ? `Lifetime in ${fmtMoney(allTimeIncome, { compact: true })}` : "Accounts + cash flow"}</p>
          </div>
          <div className="rounded-xl bg-surface-2 p-3">
            <div className="flex items-center gap-1.5 text-xs text-ink-soft"><LineChart size={13} /> Investments</div>
            <p className="mt-1 text-lg font-semibold tabular">{m(fmtMoney(investmentsValue, { compact: true }))}</p>
            <p className="text-[11px] text-ink-faint">Stocks + funds at live prices</p>
          </div>
        </div>
      </section>

      {/* investment P&L card — combined + split */}
      <section className="card mt-3 p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Investment P&L</p>
        <div className="mt-1 flex items-baseline justify-between">
          <p className={`font-display text-2xl font-semibold tabular ${(combinedPL ?? 0) >= 0 ? "text-income" : "text-expense"}`}>
            {combinedPL === null ? "—" : m(fmtMoney(combinedPL, { sign: true, compact: true }))}
          </p>
          <span className="text-[11px] text-ink-faint">long + short · realized + unrealized</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-surface-2 p-2.5 text-center">
            <p className="text-[11px] text-ink-faint">Long term (≥ 1 yr)</p>
            <p className={`text-sm font-semibold tabular ${(portfolio.longTermPL ?? 0) >= 0 ? "text-income" : "text-expense"}`}>
              {portfolio.longTermPL === null ? "—" : fmtMoney(portfolio.longTermPL, { sign: true, compact: true })}
            </p>
            <p className={`text-[11px] tabular ${ltCombined !== null && ltCombined >= 0 ? "text-income" : "text-expense"}`}>
              incl. realized {ltCombined === null ? "—" : fmtMoney(ltCombined, { sign: true, compact: true })}
            </p>
          </div>
          <div className="rounded-xl bg-surface-2 p-2.5 text-center">
            <p className="text-[11px] text-ink-faint">Short term</p>
            <p className={`text-sm font-semibold tabular ${(portfolio.shortTermPL ?? 0) >= 0 ? "text-income" : "text-expense"}`}>
              {portfolio.shortTermPL === null ? "—" : fmtMoney(portfolio.shortTermPL, { sign: true, compact: true })}
            </p>
            <p className="text-[11px] text-ink-faint">held &lt; 365 days</p>
          </div>
        </div>
      </section>

      {/* tabs */}
      <div className="mt-4 grid grid-cols-3 gap-1 rounded-xl bg-surface-2 p-1">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-lg py-2 text-sm font-medium transition ${tab === t ? "bg-card text-ink shadow-sm" : "text-ink-soft"}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="mt-3 space-y-3">
        {tab === "Overview" && (
          <>
            {/* period switcher */}
            <div className="grid grid-cols-5 gap-1 rounded-xl bg-surface-2 p-1">
              {PERIODS.map((p) => (
                <button key={p.key} onClick={() => setPeriod(p.key)} className={`rounded-lg py-1.5 text-xs font-medium transition ${period === p.key ? "bg-card text-ink shadow-sm" : "text-ink-soft"}`}>
                  {p.label}
                </button>
              ))}
            </div>

            <section className="card p-4">
              <div className="mb-2 flex items-baseline justify-between">
                <h3 className="text-sm font-semibold">Flow — {period === "month" ? "daily" : "monthly"}</h3>
                <span className="text-xs tabular text-ink-soft">
                  net {m(fmtMoney(range.net, { sign: true, compact: true }))}
                </span>
              </div>
              <SpendEarnArea data={range.series} />
            </section>

            <div className="grid grid-cols-2 gap-3">
              <section className="card p-4">
                <h3 className="mb-1 text-sm font-semibold">Spent — {PERIODS.find((p) => p.key === period)?.label}</h3>
                <CategoryPie
                  data={range.byCategorySpend.map((c) => ({ name: c.name, amount: c.amount }))}
                />
                <ul className="mt-2 space-y-1">
                  {range.byCategorySpend.slice(0, 4).map((c, i) => (
                    <li key={c.id} className="flex items-center gap-2 text-xs">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="flex-1 truncate text-ink-soft">{c.name}</span>
                      <span className="tabular font-medium">{fmtMoney(c.amount, { compact: true })} · {c.pct.toFixed(0)}%</span>
                    </li>
                  ))}
                </ul>
              </section>
              <section className="card p-4">
                <h3 className="mb-1 text-sm font-semibold">Earned — {PERIODS.find((p) => p.key === period)?.label}</h3>
                <CategoryPie
                  data={range.byCategoryEarn.map((c) => ({ name: c.name, amount: c.amount }))}
                />
                <ul className="mt-2 space-y-1">
                  {range.byCategoryEarn.slice(0, 4).map((c, i) => (
                    <li key={c.id} className="flex items-center gap-2 text-xs">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="flex-1 truncate text-ink-soft">{c.name}</span>
                      <span className="tabular font-medium">{fmtMoney(c.amount, { compact: true })} · {c.pct.toFixed(0)}%</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            {incomeGoal > 0 && period === "month" && (
              <section className="card p-4">
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-semibold">Income goal</span>
                  <span className="tabular text-ink-soft">{fmtMoney(agg.income)} / {fmtMoney(incomeGoal)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (agg.income / incomeGoal) * 100)}%` }} />
                </div>
              </section>
            )}
          </>
        )}

        {tab === "Patterns" && (
          <>
            <section className="card p-4">
              <h3 className="mb-2 text-sm font-semibold">Weekday spending — {monthLabel(month)}</h3>
              <WeekdayBars data={agg.weekdaySpend} />
            </section>
            <section className="card p-4">
              <h3 className="mb-2 text-sm font-semibold">Daily net flow</h3>
              <div className="grid grid-cols-7 gap-1">
                {agg.dailyNet.map((d) => {
                  const intensity = Math.min(1, Math.abs(d.net) / Math.max(1, agg.expense / 10));
                  return (
                    <div
                      key={d.day}
                      title={`Day ${d.day}: ${fmtMoney(d.net)}`}
                      className="flex aspect-square items-center justify-center rounded text-[9px] tabular"
                      style={{
                        background: d.net === 0 ? "var(--color-surface-2)" : d.net > 0 ? `rgba(29,143,126,${0.15 + intensity * 0.55})` : `rgba(194,82,61,${0.15 + intensity * 0.55})`,
                        color: intensity > 0.6 ? "white" : "inherit",
                      }}
                    >
                      {d.day}
                    </div>
                  );
                })}
              </div>
            </section>
            <section className="card p-4">
              <h3 className="mb-2 text-sm font-semibold">Top subcategories</h3>
              {agg.bySubcategory.length === 0 && <p className="text-sm text-ink-faint">Tag expenses with subcategories to see patterns here.</p>}
              <ul className="space-y-2">
                {agg.bySubcategory.slice(0, 6).map((s) => (
                  <li key={s.key} className="flex items-center gap-3 text-sm">
                    <span className="flex-1 truncate text-ink-soft">{s.name}</span>
                    <span className="tabular font-medium">{fmtMoney(s.amount)}</span>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}

        {tab === "Recent" && (
          <section className="card divide-y divide-line/70 overflow-hidden">
            {transactions.slice(0, 40).length === 0 && (
              <p className="p-6 text-center text-sm text-ink-faint">No entries yet — tap the + button to add your first one.</p>
            )}
            {transactions.slice(0, 40).map((t) => (
              <button key={t._id} onClick={() => openEntry(t._id)} className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-surface-2">
                <span className={`flex h-9 w-9 items-center justify-center rounded-full ${t.kind === "income" ? "bg-income/10 text-income" : "bg-expense/10 text-expense"}`}>
                  <CatIcon name={categories.find((c) => c._id === t.categoryId)?.icon} size={15} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{catName(t.categoryId)}{t.subcategory ? ` › ${t.subcategory}` : ""}</span>
                  <span className="block truncate text-xs text-ink-faint">
                    {new Date(t.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    {t.note ? ` · ${t.note}` : ""}
                    {t.accountId ? ` · ${accountName(t.accountId)}` : ""}
                  </span>
                </span>
                <span className={`tabular text-sm font-semibold ${t.kind === "income" ? "text-income" : "text-expense"}`}>
                  {t.kind === "income" ? "+" : "−"}{fmtMoney(t.amount)}
                </span>
              </button>
            ))}
          </section>
        )}
      </div>
    </AppShell>
  );
}
