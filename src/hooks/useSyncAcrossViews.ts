import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Hook para sincronizar dados entre diferentes views (Mapa Estratégico, Assistente, Detalhes)
 * Invalida queries automaticamente quando há mudanças em objetivos, KRs, entregáveis ou tarefas
 * 
 * Uso:
 * ```tsx
 * useSyncAcrossViews({
 *   companyId,
 *   objectiveIds,
 *   deliverableIds,
 *   taskIds,
 *   krIds,
 *   cycleIds,
 * });
 * ```
 */

interface SyncOptions {
  companyId?: string;
  objectiveIds?: string[];
  deliverableIds?: string[];
  taskIds?: string[];
  krIds?: string[];
  cycleIds?: string[];
}

export function useSyncAcrossViews({
  companyId,
  objectiveIds = [],
  deliverableIds = [],
  taskIds = [],
  krIds = [],
  cycleIds = [],
}: SyncOptions = {}) {
  const qc = useQueryClient();
  const previousIds = useRef({
    objectives: [] as string[],
    deliverables: [] as string[],
    tasks: [] as string[],
    krs: [] as string[],
    cycles: [] as string[],
  });

  useEffect(() => {
    const newIds = {
      objectives: objectiveIds,
      deliverables: deliverableIds,
      tasks: taskIds,
      krs: krIds,
      cycles: cycleIds,
    };
    const prev = previousIds.current;

    // Detectar mudanças em cada tipo
    const addedObjectives = objectiveIds.filter((id) => !prev.objectives.includes(id));
    const addedDeliverables = deliverableIds.filter((id) => !prev.deliverables.includes(id));
    const addedTasks = taskIds.filter((id) => !prev.tasks.includes(id));
    const addedKrs = krIds.filter((id) => !prev.krs.includes(id));
    const addedCycles = cycleIds.filter((id) => !prev.cycles.includes(id));

    const hasChanges =
      addedObjectives.length > 0 ||
      addedDeliverables.length > 0 ||
      addedTasks.length > 0 ||
      addedKrs.length > 0 ||
      addedCycles.length > 0;

    if (hasChanges) {
      // Invalidar queries baseadas em mudanças
      invalidateRelatedQueries(qc, {
        companyId,
        addedObjectives,
        addedDeliverables,
        addedTasks,
        addedKrs,
        addedCycles,
      });
    }

    previousIds.current = newIds;
  }, [objectiveIds.join(","), deliverableIds.join(","), taskIds.join(","), krIds.join(","), cycleIds.join(","), companyId, qc]);
}

/**
 * Invalida queries relacionadas de forma granular e inteligente
 */
function invalidateRelatedQueries(
  qc: ReturnType<typeof useQueryClient>,
  {
    companyId,
    addedObjectives,
    addedDeliverables,
    addedTasks,
    addedKrs,
    addedCycles,
  }: {
    companyId?: string;
    addedObjectives: string[];
    addedDeliverables: string[];
    addedTasks: string[];
    addedKrs: string[];
    addedCycles: string[];
  }
) {
  const invalidations: string[] = [];

  // Se houver mudanças em objetivos, invalidar queries relacionadas a objetivos
  if (addedObjectives.length > 0) {
    qc.invalidateQueries({ queryKey: ["okr-objectives"] });
    qc.invalidateQueries({ queryKey: ["okr-annual-objectives"] });
    qc.invalidateQueries({ queryKey: ["okr-quarter-objectives"] });
    qc.invalidateQueries({ queryKey: ["objectives"] });
    invalidations.push(`${addedObjectives.length} objetivos`);
  }

  // Se houver mudanças em KRs, invalidar queries de KRs e também objetivos
  if (addedKrs.length > 0) {
    qc.invalidateQueries({ queryKey: ["okr-krs"] });
    qc.invalidateQueries({ queryKey: ["okr-annual-krs"] });
    qc.invalidateQueries({ queryKey: ["okr-quarter-krs"] });
    qc.invalidateQueries({ queryKey: ["okr-tactical-krs"] });
    qc.invalidateQueries({ queryKey: ["krs"] });
    // KRs mudam também invalidam objetivos pois afetam a contagem
    qc.invalidateQueries({ queryKey: ["okr-objectives"] });
    invalidations.push(`${addedKrs.length} KRs`);
  }

  // Se houver mudanças em entregáveis, invalidar queries de entregáveis e KRs
  if (addedDeliverables.length > 0) {
    qc.invalidateQueries({ queryKey: ["okr-deliverables"] });
    qc.invalidateQueries({ queryKey: ["okr-tactical-deliverables"] });
    qc.invalidateQueries({ queryKey: ["deliverables"] });
    // Entregáveis mudam também invalidam KRs
    qc.invalidateQueries({ queryKey: ["okr-krs"] });
    invalidations.push(`${addedDeliverables.length} entregáveis`);
  }

  // Se houver mudanças em tarefas, invalidar queries de tarefas e entregáveis
  if (addedTasks.length > 0) {
    qc.invalidateQueries({ queryKey: ["okr-tasks"] });
    qc.invalidateQueries({ queryKey: ["tasks"] });
    // Tarefas mudam também invalidam entregáveis
    qc.invalidateQueries({ queryKey: ["okr-deliverables"] });
    invalidations.push(`${addedTasks.length} tarefas`);
  }

  // Se houver mudanças em ciclos, invalidar tudo que depende de ciclos
  if (addedCycles.length > 0) {
    if (companyId) {
      qc.invalidateQueries({ queryKey: ["okr-cycles", companyId] });
    }
    qc.invalidateQueries({ queryKey: ["okr-cycles"] });
    qc.invalidateQueries({ queryKey: ["cycles"] });
    // Ciclos mudam invalidam objetivos
    qc.invalidateQueries({ queryKey: ["okr-objectives"] });
    invalidations.push(`${addedCycles.length} ciclos`);
  }

  // Log para debug
  if (invalidations.length > 0) {
    console.log(
      `[useSyncAcrossViews] Queries invalidadas: ${invalidations.join(", ")}`,
      {
        companyId,
        addedObjectives: addedObjectives.length,
        addedKrs: addedKrs.length,
        addedDeliverables: addedDeliverables.length,
        addedTasks: addedTasks.length,
        addedCycles: addedCycles.length,
      }
    );
  }
}

/**
 * Hook simplificado para invalidar todas as queries de OKR
 * Útil para quando há mudanças globais (ex: alteração de empresa)
 */
export function useInvalidateAllOkrQueries() {
  const qc = useQueryClient();

  return () => {
    console.log("[useInvalidateAllOkrQueries] Invalidando todas as queries de OKR");
    qc.invalidateQueries({ queryKey: ["okr-"] });
    qc.invalidateQueries({ queryKey: ["okr-fundamentals"] });
    qc.invalidateQueries({ queryKey: ["okr-strategy"] });
    qc.invalidateQueries({ queryKey: ["okr-cycles"] });
    qc.invalidateQueries({ queryKey: ["okr-objectives"] });
    qc.invalidateQueries({ queryKey: ["okr-krs"] });
    qc.invalidateQueries({ queryKey: ["okr-deliverables"] });
    qc.invalidateQueries({ queryKey: ["okr-tasks"] });
    qc.invalidateQueries({ queryKey: ["okr-performance-indicators"] });
  };
}
