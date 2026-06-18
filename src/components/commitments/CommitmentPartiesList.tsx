import { Badge } from "@/components/ui/badge";
import type { DbCommitmentParty } from "@/lib/commitmentsDb";
import { CommitmentInspectorEmptyState } from "@/components/commitments/CommitmentInspectorEmptyState";
import {
  formatInspectorDateTime,
  getPartyLabel,
  getPartyRoleLabel,
} from "@/components/commitments/commitmentInspectorFormat";

export function CommitmentPartiesList({ parties }: { parties: DbCommitmentParty[] }) {
  if (!parties.length) {
    return <CommitmentInspectorEmptyState message="Sem parties adicionais" />;
  }

  const groups = Array.from(
    parties.reduce((map, party) => {
      const current = map.get(party.role) ?? [];
      current.push(party);
      map.set(party.role, current);
      return map;
    }, new Map<string, DbCommitmentParty[]>()),
  );

  return (
    <div className="space-y-5">
      {groups.map(([role, roleParties]) => (
        <div key={role} className="space-y-3">
          <div className="text-sm font-semibold tracking-tight text-[color:var(--sinaxys-ink)]">{getPartyRoleLabel(role)}</div>
          <div className="space-y-3">
            {roleParties.map((party) => (
              <div
                key={party.id}
                className="rounded-[24px] border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)]/55 p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="break-all text-sm font-medium text-[color:var(--sinaxys-ink)]">{getPartyLabel(party)}</div>
                    <div className="mt-1 text-xs text-[color:var(--sinaxys-ink)]/65">
                      {party.party_type === "team" ? "party_type: team" : "party_type: user"}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {party.is_primary ? (
                      <Badge className="rounded-full border border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-200">
                        Primário
                      </Badge>
                    ) : null}
                    <Badge className="rounded-full border border-[color:var(--sinaxys-border)] bg-white/80 text-[color:var(--sinaxys-ink)] dark:bg-[color:var(--sinaxys-tint)]/80">
                      {party.active ? "Ativo" : "Inativo"}
                    </Badge>
                    {party.acceptance_required ? (
                      <Badge className="rounded-full border border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
                        Aceite requerido
                      </Badge>
                    ) : null}
                  </div>
                </div>

                <div className="mt-3 grid gap-2 text-xs text-[color:var(--sinaxys-ink)]/70 sm:grid-cols-2">
                  <div>Aceito em: {formatInspectorDateTime(party.accepted_at)}</div>
                  <div>Recusado em: {formatInspectorDateTime(party.declined_at)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
