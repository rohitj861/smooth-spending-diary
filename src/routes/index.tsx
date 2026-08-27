import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { AuthCard } from "@/components/AuthCard";
import { ExpenseForm, type ExpenseDraft } from "@/components/ExpenseForm";
import { ExpenseList } from "@/components/ExpenseList";
import { Dashboard } from "@/components/Dashboard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    const finish = (next: Session | null) => {
      if (!active) return;
      setSession(next);
      setReady(true);
    };

    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      finish(next);
    });

    void supabase.auth
      .getSession()
      .then(({ data: { session: current } }) => finish(current))
      .catch((error: unknown) => {
        console.error("Unable to restore the saved session", error);
        finish(null);
      });

    // A blocked storage or network request must never leave the app on an
    // empty screen. Signed-in state can still arrive through the auth listener.
    const timeout = window.setTimeout(() => finish(null), 4_000);

    return () => {
      active = false;
      window.clearTimeout(timeout);
      data.subscription.unsubscribe();
    };
  }, []);

  if (!ready) {
    return (
      <main className="grid min-h-screen place-items-center bg-background px-6">
        <div className="text-center" role="status" aria-live="polite">
          <div className="mx-auto grid h-11 w-11 place-items-center rounded-xl border border-primary/30 text-lg font-semibold text-primary shadow-soft">
            ₽
          </div>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
            Pennywise
          </p>
          <p className="mt-2 text-sm text-muted-foreground">Opening your account…</p>
        </div>
      </main>
    );
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
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-primary">Pennywise</p>
            <p className="mt-1 text-sm text-muted-foreground">{email}</p>
          </div>
          <Button variant="ghost" className="rounded-xl" onClick={signOut}>
            Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-16">
        <section className="mb-10">
          <h1 className="text-5xl font-bold tracking-tight">Your spending</h1>
          <p className="mt-4 text-sm text-muted-foreground">
            {expenses.length} {expenses.length === 1 ? "entry" : "entries"} · total{" "}
            <span className="font-medium text-foreground">{formatAmount(total)}</span>
          </p>
        </section>

        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="mb-12 h-11 rounded-2xl p-1">
            <TabsTrigger value="dashboard" className="rounded-xl px-5">
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="expenses" className="rounded-xl px-5">
              Expenses
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : (
              <Dashboard expenses={expenses} />
            )}
          </TabsContent>

          <TabsContent value="expenses">
            <div className="space-y-16">
              <section className="rounded-3xl border bg-card p-8 shadow-soft">
                <h2 className="mb-6 text-2xl font-semibold">Add an expense</h2>
                <ExpenseForm
                  submitting={addMutation.isPending}
                  onSubmit={(draft) => addMutation.mutate(draft)}
                />
              </section>

              <section>
                <h2 className="mb-6 text-2xl font-semibold">All expenses</h2>
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
            </div>
          </TabsContent>
        </Tabs>
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
