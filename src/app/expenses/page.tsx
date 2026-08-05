"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Receipt, ArrowLeft, Table, Users,
  ShoppingCart, Utensils, Car, Zap, Film, ShoppingBag, Heart, Home, Plane, Repeat, MoreHorizontal,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ExpenseForm } from "@/components/expense-form";
import { BulkExpenseForm } from "@/components/bulk-expense-form";
import { ExpenseSummary } from "@/components/expense-summary";
import { ExpenseActions } from "@/components/expense-actions";
import { ExpenseFilters, defaultFilters, type Filters } from "@/components/expense-filters";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchExpenses, fetchCategories, type Expense, type Category } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import { SplitBillDialog } from "@/components/split-bill-dialog";
import { SplitBillSummary } from "@/components/split-bill-summary";
import { ReceiptScanner } from "@/components/receipt-scanner";
import { ManagePeopleDialog } from "@/components/manage-people-dialog";
import { SplitResultModal } from "@/components/split-result-modal";

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
  "shopping-cart": ShoppingCart,
  utensils: Utensils,
  car: Car,
  zap: Zap,
  film: Film,
  "shopping-bag": ShoppingBag,
  heart: Heart,
  home: Home,
  plane: Plane,
  repeat: Repeat,
  "more-horizontal": MoreHorizontal,
};

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
}

function getUserNetAmount(expense: Expense): number {
  if (!expense.billSplit) return expense.amount;
  const split = expense.billSplit;

  const self = split.participants.find(
    (p) => !p.personId && (p.guestName || "").trim().toLowerCase() === "you"
  );

  if (self) {
    const assigned = split.participants.reduce((sum, p) => sum + p.amountOwed, 0);
    const unassigned = Math.max(0, Math.round((expense.amount - assigned) * 100) / 100);
    return Math.max(0, Math.round((self.amountOwed + unassigned) * 100) / 100);
  }

  if (split.method === "by-item" && expense.receiptItems) {
    try {
      const items = JSON.parse(expense.receiptItems);
      if (Array.isArray(items) && items.length > 0) {
        const itemsTotal = items.reduce((s: number, i: { amount: number }) => s + (i.amount || 0), 0);
        const assignments = split.itemAssignments || [];
        const assignedTotal = assignments.reduce((s, a) => s + a.amount, 0);
        return Math.max(0, Math.round((itemsTotal - assignedTotal) * 100) / 100);
      }
    } catch {
    }
  }

  const othersTotal = split.participants.reduce((sum, p) => sum + p.amountOwed, 0);
  return Math.max(0, Math.round((expense.amount - othersTotal) * 100) / 100);
}

