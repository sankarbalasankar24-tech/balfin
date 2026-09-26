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

export const add = mutation({
  args: {
    kind: v.union(v.literal("expense"), v.literal("income")),
    amount: v.number(),
    categoryId: v.id("categories"),
    subcategory: v.optional(v.string()),
    accountId: v.optional(v.id("accounts")),
    note: v.optional(v.string()),
    date: v.number(),
    billImageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    if (args.amount <= 0) throw new Error("Amount must be positive");
    return await ctx.db.insert("transactions", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("transactions"),
    kind: v.optional(v.union(v.literal("expense"), v.literal("income"))),
    amount: v.optional(v.number()),
    categoryId: v.optional(v.id("categories")),
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
