"use client";

import { useState, useRef, useEffect } from "react";
import {
  Upload, Loader2, Camera, Check, Plus, X, ChevronRight, ChevronLeft,
  Users, Equal, Percent, Settings, List,
} from "lucide-react";
import { Dialog, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  scanReceipt, createExpense, createBillSplit, deleteExpense, fetchPeople,
  type Category, type Expense, type ReceiptScanResult, type Person,
} from "@/lib/api";
import { CURRENCIES, getCurrencySymbol } from "@/lib/currency";
import { BillItemAssignmentEditor, type ItemConfig } from "@/components/bill-item-assignment-editor";
import { ContactSearch } from "@/components/contact-search";
import { NewContactDialog } from "@/components/new-contact-dialog";

interface ScannerParticipant {
  id: string;
  personId: string | null;
  guestName: string;
}

type ScannerStep = "upload" | "items" | "participants" | "method" | "assign";

const SPLIT_METHODS = [
  { value: "equal", label: "Equal", icon: Equal, desc: "Split equally among all" },
  { value: "percentage", label: "Percentage", icon: Percent, desc: "Split by percentage" },
  { value: "custom", label: "Custom", icon: Settings, desc: "Set custom amounts" },
  { value: "by-item", label: "By Item", icon: List, desc: "Assign receipt items" },
];

