export const commitmentStatusValues = [
  "proposed",
  "negotiating",
  "active",
  "renegotiating",
  "fulfilled",
  "closed_unfulfilled",
  "cancelled",
] as const;

export const commitmentTerminalStatusValues = ["fulfilled", "closed_unfulfilled", "cancelled"] as const;

export const canonicalCommitmentHealthValues = ["healthy", "at_risk", "blocked", "unknown"] as const;
export const legacyCommitmentHealthValues = ["on_track", "overdue"] as const;
export const commitmentHealthValues = [...canonicalCommitmentHealthValues, ...legacyCommitmentHealthValues] as const;

export const commitmentPriorityValues = ["low", "medium", "high", "critical"] as const;
export const commitmentCategoryValues = ["delivery", "alignment", "approval", "governance", "compliance", "operational"] as const;
export const commitmentTypeValues = ["bilateral", "unilateral", "team_to_team", "self_commitment"] as const;
export const acceptancePolicyValues = ["none", "owner_only", "receiver_only", "bilateral"] as const;
export const strategicContextTypeValues = ["objective", "key_result", "manual"] as const;
export const commitmentPartyTypeValues = ["user", "team"] as const;

export const canonicalCommitmentPartyRoleValues = ["owner", "receiver", "sponsor", "approver", "observer"] as const;
export const compatibilityCommitmentPartyRoleValues = ["requester", "contributor", "reviewer", "watcher"] as const;
export const commitmentPartyRoleValues = [
  ...canonicalCommitmentPartyRoleValues,
  ...compatibilityCommitmentPartyRoleValues,
] as const;

export const dependencyKindValues = ["finish_to_start", "input", "approval", "shared_capacity", "external_condition"] as const;
export const dependencyTargetTypeValues = ["commitment", "project", "work_item", "decision", "external_condition"] as const;
export const dependencyStatusValues = ["open", "resolved", "waived"] as const;
export const evidenceTypeValues = ["note", "file", "link", "metric_snapshot", "approval", "execution_snapshot"] as const;
export const decisionTypeValues = ["create", "change", "prioritize", "cancel", "suspend", "resume"] as const;
export const decisionStatusValues = ["draft", "approved", "rejected", "superseded"] as const;
export const renegotiationStatusValues = ["open", "approved", "rejected", "withdrawn"] as const;
export const executionLinkTargetTypeValues = ["project", "work_item", "okr_task", "external"] as const;
export const executionLinkRoleValues = ["implements", "tracks", "supports", "evidences"] as const;
export const reviewStatusValues = ["scheduled", "completed", "missed", "rescheduled"] as const;

export type CommitmentStatus = (typeof commitmentStatusValues)[number];
export type TerminalCommitmentStatus = (typeof commitmentTerminalStatusValues)[number];
export type CanonicalCommitmentHealth = (typeof canonicalCommitmentHealthValues)[number];
export type LegacyCommitmentHealth = (typeof legacyCommitmentHealthValues)[number];
export type CommitmentHealth = CanonicalCommitmentHealth | LegacyCommitmentHealth;
export type CommitmentPriority = (typeof commitmentPriorityValues)[number];
export type CommitmentCategory = (typeof commitmentCategoryValues)[number];
export type CommitmentType = (typeof commitmentTypeValues)[number];
export type AcceptancePolicy = (typeof acceptancePolicyValues)[number];
export type StrategicContextType = (typeof strategicContextTypeValues)[number];
export type CommitmentPartyType = (typeof commitmentPartyTypeValues)[number];
export type CanonicalCommitmentPartyRole = (typeof canonicalCommitmentPartyRoleValues)[number];
export type CompatibilityCommitmentPartyRole = (typeof compatibilityCommitmentPartyRoleValues)[number];
export type CommitmentPartyRole = CanonicalCommitmentPartyRole | CompatibilityCommitmentPartyRole;
export type DependencyKind = (typeof dependencyKindValues)[number];
export type DependencyTargetType = (typeof dependencyTargetTypeValues)[number];
export type DependencyStatus = (typeof dependencyStatusValues)[number];
export type EvidenceType = (typeof evidenceTypeValues)[number];
export type DecisionType = (typeof decisionTypeValues)[number];
export type DecisionStatus = (typeof decisionStatusValues)[number];
export type RenegotiationStatus = (typeof renegotiationStatusValues)[number];
export type ExecutionLinkTargetType = (typeof executionLinkTargetTypeValues)[number];
export type ExecutionLinkRole = (typeof executionLinkRoleValues)[number];
export type ReviewStatus = (typeof reviewStatusValues)[number];

