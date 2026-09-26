import { useEffect, useMemo, useState } from "react";
import { useFinance } from "@/finance/FinanceContext";
import AppShell from "@/finance/AppShell";
import { fmtMoney, fmtDate } from "@/finance/format";
import { summarizePosition, portfolioTotals, mfValue } from "@/finance/portfolio";
import { RefreshCw, Plus, X, TrendingUp, TrendingDown, Search } from "lucide-react";

export default function Investments() {
  const {
    ready, stocks, exits, dividends, mutualFunds, quotes, indices, quotesReady,
    refreshQuotes, addStock, addExit, deleteExit, addDividend, deleteDividend,
    deleteStock, addMF, deleteMF,
  } = useFinance();

  const [addOpen, setAddOpen] = useState<null | "stock" | "mf">(null);

  const positions = useMemo(
    () => stocks.map((s) => summarizePosition(s, exits, dividends, quotes[s.symbol] ?? null)),
    [stocks, exits, dividends, quotes]
  );
  const open = positions.filter((p) => p.remainingQty > 0);
  const closed = positions.filter((p) => p.remainingQty === 0);
  const totals = portfolioTotals(positions);

  const combinedPL =
    totals.unrealizedPL === null && totals.realizedPL === 0
      ? null
      : (totals.unrealizedPL ?? 0) + totals.realizedPL;
  const ltCombined = totals.longTermPL === null && totals.realizedPL === 0 ? null : (totals.longTermPL ?? 0) + totals.realizedPL;

  const nifty = indices["^NSEI"] ?? null;
  const sensex = indices["^BSESN"] ?? null;

  if (!ready) {
    return (
      <AppShell title="Investments" subtitle="Positions, live prices and profit / loss">
        <p className="py-20 text-center text-sm text-ink-faint">Loading…</p>
      </AppShell>
    );
  }

  return (
    <AppShell title="Investments" subtitle="Positions, live prices and profit / loss">
      {/* index strip */}
      <div className="mb-3 flex gap-2">
        <div className="card flex-1 p-3">
          <p className="text-[11px] text-ink-faint">Nifty 50</p>
          <p className="text-sm font-semibold tabular">{nifty ? nifty.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "—"}</p>
        </div>
        <div className="card flex-1 p-3">
          <p className="text-[11px] text-ink-faint">Sensex</p>
          <p className="text-sm font-semibold tabular">{sensex ? sensex.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "—"}</p>
        </div>
        <button onClick={refreshQuotes} className="card flex items-center px-3 text-ink-soft active:bg-surface-2" aria-label="Refresh prices">
          <RefreshCw size={16} className={quotesReady ? "" : "animate-spin"} />
        </button>
      </div>

      {/* portfolio summary — combined + LT/ST */}
      <section className="card p-4">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-[11px] text-ink-faint">Invested</p>
            <p className="text-sm font-semibold tabular">{fmtMoney(totals.invested, { compact: true })}</p>
          </div>
          <div>
            <p className="text-[11px] text-ink-faint">Current value</p>
            <p className="text-sm font-semibold tabular">{fmtMoney(totals.currentValue, { compact: true })}</p>
          </div>
          <div>
            <p className="text-[11px] text-ink-faint">Unrealized P&L</p>
            <p className={`text-sm font-semibold tabular ${(totals.unrealizedPL ?? 0) >= 0 ? "text-income" : "text-expense"}`}>
              {totals.unrealizedPL === null ? "—" : fmtMoney(totals.unrealizedPL, { sign: true, compact: true })}
            </p>
          </div>
        </div>

        {/* combined running P&L */}
        <div className="mt-3 rounded-xl bg-primary-soft px-3 py-2.5 text-center">
          <p className="text-[11px] text-primary">Running P&L — long + short term, realized + unrealized</p>
          <p className={`text-lg font-semibold tabular ${(combinedPL ?? 0) >= 0 ? "text-income" : "text-expense"}`}>
            {combinedPL === null ? "—" : fmtMoney(combinedPL, { sign: true, compact: true })}
          </p>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-surface-2 p-2.5 text-center">
            <p className="text-[11px] text-ink-faint">Long term (≥ 1 yr)</p>
            <p className="text-sm font-semibold tabular">{fmtMoney(totals.longTermValue, { compact: true })}</p>
            <p className={`text-[11px] tabular ${(totals.longTermPL ?? 0) >= 0 ? "text-income" : "text-expense"}`}>
              open P&L {totals.longTermPL === null ? "—" : fmtMoney(totals.longTermPL, { sign: true, compact: true })}
            </p>
            <p className={`text-[11px] tabular ${ltCombined !== null && ltCombined >= 0 ? "text-income" : "text-expense"}`}>
              incl. realized {ltCombined === null ? "—" : fmtMoney(ltCombined, { sign: true, compact: true })}
            </p>
          </div>
          <div className="rounded-xl bg-surface-2 p-2.5 text-center">
            <p className="text-[11px] text-ink-faint">Short term</p>
            <p className="text-sm font-semibold tabular">{fmtMoney(totals.shortTermValue, { compact: true })}</p>
            <p className={`text-[11px] tabular ${(totals.shortTermPL ?? 0) >= 0 ? "text-income" : "text-expense"}`}>
              open P&L {totals.shortTermPL === null ? "—" : fmtMoney(totals.shortTermPL, { sign: true, compact: true })}
            </p>
            <p className="text-[11px] text-ink-faint">held &lt; 365 days</p>
          </div>
        </div>
        <p className="mt-2 text-center text-[11px] text-ink-faint tabular">
          Realized {fmtMoney(totals.realizedPL, { sign: true, compact: true })} · Charges {fmtMoney(totals.charges, { compact: true })} · Dividends {fmtMoney(totals.dividends, { compact: true })}
        </p>
      </section>

      {/* add buttons */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button onClick={() => setAddOpen("stock")} className="rounded-xl bg-primary py-2.5 text-sm font-semibold text-white flex items-center justify-center gap-1.5">
          <Plus size={15} /> Add stock
        </button>
        <button onClick={() => setAddOpen("mf")} className="rounded-xl border border-primary py-2.5 text-sm font-semibold text-primary flex items-center justify-center gap-1.5">
          <Plus size={15} /> Add mutual fund
        </button>
      </div>

      {/* open positions */}
      <h3 className="mb-2 mt-4 text-sm font-semibold">Open positions ({open.length})</h3>
      {open.length === 0 && <p className="card p-5 text-center text-sm text-ink-faint">No open positions yet.</p>}
      <div className="space-y-2">
        {open.map((p) => (
          <PositionCard key={p.stock._id} p={p} deleteExit={deleteExit}
            onExit={(q, price, ch) => addExit({ stockId: p.stock._id, quantity: q, exitPrice: price, exitDate: Date.now(), charges: ch })}
            onDividend={(amt, note) => addDividend({ stockId: p.stock._id, amount: amt, date: Date.now(), note })}
            onDelete={() => deleteStock(p.stock._id)}
          />
        ))}
      </div>

      {closed.length > 0 && (
        <>
          <h3 className="mb-2 mt-4 text-sm font-semibold">Fully exited</h3>
          <div className="space-y-2">
            {closed.map((p) => (
              <PositionCard key={p.stock._id} p={p} deleteExit={deleteExit} onDelete={() => deleteStock(p.stock._id)} />
            ))}
          </div>
        </>
      )}

      {/* mutual funds */}
      <h3 className="mb-2 mt-4 text-sm font-semibold">Mutual funds ({mutualFunds.length})</h3>
      {mutualFunds.length === 0 && <p className="card p-5 text-center text-sm text-ink-faint">No funds yet.</p>}
      <div className="space-y-2">
        {mutualFunds.map((f) => {
          const v = mfValue(f, f.navSymbol ? quotes[f.navSymbol] ?? null : null);
          return (
            <div key={f._id} className="card flex items-center gap-3 p-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-primary text-xs font-bold">MF</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{f.name}</p>
                <p className="text-xs text-ink-faint tabular">{f.units} units × NAV {v.nav.toFixed(2)}{f.navSymbol ? " (live)" : ""}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold tabular">{fmtMoney(v.value, { compact: true })}</p>
                <p className={`text-xs tabular ${v.pl >= 0 ? "text-income" : "text-expense"}`}>{fmtMoney(v.pl, { sign: true, compact: true })}</p>
              </div>
              <button onClick={() => deleteMF(f._id)} className="text-ink-faint hover:text-expense" aria-label="Delete fund"><X size={15} /></button>
            </div>
          );
        })}
      </div>

      {addOpen && <AddSheet kind={addOpen} onClose={() => setAddOpen(null)} onAddStock={addStock} onAddMF={addMF} />}
    </AppShell>
  );
}

function PositionCard({
  p, onExit, onDividend, onDelete, deleteExit,
}: {
  p: ReturnType<typeof summarizePosition>;
  onExit?: (qty: number, price: number, charges?: number) => void;
  onDividend?: (amount: number, note: string) => void;
  onDelete: () => void;
  deleteExit: (exitId: string) => void;
}) {
  const [exitOpen, setExitOpen] = useState(false);
  const [divOpen, setDivOpen] = useState(false);
  const live = p.currentValue !== null;
  const pl = p.unrealizedPL;
  const plPct = pl !== null && p.investedRemaining > 0
    ? ((pl / (p.investedRemaining + (p.stock.buyCharges ?? 0) * (p.remainingQty / Math.max(1, p.stock.quantity)))) * 100).toFixed(1)
    : null;

  return (
    <div className="card p-4">
      <div className="flex items-center gap-3">
        <span className={`flex h-9 w-9 items-center justify-center rounded-full ${p.longTerm ? "bg-primary-soft text-primary" : "bg-accent/15 text-accent"}`}>
          {pl !== null && pl < 0 ? <TrendingDown size={15} /> : <TrendingUp size={15} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {p.stock.symbol.replace(/\.(NS|BO)$/, "")}
            <span className="ml-1.5 text-[10px] font-normal text-ink-faint">{p.stock.exchange}</span>
            {p.longTerm && <span className="ml-1.5 rounded bg-primary-soft px-1 py-0.5 text-[9px] font-medium text-primary">LT</span>}
          </p>
          <p className="text-xs text-ink-faint tabular">
            {p.remainingQty} left · buy {fmtMoney(p.stock.buyPrice)}
            {(p.stock.buyCharges ?? 0) > 0 ? ` + ${fmtMoney(p.stock.buyCharges!, { compact: true })} chg` : ""} · {p.daysHeld}d
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold tabular">{live ? fmtMoney(p.currentValue!, { compact: true }) : fmtMoney(p.investedRemaining, { compact: true })}</p>
          {p.remainingQty > 0 && (
            <p className={`text-xs tabular ${(pl ?? 0) >= 0 ? "text-income" : "text-expense"}`}>
              {pl === null ? "no live price" : `${fmtMoney(pl, { sign: true, compact: true })}${plPct ? ` (${plPct}%)` : ""}`}
            </p>
          )}
          {p.remainingQty === 0 && (
            <p className={`text-xs tabular ${p.realizedPL >= 0 ? "text-income" : "text-expense"}`}>
              realized {fmtMoney(p.realizedPL, { sign: true, compact: true })}
            </p>
          )}
        </div>
        <button onClick={onDelete} className="text-ink-faint hover:text-expense" aria-label="Delete"><X size={15} /></button>
      </div>

      {(onExit || onDividend) && p.remainingQty > 0 && (
        <div className="mt-3 flex gap-2">
          {onExit && (
            <button onClick={() => setExitOpen(!exitOpen)} className="flex-1 rounded-lg bg-surface-2 py-1.5 text-xs font-medium">
              {p.remainingQty > 1 ? "Partial / full exit" : "Record exit"}
            </button>
          )}
          {onDividend && (
            <button onClick={() => setDivOpen(!divOpen)} className="flex-1 rounded-lg bg-surface-2 py-1.5 text-xs font-medium">Add dividend</button>
          )}
        </div>
      )}

      {p.exits.length > 0 && (
        <div className="mt-2 space-y-1">
          {p.exits.map((e) => (
            <div key={e._id} className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-1.5 text-xs">
              <span className="text-ink-soft tabular">
                Sold {e.quantity} @ {fmtMoney(e.exitPrice)}{(e.charges ?? 0) > 0 ? ` (−${fmtMoney(e.charges!, { compact: true })})` : ""} · {fmtDate(e.exitDate)}
              </span>
              <span className={`tabular font-medium ${(e.exitPrice - p.stock.buyPrice) * e.quantity - (e.charges ?? 0) >= 0 ? "text-income" : "text-expense"}`}>
                {fmtMoney((e.exitPrice - p.stock.buyPrice) * e.quantity - (e.charges ?? 0), { sign: true })}
              </span>
              <button onClick={() => deleteExit(e._id)} className="ml-2 text-ink-faint" aria-label="Remove exit">×</button>
            </div>
          ))}
        </div>
      )}

      {p.dividends > 0 && (
        <p className="mt-1.5 text-[11px] text-ink-faint tabular">Dividends received: {fmtMoney(p.dividends)}</p>
      )}

      {exitOpen && onExit && (
        <ExitForm remaining={p.remainingQty} onSubmit={(q, price, ch) => { onExit(q, price, ch); setExitOpen(false); }} />
      )}
      {divOpen && onDividend && (
        <DivForm onSubmit={(amt, note) => { onDividend(amt, note); setDivOpen(false); }} />
      )}
    </div>
  );
}

function ExitForm({ remaining, onSubmit }: { remaining: number; onSubmit: (qty: number, price: number, charges?: number) => void }) {
  const [qty, setQty] = useState(String(remaining));
  const [price, setPrice] = useState("");
  const [charges, setCharges] = useState("");
  return (
    <div className="mt-3 rounded-xl bg-surface-2 p-3">
      <p className="mb-2 text-xs text-ink-soft">Partial or full exit — up to {remaining} units. Charges reduce the realized P&L; running P&L on remaining units adjusts automatically.</p>
      <div className="grid grid-cols-3 gap-2">
        <input type="number" inputMode="decimal" placeholder="Qty" value={qty} onChange={(e) => setQty(e.target.value)} className="rounded-lg border border-line bg-card px-3 py-2 text-sm" />
        <input type="number" inputMode="decimal" placeholder="Sell price" value={price} onChange={(e) => setPrice(e.target.value)} className="rounded-lg border border-line bg-card px-3 py-2 text-sm" />
        <input type="number" inputMode="decimal" placeholder="Charges" value={charges} onChange={(e) => setCharges(e.target.value)} className="rounded-lg border border-line bg-card px-3 py-2 text-sm" />
      </div>
      <button
        onClick={() => {
          const q = parseFloat(qty), pr = parseFloat(price), ch = parseFloat(charges);
          if (q > 0 && q <= remaining && pr > 0) onSubmit(q, pr, isNaN(ch) ? undefined : ch);
        }}
        className="mt-2 w-full rounded-lg bg-primary py-2 text-xs font-semibold text-white disabled:opacity-40"
        disabled={!parseFloat(qty) || !parseFloat(price)}
      >
        Record exit
      </button>
    </div>
  );
}

function DivForm({ onSubmit }: { onSubmit: (amount: number, note: string) => void }) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  return (
    <div className="mt-3 rounded-xl bg-surface-2 p-3">
      <div className="grid grid-cols-2 gap-2">
        <input type="number" inputMode="decimal" placeholder="Dividend ₹" value={amount} onChange={(e) => setAmount(e.target.value)} className="rounded-lg border border-line bg-card px-3 py-2 text-sm" />
        <input placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} className="rounded-lg border border-line bg-card px-3 py-2 text-sm" />
      </div>
      <button
        onClick={() => { const a = parseFloat(amount); if (a > 0) onSubmit(a, note.trim()); }}
        className="mt-2 w-full rounded-lg bg-primary py-2 text-xs font-semibold text-white disabled:opacity-40"
        disabled={!parseFloat(amount)}
      >
        Add dividend
      </button>
    </div>
  );
}

