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

  const userIds = Array.from(new Set(rows.map((r: any) => r.user_id)));
  const { data: profiles } = await supabase.from("profiles").select("id, name, avatar_url").in("id", userIds);

  const profilesById: Record<string, any> = {};
  (profiles ?? []).forEach((p: any) => (profilesById[p.id] = p));

  const mentionRegex = /@([\w.\-]+)/g;
  const mentionTokens = Array.from(new Set(rows.flatMap((r: any) => Array.from(r.content?.matchAll(mentionRegex) ?? []).map((m: any) => m[1]))));

  let mentionsByToken: Record<string, { id: string; name: string }[]> = {};
  if (mentionTokens.length) {
    const found: any[] = [];
    for (const t of mentionTokens) {
      const qname = await supabase.from("profiles").select("id,name,email,company_id").ilike("name", `%${t}%`).limit(20);
      const qemail = await supabase.from("profiles").select("id,name,email,company_id").like("email", `${t}%`).limit(20);
      (qname.data ?? []).forEach((p: any) => found.push(p));
      (qemail.data ?? []).forEach((p: any) => found.push(p));
    }

    const unique = Array.from(new Map(found.map((p) => [p.id, p])).values());
    for (const t of mentionTokens) {
      const nt = normalizeText(t);
      const matches = unique
        .map((p: any) => ({ id: p.id, name: p.name ?? p.email, nameNorm: normalizeText(p.name ?? p.email) }))
        .filter((p: any) => p.nameNorm.includes(nt) || p.nameNorm.startsWith(nt));
      mentionsByToken[t] = matches.map((m: any) => ({ id: m.id, name: m.name }));
    }
  }

  const enriched = rows.map((r: any) => {
    const tokens = Array.from(new Set(Array.from(r.content?.matchAll(mentionRegex) ?? []).map((m: any) => m[1])));
    const mentionMap = tokens
      .map((tok: string) => ({ token: tok, match: (mentionsByToken[tok] ?? [])[0] ?? null }))
      .filter((x) => x.match !== null);

    return {
      id: r.id,
      content: r.content,
      user_id: r.user_id,
      created_at: r.created_at,
      user_name: profilesById[r.user_id]?.name ?? r.user_id,
      avatar_url: profilesById[r.user_id]?.avatar_url ?? null,
      mentions: mentionMap,
    };
  });

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

  const notifErrors: { mentionedUserId: string; error: any }[] = [];
  const mentionedUserIds: string[] = [];

  try {
    const mentionRegex = /@([\w.\-]+)/g;
    const matches = Array.from(new Set(Array.from(content.matchAll(mentionRegex)).map((m) => m[1])));
    if (matches.length > 0) {
      const { data: authorProfile } = await supabase.from("profiles").select("id, company_id, name, email").eq("id", userId).maybeSingle();
      const authorCompany = authorProfile?.company_id ?? null;
      const resolved: string[] = [];
      for (const name of matches) {
        let q;
        if (authorCompany) {
          q = await supabase
            .from("profiles")
            .select("id, name, email, company_id")
            .ilike("name", `%${name}%`)
            .eq("company_id", authorCompany)
            .limit(1)
            .maybeSingle();
        } else {
          q = await supabase
            .from("profiles")
            .select("id, name, email, company_id")
            .ilike("name", `%${name}%`)
            .limit(1)
            .maybeSingle();
        }
        if (q.data && q.data.id) {
          const mentionedId = q.data.id;
          if (mentionedId !== userId) resolved.push(mentionedId);
          continue;
        }

        let q2;
        if (authorCompany) {
          q2 = await supabase
            .from("profiles")
            .select("id, name, email, company_id")
            .like("email", `${name}%`)
            .eq("company_id", authorCompany)
            .limit(1)
            .maybeSingle();
        } else {
          q2 = await supabase
            .from("profiles")
            .select("id, name, email, company_id")
            .like("email", `${name}%`)
            .limit(1)
            .maybeSingle();
        }
        if (q2.data && q2.data.id) {
          const mentionedId = q2.data.id;
          if (mentionedId !== userId) resolved.push(mentionedId);
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
  } catch (e) {
    // ignore
  }

  return { comment, notifErrors, mentionedUserIds };
}