import type React from "react";
import { Card } from "@/components/ui/card";

export function OkrPageHeader({
  title,
  subtitle,
  icon,
  actions,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <Card data-tour="okr-hero" className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4">
          {icon ? (
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]">
              {icon}
            </div>
          ) : null}
          <div>
            <div className="text-sm font-semibold tracking-tight text-[color:var(--sinaxys-ink)]">{title}</div>
            {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
          </div>
        </div>
        {actions ? <div className="flex items-center gap-2 md:pt-1">{actions}</div> : null}
      </div>
    </Card>
  );
}