import { useEffect, useMemo, useState } from "react";
import { useFinance, type DepositRow, type DepositFlowRow } from "@/finance/FinanceContext";
import AppShell from "@/finance/AppShell";
import { fmtMoney, fmtDate } from "@/finance/format";
import { summarizePosition, portfolioTotals, mfValue, type PositionSummary } from "@/finance/portfolio";
import { RefreshCw, Plus, X, TrendingUp, TrendingDown, Search, Gift, Landmark, Clock } from "lucide-react";

function localDateStr(ms = Date.now()): string {
  const d = new Date(ms);
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function dateToMs(str: string, endOfDay = false): number {
  if (!str) return Date.now();
  const [y, m, d] = str.split("-").map(Number);
  return endOfDay ? new Date(y, m - 1, d, 23, 59, 59).getTime() : new Date(y, m - 1, d, 12).getTime();
}

type Horizon = "all" | "st" | "lt";
const ALLOC_COLORS = ["#42e5a2", "#c6bfff", "#60fdb8", "#ff908d"];

export default function Investments() {
  const {
    ready, stocks, exits, dividends, mutualFunds, deposits, depositFlows, quotes, indices, quotesReady,
    refreshQuotes, addStock, addExit, deleteExit, addDividend, deleteDividend, deleteStock, updateStock,
    addMF, deleteMF, addDeposit, addDepositFlow, removeDepositFlow, deleteDeposit,
  } = useFinance();

  const [addOpen, setAddOpen] = useState<null | "stock" | "mf" | "deposit">(null);
  const [horizon, setHorizon] = useState<Horizon>("all");

  const positions = useMemo(
    () => stocks.map((s) => summarizePosition(s, exits, dividends, quotes[s.symbol] ?? null)),
    [stocks, exits, dividends, quotes]
  );
  const open = positions.filter((p) => p.remainingQty > 0);
  const closed = positions.filter((p) => p.remainingQty === 0);
  const ltPositions = open.filter((p) => p.longTerm);
  const stPositions = open.filter((p) => !p.longTerm);
  const totals = portfolioTotals(positions);

  const secTotals = (list: PositionSummary[]) => {
    let value = 0, invested = 0, pl = 0, hasLive = false;
    for (const p of list) {
      const v = p.currentValue ?? p.investedRemaining;
      value += v;
      invested += p.investedRemaining;
      if (p.unrealizedPL !== null) { pl += p.unrealizedPL; hasLive = true; }
    }
    return { value, invested, pl: hasLive ? pl : null };
  };
  const ltSec = secTotals(ltPositions);
  const stSec = secTotals(stPositions);

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

  // hero shows the whole portfolio (stocks + MF + deposits)
  const totalValue = totals.currentValue + mfTotals.value + depositsValue;
  const totalPL = totals.totalPL === null ? null : totals.totalPL + (mfTotals.value - mfTotals.invested);
  const totalPct =
    totalPL !== null && totals.investedAllTime + mfTotals.invested > 0
      ? (totalPL / (totals.investedAllTime + mfTotals.invested)) * 100
      : null;
  const cagr = totals.cagrPct;

  // allocation donut
  const alloc = useMemo(() => {
    const rows = [
      { label: "Stocks", value: totals.currentValue },
      { label: "Mutual funds", value: mfTotals.value },
      { label: "FD · PPF", value: depositsValue },
      { label: "Realized cash", value: Math.max(0, totals.realizedPL + totals.dividends) },
    ].filter((r) => r.value > 0);
    const total = rows.reduce((s, r) => s + r.value, 0) || 1;
    return rows.map((r, i) => ({
      ...r,
      pct: (r.value / total) * 100,
      color: ALLOC_COLORS[i % ALLOC_COLORS.length],
    }));
  }, [totals, mfTotals, depositsValue]);
  let acc = 0;
  const allocSegs = alloc.map((a) => {
    const seg = { ...a, dash: (a.pct / 100) * 100, offset: -acc };
    acc += a.pct;
    return seg;
  });
  const biggest = allocSegs.length
    ? allocSegs.reduce((m, a) => (a.pct > m.pct ? a : m))
    : { label: "—", pct: 0, value: 0, color: "#42e5a2", dash: 0, offset: 0 };

  const nifty = indices["^NSEI"] ?? null;
  const sensex = indices["^BSESN"] ?? null;

  const showLt = horizon === "all" || horizon === "lt";
  const showSt = horizon === "all" || horizon === "st";
  const showOthers = horizon === "all";

  if (!ready) {
    return (
      <AppShell title="Investments" subtitle="Loading…">
        <p className="py-20 text-center text-sm text-ink-faint">Loading…</p>
      </AppShell>
    );
  }

  const positionCard = (p: PositionSummary) => (
    <PositionCard
      key={p.stock._id}
      p={p}
      deleteExit={deleteExit}
      deleteDividend={deleteDividend}
      onExit={(q, price, date, ch) => addExit({ stockId: p.stock._id, quantity: q, exitPrice: price, exitDate: date, charges: ch })}
      onDividend={(amt, date, note) => addDividend({ stockId: p.stock._id, amount: amt, date, note })}
      onBonus={(qty) => updateStock(p.stock._id, { bonuses: p.bonuses + qty })}
      onDelete={() => deleteStock(p.stock._id)}
    />
  );

  return (
    <AppShell title="Investments & Portfolio" subtitle="Stocks, funds and deposits at live prices">
      {/* segmented horizon toggle */}
      <div className="mb-4 flex items-center justify-between gap-1 rounded-full bg-surface-low p-1 shadow-inner">
        {(
          [
            { key: "all", label: "All Assets" },
            { key: "st", label: "Short-Term" },
            { key: "lt", label: "Long-Term" },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setHorizon(t.key)}
            className={`flex-1 rounded-full py-2 text-center text-xs font-semibold transition-all ${
              horizon === t.key ? "bg-card-high text-primary shadow-sm" : "text-ink-faint"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* portfolio hero card */}
      <section className="relative overflow-hidden rounded-2xl border border-white/5 bg-card p-5 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.45)]">
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-secondary-deep/30 blur-2xl" />
        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-ink-faint">
              <Landmark size={14} className="text-primary" />
              Total Portfolio Value
            </span>
            <span className="rounded-full bg-card-highest px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-primary">
              INR
            </span>
          </div>
          <div className="text-4xl font-extrabold tracking-tight tabular">{fmtMoney(totalValue, { compact: true })}</div>

          {/* metric badges row */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="flex flex-col rounded-lg border border-white/5 bg-surface-low/70 p-2.5">
              <span className="text-[11px] text-ink-faint">All Time Return</span>
              <div className={`mt-0.5 flex items-center gap-1 text-xs font-semibold ${(totalPL ?? 0) >= 0 ? "text-primary-bright" : "text-tertiary-deep"}`}>
                {totalPL === null ? (
                  "—"
                ) : (
                  <>
                    {totalPL >= 0 ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
                    <span className="tabular">{fmtMoney(totalPL, { sign: true, compact: true })}</span>
                    {totalPct !== null && <span className="text-[11px] font-bold">({totalPct >= 0 ? "+" : ""}{totalPct.toFixed(1)}%)</span>}
                  </>
                )}
              </div>
            </div>
            <div className="flex flex-col rounded-lg border border-white/5 bg-surface-low/70 p-2.5">
              <span className="text-[11px] text-ink-faint">Running CAGR</span>
              <div className={`mt-0.5 flex items-center gap-1 text-xs font-semibold ${(cagr ?? 0) >= 0 ? "text-primary-bright" : "text-tertiary-deep"}`}>
                {cagr === null ? (
                  "—"
                ) : (
                  <>
                    <TrendingUp size={15} />
                    <span className="tabular">{cagr >= 0 ? "+" : ""}{cagr.toFixed(1)}%</span>
                    <span className="text-[10px] text-ink-faint">annualised</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* asset allocation card */}
      <section className="mt-4 space-y-4 rounded-2xl border border-white/5 bg-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">Asset Allocation</h2>
            <p className="text-[11px] text-ink-faint">Diversification across {Math.max(1, alloc.length)} asset classes</p>
          </div>
        </div>
        <div className="flex items-center gap-6 pt-1">
          <div className="relative flex h-32 w-32 flex-shrink-0 items-center justify-center">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 42 42">
              <circle cx="21" cy="21" fill="transparent" r="15.915" stroke="#060e20" strokeWidth="4.5" />
              {allocSegs.map((seg, i) => (
                <circle
                  key={i}
                  cx="21"
                  cy="21"
                  fill="transparent"
                  r="15.915"
                  stroke={seg.color}
                  strokeDasharray={`${seg.dash} ${100 - seg.dash}`}
                  strokeDashoffset={seg.offset}
                  strokeLinecap="round"
                  strokeWidth="4.5"
                />
              ))}
            </svg>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[10px] text-ink-faint">{biggest.label}</span>
              <span className="text-base font-bold" style={{ color: biggest.color }}>
                {biggest.pct.toFixed(0)}%
              </span>
            </div>
          </div>
          <div className="flex-1 space-y-2.5">
            {alloc.map((a) => (
              <div key={a.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: a.color }} />
                  <span className="text-xs">{a.label}</span>
                </div>
                <div className="text-right">
                  <div className="text-xs font-semibold tabular">{fmtMoney(a.value, { compact: true })}</div>
                  <div className="text-[10px] text-ink-faint tabular">{a.pct.toFixed(0)}%</div>
                </div>
              </div>
            ))}
            {alloc.length === 0 && <p className="text-xs text-ink-faint">Add your first investment below.</p>}
          </div>
        </div>
      </section>

      {/* index strip + refresh */}
      <div className="mb-4 mt-4 flex gap-2">
        <div className="flex-1 rounded-2xl border border-white/5 bg-card p-3">
          <p className="text-[10px] text-ink-faint">Nifty 50</p>
          <p className="text-sm font-semibold tabular">{nifty ? nifty.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "—"}</p>
        </div>
        <div className="flex-1 rounded-2xl border border-white/5 bg-card p-3">
          <p className="text-[10px] text-ink-faint">Sensex</p>
          <p className="text-sm font-semibold tabular">{sensex ? sensex.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "—"}</p>
        </div>
        <button onClick={refreshQuotes} className="flex items-center rounded-2xl border border-white/5 bg-card px-3 text-ink-soft active:bg-card-high" aria-label="Refresh prices">
          <RefreshCw size={16} className={quotesReady ? "" : "animate-spin"} />
        </button>
      </div>

      {/* add buttons — capsule row */}
      <div className="grid grid-cols-3 gap-2">
        <button onClick={() => setAddOpen("stock")} className="flex items-center justify-center gap-1 rounded-full bg-primary py-2.5 text-xs font-bold text-[#003823] active:scale-[0.98]">
          <Plus size={14} /> Stock
        </button>
        <button onClick={() => setAddOpen("mf")} className="flex items-center justify-center gap-1 rounded-full border border-secondary/30 bg-secondary-deep/20 py-2.5 text-xs font-semibold text-secondary active:scale-[0.98]">
          <Plus size={14} /> Mutual fund
        </button>
        <button onClick={() => setAddOpen("deposit")} className="flex items-center justify-center gap-1 rounded-full border border-white/10 bg-card py-2.5 text-xs font-semibold text-ink active:scale-[0.98]">
          <Plus size={14} /> FD / PPF
        </button>
      </div>

      {/* long term section */}
      {showLt && (
        <section className="mt-4 space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-secondary" />
              <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                <Clock size={14} className="text-secondary" /> Long-Term Holdings
              </h3>
            </div>
            <span className="text-sm font-bold text-secondary tabular">{fmtMoney(ltSec.value, { compact: true })}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 rounded-xl bg-card p-2.5 text-center">
            <div>
              <p className="text-[10px] text-ink-faint">Invested</p>
              <p className="text-xs font-semibold tabular">{fmtMoney(ltSec.invested, { compact: true })}</p>
            </div>
            <div>
              <p className="text-[10px] text-ink-faint">Current value</p>
              <p className="text-xs font-semibold tabular">{fmtMoney(ltSec.value, { compact: true })}</p>
            </div>
            <div>
              <p className="text-[10px] text-ink-faint">Open P&amp;L</p>
              <p className={`text-xs font-semibold tabular ${(ltSec.pl ?? 0) >= 0 ? "text-primary-bright" : "text-tertiary-deep"}`}>
                {ltSec.pl === null ? "—" : fmtMoney(ltSec.pl, { sign: true, compact: true })}
              </p>
            </div>
          </div>
          <div className="space-y-2.5">
            {ltPositions.length === 0 && <p className="py-2 text-center text-xs text-ink-faint">No holdings older than a year yet.</p>}
            {ltPositions.map(positionCard)}
          </div>
        </section>
      )}

      {/* short term section */}
      {showSt && (
        <section className="mt-4 space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary" />
              <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                <TrendingUp size={14} className="text-primary" /> Short-Term &amp; Active
              </h3>
            </div>
            <span className="text-sm font-bold text-primary tabular">{fmtMoney(stSec.value, { compact: true })}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 rounded-xl bg-card p-2.5 text-center">
            <div>
              <p className="text-[10px] text-ink-faint">Invested</p>
              <p className="text-xs font-semibold tabular">{fmtMoney(stSec.invested, { compact: true })}</p>
            </div>
            <div>
              <p className="text-[10px] text-ink-faint">Current value</p>
              <p className="text-xs font-semibold tabular">{fmtMoney(stSec.value, { compact: true })}</p>
            </div>
            <div>
              <p className="text-[10px] text-ink-faint">Open P&amp;L</p>
              <p className={`text-xs font-semibold tabular ${(stSec.pl ?? 0) >= 0 ? "text-primary-bright" : "text-tertiary-deep"}`}>
                {stSec.pl === null ? "—" : fmtMoney(stSec.pl, { sign: true, compact: true })}
              </p>
            </div>
          </div>
          <div className="space-y-2.5">
            {stPositions.length === 0 && <p className="py-2 text-center text-xs text-ink-faint">No holdings under a year.</p>}
            {stPositions.map(positionCard)}
          </div>
        </section>
      )}

      {showOthers && closed.length > 0 && (
        <>
          <h3 className="mb-2 mt-4 px-1 text-sm font-semibold">Fully exited ({closed.length})</h3>
          <div className="space-y-2">{closed.map(positionCard)}</div>
        </>
      )}

      {/* mutual funds */}
      {showOthers && (
        <>
          <h3 className="mb-2 mt-4 px-1 text-sm font-semibold">Mutual funds ({mutualFunds.length})</h3>
          {mutualFunds.length === 0 && <p className="rounded-2xl bg-card p-5 text-center text-sm text-ink-faint">No funds yet.</p>}
          <div className="space-y-2.5">
            {mutualFunds.map((f) => {
              const v = mfValue(f, f.navSymbol ? quotes[f.navSymbol] ?? null : null);
              return (
                <div key={f._id} className="flex items-center gap-3 rounded-2xl border border-white/5 bg-card p-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary-deep/30 text-xs font-bold text-secondary">MF</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{f.name}</p>
                    <p className="text-[11px] text-ink-faint tabular">{f.units} units × NAV {v.nav.toFixed(2)}{f.navSymbol ? " (live)" : ""}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular">{fmtMoney(v.value, { compact: true })}</p>
                    <p className={`text-xs tabular ${v.pl >= 0 ? "text-primary-bright" : "text-tertiary-deep"}`}>{fmtMoney(v.pl, { sign: true, compact: true })}</p>
                  </div>
                  <button onClick={() => deleteMF(f._id)} className="text-ink-faint hover:text-tertiary-deep" aria-label="Delete fund"><X size={15} /></button>
                </div>
              );
            })}
          </div>

          {/* deposits */}
          <h3 className="mb-2 mt-4 px-1 text-sm font-semibold">Deposits — FD, PPF &amp; others ({deposits.length})</h3>
          {deposits.length === 0 && <p className="rounded-2xl bg-card p-5 text-center text-sm text-ink-faint">No deposits yet — add an FD, PPF or any interest-bearing tool.</p>}
          <div className="space-y-2.5">
            {deposits.map((d) => (
              <DepositCard
                key={d._id}
                d={d}
                flows={depositFlows.filter((f) => f.depositId === d._id)}
                onFlow={(type, amount, date, note) => addDepositFlow({ depositId: d._id, type, amount, date, note })}
                onRemoveFlow={removeDepositFlow}
                onDelete={() => deleteDeposit(d._id)}
              />
            ))}
          </div>
        </>
      )}

      {addOpen && (
        <AddSheet
          kind={addOpen}
          onClose={() => setAddOpen(null)}
          onAddStock={addStock}
          onAddMF={addMF}
          onAddDeposit={addDeposit}
        />
      )}
    </AppShell>
  );
}

function PositionCard({
  p, onExit, onDividend, onBonus, onDelete, deleteExit, deleteDividend,
}: {
  p: PositionSummary;
  onExit?: (qty: number, price: number, date: number, charges?: number) => void;
  onDividend?: (amount: number, date: number, note: string) => void;
  onBonus?: (qty: number) => void;
  onDelete: () => void;
  deleteExit: (exitId: string) => void;
  deleteDividend: (id: string) => void;
}) {
  const [panel, setPanel] = useState<null | "exit" | "div" | "bonus">(null);
  const live = p.currentValue !== null;
  const pl = p.unrealizedPL;
  const costBasis = p.investedRemaining + (p.stock.buyCharges ?? 0) * (p.remainingQty / Math.max(1, p.stock.quantity + p.bonuses));
  const plPct = pl !== null && costBasis > 0 ? ((pl / costBasis) * 100).toFixed(1) : null;

  return (
    <div className="rounded-2xl border border-white/5 bg-card p-4">
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${pl !== null && pl < 0 ? "bg-tertiary-deep/20 text-tertiary-deep" : "bg-primary/10 text-primary-bright"}`}>
          {pl !== null && pl < 0 ? <TrendingDown size={16} /> : <TrendingUp size={16} />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h4 className="truncate text-sm font-semibold">{p.stock.symbol.replace(/\.(NS|BO)$/, "")}</h4>
            <span className="flex-shrink-0 rounded bg-card-high px-1.5 py-0.5 text-[9px] text-ink-faint">{p.stock.exchange}</span>
            <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold ${p.longTerm ? "bg-secondary-deep/30 text-secondary" : "bg-primary/15 text-primary-bright"}`}>
              {p.longTerm ? "LONG" : "SHORT"}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-ink-faint tabular">
            {p.remainingQty} left{p.bonuses > 0 ? ` (incl. ${p.bonuses} bonus)` : ""} · buy {fmtMoney(p.stock.buyPrice)} · {p.daysHeld}d
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold tabular">{live ? fmtMoney(p.currentValue!, { compact: true }) : fmtMoney(p.investedRemaining, { compact: true })}</p>
          {p.remainingQty > 0 && (
            <span className={`mt-0.5 inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${pl !== null && pl < 0 ? "bg-tertiary-deep/15 text-tertiary" : "bg-primary/15 text-primary-bright"}`}>
              {pl === null ? "no live price" : `${fmtMoney(pl, { sign: true, compact: true })}${plPct ? ` (${plPct}%)` : ""}`}
            </span>
          )}
          {p.remainingQty === 0 && (
            <p className={`text-xs tabular ${p.realizedPL >= 0 ? "text-primary-bright" : "text-tertiary-deep"}`}>
              realized {fmtMoney(p.realizedPL, { sign: true, compact: true })}
            </p>
          )}
        </div>
        <button onClick={onDelete} className="text-ink-faint hover:text-tertiary-deep" aria-label="Delete"><X size={15} /></button>
      </div>

      {p.remainingQty > 0 && (
        <div className="mt-2.5 flex gap-1.5">
          {onExit && (
            <button onClick={() => setPanel(panel === "exit" ? null : "exit")} className="flex-1 rounded-full border border-white/10 bg-surface-low py-1.5 text-[11px] font-semibold active:scale-[0.98]">
              Exit
            </button>
          )}
          {onDividend && (
            <button onClick={() => setPanel(panel === "div" ? null : "div")} className="flex-1 rounded-full border border-white/10 bg-surface-low py-1.5 text-[11px] font-semibold active:scale-[0.98]">
              Dividend
            </button>
          )}
          {onBonus && (
            <button onClick={() => setPanel(panel === "bonus" ? null : "bonus")} className="flex-1 flex items-center justify-center gap-1 rounded-full border border-white/10 bg-surface-low py-1.5 text-[11px] font-semibold active:scale-[0.98]">
              <Gift size={11} /> Bonus
            </button>
          )}
        </div>
      )}

      {panel === "exit" && onExit && (
        <ExitForm remaining={p.remainingQty} onSubmit={(q, price, date, ch) => { onExit(q, price, date, ch); setPanel(null); }} />
      )}
      {panel === "div" && onDividend && (
        <DivForm onSubmit={(amt, date, note) => { onDividend(amt, date, note); setPanel(null); }} />
      )}
      {panel === "bonus" && onBonus && (
        <BonusForm onSubmit={(q) => { onBonus(q); setPanel(null); }} />
      )}

      {p.exits.length > 0 && (
        <div className="mt-2 space-y-1">
          {p.exits.map((e) => (
            <div key={e._id} className="flex items-center justify-between rounded-xl bg-surface-low px-3 py-1.5 text-xs">
              <span className="tabular text-ink-soft">
                Sold {e.quantity} @ {fmtMoney(e.exitPrice)}{(e.charges ?? 0) > 0 ? ` (−${fmtMoney(e.charges!, { compact: true })})` : ""} · {fmtDate(e.exitDate)}
              </span>
              <span className={`tabular font-semibold ${(e.exitPrice - p.stock.buyPrice) * e.quantity - (e.charges ?? 0) >= 0 ? "text-primary-bright" : "text-tertiary-deep"}`}>
                {fmtMoney((e.exitPrice - p.stock.buyPrice) * e.quantity - (e.charges ?? 0), { sign: true })}
              </span>
              <button onClick={() => deleteExit(e._id)} className="ml-2 text-ink-faint" aria-label="Remove exit">×</button>
            </div>
          ))}
        </div>
      )}

      {p.dividendRows.length > 0 && (
        <div className="mt-2 space-y-1">
          {p.dividendRows.map((d) => (
            <div key={d._id} className="flex items-center justify-between rounded-xl bg-surface-low px-3 py-1.5 text-xs">
              <span className="tabular text-ink-soft">Dividend · {fmtDate(d.date)}{d.note ? ` · ${d.note}` : ""}</span>
              <span className="tabular font-semibold text-primary-bright">{fmtMoney(d.amount, { sign: true })}</span>
              <button onClick={() => deleteDividend(d._id)} className="ml-2 text-ink-faint" aria-label="Remove dividend">×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ExitForm({ remaining, onSubmit }: { remaining: number; onSubmit: (qty: number, price: number, date: number, charges?: number) => void }) {
  const [qty, setQty] = useState(String(remaining));
  const [price, setPrice] = useState("");
  const [charges, setCharges] = useState("");
  const [date, setDate] = useState(localDateStr());
  return (
    <div className="mt-2 rounded-xl bg-surface-low p-3">
      <p className="mb-2 text-[11px] text-ink-soft">Partial or full exit — up to {remaining} units. Charges reduce realized P&amp;L.</p>
      <div className="grid grid-cols-3 gap-2">
        <input type="number" inputMode="decimal" placeholder="Qty" value={qty} onChange={(e) => setQty(e.target.value)} className="rounded-lg border border-white/10 bg-card px-3 py-2 text-sm" />
        <input type="number" inputMode="decimal" placeholder="Sell price" value={price} onChange={(e) => setPrice(e.target.value)} className="rounded-lg border border-white/10 bg-card px-3 py-2 text-sm" />
        <input type="number" inputMode="decimal" placeholder="Charges" value={charges} onChange={(e) => setCharges(e.target.value)} className="rounded-lg border border-white/10 bg-card px-3 py-2 text-sm" />
      </div>
      <label className="mt-2 block text-[11px] text-ink-faint">Exit date</label>
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-lg border border-white/10 bg-card px-3 py-2 text-sm" />
      <button
        onClick={() => {
          const q = parseFloat(qty), pr = parseFloat(price), ch = parseFloat(charges);
          if (q > 0 && q <= remaining && pr > 0) onSubmit(q, pr, dateToMs(date, true), isNaN(ch) ? undefined : ch);
        }}
        className="mt-2 w-full rounded-full bg-primary py-2 text-xs font-bold text-[#003823] disabled:opacity-40"
        disabled={!parseFloat(qty) || !parseFloat(price)}
      >
        Record exit
      </button>
    </div>
  );
}

function DivForm({ onSubmit }: { onSubmit: (amount: number, date: number, note: string) => void }) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(localDateStr());
  return (
    <div className="mt-2 rounded-xl bg-surface-low p-3">
      <div className="grid grid-cols-2 gap-2">
        <input type="number" inputMode="decimal" placeholder="Dividend ₹" value={amount} onChange={(e) => setAmount(e.target.value)} className="rounded-lg border border-white/10 bg-card px-3 py-2 text-sm" />
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg border border-white/10 bg-card px-3 py-2 text-sm" />
      </div>
      <input placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-card px-3 py-2 text-sm" />
      <button
        onClick={() => { const a = parseFloat(amount); if (a > 0) onSubmit(a, dateToMs(date, true), note.trim()); }}
        className="mt-2 w-full rounded-full bg-primary py-2 text-xs font-bold text-[#003823] disabled:opacity-40"
        disabled={!parseFloat(amount)}
      >
        Add dividend
      </button>
    </div>
  );
}

function BonusForm({ onSubmit }: { onSubmit: (qty: number) => void }) {
  const [qty, setQty] = useState("");
  return (
    <div className="mt-2 rounded-xl bg-surface-low p-3">
      <p className="mb-2 text-[11px] text-ink-soft">Bonus shares are held at zero cost — they raise your quantity without touching invested amount.</p>
      <input type="number" inputMode="decimal" placeholder="Bonus units" value={qty} onChange={(e) => setQty(e.target.value)} className="w-full rounded-lg border border-white/10 bg-card px-3 py-2 text-sm" />
      <button
        onClick={() => { const q = parseFloat(qty); if (q > 0) onSubmit(q); }}
        className="mt-2 w-full rounded-full bg-primary py-2 text-xs font-bold text-[#003823] disabled:opacity-40"
        disabled={!parseFloat(qty)}
      >
        Credit bonus shares
      </button>
    </div>
  );
}

function DepositCard({
  d, flows, onFlow, onRemoveFlow, onDelete,
}: {
  d: DepositRow;
  flows: DepositFlowRow[];
  onFlow: (type: "deposit" | "withdrawal" | "interest", amount: number, date: number, note?: string) => void;
  onRemoveFlow: (flowId: string) => void;
  onDelete: () => void;
}) {
  const [panel, setPanel] = useState<null | "deposit" | "interest" | "withdrawal">(null);
  const deposited = flows.filter((f) => f.type === "deposit").reduce((s, f) => s + f.amount, 0);
  const interest = flows.filter((f) => f.type === "interest").reduce((s, f) => s + f.amount, 0);
  const withdrawn = flows.filter((f) => f.type === "withdrawal").reduce((s, f) => s + f.amount, 0);
  const value = deposited + interest - withdrawn;
  const KIND_LABEL = { fd: "FD", ppf: "PPF", fund: "Fund" } as const;

  return (
    <div className="rounded-2xl border border-white/5 bg-card p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Landmark size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">
            <span className="mr-1.5 rounded-full bg-primary/15 px-2 py-0.5 text-[9px] font-bold text-primary">{KIND_LABEL[d.kind]}</span>
            {d.name}
          </p>
          <p className="truncate text-[11px] text-ink-faint tabular">
            {d.institution ? `${d.institution} · ` : ""}{d.ratePct ? `${d.ratePct}% p.a. · ` : ""}{d.maturityDate ? `matures ${fmtDate(d.maturityDate)}` : ""}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold tabular">{fmtMoney(value, { compact: true })}</p>
          <p className="text-[11px] text-ink-faint tabular">in {fmtMoney(deposited, { compact: true })} · int {fmtMoney(interest, { compact: true })}</p>
        </div>
        <button onClick={onDelete} className="text-ink-faint hover:text-tertiary-deep" aria-label="Delete deposit"><X size={15} /></button>
      </div>

      <div className="mt-2.5 flex gap-1.5">
        <button onClick={() => setPanel(panel === "deposit" ? null : "deposit")} className="flex-1 rounded-full border border-white/10 bg-surface-low py-1.5 text-[11px] font-semibold">+ Deposit</button>
        <button onClick={() => setPanel(panel === "interest" ? null : "interest")} className="flex-1 rounded-full border border-white/10 bg-surface-low py-1.5 text-[11px] font-semibold">+ Interest</button>
        <button onClick={() => setPanel(panel === "withdrawal" ? null : "withdrawal")} className="flex-1 rounded-full border border-white/10 bg-surface-low py-1.5 text-[11px] font-semibold">− Withdraw</button>
      </div>

      {panel && (
        <FlowForm
          type={panel}
          onSubmit={(type, amount, date, note) => { onFlow(type, amount, date, note); setPanel(null); }}
        />
      )}

      {flows.length > 0 && (
        <div className="mt-2 space-y-1">
          {flows.slice().sort((a, b) => b.date - a.date).map((f) => (
            <div key={f._id} className="flex items-center justify-between rounded-xl bg-surface-low px-3 py-1.5 text-xs">
              <span className="capitalize tabular text-ink-soft">{f.type} · {fmtDate(f.date)}{f.note ? ` · ${f.note}` : ""}</span>
              <span className={`tabular font-semibold ${f.type === "withdrawal" ? "text-tertiary-deep" : "text-primary-bright"}`}>
                {f.type === "withdrawal" ? "−" : "+"}{fmtMoney(f.amount, { compact: true })}
              </span>
              <button onClick={() => onRemoveFlow(f._id)} className="ml-2 text-ink-faint" aria-label="Remove">×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FlowForm({
  type, onSubmit,
}: {
  type: "deposit" | "withdrawal" | "interest";
  onSubmit: (type: "deposit" | "withdrawal" | "interest", amount: number, date: number, note?: string) => void;
}) {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(localDateStr());
  const [note, setNote] = useState("");
  return (
    <div className="mt-2 rounded-xl bg-surface-low p-3">
      <div className="grid grid-cols-2 gap-2">
        <input type="number" inputMode="decimal" placeholder={`Amount ₹`} value={amount} onChange={(e) => setAmount(e.target.value)} className="rounded-lg border border-white/10 bg-card px-3 py-2 text-sm" />
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg border border-white/10 bg-card px-3 py-2 text-sm" />
      </div>
      <input placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-card px-3 py-2 text-sm" />
      <button
        onClick={() => { const a = parseFloat(amount); if (a > 0) onSubmit(type, a, dateToMs(date, true), note.trim() || undefined); }}
        className="mt-2 w-full rounded-full bg-primary py-2 text-xs font-bold capitalize text-[#003823] disabled:opacity-40"
        disabled={!parseFloat(amount)}
      >
        Record {type}
      </button>
    </div>
  );
}

interface SymbolHit { symbol: string; name: string; exchange: string }

function AddSheet({
  kind, onClose, onAddStock, onAddMF, onAddDeposit,
}: {
  kind: "stock" | "mf" | "deposit";
  onClose: () => void;
  onAddStock: (s: { symbol: string; name?: string; quantity: number; buyPrice: number; buyDate: number; buyCharges?: number }) => void;
  onAddMF: (f: { name: string; units: number; avgNav: number; navSymbol?: string; manualNav?: number }) => void;
  onAddDeposit: (d: { kind: "fd" | "ppf" | "fund"; name: string; institution?: string; ratePct?: number; maturityDate?: number; startDate?: number }) => Promise<string>;
}) {
  const { addDepositFlow } = useFinance();
  const [symbol, setSymbol] = useState("");
  const [symName, setSymName] = useState("");
  const [hits, setHits] = useState<SymbolHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [showHits, setShowHits] = useState(false);
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");
  const [charges, setCharges] = useState("");
  const [buyDate, setBuyDate] = useState(localDateStr());
  const [name, setName] = useState("");
  const [units, setUnits] = useState("");
  const [nav, setNav] = useState("");
  const [navSym, setNavSym] = useState("");
  const [depKind, setDepKind] = useState<"fd" | "ppf" | "fund">("fd");
  const [institution, setInstitution] = useState("");
  const [rate, setRate] = useState("");
  const [maturity, setMaturity] = useState("");
  const [opening, setOpening] = useState("");
  const [saving, setSaving] = useState(false);

  const searchFinance = useFinanceSearch();

  useEffect(() => {
    if (kind !== "stock") return;
    const q = symbol.trim();
    if (q.length < 2) { setHits([]); return; }
    let alive = true;
    setSearching(true);
    const t = setTimeout(async () => {
      const rows = await searchFinance(q);
      if (!alive) return;
      setHits(rows);
      setShowHits(true);
      setSearching(false);
    }, 350);
    return () => { alive = false; clearTimeout(t); setSearching(false); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, kind]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-surface-lowest/80 backdrop-blur-sm animate-fade" onClick={onClose} />
      <div className="animate-sheet relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border-t border-white/10 bg-surface-low p-5 sm:max-w-md">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight">
              {kind === "stock" ? "Add stock position" : kind === "mf" ? "Add mutual fund" : "Add FD / PPF / deposit"}
            </h2>
            <p className="text-[11px] text-ink-faint">Syncs to cloud &amp; Sheets instantly</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-card-high"><X size={18} /></button>
        </div>
        {kind === "stock" && (
          <div className="space-y-3">
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
              <input
                placeholder="Search any NSE / BSE stock — company or symbol"
                value={symbol}
                onChange={(e) => {
                  setSymbol(e.target.value.toUpperCase());
                  setSymName("");
                  setShowHits(true);
                }}
                className="w-full rounded-full border border-white/10 bg-card py-2.5 pl-10 pr-3 text-sm uppercase"
              />
              {searching && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-ink-faint">…</span>}
              {showHits && hits.length > 0 && (
                <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-2xl border border-white/10 bg-card shadow-xl">
                  {hits.map((h) => (
                    <button
                      key={h.symbol}
                      onClick={() => {
                        setSymbol(h.symbol);
                        setSymName(h.name);
                        setShowHits(false);
                      }}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-card-high"
                    >
                      <span className="min-w-0 flex-1 truncate">{h.name}</span>
                      <span className="text-xs text-ink-faint">{h.symbol.replace(/\.(NS|BO)$/, "")} · {h.exchange}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {symName && <p className="-mt-1 text-[11px] text-primary-bright">Selected: {symName}</p>}
            <div className="grid grid-cols-2 gap-2">
              <input type="number" inputMode="decimal" placeholder="Quantity" value={qty} onChange={(e) => setQty(e.target.value)} className="rounded-xl border border-white/10 bg-card px-3 py-2.5 text-sm" />
              <input type="number" inputMode="decimal" placeholder="Entry price" value={price} onChange={(e) => setPrice(e.target.value)} className="rounded-xl border border-white/10 bg-card px-3 py-2.5 text-sm" />
            </div>
            <input type="number" inputMode="decimal" placeholder="Transaction charges (brokerage, STT…)" value={charges} onChange={(e) => setCharges(e.target.value)} className="w-full rounded-xl border border-white/10 bg-card px-3 py-2.5 text-sm" />
            <label className="block text-[11px] text-ink-faint">Entry date — days held and LT/ST are counted from this day</label>
            <input type="date" value={buyDate} onChange={(e) => setBuyDate(e.target.value)} className="w-full rounded-xl border border-white/10 bg-card px-3 py-2.5 text-sm" />
            <button
              onClick={() => {
                const q = parseFloat(qty), p = parseFloat(price), ch = parseFloat(charges);
                if (symbol.trim() && q > 0 && p > 0) {
                  onAddStock({
                    symbol: symbol.trim(), name: symName || undefined, quantity: q, buyPrice: p,
                    buyDate: dateToMs(buyDate, true), buyCharges: isNaN(ch) ? undefined : ch,
                  });
                  onClose();
                }
              }}
              className="w-full rounded-full bg-primary py-3 text-sm font-bold text-[#003823] shadow-[0_8px_24px_-4px_rgba(0,200,136,0.35)]"
            >
              Add position
            </button>
            <p className="text-center text-[11px] text-ink-faint">Categorised short/long term automatically from the entry date — exits and dividends can be added any time from the holding card.</p>
          </div>
        )}
        {kind === "mf" && (
          <div className="space-y-3">
            <input placeholder="Fund name" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-white/10 bg-card px-3 py-2.5 text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <input type="number" inputMode="decimal" placeholder="Units" value={units} onChange={(e) => setUnits(e.target.value)} className="rounded-xl border border-white/10 bg-card px-3 py-2.5 text-sm" />
              <input type="number" inputMode="decimal" placeholder="Avg NAV" value={nav} onChange={(e) => setNav(e.target.value)} className="rounded-xl border border-white/10 bg-card px-3 py-2.5 text-sm" />
            </div>
            <input placeholder="Live NAV symbol (optional)" value={navSym} onChange={(e) => setNavSym(e.target.value)} className="w-full rounded-xl border border-white/10 bg-card px-3 py-2.5 text-sm" />
            <button
              onClick={() => {
                const u = parseFloat(units), n = parseFloat(nav);
                if (name.trim() && u > 0 && n > 0) {
                  onAddMF({ name: name.trim(), units: u, avgNav: n, navSymbol: navSym.trim() || undefined });
                  onClose();
                }
              }}
              className="w-full rounded-full bg-primary py-3 text-sm font-bold text-[#003823]"
            >
              Add fund
            </button>
          </div>
        )}
        {kind === "deposit" && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-1 rounded-full bg-card p-1">
              {(["fd", "ppf", "fund"] as const).map((k) => (
                <button key={k} onClick={() => setDepKind(k)} className={`rounded-full py-1.5 text-xs font-semibold uppercase ${depKind === k ? "bg-primary text-[#003823]" : "text-ink-faint"}`}>
                  {k === "fd" ? "FD" : k}
                </button>
              ))}
            </div>
            <input placeholder={depKind === "ppf" ? "e.g. PPF — SBI" : depKind === "fd" ? "FD name / number" : "Fund name"} value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-white/10 bg-card px-3 py-2.5 text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="Bank / institution" value={institution} onChange={(e) => setInstitution(e.target.value)} className="rounded-xl border border-white/10 bg-card px-3 py-2.5 text-sm" />
              <input type="number" inputMode="decimal" placeholder="Rate % p.a." value={rate} onChange={(e) => setRate(e.target.value)} className="rounded-xl border border-white/10 bg-card px-3 py-2.5 text-sm" />
            </div>
            <label className="block text-[11px] text-ink-faint">Maturity date (optional)</label>
            <input type="date" value={maturity} onChange={(e) => setMaturity(e.target.value)} className="w-full rounded-xl border border-white/10 bg-card px-3 py-2.5 text-sm" />
            <label className="block text-[11px] text-ink-faint">Opening deposit amount (optional)</label>
            <input type="number" inputMode="decimal" placeholder="Amount ₹" value={opening} onChange={(e) => setOpening(e.target.value)} className="w-full rounded-xl border border-white/10 bg-card px-3 py-2.5 text-sm" />
            <button
              onClick={async () => {
                const amt = parseFloat(opening);
                if (!name.trim()) return;
                setSaving(true);
                try {
                  const id = await onAddDeposit({
                    kind: depKind,
                    name: name.trim(),
                    institution: institution.trim() || undefined,
                    ratePct: parseFloat(rate) || undefined,
                    maturityDate: maturity ? dateToMs(maturity, true) : undefined,
                    startDate: dateToMs(buyDate, true),
                  });
                  if (amt > 0) {
                    await addDepositFlow({ depositId: id, type: "deposit", amount: amt, date: dateToMs(buyDate, true) });
                  }
                  onClose();
                } finally {
                  setSaving(false);
                }
              }}
              className="w-full rounded-full bg-primary py-3 text-sm font-bold text-[#003823] disabled:opacity-40"
              disabled={!name.trim() || saving}
            >
              Add deposit
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// hook wrapper so AddSheet can call the market search action
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";

function useFinanceSearch() {
  const searchAction = useAction(api.market.search);
  return async (query: string): Promise<SymbolHit[]> => {
    try {
      const rows = (await searchAction({ query })) as unknown as SymbolHit[];
      return rows ?? [];
    } catch {
      return [];
    }
  };
}
