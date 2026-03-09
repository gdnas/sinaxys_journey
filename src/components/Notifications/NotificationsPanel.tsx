import React, { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as notificationsDb from "@/lib/notificationsDb";
import { useAuth } from "@/lib/auth";

type NotificationRow = {
  id: string;
  actor_user_id?: string | null;
  title: string;
  content?: string | null;
  href?: string | null;
  notif_type?: string | null;
  is_read: boolean;
  created_at: string;
};

export default function NotificationsPanel() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);
  const perPage = 10;
  const qc = useQueryClient();

  const notificationsQuery = useQuery<{ rows: NotificationRow[]; total: number } | null>({
    queryKey: ["my-notifications", userId, page, perPage],
    queryFn: async () => await notificationsDb.getMyNotifications(String(userId), page, perPage),
    enabled: !!userId,
  });

  const unreadQuery = useQuery<number>({
    queryKey: ["notifications-unread", userId],
    queryFn: async () => await notificationsDb.getUnreadCount(String(userId)),
    enabled: !!userId,
  });

  const markMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!userId) throw new Error("Login necessário");
      return notificationsDb.markAsRead(id, userId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-notifications", userId] });
      qc.invalidateQueries({ queryKey: ["notifications-unread", userId] });
    },
  });

  useEffect(() => {
    // Optionally, auto open on initial unread notifications
  }, []);

  const data = notificationsQuery.data ?? null;

  return (
    <div className="relative">
      <div className="relative inline-block">
        <Button size="icon" variant="outline" onClick={() => setOpen((s) => !s)} aria-label="Notificações">
          <Bell className="h-4 w-4" />
        </Button>
        {unreadQuery.data && unreadQuery.data > 0 ? (
          <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-xs font-semibold text-white">
            {unreadQuery.data}
          </div>
        ) : null}
      </div>

      {open ? (
        <div className="absolute right-0 mt-2 w-[360px] z-40">
          <Card className="p-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Notificações</div>
              <Button size="icon" variant="ghost" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-3 grid gap-2">
              {data && data.rows && data.rows.length ? (
                data.rows.map((n) => (
                  <div key={n.id} className={`rounded-xl border p-3 ${n.is_read ? "bg-white" : "bg-[color:var(--sinaxys-tint)]"}`}>
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold">{n.title}</div>
                      <Button size="icon" variant="ghost" onClick={() => { void markMutation.mutate(n.id); }}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    {n.content ? <div className="mt-1 text-sm text-muted-foreground">{n.content}</div> : null}
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">Nenhuma notificação.</div>
              )}

              {data && data.total > perPage ? (
                <div className="mt-2 flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">Página {page + 1} de {Math.ceil(data.total / perPage)}</div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>Anterior</Button>
                    <Button variant="outline" disabled={(page + 1) * perPage >= data.total} onClick={() => setPage((p) => p + 1)}>Próxima</Button>
                  </div>
                </div>
              ) : null}
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}