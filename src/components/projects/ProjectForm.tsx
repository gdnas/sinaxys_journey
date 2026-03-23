import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/lib/company";
import { useAuth } from "@/lib/auth";
import { TemplateType, TEMPLATE_WORKFLOWS } from "@/lib/templateWorkflowDb";
import TemplateSelector from "@/components/projects/TemplateSelector";
import TemplateBadge from "@/components/projects/TemplateBadge";

const NONE_VALUE = "__none__";

type ObjectiveOption = {
  id: string;
  title: string;
  okr_level: "strategic" | "tactical";
  department_id: string | null;
};

type KeyResultOption = {
  id: string;
  objective_id: string;
  title: string;
};

type DeliverableOption = {
  id: string;
  key_result_id: string;
  title: string;
};

export default function ProjectForm({
  project,
  onSaved,
  onCancel,
}: {
  project?: any;
  onSaved?: (p: any) => void;
  onCancel?: () => void;
}) {
  const { toast } = useToast();
  const { companyId } = useCompany();
  const { user } = useAuth();

  const [name, setName] = useState(project?.name ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [ownerUserId, setOwnerUserId] = useState<string | undefined>(project?.owner_user_id);
  const [startDate, setStartDate] = useState(project?.start_date ?? "");
  const [dueDate, setDueDate] = useState(project?.due_date ?? "");
  const [status, setStatus] = useState(project?.status ?? "not_started");
  const [departmentId, setDepartmentId] = useState<string | undefined>(project?.department_id ?? undefined);
  const [departmentIds, setDepartmentIds] = useState<string[]>(() => project?.department_ids ?? (project?.department_id ? [project.department_id] : []));
  const [visibility, setVisibility] = useState(project?.visibility ?? "public");
  const [loading, setLoading] = useState(false);

  // KAIROOS 2.0 Fase 1: Template type state (required for new projects, immutable for existing)
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType | null>(project?.template_type ?? null);
  const [showTemplateSelector, setShowTemplateSelector] = useState(!project?.template_type);

  const [users, setUsers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [members, setMembers] = useState<string[]>(() => project?.project_members?.map((m: any) => m.user_id) ?? []);

  const [objectives, setObjectives] = useState<ObjectiveOption[]>([]);
  const [keyResults, setKeyResults] = useState<KeyResultOption[]>([]);
  const [deliverables, setDeliverables] = useState<DeliverableOption[]>([]);
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<string>(NONE_VALUE);
  const [selectedKeyResultId, setSelectedKeyResultId] = useState<string>(project?.key_result_id ?? NONE_VALUE);
  const [selectedDeliverableId, setSelectedDeliverableId] = useState<string>(project?.deliverable_id ?? NONE_VALUE);

  useEffect(() => {
    setName(project?.name ?? "");
    setDescription(project?.description ?? "");
    setOwnerUserId(project?.owner_user_id);
    setStartDate(project?.start_date ?? "");
    setDueDate(project?.due_date ?? "");
    setStatus(project?.status ?? "not_started");
    setDepartmentId(project?.department_id ?? undefined);
    setDepartmentIds(project?.department_ids ?? (project?.department_id ? [project.department_id] : []));
    setVisibility(project?.visibility ?? "public");
    setMembers(project?.project_members?.map((m: any) => m.user_id) ?? []);
    setSelectedKeyResultId(project?.key_result_id ?? NONE_VALUE);
    setSelectedDeliverableId(project?.deliverable_id ?? NONE_VALUE);
    // KAIROOS 2.0 Fase 1: Update template state when project prop changes
    setSelectedTemplate(project?.template_type ?? null);
    setShowTemplateSelector(!project?.template_type);
  }, [project]);

  useEffect(() => {
    async function loadData() {
      if (!companyId) return;

      try {
        const { data: usersData, error: usersError } = await supabase
          .from("profiles")
          .select("id, name, email, department_id")
          .eq("company_id", companyId)
          .eq("active", true)
          .order("name", { ascending: true });
        if (usersError) throw usersError;

        const { data: deptsData, error: deptsError } = await supabase
          .from("departments")
          .select("id, name")
          .eq("company_id", companyId)
          .order("name", { ascending: true });
        if (deptsError) throw deptsError;

        const { data: objectivesData, error: objectivesError } = await supabase
          .from("okr_objectives")
          .select("id, title, okr_level, department_id")
          .eq("company_id", companyId)
          .order("created_at", { ascending: false });
        if (objectivesError) throw objectivesError;

        const objectiveIds = (objectivesData ?? []).map((item) => item.id);
        let keyResultsData: KeyResultOption[] = [];
        if (objectiveIds.length) {
          const { data, error } = await supabase
            .from("okr_key_results")
            .select("id, objective_id, title")
            .in("objective_id", objectiveIds)
            .order("created_at", { ascending: true });
          if (error) throw error;
          keyResultsData = (data ?? []) as KeyResultOption[];
        }

        const keyResultIds = keyResultsData.map((item) => item.id);
        let deliverablesData: DeliverableOption[] = [];
        if (keyResultIds.length) {
          const { data, error } = await supabase
            .from("okr_deliverables")
            .select("id, key_result_id, title")
            .in("key_result_id", keyResultIds)
            .order("created_at", { ascending: true });
          if (error) throw error;
          deliverablesData = (data ?? []) as DeliverableOption[];
        }

        setUsers(usersData ?? []);
        setDepartments(deptsData ?? []);
        setObjectives((objectivesData ?? []) as ObjectiveOption[]);
        setKeyResults(keyResultsData);
        setDeliverables(deliverablesData);
      } catch (error) {
        console.error("Error loading project form data:", error);
        toast({
          title: "Erro ao carregar vínculos",
          description: error instanceof Error ? error.message : "Não foi possível carregar OKRs, KRs e entregáveis.",
          variant: "destructive",
        });
      }
    }

    loadData();
  }, [companyId, toast]);

  useEffect(() => {
    if (!selectedKeyResultId || selectedKeyResultId === NONE_VALUE) {
      return;
    }

    const kr = keyResults.find((item) => item.id === selectedKeyResultId);
    if (kr) {
      setSelectedObjectiveId(kr.objective_id);
    }
  }, [keyResults, selectedKeyResultId]);

  useEffect(() => {
    if (!selectedKeyResultId || selectedKeyResultId === NONE_VALUE) {
      setSelectedDeliverableId(NONE_VALUE);
      return;
    }

    const deliverableStillValid = deliverables.some(
      (item) => item.id === selectedDeliverableId && item.key_result_id === selectedKeyResultId,
    );

    if (!deliverableStillValid) {
      setSelectedDeliverableId(NONE_VALUE);
    }
  }, [deliverables, selectedDeliverableId, selectedKeyResultId]);

  const orderedDepartments = useMemo(() => {
    if (!departments.length) return [];
    const copy = [...departments];
    const idx = copy.findIndex((d) => (d.name || "").toLowerCase() === "empresa toda");
    if (idx > 0) {
      const [found] = copy.splice(idx, 1);
      copy.unshift(found);
    }
    return copy;
  }, [departments]);

  const filteredUsers = useMemo(() => {
    if (!departmentId && (!departmentIds || departmentIds.length === 0)) return users;

    const selectedIds = new Set<string>([...(departmentIds ?? []), ...(departmentId ? [departmentId] : [])].filter(Boolean));
    return users.filter((u) => !u.department_id || selectedIds.has(u.department_id));
  }, [departmentId, departmentIds, users]);

  const filteredKeyResults = useMemo(() => {
    if (!selectedObjectiveId || selectedObjectiveId === NONE_VALUE) return [];
    return keyResults.filter((item) => item.objective_id === selectedObjectiveId);
  }, [keyResults, selectedObjectiveId]);

  const filteredDeliverables = useMemo(() => {
    if (!selectedKeyResultId || selectedKeyResultId === NONE_VALUE) return [];
    return deliverables.filter((item) => item.key_result_id === selectedKeyResultId);
  }, [deliverables, selectedKeyResultId]);

  const selectedObjective = objectives.find((item) => item.id === selectedObjectiveId);

  function toggleMember(userId: string) {
    setMembers((prev) => {
      if (prev.includes(userId)) return prev.filter((id) => id !== userId);
      return [...prev, userId];
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // KAIROOS 2.0 Fase 1: Validate template type for new projects
    if (!project && !selectedTemplate) {
      return toast({ title: "Template é obrigatório", description: "Selecione um template para criar o projeto.", variant: "destructive" });
    }

    if (!name.trim()) {
      return toast({ title: "Nome é obrigatório", variant: "destructive" });
    }
    if (!ownerUserId) {
      return toast({ title: "Responsável é obrigatório", variant: "destructive" });
    }
    if (startDate && dueDate && new Date(dueDate) < new Date(startDate)) {
      return toast({ title: "Prazo final não pode ser menor que início", variant: "destructive" });
    }
    if (selectedDeliverableId !== NONE_VALUE && selectedKeyResultId === NONE_VALUE) {
      return toast({ title: "Selecione um KR antes do entregável", variant: "destructive" });
    }

    setLoading(true);
    try {
      const finalMemberSet = Array.from(new Set([...(members ?? []), ownerUserId])) as string[];
      const payload: Record<string, unknown> = {
        id: project?.id,
        tenant_id: companyId,
        name: name.trim(),
        description: description.trim() || null,
        owner_user_id: ownerUserId,
        visibility,
        status,
        start_date: startDate || null,
        due_date: dueDate || null,
        department_id: departmentId || null,
        department_ids: departmentIds.length ? departmentIds : null,
        key_result_id: selectedKeyResultId === NONE_VALUE ? null : selectedKeyResultId,
        deliverable_id: selectedDeliverableId === NONE_VALUE ? null : selectedDeliverableId,
        // KAIROOS 2.0 Fase 1: Include template_type (only for new projects, immutable for existing)
        template_type: !project ? selectedTemplate : undefined,
        members: finalMemberSet,
      };

      const res = await supabase.functions.invoke("projects-upsert", { body: payload });
      if (res.error) throw new Error(res.error.message || "Erro ao salvar projeto");
      if (!res.data?.success) throw new Error(res.data?.error || "Falha ao salvar projeto");

      toast({ title: project ? "Projeto atualizado" : "Projeto criado" });
      onSaved?.(res.data.project);
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Não foi possível salvar o projeto.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5">
      {/* KAIROOS 2.0 Fase 1: Template Selection (only for new projects) */}
      {!project && (
        <>
          {showTemplateSelector && !selectedTemplate ? (
            <TemplateSelector onSelect={(templateType) => {
              setSelectedTemplate(templateType);
              setShowTemplateSelector(false);
            }} />
          ) : selectedTemplate ? (
            <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-tint)]/20 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Template selecionado</div>
                  <div className="mt-1">
                    <TemplateBadge templateType={selectedTemplate} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {TEMPLATE_WORKFLOWS[selectedTemplate] ? Object.values(TEMPLATE_WORKFLOWS[selectedTemplate]).map(s => s.display_name).join(', ') : ''}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedTemplate(null);
                    setShowTemplateSelector(true);
                  }}
                  disabled={loading}
                >
                  Alterar
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}

      {/* KAIROOS 2.0 Fase 1: Show template for existing projects (read-only) */}
      {project && project.template_type && (
        <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-tint)]/20 p-4">
          <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)] mb-2">Template do Projeto</div>
          <TemplateBadge templateType={project.template_type} />
          <p className="mt-2 text-xs text-muted-foreground">
            O template define o fluxo de status do projeto e não pode ser alterado após a criação.
          </p>
        </div>
      )}

      <div className="grid gap-2">
        <Label>Nome</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} required className="rounded-2xl" />
      </div>

      <div className="grid gap-2">
        <Label>Descrição</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="rounded-2xl min-h-24" />
      </div>

      <div className="rounded-3xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-tint)]/20 p-4">
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Alinhamento com OKR</h3>
          <p className="text-xs text-muted-foreground">Escolha primeiro o OKR, depois o KR e por fim o entregável compatível.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="grid gap-2">
            <Label>OKR</Label>
            <Select
              value={selectedObjectiveId}
              onValueChange={(value) => {
                setSelectedObjectiveId(value);
                if (value === NONE_VALUE) {
                  setSelectedKeyResultId(NONE_VALUE);
                  setSelectedDeliverableId(NONE_VALUE);
                  return;
                }

                const currentKr = keyResults.find((item) => item.id === selectedKeyResultId);
                if (!currentKr || currentKr.objective_id !== value) {
                  setSelectedKeyResultId(NONE_VALUE);
                  setSelectedDeliverableId(NONE_VALUE);
                }
              }}
            >
              <SelectTrigger className="rounded-2xl bg-white">
                <SelectValue placeholder="Selecione um OKR" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>Sem vinculação</SelectItem>
                {objectives.map((objective) => (
                  <SelectItem key={objective.id} value={objective.id}>
                    {objective.title} · {objective.okr_level === "strategic" ? "Estratégico" : "Tático"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Resultado-chave</Label>
            <Select
              value={selectedKeyResultId}
              onValueChange={(value) => {
                setSelectedKeyResultId(value);
                if (value === NONE_VALUE) {
                  setSelectedDeliverableId(NONE_VALUE);
                  return;
                }

                const kr = keyResults.find((item) => item.id === value);
                if (kr && kr.objective_id !== selectedObjectiveId) {
                  setSelectedObjectiveId(kr.objective_id);
                }

                const deliverableStillValid = deliverables.some(
                  (item) => item.id === selectedDeliverableId && item.key_result_id === value,
                );
                if (!deliverableStillValid) {
                  setSelectedDeliverableId(NONE_VALUE);
                }
              }}
              disabled={selectedObjectiveId === NONE_VALUE}
            >
              <SelectTrigger className="rounded-2xl bg-white">
                <SelectValue placeholder="Selecione um KR" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>Sem vinculação</SelectItem>
                {filteredKeyResults.map((kr) => (
                  <SelectItem key={kr.id} value={kr.id}>
                    {kr.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Entregável</Label>
            <Select
              value={selectedDeliverableId}
              onValueChange={setSelectedDeliverableId}
              disabled={selectedKeyResultId === NONE_VALUE}
            >
              <SelectTrigger className="rounded-2xl bg-white">
                <SelectValue placeholder="Selecione um entregável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>Sem vinculação</SelectItem>
                {filteredDeliverables.map((deliverable) => (
                  <SelectItem key={deliverable.id} value={deliverable.id}>
                    {deliverable.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedObjective ? (
          <div className="mt-3 rounded-2xl bg-white px-3 py-2 text-xs text-muted-foreground ring-1 ring-[color:var(--sinaxys-border)]">
            Este projeto ficará alinhado ao OKR <span className="font-semibold text-[color:var(--sinaxys-ink)]">{selectedObjective.title}</span>
            {selectedObjective.okr_level === "tactical" ? " (tático)." : " (estratégico)."}
          </div>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label>Departamento principal</Label>
        <Select value={departmentId ?? NONE_VALUE} onValueChange={(val) => setDepartmentId(val === NONE_VALUE ? undefined : val)}>
          <SelectTrigger className="rounded-2xl">
            <SelectValue placeholder="Selecione um departamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_VALUE}>Sem departamento</SelectItem>
            {orderedDepartments.map((department) => (
              <SelectItem key={department.id} value={department.id}>
                {department.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label>Departamentos envolvidos</Label>
        <div className="grid gap-2 rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-3 sm:grid-cols-2">
          {departments.map((department) => {
            const checked = departmentIds.includes(department.id);
            return (
              <label key={department.id} className="flex items-center gap-2 text-sm text-[color:var(--sinaxys-ink)]">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    setDepartmentIds((prev) => {
                      const next = new Set(prev);
                      if (next.has(department.id)) next.delete(department.id);
                      else next.add(department.id);
                      return Array.from(next);
                    });
                  }}
                  className="h-4 w-4 rounded"
                />
                <span>{department.name}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="grid gap-2">
        <Label>Responsável</Label>
        <Select value={ownerUserId} onValueChange={setOwnerUserId}>
          <SelectTrigger className="rounded-2xl">
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
        <Label>Equipe do projeto</Label>
        <div className="grid max-h-48 gap-2 overflow-auto rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-3">
          {filteredUsers.map((u) => (
            <label key={u.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={members.includes(u.id)}
                onChange={() => toggleMember(u.id)}
                className="h-4 w-4 rounded"
              />
              <span className="text-[color:var(--sinaxys-ink)]">{u.name || u.email}</span>
              {ownerUserId === u.id ? <span className="ml-auto text-xs text-muted-foreground">Responsável</span> : null}
            </label>
          ))}
          {filteredUsers.length === 0 ? <div className="text-sm text-muted-foreground">Nenhuma pessoa disponível nesse escopo.</div> : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label>Visibilidade</Label>
          <Select value={visibility} onValueChange={setVisibility}>
            <SelectTrigger className="rounded-2xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="public">Público</SelectItem>
              <SelectItem value="private">Privado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label>Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="rounded-2xl">
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
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label>Data de início</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="rounded-2xl" />
        </div>
        <div className="grid gap-2">
          <Label>Prazo final</Label>
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="rounded-2xl" />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" className="rounded-2xl bg-[color:var(--sinaxys-primary)] text-white" disabled={loading || !user}>
          {loading ? "Salvando..." : project ? "Salvar projeto" : "Criar projeto"}
        </Button>
        {onCancel ? (
          <Button type="button" variant="outline" className="rounded-2xl" onClick={onCancel}>
            Cancelar
          </Button>
        ) : null}
      </div>
    </form>
  );
}