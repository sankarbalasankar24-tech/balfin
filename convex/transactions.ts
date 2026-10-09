import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    let q = ctx.db.query("transactions").withIndex("by_date").order("desc");
    const rows = limit ? await q.take(limit) : await q.collect();
    return rows;
  },
});

/** Stable non-crypto-strong hash (FNV-1a) over the dedupe string. */
function fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0") + "-" + s.length.toString(36);
}

/**
 * Duplicate protection: a hash over timestamp + amount + kind + account(s)
 * + category. Saving the exact same entry twice (double tap, retry after a
 * flaky network, gesture popup replay) returns the original instead of
 * inserting a second copy.
 */
export const add = mutation({
  args: {
    kind: v.union(v.literal("expense"), v.literal("income"), v.literal("transfer")),
    amount: v.number(),
    categoryId: v.optional(v.id("categories")),
    toAccountId: v.optional(v.id("accounts")),
    subcategory: v.optional(v.string()),
    accountId: v.optional(v.id("accounts")),
    note: v.optional(v.string()),
    date: v.number(),
    billImageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    if (args.amount <= 0) throw new Error("Amount must be positive");
    if (args.kind === "transfer" && !args.toAccountId) {
      throw new Error("Transfer needs a destination account");
    }
    const basis = [
      args.date,
      args.amount,
      args.kind,
      args.accountId ?? "-",
      args.toAccountId ?? "-",
      args.categoryId ?? "-",
      args.subcategory ?? "",
    ].join("|");
    const dedupeKey = fnv1a(basis);
    const twin = await ctx.db
      .query("transactions")
      .withIndex("by_dedupe", (q) => q.eq("dedupeKey", dedupeKey))
      .first();
    if (twin) return twin._id; // already recorded — idempotent
    return await ctx.db.insert("transactions", { ...args, dedupeKey });
  },
});

export const update = mutation({
  args: {
    id: v.id("transactions"),
    kind: v.optional(v.union(v.literal("expense"), v.literal("income"), v.literal("transfer"))),
    amount: v.optional(v.number()),
    categoryId: v.optional(v.id("categories")),
    toAccountId: v.optional(v.id("accounts")),
    subcategory: v.optional(v.string()),
    accountId: v.optional(v.id("accounts")),
    note: v.optional(v.string()),
    date: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...patch }) => {
    const clean: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(patch)) {
      if (val !== undefined) clean[k] = val;
    }
    if (Object.keys(clean).length) await ctx.db.patch(id, clean);
  },
});

export const remove = mutation({
  args: { id: v.id("transactions") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