export type CommitmentBoundaryEntity =
  | "strategic_context"
  | "commitment"
  | "decision"
  | "dependency"
  | "project"
  | "work_item"
  | "evidence"
  | "review_cycle"
  | "learning_record";

export interface CommitmentBoundaryDefinition {
  entity: CommitmentBoundaryEntity;
  definition: string;
  owns: readonly string[];
  must_not_be_used_for: readonly string[];
}

export const commitmentBoundaryDefinitions: readonly CommitmentBoundaryDefinition[] = [
  {
    entity: "strategic_context",
    definition: "Explica o porquê estratégico do compromisso, sem representar aceite, execução ou prova.",
    owns: ["intenção", "alinhamento com objetivo/KR", "narrativa estratégica"],
    must_not_be_used_for: ["atribuir execução diária", "registrar aceite", "substituir projeto"],
  },
  {
    entity: "commitment",
    definition: "Acordo organizacional explícito entre partes sobre resultado, prazo, responsabilidade e condição de satisfação.",
    owns: ["partes", "prazo", "status", "health", "renegociação", "evidência mínima"],
    must_not_be_used_for: ["decompor trabalho atômico", "virar KR", "virar projeto obrigatório"],
  },
  {
    entity: "decision",
    definition: "Ato de decisão que cria, altera, prioriza, pausa ou cancela compromissos.",
    owns: ["origem", "autoridade decisória", "efeito", "data efetiva"],
    must_not_be_used_for: ["executar", "acompanhar progresso contínuo"],
  },
  {
    entity: "dependency",
    definition: "Condição explícita que precisa existir para que um compromisso avance ou seja cumprido.",
    owns: ["bloqueio", "tipo da dependência", "alvo dependido", "resolução"],
    must_not_be_used_for: ["substituir evidência", "substituir status do compromisso"],
  },
  {
    entity: "project",
    definition: "Mecanismo coordenado de execução que pode implementar um ou mais compromissos, sem se confundir com o acordo em si.",
    owns: ["escopo de execução", "sequenciamento", "recursos", "coordenação operacional"],
    must_not_be_used_for: ["ser a única forma de existir compromisso", "substituir aceite entre partes"],
  },
  {
    entity: "work_item",
    definition: "Unidade de trabalho executável usada para produzir progresso operacional.",
    owns: ["atividade", "assignee", "estado operacional diário"],
    must_not_be_used_for: ["representar acordo organizacional", "substituir evidência formal"],
  },
  {
    entity: "evidence",
    definition: "Registro verificável que demonstra avanço, cumprimento ou aprendizado relevante do compromisso.",
    owns: ["prova", "fonte", "timestamp", "materialidade"],
    must_not_be_used_for: ["substituir status", "substituir dependency"],
  },
  {
    entity: "review_cycle",
    definition: "Cadência de revisão usada para recalibrar health, confiança e próximos passos do compromisso.",
    owns: ["ritmo de revisão", "sumário", "confiança", "review_health"],
    must_not_be_used_for: ["substituir renegociação", "substituir evento histórico"],
  },
  {
    entity: "learning_record",
    definition: "Síntese de aprendizado derivada de execução, evidências e renegociações concluídas.",
    owns: ["insight", "retroalimentação", "recomendação"],
    must_not_be_used_for: ["substituir compromisso ativo", "substituir projeto"],
  },
] as const;

export interface CommitmentTransitionRule {
  from: CommitmentStatus;
  to: readonly CommitmentStatus[];
  notes: string;
}

export const commitmentTransitionRules: readonly CommitmentTransitionRule[] = [
  {
    from: "proposed",
    to: ["negotiating", "active", "cancelled"],
    notes: "Pode virar ativo direto apenas quando a política de aceite já estiver satisfeita.",
  },
  {
    from: "negotiating",
    to: ["active", "cancelled"],
    notes: "Negociação resolve termos do acordo antes da ativação.",
  },
  {
    from: "active",
    to: ["renegotiating", "fulfilled", "closed_unfulfilled", "cancelled"],
    notes: "Health não muda o ciclo de vida; apenas sinaliza condição operacional.",
  },
  {
    from: "renegotiating",
    to: ["active", "fulfilled", "closed_unfulfilled", "cancelled"],
    notes: "Renegociação aprovada retorna para active com nova versão materializada.",
  },
  {
    from: "fulfilled",
    to: [],
    notes: "Status terminal. Encerramento administrativo pode ocorrer sem mudar o status materializado.",
  },
  {
    from: "closed_unfulfilled",
    to: [],
    notes: "Status terminal para acordo encerrado sem cumprir o combinado.",
  },
  {
    from: "cancelled",
    to: [],
    notes: "Status terminal para acordo removido da agenda ativa por decisão explícita.",
  },
] as const;

