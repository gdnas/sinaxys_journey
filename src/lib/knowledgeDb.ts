import { supabase } from "@/integrations/supabase/client";

// ============================================
// Types
// ============================================

export type KnowledgeSpace = {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  icon: string;
  created_at: string;
  updated_at: string;
};

export type KnowledgePage = {
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
  created_at: string;
  updated_at: string;
};

export type KnowledgePermission = {
  id: string;
  page_id: string;
  role_id: string | null;
  user_id: string | null;
  permission_level: "view" | "edit" | "admin";
  created_at: string;
};

export type KnowledgePageVersion = {
  id: string;
  page_id: string;
  content_snapshot: any;
  created_by: string | null;
  created_at: string;
};

export type KnowledgePageComment = {
  id: string;
  page_id: string;
  parent_comment_id: string | null;
  text: string;
  mentions: string[];
  created_by: string | null;
  company_id: string;
  created_at: string;
  updated_at: string;
};

export type SearchResult = {
  id: string;
  title: string;
  content: any;
  icon: string;
  space_id: string;
  space_name: string;
  rank: number;
};

// ============================================
// Spaces CRUD
// ============================================

export async function getKnowledgeSpaces(companyId: string): Promise<KnowledgeSpace[]> {
  const { data, error } = await supabase
    .from("knowledge_spaces")
    .select("*")
    .eq("company_id", companyId)
    .order("name");

  if (error) throw error;
  return data || [];
}

