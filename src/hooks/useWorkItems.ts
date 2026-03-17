import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export default function useWorkItems(projectId: string) {
  const [taskList, setTaskList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    async function loadTaskList() {
      setLoading(true);
      setError(null);
      try {
        const { data, error: err } = await supabase
          .from('work_items')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false });

        if (err) throw err;
        setTaskList(data ?? []);
      } catch (err: any) {
        setError(err.message || String(err));
      } finally {
        setLoading(false);
      }
    }

    loadTaskList();
  }, [projectId]);

  const refetch = () => loadTaskList();

  return { taskList, loading, error, refetch };
}
