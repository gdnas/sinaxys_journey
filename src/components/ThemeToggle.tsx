import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const active = theme === "dark" ? "dark" : "light";

  return (
    <div className="flex items-center rounded-full border border-border bg-background p-1 shadow-sm">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setTheme("light")}
            aria-label="Ativar tema claro"
            className={cn(
              "h-9 w-9 rounded-full",
              active === "light" && "bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)]"
            )}
          >
            <Sun className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Tema claro</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setTheme("dark")}
            aria-label="Ativar modo escuro"
            className={cn(
              "h-9 w-9 rounded-full",
              active === "dark" && "bg-[color:var(--sinaxys-primary)] text-white"
            )}
          >
            <Moon className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Modo escuro</TooltipContent>
      </Tooltip>
    </div>
  );
}
