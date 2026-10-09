import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  categories: defineTable({
    name: v.string(),
    type: v.union(v.literal("expense"), v.literal("income")),
    icon: v.optional(v.string()),
    subcategories: v.array(
      v.object({ name: v.string(), icon: v.optional(v.string()) })
    ),
  }).index("by_type", ["type"]),

  transactions: defineTable({
    // "transfer" moves money between two accounts (accountId -> toAccountId)
    // without touching income/expense analytics or net worth.
    kind: v.union(v.literal("expense"), v.literal("income"), v.literal("transfer")),
    amount: v.number(),
    categoryId: v.optional(v.id("categories")), // transfers have none
    toAccountId: v.optional(v.id("accounts")), // transfer destination
    subcategory: v.optional(v.string()),
    accountId: v.optional(v.id("accounts")),
    note: v.optional(v.string()),
    date: v.number(), // epoch ms
    billImageId: v.optional(v.id("_storage")),
    // Duplicate guard: hash of timestamp+amount+kind+account(s)+category.
    dedupeKey: v.optional(v.string()),
  })
    .index("by_date", ["date"])
    .index("by_category", ["categoryId"])
    .index("by_dedupe", ["dedupeKey"]),

  budgets: defineTable({
    month: v.string(), // "YYYY-MM"
    incomeGoal: v.optional(v.number()),
    expenseBudget: v.optional(v.number()),
    savingsGoal: v.optional(v.number()),
    categoryBudgets: v.optional(
      v.array(v.object({ categoryId: v.id("categories"), amount: v.number() }))
    ),
  }).index("by_month", ["month"]),

  accounts: defineTable({
    name: v.string(),
    type: v.union(
      v.literal("savings"),
      v.literal("wallet"),
      v.literal("investment")
    ),
    bankName: v.optional(v.string()),
    openingBalance: v.number(),
  }),

  stocks: defineTable({
    symbol: v.string(), // NSE default, .BO for BSE
    name: v.optional(v.string()),
    exchange: v.optional(v.union(v.literal("NSE"), v.literal("BSE"))),
    quantity: v.number(),
    bonuses: v.optional(v.number()), // bonus shares credited — held at zero cost
    buyPrice: v.number(),
    buyDate: v.number(),
    buyCharges: v.optional(v.number()),
    closed: v.boolean(),
  }).index("by_closed", ["closed"]),

  stockExits: defineTable({
    stockId: v.id("stocks"),
    quantity: v.number(),
    exitPrice: v.number(),
    exitDate: v.number(),
    charges: v.optional(v.number()),
  }).index("by_stock", ["stockId"]),

  dividends: defineTable({
    stockId: v.id("stocks"),
    amount: v.number(),
    date: v.number(),
    note: v.optional(v.string()),
  }).index("by_stock", ["stockId"]),

  mutualFunds: defineTable({
    name: v.string(),
    units: v.number(),
    avgNav: v.number(),
    navSymbol: v.optional(v.string()), // Yahoo symbol for live NAV
    manualNav: v.optional(v.number()),
    buyDate: v.optional(v.number()),
  }),

  // Deposit-type investments: fixed deposits, PPF, and recurring-style
  // funds tracked by flows instead of units. Value = deposits + interest
  // − withdrawals (no live price; interest is entered when credited).
  deposits: defineTable({
    kind: v.union(v.literal("fd"), v.literal("ppf"), v.literal("fund")),
    name: v.string(),
    institution: v.optional(v.string()),
    ratePct: v.optional(v.number()),
    maturityDate: v.optional(v.number()),
    startDate: v.optional(v.number()),
  }).index("by_kind", ["kind"]),

  depositFlows: defineTable({
    depositId: v.id("deposits"),
    type: v.union(v.literal("deposit"), v.literal("withdrawal"), v.literal("interest")),
    amount: v.number(),
    date: v.number(),
    note: v.optional(v.string()),
  }).index("by_deposit", ["depositId"]),

  // Google Sheets auto-sync — single row holding the Apps Script web-app
  // endpoint of the user's linked sheet plus last sync status.
  sheetSync: defineTable({
    endpoint: v.optional(v.string()),
    lastPushedAt: v.optional(v.number()),
    lastStatus: v.optional(v.string()), // "pending" | "synced" | "error"
    lastError: v.optional(v.string()),
    backupFrequency: v.optional(v.string()), // "daily" | "weekly" | "monthly"
  }),
});
