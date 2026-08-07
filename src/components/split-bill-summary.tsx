"use client";

import { useState } from "react";
import { Users, CheckCircle, Circle, Loader2, ChevronRight } from "lucide-react";
import { toggleParticipantPaid, type BillSplit, type BillParticipant } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";

export function SplitBillSummary({
  split,
  currency,
  onViewDetails,
}: {
  split: BillSplit;
  currency: string;
  onViewDetails?: () => void;
}) {
  const [participants, setParticipants] = useState(split.participants);
  const [toggling, setToggling] = useState<string | null>(null);
  const [mirroredSplit, setMirroredSplit] = useState(split.participants);
  if (mirroredSplit !== split.participants) {
    setMirroredSplit(split.participants);
    setParticipants(split.participants);
  }

  async function handleTogglePay(participant: BillParticipant) {
    setToggling(participant.id);
    try {
      await toggleParticipantPaid(split.id, participant.id);
      setParticipants((prev) =>
        prev.map((p) =>
          p.id === participant.id ? { ...p, paid: !p.paid } : p
        )
      );
    } catch { }
    finally { setToggling(null); }
  }

  if (participants.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground sm:text-xs">
        <Users size={11} />
        <span>Split ({participants.length})</span>
        <span className="text-muted-foreground/50">&middot;</span>
        <span className="capitalize">{split.method}</span>
        {onViewDetails && (
          <>
            <span className="text-muted-foreground/30">&middot;</span>
            <button
              type="button"
              onClick={onViewDetails}
              className="inline-flex items-center gap-0.5 text-primary hover:underline"
            >
              Details <ChevronRight size={10} />
            </button>
          </>
        )}
      </div>
      <div className="space-y-1">
        {participants.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <button
                type="button"
                onClick={() => handleTogglePay(p)}
                disabled={toggling === p.id}
                className={`shrink-0 transition-colors ${
                  p.paid ? "text-primary" : "text-muted-foreground/50 hover:text-muted-foreground"
                }`}
              >
                {toggling === p.id ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : p.paid ? (
                  <CheckCircle size={12} />
                ) : (
                  <Circle size={12} />
                )}
              </button>
              <span className={`truncate text-[11px] sm:text-xs ${p.paid ? "line-through text-muted-foreground/60" : ""}`}>
                {p.person?.name || p.guestName || "Unknown"}
              </span>
            </div>
            <span className={`font-mono tabular-nums text-[11px] shrink-0 sm:text-xs ${
              p.paid ? "text-muted-foreground/60 line-through" : ""
            }`}>
              {formatCurrency(p.amountOwed, currency)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
