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
  const [departmentIds, setDepartmentIds] = useState<string[]>(() => project?.department_ids ?? (project?.department_id ? [project.department_id] : []));
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

  // Put 'Empresa toda' first in departments list if present
  const orderedDepartments = (() => {
    if (!departments || departments.length === 0) return [];
    const copy = [...departments];
    const idx = copy.findIndex((d) => (d.name || '').toLowerCase() === 'empresa toda');
    if (idx > 0) {
      const [found] = copy.splice(idx, 1);
      copy.unshift(found);
    }
    return copy;
  })();

  // If multiple departments selected, include users from any of them
  const filteredUsers = (() => {
    if (!departmentId && (!departmentIds || departmentIds.length === 0)) return users;
    const selectedIds = new Set<string>([...(departmentIds ?? []), ...(departmentId ? [departmentId] : [])].filter(Boolean));
    // Handle special '__none__' meaning users without department
    const includesNone = selectedIds.has('__none__');
    const actualIds = new Set(Array.from(selectedIds).filter((id) => id !== '__none__'));
    return users.filter((u) => {
      if (!u.department_id) return includesNone;
      return actualIds.size === 0 ? true : actualIds.has(u.department_id);
    });
  })();

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

      // Use Edge Function to upsert project securely (avoids RLS issues)
      const payload: any = {
        id: project?.id,
        tenant_id: tenantId,
        name,
        description,
        owner_user_id: ownerUserId,
        visibility,
        status,
        start_date: startDate || null,
        due_date: dueDate || null,
        department_id: departmentId === '__none__' ? null : departmentId || null,
        department_ids: (departmentIds && departmentIds.length) ? departmentIds : null,
        members: finalMemberSet,
      };

      // Call edge function (projects-upsert)
      const res = await supabase.functions.invoke('projects-upsert', {
        body: payload,
      });

      if (res.error) throw new Error(res.error.message || 'Edge function error');

      const projectResult = res.data;

      if (!projectResult?.success) {
        throw new Error(projectResult?.error || 'Failed to upsert project');
      }

      toast({ title: project ? 'Projeto atualizado' : 'Projeto criado' });
      onSaved?.(projectResult.project);
       
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
            {orderedDepartments.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* Simple multi-department hint UI: show selected extra departments and allow adding by clicking names (lightweight) */}
        {departments.length > 1 && (
          <div className="mt-2 text-sm text-muted-foreground">Departamentos adicionais envolvidos:</div>
        )}
        <div className="grid gap-2 grid-cols-2 sm:grid-cols-3">
          {departments.map((d) => {
            const checked = (departmentIds || []).includes(d.id);
            return (
              <label key={d.id} className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    setDepartmentIds((prev) => {
                      const s = new Set(prev || []);
                      if (s.has(d.id)) s.delete(d.id); else s.add(d.id);
                      return Array.from(s);
                    });
                  }}
                  className="h-4 w-4 rounded"
                />
                <div>{d.name}</div>
              </label>
            );
          })}
        </div>
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