import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { setCurrency } from "./format";
import type { TxnRow } from "./analytics";
import type { StockRow, ExitRow, DividendRow, MFRow } from "./portfolio";
import { DEFAULT_CATEGORIES } from "../../convex/defaults";

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
  lastStatus?: "pending" | "synced" | "error" | string;
  lastError?: string;
  lastPushedAt?: number;
  backupFrequency?: string;
}

export interface RecurringItem {
  _id: string;
  name: string;
  amount: number;
  billingCycle: "monthly" | "yearly";
  dueDay: number; // day of month 1..31
  categoryId?: string;
  accountId?: string;
  lastPaidDate?: number;
}

export type QuickAddGesture = "none" | "bubble";
export type SheetBackupFrequency = "daily" | "weekly" | "monthly";

export interface QuickAddPlugin {
  setGesture: (o: { gesture: string }) => Promise<unknown>;
  canDrawOverlays: (o?: Record<string, never>) => Promise<{ granted?: boolean }>;
  requestOverlayPermission: (o?: Record<string, never>) => Promise<unknown>;
  getStatus: (o?: Record<string, never>) => Promise<{
    gesture?: string;
    overlay?: boolean;
    bubble?: boolean;
    shake?: boolean;
    volume?: boolean;
    batteryOk?: boolean;
  }>;
  restartServices: (o?: Record<string, never>) => Promise<unknown>;
  isIgnoringBatteryOptimizations: (o?: Record<string, never>) => Promise<{ granted?: boolean }>;
  requestIgnoreBatteryOptimizations: (o?: Record<string, never>) => Promise<unknown>;
  setBubbleOpacity?: (o: { opacity: number }) => Promise<unknown>;
  getBubbleOpacity?: (o?: Record<string, never>) => Promise<{ opacity: number }>;
  postJson?: (o: { url: string; data: string }) => Promise<{ status: number; ok: boolean }>;
}

export function getQuickAddPlugin(): QuickAddPlugin | null {
  try {
    const cap = (window as unknown as {
      Capacitor?: { isNativePlatform?: () => boolean; Plugins?: { QuickAdd?: QuickAddPlugin } };
    }).Capacitor;
    if (cap?.isNativePlatform?.() && cap.Plugins?.QuickAdd) return cap.Plugins.QuickAdd;
  } catch {}
  return null;
}

export interface CategoryItem {
  _id: string;
  name: string;
  type: "expense" | "income";
  icon?: string;
  subcategories: Array<{ name: string; icon?: string }>;
}

export interface AccountItem {
  _id: string;
  name: string;
  type: "savings" | "wallet" | "investment";
  bankName?: string;
  openingBalance: number;
}

export interface BudgetItem {
  _id: string;
  month: string;
  incomeGoal?: number;
  expenseBudget?: number;
  savingsGoal?: number;
  categoryBudgets?: Array<{ categoryId: string; amount: number }>;
}

export interface Quote {
  symbol: string;
  price: number | null;
  name?: string;
}

interface FinanceCtx {
  ready: boolean;
  urlMissing: boolean;
  isLocalMode: boolean;
  setLocalMode: (local: boolean) => void;
  convexUrl: string;
  setConvexUrl: (url: string) => void;

  // Data
  categories: CategoryItem[];
  transactions: TxnRow[];
  budgets: BudgetItem[];
  accounts: AccountItem[];
  stocks: StockRow[];
  exits: ExitRow[];
  dividends: DividendRow[];
  mutualFunds: MFRow[];
  deposits: DepositRow[];
  depositFlows: DepositFlowRow[];
  recurringBills: RecurringItem[];
  quotes: Record<string, number | null>;
  indices: Record<string, number | null>;
  quotesReady: boolean;
  refreshQuotes: () => void;
  catName: (id: string) => string;
  accountName: (id?: string) => string;

  // Preferences
  currency: string;
  setCurrencyPref: (c: string) => void;
  quickAddGesture: QuickAddGesture;
  setQuickAddGesture: (g: QuickAddGesture) => void;
  floatingBubbleEnabled: boolean;
  setFloatingBubbleEnabled: (b: boolean) => void;
  bubbleOpacity: number;
  setBubbleOpacity: (op: number) => void;
  isSimulatingApp: boolean;
  setIsSimulatingApp: (s: boolean) => void;

  // Security & App Lock
  isLocked: boolean;
  savedPin: string | null;
  setSavedPin: (pin: string | null) => void;
  unlock: () => void;
  lockApp: () => void;
  maskBalances: boolean;
  setMaskBalances: (mask: boolean) => void;

  // Google Sheets Auto-Sync
  sheetSync: SheetSyncCfg | null;
  setSheetEndpoint: (url: string) => Promise<void>;
  setBackupFrequency: (f: SheetBackupFrequency) => Promise<void>;
  syncSheets: (customEndpoint?: string) => Promise<"synced" | "error">;
  sheetsSyncing: boolean;

