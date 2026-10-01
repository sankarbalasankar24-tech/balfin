import React, { useEffect, useState } from "react";
import { NavLink as RRNavLink } from "react-router-dom";
import { Home, PieChart, List, TrendingUp, Settings, Plus } from "lucide-react";
import QuickEntry from "./QuickEntry";

const TABS: Array<{ to: string; label: string; icon: React.ComponentType<{ size?: number; className?: string }>; end?: boolean }> = [
  { to: "/app", label: "Overview", icon: Home, end: true },
  { to: "/app/ledger", label: "Ledger", icon: List },
  { to: "/app/invest", label: "Invest", icon: TrendingUp },
  { to: "/app/budgets", label: "Budgets", icon: PieChart },
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

  // Deep links (home-screen shortcuts): balfin://quick-add?kind=income
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
        <header className="sticky top-0 z-30 bg-background/90 px-4 pb-3 pt-4 backdrop-blur">
          <h1 className="text-[26px] font-bold leading-8 tracking-tight">{title}</h1>
          {subtitle && <p className="text-xs text-ink-soft">{subtitle}</p>}
        </header>
        <main className="flex-1 px-4 pb-28">{children}</main>

        {/* Quick Log pill — Level 3 elevation with emerald glow */}
        <button
          onClick={() => openEntry()}
          aria-label="Quick log"
          className="fixed bottom-24 right-1/2 z-40 flex h-12 translate-x-[max(50%,calc(50%-20rem))] items-center gap-1.5 rounded-full border border-primary/20 bg-primary px-5 text-sm font-bold text-[#003823] shadow-[0_12px_32px_-4px_rgba(0,200,136,0.35)] transition active:scale-95"
        >
          <Plus size={18} strokeWidth={2.5} />
          Quick Log
        </button>

        {/* bottom nav */}
        <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-lg -translate-x-1/2 rounded-t-2xl bg-surface-low px-2 pb-[max(env(safe-area-inset-bottom),0.4rem)] pt-1.5 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.45)]">
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

        <QuickEntry
          open={entry.open}
          editId={entry.editId}
          initialKind={entry.initialKind}
          onClose={() => setEntry({ open: false, editId: null })}
        />
      </div>
    </EntryEditContext.Provider>
  );
}

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
        `mx-auto flex w-[4.2rem] flex-col items-center justify-center gap-0.5 rounded-full py-1 text-[10px] font-semibold transition active:scale-95 ${
          isActive
            ? "bg-primary text-[#003823]"
            : "text-ink-faint"
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
