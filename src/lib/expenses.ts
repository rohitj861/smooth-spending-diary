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

/** Expenses in a given `YYYY-MM` month, oldest first. */
export function expensesInMonth(expenses: Expense[], month: string): Expense[] {
  return expenses
    .filter((e) => monthKey(e.date) === month)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Step one calendar month away from a `YYYY-MM` key. */
export function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y ?? 1970, (m ?? 1) - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * A few plain sentences capturing the shape of a month's spending — total,
 * dominant categories, the largest single expense, and the change from the
 * previous month. Computed from the numbers, not AI-generated.
 */
export function monthSummaryParagraph(expenses: Expense[], month: string): string {
  const items = expensesInMonth(expenses, month);
  if (items.length === 0) {
    return `No expenses were recorded in ${monthLabel(month)}.`;
  }

  const total = items.reduce((sum, e) => sum + e.amount, 0);
  const ranked = summarizeByCategory(expenses, month);
  const biggest = items.reduce((best, e) => (e.amount > best.amount ? e : best));

  const sentences: string[] = [
    `In ${monthLabel(month)} you spent ${formatAmount(total)} across ${items.length} ${
      items.length === 1 ? "expense" : "expenses"
    }.`,
  ];

  const top = ranked[0];
  if (top) {
    const [topCategory, topValue] = top;
    const share = total ? Math.round((topValue / total) * 100) : 0;
    const second = ranked[1];
    if (second) {
      sentences.push(
        `${topCategory} was the biggest category at ${formatAmount(topValue)} (${share}% of the month), then ${second[0]} at ${formatAmount(second[1])}.`,
      );
    } else {
      sentences.push(`It all went to ${topCategory}.`);
    }
  }

  sentences.push(
    `The largest single expense was ${formatAmount(biggest.amount)} on ${biggest.category}${
      biggest.note ? ` — ${biggest.note}` : ""
    }.`,
  );

  const prevMonth = shiftMonth(month, -1);
  const prevItems = expensesInMonth(expenses, prevMonth);
  if (prevItems.length > 0) {
    const prevTotal = prevItems.reduce((sum, e) => sum + e.amount, 0);
    const diff = total - prevTotal;
    if (Math.abs(diff) < 0.01) {
      sentences.push(`That is about the same as ${monthLabel(prevMonth)}.`);
    } else {
      const pct = prevTotal ? Math.round((Math.abs(diff) / prevTotal) * 100) : 0;
      sentences.push(
        `That is ${formatAmount(Math.abs(diff))} ${diff > 0 ? "more" : "less"} than ${monthLabel(prevMonth)}${
          pct ? ` (${diff > 0 ? "up" : "down"} ${pct}%)` : ""
        }.`,
      );
    }
  }

  return sentences.join(" ");
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
