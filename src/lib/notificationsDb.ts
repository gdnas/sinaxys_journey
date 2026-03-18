import { supabase } from "@/integrations/supabase/client";

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

export async function getMyNotifications(userId: string, page = 0, perPage = 20) {
  const start = page * perPage;
  const end = start + perPage - 1;
  const { data, error, count } = await supabase
    .from("notifications")
    .select("id, actor_user_id, title, content, href, notif_type, is_read, created_at", { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(start, end);
  if (error) throw error;
  const rows = (data ?? []) as NotificationRow[];
  const total = typeof count === "number" ? count : rows.length;

  if (rows.length === 0) return { rows: [], total };

  // Enrich actor info
  const actorIds = Array.from(new Set(rows.map((r) => r.actor_user_id).filter(Boolean) as string[]));
  let profiles: any[] = [];
  if (actorIds.length) {
    const { data: pData } = await supabase.from("profiles").select("id, name, avatar_url").in("id", actorIds);
    profiles = pData ?? [];
  }
  const profilesById: Record<string, any> = {};
  profiles.forEach((p) => (profilesById[p.id] = p));

  const enriched = rows.map((r) => ({
    ...r,
    actor_name: r.actor_user_id ? profilesById[r.actor_user_id]?.name ?? null : null,
    actor_avatar: r.actor_user_id ? profilesById[r.actor_user_id]?.avatar_url ?? null : null,
  }));

  return { rows: enriched, total };
}

export async function markAsRead(notificationId: string, userId: string) {
  const { data, error } = await supabase.from("notifications").update({ is_read: true }).eq("id", notificationId).eq("user_id", userId).select();
  if (error) throw error;
  return data?.[0];
}

export async function createNotification(payload: { userId: string; actorUserId?: string | null; title: string; content?: string; href?: string; notifType?: string; }) {
  try {
    console.log("[notificationsDb] createNotification ->", payload);
  } catch {}

  const { error } = await supabase.from("notifications").insert({
    user_id: payload.userId,
    actor_user_id: payload.actorUserId ?? null,
    title: payload.title,
    content: payload.content ?? null,
    href: payload.href ?? null,
    notif_type: payload.notifType ?? null,
  });

  if (error) {
    try {
      console.error("[notificationsDb] createNotification error ->", error);
    } catch {}
    throw error;
  }

  return { ok: true };
}

export async function getUnreadCount(userId: string) {

  const { count, error } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("is_read", false);
  if (error) throw error;
  return typeof count === "number" ? count : 0;
}