import React, { useEffect, useState } from "react";
import { NavLink as RRNavLink, useLocation, useNavigate } from "react-router-dom";
import { Home, PieChart, List, TrendingUp, Settings, Plus } from "lucide-react";
import QuickEntry from "./QuickEntry";
import FloatingQuickBubble from "./FloatingQuickBubble";
import AppSimulatorModal from "./AppSimulatorModal";
import SecurityGate from "./SecurityGate";
import { useFinance } from "./FinanceContext";

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
  const location = useLocation();
  const navigate = useNavigate();
  const quickAdd = location.pathname === "/app/quick-add";
  const {
    isLocked,
    savedPin,
    unlock,
    floatingBubbleEnabled,
    quickAddGesture,
    isSimulatingApp,
    setIsSimulatingApp,
  } = useFinance();

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

  useEffect(() => {
    if (quickAdd) setEntry((e) => ({ ...e, open: true, popup: true, editId: null }));
  }, [quickAdd]);

  const openEntry = (editId: string | null = null) =>
    setEntry({ open: true, editId });
  const openEntryWithKind = (kind: "expense" | "income") =>
    setEntry({ open: true, editId: null, initialKind: kind });

  const showBubble = floatingBubbleEnabled && quickAddGesture === "bubble";

  return (
    <EntryEditContext.Provider value={{ openEntry, openEntryWithKind }}>
      {/* Security App Lock Gate */}
      <SecurityGate isLocked={isLocked} savedPin={savedPin} onUnlock={unlock} />

      <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col">
        {/* Main Content */}
        <main
          key={location.pathname}
          className="animate-tab flex-1 px-4 pb-[calc(8rem+env(safe-area-inset-bottom,0px))] pt-[calc(1rem+env(safe-area-inset-top,0px))]"
        >
          {children}
        </main>

        {/* Floating Quick Add Bubble (Instagram reel feature) */}
        {showBubble && (
          <FloatingQuickBubble
            onOpenQuickAdd={(kind) => {
              if (kind) openEntryWithKind(kind);
              else openEntry();
            }}
            onOpenSimulator={() => setIsSimulatingApp(true)}
            isSimulating={isSimulatingApp}
          />
        )}

        {/* Floating Simulator over external app */}
        <AppSimulatorModal
          open={isSimulatingApp}
          onClose={() => setIsSimulatingApp(false)}
        />

        {/* Bottom Nav */}
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

        {/* QuickEntry Modal */}
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
            : "text-ink-faint hover:text-ink"
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
