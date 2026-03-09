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

export async function listAuditLogs() {
  const { data, error } = await supabase
    .from("knowledge_page_audit_log")
    .select("id,page_id,old_snapshot,new_snapshot,changed_by,changed_at")
    .order("changed_at", { ascending: false })
    .limit(100);

  if (error) throw error;
  return (data ?? []) as DbKnowledgePageAuditLog[];
}

export async function listPermissions() {
  const { data, error } = await supabase
    .from("knowledge_permissions")
    .select("id,page_id,role_id,user_id,permission_level,created_at")
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