import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ResponsiveTable({
  children,
  className,
  minWidth,
}: {
  children: ReactNode;
  className?: string;
  /** Optional minimum width for the table inside the scroller. e.g. "920px" */
  minWidth?: string;
}) {
  return (
    <div
      className={cn(
        "relative -mx-5 overflow-hidden sm:mx-0",
        // subtle edge hints
        "before:pointer-events-none before:absolute before:inset-y-0 before:left-0 before:w-6 before:bg-gradient-to-r before:from-[color:var(--sinaxys-bg)] before:to-transparent",
        "after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:w-6 after:bg-gradient-to-l after:from-[color:var(--sinaxys-bg)] after:to-transparent",
        className,
      )}
    >
      <div className="overflow-x-auto px-5 sm:px-0">
        <div style={minWidth ? { minWidth } : undefined}>{children}</div>
      </div>
    </div>
  );
}
