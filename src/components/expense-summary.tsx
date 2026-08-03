"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronRight } from "lucide-react";
import type { Expense } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type PeriodType = "daily" | "weekly" | "monthly";

function getPeriodKey(date: Date, type: PeriodType): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");

  switch (type) {
    case "daily":
      return `${y}-${m}-${d}`;
    case "weekly": {
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(date);
      monday.setDate(diff);
      monday.setHours(0, 0, 0, 0);
      return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
    }
    case "monthly":
      return `${y}-${m}`;
  }
}

function formatPeriodLabel(key: string, type: PeriodType): string {
  const date = new Date(key + (type === "monthly" ? "-01" : ""));
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  switch (type) {
    case "daily": {
      if (key === getPeriodKey(today, "daily")) return "Today";
      if (key === getPeriodKey(yesterday, "daily")) return "Yesterday";
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
    case "weekly": {
      const weekStart = new Date(date);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const fmt = (d: Date) =>
        d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      return `${fmt(weekStart)} - ${fmt(weekEnd)}`;
    }
    case "monthly":
      return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }
}

function groupExpenses(expenses: Expense[], type: PeriodType) {
  const groups = new Map<string, Expense[]>();

  for (const expense of expenses) {
    const key = getPeriodKey(new Date(expense.date), type);
    const existing = groups.get(key);
    if (existing) {
      existing.push(expense);
    } else {
      groups.set(key, [expense]);
    }
  }

  return Array.from(groups.entries())
    .map(([key, group]) => {
      const totals: Record<string, number> = {};
      for (const e of group) {
        totals[e.currency] = (totals[e.currency] || 0) + e.amount;
      }
      return {
        key,
        label: formatPeriodLabel(key, type),
        expenses: group,
        totals,
        count: group.length,
      };
    })
    .sort((a, b) => b.key.localeCompare(a.key));
}

function computeOverallTotals(expenses: Expense[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const e of expenses) {
    totals[e.currency] = (totals[e.currency] || 0) + e.amount;
  }
  return totals;
}

export function ExpenseSummary({ expenses }: { expenses: Expense[] }) {
  const [period, setPeriod] = useState<PeriodType>("daily");

  const grouped = useMemo(() => groupExpenses(expenses, period), [expenses, period]);
  const overallTotals = useMemo(() => computeOverallTotals(expenses), [expenses]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold">Summary</h2>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as PeriodType)}>
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="daily" className="flex-1 sm:flex-none">Daily</TabsTrigger>
            <TabsTrigger value="weekly" className="flex-1 sm:flex-none">Weekly</TabsTrigger>
            <TabsTrigger value="monthly" className="flex-1 sm:flex-none">Monthly</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="data-card rounded-xl p-4">
        <p className="data-label">Total spent</p>
        <div className="mt-1 space-y-0.5">
          {Object.entries(overallTotals).map(([currency, amount]) => (
            <p key={currency} className="font-mono tabular-nums text-lg font-medium">
              {formatCurrency(amount as number, currency)}
            </p>
          ))}
        </div>
      </div>

      <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
        {grouped.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No expenses in this period
          </p>
        ) : (
          grouped.map((group) => (
            <div key={group.key} className="card-surface rounded-xl px-4 py-3 transition-all hover:-translate-y-0.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarDays size={14} className="text-muted-foreground" />
                  <span className="text-sm font-medium">{group.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {group.count} {group.count === 1 ? "expense" : "expenses"}
                  </span>
                </div>
                <ChevronRight size={14} className="text-muted-foreground" />
              </div>
              <div className="mt-1.5 space-y-0.5">
                {Object.entries(group.totals).map(([currency, amount]) => (
                  <p key={currency} className="font-mono tabular-nums text-sm font-medium text-foreground/80">
                    {formatCurrency(amount as number, currency)}
                  </p>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
