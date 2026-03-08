import { supabase } from "@/integrations/supabase/client";

// ============================================================================
// TYPES
// ============================================================================

export type DbKnowledgeSpace = {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  icon: string;
  created_at: string | null;
  updated_at: string | null;
};

export type DbKnowledgePage = {
  id: string;
  space_id: string;
  parent_page_id: string | null;
  title: string;
  slug: string | null;
  content: any;
  icon: string;
  cover_image: string | null;
  is_favorite: boolean;
  created_by: string | null;
  company_id: string;
  created_at: string | null;
  updated_at: string | null;
};

export type DbKnowledgePermission = {
  id: string;
  page_id: string;
  role_id: string | null;
  user_id: string | null;
  permission_level: "view" | "edit" | "admin";
  created_at: string | null;
};

export type DbKnowledgePageVersion = {
  id: string;
  page_id: string;
  content_snapshot: any;
  created_by: string | null;
  created_at: string | null;
};

export type DbKnowledgePageAuditLog = {
  id: string;
  page_id: string;
  old_snapshot: any | null;
  new_snapshot: any | null;
  changed_by: string | null;
  changed_fields: string[] | null;
  changed_at: string | null;
};

export type DbKnowledgePageComment = {
  id: string;
  page_id: string;
  parent_comment_id: string | null;
  text: string;
  mentions: string[];
  created_by: string | null;
  company_id: string;
  created_at: string | null;
  updated_at: string | null;
};

export type KnowledgeSearchResult = {
  id: string;
  title: string;
  content: any;
  icon: string;
  space_id: string;
  space_name: string;
  rank: number;
};

// ============================================================================
// SPACES
// ============================================================================

const spaceSelect = "id,company_id,name,description,icon,created_at,updated_at";

export async function listKnowledgeSpaces(companyId: string) {
  const { data, error } = await supabase
    .from("knowledge_spaces")
    .select(spaceSelect)
    .eq("company_id", companyId)
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as DbKnowledgeSpace[];
}

export async function getKnowledgeSpace(spaceId: string) {
  const { data, error } = await supabase
    .from("knowledge_spaces")
    .select(spaceSelect)
    .eq("id", spaceId)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as DbKnowledgeSpace | null;
}

export async function createKnowledgeSpace(
  payload: Omit<DbKnowledgeSpace, "id" | "created_at" | "updated_at">
) {
  const { data, error } = await supabase
    .from("knowledge_spaces")
    .insert({
      company_id: payload.company_id,
      name: payload.name.trim(),
      description: payload.description ?? null,
      icon: payload.icon ?? "📁",
    })
    .select(spaceSelect)
    .single();

  if (error) throw error;
  return data as DbKnowledgeSpace;
}

export async function updateKnowledgeSpace(
  spaceId: string,
  patch: Partial<Pick<DbKnowledgeSpace, "name" | "description" | "icon">>
) {
  const update: Record<string, any> = {};
  if ("name" in patch) update.name = patch.name?.trim();
  if ("description" in patch) update.description = patch.description ?? null;
  if ("icon" in patch) update.icon = patch.icon ?? "📁";

  const { data, error } = await supabase
    .from("knowledge_spaces")
    .update(update)
    .eq("id", spaceId)
    .select(spaceSelect)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as DbKnowledgeSpace | null;
}

export async function deleteKnowledgeSpace(spaceId: string) {
  const { error } = await supabase
    .from("knowledge_spaces")
    .delete()
    .eq("id", spaceId);

  if (error) throw error;
}

// ============================================================================
// PAGES
// ============================================================================

const pageSelect = "id,space_id,parent_page_id,title,slug,content,icon,cover_image,is_favorite,created_by,company_id,created_at,updated_at";

export async function listKnowledgePages(spaceId: string) {
  const { data, error } = await supabase
    .from("knowledge_pages")
    .select(pageSelect)
    .eq("space_id", spaceId)
    .order("title", { ascending: true });

  if (error) throw error;
  return (data ?? []) as DbKnowledgePage[];
}

