import React, { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as notificationsDb from "@/lib/notificationsDb";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type NotificationRow = {
  id: string;
  actor_user_id?: string | null;
  actor_name?: string | null;
  actor_avatar?: string | null;
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
  const navigate = useNavigate();

  const notificationsQuery = useQuery({
    queryKey: ["my-notifications", userId, page, perPage],
    queryFn: async () => await notificationsDb.getMyNotifications(String(userId), page, perPage),
    enabled: !!userId,
  });

  const unreadQuery = useQuery({
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
    if (!userId) return;

    const channel = supabase.channel(`user-notifications-${userId}`);

    // Listen to INSERT and UPDATE on notifications for this user
    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
      (payload) => {
        qc.invalidateQueries({ queryKey: ["my-notifications", userId] });
        qc.invalidateQueries({ queryKey: ["notifications-unread", userId] });
      },
    );

    channel.on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
      (payload) => {
        qc.invalidateQueries({ queryKey: ["my-notifications", userId] });
        qc.invalidateQueries({ queryKey: ["notifications-unread", userId] });
      },
    );

    channel.subscribe();

    // Cleanup
    return () => {
      try {
        channel.unsubscribe();
      } catch (e) {
        // ignore
      }
    };
  }, [userId, qc]);

  useEffect(() => {
    // If panel opens, refetch list
    if (open && userId) {
      qc.invalidateQueries({ queryKey: ["my-notifications", userId] });
      qc.invalidateQueries({ queryKey: ["notifications-unread", userId] });
    }
  }, [open, userId, qc]);

  const data = notificationsQuery.data ?? null;

  return (
    <div className="relative">
      <div className="relative inline-block">
        <Button size="icon" variant="outline" onClick={() => setOpen((s) => !s)} aria-label="Notificações">
          <Bell className="h-4 w-4" />
        </Button>
        {unreadQuery.data && (unreadQuery.data as number) > 0 ? (
          <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-xs font-semibold text-white">
            {(unreadQuery.data as number)}
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
              {data && (data as any).rows && (data as any).rows.length ? (
                (data as any).rows.map((n: NotificationRow) => (
                  <div key={n.id} className={`rounded-xl border p-3 ${n.is_read ? "bg-white" : "bg-[color:var(--sinaxys-tint)]"}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {n.actor_avatar ? <img src={n.actor_avatar} className="h-8 w-8 rounded-full" alt={n.actor_name ?? ""} /> : <div className="h-8 w-8 rounded-full bg-[color:var(--sinaxys-tint)]" />}
                        <div>
                          <div className="text-sm font-semibold">{n.title}</div>
                          {n.actor_name ? <div className="text-xs text-muted-foreground">{n.actor_name}</div> : null}
                        </div>
                      </div>

                      <Button size="icon" variant="ghost" onClick={() => { void markMutation.mutate(n.id); }}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    {n.content ? <div className="mt-1 text-sm text-muted-foreground">{n.content}</div> : null}
                    {n.href ? (
                      <div className="mt-2 flex items-center justify-end">
                        <Button
                          asChild
                          variant="outline"
                          onClick={() => {
                            // Mark as read and navigate
                            void markMutation.mutate(n.id);
                            setOpen(false);
                            navigate(n.href!);
                          }}
                        >
                          <a>Ir para</a>
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">Nenhuma notificação.</div>
              )}

              {data && (data as any).total > perPage ? (
                <div className="mt-2 flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">Página {page + 1} de {Math.ceil((data as any).total / perPage)}</div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>Anterior</Button>
                    <Button variant="outline" disabled={(page + 1) * perPage >= (data as any).total} onClick={() => setPage((p) => p + 1)}>Próxima</Button>
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