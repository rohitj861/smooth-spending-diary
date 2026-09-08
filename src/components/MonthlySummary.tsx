import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  colorForCategory,
  formatAmount,
  listMonths,
  monthKey,
  monthLabel,
  summarizeByCategory,
  todayISO,
  type Expense,
} from "@/lib/expenses";

/** Step one calendar month away from a `YYYY-MM` key. */
function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y ?? 1970, (m ?? 1) - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function MonthlySummary({ expenses }: { expenses: Expense[] }) {
  const thisMonth = monthKey(todayISO());
  const earliest = useMemo(() => {
    const months = listMonths(expenses);
    return months[months.length - 1] ?? thisMonth;
  }, [expenses, thisMonth]);

  const [month, setMonth] = useState(thisMonth);

  const rows = useMemo(
    () => summarizeByCategory(expenses, month),
    [expenses, month],
  );
  const monthTotal = rows.reduce((sum, [, value]) => sum + value, 0);
  const count = useMemo(
    () => expenses.filter((e) => monthKey(e.date) === month).length,
    [expenses, month],
  );

  const canPrev = month > earliest;
  const canNext = month < thisMonth;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-xl"
          disabled={!canPrev}
          onClick={() => setMonth((m) => shiftMonth(m, -1))}
          aria-label="Previous month"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <div className="text-center">
          <p className="text-lg font-semibold">{monthLabel(month)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {count} {count === 1 ? "expense" : "expenses"} · total{" "}
            <span className="font-medium text-foreground">{formatAmount(monthTotal)}</span>
          </p>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="rounded-xl"
          disabled={!canNext}
          onClick={() => setMonth((m) => shiftMonth(m, 1))}
          aria-label="Next month"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <div className="rounded-3xl border bg-card p-8 shadow-soft sm:p-10">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No expenses recorded in {monthLabel(month)}.
          </p>
        ) : (
          <ul className="space-y-5">
            {rows.map(([category, value], i) => {
              const pct = monthTotal ? (value / monthTotal) * 100 : 0;
              return (
                <li key={category} className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span
                      className="h-3.5 w-3.5 shrink-0 rounded-full"
                      style={{ backgroundColor: colorForCategory(category, i) }}
                    />
                    <span className="flex-1 text-sm font-medium">{category}</span>
                    <span className="w-10 text-right text-xs text-muted-foreground tabular-nums">
                      {Math.round(pct)}%
                    </span>
                    <span className="w-24 text-right text-sm font-semibold tabular-nums">
                      {formatAmount(value)}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(pct, 2)}%`,
                        backgroundColor: colorForCategory(category, i),
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
