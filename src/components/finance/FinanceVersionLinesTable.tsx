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
  readOnly,
  savingLineId,
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
  readOnly: boolean;
  savingLineId: string | null;
  accounts: Array<{ id: string; name: string; code?: string | null }>;
  periods: Array<{ id: string; label: string }>;
  departments: Array<{ id: string; name: string }>;
  projects: Array<{ id: string; name: string }>;
  squads: Array<{ id: string; name: string }>;
}) {
  const [focusIndex, setFocusIndex] = useState(0);
  const visibleLines = useMemo(() => lines, [lines]);

  return (
    <Card className="rounded-[28px] border-[color:var(--sinaxys-border)] bg-white/5 p-4 backdrop-blur md:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[color:var(--sinaxys-ink)]">Linhas da versão</h2>
          <p className="mt-1 text-sm text-[color:var(--sinaxys-ink)]/70">Edição inline, sem modal, com salvamento por linha.</p>
        </div>
        {!readOnly && (
          <Button onClick={onAddLine} className="rounded-full bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90">
            <Plus className="mr-2 h-4 w-4" />Nova linha
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
            {visibleLines.map((line, index) => (
              <FinanceVersionLineRow
                key={line.id}
                line={line}
                draft={drafts[line.id]}
                onDraftChange={(next) => onDraftChange(line.id, next)}
                onSave={() => onSaveLine(line.id)}
                onDelete={() => onDeleteLine(line.id)}
                onFocusNext={() => setFocusIndex(index + 1)}
                readOnly={readOnly}
                saving={savingLineId === line.id}
                accounts={accounts}
                periods={periods}
                departments={departments}
                projects={projects}
                squads={squads}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      {!visibleLines.length && (
        <div className="mt-4 rounded-3xl border border-dashed border-[color:var(--sinaxys-border)] bg-white/5 p-8 text-center text-sm text-[color:var(--sinaxys-ink)]/70">
          Nenhuma linha cadastrada ainda. {!readOnly ? "Use a nova linha para começar." : "Esta versão está bloqueada."}
        </div>
      )}
    </Card>
  );
}
