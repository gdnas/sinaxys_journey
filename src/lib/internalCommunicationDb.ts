import { supabase } from "@/integrations/supabase/client";

// Types
export type AnnouncementScope = "company" | "team";
export type AnnouncementStatus = "published" | "archived";

export interface DbCompanyAnnouncement {
  id: string;
  company_id: string;
  team_id: string | null;
  scope: AnnouncementScope;
  title: string;
  content: string;
  created_by: string;
  status: AnnouncementStatus;
  published_at: string;
  created_at: string;
  updated_at: string;
}

export interface DbAnnouncementRead {
  id: string;
  announcement_id: string;
  user_id: string;
  read_at: string;
}

export interface DbBirthdayEvent {
  id: string;
  company_id: string;
  employee_id: string;
  event_date: string;
  created_at: string;
}

export interface DbBirthdayComment {
  id: string;
  birthday_event_id: string;
  author_user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface DbAnnouncementAttachment {
  id: string;
  announcement_id: string;
  title: string;
  file_url: string;
  file_type: string;
  file_size: number | null;
  created_at: string;
}

export interface DbBirthdayCommentLike {
  id: string;
  birthday_comment_id: string;
  user_id: string;
  created_at: string;
}

// ============================================================================
// ANNOUNCEMENTS
// ============================================================================

export async function getVisibleAnnouncements(
  userId: string,
  companyId: string,
  teamId: string | null,
  limit: number = 10
): Promise<DbCompanyAnnouncement[]> {
  let query = supabase
    .from("company_announcements")
    .select("*")
    .eq("company_id", companyId)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(limit);

  // If we have a team id, include both company-scoped and team-scoped announcements
  if (teamId) {
    // Use PostgREST OR to combine company scope and team-scoped for the specific team
    query = query.or(`scope.eq.company,AND(scope.eq.team,team_id.eq.${teamId})`);
  } else {
    // No team -> only company-scoped announcements
    query = query.eq("scope", "company");
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data ?? []) as DbCompanyAnnouncement[];
}

export async function getAnnouncementById(
  announcementId: string
): Promise<DbCompanyAnnouncement | null> {
  const { data, error } = await supabase
    .from("company_announcements")
    .select("*")
    .eq("id", announcementId)
    .maybeSingle();

  if (error) throw error;
  return data as DbCompanyAnnouncement | null;
}

export async function getAnnouncementAttachments(
  announcementId: string
): Promise<DbAnnouncementAttachment[]> {
  const { data, error } = await supabase
    .from("company_announcement_attachments")
    .select("*")
    .eq("announcement_id", announcementId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as DbAnnouncementAttachment[];
}

export async function addAnnouncementAttachment(
  announcementId: string,
  attachment: {
    title: string;
    fileUrl: string;
    fileType: string;
    fileSize?: number;
  }
): Promise<DbAnnouncementAttachment> {
  const { data, error } = await supabase
    .from("company_announcement_attachments")
    .insert({
      announcement_id: announcementId,
      title: attachment.title,
      file_url: attachment.fileUrl,
      file_type: attachment.fileType,
      file_size: attachment.fileSize ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as DbAnnouncementAttachment;
}

export async function deleteAnnouncementAttachment(
  attachmentId: string
): Promise<void> {
  const { error } = await supabase
    .from("company_announcement_attachments")
    .delete()
    .eq("id", attachmentId);

  if (error) throw error;
}

export async function publishAnnouncement(payload: {
  companyId: string;
  scope: AnnouncementScope;
  teamId: string | null;
  title: string;
  content: string;
  createdById: string;
}): Promise<DbCompanyAnnouncement> {
  // Basic validation to surface clearer errors when RLS blocks or missing data
  if (!payload?.companyId) throw new Error("companyId is required to publish an announcement");
  if (!payload?.createdById) throw new Error("createdById is required to publish an announcement");
  if (!payload.title || !payload.title.trim()) throw new Error("title is required");
  if (!payload.content || !payload.content.trim()) throw new Error("content is required");
  if (payload.scope === "team" && !payload.teamId) throw new Error("teamId is required when scope is 'team'");

  const { data, error } = await supabase
    .from("company_announcements")
    .insert({
      company_id: payload.companyId,
      team_id: payload.teamId,
      scope: payload.scope,
      title: payload.title,
      content: payload.content,
      created_by: payload.createdById,
      status: "published",
    })
    .select()
    .single();

  if (error) {
    // Attach PostgREST details if available
    const errMsg = error?.message ? `${error.message}` : "Unknown error publishing announcement";
    throw new Error(errMsg);
  }

  return data as DbCompanyAnnouncement;
}

export async function updateAnnouncement(
  announcementId: string,
  updates: Partial<{
    title: string;
    content: string;
    status: AnnouncementStatus;
  }>
): Promise<DbCompanyAnnouncement> {
  const { data, error } = await supabase
    .from("company_announcements")
    .update(updates)
    .eq("id", announcementId)
    .select()
    .single();

  if (error) throw error;
  return data as DbCompanyAnnouncement;
}

export async function deleteAnnouncement(announcementId: string): Promise<void> {
  const { error } = await supabase
    .from("company_announcements")
    .update({ status: "archived" })
    .eq("id", announcementId);

  if (error) throw error;
}

export async function markAnnouncementAsRead(
  announcementId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from("company_announcement_reads")
    .insert({
      announcement_id: announcementId,
      user_id: userId,
    });

  // Ignore constraint violation (already exists)
  if (error && !error.message.includes('duplicate key')) {
    throw error;
  }
}

export async function getAnnouncementReads(
  announcementId: string
): Promise<DbAnnouncementRead[]> {
  const { data, error } = await supabase
    .from("company_announcement_reads")
    .select("*")
    .eq("announcement_id", announcementId);

  if (error) throw error;
  return (data ?? []) as DbAnnouncementRead[];
}

export async function isAnnouncementRead(
  announcementId: string,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("company_announcement_reads")
    .select("id")
    .eq("announcement_id", announcementId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return !!data;
}

// ============================================================================
// BIRTHDAYS
// ============================================================================

export async function getTodayBirthdays(
  companyId: string
): Promise<DbBirthdayEvent[]> {
  const today = new Date().toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from("birthday_events")
    .select("*")
    .eq("company_id", companyId)
    .eq("event_date", today);

  if (error) throw error;
  return (data ?? []) as DbBirthdayEvent[];
}

export async function getBirthdayEvent(
  companyId: string,
  employeeId: string,
  eventDate: string
): Promise<DbBirthdayEvent | null> {
  const { data, error } = await supabase
    .from("birthday_events")
    .select("*")
    .eq("company_id", companyId)
    .eq("employee_id", employeeId)
    .eq("event_date", eventDate)
    .maybeSingle();

  if (error) throw error;
  return data as DbBirthdayEvent | null;
}

export async function ensureBirthdayEventForToday(
  companyId: string,
  employeeId: string
): Promise<DbBirthdayEvent> {
  const today = new Date().toISOString().split('T')[0];
  
  // Check if event already exists
  const existing = await getBirthdayEvent(companyId, employeeId, today);
  if (existing) return existing;
  
  // Create new event
  const { data, error } = await supabase
    .from("birthday_events")
    .insert({
      company_id: companyId,
      employee_id: employeeId,
      event_date: today,
    })
    .select()
    .single();

  if (error) throw error;
  return data as DbBirthdayEvent;
}

export async function createBirthdayEvent(
  companyId: string,
  employeeId: string,
  eventDate: string
): Promise<DbBirthdayEvent> {
  const { data, error } = await supabase
    .from("birthday_events")
    .insert({
      company_id: companyId,
      employee_id: employeeId,
      event_date: eventDate,
    })
    .select()
    .single();

  if (error) throw error;
  return data as DbBirthdayEvent;
}

// ============================================================================
// BIRTHDAY COMMENTS
// ============================================================================

export async function getBirthdayComments(
  birthdayEventId: string
): Promise<DbBirthdayComment[]> {
  const { data, error } = await supabase
    .from("birthday_comments")
    .select("*")
    .eq("birthday_event_id", birthdayEventId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as DbBirthdayComment[];
}

export async function getBirthdayCommentLikes(
  commentId: string
): Promise<DbBirthdayCommentLike[]> {
  const { data, error } = await supabase
    .from("birthday_comment_likes")
    .select("*")
    .eq("birthday_comment_id", commentId);

  if (error) throw error;
  return (data ?? []) as DbBirthdayCommentLike[];
}

export async function toggleBirthdayCommentLike(
  commentId: string,
  userId: string
): Promise<boolean> {
  // Check if already liked
  const { data: existing } = await supabase
    .from("birthday_comment_likes")
    .select("id")
    .eq("birthday_comment_id", commentId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    // Unlike
    const { error } = await supabase
      .from("birthday_comment_likes")
      .delete()
      .eq("id", existing.id);

    if (error) throw error;
    return false;
  } else {
    // Like
    const { error } = await supabase
      .from("birthday_comment_likes")
      .insert({
        birthday_comment_id: commentId,
        user_id: userId,
      });

    if (error) throw error;
    return true;
  }
}

export async function isCommentLikedByUser(
  commentId: string,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("birthday_comment_likes")
    .select("id")
    .eq("birthday_comment_id", commentId)
    .eq("user_id", userId)
    .maybeSingle();

  return !!data;
}

export async function createBirthdayComment(
  birthdayEventId: string,
  authorUserId: string,
  content: string
): Promise<DbBirthdayComment> {
  const { data, error } = await supabase
    .from("birthday_comments")
    .insert({
      birthday_event_id: birthdayEventId,
      author_user_id: authorUserId,
      content: content,
    })
    .select()
    .single();

  if (error) throw error;
  return data as DbBirthdayComment;
}

export async function updateBirthdayComment(
  commentId: string,
  content: string
): Promise<DbBirthdayComment> {
  const { data, error } = await supabase
    .from("birthday_comments")
    .update({ content })
    .eq("id", commentId)
    .is("deleted_at", null)
    .select()
    .single();

  if (error) throw error;
  return data as DbBirthdayComment;
}

export async function deleteBirthdayComment(
  commentId: string
): Promise<void> {
  const { error } = await supabase
    .from("birthday_comments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", commentId);

  if (error) throw error;
}

// ============================================================================
// ENRICHMENT HELPERS
// ============================================================================

export interface EnrichedAnnouncement extends DbCompanyAnnouncement {
  author_name?: string;
  author_avatar?: string;
  team_name?: string;
  is_read?: boolean;
}

export async function enrichAnnouncementsWithAuthors(
  announcements: DbCompanyAnnouncement[],
  userId?: string
): Promise<EnrichedAnnouncement[]> {
  if (announcements.length === 0) return [];

  // Get author profiles
  const authorIds = Array.from(new Set(announcements.map((a) => a.created_by)));
  const { data: authors } = await supabase
    .from("profiles")
    .select("id, name, avatar_url")
    .in("id", authorIds);

  const authorsById: Record<string, { name: string | null; avatar_url: string | null }> = {};
  (authors ?? []).forEach((a) => {
    authorsById[a.id] = { name: a.name, avatar_url: a.avatar_url };
  });

  // Get team names for team-scoped announcements
  const teamIds = Array.from(
    new Set(announcements.filter((a) => a.team_id).map((a) => a.team_id) as string[])
  );
  const { data: teams } = await supabase
    .from("departments")
    .select("id, name")
    .in("id", teamIds);

  const teamsById: Record<string, string> = {};
  (teams ?? []).forEach((t) => {
    teamsById[t.id] = t.name;
  });

  // Get read status if userId provided
  let reads: Record<string, boolean> = {};
  if (userId) {
    const announcementIds = announcements.map((a) => a.id);
    const { data: readsData } = await supabase
      .from("company_announcement_reads")
      .select("announcement_id")
      .eq("user_id", userId)
      .in("announcement_id", announcementIds);

    (readsData ?? []).forEach((r) => {
      reads[r.announcement_id] = true;
    });
  }

  return announcements.map((a) => ({
    ...a,
    author_name: authorsById[a.created_by]?.name ?? undefined,
    author_avatar: authorsById[a.created_by]?.avatar_url ?? undefined,
    team_name: a.team_id ? teamsById[a.team_id] : undefined,
    is_read: userId ? reads[a.id] ?? false : undefined,
  }));
}

export interface EnrichedBirthdayEvent extends DbBirthdayEvent {
  employee_name?: string;
  employee_avatar?: string;
  employee_job_title?: string;
  employee_department_name?: string;
}

export async function enrichBirthdayEventsWithEmployees(
  events: DbBirthdayEvent[]
): Promise<EnrichedBirthdayEvent[]> {
  if (events.length === 0) return [];

  const employeeIds = events.map((e) => e.employee_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select(`
      id,
      name,
      avatar_url,
      job_title,
      department_id,
      departments:department_id(name)
    `)
    .in("id", employeeIds);

  const profilesById: Record<string, any> = {};
  (profiles ?? []).forEach((p: any) => {
    profilesById[p.id] = p;
  });

  return events.map((e) => ({
    ...e,
    employee_name: profilesById[e.employee_id]?.name,
    employee_avatar: profilesById[e.employee_id]?.avatar_url,
    employee_job_title: profilesById[e.employee_id]?.job_title,
    employee_department_name: profilesById[e.employee_id]?.departments?.name,
  }));
}

export interface EnrichedBirthdayComment extends DbBirthdayComment {
  author_name?: string;
  author_avatar?: string;
}

export async function enrichBirthdayCommentsWithAuthors(
  comments: DbBirthdayComment[]
): Promise<EnrichedBirthdayComment[]> {
  if (comments.length === 0) return [];

  const authorIds = Array.from(new Set(comments.map((c) => c.author_user_id)));
  const { data: authors } = await supabase
    .from("profiles")
    .select("id, name, avatar_url")
    .in("id", authorIds);

  const authorsById: Record<string, { name: string | null; avatar_url: string | null }> = {};
  (authors ?? []).forEach((a) => {
    authorsById[a.id] = { name: a.name, avatar_url: a.avatar_url };
  });

  return comments.map((c) => ({
    ...c,
    author_name: authorsById[c.author_user_id]?.name ?? undefined,
    author_avatar: authorsById[c.author_user_id]?.avatar_url ?? undefined,
  }));
}