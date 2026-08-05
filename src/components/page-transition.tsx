"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ROUTE_ORDER = ["/expenses", "/debts", "/dashboard"];

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [prevPath, setPrevPath] = useState(pathname);
  const [direction, setDirection] = useState<"left" | "right">("right");

  if (prevPath !== pathname) {
    const from = ROUTE_ORDER.indexOf(prevPath);
    const to = ROUTE_ORDER.indexOf(pathname);
    setPrevPath(pathname);
    setDirection(to === -1 || to >= from ? "right" : "left");
  }

  return (
    <div
      key={pathname}
      className={cn(
        "overflow-x-clip md:animate-none",
        direction === "right" ? "animate-slide-in-right" : "animate-slide-in-left"
      )}
    >
      {children}
    </div>
  );
}