import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Copy, Plus, Sparkles } from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { useCompany } from "@/lib/company";
import {
  activateFinanceScenario,
  createFinanceScenario,
  duplicateFinanceScenario,
  listFinanceScenarioAssumptions,
  listFinanceScenarios,
  seedFinanceScenarios,
  updateFinanceScenario,
  upsertFinanceScenarioAssumption,
  deleteFinanceScenarioAssumption,
  type FinanceScenario,
  type FinanceScenarioAssumption,
} from "@/lib/financeDb";
import { useToast } from "@/hooks/use-toast";
import { useCompanyModuleEnabled } from "@/hooks/useCompanyModuleEnabled";

function ScenarioCard({
  scenario,
  assumptions,
  onEdit,
  onDuplicate,
  onActivate,
}: {
  scenario: FinanceScenario;
  assumptions: FinanceScenarioAssumption[];
  onEdit: () => void;
  onDuplicate: () => void;
  onActivate: () => void;
}) {
  return (
    <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white/5 p-5 backdrop-blur">
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-[color:var(--sinaxys-ink)]">{scenario.name}</h3>
              {scenario.status === "active" && <Badge className="rounded-full bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10">Ativo</Badge>}
              {scenario.status === "draft" && <Badge className="rounded-full bg-amber-500/10 text-amber-700 hover:bg-amber-500/10">Rascunho</Badge>}
              {scenario.status === "archived" && <Badge className="rounded-full bg-slate-500/10 text-slate-700 hover:bg-slate-500/10">Arquivado</Badge>}
            </div>
            <p className="mt-2 text-sm leading-relaxed text-[color:var(--sinaxys-ink)]/70">{scenario.description || "Sem descrição"}</p>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white/5 px-4 py-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Premissas</div>
            <div className="mt-1 text-sm font-semibold text-[color:var(--sinaxys-ink)]">{assumptions.length}</div>
          </div>
          <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white/5 px-4 py-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Base</div>
            <div className="mt-1 text-sm font-semibold text-[color:var(--sinaxys-ink)]">{scenario.base_scenario_id ? "Herdado" : "Principal"}</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="rounded-full" onClick={onEdit}>
            Editar
          </Button>
          <Button variant="outline" className="rounded-full" onClick={onDuplicate}>
            <Copy className="mr-2 h-4 w-4" />
            Duplicar
          </Button>
          {scenario.status !== "active" && (
            <Button className="rounded-full bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90" onClick={onActivate}>
              Ativar
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function FinanceScenarios() {
  const { user } = useAuth();
  const { companyId } = useCompany();
  const { enabled, isLoading } = useCompanyModuleEnabled("FINANCE");
  const { toast } = useToast();
  const navigate = useNavigate();

  const [scenarios, setScenarios] = useState<FinanceScenario[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [assumptions, setAssumptions] = useState<FinanceScenarioAssumption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newScenarioOpen, setNewScenarioOpen] = useState(false);
  const [editingScenario, setEditingScenario] = useState<FinanceScenario | null>(null);
  const [duplicateScenarioId, setDuplicateScenarioId] = useState<string | null>(null);
  const [scenarioName, setScenarioName] = useState("");
  const [scenarioDescription, setScenarioDescription] = useState("");
  const [assumptionKey, setAssumptionKey] = useState("growth_rate");
  const [assumptionLabel, setAssumptionLabel] = useState("Taxa de crescimento");
  const [assumptionValueNumber, setAssumptionValueNumber] = useState("");
  const [assumptionValueText, setAssumptionValueText] = useState("");
  const [assumptionUnit, setAssumptionUnit] = useState("%");

  const selectedScenario = useMemo(() => scenarios.find((item) => item.id === selectedScenarioId) ?? null, [scenarios, selectedScenarioId]);

  async function load() {
    if (!companyId) return;
    setLoading(true);
    const scenarioRows = await listFinanceScenarios(companyId);
    setScenarios(scenarioRows);
    setSelectedScenarioId((current) => current ?? scenarioRows[0]?.id ?? null);
    setLoading(false);
  }

  useEffect(() => {
    if (!companyId || !user?.id) return;
    void (async () => {
      await seedFinanceScenarios(companyId, user.id);
      await load();
    })();
  }, [companyId, user?.id]);

  useEffect(() => {
    if (!companyId || !selectedScenarioId) return;
    void (async () => {
      const rows = await listFinanceScenarioAssumptions(companyId, selectedScenarioId);
      setAssumptions(rows);
    })();
  }, [companyId, selectedScenarioId]);

  if (!user) return <Navigate to="/login" replace />;
  if (isLoading || loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center px-4">
        <div className="rounded-3xl border border-[color:var(--sinaxys-border)] bg-white px-6 py-4 text-sm text-muted-foreground">Carregando…</div>
      </div>
    );
  }

  if (!enabled) return <Navigate to="/finance" replace />;

  async function handleCreateScenario() {
    if (!companyId || !user) return;
    setSaving(true);
    const created = await createFinanceScenario(companyId, user.id, scenarioName, scenarioDescription || null, null);
    setNewScenarioOpen(false);
    setScenarioName("");
    setScenarioDescription("");
    setSelectedScenarioId(created.id);
    await load();
    toast({ title: "Cenário criado", description: "O novo cenário foi adicionado com sucesso." });
    setSaving(false);
  }

  async function handleSaveScenario() {
    if (!editingScenario) return;
    setSaving(true);
    await updateFinanceScenario(editingScenario.id, {
      name: scenarioName,
      description: scenarioDescription || null,
    });
    setEditingScenario(null);
    await load();
    toast({ title: "Cenário atualizado", description: "As informações do cenário foram salvas." });
    setSaving(false);
  }

  async function handleDuplicateScenario() {
    if (!companyId || !user || !duplicateScenarioId) return;
    setSaving(true);
    const duplicated = await duplicateFinanceScenario(companyId, user.id, duplicateScenarioId);
    setDuplicateScenarioId(null);
    await load();
    setSelectedScenarioId(duplicated.id);
    toast({ title: "Cenário duplicado", description: "Uma cópia foi criada com as premissas atuais." });
    setSaving(false);
  }

  async function handleActivateScenario(id: string) {
    setSaving(true);
    await activateFinanceScenario(id);
    await load();
    toast({ title: "Cenário ativado", description: "O cenário selecionado agora está ativo." });
    setSaving(false);
  }

  async function handleAddAssumption() {
    if (!companyId || !selectedScenarioId) return;
    setSaving(true);
    await upsertFinanceScenarioAssumption(companyId, selectedScenarioId, {
      key: assumptionKey,
      label: assumptionLabel,
      value_number: assumptionValueNumber ? Number(assumptionValueNumber) : null,
      value_text: assumptionValueText || null,
      value_json: null,
      unit: assumptionUnit || null,
      applies_to_account_id: null,
      applies_to_department_id: null,
      applies_to_project_id: null,
      applies_to_squad_id: null,
    });
    setAssumptionValueNumber("");
    setAssumptionValueText("");
    const rows = await listFinanceScenarioAssumptions(companyId, selectedScenarioId);
    setAssumptions(rows);
    toast({ title: "Premissa salva", description: "A premissa foi adicionada ao cenário." });
    setSaving(false);
  }

  async function handleDeleteAssumption(id: string) {
    setSaving(true);
    await deleteFinanceScenarioAssumption(id);
    if (companyId && selectedScenarioId) {
      const rows = await listFinanceScenarioAssumptions(companyId, selectedScenarioId);
      setAssumptions(rows);
    }
    toast({ title: "Premissa removida", description: "A premissa foi excluída do cenário." });
    setSaving(false);
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[color:var(--sinaxys-bg)] px-4 py-6 md:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="rounded-[28px] border border-[color:var(--sinaxys-border)] bg-white/5 p-6 backdrop-blur md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--sinaxys-border)] bg-white/5 px-3 py-1 text-xs font-semibold text-[color:var(--sinaxys-ink)]/80">
                <Sparkles className="h-3.5 w-3.5 text-[color:var(--sinaxys-primary)]" />
                Cenários financeiros
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">Simule realidades sem mexer no plano original.</h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[color:var(--sinaxys-ink)]/70 md:text-base">
                Base, Conservador e Agressivo com premissas próprias, herança opcional e ativação simples.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Dialog open={newScenarioOpen} onOpenChange={setNewScenarioOpen}>
                <DialogTrigger asChild>
                  <Button className="rounded-full bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90">
                    <Plus className="mr-2 h-4 w-4" />
                    Novo cenário
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-3xl">
                  <DialogHeader>
                    <DialogTitle>Novo cenário</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-3">
                    <Input value={scenarioName} onChange={(e) => setScenarioName(e.target.value)} placeholder="Nome do cenário" />
                    <Textarea value={scenarioDescription} onChange={(e) => setScenarioDescription(e.target.value)} placeholder="Descrição" />
                    <Button onClick={handleCreateScenario} disabled={saving || !scenarioName.trim()} className="rounded-full">
                      Criar cenário
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={!!editingScenario} onOpenChange={(open) => !open && setEditingScenario(null)}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="rounded-full" onClick={() => selectedScenario && setEditingScenario(selectedScenario)}>
                    Editar cenário
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-3xl">
                  <DialogHeader>
                    <DialogTitle>Editar cenário</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-3">
                    <Input value={scenarioName} onChange={(e) => setScenarioName(e.target.value)} placeholder="Nome do cenário" />
                    <Textarea value={scenarioDescription} onChange={(e) => setScenarioDescription(e.target.value)} placeholder="Descrição" />
                    <Button onClick={handleSaveScenario} disabled={saving || !scenarioName.trim()} className="rounded-full">
                      Salvar alterações
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={!!duplicateScenarioId} onOpenChange={(open) => !open && setDuplicateScenarioId(null)}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="rounded-full" onClick={() => selectedScenario && setDuplicateScenarioId(selectedScenario.id)}>
                    <Copy className="mr-2 h-4 w-4" />
                    Duplicar
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-3xl">
                  <DialogHeader>
                    <DialogTitle>Duplicar cenário</DialogTitle>
                  </DialogHeader>
                  <p className="text-sm text-muted-foreground">Uma cópia será criada com as premissas atuais.</p>
                  <Button onClick={handleDuplicateScenario} disabled={saving} className="rounded-full">
                    Confirmar duplicação
                  </Button>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {scenarios.map((scenario) => (
            <ScenarioCard
              key={scenario.id}
              scenario={scenario}
              assumptions={scenario.id === selectedScenarioId ? assumptions : []}
              onEdit={() => {
                setEditingScenario(scenario);
                setScenarioName(scenario.name);
                setScenarioDescription(scenario.description ?? "");
              }}
              onDuplicate={() => setDuplicateScenarioId(scenario.id)}
              onActivate={() => handleActivateScenario(scenario.id)}
            />
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white/5 p-5">
            <h2 className="text-lg font-semibold text-[color:var(--sinaxys-ink)]">Premissas do cenário</h2>
            <p className="mt-2 text-sm text-[color:var(--sinaxys-ink)]/70">
              As premissas podem ser globais ou vinculadas a conta, departamento, projeto ou squad.
            </p>

            <div className="mt-4 grid gap-3">
              <Input value={assumptionKey} onChange={(e) => setAssumptionKey(e.target.value)} placeholder="Chave" />
              <Input value={assumptionLabel} onChange={(e) => setAssumptionLabel(e.target.value)} placeholder="Rótulo" />
              <Input value={assumptionValueNumber} onChange={(e) => setAssumptionValueNumber(e.target.value)} placeholder="Valor numérico" />
              <Input value={assumptionValueText} onChange={(e) => setAssumptionValueText(e.target.value)} placeholder="Valor textual" />
              <Input value={assumptionUnit} onChange={(e) => setAssumptionUnit(e.target.value)} placeholder="Unidade" />
              <Button onClick={handleAddAssumption} disabled={saving || !selectedScenarioId} className="rounded-full bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90">
                Salvar premissa
              </Button>
            </div>
          </Card>

          <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white/5 p-5">
            <h2 className="text-lg font-semibold text-[color:var(--sinaxys-ink)]">Premissas atuais</h2>
            <div className="mt-4 grid gap-3">
              {assumptions.map((item) => (
                <div key={item.id} className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white/5 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">{item.label}</div>
                      <div className="text-xs text-muted-foreground">{item.key}</div>
                      <div className="mt-2 text-sm text-[color:var(--sinaxys-ink)]/75">
                        {item.value_number ?? item.value_text ?? "Sem valor"}
                        {item.unit ? ` ${item.unit}` : ""}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteAssumption(item.id)}>
                      Remover
                    </Button>
                  </div>
                </div>
              ))}
              {!assumptions.length && (
                <div className="rounded-2xl border border-dashed border-[color:var(--sinaxys-border)] bg-white/5 p-6 text-sm text-muted-foreground">
                  Nenhuma premissa cadastrada para este cenário.
                </div>
              )}
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}