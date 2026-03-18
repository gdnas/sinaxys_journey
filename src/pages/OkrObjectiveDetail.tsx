import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { listOkrObjectivesByIds, listDeliverablesByKeyResultIds, listTasksByDeliverableIds, type DbTaskWithContext, type TaskOrigin } from "@/lib/okrDb";
import { TaskCard } from "@/components/okr/TaskCard";
import { useParams } from "react-router-dom";

const OkrObjectiveDetail = () => {
  const { toast } = useToast();
  const { objectiveId, krIds } = useParams<{ objectiveId: string; krIds: string }>();
  const { data: deliverables = [] } = useQuery({
    queryKey: ["okr-deliverables", objectiveId],
    enabled: !!objectiveId && !!krIds,
    queryFn: () => listDeliverablesByKeyResultIds(krIds?.split(',') || []),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["okr-tasks-for-objective", objectiveId, krIds],
    enabled: !!krIds && krIds.length > 0,
    queryFn: () => listTasksByDeliverableIds(krIds?.split(',') || []),
  });

  const canReadTasks = { data: {} } as any; // Stub
  const setToast = (msg: any) => toast(msg); // Stub
  const getUserName = (userId: string) => userId; // Stub

  // Função para obter a origem da tarefa com base no seu tipo
  const getTaskOrigin = (task: DbTaskWithContext): TaskOrigin => {
    if (task.deliverable_id) return 'deliverable';
    if (task.key_result_id) return 'okr';
    return 'unknown';
  };

  const getTaskOriginLabel = (origin: TaskOrigin): string => {
    const labels: Record<TaskOrigin, string> = {
      'project': 'Projetos',
      'deliverable': 'Entregáveis',
      'okr': 'OKRs',
      'unknown': 'Outros'
    };
    return labels[origin] || origin;
  };

  // Render das tarefas por origem
  const renderTasksByOrigin = (tasks: DbTaskWithContext[]) => {
    if (!tasks.length) return null;
    const grouped = tasks.reduce((acc, task) => {
      const origin = getTaskOrigin(task);
      if (!acc[origin]) {
        acc[origin] = [];
      }
      acc[origin].push(task);
      return acc;
    }, {} as Record<TaskOrigin, DbTaskWithContext[]>);
    const sortedOrigins = Object.keys(grouped).sort();
    return (
      <div>
        {sortedOrigins.map((origin) => (
          <div key={origin} className="mb-6">
            <h3 className="text-lg font-semibold mb-4">{getTaskOriginLabel(origin as TaskOrigin)}</h3>
            {grouped[origin as TaskOrigin].map((task) => (
              <TaskCard 
                key={task.id}
                task={task}
                assigneeName={task.assigned_to || "Sem responsável"}
                editable={canReadTasks.data[task.id]}
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
        <span className="text-sm text-muted-foreground">Objetivo ID: {objectiveId}</span>
      </div>
      {tasks.length > 0 && renderTasksByOrigin(tasks)}
    </div>
  );
};

export default OkrObjectiveDetail;
