import { describe, expect, it } from "vitest";
import {
  canActivateCommitment,
  deriveAcceptedAt,
  deriveInitialCommitmentStatus,
  normalizeSeedParties,
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
      strategic_context_type: "objective",
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
});
