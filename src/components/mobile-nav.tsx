"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ReceiptText, HandCoins } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/expenses", label: "Expense List", icon: ReceiptText },
  { href: "/debts", label: "IOUs", icon: HandCoins },
  { href: "/dashboard", label: "Financial Dashboard", icon: LayoutDashboard },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-sidebar-border bg-sidebar text-sidebar-foreground pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="flex items-stretch">
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 min-w-0 flex-col items-center justify-center gap-1 py-2",
                active
                  ? "rounded bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <item.icon size={20} className="shrink-0" />
              <span className="max-w-full truncate text-[10px] font-medium">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}