import { Link } from "react-router-dom";
import { FolderKanban, Plus, Search, Filter, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useCompany } from "@/lib/company";
import ProjectCard from "@/components/projects/ProjectCard";
import ProjectForm from "@/components/projects/ProjectForm";

export default function ProjetosLista() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { companyId } = useCompany();
  const [query, setQuery] = useState("");
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  async function fetchProjects() {
    setLoading(true);
    setError(null);
    try {
      let q = supabase
        .from("projects")
        .select(`
          *,
          owner_profile:profiles!fk_projects_owner_user_id(id, name, avatar_url),
          project_member_count:project_members(count)
        `);
      
      if (query.trim()) {
        q = q.ilike("name", `%${query.trim()}%`);
      }

      const { data, error } = await q.order("updated_at", { ascending: false });
      if (error) throw error;
      
      const rows = (data ?? []) as any[];
      
      // Fetch departments for projects that have one
      const departmentIds = rows.filter(r => r.department_id).map(r => r.department_id);
      let departmentsMap: Record<string, string> = {};
      if (departmentIds.length > 0) {
        const { data: departments } = await supabase
          .from("departments")
          .select("id, name")
          .in("id", departmentIds);
        departmentsMap = (departments ?? []).reduce((acc, d) => ({ ...acc, [d.id]: d.name }), {});
      }
      
      const mapped = rows.map((r) => ({
        ...r,
        member_count: r.project_member_count?.[0]?.count ?? 0,
        owner_name: r.owner_profile?.name ?? null,
        department_name: r.department_id ? (departmentsMap[r.department_id] ?? null) : null,
      }));
      
      setProjects(mapped);
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (companyId) {
      fetchProjects();
    }
  }, [companyId, query]);

  return (
    <div className="mx-auto max-w-6xl grid gap-8 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[color:var(--sinaxys-ink)]">{t("nav.projects.list")}</h1>
            <p className="mt-2 text-muted-foreground">Visualize e gerencie todos os projetos da sua equipe</p>
          </div>
          <Button className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white" onClick={() => setShowCreate(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Projeto
          </Button>
        </div>
      </div>

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/app/projetos/dashboard" className="hover:text-[color:var(--sinaxys-primary)]">
          {t("nav.projects.home")}
        </Link>
        <span>/</span>
        <span className="text-[color:var(--sinaxys-primary)]">{t("nav.projects.list")}</span>
      </nav>

      {/* Filters */}
      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar projetos..." className="pl-10 rounded-xl" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <Button variant="outline" className="rounded-xl" onClick={() => fetchProjects()}>
            <Filter className="mr-2 h-4 w-4" />
            Filtrar
          </Button>
        </div>
      </Card>

      {/* Controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="text-sm text-muted-foreground">{projects.length} projetos</div>
      </div>

      {/* List / Loading / Empty / Error */}
      {loading ? (
        <div className="py-8 text-center">Carregando...</div>
      ) : error ? (
        <div className="py-8 text-center text-red-600">Erro: {error}</div>
      ) : projects.length ? (
        <div className="grid gap-4">
          {projects.map((p: any) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      ) : (
        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-tint)]/30 p-12">
          <div className="flex flex-col items-center justify-center text-center gap-4">
            <div className="h-20 w-20 rounded-3xl bg-white flex items-center justify-center shadow-sm">
              <FolderKanban className="h-10 w-10 text-[color:var(--sinaxys-primary)]" />
            </div>
            <div className="max-w-md">
              <h3 className="text-xl font-bold text-[color:var(--sinaxys-ink)]">Nenhum projeto encontrado</h3>
              <p className="mt-2 text-muted-foreground">Não há projetos cadastrados ainda. Crie seu primeiro projeto para começar.</p>
            </div>
            <Button className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white" onClick={() => setShowCreate(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Criar primeiro projeto
            </Button>
          </div>
        </Card>
      )}

      {/* Create dialog */}
      {showCreate && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Novo projeto</h3>
              </div>
              <ProjectForm 
                onSaved={(p) => { setShowCreate(false); fetchProjects(); }} 
                onCancel={() => setShowCreate(false)} 
              />
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}