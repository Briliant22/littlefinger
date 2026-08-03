"use client";

import { useState, useRef } from "react";
import { MoreHorizontal, Pencil, Trash2, Loader2, Users, Receipt } from "lucide-react";
import { deleteExpense, type Expense } from "@/lib/api";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";

function Button({
  type,
  variant,
  onClick,
  className,
  disabled,
  children,
}: {
  type: "button" | "submit";
  variant?: "default" | "outline" | "destructive";
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const base = "inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all whitespace-nowrap h-9 px-4 gap-1.5 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50";
  const variants = {
    default: "bg-primary text-primary-foreground hover:bg-primary/80 active:translate-y-px",
    outline: "border border-input bg-background hover:bg-muted hover:text-foreground active:translate-y-px",
    destructive: "bg-destructive/10 text-destructive hover:bg-destructive/20 active:translate-y-px",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant || "default"]} ${className || ""}`}
    >
      {children}
    </button>
  );
}

export function ExpenseActions({
  expense,
  onEdit,
  onDeleted,
  onSplit,
  onViewSplit,
}: {
  expense: Expense;
  onEdit: () => void;
  onDeleted: () => void;
  onSplit?: () => void;
  onViewSplit?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteExpense(expense.id);
      onDeleted();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete expense");
      setDeleting(false);
    }
  }

  const hasSplit = !!expense.billSplit;

  return (
    <>
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Expense actions"
        >
          <MoreHorizontal size={16} />
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <div className="absolute right-0 top-full z-40 mt-1 w-40 overflow-hidden rounded-lg border bg-card p-1 shadow-lg animate-fade-in">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onEdit();
              }}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted"
            >
              <Pencil size={14} className="text-muted-foreground" />
              Edit
            </button>
            {hasSplit && onViewSplit && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onViewSplit();
                }}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted"
              >
                <Receipt size={14} className="text-muted-foreground" />
                View Split
              </button>
            )}
            {!hasSplit && onSplit && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onSplit();
                }}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted"
              >
                <Users size={14} className="text-muted-foreground" />
                Split Bill
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setConfirmOpen(true);
              }}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>
          </>
        )}
      </div>

      <Dialog open={confirmOpen} onClose={() => { if (!deleting) setConfirmOpen(false) }}>
        <DialogHeader>
          <DialogTitle>Delete Expense</DialogTitle>
          <DialogClose onClick={() => setConfirmOpen(false)} disabled={deleting} />
        </DialogHeader>
        <p className="text-sm text-muted-foreground mb-4">
          Are you sure you want to delete the expense for{" "}
          <span className="font-medium text-foreground">{expense.merchant}</span>?
          This action cannot be undone.
        </p>
        {deleteError && (
          <p className="text-sm text-destructive mb-4">{deleteError}</p>
        )}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setConfirmOpen(false)}
            className="flex-1"
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            className="flex-1"
            disabled={deleting}
          >
            {deleting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 size={16} />
                Delete
              </>
            )}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
