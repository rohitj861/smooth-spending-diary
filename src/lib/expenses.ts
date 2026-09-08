import { format } from "date-fns";

export const CATEGORIES = [
  "Food",
  "Transport",
  "Bills",
  "Shopping",
  "Fun",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export type Expense = {
  id: string;
  amount: number;
  category: string;
  date: string;
  note: string | null;
  created_at: string;
};

export function formatAmount(value: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDate(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function todayISO() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
}

/** The `YYYY-MM` slice of an ISO date, e.g. "2026-09". */
export function monthKey(dateISO: string) {
  return dateISO.slice(0, 7);
}

/** "September 2026" from a "2026-09" month key. */
export function monthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  return format(new Date(y ?? 1970, (m ?? 1) - 1, 1), "MMMM yyyy");
}

/** Every month present in the data, as `YYYY-MM` keys, newest first. */
export function listMonths(expenses: Expense[]) {
  return [...new Set(expenses.map((e) => monthKey(e.date)))].sort().reverse();
}

/**
 * Total spend per category, highest first. Pass a `YYYY-MM` month to limit to
 * that month; omit it to summarise every expense.
 */
export function summarizeByCategory(
  expenses: Expense[],
  month?: string,
): [string, number][] {
  const map = new Map<string, number>();
  for (const e of expenses) {
    if (month && monthKey(e.date) !== month) continue;
    map.set(e.category, (map.get(e.category) ?? 0) + e.amount);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

export const CATEGORY_COLORS = [
  "oklch(0.52 0.12 45)", // terracotta
  "oklch(0.55 0.08 90)", // olive
  "oklch(0.48 0.06 160)", // sage
  "oklch(0.52 0.09 20)", // clay rose
  "oklch(0.45 0.05 220)", // slate blue
  "oklch(0.62 0.09 60)", // honey
];

/**
 * Colour for a category slice. Positional by design — the donut and legend
 * colour rows by rank, not by category name.
 */
export function colorForCategory(_category: string, index: number) {
  return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
}
