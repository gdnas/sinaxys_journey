// ... existing code ...

// Tipos de origem de tarefa
export type TaskOrigin = 'project' | 'deliverable' | 'okr' | 'unknown';

export interface DbTaskWithSource extends DbTask {
  deliverable?: { id: string; title: string };
  key_result?: { id: string; title: string };
  project?: { id: string; name: string };
}

export interface DbTaskWithContext = DbTask & {
  deliverable?: DbTaskWithSource;
  key_result?: { id: string; title: string };
  project?: DbTaskWithSource;
  objective_id?: string;
}

export type TaskSourceType = 'project' | 'deliverable' | 'okr' | 'unknown';

// Função auxiliar para determinar o tipo de tarefa
function getTaskSourceType(task: DbTaskWithSource): TaskSourceType {
  if (task.deliverable_id) return 'deliverable';
  if (task.key_result_id) return 'okr';
  if (task.project_id) return 'project';
  return 'unknown';
}

// Função para obter contexto visual da tarefa
function getTaskContext(task: DbTaskWithSource): TaskSourceType {
  const source = getTaskSourceType(task);
  const icon = source === 'deliverable' ? 'Package' : source === 'project' ? 'FolderKanban' : source === 'okr' ? 'Target';
  const prefix = source === 'deliverable' ? 'Entregável' : source === 'projeto' : 'KR';
  
  return { icon, prefix, label: source };
}