import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { AuthCard } from "@/components/AuthCard";
import { ExpenseForm, type ExpenseDraft } from "@/components/ExpenseForm";
import { ExpenseList } from "@/components/ExpenseList";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatAmount, type Expense } from "@/lib/expenses";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pennywise — Calm Personal Expense Tracker" },
      {
        name: "description",
        content:
          "Pennywise is a calm, private expense tracker: log what you spend by category, add notes, and keep every entry saved to your account.",
      },
      { property: "og:title", content: "Pennywise — Calm Personal Expense Tracker" },
      {
        property: "og:description",
        content:
          "Log expenses by category with notes and dates. Simple, private, and saved to your account.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setReady(true);
    });
    supabase.auth.getSession().then(({ data: { session: current } }) => {
      setSession(current);
      setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (!ready) {
    return <div className="min-h-screen bg-background" />;
  }

  if (!session) return <AuthCard />;

  return <Tracker email={session.user.email ?? ""} />;
}

function Tracker({ email }: { email: string }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Expense | null>(null);

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["expenses"],
    queryFn: async (): Promise<Expense[]> => {
      const { data, error } = await supabase
        .from("expenses")
        .select("id, amount, category, date, note, created_at")
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) => ({ ...row, amount: Number(row.amount) }));
    },
  });

  const total = useMemo(
    () => expenses.reduce((sum, e) => sum + e.amount, 0),
    [expenses],
  );

  const addMutation = useMutation({
    mutationFn: async (draft: ExpenseDraft) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("You are signed out.");
      const { error } = await supabase.from("expenses").insert({ ...draft, user_id: userId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Expense added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, draft }: { id: string; draft: ExpenseDraft }) => {
      const { error } = await supabase.from("expenses").update(draft).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      setEditing(null);
      toast.success("Expense updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Expense deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
  }

  return (
    <div className="min-h-screen">
      <header className="border-b bg-card/50">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-primary">Pennywise</p>
            <p className="mt-1 text-sm text-muted-foreground">{email}</p>
          </div>
          <Button variant="ghost" className="rounded-xl" onClick={signOut}>
            Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-14">
        <section className="mb-12">
          <h1 className="text-4xl font-semibold">Your spending</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {expenses.length} {expenses.length === 1 ? "entry" : "entries"} · total{" "}
            <span className="font-medium text-foreground">{formatAmount(total)}</span>
          </p>
        </section>

        <section className="mb-14 rounded-3xl border bg-card p-8 shadow-soft">
          <h2 className="mb-6 text-lg font-semibold">Add an expense</h2>
          <ExpenseForm
            submitting={addMutation.isPending}
            onSubmit={(draft) => addMutation.mutate(draft)}
          />
        </section>

        <section>
          <h2 className="mb-6 text-lg font-semibold">Recent expenses</h2>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <ExpenseList
              expenses={expenses}
              onEdit={setEditing}
              onDelete={(expense) => deleteMutation.mutate(expense.id)}
            />
          )}
        </section>
      </main>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="rounded-3xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit expense</DialogTitle>
          </DialogHeader>
          {editing && (
            <ExpenseForm
              expense={editing}
              submitting={updateMutation.isPending}
              onSubmit={(draft) => updateMutation.mutate({ id: editing.id, draft })}
              onCancel={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
