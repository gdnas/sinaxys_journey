import React from "react";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import * as notificationsDb from "@/lib/notificationsDb";

export default function NotificationsPage() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const { data } = useQuery({ queryKey: ["my-notifications", userId, 0, 50], queryFn: () => notificationsDb.getMyNotifications(String(userId), 0, 50), enabled: !!userId });

  return (
    <div className="grid gap-6">
      <Card className="p-6">
        <h1 className="text-xl font-semibold">Notificações</h1>
        <div className="mt-4 grid gap-3">
          {data?.rows?.length ? (
            data.rows.map((n: any) => (
              <div key={n.id} className={`rounded-xl border p-3 ${n.is_read ? "bg-white" : "bg-[color:var(--sinaxys-tint)]"}`}>
                <div className="text-sm font-semibold">{n.title}</div>
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