interface SymbolHit { symbol: string; name: string; exchange: string }

function AddSheet({
  kind, onClose, onAddStock, onAddMF,
}: {
  kind: "stock" | "mf";
  onClose: () => void;
  onAddStock: (s: { symbol: string; name?: string; quantity: number; buyPrice: number; buyDate: number; buyCharges?: number }) => void;
  onAddMF: (f: { name: string; units: number; avgNav: number; navSymbol?: string; manualNav?: number }) => void;
}) {
  const [symbol, setSymbol] = useState("");
  const [symName, setSymName] = useState("");
  const [hits, setHits] = useState<SymbolHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [showHits, setShowHits] = useState(false);
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");
  const [charges, setCharges] = useState("");
  const [name, setName] = useState("");
  const [units, setUnits] = useState("");
  const [nav, setNav] = useState("");
  const [navSym, setNavSym] = useState("");

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
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="card animate-sheet relative w-full sm:max-w-md rounded-b-none p-5 max-h-[92vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">{kind === "stock" ? "Add stock position" : "Add mutual fund"}</h2>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-surface-2"><X size={18} /></button>
        </div>
        {kind === "stock" ? (
          <div className="space-y-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
              <input
                placeholder="Search any NSE / BSE stock — company or symbol"
                value={symbol}
                onChange={(e) => {
                  setSymbol(e.target.value.toUpperCase());
                  setSymName("");
                  setShowHits(true);
                }}
                className="w-full rounded-xl border border-line bg-card pl-9 pr-3 py-2.5 text-sm uppercase"
              />
              {searching && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-ink-faint">…</span>}
              {showHits && hits.length > 0 && (
                <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-line bg-card shadow-lg">
                  {hits.map((h) => (
                    <button
                      key={h.symbol}
                      onClick={() => {
                        setSymbol(h.symbol);
                        setSymName(h.name);
                        setShowHits(false);
                      }}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-surface-2"
                    >
                      <span className="min-w-0 flex-1 truncate">{h.name}</span>
                      <span className="text-xs text-ink-faint">{h.symbol.replace(/\.(NS|BO)$/, "")} · {h.exchange}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {symName && <p className="-mt-1 text-[11px] text-ink-faint">Selected: {symName}</p>}
            <div className="grid grid-cols-2 gap-2">
              <input type="number" inputMode="decimal" placeholder="Quantity" value={qty} onChange={(e) => setQty(e.target.value)} className="rounded-xl border border-line bg-card px-3 py-2.5 text-sm" />
              <input type="number" inputMode="decimal" placeholder="Buy price" value={price} onChange={(e) => setPrice(e.target.value)} className="rounded-xl border border-line bg-card px-3 py-2.5 text-sm" />
            </div>
            <input type="number" inputMode="decimal" placeholder="Buy charges (brokerage, STT etc.) — optional" value={charges} onChange={(e) => setCharges(e.target.value)} className="w-full rounded-xl border border-line bg-card px-3 py-2.5 text-sm" />
            <button
              onClick={() => {
                const q = parseFloat(qty), p = parseFloat(price), ch = parseFloat(charges);
                if (symbol.trim() && q > 0 && p > 0) {
                  onAddStock({ symbol: symbol.trim(), name: symName || undefined, quantity: q, buyPrice: p, buyDate: Date.now(), buyCharges: isNaN(ch) ? undefined : ch });
                  onClose();
                }
              }}
              className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white"
            >
              Add position
            </button>
            <p className="text-center text-[11px] text-ink-faint">Buy date is set to today; edit later if needed.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <input placeholder="Fund name" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-line bg-card px-3 py-2.5 text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <input type="number" inputMode="decimal" placeholder="Units" value={units} onChange={(e) => setUnits(e.target.value)} className="rounded-xl border border-line bg-card px-3 py-2.5 text-sm" />
              <input type="number" inputMode="decimal" placeholder="Avg NAV" value={nav} onChange={(e) => setNav(e.target.value)} className="rounded-xl border border-line bg-card px-3 py-2.5 text-sm" />
            </div>
            <input placeholder="Live NAV symbol (optional)" value={navSym} onChange={(e) => setNavSym(e.target.value)} className="w-full rounded-xl border border-line bg-card px-3 py-2.5 text-sm" />
            <button
              onClick={() => {
                const u = parseFloat(units), n = parseFloat(nav);
                if (name.trim() && u > 0 && n > 0) {
                  onAddMF({ name: name.trim(), units: u, avgNav: n, navSymbol: navSym.trim() || undefined });
                  onClose();
                }
              }}
              className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white"
            >
              Add fund
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