export default function ExpensesPage() {
  const router = useRouter();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mode, setMode] = useState<"list" | "bulk">("list");
  const [viewMode, setViewMode] = useState<"expenses" | "summary">("expenses");
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [splitExpense, setSplitExpense] = useState<Expense | null>(null);
  const [receiptScannerOpen, setReceiptScannerOpen] = useState(false);
  const [managePeopleOpen, setManagePeopleOpen] = useState(false);
  const [viewSplitExpense, setViewSplitExpense] = useState<Expense | null>(null);
  const [editingSplitExpense, setEditingSplitExpense] = useState<Expense | null>(null);
  const [pendingSplitSummaryId, setPendingSplitSummaryId] = useState<string | null>(null);

  const loadData = useCallback(() => {
    setLoadError(null);
    setLoading(true);
    Promise.all([
      fetchExpenses().catch(() => {
        return [] as Expense[];
      }),
      fetchCategories().catch((e) => {
        console.error("Failed to load categories:", e);
        return [] as Category[];
      }),
    ])
      .then(([expensesData, categoriesData]) => {
        setExpenses(expensesData);
        setCategories(categoriesData);
        if (categoriesData.length === 0) {
          setLoadError("Categories could not be loaded. Make sure the backend is running and seeded.");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (pendingSplitSummaryId) {
      const updated = expenses.find((e) => e.id === pendingSplitSummaryId);
      if (updated?.billSplit) {
        setViewSplitExpense(updated);
        setPendingSplitSummaryId(null);
      }
    }
  }, [expenses, pendingSplitSummaryId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      if (filters.dateFrom && expense.date < filters.dateFrom) return false;
      if (filters.dateTo) {
        const endDate = new Date(filters.dateTo);
        endDate.setDate(endDate.getDate() + 1);
        if (new Date(expense.date) >= endDate) return false;
      }
      if (filters.categoryIds.length > 0 && !filters.categoryIds.includes(expense.categoryId)) return false;
      if (filters.merchantQuery) {
        const query = filters.merchantQuery.toLowerCase();
        if (!expense.merchant.toLowerCase().includes(query)) return false;
      }
      return true;
    });
  }, [expenses, filters]);

  const adjustedExpenses = useMemo(() => {
    return filteredExpenses.map((e) => ({
      ...e,
      _userNetAmount: getUserNetAmount(e),
    }));
  }, [filteredExpenses]);

  function handleBulkSuccess() {
    setMode("list");
    loadData();
  }

  function handleSplitComplete() {
    const id = splitExpense?.id || editingSplitExpense?.id || null;
    setSplitExpense(null);
    setEditingSplitExpense(null);
    if (id) setPendingSplitSummaryId(id);
    loadData();
  }

  function handleExpenseCreated(expense: Expense) {
    loadData();
  }

  const showExpenseCount = filters.dateFrom || filters.dateTo || filters.categoryIds.length > 0 || filters.merchantQuery;

  const renderExpenseRow = (expense: Expense) => {
    const netAmount = getUserNetAmount(expense);
    const isSplit = !!expense.billSplit;

    return (
      <div
        key={expense.id}
        className="card-surface rounded-xl px-3.5 py-3 transition-all hover:-translate-y-0.5 sm:px-5 sm:py-4"
      >
        <div className="flex items-start gap-2.5 sm:gap-4">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted sm:size-10">
            {(() => {
              const Icon = CATEGORY_ICONS[expense.category.icon];
              return Icon ? <Icon size={18} /> : <MoreHorizontal size={18} />;
            })()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2 sm:gap-3">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium sm:text-sm">
                  {expense.merchant}
                </p>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-muted-foreground sm:gap-x-2 sm:text-xs">
                  <span>{expense.category.name}</span>
                  <span className="text-muted-foreground/40">&middot;</span>
                  <span>{formatDate(expense.date)}</span>
                  {isSplit && (
                    <>
                      <span className="text-muted-foreground/40">&middot;</span>
                      <span className="inline-flex items-center gap-1 text-primary/80">
                        <Users size={11} />
                        {expense.billSplit!.participants.length + 1}
                      </span>
                    </>
                  )}
                  {expense.notes && (
                    <>
                      <span className="text-muted-foreground/40">&middot;</span>
                      <span className="min-w-0 max-w-full truncate">{expense.notes}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="shrink-0 text-right">
                {isSplit ? (
                  <div className="flex flex-col items-end gap-0.5 sm:flex-row sm:items-baseline sm:gap-1.5">
                    <span className="font-mono tabular-nums text-[11px] text-muted-foreground line-through sm:text-xs">
                      {formatCurrency(expense.amount, expense.currency)}
                    </span>
                    <span className="font-mono tabular-nums text-[13px] font-medium text-foreground sm:text-sm">
                      {formatCurrency(netAmount, expense.currency)}
                    </span>
                  </div>
                ) : (
                  <p className="font-mono tabular-nums text-[13px] font-medium sm:text-sm">
                    -{formatCurrency(expense.amount, expense.currency)}
                  </p>
                )}
              </div>
            </div>
            {isSplit && expense.billSplit && (
              <div className="mt-2">
                <SplitBillSummary
                  split={expense.billSplit}
                  currency={expense.currency}
                  onViewDetails={() => setViewSplitExpense(expense)}
                />
              </div>
            )}
          </div>
          <ExpenseActions
            expense={expense}
            onEdit={() => setEditingExpense(expense)}
            onDeleted={loadData}
            onSplit={isSplit ? undefined : () => setSplitExpense(expense)}
            onViewSplit={isSplit ? () => setViewSplitExpense(expense) : undefined}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="page-surface min-h-screen">
      <div className="mx-auto max-w-screen-xl px-6 py-8 lg:py-12">
        {loadError && (
          <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {loadError}
          </div>
        )}

        {mode === "bulk" ? (
          <BulkExpenseForm
            categories={categories}
            onSuccess={handleBulkSuccess}
            onCancel={() => setMode("list")}
          />
        ) : (
          <>
            <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Go back"
                >
                  <ArrowLeft size={16} />
                </button>
                <div>
                  <h1 className="text-2xl font-semibold">Expenses</h1>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Track every expense, in any currency
                  </p>
                </div>
              </div>
              <div className="flex gap-2 self-start sm:self-auto">
                <Button variant="outline" onClick={() => setManagePeopleOpen(true)}>
                  <Users size={16} />
                  <span className="hidden sm:inline">People</span>
                </Button>
                <Button variant="outline" onClick={() => setReceiptScannerOpen(true)}>
                  <Receipt size={16} />
                  <span className="hidden sm:inline">Split Bill</span>
                </Button>
                <Button variant="outline" onClick={() => setMode("bulk")}>
                  <Table size={16} />
                  <span className="hidden sm:inline">Bulk Entry</span>
                </Button>
                <ExpenseForm categories={categories} onSuccess={loadData} />
              </div>
            </div>

            <div className="mb-6">
              <ExpenseFilters
                categories={categories}
                filters={filters}
                onChange={setFilters}
              />
            </div>

            <div className="mb-6 lg:hidden">
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "expenses" | "summary")}>
                <TabsList className="w-full">
                  <TabsTrigger value="expenses" className="flex-1">Expenses</TabsTrigger>
                  <TabsTrigger value="summary" className="flex-1">Summary</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="flex flex-col gap-8 lg:flex-row">
              <div className={`${viewMode === "summary" ? "hidden" : ""} lg:block lg:w-3/5`}>
                {loading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
                    ))}
                  </div>
                ) : filteredExpenses.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12 text-center sm:py-24">
                    <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-primary/10">
                      <Receipt size={24} className="text-primary" />
                    </div>
                    <h2 className="text-lg font-semibold mb-1">
                      {expenses.length === 0 ? "No expenses yet" : "No matching expenses"}
                    </h2>
                    <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                      {expenses.length === 0
                        ? "Start tracking your spending by adding your first expense."
                        : "Try adjusting your filters to see more results."}
                    </p>
                    <div className="flex gap-2">
                      <ExpenseForm categories={categories} onSuccess={loadData} />
                      <Button variant="outline" onClick={() => setMode("bulk")}>
                        <Table size={16} />
                        <span className="hidden sm:inline">Bulk Entry</span>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 pb-4">
                    <p className="text-sm text-muted-foreground">
                      {showExpenseCount
                        ? `${filteredExpenses.length} of ${expenses.length} expense${expenses.length !== 1 ? "s" : ""}`
                        : `${filteredExpenses.length} expense${filteredExpenses.length !== 1 ? "s" : ""}`}
                    </p>
                    {filteredExpenses.map(renderExpenseRow)}
                  </div>
                )}
              </div>

              <div className={`${viewMode === "expenses" ? "hidden" : ""} lg:block lg:w-2/5`}>
                <div className="lg:sticky lg:top-8">
                  <ExpenseSummary
                    expenses={adjustedExpenses.map((e) => {
                      const { _userNetAmount, ...rest } = e;
                      return { ...rest, amount: _userNetAmount };
                    })}
                  />
                </div>
              </div>
            </div>
          </>
        )}

        <ExpenseForm
          key={editingExpense?.id || "edit-none"}
          categories={categories}
          expense={editingExpense || undefined}
          onSuccess={loadData}
          onClose={() => setEditingExpense(null)}
          onExpenseCreated={handleExpenseCreated}
        />

        <SplitBillDialog
          open={!!splitExpense}
          onClose={() => setSplitExpense(null)}
          expense={splitExpense}
          onSuccess={handleSplitComplete}
        />

        <SplitBillDialog
          open={!!editingSplitExpense}
          onClose={() => setEditingSplitExpense(null)}
          expense={editingSplitExpense}
          onSuccess={handleSplitComplete}
          mode="edit"
        />

        <SplitResultModal
          open={!!viewSplitExpense}
          onClose={() => setViewSplitExpense(null)}
          expense={viewSplitExpense}
          onEdit={(() => {
            if (!viewSplitExpense?.billSplit) return undefined;
            const createdAt = new Date(viewSplitExpense.billSplit.createdAt).getTime();
            const now = Date.now();
            const isWithinWindow = now - createdAt < 24 * 60 * 60 * 1000;
            if (!isWithinWindow) return undefined;
            return () => {
              const e = viewSplitExpense;
              setViewSplitExpense(null);
              setEditingSplitExpense(e);
            };
          })()}
        />

        <ReceiptScanner
          open={receiptScannerOpen}
          onClose={() => setReceiptScannerOpen(false)}
          categories={categories}
          onExpenseCreated={handleExpenseCreated}
        />

        <ManagePeopleDialog
          open={managePeopleOpen}
          onClose={() => setManagePeopleOpen(false)}
        />
      </div>
    </div>
  );
}
