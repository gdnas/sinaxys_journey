import type React from "react";
import { HelpCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function OkrPageHeader({
  title,
  subtitle,
  icon,
  actions,
  help,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  help?: { title?: string; body: React.ReactNode };
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
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-sm font-semibold tracking-tight text-[color:var(--sinaxys-ink)]">{title}</div>
              {help ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-xl text-muted-foreground hover:bg-[color:var(--sinaxys-tint)]/40 hover:text-[color:var(--sinaxys-ink)]"
                      aria-label="Ajuda"
                      title="Ajuda"
                    >
                      <HelpCircle className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[340px] rounded-2xl border-[color:var(--sinaxys-border)] p-4">
                    <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">{help.title ?? "Como usar"}</div>
                    <div className="mt-2 text-sm text-muted-foreground">{help.body}</div>
                  </PopoverContent>
                </Popover>
              ) : null}
            </div>
            {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
          </div>
        </div>
        {actions ? <div className="flex items-center gap-2 md:pt-1">{actions}</div> : null}
      </div>
    </Card>
  );
}