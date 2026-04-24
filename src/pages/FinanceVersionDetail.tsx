import { useEffect, useMemo, useState } from "react";
import { Lock } from "lucide-react";
import { Navigate, useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
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

  const readOnly = version?.status === "locked" || !canEditRole(user?.role as Role);

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
    const draft = drafts[lineId];
    const payload = {
      finance_account_id: draft.finance_account_id,
      fiscal_period_id: draft.fiscal_period_id,
      department_id: draft.department_id,
      project_id: draft.project_id,
      squad_id: draft.squad_id,
      amount: Number(draft.amount || 0),
    };
    const updated = lineId.startsWith("new-")
      ? await createFinanceVersionLine(version.company_id, user.id, { finance_version_id: version.id, ...payload })
      : await updateFinanceVersionLine(lineId, payload);
    await load();
    setSavingLineId(null);
    toast({ title: "Linha salva", description: "As alterações foram sincronizadas." });
    return updated;
  }

  async function handleDeleteLine(lineId: string) {
    await deleteFinanceVersionLine(lineId);
    await load();
    toast({ title: "Linha removida", description: "A linha foi excluída." });
  }

  function handleAddLine() {
    const newId = `new-${crypto.randomUUID()}`;
    setLines((current) => [{ id: newId } as FinanceVersionLine, ...current]);
    setDrafts((current) => ({
      ...current,
      [newId]: {
        finance_account_id: accounts[0]?.id ?? "",
        fiscal_period_id: periods[0]?.id ?? "",
        department_id: null,
        project_id: null,
        squad_id: null,
        amount: "0",
      },
    }));
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
          lines={lines}
          drafts={drafts}
          onDraftChange={(lineId, next) => setDrafts((current) => ({ ...current, [lineId]: next }))}
          onSaveLine={handleSaveLine}
          onDeleteLine={handleDeleteLine}
          onAddLine={handleAddLine}
          readOnly={readOnly}
          savingLineId={savingLineId}
          accounts={accounts}
          periods={periods}
          departments={departments}
          projects={projects}
          squads={squads}
        />
      </div>
    </div>
  );
}
