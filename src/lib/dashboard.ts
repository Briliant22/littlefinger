import type { Expense, Debt } from "@/lib/api";

export function getUserNetAmount(expense: Expense): number {
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

export function detectPrimaryCurrency(expenses: Expense[], fallback: string): string {
  const counts = new Map<string, number>();
  for (const e of expenses) {
    counts.set(e.currency, (counts.get(e.currency) || 0) + 1);
  }
  if (counts.size === 0) return fallback;
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0][0];
}

export function detectPrimaryDebtCurrency(debts: Debt[], fallback: string): string {
  const counts = new Map<string, number>();
  for (const d of debts) {
    if (d.paid) continue;
    counts.set(d.currency, (counts.get(d.currency) || 0) + 1);
  }
  if (counts.size === 0) return fallback;
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0][0];
}

export function isExpenseInRange(
  expense: Expense,
  from: Date | null,
  to: Date | null
): boolean {
  const date = new Date(expense.date);
  if (from && date < from) return false;
  if (to) {
    const end = new Date(to);
    end.setDate(end.getDate() + 1);
    if (date >= end) return false;
  }
  return true;
}

export type PeriodBucket = "day" | "week" | "month";

export interface PeriodPoint {
  key: string;
  label: string;
  total: number;
  count: number;
}

export function getBucketKey(date: Date, bucket: PeriodBucket): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  switch (bucket) {
    case "day":
      return `${y}-${m}-${d}`;
    case "week": {
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(date);
      monday.setDate(diff);
      monday.setHours(0, 0, 0, 0);
      return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
    }
    case "month":
      return `${y}-${m}`;
  }
}

export function formatBucketLabel(key: string, bucket: PeriodBucket): string {
  if (bucket === "month") {
    const date = new Date(key + "-01");
    return date.toLocaleDateString("en-US", { month: "short" });
  }
  const date = new Date(key);
  if (bucket === "week") {
    const weekEnd = new Date(date);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `${fmt(date)} – ${fmt(weekEnd)}`;
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function chooseBucket(from: Date, to: Date): PeriodBucket {
  const days = Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 31) return "day";
  if (days <= 120) return "week";
  return "month";
}

export function groupByPeriod(
  expenses: Expense[],
  currency: string,
  bucket: PeriodBucket
): PeriodPoint[] {
  const totals = new Map<string, { total: number; count: number }>();
  for (const expense of expenses) {
    if (expense.currency !== currency) continue;
    const key = getBucketKey(new Date(expense.date), bucket);
    const entry = totals.get(key) || { total: 0, count: 0 };
    entry.total += getUserNetAmount(expense);
    entry.count += 1;
    totals.set(key, entry);
  }
  return Array.from(totals.entries())
    .map(([key, { total, count }]) => ({
      key,
      label: formatBucketLabel(key, bucket),
      total: Math.round(total * 100) / 100,
      count,
    }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

export interface CategoryTotal {
  categoryId: string;
  name: string;
  icon: string;
  total: number;
  count: number;
  share: number;
}

export function groupByCategory(expenses: Expense[], currency: string): CategoryTotal[] {
  const totals = new Map<string, { total: number; count: number; name: string; icon: string }>();
  for (const expense of expenses) {
    if (expense.currency !== currency) continue;
    const entry = totals.get(expense.categoryId) || {
      total: 0,
      count: 0,
      name: expense.category?.name || "Other",
      icon: expense.category?.icon || "more-horizontal",
    };
    entry.total += getUserNetAmount(expense);
    entry.count += 1;
    totals.set(expense.categoryId, entry);
  }
  const grand = Array.from(totals.values()).reduce((s, v) => s + v.total, 0);
  return Array.from(totals.entries())
    .map(([categoryId, v]) => ({
      categoryId,
      name: v.name,
      icon: v.icon,
      total: Math.round(v.total * 100) / 100,
      count: v.count,
      share: grand > 0 ? Math.round((v.total / grand) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

export interface MerchantTotal {
  merchant: string;
  total: number;
  count: number;
}

export function topMerchants(expenses: Expense[], currency: string, limit = 5): MerchantTotal[] {
  const totals = new Map<string, { total: number; count: number }>();
  for (const expense of expenses) {
    if (expense.currency !== currency) continue;
    const name = expense.merchant || "Unknown";
    const entry = totals.get(name) || { total: 0, count: 0 };
    entry.total += getUserNetAmount(expense);
    entry.count += 1;
    totals.set(name, entry);
  }
  return Array.from(totals.entries())
    .map(([merchant, v]) => ({
      merchant,
      total: Math.round(v.total * 100) / 100,
      count: v.count,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

export interface IouTotal {
  person: string;
  total: number;
  count: number;
}

export function iouTotals(debts: Debt[], currency: string): { totals: IouTotal[]; grandTotal: number } {
  const totals = new Map<string, { total: number; count: number }>();
  for (const debt of debts) {
    if (debt.paid || debt.currency !== currency) continue;
    const entry = totals.get(debt.personName) || { total: 0, count: 0 };
    entry.total += debt.amount;
    entry.count += 1;
    totals.set(debt.personName, entry);
  }
  const sorted = Array.from(totals.entries())
    .map(([person, v]) => ({
      person,
      total: Math.round(v.total * 100) / 100,
      count: v.count,
    }))
    .sort((a, b) => b.total - a.total);
  const grandTotal = sorted.reduce((s, v) => s + v.total, 0);
  return { totals: sorted, grandTotal: Math.round(grandTotal * 100) / 100 };
}

export function averagePerDay(total: number, from: Date, to: Date): number {
  const days = Math.max(1, Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  return Math.round((total / days) * 100) / 100;
}
