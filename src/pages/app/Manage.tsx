import { useState } from "react";
import { useFinance } from "@/finance/FinanceContext";
import AppShell from "@/finance/AppShell";
import { fmtMoney, CURRENCIES, setCurrency } from "@/finance/format";
import { CatIcon } from "@/finance/icons";
import { Plus, Trash2, Download, Moon, Sun, Building2, X, FileSpreadsheet, Pencil } from "lucide-react";

type Tab = "categories" | "accounts" | "preferences";

export default function Manage() {
  const {
    categories, transactions, accounts, addCategory, updateCategory, deleteCategory,
    addSub, deleteSub, addAccount, updateAccount, deleteAccount,
    currency, setCurrencyPref, theme, toggleTheme, quickAddTray, setQuickAddTray, catName,
  } = useFinance();
  const [tab, setTab] = useState<Tab>("categories");

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

  // Google Sheets import format: TSV copied to clipboard, plus one-click
  // opening of a new spreadsheet to paste into (Ctrl/Cmd+V keeps the columns).
  const exportGoogleSheets = async () => {
    const rows = [
      ["Date", "Type", "Category", "Subcategory", "Account", "Amount", "Note"],
      ...transactions
        .slice()
        .sort((x, y) => x.date - y.date)
        .map((t) => [
          new Date(t.date).toLocaleString("en-IN"),
          t.kind,
          catName(t.categoryId),
          t.subcategory ?? "",
          t.accountId ? accounts.find((a) => a._id === t.accountId)?.name ?? "" : "",
          String(t.amount),
          t.note ?? "",
        ]),
    ];
    const tsv = rows.map((r) => r.join("\t")).join("\n");
    try {
      await navigator.clipboard.writeText(tsv);
      window.open("https://sheets.new", "_blank");
    } catch {
      const blob = new Blob([tsv], { type: "text/tab-separated-values" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "balfin-export-for-sheets.tsv";
      a.click();
      URL.revokeObjectURL(a.href);
    }
  };

  return (
    <AppShell title="Manage" subtitle="Categories, accounts and preferences">
      <div className="mb-3 grid grid-cols-3 gap-1 rounded-xl bg-surface-2 p-1">
        {(["categories", "accounts", "preferences"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-lg py-2 text-xs font-medium capitalize transition ${tab === t ? "bg-card text-ink shadow-sm" : "text-ink-soft"}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === "categories" && <CategoriesTab />}
      {tab === "accounts" && <AccountsTab />}
      {tab === "preferences" && (
        <section className="card space-y-4 p-5">
          <h3 className="text-sm font-semibold">Preferences</h3>
          <label className="flex items-center justify-between">
            <span className="text-sm">Currency</span>
            <select
              value={currency}
              onChange={(e) => { setCurrencyPref(e.target.value); setCurrency(e.target.value); }}
              className="rounded-lg border border-line bg-card px-3 py-2 text-sm"
            >
              {Object.entries(CURRENCIES).map(([code, c]) => (
                <option key={code} value={code}>{code} — {c.label}</option>
              ))}
            </select>
          </label>
          <button onClick={toggleTheme} className="flex w-full items-center justify-between rounded-xl bg-surface-2 px-4 py-3 text-sm">
            <span>{theme === "dark" ? "Dark" : "Light"} mode</span>
            {theme === "dark" ? <Moon size={16} /> : <Sun size={16} />}
          </button>
          <label className="flex w-full items-center justify-between rounded-xl bg-surface-2 px-4 py-3 text-sm">
            <span>
              Quick-add in notification tray
              <span className="block text-[11px] text-ink-faint">Persistent silent notification with + Income / − Expense actions</span>
            </span>
            <input
              type="checkbox"
              checked={quickAddTray}
              onChange={(e) => setQuickAddTray(e.target.checked)}
              className="h-5 w-5 accent-[var(--color-primary)]"
            />
          </label>
          <button onClick={exportCsv} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-white">
            <Download size={15} /> Export all data (CSV)
          </button>
          <button onClick={exportGoogleSheets} className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary py-3 text-sm font-semibold text-primary">
            <FileSpreadsheet size={15} /> Send to Google Sheets
          </button>
          <p className="text-center text-[11px] text-ink-faint">
            Sheets: copies the table to your clipboard, opens a new spreadsheet — paste (Ctrl / Cmd + V) and every column lands correctly.
          </p>
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
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
          {(["expense", "income"] as const).map((k) => (
            <button key={k} onClick={() => setType(k)} className={`rounded-lg py-1.5 text-xs font-medium capitalize ${type === k ? "bg-card shadow-sm" : "text-ink-soft"}`}>{k}</button>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={`New ${type} category`} className="flex-1 rounded-xl border border-line bg-card px-3 py-2 text-sm" onKeyDown={(e) => { if (e.key === "Enter" && newName.trim()) { addCategory(newName.trim(), type); setNewName(""); } }} />
          <button onClick={() => { if (newName.trim()) { addCategory(newName.trim(), type); setNewName(""); } }} className="rounded-xl bg-primary px-3 text-white"><Plus size={16} /></button>
        </div>
        {cats.map((c) => (
          <div key={c._id} className="card p-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-primary"><CatIcon name={c.icon} size={14} /></span>
              <input
                value={c.name}
                onChange={(e) => updateCategory(c._id, { name: e.target.value })}
                className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-1 py-0.5 text-sm font-medium hover:border-line focus:border-line"
              />
              <button onClick={() => deleteCategory(c._id)} className="text-ink-faint hover:text-expense" aria-label="Delete category"><Trash2 size={14} /></button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {c.subcategories.map((s, i) => (
                <span key={s.name + i} className="flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 text-xs text-ink-soft">
                  <CatIcon name={s.icon} size={10} />
                  {s.name}
                  <button onClick={() => deleteSub(c._id, i)} className="text-ink-faint hover:text-expense" aria-label="Remove">×</button>
                </span>
              ))}
              <button onClick={() => setSubFor(subFor === c._id ? null : c._id)} className="flex items-center gap-0.5 rounded-full border border-dashed border-line px-2.5 py-1 text-xs text-ink-faint">
                <Plus size={10} /> sub
              </button>
            </div>
            {subFor === c._id && (
              <div className="mt-2 flex gap-2">
                <input value={subName} onChange={(e) => setSubName(e.target.value)} placeholder="Subcategory name" autoFocus className="flex-1 rounded-lg border border-line bg-card px-2.5 py-1.5 text-xs" onKeyDown={(e) => { if (e.key === "Enter" && subName.trim()) { addSub(c._id, subName.trim()); setSubName(""); } }} />
                <button onClick={() => { if (subName.trim()) { addSub(c._id, subName.trim()); setSubName(""); } }} className="rounded-lg bg-primary px-2.5 text-xs text-white">Add</button>
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
        <section className="card p-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2 rounded-xl bg-primary-soft p-3 text-center">
              <p className="text-xs text-primary">Total across all accounts</p>
              <p className="font-display text-2xl font-semibold tabular">{fmtMoney(netTotal)}</p>
            </div>
            {(Object.keys(byType) as Array<keyof typeof byType>).map((t) => (
              <div key={t} className="rounded-xl bg-surface-2 p-2.5 text-center">
                <p className="text-[11px] capitalize text-ink-faint">{t}</p>
                <p className="text-sm font-semibold tabular">{fmtMoney(byType[t], { compact: true })}</p>
              </div>
            ))}
          </div>
        </section>
        <div className="card space-y-2 p-4">
          <h3 className="text-sm font-semibold">Add account</h3>
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-surface-2 p-1">
            {(["savings", "wallet", "investment"] as const).map((t) => (
              <button key={t} onClick={() => setType(t)} className={`rounded-lg py-1.5 text-xs font-medium capitalize ${type === t ? "bg-card shadow-sm" : "text-ink-soft"}`}>{t}</button>
            ))}
          </div>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Account name (e.g. HDFC Salary)" className="w-full rounded-xl border border-line bg-card px-3 py-2 text-sm" />
          {type === "savings" && (
            <input value={bank} onChange={(e) => setBank(e.target.value)} placeholder="Bank name" className="w-full rounded-xl border border-line bg-card px-3 py-2 text-sm" />
          )}
          <input type="number" inputMode="decimal" value={opening} onChange={(e) => setOpening(e.target.value)} placeholder="Opening balance" className="w-full rounded-xl border border-line bg-card px-3 py-2 text-sm" />
          <button
            onClick={() => {
              if (!name.trim()) return;
              addAccount({ name: name.trim(), type, bankName: bank.trim() || undefined, openingBalance: parseFloat(opening) || 0 });
              setName(""); setBank(""); setOpening("");
            }}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white"
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
      <div className="card space-y-2 p-4">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Edit account</h4>
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-surface-2 p-1">
          {(["savings", "wallet", "investment"] as const).map((t) => (
            <button key={t} onClick={() => setType(t)} className={`rounded-lg py-1.5 text-xs font-medium capitalize ${type === t ? "bg-card shadow-sm" : "text-ink-soft"}`}>{t}</button>
          ))}
        </div>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Account name" className="w-full rounded-xl border border-line bg-card px-3 py-2 text-sm" />
        {type === "savings" && (
          <input value={bank} onChange={(e) => setBank(e.target.value)} placeholder="Bank name" className="w-full rounded-xl border border-line bg-card px-3 py-2 text-sm" />
        )}
        <input type="number" inputMode="decimal" value={opening} onChange={(e) => setOpening(e.target.value)} placeholder="Opening balance" className="w-full rounded-xl border border-line bg-card px-3 py-2 text-sm" />
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
            className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            Save changes
          </button>
          <button onClick={onCancel} className="rounded-xl border border-line px-4 py-2.5 text-sm font-medium text-ink-soft">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="card flex items-center gap-3 p-4">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-primary"><Building2 size={15} /></span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{a.name}</p>
        <p className="text-xs text-ink-faint">
          {a.bankName ? `${a.bankName} · ` : ""}{a.type} · opening {fmtMoney(a.openingBalance)}
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold tabular">{fmtMoney(balance)}</p>
      </div>
      <button onClick={onStartEdit} className="text-ink-faint hover:text-primary" aria-label="Edit account"><Pencil size={15} /></button>
      <button onClick={onDelete} className="text-ink-faint hover:text-expense" aria-label="Delete account"><X size={15} /></button>
    </div>
  );
}
