import { Link } from "react-router-dom";
import { Award, Printer } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { getCertificatesForUser } from "@/lib/journeyDb";
import { formatShortDate } from "@/lib/sinaxys";

export default function AppCertificates() {
  const { user } = useAuth();
  if (!user) return null;

  const { data: certs = [], isLoading } = useQuery({
    queryKey: ["certificates", user.id],
    queryFn: () => getCertificatesForUser(user.id),
  });

  return (
    <div className="grid gap-6">
      <div className="rounded-3xl border bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Certificados</div>
            <p className="mt-1 text-sm text-muted-foreground">Conclusão reconhecida, com registro simples e direto.</p>
          </div>
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
            <Award className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
          </div>
        </div>
      </div>

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        {isLoading ? (
          <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">Carregando…</div>
        ) : certs.length ? (
          <div className="grid gap-3">
            {certs.map((c: any) => (
              <div
                key={c.id}
                className="flex flex-col justify-between gap-3 rounded-2xl border border-[color:var(--sinaxys-border)] p-4 md:flex-row md:items-center"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">{c.snapshot_track_title}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Emitido em {formatShortDate(c.issued_at)} • Código {c.certificate_code}
                  </div>
                </div>
                <div className="flex w-full flex-col items-stretch gap-2 sm:flex-row sm:items-center md:w-auto">
                  <Button asChild variant="outline" className="w-full rounded-xl sm:w-auto">
                    <Link to={`/app/certificates/${c.id}`}>Ver</Link>
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full rounded-xl sm:w-auto"
                    onClick={() => {
                      window.open(`/app/certificates/${c.id}?print=1`, "_blank");
                    }}
                  >
                    <Printer className="mr-2 h-4 w-4" />
                    Imprimir
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">
            Quando você concluir uma trilha, o certificado aparecerá aqui automaticamente.
          </div>
        )}
      </Card>
    </div>
  );
}
