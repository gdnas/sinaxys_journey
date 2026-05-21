import { useEffect, useMemo, useState } from "react";
import { Landmark, Lock, Plus, Receipt } from "lucide-react";
import { Navigate, useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { useCompany } from "@/lib/company";

import { useCompanyModuleEnabled } from "@/hooks/useCompanyModuleEnabled";
import { useToast } from "@/hooks/use-toast";
import { FinanceVersionHeader } from "@/components/finance/FinanceVersionHeader";
import { FinanceVersionLinesTable } from "@/components/finance/FinanceVersionLinesTable";
import {
  createFinanceVersionLine,
  deleteFinanceVersionLine,
  FINANCE_ACCOUNT_CODES,
  getFinanceVersion,
  listFinanceAccounts,
  listFinanceDepartments,
  listFinanceFiscalPeriods,
  listFinanceProjects,
  listFinanceSquads,
  listFinanceVersionLines,
  lockFinanceVersion,
  updateFinanceVersionLine,
  type FinanceVersion,
  type FinanceVersionLine,
} from "@/lib/financeDb";
import type { Role } from "@/lib/domain";

function canEditRole(role: Role) {
  return role === "ADMIN" || role === "HEAD" || role === "MASTERADMIN";
}

function brl(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}

export default function FinanceVersionDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { companyId } = useCompany();
  const { enabled, isLoading } = useCompanyModuleEnabled("FINANCE");
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [version, setVersion] = useState<FinanceVersion | null>(null);
  const [lines, setLines] = useState<FinanceVersionLine[]>([]);
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string; code?: string | null }>>([]);
  const [periods, setPeriods] = useState<Array<{ id: string; label: string }>>([]);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [squads, setSquads] = useState<Array<{ id: string; name: string }>>([]);
  const [drafts, setDrafts] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [savingLineId, setSavingLineId] = useState<string | null>(null);
  const [lockingVersion, setLockingVersion] = useState(false);
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [errorLineId, setErrorLineId] = useState<string | null>(null);
  const [pendingNewLineId, setPendingNewLineId] = useState<string | null>(null);

  const readOnly = version?.status === "locked" || !canEditRole(user?.role as Role);
  const visibleDepartments = useMemo(() => {
    if (user?.role === "HEAD") {
      console.info("[FINANCE_QA] head_scope_applied", { role: user.role, companyId, departmentId: user.departmentId, action: "apply_head_scope" });
      return departments.filter((department) => department.id === user.departmentId);
    }
    return departments;
  }, [departments, user?.departmentId, user?.role, companyId]);
  const visibleLines = useMemo(
    () => (visibleDepartments.length ? lines.filter((line) => !line.department_id || visibleDepartments.some((department) => department.id === line.department_id)) : lines),
    [lines, visibleDepartments],
  );
  const structuralSummary = useMemo(() => {
    const accountById = new Map(accounts.map((account) => [account.id, account] as const));
    return visibleLines.reduce(
      (acc, line) => {
        const account = accountById.get(line.finance_account_id);
        const code = account?.code ?? "";
        acc.total += line.amount;
        if (code === FINANCE_ACCOUNT_CODES.taxes) acc.taxes += line.amount;
        else if (code === FINANCE_ACCOUNT_CODES.loans) acc.loans += line.amount;
        else acc.other += line.amount;
        return acc;
      },
      { total: 0, taxes: 0, loans: 0, other: 0 },
    );
  }, [accounts, visibleLines]);

  async function load() {
    if (!id || !companyId) return;
    setLoading(true);
    const [versionRow, lineRows, accountRows, periodRows, departmentRows, projectRows, squadRows] = await Promise.all([
      getFinanceVersion(id),
      listFinanceVersionLines(id),
      listFinanceAccounts(companyId),
      listFinanceFiscalPeriods(companyId),
      listFinanceDepartments(companyId),
      listFinanceProjects(companyId),
      listFinanceSquads(companyId),
    ]);
    setVersion(versionRow);
    setLines(lineRows);
    setAccounts(accountRows);
    setPeriods(periodRows.map((item) => ({ id: item.id, label: item.label })));
    setDepartments(departmentRows);
    setProjects(projectRows);
    setSquads(squadRows);
    setDrafts(
      Object.fromEntries(
        lineRows.map((line) => [line.id, {
          finance_account_id: line.finance_account_id,
          fiscal_period_id: line.fiscal_period_id,
          department_id: line.department_id,
          project_id: line.project_id,
          squad_id: line.squad_id,
          amount: String(line.amount),
        }]),
      ),
    );
    setLoading(false);
  }

  useEffect(() => {
    if (!companyId || !user?.id) return;
    console.info("[FINANCE_QA] version_detail_opened", { role: user.role, companyId, versionId: id, action: "open_version_detail" });
    void load();
  }, [companyId, user?.id, id]);

  useEffect(() => {
    if (searchParams.get("lock") === "1" && version && version.status !== "locked") {
      void handleLock();
    }
  }, [searchParams, version?.id]);

  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "COLABORADOR") {
    console.warn("[FINANCE_QA] access_denied_colaborador", { role: user.role, companyId, versionId: id, action: "deny_finance_access" });
    return <Navigate to="/" replace />;
  }
  if (isLoading || loading || !version) {
    return <div className="grid min-h-[60vh] place-items-center px-4"><div className="rounded-3xl border border-[color:var(--sinaxys-border)] bg-white px-6 py-4 text-sm text-muted-foreground">Carregando…</div></div>;
  }
  if (!enabled) return <Navigate to="/finance" replace />;

  async function handleLock() {
    if (!version || lockingVersion) return;
    console.info("[FINANCE_QA] version_lock_started", { role: user?.role, companyId, versionId: version.id, action: "lock_version" });
    setLockingVersion(true);
    try {
      const locked = await lockFinanceVersion(version.id);
      setVersion(locked);
      console.info("[FINANCE_QA] version_locked", { role: user?.role, companyId, versionId: version.id, action: "lock_version" });
      toast({ title: "Versão bloqueada", description: "A versão agora está somente leitura." });
    } catch (error) {
      console.warn("[FINANCE_QA] version_lock_failed", { role: user?.role, companyId, versionId: version.id, action: "lock_version", error: error instanceof Error ? error.message : String(error) });
      throw error;
    } finally {
      setLockingVersion(false);
    }
  }

  async function handleSaveLine(lineId: string) {
    if (!version || !drafts[lineId]) return;
    console.info("[FINANCE_QA] line_save_started", { role: user?.role, companyId, versionId: version.id, lineId, departmentId: drafts[lineId]?.department_id, action: "save_line" });
    setSavingLineId(lineId);
    setErrorLineId(null);
    const draft = drafts[lineId];
    const payload = {
      finance_account_id: draft.finance_account_id,
      fiscal_period_id: draft.fiscal_period_id,
      department_id: draft.department_id,
      project_id: draft.project_id,
      squad_id: draft.squad_id,
      amount: Number(draft.amount || 0),
    };
    const previousLines = lines;
    const previousDrafts = drafts;
    try {
      if (lineId.startsWith("new-")) {
        const tempLine = { id: lineId, company_id: version.company_id, finance_version_id: version.id, ...payload } as FinanceVersionLine;
        setLines((current) => [tempLine, ...current]);
        const created = await createFinanceVersionLine(version.company_id, user.id, { finance_version_id: version.id, ...payload });
        setLines((current) => current.map((line) => (line.id === lineId ? created : line)));
        setDrafts((current) => {
          const next = { ...current };
          delete next[lineId];
          next[created.id] = {
            finance_account_id: created.finance_account_id,
            fiscal_period_id: created.fiscal_period_id,
            department_id: created.department_id,
            project_id: created.project_id,
            squad_id: created.squad_id,
            amount: String(created.amount),
          };
          return next;
        });
        setPendingNewLineId(created.id);
        setEditingLineId(created.id);
        console.info("[FINANCE_QA] line_created", { role: user?.role, companyId, versionId: version.id, lineId: created.id, departmentId: created.department_id, action: "create_line" });
      } else {
        const updated = await updateFinanceVersionLine(lineId, payload);
        setLines((current) => current.map((line) => (line.id === lineId ? updated : line)));
        console.info("[FINANCE_QA] line_saved", { role: user?.role, companyId, versionId: version.id, lineId, departmentId: payload.department_id, action: "save_line" });
      }
      toast({ title: "Linha salva", description: "As alterações foram sincronizadas." });
    } catch (error) {
      setLines(previousLines);
      setDrafts(previousDrafts);
      setErrorLineId(lineId);
      console.warn("[FINANCE_QA] line_save_failed", { role: user?.role, companyId, versionId: version.id, lineId, departmentId: payload.department_id, action: "save_line", error: error instanceof Error ? error.message : String(error) });
      toast({ title: "Erro ao salvar", description: "Revise os campos destacados e tente novamente.", variant: "destructive" });
    } finally {
      setSavingLineId(null);
    }
  }

  async function handleDeleteLine(lineId: string) {
    console.info("[FINANCE_QA] line_delete_started", { role: user?.role, companyId, versionId: version?.id, lineId, action: "delete_line" });
    const previousLines = lines;
    setLines((current) => current.filter((line) => line.id !== lineId));
    try {
      await deleteFinanceVersionLine(lineId);
      console.info("[FINANCE_QA] line_deleted", { role: user?.role, companyId, versionId: version?.id, lineId, action: "delete_line" });
      toast({ title: "Linha removida", description: "A linha foi excluída." });
    } catch (error) {
      setLines(previousLines);
      console.warn("[FINANCE_QA] line_delete_failed", { role: user?.role, companyId, versionId: version?.id, lineId, action: "delete_line", error: error instanceof Error ? error.message : String(error) });
      toast({ title: "Erro ao remover", description: "Não foi possível excluir a linha.", variant: "destructive" });
    }
  }

  function startNewLine(accountCode?: string) {
    const accountId = accountCode ? accounts.find((account) => account.code === accountCode)?.id ?? accounts[0]?.id ?? "" : accounts[0]?.id ?? "";
    const newId = `new-${crypto.randomUUID()}`;
    setLines((current) => [{ id: newId } as FinanceVersionLine, ...current]);
    setDrafts((current) => ({
      ...current,
      [newId]: {
        finance_account_id: accountId,
        fiscal_period_id: periods[0]?.id ?? "",
        department_id: user?.role === "HEAD" ? user.departmentId ?? null : null,
        project_id: null,
        squad_id: null,
        amount: "0",
      },
    }));
    setEditingLineId(newId);
    setPendingNewLineId(newId);
  }

  function handleAddLine() {
    console.info("[FINANCE_QA] line_create_started", { role: user?.role, companyId, versionId: version?.id, departmentId: user?.departmentId, action: "create_line" });
    startNewLine();
  }

  function handleAddStructuralLine(accountCode: typeof FINANCE_ACCOUNT_CODES.taxes | typeof FINANCE_ACCOUNT_CODES.loans) {
    console.info("[FINANCE_QA] structural_line_create_started", { role: user?.role, companyId, versionId: version?.id, accountCode, action: "create_structural_line" });
    startNewLine(accountCode);
  }

  function handleCancelLine(lineId: string) {
    if (lineId.startsWith("new-")) {
      setLines((current) => current.filter((line) => line.id !== lineId));
      setDrafts((current) => {
        const next = { ...current };
        delete next[lineId];
        return next;
      });
      setEditingLineId(null);
      setPendingNewLineId(null);
      return;
    }
    const line = lines.find((item) => item.id === lineId);
    if (!line) return;
    setDrafts((current) => ({
      ...current,
      [lineId]: {
        finance_account_id: line.finance_account_id,
        fiscal_period_id: line.fiscal_period_id,
        department_id: line.department_id,
        project_id: line.project_id,
        squad_id: line.squad_id,
        amount: String(line.amount),
      },
    }));
    setEditingLineId(null);
  }

  function handleMoveLine(lineId: string, direction: "next" | "previous") {
    const index = lines.findIndex((line) => line.id === lineId);
    if (index === -1) return;
    const nextIndex = direction === "next" ? index + 1 : index - 1;
    const nextLine = lines[nextIndex];
    if (!nextLine) return;
    setEditingLineId(nextLine.id);
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[color:var(--sinaxys-bg)] px-4 py-6 md:px-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <FinanceVersionHeader version={version} onLock={handleLock} saving={lockingVersion} canEdit={!readOnly} />

        <section className="grid gap-4 md:grid-cols-4">
          <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white/5 p-5 backdrop-blur">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total da versão</div>
            <div className="mt-2 text-2xl font-semibold text-[color:var(--sinaxys-ink)]">{brl(structuralSummary.total)}</div>
            <div className="mt-1 text-xs text-[color:var(--sinaxys-ink)]/65">Soma das linhas visíveis no plano.</div>
          </Card>
          <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white/5 p-5 backdrop-blur">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Receipt className="h-4 w-4" />Impostos
            </div>
            <div className="mt-2 text-2xl font-semibold text-[color:var(--sinaxys-ink)]">{brl(structuralSummary.taxes)}</div>
            <div className="mt-1 text-xs text-[color:var(--sinaxys-ink)]/65">Conta 2003 consolidada nesta versão.</div>
            {!readOnly && (
              <Button variant="outline" className="mt-4 rounded-full" onClick={() => handleAddStructuralLine(FINANCE_ACCOUNT_CODES.taxes)}>
                <Plus className="mr-2 h-4 w-4" />Nova linha de imposto
              </Button>
            )}
          </Card>
          <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white/5 p-5 backdrop-blur">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Landmark className="h-4 w-4" />Empréstimos
            </div>
            <div className="mt-2 text-2xl font-semibold text-[color:var(--sinaxys-ink)]">{brl(structuralSummary.loans)}</div>
            <div className="mt-1 text-xs text-[color:var(--sinaxys-ink)]/65">Conta 2004 para parcelas, juros e serviço da dívida.</div>
            {!readOnly && (
              <Button variant="outline" className="mt-4 rounded-full" onClick={() => handleAddStructuralLine(FINANCE_ACCOUNT_CODES.loans)}>
                <Plus className="mr-2 h-4 w-4" />Nova linha de empréstimo
              </Button>
            )}
          </Card>
          <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white/5 p-5 backdrop-blur">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Demais contas</div>
            <div className="mt-2 text-2xl font-semibold text-[color:var(--sinaxys-ink)]">{brl(structuralSummary.other)}</div>
            <div className="mt-1 text-xs text-[color:var(--sinaxys-ink)]/65">Receita, folha, marketing, investimentos e outras linhas.</div>
          </Card>
        </section>

        {version.status === "locked" && (
          <div className="rounded-3xl border border-slate-300 bg-slate-50 p-4 text-sm text-slate-700">
            <div className="flex items-center gap-2 font-semibold"><Lock className="h-4 w-4" />Versão bloqueada</div>
            <p className="mt-1">Esta versão está imutável. Edição e criação de linhas estão desativadas.</p>
          </div>
        )}

        <FinanceVersionLinesTable
          lines={visibleLines}
          drafts={drafts}
          onDraftChange={(lineId, next) => setDrafts((current) => ({ ...current, [lineId]: next }))}
          onSaveLine={handleSaveLine}
          onDeleteLine={handleDeleteLine}
          onAddLine={handleAddLine}
          onCancelLine={handleCancelLine}
          readOnly={readOnly}
          savingLineId={savingLineId}
          editingLineId={editingLineId ?? pendingNewLineId}
          errorLineId={errorLineId}
          onEditLine={setEditingLineId}
          onMoveLine={handleMoveLine}
          accounts={accounts}
          periods={periods}
          departments={visibleDepartments}
          projects={projects}
          squads={squads}
        />
      </div>
    </div>
  );
}