export type CommitmentEventType =
  | "commitment_created"
  | "acceptance_requested"
  | "owner_accepted"
  | "receiver_accepted"
  | "commitment_activated"
  | "health_changed"
  | "dependency_added"
  | "dependency_resolved"
  | "evidence_added"
  | "execution_linked"
  | "review_recorded"
  | "renegotiation_requested"
  | "renegotiation_approved"
  | "renegotiation_rejected"
  | "commitment_fulfilled"
  | "commitment_closed_unfulfilled"
  | "commitment_cancelled"
  | "owner_changed"
  | "receiver_changed"
  | "due_date_changed"
  | "comment_added";

export const commitmentLegacyEventTypeAliasMap = {
  commitment_updated: "commitment_updated",
  dependency_created: "dependency_added",
  evidence_attached: "evidence_added",
  execution_link_created: "execution_linked",
  review_cycle_created: "review_recorded",
  renegotiation_opened: "renegotiation_requested",
} as const;

export type CommitmentLegacyAliasedEventType = keyof typeof commitmentLegacyEventTypeAliasMap;
export type CommitmentReadableEventType = CommitmentEventType | "commitment_updated";
export type CommitmentStoredEventType = CommitmentEventType | CommitmentLegacyAliasedEventType | `health_changed_to_${CommitmentHealth}`;

export interface CommitmentEventDefinition {
  type: CommitmentEventType;
  immutable: true;
  recalculatesCurrentState: boolean;
  description: string;
}

export const commitmentEventCatalog: readonly CommitmentEventDefinition[] = [

  {
    type: "commitment_created",
    immutable: true,
    recalculatesCurrentState: true,
    description: "Instancia o agregado com seu estado inicial materializado.",
  },
  {
    type: "acceptance_requested",
    immutable: true,
    recalculatesCurrentState: false,
    description: "Sinaliza que alguma parte precisa aceitar o acordo explicitamente.",
  },
  {
    type: "owner_accepted",
    immutable: true,
    recalculatesCurrentState: true,
    description: "Registra o aceite do owner.",
  },
  {
    type: "receiver_accepted",
    immutable: true,
    recalculatesCurrentState: true,
    description: "Registra o aceite do receiver.",
  },
  {
    type: "commitment_activated",
    immutable: true,
    recalculatesCurrentState: true,
    description: "Marca o início do acordo em execução real.",
  },
  {
    type: "health_changed",
    immutable: true,
    recalculatesCurrentState: true,
    description: "Atualiza a condição operacional sem alterar o ciclo de vida.",
  },
  {
    type: "dependency_added",
    immutable: true,
    recalculatesCurrentState: false,
    description: "Cria dependência explícita relevante para o compromisso.",
  },
  {
    type: "dependency_resolved",
    immutable: true,
    recalculatesCurrentState: true,
    description: "Marca a resolução de uma dependência que afetava o compromisso.",
  },
  {
    type: "evidence_added",
    immutable: true,
    recalculatesCurrentState: false,
    description: "Anexa evidência de avanço ou cumprimento.",
  },
  {
    type: "execution_linked",
    immutable: true,
    recalculatesCurrentState: false,
    description: "Liga explicitamente o compromisso a projeto, work item ou execução externa.",
  },
  {
    type: "review_recorded",
    immutable: true,
    recalculatesCurrentState: true,
    description: "Persistência da cadência de revisão e confiança atual.",
  },
  {
    type: "renegotiation_requested",
    immutable: true,
    recalculatesCurrentState: true,
    description: "Abre renegociação formal do acordo.",
  },
  {
    type: "renegotiation_approved",
    immutable: true,
    recalculatesCurrentState: true,
    description: "Materializa nova versão aprovada do compromisso.",
  },
  {
    type: "renegotiation_rejected",
    immutable: true,
    recalculatesCurrentState: true,
    description: "Fecha a renegociação sem alterar a versão vigente.",
  },
  {
    type: "commitment_fulfilled",
    immutable: true,
    recalculatesCurrentState: true,
    description: "Marca o cumprimento do acordo.",
  },
  {
    type: "commitment_closed_unfulfilled",
    immutable: true,
    recalculatesCurrentState: true,
    description: "Fecha o acordo sem cumprimento.",
  },
  {
    type: "commitment_cancelled",
    immutable: true,
    recalculatesCurrentState: true,
    description: "Cancela o acordo por decisão explícita.",
  },
  {
    type: "owner_changed",
    immutable: true,
    recalculatesCurrentState: true,
    description: "Registra troca do owner principal.",
  },
  {
    type: "receiver_changed",
    immutable: true,
    recalculatesCurrentState: true,
    description: "Registra troca do receiver principal.",
  },
  {
    type: "due_date_changed",
    immutable: true,
    recalculatesCurrentState: true,
    description: "Registra alteração de prazo com rastreabilidade.",
  },
  {
    type: "comment_added",
    immutable: true,
    recalculatesCurrentState: false,
    description: "Narrativa auxiliar, sem alterar o estado do acordo.",
  },
] as const;

