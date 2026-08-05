"use client";

import { useMemo, useRef, useState } from "react";
import { Search, UserPlus, User } from "lucide-react";
import type { Person } from "@/lib/api";

export function ContactSearch({
  people,
  query,
  onQueryChange,
  onSelect,
  onAddNew,
  placeholder = "Search contacts or add a guest...",
}: {
  people: Person[];
  query: string;
  onQueryChange: (q: string) => void;
  onSelect: (person: Person) => void;
  onAddNew: (name: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return people
      .filter((p) => p.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [people, query]);

  const matchesExisting =
    results.length > 0 || people.some((p) => p.name.toLowerCase() === query.trim().toLowerCase());

  function handleBlur() {
    setTimeout(() => setOpen(false), 150);
  }

  function handleSelect(person: Person) {
    onSelect(person);
    onQueryChange("");
    setOpen(false);
    inputRef.current?.focus();
  }

  function handleAddNew() {
    const name = query.trim();
    onAddNew(name);
    onQueryChange("");
    setOpen(false);
    inputRef.current?.focus();
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              onQueryChange(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={handleBlur}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (results.length === 1) {
                  handleSelect(results[0]);
                } else if (!matchesExisting) {
                  handleAddNew();
                }
              }
            }}
            placeholder={placeholder}
            className="min-h-11 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        </div>
      </div>

      {open && query.trim() && (
        <div className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-xl border border-border bg-card shadow-lg animate-fade-in">
          {results.map((person) => (
            <button
              key={person.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(person);
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                <User size={14} className="text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{person.name}</p>
                {person.contactInfo && (
                  <p className="truncate text-xs text-muted-foreground">{person.contactInfo}</p>
                )}
              </div>
            </button>
          ))}

          {!matchesExisting && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleAddNew();
              }}
              className="flex w-full items-center gap-2.5 border-t border-border px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <UserPlus size={14} className="text-primary" />
              </div>
              <span className="font-medium text-primary">Add New Contact</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}