import { useEffect, useMemo, useState } from "react";
import { Lock } from "lucide-react";
import { Navigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useCompany } from "@/lib/company";
import { useCompanyModuleEnabled } from "@/hooks/useCompanyModuleEnabled";
import { useToast } from "@/hooks/use-toast";
import { FinanceVersionHeader } from "@/components/finance/FinanceVersionHeader";
import { FinanceVersionLinesTable } from "@/components/finance/FinanceVersionLinesTable";
import {
  createFinanceVersionLine,
  deleteFinanceVersionLine,
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
import { supabase } from "@/integrations/supabase/client";
import type { Role } from "@/lib/domain";
import { Badge } from "@/components/ui/badge";

function canEditRole(role: Role) {
  return role === "ADMIN" || role === "HEAD" || role === "MASTERADMIN";
}

function canSeeFinanceModule(role: Role) {
  return role === "ADMIN" || role === "HEAD" || role === "MASTERADMIN";
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
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [errorLineId, setErrorLineId] = useState<string | null>(null);
  const [pendingNewLineId, setPendingNewLineId] = useState<string | null>(null);

  const readOnly = version?.status === "locked" || !canEditRole(user?.role as Role);
  const visibleDepartments = useMemo(() => {
    if (user?.role === "HEAD") {
      return departments.filter((department) => department.id === user.departmentId);
    }
    return departments;
  }, [departments, user?.departmentId, user?.role]);

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
    void load();
  }, [companyId, user?.id, id]);

  useEffect(() => {
    if (searchParams.get("lock") === "1" && version && version.status !== "locked") {
      void handleLock();
    }
  }, [searchParams, version?.id]);

  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "COLABORADOR") return <Navigate to="/" replace />;
  if (isLoading || loading || !version) {
    return <div className="grid min-h-[60vh] place-items-center px-4"><div className="rounded-3xl border border-[color:var(--sinaxys-border)] bg-white px-6 py-4 text-sm text-muted-foreground">Carregando…</div></div>;
  }
  if (!enabled) return <Navigate to="/finance" replace />;

  async function handleLock() {
    if (!version) return;
    const locked = await lockFinanceVersion(version.id);
    setVersion(locked);
    toast({ title: "Versão bloqueada", description: "A versão agora está somente leitura." });
  }

  async function handleSaveLine(lineId: string) {
    if (!version || !drafts[lineId]) return;
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
      } else {
        const updated = await updateFinanceVersionLine(lineId, payload);
        setLines((current) => current.map((line) => (line.id === lineId ? updated : line)));
      }
      toast({ title: "Linha salva", description: "As alterações foram sincronizadas." });
    } catch {
      setLines(previousLines);
      setDrafts(previousDrafts);
      setErrorLineId(lineId);
      toast({ title: "Erro ao salvar", description: "Revise os campos destacados e tente novamente.", variant: "destructive" });
    } finally {
      setSavingLineId(null);
    }
  }

  async function handleDeleteLine(lineId: string) {
    const previousLines = lines;
    setLines((current) => current.filter((line) => line.id !== lineId));
    try {
      await deleteFinanceVersionLine(lineId);
      toast({ title: "Linha removida", description: "A linha foi excluída." });
    } catch {
      setLines(previousLines);
      toast({ title: "Erro ao remover", description: "Não foi possível excluir a linha.", variant: "destructive" });
    }
  }

  function handleAddLine() {
    const newId = `new-${crypto.randomUUID()}`;
    setLines((current) => [{ id: newId } as FinanceVersionLine, ...current]);
    setDrafts((current) => ({
      ...current,
      [newId]: {
        finance_account_id: accounts[0]?.id ?? "",
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
        <FinanceVersionHeader version={version} onSave={handleLock} saving={false} canEdit={!readOnly} />

        {version.status === "locked" && (
          <div className="rounded-3xl border border-slate-300 bg-slate-50 p-4 text-sm text-slate-700">
            <div className="flex items-center gap-2 font-semibold"><Lock className="h-4 w-4" />Versão bloqueada</div>
            <p className="mt-1">Esta versão está imutável. Edição e criação de linhas estão desativadas.</p>
          </div>
        )}

        <FinanceVersionLinesTable
          lines={visibleDepartments.length ? lines.filter((line) => !line.department_id || visibleDepartments.some((department) => department.id === line.department_id)) : lines}
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
