import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Users, Wallet, Building2, Trash2, Edit2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { brl, brlPerHourFromMonthly } from "@/lib/costs";
import { getSquadWithMembers, removeSquadMember, updateSquadMember } from "@/lib/squadsDb";
import { toast } from "sonner";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "";
  const b = parts[1]?.[0] ?? parts[0]?.[1] ?? "";
  return (a + b).toUpperCase();
}

export default function SquadDetail() {
  const { squadId } = useParams<{ squadId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  if (!squadId) return null;

  const { data: squad, isLoading } = useQuery({
    queryKey: ["squad", squadId],
    queryFn: () => getSquadWithMembers(squadId),
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      await removeSquadMember(memberId);
    },
    onSuccess: () => {
      toast.success("Membro removido com sucesso");
      queryClient.invalidateQueries({ queryKey: ["squad", squadId] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao remover membro");
    },
  });

  const isAdmin = user?.role === "ADMIN";

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center text-sm text-muted-foreground">
        Carregando...
      </div>
    );
  }

  if (!squad) {
    return (
      <div className="flex min-h-[400px] items-center justify-center text-sm text-muted-foreground">
        Squad não encontrado
      </div>
    );
  }

  const totalCost = squad.total_cost || 0;
  const memberCount = squad.member_count || 0;

  return (
    <div className="grid gap-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl" onClick={() => navigate("/admin/squads")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold text-[color:var(--sinaxys-ink)]">{squad.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{squad.product || "Sem produto definido"}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Custo Mensal</div>
              <div className="mt-1 text-2xl font-semibold text-[color:var(--sinaxys-ink)]">
                {totalCost > 0 ? brl(totalCost) : "—"}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {totalCost > 0 ? brlPerHourFromMonthly(totalCost) : "—"}
              </div>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
              <Wallet className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
            </div>
          </div>
        </Card>

        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Membros</div>
              <div className="mt-1 text-2xl font-semibold text-[color:var(--sinaxys-ink)]">{memberCount}</div>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
              <Users className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
            </div>
          </div>
        </Card>

        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tipo</div>
              <div className="mt-1 text-2xl font-semibold text-[color:var(--sinaxys-ink)]">
                {squad.type || "—"}
              </div>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
              <Building2 className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
            </div>
          </div>
        </Card>
      </div>

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-[color:var(--sinaxys-ink)]">Membros do Squad</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Pessoas alocadas neste squad com seus percentuais de dedicação.
            </p>
          </div>
          {isAdmin && (
            <Button className="h-9 gap-2 rounded-xl" onClick={() => {/* TODO: Open add member dialog */}}>
              <Plus className="h-4 w-4" />
              Adicionar Membro
            </Button>
          )}
        </div>

        <Separator className="my-4" />

        <ScrollArea className="h-[500px]">
          <div className="grid gap-3">
            {squad.members && squad.members.length > 0 ? (
              squad.members.map((member) => {
                const individualCost = member.user_monthly_cost_brl || 0;
                const squadCost = (individualCost * member.allocation_percentage) / 100;

                return (
                  <div
                    key={member.id}
                    className="flex items-start justify-between gap-4 rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-4"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <Avatar className="h-10 w-10 rounded-xl">
                        <AvatarImage src={member.user_avatar_url || undefined} alt={member.user_name || ""} />
                        <AvatarFallback className="bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]">
                          {initials(member.user_name || "")}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">
                            {member.user_name || member.user_email}
                          </div>
                          {member.role && (
                            <Badge className="h-5 rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
                              {member.role}
                            </Badge>
                          )}
                        </div>
                        <div className="mt-1 truncate text-xs text-muted-foreground">
                          {member.user_job_title || "Cargo não informado"}
                        </div>
                        {member.user_department_name && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            <Building2 className="mr-1 inline h-3 w-3" />
                            {member.user_department_name}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-start gap-6">
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Alocação</div>
                        <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">
                          {member.allocation_percentage}%
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Custo individual</div>
                        <div className="text-sm font-medium text-[color:var(--sinaxys-ink)]">
                          {individualCost > 0 ? brl(individualCost) : "—"}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Custo no squad</div>
                        <div className="text-sm font-semibold text-[color:var(--sinaxys-primary)]">
                          {squadCost > 0 ? brl(squadCost) : "—"}
                        </div>
                      </div>

                      {isAdmin && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg"
                            onClick={() => {/* TODO: Open edit dialog */}}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-destructive hover:text-destructive"
                            onClick={() => removeMemberMutation.mutate(member.id)}
                            disabled={removeMemberMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-10 text-center text-sm text-muted-foreground">
                Nenhum membro neste squad ainda.
                {isAdmin && (
                  <Button
                    variant="link"
                    className="ml-1 h-auto p-0 text-[color:var(--sinaxys-primary)]"
                    onClick={() => {/* TODO: Open add member dialog */}}
                  >
                    Adicionar membro
                  </Button>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
}
