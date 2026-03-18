import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, ExternalLink, FolderKanban, Package, Pencil, Target, Trash2 } from "lucide-react";
import type { DbTaskWithSource, TaskSourceType } from "@/lib/okrDb";

function statusLabel(status: string) {
  if (status === "DONE") return "Concluído";
  if (status === "IN_PROGRESS") return "Em andamento";
  return "A fazer";
}

function statusBadgeClass(status: string) {
  if (status === "DONE") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "IN_PROGRESS") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

export function getTaskSourceType(task: DbTaskWithSource): TaskSourceType {
  if (task.deliverable_id) return "deliverable";
  if (task.project_id) return "project";
  if (task.key_result_id) return "okr";
  return "unknown";
}

function getTaskContext(task: DbTaskWithSource) {
  const source = getTaskSourceType(task);
  const icon = source === "deliverable" ? "Package" : source === "project" ? "FolderKanban" : source === "okr" ? "Target" : "Contexto indisponível";
  
  return { icon, prefix: source === "deliverable" ? "Entregável" : source === "project" ? "Projeto" : "KR", label: task.deliverable?.title ?? task.key_result?.title ?? "Entregável" };
}

export function TaskCard({ task, assigneeName, editable, onToggle, onOpen, onEdit, onDelete }: { task: DbTaskWithSource; assigneeName?: string; editable: boolean; onToggle: (task: DbTaskWithSource) => void; onOpen: (task: DbTaskWithSource) => void; onEdit: (task: DbTaskWithSource) => void; onDelete: (task: DbTaskWithSource) => void; }) {
  const source = getTaskSourceType(task);
  const StatusIcon = task.status === "DONE" ? CheckCircle2 : Circle;
  const ContextIcon = source === "deliverable" ? Package : source === "project" ? FolderKanban : source === "okr" ? Target : Package;

  return (
    <div
      role={editable ? "button" : undefined}
      tabIndex={editable ? 0 : -1}
      className={
        "group flex w-full items-start gap-3 rounded-3xl border border-[color:var(--sinaxys-border)] bg-white p-4 text-left shadow-sm transition" +
        (editable ? "cursor-pointer hover:border-[color:var(--sinaxys-primary)]/30 hover:bg-[color:var(--sinaxys-tint)]/30" : "")
      }
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!editable) return;
        onToggle(task);
      }}
      title={
        task.status === "DONE"
          ? "Tarefa concluída"
          : editable
            ? "Clique para alternar concluído"
            : "Sem permissão para editar esta tarefa"
      }
    >
      <div className="mt-0.5 text-[color:var(--sinaxys-primary)]">
        <StatusIcon className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]" title={task.title}>
          {task.title}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 font-medium text-[color:var(--sinaxys-ink)]">
            <ContextIcon className="h-3.5 w-3.5" />
            <span className="truncate">
              {source === "deliverable" ? "Entregável" : source === "project" ? "Projeto" : "KR"}: {task.deliverable?.title ?? task.key_result?.title ?? "Entregável"}
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 font-medium text-[color:var(--sinaxys-ink)]">
            👤 {assigneeName ?? "Sem responsável"}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 self-start">
        <Badge className={`rounded-full border ${statusBadgeClass(task.status)}`}>
          {statusLabel(task.status)}
        </Badge>

        {editable && (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-2xl text-muted-foreground hover:bg-[color:var(--sinaxys-tint)] hover:text-[color:var(--sinaxys-ink)]"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onOpen(task);
              }}
              title="Abrir detalhes"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-2xl text-muted-foreground hover:bg-[color:var(--sinaxys-tint)] hover:text-[color:var(--sinaxys-ink)]"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onEdit(task);
              }}
              title="Editar tarefa"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-2xl text-destructive/80 hover:bg-destructive/10 hover:text-destructive"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete(task);
              }}
              title="Excluir tarefa"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}