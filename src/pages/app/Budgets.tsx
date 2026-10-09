import { useMemo, useState, useEffect } from "react";
import { useFinance } from "@/finance/FinanceContext";
import AppShell, { useEntryEdit } from "@/finance/AppShell";
import { fmtMoney, monthKey, monthLabel, monthShift } from "@/finance/format";
import { aggregateMonth } from "@/finance/analytics";
import { CatIcon } from "@/finance/icons";
import {
  ChevronLeft, ChevronRight, Plus, Clock, TrendingUp,
  ShieldCheck, TriangleAlert, Ban, CalendarClock, Repeat, Trash2, Check,
} from "lucide-react";

type Status = "ontrack" | "caution" | "over";

export default function Budgets() {
  const {
    ready, transactions, categories, budgets, catName, saveBudget,
    recurringBills, addRecurring, deleteRecurring, payRecurring, maskBalances,
  } = useFinance();
  const { openEntry } = useEntryEdit();
  const [month, setMonth] = useState(monthKey(Date.now()));
  const existing = budgets.find((b) => b.month === month);

  const [newRecName, setNewRecName] = useState("");
  const [newRecAmount, setNewRecAmount] = useState("");
  const [newRecDay, setNewRecDay] = useState("1");
  const [newRecCat, setNewRecCat] = useState("");
  const [showAddRec, setShowAddRec] = useState(false);

  const [incomeGoal, setIncomeGoal] = useState("");
  const [expenseBudget, setExpenseBudget] = useState("");
  const [savingsGoal, setSavingsGoal] = useState("");
  const [catBudgets, setCatBudgets] = useState<Record<string, string>>({});
  const [showEditor, setShowEditor] = useState(false);

  useEffect(() => {
    setIncomeGoal(existing?.incomeGoal ? String(existing.incomeGoal) : "");
    setExpenseBudget(existing?.expenseBudget ? String(existing.expenseBudget) : "");
    setSavingsGoal(existing?.savingsGoal ? String(existing.savingsGoal) : "");
    const m: Record<string, string> = {};
    for (const cb of existing?.categoryBudgets ?? []) m[cb.categoryId] = String(cb.amount);
    setCatBudgets(m);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, existing?._id]);

  const agg = useMemo(() => aggregateMonth(transactions, catName, month), [transactions, catName, month]);
  const expenseCats = categories.filter((c) => c.type === "expense");

  // month math for forecast + pacing
  const now = new Date();
  const isCurrentMonth = month === monthKey(Date.now());
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const elapsed = isCurrentMonth ? now.getDate() : daysInMonth;
  const daysLeft = daysInMonth - elapsed;
  const timePct = (elapsed / daysInMonth) * 100;

  const limit = parseFloat(expenseBudget) || 0;
  const burnPct = limit > 0 ? (agg.expense / limit) * 100 : 0;
  const safeDaily = daysLeft > 0 && limit > 0 ? Math.max(0, (limit - agg.expense) / daysLeft) : 0;

  // Month-end forecast: extrapolate burn/earn pace to month end
  const forecast = useMemo(() => {
    if (elapsed <= 0) return null;
    const projExpense = (agg.expense / elapsed) * daysInMonth;
    const projIncome = (agg.income / elapsed) * daysInMonth;
    const projNet = projIncome - projExpense;
    const projSavings = limit > 0 ? limit - projExpense : projNet;
    return { projExpense, projIncome, projNet, projSavings };
  }, [agg, elapsed, daysInMonth, limit]);

  // segment widths for the stacked burn gauge (5% gap feel via flex gap)
  const segPrimary = Math.min(50, burnPct);
  const segSecondary = Math.max(0, Math.min(100 - segPrimary, burnPct - segPrimary));
  const segRest = Math.max(0, 100 - segPrimary - segSecondary);

  const save = async () => {
    await saveBudget(month, {
      incomeGoal: parseFloat(incomeGoal) || 0,
      expenseBudget: parseFloat(expenseBudget) || 0,
      savingsGoal: parseFloat(savingsGoal) || 0,
    });
  };

  const dirty =
    (existing?.incomeGoal ?? 0) !== (parseFloat(incomeGoal) || 0) ||
    (existing?.expenseBudget ?? 0) !== (parseFloat(expenseBudget) || 0) ||
    (existing?.savingsGoal ?? 0) !== (parseFloat(savingsGoal) || 0);

  if (!ready) {
    return (
      <AppShell title="Budgets" subtitle="Loading…">
        <p className="py-20 text-center text-sm text-ink-faint">Loading…</p>
      </AppShell>
    );
  }

  const activeCount = expenseCats.filter((c) => parseFloat(catBudgets[c._id] || "") > 0).length;

  return (
    <AppShell title="Budgets & Limits" subtitle={`${monthLabel(month)} cycle`}>
      {/* month switcher */}
      <div className="mb-3 flex items-center justify-between">
        <button onClick={() => setMonth(monthShift(month, -1))} className="rounded-full p-2 text-ink-soft active:scale-95" aria-label="Previous month">
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-semibold">{monthLabel(month)}</span>
        <button
          onClick={() => setMonth(monthShift(month, 1))}
          disabled={month >= monthKey(Date.now())}
          className="rounded-full p-2 text-ink-soft disabled:opacity-30"
          aria-label="Next month"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* ===== overall burn summary bento ===== */}
      <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-surface-low p-5">
        <div className="pointer-events-none absolute -bottom-10 -right-10 h-44 w-44 rounded-full bg-primary/5 blur-3xl" />
        <div className="mb-4 flex items-start justify-between">
          <div>
            <span className="flex items-center gap-1.5 text-xs font-semibold text-ink-faint">
              <Clock size={14} className="text-primary" />
              Monthly Limit Burn
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <h2 className="text-[26px] font-bold leading-8 tracking-tight tabular">{fmtMoney(agg.expense, { compact: true })}</h2>
              <span className="text-sm text-ink-soft tabular">/ {limit ? fmtMoney(limit, { compact: true }) : "no limit"}</span>
            </div>
          </div>
          <div className="flex flex-col items-end">
            {limit > 0 && (
              <span
                className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                  burnPct >= 100
                    ? "border-error/40 bg-error-deep/40 text-error"
                    : burnPct > timePct + 14
                      ? "border-tertiary/30 bg-tertiary-deep/20 text-tertiary"
                      : "border-primary/20 bg-primary/10 text-primary"
                }`}
              >
                {burnPct.toFixed(1)}% Spent
              </span>
            )}
            <span className="mt-1.5 text-xs text-ink-faint">
              {isCurrentMonth ? `${daysLeft} days left` : "closed"}
            </span>
          </div>
        </div>

        {/* segmented horizontal gauge */}
        <div className="space-y-1.5">
          <div className="flex h-3 w-full gap-1 overflow-hidden rounded-full bg-card-highest p-0.5">
            <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${segPrimary}%` }} />
            <div className="h-full rounded-full bg-primary/80 transition-all duration-500" style={{ width: `${segSecondary}%` }} />
            <div className="h-full flex-1 rounded-full bg-surface-bright/40" />
          </div>
          <div className="flex items-center justify-between px-0.5 text-xs text-ink-faint">
            <span>{timePct.toFixed(0)}% through the month</span>
            <span className={`font-semibold ${limit && agg.expense > limit ? "text-error" : "text-primary"}`}>
              {limit > 0 ? `${fmtMoney(Math.max(0, limit - agg.expense), { compact: true })} remaining` : "set a limit below"}
            </span>
          </div>
        </div>

        {/* safe daily spend pill */}
        {isCurrentMonth && limit > 0 && (
          <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3.5">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ShieldCheck size={15} />
              </span>
              <span className="text-xs">Safe daily spending</span>
            </div>
            <span className="rounded-full border border-primary/20 bg-card px-3 py-1 text-sm font-semibold text-primary tabular">
              {fmtMoney(safeDaily)} / day
            </span>
          </div>
        )}
      </section>

      {/* ===== month-end forecast card ===== */}
      {forecast && (
        <section className="mt-3 flex items-center justify-between rounded-2xl border border-secondary-deep/40 bg-card p-4">
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
                · spend{" "}
                <span className="font-semibold">{fmtMoney(forecast.projExpense, { compact: true })}</span>
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ===== category budgets ===== */}
      <section className="mt-4 flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold">Category Limits</h3>
            <span className="rounded-full bg-card-high px-2 py-0.5 text-[11px] font-semibold text-ink-soft">
              {activeCount} active
            </span>
          </div>
          <button
            onClick={() => setShowEditor(!showEditor)}
            className="flex items-center gap-1 text-xs font-semibold text-primary active:scale-95"
          >
            {showEditor ? "Done" : "Edit limits"}
            <ChevronRight size={14} className={showEditor ? "rotate-90 transition" : "transition"} />
          </button>
        </div>

        {expenseCats.map((c) => {
          const spent = agg.byCategorySpend.find((x) => x.id === c._id)?.amount ?? 0;
          const catLimit = parseFloat(catBudgets[c._id] || "");
          const has = catLimit > 0;
          const pct = has ? (spent / catLimit) * 100 : 0;
          const status: Status = !has ? "ontrack" : pct >= 100 ? "over" : pct > timePct + 14 || pct >= 80 ? "caution" : "ontrack";
          const projEnd = elapsed > 0 ? (spent / elapsed) * daysInMonth : 0;

          return (
            <article
              key={c._id}
              className={`flex flex-col gap-3 rounded-2xl border p-4 transition ${
                status === "over" ? "border-error/30" : "border-white/10 bg-surface-low"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      status === "over"
                        ? "bg-error-deep/30 text-error"
                        : status === "caution"
                          ? "bg-tertiary-deep/20 text-tertiary"
                          : "bg-primary/10 text-primary"
                    }`}
                  >
                    <CatIcon name={c.icon} size={16} />
                  </span>
                  <div>
                    <h4 className="text-sm font-semibold">{c.name}</h4>
                    <p className="text-xs text-ink-soft tabular">
                      {fmtMoney(spent, { compact: true })}
                      {has ? ` of ${fmtMoney(catLimit, { compact: true })} spent` : " spent"}
                    </p>
                  </div>
                </div>
                {has && (
                  <span
                    className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                      status === "over"
                        ? "border-error/40 bg-error-deep/40 text-error"
                        : status === "caution"
                          ? "border-tertiary/30 bg-tertiary-deep/20 text-tertiary"
                          : "border-primary/25 bg-primary/15 text-primary"
                    }`}
                  >
                    {status === "over" ? <Ban size={11} /> : status === "caution" ? <TriangleAlert size={11} /> : <ShieldCheck size={11} />}
                    {status === "over" ? "Limit reached" : status === "caution" ? `Caution ${pct.toFixed(0)}%` : "On track"}
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <div className="h-2 overflow-hidden rounded-full bg-card-highest">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${status === "over" ? "bg-error" : status === "caution" ? "bg-tertiary" : "bg-primary"}`}
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-ink-faint">
                  {status === "caution" && <span className="text-tertiary">Pacing high (+{Math.max(0, pct - timePct).toFixed(0)}%)</span>}
                  {status === "over" && <span className="text-error font-medium">{pct.toFixed(0)}% capacity locked</span>}
                  {status === "ontrack" && <span>{has ? `${pct.toFixed(0)}% spent` : `${fmtMoney(projEnd, { compact: true })} projected pace`}</span>}
                  <span>
                    {has
                      ? `${fmtMoney(Math.max(0, catLimit - spent), { compact: true })} ${pct >= 100 ? "over" : "remaining"}`
                      : isCurrentMonth
                        ? `on pace for ${fmtMoney(projEnd, { compact: true })}`
                        : "no limit"}
                  </span>
                </div>
              </div>

              {showEditor && (
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="Monthly limit ₹"
                  value={catBudgets[c._id] ?? ""}
                  onChange={(e) => setCatBudgets({ ...catBudgets, [c._id]: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-card px-3 py-2 text-sm tabular"
                />
              )}
            </article>
          );
        })}

        {/* editor actions */}
        {showEditor && (
          <div className="animate-fade space-y-3 rounded-2xl border border-white/10 bg-surface-low p-4">
            <h3 className="text-sm font-bold">Goals for {monthLabel(month)}</h3>
            <label className="block">
              <span className="text-xs text-ink-soft">Monthly income goal</span>
              <input type="number" inputMode="decimal" value={incomeGoal} onChange={(e) => setIncomeGoal(e.target.value)} placeholder="e.g. 150000" className="mt-1 w-full rounded-xl border border-white/10 bg-card px-3 py-2.5 text-sm" />
            </label>
            <label className="block">
              <span className="text-xs text-ink-soft">Monthly spending limit</span>
              <input type="number" inputMode="decimal" value={expenseBudget} onChange={(e) => setExpenseBudget(e.target.value)} placeholder="e.g. 60000" className="mt-1 w-full rounded-xl border border-white/10 bg-card px-3 py-2.5 text-sm" />
            </label>
            <label className="block">
              <span className="text-xs text-ink-soft">Monthly savings goal</span>
              <input type="number" inputMode="decimal" value={savingsGoal} onChange={(e) => setSavingsGoal(e.target.value)} placeholder="e.g. 40000" className="mt-1 w-full rounded-xl border border-white/10 bg-card px-3 py-2.5 text-sm" />
            </label>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  // save category limits too
                  const limits = expenseCats
                    .map((c) => ({ categoryId: c._id, amount: parseFloat(catBudgets[c._id] || "") || 0 }))
                    .filter((x) => x.amount > 0);
                  await saveBudget(month, { categoryBudgets: limits });
                  await save();
                  setShowEditor(false);
                }}
                disabled={!dirty && !hasCatChanges(catBudgets, existing)}
                className="flex-1 rounded-full bg-primary py-2.5 text-sm font-bold text-[#003823] disabled:opacity-40"
              >
                {existing ? "Update goals" : "Set goals"}
              </button>
              <button onClick={() => setShowEditor(false)} className="rounded-full border border-white/10 px-4 py-2.5 text-sm font-semibold text-ink-soft">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* create / edit CTA */}
        {!showEditor && (
          <button
            onClick={() => setShowEditor(true)}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-bold text-[#003823] shadow-[0_12px_32px_-4px_rgba(0,200,136,0.35)] transition active:scale-[0.98]"
          >
            <Plus size={18} />
            {existing || activeCount > 0 ? "Edit budgets & goals" : "Create New Budget"}
          </button>
        )}

        {/* ============ RECURRING SUBSCRIPTIONS & BILLS ============ */}
        <div className="pt-3 border-t border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Repeat size={16} className="text-primary-bright" /> Subscriptions &amp; Recurring Bills
              </h3>
              <p className="text-xs text-ink-faint">
                Total monthly burn:{" "}
                <b className="text-white">
                  {maskBalances ? "₹••••" : fmtMoney(recurringBills.reduce((s, r) => s + r.amount, 0))}
                </b>
              </p>
            </div>
            <button
              onClick={() => setShowAddRec((p) => !p)}
              className="flex items-center gap-1 rounded-full border border-white/10 bg-surface-low px-3 py-1.5 text-xs font-semibold text-ink-soft hover:text-white transition"
            >
              <Plus size={13} /> {showAddRec ? "Close" : "Add Bill"}
            </button>
          </div>

          {showAddRec && (
            <div className="rounded-2xl border border-primary/20 bg-surface-low p-4 space-y-3 animate-fade">
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary-bright">New Recurring Bill</h4>
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={newRecName}
                  onChange={(e) => setNewRecName(e.target.value)}
                  placeholder="Bill Name (e.g. Netflix, Gym, Rent)"
                  className="col-span-2 rounded-xl border border-white/10 bg-surface px-3 py-2 text-xs text-ink placeholder:text-ink-faint/50"
                />
                <input
                  type="number"
                  value={newRecAmount}
                  onChange={(e) => setNewRecAmount(e.target.value)}
                  placeholder="Amount (₹)"
                  className="rounded-xl border border-white/10 bg-surface px-3 py-2 text-xs text-ink placeholder:text-ink-faint/50"
                />
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={newRecDay}
                  onChange={(e) => setNewRecDay(e.target.value)}
                  placeholder="Day of Month (1-31)"
                  className="rounded-xl border border-white/10 bg-surface px-3 py-2 text-xs text-ink placeholder:text-ink-faint/50"
                />
                <select
                  value={newRecCat}
                  onChange={(e) => setNewRecCat(e.target.value)}
                  className="col-span-2 rounded-xl border border-white/10 bg-surface px-3 py-2 text-xs text-ink"
                >
                  <option value="">Select Category (Optional)</option>
                  {expenseCats.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={async () => {
                  const amt = parseFloat(newRecAmount);
                  if (!newRecName.trim() || !amt) return;
                  await addRecurring({
                    name: newRecName.trim(),
                    amount: amt,
                    billingCycle: "monthly",
                    dueDay: Math.min(31, Math.max(1, parseInt(newRecDay) || 1)),
                    categoryId: newRecCat || undefined,
                  });
                  setNewRecName("");
                  setNewRecAmount("");
                  setShowAddRec(false);
                }}
                disabled={!newRecName.trim() || !parseFloat(newRecAmount)}
                className="w-full rounded-full bg-primary py-2.5 text-xs font-bold text-[#003823] disabled:opacity-40"
              >
                Save Subscription
              </button>
            </div>
          )}

          <div className="space-y-2">
            {recurringBills.map((bill) => (
              <div
                key={bill._id}
                className="flex items-center justify-between rounded-2xl border border-white/5 bg-card p-3.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white truncate">{bill.name}</p>
                  <p className="text-xs text-ink-faint">
                    Renews every {bill.dueDay}th of month · {bill.categoryId ? catName(bill.categoryId) : "Bills"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold tabular text-white">
                    {maskBalances ? "₹••••" : fmtMoney(bill.amount)}
                  </span>
                  <button
                    onClick={() => payRecurring(bill._id)}
                    title="Pay and log as expense in ledger"
                    className="rounded-full bg-primary/15 hover:bg-primary/25 border border-primary/25 px-2.5 py-1 text-xs font-bold text-primary-bright active:scale-95 transition"
                  >
                    Pay &amp; Log
                  </button>
                  <button
                    onClick={() => deleteRecurring(bill._id)}
                    className="text-ink-faint hover:text-tertiary-deep p-1"
                    title="Remove subscription"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </AppShell>
  );
}

function hasCatChanges(
  catBudgets: Record<string, string>,
  existing?: { categoryBudgets?: Array<{ categoryId: string; amount: number }> }
) {
  if (!existing) return Object.values(catBudgets).some((v) => parseFloat(v) > 0);
  const stored: Record<string, number> = {};
  for (const cb of existing.categoryBudgets ?? []) stored[cb.categoryId] = cb.amount;
  const keys = new Set([...Object.keys(catBudgets), ...Object.keys(stored)]);
  for (const k of keys) {
    if ((parseFloat(catBudgets[k] || "") || 0) !== (stored[k] ?? 0)) return true;
  }
  return false;
}
