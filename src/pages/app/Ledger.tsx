import { useMemo, useState } from "react";
import { useFinance } from "@/finance/FinanceContext";
import AppShell, { useEntryEdit } from "@/finance/AppShell";
import { fmtMoney, fmtDate } from "@/finance/format";
import { searchTxns } from "@/finance/analytics";
import { CatIcon } from "@/finance/icons";
import { Search, X } from "lucide-react";

export default function Ledger() {
  const { ready, transactions, categories, catName, accountName } = useFinance();
  const { openEntry } = useEntryEdit();

  const [q, setQ] = useState("");
  const [kind, setKind] = useState<"all" | "expense" | "income">("all");
  const [catId, setCatId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const results = useMemo(
    () =>
      searchTxns(transactions, catName, {
        q,
        kind,
        categoryId: catId || undefined,
        from: from ? new Date(from).getTime() : undefined,
        to: to ? new Date(to).getTime() : undefined,
      }),
    [transactions, catName, q, kind, catId, from, to]
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

  const totals = useMemo(() => {
    let inc = 0, exp = 0;
    for (const t of results) t.kind === "income" ? (inc += t.amount) : (exp += t.amount);
    return { inc, exp, net: inc - exp };
  }, [results]);

  return (
    <AppShell title="Ledger" subtitle="Search every entry — keyword, category or date">
      <div className="sticky top-[4.5rem] z-20 -mx-4 bg-surface/95 px-4 pb-2 pt-1 backdrop-blur">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search notes, categories…"
            className="w-full rounded-xl border border-line bg-card py-2.5 pl-9 pr-8 text-sm outline-none focus:border-primary"
          />
          {q && (
            <button onClick={() => setQ("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-faint">
              <X size={14} />
            </button>
          )}
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          {(["all", "expense", "income"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                kind === k ? "bg-primary text-white" : "bg-surface-2 text-ink-soft"
              }`}
            >
              {k}
            </button>
          ))}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`ml-auto rounded-full px-3 py-1 text-xs font-medium ${
              catId || from || to ? "bg-primary text-white" : "bg-surface-2 text-ink-soft"
            }`}
          >
            Filters
          </button>
        </div>
        {showFilters && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <select value={catId} onChange={(e) => setCatId(e.target.value)} className="rounded-lg border border-line bg-card px-2 py-1.5 text-xs">
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-1">
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-line bg-card px-2 py-1.5 text-xs" />
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-line bg-card px-2 py-1.5 text-xs" />
            </div>
          </div>
        )}
      </div>

      <p className="mb-2 mt-1 text-xs text-ink-faint tabular">
        {results.length} results · in {fmtMoney(totals.inc)} · out {fmtMoney(totals.exp)} · net {fmtMoney(totals.net, { sign: true })}
      </p>

      {!ready ? (
        <p className="py-16 text-center text-sm text-ink-faint">Loading…</p>
      ) : groups.length === 0 ? (
        <p className="py-16 text-center text-sm text-ink-faint">Nothing matches this search.</p>
      ) : (
        groups.map(([day, rows]) => (
          <div key={day} className="mb-3">
            <p className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
              {day === new Date().toDateString() ? "Today" : fmtDate(rows[0].date)}
            </p>
            <section className="card divide-y divide-line/70 overflow-hidden">
              {rows.map((t) => (
                <button
                  key={t._id}
                  onClick={() => openEntry(t._id)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-surface-2"
                >
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${t.kind === "income" ? "bg-income/10 text-income" : "bg-expense/10 text-expense"}`}>
                    <CatIcon name={categories.find((c) => c._id === t.categoryId)?.icon} size={15} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{catName(t.categoryId)}{t.subcategory ? ` › ${t.subcategory}` : ""}</span>
                    <span className="block truncate text-xs text-ink-faint">
                      {t.note || "—"}{t.accountId ? ` · ${accountName(t.accountId)}` : ""}
                    </span>
                  </span>
                  <span className={`tabular text-sm font-semibold ${t.kind === "income" ? "text-income" : "text-expense"}`}>
                    {t.kind === "income" ? "+" : "−"}{fmtMoney(t.amount)}
                  </span>
                </button>
              ))}
            </section>
          </div>
        ))
      )}
    </AppShell>
  );
}
