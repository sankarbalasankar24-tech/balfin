import type { TxnRow } from "./analytics";

export interface CatLite {
  _id: string;
  name: string;
  type: "expense" | "income";
}

/**
 * Rule keywords: note text → canonical category label. Each rule also scores
 * partial matches against the user's own category names (e.g. "Travel" for
 * the Transport rule) so it works with custom categories.
 */
const RULES: Array<{ re: RegExp; label: string; alt: string[] }> = [
  { re: /swiggy|zomato|restaurant|hotel|dine|food|pizza|domino|kfc|mcd|cafe|coffee|starbucks|chai|bakery|grocery|blinkit|zepto|bigbasket|instamart/i, label: "Food", alt: ["grocer", "kitchen", "meal", "eat"] },
  { re: /uber|ola|rapido|metro|bus|irctc|train|rail|fuel|petrol|diesel|hp |ioc |parking|toll|fastag|cab|auto\b/i, label: "Transport", alt: ["travel", "commute", "fuel", "vehicle"] },
  { re: /amazon|flipkart|myntra|ajio|nykaa|meesho|mall|zara|h&m|decathlon|shopping|croma|reliance digital/i, label: "Shopping", alt: ["cloth", "apparel", "retail"] },
  { re: /rent|electricity|water bill|gas bill|broadband|wifi|act fibernet|recharge|jio|airtel|vodafone|bill pay|mobile bill|emi/i, label: "Bills", alt: ["utilit", "housing", "phone"] },
  { re: /netflix|prime video|spotify|hotstar|youtube premium|subscription|movie|cinema|pvr|inox|game|gaming|steam|concert/i, label: "Entertainment", alt: ["fun", "leisure", "hobby"] },
  { re: /hospital|pharmacy|apollo|medical|doctor|clinic|diagnostic|meds|medicine|gym|cult\.fit|fitness|insurance premium/i, label: "Health", alt: ["wellness", "medical", "fitness"] },
  { re: /salary|paycheck|pay roll|stipend|freelance|consulting|upwork|credited.*salary|monthly pay/i, label: "Salary", alt: ["income", "pay", "earn"] },
  { re: /zerodha|groww|upstox|angel one|kite|mutual fund|\bsip\b|stock|share|dividend|coin|indmoney/i, label: "Invest", alt: ["invest", "trading", "equity"] },
  { re: /school|college|tuition|udemy|coursera|unacademy|byju|course|exam fee|books/i, label: "Education", alt: ["learn", "study", "course"] },
  { re: /lic|insurance|policy|premium|hdfc life|term plan/i, label: "Insurance", alt: ["insurance", "policy"] },
  { re: /temple|donation|charity|dana|trust donation/i, label: "Donation", alt: ["charity", "donate"] },
  { re: /flight|indigo|vistara|air india|makemytrip|goibibo|oyo|airbnb|taj |holiday|trip|vacation/i, label: "Travel", alt: ["trip", "tour", "holiday"] },
];

/**
 * AI-ish category suggestion: blends (1) learned history — which category the
 * user has used before for very similar note text, and (2) keyword rules —
 * matched against the note and the user's category names.
 */
export function suggestCategory(
  note: string,
  categories: CatLite[],
  transactions: TxnRow[]
): { id: string; confidence: number; source: "history" | "keyword" } | null {
  const text = note.trim().toLowerCase();
  if (text.length < 3) return null;
  const scores = new Map<string, { score: number; source: "history" | "keyword" }>();
  const bump = (id: string, score: number, source: "history" | "keyword") => {
    const cur = scores.get(id);
    if (!cur || cur.score < score) scores.set(id, { score, source });
  };

  // 1) learned: token-overlap with past notes of the same kind
  const tokens = new Set(text.split(/\s+/).filter((w) => w.length > 2));
  if (tokens.size) {
    const histScore = new Map<string, number>();
    for (const t of transactions) {
      if (!t.note || !t.categoryId) continue;
      const nt = t.note.toLowerCase();
      const overlap = [...tokens].filter((w) => nt.includes(w)).length;
      if (overlap) histScore.set(t.categoryId, (histScore.get(t.categoryId) ?? 0) + overlap);
    }
    const best = [...histScore.entries()].sort((a, b) => b[1] - a[1])[0];
    if (best && best[1] >= 2) bump(best[0], 2 + best[1] * 0.1, "history");
  }

  // 2) keyword rules
  for (const r of RULES) {
    if (r.re.test(text)) {
      const target = categories.find(
        (c) =>
          c.name.toLowerCase().includes(r.label.toLowerCase()) ||
          r.alt.some((a) => c.name.toLowerCase().includes(a))
      );
      if (target) bump(target._id, 1.5, "keyword");
    }
  }

  // 3) direct category-name mention in the note ("petrol 200")
  for (const c of categories) {
    if (c.name.length >= 4 && text.includes(c.name.toLowerCase())) bump(c._id, 1.2, "keyword");
  }

  const best = [...scores.entries()].sort((a, b) => b[1].score - a[1].score)[0];
  if (!best || best[1].score < 1.2) return null;
  return { id: best[0], confidence: Math.min(1, best[1].score / 3), source: best[1].source };
}
