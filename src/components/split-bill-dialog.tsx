"use client";

import { useState, useEffect, useRef } from "react";
import {
  Users, Plus, Trash2, Loader2, Check, ArrowLeft, ChevronRight, ChevronLeft,
  Equal, Percent, Settings, List, AlertCircle,
} from "lucide-react";
import { Dialog, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  fetchPeople,
  createBillSplit,
  updateBillSplit,
  fetchBillItemAssignments,
  type Expense,
  type Person,
  type BillItemAssignment,
  type BillSplit,
} from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import { BillItemAssignmentEditor, type ItemConfig } from "@/components/bill-item-assignment-editor";

interface ParticipantInput {
  id: string;
  personId: string | null;
  guestName: string;
  amountOwed: number;
}

interface ItemAssignmentInput {
  participantIndex: number;
  itemIndex: number;
  quantity: number;
  unitPrice: number;
  amount: number;
  splitRatio?: string;
}

interface ReceiptItemShape {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

const SPLIT_METHODS = [
  { value: "equal", label: "Equal", icon: Equal, desc: "Split equally among all" },
  { value: "percentage", label: "Percentage", icon: Percent, desc: "Split by percentage" },
  { value: "custom", label: "Custom", icon: Settings, desc: "Set custom amounts" },
  { value: "by-item", label: "By Item", icon: List, desc: "Assign receipt items" },
];

export function SplitBillDialog({
  open,
  onClose,
  expense,
  expenseItems,
  onSuccess,
  mode,
}: {
  open: boolean;
  onClose: () => void;
  expense: Expense | null;
  expenseItems?: Array<{ description: string; quantity: number; unitPrice: number; amount: number }>;
  onSuccess?: () => void;
  mode?: "create" | "edit";
}) {
  const isEdit = mode === "edit";
  const [step, setStep] = useState<"participants" | "method" | "assign">("participants");
  const [people, setPeople] = useState<Person[]>([]);
  const [participants, setParticipants] = useState<ParticipantInput[]>([]);
  const [method, setMethod] = useState("equal");
  const [methodAmounts, setMethodAmounts] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guestName, setGuestName] = useState("");
  const [existingAssignments, setExistingAssignments] = useState<BillItemAssignment[]>([]);
  const [itemConfigs, setItemConfigs] = useState<Record<number, ItemConfig>>({});
  const [loadingEdit, setLoadingEdit] = useState(false);
  const savingRef = useRef(false);

  useEffect(() => {
    if (open) {
      fetchPeople()
        .then(setPeople)
        .catch(() => {});
    }
  }, [open]);

  async function loadEditData() {
    if (!expense?.billSplit) return;
    setLoadingEdit(true);
    try {
      const split = expense.billSplit;
      const existingParticipants: ParticipantInput[] = split.participants.map((p) => ({
        id: p.id,
        personId: p.personId,
        guestName: p.guestName || p.person?.name || "",
        amountOwed: p.amountOwed,
      }));
      setParticipants(existingParticipants);
      setMethod(split.method);
      setMethodAmounts(
        split.method === "percentage"
          ? existingParticipants.map((p) =>
              expense.amount > 0 ? Math.round((p.amountOwed / expense.amount) * 10000) / 100 : 0
            )
          : existingParticipants.map((p) => p.amountOwed)
      );

      if (split.method === "by-item") {
        const assns = await fetchBillItemAssignments(split.id);
        setExistingAssignments(assns);
        const configs: Record<number, ItemConfig> = {};
        assns.forEach((a) => {
          if (!configs[a.itemIndex]) {
            configs[a.itemIndex] = { splitEvenly: false, useRatios: false, participantConfigs: {} };
          }
          configs[a.itemIndex].participantConfigs[a.participantId] = { splitRatio: a.splitRatio };
        });
        Object.keys(configs).forEach((key) => {
          const idx = parseInt(key);
          const assignedIds = Object.keys(configs[idx].participantConfigs);
          if (assignedIds.length > 0) {
            const hasRatios = assignedIds.some((pid) => configs[idx].participantConfigs[pid]?.splitRatio);
            configs[idx].useRatios = hasRatios;
          }
        });
        setItemConfigs(configs);
      } else {
        setExistingAssignments([]);
        setItemConfigs({});
      }
      setStep(split.method === "by-item" ? "assign" : "method");
    } catch {
      setStep("participants");
    } finally {
      setLoadingEdit(false);
    }
  }

