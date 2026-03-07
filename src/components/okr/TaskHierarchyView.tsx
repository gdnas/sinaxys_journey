import { ReactNode } from "react";
import type { DbTask, TaskLevelType } from "@/lib/okrDb";

interface TaskHierarchyViewProps {
  tasks: DbTask[];
  onCreateTask: (parentId: string | null, levelType: TaskLevelType) => Promise<void>;
  onUpdateTask: (taskId: string, updates: Partial<DbTask>) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  readOnly: boolean;
}

export function TaskHierarchyView({ tasks, onCreateTask, onUpdateTask, onDeleteTask, readOnly }: TaskHierarchyViewProps) {
  return (
    <div className="task-hierarchy-view">
      {/* Task hierarchy rendering logic */}
    </div>
  );
}