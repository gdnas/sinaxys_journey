import { ShieldAlert } from "lucide-react";
import { useParams } from "react-router-dom";
import { CommitmentInspectorView } from "@/components/commitments/CommitmentInspectorView";
import { CommitmentInspectorSkeleton } from "@/components/commitments/CommitmentInspectorSkeleton";
import { Card } from "@/components/ui/card";
import { useCommitmentInspector } from "@/hooks/useCommitmentInspector";
import { getErrorMessage } from "@/lib/errorMessage";

function FullPageState({ title, description }: { title: string; description: string }) {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <Card className="w-full max-w-xl rounded-[32px] border-[color:var(--sinaxys-border)] bg-white/95 p-8 text-center shadow-sm dark:bg-[color:var(--sinaxys-tint)]/85">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)]/70 text-[color:var(--sinaxys-primary)]">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-[color:var(--sinaxys-ink)]">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-[color:var(--sinaxys-ink)]/72">{description}</p>
      </Card>
    </div>
  );
}

export default function CommitmentInspectorPage() {
  const { commitmentId } = useParams<{ commitmentId: string }>();
  const { data, isLoading, isError, error, isNotFound } = useCommitmentInspector(commitmentId);

  if (!commitmentId) {
    return (
      <main className="min-h-screen bg-[color:var(--sinaxys-bg)] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <FullPageState
            title="Compromisso não encontrado ou sem permissão de leitura."
            description="A rota precisa de um commitmentId válido para abrir o inspector somente leitura."
          />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[color:var(--sinaxys-bg)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--sinaxys-primary)]">Read-only route</div>
          <h1 className="text-2xl font-semibold tracking-tight text-[color:var(--sinaxys-ink)] sm:text-3xl">Commitment Inspector</h1>
          <p className="break-all text-sm text-[color:var(--sinaxys-ink)]/68">/commitments/{commitmentId}</p>
        </div>

        {isLoading ? <CommitmentInspectorSkeleton /> : null}

        {isError ? (
          <FullPageState
            title="Não foi possível carregar o compromisso."
            description={getErrorMessage(error)}
          />
        ) : null}

        {isNotFound ? (
          <FullPageState
            title="Compromisso não encontrado ou sem permissão de leitura."
            description="Em ambientes com RLS, a interface não consegue distinguir com segurança entre registro inexistente e falta de acesso apenas pelo resultado da leitura."
          />
        ) : null}

        {data ? <CommitmentInspectorView bundle={data} /> : null}
      </div>
    </main>
  );
}
