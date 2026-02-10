import { useMemo } from "react";
import { BriefcaseBusiness, Building2, Mail, Phone, Sparkles, UserRound } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { getTotalXpForUser } from "@/lib/journeyDb";
import type { DbProfile } from "@/lib/profilesDb";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "";
  const b = parts[1]?.[0] ?? parts[0]?.[1] ?? "";
  return (a + b).toUpperCase();
}

function displayName(p: DbProfile) {
  return p.name?.trim() ? p.name.trim() : p.email;
}

export function OrgPersonDialog({
  open,
  onOpenChange,
  profile,
  departmentName,
  companyId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  profile: DbProfile | null;
  departmentName: string | null;
  companyId: string;
}) {
  const title = profile ? displayName(profile) : "Pessoa";

  const { data: xp = 0, isLoading: isLoadingXp } = useQuery({
    queryKey: ["user-xp", companyId, profile?.id],
    queryFn: () => getTotalXpForUser({ companyId, userId: profile!.id }),
    enabled: !!profile?.id,
  });

  const safeEmail = profile?.email ?? "—";
  const safePhone = profile?.phone?.trim() ? profile.phone.trim() : "—";
  const safeJob = profile?.job_title?.trim() ? profile.job_title.trim() : "—";
  const safeDept = departmentName ?? "Sem departamento";

  const statusBadge = useMemo(() => {
    if (!profile) return null;
    if (!profile.active) {
      return <Badge className="rounded-full bg-amber-100 text-amber-900 hover:bg-amber-100">Inativo</Badge>;
    }
    return <Badge className="rounded-full bg-emerald-100 text-emerald-900 hover:bg-emerald-100">Ativo</Badge>;
  }, [profile]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-[92vw] overflow-y-auto rounded-3xl p-0 sm:max-w-xl">
        <div className="relative overflow-hidden rounded-3xl">
          <div className="absolute inset-0 bg-[color:var(--sinaxys-tint)]/45" />
          <div className="relative p-6">
            <DialogHeader>
              <DialogTitle className="text-[color:var(--sinaxys-ink)]">Pessoa</DialogTitle>
            </DialogHeader>

            {!profile ? (
              <div className="mt-4 rounded-2xl bg-white/70 p-4 text-sm text-muted-foreground">Selecione uma pessoa no organograma.</div>
            ) : (
              <Card className="mt-4 rounded-3xl border-[color:var(--sinaxys-border)] bg-white/90 p-5 backdrop-blur">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-14 w-14 ring-2 ring-[color:var(--sinaxys-border)]">
                      <AvatarImage src={profile.avatar_url ?? undefined} alt={title} />
                      <AvatarFallback className="bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]">
                        {initials(title)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="truncate text-base font-semibold text-[color:var(--sinaxys-ink)]">{title}</div>
                        {statusBadge}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span className="truncate">{safeEmail}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-4 sm:min-w-[190px]">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">XP acumulado</div>
                        <div className="mt-1 text-2xl font-semibold text-[color:var(--sinaxys-ink)]">{isLoadingXp ? "…" : xp}</div>
                      </div>
                      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
                        <Sparkles className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
                      </div>
                    </div>
                  </div>
                </div>

                <Separator className="my-5" />

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cargo</div>
                        <div className="mt-1 text-sm font-semibold text-[color:var(--sinaxys-ink)]">{safeJob}</div>
                      </div>
                      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
                        <BriefcaseBusiness className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Departamento</div>
                        <div className="mt-1 text-sm font-semibold text-[color:var(--sinaxys-ink)]">{safeDept}</div>
                      </div>
                      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
                        <Building2 className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-4 sm:col-span-2">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-[color:var(--sinaxys-primary)]" />
                        <span className="font-semibold text-[color:var(--sinaxys-ink)]">Telefone</span>
                      </div>
                      <div className="text-sm text-muted-foreground">{safePhone}</div>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-[color:var(--sinaxys-tint)]/50 p-4 sm:col-span-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <UserRound className="h-4 w-4" />
                      XP é calculado pela soma de módulos concluídos (earned_xp) nas trilhas.
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex justify-end">
                  <Button variant="outline" className="h-10 rounded-xl" onClick={() => onOpenChange(false)}>
                    Fechar
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}