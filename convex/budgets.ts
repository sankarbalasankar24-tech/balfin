import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  handler: async (ctx) => {
    const rows = await ctx.db.query("budgets").collect();
    return rows.sort((a, b) => b.month.localeCompare(a.month));
  },
});

export const get = query({
  args: { month: v.string() },
  handler: async (ctx, { month }) => {
    return await ctx.db
      .query("budgets")
      .withIndex("by_month", (q) => q.eq("month", month))
      .first();
  },
});

export const save = mutation({
  args: {
    month: v.string(),
    incomeGoal: v.optional(v.number()),
    expenseBudget: v.optional(v.number()),
    savingsGoal: v.optional(v.number()),
    categoryBudgets: v.optional(
      v.array(v.object({ categoryId: v.id("categories"), amount: v.number() }))
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("budgets")
      .withIndex("by_month", (q) => q.eq("month", args.month))
      .first();
    const clean: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(args)) {
      if (val !== undefined) clean[k] = val;
    }
    if (existing) {
      await ctx.db.patch(existing._id, clean);
      return existing._id;
    }
    return await ctx.db.insert("budgets", clean as typeof args);
  },
});
