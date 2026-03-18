import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Filter, FolderKanban, Plus, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ProjectCard from "@/components/projects/ProjectCard";
import ProjectForm from "@/components/projects/ProjectForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCompany } from "@/lib/company";

export default function ProjetosLista() {
  const { t } = useTranslation();
  const { companyId } = useCompany();
  const [query, setQuery] = useState("");
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  async function fetchProjects() {
    if (!companyId) return;

    setLoading(true);
    setError(null);
    try {
      let request = supabase
        .from("projects")
        .select(`
          *,
          project_member_count:project_members(count)
        `)
        .order("updated_at", { ascending: false });

      if (query.trim()) {
        request = request.ilike("name", `%${query.trim()}%`);
      }

      const { data, error: projectsError } = await request;
      if (projectsError) throw projectsError;

      const rows = (data ?? []) as any[];
      const ownerIds = Array.from(new Set(rows.map((row) => row.owner_user_id).filter(Boolean)));
      const departmentIds = Array.from(
        new Set(
          rows.flatMap((row) => [row.department_id, ...(Array.isArray(row.department_ids) ? row.department_ids : [])]).filter(Boolean),
        ),
      );
      const keyResultIds = Array.from(new Set(rows.map((row) => row.key_result_id).filter(Boolean)));
      const deliverableIds = Array.from(new Set(rows.map((row) => row.deliverable_id).filter(Boolean)));

      const [{ data: profiles }, { data: departments }, keyResultsResult, deliverablesResult] = await Promise.all([
        ownerIds.length
          ? supabase.from("profiles").select("id, name, avatar_url").in("id", ownerIds)
          : Promise.resolve({ data: [] as any[] }),
        departmentIds.length
          ? supabase.from("departments").select("id, name").in("id", departmentIds)
          : Promise.resolve({ data: [] as any[] }),
        keyResultIds.length
          ? supabase.from("okr_key_results").select("id, title, objective_id").in("id", keyResultIds)
          : Promise.resolve({ data: [] as any[] }),
        deliverableIds.length
          ? supabase.from("okr_deliverables").select("id, title, key_result_id").in("id", deliverableIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const objectiveIds = Array.from(new Set(((keyResultsResult.data ?? []) as any[]).map((item) => item.objective_id).filter(Boolean)));
      const { data: objectives } = objectiveIds.length
        ? await supabase.from("okr_objectives").select("id, title, okr_level").in("id", objectiveIds)
        : { data: [] as any[] };

      const profileMap = new Map((profiles ?? []).map((item: any) => [item.id, item]));
      const departmentMap = new Map((departments ?? []).map((item: any) => [item.id, item.name]));
      const keyResultMap = new Map(((keyResultsResult.data ?? []) as any[]).map((item) => [item.id, item]));
      const deliverableMap = new Map(((deliverablesResult.data ?? []) as any[]).map((item) => [item.id, item]));
      const objectiveMap = new Map((objectives ?? []).map((item: any) => [item.id, item]));

      const mappedProjects = rows.map((row) => {
        const departmentNames = Array.isArray(row.department_ids) && row.department_ids.length
          ? row.department_ids.map((id: string) => departmentMap.get(id)).filter(Boolean)
          : row.department_id
            ? [departmentMap.get(row.department_id)].filter(Boolean)
            : [];

        const keyResult = row.key_result_id ? keyResultMap.get(row.key_result_id) : null;
        const deliverable = row.deliverable_id ? deliverableMap.get(row.deliverable_id) : null;
        const objective = keyResult?.objective_id ? objectiveMap.get(keyResult.objective_id) : null;
        const owner = profileMap.get(row.owner_user_id);

        return {
          ...row,
          member_count: row.project_member_count?.[0]?.count ?? 0,
          owner_name: owner?.name ?? null,
          owner_avatar_url: owner?.avatar_url ?? null,
          department_name: departmentNames[0] ?? null,
          department_names: departmentNames,
          key_result_title: keyResult?.title ?? null,
          deliverable_title: deliverable?.title ?? null,
          okr_title: objective?.title ?? null,
          okr_level: objective?.okr_level ?? null,
        };
      });

      setProjects(mappedProjects);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar os projetos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProjects();
  }, [companyId, query]);

  return (
    <div className="mx-auto grid max-w-6xl gap-8 pb-12">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[color:var(--sinaxys-ink)]">{t("nav.projects.list")}</h1>
            <p className="mt-2 text-muted-foreground">Projetos conectados a OKRs, entregáveis e execução em work_items.</p>
          </div>
          <Button className="rounded-2xl bg-[color:var(--sinaxys-primary)] text-white" onClick={() => setShowCreate(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo projeto
          </Button>
        </div>
      </div>

      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/app/projetos/dashboard" className="hover:text-[color:var(--sinaxys-primary)]">
          {t("nav.projects.home")}
        </Link>
        <span>/</span>
        <span className="text-[color:var(--sinaxys-primary)]">{t("nav.projects.list")}</span>
      </nav>

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-4">
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar projetos..."
              className="rounded-2xl pl-10"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Button variant="outline" className="rounded-2xl" onClick={fetchProjects}>
            <Filter className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
        </div>
      </Card>

      <div className="text-sm text-muted-foreground">{projects.length} projetos no escopo visível</div>

      {loading ? (
        <div className="py-8 text-center">Carregando...</div>
      ) : error ? (
        <div className="py-8 text-center text-red-600">Erro: {error}</div>
      ) : projects.length ? (
        <div className="grid gap-4">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-tint)]/30 p-12">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white shadow-sm">
              <FolderKanban className="h-10 w-10 text-[color:var(--sinaxys-primary)]" />
            </div>
            <div className="max-w-lg">
              <h3 className="text-xl font-bold text-[color:var(--sinaxys-ink)]">Nenhum projeto encontrado</h3>
              <p className="mt-2 text-muted-foreground">Crie um projeto e vincule-o ao KR ou entregável certo para manter a execução alinhada ao OKR.</p>
            </div>
            <Button className="rounded-2xl bg-[color:var(--sinaxys-primary)] text-white" onClick={() => setShowCreate(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Criar projeto
            </Button>
          </div>
        </Card>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle>Novo projeto</DialogTitle>
          </DialogHeader>
          <ProjectForm onSaved={() => { setShowCreate(false); fetchProjects(); }} onCancel={() => setShowCreate(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
