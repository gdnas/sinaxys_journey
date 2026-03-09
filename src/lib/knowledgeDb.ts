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
  department_id?: string | null;
};

export type DbKnowledgePermission = {
  id: string;
  page_id: string;
  role_id: string | null;
  user_id: string | null;
  permission_level: "view" | "edit" | "admin";
  created_at: string | null;
  title?: string;
  resource_type?: string;
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
  created_at?: string | null;
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
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as DbKnowledgeSpace[];
}

export async function getKnowledgeSpace(spaceId: string) {
  const { data, error } = await supabase
    .from("knowledge_spaces")
    .select(spaceSelect)
    .eq("id", spaceId)
    .single();

  if (error) throw error;
  return data as DbKnowledgeSpace;
}

export async function createKnowledgeSpace(payload: {
  companyId: string;
  name: string;
  description: string | null;
  icon: string;
}) {
  const { data, error } = await supabase
    .from("knowledge_spaces")
    .insert({
      company_id: payload.companyId,
      name: payload.name,
      description: payload.description,
      icon: payload.icon,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as DbKnowledgeSpace;
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
    .order("created_at", { ascending: false });

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
    .single();

  if (error) throw error;
  return data as DbKnowledgePage;
}

export async function createKnowledgePage(payload: {
  spaceId: string;
  title: string;
  content: any;
  icon: string;
  parentPageId: string | null;
  createdBy: string;
  companyId: string;
}) {
  const { data, error } = await supabase
    .from("knowledge_pages")
    .insert({
      space_id: payload.spaceId,
      title: payload.title,
      content: payload.content,
      icon: payload.icon,
      parent_page_id: payload.parentPageId,
      created_by: payload.createdBy,
      company_id: payload.companyId,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as DbKnowledgePage;
}

export async function updateKnowledgePage(pageId: string, payload: Partial<DbKnowledgePage>) {
  const { data, error } = await supabase
    .from("knowledge_pages")
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq("id", pageId)
    .select("*")
    .single();

  if (error) throw error;
  return data as DbKnowledgePage;
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
    .select("*")
    .single();

  if (error) throw error;
  return data as DbKnowledgePage;
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

export async function createKnowledgePageComment(payload: {
  page_id: string;
  text: string;
  parent_comment_id: string | null;
  mentions: string[];
  created_by: string;
  company_id: string;
}) {
  const { data, error } = await supabase
    .from("knowledge_page_comments")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
  return data as DbKnowledgePageComment;
}

export async function deleteKnowledgePageComment(commentId: string) {
  const { error } = await supabase
    .from("knowledge_page_comments")
    .delete()
    .eq("id", commentId);

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

export async function restoreKnowledgePageVersion(pageId: string, versionId: string) {
  // First get the version
  const { data: version, error: versionError } = await supabase
    .from("knowledge_page_versions")
    .select("*")
    .eq("id", versionId)
    .single();

  if (versionError) throw versionError;

  // Then update the page with the version's content
  const { data, error } = await supabase
    .from("knowledge_pages")
    .update({
      content: version.content_snapshot,
      updated_at: new Date().toISOString(),
    })
    .eq("id", pageId)
    .select("*")
    .single();

  if (error) throw error;
  return data as DbKnowledgePage;
}

// ============================================================================
// AUDIT LOGS
// ============================================================================

export async function listAuditLogs() {
  const { data, error } = await supabase
    .from("knowledge_page_audit_log")
    .select("id,page_id,old_snapshot,new_snapshot,changed_by,changed_at,created_at")
    .order("changed_at", { ascending: false })
    .limit(100);

  if (error) throw error;
  return (data ?? []) as DbKnowledgePageAuditLog[];
}

// ============================================================================
// PERMISSIONS
// ============================================================================

export async function listPermissions() {
  const { data, error } = await supabase
    .from("knowledge_permissions")
    .select("id,page_id,role_id,user_id,permission_level,created_at,title,resource_type")
    .order("created_at", { ascending: false });

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
      role_id: payload.role_id,
      user_id: payload.user_id,
      permission_level: payload.permission_level,
      title: payload.title,
      resource_type: payload.resource_type,
    })
    .select("*")
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
// UTILITY FUNCTIONS
// ============================================================================

export function buildPageTree(pages: DbKnowledgePage[]): DbKnowledgePage[] {
  const pageMap = new Map<string, DbKnowledgePage & { children: DbKnowledgePage[] }>();
  
  // Initialize all pages with empty children
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
      }
    } else {
      rootPages.push(pageWithChildren);
    }
  });

  return rootPages;
}

export function getRecentPages(pages: DbKnowledgePage[], limit: number = 10): DbKnowledgePage[] {
  return pages
    .filter(page => page.updated_at)
    .sort((a, b) => new Date(b.updated_at!).getTime() - new Date(a.updated_at!).getTime())
    .slice(0, limit);
}

export function getFavoritePages(pages: DbKnowledgePage[]): DbKnowledgePage[] {
  return pages.filter(page => page.is_favorite);
}

export function countPagesInSpace(spaceId: string, pages: DbKnowledgePage[]): number {
  return pages.filter(page => page.space_id === spaceId).length;
}