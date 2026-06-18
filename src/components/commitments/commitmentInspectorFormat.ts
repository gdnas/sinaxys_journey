import type { DbCommitmentDependency, DbCommitmentEvidence, DbCommitmentExecutionLink, DbCommitmentParty } from "@/lib/commitmentsDb";
import type { DbCommitmentEventRow } from "@/lib/commitmentEventsDb";

const shortDateTime = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const shortDate = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function startCase(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

export function formatInspectorDateTime(value?: string | null) {
  if (!value) return "—";
  return shortDateTime.format(new Date(value));
}

export function formatInspectorDate(value?: string | null) {
  if (!value) return "—";
  return shortDate.format(new Date(value));
}

export function getCommitmentStatusLabel(status: string) {
  return startCase(status);
}

export function getCommitmentHealthLabel(health: string) {
  return startCase(health);
}

export function getCommitmentFieldLabel(value?: string | null) {
  if (!value) return null;
  return startCase(value);
}

export function getStatusBadgeClass(status: string) {
  if (["fulfilled", "active"].includes(status)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200";
  }

  if (["cancelled", "closed_unfulfilled"].includes(status)) {
    return "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200";
  }

  if (["proposed", "draft"].includes(status)) {
    return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200";
  }

  return "border-slate-200 bg-slate-100 text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200";
}

export function getHealthBadgeClass(health: string) {
  if (["healthy", "on_track"].includes(health)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200";
  }

  if (["at_risk", "overdue"].includes(health)) {
    return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200";
  }

  if (health === "blocked") {
    return "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200";
  }

  return "border-slate-200 bg-slate-100 text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200";
}

export function getPartyRoleLabel(role: string) {
  return startCase(role);
}

export function getPartyLabel(party: DbCommitmentParty) {
  if (party.party_type === "team") {
    return party.team_id ? `Time ${party.team_id}` : "Time não informado";
  }

  return party.user_id ? `Usuário ${party.user_id}` : "Usuário não informado";
}

export function getTimelineTypeLabel(item: DbCommitmentEventRow) {
  return startCase(item.canonical_event_type || item.event_type);
}

export function summarizeEventPayload(payload?: Record<string, unknown> | null) {
  if (!payload) return null;

  const preview = Object.entries(payload)
    .filter(([, value]) => typeof value === "string" || typeof value === "number" || typeof value === "boolean")
    .slice(0, 3)
    .map(([key, value]) => `${startCase(key)}: ${String(value)}`);

  return preview.length ? preview.join(" • ") : null;
}

export function getDependencyReference(dependency: DbCommitmentDependency) {
  if (dependency.depends_on_commitment_id) return `Compromisso ${dependency.depends_on_commitment_id}`;
  if (dependency.depends_on_project_id) return `Projeto ${dependency.depends_on_project_id}`;
  if (dependency.depends_on_work_item_id) return `Work item ${dependency.depends_on_work_item_id}`;
  if (dependency.depends_on_decision_id) return `Decisão ${dependency.depends_on_decision_id}`;
  if (dependency.external_label) return dependency.external_label;
  return "Referência não informada";
}

export function getEvidenceTitle(evidence: DbCommitmentEvidence) {
  return evidence.title?.trim() || startCase(evidence.evidence_type);
}

export function getEvidenceReference(evidence: DbCommitmentEvidence) {
  if (evidence.url) return evidence.url;
  if (evidence.file_id) return `Arquivo ${evidence.file_id}`;

  const payloadRef = Object.entries(evidence.payload ?? {}).find(([, value]) => typeof value === "string" && String(value).trim().length > 0);
  if (payloadRef) return `${startCase(payloadRef[0])}: ${String(payloadRef[1])}`;

  return null;
}

export function getExecutionLinkReference(link: DbCommitmentExecutionLink) {
  if (link.project_id) return `Projeto ${link.project_id}`;
  if (link.work_item_id) return `Work item ${link.work_item_id}`;
  if (link.okr_task_id) return `OKR task ${link.okr_task_id}`;
  if (link.external_ref) return link.external_ref;
  return "Referência não informada";
}