  // CRUD Mutations
  addTxn: (
    data: {
      kind: "expense" | "income" | "transfer";
      amount: number;
      categoryId?: string;
      toAccountId?: string;
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
  saveBudget: (
    month: string,
    patch: {
      incomeGoal?: number;
      expenseBudget?: number;
      savingsGoal?: number;
      categoryBudgets?: Array<{ categoryId: string; amount: number }>;
    }
  ) => Promise<void>;
  addAccount: (a: {
    name: string;
    type: "savings" | "wallet" | "investment";
    bankName?: string;
    openingBalance?: number;
  }) => Promise<void>;
  updateAccount: (
    id: string,
    patch: {
      name?: string;
      bankName?: string;
      openingBalance?: number;
      type?: "savings" | "wallet" | "investment";
    }
  ) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  addStock: (s: {
    symbol: string;
    name?: string;
    exchange?: "NSE" | "BSE";
    quantity: number;
    bonuses?: number;
    buyPrice: number;
    buyDate: number;
    buyCharges?: number;
  }) => Promise<void>;
  addExit: (e: {
    stockId: string;
    quantity: number;
    exitPrice: number;
    exitDate: number;
    charges?: number;
  }) => Promise<void>;
  deleteExit: (exitId: string) => Promise<void>;
  addDividend: (d: { stockId: string; amount: number; date: number; note?: string }) => Promise<void>;
  deleteDividend: (id: string) => Promise<void>;
  deleteStock: (id: string) => Promise<void>;
  updateStock: (
    id: string,
    patch: {
      bonuses?: number;
      buyDate?: number;
      quantity?: number;
      buyPrice?: number;
      name?: string;
      symbol?: string;
    }
  ) => Promise<void>;
  addMF: (f: {
    name: string;
    units: number;
    avgNav: number;
    navSymbol?: string;
    manualNav?: number;
    buyDate?: number;
  }) => Promise<void>;
  updateMF: (
    id: string,
    patch: {
      name?: string;
      units?: number;
      avgNav?: number;
      navSymbol?: string;
      manualNav?: number;
    }
  ) => Promise<void>;
  deleteMF: (id: string) => Promise<void>;
  addDeposit: (d: {
    kind: "fd" | "ppf" | "fund";
    name: string;
    institution?: string;
    ratePct?: number;
    maturityDate?: number;
    startDate?: number;
  }) => Promise<string>;
  addDepositFlow: (f: {
    depositId: string;
    type: "deposit" | "withdrawal" | "interest";
    amount: number;
    date: number;
    note?: string;
  }) => Promise<void>;
  removeDepositFlow: (flowId: string) => Promise<void>;
  deleteDeposit: (id: string) => Promise<void>;
  addRecurring: (r: Omit<RecurringItem, "_id">) => Promise<void>;
  deleteRecurring: (id: string) => Promise<void>;
  payRecurring: (id: string) => Promise<void>;
}

const Ctx = createContext<FinanceCtx | null>(null);

function useLocalStore<T>(key: string, initial: T): [T, (val: T | ((prev: T) => T)) => void] {
  const [data, setData] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(`balfin.local.${key}`);
      if (stored !== null) return JSON.parse(stored);
    } catch {}
    return initial;
  });

  const update = useCallback(
    (valOrFn: T | ((prev: T) => T)) => {
      setData((prev) => {
        const next = typeof valOrFn === "function" ? (valOrFn as (prev: T) => T)(prev) : valOrFn;
        try {
          localStorage.setItem(`balfin.local.${key}`, JSON.stringify(next));
        } catch {}
        return next;
      });
    },
    [key]
  );

  return [data, update];
}

