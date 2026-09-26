import { useFinance } from "@/finance/FinanceContext";

export default function Landing() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-between px-6 py-12">
      <div>
        <p className="font-display text-sm font-medium uppercase tracking-widest text-primary">BalFin</p>
        <h1 className="mt-3 font-display text-4xl font-semibold leading-tight">
          Track every day,
          <br />
          see the whole picture.
        </h1>
        <p className="mt-4 text-ink-soft">
          A private ledger for one person: you. Log expenses and income in
          seconds, watch budgets and savings goals, and hold your stocks and
          mutual funds at live NSE and BSE prices — everything syncing to your
          own private database.
        </p>
        <ul className="mt-6 space-y-2.5 text-sm text-ink-soft">
          <li className="flex gap-2.5"><span className="text-primary">✓</span> Quick-entry cards with categories, subcategories, accounts and bill photos</li>
          <li className="flex gap-2.5"><span className="text-primary">✓</span> All-time snapshot — liquid funds plus investments at live prices</li>
          <li className="flex gap-2.5"><span className="text-primary">✓</span> Monthly analytics: category pies, weekday patterns, previous-month comparison</li>
          <li className="flex gap-2.5"><span className="text-primary">✓</span> Staggered partial or full exits, dividends, long and short term P&L</li>
          <li className="flex gap-2.5"><span className="text-primary">✓</span> Income goals, spending limits, savings goals and per-category budgets</li>
          <li className="flex gap-2.5"><span className="text-primary">✓</span> Everything searchable — keyword, category or date range</li>
        </ul>
      </div>
      <div className="mt-10 space-y-3">
        <button
          onClick={() => { window.location.hash = "/app"; }}
          className="block w-full rounded-xl bg-primary py-3.5 text-center text-sm font-semibold text-white"
        >
          Take command of your money
        </button>
        <p className="text-center text-[11px] text-ink-faint">
          Runs entirely on free infrastructure — your data stays yours.
        </p>
      </div>
    </div>
  );
}