  useEffect(() => {
    if (open && expense) {
      if (isEdit) {
        loadEditData();
      } else {
        setStep("participants");
        setMethod("equal");
        setParticipants([]);
        setMethodAmounts([]);
        setError(null);
        setGuestName("");
        setItemConfigs({});
        setExistingAssignments([]);
      }
    }
  }, [open, expense?.id, isEdit]);

  if (!expense) return null;
  const exp = expense;
  const receiptItems: ReceiptItemShape[] = expenseItems || (exp.receiptItems ? (() => {
    try { return JSON.parse(exp.receiptItems) as ReceiptItemShape[]; } catch { return []; }
  })() : []);

  function addParticipant(person?: Person) {
    const newParticipant: ParticipantInput = {
      id: crypto.randomUUID(),
      personId: person?.id || null,
      guestName: person?.name || "",
      amountOwed: 0,
    };
    setParticipants((prev) => {
      const exists = prev.some(
        (p) => (p.personId && p.personId === newParticipant.personId) ||
          (!p.personId && p.guestName === newParticipant.guestName)
      );
      if (exists) return prev;
      return [...prev, newParticipant];
    });
  }

  function addGuest() {
    const name = guestName.trim();
    if (!name) return;
    const exists = participants.some((p) => !p.personId && p.guestName === name);
    if (exists) return;
    setParticipants((prev) => [
      ...prev,
      { id: crypto.randomUUID(), personId: null, guestName: name, amountOwed: 0 },
    ]);
    setGuestName("");
  }

  function removeParticipant(id: string) {
    setParticipants((prev) => prev.filter((p) => p.id !== id));
  }

