"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createPerson, type Person } from "@/lib/api";

export function NewContactDialog({
  open,
  initialName,
  onClose,
  onCreated,
}: {
  open: boolean;
  initialName: string;
  onClose: () => void;
  onCreated: (person: Person) => void;
}) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open) {
      setName(initialName);
      setContact("");
      setError(null);
    }
  }, [open, initialName]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const person = await createPerson({
        name: name.trim(),
        contactInfo: contact.trim() || undefined,
      });
      onCreated(person);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create contact");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader>
        <DialogTitle>Add New Contact</DialogTitle>
        <DialogClose onClick={onClose} />
      </DialogHeader>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="new-contact-name">Name</Label>
          <Input
            id="new-contact-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Contact name"
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="new-contact-method">Contact method (optional)</Label>
          <Input
            id="new-contact-method"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="Email, phone, etc."
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()} className="flex-1">
            {saving ? (
              <><Loader2 size={16} className="animate-spin" /> Saving...</>
            ) : (
              "Add Contact"
            )}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}