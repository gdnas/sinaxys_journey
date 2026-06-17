import { describe, expect, it } from "vitest";
import {
  canonicalizeCommitmentEventType,
  normalizeCommitmentEventPayload,
  normalizeCommitmentEventRecord,
} from "@/lib/commitmentTypes";

describe("commitment event normalization", () => {
  it("normaliza aliases legados para eventos canônicos em leitura", () => {
    expect(canonicalizeCommitmentEventType("dependency_created")).toBe("dependency_added");
    expect(canonicalizeCommitmentEventType("evidence_attached")).toBe("evidence_added");
    expect(canonicalizeCommitmentEventType("execution_link_created")).toBe("execution_linked");
    expect(canonicalizeCommitmentEventType("review_cycle_created")).toBe("review_recorded");
    expect(canonicalizeCommitmentEventType("renegotiation_opened")).toBe("renegotiation_requested");
    expect(canonicalizeCommitmentEventType("commitment_updated")).toBe("commitment_updated");
  });

  it("converte health_changed_to_* para health_changed com payload coerente", () => {
    expect(canonicalizeCommitmentEventType("health_changed_to_overdue")).toBe("health_changed");
    expect(normalizeCommitmentEventPayload("health_changed_to_overdue", {})).toEqual({ health: "overdue" });
  });

  it("expõe raw_event_type e canonical_event_type ao normalizar registros", () => {
    const normalized = normalizeCommitmentEventRecord({
      id: "evt-1",
      tenant_id: "tenant-1",
      commitment_id: "commitment-1",
      event_type: "execution_link_created",
      actor_user_id: null,
      causation_type: null,
      causation_id: null,
      payload: { target_type: "project" },
      created_at: "2026-01-01T10:00:00.000Z",
    });

    expect(normalized.raw_event_type).toBe("execution_link_created");
    expect(normalized.canonical_event_type).toBe("execution_linked");
    expect(normalized.event_type).toBe("execution_linked");
    expect(normalized.payload).toEqual({ target_type: "project" });
  });
});
