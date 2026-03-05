import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Hook simples para invalidar queries relacionadas ao OKR quando ocorrerem mudanças
 * Garante que o Mapa e o Assistente sempre mostrem dados atualizados
 */
export function useSyncAcrossViews(objectiveIds: string[] = [], deliverableIds: string[] = [], taskIds: string[] = []) {
  const qc = useQueryClient();
  const previousIds = useRef(new Set<string>());

  useEffect(() => {
    const allIds = [...objectiveIds, ...deliverableIds, ...taskIds];
    
    // Comparar com os IDs anteriores
    const newIds = new Set(allIds);
    const addedIds = allIds.filter(id => !previousIds.current.has(id));
    
    if (addedIds.size > 0) {
      // Algo foi adicionado - invalidar queries relevantes
      const toInvalidate: string[] = [];
      
      if (objectiveIds.length > 0) toInvalidate.push(...objectiveIds);
      if (deliverableIds.length > 0) toInvalidate.push(...deliverableIds);
      if (taskIds.length > 0) toInvalidate.push(...taskIds);
      
      // Invalidar queries
      qc.invalidateQueries({ queries: toInvalidate });
      
      console.log(`[Sync] Invalidando queries por mudanças:`, addedIds.size, \"objetivos\", "entregáveis", "tarefas"]);
    }
    
    // Atualizar referência
    previousIds.current = newIds;
  }, [objectiveIds.join(","), deliverableIds.join(","), taskIds.join(",")]]);
  }, [objectiveIds.join(","), deliverableIds.join(","), taskIds.join(",")]]);
}, [objectiveIds.join(","), deliverableIds.join(","), taskIds.join(",")]]);
}
