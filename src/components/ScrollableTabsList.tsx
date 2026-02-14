import type { ReactNode } from "react";
import { TabsList } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export function ScrollableTabsList({
  children,
  containerClassName,
  listClassName,
}: {
  children: ReactNode;
  containerClassName?: string;
  listClassName?: string;
}) {
  return (
    <div
      className={cn(
        "max-w-full overflow-x-auto [-webkit-overflow-scrolling:touch]",
        // keep vertical rhythm; avoid layout jump when scrollbar appears
        "pb-0.5",
        containerClassName,
      )}
    >
      <TabsList
        className={cn(
          // w-max guarantees the list can overflow and be scrolled on small screens
          "w-max justify-start gap-1 whitespace-nowrap",
          listClassName,
        )}
      >
        {children}
      </TabsList>
    </div>
  );
}
