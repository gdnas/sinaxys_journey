import { useEffect, useMemo, useRef } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableCell, TableRow } from "@/components/ui/table";
import type { FinanceVersionLine } from "@/lib/financeDb";

export type FinanceLineDraft = {
  finance_account_id: string;
  fiscal_period_id: string;
  department_id: string | null;
  project_id: string | null;
  squad_id: string | null;
  amount: string;
};

export function FinanceVersionLineRow({
  line,
  draft,
  onDraftChange,
  onSave,
  onDelete,
  onFocusNext,
  readOnly,
  saving,
  accounts,
  periods,
  departments,
  projects,
  squads,
}: {
  line: FinanceVersionLine;
  draft: FinanceLineDraft;
  onDraftChange: (next: FinanceLineDraft) => void;
  onSave: () => void;
  onDelete: () => void;
  onFocusNext: () => void;
  readOnly: boolean;
  saving: boolean;
  accounts: Array<{ id: string; name: string; code?: string | null }>;
  periods: Array<{ id: string; label: string }>;
  departments: Array<{ id: string; name: string }>;
  projects: Array<{ id: string; name: string }>;
  squads: Array<{ id: string; name: string }>;
}) {
  const amountRef = useRef<HTMLInputElement | null>(null);
  const accountRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!line.id) amountRef.current?.focus();
  }, [line.id]);

  const accountLabel = useMemo(() => accounts.find((item) => item.id === draft.finance_account_id)?.name ?? "Selecionar", [accounts, draft.finance_account_id]);

  return (
    <TableRow className={line.id ? "" : "bg-[color:var(--sinaxys-tint)]/40"}>
      <TableCell className="min-w-[220px]">
        <Select value={draft.finance_account_id} onValueChange={(value) => onDraftChange({ ...draft, finance_account_id: value })} disabled={readOnly || saving}>
          <SelectTrigger ref={accountRef} className="h-9 rounded-full border-[color:var(--sinaxys-border)] bg-white/0 text-xs">
            <SelectValue placeholder={accountLabel} />
          </SelectTrigger>
          <SelectContent>
            {accounts.map((account) => (
              <SelectItem key={account.id} value={account.id}>{account.code ? `${account.code} · ` : ""}{account.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="min-w-[180px]">
        <Select value={draft.fiscal_period_id} onValueChange={(value) => onDraftChange({ ...draft, fiscal_period_id: value })} disabled={readOnly || saving}>
          <SelectTrigger className="h-9 rounded-full border-[color:var(--sinaxys-border)] bg-white/0 text-xs">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            {periods.map((period) => (
              <SelectItem key={period.id} value={period.id}>{period.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="min-w-[140px]">
        <Input
          ref={amountRef}
          value={draft.amount}
          onChange={(e) => onDraftChange({ ...draft, amount: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onSave();
            }
            if (e.key === "Tab") {
              onFocusNext();
            }
          }}
          disabled={readOnly || saving}
          className="h-9 rounded-full border-[color:var(--sinaxys-border)] bg-white/0 text-right"
          inputMode="decimal"
        />
      </TableCell>
      <TableCell className="min-w-[180px]">
        <Select value={draft.department_id ?? "__none__"} onValueChange={(value) => onDraftChange({ ...draft, department_id: value === "__none__" ? null : value })} disabled={readOnly || saving}>
          <SelectTrigger className="h-9 rounded-full border-[color:var(--sinaxys-border)] bg-white/0 text-xs">
            <SelectValue placeholder="Departamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Sem departamento</SelectItem>
            {departments.map((department) => (
              <SelectItem key={department.id} value={department.id}>{department.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="min-w-[180px]">
        <Select value={draft.project_id ?? "__none__"} onValueChange={(value) => onDraftChange({ ...draft, project_id: value === "__none__" ? null : value })} disabled={readOnly || saving}>
          <SelectTrigger className="h-9 rounded-full border-[color:var(--sinaxys-border)] bg-white/0 text-xs">
            <SelectValue placeholder="Projeto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Opcional</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="min-w-[180px]">
        <Select value={draft.squad_id ?? "__none__"} onValueChange={(value) => onDraftChange({ ...draft, squad_id: value === "__none__" ? null : value })} disabled={readOnly || saving}>
          <SelectTrigger className="h-9 rounded-full border-[color:var(--sinaxys-border)] bg-white/0 text-xs">
            <SelectValue placeholder="Squad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Opcional</SelectItem>
            {squads.map((squad) => (
              <SelectItem key={squad.id} value={squad.id}>{squad.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="w-[120px] text-right">
        {saving ? <Loader2 className="ml-auto h-4 w-4 animate-spin text-[color:var(--sinaxys-primary)]" /> : null}
      </TableCell>
      <TableCell className="w-[80px] text-right">
        {!readOnly && (
          <Button variant="ghost" size="icon" className="rounded-full text-red-600 hover:bg-red-500/10 hover:text-red-700" onClick={onDelete} disabled={saving}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}
