import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ConvexProvider, ConvexReactClient, useQuery, useMutation, useAction, useConvex } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { setCurrency } from "./format";
import type { GenericId } from "convex/values";
import type { TxnRow } from "./analytics";
import type { StockRow, ExitRow, DividendRow, MFRow } from "./portfolio";

export interface DepositRow {
  _id: string;
  kind: "fd" | "ppf" | "fund";
  name: string;
  institution?: string;
  ratePct?: number;
  maturityDate?: number;
  startDate?: number;
}

export interface DepositFlowRow {
  _id: string;
  depositId: string;
  type: "deposit" | "withdrawal" | "interest";
  amount: number;
  date: number;
  note?: string;
}

export const INDEX_SYMBOLS = ["^NSEI", "^BSESN"];

export interface SheetSyncCfg {
  endpoint?: string;
  lastStatus?: string;
  lastError?: string;
  lastPushedAt?: number;
}

/** Choosable gesture that opens the quick-entry popup (Android). */
export type QuickAddGesture = "none" | "bubble" | "shake";

const CONVEX_URL: string =
  (import.meta.env.VITE_CONVEX_URL as string | undefined) ?? "";

export interface Quote {
  symbol: string;
  price: number | null;
  name?: string;
}

interface FinanceCtx {
  ready: boolean;
  urlMissing: boolean;
  // data
  categories: Array<{
    _id: string;
    name: string;
    type: "expense" | "income";
    icon?: string;
    subcategories: Array<{ name: string; icon?: string }>;
  }>;
  transactions: TxnRow[];
  budgets: Array<{
    _id: string;
    month: string;
    incomeGoal?: number;
    expenseBudget?: number;
    savingsGoal?: number;
    categoryBudgets?: Array<{ categoryId: string; amount: number }>;
  }>;
  accounts: Array<{
    _id: string;
    name: string;
    type: "savings" | "wallet" | "investment";
    bankName?: string;
    openingBalance: number;
  }>;
  stocks: StockRow[];
  exits: ExitRow[];
  dividends: DividendRow[];
  mutualFunds: MFRow[];
  deposits: DepositRow[];
  depositFlows: DepositFlowRow[];
  quotes: Record<string, number | null>;
  indices: Record<string, number | null>;
  quotesReady: boolean;
  refreshQuotes: () => void;
  catName: (id: string) => string;
  accountName: (id?: string) => string;
  // prefs
  currency: string;
  setCurrencyPref: (c: string) => void;
  theme: "light" | "dark";
  toggleTheme: () => void;
  quickAddGesture: QuickAddGesture;
  setQuickAddGesture: (g: QuickAddGesture) => void;
  // Google Sheets auto-sync
  sheetSync: SheetSyncCfg | null;
  setSheetEndpoint: (url: string) => Promise<void>;
  syncSheets: () => Promise<"synced" | "error">;
  sheetsSyncing: boolean;
  // mutations
  addTxn: (
    data: {
      kind: "expense" | "income";
      amount: number;
      categoryId: string;
      subcategory?: string;
      accountId?: string;
      note?: string;
      date: number;
    },
    billFile?: File | null
  ) => Promise<void>;
  updateTxn: (id: string, patch: Partial<TxnRow>) => Promise<void>;
  deleteTxn: (id: string) => Promise<void>;
  addCategory: (name: string, type: "expense" | "income", icon?: string) => Promise<void>;
  updateCategory: (id: string, patch: { name?: string; icon?: string }) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  addSub: (catId: string, name: string) => Promise<void>;
  deleteSub: (catId: string, index: number) => Promise<void>;
  saveBudget: (month: string, patch: { incomeGoal?: number; expenseBudget?: number; savingsGoal?: number; categoryBudgets?: Array<{ categoryId: string; amount: number }> }) => Promise<void>;
  addAccount: (a: { name: string; type: "savings" | "wallet" | "investment"; bankName?: string; openingBalance?: number }) => Promise<void>;
  updateAccount: (id: string, patch: { name?: string; bankName?: string; openingBalance?: number; type?: "savings" | "wallet" | "investment" }) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  addStock: (s: { symbol: string; name?: string; exchange?: "NSE" | "BSE"; quantity: number; bonuses?: number; buyPrice: number; buyDate: number; buyCharges?: number }) => Promise<void>;
  addExit: (e: { stockId: string; quantity: number; exitPrice: number; exitDate: number; charges?: number }) => Promise<void>;
  deleteExit: (exitId: string) => Promise<void>;
  addDividend: (d: { stockId: string; amount: number; date: number; note?: string }) => Promise<void>;
  deleteDividend: (id: string) => Promise<void>;
  deleteStock: (id: string) => Promise<void>;
  updateStock: (id: string, patch: { bonuses?: number; buyDate?: number; quantity?: number; buyPrice?: number; name?: string; symbol?: string }) => Promise<void>;
  addMF: (f: { name: string; units: number; avgNav: number; navSymbol?: string; manualNav?: number; buyDate?: number }) => Promise<void>;
  updateMF: (id: string, patch: { name?: string; units?: number; avgNav?: number; navSymbol?: string; manualNav?: number }) => Promise<void>;
  deleteMF: (id: string) => Promise<void>;
  addDeposit: (d: { kind: "fd" | "ppf" | "fund"; name: string; institution?: string; ratePct?: number; maturityDate?: number; startDate?: number }) => Promise<string>;
  addDepositFlow: (f: { depositId: string; type: "deposit" | "withdrawal" | "interest"; amount: number; date: number; note?: string }) => Promise<void>;
  removeDepositFlow: (flowId: string) => Promise<void>;
  deleteDeposit: (id: string) => Promise<void>;
}

