import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export default function useWorkItems(projectId: string) {
  const [taskList, setTaskList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTaskList = async () => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // 1) Fetch work items without embeds
      const { data: items, error: err } = await supabase
        .from('work_items')
        .select('id, title, description, status, priority, assignee_user_id, parent_id, due_date, start_date, created_at')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (err) throw err;
      const rows = (items ?? []) as any[];

      // 2) Collect assignee ids and parent ids
      const assigneeIds = Array.from(new Set(rows.map(r => r.assignee_user_id).filter(Boolean)));
      const parentIds = Array.from(new Set(rows.map(r => r.parent_id).filter(Boolean)));

      // 3) Fetch profiles for assignees separately
      let profilesMap: Record<string, any> = {};
      if (assigneeIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, name, email').in('id', assigneeIds);
        profilesMap = (profiles ?? []).reduce((acc: any, p: any) => ({ ...acc, [p.id]: p }), {});
      }

      // 4) Fetch parent tasks separately
      let parentsMap: Record<string, any> = {};
      if (parentIds.length > 0) {
        const { data: parents } = await supabase.from('work_items').select('id, title, status').in('id', parentIds);
        parentsMap = (parents ?? []).reduce((acc: any, p: any) => ({ ...acc, [p.id]: p }), {});
      }

      // 5) Assemble final tasks
      const final = rows.map(r => ({
        ...r,
        assignee: r.assignee_user_id ? profilesMap[r.assignee_user_id] ?? null : null,
        parent_task: r.parent_id ? parentsMap[r.parent_id] ?? null : null,
      }));

      setTaskList(final);
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTaskList();
  }, [projectId]);

  const refetch = () => loadTaskList();

  return { taskList, loading, error, refetch };
}