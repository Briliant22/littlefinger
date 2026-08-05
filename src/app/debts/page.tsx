"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { ArrowLeft, Check, CheckCircle2, ChevronDown, Circle, HandCoins, Receipt, Trash2, Loader2, User, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DebtForm } from "@/components/debt-form";
import { fetchDebts, fetchCategories, deleteDebt, toggleManualDebtPaid, toggleParticipantPaid, type Debt, type Category } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReceiptScanner } from "@/components/receipt-scanner";
import { ManagePeopleDialog } from "@/components/manage-people-dialog";

type Filter = "all" | "outstanding" | "paid";
type ViewMode = "debts" | "persons";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: new Date(dateStr).getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
}

export default function DebtsPage() {
  const router = useRouter();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("outstanding");
  const [viewMode, setViewMode] = useState<ViewMode>("debts");
  const [managePeopleOpen, setManagePeopleOpen] = useState(false);
  const [receiptScannerOpen, setReceiptScannerOpen] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedPerson, setExpandedPerson] = useState<string | null>(null);
  const [resolvingAll, setResolvingAll] = useState(false);

  const loadData = useCallback(() => {
    setError(null);
    setLoading(true);
    fetchDebts()
      .then(setDebts)
      .catch(() => setError("Failed to load debts"))
      .finally(() => setLoading(false));
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    loadData();
    fetchCategories().then(setCategories).catch(() => {});
  }, [loadData]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const outstanding = debts.filter((d) => !d.paid);
  const totals: Record<string, number> = {};
  for (const d of outstanding) {
    totals[d.currency] = (totals[d.currency] || 0) + d.amount;
  }

  const filtered = debts.filter((d) => {
    if (filter === "outstanding") return !d.paid;
    if (filter === "paid") return d.paid;
    return true;
  });

  const perPerson = useMemo(() => {
    const map = new Map<string, { amounts: Record<string, number>; debts: Debt[] }>();
    for (const d of debts) {
      if (d.paid) continue;
      const entry = map.get(d.personName) || { amounts: {}, debts: [] };
      entry.amounts[d.currency] = (entry.amounts[d.currency] || 0) + d.amount;
      entry.debts.push(d);
      map.set(d.personName, entry);
    }
    const sum = (amounts: Record<string, number>) =>
      Object.values(amounts).reduce((s, v) => s + v, 0);
    return Array.from(map.entries())
      .map(([name, entry]) => ({ name, amounts: entry.amounts, debts: entry.debts }))
      .sort((a, b) => sum(b.amounts) - sum(a.amounts));
  }, [debts]);

  async function handleTogglePaid(debt: Debt) {
    if (togglingId) return;
    setTogglingId(debt.id);
    try {
      if (debt.source === "bill" && debt.billSplitId) {
        await toggleParticipantPaid(debt.billSplitId, debt.id);
      } else {
        await toggleManualDebtPaid(debt.id);
      }
      await loadData();
    } catch {
      setError("Failed to update debt status");
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await deleteDebt(id);
      await loadData();
    } catch {
      setError("Failed to delete debt");
    } finally {
      setDeletingId(null);
    }
  }

  async function resolveAllPaid(personDebts: Debt[]) {
    if (resolvingAll) return;
    setResolvingAll(true);
    setError(null);
    try {
      for (const d of personDebts) {
        if (d.source === "bill" && d.billSplitId) {
          await toggleParticipantPaid(d.billSplitId, d.id);
        } else {
          await toggleManualDebtPaid(d.id);
        }
      }
      await loadData();
    } catch {
      setError("Failed to update debts");
    } finally {
      setResolvingAll(false);
    }
  }

  return (
    <div className="page-surface min-h-screen">
      <div className="mx-auto max-w-screen-xl px-6 py-8 lg:py-12">
        {error && (
          <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

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
              <h1 className="text-2xl font-semibold">I Owe You</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Money others owe you from split bills and manual debts
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 self-start sm:self-auto">
            <Button variant="outline" onClick={() => setManagePeopleOpen(true)}>
              <Users size={16} />
              <span className="hidden sm:inline">People</span>
            </Button>
            <Button variant="outline" onClick={() => setReceiptScannerOpen(true)}>
              <Receipt size={16} />
              <span className="hidden sm:inline">Split Bill</span>
            </Button>
            <DebtForm onCreated={loadData} />
          </div>
        </div>

        <div className="mb-6">
          <div className="data-card rounded-xl p-4">
            <p className="data-label">Total owed to you</p>
            <div className="mt-1 space-y-0.5">
              {Object.entries(totals).length === 0 ? (
                <p className="font-mono tabular-nums text-lg font-medium text-muted-foreground">
                  {formatCurrency(0, "IDR")}
                </p>
              ) : (
                Object.entries(totals).map(([currency, amount]) => (
                  <p key={currency} className="font-mono tabular-nums text-lg font-medium">
                    {formatCurrency(amount as number, currency)}
                  </p>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="mb-6 lg:hidden">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList className="w-full">
              <TabsTrigger value="debts" className="flex-1">Debts</TabsTrigger>
              <TabsTrigger value="persons" className="flex-1">By person</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex flex-col gap-8 lg:flex-row">
          <div className={`${viewMode === "persons" ? "hidden" : ""} animate-slide-in-left lg:block lg:w-3/5`}>
            <div className={`mb-4 lg:block ${viewMode === "persons" ? "hidden" : ""}`}>
              <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
                <TabsList className="w-full sm:w-auto">
                  <TabsTrigger value="outstanding" className="flex-1 sm:flex-none">Outstanding</TabsTrigger>
                  <TabsTrigger value="paid" className="flex-1 sm:flex-none">Paid</TabsTrigger>
                  <TabsTrigger value="all" className="flex-1 sm:flex-none">All</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12 text-center sm:py-16">
                <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-primary/10">
                  <HandCoins size={24} className="text-primary" />
                </div>
                <h2 className="text-lg font-semibold mb-1">
                  {debts.length === 0 ? "No debts yet" : "Nothing here"}
                </h2>
                <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                  {debts.length === 0
                    ? "Split a bill or record a manual debt to start tracking who owes you money."
                    : filter === "paid"
                      ? "No settled debts yet."
                      : "No outstanding debts right now."}
                </p>
                <DebtForm onCreated={loadData} />
              </div>
            ) : (
              <div className="space-y-3 pb-4">
                <p className="text-sm text-muted-foreground">
                  {filtered.length} debt{filtered.length !== 1 ? "s" : ""}
                </p>
                {filtered.map((debt) => (
                  <div key={debt.id} className="card-surface rounded-xl p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
                          <User size={16} className="text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{debt.personName}</p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-muted-foreground sm:gap-x-2 sm:text-xs">
                            {debt.source === "bill" ? (
                              <>
                                <span className="inline-flex items-center gap-1">
                                  <Receipt size={11} />
                                  {debt.merchant}
                                </span>
                                <span className="text-muted-foreground/40">&middot;</span>
                                <span>Bill split</span>
                              </>
                            ) : (
                              <>
                                <span>Manual</span>
                                {debt.note && (
                                  <>
                                    <span className="text-muted-foreground/40">&middot;</span>
                                    <span className="min-w-0 max-w-full truncate">{debt.note}</span>
                                  </>
                                )}
                              </>
                            )}
                            <span className="text-muted-foreground/40">&middot;</span>
                            <span>{formatDate(debt.createdAt)}</span>
                          </div>
                        </div>
                      </div>

                      <p className={`shrink-0 font-mono tabular-nums text-sm font-medium ${debt.paid ? "text-muted-foreground line-through" : ""}`}>
                        {formatCurrency(debt.amount, debt.currency)}
                      </p>

                      <div className="flex shrink-0 gap-1.5 sm:ml-auto">
                        <Button
                          variant={debt.paid ? "secondary" : "outline"}
                          size="sm"
                          onClick={() => handleTogglePaid(debt)}
                          disabled={!!togglingId}
                          className="h-8 flex-1 gap-1.5 sm:flex-none"
                        >
                          {togglingId === debt.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : debt.paid ? (
                            <CheckCircle2 size={14} className="text-primary" />
                          ) : (
                            <Circle size={14} />
                          )}
                          <span>{debt.paid ? "Paid" : "Mark paid"}</span>
                        </Button>
                        {debt.source === "manual" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(debt.id)}
                            disabled={!!deletingId}
                            className="h-8 px-2 text-muted-foreground hover:text-destructive"
                            aria-label="Delete debt"
                          >
                            {deletingId === debt.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Trash2 size={14} />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={`${viewMode === "debts" ? "hidden" : ""} animate-slide-in-right lg:block lg:w-2/5`}>
            <div className="lg:sticky lg:top-8">
              <div className="space-y-5">
                <h2 className="text-lg font-semibold">Outstanding by person</h2>
                <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                  {perPerson.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      No outstanding debts
                    </p>
                  ) : (
                    perPerson.map((p) => (
                      <div key={p.name} className="card-surface rounded-xl px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setExpandedPerson((cur) => (cur === p.name ? null : p.name))}
                          className="flex w-full items-center gap-3 text-left"
                        >
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                            <User size={14} className="text-muted-foreground" />
                          </div>
                          <span className="min-w-0 flex-1 truncate text-sm font-medium">{p.name}</span>
                          <div className="shrink-0 text-right">
                            {Object.entries(p.amounts).map(([currency, amount]) => (
                              <p key={currency} className="font-mono tabular-nums text-sm font-medium">
                                {formatCurrency(amount, currency)}
                              </p>
                            ))}
                          </div>
                          <ChevronDown
                            size={16}
                            className={`shrink-0 text-muted-foreground transition-transform ${expandedPerson === p.name ? "rotate-180" : ""}`}
                          />
                        </button>

                        <div
                          className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${expandedPerson === p.name ? "[grid-template-rows:1fr]" : "[grid-template-rows:0fr]"}`}
                        >
                          <div className="min-h-0 overflow-hidden">
                            <div className="mt-3 space-y-3 border-t border-border pt-3">
                              <div className="space-y-2">
                                {p.debts.map((debt) => (
                                  <div key={debt.id} className="flex items-center justify-between gap-2">
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-medium">
                                        {debt.source === "bill" ? debt.merchant : (debt.note || "Manual debt")}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {formatDate(debt.createdAt)}
                                        <span className="text-muted-foreground/40">&middot;</span>
                                        {debt.source === "bill" ? "Bill split" : "Manual"}
                                      </p>
                                    </div>
                                    <p className="shrink-0 font-mono tabular-nums text-sm font-medium">
                                      {formatCurrency(debt.amount, debt.currency)}
                                    </p>
                                  </div>
                                ))}
                              </div>
                              <Button
                                size="sm"
                                variant="secondary"
                                className="w-full"
                                onClick={() => resolveAllPaid(p.debts)}
                                disabled={resolvingAll}
                              >
                                {resolvingAll ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <Check size={14} className="text-primary" />
                                )}
                                Mark all paid
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <ReceiptScanner
          open={receiptScannerOpen}
          onClose={() => setReceiptScannerOpen(false)}
          categories={categories}
          onExpenseCreated={loadData}
        />

        <ManagePeopleDialog
          open={managePeopleOpen}
          onClose={() => setManagePeopleOpen(false)}
        />
      </div>
    </div>
  );
}