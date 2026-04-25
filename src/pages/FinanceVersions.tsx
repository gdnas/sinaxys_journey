import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Lock, Plus, Trash2 } from "lucide-react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { useCompany } from "@/lib/company";
import { useCompanyModuleEnabled } from "@/hooks/useCompanyModuleEnabled";
import { useToast } from "@/hooks/use-toast";
import {
  createFinanceVersion,
  deleteFinanceVersion,
  listFinanceScenarios,
  listFinanceVersions,
  seedFinanceFiscalPeriods,
  seedFinanceScenarios,
  type FinanceScenario,
  type FinanceVersion,
} from "@/lib/financeDb";

export default function FinanceVersions() {
  const { user } = useAuth();
  const { companyId } = useCompany();
  const { enabled, isLoading } = useCompanyModuleEnabled("FINANCE");
  const { toast } = useToast();
  const navigate = useNavigate();
  const [versions, setVersions] = useState<FinanceVersion[]>([]);
  const [scenarios, setScenarios] = useState<FinanceScenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const activeScenarioId = useMemo(() => scenarios.find((item) => item.status === "active")?.id ?? scenarios[0]?.id ?? null, [scenarios]);

  async function load() {
    if (!companyId) return;
    setLoading(true);
    const [versionRows, scenarioRows] = await Promise.all([listFinanceVersions(companyId), listFinanceScenarios(companyId)]);
    setVersions(versionRows);
    setScenarios(scenarioRows);
    setLoading(false);
  }

  useEffect(() => {
    if (!companyId || !user?.id) return;
    console.info("[FINANCE_QA] versions_page_opened", { role: user.role, companyId, action: "open_versions_page" });
    void (async () => {
      await seedFinanceFiscalPeriods(companyId);
      await seedFinanceScenarios(companyId, user.id);
      await load();
    })();
  }, [companyId, user?.id]);

  if (!user) return <Navigate to="/login" replace />;
  if (isLoading || loading) {
    return <div className="grid min-h-[60vh] place-items-center px-4"><div className="rounded-3xl border border-[color:var(--sinaxys-border)] bg-white px-6 py-4 text-sm text-muted-foreground">Carregando…</div></div>;
  }
  if (!enabled) return <Navigate to="/finance" replace />;

  async function handleCreateVersion() {
    if (!companyId || !user || !activeScenarioId) return;
    console.info("[FINANCE_QA] version_create_started", { role: user.role, companyId, action: "create_version" });
    setCreating(true);
    try {
      const created = await createFinanceVersion(companyId, user.id, {
        scenario_id: activeScenarioId,
        name: `Versão ${new Date().getFullYear()}`,
        period_type: "month",
        fiscal_year: new Date().getFullYear(),
        fiscal_quarter: null,
        fiscal_month: new Date().getMonth() + 1,
      });
      console.info("[FINANCE_QA] version_created", { role: user.role, companyId, versionId: created.id, action: "create_version" });
      await load();
      navigate(`/finance/versions/${created.id}`);
    } catch (error) {
      console.warn("[FINANCE_QA] version_create_failed", { role: user.role, companyId, action: "create_version", error: error instanceof Error ? error.message : String(error) });
      throw error;
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteVersion(id: string) {
    await deleteFinanceVersion(id);
    await load();
    toast({ title: "Versão excluída", description: "A versão foi removida com sucesso." });
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[color:var(--sinaxys-bg)] px-4 py-6 md:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="rounded-[28px] border border-[color:var(--sinaxys-border)] bg-white/5 p-6 backdrop-blur md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--sinaxys-border)] bg-white/5 px-3 py-1 text-xs font-semibold text-[color:var(--sinaxys-ink)]/80">Planejamento financeiro</div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">Versões financeiras</h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[color:var(--sinaxys-ink)]/70 md:text-base">Acesso rápido às versões, com status, cenário e contagem de linhas.</p>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline" className="rounded-full border-[color:var(--sinaxys-border)] bg-white/0 text-[color:var(--sinaxys-ink)] hover:bg-white/5">
                <Link to="/finance"><ArrowLeft className="mr-2 h-4 w-4" />Voltar</Link>
              </Button>
              <Button onClick={handleCreateVersion} disabled={creating || !activeScenarioId} className="rounded-full bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90">
                <Plus className="mr-2 h-4 w-4" />Nova versão
              </Button>
            </div>
          </div>
        </section>

        <section className="grid gap-4">
          {versions.map((version) => (
            <Card key={version.id} className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white/5 p-5 backdrop-blur">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-[color:var(--sinaxys-ink)]">{version.name}</h2>
                    <Badge className={version.status === "locked" ? "rounded-full bg-slate-500/10 text-slate-700 hover:bg-slate-500/10" : "rounded-full bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10"}>{version.status}</Badge>
                  </div>
                  <div className="mt-2 text-sm text-[color:var(--sinaxys-ink)]/70">
                    {version.scenario?.name ?? "Sem cenário"} · {version.period_type} {version.fiscal_year}
                    {version.fiscal_quarter ? ` · Q${version.fiscal_quarter}` : ""}
                    {version.fiscal_month ? ` · M${version.fiscal_month}` : ""}
                    {typeof version.line_count === "number" ? ` · ${version.line_count} linhas` : ""}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline" className="rounded-full border-[color:var(--sinaxys-border)] bg-white/0 text-[color:var(--sinaxys-ink)] hover:bg-white/5">
                    <Link to={`/finance/versions/${version.id}`}>Abrir</Link>
                  </Button>
                  {version.status !== "locked" && (
                    <Button asChild variant="outline" className="rounded-full border-[color:var(--sinaxys-border)] bg-white/0 text-[color:var(--sinaxys-ink)] hover:bg-white/5">
                      <Link to={`/finance/versions/${version.id}?lock=1`}><Lock className="mr-2 h-4 w-4" />Bloquear</Link>
                    </Button>
                  )}
                  {version.status !== "locked" && (
                    <Button variant="ghost" className="rounded-full text-red-600 hover:bg-red-500/10 hover:text-red-700" onClick={() => handleDeleteVersion(version.id)}>
                      <Trash2 className="mr-2 h-4 w-4" />Excluir
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}

          {!versions.length && (
            <Card className="rounded-3xl border-dashed border-[color:var(--sinaxys-border)] bg-white/5 p-8 text-center text-sm text-[color:var(--sinaxys-ink)]/70">
              Nenhuma versão criada ainda.
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}
