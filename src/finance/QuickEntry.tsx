import React, { useEffect, useRef, useState } from "react";
import { useFinance } from "./FinanceContext";
import { CatIcon } from "./icons";
import { rememberEntry, useSuggestions, topNotes } from "./suggest";
import { X, Delete, Wallet, Check, Clock } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  editId?: string | null;
  initialKind?: "expense" | "income";
  /** Popup variant renders denser for the gesture overlay window */
  variant?: "sheet" | "popup";
}

const CAT_TINTS = [
  "text-tertiary-deep",
  "text-secondary",
  "text-primary-bright",
  "text-error",
  "text-secondary-deep",
  "text-primary-fixed",
  "text-tertiary",
];

/** Format a timestamp as a local `datetime-local` value (YYYY-MM-DDTHH:mm). */
const fmtLocal = (ms: number) => {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function QuickEntry({ open, onClose, editId, initialKind, variant = "sheet" }: Props) {
  const { categories, accounts, addTxn, updateTxn, transactions } = useFinance();
  const { noteSuggestions, subSuggestions, refresh: refreshMem } = useSuggestions();
  const editing = editId ? transactions.find((t) => t._id === editId) : undefined;

  const [kind, setKind] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [catId, setCatId] = useState<string | null>(null);
  const [sub, setSub] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | undefined>(undefined);
  const [note, setNote] = useState("");
  const [dateStr, setDateStr] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [wasOpen, setWasOpen] = useState(false);
  const acctTouched = useRef(false);

  if (open && !wasOpen) {
    setWasOpen(true);
    setSaved(false);
    if (editId && editing) {
      setKind(editing.kind);
      setAmount(String(editing.amount));
      setCatId(editing.categoryId);
      setSub(editing.subcategory ?? null);
      setAccountId(editing.accountId);
      setNote(editing.note ?? "");
      setDateStr(fmtLocal(editing.date));
    } else {
      setKind(initialKind ?? "expense");
      setAmount("");
      setCatId(null);
      setSub(null);
      setNote("");
      setDateStr(fmtLocal(Date.now()));
      // Default account: Gpay if it exists, else the first account.
      const gpay = accounts.find((a) => /gpay/i.test(a.name));
      setAccountId(gpay?._id ?? accounts[0]?._id);
    }
    acctTouched.current = false;
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  // Accounts may still be loading when the sheet opens (e.g. the gesture
  // popup webview) — pick the default once they arrive.
  useEffect(() => {
    if (!open || editId) return;
    if (acctTouched.current || accountId) return;
    const gpay = accounts.find((a) => /gpay/i.test(a.name));
    const def = gpay?._id ?? accounts[0]?._id;
    if (def) setAccountId(def);
  }, [open, editId, accounts, accountId]);

  const cats = categories.filter((c) => c.type === kind);
  const activeCat = cats.find((c) => c._id === catId) ?? null;
  const noteHits = note ? noteSuggestions(note) : topNotes(4);
  const subHits = subSuggestions("");

  const appendNum = (ch: string) => {
    setAmount((a) => {
      if (ch === "." && a.includes(".")) return a;
      if (a === "0" && ch !== ".") return ch;
      if (a.length >= 9) return a;
      return a + ch;
    });
  };
  const backspace = () => setAmount((a) => (a.length > 1 ? a.slice(0, -1) : ""));

  if (!open) return null;

  const save = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0 || !catId) return;
    setSaving(true);
    try {
      const parsed = dateStr ? new Date(dateStr).getTime() : NaN;
      const ts = Number.isFinite(parsed) ? parsed : editing ? editing.date : Date.now();
      if (editing) {
        await updateTxn(editing._id, {
          kind,
          amount: amt,
          categoryId: catId,
          subcategory: sub ?? undefined,
          accountId,
          note: note.trim() || undefined,
          date: ts,
        });
      } else {
        await addTxn({
          kind,
          amount: amt,
          categoryId: catId,
          subcategory: sub ?? undefined,
          accountId,
          note: note.trim() || undefined,
          date: ts,
        });
      }
      rememberEntry({ note: note.trim() || undefined, subcategory: sub ?? undefined });
      refreshMem();
      setSaved(true);
      setTimeout(() => onClose(), 650);
    } finally {
      setSaving(false);
    }
  };

  const acct = accounts.find((a) => a._id === accountId);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-surface-lowest/80 backdrop-blur-sm animate-fade" onClick={onClose} />
      <section
        className={`animate-sheet relative flex max-h-[94vh] w-full flex-col overflow-hidden rounded-t-3xl border-t border-white/10 bg-surface-low shadow-[0_-8px_36px_rgba(0,0,0,0.65)] sm:max-w-md ${variant === "popup" ? "" : "sm:rounded-3xl sm:border"}`}
      >
        {/* pull handle */}
        <div className="flex flex-col items-center pb-1 pt-3">
          <div className="mb-1 h-1.5 w-12 rounded-full bg-white/20" />
          <span className="flex items-center gap-1.5 rounded-full border border-primary/20 bg-surface-lowest px-3 py-0.5 text-[10px] text-ink-faint">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
            Synced to cloud &amp; Sheets
          </span>
        </div>

        {/* header: title + kind toggle */}
        <div className="flex items-center justify-between px-5 pb-3 pt-2">
          <div>
            <h1 className="text-lg font-bold tracking-tight">{editing ? "Edit entry" : "Quick Entry"}</h1>
            <p className="text-xs text-ink-faint">{editing ? "Update this record" : "Tap to record instantly"}</p>
          </div>
          <div className="inline-flex rounded-full border border-white/10 bg-surface-lowest p-1">
            {(["expense", "income"] as const).map((k) => (
              <button
                key={k}
                onClick={() => {
                  setKind(k);
                  setCatId(null);
                  setSub(null);
                }}
                className={`rounded-full px-3 py-1 text-xs font-semibold capitalize transition ${
                  kind === k ? "bg-primary text-[#003823]" : "text-ink-faint"
                }`}
              >
                {k}
              </button>
            ))}
          </div>
        </div>

        <div className="no-scrollbar flex-1 space-y-3 overflow-y-auto px-5 pb-2">
          {/* amount card */}
          <div className="rounded-2xl border border-white/5 bg-card p-4">
            <div className="mb-1 flex w-full items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-ink-faint">Amount</span>
              <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-card-high px-2.5 py-1 text-xs">
                <Wallet size={13} className="text-secondary" />
                <span className="max-w-28 truncate">{acct ? acct.name : "No account"}</span>
              </div>
            </div>
            <div className="flex items-baseline justify-center py-1">
              <span className="mr-1 text-2xl font-bold text-ink-faint">₹</span>
              <span className={`text-4xl font-extrabold tabular tracking-tight ${amount ? "text-primary-bright" : "text-ink-faint"}`}>
                {amount || "0"}
              </span>
              <span className="ml-1 inline-block h-8 w-0.5 animate-pulse rounded-full bg-primary-bright" />
            </div>
            {/* note with autosuggest */}
            <div className="mt-2 flex items-center gap-2 border-t border-white/10 px-1 pt-2">
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add note or tags…"
                className="w-full bg-transparent text-sm outline-none placeholder:text-ink-faint"
              />
            </div>
            {noteHits.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {noteHits.map((n) => (
                  <button
                    key={n}
                    onClick={() => setNote(n)}
                    className="rounded-full bg-card-high px-2.5 py-1 text-[11px] text-ink-soft active:scale-95"
                  >
                    {n}
                  </button>
                ))}
              </div>
            )}
            {/* date & time — defaults to right now, editable */}
            <div className="mt-2 flex items-center gap-2 border-t border-white/10 px-1 pt-2">
              <Clock size={13} className="flex-shrink-0 text-secondary" />
              <input
                type="datetime-local"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                aria-label="Date and time"
                className="w-full bg-transparent text-sm text-ink-soft outline-none [color-scheme:dark]"
              />
            </div>
          </div>

          {/* category capsules */}
          <div>
            <p className="mb-1.5 px-0.5 text-[10px] font-semibold uppercase tracking-widest text-ink-faint">
              Select category
            </p>
            <div className="no-scrollbar flex items-center gap-2 overflow-x-auto py-1">
              {cats.map((c, i) => (
                <button
                  key={c._id}
                  onClick={() => {
                    setCatId(c._id === catId ? null : c._id);
                    setSub(null);
                  }}
                  className={`flex flex-shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition active:scale-95 ${
                    catId === c._id
                      ? "bg-primary text-[#003823] shadow-[0_4px_12px_rgba(0,200,136,0.3)]"
                      : "border border-white/10 bg-card text-ink"
                  }`}
                >
                  <span className={catId === c._id ? "" : CAT_TINTS[i % CAT_TINTS.length]}>
                    <CatIcon name={c.icon} size={15} />
                  </span>
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* subcategory capsules + suggestions */}
          {(activeCat || subHits.length > 0) && (
            <div>
              <p className="mb-1.5 px-0.5 text-[10px] font-semibold uppercase tracking-widest text-ink-faint">
                Subcategory
              </p>
              <div className="no-scrollbar flex flex-wrap items-center gap-2 py-1">
                {activeCat?.subcategories.map((s) => (
                  <button
                    key={s.name}
                    onClick={() => setSub(sub === s.name ? null : s.name)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition active:scale-95 ${
                      sub === s.name ? "bg-secondary-deep text-white" : "border border-white/10 bg-card text-ink-soft"
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
                {subHits
                  .filter((h) => !activeCat?.subcategories.some((s) => s.name === h))
                  .slice(0, 3)
                  .map((h) => (
                    <button
                      key={h}
                      onClick={() => setSub(h)}
                      className={`rounded-full border border-dashed px-3 py-1.5 text-xs transition active:scale-95 ${
                        sub === h ? "border-secondary-deep bg-secondary-deep text-white" : "border-white/20 text-ink-faint"
                      }`}
                    >
                      {h}
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* account capsules */}
          {accounts.length > 0 && (
            <div>
              <p className="mb-1.5 px-0.5 text-[10px] font-semibold uppercase tracking-widest text-ink-faint">Account</p>
              <div className="no-scrollbar flex items-center gap-2 overflow-x-auto py-1">
                <button
                  onClick={() => {
                    acctTouched.current = true;
                    setAccountId(undefined);
                  }}
                  className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition active:scale-95 ${
                    !accountId ? "bg-primary text-[#003823]" : "border border-white/10 bg-card text-ink-soft"
                  }`}
                >
                  None
                </button>
                {accounts.map((a) => (
                  <button
                    key={a._id}
                    onClick={() => {
                      acctTouched.current = true;
                      setAccountId(a._id);
                    }}
                    className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition active:scale-95 ${
                      accountId === a._id ? "bg-primary text-[#003823]" : "border border-white/10 bg-card text-ink-soft"
                    }`}
                  >
                    {a.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* tactile numpad */}
          <div className="grid grid-cols-3 gap-2 pb-1 pt-1">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0"].map((d) => (
              <button
                key={d}
                onClick={() => appendNum(d)}
                className="flex h-12 items-center justify-center rounded-xl bg-card text-xl font-semibold active:scale-[0.96] active:bg-surface-bright"
              >
                {d}
              </button>
            ))}
            <button
              onClick={backspace}
              aria-label="Backspace"
              className="flex h-12 items-center justify-center rounded-xl bg-card active:scale-[0.96] active:bg-surface-bright"
            >
              <Delete size={22} />
            </button>
          </div>
        </div>

        {/* footer */}
        <div className="flex flex-col gap-2 border-t border-white/10 bg-surface-low px-5 pb-6 pt-2">
          <button
            disabled={!amount || !catId || saving || saved}
            onClick={save}
            className={`flex h-12 w-full items-center justify-center gap-2 rounded-full text-sm font-bold shadow-[0_8px_24px_-4px_rgba(0,200,136,0.35)] transition active:scale-[0.98] disabled:opacity-40 ${
              saved ? "bg-primary-bright text-[#002113]" : "bg-primary text-[#003823]"
            }`}
          >
            {saved ? <Check size={18} /> : <X size={0} className="hidden" />}
            {saved ? "Entry logged!" : editing ? "Save changes" : `Save ${kind}`}
          </button>
        </div>
      </section>
    </div>
  );
}
