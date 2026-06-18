import { afterEach, describe, expect, it, vi } from "vitest";
import {
  commitmentInspectorQueries,
  filterOpenCommitmentDependencies,
  getCommitmentInspectorBundle,
  sortCommitmentInspectorTimeline,
} from "@/lib/commitmentInspectorDb";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("commitmentInspectorDb", () => {
  it("retorna apenas dependências abertas", () => {
    const dependencies = filterOpenCommitmentDependencies([
      { id: "1", status: "open" },
      { id: "2", status: "resolved" },
      { id: "3", status: "open" },
    ] as any);

    expect(dependencies.map((item) => item.id)).toEqual(["1", "3"]);
  });

  it("ordena timeline em ordem decrescente", () => {
    const timeline = sortCommitmentInspectorTimeline([
      { id: "older", created_at: "2024-01-01T10:00:00.000Z" },
      { id: "newer", created_at: "2024-01-02T10:00:00.000Z" },
      { id: "middle", created_at: "2024-01-01T15:00:00.000Z" },
    ] as any);

    expect(timeline.map((item) => item.id)).toEqual(["newer", "middle", "older"]);
  });

  it("retorna null quando compromisso não existe ou não está visível", async () => {
    vi.spyOn(commitmentInspectorQueries, "getCommitmentInspectorCommitment").mockResolvedValue(null);

    const bundle = await getCommitmentInspectorBundle("commitment-1");

    expect(bundle).toBeNull();
  });

  it("monta o bundle read-only quando o compromisso existe", async () => {
    vi.spyOn(commitmentInspectorQueries, "getCommitmentInspectorCommitment").mockResolvedValue({ id: "commitment-1", title: "Entrega" } as any);
    vi.spyOn(commitmentInspectorQueries, "listCommitmentInspectorParties").mockResolvedValue([{ id: "party-1" }] as any);
    vi.spyOn(commitmentInspectorQueries, "listCommitmentInspectorTimeline").mockResolvedValue([{ id: "event-1" }] as any);
    vi.spyOn(commitmentInspectorQueries, "listOpenCommitmentDependencies").mockResolvedValue([{ id: "dependency-1", status: "open" }] as any);
    vi.spyOn(commitmentInspectorQueries, "listCommitmentInspectorEvidence").mockResolvedValue([{ id: "evidence-1" }] as any);
    vi.spyOn(commitmentInspectorQueries, "listCommitmentInspectorExecutionLinks").mockResolvedValue([{ id: "execution-1" }] as any);

    const bundle = await getCommitmentInspectorBundle("commitment-1");

    expect(bundle).toMatchObject({
      commitment: { id: "commitment-1" },
      parties: [{ id: "party-1" }],
      timeline: [{ id: "event-1" }],
      openDependencies: [{ id: "dependency-1" }],
      evidence: [{ id: "evidence-1" }],
      executionLinks: [{ id: "execution-1" }],
    });
  });
});