export async function getKnowledgeSpace(spaceId: string): Promise<KnowledgeSpace | null> {
  const { data, error } = await supabase
    .from("knowledge_spaces")
    .select("*")
    .eq("id", spaceId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createKnowledgeSpace(
  companyId: string,
  name: string,
  description?: string,
  icon?: string
): Promise<KnowledgeSpace> {
  const { data, error } = await supabase
    .from("knowledge_spaces")
    .insert({
      company_id: companyId,
      name,
      description: description || null,
      icon: icon || "📁",
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateKnowledgeSpace(
  spaceId: string,
  updates: Partial<Pick<KnowledgeSpace, "name" | "description" | "icon">>
): Promise<KnowledgeSpace> {
  const { data, error } = await supabase
    .from("knowledge_spaces")
    .update(updates)
    .eq("id", spaceId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteKnowledgeSpace(spaceId: string): Promise<void> {
  const { error } = await supabase
    .from("knowledge_spaces")
    .delete()
    .eq("id", spaceId);

  if (error) throw error;
}

// ============================================
// Pages CRUD
// ============================================

export async function getKnowledgePages(companyId: string): Promise<KnowledgePage[]> {
  const { data, error } = await supabase
    .from("knowledge_pages")
    .select("*")
    .eq("company_id", companyId)
    .order("title");

  if (error) throw error;
  return data || [];
}

export async function getKnowledgePagesBySpace(spaceId: string): Promise<KnowledgePage[]> {
  const { data, error } = await supabase
    .from("knowledge_pages")
    .select("*")
    .eq("space_id", spaceId)
    .order("title");

  if (error) throw error;
  return data || [];
}

export async function getKnowledgePageTree(companyId: string): Promise<KnowledgePage[]> {
  const { data, error } = await supabase
    .from("knowledge_pages")
    .select("*")
    .eq("company_id", companyId)
    .order("title");

  if (error) throw error;
  return data || [];
}

export async function getKnowledgePage(pageId: string): Promise<KnowledgePage | null> {
  const { data, error } = await supabase
    .from("knowledge_pages")
    .select("*")
    .eq("id", pageId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getKnowledgePageBySlug(slug: string): Promise<KnowledgePage | null> {
  const { data, error } = await supabase
    .from("knowledge_pages")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getFavoritePages(companyId: string): Promise<KnowledgePage[]> {
  const { data, error } = await supabase
    .from("knowledge_pages")
    .select("*")
    .eq("company_id", companyId)
    .eq("is_favorite", true)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getRecentPages(companyId: string, limit = 10): Promise<KnowledgePage[]> {
  const { data, error } = await supabase
    .from("knowledge_pages")
    .select("*")
    .eq("company_id", companyId)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function createKnowledgePage(
  spaceId: string,
  companyId: string,
  title: string,
  createdBy?: string | null,
  options?: {
    parentPageId?: string;
    icon?: string;
    coverImage?: string;
  }
): Promise<KnowledgePage> {
  const { data, error } = await supabase
    .from("knowledge_pages")
    .insert({
      space_id: spaceId,
      company_id: companyId,
      title,
      created_by: createdBy ?? null,
      parent_page_id: options?.parentPageId || null,
      icon: options?.icon || "📄",
      cover_image: options?.coverImage || null,
      content: { type: "doc", content: [] },
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateKnowledgePage(
  pageId: string,
  updates: Partial<
    Pick<KnowledgePage, "title" | "content" | "icon" | "cover_image" | "is_favorite">
  >
): Promise<KnowledgePage> {
  const { data, error } = await supabase
    .from("knowledge_pages")
    .update(updates)
    .eq("id", pageId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteKnowledgePage(pageId: string): Promise<void> {
  const { error } = await supabase
    .from("knowledge_pages")
    .delete()
    .eq("id", pageId);

  if (error) throw error;
}

// ============================================
// Permissions CRUD
// ============================================

export async function getPagePermissions(pageId: string): Promise<KnowledgePermission[]> {
  const { data, error } = await supabase
    .from("knowledge_permissions")
    .select("*")
    .eq("page_id", pageId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createPagePermission(
  pageId: string,
  permissionLevel: "view" | "edit" | "admin",
  options?: {
    userId?: string;
    roleId?: string;
  }
): Promise<KnowledgePermission> {
  const { data, error } = await supabase
    .from("knowledge_permissions")
    .insert({
      page_id: pageId,
      permission_level: permissionLevel,
      user_id: options?.userId || null,
      role_id: options?.roleId || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deletePagePermission(permissionId: string): Promise<void> {
  const { error } = await supabase
    .from("knowledge_permissions")
    .delete()
    .eq("id", permissionId);

  if (error) throw error;
}

// ============================================
// Versions CRUD
// ============================================

export async function getPageVersions(pageId: string): Promise<KnowledgePageVersion[]> {
  const { data, error } = await supabase
    .from("knowledge_page_versions")
    .select("*")
    .eq("page_id", pageId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getPageVersion(versionId: string): Promise<KnowledgePageVersion | null> {
  const { data, error } = await supabase
    .from("knowledge_page_versions")
    .select("*")
    .eq("id", versionId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function restorePageVersion(
  pageId: string,
  versionId: string
): Promise<KnowledgePage> {
  const { data: version } = await supabase
    .from("knowledge_page_versions")
    .select("content_snapshot")
    .eq("id", versionId)
    .single();

  if (!version) throw new Error("Version not found");

  const { data, error } = await supabase
    .from("knowledge_pages")
    .update({ content: version.content_snapshot })
    .eq("id", pageId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// Comments CRUD
// ============================================

export async function getPageComments(pageId: string): Promise<KnowledgePageComment[]> {
  const { data, error } = await supabase
    .from("knowledge_page_comments")
    .select("*, profiles(id, name, avatar_url)")
    .eq("page_id", pageId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createPageComment(
  pageId: string,
  companyId: string,
  text: string,
  createdBy: string,
  mentions?: string[],
  parentCommentId?: string
): Promise<KnowledgePageComment> {
  const { data, error } = await supabase
    .from("knowledge_page_comments")
    .insert({
      page_id: pageId,
      company_id: companyId,
      text,
      created_by: createdBy,
      mentions: mentions || [],
      parent_comment_id: parentCommentId || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updatePageComment(
  commentId: string,
  text: string,
  mentions?: string[]
): Promise<KnowledgePageComment> {
  const { data, error } = await supabase
    .from("knowledge_page_comments")
    .update({ text, mentions: mentions || [] })
    .eq("id", commentId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deletePageComment(commentId: string): Promise<void> {
  const { error } = await supabase
    .from("knowledge_page_comments")
    .delete()
    .eq("id", commentId);

  if (error) throw error;
}

// ============================================
// Search
// ============================================

export async function searchKnowledgePages(
  companyId: string,
  query: string
): Promise<SearchResult[]> {
  if (!query || query.trim().length < 2) return [];

  const { data, error } = await supabase.rpc("knowledge_search_pages", {
    p_company_id: companyId,
    p_query: query.trim(),
  });

  if (error) throw error;
  return (data as SearchResult[]) || [];
}

// ============================================
// Tree Building Helpers
// ============================================

export function buildPageTree(pages: KnowledgePage[]): KnowledgePage[] {
  const pageMap = new Map<string, KnowledgePage & { children?: KnowledgePage[] }>();
  const roots: (KnowledgePage & { children?: KnowledgePage[] })[] = [];

  // First pass: create map and initialize children arrays
  pages.forEach((page) => {
    pageMap.set(page.id, { ...page, children: [] });
  });

  // Second pass: build tree structure
  pages.forEach((page) => {
    const node = pageMap.get(page.id);
    if (!node) return;

    if (page.parent_page_id && pageMap.has(page.parent_page_id)) {
      const parent = pageMap.get(page.parent_page_id);
      parent?.children?.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

export function getPagePath(pageId: string, pages: KnowledgePage[]): KnowledgePage[] {
  const pageMap = new Map(pages.map((p) => [p.id, p]));
  const path: KnowledgePage[] = [];
  let currentPage = pageMap.get(pageId);

  while (currentPage) {
    path.unshift(currentPage);
    if (currentPage.parent_page_id) {
      currentPage = pageMap.get(currentPage.parent_page_id);
    } else {
      currentPage = undefined;
    }
  }

  return path;
}