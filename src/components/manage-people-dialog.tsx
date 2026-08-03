"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, User, Loader2, X, Check } from "lucide-react";
import { Dialog, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { fetchPeople, createPerson, updatePerson, deletePerson, type Person } from "@/lib/api";

export function ManagePeopleDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editContact, setEditContact] = useState("");
  const [adding, setAdding] = useState(false);
  const [addName, setAddName] = useState("");
  const [addContact, setAddContact] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  function loadPeople() {
    setLoading(true);
    fetchPeople()
      .then(setPeople)
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open) loadPeople();
  }, [open]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function handleAdd() {
    if (!addName.trim()) return;
    setSaving(true);
    try {
      await createPerson({ name: addName.trim(), contactInfo: addContact.trim() || undefined });
      setAddName("");
      setAddContact("");
      setAdding(false);
      loadPeople();
    } catch { }
    finally { setSaving(false); }
  }

  async function handleEdit(id: string) {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      await updatePerson(id, { name: editName.trim(), contactInfo: editContact.trim() || undefined });
      setEditingId(null);
      loadPeople();
    } catch { }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await deletePerson(id);
      loadPeople();
    } catch { }
    finally { setDeleting(null); }
  }

  function startEdit(person: Person) {
    setEditingId(person.id);
    setEditName(person.name);
    setEditContact(person.contactInfo || "");
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader>
        <DialogTitle>Manage People</DialogTitle>
        <DialogClose onClick={onClose} />
      </DialogHeader>

      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : people.length === 0 && !adding ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No contacts yet. Add someone to split bills with.
          </p>
        ) : (
          people.map((person) => (
            <div
              key={person.id}
              className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                <User size={14} className="text-muted-foreground" />
              </div>
              {editingId === person.id ? (
                <div className="flex flex-1 flex-col gap-1.5 sm:flex-row sm:items-center">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex h-8 flex-1 rounded-md border border-input bg-background px-2 text-sm"
                    autoFocus
                  />
                  <input
                    type="text"
                    value={editContact}
                    onChange={(e) => setEditContact(e.target.value)}
                    placeholder="Contact (optional)"
                    className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-sm sm:w-32"
                  />
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => handleEdit(person.id)}
                      disabled={saving || !editName.trim()}
                      className="flex size-7 items-center justify-center rounded-md text-primary hover:bg-primary/10"
                    >
                      {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{person.name}</p>
                    {person.contactInfo && (
                      <p className="text-xs text-muted-foreground truncate">{person.contactInfo}</p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => startEdit(person)}
                      className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(person.id)}
                      disabled={deleting === person.id}
                      className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      {deleting === person.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}

        {adding && (
          <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 px-3 py-2.5">
            <input
              type="text"
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              placeholder="Name"
              className="flex h-8 rounded-md border border-input bg-background px-2 text-sm"
              autoFocus
            />
            <input
              type="text"
              value={addContact}
              onChange={(e) => setAddContact(e.target.value)}
              placeholder="Contact info (optional)"
              className="flex h-8 rounded-md border border-input bg-background px-2 text-sm"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd} disabled={saving || !addName.trim()}>
                {saving ? (
                  <><Loader2 size={14} className="animate-spin" /> Saving</>
                ) : (
                  "Add"
                )}
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setAdding(false); setAddName(""); setAddContact(""); }}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {!adding && (
        <div className="mt-4">
          <Button variant="outline" onClick={() => setAdding(true)} className="w-full">
            <Plus size={14} />
            Add Person
          </Button>
        </div>
      )}
    </Dialog>
  );
}
