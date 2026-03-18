import { supabase } from "@/integrations/supabase/client";
import * as notificationsDb from "@/lib/notificationsDb";

type MentionProfile = {
  id: string;
  name: string | null;
  email: string | null;
  company_id?: string | null;
};

function normalizeText(value: string) {
  try {
    return value
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .trim();
  } catch {
    return String(value).toLowerCase().trim();
  }
}

function normalizeMentionToken(value: string) {
  return normalizeText(value)
    .replace(/\s+/g, ".")
    .replace(/[^a-z0-9._-]/g, "");
}

function getEmailMentionToken(email: string | null | undefined) {
  const prefix = String(email ?? "").split("@")[0] ?? "";
  return normalizeMentionToken(prefix);
}

function getNameMentionToken(name: string | null | undefined) {
  return normalizeMentionToken(String(name ?? ""));
}

function getDisplayName(profile: MentionProfile) {
  return profile.name?.trim() || profile.email?.trim() || profile.id;
}

function extractMentionTokens(content: string) {
  const mentionRegex = /@([\w.\-]+)/g;
  return Array.from(new Set(Array.from(content.matchAll(mentionRegex)).map((match) => match[1])));
}

function resolveMentionMatch(token: string, profiles: MentionProfile[]) {
  const normalizedToken = normalizeMentionToken(token);
  const exactByEmail = profiles.find((profile) => getEmailMentionToken(profile.email) === normalizedToken);
  if (exactByEmail) return exactByEmail;

  const exactByName = profiles.find((profile) => getNameMentionToken(getDisplayName(profile)) === normalizedToken);
  if (exactByName) return exactByName;

  const startsWithName = profiles.find((profile) => getNameMentionToken(getDisplayName(profile)).startsWith(normalizedToken));
  if (startsWithName) return startsWithName;

  return (
    profiles.find((profile) => normalizeText(getDisplayName(profile)).includes(normalizeText(token))) ?? null
  );
}

async function listCompanyMentionProfiles(companyId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, email, company_id")
    .eq("company_id", companyId)
    .eq("active", true)
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as MentionProfile[];
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

  const userIds = Array.from(new Set(rows.map((row: any) => row.user_id)));
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, name, avatar_url, company_id")
    .in("id", userIds);

  const profilesById: Record<string, any> = {};
  (profiles ?? []).forEach((profile: any) => {
    profilesById[profile.id] = profile;
  });

  const companyProfilesCache = new Map<string, MentionProfile[]>();
  const enrichedRows: any[] = [];

  for (const row of rows) {
    const authorCompany = profilesById[row.user_id]?.company_id ?? null;
    const mentionTokens = extractMentionTokens(row.content ?? "");
    const mentionMap: { token: string; match: { id: string; name: string } | null }[] = [];

    if (authorCompany && mentionTokens.length > 0) {
      let companyProfiles = companyProfilesCache.get(authorCompany);
      if (!companyProfiles) {
        companyProfiles = await listCompanyMentionProfiles(authorCompany);
        companyProfilesCache.set(authorCompany, companyProfiles);
      }

      for (const token of mentionTokens) {
        const match = resolveMentionMatch(token, companyProfiles);
        mentionMap.push({
          token,
          match: match
            ? {
                id: match.id,
                name: getDisplayName(match),
              }
            : null,
        });
      }
    }

    enrichedRows.push({
      id: row.id,
      content: row.content,
      user_id: row.user_id,
      created_at: row.created_at,
      work_item_id: row.work_item_id,
      user_name: profilesById[row.user_id]?.name ?? row.user_id,
      avatar_url: profilesById[row.user_id]?.avatar_url ?? null,
      mentions: mentionMap,
    });
  }

  return { rows: enrichedRows, total };
}

