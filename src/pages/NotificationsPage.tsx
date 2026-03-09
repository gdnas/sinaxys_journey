import React from "react";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import * as notificationsDb from "@/lib/notificationsDb";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function NotificationsPage() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const navigate = useNavigate();

  const { data } = useQuery({ queryKey: ["my-notifications", userId, 0, 50], queryFn: () => notificationsDb.getMyNotifications(String(userId), 0, 50), enabled: !!userId });

  return (
    <div className="grid gap-6">
      <Card className="p-6">
        <h1 className="text-xl font-semibold">Notificações</h1>
        <div className="mt-4 grid gap-3">
          {data?.rows?.length ? (
            data.rows.map((n: any) => (
              <div key={n.id} className={`rounded-xl border p-3 ${n.is_read ? "bg-white" : "bg-[color:var(--sinaxys-tint)]"}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {n.actor_avatar ? <img src={n.actor_avatar} className="h-8 w-8 rounded-full" alt={n.actor_name ?? ""} /> : <div className="h-8 w-8 rounded-full bg-[color:var(--sinaxys-tint)]" />}
                    <div>
                      <div className="text-sm font-semibold">{n.title}</div>
                      {n.actor_name ? <div className="text-xs text-muted-foreground">{n.actor_name}</div> : null}
                    </div>
                  </div>

                  {n.href ? (
                    <div>
                      <Button variant="outline" onClick={() => navigate(n.href)}>
                        Ir para
                      </Button>
                    </div>
                  ) : null}
                </div>
                {n.content ? <div className="mt-1 text-sm text-muted-foreground">{n.content}</div> : null}
              </div>
            ))
          ) : (
            <div className="text-sm text-muted-foreground">Nenhuma notificação.</div>
          )}
        </div>
      </Card>
    </div>
  );
}