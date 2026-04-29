import { useMemo, useState } from "react";
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
import { getSquadWithMembers, removeSquadMember, updateSquadMember, createSquad } from "@/lib/squadsDb";
import { toast } from "sonner";
import { SquadForm } from "@/components/squads/SquadForm";
import { SquadMembersEditor } from "@/components/squads/SquadMembersEditor";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "";
  const b = parts[1]?.[0] ?? parts[0]?.[1] ?? "";
  return (a + b).toUpperCase();
}

function isUUID(v?: string) {
  return typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

export default function SquadDetail() {
  const { squadId } = useParams<{ squadId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [membersEditorOpen, setMembersEditorOpen] = useState(false);
  const companyId = user?.companyId ?? (user as any)?.company_id ?? null;

  if (!squadId) return null;
  if (!user || !companyId) return null;

  const isNew = squadId === "new";
  const validId = isUUID(squadId);

  if (isNew) {
    return (
      <div className="grid gap-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-[color:var(--sinaxys-ink)]">Novo Squad</h1>
            <p className="mt-1 text-sm text-muted-foreground">Crie um novo squad cross-functional.</p>
          </div>
          <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl" onClick={() => navigate("/admin/squads")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>

        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
          <SquadForm
            open={true}
            onOpenChange={(open) => {
              if (!open) navigate("/admin/squads");
            }}
            companyId={companyId}
            onSave={async (data: any) => {
              const squad = await createSquad(data as any);
              navigate(`/admin/squads/${squad.id}`);
            }}
          />
        </Card>
      </div>
    );
  }

  if (!validId) {
    return (
      <div className="flex min-h-[400px] items-center justify-center text-sm text-muted-foreground">
        Squad não encontrado
      </div>
    );
  }

  const { data: squad, isLoading } = useQuery({
    queryKey: ["squad", squadId],
    queryFn: () => getSquadWithMembers(squadId),
    enabled: !!squadId && validId,
  });

  const removeMemberMutation = useMutation({
    mutationFn: (memberId: string) => removeSquadMember(memberId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["squad", squadId] });
      await queryClient.invalidateQueries({ queryKey: ["squads", companyId] });
      toast.success("Membro removido do squad");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao remover membro");
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ memberId, allocationPercentage, role }: { memberId: string; allocationPercentage: number; role: string }) =>
      updateSquadMember(memberId, allocationPercentage, role),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["squad", squadId] });
      toast.success("Papel atualizado");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao atualizar papel");
    },
  });

  const sortedMembers = useMemo(() => {
    if (!squad?.members) return [];
    return [...squad.members].sort((a, b) => {
      const roleOrder = { lead: 0, member: 1, advisor: 2 };
      const aOrder = roleOrder[a.role as keyof typeof roleOrder] ?? 99;
      const bOrder = roleOrder[b.role as keyof typeof roleOrder] ?? 99;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return (a.user_name || "").localeCompare(b.user_name || "");
    });
  }, [squad?.members]);

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center text-sm text-muted-foreground">
        Carregando squad...
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

  const totalCost = sortedMembers.reduce((sum, member) => sum + (member.user_monthly_cost_brl || 0), 0);

  return (
    <div className="grid gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl" onClick={() => navigate("/admin/squads")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-[color:var(--sinaxys-ink)]">{squad.name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{squad.product || "Squad cross-functional"}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-xl" onClick={() => setMembersEditorOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Gerenciar membros
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Membros</div>
              <div className="mt-1 text-2xl font-semibold text-[color:var(--sinaxys-ink)]">{sortedMembers.length}</div>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
              <Users className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
            </div>
          </div>
        </Card>

        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Custo mensal</div>
              <div className="mt-1 text-2xl font-semibold text-[color:var(--sinaxys-ink)]">{brl(totalCost)}</div>
              <div className="mt-1 text-xs text-muted-foreground">{brlPerHourFromMonthly(totalCost)}</div>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
              <Wallet className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
            </div>
          </div>
        </Card>

        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tipo</div>
              <div className="mt-1 text-2xl font-semibold capitalize text-[color:var(--sinaxys-ink)]">{squad.type}</div>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
              <Building2 className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
            </div>
          </div>
        </Card>
      </div>

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Membros do squad</div>
            <p className="mt-1 text-sm text-muted-foreground">Veja custos, papéis e edite a composição do squad.</p>
          </div>
        </div>

        <Separator className="my-5" />

        <ScrollArea className="max-h-[600px]">
          <div className="grid gap-3">
            {sortedMembers.map((member) => {
              const name = member.user_name || member.user_email || "Usuário";
              const cost = member.user_monthly_cost_brl || 0;

              return (
                <div key={member.id} className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar className="h-12 w-12 rounded-2xl">
                        <AvatarImage src={member.user_avatar_url || undefined} alt={name} />
                        <AvatarFallback className="rounded-2xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]">{initials(name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-[color:var(--sinaxys-ink)]">{name}</div>
                        <div className="mt-1 text-sm text-muted-foreground">{member.user_job_title || "Sem cargo"}</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] capitalize hover:bg-[color:var(--sinaxys-tint)]">
                            {member.role || "member"}
                          </Badge>
                          <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white">
                            {member.user_department_name || "Sem departamento"}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-xl"
                        onClick={() => {
                          const roles = ["lead", "member", "advisor"];
                          const currentIndex = roles.indexOf(member.role || "member");
                          const nextRole = roles[(currentIndex + 1) % roles.length];
                          updateRoleMutation.mutate({
                            memberId: member.id,
                            allocationPercentage: member.allocation_percentage,
                            role: nextRole,
                          });
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-xl text-destructive hover:text-destructive"
                        onClick={() => removeMemberMutation.mutate(member.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2 rounded-xl bg-[color:var(--sinaxys-tint)]/30 p-3 sm:grid-cols-2">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Custo mensal</div>
                      <div className="mt-1 text-sm font-semibold text-[color:var(--sinaxys-ink)]">{cost ? brl(cost) : "—"}</div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Custo/hora</div>
                      <div className="mt-1 text-sm font-semibold text-[color:var(--sinaxys-ink)]">{cost ? brlPerHourFromMonthly(cost) : "—"}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </Card>

      <SquadMembersEditor
        open={membersEditorOpen}
        onOpenChange={setMembersEditorOpen}
        squadId={squad.id}
        companyId={companyId}
        existingMembers={sortedMembers}
      />
    </div>
  );
}