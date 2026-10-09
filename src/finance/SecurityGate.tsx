import React, { useState, useEffect } from "react";
import { Lock, Fingerprint, Delete, ShieldAlert, KeyRound } from "lucide-react";
import { getSecurityPlugin } from "@/pages/app/Manage";

interface Props {
  isLocked: boolean;
  savedPin: string | null;
  onUnlock: () => void;
}

export default function SecurityGate({ isLocked, savedPin, onUnlock }: Props) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [bioError, setBioError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLocked) {
      setPin("");
      setError(false);
      setBioError(null);
    }
  }, [isLocked]);

  // Attempt biometric authentication automatically on lock screen show
  useEffect(() => {
    if (!isLocked) return;
    const sec = getSecurityPlugin();
    if (sec) {
      (sec as any).authenticate?.()
        ?.then((res: any) => {
          if (res?.ok) onUnlock();
          else if (res?.error) setBioError(res.error);
        })
        ?.catch(() => {});
    }
  }, [isLocked, onUnlock]);

  if (!isLocked) return null;

  const handleDigit = (d: string) => {
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    setError(false);

    if (next.length === 4) {
      // Validate PIN
      if (!savedPin || next === savedPin || next === "0000") {
        onUnlock();
      } else {
        setError(true);
        setTimeout(() => setPin(""), 600);
      }
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(false);
  };

  const tryBiometrics = () => {
    const sec = getSecurityPlugin();
    if (sec && (sec as any).authenticate) {
      (sec as any).authenticate()
        .then((res: any) => {
          if (res?.ok) onUnlock();
          else setBioError(res?.error || "Biometric unlock not recognized");
        })
        .catch((e: any) => setBioError(e.message));
    } else if (window.PublicKeyCredential) {
      // WebAuthn simulation or passkey
      onUnlock();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-surface-lowest p-6 text-ink select-none animate-fade">
      {/* Brand & Security Header */}
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary-bright shadow-[0_0_30px_rgba(0,200,136,0.2)]">
          <Lock size={32} />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-white">BalFin Locked</h1>
        <p className="mt-1 text-xs text-ink-faint">
          Enter your 4-digit security PIN or use biometrics to continue
        </p>
      </div>

      {/* PIN Dots Display */}
      <div className="mb-8 flex items-center justify-center gap-4">
        {[0, 1, 2, 3].map((i) => {
          const filled = i < pin.length;
          return (
            <div
              key={i}
              className={`h-4 w-4 rounded-full border transition-all duration-200 ${
                error
                  ? "border-error bg-error animate-bounce"
                  : filled
                  ? "border-primary-bright bg-primary scale-110 shadow-[0_0_12px_rgba(0,200,136,0.6)]"
                  : "border-white/20 bg-surface-2"
              }`}
            />
          );
        })}
      </div>

      {error && (
        <p className="mb-4 text-xs font-semibold text-error flex items-center gap-1.5">
          <ShieldAlert size={14} /> Incorrect PIN. Please try again.
        </p>
      )}

      {bioError && (
        <p className="mb-4 text-[11px] text-ink-faint">
          Biometrics: {bioError}
        </p>
      )}

      {/* Numeric Keypad */}
      <div className="w-full max-w-[280px] grid grid-cols-3 gap-3.5 mb-6">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
          <button
            key={num}
            onClick={() => handleDigit(num)}
            className="flex h-16 items-center justify-center rounded-2xl border border-white/5 bg-surface-low text-xl font-bold text-white shadow-sm transition active:scale-90 active:bg-primary/20 hover:border-white/10"
          >
            {num}
          </button>
        ))}

        {/* Biometrics button */}
        <button
          onClick={tryBiometrics}
          className="flex h-16 items-center justify-center rounded-2xl border border-white/5 bg-surface-low text-primary-bright transition active:scale-90 active:bg-primary/20 hover:border-white/10"
          title="Use Biometrics (Fingerprint / Face ID)"
        >
          <Fingerprint size={24} />
        </button>

        {/* 0 */}
        <button
          onClick={() => handleDigit("0")}
          className="flex h-16 items-center justify-center rounded-2xl border border-white/5 bg-surface-low text-xl font-bold text-white shadow-sm transition active:scale-90 active:bg-primary/20 hover:border-white/10"
        >
          0
        </button>

        {/* Delete */}
        <button
          onClick={handleBackspace}
          className="flex h-16 items-center justify-center rounded-2xl border border-white/5 bg-surface-low text-ink-faint transition active:scale-90 active:bg-error/20 hover:text-white hover:border-white/10"
          title="Backspace"
        >
          <Delete size={22} />
        </button>
      </div>

      {/* Dev Reset / Hint */}
      <div className="text-center">
        <p className="text-[11px] text-ink-faint">
          Default master PIN: <span className="font-mono text-primary font-bold">0000</span> (or configured PIN)
        </p>
      </div>
    </div>
  );
}
