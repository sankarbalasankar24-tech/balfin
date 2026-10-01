import { useState } from "react";
import { useFinance, type QuickAddGesture } from "@/finance/FinanceContext";
import AppShell from "@/finance/AppShell";
import { fmtMoney, CURRENCIES, setCurrency } from "@/finance/format";
import { CatIcon } from "@/finance/icons";
import {
  Plus, Trash2, Download, Building2, X, FileSpreadsheet,
  Pencil, Vibrate, Hand, Ban, RefreshCw, CheckCircle2, AlertCircle, ExternalLink,
} from "lucide-react";

type Tab = "categories" | "accounts" | "preferences";

const GESTURES: Array<{ key: QuickAddGesture; label: string; desc: string; icon: React.ComponentType<{ size?: number }> }> = [
  { key: "bubble", label: "Floating bubble", desc: "Draggable mint bubble over any app — tap it to quick-add", icon: Hand },
  { key: "shake", label: "Shake phone", desc: "Shake the device any time to pop quick entry", icon: Vibrate },
  { key: "none", label: "Off", desc: "Open quick entry only from inside the app", icon: Ban },
];

export default function Manage() {
  const {
    categories, transactions, accounts, addCategory, updateCategory, deleteCategory,
    addSub, deleteSub, addAccount, updateAccount, deleteAccount,
    currency, setCurrencyPref, catName,
    quickAddGesture, setQuickAddGesture,
    sheetSync, setSheetEndpoint, syncSheets, sheetsSyncing,
  } = useFinance();
  const [tab, setTab] = useState<Tab>("categories");
  const [endpoint, setEndpoint] = useState(sheetSync?.endpoint ?? "");
  const [epSaved, setEpSaved] = useState(false);

  const exportCsv = () => {
    const rows = [
      ["Date", "Type", "Category", "Subcategory", "Account", "Amount", "Note"],
      ...transactions
        .slice()
        .sort((a, b) => a.date - b.date)
        .map((t) => [
          new Date(t.date).toISOString(),
          t.kind,
          catName(t.categoryId),
          t.subcategory ?? "",
          t.accountId ? accounts.find((a) => a._id === t.accountId)?.name ?? "" : "",
          String(t.amount),
          (t.note ?? "").replace(/"/g, '""'),
        ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "balfin-export.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const saveEndpoint = async () => {
    await setSheetEndpoint(endpoint);
    setEpSaved(true);
    setTimeout(() => setEpSaved(false), 2000);
  };

  const status = sheetSync?.lastStatus;
  const statusPill =
    status === "synced" ? (
      <span className="flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-semibold text-primary-bright">
        <CheckCircle2 size={12} /> Auto-synced
      </span>
    ) : status === "error" ? (
      <span className="flex items-center gap-1 rounded-full bg-tertiary-deep/20 px-2.5 py-1 text-[11px] font-semibold text-tertiary">
        <AlertCircle size={12} /> Error
      </span>
    ) : sheetSync?.endpoint ? (
      <span className="flex items-center gap-1 rounded-full bg-secondary-deep/30 px-2.5 py-1 text-[11px] font-semibold text-secondary">
        <RefreshCw size={12} className="animate-spin" /> Pending
      </span>
    ) : null;

  return (
    <AppShell title="Manage" subtitle="Categories, accounts and preferences">
      <div className="mb-3 grid grid-cols-3 gap-1 rounded-full bg-surface-low p-1">
        {(["categories", "accounts", "preferences"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-full py-2 text-xs font-semibold capitalize transition ${tab === t ? "bg-card-high text-primary shadow-sm" : "text-ink-faint"}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === "categories" && <CategoriesTab />}
      {tab === "accounts" && <AccountsTab />}
      {tab === "preferences" && (
        <section className="space-y-4">
          {/* general */}
          <div className="space-y-3 rounded-2xl border border-white/5 bg-card p-5">
            <h3 className="text-sm font-bold">General</h3>
            <label className="flex items-center justify-between">
              <span className="text-sm">Currency</span>
              <select
                value={currency}
                onChange={(e) => { setCurrencyPref(e.target.value); setCurrency(e.target.value); }}
                className="rounded-lg border border-white/10 bg-surface-low px-3 py-2 text-sm"
              >
                {Object.entries(CURRENCIES).map(([code, c]) => (
                  <option key={code} value={code}>{code} — {c.label}</option>
                ))}
              </select>
            </label>
</div>

          {/* quick-add gesture chooser */}
          <div className="space-y-3 rounded-2xl border border-white/5 bg-card p-5">
            <h3 className="text-sm font-bold">Quick-add gesture</h3>
            <p className="text-[11px] text-ink-faint">
              Pick how the quick-entry popup opens — even when BalFin isn't the app on screen. Each save syncs to your database and Google Sheet without opening the app.
            </p>
            <div className="space-y-2">
              {GESTURES.map((g) => {
                const active = quickAddGesture === g.key;
                const Icon = g.icon;
                return (
                  <button
                    key={g.key}
                    onClick={() => setQuickAddGesture(g.key)}
                    className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition active:scale-[0.99] ${
                      active ? "border-primary/40 bg-primary/10" : "border-white/10 bg-surface-low"
                    }`}
                  >
                    <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${active ? "bg-primary/20 text-primary-bright" : "bg-card-high text-ink-faint"}`}>
                      <Icon size={16} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-sm font-semibold ${active ? "text-primary-bright" : ""}`}>{g.label}</span>
                      <span className="block text-[11px] text-ink-faint">{g.desc}</span>
                    </span>
                    <span className={`h-4 w-4 flex-shrink-0 rounded-full border-2 ${active ? "border-primary bg-primary" : "border-ink-faint/50"}`} />
                  </button>
                );
              })}
            </div>
            {(quickAddGesture === "bubble" || quickAddGesture === "shake") && (
              <p className="rounded-xl bg-surface-low px-3 py-2 text-[11px] text-ink-faint">
                First time: Android will ask for "Display over other apps" (bubble) — allow it once and the popup is ready everywhere.
              </p>
            )}
          </div>

          {/* Google Sheets auto-sync */}
          <div className="space-y-3 rounded-2xl border border-white/5 bg-card p-5">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-bold">
                <FileSpreadsheet size={15} className="text-primary" /> Google Sheets sync
              </h3>
              {statusPill}
            </div>
            <p className="text-[11px] text-ink-faint">
              Every entry is pushed automatically to your linked sheet — tabulated with Debit/Credit columns and a Monthly Summary tab.
            </p>
            <ol className="space-y-1 rounded-xl bg-surface-low px-3 py-2.5 text-[11px] text-ink-soft">
              <li>1. Open your Google Sheet → Extensions → Apps Script</li>
              <li>2. Paste the script from <code className="text-primary-bright">google-apps-script/Code.gs</code> in the app repo</li>
              <li>3. Deploy → Web app (execute as <b>Me</b>, access <b>Anyone</b>)</li>
              <li>4. Paste the <b>.../exec</b> URL below</li>
            </ol>
            <div className="flex gap-2">
              <input
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder="https://script.google.com/macros/s/…/exec"
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-surface-low px-3 py-2 text-xs"
              />
              <button
                onClick={saveEndpoint}
                disabled={epSaved}
                className="flex-shrink-0 rounded-full bg-primary px-4 text-xs font-bold text-[#003823] disabled:opacity-60"
              >
                {epSaved ? "Saved" : "Link"}
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => syncSheets()}
                disabled={!sheetSync?.endpoint || sheetsSyncing}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary py-2.5 text-sm font-bold text-[#003823] disabled:opacity-40"
              >
                <RefreshCw size={15} className={sheetsSyncing ? "animate-spin" : ""} />
                {sheetsSyncing ? "Syncing…" : "Sync now"}
              </button>
              <a
                href="https://sheets.new"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center rounded-full border border-white/10 px-4 text-ink-soft"
                aria-label="Open a new Google Sheet"
              >
                <ExternalLink size={15} />
              </a>
            </div>
            {sheetSync?.lastError && (
              <p className="rounded-xl bg-tertiary-deep/10 px-3 py-2 text-[11px] text-tertiary">{sheetSync.lastError}</p>
            )}
            {sheetSync?.lastPushedAt && status === "synced" && (
              <p className="text-center text-[10px] text-ink-faint">
                Last push {new Date(sheetSync.lastPushedAt).toLocaleString("en-IN")}
              </p>
            )}
          </div>

          <button onClick={exportCsv} className="flex w-full items-center justify-center gap-2 rounded-full bg-surface-low py-3 text-sm font-semibold text-ink">
            <Download size={15} /> Export all data (CSV)
          </button>
          <p className="text-center text-[11px] text-ink-faint">
            Your data lives in your private Convex database and syncs to every device where you connect the same deployment.
          </p>
        </section>
      )}
    </AppShell>
  );

  function CategoriesTab() {
    const [type, setType] = useState<"expense" | "income">("expense");
    const [newName, setNewName] = useState("");
    const [subFor, setSubFor] = useState<string | null>(null);
    const [subName, setSubName] = useState("");
    const cats = categories.filter((c) => c.type === type);

    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-1 rounded-full bg-surface-low p-1">
          {(["expense", "income"] as const).map((k) => (
            <button key={k} onClick={() => setType(k)} className={`rounded-full py-1.5 text-xs font-semibold capitalize ${type === k ? "bg-card-high text-primary shadow-sm" : "text-ink-faint"}`}>{k}</button>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={`New ${type} category`} className="flex-1 rounded-full border border-white/10 bg-card px-4 py-2 text-sm" onKeyDown={(e) => { if (e.key === "Enter" && newName.trim()) { addCategory(newName.trim(), type); setNewName(""); } }} />
          <button onClick={() => { if (newName.trim()) { addCategory(newName.trim(), type); setNewName(""); } }} className="rounded-full bg-primary px-4 text-[#003823]"><Plus size={16} /></button>
        </div>
        {cats.map((c) => (
          <div key={c._id} className="rounded-2xl border border-white/5 bg-card p-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary-bright"><CatIcon name={c.icon} size={14} /></span>
              <input
                value={c.name}
                onChange={(e) => updateCategory(c._id, { name: e.target.value })}
                className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-1 py-0.5 text-sm font-semibold hover:border-white/10 focus:border-white/10"
              />
              <button onClick={() => deleteCategory(c._id)} className="text-ink-faint hover:text-tertiary-deep" aria-label="Delete category"><Trash2 size={14} /></button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {c.subcategories.map((s, i) => (
                <span key={s.name + i} className="flex items-center gap-1 rounded-full bg-surface-low px-2.5 py-1 text-xs text-ink-soft">
                  <CatIcon name={s.icon} size={10} />
                  {s.name}
                  <button onClick={() => deleteSub(c._id, i)} className="text-ink-faint hover:text-tertiary-deep" aria-label="Remove">×</button>
                </span>
              ))}
              <button onClick={() => setSubFor(subFor === c._id ? null : c._id)} className="flex items-center gap-0.5 rounded-full border border-dashed border-white/15 px-2.5 py-1 text-xs text-ink-faint">
                <Plus size={10} /> sub
              </button>
            </div>
            {subFor === c._id && (
              <div className="mt-2 flex gap-2">
                <input value={subName} onChange={(e) => setSubName(e.target.value)} placeholder="Subcategory name" autoFocus className="flex-1 rounded-full border border-white/10 bg-surface-low px-3 py-1.5 text-xs" onKeyDown={(e) => { if (e.key === "Enter" && subName.trim()) { addSub(c._id, subName.trim()); setSubName(""); } }} />
                <button onClick={() => { if (subName.trim()) { addSub(c._id, subName.trim()); setSubName(""); } }} className="rounded-full bg-primary px-3 text-xs font-bold text-[#003823]">Add</button>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  function AccountsTab() {
    const [name, setName] = useState("");
    const [bank, setBank] = useState("");
    const [type, setType] = useState<"savings" | "wallet" | "investment">("savings");
    const [opening, setOpening] = useState("");
    const [editId, setEditId] = useState<string | null>(null);

    const balanceOf = (accountId: string, openingBalance: number) => {
      let flow = 0;
      for (const t of transactions) if (t.accountId === accountId) flow += t.kind === "income" ? t.amount : -t.amount;
      return openingBalance + flow;
    };
    const netTotal = accounts.reduce((s, a) => s + balanceOf(a._id, a.openingBalance), 0);
    const byType = { savings: 0, wallet: 0, investment: 0 } as Record<string, number>;
    for (const a of accounts) byType[a.type] += balanceOf(a._id, a.openingBalance);

    return (
      <div className="space-y-3">
        <section className="rounded-2xl border border-white/5 bg-card p-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2 rounded-xl bg-primary/15 p-3 text-center">
              <p className="text-xs text-primary-bright">Total across all accounts</p>
              <p className="text-2xl font-extrabold tabular">{fmtMoney(netTotal)}</p>
            </div>
            {(Object.keys(byType) as Array<keyof typeof byType>).map((t) => (
              <div key={t} className="rounded-xl bg-surface-low p-2.5 text-center">
                <p className="text-[11px] capitalize text-ink-faint">{t}</p>
                <p className="text-sm font-semibold tabular">{fmtMoney(byType[t], { compact: true })}</p>
              </div>
            ))}
          </div>
        </section>
        <div className="space-y-2 rounded-2xl border border-white/5 bg-card p-4">
          <h3 className="text-sm font-bold">Add account</h3>
          <div className="grid grid-cols-3 gap-1 rounded-full bg-surface-low p-1">
            {(["savings", "wallet", "investment"] as const).map((t) => (
              <button key={t} onClick={() => setType(t)} className={`rounded-full py-1.5 text-xs font-semibold capitalize ${type === t ? "bg-card-high text-primary shadow-sm" : "text-ink-faint"}`}>{t}</button>
            ))}
          </div>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Account name (e.g. HDFC Salary)" className="w-full rounded-xl border border-white/10 bg-surface-low px-3 py-2 text-sm" />
          {type === "savings" && (
            <input value={bank} onChange={(e) => setBank(e.target.value)} placeholder="Bank name" className="w-full rounded-xl border border-white/10 bg-surface-low px-3 py-2 text-sm" />
          )}
          <input type="number" inputMode="decimal" value={opening} onChange={(e) => setOpening(e.target.value)} placeholder="Opening balance" className="w-full rounded-xl border border-white/10 bg-surface-low px-3 py-2 text-sm" />
          <button
            onClick={() => {
              if (!name.trim()) return;
              addAccount({ name: name.trim(), type, bankName: bank.trim() || undefined, openingBalance: parseFloat(opening) || 0 });
              setName(""); setBank(""); setOpening("");
            }}
            className="flex w-full items-center justify-center gap-1.5 rounded-full bg-primary py-2.5 text-sm font-bold text-[#003823]"
          >
            <Plus size={15} /> Add account
          </button>
        </div>
        {accounts.map((a) => (
          <AccountRow
            key={a._id}
            a={a}
            balance={balanceOf(a._id, a.openingBalance)}
            editing={editId === a._id}
            onStartEdit={() => setEditId(editId === a._id ? null : a._id)}
            onCancel={() => setEditId(null)}
            onSave={async (patch) => {
              await updateAccount(a._id, patch);
              setEditId(null);
            }}
            onDelete={() => deleteAccount(a._id)}
          />
        ))}
      </div>
    );
  }
}

function AccountRow({
  a, balance, editing, onStartEdit, onCancel, onSave, onDelete,
}: {
  a: { _id: string; name: string; type: "savings" | "wallet" | "investment"; bankName?: string; openingBalance: number };
  balance: number;
  editing: boolean;
  onStartEdit: () => void;
  onCancel: () => void;
  onSave: (patch: { name: string; type: "savings" | "wallet" | "investment"; bankName?: string; openingBalance: number }) => Promise<void>;
  onDelete: () => void;
}) {
  const [name, setName] = useState(a.name);
  const [bank, setBank] = useState(a.bankName ?? "");
  const [type, setType] = useState<"savings" | "wallet" | "investment">(a.type);
  const [opening, setOpening] = useState(String(a.openingBalance));
  const [saving, setSaving] = useState(false);

  if (editing) {
    return (
      <div className="space-y-2 rounded-2xl border border-white/5 bg-card p-4">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Edit account</h4>
        <div className="grid grid-cols-3 gap-1 rounded-full bg-surface-low p-1">
          {(["savings", "wallet", "investment"] as const).map((t) => (
            <button key={t} onClick={() => setType(t)} className={`rounded-full py-1.5 text-xs font-semibold capitalize ${type === t ? "bg-card-high text-primary shadow-sm" : "text-ink-faint"}`}>{t}</button>
          ))}
        </div>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Account name" className="w-full rounded-xl border border-white/10 bg-surface-low px-3 py-2 text-sm" />
        {type === "savings" && (
          <input value={bank} onChange={(e) => setBank(e.target.value)} placeholder="Bank name" className="w-full rounded-xl border border-white/10 bg-surface-low px-3 py-2 text-sm" />
        )}
        <input type="number" inputMode="decimal" value={opening} onChange={(e) => setOpening(e.target.value)} placeholder="Opening balance" className="w-full rounded-xl border border-white/10 bg-surface-low px-3 py-2 text-sm" />
        <div className="flex gap-2">
          <button
            onClick={async () => {
              if (!name.trim()) return;
              setSaving(true);
              try {
                await onSave({
                  name: name.trim(),
                  type,
                  bankName: bank.trim() || undefined,
                  openingBalance: parseFloat(opening) || 0,
                });
              } finally {
                setSaving(false);
              }
            }}
            disabled={!name.trim() || saving}
            className="flex-1 rounded-full bg-primary py-2.5 text-sm font-bold text-[#003823] disabled:opacity-40"
          >
            Save changes
          </button>
          <button onClick={onCancel} className="rounded-full border border-white/10 px-4 py-2.5 text-sm font-semibold text-ink-soft">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-card p-4">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary-bright"><Building2 size={15} /></span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{a.name}</p>
        <p className="text-xs text-ink-faint">
          {a.bankName ? `${a.bankName} · ` : ""}{a.type} · opening {fmtMoney(a.openingBalance)}
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold tabular">{fmtMoney(balance)}</p>
      </div>
      <button onClick={onStartEdit} className="text-ink-faint hover:text-primary" aria-label="Edit account"><Pencil size={15} /></button>
      <button onClick={onDelete} className="text-ink-faint hover:text-tertiary-deep" aria-label="Delete account"><X size={15} /></button>
    </div>
  );
}
