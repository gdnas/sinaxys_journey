import { describe, expect, it } from "vitest";
import {
  classifyCoordinationArtifact,
  normalizeCommitmentHealth,
  normalizeCommitmentPartyRole,
  validateCommitmentAggregate,
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

  it("aceita lifecycle e health como eixos independentes", () => {
    const issues = validateCommitmentAggregate({
      status: "active",
      acceptance_policy: "receiver_only",
      commitment_type: "bilateral",
      category: "delivery",
      primary_owner_user_id: "a17d8c24-e016-4edb-a939-764225819f6d",
      primary_receiver_user_id: "8f668655-d22c-42fe-bf92-62759a31636e",
      accepted_by_receiver_at: "2026-01-01T10:00:00.000Z",
      evidence_required: false,
      strategic_context_id: null,
      strategic_context_type: null,
      execution_link_count: 0,
    });

    expect(issues.some((issue) => issue.code === "missing_acceptance")).toBe(false);
    expect(issues.some((issue) => issue.code === "execution_substitutes_commitment" && issue.severity === "warning")).toBe(true);
  });

  it("gera warning de missing receiver no caso padrão e não em self_commitment operacional", () => {
    const defaultIssues = validateCommitmentAggregate({
      status: "proposed",
      acceptance_policy: "receiver_only",
      commitment_type: "bilateral",
      category: "delivery",
      primary_owner_user_id: "a17d8c24-e016-4edb-a939-764225819f6d",
      primary_receiver_user_id: null,
      primary_receiver_team_id: null,
    });

    const optionalReceiverIssues = validateCommitmentAggregate({
      status: "proposed",
      acceptance_policy: "none",
      commitment_type: "self_commitment",
      category: "operational",
      primary_owner_user_id: "a17d8c24-e016-4edb-a939-764225819f6d",
      primary_receiver_user_id: null,
      primary_receiver_team_id: null,
    });

    expect(defaultIssues.some((issue) => issue.code === "missing_receiver")).toBe(true);
    expect(optionalReceiverIssues.some((issue) => issue.code === "missing_receiver")).toBe(false);
  });

  it("detecta manual_context_mismatch apenas quando há conflito real", () => {
    const mismatchIssues = validateCommitmentAggregate({
      status: "proposed",
      acceptance_policy: "receiver_only",
      commitment_type: "bilateral",
      category: "alignment",
      primary_owner_user_id: "a17d8c24-e016-4edb-a939-764225819f6d",
      primary_receiver_user_id: "8f668655-d22c-42fe-bf92-62759a31636e",
      strategic_context_id: "7e683eb7-9f57-4272-af22-bde529729e9f",
      strategic_context_type: "manual",
    });

    const compatibleIssues = validateCommitmentAggregate({
      status: "proposed",
      acceptance_policy: "receiver_only",
      commitment_type: "bilateral",
      category: "alignment",
      primary_owner_user_id: "a17d8c24-e016-4edb-a939-764225819f6d",
      primary_receiver_user_id: "8f668655-d22c-42fe-bf92-62759a31636e",
      strategic_context_id: null,
      strategic_context_type: null,
    });

    expect(mismatchIssues.some((issue) => issue.code === "manual_context_mismatch")).toBe(true);
    expect(compatibleIssues.some((issue) => issue.code === "manual_context_mismatch")).toBe(false);
  });

  it("impede mutação de estado terminal e exige evidência ao cumprir quando necessário", () => {
    const terminalIssues = validateCommitmentTransition({
      from: "fulfilled",
      to: "active",
      acceptance_policy: "none",
      evidence_required: true,
      final_evidence_count: 1,
    });

    const evidenceIssues = validateCommitmentTransition({
      from: "active",
      to: "fulfilled",
      acceptance_policy: "none",
      evidence_required: true,
      final_evidence_count: 0,
    });

    expect(terminalIssues.some((issue) => issue.code === "terminal_status_mutation")).toBe(true);
    expect(evidenceIssues.some((issue) => issue.code === "missing_evidence")).toBe(true);
  });

  it("classifica corretamente commitment, project e work item no boundary", () => {
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

    expect(
      classifyCoordinationArtifact({
        has_explicit_promise: false,
        has_named_parties: false,
        has_execution_plan: false,
        is_atomic_work: true,
        is_decision_record: false,
        is_checklist_like: false,
        is_strategic_goal: false,
      }),
    ).toBe("work_item");
  });
});
