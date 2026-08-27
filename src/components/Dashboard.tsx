import { useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { formatAmount, formatDate, todayISO, type Expense } from "@/lib/expenses";
import { getMonthlyInsight, getSpokenSummary } from "@/lib/insights.functions";

function isThisMonth(date: string) {
  return date.slice(0, 7) === todayISO().slice(0, 7);
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-3xl border bg-card p-7 shadow-soft">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-4 break-words text-3xl font-bold tabular-nums tracking-tight sm:text-4xl">
        {value}
      </p>
      {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function Dashboard({ expenses }: { expenses: Expense[] }) {
  const month = useMemo(() => expenses.filter((e) => isThisMonth(e.date)), [expenses]);

  const monthTotal = month.reduce((s, e) => s + e.amount, 0);
  const today = todayISO();
  const todayTotal = expenses.filter((e) => e.date === today).reduce((s, e) => s + e.amount, 0);
  const biggest = month.reduce<Expense | null>(
    (best, e) => (!best || e.amount > best.amount ? e : best),
    null,
  );

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of month) map.set(e.category, (map.get(e.category) ?? 0) + e.amount);
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [month]);
  const maxCategory = byCategory[0]?.[1] ?? 0;

  const recent = expenses.slice(0, 5);

  const [insight, setInsight] = useState<string | null>(null);
  const insightFn = useServerFn(getMonthlyInsight);
  const insightMutation = useMutation({
    mutationFn: () => insightFn({ data: undefined }),
    onSuccess: (res) => setInsight(res.text),
    onError: (e: Error) => toast.error(e.message),
  });

  const [spoken, setSpoken] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speakFn = useServerFn(getSpokenSummary);
  const speakMutation = useMutation({
    mutationFn: () => speakFn({ data: undefined }),
    onSuccess: (res) => {
      setSpoken(res.text);
      const audio = new Audio(`data:audio/mpeg;base64,${res.audio}`);
      audioRef.current?.pause();
      audioRef.current = audio;
      void audio.play().catch(() => toast.error("Couldn't play audio."));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-16">
      <section>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="This month" value={formatAmount(monthTotal)} />
          <StatCard label="Today" value={formatAmount(todayTotal)} />
          <StatCard label="Expenses" value={String(month.length)} hint="this month" />
          <StatCard
            label="Biggest expense"
            value={biggest ? formatAmount(biggest.amount) : "—"}
            hint={biggest ? biggest.category : "nothing yet"}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-6 text-2xl font-semibold">Spending by category</h2>
        <div className="rounded-3xl border bg-card p-8 shadow-soft">
          {byCategory.length === 0 ? (
            <p className="text-sm text-muted-foreground">No expenses logged this month yet.</p>
          ) : (
            <ul className="space-y-5">
              {byCategory.map(([category, value]) => (
                <li key={category}>
                  <div className="mb-2 flex items-baseline justify-between gap-4">
                    <span className="text-sm font-medium">{category}</span>
                    <span className="text-sm font-semibold tabular-nums">
                      {formatAmount(value)}
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        {monthTotal ? Math.round((value / monthTotal) * 100) : 0}%
                      </span>
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary transition-[width] duration-500"
                      style={{ width: `${maxCategory ? (value / maxCategory) * 100 : 0}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold">Insights</h2>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="h-11 rounded-xl"
              disabled={speakMutation.isPending}
              onClick={() => speakMutation.mutate()}
            >
              {speakMutation.isPending ? "Preparing…" : "Play summary"}
            </Button>
            <Button
              className="h-11 rounded-xl"
              disabled={insightMutation.isPending}
              onClick={() => insightMutation.mutate()}
            >
              {insightMutation.isPending
                ? "Thinking…"
                : insight
                  ? "Regenerate"
                  : "Get insights"}
            </Button>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-3xl border bg-card p-8 shadow-soft">
            {insight ? (
              <p className="text-base leading-relaxed">{insight}</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Get a short, friendly read on where your money went this month.
              </p>
            )}
          </div>

          {spoken && (
            <div className="rounded-3xl border bg-accent/50 p-8 shadow-soft">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Spoken summary
              </p>
              <p className="mt-3 text-base leading-relaxed">{spoken}</p>
            </div>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-6 text-2xl font-semibold">Recent expenses</h2>
        {recent.length === 0 ? (
          <div className="rounded-3xl border border-dashed bg-card/60 px-8 py-14 text-center text-sm text-muted-foreground">
            Nothing recorded yet.
          </div>
        ) : (
          <ul className="divide-y overflow-hidden rounded-3xl border bg-card shadow-soft">
            {recent.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-4 px-7 py-5">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{e.category}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatDate(e.date)}</p>
                </div>
                <span className="text-lg font-semibold tabular-nums">
                  {formatAmount(e.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
