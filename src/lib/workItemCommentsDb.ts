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

function getWorkItemHref(workItem: { project_id: string | null; deliverable_id?: string | null }, workItemId: string, commentId?: string) {
  const qs = commentId ? `?taskId=${workItemId}&commentId=${commentId}` : `?taskId=${workItemId}`;

  if (workItem.project_id) {
    return `/app/projetos/${workItem.project_id}/tarefas${qs}`;
  }

  if (workItem.deliverable_id) {
    return `/okr/entregaveis/${workItem.deliverable_id}${qs}`;
  }

  return null;
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

  const userIds = Array.from(new Set(rows.map((row) => row.user_id).filter(Boolean)));
  const mentionTokens = Array.from(new Set(rows.flatMap((row) => extractMentionTokens(row.content ?? ""))));

  const [profilesResult, mentionProfilesResult] = await Promise.all([
    userIds.length
      ? supabase
          .from("profiles")
          .select("id, name, avatar_url")
          .in("id", userIds)
      : Promise.resolve({ data: [], error: null } as const),
    mentionTokens.length
      ? supabase
          .from("profiles")
          .select("id, name, email")
          .eq("active", true)
      : Promise.resolve({ data: [], error: null } as const),
  ]);

  if (profilesResult.error) throw profilesResult.error;
  if (mentionProfilesResult.error) throw mentionProfilesResult.error;

  const profilesById = Object.fromEntries(
    (profilesResult.data ?? []).map((profile) => [profile.id, profile])
  ) as Record<string, { id: string; name: string | null; avatar_url: string | null }>;

  const mentionProfiles = (mentionProfilesResult.data ?? []) as MentionProfile[];

  const enrichedRows: Array<{
    id: string;
    content: string;
    user_id: string;
    created_at: string;
    work_item_id: string;
    user_name: string;
    avatar_url: string | null;
    mentions: Array<{ token: string; match: { id: string; name: string } | null }>;
  }> = [];

  for (const row of rows) {
    const tokens = extractMentionTokens(row.content ?? "");
    const mentionMap: Array<{ token: string; match: { id: string; name: string } | null }> = [];

    for (const token of tokens) {
      const match = resolveMentionMatch(token, mentionProfiles);
      if (match) {
        mentionMap.push({
          token,
          match: {
            id: match.id,
            name: getDisplayName(match),
          },
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
    .select("project_id, deliverable_id, tenant_id")
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
          if (!match) continue;

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
            const href = getWorkItemHref(workItem, workItemId, comment?.id);

            await notificationsDb.createNotification({
              userId: mentionedUser.id,
              actorUserId: userId,
              title,
              content: snippet,
              href: href ?? undefined,
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
    .select("project_id, deliverable_id")
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
          if (!match) continue;

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
            href: getWorkItemHref(workItem, existingComment.work_item_id, commentId) ?? undefined,
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