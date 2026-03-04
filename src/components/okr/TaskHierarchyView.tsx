import { useState } from "react";
import { ChevronDown, ChevronRight, Plus, Check, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import type { DbTask, WorkStatus, TaskLevelType } from "@/lib/okrDb";

type TaskHierarchyItem = {
  id: string;
  title: string;
  description: string | null;
  owner_user_id: string;
  status: WorkStatus;
  due_date: string | null;
  level_type: TaskLevelType;
  depth: number;
  children: TaskHierarchyItem[];
  completed_at: string | null;
};

type TaskHierarchyViewProps = {
  tasks: DbTask[];
  onCreateTask?: (parentId: string | null, levelType: TaskLevelType) => Promise<void>;
  onUpdateTask?: (taskId: string, updates: Partial<DbTask>) => Promise<void>;
  onDeleteTask?: (taskId: string) => Promise<void>;
  readOnly?: boolean;
};

export function TaskHierarchyView({
  tasks,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  readOnly = false,
}: TaskHierarchyViewProps) {
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  // Construir árvore de hierarquia
  const buildHierarchy = (tasks: DbTask[]): TaskHierarchyItem[] => {
    const taskMap = new Map<string, TaskHierarchyItem>();
    
    // Criar nós base
    tasks.forEach(task => {
      taskMap.set(task.id, {
        id: task.id,
        title: task.title,
        description: task.description,
        owner_user_id: task.owner_user_id,
        status: task.status,
        due_date: task.due_date,
        level_type: (task as any).level_type || "TASK",
        depth: (task as any).depth || 0,
        completed_at: (task as any).completed_at,
        children: [],
      });
    });

    // Construir árvore (tarefas sem pai são raízes)
    const rootTasks = tasks.filter(t => !(t as any).parent_task_id);
    rootTasks.forEach(root => {
      const node = taskMap.get(root.id);
      if (!node) return;

      // Buscar filhos diretos
      const children = tasks.filter(t => (t as any).parent_task_id === root.id);
      children.forEach(child => {
        const childNode = taskMap.get(child.id);
        if (childNode) {
          node.children.push(childNode);
        }
      });
    });

    // Buscar itens de checklist e vincular
    tasks.forEach(task => {
      const parentId = (task as any).parent_task_id;
      const parent = taskMap.get(parentId);
      if (parent && !(task as any).parent_task_id) {
        // Este é um item de checklist (tem pai mas não é pai de ninguém)
        if ((task as any).level_type === "CHECKLIST_ITEM") {
          // Encontrar o checklist pai
          const checklist = tasks.find(t => 
            (t as any).level_type === "CHECKLIST" && 
            (t as any).parent_task_id === parentId
          );
          if (checklist) {
            const checklistNode = taskMap.get(checklist.id);
            if (checklistNode) {
              checklistNode.children.push(taskMap.get(task.id)!);
            }
          }
        }
      }
    });

    return Array.from(taskMap.values()).filter(t => t.depth === 0);
  };

  const hierarchy = buildHierarchy(tasks);

  const toggleExpand = (taskId: string) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  const startEdit = (task: TaskHierarchyItem) => {
    setEditingTask(task.id);
    setEditTitle(task.title);
  };

  const saveEdit = async () => {
    if (editingTask && onUpdateTask) {
      await onUpdateTask(editingTask, { title: editTitle });
      setEditingTask(null);
      setEditTitle("");
    }
  };

  const cancelEdit = () => {
    setEditingTask(null);
    setEditTitle("");
  };

  const getStatusColor = (status: WorkStatus) => {
    switch (status) {
      case "TODO":
        return "text-gray-600 dark:text-gray-400";
      case "IN_PROGRESS":
        return "text-blue-600 dark:text-blue-400";
      case "DONE":
        return "text-green-600 dark:text-green-400";
      default:
        return "text-gray-600";
    }
  };

  const getStatusBadge = (status: WorkStatus) => {
    const statusMap: Record<WorkStatus, { label: string; variant: "default" | "secondary" | "destructive" }> = {
      TODO: { label: "A Fazer", variant: "secondary" },
      IN_PROGRESS: { label: "Em andamento", variant: "default" },
      DONE: { label: "Concluído", variant: "destructive" },
    };
    const config = statusMap[status];
    return (
      <Badge variant={config.variant} className="text-xs">
        {config.label}
      </Badge>
    );
  };

  const getLevelIcon = (levelType: TaskLevelType) => {
    switch (levelType) {
      case "TASK":
        return <GripVertical className="h-3 w-3" />;
      case "LIST":
        return <GripVertical className="h-3 w-3" />;
      case "CHECKLIST":
        return <Check className="h-3 w-3" />;
      case "CHECKLIST_ITEM":
        return <Check className="h-3 w-3 text-xs" />;
    }
  };

  const renderTaskNode = (node: TaskHierarchyItem, depth: number = 0): JSX.Element => {
    const isExpanded = expandedTasks.has(node.id);
    const isEditing = editingTask === node.id;
    const hasChildren = node.children.length > 0;
    const indent = depth * 24;

    return (
      <div key={node.id} className="w-full">
        <div
          className={`
            flex items-center gap-2 p-2 border-l-2 rounded-r transition-all
            ${node.status === "DONE" ? "border-green-500 bg-green-50/50 dark:bg-green-950/20" : ""}
            ${node.status === "IN_PROGRESS" ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20" : ""}
            ${node.status === "TODO" ? "border-gray-300 bg-white dark:bg-gray-900" : ""}
          `}
          style={{ marginLeft: `${indent}px` }}
        >
          <button
            type="button"
            onClick={() => hasChildren && toggleExpand(node.id)}
            className="flex-shrink-0 hover:bg-accent/50 rounded p-1 transition-colors"
          >
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )
            ) : (
              <Plus className="h-4 w-4 text-muted-foreground opacity-50" />
            )}
          </button>

          {getLevelIcon(node.level_type)}

          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                  onBlur={saveEdit}
                  className="h-8 text-sm"
                  disabled={readOnly}
                  autoFocus
                />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={cancelEdit}
                  disabled={readOnly}
                >
                  Cancelar
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span
                  className={`font-medium truncate ${node.status === "DONE" ? "line-through text-muted-foreground" : ""}`}
                >
                  {node.title}
                </span>
                {getStatusBadge(node.status)}
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => startEdit(node)}
                    className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Editar
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {node.due_date && (
              <span className="text-xs text-muted-foreground">
                {new Date(node.due_date).toLocaleDateString("pt-BR")}
              </span>
            )}
            {!readOnly && onDeleteTask && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onDeleteTask(node.id)}
                className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
              >
                ×
              </Button>
            )}
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="ml-6 mt-1 space-y-1">
            {node.children.map(child => renderTaskNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Hierarquia de Tarefas</h3>
          <p className="text-sm text-muted-foreground mt-1">
            4 níveis: Tarefa → Lista → Checklist → Item
          </p>
        </div>
        {!readOnly && onCreateTask && (
          <Button
            type="button"
            size="sm"
            onClick={() => onCreateTask(null, "TASK")}
          >
            <Plus className="h-4 w-4 mr-1" />
            Nova Tarefa
          </Button>
        )}
      </div>

      {hierarchy.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <GripVertical className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">Nenhuma tarefa criada</p>
          <p className="text-sm text-muted-foreground mt-1">
            Crie tarefas para começar a executar este entregável
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {hierarchy.map(node => renderTaskNode(node))}
        </div>
      )}
    </div>
  );
}
