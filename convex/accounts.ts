import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("accounts").collect();
  },
});

export const add = mutation({
  args: {
    name: v.string(),
    type: v.union(
      v.literal("savings"),
      v.literal("wallet"),
      v.literal("investment")
    ),
    bankName: v.optional(v.string()),
    openingBalance: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("accounts", {
      name: args.name.trim(),
      type: args.type,
      bankName: args.bankName?.trim() || undefined,
      openingBalance: args.openingBalance ?? 0,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("accounts"),
    name: v.optional(v.string()),
    type: v.optional(
      v.union(v.literal("savings"), v.literal("wallet"), v.literal("investment"))
    ),
    bankName: v.optional(v.string()),
    openingBalance: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...patch }) => {
    const clean: Record<string, unknown> = {};
    if (patch.name !== undefined) clean.name = patch.name.trim();
    if (patch.type !== undefined) clean.type = patch.type;
    if (patch.bankName !== undefined) clean.bankName = patch.bankName.trim() || "";
    if (patch.openingBalance !== undefined) clean.openingBalance = patch.openingBalance;
    if (Object.keys(clean).length) await ctx.db.patch(id, clean);
  },
});

export const remove = mutation({
  args: { id: v.id("accounts") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
