import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';

export default function TaskStatusHistory({ workItemId }: { workItemId: string }) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      if (!workItemId) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('work_item_status_history')
          .select('*')
          .eq('work_item_id', workItemId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setHistory(data ?? []);
      } catch (err: any) {
        console.error('Error loading status history:', err);
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, [workItemId]);

  if (loading) return <div>Carregando...</div>;

  return (
    <Card className="p-4">
      <h4 className="font-semibold mb-3">Historico de status</h4>
      {history.length === 0 ? (
        <div className="text-sm text-muted-foreground">Nenhuma mudanca registrada</div>
      ) : (
        <div className="space-y-2">
          {history.map((h) => (
            <div key={h.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
              <div>
                <span className="font-medium">
                  {h.old_status ? h.old_status : '(inicial)'} → {h.new_status}
                </span>
                <div className="text-xs text-muted-foreground">
                  {new Date(h.created_at).toLocaleString('pt-BR')}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
