import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("deposits").collect();
  },
});

export const listFlows = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("depositFlows").collect();
  },
});

export const add = mutation({
  args: {
    kind: v.union(v.literal("fd"), v.literal("ppf"), v.literal("fund")),
    name: v.string(),
    institution: v.optional(v.string()),
    ratePct: v.optional(v.number()),
    maturityDate: v.optional(v.number()),
    startDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (!args.name.trim()) throw new Error("Name is required");
    return await ctx.db.insert("deposits", {
      kind: args.kind,
      name: args.name.trim(),
      institution: args.institution?.trim() || undefined,
      ratePct: args.ratePct,
      maturityDate: args.maturityDate,
      startDate: args.startDate,
    });
  },
});

export const addFlow = mutation({
  args: {
    depositId: v.id("deposits"),
    type: v.union(
      v.literal("deposit"),
      v.literal("withdrawal"),
      v.literal("interest")
    ),
    amount: v.number(),
    date: v.number(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, { depositId, type, amount, date, note }) => {
    const dep = await ctx.db.get(depositId);
    if (!dep) throw new Error("Deposit not found");
    if (amount <= 0) throw new Error("Amount must be positive");
    return await ctx.db.insert("depositFlows", {
      depositId,
      type,
      amount,
      date,
      note: note?.trim() || undefined,
    });
  },
});

export const removeFlow = mutation({
  args: { flowId: v.id("depositFlows") },
  handler: async (ctx, { flowId }) => {
    await ctx.db.delete(flowId);
  },
});

export const remove = mutation({
  args: { id: v.id("deposits") },
  handler: async (ctx, { id }) => {
    for (const f of await ctx.db
      .query("depositFlows")
      .withIndex("by_deposit", (q) => q.eq("depositId", id))
      .collect()) {
      await ctx.db.delete(f._id);
    }
    await ctx.db.delete(id);
  },
});
