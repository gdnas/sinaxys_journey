import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
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
  onFocusPrevious,
  onCancel,
  readOnly,
  saving,
  hasError,
  isEditing,
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
  onFocusPrevious: () => void;
  onCancel: () => void;
  readOnly: boolean;
  saving: boolean;
  hasError: boolean;
  isEditing: boolean;
  accounts: Array<{ id: string; name: string; code?: string | null }>;
  periods: Array<{ id: string; label: string }>;
  departments: Array<{ id: string; name: string }>;
  projects: Array<{ id: string; name: string }>;
  squads: Array<{ id: string; name: string }>;
}) {
  const amountRef = useRef<HTMLInputElement | null>(null);
  const accountTriggerRef = useRef<HTMLButtonElement | null>(null);
  const periodTriggerRef = useRef<HTMLButtonElement | null>(null);
  const departmentTriggerRef = useRef<HTMLButtonElement | null>(null);
  const projectTriggerRef = useRef<HTMLButtonElement | null>(null);
  const squadTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [cellError, setCellError] = useState<string | null>(null);

  useEffect(() => {
    if (isEditing) {
      amountRef.current?.focus();
    }
  }, [isEditing]);

  useEffect(() => {
    if (!hasError) setCellError(null);
  }, [hasError]);

  const accountLabel = useMemo(() => accounts.find((item) => item.id === draft.finance_account_id)?.name ?? "Selecionar", [accounts, draft.finance_account_id]);

  return (
    <TableRow className={cn("transition-colors", isEditing && "bg-[color:var(--sinaxys-tint)]/40", hasError && "bg-red-50") }>
      <TableCell className="min-w-[220px]">
        <Select value={draft.finance_account_id} onValueChange={(value) => onDraftChange({ ...draft, finance_account_id: value })} disabled={readOnly || saving}>
          <SelectTrigger ref={accountTriggerRef} className="h-9 rounded-full border-[color:var(--sinaxys-border)] bg-white/0 text-xs">
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
          <SelectTrigger ref={periodTriggerRef} className="h-9 rounded-full border-[color:var(--sinaxys-border)] bg-white/0 text-xs">
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
            if (e.key === "Escape") {
              e.preventDefault();
              onCancel();
            }
            if (e.key === "Tab" && e.shiftKey) {
              e.preventDefault();
              onFocusPrevious();
            }
            if (e.key === "Tab") {
              e.preventDefault();
              onFocusNext();
            }
          }}
          disabled={readOnly || saving}
          className={cn("h-9 rounded-full border-[color:var(--sinaxys-border)] bg-white/0 text-right", hasError && "border-red-400 focus-visible:ring-red-400")}
          inputMode="decimal"
        />
        {cellError && (
          <div className="mt-1 flex items-center gap-1 text-xs text-red-600">
            <AlertCircle className="h-3.5 w-3.5" />{cellError}
          </div>
        )}
      </TableCell>
      <TableCell className="min-w-[180px]">
        <Select value={draft.department_id ?? "__none__"} onValueChange={(value) => onDraftChange({ ...draft, department_id: value === "__none__" ? null : value })} disabled={readOnly || saving}>
          <SelectTrigger ref={departmentTriggerRef} className="h-9 rounded-full border-[color:var(--sinaxys-border)] bg-white/0 text-xs">
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
          <SelectTrigger ref={projectTriggerRef} className="h-9 rounded-full border-[color:var(--sinaxys-border)] bg-white/0 text-xs">
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
          <SelectTrigger ref={squadTriggerRef} className="h-9 rounded-full border-[color:var(--sinaxys-border)] bg-white/0 text-xs">
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
