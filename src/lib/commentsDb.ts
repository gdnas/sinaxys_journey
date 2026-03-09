import { supabase } from "@/integrations/supabase/client";
import * as notificationsDb from "@/lib/notificationsDb";

export type ItemType = "TRACK" | "MODULE";

export async function getStats(itemType: ItemType, itemId: string) {
  const { data, error } = await supabase
    .from("item_stats")
    .select("views")
    .eq("item_type", itemType)
    .eq("item_id", itemId)
    .single();
  if (error && error.code !== "PGRST116") throw error;
  return data ?? { views: 0 };
}

export async function incrementView(itemType: ItemType, itemId: string) {
  // upsert increment
  const { data, error } = await supabase.rpc("increment_item_views", { p_item_type: itemType, p_item_id: itemId });
  if (error) throw error;
  return data;
}

export async function getLikes(itemType: ItemType, itemId: string) {
  const { data, error } = await supabase
    .from("item_likes")
    .select("user_id", { count: "exact" })
    .eq("item_type", itemType)
    .eq("item_id", itemId);
  if (error) throw error;
  return { count: data?.length ?? 0, rows: data ?? [] };
}

export async function toggleLike(itemType: ItemType, itemId: string, userId: string) {
  // check if liked
  const { data: existing } = await supabase
    .from("item_likes")
    .select("id")
    .eq("item_type", itemType)
    .eq("item_id", itemId)
    .eq("user_id", userId)
    .single();

  if (existing) {
    const { error } = await supabase.from("item_likes").delete().eq("id", existing.id);
    if (error) throw error;
    return { liked: false };
  }

  const { error } = await supabase.from("item_likes").insert({ item_type: itemType, item_id: itemId, user_id: userId });
  if (error) throw error;
  return { liked: true };
}

export async function getComments(itemType: ItemType, itemId: string, page = 0, perPage = 5) {
  // returns { rows: CommentWithUser[], total }
  const start = page * perPage;
  const end = start + perPage - 1;

  // select comments with total count
  const { data, error, count } = await supabase
    .from("item_comments")
    .select("id, content, user_id, created_at", { count: "exact" })
    .eq("item_type", itemType)
    .eq("item_id", itemId)
    .order("created_at", { ascending: false })
    .range(start, end);

  if (error) throw error;

  const rows = data ?? [];
  const total = typeof count === "number" ? count : rows.length;

  if (rows.length === 0) return { rows: [], total };

  const userIds = Array.from(new Set(rows.map((r: any) => r.user_id)));
  const { data: profiles } = await supabase.from("profiles").select("id, name, avatar_url").in("id", userIds);

  const profilesById: Record<string, any> = {};
  (profiles ?? []).forEach((p: any) => (profilesById[p.id] = p));

  const enriched = rows.map((r: any) => ({
    id: r.id,
    content: r.content,
    user_id: r.user_id,
    created_at: r.created_at,
    user_name: profilesById[r.user_id]?.name ?? r.user_id,
    avatar_url: profilesById[r.user_id]?.avatar_url ?? null,
  }));

  return { rows: enriched, total };
}

export async function getCommentCount(itemType: ItemType, itemId: string) {
  const { count, error } = await supabase
    .from("item_comments")
    .select("id", { count: "exact", head: true })
    .eq("item_type", itemType)
    .eq("item_id", itemId);
  if (error) throw error;
  return typeof count === "number" ? count : 0;
}

export async function addComment(itemType: ItemType, itemId: string, userId: string, content: string) {
  const { data, error } = await supabase.from("item_comments").insert({ item_type: itemType, item_id: itemId, user_id: userId, content }).select();
  if (error) throw error;
  const comment = data?.[0];

  // Detect mentions in the content of the form @username (alphanumeric, dot, dash, underscore)
  try {
    const mentionRegex = /@([\w.\-]+)/g;
    const matches = Array.from(new Set(Array.from(content.matchAll(mentionRegex)).map((m) => m[1])));
    if (matches.length > 0) {
      // Attempt to resolve mentioned usernames to profile ids
      const resolved: string[] = [];
      for (const name of matches) {
        // Try exact name match (case-insensitive) or email local-part
        const q = await supabase
          .from("profiles")
          .select("id, name, email")
          .ilike("name", name)
          .limit(1)
          .maybeSingle();
        if (q.data && q.data.id) {
          const mentionedId = q.data.id;
          if (mentionedId !== userId) resolved.push(mentionedId);
          continue;
        }

        // fallback: search by email local part
        const q2 = await supabase
          .from("profiles")
          .select("id, name, email")
          .like("email", `${name}%`)
          .limit(1)
          .maybeSingle();
        if (q2.data && q2.data.id) {
          const mentionedId = q2.data.id;
          if (mentionedId !== userId) resolved.push(mentionedId);
        }
      }

      // Create notifications for resolved mentions
      for (const mentionedUserId of resolved) {
        // Build a simple title/content
        const title = "Você foi mencionado em um comentário";
        const snippet = content.length > 200 ? content.slice(0, 200) + "…" : content;

        // Build href: prefer track link for TRACK items; for MODULE try to find its track
        let href: string | null = null;
        if (itemType === "TRACK") href = `/tracks/${itemId}`;
        else if (itemType === "MODULE") {
          // Try to fetch module's track_id
          const { data: mdata } = await supabase.from("modules").select("track_id").eq("id", itemId).maybeSingle();
          if (mdata && mdata.track_id) href = `/tracks/${mdata.track_id}`;
        }

        await notificationsDb.createNotification({ userId: mentionedUserId, actorUserId: userId, title, content: snippet, href, notifType: "mention" });
      }
    }
  } catch (e) {
    // don't block comment creation on mention errors
    // console.error(e);
  }

  return comment;
}

export async function updateComment(commentId: string, userId: string, content: string) {
  const { data, error } = await supabase
    .from("item_comments")
    .update({ content })
    .eq("id", commentId)
    .eq("user_id", userId)
    .select();
  if (error) throw error;
  return data?.[0];
}

export async function deleteComment(commentId: string, userId: string) {
  const { error } = await supabase.from("item_comments").delete().eq("id", commentId).eq("user_id", userId);
  if (error) throw error;
  return { ok: true };
}