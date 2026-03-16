import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export type WorkItemAccess = {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  isLoading: boolean;
  workItem: any;
};

export function useWorkItemAccess(workItemId: string): WorkItemAccess {
  const { user } = useAuth();
  const [workItem, setWorkItem] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!workItemId) {
      setIsLoading(false);
      return;
    }

    async function loadWorkItemAccess() {
      setIsLoading(true);
      try {
        const { data: wi, error: wiError } = await supabase
          .from('work_items')
          .select('*, project:projects(owner_user_id,tenant_id)')
          .eq('id', workItemId)
          .maybeSingle();

        if (wiError) throw wiError;
        setWorkItem(wi);
      } catch (err) {
        console.error('Error loading work item access:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadWorkItemAccess();
  }, [workItemId]);

  const isAdmin = user?.role === 'ADMIN';
  const isProjectOwner = workItem?.project?.owner_user_id === user?.id;

  const canView = !!workItem;
  const canEdit = isAdmin || isProjectOwner;
  const canDelete = isAdmin || isProjectOwner;

  return {
    canView,
    canEdit,
    canDelete,
    isLoading,
    workItem,
  };
}
