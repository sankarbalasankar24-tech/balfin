import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

const url = "https://oceanic-crane-669.convex.cloud";
const amt = Number(process.argv[2] ?? 250);
const client = new ConvexHttpClient(url);

const txns = await client.query(api.transactions.list, {});
const hits = txns.filter((t) => t.amount === amt).sort((a, b) => b.date - a.date);
console.log(`found ${hits.length} txn(s) with amount ${amt}`);
for (const h of hits.slice(0, 1)) {
  await client.mutation(api.transactions.remove, { id: h._id });
  console.log("deleted", h._id, h.amount, new Date(h.date).toISOString());
}
process.exit(0);
