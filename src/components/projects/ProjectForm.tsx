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
import { X } from 'lucide-react';

export default function ProjectForm({ project, onSaved, onCancel }: { project?: any; onSaved?: (p: any) => void; onCancel?: () => void }) {
  const { toast } = useToast();
  const { companyId } = useCompany();
  const { user } = useAuth();
  const [name, setName] = useState(project?.name ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [ownerUserId, setOwnerUserId] = useState(project?.owner_user_id ?? '');
  const [startDate, setStartDate] = useState(project?.start_date ?? '');
  const [dueDate, setDueDate] = useState(project?.due_date ?? '');
  const [status, setStatus] = useState(project?.status ?? 'not_started');
  const [departmentId, setDepartmentId] = useState(project?.department_id ?? '');
  const [visibility, setVisibility] = useState(project?.visibility ?? 'public');
  const [loading, setLoading] = useState(false);
  
  // Users and departments for dropdowns
  const [users, setUsers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);

  useEffect(() => {
    setName(project?.name ?? '');
    setDescription(project?.description ?? '');
    setOwnerUserId(project?.owner_user_id ?? '');
    setStartDate(project?.start_date ?? '');
    setDueDate(project?.due_date ?? '');
    setStatus(project?.status ?? 'not_started');
    setDepartmentId(project?.department_id ?? '');
    setVisibility(project?.visibility ?? 'public');
  }, [project]);

  useEffect(() => {
    async function loadData() {
      try {
        // Load company users
        const { data: usersData } = await supabase
          .from('profiles')
          .select('id, name, email')
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast({ title: 'Nome é obrigatório', variant: 'destructive' });
    if (!ownerUserId) return toast({ title: 'Responsável é obrigatório', variant: 'destructive' });
    if (startDate && dueDate && new Date(dueDate) < new Date(startDate)) return toast({ title: 'Prazo final não pode ser menor que início', variant: 'destructive' });
    
    setLoading(true);
    try {
      const tenantId = companyId;
      
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
        
        // Sync owner in project_members
        if (ownerUserId !== project.owner_user_id) {
          // 1. Downgrade previous owner to 'member' if exists
          if (project.owner_user_id) {
            await supabase.from('project_members').update({ role_in_project: 'member' }).match({ project_id: project.id, user_id: project.owner_user_id });
          }
          // 2. Ensure new owner is in project_members as 'owner'
          const existingOwnerMember = await supabase.from('project_members').select('id').match({ project_id: project.id, user_id: ownerUserId }).maybeSingle();
          if (!existingOwnerMember?.data) {
            await supabase.from('project_members').insert([{ tenant_id: tenantId, project_id: project.id, user_id: ownerUserId, role_in_project: 'owner' }]);
          } else {
            await supabase.from('project_members').update({ role_in_project: 'owner' }).match({ project_id: project.id, user_id: ownerUserId });
          }
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

        // insert project member as owner
        await supabase.from('project_members').insert([{ tenant_id: tenantId, project_id: data.id, user_id: ownerUserId, role_in_project: 'owner' }]);
        
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
    <div className="relative">
      {onCancel && (
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute right-0 top-0"
          onClick={onCancel}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
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
          <Label>Responsável</Label>
          <Select value={ownerUserId} onValueChange={setOwnerUserId} required>
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="Selecione um responsável" />
            </SelectTrigger>
            <SelectContent>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name || u.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label>Departamento (opcional)</Label>
          <Select value={departmentId || "__none__"} onValueChange={(val) => setDepartmentId(val === "__none__" ? "" : val)}>
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
    </div>
  );
}
