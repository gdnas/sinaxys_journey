import { useMemo } from "react";
import { Link, useSearchParams, useParams } from "react-router-dom";
import { ArrowLeft, Printer, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { mockDb } from "@/lib/mockDb";
import { formatLongDate } from "@/lib/sinaxys";

export default function CertificateView() {
  const { user } = useAuth();
  const { certificateId } = useParams();
  const [sp] = useSearchParams();
  const printMode = sp.get("print") === "1";

  const cert = useMemo(() => {
    if (!certificateId) return null;
    return mockDb.getCertificate(certificateId);
  }, [certificateId]);

  if (!user || !cert) {
    return (
      <div className="rounded-3xl border bg-white p-6">
        <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Certificado não encontrado</div>
        <p className="mt-1 text-sm text-muted-foreground">Verifique o link ou volte para seus certificados.</p>
        <Button asChild variant="outline" className="mt-4 rounded-xl">
          <Link to="/app/certificates">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className={printMode ? "p-0" : "grid gap-6"}>
      {!printMode ? (
        <div className="flex flex-col justify-between gap-3 rounded-3xl border bg-white p-6 md:flex-row md:items-center">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Certificado</div>
            <p className="mt-1 text-sm text-muted-foreground">Uma confirmação simples e verificável da conclusão da trilha.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" className="rounded-xl">
              <Link to="/app/certificates">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Link>
            </Button>
            <Button
              className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              onClick={() => window.print()}
            >
              <Printer className="mr-2 h-4 w-4" />
              Imprimir
            </Button>
          </div>
        </div>
      ) : null}

      <Card
        className={
          "rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-0 shadow-sm " +
          (printMode ? "border-0 shadow-none" : "")
        }
      >
        <div className="relative overflow-hidden rounded-3xl p-8 md:p-10">
          <div className="absolute inset-0 bg-[color:var(--sinaxys-tint)]/50" />
          <div className="relative">
            <div className="flex items-start justify-between gap-6">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-[color:var(--sinaxys-ink)]">
                  Sinaxys Journey
                </div>
                <h1 className="mt-2 text-2xl font-semibold leading-tight text-[color:var(--sinaxys-ink)] md:text-3xl">
                  Certificado de Conclusão
                </h1>
                <p className="mt-2 max-w-prose text-sm text-muted-foreground">
                  Este certificado confirma a conclusão integral da trilha, seguindo uma sequência obrigatória de módulos.
                </p>
              </div>
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white">
                <ShieldCheck className="h-6 w-6 text-[color:var(--sinaxys-primary)]" />
              </div>
            </div>

            <div className="mt-8 rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-6">
              <div className="text-sm text-muted-foreground">Certificamos que</div>
              <div className="mt-1 text-xl font-semibold text-[color:var(--sinaxys-ink)] md:text-2xl">{cert.snapshotUserName}</div>

              <div className="mt-5 text-sm text-muted-foreground">concluiu com êxito a trilha</div>
              <div className="mt-1 text-lg font-semibold text-[color:var(--sinaxys-ink)]">{cert.snapshotTrackTitle}</div>

              <div className="mt-6 flex flex-col gap-2 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
                <div>
                  Departamento: <span className="font-medium text-[color:var(--sinaxys-ink)]">{cert.snapshotDepartmentName}</span>
                </div>
                <div>
                  Emitido em <span className="font-medium text-[color:var(--sinaxys-ink)]">{formatLongDate(cert.issuedAt)}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-1 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
              <div>
                Código de verificação: <span className="font-medium text-[color:var(--sinaxys-ink)]">{cert.certificateCode}</span>
              </div>
              <div>
                Registro interno: <span className="font-medium text-[color:var(--sinaxys-ink)]">{cert.publicSlug}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <style>{`@media print { body { background: white !important; } header, aside { display: none !important; } }`}</style>
    </div>
  );
}
