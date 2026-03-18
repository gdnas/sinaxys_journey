import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = "https://gohcnlyonuoeszaqjsxw.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

type ProjectPayload = {
  id?: string;
  tenant_id: string;
  name: string;
  description?: string | null;
  owner_user_id: string;
  visibility: "public" | "private";
  status: "not_started" | "on_track" | "at_risk" | "delayed" | "completed";
  start_date?: string | null;
  due_date?: string | null;
  department_id?: string | null;
  department_ids?: string[] | null;
  key_result_id?: string | null;
  deliverable_id?: string | null;
  members?: string[];
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function normalizeUuidList(values: unknown) {
  if (!Array.isArray(values)) return [] as string[];
  return Array.from(new Set(values.filter((value): value is string => typeof value === "string" && value.length > 0)));
}

function headHasScope(departmentId: string | null, departmentIds: string[], headDepartmentId: string | null) {
  if (!headDepartmentId) return false;
  return departmentId === headDepartmentId || departmentIds.includes(headDepartmentId);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!SUPABASE_SERVICE_ROLE_KEY) {
      console.error("[projects-upsert] missing SUPABASE_SERVICE_ROLE_KEY");
      return json(500, { error: "Server misconfiguration" });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json(401, { error: "Unauthorized" });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData.user) {
      console.warn("[projects-upsert] invalid token", authError);
      return json(401, { error: "Unauthorized" });
    }

    let payload: ProjectPayload;
    try {
      payload = (await req.json()) as ProjectPayload;
    } catch {
      return json(400, { error: "Invalid JSON payload" });
    }

    if (!payload.tenant_id || !payload.name?.trim() || !payload.owner_user_id || !payload.visibility || !payload.status) {
      return json(400, { error: "Missing required fields" });
    }

    const callerId = authData.user.id;
    const tenantId = payload.tenant_id;
    const normalizedDepartmentIds = normalizeUuidList(payload.department_ids);
    const normalizedDepartmentId = payload.department_id ?? normalizedDepartmentIds[0] ?? null;

    const { data: callerProfile, error: callerProfileError } = await supabase
      .from("profiles")
      .select("id, company_id, role, department_id")
      .eq("id", callerId)
      .maybeSingle();

    if (callerProfileError || !callerProfile) {
      console.error("[projects-upsert] caller profile lookup failed", callerProfileError);
      return json(500, { error: "Profile lookup failed" });
    }

    if (callerProfile.company_id !== tenantId) {
      return json(403, { error: "Forbidden: caller does not belong to tenant" });
    }

    const callerRole = String(callerProfile.role || "").toUpperCase();
    const isAdmin = callerRole === "ADMIN" || callerRole === "MASTERADMIN";
    const isHead = callerRole === "HEAD";

    if (!isAdmin && !isHead) {
      return json(403, { error: "Forbidden: only ADMIN and HEAD can create or edit projects" });
    }

    if (isHead && !headHasScope(normalizedDepartmentId, normalizedDepartmentIds, callerProfile.department_id)) {
      return json(403, { error: "Forbidden: HEAD can only manage projects inside their department scope" });
    }

    const { data: ownerProfile, error: ownerProfileError } = await supabase
      .from("profiles")
      .select("id, company_id")
      .eq("id", payload.owner_user_id)
      .maybeSingle();

    if (ownerProfileError || !ownerProfile) {
      console.error("[projects-upsert] owner profile lookup failed", ownerProfileError);
      return json(400, { error: "Invalid owner_user_id" });
    }

    if (ownerProfile.company_id !== tenantId) {
      return json(400, { error: "owner_user_id belongs to another tenant" });
    }

    const members = Array.from(new Set([...(payload.members ?? []), payload.owner_user_id]));
    if (members.length) {
      const { data: validMembers, error: membersError } = await supabase
        .from("profiles")
        .select("id")
        .in("id", members)
        .eq("company_id", tenantId);

      if (membersError) {
        console.error("[projects-upsert] members lookup failed", membersError);
        return json(500, { error: "Members lookup failed" });
      }

      const validIds = new Set((validMembers ?? []).map((item) => item.id));
      const invalidMembers = members.filter((id) => !validIds.has(id));
      if (invalidMembers.length) {
        return json(400, { error: "Invalid members", invalidMembers });
      }
    }

    let linkedKeyResult: { id: string; objective_id: string; title: string } | null = null;
    let linkedObjective: { id: string; company_id: string; department_id: string | null; okr_level: string; title: string } | null = null;

    if (payload.key_result_id) {
      const { data, error } = await supabase
        .from("okr_key_results")
        .select("id, objective_id, title")
        .eq("id", payload.key_result_id)
        .maybeSingle();
      if (error || !data) {
        console.error("[projects-upsert] key result lookup failed", error);
        return json(400, { error: "Invalid key_result_id" });
      }
      linkedKeyResult = data;

      const { data: objective, error: objectiveError } = await supabase
        .from("okr_objectives")
        .select("id, company_id, department_id, okr_level, title")
        .eq("id", data.objective_id)
        .maybeSingle();
      if (objectiveError || !objective) {
        console.error("[projects-upsert] objective lookup failed", objectiveError);
        return json(400, { error: "Unable to resolve OKR from key_result_id" });
      }
      linkedObjective = objective;

      if (objective.company_id !== tenantId) {
        return json(400, { error: "key_result_id belongs to another tenant" });
      }

      if (isHead && objective.okr_level === "tactical" && objective.department_id !== callerProfile.department_id) {
        return json(403, { error: "Forbidden: HEAD cannot link a project to a tactical KR outside their department" });
      }
    }

    let linkedDeliverable: { id: string; key_result_id: string; title: string } | null = null;
    if (payload.deliverable_id) {
      const { data, error } = await supabase
        .from("okr_deliverables")
        .select("id, key_result_id, title")
        .eq("id", payload.deliverable_id)
        .maybeSingle();
      if (error || !data) {
        console.error("[projects-upsert] deliverable lookup failed", error);
        return json(400, { error: "Invalid deliverable_id" });
      }
      linkedDeliverable = data;

      if (!linkedKeyResult) {
        return json(400, { error: "deliverable_id requires key_result_id" });
      }

      if (data.key_result_id !== linkedKeyResult.id) {
        return json(400, { error: "deliverable_id does not belong to key_result_id" });
      }
    }

    let existingProject: any = null;
    if (payload.id) {
      const { data, error } = await supabase.from("projects").select("*").eq("id", payload.id).maybeSingle();
      if (error) {
        console.error("[projects-upsert] existing project lookup failed", error);
        return json(500, { error: "Failed to load project" });
      }
      if (!data) {
        return json(404, { error: "Project not found" });
      }
      existingProject = data;

      if (existingProject.tenant_id !== tenantId) {
        return json(403, { error: "Forbidden: project belongs to another tenant" });
      }

      if (isHead && !headHasScope(existingProject.department_id, existingProject.department_ids ?? [], callerProfile.department_id)) {
        return json(403, { error: "Forbidden: HEAD cannot edit a project outside their department scope" });
      }
    }

    const projectPayload = {
      tenant_id: tenantId,
      name: payload.name.trim(),
      description: payload.description?.trim() || null,
      owner_user_id: payload.owner_user_id,
      created_by_user_id: existingProject?.created_by_user_id ?? callerId,
      visibility: payload.visibility,
      status: payload.status,
      start_date: payload.start_date || null,
      due_date: payload.due_date || null,
      department_id: normalizedDepartmentId,
      department_ids: normalizedDepartmentIds.length ? normalizedDepartmentIds : null,
      key_result_id: linkedKeyResult?.id ?? null,
      deliverable_id: linkedDeliverable?.id ?? null,
    };

    let projectRow: any;
    if (existingProject) {
      const { data, error } = await supabase
        .from("projects")
        .update(projectPayload)
        .eq("id", existingProject.id)
        .select("*")
        .maybeSingle();

      if (error || !data) {
        console.error("[projects-upsert] update failed", error);
        return json(500, { error: error?.message || "Failed updating project" });
      }
      projectRow = data;
    } else {
      const { data, error } = await supabase
        .from("projects")
        .insert([{ ...projectPayload, created_by_user_id: callerId }])
        .select("*")
        .maybeSingle();

      if (error || !data) {
        console.error("[projects-upsert] create failed", error);
        return json(500, { error: error?.message || "Failed creating project" });
      }
      projectRow = data;
    }

    const { data: existingMembers, error: existingMembersError } = await supabase
      .from("project_members")
      .select("user_id")
      .eq("project_id", projectRow.id);

    if (existingMembersError) {
      console.error("[projects-upsert] project_members lookup failed", existingMembersError);
      return json(500, { error: "Failed loading members" });
    }

    const existingMemberIds = (existingMembers ?? []).map((item) => item.user_id);
    const membersToAdd = members
      .filter((id) => !existingMemberIds.includes(id))
      .map((id) => ({
        tenant_id: tenantId,
        project_id: projectRow.id,
        user_id: id,
        role_in_project: id === payload.owner_user_id ? "owner" : "member",
      }));

    if (membersToAdd.length) {
      const { error } = await supabase.from("project_members").insert(membersToAdd);
      if (error) {
        console.error("[projects-upsert] members insert failed", error);
        return json(500, { error: "Failed syncing members" });
      }
    }

    const membersToRemove = existingMemberIds.filter((id) => !members.includes(id));
    if (membersToRemove.length) {
      const { error } = await supabase
        .from("project_members")
        .delete()
        .eq("project_id", projectRow.id)
        .in("user_id", membersToRemove);
      if (error) {
        console.error("[projects-upsert] members delete failed", error);
        return json(500, { error: "Failed removing members" });
      }
    }

    const { error: normalizeOwnerRoleError } = await supabase
      .from("project_members")
      .update({ role_in_project: "member" })
      .eq("project_id", projectRow.id)
      .neq("user_id", payload.owner_user_id)
      .eq("role_in_project", "owner");
    if (normalizeOwnerRoleError) {
      console.error("[projects-upsert] owner role normalization failed", normalizeOwnerRoleError);
      return json(500, { error: "Failed normalizing owner role" });
    }

    const { error: ownerRoleError } = await supabase
      .from("project_members")
      .update({ role_in_project: "owner" })
      .eq("project_id", projectRow.id)
      .eq("user_id", payload.owner_user_id);
    if (ownerRoleError) {
      console.error("[projects-upsert] owner role update failed", ownerRoleError);
      return json(500, { error: "Failed updating owner role" });
    }

    return json(200, {
      success: true,
      project: projectRow,
      links: {
        okr: linkedObjective ? { id: linkedObjective.id, title: linkedObjective.title } : null,
        key_result: linkedKeyResult ? { id: linkedKeyResult.id, title: linkedKeyResult.title } : null,
        deliverable: linkedDeliverable ? { id: linkedDeliverable.id, title: linkedDeliverable.title } : null,
      },
    });
  } catch (error) {
    console.error("[projects-upsert] unexpected error", error);
    return json(500, { error: "Internal server error" });
  }
});
