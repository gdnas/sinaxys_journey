import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const SUPABASE_URL = "https://gohcnlyonuoeszaqjsxw.supabase.co";
// Service role key must be configured in the Edge Function secrets as SUPABASE_SERVICE_ROLE_KEY
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    if (!SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[projects-upsert] missing SUPABASE_SERVICE_ROLE_KEY');
      return new Response(JSON.stringify({ error: 'Server misconfiguration' }), { status: 500, headers: corsHeaders });
    }

    const svc = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    // Expect Authorization: Bearer <token> from the caller
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }
    const token = authHeader.replace('Bearer ', '');

    // Identify calling user from token
    const { data: userResp, error: userErr } = await svc.auth.getUser(token);
    if (userErr || !userResp?.user) {
      console.warn('[projects-upsert] invalid token', userErr);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }
    const caller = userResp.user;

    // parse JSON body
    let payload: any;
    try {
      payload = await req.json();
    } catch (err) {
      return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), { status: 400, headers: corsHeaders });
    }

    // Required fields
    const required = ['tenant_id', 'name', 'owner_user_id', 'visibility', 'status'];
    for (const f of required) {
      if (payload[f] === undefined) {
        return new Response(JSON.stringify({ error: `Missing field: ${f}` }), { status: 400, headers: corsHeaders });
      }
    }

    const tenantId = payload.tenant_id as string;

    // Validate caller belongs to tenant
    const { data: callerProfile, error: callerProfileErr } = await svc
      .from('profiles')
      .select('id,company_id,role')
      .eq('id', caller.id)
      .maybeSingle();

    if (callerProfileErr) {
      console.error('[projects-upsert] caller profile lookup failed', callerProfileErr);
      return new Response(JSON.stringify({ error: 'Profile lookup failed' }), { status: 500, headers: corsHeaders });
    }
    if (!callerProfile || callerProfile.company_id !== tenantId) {
      return new Response(JSON.stringify({ error: 'Forbidden: caller does not belong to tenant' }), { status: 403, headers: corsHeaders });
    }

    const isAdmin = (callerProfile.role || '').toUpperCase() === 'ADMIN' || (callerProfile.role || '').toUpperCase() === 'MASTERADMIN';

    // Normalize department fields: if department_id is missing but department_ids present, use first item as primary
    if ((!payload.department_id || payload.department_id === null) && Array.isArray(payload.department_ids) && payload.department_ids.length > 0) {
      payload.department_id = payload.department_ids[0];
    }

    // Determine create vs update
    const isUpdate = !!payload.id;
    let projectRow: any = null;

    if (isUpdate) {
      // Fetch existing project to check permissions
      const { data: existingProj, error: existingErr } = await svc
        .from('projects')
        .select('*')
        .eq('id', payload.id)
        .maybeSingle();

      if (existingErr) {
        console.error('[projects-upsert] fetch project failed', existingErr);
        return new Response(JSON.stringify({ error: 'Failed fetching project' }), { status: 500, headers: corsHeaders });
      }
      if (!existingProj) {
        return new Response(JSON.stringify({ error: 'Project not found' }), { status: 404, headers: corsHeaders });
      }

      // Authorization: allow update if caller is admin of company or caller is current owner
      if (!isAdmin && existingProj.owner_user_id !== caller.id) {
        return new Response(JSON.stringify({ error: 'Forbidden: not allowed to edit project' }), { status: 403, headers: corsHeaders });
      }

      // Perform update with service role
      const updatePayload: any = {
        name: payload.name,
        description: payload.description ?? null,
        owner_user_id: payload.owner_user_id,
        visibility: payload.visibility,
        status: payload.status,
        start_date: payload.start_date ?? null,
        due_date: payload.due_date ?? null,
        department_id: payload.department_id ?? null,
        department_ids: Array.isArray(payload.department_ids) ? payload.department_ids : (payload.department_ids ? [payload.department_ids] : null),
      };

      const { data: updated, error: updateErr } = await svc
        .from('projects')
        .update(updatePayload)
        .eq('id', payload.id)
        .select()
        .maybeSingle();

      if (updateErr) {
        console.error('[projects-upsert] update failed', updateErr);
        return new Response(JSON.stringify({ error: 'Failed updating project' }), { status: 500, headers: corsHeaders });
      }

      projectRow = updated;

      // Sync project_members: ensure owner role and member set
      const members: string[] = Array.isArray(payload.members) ? payload.members : [];

      // Fetch existing members
      const { data: existingMembers, error: existingMembersErr } = await svc
        .from('project_members')
        .select('user_id,role_in_project')
        .eq('project_id', payload.id);

      if (existingMembersErr) {
        console.error('[projects-upsert] fetch members failed', existingMembersErr);
        return new Response(JSON.stringify({ error: 'Failed fetching project members' }), { status: 500, headers: corsHeaders });
      }

      const existingIds = (existingMembers ?? []).map((m: any) => m.user_id);
      const finalMemberSet = Array.from(new Set([...(members || []), payload.owner_user_id]));

      // Add missing
      const toAdd = finalMemberSet.filter((id: string) => !existingIds.includes(id)).map((id: string) => ({ tenant_id: tenantId, project_id: payload.id, user_id: id, role_in_project: id === payload.owner_user_id ? 'owner' : 'member' }));
      if (toAdd.length) {
        const { error: insertErr } = await svc.from('project_members').insert(toAdd);
        if (insertErr) {
          console.error('[projects-upsert] insert members failed', insertErr);
          return new Response(JSON.stringify({ error: 'Failed inserting members' }), { status: 500, headers: corsHeaders });
        }
      }

      // Remove extra
      const toRemove = existingIds.filter((id: string) => !finalMemberSet.includes(id));
      if (toRemove.length) {
        const { error: deleteErr } = await svc.from('project_members').delete().match({ project_id: payload.id }).in('user_id', toRemove as any);
        if (deleteErr) {
          console.error('[projects-upsert] delete members failed', deleteErr);
          return new Response(JSON.stringify({ error: 'Failed removing members' }), { status: 500, headers: corsHeaders });
        }
      }

      // Update roles: downgrade previous owner if changed
      if (existingProj.owner_user_id && existingProj.owner_user_id !== payload.owner_user_id) {
        await svc.from('project_members').update({ role_in_project: 'member' }).match({ project_id: payload.id, user_id: existingProj.owner_user_id });
      }

      // Ensure new owner is owner
      const { data: ownerRow } = await svc.from('project_members').select('user_id').match({ project_id: payload.id, user_id: payload.owner_user_id }).maybeSingle();
      if (ownerRow) {
        await svc.from('project_members').update({ role_in_project: 'owner' }).match({ project_id: payload.id, user_id: payload.owner_user_id });
      } else {
        await svc.from('project_members').insert([{ tenant_id: tenantId, project_id: payload.id, user_id: payload.owner_user_id, role_in_project: 'owner' }]);
      }

    } else {
      // Create new project
      const insertPayload: any = {
        tenant_id: tenantId,
        name: payload.name,
        description: payload.description ?? null,
        owner_user_id: payload.owner_user_id,
        created_by_user_id: caller.id,
        visibility: payload.visibility,
        status: payload.status,
        start_date: payload.start_date ?? null,
        due_date: payload.due_date ?? null,
        department_id: payload.department_id ?? null,
        department_ids: Array.isArray(payload.department_ids) ? payload.department_ids : (payload.department_ids ? [payload.department_ids] : null),
      };

      const { data: created, error: createErr } = await svc.from('projects').insert([insertPayload]).select().maybeSingle();
      if (createErr || !created) {
        console.error('[projects-upsert] create failed', createErr);
        return new Response(JSON.stringify({ error: 'Failed creating project' }), { status: 500, headers: corsHeaders });
      }

      projectRow = created;

      // Insert members separately
      const members: string[] = Array.isArray(payload.members) ? payload.members : [];
      const finalMemberSet = Array.from(new Set([...(members || []), payload.owner_user_id]));
      const inserts = finalMemberSet.map((id: string) => ({ tenant_id: tenantId, project_id: created.id, user_id: id, role_in_project: id === payload.owner_user_id ? 'owner' : 'member' }));
      if (inserts.length) {
        const { error: insertErr } = await svc.from('project_members').insert(inserts);
        if (insertErr) {
          console.error('[projects-upsert] create members failed', insertErr);
          return new Response(JSON.stringify({ error: 'Failed inserting members' }), { status: 500, headers: corsHeaders });
        }
      }
    }

    return new Response(JSON.stringify({ success: true, project: projectRow }), { status: 200, headers: corsHeaders });
  } catch (err) {
    console.error('[projects-upsert] unexpected error', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: corsHeaders });
  }
});