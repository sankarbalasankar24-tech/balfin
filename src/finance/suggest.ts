import { useCallback, useState } from "react";

/**
 * Frequency-memory autosuggest for quick entry.
 * Every saved entry bumps the frequency of its notes and subcategory names;
 * suggestion lists rank stored strings by how often + how recently they were
 * used. Shared by the in-app entry sheet and the gesture popup.
 */

const KEY = "balfin.suggestMemory.v1";

interface SuggestMemory {
  // "note:zomato" -> { count, lastUsed }
  notes: Record<string, { count: number; lastUsed: number }>;
  subs: Record<string, { count: number; lastUsed: number }>;
}

let cache: SuggestMemory | null = null;

function load(): SuggestMemory {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SuggestMemory>;
      cache = { notes: parsed.notes ?? {}, subs: parsed.subs ?? {} };
      return cache;
    }
  } catch {
    /* corrupt store — reset */
  }
  cache = { notes: {}, subs: {} };
  return cache;
}

function persist(mem: SuggestMemory) {
  cache = mem;
  try {
    localStorage.setItem(KEY, JSON.stringify(mem));
  } catch {
    /* storage full — memory still works for this session */
  }
}

function bump(table: Record<string, { count: number; lastUsed: number }>, value: string) {
  const v = value.trim();
  if (!v) return;
  const cur = table[v.toLowerCase()] ?? { count: 0, lastUsed: 0 };
  table[v.toLowerCase()] = { count: cur.count + 1, lastUsed: Date.now() };
}

function rank(table: Record<string, { count: number; lastUsed: number }>, q: string): string[] {
  const needle = q.trim().toLowerCase();
  return Object.entries(table)
    .filter(([k]) => !needle || k.includes(needle))
    .sort((a, b) => {
      // frequency first, recency as tiebreak
      const ca = a[1].count * 2 + a[1].lastUsed / 86400000;
      const cb = b[1].count * 2 + b[1].lastUsed / 86400000;
      return cb - ca;
    })
    .slice(0, 5)
    .map(([k]) => k);
}

export function rememberEntry(fields: { note?: string; subcategory?: string }) {
  const mem = load();
  if (fields.note) bump(mem.notes, fields.note);
  if (fields.subcategory) bump(mem.subs, fields.subcategory);
  persist(mem);
}

export function useSuggestions() {
  const [mem, setMem] = useState(load());

  const refresh = useCallback(() => setMem({ ...load() }), []);

  const noteSuggestions = useCallback(
    (q: string) => rank(mem.notes, q),
    [mem]
  );
  const subSuggestions = useCallback(
    (q: string) => rank(mem.subs, q),
    [mem]
  );

  return { noteSuggestions, subSuggestions, refresh };
}

/** Top N saved notes overall — used to prefill quick chips in the popup. */
export function topNotes(n = 4): string[] {
  return rank(load().notes, "").slice(0, n);
}
