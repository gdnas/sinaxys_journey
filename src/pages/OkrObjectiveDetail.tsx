// ... existing imports ...

import { listOkrObjectivesByIds } from "@/lib/okrDb";

const OkrObjectiveDetail = () => {
  const { toast } = useToast();
  const { data: deliverables = [] } = useQuery({
    queryKey: ["okr-deliverables", objectiveId],
    enabled: objectiveId && krIds.length > 0,
    queryFn: () => listDeliverables(objectiveId),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["okr-tasks-for-objective", objectiveId, krIds.join(",")],
    enabled: krIds.length > 0,
    queryFn: () => listTasksByDeliverableId(krIds),
  });

  const deliverableTier = deliverables.length > 0 ? "Tier 2" : "Tier 1";

  // Função para obter a origem da tarefa com base no seu tipo
  const getTaskOrigin = (task: DbTaskWithSource): TaskOrigin => {
    if (task.deliverable_id) return 'deliverable';
    if (task.key_result_id) return 'okr';
    if (task.project_id) return 'project';
    return 'unknown';
  };

  // Render das tarefas por origem
  const renderTasksByOrigin = (tasks: DbTaskWithSource[]) => {
    if (!tasks.length) return null;

    const grouped = tasks.reduce((acc, task) => {
      const origin = getTaskOrigin(task);
      if (!acc[origin]) {
        acc[origin] = [];
      }
      acc[origin].push(task);
    }, {} as Record<TaskOrigin, DbTaskWithSource[]>);

    const sortedOrigins = Object.keys(grouped).sort();

    return (
      <div>
        {sortedOrigins.map((origin) => (
          <div key={origin} className="mb-6">
            <h3 className="text-lg font-semibold mb-4">{getTaskOriginLabel(origin)}</h3>
            {grouped[origin].map((task) => (
              <TaskCard 
                task={task}
                assigneeName={task.assignee_user_id ? getUserName(task.assignee_user_id) : "Sem responsável"}
                editable={canReadTasks.data[task.id]}
                key={task.key_result_id}
                onToggle={() => {
                  if (!canReadTasks.data[task.id]) return;
                  setToast({ title: "Sem permissão para alternar status", variant: "destructive" });
                }}
                onOpen={() => {
                  if (!canReadTasks.data[task.id]) return;
                  setToast({ title: "Sem permissão para ver detalhes", variant: "destructive" });
                }}
                onEdit={() => {
                  if (!canReadTasks.data[task.id]) return;
                  setToast({ title: "Sem permissão para editar", variant: "destructive" });
                }}
                onDelete={() => {
                  if (!canReadTasks.data[task.id]) return;
                  setToast({ title: "Sem permissão para excluir", variant: "destructive" });
                }}
              />
            ))}
          </div>
        ))}
      </div>
    );
  };

  // Render principal
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Detalhes do Objetivo</h1>
      <div className="mb-4">
        <span className="text-sm text-muted-foreground">Nível: {deliverableTier}</span>
      </div>
      {tasks.length > 0 && renderTasksByOrigin(tasks)}
    </div>
  );
};