"use client";

import { useState, useEffect, useRef } from "react";
import { Users, Pencil, Loader2, Download } from "lucide-react";
import { Dialog, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  fetchBillItemAssignments,
  type Expense, type BillSplit, type BillItemAssignment,
} from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import { toPng } from "html-to-image";

function parseReceiptItems(receiptItems: string | null): Array<{ description: string; amount: number }> {
  if (!receiptItems) return [];
  try {
    return JSON.parse(receiptItems);
  } catch {
    return [];
  }
}

function getWeightPct(assignment: BillItemAssignment, allAssignments: BillItemAssignment[]): string {
  if (!assignment.splitRatio) return "";
  const weight = parseFloat(assignment.splitRatio);
  if (isNaN(weight) || weight <= 0) return "";
  const itemAssignments = allAssignments.filter((a) => a.itemIndex === assignment.itemIndex);
  const totalWeight = itemAssignments.reduce((sum, a) => {
    const w = a.splitRatio ? parseFloat(a.splitRatio) : 1;
    return sum + (!isNaN(w) && w > 0 ? w : 1);
  }, 0);
  if (totalWeight <= 0) return "";
  return ` (${Math.round(weight / totalWeight * 100)}%)`;
}

export function SplitResultModal({
  open,
  onClose,
  expense,
  onEdit,
}: {
  open: boolean;
  onClose: () => void;
  expense: Expense | null;
  onEdit?: () => void;
}) {
  const [assignments, setAssignments] = useState<BillItemAssignment[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && expense?.billSplit) {
      setLoadingAssignments(true);
      fetchBillItemAssignments(expense.billSplit.id)
        .then(setAssignments)
        .catch(() => {})
        .finally(() => setLoadingAssignments(false));
    } else {
      setAssignments([]);
    }
  }, [open, expense?.billSplit?.id]);

  async function handleDownload() {
    if (!contentRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(contentRef.current, {
        backgroundColor: "#ffffff",
        pixelRatio: 2,
      });
      const link = document.createElement("a");
      link.download = `split-bill-${expense?.merchant || "summary"}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("Failed to download split bill summary:", error);
    } finally {
      setDownloading(false);
    }
  }

  if (!expense) return null;
  if (!expense.billSplit) return null;

  const items = parseReceiptItems(expense.receiptItems);
  const split = expense.billSplit;

  const methodLabel = {
    equal: "Equal Split",
    percentage: "Percentage Split",
    custom: "Custom Amounts",
    "by-item": "By Item",
  }[split.method] || split.method;

  const getParticipantItems = (participantId: string) =>
    assignments.filter((a) => a.participantId === participantId);

  const getItemDescription = (itemIndex: number): string => {
    const item = items[itemIndex];
    return item?.description || `Item ${itemIndex + 1}`;
  };

  const itemsTotal = items.reduce((s, i) => s + i.amount, 0);
  const taxesAndCharges = Math.max(0, expense.amount - itemsTotal);
  const taxPerPerson = split.participants.length > 0
    ? Math.round((taxesAndCharges / split.participants.length) * 100) / 100
    : 0;
  const grandTotal = split.participants.reduce((s, p) => s + p.amountOwed, 0);

  function getTaxForParticipant(pid: string): number {
    return taxPerPerson;
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader>
        <DialogTitle>Split Bill Summary</DialogTitle>
        <DialogClose onClick={onClose} />
      </DialogHeader>

      <div className="max-h-[75vh] overflow-y-auto">
        <div className="space-y-3 p-6" ref={contentRef}>
          <div className="rounded-xl border bg-card p-3">
            <p className="text-sm font-medium truncate">{expense.merchant}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-muted-foreground">{methodLabel}</span>
              <span className="text-muted-foreground/40">&middot;</span>
              <span className="text-xs text-muted-foreground">{split.participants.length} participants</span>
            </div>
            <p className="font-mono tabular-nums text-lg font-medium mt-1">
              {formatCurrency(expense.amount, expense.currency)}
            </p>
            <p className="text-xs text-muted-foreground">
              {expense.category.name} &middot; {new Date(expense.date).toLocaleDateString()}
            </p>
          </div>

          {loadingAssignments ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 size={16} className="animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-3">
              {split.participants.map((p) => {
                const participantItems = getParticipantItems(p.id);
                const pTax = getTaxForParticipant(p.id);
                return (
                  <div key={p.id} className="rounded-xl border bg-card p-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <Users size={14} className="text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium truncate">
                          {p.person?.name || p.guestName || "Unknown"}
                        </span>
                      </div>
                      <span className="font-mono tabular-nums text-sm font-medium">
                        {formatCurrency(p.amountOwed, expense.currency)}
                      </span>
                    </div>

                    {split.method === "by-item" && participantItems.length > 0 && (
                      <div className="mt-1.5 space-y-1 pl-6">
                        {items.length > 0 && assignments.length > 0
                          ? participantItems.map((a) => (
                              <div key={a.id} className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground truncate">
                                  {getItemDescription(a.itemIndex)}
                                  {a.splitRatio && (
                                    <span className="text-muted-foreground/60">
                                      {getWeightPct(a, assignments)}
                                    </span>
                                  )}
                                </span>
                                <span className="font-mono tabular-nums shrink-0 ml-2">
                                  {formatCurrency(a.amount, expense.currency)}
                                </span>
                              </div>
                            ))
                          : null}
                      </div>
                    )}

                    {split.method !== "by-item" && (
                      <p className="text-[10px] text-muted-foreground pl-6">
                        {split.method === "equal" && "Equal share"}
                        {split.method === "percentage" && (
                          `${Math.round((p.amountOwed / (expense.amount || 1)) * 100)}% of total`
                        )}
                        {split.method === "custom" && "Custom amount"}
                      </p>
                    )}

                    {taxesAndCharges > 0 && (
                      <div className="mt-2 pl-6 flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">Tax & charges share</span>
                        <span className="font-mono tabular-nums text-muted-foreground">
                          {formatCurrency(pTax, expense.currency)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="rounded-xl border bg-card p-3 flex items-center justify-between">
            <span className="text-sm font-medium">Total</span>
            <span className="font-mono tabular-nums text-sm font-medium">
              {formatCurrency(grandTotal, expense.currency)}
            </span>
          </div>
        </div>

        <div className="flex gap-3 p-6 pt-2">
          {onEdit && (
            <Button variant="outline" onClick={onEdit} className="flex-1">
              <Pencil size={14} />
              Edit Split
            </Button>
          )}
          <Button variant="outline" onClick={handleDownload} disabled={downloading} className="flex-1">
            {downloading ? (
              <><Loader2 size={14} className="animate-spin" /> Downloading...</>
            ) : (
              <><Download size={14} /> Download</>
            )}
          </Button>
          <Button onClick={onClose} className={onEdit ? "flex-1" : "w-full"}>
            Close
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