  function updateParticipantAmount(id: string, amount: number) {
    setParticipants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, amountOwed: amount } : p))
    );
  }

  function canProceedToMethod() {
    return participants.length >= 2;
  }

  function handleProceedToMethod() {
    if (!canProceedToMethod()) return;
    setMethod("equal");
    setStep("method");
  }

  function getParticipantLabel(p: ParticipantInput) {
    if (p.personId) {
      return people.find((pe) => pe.id === p.personId)?.name || p.guestName || "Unknown";
    }
    return p.guestName || "Guest";
  }

  function applyEqualSplit(total: number, count: number) {
    const share = total / count;
    return Array.from({ length: count }, (_, i) => {
      const base = Math.round(share * 100) / 100;
      if (i === count - 1) {
        const sum = base * (count - 1);
        return Math.round((total - sum) * 100) / 100;
      }
      return base;
    });
  }

  function handleMethodSelect(value: string) {
    setMethod(value);
    const total = exp.amount;
    if (value === "equal") {
      const amounts = applyEqualSplit(total, participants.length);
      setMethodAmounts(amounts);
      setParticipants((prev) => prev.map((p, i) => ({ ...p, amountOwed: amounts[i] || 0 })));
    } else if (value === "percentage") {
      const pct = Math.round((100 / participants.length) * 100) / 100;
      setMethodAmounts(Array.from({ length: participants.length }, () => pct));
    } else if (value === "custom") {
      const amounts = applyEqualSplit(total, participants.length);
      setMethodAmounts(amounts);
      setParticipants((prev) => prev.map((p, i) => ({ ...p, amountOwed: amounts[i] || 0 })));
    } else {
      setMethodAmounts([]);
    }
  }

  function updateMethodAmount(index: number, value: number) {
    setMethodAmounts((prev) => prev.map((a, i) => (i === index ? value : a)));
    setParticipants((prev) => prev.map((p, i) => (i === index ? { ...p, amountOwed: value } : p)));
  }

  function getTotalMethodAmount() {
    return methodAmounts.reduce((s, a) => s + a, 0);
  }

  async function handleSave() {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError(null);

    try {
      let participantsPayload: Array<{ personId?: string; guestName?: string; amountOwed: number }>;
      let itemAssignmentsPayload: ItemAssignmentInput[] | undefined;

      if (method === "by-item") {
        const unassignedNames = receiptItems
          .map((item, itemIndex) => {
            const config = itemConfigs[itemIndex];
            const unassigned = !config || Object.keys(config.participantConfigs).length === 0;
            return unassigned ? (item.description || `Item ${itemIndex + 1}`) : null;
          })
          .filter((name): name is string => name !== null);

        if (unassignedNames.length > 0) {
          setError(`Every item must be assigned to at least one person. Unassigned: ${unassignedNames.join(", ")}`);
          return;
        }

        const taxesAndCharges = Math.max(0, exp.amount - receiptItems.reduce((s, i) => s + (i.amount || 0), 0));
        const taxPerPerson = receiptItems.length > 0
          ? Math.round((taxesAndCharges / participants.length) * 100) / 100
          : 0;

        itemAssignmentsPayload = [];
        const participantAmounts: number[] = participants.map(() => 0);

        Object.entries(itemConfigs).forEach(([itemIdxStr, config]) => {
          const itemIndex = parseInt(itemIdxStr);
          const item = receiptItems[itemIndex];
          if (!item) return;
          const assignedIds = Object.keys(config.participantConfigs);
          if (assignedIds.length === 0) return;

          const getWeight = (pid: string) => {
            const raw = config.participantConfigs[pid]?.splitRatio;
            if (!raw) return 1;
            const n = parseFloat(raw);
            return !isNaN(n) && n > 0 ? n : 1;
          };

          assignedIds.forEach((pid, idx) => {
            const pIdx = participants.findIndex((p) => p.id === pid);
            if (pIdx < 0) return;

            let share: number;
            if (config.useRatios) {
              const totalWeight = assignedIds.reduce((sum, p) => sum + getWeight(p), 0);
              if (totalWeight > 0) {
                if (idx === assignedIds.length - 1) {
                  const partial = assignedIds.slice(0, -1).reduce((s, p) => {
                    return s + Math.round(item.amount * getWeight(p) / totalWeight * 100) / 100;
                  }, 0);
                  share = Math.round((item.amount - partial) * 100) / 100;
                } else {
                  share = Math.round(item.amount * getWeight(pid) / totalWeight * 100) / 100;
                }
              } else {
                share = 0;
              }
            } else {
              const base = Math.round((item.amount / assignedIds.length) * 100) / 100;
              if (idx === assignedIds.length - 1) {
                share = Math.round((item.amount - base * (assignedIds.length - 1)) * 100) / 100;
              } else {
                share = base;
              }
            }

            itemAssignmentsPayload!.push({
              participantIndex: pIdx,
              itemIndex,
              quantity: item.quantity || 1,
              unitPrice: item.unitPrice || item.amount,
              amount: share,
              splitRatio: config.participantConfigs[pid]?.splitRatio || undefined,
            });
            participantAmounts[pIdx] = Math.round((participantAmounts[pIdx] + share) * 100) / 100;
          });
        });

        participantsPayload = participants.map((p, i) => ({
          personId: p.personId || undefined,
          guestName: p.personId ? undefined : p.guestName || undefined,
          amountOwed: Math.round((participantAmounts[i] + taxPerPerson) * 100) / 100,
        }));
      } else {
        participantsPayload = participants.map((p, i) => ({
          personId: p.personId || undefined,
          guestName: p.personId ? undefined : p.guestName || undefined,
          amountOwed: methodAmounts[i] || 0,
        }));
      }

      const taxesAndCharges = method === "by-item" && receiptItems.length > 0
        ? Math.max(0, exp.amount - receiptItems.reduce((s, i) => s + (i.amount || 0), 0))
        : 0;

      if (isEdit && exp.billSplit) {
        await updateBillSplit(exp.billSplit.id, {
          method,
          participants: participantsPayload,
          itemAssignments: method === "by-item" ? itemAssignmentsPayload : undefined,
          taxesAndCharges: method === "by-item" ? taxesAndCharges : undefined,
        });
      } else {
        await createBillSplit({
          expenseId: exp.id,
          method,
          participants: participantsPayload,
          itemAssignments: method === "by-item" ? itemAssignmentsPayload : undefined,
          taxesAndCharges: method === "by-item" ? taxesAndCharges : undefined,
        });
      }

      onClose();
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save bill split");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  const unselectedPeople = people.filter(
    (pe) => !participants.some((p) => p.personId === pe.id)
  );

  if (loadingEdit) {
    return (
      <Dialog open={open} onClose={onClose}>
        <DialogHeader>
          <DialogTitle>Edit Split Bill</DialogTitle>
          <DialogClose onClick={onClose} />
        </DialogHeader>
        <div className="flex items-center justify-center py-8">
          <Loader2 size={24} className="animate-spin text-primary" />
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit Split Bill" : "Split Bill"}</DialogTitle>
        <DialogClose onClick={onClose} />
      </DialogHeader>

      <div className="max-h-[65vh] overflow-y-auto pr-1">
      <div className="mb-4 rounded-xl border bg-card p-3">
        <p className="text-sm font-medium truncate">{exp.merchant}</p>
        <p className="font-mono tabular-nums text-lg font-medium">
          {formatCurrency(exp.amount, exp.currency)}
        </p>
        <p className="text-xs text-muted-foreground">
          {exp.category.name} &middot; {new Date(exp.date).toLocaleDateString()}
        </p>
      </div>

      {step === "participants" && (
        <div className="space-y-3">
          <p className="text-sm font-medium">Who is splitting this bill?</p>

          <div className="space-y-2 max-h-[30vh] overflow-y-auto pr-1">
            {participants.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Users size={14} className="text-muted-foreground" />
                </div>
                <span className="flex-1 text-sm truncate">{getParticipantLabel(p)}</span>
                <button
                  type="button"
                  onClick={() => removeParticipant(p.id)}
                  className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            {participants.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-3">Add at least two participants</p>
            )}
          </div>

          {unselectedPeople.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Saved contacts</p>
              <div className="flex flex-wrap gap-1.5">
                {unselectedPeople.map((pe) => (
                  <button
                    key={pe.id}
                    type="button"
                    onClick={() => addParticipant(pe)}
                    className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-xs transition-colors hover:bg-muted hover:border-primary/50"
                  >
                    <Plus size={11} />
                    {pe.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addGuest(); }}
              placeholder="Add guest by name..."
              className="min-h-10 w-full flex-1 rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
            <Button variant="outline" size="sm" onClick={addGuest} disabled={!guestName.trim()} className="shrink-0">
              Add
            </Button>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <Button variant="outline" onClick={onClose} className="flex-1 min-h-11 sm:min-h-8">
              Cancel
            </Button>
            <Button onClick={handleProceedToMethod} disabled={!canProceedToMethod()} className="flex-1 min-h-11 sm:min-h-8">
              Choose Method
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      )}

      {step === "method" && (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setStep("participants")}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft size={12} />
            Back to participants
          </button>

          <p className="text-sm font-medium">How do you want to split?</p>

          <select
            value={method}
            onChange={(e) => handleMethodSelect(e.target.value)}
            className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            {SPLIT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>{m.label} - {m.desc}</option>
            ))}
          </select>

          {method === "by-item" ? (
            <div className="rounded-xl border bg-card p-4 text-center">
              <List size={24} className="mx-auto mb-2 text-primary" />
              <p className="text-sm font-medium mb-1">Assign items to participants</p>
              <p className="text-xs text-muted-foreground mb-3">
                {isEdit
                  ? "Item assignments from the current split will be preserved"
                  : "Choose who pays for each item, with optional custom ratios"}
              </p>
              <Button onClick={() => {
                if (!isEdit && Object.keys(itemConfigs).length === 0 && receiptItems.length > 0) {
                  const initial: Record<number, ItemConfig> = {};
                  receiptItems.forEach((_, i) => {
                    initial[i] = { splitEvenly: false, useRatios: false, participantConfigs: {} };
                  });
                  setItemConfigs(initial);
                }
                setStep("assign");
              }} className="w-full sm:w-auto">
                {isEdit ? "Configure Assignments" : "Configure Split"}
                <ChevronRight size={14} />
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-xl border bg-card overflow-hidden">
                {participants.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3 px-3 py-2.5 border-b last:border-b-0">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                      <Users size={14} className="text-muted-foreground" />
                    </div>
                    <span className="flex-1 text-sm truncate">{getParticipantLabel(p)}</span>
                    {method === "equal" && (
                      <span className="font-mono tabular-nums text-sm">
                        {formatCurrency(methodAmounts[i] || 0, exp.currency)}
                      </span>
                    )}
                    {method === "percentage" && (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={methodAmounts[i] || 0}
                          onChange={(e) => updateMethodAmount(i, Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                          className="w-20 rounded-lg border border-input bg-background px-2.5 py-1.5 text-right text-sm font-mono tabular-nums focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                        />
                        <span className="text-xs text-muted-foreground">%</span>
                      </div>
                    )}
                    {method === "custom" && (
                      <div className="relative w-28">
                        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                          {exp.currency === "IDR" ? "Rp" : exp.currency === "USD" ? "$" : exp.currency + " "}
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={methodAmounts[i] || 0}
                          onChange={(e) => updateMethodAmount(i, parseFloat(e.target.value) || 0)}
                          className="w-full rounded-lg border border-input bg-background pl-8 pr-2.5 py-1.5 text-right text-sm font-mono tabular-nums focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {method === "percentage" && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    Total: {getTotalMethodAmount().toFixed(1)}%
                  </span>
                  <span className={getTotalMethodAmount() > 100.01 ? "text-destructive" : "text-muted-foreground"}>
                    {formatCurrency(exp.amount, exp.currency)}
                  </span>
                </div>
              )}

              {method === "custom" && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    Remaining: {formatCurrency(Math.max(0, exp.amount - getTotalMethodAmount()), exp.currency)}
                  </span>
                  <span className={`font-mono tabular-nums ${Math.abs(getTotalMethodAmount() - exp.amount) > 0.01 ? "text-destructive" : ""}`}>
                    {formatCurrency(getTotalMethodAmount(), exp.currency)} / {formatCurrency(exp.amount, exp.currency)}
                  </span>
                </div>
              )}
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            {method !== "by-item" && (
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? (
                  <><Loader2 size={16} className="animate-spin" /> Saving...</>
                ) : (
                  <><Check size={16} /> {isEdit ? "Save Changes" : "Confirm Split"}</>
                )}
              </Button>
            )}
          </div>
        </div>
      )}

      {step === "assign" && (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setStep("method")}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft size={12} />
            Back to method
          </button>

          {receiptItems.length === 0 ? (
            <div className="rounded-xl border bg-card p-4 text-center">
              <AlertCircle size={20} className="mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No receipt items available for this expense.</p>
              <p className="text-xs text-muted-foreground mt-1">Items from a receipt scan are required for this split method.</p>
            </div>
          ) : (
            <BillItemAssignmentEditor
              items={receiptItems}
              participants={participants.map((p) => ({ id: p.id, label: getParticipantLabel(p) }))}
              currency={exp.currency}
              taxAndCharges={Math.max(0, exp.amount - receiptItems.reduce((s, i) => s + (i.amount || 0), 0))}
              assignments={itemConfigs}
              onAssignmentsChange={setItemConfigs}
            />
          )}

          {!isEdit && receiptItems.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">
              No receipt items found. Please use a receipt scanner to add items first.
            </p>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || receiptItems.length === 0} className="flex-1">
              {saving ? (
                <><Loader2 size={16} className="animate-spin" /> Saving...</>
              ) : (
                <><Check size={16} /> {isEdit ? "Save Changes" : "Confirm Split"}</>
              )}
            </Button>
          </div>
        </div>
      )}
      </div>
    </Dialog>
  );
}
