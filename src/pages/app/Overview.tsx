import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFinance } from "@/finance/FinanceContext";
import AppShell, { useEntryEdit } from "@/finance/AppShell";
import { fmtMoney, monthKey } from "@/finance/format";
import { aggregateMonth } from "@/finance/analytics";
import { portfolioTotals, mfValue, summarizePosition } from "@/finance/portfolio";
import { CatIcon } from "@/finance/icons";
import {
  TrendingUp, TrendingDown, Wallet, ShoppingBag,
  ChevronRight, Eye, EyeOff, Flame, ShieldCheck, CalendarClock, Zap, Check,
} from "lucide-react";

type Scope = "all" | "liquid" | "invest";
type Timeline = "month" | "year" | "all";

const CAT_COLORS = ["#ff908d", "#4029ba", "#42e5a2", "#c6bfff", "#60fdb8", "#ffbab7"];
const R = 48;
const CIRC = 2 * Math.PI * R;

export default function Overview() {
  const {
    ready, transactions, categories, accounts, stocks, exits, dividends,
    mutualFunds, depositFlows, quotes, catName, accountName,
    maskBalances, setMaskBalances,
    recurringBills, payRecurring,
  } = useFinance();
  const { openEntry } = useEntryEdit();
  const navigate = useNavigate();
  const [scope, setScope] = useState<Scope>("all");
  const [timeline, setTimeline] = useState<Timeline>("month");
  const hide = maskBalances;
  const setHide = (val: boolean | ((p: boolean) => boolean)) => {
    setMaskBalances(typeof val === "function" ? val(maskBalances) : val);
  };

  const month = monthKey(Date.now());

  // ---- liquid: savings + wallets ----
  const liquidRows = useMemo(() => {
    return accounts
      .filter((a) => a.type !== "investment")
      .map((a) => {
        let flow = 0;
        for (const t of transactions) if (t.accountId === a._id) flow += t.kind === "income" ? t.amount : -t.amount;
        return { id: a._id, name: a.name, type: a.type, bankName: a.bankName, bal: a.openingBalance + flow };
      });
  }, [accounts, transactions]);
  const liquidBalances = useMemo(() => liquidRows.reduce((s, r) => s + r.bal, 0), [liquidRows]);

  // ---- investments ----
  const portfolio = useMemo(
    () => portfolioTotals(stocks.map((s) => summarizePosition(s, exits, dividends, quotes[s.symbol] ?? null))),
    [stocks, exits, dividends, quotes]
  );
  const mfTotals = useMemo(() => {
    let invested = 0, value = 0;
    for (const f of mutualFunds) {
      const v = mfValue(f, f.navSymbol ? quotes[f.navSymbol] ?? null : null);
      invested += v.invested;
      value += v.value;
    }
    return { invested, value };
  }, [mutualFunds, quotes]);
  const depositsValue = useMemo(
    () => depositFlows.reduce((s, f) => s + (f.type === "withdrawal" ? -f.amount : f.amount), 0),
    [depositFlows]
  );
  const investmentsValue = portfolio.currentValue + mfTotals.value + depositsValue;
  const totalWorth = liquidBalances + investmentsValue;
  const invPL = (portfolio.ltCombinedPL ?? 0) + (portfolio.stCombinedPL ?? 0);

  // ---- velocity ----
  const mAgg = useMemo(() => aggregateMonth(transactions, catName, month), [transactions, catName, month]);

  const savingsRate = mAgg.income > 0 ? Math.max(0, Math.round(((mAgg.income - mAgg.expense) / mAgg.income) * 100)) : 0;
  const currentDays = new Date().getDate() || 1;
  const monthlyRunway = mAgg.expense > 0 ? (liquidBalances / (mAgg.expense / currentDays * 30)).toFixed(1) : "12+";
  const velocity = useMemo(() => {
    const now = new Date();
    let spent = 0, earned = 0, start = -Infinity;
    if (timeline === "month") {
      start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    } else if (timeline === "year") {
      start = new Date(now.getFullYear(), 0, 1).getTime();
    }
    for (const t of transactions) {
      if (t.date < start) continue;
      if (t.kind === "expense") spent += t.amount;
      else earned += t.amount;
    }
    // limit: current month budget applies to month view only
    const daysInPeriod =
      timeline === "month"
        ? now.getDate()
        : timeline === "year"
          ? Math.max(1, Math.round((Date.now() - start) / 86400000))
          : Math.max(1, Math.round((Date.now() - (transactions[transactions.length - 1]?.date ?? Date.now())) / 86400000));
    const perDay = daysInPeriod > 0 ? spent / daysInPeriod : 0;
    return { spent, earned, perDay };
  }, [transactions, timeline]);

  const donut = useMemo(() => {
    const rows = mAgg.byCategorySpend.slice(0, 4);
    const total = rows.reduce((s, r) => s + r.amount, 0) || 1;
    let acc = 0;
    return rows.map((r, i) => {
      const frac = r.amount / total;
      const seg = { ...r, color: CAT_COLORS[i % CAT_COLORS.length], dash: frac * CIRC, offset: -acc * CIRC };
      acc += frac;
      return seg;
    });
  }, [mAgg]);

  // Velocity vs previous month's FINAL baseline (its full-month per-day avg).
  const velocityDelta = useMemo(() => {
    const now = new Date();
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
    const prevEnd = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const prevDays = Math.max(1, Math.round((prevEnd - prevStart) / 86400000));
    let prevSpent = 0;
    for (const t of transactions) {
      if (t.kind === "expense" && t.date >= prevStart && t.date < prevEnd) prevSpent += t.amount;
    }
    const prevPerDay = prevSpent / prevDays;
    if (prevPerDay <= 0) return null;
    const pct = ((velocity.perDay - prevPerDay) / prevPerDay) * 100;
    return { pct, prevPerDay };
  }, [transactions, velocity.perDay]);

  // ---- Net Worth History: month-end totals across the data's monthly span ----
  const netWorthHistory = useMemo(() => {
    const now = new Date();
    if (!transactions.length && !accounts.length) return [];
    // earliest event among entries and account creation
    let min = Date.now();
    for (const t of transactions) if (t.date < min) min = t.date;
    const first = new Date(min);
    const months: Array<{ label: string; key: string; value: number }> = [];
    const investAt = (endTs: number) => {
      let v = 0;
      for (const s of stocks) {
        if (s.buyDate < endTs) v += s.quantity * s.buyPrice;
        const sold = exits.filter((e) => e.stockId === s._id && e.exitDate < endTs).reduce((sum, e) => sum + e.quantity, 0);
        v -= sold * s.buyPrice;
      }
      for (const f of depositFlows) if (f.date < endTs) v += f.type === "withdrawal" ? -f.amount : f.amount;
      return v;
    };
    const totalMonths =
      (now.getFullYear() - first.getFullYear()) * 12 + (now.getMonth() - first.getMonth());
    const count = Math.min(12, totalMonths + 1);
    for (let i = count - 1; i >= 0; i--) {
      // month boundary: end of the month i months before now
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1).getTime();
      const isCurrent = i === 0;
      if (isCurrent) {
        months.push({ label: "Now", key: "now", value: totalWorth });
        continue;
      }
      let liquid = 0;
      for (const a of accounts) {
        let flow = 0;
        for (const t of transactions) {
          if (t.accountId === a._id && t.date < end && t.kind !== "transfer") {
            flow += t.kind === "income" ? t.amount : -t.amount;
          }
        }
        liquid += a.openingBalance + flow;
      }
      months.push({
        label: new Date(end - 1).toLocaleDateString("en-IN", { month: "short" }),
        key: String(end),
        value: Math.max(0, liquid + investAt(end)),
      });
    }
    return months;
  }, [transactions, accounts, stocks, exits, depositFlows, totalWorth]);
  const nwMax = Math.max(1, ...netWorthHistory.map((p) => p.value));
  const nwMin = Math.min(...netWorthHistory.map((p) => p.value), nwMax);

  // ---- weekly trajectory: last 7 days, income vs spend paired bars ----
  const week = useMemo(() => {
    const days: Array<{ label: string; inc: number; exp: number }> = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      days.push({ label: ["S", "M", "T", "W", "T", "F", "S"][d.getDay()], inc: 0, exp: 0 });
    }
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6).getTime();
    for (const t of transactions) {
      if (t.date < start) continue;
      const idx = 6 - Math.floor((startOfDay(now) - startOfDay(new Date(t.date))) / 86400000);
      if (idx < 0 || idx > 6) continue;
      if (t.kind === "income") days[idx].inc += t.amount;
      else days[idx].exp += t.amount;
    }
    return days;
  }, [transactions]);
  const weekMax = Math.max(1, ...week.flatMap((d) => [d.inc, d.exp]));
  const todayDow = new Date().getDay();

  const recent = transactions.slice(0, 6);
  const m = (v: string) => (hide ? "•••••" : v);

  if (!ready) {
    return (
      <AppShell title="Overview">
        <div className="py-20 text-center text-sm text-ink-faint">Connecting to your database…</div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Overview">
      {/* ============ SECTION 1: Total Net Worth hero ============ */}
      <section className="relative overflow-hidden rounded-2xl border border-white/5 bg-surface-low p-5 shadow-[0_4px_16px_-2px_rgba(0,0,0,0.35)]">
        <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 h-36 w-36 rounded-full bg-secondary-deep/20 blur-2xl" />
        <div className="relative z-10">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-faint">Total Net Worth</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setHide(!hide)}
                className="rounded-full p-1.5 text-ink-faint active:scale-95"
                aria-label="Toggle privacy"
              >
                {hide ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
              <span className={`flex items-center gap-1 rounded-full border border-white/10 bg-card px-2.5 py-1 ${mAgg.net >= 0 ? "text-primary-bright" : "text-tertiary-deep"}`}>
                {mAgg.net >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                <span className="text-[10px] font-bold tabular">
                  {mAgg.net >= 0 ? "+" : "−"}
                  {m(fmtMoney(Math.abs(mAgg.net), { compact: true }))}
                </span>
                <span className="text-[10px] text-ink-faint">this month</span>
              </span>
            </div>
          </div>
          <p className="my-2 text-[40px] font-extrabold leading-[48px] tracking-tight tabular">
            {m(fmtMoney(totalWorth, { compact: true }))}
          </p>

          {/* toggle pills — content only shows when pressed */}
          <div className="no-scrollbar mt-3 flex items-center gap-1.5 overflow-x-auto border-t border-white/10 pt-3">
            {(
              [
                { key: "all", label: "All" },
                { key: "liquid", label: "Liquid", value: liquidBalances, dot: "bg-primary" },
                { key: "invest", label: "Investments", value: investmentsValue, dot: "bg-secondary" },
              ] as const
            ).map((t) => {
              const active = scope === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setScope(active && t.key !== "all" ? "all" : t.key)}
                  className={`flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition active:scale-[0.98] ${
                    active
                      ? "bg-primary text-[#003823] shadow-sm"
                      : "border border-white/10 bg-card text-ink-faint"
                  }`}
                >
                  {t.label}
                  {"value" in t && t.value !== undefined && (
                    <span className={`text-[11px] font-bold tabular ${active ? "text-[#003823]" : t.key === "invest" ? "text-secondary" : "text-primary-bright"}`}>
                      {m(fmtMoney(t.value, { compact: true }))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* expandable scopes */}
          {scope === "liquid" && (
            <div className="animate-fade mt-3 space-y-1.5">
              {liquidRows.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-xl bg-card px-3 py-2">
                  <span className="flex items-center gap-2 text-xs">
                    <span className={`flex h-7 w-7 items-center justify-center rounded-full ${r.type === "wallet" ? "bg-secondary-deep/30 text-secondary" : "bg-primary/15 text-primary-bright"}`}>
                      <Wallet size={13} />
                    </span>
                    <span>
                      <span className="block font-semibold">{r.name}</span>
                      <span className="block text-[10px] text-ink-faint">{r.bankName ?? r.type}</span>
                    </span>
                  </span>
                  <span className="text-xs font-bold tabular">{m(fmtMoney(r.bal, { compact: true }))}</span>
                </div>
              ))}
              {liquidRows.length === 0 && <p className="py-2 text-center text-xs text-ink-faint">No savings accounts or wallets yet.</p>}
            </div>
          )}

          {scope === "invest" && (
            <div className="animate-fade mt-3 space-y-1.5">
              <div className="grid grid-cols-2 gap-1.5">
                <InvTile label="Stocks · long term" value={portfolio.longTermValue} hide={hide} />
                <InvTile label="Stocks · short term" value={portfolio.shortTermValue} hide={hide} />
                <InvTile label="Mutual funds" value={mfTotals.value} hide={hide} />
                <InvTile label="FD · PPF · deposits" value={depositsValue} hide={hide} />
              </div>
              <div className="flex items-center justify-between rounded-xl bg-card px-3 py-2">
                <span className="text-xs text-ink-faint">Running P&amp;L (LT + ST + dividends)</span>
                <span className={`text-xs font-bold tabular ${invPL >= 0 ? "text-primary-bright" : "text-tertiary-deep"}`}>
                  {m(fmtMoney(invPL, { sign: true, compact: true }))}
                </span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ============ SECTION 2: daily bento ============ */}
      <section className="mt-3 grid grid-cols-2 gap-3">
        <div className="flex flex-col justify-between rounded-2xl border border-white/5 bg-card p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-faint">Today's Spend</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-card-high text-ink-soft">
              <ShoppingBag size={14} />
            </span>
          </div>
          <div className="mt-2">
            <p className="text-[22px] font-semibold tabular">{m(fmtMoney(todaySpend(transactions)))}</p>
            <p className="text-[11px] text-ink-faint">
              {transactions.filter((t) => t.kind === "expense" && t.date >= startOfDay(new Date())).length} transactions
            </p>
          </div>
        </div>
        <div className="flex flex-col justify-between rounded-2xl border border-white/5 bg-card p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-faint">This Month</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Flame size={14} />
            </span>
          </div>
          <div className="mt-2">
            <p className={`text-[22px] font-semibold tabular ${mAgg.net >= 0 ? "text-primary-bright" : "text-tertiary-deep"}`}>
              {m(fmtMoney(mAgg.net, { sign: true, compact: true }))}
            </p>
            <p className="text-[11px] text-ink-faint">
              ↑{m(fmtMoney(mAgg.income, { compact: true }))} ↓{m(fmtMoney(mAgg.expense, { compact: true }))}
            </p>
          </div>
        </div>
      </section>

      {/* ============ FINANCIAL HEALTH & RUNWAY ============ */}
      <section className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-white/5 bg-surface-low p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-faint">Savings Rate</span>
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary-bright">
              <Zap size={13} />
            </span>
          </div>
          <div className="mt-2">
            <p className="text-xl font-bold tabular text-white">
              {savingsRate}%
            </p>
            <span className={`inline-block mt-0.5 rounded px-1.5 py-0.5 text-[9px] font-bold ${
              savingsRate >= 40
                ? "bg-primary/20 text-primary-bright"
                : savingsRate >= 20
                ? "bg-secondary-deep/30 text-secondary"
                : "bg-tertiary-deep/20 text-tertiary"
            }`}>
              {savingsRate >= 40 ? "Super Saver" : savingsRate >= 20 ? "Healthy" : "Tight"}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-surface-low p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-faint">Cash Runway</span>
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary-deep/20 text-secondary">
              <ShieldCheck size={13} />
            </span>
          </div>
          <div className="mt-2">
            <p className="text-xl font-bold tabular text-white">
              {monthlyRunway} <span className="text-xs font-normal text-ink-faint">Months</span>
            </p>
            <p className="text-[10px] text-ink-faint mt-0.5">
              Liquid emergency cushion
            </p>
          </div>
        </div>
      </section>

      {/* ============ UPCOMING RECURRING BILLS ============ */}
      {recurringBills && recurringBills.length > 0 && (
        <section className="mt-3 rounded-2xl border border-white/5 bg-surface-low p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
              <CalendarClock size={15} className="text-primary-bright" /> Upcoming Subscriptions &amp; Bills
            </h2>
            <span className="text-[10px] text-ink-faint">Monthly cycle</span>
          </div>
          <div className="space-y-1.5">
            {recurringBills.slice(0, 3).map((bill) => {
              const todayDay = new Date().getDate();
              const daysAway = bill.dueDay - todayDay;
              const dueText =
                daysAway === 0
                  ? "Due Today!"
                  : daysAway > 0
                  ? `Due in ${daysAway} days (${bill.dueDay}th)`
                  : `Next: ${bill.dueDay}th`;
              return (
                <div
                  key={bill._id}
                  className="flex items-center justify-between rounded-xl bg-card p-2.5 border border-white/5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-white truncate">{bill.name}</p>
                    <p className="text-[10px] text-ink-faint">{dueText}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold tabular text-white">
                      {m(fmtMoney(bill.amount))}
                    </span>
                    <button
                      onClick={() => payRecurring(bill._id)}
                      className="rounded-full bg-primary/15 hover:bg-primary/25 border border-primary/30 px-2 py-1 text-[10px] font-bold text-primary-bright active:scale-95 transition"
                    >
                      Pay &amp; Log
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ============ SECTION 3: Spend Velocity ============ */}
      <section className="mt-3 space-y-4 rounded-2xl border border-white/5 bg-surface-low p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Spend Velocity</h2>
              <p className="text-xs text-ink-faint tabular">
                {m(fmtMoney(velocity.spent, { compact: true }))} spent · {m(fmtMoney(velocity.perDay, { compact: true }))}/day avg
              </p>
              {timeline === "month" && velocityDelta && (
                <p className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold tabular">
                  <span className={velocityDelta.pct <= 0 ? "text-primary-bright" : "text-tertiary"}>
                    {velocityDelta.pct > 0 ? "+" : ""}
                    {velocityDelta.pct.toFixed(0)}%
                  </span>
                  <span className="text-ink-faint">
                    vs last month's {m(fmtMoney(velocityDelta.prevPerDay, { compact: true }))}/day
                  </span>
                </p>
              )}
            </div>
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              {timeline === "month" ? "Monthly" : timeline === "year" ? "Yearly" : "All time"}
            </span>
          </div>
          <div className="flex w-fit items-center gap-1 rounded-full border border-white/10 bg-card p-1">
            {(
              [
                { key: "month", label: "Monthly" },
                { key: "year", label: "Yearly" },
                { key: "all", label: "All Time" },
              ] as const
            ).map((t) => (
              <button
                key={t.key}
                onClick={() => setTimeline(t.key)}
                className={`rounded-full px-3 py-1 text-[11px] font-semibold transition active:scale-[0.98] ${
                  timeline === t.key ? "bg-primary text-[#003823] shadow-sm" : "text-ink-faint"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* donut & legend */}
        <div className="flex items-center justify-around pt-1">
          <div className="relative flex h-36 w-36 items-center justify-center">
            <svg className="h-36 w-36 -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" fill="none" r={R} stroke="#1f293d" strokeWidth="12" />
              {donut.map((seg) => (
                <circle
                  key={seg.id}
                  cx="60"
                  cy="60"
                  fill="none"
                  r={R}
                  stroke={seg.color}
                  strokeDasharray={`${seg.dash} ${CIRC - seg.dash}`}
                  strokeDashoffset={seg.offset}
                  strokeLinecap="round"
                  strokeWidth="12"
                />
              ))}
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-[10px] font-semibold uppercase text-ink-faint">Spent</span>
              <span className="text-base font-bold tabular">{m(fmtMoney(mAgg.expense, { compact: true }))}</span>
            </div>
          </div>
          <div className="space-y-2 text-xs font-semibold">
            {donut.map((seg) => (
              <div key={seg.id} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: seg.color }} />
                <span className="text-[13px] text-ink-faint">
                  {seg.name}: {seg.pct.toFixed(0)}%
                </span>
              </div>
            ))}
            {donut.length === 0 && <span className="text-[13px] text-ink-faint">No spends yet</span>}
          </div>
        </div>

        {/* weekly trajectory */}
        <div className="border-t border-white/10 pt-3">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-faint">Weekly Trajectory (Income vs Spend)</span>
            <div className="flex items-center gap-3 text-[10px] font-semibold text-ink-faint">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-primary" /><span>In</span></span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-card-highest" /><span>Out</span></span>
            </div>
          </div>
          <div className="flex h-20 items-end justify-between px-1 pt-2">
            {week.map((d, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className="flex h-14 items-end gap-1">
                  <div
                    className={`w-2 rounded-t-sm bg-primary ${i === 6 ? "shadow-[0_0_8px_rgba(66,229,162,0.6)]" : ""}`}
                    style={{ height: `${Math.max(4, (d.inc / weekMax) * 100)}%` }}
                  />
                  <div className="w-2 rounded-t-sm bg-card-highest" style={{ height: `${Math.max(4, (d.exp / weekMax) * 100)}%` }} />
                </div>
                <span className={`text-[10px] font-semibold ${i === 6 ? "text-primary" : "text-ink-faint"}`}>{d.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ SECTION 3.5: Net Worth History ============ */}
      {netWorthHistory.length > 1 && (
        <section className="mt-3 rounded-2xl border border-white/5 bg-surface-low p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Net Worth History</h2>
              <p className="text-xs text-ink-faint">Month-end totals · last {netWorthHistory.length} months</p>
            </div>
            <span className="rounded-full bg-secondary-deep/25 px-2.5 py-1 text-xs font-semibold text-secondary">Monthly</span>
          </div>
          <div className="flex h-28 items-end gap-1.5">
            {netWorthHistory.map((p, i) => {
              const h = Math.max(6, ((p.value - nwMin * 0.9) / Math.max(1, nwMax - nwMin * 0.9)) * 100);
              const last = i === netWorthHistory.length - 1;
              return (
                <div key={p.key} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                  <span className="text-[9px] font-semibold tabular text-ink-faint">
                    {i % 2 === 0 || last ? m(fmtMoney(p.value, { compact: true })) : ""}
                  </span>
                  <div
                    className={`w-full max-w-7 rounded-t-md ${last ? "bg-primary shadow-[0_0_10px_rgba(0,200,136,0.4)]" : "bg-secondary-deep/50"}`}
                    style={{ height: `${h}%` }}
                  />
                  <span className={`text-[9px] font-semibold ${last ? "text-primary" : "text-ink-faint"}`}>{p.label}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ============ SECTION 4: recent activity ============ */}
      <section className="mt-4 space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-lg font-semibold">Recent Activity</h2>
          <button onClick={() => navigate("/app/ledger")} className="flex items-center gap-0.5 text-xs font-semibold text-primary">
            <span>View All</span>
            <ChevronRight size={14} />
          </button>
        </div>
        <div className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-card">
          {recent.length === 0 && (
            <p className="p-6 text-center text-xs text-ink-faint">No entries yet — tap Quick Log to add your first one.</p>
          )}
          {recent.map((t) => (
            <button
              key={t._id}
              onClick={() => openEntry(t._id)}
              className="flex w-full items-center justify-between p-3.5 text-left transition active:bg-card-high"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
                    t.kind === "income" ? "bg-primary/15 text-primary-bright" : "bg-tertiary-deep/20 text-tertiary-deep"
                  }`}
                >
                  <CatIcon name={t.categoryId ? categories.find((c) => c._id === t.categoryId)?.icon : undefined} size={17} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold leading-tight">
                    {t.categoryId ? catName(t.categoryId) : "Transfer"}
                    {t.subcategory ? ` › ${t.subcategory}` : ""}
                  </p>
                  <p className="truncate text-xs text-ink-faint">
                    {t.note ? `${t.note} · ` : ""}
                    {t.accountId ? `${accountName(t.accountId)} · ` : ""}
                    {new Date(t.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </p>
                </div>
              </div>
              <span className={`text-sm font-semibold tabular ${t.kind === "income" ? "text-primary-bright" : "text-ink"}`}>
                {t.kind === "income" ? "+" : "−"}
                {m(fmtMoney(t.amount))}
              </span>
            </button>
          ))}
        </div>
      </section>
    </AppShell>
  );
}

function InvTile({ label, value, hide }: { label: string; value: number; hide: boolean }) {
  return (
    <div className="rounded-xl bg-card p-2.5 text-center">
      <p className="text-[10px] text-ink-faint">{label}</p>
      <p className="text-xs font-bold tabular">{hide ? "••••" : fmtMoney(value, { compact: true })}</p>
    </div>
  );
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}
function todaySpend(txns: Array<{ kind: string; amount: number; date: number }>) {
  const start = startOfDay(new Date());
  return txns.filter((t) => t.kind === "expense" && t.date >= start).reduce((s, t) => s + t.amount, 0);
}
