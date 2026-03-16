import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useWorkItems(projectId: string) {
  const [workItems, setWorkItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    async function loadWorkItems() {
      setLoading(true);
      setError(null);
      try {
        const { data, error: err } = await supabase
          .from('work_items')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false });

        if (err) throw err;
        setWorkItems(data ?? []);
      } catch (err: any) {
        setError(err.message || String(err));
      } finally {
        setLoading(false);
      }
    }

    loadWorkItems();
  }, [projectId]);

  const refetch = () => {
    loadWorkItems();
  };

  return { workItems, loading, error, refetch };
}
