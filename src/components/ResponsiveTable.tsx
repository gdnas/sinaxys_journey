import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ResponsiveTable({
  children,
  className,
  minWidth,
}: {
  children: ReactNode;
  className?: string;
  /** Optional minimum width for the content inside the scroller. e.g. "920px" */
  minWidth?: string;
}) {
  return (
    <div className={cn("max-w-full overflow-x-auto [-webkit-overflow-scrolling:touch]", className)}>
      <div style={minWidth ? { minWidth } : undefined}>{children}</div>
    </div>
  );
}
