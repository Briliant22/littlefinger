import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

function DateInput({
  className,
  showIcon = true,
  ...props
}: React.ComponentProps<"input"> & { showIcon?: boolean }) {
  return (
    <div className="relative">
      {showIcon && (
        <Calendar
          size={14}
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
      )}
      <input
        type="date"
        className={cn(
          "flex h-9 w-full rounded-lg border border-input bg-background py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
          showIcon ? "pl-8 pr-3" : "px-3",
          className
        )}
        {...props}
      />
    </div>
  );
}

export { DateInput };