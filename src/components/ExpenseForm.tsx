import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIES, todayISO, type Expense } from "@/lib/expenses";

export type ExpenseDraft = {
  amount: number;
  category: string;
  date: string;
  note: string | null;
};

export function ExpenseForm({
  expense,
  submitting,
  onSubmit,
  onCancel,
}: {
  expense?: Expense;
  submitting: boolean;
  onSubmit: (draft: ExpenseDraft) => void;
  onCancel?: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>("Food");
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");

  useEffect(() => {
    if (expense) {
      setAmount(String(expense.amount));
      setCategory(expense.category);
      setDate(expense.date);
      setNote(expense.note ?? "");
    }
  }, [expense]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    onSubmit({
      amount: Math.round(parsed * 100) / 100,
      category,
      date,
      note: note.trim() ? note.trim() : null,
    });
    if (!expense) {
      setAmount("");
      setNote("");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="h-11 rounded-xl"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger id="category" className="h-11 rounded-xl">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="date">Date</Label>
        <Input
          id="date"
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-11 rounded-xl"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="note">Note (optional)</Label>
        <Textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What was this for?"
          rows={2}
          className="rounded-xl"
        />
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={submitting} className="h-11 flex-1 rounded-xl">
          {submitting ? "Saving…" : expense ? "Save changes" : "Add expense"}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            className="h-11 rounded-xl"
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
