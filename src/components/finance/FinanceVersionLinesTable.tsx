import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { FinanceVersionLine } from "@/lib/financeDb";
import { FinanceVersionLineRow, type FinanceLineDraft } from "./FinanceVersionLineRow";

export function FinanceVersionLinesTable({
  lines,
  drafts,
  onDraftChange,
  onSaveLine,
  onDeleteLine,
  onAddLine,
  onCancelLine,
  readOnly,
  savingLineId,
  editingLineId,
  errorLineId,
  onEditLine,
  onMoveLine,
  accounts,
  periods,
  departments,
  projects,
  squads,
}: {
  lines: FinanceVersionLine[];
  drafts: Record<string, FinanceLineDraft>;
  onDraftChange: (lineId: string, next: FinanceLineDraft) => void;
  onSaveLine: (lineId: string) => void;
  onDeleteLine: (lineId: string) => void;
  onAddLine: () => void;
  onCancelLine: (lineId: string) => void;
  readOnly: boolean;
  savingLineId: string | null;
  editingLineId: string | null;
  errorLineId: string | null;
  onEditLine: (lineId: string) => void;
  onMoveLine: (lineId: string, direction: "next" | "previous") => void;
  accounts: Array<{ id: string; name: string; code?: string | null }>;
  periods: Array<{ id: string; label: string }>;
  departments: Array<{ id: string; name: string }>;
  projects: Array<{ id: string; name: string }>;
  squads: Array<{ id: string; name: string }>;
}) {
  const visibleLines = useMemo(() => lines, [lines]);
  const hasRows = visibleLines.length > 0;

  return (
    <Card className="rounded-[28px] border-[color:var(--sinaxys-border)] bg-white/5 p-4 backdrop-blur md:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[color:var(--sinaxys-ink)]">Linhas da versão</h2>
          <p className="mt-1 text-sm text-[color:var(--sinaxys-ink)]/70">Edição inline, sem modal, com salvamento por linha.</p>
        </div>
        {!readOnly && (
          <Button onClick={onAddLine} className="rounded-full bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90">
            <Plus className="mr-2 h-4 w-4" />+ linha
          </Button>
        )}
      </div>

      <div className="mt-4 overflow-hidden rounded-3xl border border-[color:var(--sinaxys-border)] bg-white/40">
        <Table>
          <TableHeader>
            <TableRow className="bg-white/60">
              <TableHead>Conta</TableHead>
              <TableHead>Período</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Departamento</TableHead>
              <TableHead>Projeto</TableHead>
              <TableHead>Squad</TableHead>
              <TableHead />
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {hasRows ? visibleLines.map((line, index) => (
              <FinanceVersionLineRow
                key={line.id}
                line={line}
                draft={drafts[line.id]}
                onDraftChange={(next) => onDraftChange(line.id, next)}
                onSave={() => onSaveLine(line.id)}
                onDelete={() => onDeleteLine(line.id)}
                onFocusNext={() => onMoveLine(line.id, "next")}
                onFocusPrevious={() => onMoveLine(line.id, "previous")}
                onCancel={() => onCancelLine(line.id)}
                readOnly={readOnly}
                saving={savingLineId === line.id}
                hasError={errorLineId === line.id}
                isEditing={editingLineId === line.id}
                accounts={accounts}
                periods={periods}
                departments={departments}
                projects={projects}
                squads={squads}
              />
            )) : null}
          </TableBody>
        </Table>
      </div>

      {!hasRows && (
        <div className="mt-4 rounded-3xl border border-dashed border-[color:var(--sinaxys-border)] bg-white/5 p-8 text-center text-sm text-[color:var(--sinaxys-ink)]/70">
          <div className="font-medium text-[color:var(--sinaxys-ink)]">Nenhuma linha cadastrada ainda.</div>
          <p className="mt-1">{readOnly ? "Esta versão está bloqueada." : "Clique em Adicionar primeira linha para começar."}</p>
          {!readOnly && (
            <Button onClick={onAddLine} className="mt-4 rounded-full bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90">
              Adicionar primeira linha
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