export function isCommitmentEventType(eventType: string): eventType is CommitmentEventType {
  return commitmentEventCatalog.some((eventDefinition) => eventDefinition.type === eventType);
}

export function canonicalizeCommitmentEventType(eventType: string): CommitmentReadableEventType | string {
  if (isCommitmentEventType(eventType)) return eventType;
  if (eventType in commitmentLegacyEventTypeAliasMap) {
    return commitmentLegacyEventTypeAliasMap[eventType as CommitmentLegacyAliasedEventType];
  }
  if (eventType.startsWith("health_changed_to_")) {
    return "health_changed";
  }
  return eventType;
}

export function normalizeCommitmentEventPayload(
  eventType: string,
  payload?: Record<string, unknown> | null,
): Record<string, unknown> {
  const normalizedPayload = { ...(payload ?? {}) };

  if (eventType.startsWith("health_changed_to_") && !("health" in normalizedPayload)) {
    normalizedPayload.health = eventType.replace("health_changed_to_", "");
  }

  return normalizedPayload;
}

export function normalizeCommitmentEventRecord<T extends { event_type: string; payload?: Record<string, unknown> | null }>(event: T) {
  const canonicalEventType = canonicalizeCommitmentEventType(event.event_type);

  return {
    ...event,
    raw_event_type: event.event_type,
    canonical_event_type: canonicalEventType,
    event_type: canonicalEventType,
    payload: normalizeCommitmentEventPayload(event.event_type, event.payload),
  };
}

export interface CommitmentRelationalTableBlueprint {

  table: string;
  role: "root" | "satellite" | "support" | "compatibility" | "derived";
  purpose: string;
  invariants: readonly string[];
}

export const commitmentRelationalBlueprint: readonly CommitmentRelationalTableBlueprint[] = [
  {
    table: "commitments",
    role: "root",
    purpose: "Estado corrente materializado do agregado Commitment.",
    invariants: [
      "Sempre possui tenant_id e primary_owner_user_id",
      "status e health são independentes",
      "origem por decisão é opcional",
      "contexto estratégico é opcional, porém recomendado",
    ],
  },
  {
    table: "commitment_parties",
    role: "satellite",
    purpose: "Participantes tipados do acordo com papéis canônicos e histórico ativo.",
    invariants: [
      "todo owner/receiver primário também aparece aqui",
      "papel canônico deve ser derivável mesmo com aliases legados",
    ],
  },
  {
    table: "commitment_dependencies",
    role: "satellite",
    purpose: "Dependências explícitas do compromisso.",
    invariants: ["cada linha aponta para um único alvo lógico", "blocking != status do compromisso"],
  },
  {
    table: "commitment_evidence",
    role: "satellite",
    purpose: "Evidências verificáveis de avanço ou cumprimento.",
    invariants: ["evidência é prova, não estado", "evidência final é opcional por tipo de compromisso"],
  },
  {
    table: "commitment_renegotiations",
    role: "satellite",
    purpose: "Pedidos formais de renegociação com snapshot antigo e proposto.",
    invariants: ["não sobrescrever snapshots", "apenas uma renegociação aberta por vez no MVP"],
  },
  {
    table: "commitment_events",
    role: "satellite",
    purpose: "Ledger imutável da narrativa histórica do agregado.",
    invariants: ["eventos são append-only", "payload sempre preserva contexto causal"],
  },
  {
    table: "commitment_execution_links",
    role: "compatibility",
    purpose: "Fronteira explícita entre acordo e mecanismos de execução legado/externo.",
    invariants: ["compromisso pode existir sem projeto", "work item nunca substitui compromisso"],
  },
  {
    table: "commitment_review_cycles",
    role: "satellite",
    purpose: "Cadência de revisão periódica do compromisso.",
    invariants: ["review_health não substitui health corrente automaticamente sem regra explícita"],
  },
  {
    table: "commitment_comments",
    role: "support",
    purpose: "Conversa contextual ligada ao compromisso.",
    invariants: ["comentário não é evento de estado por si só"],
  },
  {
    table: "v_commitment_analytics_overview",
    role: "derived",
    purpose: "Visão derivada para saúde, aging, pressão de renegociação e cobertura.",
    invariants: ["analytics não inventa dados", "flags derivadas não substituem dados-fonte"],
  },
] as const;

