import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export function CommitmentInspectorSection({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
}) {
  return (
    <Card className="overflow-hidden rounded-[28px] border-[color:var(--sinaxys-border)] bg-white/90 shadow-sm dark:bg-[color:var(--sinaxys-tint)]/80">
      <div className="px-5 py-4 sm:px-6">
        {eyebrow ? <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--sinaxys-primary)]">{eyebrow}</div> : null}
        <h2 className="mt-1 text-lg font-semibold tracking-tight text-[color:var(--sinaxys-ink)]">{title}</h2>
      </div>
      <Separator className="bg-[color:var(--sinaxys-border)]" />
      <div className="px-5 py-5 sm:px-6">{children}</div>
    </Card>
  );
}
