import { useMemo, useState, useEffect } from "react";
import { useFinance } from "@/finance/FinanceContext";
import AppShell from "@/finance/AppShell";
import { fmtMoney, monthKey, monthLabel, monthShift } from "@/finance/format";
import { aggregateMonth } from "@/finance/analytics";
import { ChevronLeft, ChevronRight, Target, PiggyBank, TrendingUp, Wallet } from "lucide-react";

export default function Budgets() {
  const { ready, transactions, categories, budgets, catName, saveBudget } = useFinance();
  const [month, setMonth] = useState(monthKey(Date.now()));
  const existing = budgets.find((b) => b.month === month);

  const [incomeGoal, setIncomeGoal] = useState("");
  const [expenseBudget, setExpenseBudget] = useState("");
  const [savingsGoal, setSavingsGoal] = useState("");
  const [catBudgets, setCatBudgets] = useState<Record<string, string>>({});

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

  const dirty =
    (existing?.incomeGoal ?? 0) !== (parseFloat(incomeGoal) || 0) ||
    (existing?.expenseBudget ?? 0) !== (parseFloat(expenseBudget) || 0) ||
    (existing?.savingsGoal ?? 0) !== (parseFloat(savingsGoal) || 0);

  const save = async () => {
    await saveBudget(month, {
      incomeGoal: parseFloat(incomeGoal) || 0,
      expenseBudget: parseFloat(expenseBudget) || 0,
      savingsGoal: parseFloat(savingsGoal) || 0,
    });
  };

  const bar = (value: number, target: number, color: string) => (
    <div className="h-2 overflow-hidden rounded-full bg-surface-2">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, target > 0 ? (value / target) * 100 : 0)}%` }} />
    </div>
  );

  return (
    <AppShell title="Budgets" subtitle="Income goals and spending limits">
      <div className="mb-3 flex items-center justify-between">
        <button onClick={() => setMonth(monthShift(month, -1))} className="rounded-full p-2 hover:bg-surface-2"><ChevronLeft size={18} /></button>
        <span className="text-sm font-medium">{monthLabel(month)}</span>
        <button onClick={() => setMonth(monthShift(month, 1))} disabled={month >= monthKey(Date.now())} className="rounded-full p-2 hover:bg-surface-2 disabled:opacity-30"><ChevronRight size={18} /></button>
      </div>

      {/* current status */}
      <section className="card space-y-4 p-5">
        <div>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 font-medium"><TrendingUp size={14} className="text-primary" /> Income goal</span>
            <span className="tabular text-ink-soft">{fmtMoney(agg.income)} / {incomeGoal ? fmtMoney(parseFloat(incomeGoal)) : "—"}</span>
          </div>
          {bar(agg.income, parseFloat(incomeGoal) || 0, "bg-primary")}
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 font-medium"><Wallet size={14} className="text-expense" /> Spending limit</span>
            <span className="tabular text-ink-soft">
              {fmtMoney(agg.expense)} / {expenseBudget ? fmtMoney(parseFloat(expenseBudget)) : "—"}
              {expenseBudget && (agg.expense <= parseFloat(expenseBudget) ? " ✓" : " ⚠")}
            </span>
          </div>
          {bar(agg.expense, parseFloat(expenseBudget) || 0, agg.expense <= (parseFloat(expenseBudget) || Infinity) ? "bg-income" : "bg-expense")}
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 font-medium"><PiggyBank size={14} className="text-income" /> Savings goal</span>
            <span className="tabular text-ink-soft">{fmtMoney(Math.max(0, agg.net))} / {savingsGoal ? fmtMoney(parseFloat(savingsGoal)) : "—"}</span>
          </div>
          {bar(Math.max(0, agg.net), parseFloat(savingsGoal) || 0, "bg-income")}
        </div>
      </section>

      {/* editors */}
      <section className="card mt-3 space-y-3 p-5">
        <h3 className="text-sm font-semibold">Set goals for {monthLabel(month)}</h3>
        <label className="block">
          <span className="text-xs text-ink-soft">Monthly income goal</span>
          <input type="number" inputMode="decimal" value={incomeGoal} onChange={(e) => setIncomeGoal(e.target.value)} placeholder="e.g. 150000" className="mt-1 w-full rounded-xl border border-line bg-card px-3 py-2.5 text-sm" />
        </label>
        <label className="block">
          <span className="text-xs text-ink-soft">Monthly spending limit</span>
          <input type="number" inputMode="decimal" value={expenseBudget} onChange={(e) => setExpenseBudget(e.target.value)} placeholder="e.g. 60000" className="mt-1 w-full rounded-xl border border-line bg-card px-3 py-2.5 text-sm" />
        </label>
        <label className="block">
          <span className="text-xs text-ink-soft">Monthly savings goal</span>
          <input type="number" inputMode="decimal" value={savingsGoal} onChange={(e) => setSavingsGoal(e.target.value)} placeholder="e.g. 40000" className="mt-1 w-full rounded-xl border border-line bg-card px-3 py-2.5 text-sm" />
        </label>
        <button onClick={save} disabled={!dirty} className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-white disabled:opacity-40">
          {existing ? "Update goals" : "Set goals"}
        </button>
      </section>

      {/* per-category budgets */}
      <section className="card mt-3 p-5">
        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold"><Target size={14} /> Category limits (this month)</h3>
        <div className="space-y-3">
          {expenseCats.map((c) => {
            const spent = agg.byCategorySpend.find((x) => x.id === c._id)?.amount ?? 0;
            const limit = parseFloat(catBudgets[c._id] || "");
            return (
              <div key={c._id}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-ink-soft">{c.name}</span>
                  <input
                    type="number" inputMode="decimal" placeholder="Limit"
                    value={catBudgets[c._id] ?? ""}
                    onChange={(e) => setCatBudgets({ ...catBudgets, [c._id]: e.target.value })}
                    className="w-24 rounded-lg border border-line bg-card px-2 py-1 text-right text-xs tabular"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1">{bar(spent, limit || 0, limit && spent > limit ? "bg-expense" : "bg-primary")}</div>
                  <span className="w-16 text-right text-[11px] tabular text-ink-faint">{fmtMoney(spent, { compact: true })}</span>
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[11px] text-ink-faint">Category limits are stored locally per device.</p>
      </section>
      {!ready && <p className="py-10 text-center text-sm text-ink-faint">Loading…</p>}
    </AppShell>
  );
}
