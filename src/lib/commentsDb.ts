import { supabase } from "@/integrations/supabase/client";
import * as notificationsDb from "@/lib/notificationsDb";

export type ItemType = "TRACK" | "MODULE";

function normalizeText(s: string) {
  try {
    return s
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .trim();
  } catch {
    return String(s).toLowerCase().trim();
  }
}

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
  const start = page * perPage;
  const end = start + perPage - 1;

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

  // Fetch author profiles (including company_id) for each comment author
  const userIds = Array.from(new Set(rows.map((r: any) => r.user_id)));
  const { data: profiles } = await supabase.from("profiles").select("id, name, avatar_url, company_id").in("id", userIds);

  const profilesById: Record<string, any> = {};
  (profiles ?? []).forEach((p: any) => (profilesById[p.id] = p));

  const mentionRegex = /@([\w.\-]+)/g;

  // Resolve mentions per-comment and restrict matches to the author's company
  const enrichedRows = [] as any[];
  for (const r of rows) {
    const text = r.content ?? "";
    const tokens = Array.from(new Set(Array.from(text.matchAll(mentionRegex) ?? []).map((m: any) => m[1])));
    const mentionMap: { token: string; match: { id: string; name: string } | null }[] = [];

    const authorCompany = profilesById[r.user_id]?.company_id ?? null;

    if (tokens.length && authorCompany) {
      for (const t of tokens) {
        // search for profiles within the same company first
        const qname = await supabase
          .from("profiles")
          .select("id,name,email,company_id")
          .ilike("name", `%${t}%`)
          .eq("company_id", authorCompany)
          .limit(10);
        const qemail = await supabase
          .from("profiles")
          .select("id,name,email,company_id")
          .like("email", `${t}%`)
          .eq("company_id", authorCompany)
          .limit(10);
        const found = [...(qname.data ?? []), ...(qemail.data ?? [])];
        const unique = Array.from(new Map(found.map((p: any) => [p.id, p])).values());
        const matches = unique
          .map((p: any) => ({ id: p.id, name: p.name ?? p.email, nameNorm: normalizeText(p.name ?? p.email) }))
          .filter((p: any) => p.nameNorm.includes(normalizeText(t)) || p.nameNorm.startsWith(normalizeText(t)));
        const chosen = matches[0] ? { id: matches[0].id, name: matches[0].name } : null;
        mentionMap.push({ token: t, match: chosen });
      }
    }

    enrichedRows.push({
      id: r.id,
      content: r.content,
      user_id: r.user_id,
      created_at: r.created_at,
      user_name: profilesById[r.user_id]?.name ?? r.user_id,
      avatar_url: profilesById[r.user_id]?.avatar_url ?? null,
      mentions: mentionMap,
    });
  }

  return { rows: enrichedRows, total };
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

  const notifErrors: { mentionedUserId: string; error: any }[] = [];
  const mentionedUserIds: string[] = [];
  const resolvedProfiles: { token: string; id: string; name: string }[] = [];
  const mentionTokens: string[] = [];

  try {
    const mentionRegex = /@([\w.\-]+)/g;
    const matches = Array.from(new Set(Array.from(content.matchAll(mentionRegex)).map((m) => m[1])));
    if (matches.length > 0) {
      mentionTokens.push(...matches);
      const { data: authorProfile } = await supabase.from("profiles").select("id, company_id, name, email").eq("id", userId).maybeSingle();
      const authorCompany = authorProfile?.company_id ?? null;

      // Enforce: mentions must resolve to profiles within the same company. If author's company is not set, do not notify anyone.
      if (!authorCompany) {
        // skip mention resolution to avoid cross-company notifications
      } else {
        const resolved: string[] = [];
        for (const name of matches) {
          let q;
          q = await supabase
            .from("profiles")
            .select("id, name, email, company_id")
            .ilike("name", `%${name}%`)
            .eq("company_id", authorCompany)
            .limit(1)
            .maybeSingle();

          if (q.data && q.data.id) {
            const mentionedId = q.data.id;
            if (mentionedId !== userId) resolved.push(mentionedId);
            if (q.data && q.data.id) resolvedProfiles.push({ token: name, id: q.data.id, name: q.data.name ?? q.data.email });
            continue;
          }

          let q2;
          q2 = await supabase
            .from("profiles")
            .select("id, name, email, company_id")
            .like("email", `${name}%`)
            .eq("company_id", authorCompany)
            .limit(1)
            .maybeSingle();
          if (q2.data && q2.data.id) {
            const mentionedId = q2.data.id;
            if (mentionedId !== userId) resolved.push(mentionedId);
            resolvedProfiles.push({ token: name, id: q2.data.id, name: q2.data.name ?? q2.data.email });
          }
        }

        for (const mentionedUserId of resolved) {
          try {
            const title = "Você foi mencionado em um comentário";
            const snippet = content.length > 200 ? content.slice(0, 200) + "…" : content;
            let href: string | null = null;
            if (itemType === "TRACK") href = `/tracks/${itemId}`;
            else if (itemType === "MODULE") {
              const { data: mdata } = await supabase.from("modules").select("track_id").eq("id", itemId).maybeSingle();
              if (mdata && mdata.track_id) href = `/tracks/${mdata.track_id}`;
            }

            await notificationsDb.createNotification({ userId: mentionedUserId, actorUserId: userId, title, content: snippet, href, notifType: "mention" });
            mentionedUserIds.push(mentionedUserId);
          } catch (ne) {
            notifErrors.push({ mentionedUserId, error: ne });
          }
        }
      }
    }
  } catch (e) {
    // ignore
  }

  return { comment, notifErrors, mentionedUserIds, mentionTokens, resolvedProfiles };
}

export async function updateComment(commentId: string, userId: string, content: string) {
  const { data, error } = await supabase
    .from("item_comments")
    .update({ content })
    .eq("id", commentId)
    .eq("user_id", userId)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function deleteComment(commentId: string, userId: string) {
  const { error } = await supabase.from("item_comments").delete().eq("id", commentId).eq("user_id", userId);
  if (error) throw error;
  return { ok: true };
}