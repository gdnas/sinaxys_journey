import { describe, expect, it } from "vitest";
import {
  classifyCoordinationArtifact,
  normalizeCommitmentHealth,
  normalizeCommitmentPartyRole,
  validateCommitmentTransition,
} from "@/lib/commitmentValidation";

describe("commitmentValidation", () => {
  it("normaliza aliases legados de health para a ontologia canônica", () => {
    expect(normalizeCommitmentHealth("on_track")).toBe("healthy");
    expect(normalizeCommitmentHealth("overdue")).toBe("at_risk");
    expect(normalizeCommitmentHealth("blocked")).toBe("blocked");
  });

  it("normaliza papéis legados para papéis canônicos", () => {
    expect(normalizeCommitmentPartyRole("watcher")).toBe("observer");
    expect(normalizeCommitmentPartyRole("reviewer")).toBe("approver");
    expect(normalizeCommitmentPartyRole("requester")).toBe("sponsor");
  });

  it("impede ativação sem aceite obrigatório", () => {
    const issues = validateCommitmentTransition({
      from: "proposed",
      to: "active",
      acceptance_policy: "bilateral",
      accepted_by_owner_at: "2026-01-01T10:00:00.000Z",
      accepted_by_receiver_at: null,
    });

    expect(issues.some((issue) => issue.code === "missing_acceptance")).toBe(true);
  });

  it("classifica corretamente compromisso vs projeto", () => {
    expect(
      classifyCoordinationArtifact({
        has_explicit_promise: true,
        has_named_parties: true,
        has_execution_plan: false,
        is_atomic_work: false,
        is_decision_record: false,
        is_checklist_like: false,
        is_strategic_goal: false,
      }),
    ).toBe("commitment");

    expect(
      classifyCoordinationArtifact({
        has_explicit_promise: false,
        has_named_parties: false,
        has_execution_plan: true,
        is_atomic_work: false,
        is_decision_record: false,
        is_checklist_like: false,
        is_strategic_goal: false,
      }),
    ).toBe("project");
  });
});
