import { describe, expect, it } from "vitest";
import { commitmentCompatibilityRules } from "@/lib/commitmentTypes";
import { validateCommitmentAggregate, validateCoordinationArtifactBoundary } from "@/lib/commitmentValidation";
import { normalizeStrategicContextForPersistence } from "@/lib/commitmentsDomain";

describe("commitment compatibility", () => {
  it("mantém contexto estratégico opcional compatível com OKRs", () => {
    expect(normalizeStrategicContextForPersistence(null, null)).toEqual({
      strategic_context_id: null,
      strategic_context_type: "manual",
    });

    expect(commitmentCompatibilityRules.find((rule) => rule.integration === "okr")?.rule).toContain("Contexto estratégico");
  });

  it("mantém execution links opcionais sem invalidar o agregado", () => {
    const issues = validateCommitmentAggregate({
      status: "proposed",
      acceptance_policy: "receiver_only",
      commitment_type: "bilateral",
      category: "delivery",
      primary_owner_user_id: "a17d8c24-e016-4edb-a939-764225819f6d",
      primary_receiver_user_id: "8f668655-d22c-42fe-bf92-62759a31636e",
      execution_link_count: 0,
      strategic_context_id: null,
      strategic_context_type: null,
    });

    expect(issues.some((issue) => issue.code === "execution_substitutes_commitment" && issue.severity === "error")).toBe(false);
  });

  it("preserva boundary explícito entre compromisso, projeto e work item", () => {
    const projectBoundary = validateCoordinationArtifactBoundary({
      has_explicit_promise: false,
      has_named_parties: false,
      has_execution_plan: true,
      is_atomic_work: false,
      is_decision_record: false,
      is_checklist_like: false,
      is_strategic_goal: false,
    });

    const workItemBoundary = validateCoordinationArtifactBoundary({
      has_explicit_promise: false,
      has_named_parties: false,
      has_execution_plan: false,
      is_atomic_work: true,
      is_decision_record: false,
      is_checklist_like: false,
      is_strategic_goal: false,
    });

    expect(projectBoundary.kind).toBe("project");
    expect(workItemBoundary.kind).toBe("work_item");
  });
});
