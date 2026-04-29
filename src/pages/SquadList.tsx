import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Users, Wallet, Filter } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { brl } from "@/lib/costs";
import { listSquads, calculateAllSquadCosts } from "@/lib/squadsDb";

export default function SquadList() {
  const nav = useNavigate();
  const { user } = useAuth();
  const companyId = user?.companyId ?? (user as any)?.company_id ?? null;
  if (!user || !companyId) return null;

  const [showInactive, setShowInactive] = useState(false);
  const [typeFilter, setTypeFilter] = useState<"all" | "core" | "growth" | "support">("all");

  const { data: squads = [], isLoading } = useQuery({
    queryKey: ["squads", companyId, showInactive],
    queryFn: () => listSquads(companyId, showInactive),
  });

  const { data: squadCosts = [] } = useQuery({
    queryKey: ["squadCosts", companyId],
    queryFn: () => calculateAllSquadCosts(companyId),
    enabled: !!companyId,
  });

  const costsMap = useMemo(() => {
    const m: Record<string, number> = {};
    (squadCosts || []).forEach((c: any) => {
      if (c && c.squad_id) m[c.squad_id] = c.total_cost || 0;
    });
    return m;
  }, [squadCosts]);

  const filteredSquads = useMemo(() => {
    let filtered = squads;
    if (typeFilter !== "all") {
      filtered = filtered.filter((s) => s.type === typeFilter);
    }
    return filtered;
  }, [squads, typeFilter]);

  const activeCount = squads.filter((s) => s.active).length;
  const inactiveCount = squads.filter((s) => !s.active).length;

  return (
    <div className="grid gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[color:var(--sinaxys-ink)]">Squads</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie seus squads cross-functionais e acompanhe seus custos.
          </p>
        </div>
        {user.role === "ADMIN" && (
          <Button className="h-11 gap-2 rounded-xl" onClick={() => nav("/admin/squads/new")}>
            <Plus className="h-4 w-4" />
            Novo Squad
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ativos</div>
              <div className="mt-1 text-2xl font-semibold text-[color:var(--sinaxys-ink)]">{activeCount}</div>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-green-100">
              <Users className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Inativos</div>
              <div className="mt-1 text-2xl font-semibold text-[color:var(--sinaxys-ink)]">{inactiveCount}</div>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gray-100">
              <Users className="h-5 w-5 text-gray-600" />
            </div>
          </div>
        </Card>

        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total</div>
              <div className="mt-1 text-2xl font-semibold text-[color:var(--sinaxys-ink)]">{squads.length}</div>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
              <Wallet className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
            </div>
          </div>
        </Card>
      </div>

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Filtros:</span>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">Status:</label>
              <Select value={showInactive ? "all" : "active"} onValueChange={(v) => setShowInactive(v === "all")}>
                <SelectTrigger className="h-9 w-[140px] rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Apenas ativos</SelectItem>
                  <SelectItem value="all">Todos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">Tipo:</label>
              <Select value={typeFilter} onValueChange={(v: any) => setTypeFilter(v)}>
                <SelectTrigger className="h-9 w-[160px] rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="core">Core</SelectItem>
                  <SelectItem value="growth">Growth</SelectItem>
                  <SelectItem value="support">Support</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-3">
          {isLoading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Carregando...</div>
          ) : filteredSquads.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Nenhum squad encontrado.
              {user.role === "ADMIN" && (
                <Button
                  variant="link"
                  className="ml-1 h-auto p-0 text-[color:var(--sinaxys-primary)]"
                  onClick={() => nav("/admin/squads/new")}
                >
                  Criar novo squad
                </Button>
              )}
            </div>
          ) : (
            filteredSquads.map((squad) => (
              <button
                key={squad.id}
                className="group w-full rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-4 text-left transition hover:bg-[color:var(--sinaxys-tint)]/40"
                onClick={() => nav(`/admin/squads/${squad.id}`)}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">
                        {squad.name}
                      </div>
                      {!squad.active ? (
                        <Badge variant="secondary" className="h-5 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-100">
                          Inativo
                        </Badge>
                      ) : null}
                    </div>
                    {squad.product && (
                      <div className="mt-1 truncate text-xs text-muted-foreground">{squad.product}</div>
                    )}
                    {squad.type && (
                      <Badge className="mt-2 h-5 rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
                        {squad.type}
                      </Badge>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-4 text-right">
                    {squad.active && (
                      <div>
                        <div className="text-xs text-muted-foreground">Custo mensal</div>
                        <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">{(costsMap[squad.id] || 0) > 0 ? brl(costsMap[squad.id]) : "—"}</div>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}