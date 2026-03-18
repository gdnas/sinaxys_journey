import { supabase } from "@/integrations/supabase/client";
import * as notificationsDb from "@/lib/notificationsDb";

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

export async function getComments(workItemId: string, page = 0, perPage = 20) {
  const start = page * perPage;
  const end = start + perPage - 1;

  const { data, error, count } = await supabase
    .from("work_item_comments")
    .select("id, content, user_id, created_at, work_item_id", { count: "exact" })
    .eq("work_item_id", workItemId)
    .order("created_at", { ascending: true })
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
      work_item_id: r.work_item_id,
      user_name: profilesById[r.user_id]?.name ?? r.user_id,
      avatar_url: profilesById[r.user_id]?.avatar_url ?? null,
      mentions: mentionMap,
    });
  }

  return { rows: enrichedRows, total };
}

export async function addComment(workItemId: string, userId: string, content: string) {
  // First, get the work item to know the project_id
  const { data: workItem } = await supabase
    .from("work_items")
    .select("project_id, tenant_id")
    .eq("id", workItemId)
    .single();

  if (!workItem) {
    throw new Error("Work item not found");
  }

  const { data, error } = await supabase
    .from("work_item_comments")
    .insert({ work_item_id: workItemId, user_id: userId, content })
    .select();

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
      const { data: authorProfile } = await supabase
        .from("profiles")
        .select("id, company_id, name, email")
        .eq("id", userId)
        .maybeSingle();
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

        // Create notifications for each mentioned user
        for (const mentionedUserId of resolved) {
          try {
            const title = "Você foi mencionado em um comentário de tarefa";
            const snippet = content.length > 200 ? content.slice(0, 200) + "…" : content;
            const href = `/app/projetos/${workItem.project_id}/tarefas?taskId=${workItemId}&commentId=${comment.id}`;

            await notificationsDb.createNotification({
              userId: mentionedUserId,
              actorUserId: userId,
              title,
              content: snippet,
              href,
              notifType: "work_item_mention",
            });
            mentionedUserIds.push(mentionedUserId);
          } catch (ne) {
            notifErrors.push({ mentionedUserId, error: ne });
          }
        }
      }
    }
  } catch (e) {
    // ignore mention errors
    console.error("[workItemCommentsDb] Error processing mentions:", e);
  }

  return { comment, notifErrors, mentionedUserIds, mentionTokens, resolvedProfiles };
}

export async function updateComment(commentId: string, userId: string, content: string) {
  // Get the comment to check ownership and get work_item_id
  const { data: existingComment } = await supabase
    .from("work_item_comments")
    .select("id, work_item_id, user_id, content")
    .eq("id", commentId)
    .single();

  if (!existingComment) {
    throw new Error("Comment not found");
  }

  if (existingComment.user_id !== userId) {
    throw new Error("You can only edit your own comments");
  }

  // Get the work item to know the project_id
  const { data: workItem } = await supabase
    .from("work_items")
    .select("project_id")
    .eq("id", existingComment.work_item_id)
    .single();

  if (!workItem) {
    throw new Error("Work item not found");
  }

  // Extract old mentions
  const oldMentions = new Set(
    Array.from((existingComment.content ?? "").matchAll(/@([\w.\-]+)/g) ?? []).map((m) => m[1])
  );

  // Extract new mentions
  const newMentions = new Set(
    Array.from(content.matchAll(/@([\w.\-]+)/g) ?? []).map((m) => m[1])
  );

  // Find newly added mentions (in new but not in old)
  const addedMentions = Array.from(newMentions).filter((m) => !oldMentions.has(m));

  // Update the comment
  const { data, error } = await supabase
    .from("work_item_comments")
    .update({ content, updated_at: new Date().toISOString() })
    .eq("id", commentId)
    .eq("user_id", userId)
    .select()
    .maybeSingle();

  if (error) throw error;

  // Create notifications only for newly added mentions
  if (addedMentions.length > 0) {
    try {
      const { data: authorProfile } = await supabase
        .from("profiles")
        .select("id, company_id, name, email")
        .eq("id", userId)
        .maybeSingle();
      const authorCompany = authorProfile?.company_id ?? null;

      if (authorCompany) {
        for (const name of addedMentions) {
          let q;
          q = await supabase
            .from("profiles")
            .select("id, name, email, company_id")
            .ilike("name", `%${name}%`)
            .eq("company_id", authorCompany)
            .limit(1)
            .maybeSingle();

          if (q.data && q.data.id && q.data.id !== userId) {
            const title = "Você foi mencionado em um comentário de tarefa";
            const snippet = content.length > 200 ? content.slice(0, 200) + "…" : content;
            const href = `/app/projetos/${workItem.project_id}/tarefas?taskId=${existingComment.work_item_id}&commentId=${commentId}`;

            await notificationsDb.createNotification({
              userId: q.data.id,
              actorUserId: userId,
              title,
              content: snippet,
              href: `/app/projetos/${workItem.project_id}/tarefas?taskId=${existingComment.work_item_id}&commentId=${commentId}`,
              notifType: "work_item_mention",
            });
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
          if (q2.data && q2.data.id && q2.data.id !== userId) {
            const title = "Você foi mencionado em um comentário de tarefa";
            const snippet = content.length > 200 ? content.slice(0, 200) + "…" : content;
            const href = `/app/projetos/${workItem.project_id}/tarefas?taskId=${existingComment.work_item_id}&commentId=${commentId}`;

            await notificationsDb.createNotification({
              userId: q2.data.id,
              actorUserId: userId,
              title,
              content: snippet,
              href: `/app/projetos/${workItem.project_id}/tarefas?taskId=${existingComment.work_item_id}&commentId=${commentId}`,
              notifType: "work_item_mention",
            });
          }
        }
      }
    } catch (e) {
      console.error("[workItemCommentsDb] Error processing new mentions on edit:", e);
    }
  }

  return data ?? null;
}

export async function deleteComment(commentId: string, userId: string) {
  const { error } = await supabase
    .from("work_item_comments")
    .delete()
    .eq("id", commentId)
    .eq("user_id", userId);

  if (error) throw error;
  return { ok: true };
}