import React, { useState, useRef, useEffect } from "react";
import { Plus, X, Smartphone, Sparkles, Move } from "lucide-react";

interface Props {
  onOpenQuickAdd: (kind?: "expense" | "income") => void;
  onOpenSimulator: () => void;
  isSimulating: boolean;
}

export default function FloatingQuickBubble({ onOpenQuickAdd, onOpenSimulator, isSimulating }: Props) {
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem("balfin.bubble_pos");
      if (saved) return JSON.parse(saved);
    } catch {}
    return { x: window.innerWidth - 68, y: window.innerHeight - 170 };
  });

  const [isDragging, setIsDragging] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; mouseStartX: number; mouseStartY: number }>({
    startX: 0,
    startY: 0,
    mouseStartX: 0,
    mouseStartY: 0,
  });
  const hasMovedRef = useRef(false);

  // Keep within bounds on window resize
  useEffect(() => {
    const handleResize = () => {
      setPos((prev) => ({
        x: Math.min(window.innerWidth - 64, Math.max(8, prev.x)),
        y: Math.min(window.innerHeight - 80, Math.max(60, prev.y)),
      }));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    hasMovedRef.current = false;
    dragStartRef.current = {
      startX: pos.x,
      startY: pos.y,
      mouseStartX: e.clientX,
      mouseStartY: e.clientY,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.mouseStartX;
    const dy = e.clientY - dragStartRef.current.mouseStartY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      hasMovedRef.current = true;
    }
    const newX = Math.min(window.innerWidth - 60, Math.max(8, dragStartRef.current.startX + dx));
    const newY = Math.min(window.innerHeight - 70, Math.max(60, dragStartRef.current.startY + dy));
    setPos({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    // Snap horizontally to nearest edge for neat mobile look
    const snapThreshold = window.innerWidth / 2;
    const finalX = pos.x < snapThreshold ? 12 : window.innerWidth - 68;
    setPos((prev) => {
      const next = { ...prev, x: finalX };
      localStorage.setItem("balfin.bubble_pos", JSON.stringify(next));
      return next;
    });

    // If it was just a tap (no drag), toggle menu or trigger quick add
    if (!hasMovedRef.current) {
      setMenuOpen((prev) => !prev);
    }
  };

  return (
    <div
      className="fixed z-50 transition-[transform,shadow] select-none"
      style={{
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        touchAction: "none",
      }}
    >
      {/* Expanded quick actions menu on bubble tap */}
      {menuOpen && (
        <div
          className={`absolute bottom-16 ${
            pos.x < window.innerWidth / 2 ? "left-0" : "right-0"
          } w-52 rounded-2xl border border-white/10 bg-surface-low/95 p-2 shadow-2xl backdrop-blur-xl animate-tab text-ink space-y-1.5`}
        >
          <div className="flex items-center justify-between px-2 pt-1 pb-1.5 border-b border-white/5">
            <span className="text-[11px] font-bold text-primary-bright uppercase tracking-wider flex items-center gap-1">
              <Sparkles size={12} /> Quick Floating Add
            </span>
            <button
              onClick={() => setMenuOpen(false)}
              className="text-ink-faint hover:text-ink p-0.5 rounded-full"
            >
              <X size={13} />
            </button>
          </div>

          <button
            onClick={() => {
              setMenuOpen(false);
              onOpenQuickAdd("expense");
            }}
            className="w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold bg-tertiary-deep/15 text-tertiary hover:bg-tertiary-deep/25 transition active:scale-98"
          >
            <span>- Add Expense</span>
            <span className="text-[10px] bg-tertiary/20 px-1.5 py-0.5 rounded">Tap</span>
          </button>

          <button
            onClick={() => {
              setMenuOpen(false);
              onOpenQuickAdd("income");
            }}
            className="w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold bg-primary/15 text-primary-bright hover:bg-primary/25 transition active:scale-98"
          >
            <span>+ Add Income</span>
            <span className="text-[10px] bg-primary/20 px-1.5 py-0.5 rounded">Tap</span>
          </button>

          <button
            onClick={() => {
              setMenuOpen(false);
              onOpenSimulator();
            }}
            className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-ink-soft bg-surface-2 hover:bg-card-high transition"
          >
            <Smartphone size={13} className="text-secondary" />
            <span>{isSimulating ? "Exit App Simulator" : "Simulate Over Any App"}</span>
          </button>
        </div>
      )}

      {/* The Floating Bubble Avatar */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className={`group relative flex h-14 w-14 cursor-grab items-center justify-center rounded-full border border-primary/50 bg-gradient-to-br from-primary via-primary-bright to-[#009b68] text-[#003823] shadow-[0_8px_28px_rgba(0,200,136,0.5)] transition active:scale-95 active:cursor-grabbing ${
          isDragging ? "scale-105 shadow-[0_12px_36px_rgba(0,200,136,0.65)] ring-4 ring-primary/30" : ""
        }`}
        title="BalFin Floating Quick Add Bubble (Tap to open, drag to move)"
      >
        <Plus size={24} strokeWidth={2.6} className="transition group-hover:rotate-90 duration-200" />

        {/* Pulsing beacon glow */}
        <span className="absolute -inset-1 -z-10 animate-ping rounded-full bg-primary/25 opacity-75" />

        {/* Small drag handle badge */}
        <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-surface-lowest text-[8px] text-ink-soft border border-white/10">
          <Move size={8} />
        </span>
      </div>
    </div>
  );
}
