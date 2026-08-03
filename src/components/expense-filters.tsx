"use client";

import { useState, useRef, useEffect } from "react";
import { Calendar, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
import { Button } from "@/components/ui/button";
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

  function clearAll() {
    onChange(defaultFilters);
  }

  return (
    <div className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Filters</p>
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

      <div className="grid gap-3 sm:grid-cols-2">
        {/* Date range - spans full width so the two inputs never get squeezed */}
        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-xs font-medium text-muted-foreground">Date range</label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
            <div className="space-y-1">
              <span className="block text-xs text-muted-foreground sm:hidden">From</span>
              <div className="relative">
                <Calendar size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
                  className="flex h-9 w-full rounded-lg border border-input bg-background pl-8 pr-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                />
              </div>
            </div>
            <span className="hidden text-center text-xs text-muted-foreground sm:block sm:px-1">to</span>
            <div className="space-y-1">
              <span className="block text-xs text-muted-foreground sm:hidden">To</span>
              <div className="relative">
                <Calendar size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
                  className="flex h-9 w-full rounded-lg border border-input bg-background pl-8 pr-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                />
              </div>
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
  );
}