export async function addComment(workItemId: string, userId: string, content: string) {
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

  const notifErrors: { mentionedUserId: string; error: unknown }[] = [];
  const mentionedUserIds: string[] = [];
  const resolvedProfiles: { token: string; id: string; name: string }[] = [];
  const mentionTokens = extractMentionTokens(content);

  try {
    if (mentionTokens.length > 0) {
      const { data: authorProfile } = await supabase
        .from("profiles")
        .select("id, company_id")
        .eq("id", userId)
        .maybeSingle();

      const authorCompany = authorProfile?.company_id ?? null;
      if (authorCompany) {
        const companyProfiles = await listCompanyMentionProfiles(authorCompany);
        const resolvedUsers = new Map<string, { id: string; name: string; token: string }>();

        for (const token of mentionTokens) {
          const match = resolveMentionMatch(token, companyProfiles);
          if (!match || match.id === userId) continue;

          resolvedProfiles.push({
            token,
            id: match.id,
            name: getDisplayName(match),
          });
          resolvedUsers.set(match.id, {
            id: match.id,
            name: getDisplayName(match),
            token,
          });
        }

        for (const mentionedUser of resolvedUsers.values()) {
          try {
            const title = "Você foi mencionado em um comentário de tarefa";
            const snippet = content.length > 200 ? `${content.slice(0, 200)}…` : content;
            const href = `/app/projetos/${workItem.project_id}/tarefas?taskId=${workItemId}&commentId=${comment.id}`;

            await notificationsDb.createNotification({
              userId: mentionedUser.id,
              actorUserId: userId,
              title,
              content: snippet,
              href,
              notifType: "work_item_mention",
            });

            mentionedUserIds.push(mentionedUser.id);
          } catch (notificationError) {
            notifErrors.push({
              mentionedUserId: mentionedUser.id,
              error: notificationError,
            });
          }
        }
      }
    }
  } catch (mentionError) {
    console.error("[workItemCommentsDb] Error processing mentions:", mentionError);
  }

  return { comment, notifErrors, mentionedUserIds, mentionTokens, resolvedProfiles };
}

export async function updateComment(commentId: string, userId: string, content: string) {
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

  const { data: workItem } = await supabase
    .from("work_items")
    .select("project_id")
    .eq("id", existingComment.work_item_id)
    .single();

  if (!workItem) {
    throw new Error("Work item not found");
  }

  const oldMentions = new Set(extractMentionTokens(existingComment.content ?? ""));
  const newMentions = new Set(extractMentionTokens(content));
  const addedMentions = Array.from(newMentions).filter((mention) => !oldMentions.has(mention));

  const { data, error } = await supabase
    .from("work_item_comments")
    .update({ content, updated_at: new Date().toISOString() })
    .eq("id", commentId)
    .eq("user_id", userId)
    .select()
    .maybeSingle();

  if (error) throw error;

  if (addedMentions.length > 0) {
    try {
      const { data: authorProfile } = await supabase
        .from("profiles")
        .select("id, company_id")
        .eq("id", userId)
        .maybeSingle();

      const authorCompany = authorProfile?.company_id ?? null;
      if (authorCompany) {
        const companyProfiles = await listCompanyMentionProfiles(authorCompany);
        const resolvedUsers = new Map<string, { id: string; name: string; token: string }>();

        for (const token of addedMentions) {
          const match = resolveMentionMatch(token, companyProfiles);
          if (!match || match.id === userId) continue;

          resolvedUsers.set(match.id, {
            id: match.id,
            name: getDisplayName(match),
            token,
          });
        }

        for (const mentionedUser of resolvedUsers.values()) {
          await notificationsDb.createNotification({
            userId: mentionedUser.id,
            actorUserId: userId,
            title: "Você foi mencionado em um comentário de tarefa",
            content: content.length > 200 ? `${content.slice(0, 200)}…` : content,
            href: `/app/projetos/${workItem.project_id}/tarefas?taskId=${existingComment.work_item_id}&commentId=${commentId}`,
            notifType: "work_item_mention",
          });
        }
      }
    } catch (mentionError) {
      console.error("[workItemCommentsDb] Error processing new mentions on edit:", mentionError);
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
