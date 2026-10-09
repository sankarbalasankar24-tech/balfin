import React, { useEffect, useRef, useState } from "react";
import { useFinance } from "./FinanceContext";
import { CatIcon } from "./icons";
import { rememberEntry, useSuggestions, topNotes } from "./suggest";
import { suggestCategory } from "./autocat";
import { X, Delete, Wallet, Check, Clock, Sparkles, ArrowLeftRight, CheckCircle2, Calendar } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  editId?: string | null;
  initialKind?: "expense" | "income" | "transfer";
  variant?: "sheet" | "popup";
}

const fmtLocal = (ms: number) => {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const fmtDisplayTime = (ms: number) => {
  const d = new Date(ms);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
};

export default function QuickEntry({ open, onClose, editId, initialKind, variant = "sheet" }: Props) {
  const { categories, accounts, addTxn, updateTxn, transactions, currency, sheetSync } = useFinance();
  const { noteSuggestions, subSuggestions, refresh: refreshMem } = useSuggestions();
  const editing = editId ? transactions.find((t) => t._id === editId) : undefined;

  const [kind, setKind] = useState<"expense" | "income" | "transfer">("expense");
  const [amount, setAmount] = useState("");
  const [catId, setCatId] = useState<string | null>(null);
  const [toAccountId, setToAccountId] = useState<string | undefined>(undefined);
  const [sub, setSub] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | undefined>(undefined);
  const [note, setNote] = useState("");
  const [aiPick, setAiPick] = useState<{ id: string; confidence: number; source: "history" | "keyword" } | null>(null);
  
  // Instance timestamp auto-captured
  const [instanceTime, setInstanceTime] = useState<number>(Date.now());
  const [customDateStr, setCustomDateStr] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [wasOpen, setWasOpen] = useState(false);
  const acctTouched = useRef(false);

  // Initialize or reset when sheet opens
  useEffect(() => {
    if (open && !wasOpen) {
      setWasOpen(true);
      setSaved(false);
      const now = Date.now();
      setInstanceTime(now);
      setCustomDateStr(fmtLocal(now));
      setShowDatePicker(false);

      if (editId && editing) {
        setKind(editing.kind);
        setAmount(String(editing.amount));
        setCatId(editing.categoryId ?? null);
        setToAccountId(editing.toAccountId);
        setSub(editing.subcategory ?? null);
        setAccountId(editing.accountId);
        setNote(editing.note ?? "");
        setInstanceTime(editing.date);
        setCustomDateStr(fmtLocal(editing.date));
      } else {
        setKind(initialKind ?? "expense");
        setAmount("");
        setCatId(null);
        setToAccountId(undefined);
        setSub(null);
        setNote("");
        setAiPick(null);
        const defAcc = accounts[0]?._id;
        setAccountId(defAcc);
      }
      acctTouched.current = false;
    } else if (!open && wasOpen) {
      setWasOpen(false);
    }
  }, [open, wasOpen, editId, editing, initialKind, accounts]);

  useEffect(() => {
    if (!open || editId || accountId) return;
    if (accounts.length > 0) {
      setAccountId(accounts[0]._id);
    }
  }, [open, editId, accounts, accountId]);

  const cats = categories.filter((c) => c.type === kind);
  const activeCat = cats.find((c) => c._id === catId) ?? null;

  // Auto category suggestion based on note text
  useEffect(() => {
    if (kind === "transfer" || !note.trim()) {
      setAiPick(null);
      return;
    }
    const res = suggestCategory(note, categories, transactions);
    if (res && res.confidence >= 0.5) {
      setAiPick(res);
      if (!catId) setCatId(res.id);
    }
  }, [note, kind, catId, categories]);

  const appendNum = (ch: string) => {
    setAmount((a) => {
      if (ch === "." && a.includes(".")) return a;
      if (a === "0" && ch !== ".") return ch;
      if (a.length >= 8) return a;
      return a + ch;
    });
  };

  const addPreset = (val: number) => {
    setAmount((a) => {
      const cur = parseFloat(a) || 0;
      return String(cur + val);
    });
  };

  const backspace = () => setAmount((a) => (a.length > 1 ? a.slice(0, -1) : ""));

  if (!open) return null;

  const handleSave = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    if (kind !== "transfer" && !catId) return;
    if (kind === "transfer" && (!toAccountId || toAccountId === accountId)) return;

    setSaving(true);
    try {
      const parsed = customDateStr ? new Date(customDateStr).getTime() : instanceTime;
      const ts = Number.isFinite(parsed) ? parsed : instanceTime;

      if (editing) {
        await updateTxn(editing._id, {
          kind,
          amount: amt,
          categoryId: kind === "transfer" ? undefined : catId ?? undefined,
          toAccountId: kind === "transfer" ? toAccountId : undefined,
          subcategory: kind === "transfer" ? undefined : sub ?? undefined,
          accountId,
          note: note.trim() || undefined,
          date: ts,
        });
      } else {
        await addTxn({
          kind,
          amount: amt,
          categoryId: kind === "transfer" ? undefined : catId ?? undefined,
          toAccountId: kind === "transfer" ? toAccountId : undefined,
          subcategory: kind === "transfer" ? undefined : sub ?? undefined,
          accountId,
          note: note.trim() || undefined,
          date: ts,
        });
      }

      rememberEntry({ note: note.trim() || undefined, subcategory: sub ?? undefined });
      refreshMem();
      setSaved(true);
      setTimeout(() => onClose(), 500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-surface-lowest/80 backdrop-blur-sm animate-fade"
        onClick={onClose}
      />
      <section
        className={`animate-sheet relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[28px] border-t border-white/10 bg-surface-low shadow-[0_-8px_36px_rgba(0,0,0,0.7)] sm:max-w-md ${
          variant === "popup" ? "border-primary/20 ring-1 ring-primary/20" : "sm:rounded-[28px] sm:border"
        }`}
      >
        {/* Pull Handle & Auto-Timestamp Header */}
        <div className="flex flex-col items-center pt-2.5 pb-1">
          <div className="h-1.5 w-12 rounded-full bg-white/20 mb-1.5" />
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-surface-2 border border-white/5 text-[11px] text-ink-soft">
            <Clock size={12} className="text-primary-bright" />
            <span>Instance: <b className="text-white">Today at {fmtDisplayTime(instanceTime)}</b></span>
            <button
              onClick={() => setShowDatePicker((p) => !p)}
              className="text-[10px] text-primary underline ml-1 hover:text-primary-bright"
            >
              {showDatePicker ? "Hide" : "Edit"}
            </button>
          </div>
        </div>

        {/* Date / Time picker override if requested */}
        {showDatePicker && (
          <div className="px-5 py-2 bg-surface-2 border-b border-white/5 flex items-center justify-between text-xs animate-fade">
            <span className="text-ink-faint flex items-center gap-1">
              <Calendar size={13} /> Custom Time:
            </span>
            <input
              type="datetime-local"
              value={customDateStr}
              onChange={(e) => {
                setCustomDateStr(e.target.value);
                const p = new Date(e.target.value).getTime();
                if (Number.isFinite(p)) setInstanceTime(p);
              }}
              className="rounded-lg border border-white/10 bg-surface px-2.5 py-1 text-xs text-ink"
            />
          </div>
        )}

        {/* Header: Title + Kind Selector */}
        <div className="flex items-center justify-between px-5 pt-2 pb-2">
          <div>
            <h2 className="text-base font-bold tracking-tight text-white">
              {editing ? "Edit Record" : "Quick Add Entry"}
            </h2>
            <p className="text-[11px] text-ink-faint">
              Auto-timestamps &amp; syncs to Sheets &amp; cloud
            </p>
          </div>

          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-2 text-ink-soft hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        {/* Type Selector (Expense / Income / Transfer) */}
        <div className="px-5 mb-3">
          <div className="grid grid-cols-3 gap-1 rounded-full bg-surface-lowest p-1 border border-white/5">
            {(["expense", "income", "transfer"] as const).map((k) => {
              const active = kind === k;
              return (
                <button
                  key={k}
                  onClick={() => {
                    setKind(k);
                    setCatId(null);
                    setSub(null);
                  }}
                  className={`rounded-full py-1.5 text-xs font-bold capitalize transition-all ${
                    active
                      ? k === "expense"
                        ? "bg-tertiary-deep text-white shadow-sm"
                        : k === "income"
                        ? "bg-primary text-[#003823] shadow-sm"
                        : "bg-secondary-deep text-white shadow-sm"
                      : "text-ink-faint hover:text-ink"
                  }`}
                >
                  {k}
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto px-5 space-y-3.5 pb-3 no-scrollbar">
          {/* Amount Display */}
          <div className="rounded-2xl border border-white/5 bg-surface-lowest p-3.5 text-center">
            <span className="text-xs text-ink-faint font-semibold uppercase tracking-wider block mb-0.5">
              {kind === "transfer" ? "Transfer Amount" : `${kind} Amount`}
            </span>
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-2xl font-bold text-ink-soft">{currency === "INR" ? "₹" : "$"}</span>
              <span className="text-4xl font-extrabold tabular-nums tracking-tight text-white">
                {amount || "0"}
              </span>
            </div>

            {/* Quick Presets */}
            <div className="mt-2.5 flex items-center justify-center gap-1.5">
              {[50, 100, 500, 1000].map((val) => (
                <button
                  key={val}
                  onClick={() => addPreset(val)}
                  className="rounded-full border border-white/10 bg-surface-2 px-2.5 py-1 text-[11px] font-semibold text-ink-soft hover:text-white hover:border-primary/40 active:scale-95 transition"
                >
                  +{val}
                </button>
              ))}
              <button
                onClick={() => setAmount("")}
                className="rounded-full border border-white/10 bg-surface-2 px-2.5 py-1 text-[11px] font-semibold text-tertiary hover:bg-tertiary-deep/20 active:scale-95 transition"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Account & Note */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold text-ink-faint uppercase block mb-1">
                {kind === "transfer" ? "From Account" : "Account"}
              </label>
              <select
                value={accountId}
                onChange={(e) => {
                  acctTouched.current = true;
                  setAccountId(e.target.value);
                }}
                className="w-full rounded-xl border border-white/10 bg-surface-lowest px-3 py-2 text-xs font-medium text-ink"
              >
                {accounts.map((a) => (
                  <option key={a._id} value={a._id}>
                    {a.name} ({a.type})
                  </option>
                ))}
              </select>
            </div>

            {kind === "transfer" ? (
              <div>
                <label className="text-[10px] font-bold text-ink-faint uppercase block mb-1">
                  To Account
                </label>
                <select
                  value={toAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-surface-lowest px-3 py-2 text-xs font-medium text-ink"
                >
                  <option value="">Select destination...</option>
                  {accounts
                    .filter((a) => a._id !== accountId)
                    .map((a) => (
                      <option key={a._id} value={a._id}>
                        {a.name}
                      </option>
                    ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="text-[10px] font-bold text-ink-faint uppercase block mb-1">
                  Note / Merchant
                </label>
                <input
                  type="text"
                  placeholder="e.g. Swiggy, Uber, Rent"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-surface-lowest px-3 py-2 text-xs text-ink placeholder:text-ink-faint/50"
                />
              </div>
            )}
          </div>

          {/* Category Selector (for non-transfer) */}
          {kind !== "transfer" && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-bold text-ink-faint uppercase">
                  Category {aiPick && <span className="text-primary-bright font-normal normal-case">(suggested by note)</span>}
                </label>
              </div>

              {/* Category chips */}
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto no-scrollbar p-0.5">
                {cats.map((c) => {
                  const active = catId === c._id;
                  return (
                    <button
                      key={c._id}
                      onClick={() => {
                        setCatId(c._id);
                        setSub(null);
                      }}
                      className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition active:scale-95 ${
                        active
                          ? "border-primary bg-primary/20 text-primary-bright"
                          : "border-white/5 bg-surface-lowest text-ink-soft hover:border-white/15"
                      }`}
                    >
                      <CatIcon name={c.icon} size={14} />
                      <span>{c.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Subcategories if category selected */}
              {activeCat && activeCat.subcategories.length > 0 && (
                <div className="mt-2 rounded-xl bg-surface-2 p-2">
                  <p className="text-[10px] font-bold text-ink-faint uppercase mb-1">
                    Subcategory (Optional)
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {activeCat.subcategories.map((sc) => {
                      const active = sub === sc.name;
                      return (
                        <button
                          key={sc.name}
                          onClick={() => setSub(active ? null : sc.name)}
                          className={`rounded-lg px-2 py-0.5 text-[11px] font-medium transition ${
                            active
                              ? "bg-primary text-[#003823] font-bold"
                              : "bg-surface text-ink-soft hover:text-white"
                          }`}
                        >
                          {sc.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quick Keypad */}
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0"].map((btn) => (
              <button
                key={btn}
                onClick={() => appendNum(btn)}
                className="flex h-11 items-center justify-center rounded-xl border border-white/5 bg-surface-lowest text-base font-bold text-white shadow-sm active:scale-95 hover:bg-card-high transition"
              >
                {btn}
              </button>
            ))}
            <button
              onClick={backspace}
              className="flex h-11 items-center justify-center rounded-xl border border-white/5 bg-surface-lowest text-ink-soft active:scale-95 hover:text-white transition"
            >
              <Delete size={18} />
            </button>
          </div>
        </div>

        {/* Footer: Save Button */}
        <div className="border-t border-white/10 bg-surface-low p-4">
          <button
            onClick={handleSave}
            disabled={saving || !amount || parseFloat(amount) <= 0 || (kind !== "transfer" && !catId)}
            className={`w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold shadow-lg transition active:scale-98 disabled:opacity-40 ${
              saved
                ? "bg-primary text-[#003823]"
                : kind === "expense"
                ? "bg-primary text-[#003823] shadow-primary/25"
                : "bg-primary text-[#003823] shadow-primary/25"
            }`}
          >
            {saved ? (
              <>
                <CheckCircle2 size={18} /> Saved &amp; Synced!
              </>
            ) : saving ? (
              "Saving & Syncing..."
            ) : (
              <>
                <Check size={18} />
                <span>
                  {editing
                    ? "Update Record"
                    : `Save ${currency === "INR" ? "₹" : "$"}${amount || "0"} & Sync`}
                </span>
              </>
            )}
          </button>

          <p className="mt-2 text-center text-[10px] text-ink-faint flex items-center justify-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            {sheetSync?.endpoint ? "Auto-syncs to Google Sheets & ledger" : "Saved to local ledger (connect Sheets in Manage)"}
          </p>
        </div>
      </section>
    </div>
  );
}
