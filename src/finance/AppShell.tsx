import React, { useEffect, useState } from "react";
import { NavLink as RRNavLink, useLocation, useNavigate } from "react-router-dom";
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
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}) {
  // The gesture popup is route-driven: #/app/quick-add renders this shell
  // with the step-by-step wizard open, so the native overlay window (and
  // home-screen shortcuts) survive router redirects deterministically.
  const location = useLocation();
  const navigate = useNavigate();
  const quickAdd = location.pathname === "/app/quick-add";

  const [entry, setEntry] = useState<{
    open: boolean;
    editId: string | null;
    initialKind?: "expense" | "income";
    popup?: boolean;
  }>(() => ({
    open: quickAdd,
    editId: null,
    initialKind:
      new URLSearchParams(location.search).get("kind") === "income" ? "income" : "expense",
    popup: quickAdd,
  }));

  // React reuses this component across /app <-> /app/quick-add (same element
  // type), so the route must also drive the state after mount.
  useEffect(() => {
    if (quickAdd) setEntry((e) => ({ ...e, open: true, popup: true, editId: null }));
  }, [quickAdd]);

  const openEntry = (editId: string | null = null) =>
    setEntry({ open: true, editId });
  const openEntryWithKind = (kind: "expense" | "income") =>
    setEntry({ open: true, editId: null, initialKind: kind });

  return (
    <EntryEditContext.Provider value={{ openEntry, openEntryWithKind }}>
      <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col">
        {/* No page title — the tab name in the bottom nav is enough. */}
        {/* key retriggers the enter animation on every tab switch; safe-area
            paddings keep content clear of the camera cutout and gesture bar. */}
        <main
          key={location.pathname}
          className="animate-tab flex-1 px-4 pb-[calc(8rem+env(safe-area-inset-bottom,0px))] pt-[calc(1rem+env(safe-area-inset-top,0px))]"
        >
          {children}
        </main>

        {/* Quick Log pill — bottom-right for one-hand reach, clear of the nav */}
        <button
          onClick={() => openEntry()}
          aria-label="Quick log"
          className="fixed right-4 z-40 flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary py-3 pl-4 pr-5 text-sm font-bold text-[#003823] shadow-[0_12px_32px_-4px_rgba(0,200,136,0.45)] transition active:scale-95"
          style={{ bottom: "calc(5.25rem + env(safe-area-inset-bottom, 0px))" }}
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
          variant={entry.popup ? "popup" : "sheet"}
          onClose={() => {
            setEntry({ open: false, editId: null, popup: false });
            if (quickAdd) navigate("/app", { replace: true });
          }}
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
  openEntryWithKind: (kind: "expense" | "income") => {
    void kind;
  },
});

export function useEntryEdit() {
  return React.useContext(EntryEditContext);
}
