import { describe, expect, it } from "vitest";
import {
  canActivateCommitment,
  deriveAcceptedAt,
  deriveInitialCommitmentStatus,
  isCommitmentReceiverOptional,
  normalizeSeedParties,
  normalizeStrategicContextForPersistence,
} from "@/lib/commitmentsDomain";

describe("commitmentsDomain", () => {
  it("separa ativação direta da política de aceite none", () => {
    expect(deriveInitialCommitmentStatus("none")).toBe("active");
    expect(deriveInitialCommitmentStatus("bilateral")).toBe("proposed");
  });

  it("calcula aceite bilateral e unilateral corretamente", () => {
    expect(canActivateCommitment("none", null, null)).toBe(true);
    expect(canActivateCommitment("owner_only", "2026-01-01T10:00:00.000Z", null)).toBe(true);
    expect(canActivateCommitment("receiver_only", null, "2026-01-01T10:00:00.000Z")).toBe(true);
    expect(canActivateCommitment("bilateral", "2026-01-01T10:00:00.000Z", null)).toBe(false);
    expect(canActivateCommitment("bilateral", "2026-01-01T10:00:00.000Z", "2026-01-02T10:00:00.000Z")).toBe(true);
  });

  it("deriva accepted_at pelo timestamp mais recente", () => {
    expect(deriveAcceptedAt(null, null)).toBeNull();
    expect(deriveAcceptedAt("2026-01-01T10:00:00.000Z", null)).toBe("2026-01-01T10:00:00.000Z");
    expect(
      deriveAcceptedAt("2026-01-01T10:00:00.000Z", "2026-01-02T10:00:00.000Z"),
    ).toBe("2026-01-02T10:00:00.000Z");
  });

  it("normaliza contexto estratégico opcional para persistência coerente", () => {
    expect(normalizeStrategicContextForPersistence(null, null)).toEqual({
      strategic_context_id: null,
      strategic_context_type: "manual",
    });

    expect(normalizeStrategicContextForPersistence("7e683eb7-9f57-4272-af22-bde529729e9f", "key_result")).toEqual({
      strategic_context_id: "7e683eb7-9f57-4272-af22-bde529729e9f",
      strategic_context_type: "key_result",
    });
  });

  it("marca receiver como opcional apenas para self_commitment operacional compatível", () => {
    expect(isCommitmentReceiverOptional("self_commitment", "delivery")).toBe(true);
    expect(isCommitmentReceiverOptional("bilateral", "operational")).toBe(true);
    expect(isCommitmentReceiverOptional("bilateral", "delivery")).toBe(false);
  });

  it("materializa parties primárias de owner e receiver no seed canônico", () => {
    const parties = normalizeSeedParties({
      tenant_id: "b11dc2ef-3530-4fe5-8a95-926166e1cd79",
      title: "Entrega de fechamento financeiro",
      description: null,
      purpose: "Publicar fechamento mensal validado",
      scope_summary: null,
      success_criteria: null,
      conditions_of_satisfaction: null,
      category: "delivery",
      commitment_type: "bilateral",
      health: "unknown",
      confidence_level: null,
      priority: "high",
      acceptance_policy: "bilateral",
      evidence_required: true,
      review_cadence: null,
      strategic_context_id: null,
      strategic_context_type: "manual",
      origin_decision_id: null,
      primary_owner_user_id: "a17d8c24-e016-4edb-a939-764225819f6d",
      primary_receiver_user_id: "8f668655-d22c-42fe-bf92-62759a31636e",
      primary_receiver_team_id: null,
      review_owner_id: null,
      start_date: null,
      due_date: null,
      next_review_at: null,
      created_by: "a17d8c24-e016-4edb-a939-764225819f6d",
      parties: [],
    });

    expect(parties).toHaveLength(2);
    expect(parties.find((party) => party.role === "owner" && party.is_primary)?.acceptance_required).toBe(true);
    expect(parties.find((party) => party.role === "receiver" && party.is_primary)?.acceptance_required).toBe(true);
  });

  it("permite agregado válido sem execution links obrigatórios", () => {
    const parties = normalizeSeedParties({
      tenant_id: "b11dc2ef-3530-4fe5-8a95-926166e1cd79",
      title: "Compromisso sem projeto ainda",
      description: null,
      purpose: "Fixar acordo antes da execução",
      scope_summary: null,
      success_criteria: null,
      conditions_of_satisfaction: null,
      category: "alignment",
      commitment_type: "bilateral",
      health: "blocked",
      confidence_level: null,
      priority: "medium",
      acceptance_policy: "receiver_only",
      evidence_required: false,
      review_cadence: null,
      strategic_context_id: null,
      strategic_context_type: "manual",
      origin_decision_id: null,
      primary_owner_user_id: "a17d8c24-e016-4edb-a939-764225819f6d",
      primary_receiver_user_id: "8f668655-d22c-42fe-bf92-62759a31636e",
      primary_receiver_team_id: null,
      review_owner_id: null,
      start_date: null,
      due_date: null,
      next_review_at: null,
      created_by: "a17d8c24-e016-4edb-a939-764225819f6d",
      parties: [],
    });

    expect(parties.map((party) => party.role)).toEqual(["owner", "receiver"]);
  });
});
