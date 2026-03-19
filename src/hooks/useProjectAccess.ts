import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type ProjectMemberRole = "owner" | "editor" | "viewer" | "member";

export type DbProject = {
  id: string;
  name: string;
  description?: string;
  owner_user_id: string;
  department_id?: string;
  department_ids?: string[];
  tenant_id: string;
  visibility: string;
  status: string;
  start_date?: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
};

export type DbProjectMember = {
  id: string;
  project_id: string;
  user_id: string;
  role_in_project: ProjectMemberRole;
  created_at: string;
};

export type ProjectAccess = {
  canView: boolean;
  canEditProject: boolean;
  canEditWorkItems: boolean;
  canManageMembers: boolean;
  isOwner: boolean;
  isMember: boolean;
  isAdmin: boolean;
  isHeadScoped: boolean;
  isLoading: boolean;
  project: DbProject | null;
  memberRole: ProjectMemberRole | null;
};

// Manter compatibilidade com canEdit (deprecado mas funcional)
type ProjectAccessCompat = Omit<ProjectAccess, "canEditProject" | "canEditWorkItems"> & {
  canEdit: boolean; // = canEditProject
};

export function useProjectAccess(projectId: string): ProjectAccessCompat & ProjectAccess {
  const { user } = useAuth();
  const [project, setProject] = useState<DbProject | null>(null);
  const [memberRole, setMemberRole] = useState<ProjectMemberRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!projectId) {
      setProject(null);
      setMemberRole(null);
      setIsLoading(false);
      return;
    }

    async function loadProjectAccess() {
      setIsLoading(true);
      try {
        const { data: projectData, error: projectError } = await supabase
          .from("projects")
          .select("*")
          .eq("id", projectId)
          .maybeSingle();

        if (projectError) throw projectError;
        setProject(projectData ?? null);

        if (user?.id && projectData) {
          const { data: member } = await supabase
            .from("project_members")
            .select("role_in_project")
            .match({ project_id: projectId, user_id: user.id })
            .maybeSingle();
          setMemberRole((member?.role_in_project as ProjectMemberRole) ?? null);
        } else {
          setMemberRole(null);
        }
      } catch (error) {
        console.error("Error loading project access:", error);
        setProject(null);
        setMemberRole(null);
      } finally {
        setIsLoading(false);
      }
    }

    loadProjectAccess();
  }, [projectId, user?.id]);

  // Verificar se é admin ou masteradmin
  const isAdmin = user?.role === "ADMIN" || user?.role === "MASTERADMIN";
  const isColaborador = user?.role === "COLABORADOR";

  // Verificar se é owner do projeto
  const isOwner = project?.owner_user_id === user?.id;

  // Verificar se é membro do projeto
  const isMember = memberRole !== null;

  // Verificar se é HEAD escopado ao departamento do projeto
  const isHeadScoped = useMemo(() => {
    if (!project || user?.role !== "HEAD" || !user.departmentId) return false;
    const extraDepartments = Array.isArray(project.department_ids) ? project.department_ids : [];
    return project.department_id === user.departmentId || extraDepartments.includes(user.departmentId);
  }, [project, user?.departmentId, user?.role]);

  // Regras de permissão
  // ADMIN/MASTERADMIN: tudo
  // HEAD: escopado ao departamento
  // COLABORADOR: só ver e comentar, editar apenas work_items próprios/atribuídos
  // OUTROS (membros sem role específico): igual COLABORADOR
  
  const canView = isAdmin || isOwner || isHeadScoped || isMember;
  const canEditProject = isAdmin || isOwner || isHeadScoped;
  
  // canEditWorkItems: permite edição no backend (RLS vai filtrar o que cada um pode)
  // COLABORADOR pode editar work_items, mas backend só permite se for assignee/creator
  const canEditWorkItems = isAdmin || isOwner || isHeadScoped || (isMember && (memberRole === "owner" || memberRole === "editor"));
  
  const canManageMembers = isAdmin || isOwner || isHeadScoped;
  
  // Compatibilidade: canEdit = canEditProject (para não quebrar código existente)
  const canEdit = canEditProject;

  return {
    canView,
    canEdit,
    canEditProject,
    canEditWorkItems,
    canManageMembers,
    isOwner,
    isMember,
    isAdmin,
    isHeadScoped,
    isLoading,
    project,
    memberRole,
  };
}