// Generate seeded default datasets on fresh boot
function getInitialSeedData() {
  const now = Date.now();
  const dayMs = 86400000;

  const accounts: AccountItem[] = [
    { _id: "acc_hdfc", name: "HDFC Salary", type: "savings", bankName: "HDFC Bank", openingBalance: 85000 },
    { _id: "acc_axis", name: "Axis Savings", type: "savings", bankName: "Axis Bank", openingBalance: 42000 },
    { _id: "acc_wallet", name: "Cash Wallet", type: "wallet", bankName: "Physical Cash", openingBalance: 6500 },
    { _id: "acc_zerodha", name: "Zerodha Demat", type: "investment", bankName: "Zerodha", openingBalance: 140000 },
  ];

  const categories: CategoryItem[] = DEFAULT_CATEGORIES.map((c, i) => ({
    _id: `cat_${i + 1}`,
    name: c.name,
    type: c.type,
    icon: c.icon,
    subcategories: c.subcategories,
  }));

  const catFood = categories.find((c) => c.name === "Food & Dining")?._id || "cat_1";
  const catTrans = categories.find((c) => c.name === "Transport")?._id || "cat_2";
  const catBills = categories.find((c) => c.name === "Bills & Utilities")?._id || "cat_3";
  const catShop = categories.find((c) => c.name === "Shopping")?._id || "cat_4";
  const catSal = categories.find((c) => c.name === "Salary")?._id || "cat_9";

  const transactions: TxnRow[] = [
    { _id: "txn_1", kind: "income", amount: 95000, categoryId: catSal, subcategory: "Monthly Salary", accountId: "acc_hdfc", note: "Monthly Salary Credit", date: now - 8 * dayMs },
    { _id: "txn_2", kind: "expense", amount: 18500, categoryId: catBills, subcategory: "Rent", accountId: "acc_hdfc", note: "House Rent", date: now - 7 * dayMs },
    { _id: "txn_3", kind: "expense", amount: 2450, categoryId: catFood, subcategory: "Groceries", accountId: "acc_hdfc", note: "Nature's Basket groceries", date: now - 5 * dayMs },
    { _id: "txn_4", kind: "expense", amount: 680, categoryId: catFood, subcategory: "Delivery", accountId: "acc_hdfc", note: "Swiggy Dinner", date: now - 4 * dayMs },
    { _id: "txn_5", kind: "expense", amount: 1500, categoryId: catTrans, subcategory: "Fuel", accountId: "acc_axis", note: "HPCL Petrol", date: now - 3 * dayMs },
    { _id: "txn_6", kind: "expense", amount: 3200, categoryId: catShop, subcategory: "Clothing", accountId: "acc_hdfc", note: "Zara weekend shopping", date: now - 2 * dayMs },
    { _id: "txn_7", kind: "transfer", amount: 5000, accountId: "acc_hdfc", toAccountId: "acc_wallet", note: "ATM Cash withdrawal", date: now - 1 * dayMs },
    { _id: "txn_8", kind: "expense", amount: 220, categoryId: catFood, subcategory: "Coffee", accountId: "acc_wallet", note: "Blue Tokai Flat White", date: now - 2 * 3600000 },
  ];

  const stocks: StockRow[] = [
    { _id: "stk_1", symbol: "TCS.NS", name: "Tata Consultancy Services", exchange: "NSE", quantity: 15, buyPrice: 3850, buyDate: now - 180 * dayMs, buyCharges: 120, closed: false },
    { _id: "stk_2", symbol: "INFY.NS", name: "Infosys Ltd", exchange: "NSE", quantity: 30, buyPrice: 1420, buyDate: now - 140 * dayMs, buyCharges: 90, closed: false },
    { _id: "stk_3", symbol: "RELIANCE.NS", name: "Reliance Industries", exchange: "NSE", quantity: 20, buyPrice: 2840, buyDate: now - 90 * dayMs, buyCharges: 140, closed: false },
  ];

  const exits: ExitRow[] = [];
  const dividends: DividendRow[] = [
    { _id: "div_1", stockId: "stk_1", amount: 420, date: now - 40 * dayMs, note: "Interim Dividend" },
  ];

  const mutualFunds: MFRow[] = [
    { _id: "mf_1", name: "Parag Parikh Flexi Cap Fund", units: 500, avgNav: 62.5, navSymbol: "0P0000XW01.BO", buyDate: now - 210 * dayMs },
    { _id: "mf_2", name: "UTI Nifty 50 Index Fund", units: 320, avgNav: 145.2, navSymbol: "^NSEI", buyDate: now - 150 * dayMs },
  ];

  const deposits: DepositRow[] = [
    { _id: "dep_1", kind: "fd", name: "HDFC 1-Year Cumulative FD", institution: "HDFC Bank", ratePct: 7.1, startDate: now - 120 * dayMs, maturityDate: now + 245 * dayMs },
    { _id: "dep_2", kind: "ppf", name: "Public Provident Fund", institution: "SBI", ratePct: 7.1, startDate: now - 365 * dayMs },
  ];

  const depositFlows: DepositFlowRow[] = [
    { _id: "flw_1", depositId: "dep_1", type: "deposit", amount: 100000, date: now - 120 * dayMs, note: "Principal deposit" },
    { _id: "flw_2", depositId: "dep_2", type: "deposit", amount: 50000, date: now - 300 * dayMs, note: "Annual contribution" },
    { _id: "flw_3", depositId: "dep_2", type: "interest", amount: 3550, date: now - 30 * dayMs, note: "FY Interest credited" },
  ];

  const d = new Date();
  const currentMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const budgets: BudgetItem[] = [
    {
      _id: "bud_1",
      month: currentMonth,
      expenseBudget: 45000,
      savingsGoal: 35000,
      incomeGoal: 95000,
      categoryBudgets: [
        { categoryId: catFood, amount: 12000 },
        { categoryId: catTrans, amount: 5000 },
        { categoryId: catBills, amount: 20000 },
        { categoryId: catShop, amount: 8000 },
      ],
    },
  ];

  const recurringBills: RecurringItem[] = [
    {
      _id: "rec_1",
      name: "Netflix Premium 4K",
      amount: 649,
      billingCycle: "monthly",
      dueDay: 15,
      categoryId: categories.find((c) => c.name === "Entertainment")?._id,
      accountId: "acc_hdfc",
    },
    {
      _id: "rec_2",
      name: "Spotify Family",
      amount: 179,
      billingCycle: "monthly",
      dueDay: 22,
      categoryId: categories.find((c) => c.name === "Entertainment")?._id,
      accountId: "acc_hdfc",
    },
    {
      _id: "rec_3",
      name: "Airtel Xstream Fiber",
      amount: 999,
      billingCycle: "monthly",
      dueDay: 10,
      categoryId: catBills,
      accountId: "acc_hdfc",
    },
    {
      _id: "rec_4",
      name: "House Rent",
      amount: 18500,
      billingCycle: "monthly",
      dueDay: 1,
      categoryId: catBills,
      accountId: "acc_hdfc",
      lastPaidDate: now - 7 * dayMs,
    },
  ];

  return { accounts, categories, transactions, stocks, exits, dividends, mutualFunds, deposits, depositFlows, budgets, recurringBills };
}

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const seed = useMemo(() => getInitialSeedData(), []);

  // Dual engine mode: defaults to local store for 100% resilience without crashing
  const [isLocalMode, setIsLocalMode] = useLocalStore("useLocal", true);
  const [convexUrl, setConvexUrl] = useLocalStore("convexUrl", "");

  const [categories, setCategories] = useLocalStore<CategoryItem[]>("categories", seed.categories);
  const [transactions, setTransactions] = useLocalStore<TxnRow[]>("transactions", seed.transactions);
  const [budgets, setBudgets] = useLocalStore<BudgetItem[]>("budgets", seed.budgets);
  const [accounts, setAccounts] = useLocalStore<AccountItem[]>("accounts", seed.accounts);
  const [stocks, setStocks] = useLocalStore<StockRow[]>("stocks", seed.stocks);
  const [exits, setExits] = useLocalStore<ExitRow[]>("exits", seed.exits);
  const [dividends, setDividends] = useLocalStore<DividendRow[]>("dividends", seed.dividends);
  const [mutualFunds, setMutualFunds] = useLocalStore<MFRow[]>("mutualFunds", seed.mutualFunds);
  const [deposits, setDeposits] = useLocalStore<DepositRow[]>("deposits", seed.deposits);
  const [depositFlows, setDepositFlows] = useLocalStore<DepositFlowRow[]>("depositFlows", seed.depositFlows);
  const [recurringBills, setRecurringBills] = useLocalStore<RecurringItem[]>("recurringBills", seed.recurringBills);

  const [sheetSync, setSheetSync] = useLocalStore<SheetSyncCfg | null>("sheetSync", {
    endpoint: "",
    lastStatus: undefined,
    backupFrequency: "daily",
  });
  const [sheetsSyncing, setSheetsSyncing] = useState(false);

  const [currency, setCurrencyPref] = useLocalStore<string>("currency", "INR");
  const [quickAddGesture, setQuickAddGesturePref] = useLocalStore<QuickAddGesture>("quickAddGesture", "bubble");
  const [floatingBubbleEnabled, setFloatingBubbleEnabled] = useLocalStore<boolean>("floatingBubbleEnabled", true);
  const [bubbleOpacity, setBubbleOpacityStore] = useLocalStore<number>("bubbleOpacity", 0.90);
  const [isSimulatingApp, setIsSimulatingApp] = useState(false);

  const setBubbleOpacity = useCallback((op: number) => {
    const clamped = Math.max(0.2, Math.min(1.0, op));
    setBubbleOpacityStore(clamped);
    getQuickAddPlugin()?.setBubbleOpacity?.({ opacity: clamped })?.catch(() => {});
  }, [setBubbleOpacityStore]);

  useEffect(() => {
    getQuickAddPlugin()?.setBubbleOpacity?.({ opacity: bubbleOpacity })?.catch(() => {});
  }, [bubbleOpacity]);

  // Security State
  const [savedPin, setSavedPin] = useLocalStore<string | null>("appPin", null);
  const [isLocked, setIsLocked] = useState(() => {
    // If a PIN is saved, start locked
    const hasPin = localStorage.getItem("balfin.local.appPin");
    return !!hasPin && hasPin !== "null";
  });
  const [maskBalances, setMaskBalances] = useLocalStore<boolean>("maskBalances", false);

  // Quotes
  const [quotes, setQuotes] = useState<Record<string, number | null>>({
    "^NSEI": 24850.35,
    "^BSESN": 81680.2,
    "TCS.NS": 4120.5,
    "INFY.NS": 1895.75,
    "RELIANCE.NS": 2980.1,
    "0P0000XW01.BO": 76.4,
  });
  const [quotesReady, setQuotesReady] = useState(true);

  useEffect(() => {
    setCurrency(currency);
  }, [currency]);

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  // Sync gesture to native Android bridge
  useEffect(() => {
    getQuickAddPlugin()?.setGesture({ gesture: quickAddGesture }).catch(() => {});
  }, [quickAddGesture]);

  const catName = useCallback(
    (id: string) => categories.find((c) => c._id === id)?.name ?? "Other",
    [categories]
  );

  const accountName = useCallback(
    (id?: string) => (id ? accounts.find((a) => a._id === id)?.name ?? "Account" : "Account"),
    [accounts]
  );

  const refreshQuotes = useCallback(async () => {
    try {
      const symbols = [...stocks.map((s) => s.symbol), ...INDEX_SYMBOLS].join(",");
      const res = await fetch(`/api/quotes?symbols=${encodeURIComponent(symbols)}`);
      if (res.ok) {
        const data = await res.json();
        const map: Record<string, number | null> = { ...quotes };
        for (const q of data.quotes || []) {
          if (q.symbol && q.price !== null) map[q.symbol] = q.price;
        }
        setQuotes(map);
      }
    } catch {}
  }, [stocks, quotes]);

  // Build full tabulated export payload for Google Sheets
  const buildSheetsPayload = useCallback((txnsOverride?: TxnRow[]) => {
    const txnsList = txnsOverride || transactions;
    const accMap = new Map(accounts.map((a) => [a._id, a.name]));
    const catMap = new Map(categories.map((c) => [c._id, c.name]));
    const dt = (ms: number) =>
      new Date(ms).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

    const rows: (string | number)[][] = [];

    // Transactions: Date | Type | Category | Subcategory | Account | Description | Debit | Credit
    for (const t of txnsList) {
      if (t.kind === "transfer") {
        rows.push([
          dt(t.date),
          "Transfer",
          "Account Transfer",
          "",
          `${t.accountId ? accMap.get(t.accountId) ?? "" : ""} → ${
            t.toAccountId ? accMap.get(t.toAccountId) ?? "" : ""
          }`,
          t.note ?? "",
          "",
          "",
        ]);
        continue;
      }
      rows.push([
        dt(t.date),
        t.kind === "income" ? "Income" : "Expense",
        t.categoryId ? catMap.get(t.categoryId) ?? "Unknown" : "Unknown",
        t.subcategory ?? "",
        t.accountId ? accMap.get(t.accountId) ?? "" : "",
        t.note ?? "",
        t.kind === "expense" ? t.amount : "",
        t.kind === "income" ? t.amount : "",
      ]);
    }

    // Stocks
    for (const s of stocks) {
      rows.push([
        dt(s.buyDate),
        "Investment",
        "Stock — Buy",
        `${s.symbol} ${s.name ? `(${s.name})` : ""}`,
        "",
        `${s.quantity} qty @ ₹${s.buyPrice}`,
        s.quantity * s.buyPrice + (s.buyCharges ?? 0),
        "",
      ]);
    }

    // Mutual funds
    for (const f of mutualFunds) {
      rows.push([
        dt(f.buyDate ?? Date.now()),
        "Investment",
        "Mutual Fund",
        f.name,
        "",
        `${f.units} units @ NAV ${f.avgNav}`,
        f.units * f.avgNav,
        "",
      ]);
    }

    // Monthly summary table
    const monthMap = new Map<string, { inc: number; exp: number }>();
    for (const t of txnsList) {
      if (t.kind === "transfer") continue;
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const cur = monthMap.get(key) ?? { inc: 0, exp: 0 };
      if (t.kind === "income") cur.inc += t.amount;
      else cur.exp += t.amount;
      monthMap.set(key, cur);
    }

    const budgetMap = new Map(budgets.map((b) => [b.month, b]));
    const months = [...monthMap.keys()].sort();
    const summaryRows: (string | number)[][] = months.map((mkey) => {
      const agg = monthMap.get(mkey)!;
      const b = budgetMap.get(mkey);
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
        rows,
      },
      summary: {
        headers: ["Month", "Income", "Expense", "Net", "Budget", "Savings Goal"],
        rows: summaryRows,
      },
      accounts: accounts.map((a) => ({
        name: a.name,
        type: a.type,
        bankName: a.bankName ?? "",
        openingBalance: a.openingBalance,
      })),
      generatedAt: Date.now(),
    };
  }, [accounts, categories, transactions, stocks, mutualFunds, budgets]);

  // Sheets sync action: tries native Java HTTP first (Android APK), then proxy, then direct fetch
  const syncSheets = useCallback(
    async (customEndpoint?: string, txnsOverride?: TxnRow[]): Promise<"synced" | "error"> => {
      const ep = (customEndpoint || sheetSync?.endpoint || "").trim();
      if (!ep) return "error";
      setSheetsSyncing(true);
      const payload = buildSheetsPayload(txnsOverride);
      const jsonBody = JSON.stringify(payload);

      // Strategy 1 (Native Android APK): Use native Java HttpURLConnection bridge.
      // Directly bypasses WebView CORS restrictions and follows Google Apps Script 302 redirects!
      const plugin = getQuickAddPlugin();
      if (plugin && typeof plugin.postJson === "function") {
        try {
          const nativeRes = await plugin.postJson({
            url: ep,
            data: jsonBody,
          });
          if (nativeRes && nativeRes.ok) {
            setSheetSync((prev) => ({
              ...prev,
              endpoint: ep,
              lastStatus: "synced",
              lastError: undefined,
              lastPushedAt: Date.now(),
            }));
            setSheetsSyncing(false);
            return "synced";
          }
        } catch (nativeErr: any) {
          console.warn("Native postJson error, trying web fetch:", nativeErr);
        }
      }

      // Strategy 2 (Web Preview / Express server proxy):
      try {
        const proxyRes = await fetch("/api/sync-sheets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: ep, payload }),
        });
        if (proxyRes.ok) {
          const out = await proxyRes.json();
          if (out && out.ok) {
            setSheetSync((prev) => ({
              ...prev,
              endpoint: ep,
              lastStatus: "synced",
              lastError: undefined,
              lastPushedAt: Date.now(),
            }));
            setSheetsSyncing(false);
            return "synced";
          }
        }
      } catch {
        // Express proxy not available
      }

      // Strategy 3 (Direct Web fetch with text/plain):
      // mode: "no-cors" with text/plain delivers the POST to doPost(e) without CORS failure
      try {
        await fetch(ep, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: jsonBody,
        });

        setSheetSync((prev) => ({
          ...prev,
          endpoint: ep,
          lastStatus: "synced",
          lastError: undefined,
          lastPushedAt: Date.now(),
        }));
        setSheetsSyncing(false);
        return "synced";
      } catch (err: any) {
        const msg = err.message || "Failed to push to Google Sheets";
        setSheetSync((prev) => ({
          ...prev,
          endpoint: ep,
          lastStatus: "error",
          lastError: msg,
        }));
        setSheetsSyncing(false);
        return "error";
      }
    },
    [sheetSync?.endpoint, buildSheetsPayload, setSheetSync]
  );

  const autoSyncIfConfigured = useCallback(() => {
    if (sheetSync?.endpoint) {
      syncSheets().catch(() => {});
    }
  }, [sheetSync?.endpoint, syncSheets]);

  // Mutations with zero-delay instant Google Sheets sync
  const addTxn = useCallback(
    async (data: Parameters<FinanceCtx["addTxn"]>[0]) => {
      const newTxn: TxnRow = {
        _id: `txn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        ...data,
      };
      const nextTxns = [newTxn, ...transactions];
      setTransactions(nextTxns);
      if (sheetSync?.endpoint) {
        syncSheets(undefined, nextTxns).catch(() => {});
      }
    },
    [transactions, sheetSync?.endpoint, syncSheets, setTransactions]
  );

  const updateTxn = useCallback(
    async (id: string, patch: Partial<TxnRow>) => {
      const nextTxns = transactions.map((t) => (t._id === id ? { ...t, ...patch } : t));
      setTransactions(nextTxns);
      if (sheetSync?.endpoint) {
        syncSheets(undefined, nextTxns).catch(() => {});
      }
    },
    [transactions, sheetSync?.endpoint, syncSheets, setTransactions]
  );

  const deleteTxn = useCallback(
    async (id: string) => {
      const nextTxns = transactions.filter((t) => t._id !== id);
      setTransactions(nextTxns);
      if (sheetSync?.endpoint) {
        syncSheets(undefined, nextTxns).catch(() => {});
      }
    },
    [transactions, sheetSync?.endpoint, syncSheets, setTransactions]
  );

  const addCategory = useCallback(
    async (name: string, type: "expense" | "income", icon?: string) => {
      const newCat: CategoryItem = {
        _id: `cat_${Date.now()}`,
        name,
        type,
        icon: icon || "CircleEllipsis",
        subcategories: [],
      };
      setCategories((prev) => [...prev, newCat]);
    },
    [setCategories]
  );

  const updateCategory = useCallback(
    async (id: string, patch: { name?: string; icon?: string }) => {
      setCategories((prev) => prev.map((c) => (c._id === id ? { ...c, ...patch } : c)));
    },
    [setCategories]
  );

  const deleteCategory = useCallback(
    async (id: string) => {
      setCategories((prev) => prev.filter((c) => c._id !== id));
    },
    [setCategories]
  );

  const addSub = useCallback(
    async (catId: string, name: string) => {
      setCategories((prev) =>
        prev.map((c) =>
          c._id === catId ? { ...c, subcategories: [...c.subcategories, { name }] } : c
        )
      );
    },
    [setCategories]
  );

  const deleteSub = useCallback(
    async (catId: string, index: number) => {
      setCategories((prev) =>
        prev.map((c) =>
          c._id === catId
            ? { ...c, subcategories: c.subcategories.filter((_, i) => i !== index) }
            : c
        )
      );
    },
    [setCategories]
  );

  const saveBudget = useCallback(
    async (month: string, patch: any) => {
      setBudgets((prev) => {
        const idx = prev.findIndex((b) => b.month === month);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], ...patch };
          return updated;
        }
        return [...prev, { _id: `bud_${Date.now()}`, month, ...patch }];
      });
    },
    [setBudgets]
  );

  const addAccount = useCallback(
    async (a: Parameters<FinanceCtx["addAccount"]>[0]) => {
      const newAcc: AccountItem = {
        _id: `acc_${Date.now()}`,
        name: a.name,
        type: a.type,
        bankName: a.bankName,
        openingBalance: a.openingBalance ?? 0,
      };
      setAccounts((prev) => [...prev, newAcc]);
    },
    [setAccounts]
  );

  const updateAccount = useCallback(
    async (id: string, patch: any) => {
      setAccounts((prev) => prev.map((a) => (a._id === id ? { ...a, ...patch } : a)));
    },
    [setAccounts]
  );

  const deleteAccount = useCallback(
    async (id: string) => {
      setAccounts((prev) => prev.filter((a) => a._id !== id));
    },
    [setAccounts]
  );

  const addStock = useCallback(
    async (s: Parameters<FinanceCtx["addStock"]>[0]) => {
      const newStock: StockRow = {
        _id: `stk_${Date.now()}`,
        symbol: s.symbol.toUpperCase(),
        name: s.name,
        exchange: s.exchange,
        quantity: s.quantity,
        bonuses: s.bonuses ?? 0,
        buyPrice: s.buyPrice,
        buyDate: s.buyDate,
        buyCharges: s.buyCharges ?? 0,
        closed: false,
      };
      setStocks((prev) => [...prev, newStock]);
      autoSyncIfConfigured();
    },
    [setStocks, autoSyncIfConfigured]
  );

  const addExit = useCallback(
    async (e: Parameters<FinanceCtx["addExit"]>[0]) => {
      const newExit: ExitRow = {
        _id: `exit_${Date.now()}`,
        ...e,
      };
      setExits((prev) => [...prev, newExit]);
      autoSyncIfConfigured();
    },
    [setExits, autoSyncIfConfigured]
  );

  const deleteExit = useCallback(
    async (exitId: string) => {
      setExits((prev) => prev.filter((e) => e._id !== exitId));
    },
    [setExits]
  );

  const addDividend = useCallback(
    async (d: Parameters<FinanceCtx["addDividend"]>[0]) => {
      const newDiv: DividendRow = {
        _id: `div_${Date.now()}`,
        ...d,
      };
      setDividends((prev) => [...prev, newDiv]);
      autoSyncIfConfigured();
    },
    [setDividends, autoSyncIfConfigured]
  );

  const deleteDividend = useCallback(
    async (id: string) => {
      setDividends((prev) => prev.filter((d) => d._id !== id));
    },
    [setDividends]
  );

  const deleteStock = useCallback(
    async (id: string) => {
      setStocks((prev) => prev.filter((s) => s._id !== id));
    },
    [setStocks]
  );

  const updateStock = useCallback(
    async (id: string, patch: any) => {
      setStocks((prev) => prev.map((s) => (s._id === id ? { ...s, ...patch } : s)));
    },
    [setStocks]
  );

  const addMF = useCallback(
    async (f: Parameters<FinanceCtx["addMF"]>[0]) => {
      const newMF: MFRow = {
        _id: `mf_${Date.now()}`,
        ...f,
      };
      setMutualFunds((prev) => [...prev, newMF]);
      autoSyncIfConfigured();
    },
    [setMutualFunds, autoSyncIfConfigured]
  );

  const updateMF = useCallback(
    async (id: string, patch: any) => {
      setMutualFunds((prev) => prev.map((m) => (m._id === id ? { ...m, ...patch } : m)));
    },
    [setMutualFunds]
  );

  const deleteMF = useCallback(
    async (id: string) => {
      setMutualFunds((prev) => prev.filter((m) => m._id !== id));
    },
    [setMutualFunds]
  );

  const addDeposit = useCallback(
    async (d: Parameters<FinanceCtx["addDeposit"]>[0]) => {
      const id = `dep_${Date.now()}`;
      const newDep: DepositRow = {
        _id: id,
        ...d,
      };
      setDeposits((prev) => [...prev, newDep]);
      return id;
    },
    [setDeposits]
  );

  const addDepositFlow = useCallback(
    async (f: Parameters<FinanceCtx["addDepositFlow"]>[0]) => {
      const newFlow: DepositFlowRow = {
        _id: `flw_${Date.now()}`,
        ...f,
      };
      setDepositFlows((prev) => [...prev, newFlow]);
      autoSyncIfConfigured();
    },
    [setDepositFlows, autoSyncIfConfigured]
  );

  const removeDepositFlow = useCallback(
    async (flowId: string) => {
      setDepositFlows((prev) => prev.filter((f) => f._id !== flowId));
    },
    [setDepositFlows]
  );

  const deleteDeposit = useCallback(
    async (id: string) => {
      setDeposits((prev) => prev.filter((d) => d._id !== id));
      setDepositFlows((prev) => prev.filter((f) => f.depositId !== id));
    },
    [setDeposits, setDepositFlows]
  );

  const addRecurring = useCallback(
    async (r: Omit<RecurringItem, "_id">) => {
      const newRec: RecurringItem = {
        _id: `rec_${Date.now()}`,
        ...r,
      };
      setRecurringBills((prev) => [...prev, newRec]);
    },
    [setRecurringBills]
  );

  const deleteRecurring = useCallback(
    async (id: string) => {
      setRecurringBills((prev) => prev.filter((r) => r._id !== id));
    },
    [setRecurringBills]
  );

  const payRecurring = useCallback(
    async (id: string) => {
      const bill = recurringBills.find((b) => b._id === id);
      if (!bill) return;
      const now = Date.now();
      await addTxn({
        kind: "expense",
        amount: bill.amount,
        categoryId: bill.categoryId,
        accountId: bill.accountId || accounts[0]?._id,
        note: `${bill.name} (Recurring Payment)`,
        date: now,
      });
      setRecurringBills((prev) =>
        prev.map((b) => (b._id === id ? { ...b, lastPaidDate: now } : b))
      );
    },
    [recurringBills, addTxn, accounts, setRecurringBills]
  );

  const setSheetEndpoint = useCallback(
    async (url: string) => {
      const trimmed = url.trim();
      setSheetSync((prev) => ({
        ...prev,
        endpoint: trimmed,
        lastStatus: trimmed ? "pending" : undefined,
        lastError: undefined,
      }));
    },
    [setSheetSync]
  );

  const setBackupFrequency = useCallback(
    async (freq: SheetBackupFrequency) => {
      setSheetSync((prev) => ({ ...prev, backupFrequency: freq }));
    },
    [setSheetSync]
  );

  const unlock = useCallback(() => setIsLocked(false), []);
  const lockApp = useCallback(() => setIsLocked(true), []);

  const value: FinanceCtx = {
    ready: true,
    urlMissing: false,
    isLocalMode,
    setLocalMode: setIsLocalMode,
    convexUrl,
    setConvexUrl,

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
    recurringBills,
    quotes,
    indices: quotes,
    quotesReady,
    refreshQuotes,
    catName,
    accountName,

    currency,
    setCurrencyPref,
    quickAddGesture,
    setQuickAddGesture: setQuickAddGesturePref,
    floatingBubbleEnabled,
    setFloatingBubbleEnabled,
    bubbleOpacity,
    setBubbleOpacity,
    isSimulatingApp,
    setIsSimulatingApp,

    isLocked,
    savedPin,
    setSavedPin,
    unlock,
    lockApp,
    maskBalances,
    setMaskBalances,

    sheetSync,
    setSheetEndpoint,
    setBackupFrequency,
    syncSheets,
    sheetsSyncing,

    addTxn,
    updateTxn,
    deleteTxn,
    addCategory,
    updateCategory,
    deleteCategory,
    addSub,
    deleteSub,
    saveBudget,
    addAccount,
    updateAccount,
    deleteAccount,
    addStock,
    addExit,
    deleteExit,
    addDividend,
    deleteDividend,
    deleteStock,
    updateStock,
    addMF,
    updateMF,
    deleteMF,
    addDeposit,
    addDepositFlow,
    removeDepositFlow,
    deleteDeposit,
    addRecurring,
    deleteRecurring,
    payRecurring,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFinance() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useFinance outside provider");
  return ctx;
}
