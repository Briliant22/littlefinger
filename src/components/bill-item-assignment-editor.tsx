"use client";

import { useMemo, useState } from "react";
import { Plus, X, Users, AlertCircle, ChevronDown } from "lucide-react";
import { getCurrencySymbol } from "@/lib/currency";

interface Participant {
  id: string;
  label: string;
}

interface ReceiptItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface ItemConfig {
  splitEvenly: boolean;
  useRatios: boolean;
  participantConfigs: Record<string, {
    splitRatio: string | null;
  }>;
}

export function BillItemAssignmentEditor({
  items,
  participants,
  currency,
  taxAndCharges,
  assignments,
  onAssignmentsChange,
}: {
  items: ReceiptItem[];
  participants: Participant[];
  currency: string;
  taxAndCharges: number;
  assignments: Record<number, ItemConfig>;
  onAssignmentsChange: (assignments: Record<number, ItemConfig>) => void;
}) {
  const sym = getCurrencySymbol(currency);

  function toggleSplitEvenly(itemIndex: number) {
    const config = assignments[itemIndex];
    if (!config) return;
    if (config.splitEvenly) {
      onAssignmentsChange({
        ...assignments,
        [itemIndex]: { splitEvenly: false, useRatios: false, participantConfigs: {} },
      });
    } else {
      const configs: Record<string, { splitRatio: string | null }> = {};
      participants.forEach((p) => {
        configs[p.id] = { splitRatio: null };
      });
      onAssignmentsChange({
        ...assignments,
        [itemIndex]: { splitEvenly: true, useRatios: false, participantConfigs: configs },
      });
    }
  }

  function addParticipantToItem(itemIndex: number, participantId: string) {
    const config = assignments[itemIndex];
    if (!config || config.participantConfigs[participantId]) return;
    onAssignmentsChange({
      ...assignments,
      [itemIndex]: {
        ...config,
        splitEvenly: false,
        participantConfigs: {
          ...config.participantConfigs,
          [participantId]: { splitRatio: null },
        },
      },
    });
  }

  function removeParticipantFromItem(itemIndex: number, participantId: string) {
    const config = assignments[itemIndex];
    if (!config) return;
    const updated = { ...config.participantConfigs };
    delete updated[participantId];
    onAssignmentsChange({
      ...assignments,
      [itemIndex]: {
        ...config,
        splitEvenly: false,
        participantConfigs: updated,
      },
    });
  }

  function setWeight(itemIndex: number, participantId: string, value: string) {
    const config = assignments[itemIndex];
    if (!config) return;
    const current = config.participantConfigs[participantId];
    if (!current) return;
    const cleaned = value.replace(/^0+/, "") || "0";
    onAssignmentsChange({
      ...assignments,
      [itemIndex]: {
        ...config,
        participantConfigs: {
          ...config.participantConfigs,
          [participantId]: { splitRatio: cleaned },
        },
      },
    });
  }

  function toggleItemRatio(itemIndex: number) {
    const config = assignments[itemIndex];
    if (!config) return;
    const newUseRatios = !config.useRatios;
    const configs: Record<string, { splitRatio: string | null }> = {};
    Object.keys(config.participantConfigs).forEach((pid) => {
      configs[pid] = newUseRatios ? { splitRatio: "1" } : { splitRatio: null };
    });
    onAssignmentsChange({
      ...assignments,
      [itemIndex]: {
        ...config,
        useRatios: newUseRatios,
        participantConfigs: configs,
      },
    });
  }

  function getWeight(pid: string, config: ItemConfig): number {
    const raw = config.participantConfigs[pid]?.splitRatio;
    if (!raw) return 1;
    const n = parseFloat(raw);
    return !isNaN(n) && n > 0 ? n : 1;
  }

  const totals = useMemo(() => {
    const participantTotals: Record<string, number> = {};
    participants.forEach((p) => { participantTotals[p.id] = 0; });

    items.forEach((item, itemIndex) => {
      const config = assignments[itemIndex];
      if (!config) return;

      const assignedIds = Object.keys(config.participantConfigs);
      if (assignedIds.length === 0) return;

      const itemShares: Record<string, number> = {};

      if (config.useRatios) {
        const totalWeight = assignedIds.reduce((sum, pid) => sum + getWeight(pid, config), 0);
        if (totalWeight > 0) {
          assignedIds.forEach((pid, idx) => {
            const w = getWeight(pid, config);
            if (idx === assignedIds.length - 1) {
              const partial = assignedIds.slice(0, -1).reduce((s, pid2) => {
                return s + Math.round(item.amount * getWeight(pid2, config) / totalWeight * 100) / 100;
              }, 0);
              itemShares[pid] = Math.round((item.amount - partial) * 100) / 100;
            } else {
              itemShares[pid] = Math.round(item.amount * w / totalWeight * 100) / 100;
            }
          });
        }
      } else {
        const share = Math.round((item.amount / assignedIds.length) * 100) / 100;
        assignedIds.forEach((pid, i) => {
          if (i === assignedIds.length - 1) {
            itemShares[pid] = Math.round((item.amount - share * (assignedIds.length - 1)) * 100) / 100;
          } else {
            itemShares[pid] = share;
          }
        });
      }

      assignedIds.forEach((pid) => {
        participantTotals[pid] = (participantTotals[pid] || 0) + (itemShares[pid] || 0);
      });
    });

    const taxPerPerson = participants.length > 0
      ? Math.round((taxAndCharges / participants.length) * 100) / 100
      : 0;
    participants.forEach((p) => {
      participantTotals[p.id] = Math.round((participantTotals[p.id] + taxPerPerson) * 100) / 100;
    });

    const grandTotal = Object.values(participantTotals).reduce((s, v) => s + v, 0);
    const expectedTotal = items.reduce((s, i) => s + i.amount, 0) + taxAndCharges;
    if (Math.abs(grandTotal - expectedTotal) > 0.01 && participants.length > 0) {
      const diff = Math.round((expectedTotal - grandTotal) * 100) / 100;
      const lastId = participants[participants.length - 1].id;
      participantTotals[lastId] = Math.round((participantTotals[lastId] + diff) * 100) / 100;
    }

    return { participantTotals, grandTotal: expectedTotal };
  }, [items, participants, assignments, taxAndCharges]);

  function getItemShare(itemIndex: number, participantId: string): string {
    const config = assignments[itemIndex];
    if (!config) return sym + "0.00";
    const assignedIds = Object.keys(config.participantConfigs);
    if (assignedIds.length === 0) return sym + "0.00";

    const item = items[itemIndex];
    if (!item) return sym + "0.00";

    if (config.useRatios) {
      const totalWeight = assignedIds.reduce((sum, pid) => sum + getWeight(pid, config), 0);
      if (totalWeight > 0) {
        const w = getWeight(participantId, config);
        return sym + (item.amount * w / totalWeight).toFixed(2);
      }
    }

    const share = item.amount / assignedIds.length;
    return sym + share.toFixed(2);
  }

  function getItemPct(itemIndex: number, participantId: string): string {
    const config = assignments[itemIndex];
    if (!config) return "";
    const assignedIds = Object.keys(config.participantConfigs);
    if (assignedIds.length === 0) return "";
    if (!config.useRatios) return "";
    const totalWeight = assignedIds.reduce((sum, pid) => sum + getWeight(pid, config), 0);
    if (totalWeight <= 0) return "";
    const w = getWeight(participantId, config);
    return Math.round(w / totalWeight * 100) + "%";
  }

  function hasWarning(itemIndex: number): boolean {
    const config = assignments[itemIndex];
    if (!config) return true;
    return Object.keys(config.participantConfigs).length === 0;
  }

  const unassignedParticipants = (itemIndex: number) => {
    const config = assignments[itemIndex];
    if (!config) return participants;
    return participants.filter((p) => !config.participantConfigs[p.id]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-1 px-1">
        {participants.map((p) => (
          <div
            key={p.id}
            className="inline-flex items-center gap-1.5 shrink-0 rounded-full bg-muted px-3 py-1.5 text-xs"
          >
            <Users size={11} className="text-muted-foreground" />
            <span className="truncate max-w-20">{p.label}</span>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {items.map((item, itemIndex) => {
          const config = assignments[itemIndex];
          const pConfigs = config?.participantConfigs || {};
          const assignedIds = Object.keys(pConfigs);
          const warn = hasWarning(itemIndex);

          return (
            <div key={itemIndex} className={`rounded-xl border p-3 transition-all ${warn ? "border-destructive/40 bg-destructive/5" : "bg-card"}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  {warn && <AlertCircle size={13} className="text-destructive shrink-0" />}
                  <span className="text-sm font-medium truncate">{item.description || `Item ${itemIndex + 1}`}</span>
                  {item.quantity > 1 && (
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      x{item.quantity}
                    </span>
                  )}
                </div>
                <span className="font-mono tabular-nums text-sm shrink-0 ml-2">
                  {sym}{item.amount.toFixed(2)}
                </span>
              </div>

              <div className="space-y-2">
                {assignedIds.map((pid) => {
                  const p = participants.find((pp) => pp.id === pid);
                  if (!p) return null;
                  const weight = pConfigs[pid]?.splitRatio || "1";
                  const pct = getItemPct(itemIndex, pid);
                  return (
                    <div key={pid} className="flex flex-wrap items-center gap-1.5 rounded-lg bg-muted/50 px-2.5 py-1.5 sm:flex-nowrap">
                      <span className="text-xs font-medium truncate min-w-0 flex-1">{p.label}</span>
                      {config?.useRatios && (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="1"
                            value={weight}
                            onChange={(e) => setWeight(itemIndex, pid, e.target.value)}
                            className="w-12 rounded-md border border-input bg-background px-1.5 py-0.5 text-xs text-center font-mono focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                          />
                          {pct && (
                            <span className="text-[10px] text-muted-foreground w-8 text-right">({pct})</span>
                          )}
                        </div>
                      )}
                      <span className="font-mono tabular-nums text-xs ml-auto">
                        {getItemShare(itemIndex, pid)}
                      </span>
                      {!config?.splitEvenly && (
                        <button
                          type="button"
                          onClick={() => removeParticipantFromItem(itemIndex, pid)}
                          className="flex size-5 items-center justify-center rounded text-muted-foreground hover:text-destructive"
                        >
                          <X size={11} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-2">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config?.splitEvenly ?? false}
                    onChange={() => toggleSplitEvenly(itemIndex)}
                    className="rounded border-muted-foreground/30 text-primary focus:ring-primary/50 size-3.5"
                  />
                  <span className="text-xs text-muted-foreground">Split evenly among all</span>
                </label>

                {!config?.splitEvenly && unassignedParticipants(itemIndex).length > 0 && (
                  <PersonPicker
                    participants={unassignedParticipants(itemIndex)}
                    onSelect={(p) => addParticipantToItem(itemIndex, p.id)}
                  />
                )}

                {Object.keys(config?.participantConfigs || {}).length > 0 && (
                  <div className="flex items-center gap-1.5 ml-auto">
                    <button
                      type="button"
                      onClick={() => config?.useRatios && toggleItemRatio(itemIndex)}
                      className={`px-2.5 py-1 text-[10px] font-medium rounded-l-full border transition-colors ${
                        config?.useRatios
                          ? "border-input bg-muted text-muted-foreground"
                          : "border-primary bg-primary/10 text-primary"
                      }`}
                    >
                      Even
                    </button>
                    <button
                      type="button"
                      onClick={() => !config?.useRatios && toggleItemRatio(itemIndex)}
                      className={`px-2.5 py-1 text-[10px] font-medium rounded-r-full border transition-colors ${
                        config?.useRatios
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-input bg-muted text-muted-foreground"
                      }`}
                    >
                      Ratio
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border bg-card p-4">
        <p className="text-xs font-medium text-muted-foreground mb-3">Summary</p>
        <div className="space-y-3">
          {participants.map((p) => {
            const total = totals.participantTotals[p.id] || 0;
            const itemCount = Object.entries(assignments).filter(
              ([_, config]) => config.participantConfigs[p.id]
            ).length;
            return (
              <div key={p.id}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <Users size={12} className="text-muted-foreground shrink-0" />
                    <span className="text-sm truncate font-medium">{p.label}</span>
                    <span className="text-[10px] text-muted-foreground">({itemCount} items)</span>
                  </div>
                  <span className="font-mono tabular-nums text-sm">{sym}{total.toFixed(2)}</span>
                </div>
                <div className="space-y-0.5 pl-5">
                  {items.map((item, itemIndex) => {
                    const config = assignments[itemIndex];
                    if (!config?.participantConfigs[p.id]) return null;
                    const pct = getItemPct(itemIndex, p.id);
                    return (
                      <div key={itemIndex} className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground truncate">
                          {item.description || `Item ${itemIndex + 1}`}
                          {pct && <span className="text-muted-foreground/60"> &middot; {pct}</span>}
                        </span>
                        <span className="font-mono tabular-nums text-muted-foreground shrink-0 ml-2">
                          {getItemShare(itemIndex, p.id)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        <div className="border-t mt-2 pt-2 flex items-center justify-between">
          <span className="text-xs font-medium">Tax & charges (evenly split)</span>
          <span className="font-mono tabular-nums text-xs text-muted-foreground">{sym}{taxAndCharges.toFixed(2)}</span>
        </div>
        <div className="border-t mt-2 pt-2 flex items-center justify-between">
          <span className="text-sm font-medium">Total</span>
          <span className="font-mono tabular-nums text-sm font-medium">{sym}{totals.grandTotal.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

function PersonPicker({
  participants,
  onSelect,
}: {
  participants: { id: string; label: string }[];
  onSelect: (p: { id: string; label: string }) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded-full border border-dashed border-muted-foreground/30 px-2 py-0.5 text-[10px] text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
      >
        <Plus size={10} /> Add person <ChevronDown size={9} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-1 w-44 rounded-lg border bg-popover p-1 shadow-lg">
            {participants.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => { onSelect(p); setOpen(false); }}
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-popover-foreground hover:bg-accent transition-colors"
              >
                <Users size={11} className="text-muted-foreground" />
                {p.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
