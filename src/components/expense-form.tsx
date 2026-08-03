"use client";

import { useState, useEffect } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { createExpense, updateExpense, fetchCurrentUser, type Category, type Expense } from "@/lib/api";
import { CURRENCIES, getCurrencySymbol } from "@/lib/currency";

export function ExpenseForm({
  categories,
  onSuccess,
  expense,
  onClose,
  onExpenseCreated,
}: {
  categories: Category[];
  onSuccess: () => void;
  expense?: Expense;
  onClose?: () => void;
  onExpenseCreated?: (expense: Expense) => void;
}) {
  const isEdit = !!expense;
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currency, setCurrency] = useState("IDR");

  useEffect(() => {
    if (!open) return;
    fetchCurrentUser()
      .then((user) => setCurrency((prev) => prev === "IDR" ? (user.defaultCurrency || "IDR") : prev))
      .catch(() => {});
  }, [open]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (expense) {
      setOpen(true);
      setCurrency(expense.currency);
      setError(null);
    }
  }, [expense]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function handleClose() {
    setOpen(false);
    setError(null);
    onClose?.();
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = new FormData(e.currentTarget);
    const amount = parseFloat(form.get("amount") as string);
    const date = form.get("date") as string;
    const merchant = (form.get("merchant") as string).trim();
    const categoryId = form.get("categoryId") as string;
    const notes = (form.get("notes") as string).trim();

    if (isNaN(amount) || amount <= 0) {
      setError("Amount must be a positive number");
      return;
    }
    if (!merchant) {
      setError("Merchant is required");
      return;
    }
    if (!categoryId) {
      setError("Category is required");
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit && expense) {
        await updateExpense(expense.id, {
          amount,
          date,
          merchant,
          categoryId,
          currency,
          notes: notes || undefined,
        });
      } else {
        const created = await createExpense({
          amount,
          date,
          merchant,
          categoryId,
          currency,
          notes: notes || undefined,
        });
        handleClose();
        onSuccess();
        onExpenseCreated?.(created);
        return;
      }
      handleClose();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save expense");
    } finally {
      setSubmitting(false);
    }
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <>
      {!isEdit && (
        <Button onClick={() => setOpen(true)}>
          <Plus size={16} />
          Add Expense
        </Button>
      )}

      <Dialog open={open} onClose={handleClose}>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Expense" : "Add Expense"}</DialogTitle>
          <DialogClose onClick={handleClose} />
        </DialogHeader>

        <form key={expense?.id || "create"} onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1 space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  {getCurrencySymbol(currency)}
                </span>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  defaultValue={expense?.amount || ""}
                  required
                  className="pl-8 font-mono tabular-nums"
                  autoFocus
                />
              </div>
            </div>
            <div className="w-24 space-y-2 sm:w-32">
              <Label htmlFor="currency">Currency</Label>
              <Select
                id="currency"
                name="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                required
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              name="date"
              type="date"
              defaultValue={expense?.date?.split("T")[0] || today}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="merchant">Merchant</Label>
            <Input
              id="merchant"
              name="merchant"
              type="text"
              placeholder="Where did you spend?"
              defaultValue={expense?.merchant || ""}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="categoryId">Category</Label>
            <Select id="categoryId" name="categoryId" required defaultValue={expense?.categoryId || ""}>
              <option value="" disabled>
                Select a category
              </option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input
              id="notes"
              name="notes"
              type="text"
              placeholder="Add a note..."
              defaultValue={expense?.notes || ""}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="flex-1">
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving...
                </>
              ) : (
                isEdit ? "Save Changes" : "Save Expense"
              )}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
