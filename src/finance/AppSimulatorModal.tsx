import React, { useState } from "react";
import { X, Heart, MessageCircle, Send, Bookmark, MoreHorizontal, ArrowLeft, CheckCircle2, RefreshCw } from "lucide-react";
import QuickEntry from "./QuickEntry";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function AppSimulatorModal({ open, onClose }: Props) {
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-6 animate-fade">
      <div className="relative flex flex-col h-[90vh] max-h-[820px] w-full max-w-[420px] rounded-[42px] border-[6px] border-[#222a3d] bg-black shadow-2xl overflow-hidden ring-1 ring-white/10">
        {/* Phone Notch / Dynamic Island */}
        <div className="absolute top-0 left-0 right-0 h-7 z-30 flex items-center justify-between px-6 text-[10px] text-white font-medium">
          <span>9:41</span>
          <div className="h-4 w-24 bg-black rounded-full border border-white/10 mx-auto" />
          <span className="flex items-center gap-1">5G 100%</span>
        </div>

        {/* Top Header / Instagram-style bar */}
        <div className="pt-7 px-4 py-2.5 flex items-center justify-between border-b border-white/10 bg-black text-white z-20">
          <div className="flex items-center gap-2">
            <span className="font-serif italic font-bold text-lg tracking-tight">Instagram</span>
            <span className="text-[10px] bg-white/15 px-1.5 py-0.5 rounded text-white/70">External App</span>
          </div>
          <button
            onClick={onClose}
            className="flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white hover:bg-white/25 transition"
          >
            <X size={13} /> Exit Demo
          </button>
        </div>

        {/* Simulated External App Feed (Instagram post) */}
        <div className="flex-1 overflow-y-auto no-scrollbar bg-black text-white p-3 space-y-4">
          <div className="rounded-2xl border border-white/10 bg-[#121212] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-3">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-yellow-500 to-purple-600 p-[1.5px]">
                  <div className="h-full w-full rounded-full bg-black flex items-center justify-center text-[10px] font-bold">
                    BF
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold leading-none">cafe_delight_mumbai</p>
                  <p className="text-[10px] text-white/50 leading-none mt-0.5">Bandra West • Sponsored</p>
                </div>
              </div>
              <MoreHorizontal size={16} className="text-white/60" />
            </div>

            {/* Photo */}
            <div className="h-56 bg-gradient-to-br from-amber-800/40 via-stone-800 to-zinc-900 flex flex-col items-center justify-center p-4 text-center">
              <span className="text-3xl mb-1">☕ 🥐</span>
              <p className="text-sm font-bold text-amber-200">Artisan Flat White &amp; Butter Croissant</p>
              <p className="text-xs text-white/70 mt-1">₹340 • Ordered just now</p>
            </div>

            {/* Actions */}
            <div className="p-3 space-y-2">
              <div className="flex items-center justify-between text-white">
                <div className="flex items-center gap-3">
                  <Heart size={20} className="text-rose-500 fill-rose-500" />
                  <MessageCircle size={20} />
                  <Send size={20} />
                </div>
                <Bookmark size={20} />
              </div>
              <p className="text-xs font-semibold">1,248 likes</p>
              <p className="text-[11px] text-white/80">
                <span className="font-bold">cafe_delight_mumbai</span> Morning routine at its finest. Fresh brews roasted daily.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#121212] p-4 text-xs space-y-2">
            <p className="font-bold text-primary flex items-center gap-1.5">
              <RefreshCw size={14} /> BalFin Floating Quick-Add Feature
            </p>
            <p className="text-white/70 leading-relaxed text-[11px]">
              Notice the mint floating bubble pinned to the right edge! You don't have to switch out of Instagram or launch BalFin:
            </p>
            <div className="bg-white/5 p-2.5 rounded-xl space-y-1 text-[11px]">
              <p className="text-white/90">1. Tap the green bubble on the right.</p>
              <p className="text-white/90">2. It opens the instant Quick Entry sheet right here.</p>
              <p className="text-white/90">3. Captures the exact auto-timestamp of right now.</p>
              <p className="text-white/90">4. Saves to ledger &amp; syncs to your Google Sheet in the background!</p>
            </div>
          </div>
        </div>

        {/* Floating Bubble over this app */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 z-40">
          <button
            onClick={() => setQuickAddOpen(true)}
            className="group relative flex h-14 w-14 items-center justify-center rounded-full border-2 border-primary-bright bg-gradient-to-br from-primary via-primary-bright to-[#009b68] text-[#003823] shadow-[0_8px_25px_rgba(0,200,136,0.6)] active:scale-95 transition"
            title="Tap BalFin Bubble to quick-log"
          >
            <span className="text-xl font-bold">+</span>
            <span className="absolute -inset-1 -z-10 animate-ping rounded-full bg-primary/30" />
            <span className="absolute -top-6 -left-12 bg-primary text-[#003823] text-[9px] font-extrabold px-1.5 py-0.5 rounded shadow">
              Tap me!
            </span>
          </button>
        </div>

        {/* Success notification banner over the app */}
        {toast && (
          <div className="absolute top-12 left-4 right-4 z-40 flex items-center gap-2 rounded-2xl border border-primary/40 bg-surface-lowest/95 p-3 text-xs text-ink shadow-2xl backdrop-blur-xl animate-fade">
            <CheckCircle2 size={18} className="text-primary-bright flex-shrink-0" />
            <div className="flex-1">
              <p className="font-bold text-primary-bright">Entry Logged &amp; Synced!</p>
              <p className="text-[11px] text-ink-faint">{toast}</p>
            </div>
            <button onClick={() => setToast(null)} className="text-ink-faint p-1">
              <X size={12} />
            </button>
          </div>
        )}

        {/* The QuickEntry popup rendered on top of the external app */}
        {quickAddOpen && (
          <div className="absolute inset-0 z-50">
            <QuickEntry
              open={quickAddOpen}
              variant="popup"
              onClose={() => {
                setQuickAddOpen(false);
                setToast("Saved to BalFin ledger and Google Sheets with auto timestamp.");
                setTimeout(() => setToast(null), 4000);
              }}
            />
          </div>
        )}

        {/* Android bottom nav pill */}
        <div className="h-5 bg-black flex items-center justify-center pb-1">
          <div className="h-1 w-28 bg-white/40 rounded-full" />
        </div>
      </div>
    </div>
  );
}
