import { useMemo } from "react";
import { BarChart3, Building2, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { listCompanies } from "@/lib/companiesDb";
import { listAllProfiles } from "@/lib/profilesDb";

export default function MasterOverview() {
  const { user } = useAuth();
  if (!user || user.role !== "MASTERADMIN") return null;

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => listCompanies(),
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-all"],
    queryFn: () => listAllProfiles(),
  });

  const activeCount = useMemo(() => profiles.filter((p) => p.active).length, [profiles]);

  return (
    <div className="grid gap-6">
      <div data-tour="master-overview-hero" className="rounded-3xl border bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Master Admin — Visão geral</div>
            <p className="mt-1 text-sm text-muted-foreground">Indicadores simples (Supabase). Sem seed/local mocks.</p>
          </div>
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
            <BarChart3 className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Empresas</div>
              <div className="mt-1 text-3xl font-semibold text-[color:var(--sinaxys-ink)]">{companies.length}</div>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
              <Building2 className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
            </div>
          </div>
          <div className="mt-3 text-sm text-muted-foreground">Tenants cadastrados em public.companies.</div>
        </Card>

        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Perfis</div>
              <div className="mt-1 text-3xl font-semibold text-[color:var(--sinaxys-ink)]">{profiles.length}</div>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
              <Users className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
            </div>
          </div>
          <div className="mt-3 text-sm text-muted-foreground">Registros em public.profiles.</div>
        </Card>

        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Perfis ativos</div>
          <div className="mt-1 text-3xl font-semibold text-[color:var(--sinaxys-ink)]">{activeCount}</div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
              active=true
            </Badge>
          </div>
        </Card>
      </div>
    </div>
  );
}