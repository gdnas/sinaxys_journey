import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type ProjectAccess = {
  canView: boolean;
  canEdit: boolean;
  canManageMembers: boolean;
  isOwner: boolean;
  isMember: boolean;
  isAdmin: boolean;
  isHeadScoped: boolean;
  isLoading: boolean;
  project: any;
};

export function useProjectAccess(projectId: string): ProjectAccess {
  const { user } = useAuth();
  const [project, setProject] = useState<any>(null);
  const [memberRole, setMemberRole] = useState<string | null>(null);
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
          setMemberRole(member?.role_in_project ?? null);
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

  const isAdmin = user?.role === "ADMIN" || user?.role === "MASTERADMIN";
  const isOwner = project?.owner_user_id === user?.id;
  const isMember = memberRole !== null;
  const isHeadScoped = useMemo(() => {
    if (!project || user?.role !== "HEAD" || !user.departmentId) return false;
    const extraDepartments = Array.isArray(project.department_ids) ? project.department_ids : [];
    return project.department_id === user.departmentId || extraDepartments.includes(user.departmentId);
  }, [project, user?.departmentId, user?.role]);

  const canView = !!project;
  const canEdit = !!project && (isAdmin || isHeadScoped);
  const canManageMembers = canEdit;

  return {
    canView,
    canEdit,
    canManageMembers,
    isOwner,
    isMember,
    isAdmin,
    isHeadScoped,
    isLoading,
    project,
  };
}
