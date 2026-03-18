// ... existing imports ...

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
      <>
        {sortedOrigins.map((origin) => (
          <>
            <div className="mb-4">
              <h3 className="text-lg font-semibold">{getTaskOriginLabel(origin)}</h3>
            </div>
            {grouped[origin].map((task) => (
              <TaskCard 
                task={task}
                assigneeName={task.assignee_user_id ? getUserName(task.assignee_id) : "Sem responsável"}
                editable={canReadTasks.data[task.id]}
                key={task.key_result_id}
                deliverable={task.deliverable_id}
                project={task.project_id}
                onToggle={() => {
                  if (!canReadTasks.data[task.id]) return;
                  setToast({ title: "Sem permissão para alternar status", variant: "deliverative" });
                  }}
                onOpen={() => {
                  if (!canReadTasks.data[task.id]) return;
                  setToast({ title: "Sem permissão para ver detalhes", variant: "deliverative" });
                  }}
                />
              ))}
          </div>
        ))}
      </>
    );
  };

  // Render principal
  return (
    <>
      {sortedOrigins.map((origin) => {
          <div key={origin}>
            <h2 className="text-xl font-semibold mb-6">{getTaskOriginLabel(origin)}</h2>
            </h2>
            {grouped[origin].map((task) => (
              <TaskCard 
                task={task}
                assigneeName={task.assignee_user_id ? getUserName(task.assignee_user_id) : "Sem responsável"}
                editable={canReadTasks.data[task.id]}
                key={task.key_result_id}
                deliverable={task.deliverable_id}
                project={task.project_id}
              />
            ))}
          </div>
        ))}
      </>
    );
  };
};