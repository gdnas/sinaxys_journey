import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Hook para sincronizar dados entre diferentes views (Mapa Estratégico, Assistente, Detalhes)
 * Invalida queries automaticamente quando há mudanças em objetivos, entregáveis ou tarefas
 */
export function useSyncAcrossViews(
  objectiveIds: string[],
  deliverableIds: string[],
  taskIds: string[]
) {
  const qc = useQueryClient();
  const previousIds = useRef({ objectives: [] as string[], deliverables: [] as string[], tasks: [] as string[] });

  useEffect(() => {
    const newIds = { objectives: objectiveIds, deliverables: deliverableIds, tasks: taskIds };
    const prev = previousIds.current;

    // Detectar mudanças
    const addedObjectives = objectiveIds.filter(id => !prev.objectives.includes(id));
    const addedDeliverables = deliverableIds.filter(id => !prev.deliverables.includes(id));
    const addedTasks = taskIds.filter(id => !prev.tasks.includes(id));

    const addedIds = [...addedObjectives, ...addedDeliverables, ...addedTasks];

    if (addedIds.length > 0) {
      // Algo foi adicionado - invalidar queries relevantes
      if (addedObjectives.length > 0) {
        qc.invalidateQueries({ queryKey: ["objectives"] });
      }
      if (addedDeliverables.length > 0) {
        qc.invalidateQueries({ queryKey: ["deliverables"] });
      }
      if (addedTasks.length > 0) {
        qc.invalidateQueries({ queryKey: ["tasks"] });
      }

      console.log(`[Sync] Invalidando queries por mudanças:`, addedIds.length, "objetivos, entregáveis, tarefas");
    }

    previousIds.current = newIds;
  }, [objectiveIds.join(","), deliverableIds.join(","), taskIds.join(",")]);
}