export async function listKnowledgePagesByCompany(companyId: string) {
  const { data, error } = await supabase
    .from("knowledge_pages")
    .select(pageSelect)
    .eq("company_id", companyId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as DbKnowledgePage[];
}

export async function getKnowledgePage(pageId: string) {
  const { data, error } = await supabase
    .from("knowledge_pages")
    .select(pageSelect)
    .eq("id", pageId)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as DbKnowledgePage | null;
}

export async function createKnowledgePage(
  payload: Omit<DbKnowledgePage, "id" | "created_at" | "updated_at" | "slug">
) {
  const { data, error } = await supabase
    .from("knowledge_pages")
    .insert({
      space_id: payload.space_id,
      parent_page_id: payload.parent_page_id ?? null,
      title: payload.title.trim(),
      content: payload.content ?? { type: "doc", content: [] },
      icon: payload.icon ?? "📄",
      cover_image: payload.cover_image ?? null,
      is_favorite: payload.is_favorite ?? false,
      created_by: payload.created_by ?? null,
      company_id: payload.company_id,
    })
    .select(pageSelect)
    .single();

  if (error) throw error;
  return data as DbKnowledgePage;
}

export async function updateKnowledgePage(
  pageId: string,
  patch: Partial<
    Pick<
      DbKnowledgePage,
      | "title"
      | "content"
      | "icon"
      | "cover_image"
      | "is_favorite"
      | "parent_page_id"
    >
  >
) {
  const update: Record<string, any> = {};
  if ("title" in patch) update.title = patch.title?.trim();
  if ("content" in patch) update.content = patch.content;
  if ("icon" in patch) update.icon = patch.icon ?? "📄";
  if ("cover_image" in patch) update.cover_image = patch.cover_image ?? null;
  if ("is_favorite" in patch) update.is_favorite = patch.is_favorite ?? false;
  if ("parent_page_id" in patch) update.parent_page_id = patch.parent_page_id ?? null;

  const { data, error } = await supabase
    .from("knowledge_pages")
    .update(update)
    .eq("id", pageId)
    .select(pageSelect)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as DbKnowledgePage | null;
}

export async function deleteKnowledgePage(pageId: string) {
  const { error } = await supabase
    .from("knowledge_pages")
    .delete()
    .eq("id", pageId);

  if (error) throw error;
}

export async function toggleKnowledgePageFavorite(pageId: string, isFavorite: boolean) {
  const { data, error } = await supabase
    .from("knowledge_pages")
    .update({ is_favorite: isFavorite })
    .eq("id", pageId)
    .select(pageSelect)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as DbKnowledgePage | null;
}

// ============================================================================
// PERMISSIONS
// ============================================================================

const permissionSelect = "id,page_id,role_id,user_id,permission_level,created_at";

export async function listKnowledgePermissions(pageId: string) {
  const { data, error } = await supabase
    .from("knowledge_permissions")
    .select(permissionSelect)
    .eq("page_id", pageId);

  if (error) throw error;
  return (data ?? []) as DbKnowledgePermission[];
}

export async function createKnowledgePermission(
  payload: Omit<DbKnowledgePermission, "id" | "created_at">
) {
  const { data, error } = await supabase
    .from("knowledge_permissions")
    .insert({
      page_id: payload.page_id,
      role_id: payload.role_id ?? null,
      user_id: payload.user_id ?? null,
      permission_level: payload.permission_level,
    })
    .select(permissionSelect)
    .single();

  if (error) throw error;
  return data as DbKnowledgePermission;
}

export async function deleteKnowledgePermission(permissionId: string) {
  const { error } = await supabase
    .from("knowledge_permissions")
    .delete()
    .eq("id", permissionId);

  if (error) throw error;
}

// ============================================================================
// VERSIONS
// ============================================================================

const versionSelect = "id,page_id,content_snapshot,created_by,created_at";

export async function listKnowledgePageVersions(pageId: string) {
  const { data, error } = await supabase
    .from("knowledge_page_versions")
    .select(versionSelect)
    .eq("page_id", pageId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as DbKnowledgePageVersion[];
}

export async function createKnowledgePageVersion(
  payload: Omit<DbKnowledgePageVersion, "id" | "created_at">
) {
  const { data, error } = await supabase
    .from("knowledge_page_versions")
    .insert({
      page_id: payload.page_id,
      content_snapshot: payload.content_snapshot,
      created_by: payload.created_by ?? null,
    })
    .select(versionSelect)
    .single();

  if (error) throw error;
  return data as DbKnowledgePageVersion;
}

export async function restoreKnowledgePageVersion(
  pageId: string,
  versionId: string
) {
  // Get the version to restore
  const { data: version } = await supabase
    .from("knowledge_page_versions")
    .select("content_snapshot")
    .eq("id", versionId)
    .single();

  if (!version) throw new Error("Version not found");

  // Update the page with the version content
  const { data, error } = await supabase
    .from("knowledge_pages")
    .update({ content: version.content_snapshot })
    .eq("id", pageId)
    .select(pageSelect)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as DbKnowledgePage | null;
}

// ============================================================================
// AUDIT LOG
// ============================================================================

const auditSelect = "id,page_id,old_snapshot,new_snapshot,changed_by,changed_fields,changed_at";

export async function listKnowledgePageAuditLogs(pageId: string) {
  const { data, error } = await supabase
    .from("knowledge_page_audit_log")
    .select(auditSelect)
    .eq("page_id", pageId)
    .order("changed_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as DbKnowledgePageAuditLog[];
}

// ============================================================================
// COMMENTS
// ============================================================================

const commentSelect = "id,page_id,parent_comment_id,text,mentions,created_by,company_id,created_at,updated_at";

export async function listKnowledgePageComments(pageId: string) {
  const { data, error } = await supabase
    .from("knowledge_page_comments")
    .select(commentSelect)
    .eq("page_id", pageId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as DbKnowledgePageComment[];
}

export async function createKnowledgePageComment(
  payload: Omit<DbKnowledgePageComment, "id" | "created_at" | "updated_at">
) {
  const { data, error } = await supabase
    .from("knowledge_page_comments")
    .insert({
      page_id: payload.page_id,
      parent_comment_id: payload.parent_comment_id ?? null,
      text: payload.text.trim(),
      mentions: payload.mentions ?? [],
      created_by: payload.created_by ?? null,
      company_id: payload.company_id,
    })
    .select(commentSelect)
    .single();

  if (error) throw error;
  return data as DbKnowledgePageComment;
}

export async function updateKnowledgePageComment(
  commentId: string,
  patch: Pick<DbKnowledgePageComment, "text">
) {
  const { data, error } = await supabase
    .from("knowledge_page_comments")
    .update({ text: patch.text.trim() })
    .eq("id", commentId)
    .select(commentSelect)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as DbKnowledgePageComment | null;
}

export async function deleteKnowledgePageComment(commentId: string) {
  const { error } = await supabase
    .from("knowledge_page_comments")
    .delete()
    .eq("id", commentId);

  if (error) throw error;
}

// ============================================================================
// SEARCH
// ============================================================================

export async function searchKnowledgePages(
  companyId: string,
  query: string
): Promise<KnowledgeSearchResult[]> {
  if (!query.trim()) return [];

  const { data, error } = await supabase.rpc("knowledge_search_pages", {
    p_company_id: companyId,
    p_query: query,
  });

  if (error) throw error;
  return (data ?? []) as KnowledgeSearchResult[];
}

// ============================================================================
// HELPERS
// ============================================================================

export function buildPageTree(pages: DbKnowledgePage[]): DbKnowledgePage[] {
  const pageMap = new Map<string, DbKnowledgePage & { children: DbKnowledgePage[] }>();
  
  // Initialize all pages with empty children array
  pages.forEach(page => {
    pageMap.set(page.id, { ...page, children: [] });
  });

  const rootPages: DbKnowledgePage[] = [];

  // Build tree structure
  pages.forEach(page => {
    const pageWithChildren = pageMap.get(page.id)!;
    
    if (page.parent_page_id) {
      const parent = pageMap.get(page.parent_page_id);
      if (parent) {
        parent.children.push(pageWithChildren);
      } else {
        rootPages.push(pageWithChildren);
      }
    } else {
      rootPages.push(pageWithChildren);
    }
  });

  return rootPages;
}

export function countPagesInSpace(spaceId: string, pages: DbKnowledgePage[]): number {
  return pages.filter(p => p.space_id === spaceId).length;
}

export function getRecentPages(pages: DbKnowledgePage[], limit: number = 5): DbKnowledgePage[] {
  return [...pages]
    .sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime())
    .slice(0, limit);
}

export function getFavoritePages(pages: DbKnowledgePage[]): DbKnowledgePage[] {
  return pages.filter(p => p.is_favorite);
}