function getConfidenceBadge(confidence: number) {
  if (confidence >= 0.8) return { label: "High", class: "bg-green-500/10 text-green-600 dark:text-green-400" };
  if (confidence >= 0.5) return { label: "Medium", class: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400" };
  return { label: "Low", class: "bg-red-500/10 text-red-600 dark:text-red-400" };
}

export function ReceiptScanner({
  open,
  onClose,
  categories,
  onExpenseCreated,
}: {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  onExpenseCreated?: (expense: Expense) => void;
}) {
  const [step, setStep] = useState<ScannerStep>("upload");
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ReceiptScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [merchant, setMerchant] = useState("");
  const [date, setDate] = useState("");
  const [currency, setCurrency] = useState("IDR");
  const [items, setItems] = useState<Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    category: string;
    confidence: number;
  }>>([]);
  const [taxAndCharges, setTaxAndCharges] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [people, setPeople] = useState<Person[]>([]);
  const [participants, setParticipants] = useState<ScannerParticipant[]>([]);
  const [includeMyself, setIncludeMyself] = useState(true);
  const [contactQuery, setContactQuery] = useState("");
  const [newContactOpen, setNewContactOpen] = useState(false);
  const [newContactName, setNewContactName] = useState("");
  const [method, setMethod] = useState("equal");
  const [methodAmounts, setMethodAmounts] = useState<number[]>([]);
  const [showPersonPicker, setShowPersonPicker] = useState(false);
  const [creating, setCreating] = useState(false);
  const [itemAssignments, setItemAssignments] = useState<Record<number, ItemConfig>>({});
  const [assignKey, setAssignKey] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const confirmingRef = useRef(false);

  useEffect(() => {
    if (open) {
      fetchPeople().then(setPeople).catch(() => {});
      reset();
    }
  }, [open]);

  function getItemsTotal() {
    return items.reduce((sum, item) => sum + item.amount, 0);
  }

  function getComputedTotal() {
    return getItemsTotal() + taxAndCharges;
  }

  function reset() {
    setStep("upload");
    setScanning(false);
    setResult(null);
    setError(null);
    setMerchant("");
    setDate("");
    setCurrency("IDR");
    setItems([]);
    setTaxAndCharges(0);
    setDirty(false);
    setParticipants([]);
    setIncludeMyself(true);
    setContactQuery("");
    setNewContactOpen(false);
    setMethod("equal");
    setMethodAmounts([]);
    setShowPersonPicker(false);
    setCreating(false);
    confirmingRef.current = false;
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }
    setError(null);
    setScanning(true);
    try {
      const scanResult = await scanReceipt(file);
      setResult(scanResult);
      setMerchant(scanResult.merchant);
      setDate(scanResult.date);
      setCurrency(scanResult.currency || "IDR");
      setTaxAndCharges(scanResult.taxAmount + scanResult.roundingAdjustment);
      setItems(scanResult.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount: item.amount,
        category: item.category,
        confidence: item.confidence,
      })));
      setStep("items");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to scan receipt");
    } finally {
      setScanning(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function startManualEntry() {
    setError(null);
    setResult(null);
    setScanning(false);
    setMerchant("");
    setDate("");
    setTaxAndCharges(0);
    setItems([{ description: "", quantity: 1, unitPrice: 0, amount: 0, category: "Other", confidence: 0 }]);
    setStep("items");
  }

  function markDirty() {
    setDirty(true);
  }

  function updateItemQuantity(index: number, quantity: number) {
    markDirty();
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, quantity, amount: quantity * item.unitPrice } : item
      )
    );
  }

  function updateItemUnitPrice(index: number, unitPrice: number) {
    markDirty();
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, unitPrice, amount: item.quantity * unitPrice } : item
      )
    );
  }

  function updateItemAmount(index: number, amount: number) {
    markDirty();
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, amount, unitPrice: item.quantity > 0 ? amount / item.quantity : 0 } : item
      )
    );
  }

  function updateItemField(index: number, field: "description" | "category", value: string) {
    markDirty();
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  function removeItem(index: number) {
    markDirty();
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function addItem() {
    markDirty();
    setItems((prev) => [
      ...prev,
      { description: "", quantity: 1, unitPrice: 0, amount: 0, category: "Other", confidence: 0 },
    ]);
  }

  function getParticipantLabel(p: ScannerParticipant) {
    if (p.personId) {
      return people.find((pe) => pe.id === p.personId)?.name || p.guestName || "Unknown";
    }
    return p.guestName || "Guest";
  }

  function addParticipant(person?: Person) {
    const newParticipant: ScannerParticipant = {
      id: crypto.randomUUID(),
      personId: person?.id || null,
      guestName: person?.name || "",
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

  function handleSelectContact(person: Person) {
    addParticipant(person);
    setContactQuery("");
  }

  function handleAddNewContact(name: string) {
    setNewContactName(name);
    setNewContactOpen(true);
  }

  function handleNewContactCreated(person: Person) {
    setNewContactOpen(false);
    addParticipant(person);
  }

  function removeParticipant(id: string) {
    setParticipants((prev) => prev.filter((p) => p.id !== id));
  }

  function getEffectiveParticipants() {
    const list = [...participants];
    if (includeMyself && !list.some((p) => p.guestName === "You" && !p.personId)) {
      list.unshift({ id: "myself", personId: null, guestName: "You" });
    }
    return list;
  }

  function handleProceedToMethod() {
    const p = getEffectiveParticipants();
    if (p.length < 2) {
      setError("Need at least 2 participants");
      return;
    }
    setError(null);
    setMethodAmounts([]);
    setMethod("equal");
    setStep("method");
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

  function initAssignments() {
    const init: Record<number, ItemConfig> = {};
    items.forEach((_, i) => {
      const configs: Record<string, { splitRatio: string | null }> = {};
      getEffectiveParticipants().forEach((p) => {
        configs[p.id] = { splitRatio: null };
      });
      init[i] = { splitEvenly: true, useRatios: false, participantConfigs: configs };
    });
    setItemAssignments(init);
    setAssignKey((k) => k + 1);
  }

  function handleMethodSelect(value: string) {
    setMethod(value);
    const p = getEffectiveParticipants();
    const total = getComputedTotal();
    if (value === "equal") {
      setMethodAmounts(applyEqualSplit(total, p.length));
    } else if (value === "percentage") {
      const pct = Math.round((100 / p.length) * 100) / 100;
      setMethodAmounts(Array.from({ length: p.length }, () => pct));
    } else if (value === "custom") {
      const amounts = applyEqualSplit(total, p.length);
      setMethodAmounts(amounts);
    } else {
      setMethodAmounts([]);
    }
  }

  function updateMethodAmount(index: number, value: number) {
    setMethodAmounts((prev) => prev.map((a, i) => (i === index ? value : a)));
  }

  function getTotalMethodAmount() {
    return methodAmounts.reduce((s, a) => s + a, 0);
  }

  async function handleConfirm() {
    if (confirmingRef.current) return;
    confirmingRef.current = true;
    setCreating(true);
    setError(null);
    const p = getEffectiveParticipants();
    const total = getComputedTotal();

    const unassignedItemNames =
      p.length >= 2 && method === "by-item"
        ? items
            .map((item, itemIdx) => {
              const config = itemAssignments[itemIdx];
              const unassigned = !config || Object.keys(config.participantConfigs).length === 0;
              return unassigned ? (item.description || `Item ${itemIdx + 1}`) : null;
            })
            .filter((name): name is string => name !== null)
        : [];

    if (unassignedItemNames.length > 0) {
      setError(`Every item must be assigned to at least one person. Unassigned: ${unassignedItemNames.join(", ")}`);
      confirmingRef.current = false;
      setCreating(false);
      return;
    }

    try {
      const firstCategoryId = items[0]?.category
        ? (categories.find((c) => c.name === items[0].category)?.id || categories[0]?.id || "")
        : (categories[0]?.id || "");

      const receiptItemsData = items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount: item.amount,
        category: item.category,
        confidence: item.confidence,
      }));

      const expense = await createExpense({
        amount: total,
        date: date || new Date().toISOString().split("T")[0],
        merchant: merchant || "Unknown Merchant",
        categoryId: firstCategoryId,
        currency,
        receiptItems: receiptItemsData,
      });

      if (p.length >= 2) {
        let participantsPayload: Array<{ personId?: string; guestName?: string; amountOwed: number }>;
        let itemAssignmentsPayload: Array<{
          participantIndex: number;
          itemIndex: number;
          quantity: number;
          unitPrice: number;
          amount: number;
          splitRatio?: string;
        }> | undefined;

        if (method === "by-item") {
          participantsPayload = p.map((pp) => ({
            personId: pp.personId || undefined,
            guestName: pp.personId ? undefined : pp.guestName || undefined,
            amountOwed: 0,
          }));

          itemAssignmentsPayload = [];
          Object.entries(itemAssignments).forEach(([itemIdxStr, config]) => {
            const itemIdx = parseInt(itemIdxStr);
            const item = items[itemIdx];
            if (!item) return;

            Object.entries(config.participantConfigs).forEach(([pid, pConfig]) => {
              const ppIdx = p.findIndex((pp) => pp.id === pid);
              if (ppIdx === -1) return;

              const assignedIds = Object.keys(config.participantConfigs);
              const hasRatios = assignedIds.some((id) => config.participantConfigs[id]?.splitRatio);

              let assignmentAmount: number;
              if (hasRatios) {
                const ratios: Record<string, { left: number; right: number }> = {};
                const allValid = assignedIds.every((id) => {
                  const r = config.participantConfigs[id]?.splitRatio;
                  if (!r || !r.includes(":")) return false;
                  const [l, rv] = r.split(":").map(Number);
                  if (isNaN(l) || isNaN(rv) || l < 0 || rv < 0 || (l === 0 && rv === 0)) return false;
                  ratios[id] = { left: l, right: rv };
                  return true;
                });

                if (allValid) {
                  const totalParts = assignedIds.reduce((s, id) => s + ratios[id].left + ratios[id].right, 0);
                  if (totalParts > 0 && ratios[pid]) {
                    assignmentAmount = Math.round(item.amount * ratios[pid].left / totalParts * 100) / 100;
                  } else {
                    assignmentAmount = Math.round((item.amount / assignedIds.length) * 100) / 100;
                  }
                } else {
                  assignmentAmount = Math.round((item.amount / assignedIds.length) * 100) / 100;
                }
              } else {
                assignmentAmount = Math.round((item.amount / assignedIds.length) * 100) / 100;
              }

              itemAssignmentsPayload!.push({
                participantIndex: ppIdx,
                itemIndex: itemIdx,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                amount: assignmentAmount,
                splitRatio: pConfig.splitRatio || undefined,
              });
            });
          });
        } else {
          participantsPayload = p.map((pp, i) => ({
            personId: pp.personId || undefined,
            guestName: pp.personId ? undefined : pp.guestName || undefined,
            amountOwed: methodAmounts[i] || 0,
          }));
        }

        let savedItemAssignments: Array<{
          participantIndex: number;
          itemIndex: number;
          quantity: number;
          unitPrice: number;
          amount: number;
          splitRatio?: string;
        }> = [];

        try {
          await createBillSplit({
            expenseId: expense.id,
            method,
            participants: participantsPayload,
            itemAssignments: method === "by-item" ? itemAssignmentsPayload : undefined,
            taxesAndCharges: method === "by-item" ? taxAndCharges : undefined,
          });
        } catch (splitErr) {
          try { await deleteExpense(expense.id); } catch { }
          throw splitErr;
        }
      }

      reset();
      onClose();
      onExpenseCreated?.(expense);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create expense");
    } finally {
      confirmingRef.current = false;
      setCreating(false);
    }
  }

  const total = getComputedTotal();
  const effectiveParticipants = getEffectiveParticipants();

  return (
    <Dialog open={open} onClose={handleClose} className="max-w-2xl max-h-[calc(100vh-4rem)] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>
          {step === "upload" && "Scan Receipt"}
          {step === "items" && "Review Items"}
          {step === "participants" && "Split With"}
          {step === "method" && "Split Method"}
          {step === "assign" && "Assign Items"}
        </DialogTitle>
        <DialogClose onClick={handleClose} />
      </DialogHeader>

      {/* Step progress indicator */}
      {step !== "upload" && (
        <div className="flex items-center gap-1.5 mb-4">
          {["items", "participants", "method"].map((s, i) => {
            const stepIndex = ["items", "participants", "method"].indexOf(step === "assign" ? "method" : step);
            const isActive = i <= stepIndex;
            return (
              <div key={s} className="flex items-center gap-1.5 flex-1">
                <div className={`h-1.5 flex-1 rounded-full transition-colors ${isActive ? "bg-primary" : "bg-muted"}`} />
              </div>
            );
          })}
          <span className="text-xs text-muted-foreground shrink-0 ml-1">
            {["items", "participants", "method"].indexOf(step === "assign" ? "method" : step) + 1}/3
          </span>
        </div>
      )}

      {/* Step: Upload */}
      {step === "upload" && (
        <>
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/30 py-12 transition-colors hover:border-primary/50 hover:bg-muted/50"
          >
            <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-primary/10">
              <Camera size={24} className="text-primary" />
            </div>
            <p className="text-sm font-medium mb-1">Upload a receipt image</p>
            <p className="text-xs text-muted-foreground mb-4">Drag and drop or click to browse</p>
            <Button variant="outline" size="sm" type="button">
              <Upload size={14} />
              Select Image
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {scanning && (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 size={32} className="animate-spin text-primary mb-4" />
              <p className="text-sm font-medium">Scanning receipt...</p>
              <p className="text-xs text-muted-foreground mt-1">This may take a moment</p>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {error}
              <button type="button" onClick={() => setError(null)} className="ml-2 underline hover:no-underline">
                Try again
              </button>
            </div>
          )}

          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={startManualEntry}
              className="inline-flex items-center text-sm font-medium text-green-600 underline underline-offset-4 transition-colors hover:text-green-700"
            >
              Manual Entry
              <ChevronRight size={14} className="ml-0.5 inline" />
            </button>
          </div>
        </>
      )}

      {/* Step: Items */}
      {step === "items" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Merchant</label>
              <input
                type="text"
                value={merchant}
                onChange={(e) => { markDirty(); setMerchant(e.target.value); }}
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => { markDirty(); setDate(e.target.value); }}
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Currency</label>
              <select
                value={currency}
                onChange={(e) => { markDirty(); setCurrency(e.target.value); }}
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.code}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">Items</label>
              <span className="text-xs font-mono tabular-nums text-muted-foreground">
                Total: {getCurrencySymbol(currency)}{getComputedTotal().toFixed(2)}
              </span>
            </div>

            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="rounded-xl border bg-card p-3 transition-all">
                  <div className="flex items-start gap-2 mb-2">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateItemField(i, "description", e.target.value)}
                      placeholder="Item description"
                      className="flex h-9 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    />
                    <button
                      type="button"
                      onClick={() => removeItem(i)}
                      className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    >
                      <X size={13} />
                    </button>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
                    <select
                      value={item.category}
                      onChange={(e) => updateItemField(i, "category", e.target.value)}
                      className="flex h-8 rounded-lg border border-input bg-background px-2.5 text-xs sm:w-36 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                    <span
                      className={`inline-flex items-center self-start rounded-full px-2 py-0.5 text-xs font-medium ${getConfidenceBadge(item.confidence).class}`}
                    >
                      {getConfidenceBadge(item.confidence).label}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-end gap-2 mt-2 sm:flex-nowrap">
                    <div className="flex-1 min-w-0">
                      <label className="text-[10px] text-muted-foreground mb-0.5 block">Qty</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItemQuantity(i, Math.max(1, parseInt(e.target.value) || 1))}
                        className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm text-center focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className="text-[10px] text-muted-foreground mb-0.5 block">Unit price</label>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                          {getCurrencySymbol(currency)}
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unitPrice}
                          onChange={(e) => updateItemUnitPrice(i, parseFloat(e.target.value) || 0)}
                          className="flex h-8 w-full rounded-lg border border-input bg-background pl-7 pr-2.5 text-sm font-mono tabular-nums focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                        />
                      </div>
                    </div>
                    <div className="flex items-center text-xs text-muted-foreground px-1 hidden sm:block">×</div>
                    <div className="flex-1 min-w-0">
                      <label className="text-[10px] text-muted-foreground mb-0.5 block">Total</label>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                          {getCurrencySymbol(currency)}
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.amount}
                          onChange={(e) => updateItemAmount(i, parseFloat(e.target.value) || 0)}
                          className="flex h-8 w-full rounded-lg border border-input bg-background pl-7 pr-2.5 text-sm font-mono tabular-nums focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addItem}
              className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-muted-foreground/30 py-2.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
            >
              <Plus size={13} /> Add Item
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Tax & additional charges</label>
            <div className="relative w-full sm:w-48">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                {getCurrencySymbol(currency)}
              </span>
              <input
                type="number"
                step="0.01"
                value={taxAndCharges}
                onChange={(e) => { markDirty(); setTaxAndCharges(parseFloat(e.target.value) || 0); }}
                className="flex h-9 w-full rounded-lg border border-input bg-background pl-7 pr-3 text-sm font-mono tabular-nums focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={() => setStep("participants")} className="flex-1" disabled={!merchant.trim()}>
              Next: Add People
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      )}

      {/* Step: Participants */}
      {step === "participants" && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setStep("items")}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft size={12} />
            Back to items
          </button>

          <div className="flex items-center justify-between rounded-xl border bg-card p-3">
            <div className="flex items-center gap-3">
              <div className="flex size-8 items-center justify-center rounded-full bg-primary/10">
                <Users size={14} className="text-primary" />
              </div>
              <span className="text-sm font-medium">Include myself</span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={includeMyself}
              onClick={() => setIncludeMyself(!includeMyself)}
              className={`relative inline-flex h-6 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 ${
                includeMyself ? "bg-primary" : "bg-muted"
              }`}
            >
              <span className={`pointer-events-none inline-block size-5 rounded-full bg-background shadow-sm ring-0 transition-transform ${
                includeMyself ? "translate-x-4" : "translate-x-0"
              }`} />
            </button>
          </div>

          <p className="text-sm font-medium">Other participants</p>

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
                  <X size={13} />
                </button>
              </div>
            ))}
            {participants.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-3">
                Add at least one other person to split with
              </p>
            )}
          </div>

          <ContactSearch
            people={people}
            query={contactQuery}
            onQueryChange={setContactQuery}
            onSelect={handleSelectContact}
            onAddNew={handleAddNewContact}
          />

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleProceedToMethod} disabled={getEffectiveParticipants().length < 2} className="flex-1">
              Next: Split Method
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      )}

      {/* Step: Method */}
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
                Choose who pays for each item, with optional custom ratios
              </p>
              <Button onClick={() => { initAssignments(); setStep("assign"); }} className="w-full sm:w-auto">
                Configure Split
                <ChevronRight size={14} />
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-xl border bg-card overflow-hidden">
                {effectiveParticipants.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3 px-3 py-2.5 border-b last:border-b-0">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                      <Users size={14} className="text-muted-foreground" />
                    </div>
                    <span className="flex-1 text-sm truncate">{getParticipantLabel(p)}</span>
                    {method === "equal" && (
                      <span className="font-mono tabular-nums text-sm">
                        {getCurrencySymbol(currency)}{methodAmounts[i]?.toFixed(2) || "0.00"}
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
                          {getCurrencySymbol(currency)}
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={methodAmounts[i] || 0}
                          onChange={(e) => updateMethodAmount(i, parseFloat(e.target.value) || 0)}
                          className="w-full rounded-lg border border-input bg-background pl-7 pr-2.5 py-1.5 text-right text-sm font-mono tabular-nums focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
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
                    {getCurrencySymbol(currency)}{total.toFixed(2)}
                  </span>
                </div>
              )}

              {method === "custom" && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    Remaining: {getCurrencySymbol(currency)}{Math.max(0, total - getTotalMethodAmount()).toFixed(2)}
                  </span>
                  <span className={`font-mono tabular-nums ${Math.abs(getTotalMethodAmount() - total) > 0.01 ? "text-destructive" : ""}`}>
                    {getCurrencySymbol(currency)}{getTotalMethodAmount().toFixed(2)} / {getCurrencySymbol(currency)}{total.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            {method !== "by-item" && (
              <Button onClick={handleConfirm} disabled={creating} className="flex-1">
                {creating ? (
                  <><Loader2 size={16} className="animate-spin" /> Creating...</>
                ) : (
                  <><Check size={16} /> Confirm & Create Expense</>
                )}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Step: Assign Items (by-item) */}
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

          <BillItemAssignmentEditor
            key={assignKey}
            items={items.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              amount: item.amount,
            }))}
            participants={getEffectiveParticipants().map((p) => ({
              id: p.id,
              label: p.guestName || "You",
            }))}
            currency={currency}
            taxAndCharges={taxAndCharges}
            assignments={itemAssignments}
            onAssignmentsChange={setItemAssignments}
          />

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row">
            <Button variant="outline" size="lg" onClick={handleClose} className="min-h-11 flex-1">
              Cancel
            </Button>
            <Button size="lg" onClick={handleConfirm} disabled={creating} className="min-h-11 flex-1">
              {creating ? (
                <><Loader2 size={16} className="animate-spin" /> Creating...</>
              ) : (
                <><Check size={16} /> Confirm & Create Expense</>
              )}
            </Button>
          </div>
        </div>
      )}
      <NewContactDialog
        open={newContactOpen}
        initialName={newContactName}
        onClose={() => setNewContactOpen(false)}
        onCreated={handleNewContactCreated}
      />
    </Dialog>
  );
}
