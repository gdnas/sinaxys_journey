import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import type { Role } from '@/lib/domain';

export type ProjectAccess = {
  canView: boolean;
  canEdit: boolean;
  canManageMembers: boolean;
  isOwner: boolean;
  isMember: boolean;
  isAdmin: boolean;
  isMasterAdmin: boolean;
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
      setIsLoading(false);
      return;
    }

    async function loadProjectAccess() {
      setIsLoading(true);
      try {
        // Load project details
        const { data: proj, error: projError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .maybeSingle();

        if (projError) throw projError;

        setProject(proj);

        // Load user's membership if logged in
        if (user?.id) {
          const { data: member } = await supabase
            .from('project_members')
            .select('role_in_project')
            .match({ project_id: projectId, user_id: user.id })
            .maybeSingle();

          setMemberRole(member?.role_in_project ?? null);
        }
      } catch (err) {
        console.error('Error loading project access:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadProjectAccess();
  }, [projectId, user?.id]);

  // Determine access based on rules
  const isAdmin = user?.role === 'ADMIN';
  const isMasterAdmin = user?.role === 'MASTERADMIN';
  const isOwner = project?.owner_user_id === user?.id;
  const isMember = memberRole !== null;

  const canView =
    !project ||
    project.visibility === 'public' ||
    isMember ||
    isAdmin ||
    isMasterAdmin;

  const canEdit =
    isAdmin ||
    isMasterAdmin ||
    isOwner;

  const canManageMembers =
    isAdmin ||
    isMasterAdmin ||
    isOwner;

  return {
    canView,
    canEdit,
    canManageMembers,
    isOwner,
    isMember,
    isAdmin,
    isMasterAdmin,
    isLoading,
    project,
  };
}
