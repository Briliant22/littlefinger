"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Plus, Trash2, Loader2, ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createExpensesBulk, fetchCurrentUser, type Category } from "@/lib/api";
import { CURRENCIES, getCurrencySymbol, formatCurrency } from "@/lib/currency";

interface BulkRow {
  id: string;
  amount: string;
  currency: string;
  date: string;
  merchant: string;
  categoryId: string;
  notes: string;
}

interface RowErrors {
  amount?: string;
  merchant?: string;
  categoryId?: string;
}

export function BulkExpenseForm({
  categories,
  onSuccess,
  onCancel,
}: {
  categories: Category[];
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const today = new Date().toISOString().split("T")[0];
  const [defaultCurrency, setDefaultCurrency] = useState("IDR");
  const [rows, setRows] = useState<BulkRow[]>([]);
  const [errors, setErrors] = useState<Record<string, RowErrors>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCurrentUser()
      .then((user) => {
        const currency = user.defaultCurrency || "IDR";
        setDefaultCurrency(currency);
        setRows([
          { id: crypto.randomUUID(), amount: "", currency, date: today, merchant: "", categoryId: "", notes: "" },
        ]);
      })
      .catch(() => {
        setRows([
          { id: crypto.randomUUID(), amount: "", currency: "IDR", date: today, merchant: "", categoryId: "", notes: "" },
        ]);
      });
  }, [today]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  function addRow() {
    setRows((prev) => [
      ...prev,
      { id: crypto.randomUUID(), amount: "", currency: defaultCurrency, date: today, merchant: "", categoryId: "", notes: "" },
    ]);
  }

  function removeRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function updateRow(id: string, field: keyof BulkRow, value: string) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
    if (errors[id]?.[field as keyof RowErrors]) {
      setErrors((prev) => ({
        ...prev,
        [id]: { ...prev[id], [field]: undefined },
      }));
    }
  }

  function validateRow(row: BulkRow): RowErrors {
    const rowErrors: RowErrors = {};
    const amount = parseFloat(row.amount);
    if (isNaN(amount) || amount <= 0) rowErrors.amount = "Required";
    if (!row.merchant.trim()) rowErrors.merchant = "Required";
    if (!row.categoryId) rowErrors.categoryId = "Required";
    return rowErrors;
  }

  function handleFieldBlur(row: BulkRow, field: keyof RowErrors) {
    const rowErrors = validateRow(row);
    if (rowErrors[field]) {
      setErrors((prev) => ({
        ...prev,
        [row.id]: { ...prev[row.id], [field]: rowErrors[field] },
      }));
    } else {
      setErrors((prev) => {
        const current = prev[row.id];
        if (!current) return prev;
        const updated = { ...current, [field]: undefined };
        const hasRemaining = Object.values(updated).some(Boolean);
        if (hasRemaining) {
          return { ...prev, [row.id]: updated };
        }
        const next = { ...prev };
        delete next[row.id];
        return next;
      });
    }
  }

  const validateAll = useCallback(() => {
    const allErrors: Record<string, RowErrors> = {};
    let firstErrorId: string | null = null;

    for (const row of rows) {
      const rowErrors = validateRow(row);
      if (Object.keys(rowErrors).length > 0) {
        allErrors[row.id] = rowErrors;
        if (!firstErrorId) firstErrorId = row.id;
      }
    }

    setErrors(allErrors);
    return firstErrorId;
  }, [rows]);

  async function handleSubmit() {
    setSubmitError(null);
    const firstErrorId = validateAll();
    if (firstErrorId) {
      const el = document.getElementById(`row-${firstErrorId}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setSubmitting(true);
    try {
      await createExpensesBulk({
        expenses: rows.map((r) => ({
          amount: parseFloat(r.amount),
          date: r.date,
          merchant: r.merchant.trim(),
          categoryId: r.categoryId,
          currency: r.currency,
          notes: r.notes.trim() || undefined,
        })),
      });
      onSuccess();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to create expenses");
    } finally {
      setSubmitting(false);
    }
  }

  const totalsByCurrency = rows.reduce<Record<string, number>>((acc, row) => {
    const amount = parseFloat(row.amount);
    if (!isNaN(amount) && amount > 0) {
      acc[row.currency] = (acc[row.currency] || 0) + amount;
    }
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onCancel} aria-label="Back to list">
          <ArrowLeft size={16} />
        </Button>
        <div>
          <h2 className="text-lg font-semibold">Bulk Entry</h2>
          <p className="text-sm text-muted-foreground">
            Add multiple expenses at once
          </p>
        </div>
      </div>

      {/* Desktop table */}
      <div ref={tableRef} className="hidden overflow-x-auto rounded-lg border lg:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="w-[130px] px-3 py-2.5 text-left font-medium text-muted-foreground">Amount</th>
              <th className="w-[90px] px-3 py-2.5 text-left font-medium text-muted-foreground">Currency</th>
              <th className="w-[150px] px-3 py-2.5 text-left font-medium text-muted-foreground">Date</th>
              <th className="min-w-[140px] px-3 py-2.5 text-left font-medium text-muted-foreground">Merchant</th>
              <th className="w-[150px] px-3 py-2.5 text-left font-medium text-muted-foreground">Category</th>
              <th className="w-[140px] px-3 py-2.5 text-left font-medium text-muted-foreground">Notes</th>
              <th className="w-10 px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-12 text-center text-sm text-muted-foreground">
                  No entries yet. Click &quot;Add Row&quot; to begin.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const rowErrors = errors[row.id] || {};
                return (
                  <tr
                    key={row.id}
                    id={`row-${row.id}`}
                    className="border-b last:border-b-0 transition-colors hover:bg-muted/30"
                  >
                    <td className="px-3 py-1.5">
                      <div className="relative">
                        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                          {getCurrencySymbol(row.currency)}
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="0.00"
                          value={row.amount}
                          onChange={(e) => updateRow(row.id, "amount", e.target.value)}
                          onBlur={() => handleFieldBlur(row, "amount")}
                          className={`flex h-8 w-full rounded-md border bg-background pl-7 pr-2.5 py-1 text-sm font-mono tabular-nums shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 ${
                            rowErrors.amount ? "border-destructive" : "border-input"
                          }`}
                        />
                      </div>
                      {rowErrors.amount && (
                        <p className="mt-0.5 text-xs text-destructive">{rowErrors.amount}</p>
                      )}
                    </td>
                    <td className="px-3 py-1.5">
                      <select
                        value={row.currency}
                        onChange={(e) => updateRow(row.id, "currency", e.target.value)}
                        className="flex h-8 w-full rounded-md border border-input bg-background px-2.5 py-1 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      >
                        {CURRENCIES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.code}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        type="date"
                        value={row.date}
                        onChange={(e) => updateRow(row.id, "date", e.target.value)}
                        className="flex h-8 w-full rounded-md border border-input bg-background px-2.5 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        type="text"
                        placeholder="Where?"
                        value={row.merchant}
                        onChange={(e) => updateRow(row.id, "merchant", e.target.value)}
                        onBlur={() => handleFieldBlur(row, "merchant")}
                        className={`flex h-8 w-full rounded-md border bg-background px-2.5 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 ${
                          rowErrors.merchant ? "border-destructive" : "border-input"
                        }`}
                      />
                      {rowErrors.merchant && (
                        <p className="mt-0.5 text-xs text-destructive">{rowErrors.merchant}</p>
                      )}
                    </td>
                    <td className="px-3 py-1.5">
                      <select
                        value={row.categoryId}
                        onChange={(e) => updateRow(row.id, "categoryId", e.target.value)}
                        onBlur={() => handleFieldBlur(row, "categoryId")}
                        className={`flex h-8 w-full rounded-md border bg-background px-2.5 py-1 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 ${
                          rowErrors.categoryId ? "border-destructive" : "border-input"
                        }`}
                      >
                        <option value="">Select</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                      {rowErrors.categoryId && (
                        <p className="mt-0.5 text-xs text-destructive">{rowErrors.categoryId}</p>
                      )}
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        type="text"
                        placeholder="Notes..."
                        value={row.notes}
                        onChange={(e) => updateRow(row.id, "notes", e.target.value)}
                        className="flex h-8 w-full rounded-md border border-input bg-background px-2.5 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <button
                        type="button"
                        onClick={() => removeRow(row.id)}
                        className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                        disabled={rows.length <= 1}
                        aria-label="Delete row"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile card rows */}
      <div className="space-y-3 lg:hidden">
        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">
            No entries yet. Click &quot;Add Row&quot; to begin.
          </div>
        ) : (
          rows.map((row, index) => {
            const rowErrors = errors[row.id] || {};
            return (
              <div key={row.id} id={`row-${row.id}`} className="card-surface rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Entry {index + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeRow(row.id)}
                    className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                    disabled={rows.length <= 1}
                    aria-label="Delete row"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Amount</label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        {getCurrencySymbol(row.currency)}
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="0.00"
                        value={row.amount}
                        onChange={(e) => updateRow(row.id, "amount", e.target.value)}
                        onBlur={() => handleFieldBlur(row, "amount")}
                        className={`flex h-8 w-full rounded-md border bg-background pl-6 pr-2.5 py-1 text-sm font-mono tabular-nums shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 ${
                          rowErrors.amount ? "border-destructive" : "border-input"
                        }`}
                      />
                    </div>
                    {rowErrors.amount && (
                      <p className="text-xs text-destructive">{rowErrors.amount}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Currency</label>
                    <select
                      value={row.currency}
                      onChange={(e) => updateRow(row.id, "currency", e.target.value)}
                      className="flex h-8 w-full rounded-md border border-input bg-background px-2.5 py-1 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.code}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Date</label>
                    <input
                      type="date"
                      value={row.date}
                      onChange={(e) => updateRow(row.id, "date", e.target.value)}
                      className="flex h-8 w-full rounded-md border border-input bg-background px-2.5 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Merchant</label>
                    <input
                      type="text"
                      placeholder="Where?"
                      value={row.merchant}
                      onChange={(e) => updateRow(row.id, "merchant", e.target.value)}
                      onBlur={() => handleFieldBlur(row, "merchant")}
                      className={`flex h-8 w-full rounded-md border bg-background px-2.5 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 ${
                        rowErrors.merchant ? "border-destructive" : "border-input"
                      }`}
                    />
                    {rowErrors.merchant && (
                      <p className="text-xs text-destructive">{rowErrors.merchant}</p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Category</label>
                    <select
                      value={row.categoryId}
                      onChange={(e) => updateRow(row.id, "categoryId", e.target.value)}
                      onBlur={() => handleFieldBlur(row, "categoryId")}
                      className={`flex h-8 w-full rounded-md border bg-background px-2.5 py-1 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 ${
                        rowErrors.categoryId ? "border-destructive" : "border-input"
                      }`}
                    >
                      <option value="">Select</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                    {rowErrors.categoryId && (
                      <p className="text-xs text-destructive">{rowErrors.categoryId}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Notes</label>
                    <input
                      type="text"
                      placeholder="Notes..."
                      value={row.notes}
                      onChange={(e) => updateRow(row.id, "notes", e.target.value)}
                      className="flex h-8 w-full rounded-md border border-input bg-background px-2.5 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={addRow}>
          <Plus size={14} />
          Add Row
        </Button>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {rows.length > 0 && (
            <>
              <span>{rows.length} expense{rows.length !== 1 ? "s" : ""}</span>
              {Object.entries(totalsByCurrency).length > 0 && (
                <>
                  <span className="text-muted-foreground/40">&middot;</span>
                  <span>
                    Total:{" "}
                    {Object.entries(totalsByCurrency)
                      .map(([cur, total]) => formatCurrency(total, cur))
                      .join(" + ")}
                  </span>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {submitError && (
        <p className="text-sm text-destructive">{submitError}</p>
      )}

      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={submitting || rows.length === 0} className="flex-1">
          {submitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save size={16} />
              Save All
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
