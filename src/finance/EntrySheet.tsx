import React, { useState } from "react";
import { useFinance } from "./FinanceContext";
import { CatIcon } from "./icons";
import { fmtDateTime } from "./format";
import { Plus, Camera, X, Pencil } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  editId?: string | null;
  initialKind?: "expense" | "income";
}

export default function EntrySheet({ open, onClose, editId, initialKind }: Props) {
  const { categories, accounts, addTxn, updateTxn, transactions } = useFinance();
  const editing = editId ? transactions.find((t) => t._id === editId) : undefined;

  const [kind, setKind] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [catId, setCatId] = useState<string | null>(null);
  const [sub, setSub] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | undefined>(undefined);
  const [date, setDate] = useState(() => {
    const n = new Date();
    const pad = (x: number) => String(x).padStart(2, "0");
    return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}T${pad(n.getHours())}:${pad(n.getMinutes())}`;
  });
  const [note, setNote] = useState("");
  const [bill, setBill] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  // reset when opened fresh
  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen) {
    setWasOpen(true);
    if (editId && editing) {
      // existing branch below
      setKind(editing.kind);
      setAmount(String(editing.amount));
      setCatId(editing.categoryId);
      setSub(editing.subcategory ?? null);
      setAccountId(editing.accountId);
      const d = new Date(editing.date);
      const pad = (x: number) => String(x).padStart(2, "0");
      setDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
      setNote(editing.note ?? "");
    } else {
      setKind(initialKind ?? "expense");
      setAmount("");
      setCatId(null);
      setSub(null);
      setNote("");
      setBill(null);
    }
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  const cats = categories.filter((c) => c.type === kind);
  const activeCat = cats.find((c) => c._id === catId) ?? null;

  if (!open) return null;

  const save = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0 || !catId) return;
    setSaving(true);
    try {
      const ms = new Date(date).getTime();
      if (editing) {
        await updateTxn(editing._id, {
          kind,
          amount: amt,
          categoryId: catId,
          subcategory: sub ?? undefined,
          accountId,
          note: note.trim() || undefined,
          date: ms,
        });
      } else {
        await addTxn(
          {
            kind,
            amount: amt,
            categoryId: catId,
            subcategory: sub ?? undefined,
            accountId,
            note: note.trim() || undefined,
            date: ms,
          },
          bill
        );
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const quickAmts = kind === "expense" ? [100, 250, 500, 1000] : [5000, 10000, 25000];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/40 animate-fade" onClick={onClose} />
      <div className="card animate-sheet relative w-full sm:max-w-md rounded-b-none sm:rounded-2xl max-h-[92vh] overflow-y-auto p-5 pb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold">
            {editing ? "Edit entry" : "Quick add"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-surface-2"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* kind toggle */}
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1 mb-4">
          {(["expense", "income"] as const).map((k) => (
            <button
              key={k}
              onClick={() => {
                setKind(k);
                setCatId(null);
                setSub(null);
              }}
              className={`rounded-lg py-2 text-sm font-medium capitalize transition ${
                kind === k
                  ? k === "expense"
                    ? "bg-expense text-white"
                    : "bg-income text-white"
                  : "text-ink-soft"
              }`}
            >
              {k}
            </button>
          ))}
        </div>

        {/* amount keypad-style entry */}
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-2xl font-semibold text-ink-faint">₹</span>
          <input
            inputMode="decimal"
            type="number"
            autoFocus
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-transparent text-4xl font-semibold tabular outline-none placeholder:text-ink-faint/50"
          />
        </div>
        <div className="flex gap-1.5 mb-4">
          {quickAmts.map((q) => (
            <button
              key={q}
              onClick={() => setAmount(String((parseFloat(amount) || 0) + q))}
              className="flex-1 rounded-lg bg-surface-2 py-1.5 text-xs font-medium text-ink-soft active:bg-primary-soft"
            >
              +{q.toLocaleString("en-IN")}
            </button>
          ))}
        </div>

        {/* category chips */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {cats.map((c) => (
            <button
              key={c._id}
              onClick={() => {
                setCatId(c._id === catId ? null : c._id);
                setSub(null);
              }}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                catId === c._id
                  ? "border-primary bg-primary-soft text-primary"
                  : "border-line bg-card text-ink-soft"
              }`}
            >
              <CatIcon name={c.icon} size={13} />
              {c.name}
            </button>
          ))}
        </div>

        {/* subcategory chips */}
        {activeCat && activeCat.subcategories.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {activeCat.subcategories.map((s) => (
              <button
                key={s.name}
                onClick={() => setSub(sub === s.name ? null : s.name)}
                className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs transition ${
                  sub === s.name
                    ? "bg-primary text-white"
                    : "bg-surface-2 text-ink-soft"
                }`}
              >
                <CatIcon name={s.icon} size={11} />
                {s.name}
              </button>
            ))}
          </div>
        )}

        {/* account picker */}
        {accounts.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            <button
              onClick={() => setAccountId(undefined)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                !accountId ? "bg-primary text-white" : "bg-surface-2 text-ink-soft"
              }`}
            >
              No account
            </button>
            {accounts.map((a) => (
              <button
                key={a._id}
                onClick={() => setAccountId(a._id)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                  accountId === a._id
                    ? "bg-primary text-white"
                    : "bg-surface-2 text-ink-soft"
                }`}
              >
                {a.name}
              </button>
            ))}
          </div>
        )}

        {/* date + note */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <input
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-xl border border-line bg-card px-3 py-2 text-sm"
          />
          <input
            placeholder="Note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="rounded-xl border border-line bg-card px-3 py-2 text-sm"
          />
        </div>

        {/* bill photo */}
        {!editing && (
          <label className="mb-4 flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-line px-3 py-2.5 text-sm text-ink-soft">
            {bill ? (
              <>
                <Pencil size={14} />
                <span className="truncate">{bill.name}</span>
                <X
                  size={14}
                  className="ml-auto"
                  onClick={(e: React.MouseEvent) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setBill(null);
                  }}
                />
              </>
            ) : (
              <>
                <Camera size={14} /> Attach bill photo (optional)
              </>
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setBill(e.target.files?.[0] ?? null)}
            />
          </label>
        )}

        <button
          disabled={!amount || !catId || saving}
          onClick={save}
          className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white disabled:opacity-40 flex items-center justify-center gap-2"
        >
          <Plus size={16} />
          {editing ? "Save changes" : "Add"} {kind}
        </button>
        <p className="mt-2 text-center text-[11px] text-ink-faint">
          {editing ? fmtDateTime(editing.date) : "Syncs instantly to your private database"}
        </p>
      </div>
    </div>
  );
}
