"use client";

import { useState, useRef, useEffect } from "react";
import * as React from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface OptionData {
  value: string;
  label: string;
  disabled?: boolean;
}

function toOptions(children: React.ReactNode): OptionData[] {
  return React.Children.toArray(children).flatMap((child) => {
    if (!React.isValidElement(child)) return [];
    const props = child.props as { value?: string; disabled?: boolean; children?: React.ReactNode };
    if (props.value === undefined) return [];
    const label = React.Children.toArray(props.children).map(String).join("");
    return [{ value: props.value, label, disabled: !!props.disabled }];
  });
}

interface SelectProps {
  value?: string;
  defaultValue?: string;
  onChange?: (e: { target: { value: string } }) => void;
  onBlur?: () => void;
  name?: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
  "aria-label"?: string;
  placeholder?: string;
  className?: string;
  children?: React.ReactNode;
}

export function Select({
  value,
  defaultValue,
  onChange,
  onBlur,
  name,
  id,
  required,
  disabled,
  "aria-label": ariaLabel,
  placeholder,
  className,
  children,
}: SelectProps) {
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue ?? "");
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ left: number; top: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const currentValue = isControlled ? value : internalValue;
  const options = toOptions(children);
  const selectedOption = options.find((o) => o.value === currentValue);
  const placeholderOption = options.find((o) => o.value === "");
  const label = selectedOption?.label || placeholderOption?.label || placeholder || "Select...";

  function updatePosition() {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({ left: rect.left, top: rect.bottom + 4, width: rect.width });
    }
  }

  useEffect(() => {
    if (!open) return;
    updatePosition();
    function handleScroll() {
      updatePosition();
    }
    function handleResize() {
      updatePosition();
    }
    document.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);
    return () => {
      document.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [open]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      const inside =
        (rootRef.current && rootRef.current.contains(target)) ||
        (panelRef.current && panelRef.current.contains(target));
      if (!inside) {
        setOpen((prev) => {
          if (prev) onBlur?.();
          return false;
        });
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen((prev) => {
          if (prev) onBlur?.();
          return false;
        });
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onBlur]);

  function select(option: OptionData) {
    if (option.disabled) return;
    if (isControlled) {
      onChange?.({ target: { value: option.value } });
    } else {
      setInternalValue(option.value);
      onChange?.({ target: { value: option.value } });
    }
    setOpen(false);
    onBlur?.();
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        id={id}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          if (!disabled) setOpen((o) => !o);
        }}
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 py-1 text-sm text-foreground shadow-sm transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
          open && "ring-[3px] ring-ring/50",
          className
        )}
      >
        <span className={cn("truncate", !selectedOption && "text-muted-foreground")}>
          {label}
        </span>
        <ChevronDown size={14} className={cn("shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {name && <input type="hidden" name={name} value={currentValue} />}

      {open &&
        position &&
        createPortal(
          <div
            ref={panelRef}
            role="listbox"
            style={{
              position: "fixed",
              left: position.left,
              top: position.top,
              width: position.width,
              minWidth: 200,
              zIndex: 50,
            }}
            className="max-h-60 overflow-auto rounded-lg border bg-card p-1 shadow-lg animate-fade-in"
          >
            {options.map((option) => {
              const isSelected = option.value === currentValue;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  disabled={option.disabled}
                  onClick={() => select(option)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-sm transition-colors hover:bg-muted disabled:cursor-not-allowed",
                    option.disabled && "text-muted-foreground"
                  )}
                >
                  <span className="truncate">{option.label}</span>
                  {isSelected && <Check size={14} className="shrink-0 text-primary" />}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
}