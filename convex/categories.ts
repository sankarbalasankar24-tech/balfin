import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { DEFAULT_CATEGORIES } from "./defaults";

export const list = query({
  handler: async (ctx) => {
    const cats = await ctx.db.query("categories").collect();
    return cats.sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const add = mutation({
  args: {
    name: v.string(),
    type: v.union(v.literal("expense"), v.literal("income")),
    icon: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("categories", { ...args, subcategories: [] });
  },
});

export const update = mutation({
  args: {
    id: v.id("categories"),
    name: v.optional(v.string()),
    icon: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...patch }) => {
    const clean: Record<string, unknown> = {};
    if (patch.name !== undefined) clean.name = patch.name.trim();
    if (patch.icon !== undefined) clean.icon = patch.icon;
    if (Object.keys(clean).length) await ctx.db.patch(id, clean);
  },
});

export const remove = mutation({
  args: { id: v.id("categories") },
  handler: async (ctx, { id }) => {
    const used = await ctx.db
      .query("transactions")
      .withIndex("by_category", (q) => q.eq("categoryId", id))
      .first();
    if (used) throw new Error("Category is in use by existing transactions");
    await ctx.db.delete(id);
  },
});

export const addSubcategory = mutation({
  args: { id: v.id("categories"), name: v.string(), icon: v.optional(v.string()) },
  handler: async (ctx, { id, name, icon }) => {
    const cat = await ctx.db.get(id);
    if (!cat) throw new Error("Category not found");
    const subs = cat.subcategories.filter(
      (s: { name: string }) => s.name.toLowerCase() !== name.trim().toLowerCase()
    );
    subs.push({ name: name.trim(), icon });
    await ctx.db.patch(id, { subcategories: subs });
  },
});

export const updateSubcategory = mutation({
  args: {
    id: v.id("categories"),
    index: v.number(),
    name: v.optional(v.string()),
    icon: v.optional(v.string()),
  },
  handler: async (ctx, { id, index, ...patch }) => {
    const cat = await ctx.db.get(id);
    if (!cat || !cat.subcategories[index]) throw new Error("Subcategory not found");
    const subs = [...cat.subcategories];
    if (patch.name !== undefined) subs[index] = { ...subs[index], name: patch.name.trim() };
    if (patch.icon !== undefined) subs[index] = { ...subs[index], icon: patch.icon };
    await ctx.db.patch(id, { subcategories: subs });
  },
});

export const removeSubcategory = mutation({
  args: { id: v.id("categories"), index: v.number() },
  handler: async (ctx, { id, index }) => {
    const cat = await ctx.db.get(id);
    if (!cat) throw new Error("Category not found");
    await ctx.db.patch(id, {
      subcategories: cat.subcategories.filter((_: unknown, i: number) => i !== index),
    });
  },
});

export const seedDefaults = mutation({
  handler: async (ctx) => {
    const existing = await ctx.db.query("categories").first();
    if (existing) return; // already seeded
    for (const c of DEFAULT_CATEGORIES) {
      await ctx.db.insert("categories", c);
    }
  },
});
