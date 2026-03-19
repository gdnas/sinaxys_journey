import { Link, useLocation } from "react-router-dom";
import { BookOpenText, CalendarCheck2, MapPinned, Sparkles, Target, CalendarRange, Milestone } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const items = [
  { to: "/okr/hoje", label: "Hoje", icon: CalendarCheck2 },
  { to: "/okr/quarter", label: "Trimestre", icon: CalendarRange },
  { to: "/okr/year", label: "Ano", icon: Target },
  { to: "/okr/long-term", label: "Longo prazo", icon: Milestone },
  { to: "/okr/mapa", label: "Mapa", icon: MapPinned },
  { to: "/okr/fundamentos", label: "Fundamentos", icon: BookOpenText },
  { to: "/okr/assistente", label: "Assistente", icon: Sparkles },
] as const;

function isActive(pathname: string, to: string) {
  if (to === "/okr/hoje") return pathname === "/okr" || pathname.startsWith("/okr/hoje");
  return pathname.startsWith(to);
}

export function OkrSubnav({ className }: { className?: string }) {
  const { pathname } = useLocation();

  return (
    <div className="flex flex-col gap-2">
      <Card className={cn("rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-2", className)}>
        <div className="flex flex-wrap gap-2">
          {items.map((it) => {
            const Icon = it.icon;
            const active = isActive(pathname, it.to);
            return (
              <Link
                key={it.to}
                to={it.to}
                className={cn(
                  "inline-flex h-10 items-center gap-2 rounded-2xl px-4 text-sm font-semibold transition",
                  active
                    ? "bg-[color:var(--sinaxys-primary)] text-white"
                    : "bg-[color:var(--sinaxys-bg)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className={cn("h-4 w-4", active ? "text-white" : "text-[color:var(--sinaxys-primary)]")} />
                {it.label}
              </Link>
            );
          })}
        </div>
      </Card>
      <div className="text-center text-xs text-muted-foreground">
        Operar · Planejar · Entender · Apoiar
      </div>
    </div>
  );
}