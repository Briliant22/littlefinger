"use client";

import { useState } from "react";
import { Search, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { MultiSelect } from "@/components/ui/multi-select";
import type { Category } from "@/lib/api";

export interface Filters {
  dateFrom: string;
  dateTo: string;
  categoryIds: string[];
  merchantQuery: string;
}

export const defaultFilters: Filters = {
  dateFrom: "",
  dateTo: "",
  categoryIds: [],
  merchantQuery: "",
};

export function ExpenseFilters({
  categories,
  filters,
  onChange,
}: {
  categories: Category[];
  filters: Filters;
  onChange: (filters: Filters) => void;
}) {
  const hasActiveFilters =
    filters.dateFrom || filters.dateTo || filters.categoryIds.length > 0 || filters.merchantQuery;

  const [collapsed, setCollapsed] = useState(false);
  const isCollapsed = collapsed && !hasActiveFilters;

  function clearAll() {
    onChange(defaultFilters);
  }

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium">Filters</p>
          {!hasActiveFilters && (
            <button
              type="button"
              onClick={() => setCollapsed((c) => !c)}
              className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label={collapsed ? "Expand filters" : "Collapse filters"}
            >
              {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </button>
          )}
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs text-muted-foreground underline transition-colors hover:text-foreground"
          >
            Clear all
          </button>
        )}
      </div>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${isCollapsed ? "[grid-template-rows:0fr]" : "mt-3 [grid-template-rows:1fr]"}`}
      >
        <div className="min-h-0 overflow-hidden px-1 pb-1">
          <div className="grid gap-3 sm:grid-cols-2">
        {/* Date range - spans full width so the two inputs never get squeezed */}
        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-xs font-medium text-muted-foreground">Date range</label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
            <div className="space-y-1">
              <span className="block text-xs text-muted-foreground sm:hidden">From</span>
              <DateInput
                value={filters.dateFrom}
                onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
              />
            </div>
            <span className="hidden text-center text-xs text-muted-foreground sm:block sm:px-1">to</span>
            <div className="space-y-1">
              <span className="block text-xs text-muted-foreground sm:hidden">To</span>
              <DateInput
                value={filters.dateTo}
                onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Category multi-select */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Category</label>
          <MultiSelect
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
            selected={filters.categoryIds}
            onChange={(selected) => onChange({ ...filters, categoryIds: selected })}
            placeholder="All categories"
          />
        </div>

        {/* Merchant search */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Merchant</label>
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search merchant..."
              value={filters.merchantQuery}
              onChange={(e) => onChange({ ...filters, merchantQuery: e.target.value })}
              className="pl-8"
            />
          </div>
        </div>
      </div>
        </div>
      </div>
    </div>
  );
}
