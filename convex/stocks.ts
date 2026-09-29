import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("stocks").collect();
  },
});

export const listExits = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("stockExits").collect();
  },
});

export const listDividends = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("dividends").collect();
  },
});

export const add = mutation({
  args: {
    symbol: v.string(),
    name: v.optional(v.string()),
    exchange: v.optional(v.union(v.literal("NSE"), v.literal("BSE"))),
    quantity: v.number(),
    bonuses: v.optional(v.number()),
    buyPrice: v.number(),
    buyDate: v.number(),
    buyCharges: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const symbol = args.symbol.trim().toUpperCase();
    if (!symbol) throw new Error("Symbol is required");
    if (args.quantity <= 0) throw new Error("Quantity must be positive");
    const exchange =
      args.exchange ?? (symbol.endsWith(".BO") ? "BSE" : "NSE");
    return await ctx.db.insert("stocks", {
      symbol,
      name: args.name?.trim() || undefined,
      exchange,
      quantity: args.quantity,
      bonuses: args.bonuses ?? 0,
      buyPrice: args.buyPrice,
      buyDate: args.buyDate,
      buyCharges: args.buyCharges ?? 0,
      closed: false,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("stocks"),
    symbol: v.optional(v.string()),
    name: v.optional(v.string()),
    quantity: v.optional(v.number()),
    bonuses: v.optional(v.number()),
    buyPrice: v.optional(v.number()),
    buyDate: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...patch }) => {
    const clean: Record<string, unknown> = {};
    if (patch.symbol !== undefined) clean.symbol = patch.symbol.trim().toUpperCase();
    if (patch.name !== undefined) clean.name = patch.name.trim() || "";
    if (patch.quantity !== undefined) clean.quantity = patch.quantity;
    if (patch.bonuses !== undefined) clean.bonuses = patch.bonuses;
    if (patch.buyPrice !== undefined) clean.buyPrice = patch.buyPrice;
    if (patch.buyDate !== undefined) clean.buyDate = patch.buyDate;
    if (Object.keys(clean).length) await ctx.db.patch(id, clean);
  },
});

export const addExit = mutation({
  args: {
    stockId: v.id("stocks"),
    quantity: v.number(),
    exitPrice: v.number(),
    exitDate: v.number(),
    charges: v.optional(v.number()),
  },
  handler: async (ctx, { stockId, quantity, exitPrice, exitDate, charges }) => {
    const stock = await ctx.db.get(stockId);
    if (!stock) throw new Error("Position not found");
    const exits = await ctx.db
      .query("stockExits")
      .withIndex("by_stock", (q) => q.eq("stockId", stockId))
      .collect();
    const exitedQty = exits.reduce((sum, e) => sum + e.quantity, 0);
    const remaining = stock.quantity + (stock.bonuses ?? 0) - exitedQty;
    if (quantity <= 0) throw new Error("Exit quantity must be positive");
    if (quantity > remaining)
      throw new Error(`Only ${remaining} unit(s) remaining to exit`);
    const id = await ctx.db.insert("stockExits", {
      stockId,
      quantity,
      exitPrice,
      exitDate,
      charges: charges ?? 0,
    });
    if (quantity === remaining) await ctx.db.patch(stockId, { closed: true });
    return id;
  },
});

export const removeExit = mutation({
  args: { exitId: v.id("stockExits") },
  handler: async (ctx, { exitId }) => {
    const exit = await ctx.db.get(exitId);
    if (!exit) return;
    await ctx.db.delete(exitId);
    const stock = await ctx.db.get(exit.stockId);
    if (!stock) return;
    const exits = await ctx.db
      .query("stockExits")
      .withIndex("by_stock", (q) => q.eq("stockId", exit.stockId))
      .collect();
    const exitedQty = exits.reduce((sum, e) => sum + e.quantity, 0);
    await ctx.db.patch(exit.stockId, { closed: exitedQty >= stock.quantity + (stock.bonuses ?? 0) });
  },
});

export const addDividend = mutation({
  args: {
    stockId: v.id("stocks"),
    amount: v.number(),
    date: v.number(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("dividends", {
      stockId: args.stockId,
      amount: args.amount,
      date: args.date,
      note: args.note?.trim() || undefined,
    });
  },
});

export const removeDividend = mutation({
  args: { dividendId: v.id("dividends") },
  handler: async (ctx, { dividendId }) => {
    await ctx.db.delete(dividendId);
  },
});

export const remove = mutation({
  args: { id: v.id("stocks") },
  handler: async (ctx, { id }) => {
    for (const e of await ctx.db
      .query("stockExits")
      .withIndex("by_stock", (q) => q.eq("stockId", id))
      .collect()) {
      await ctx.db.delete(e._id);
    }
    for (const d of await ctx.db
      .query("dividends")
      .withIndex("by_stock", (q) => q.eq("stockId", id))
      .collect()) {
      await ctx.db.delete(d._id);
    }
    await ctx.db.delete(id);
  },
});