const Ctx = createContext<FinanceCtx | null>(null);

function usePref<T>(key: string, initial: T) {
  const [val, setVal] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(`balfin.${key}`);
      return raw !== null ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  const set = useCallback(
    (v: T) => {
      setVal(v);
      try {
        localStorage.setItem(`balfin.${key}`, JSON.stringify(v));
      } catch {
        /* ignore */
      }
    },
    [key]
  );
  return [val, set] as const;
}

function Inner({ children }: { children: React.ReactNode }) {
  const categoriesRaw = useQuery(api.categories.list);
  const transactionsRaw = useQuery(api.transactions.list, {});
  const budgetsRaw = useQuery(api.budgets.list);
  const accountsRaw = useQuery(api.accounts.list);
  const stocksRaw = useQuery(api.stocks.list);
  const exitsRaw = useQuery(api.stocks.listExits, {});
  const dividendsRaw = useQuery(api.stocks.listDividends, {});
  const mutualFundsRaw = useQuery(api.mutualFunds.list);
  const depositsRaw = useQuery(api.deposits.list);
  const depositFlowsRaw = useQuery(api.deposits.listFlows, {});

  const ready =
    categoriesRaw !== undefined &&
    transactionsRaw !== undefined &&
    budgetsRaw !== undefined &&
    accountsRaw !== undefined &&
    stocksRaw !== undefined &&
    depositsRaw !== undefined;

  const categories = categoriesRaw ?? [];
  const transactions = (transactionsRaw ?? []) as unknown as TxnRow[];
  const budgets = budgetsRaw ?? [];
  const accounts = accountsRaw ?? [];
  const stocks = (stocksRaw ?? []) as unknown as StockRow[];
  const exits = (exitsRaw ?? []) as unknown as ExitRow[];
  const dividends = (dividendsRaw ?? []) as unknown as DividendRow[];
  const mutualFunds = (mutualFundsRaw ?? []) as unknown as MFRow[];
  const deposits = (depositsRaw ?? []) as unknown as DepositRow[];
  const depositFlows = (depositFlowsRaw ?? []) as unknown as DepositFlowRow[];

  const mSeedDefaults = useMutation(api.categories.seedDefaults);
  useEffect(() => {
    if (ready && categories.length === 0 && !localStorage.getItem("balfin.seeded")) {
      localStorage.setItem("balfin.seeded", "1");
      mSeedDefaults().catch(() => localStorage.removeItem("balfin.seeded"));
    }
  }, [ready, categories.length, mSeedDefaults]);

  const [currency, setCurrencyPref] = usePref("currency", "INR");
  const [theme, setTheme] = usePref<"light" | "dark">("theme", "light");
  const [quickAddGesture, setQuickAddGesturePref] = usePref<QuickAddGesture>("quickAddGesture", "bubble");

  // push gesture choice into the Android layer (bubble / shake service)
  useEffect(() => {
    try {
      const cap = (window as unknown as {
        Capacitor?: { isNativePlatform?: () => boolean; Plugins?: { QuickAdd?: { setGesture: (o: { gesture: string }) => Promise<unknown> } } };
      }).Capacitor;
      if (cap?.isNativePlatform?.() && cap.Plugins?.QuickAdd) {
        cap.Plugins.QuickAdd.setGesture({ gesture: quickAddGesture });
      }
    } catch {
      /* plugin only exists in the Android build */
    }
  }, [quickAddGesture]);
  const [tick, setTick] = useState(0);

  useEffect(() => setCurrency(currency), [currency]);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.classList.toggle("light", theme === "light");
  }, [theme]);

  const fetchQuotes = useAction(api.market.quotes);
  const [quotes, setQuotes] = useState<Record<string, number | null>>({});
  const [quotesReady, setQuotesReady] = useState(false);

  const symbols = useMemo(() => {
    const set = new Set<string>(INDEX_SYMBOLS);
    const exitedByStock = new Map<string, number>();
    for (const e of exits)
      exitedByStock.set(e.stockId, (exitedByStock.get(e.stockId) ?? 0) + e.quantity);
    for (const s of stocks) {
      if (s.quantity - (exitedByStock.get(s._id) ?? 0) > 0) set.add(s.symbol);
    }
    for (const f of mutualFunds) if (f.navSymbol) set.add(f.navSymbol);
    return [...set];
  }, [stocks, mutualFunds, exits]);

  const refreshQuotes = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let alive = true;
    if (!symbols.length) {
      setQuotes({});
      setQuotesReady(true);
      return;
    }
    setQuotesReady(false);
    fetchQuotes({ symbols })
      .then((rows: Quote[]) => {
        if (!alive) return;
        const map: Record<string, number | null> = {};
        for (const r of rows ?? []) map[r.symbol] = r.price;
        setQuotes(map);
        setQuotesReady(true);
      })
      .catch(() => alive && setQuotesReady(true));
    const iv = setInterval(() => setTick((t) => t + 1), 120000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbols.join(","), tick]);

  const catName = useCallback(
    (id: string) => categories.find((c) => c._id === id)?.name ?? "Unknown",
    [categories]
  );
  const accountName = useCallback(
    (id?: string) =>
      id ? accounts.find((a) => a._id === id)?.name ?? "Unknown" : "",
    [accounts]
  );

  const indices = useMemo(
    () => Object.fromEntries(INDEX_SYMBOLS.map((s) => [s, quotes[s] ?? null])),
    [quotes]
  );

  const mAddTxn = useMutation(api.transactions.add);
  const mUpdateTxn = useMutation(api.transactions.update);
  const mDeleteTxn = useMutation(api.transactions.remove);
  const mAddCategory = useMutation(api.categories.add);
  const mUpdateCategory = useMutation(api.categories.update);
  const mDeleteCategory = useMutation(api.categories.remove);
  const mAddSub = useMutation(api.categories.addSubcategory);
  const mDeleteSub = useMutation(api.categories.removeSubcategory);
  const mSaveBudget = useMutation(api.budgets.save);
  const mAddAccount = useMutation(api.accounts.add);
  const mUpdateAccount = useMutation(api.accounts.update);
  const mDeleteAccount = useMutation(api.accounts.remove);
  const mAddStock = useMutation(api.stocks.add);
  const mAddExit = useMutation(api.stocks.addExit);
  const mDeleteExit = useMutation(api.stocks.removeExit);
  const mAddDividend = useMutation(api.stocks.addDividend);
  const mDeleteDividend = useMutation(api.stocks.removeDividend);
  const mDeleteStock = useMutation(api.stocks.remove);
  const mUpdateStock = useMutation(api.stocks.update);
  const mAddMF = useMutation(api.mutualFunds.add);
  const mUpdateMF = useMutation(api.mutualFunds.update);
  const mDeleteMF = useMutation(api.mutualFunds.remove);
  const sheetCfgRaw = useQuery(api.sheets.getConfig);
  const sheetCfg = sheetCfgRaw as unknown as SheetSyncCfg | undefined;
  const mSetSheetEndpoint = useMutation(api.sheets.setEndpoint);
  const aSyncSheets = useAction(api.sheets.syncNow);
  const [sheetsSyncing, setSheetsSyncing] = useState(false);

  const mAddDeposit = useMutation(api.deposits.add);
  const mAddDepositFlow = useMutation(api.deposits.addFlow);
  const mRemoveDepositFlow = useMutation(api.deposits.removeFlow);
  const mDeleteDeposit = useMutation(api.deposits.remove);
  const convex = useConvex();

  // Auto-sync every new entry to the linked Google Sheet (fire-and-forget;
  // failures are recorded in sheetSync.lastError and surfaced in Manage).
  const syncAfterChange = useCallback(() => {
    if (!sheetCfg?.endpoint) return;
    aSyncSheets({}).catch(() => {
      /* status recorded server-side */
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetCfg?.endpoint, aSyncSheets]);

  const addTxn: FinanceCtx["addTxn"] = async (data, billFile) => {
    let billImageId: GenericId<"_storage"> | undefined;
    if (billFile && convex) {
      try {
        const storage = (
          convex as unknown as {
            storage?: { upload: (f: File) => Promise<GenericId<"_storage">> };
          }
        ).storage;
        if (storage?.upload) {
          billImageId = await storage.upload(billFile);
        }
      } catch {
        /* photo optional */
      }
    }
    await mAddTxn({ ...data, billImageId } as Parameters<typeof mAddTxn>[0]);
    syncAfterChange();
  };

  const value: FinanceCtx = {
    ready,
    urlMissing: false,
    categories,
    transactions,
    budgets,
    accounts,
    stocks,
    exits,
    dividends,
    mutualFunds,
    deposits,
    depositFlows,
    quotes,
    indices,
    quotesReady,
    refreshQuotes,
    catName,
    accountName,
    currency,
    setCurrencyPref,
    theme,
    toggleTheme: () => setTheme(theme === "light" ? "dark" : "light"),
    quickAddGesture,
    setQuickAddGesture: setQuickAddGesturePref,
    sheetSync: sheetCfg ?? null,
    setSheetEndpoint: async (url: string) => {
      await mSetSheetEndpoint({ endpoint: url });
    },
    syncSheets: async () => {
      setSheetsSyncing(true);
      try {
        await aSyncSheets({});
        return "synced";
      } catch {
        return "error";
      } finally {
        setSheetsSyncing(false);
      }
    },
    sheetsSyncing,
    addTxn,
    updateTxn: async (id, patch) => {
      await mUpdateTxn({
        id: id as Id<"transactions">,
        ...patch,
      } as Parameters<typeof mUpdateTxn>[0]);
    },
    deleteTxn: async (id) => {
      await mDeleteTxn({ id: id as Id<"transactions"> });
    },
    addCategory: async (name, type, icon) => {
      await mAddCategory({ name, type, icon });
    },
    updateCategory: async (id, patch) => {
      await mUpdateCategory({ id: id as Id<"categories">, ...patch });
    },
    deleteCategory: async (id) => {
      await mDeleteCategory({ id: id as Id<"categories"> });
    },
    addSub: async (catId, name) => {
      await mAddSub({ id: catId as Id<"categories">, name });
    },
    deleteSub: async (catId, index) => {
      await mDeleteSub({ id: catId as Id<"categories">, index });
    },
    saveBudget: async (month, patch) => {
      await mSaveBudget({
        month,
        ...patch,
        categoryBudgets: patch.categoryBudgets?.map((cb) => ({
          ...cb,
          categoryId: cb.categoryId as Id<"categories">,
        })),
      });
    },
    addAccount: async (a) => {
      await mAddAccount(a);
    },
    updateAccount: async (id, patch) => {
      await mUpdateAccount({ id: id as Id<"accounts">, ...patch });
    },
    deleteAccount: async (id) => {
      await mDeleteAccount({ id: id as Id<"accounts"> });
    },
    addStock: async (s) => {
      await mAddStock(s);
      syncAfterChange();
    },
    addExit: async (e) => {
      await mAddExit({
        stockId: e.stockId as Id<"stocks">,
        quantity: e.quantity,
        exitPrice: e.exitPrice,
        exitDate: e.exitDate,
        charges: e.charges,
      });
      syncAfterChange();
    },
    deleteExit: async (exitId) => {
      await mDeleteExit({ exitId: exitId as Id<"stockExits"> });
    },
    addDividend: async (d) => {
      await mAddDividend({ ...d, stockId: d.stockId as Id<"stocks"> });
      syncAfterChange();
    },
    deleteDividend: async (id) => {
      await mDeleteDividend({ dividendId: id as Id<"dividends"> });
    },
    deleteStock: async (id) => {
      await mDeleteStock({ id: id as Id<"stocks"> });
    },
    updateStock: async (id, patch) => {
      await mUpdateStock({ id: id as Id<"stocks">, ...patch });
    },
    addMF: async (f) => {
      await mAddMF(f);
      syncAfterChange();
    },
    updateMF: async (id, patch) => {
      await mUpdateMF({ id: id as Id<"mutualFunds">, ...patch });
    },
    deleteMF: async (id) => {
      await mDeleteMF({ id: id as Id<"mutualFunds"> });
    },
    addDeposit: async (d) => {
      const id = (await mAddDeposit(d)) as unknown as string;
      syncAfterChange();
      return id;
    },
    addDepositFlow: async (f) => {
      await mAddDepositFlow({
        ...f,
        depositId: f.depositId as Id<"deposits">,
      });
      syncAfterChange();
    },
    removeDepositFlow: async (flowId) => {
      await mRemoveDepositFlow({ flowId: flowId as Id<"depositFlows"> });
    },
    deleteDeposit: async (id) => {
      await mDeleteDeposit({ id: id as Id<"deposits"> });
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const url = CONVEX_URL || localStorage.getItem("balfin.convexUrl") || "";
  if (!url) {
    return (
      <SetupScreen
        onSaved={(saved) => {
          localStorage.setItem("balfin.convexUrl", saved);
          window.location.reload();
        }}
      />
    );
  }
  const client = new ConvexReactClient(url);
  return (
    <ConvexProvider client={client}>
      <Inner>{children}</Inner>
    </ConvexProvider>
  );
}

function SetupScreen({ onSaved }: { onSaved: (url: string) => void }) {
  const [url, setUrl] = useState(
    () => localStorage.getItem("balfin.convexUrl") ?? ""
  );
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="card p-6 max-w-md w-full space-y-4">
        <h1 className="text-xl font-semibold font-display">BalFin setup</h1>
        <p className="text-sm text-ink-soft">
          Run <code className="bg-surface-2 px-1.5 py-0.5 rounded">npx convex dev</code> in
          the project folder once, sign in when the browser opens, and copy the
          deployment URL (like <code>https://something-123.convex.cloud</code>) here.
        </p>
        <input
          className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm"
          placeholder="https://your-deployment.convex.cloud"
          value={url}
          onChange={(e) => setUrl(e.target.value.trim())}
        />
        <button
          className="w-full rounded-xl bg-primary text-white py-2.5 text-sm font-medium"
          onClick={() => url && onSaved(url)}
        >
          Connect
        </button>
      </div>
    </div>
  );
}

export function useFinance() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useFinance outside provider");
  return ctx;
}
