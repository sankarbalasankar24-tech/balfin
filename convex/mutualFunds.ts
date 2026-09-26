import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("mutualFunds").collect();
  },
});

export const add = mutation({
  args: {
    name: v.string(),
    units: v.number(),
    avgNav: v.number(),
    navSymbol: v.optional(v.string()),
    manualNav: v.optional(v.number()),
    buyDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (args.units <= 0) throw new Error("Units must be positive");
    return await ctx.db.insert("mutualFunds", {
      name: args.name.trim(),
      units: args.units,
      avgNav: args.avgNav,
      navSymbol: args.navSymbol?.trim() || undefined,
      manualNav: args.manualNav,
      buyDate: args.buyDate,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("mutualFunds"),
    name: v.optional(v.string()),
    units: v.optional(v.number()),
    avgNav: v.optional(v.number()),
    navSymbol: v.optional(v.string()),
    manualNav: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...patch }) => {
    const clean: Record<string, unknown> = {};
    if (patch.name !== undefined) clean.name = patch.name.trim();
    if (patch.units !== undefined) clean.units = patch.units;
    if (patch.avgNav !== undefined) clean.avgNav = patch.avgNav;
    if (patch.navSymbol !== undefined)
      clean.navSymbol = patch.navSymbol.trim() || "";
    if (patch.manualNav !== undefined) clean.manualNav = patch.manualNav;
    if (Object.keys(clean).length) await ctx.db.patch(id, clean);
  },
});

export const remove = mutation({
  args: { id: v.id("mutualFunds") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
