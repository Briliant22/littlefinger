"use client";

import { useState, useEffect } from "react";
import { Loader2, HandCoins } from "lucide-react";
import { Dialog, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ContactSearch } from "@/components/contact-search";
import { NewContactDialog } from "@/components/new-contact-dialog";
import { createDebt, fetchPeople, type Person } from "@/lib/api";
import { CURRENCIES, getCurrencySymbol } from "@/lib/currency";

export function DebtForm({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [people, setPeople] = useState<Person[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Person | null>(null);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("IDR");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newContactOpen, setNewContactOpen] = useState(false);
  const [newContactName, setNewContactName] = useState("");

  useEffect(() => {
    if (open) {
      fetchPeople().then(setPeople).catch(() => {});
    }
  }, [open]);

  function handleClose() {
    setOpen(false);
    setQuery("");
    setSelected(null);
    setAmount("");
    setNote("");
    setError(null);
  }

  function handleSelect(person: Person) {
    setSelected(person);
    setQuery(person.name);
  }

  function handleAddNew(name: string) {
    setNewContactName(name);
    setNewContactOpen(true);
  }

  function handleNewContactCreated(person: Person) {
    setNewContactOpen(false);
    setPeople((prev) => [...prev, person]);
    handleSelect(person);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      setError("Amount must be a positive number");
      return;
    }
    if (!selected && !query.trim()) {
      setError("Select a contact or type a name");
      return;
    }
    setSaving(true);
    try {
      const personId = selected?.id;
      const guestName = selected ? undefined : query.trim();
      await createDebt({ personId, guestName, amount: amt, currency, note: note.trim() || undefined });
      handleClose();
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record debt");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <HandCoins size={16} />
        Record Debt
      </Button>

      <Dialog open={open} onClose={handleClose}>
        <DialogHeader>
          <DialogTitle>Record Debt</DialogTitle>
          <DialogClose onClick={handleClose} />
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Who owes you?</Label>
            <ContactSearch
              people={people}
              query={query}
              onQueryChange={(q) => {
                setQuery(q);
                setSelected(null);
              }}
              onSelect={handleSelect}
              onAddNew={handleAddNew}
              placeholder="Search contacts or type a name..."
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1 space-y-2">
              <Label htmlFor="debt-amount">Amount</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  {getCurrencySymbol(currency)}
                </span>
                <Input
                  id="debt-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  className="pl-8 font-mono tabular-nums"
                  autoFocus
                />
              </div>
            </div>
            <div className="w-24 space-y-2 sm:w-32">
              <Label htmlFor="debt-currency">Currency</Label>
              <Select
                id="debt-currency"
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
            <Label htmlFor="debt-note">Note (optional)</Label>
            <Input
              id="debt-note"
              type="text"
              placeholder="What is this for?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? (
                <><Loader2 size={16} className="animate-spin" /> Saving...</>
              ) : (
                "Save Debt"
              )}
            </Button>
          </div>
        </form>

        <NewContactDialog
          open={newContactOpen}
          initialName={newContactName}
          onClose={() => setNewContactOpen(false)}
          onCreated={handleNewContactCreated}
        />
      </Dialog>
    </>
  );
}