export interface CommitmentCompatibilityRule {
  integration: "okr" | "project" | "work_item" | "decision";
  rule: string;
}

export const commitmentCompatibilityRules: readonly CommitmentCompatibilityRule[] = [
  {
    integration: "okr",
    rule: "Contexto estratégico continua vinculado por links, sem tornar OKR dependência rígida do compromisso.",
  },
  {
    integration: "project",
    rule: "Project permanece módulo de execução coordenada e pode implementar múltiplos compromissos sem substituí-los.",
  },
  {
    integration: "work_item",
    rule: "Work item continua unidade de execução diária e pode servir como evidência/implementação derivada.",
  },
  {
    integration: "decision",
    rule: "Decision pode originar, alterar, pausar ou cancelar compromissos, mas compromisso também pode nascer por origem manual explícita.",
  },
] as const;

export interface CommitmentAnalyticsDefinition {
  key:
    | "at_risk_commitments"
    | "blocked_commitments"
    | "repeated_renegotiations"
    | "owner_overload"
    | "dependency_bottlenecks"
    | "projects_without_commitments"
    | "krs_without_commitments"
    | "missing_evidence"
    | "aging_review_gap";
  description: string;
}

export const commitmentAnalyticsDefinitions: readonly CommitmentAnalyticsDefinition[] = [
  { key: "at_risk_commitments", description: "Compromissos com health at_risk ou atraso derivado." },
  { key: "blocked_commitments", description: "Compromissos com bloqueios explícitos ainda não resolvidos." },
  { key: "repeated_renegotiations", description: "Pressão de renegociação por recorrência e reincidência." },
  { key: "owner_overload", description: "Sobrecarga por owner com muitos compromissos ativos e em risco." },
  { key: "dependency_bottlenecks", description: "Dependências recorrentes que travam múltiplos compromissos." },
  { key: "projects_without_commitments", description: "Projetos ativos sem acordo organizacional explícito associado." },
  { key: "krs_without_commitments", description: "KRs estratégicos sem cobertura por compromissos." },
  { key: "missing_evidence", description: "Compromissos que exigem prova, mas ainda sem evidência suficiente." },
  { key: "aging_review_gap", description: "Compromissos com revisão vencida ou sem revisão recente." },
] as const;

export interface CommitmentRoadmapPhase {
  phase: "mvp" | "v2" | "v3";
  focus: string;
  scope: readonly string[];
}

export const commitmentRoadmap: readonly CommitmentRoadmapPhase[] = [
  {
    phase: "mvp",
    focus: "Domínio mínimo coerente e coexistência com legado",
    scope: [
      "agregado Commitment + satélites principais",
      "status separado de health",
      "eventos imutáveis básicos",
      "links explícitos com OKR/Projeto/Work Item",
      "analytics derivados essenciais",
    ],
  },
  {
    phase: "v2",
    focus: "Automação e profundidade operacional",
    scope: [
      "review cycles mais ricos",
      "regras derivadas de health",
      "inferência assistida de dependências",
      "notificações e renegociações mais inteligentes",
    ],
  },
  {
    phase: "v3",
    focus: "Coordenação adaptativa cross-module",
    scope: [
      "analytics avançado e preditivo",
      "automação de compatibilidade com execução",
      "inteligência organizacional sobre gargalos e capacidade",
    ],
  },
] as const;

export function canonicalizeCommitmentHealth(health: CommitmentHealth | null | undefined): CanonicalCommitmentHealth {
  if (!health || health === "unknown") return "unknown";
  if (health === "healthy" || health === "at_risk" || health === "blocked") return health;
  if (health === "on_track") return "healthy";
  return "at_risk";
}

export function canonicalizeCommitmentPartyRole(role: CommitmentPartyRole): CanonicalCommitmentPartyRole {
  if (role === "owner" || role === "receiver" || role === "sponsor" || role === "approver" || role === "observer") {
    return role;
  }
  if (role === "requester") return "sponsor";
  if (role === "reviewer") return "approver";
  return "observer";
}

export function isCommitmentTerminalStatus(status: CommitmentStatus) {
  return commitmentTerminalStatusValues.includes(status as TerminalCommitmentStatus);
}

export function getAllowedCommitmentTransitions(status: CommitmentStatus) {
  return commitmentTransitionRules.find((rule) => rule.from === status)?.to ?? [];
}
