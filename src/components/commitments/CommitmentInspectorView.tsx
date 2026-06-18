import { CommitmentInspectorHeader } from "@/components/commitments/CommitmentInspectorHeader";
import { CommitmentInspectorSection } from "@/components/commitments/CommitmentInspectorSection";
import { CommitmentInspectorStatusHealth } from "@/components/commitments/CommitmentInspectorStatusHealth";
import { CommitmentPartiesList } from "@/components/commitments/CommitmentPartiesList";
import { CommitmentTimelineList } from "@/components/commitments/CommitmentTimelineList";
import { CommitmentDependenciesList } from "@/components/commitments/CommitmentDependenciesList";
import { CommitmentEvidenceList } from "@/components/commitments/CommitmentEvidenceList";
import { CommitmentExecutionLinksList } from "@/components/commitments/CommitmentExecutionLinksList";
import type { CommitmentInspectorBundle } from "@/lib/commitmentInspectorDb";

export function CommitmentInspectorView({ bundle }: { bundle: CommitmentInspectorBundle }) {
  return (
    <div className="space-y-4 sm:space-y-5">
      <CommitmentInspectorHeader commitment={bundle.commitment} />
      <CommitmentInspectorStatusHealth commitment={bundle.commitment} />

      <CommitmentInspectorSection title="Parties" eyebrow="Bloco 01">
        <CommitmentPartiesList parties={bundle.parties} />
      </CommitmentInspectorSection>

      <CommitmentInspectorSection title="Timeline" eyebrow="Bloco 02">
        <CommitmentTimelineList timeline={bundle.timeline} />
      </CommitmentInspectorSection>

      <CommitmentInspectorSection title="Dependencies abertas" eyebrow="Bloco 03">
        <CommitmentDependenciesList dependencies={bundle.openDependencies} />
      </CommitmentInspectorSection>

      <CommitmentInspectorSection title="Evidências" eyebrow="Bloco 04">
        <CommitmentEvidenceList evidence={bundle.evidence} />
      </CommitmentInspectorSection>

      <CommitmentInspectorSection title="Execution links" eyebrow="Bloco 05">
        <CommitmentExecutionLinksList executionLinks={bundle.executionLinks} />
      </CommitmentInspectorSection>
    </div>
  );
}
