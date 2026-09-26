import React, { useEffect, useState } from "react";
import { useFinance } from "./FinanceContext";
import { CatIcon } from "./icons";
import { fmtMoney } from "./format";
import { Home, PieChart, List, TrendingUp, Target, Settings, Plus } from "lucide-react";
import EntrySheet from "./EntrySheet";

const TABS: Array<{ to: string; label: string; icon: React.ComponentType<{ size?: number }>; end?: boolean }> = [
  { to: "/app", label: "Overview", icon: Home, end: true },
  { to: "/app/ledger", label: "Ledger", icon: List },
  { to: "/app/invest", label: "Invest", icon: TrendingUp },
  { to: "/app/budgets", label: "Budgets", icon: Target },
  { to: "/app/manage", label: "Manage", icon: Settings },
];

export default function AppShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  const [entry, setEntry] = useState<{ open: boolean; editId: string | null; initialKind?: "expense" | "income" }>({
    open: false,
    editId: null,
  });

  const openEntry = (editId: string | null = null) =>
    setEntry({ open: true, editId });
  const openEntryWithKind = (kind: "expense" | "income") =>
    setEntry({ open: true, editId: null, initialKind: kind });

  // Android widget / shortcut deep links: balfin://quick-add?kind=income
  useEffect(() => {
    const handler = () => {
      const h = window.location.hash;
      const match = h.match(/#\/app\/quick-add\?kind=(expense|income)/);
      if (match) {
        openEntryWithKind(match[1] as "expense" | "income");
        window.history.replaceState(null, "", "#/app");
      } else if (h.includes("quick-add")) {
        openEntryWithKind("expense");
        window.history.replaceState(null, "", "#/app");
      }
    };
    handler();
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  return (
    <EntryEditContext.Provider value={{ openEntry, openEntryWithKind }}>
      <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col">
        <header className="sticky top-0 z-30 bg-surface/90 px-4 pb-3 pt-4 backdrop-blur">
          <h1 className="font-display text-2xl font-semibold leading-tight">{title}</h1>
          {subtitle && <p className="text-sm text-ink-soft">{subtitle}</p>}
        </header>
        <main className="flex-1 px-4 pb-28">{children}</main>

        {/* FAB */}
        <button
          onClick={() => openEntry()}
          aria-label="Quick add"
          className="fixed bottom-24 right-1/2 z-40 flex h-14 w-14 translate-x-[max(50%,calc(50%-20rem))] items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30 active:scale-95 transition"
        >
          <Plus size={26} />
        </button>

        {/* bottom nav */}
        <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-lg -translate-x-1/2 border-t border-line bg-card/95 px-2 pb-[max(env(safe-area-inset-bottom),0.4rem)] pt-1.5 backdrop-blur">
          <div className="grid grid-cols-5">
            {TABS.map(({ to, label, icon: Icon, end }) => {
              return (
                <NavLink key={to} to={to} end={end} label={label}>
                  <Icon size={20} />
                </NavLink>
              );
            })}
          </div>
        </nav>

        <EntrySheet
          open={entry.open}
          editId={entry.editId}
          initialKind={entry.initialKind}
          onClose={() => setEntry({ open: false, editId: null })}
        />
      </div>
    </EntryEditContext.Provider>
  );
}

// Minimal NavLink + context to avoid extra imports elsewhere
import { NavLink as RRNavLink, useLocation } from "react-router-dom";

function NavLink({
  to,
  end,
  label,
  children,
}: {
  to: string;
  end?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <RRNavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-medium transition ${
          isActive ? "text-primary" : "text-ink-faint"
        }`
      }
    >
      {children}
      <span>{label}</span>
    </RRNavLink>
  );
}

export const EntryEditContext = React.createContext<{
  openEntry: (editId?: string | null) => void;
  openEntryWithKind: (kind: "expense" | "income") => void;
}>({
  openEntry: () => {},
  openEntryWithKind: () => {},
});

export function useEntryEdit() {
  return React.useContext(EntryEditContext);
}
