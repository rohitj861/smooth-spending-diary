import { Button } from "@/components/ui/button";
import { formatAmount, formatDate, type Expense } from "@/lib/expenses";

export function ExpenseList({
  expenses,
  onEdit,
  onDelete,
}: {
  expenses: Expense[];
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
}) {
  if (expenses.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed bg-card/60 px-8 py-16 text-center">
        <p className="text-base font-medium">Nothing recorded yet</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Add your first expense and it will appear here.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-4">
      {expenses.map((expense) => (
        <li
          key={expense.id}
          className="group rounded-3xl border bg-card p-6 shadow-soft transition-shadow hover:shadow-lift"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
                  {expense.category}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDate(expense.date)}
                </span>
              </div>
              {expense.note && (
                <p className="mt-3 text-sm text-muted-foreground">{expense.note}</p>
              )}
            </div>
            <div className="flex items-center gap-5">
              <span className="text-xl font-semibold tabular-nums">
                {formatAmount(expense.amount)}
              </span>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-lg text-muted-foreground hover:text-foreground"
                  onClick={() => onEdit(expense)}
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-lg text-muted-foreground hover:text-destructive"
                  onClick={() => onDelete(expense)}
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
