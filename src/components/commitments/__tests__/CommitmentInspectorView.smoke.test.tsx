import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CommitmentInspectorView } from "@/components/commitments/CommitmentInspectorView";
import type { CommitmentInspectorBundle } from "@/lib/commitmentInspectorDb";
import CommitmentInspectorPage from "@/pages/CommitmentInspector";
import { useCommitmentInspector } from "@/hooks/useCommitmentInspector";

vi.mock("@/hooks/useCommitmentInspector", () => ({
  useCommitmentInspector: vi.fn(),
}));

const mockedUseCommitmentInspector = vi.mocked(useCommitmentInspector);

function makeBundle(overrides?: Partial<CommitmentInspectorBundle>): CommitmentInspectorBundle {
  return {

    commitment: {
      id: "commitment-1",
      tenant_id: "tenant-1",
      code: "COM-001",
      title: "Fechar operação mensal",
      description: "Consolidar evidências e dependências para o fechamento.",
      purpose: "Garantir visibilidade operacional.",
      scope_summary: null,
      success_criteria: null,
      conditions_of_satisfaction: null,
      category: "operational",
      commitment_type: "bilateral",
      status: "active",
      health: "healthy",
      confidence_level: null,
      priority: "high",
      acceptance_policy: "receiver_only",
      evidence_required: true,
      review_cadence: null,
      strategic_context_id: null,
      strategic_context_type: null,
      origin_decision_id: null,
      primary_owner_user_id: "user-owner",
      primary_receiver_user_id: "user-receiver",
      primary_receiver_team_id: null,
      review_owner_id: null,
      start_date: "2024-01-01T00:00:00.000Z",
      due_date: "2024-01-31T00:00:00.000Z",
      accepted_by_owner_at: null,
      accepted_by_receiver_at: null,
      accepted_at: null,
      activated_at: null,
      fulfilled_at: null,
      closed_at: null,
      closed_reason: null,
      current_version: 1,
      next_review_at: null,
      last_reviewed_at: null,
      created_by: "user-owner",
      created_at: "2024-01-01T00:00:00.000Z",
      updated_at: "2024-01-02T00:00:00.000Z",
    },
    parties: [
      {
        id: "party-1",
        tenant_id: "tenant-1",
        commitment_id: "commitment-1",
        party_type: "user",
        user_id: "user-owner",
        team_id: null,
        role: "owner",
        is_primary: true,
        acceptance_required: true,
        accepted_at: null,
        declined_at: null,
        active: true,
        created_at: "2024-01-01T00:00:00.000Z",
        updated_at: "2024-01-01T00:00:00.000Z",
      },
    ],
    timeline: [
      {
        id: "event-1",
        tenant_id: "tenant-1",
        commitment_id: "commitment-1",
        event_type: "commitment_updated",
        raw_event_type: "commitment_updated",
        canonical_event_type: "commitment_updated",
        actor_user_id: "user-owner",
        causation_type: null,
        causation_id: null,
        payload: { status: "active" },
        created_at: "2024-01-03T00:00:00.000Z",
      },
    ],
    openDependencies: [
      {
        id: "dependency-1",
        tenant_id: "tenant-1",
        commitment_id: "commitment-1",
        dependency_kind: "requires_input",
        depends_on_type: "project",
        depends_on_commitment_id: null,
        depends_on_project_id: "project-1",
        depends_on_work_item_id: null,
        depends_on_decision_id: null,
        external_label: null,
        is_blocking: true,
        status: "open",
        due_at: "2024-01-20T00:00:00.000Z",
        resolved_at: null,
        created_by: "user-owner",
        created_at: "2024-01-02T00:00:00.000Z",
      },
    ],
    evidence: [
      {
        id: "evidence-1",
        tenant_id: "tenant-1",
        commitment_id: "commitment-1",
        evidence_type: "document",
        title: "Ata consolidada",
        description: "Ata final com links de suporte.",
        url: "https://example.com/evidence",
        file_id: null,
        payload: {},
        is_final: true,
        submitted_by: "user-owner",
        submitted_at: "2024-01-04T00:00:00.000Z",
      },
    ],
    executionLinks: [
      {
        id: "execution-1",
        tenant_id: "tenant-1",
        commitment_id: "commitment-1",
        target_type: "project",
        project_id: "project-1",
        work_item_id: null,
        okr_task_id: null,
        external_ref: null,
        role: "tracks",
        created_by: "user-owner",
        created_at: "2024-01-05T00:00:00.000Z",
      },
    ],
    ...overrides,
  } as CommitmentInspectorBundle;
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("CommitmentInspectorView smoke", () => {
  it("renderiza header, status, health e todas as seções", () => {
    render(<CommitmentInspectorView bundle={makeBundle()} />);

    expect(screen.getByText("Fechar operação mensal")).toBeTruthy();
    expect(screen.getByText("Status e health materializados")).toBeTruthy();
    expect(screen.getByText("Parties")).toBeTruthy();
    expect(screen.getByText("Timeline")).toBeTruthy();
    expect(screen.getByText("Dependencies abertas")).toBeTruthy();
    expect(screen.getByText("Evidências")).toBeTruthy();
    expect(screen.getByText("Execution links")).toBeTruthy();

  });

  it("mostra empty states quando as listas vêm vazias", () => {
    render(
      <CommitmentInspectorView
        bundle={makeBundle({
          parties: [],
          timeline: [],
          openDependencies: [],
          evidence: [],
          executionLinks: [],
        })}
      />,
    );

    expect(screen.getByText("Sem parties adicionais")).toBeTruthy();
    expect(screen.getByText("Sem eventos registrados")).toBeTruthy();
    expect(screen.getByText("Sem dependências abertas")).toBeTruthy();
    expect(screen.getByText("Sem evidências")).toBeTruthy();
    expect(screen.getByText("Sem execution links")).toBeTruthy();

  });

  it("renderiza a mensagem de não encontrado ou sem acesso na página", () => {
    mockedUseCommitmentInspector.mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
      error: null,
      isNotFound: true,
    } as any);

    render(
      <MemoryRouter initialEntries={["/commitments/commitment-1"]}>
        <Routes>
          <Route path="/commitments/:commitmentId" element={<CommitmentInspectorPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Compromisso não encontrado ou sem permissão de leitura.")).toBeTruthy();

  });
});
