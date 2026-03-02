import { CheckCircle2, Lock, PlayCircle, ClipboardCheck, HelpCircle, BookOpenText } from "lucide-react";
import type { ModuleProgress, TrackModule } from "@/lib/domain";
import { cn } from "@/lib/utils";

function moduleIcon(type: TrackModule["type"]) {
  switch (type) {
    case "VIDEO":
      return <PlayCircle className="h-4 w-4" />;
    case "MATERIAL":
      return <BookOpenText className="h-4 w-4" />;
    case "QUIZ":
      return <HelpCircle className="h-4 w-4" />;
    case "CHECKPOINT":
      return <ClipboardCheck className="h-4 w-4" />;
  }
}

export function ModuleChecklist({
  modules,
  progressByModuleId,
  currentModuleId,
  onSelect,
}: {
  modules: TrackModule[];
  progressByModuleId: Record<string, ModuleProgress>;
  currentModuleId: string;
  onSelect: (moduleId: string) => void;
}) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Progresso</div>
          <div className="text-xs text-muted-foreground">Siga a sequência para liberar o próximo módulo.</div>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {modules.map((m) => {
          const p = progressByModuleId[m.id];
          const locked = p?.status === "LOCKED";
          const completed = p?.status === "COMPLETED";
          const available = p?.status === "AVAILABLE";

          return (
            <button
              key={m.id}
              type="button"
              disabled={!available && !completed}
              onClick={() => onSelect(m.id)}
              className={cn(
                "flex w-full items-start gap-3 rounded-xl border px-3 py-2 text-left transition",
                m.id === currentModuleId ? "border-[color:var(--sinaxys-primary)]" : "border-[color:var(--sinaxys-border)]",
                locked ? "opacity-60" : "hover:bg-[color:var(--sinaxys-tint)]/60",
              )}
            >
              <div
                className={cn(
                  "mt-0.5 grid h-8 w-8 place-items-center rounded-xl",
                  completed
                    ? "bg-[color:var(--sinaxys-primary)] text-white"
                    : available
                      ? "bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {completed ? <CheckCircle2 className="h-4 w-4" /> : locked ? <Lock className="h-4 w-4" /> : moduleIcon(m.type)}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="truncate text-sm font-medium text-[color:var(--sinaxys-ink)]">{m.title}</div>
                  <div className="text-xs text-muted-foreground">+{m.xpReward} Pontos</div>
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {completed ? "Concluído" : available ? "Disponível" : "Bloqueado"}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}