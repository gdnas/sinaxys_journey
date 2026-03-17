import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/lib/company';
import { useAuth } from '@/lib/auth';

export default function ProjectForm({ project, onSaved, onCancel }: { project?: any; onSaved?: (p: any) => void; onCancel?: () => void }) {
  const { toast } = useToast();
  const { companyId } = useCompany();
  const { user } = useAuth();
  const [name, setName] = useState(project?.name ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [ownerUserId, setOwnerUserId] = useState<string | undefined>(project?.owner_user_id);
  const [startDate, setStartDate] = useState(project?.start_date ?? '');
  const [dueDate, setDueDate] = useState(project?.due_date ?? '');
  const [status, setStatus] = useState(project?.status ?? 'not_started');
  const [departmentId, setDepartmentId] = useState<string | undefined>(project?.department_id);
  const [visibility, setVisibility] = useState(project?.visibility ?? 'public');
  const [loading, setLoading] = useState(false);
  
  // Users and departments for dropdowns
  const [users, setUsers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  // project members selection (can be multiple)
  const [members, setMembers] = useState<string[]>(() => project?.project_members?.map((m: any) => m.user_id) ?? []);

  useEffect(() => {
    setName(project?.name ?? '');
    setDescription(project?.description ?? '');
    setOwnerUserId(project?.owner_user_id);
    setStartDate(project?.start_date ?? '');
    setDueDate(project?.due_date ?? '');
    setStatus(project?.status ?? 'not_started');
    setDepartmentId(project?.department_id);
    setVisibility(project?.visibility ?? 'public');
    setMembers(project?.project_members?.map((m: any) => m.user_id) ?? []);
  }, [project]);

  useEffect(() => {
    async function loadData() {
      try {
        // Load company users (include department_id so we can filter)
        const { data: usersData } = await supabase
          .from('profiles')
          .select('id, name, email, department_id')
          .eq('company_id', companyId)
          .eq('active', true)
          .order('name', { ascending: true });
        
        // Load company departments
        const { data: deptsData } = await supabase
          .from('departments')
          .select('id, name')
          .eq('company_id', companyId)
          .order('name', { ascending: true });

        setUsers(usersData ?? []);
        setDepartments(deptsData ?? []);
      } catch (err) {
        console.error('Error loading users/departments:', err);
      }
    }
    if (companyId) {
      loadData();
    }
  }, [companyId]);

  // Derive filtered users according to selected department (if any)
  const filteredUsers = departmentId
    ? departmentId === '__none__'
      ? users.filter((u) => !u.department_id)
      : users.filter((u) => u.department_id === departmentId)
    : users;

  function toggleMember(userId: string) {
    setMembers((prev) => {
      if (prev.includes(userId)) return prev.filter((id) => id !== userId);
      return [...prev, userId];
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast({ title: 'Nome é obrigatório', variant: 'destructive' });
    if (!ownerUserId) return toast({ title: 'Responsável é obrigatório', variant: 'destructive' });
    if (startDate && dueDate && new Date(dueDate) < new Date(startDate)) return toast({ title: 'Prazo final não pode ser menor que início', variant: 'destructive' });
    
    setLoading(true);
    try {
      const tenantId = companyId;
      
      // Ensure owner is always part of members
      const finalMemberSet = Array.from(new Set([...(members ?? []), ownerUserId!])) as string[];

      if (project) {
        // update
        const { data, error } = await supabase
          .from('projects')
          .update({ 
            name, 
            description, 
            owner_user_id: ownerUserId, 
            start_date: startDate || null, 
            due_date: dueDate || null, 
            status, 
            department_id: departmentId || null 
          })
          .eq('id', project.id)
          .select()
          .maybeSingle();
        
        if (error) throw error;

        // Sync project_members: fetch existing
        const { data: existingMembers } = await supabase.from('project_members').select('user_id, role_in_project').eq('project_id', project.id);
        const existingIds = (existingMembers ?? []).map((m: any) => m.user_id);

        // To add
        const toAdd = finalMemberSet.filter((id) => !existingIds.includes(id)).map((id) => ({ tenant_id: tenantId, project_id: project.id, user_id: id, role_in_project: id === ownerUserId ? 'owner' : 'member' }));
        if (toAdd.length) {
          await supabase.from('project_members').insert(toAdd);
        }

        // To remove (except ensure owner cannot be removed here; owner should be in finalMemberSet)
        const toRemove = existingIds.filter((id) => !finalMemberSet.includes(id));
        if (toRemove.length) {
          await supabase.from('project_members').delete().match({ project_id: project.id }).in('user_id', toRemove as any);
        }

        // Ensure roles are correct (owner)
        // Downgrade previous owner(s) if owner changed
        if (ownerUserId !== project.owner_user_id) {
          if (project.owner_user_id) {
            await supabase.from('project_members').update({ role_in_project: 'member' }).match({ project_id: project.id, user_id: project.owner_user_id });
          }
          // Set new owner role
          await supabase.from('project_members').upsert({ tenant_id: tenantId, project_id: project.id, user_id: ownerUserId, role_in_project: 'owner' }, { onConflict: ['project_id', 'user_id'] });
        } else {
          // Make sure owner row exists and has correct role
          await supabase.from('project_members').update({ role_in_project: 'owner' }).match({ project_id: project.id, user_id: ownerUserId });
        }

        // For other members ensure role is 'member'
        const otherMembers = finalMemberSet.filter((id) => id !== ownerUserId);
        if (otherMembers.length) {
          await supabase.from('project_members').update({ role_in_project: 'member' }).match({ project_id: project.id }).in('user_id', otherMembers as any);
        }

        toast({ title: 'Projeto atualizado' });
        onSaved?.(data);
      } else {
        // insert
        const { data, error } = await supabase
          .from('projects')
          .insert([{
              tenant_id: tenantId,
              name,
              description,
              owner_user_id: ownerUserId,
              created_by_user_id: user?.id,
              visibility,
              admin_private_mode: null,
              status,
              start_date: startDate || null,
              due_date: dueDate || null,
              department_id: departmentId || null,
            }])
          .select()
          .maybeSingle();

        if (error) throw error;

        // insert project members: owner as 'owner', others as 'member'
        const inserts = finalMemberSet.map((id) => ({ tenant_id: tenantId, project_id: data.id, user_id: id, role_in_project: id === ownerUserId ? 'owner' : 'member' }));
        if (inserts.length) {
          await supabase.from('project_members').insert(inserts);
        }
        
        toast({ title: 'Projeto criado' });
        onSaved?.(data);
      }
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message || String(err), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-2">
        <Label>Nome</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
      </div>

      <div className="grid gap-2">
        <Label>Descrição</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <div className="grid gap-2">
        <Label>Departamento (opcional)</Label>
        <Select value={departmentId} onValueChange={(val) => setDepartmentId(val === '__none__' ? '__none__' : (val || undefined))}>
          <SelectTrigger className="rounded-xl">
            <SelectValue placeholder="Selecione um departamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Sem departamento</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label>Responsável</Label>
        <Select value={ownerUserId} onValueChange={setOwnerUserId} required>
          <SelectTrigger className="rounded-xl">
            <SelectValue placeholder="Selecione um responsável" />
          </SelectTrigger>
          <SelectContent>
            {filteredUsers.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.name || u.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label>Membros do projeto (pode selecionar vários)</Label>
        <div className="grid gap-2 max-h-40 overflow-auto p-2 rounded-xl border border-border bg-[color:var(--sinaxys-surface)]">
          {filteredUsers.map((u) => (
            <label key={u.id} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={members.includes(u.id)}
                onChange={() => toggleMember(u.id)}
                className="h-4 w-4 rounded"
              />
              <div className="text-sm">{u.name || u.email}</div>
              {ownerUserId === u.id && <div className="ml-auto text-xs text-muted-foreground">Responsável</div>}
            </label>
          ))}
          {filteredUsers.length === 0 && <div className="text-sm text-muted-foreground">Nenhuma pessoa no departamento selecionado.</div>}
        </div>
      </div>

      <div className="grid gap-2">
        <Label>Visibilidade</Label>
        <Select value={visibility} onValueChange={setVisibility}>
          <SelectTrigger className="rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="public">Público - visível para todos</SelectItem>
            <SelectItem value="private">Privado - visível apenas para membros</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label>Data de início</Label>
          <Input type="date" value={startDate ?? ''} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div>
          <Label>Prazo final</Label>
          <Input type="date" value={dueDate ?? ''} onChange={(e) => setDueDate(e.target.value)} />
        </div>
      </div>

      <div className="grid gap-2">
        <Label>Status</Label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="not_started">Não iniciado</SelectItem>
            <SelectItem value="on_track">No prazo</SelectItem>
            <SelectItem value="at_risk">Em risco</SelectItem>
            <SelectItem value="delayed">Atrasado</SelectItem>
            <SelectItem value="completed">Concluído</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2">
        <Button type="submit" className="rounded-xl" disabled={loading}>
          {loading ? 'Salvando...' : project ? 'Salvar' : 'Criar projeto'}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" className="rounded-xl" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}