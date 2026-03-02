import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Medal, Plus, Sparkles, Trophy } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useCompany } from "@/lib/company";
import {
  addPointsBonus,
  createRewardTier,
  deleteRewardTier,
  fetchLeaderboard,
  getMyPointsEvents,
  listPointsRules,
  listPublicProfiles,
  listRewardTiers,
  updatePointsRule,
  updateRewardTier,
  type LeaderboardRow,
  type PointsRuleRow,
  type PublicProfileRow,
  type RewardTierRow,
} from "@/lib/pointsDb";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollableTabsList } from "@/components/ScrollableTabsList";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "";
  const b = parts[1]?.[0] ?? parts[0]?.[1] ?? "";
  return (a + b).toUpperCase();
}

function formatPts(n: number) {
  return new Intl.NumberFormat("pt-BR").format(Math.round(n));
}

function safeInt(v: string) {
  const n = Number(String(v).replace(/[^0-9-]/g, ""));
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

function TopBanner() {
  return (
    <Card className="relative overflow-hidden rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-tint)] px-3 py-1 text-xs font-semibold text-[color:var(--sinaxys-ink)]">
            <span className="grid h-5 w-5 place-items-center rounded-full bg-white ring-1 ring-[color:var(--sinaxys-border)]">
              <Sparkles className="h-3.5 w-3.5 text-[color:var(--sinaxys-primary)]" />
            </span>
            Points
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[color:var(--sinaxys-ink)] sm:text-3xl">Ranking & recompensas</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Pontos são ganhos automaticamente ao concluir módulos. Use o ranking como bússola de evolução — e celebre os marcos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] ring-1 ring-[color:var(--sinaxys-border)]">
            <Trophy className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
          </div>
        </div>
      </div>
    </Card>
  );
}

function StatCard({ title, value, hint, icon }: { title: string; value: string; hint?: string; icon: React.ReactNode }) {
  return (
    <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</div>
          <div className="mt-2 text-2xl font-semibold text-[color:var(--sinaxys-ink)]">{value}</div>
          {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)] ring-1 ring-[color:var(--sinaxys-border)]">
          {icon}
        </div>
      </div>
    </Card>
  );
}

function CurrentTier({ tiers, myPoints }: { tiers: RewardTierRow[]; myPoints: number }) {
  const active = tiers.filter((t) => t.active).sort((a, b) => a.min_points - b.min_points);
  const current = [...active].reverse().find((t) => myPoints >= t.min_points) ?? null;
  const next = active.find((t) => t.min_points > myPoints) ?? null;

  return (
    <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Seu prêmio</div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {current ? (
              <>
                <Badge className="rounded-full bg-[color:var(--sinaxys-primary)] px-3 py-1 text-white hover:bg-[color:var(--sinaxys-primary)]">
                  {current.name}
                </Badge>
                <span className="text-sm text-muted-foreground">— {current.prize}</span>
              </>
            ) : (
              <span className="text-sm font-medium text-[color:var(--sinaxys-ink)]">Ainda sem prêmio</span>
            )}
          </div>
          {next ? (
            <div className="mt-2 text-xs text-muted-foreground">
              Próximo: <span className="font-semibold text-[color:var(--sinaxys-ink)]">{next.name}</span> em {formatPts(next.min_points - myPoints)} pontos.
            </div>
          ) : (
            <div className="mt-2 text-xs text-muted-foreground">Você está no topo do quadro atual.</div>
          )}
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)] ring-1 ring-[color:var(--sinaxys-border)]">
          <Medal className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

function LeaderboardList({ leaderboard, profiles, myUserId }: { leaderboard: LeaderboardRow[]; profiles: PublicProfileRow[]; myUserId: string }) {
  const byId = useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles]);

  return (
    <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-5">
      <div className="grid gap-3">
        {leaderboard.map((r, idx) => {
          const p = byId.get(r.user_id);
          const label = p?.name?.trim() || p?.email || "Usuário";
          const highlight = r.user_id === myUserId;
          return (
            <div
              key={r.user_id}
              className={cn(
                "flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] px-4 py-3",
                highlight ? "ring-2 ring-[color:var(--sinaxys-primary)]/30" : "",
              )}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-[color:var(--sinaxys-tint)] text-xs font-semibold text-[color:var(--sinaxys-ink)] ring-1 ring-[color:var(--sinaxys-border)]">
                  {idx + 1}
                </div>
                <Avatar className="h-9 w-9 rounded-2xl ring-1 ring-[color:var(--sinaxys-border)]">
                  <AvatarImage src={p?.avatar_url ?? undefined} alt="" />
                  <AvatarFallback className="rounded-2xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)]">
                    {initials(label)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">{label}</div>
                  {p?.department_name ? <div className="truncate text-xs text-muted-foreground">{p.department_name}</div> : null}
                </div>
              </div>
              <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white">{formatPts(r.total_points)}</Badge>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function ActivityList({ items }: { items: { id: string; created_at: string; points: number; rule_key: string; note: string | null }[] }) {
  return (
    <div className="mt-4 grid gap-2">
      {items.length === 0 ? (
        <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">Nada por aqui ainda.</div>
      ) : null}

      {items.map((e) => (
        <div key={e.id} className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">{e.rule_key}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {new Date(e.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
              {e.note ? <span> • {e.note}</span> : null}
            </div>
          </div>
          <Badge className={cn("rounded-full px-3 py-1", e.points >= 0 ? "bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]" : "bg-red-50 text-red-700 hover:bg-red-50")}>{e.points >= 0 ? `+${formatPts(e.points)}` : formatPts(e.points)}</Badge>
        </div>
      ))}
    </div>
  );
}

function AdminBonusCard({ companyId, people }: { companyId: string; people: PublicProfileRow[] }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [targetId, setTargetId] = useState<string>("");
  const [points, setPoints] = useState<string>("10");
  const [note, setNote] = useState<string>("");

  if (!user || user.role !== "ADMIN") return null;

  const sorted = [...people].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  return (
    <Card className="mt-4 rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Bônus manual</div>
          <div className="mt-1 text-sm text-muted-foreground">Use para reconhecer contribuições fora da trilha (ex.: apoio, aula gravada, melhoria).</div>
        </div>
        <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white ring-1 ring-[color:var(--sinaxys-border)]">ADMIN</Badge>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="md:col-span-1">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pessoa</div>
          <select
            className="mt-2 h-11 w-full rounded-xl border border-[color:var(--sinaxys-border)] bg-white px-3 text-sm text-[color:var(--sinaxys-ink)] outline-none focus:ring-2 focus:ring-[color:var(--sinaxys-primary)]/20"
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
          >
            <option value="">Selecione…</option>
            {sorted.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pontos</div>
          <Input className="mt-2 h-11 rounded-xl border-[color:var(--sinaxys-border)]" value={points} onChange={(e) => setPoints(e.target.value)} />
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nota (opcional)</div>
          <Input className="mt-2 h-11 rounded-xl border-[color:var(--sinaxys-border)]" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: Aula gravada" />
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-muted-foreground">Os bônus aparecem imediatamente no histórico e no ranking.</div>
        <Button
          className="h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
          onClick={async () => {
            if (!targetId) {
              toast({ title: "Selecione uma pessoa." });
              return;
            }
            const n = safeInt(points);
            if (!n) {
              toast({ title: "Informe um valor de pontos válido." });
              return;
            }

            try {
              await addPointsBonus({ userId: targetId, points: n, note: note.trim() || null });
              setNote("");
              toast({ title: "Bônus aplicado." });
              await qc.invalidateQueries({ queryKey: ["points", "leaderboard", companyId] });
              await qc.invalidateQueries({ queryKey: ["points", "events", companyId, targetId] });
            } catch (e: any) {
              toast({ title: "Não foi possível aplicar o bônus.", description: e?.message ?? String(e) });
            }
          }}
        >
          Aplicar bônus
        </Button>
      </div>
    </Card>
  );
}

function RulesAdmin({ companyId, rules }: { companyId: string; rules: PointsRuleRow[] }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [draft, setDraft] = useState<Record<string, { points: string; active: boolean }>>({});

  if (!user || user.role !== "ADMIN") return null;

  return (
    <Card className="mt-4 rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Regras de pontos</div>
          <div className="mt-1 text-sm text-muted-foreground">Ajuste quanto cada tipo de ação vale daqui para frente.</div>
        </div>
        <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white ring-1 ring-[color:var(--sinaxys-border)]">ADMIN</Badge>
      </div>

      <div className="mt-4 grid gap-2">
        {rules.length === 0 ? (
          <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">Nenhuma regra cadastrada.</div>
        ) : null}

        {rules.map((r) => {
          const d = draft[r.id] ?? { points: String(r.points), active: r.active };
          return (
            <div key={r.id} className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{r.category}</div>
                  <div className="mt-1 truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">{r.label}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{r.key}</div>
                  {r.description ? <div className="mt-2 text-xs text-muted-foreground">{r.description}</div> : null}
                </div>

                <div className="flex flex-col gap-2 md:items-end">
                  <div className="flex items-center gap-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ativa</div>
                    <Switch
                      checked={d.active}
                      onCheckedChange={(v) => setDraft((prev) => ({ ...prev, [r.id]: { ...d, active: v } }))}
                      className="data-[state=checked]:bg-[color:var(--sinaxys-primary)]"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Input
                      className="h-10 w-28 rounded-xl border-[color:var(--sinaxys-border)]"
                      value={d.points}
                      onChange={(e) => setDraft((prev) => ({ ...prev, [r.id]: { ...d, points: e.target.value } }))}
                    />
                    <Button
                      variant="outline"
                      className="h-10 rounded-xl border-[color:var(--sinaxys-border)]"
                      onClick={async () => {
                        try {
                          await updatePointsRule(r.id, { points: safeInt(d.points), active: d.active });
                          toast({ title: "Regra salva." });
                          await qc.invalidateQueries({ queryKey: ["points", "rules", companyId] });
                        } catch (e: any) {
                          toast({ title: "Erro ao salvar regra", description: e?.message ?? String(e) });
                        }
                      }}
                    >
                      Salvar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function TiersAdmin({ companyId, tiers }: { companyId: string; tiers: RewardTierRow[] }) {
  const qc = useQueryClient();
  const { user } = useAuth();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [minPoints, setMinPoints] = useState("100");
  const [prize, setPrize] = useState("");
  const [description, setDescription] = useState("");

  if (!user || user.role !== "ADMIN") return null;

  return (
    <Card className="mt-4 rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Prêmios</div>
          <div className="mt-1 text-sm text-muted-foreground">Defina marcos para reconhecer evolução (ex.: brindes, cursos, bônus).</div>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="h-10 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90">
              <Plus className="mr-2 h-4 w-4" />
              Novo prêmio
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[88vh] max-w-[92vw] overflow-y-auto rounded-3xl sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-[color:var(--sinaxys-ink)]">Criar prêmio</DialogTitle>
            </DialogHeader>

            <div className="grid gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nome</div>
                <Input className="mt-2 h-11 rounded-xl border-[color:var(--sinaxys-border)]" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Bronze" />
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pontos mínimos</div>
                <Input className="mt-2 h-11 rounded-xl border-[color:var(--sinaxys-border)]" value={minPoints} onChange={(e) => setMinPoints(e.target.value)} />
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Prêmio</div>
                <Input className="mt-2 h-11 rounded-xl border-[color:var(--sinaxys-border)]" value={prize} onChange={(e) => setPrize(e.target.value)} placeholder="Ex.: Livro + adesivos" />
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Descrição (opcional)</div>
                <Textarea className="mt-2 min-h-24 rounded-2xl border-[color:var(--sinaxys-border)]" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Regras, observações, etc." />
              </div>

              <Button
                className="h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                onClick={async () => {
                  if (!name.trim() || !prize.trim()) {
                    toast({ title: "Nome e prêmio são obrigatórios." });
                    return;
                  }
                  try {
                    await createRewardTier({
                      companyId,
                      name: name.trim(),
                      minPoints: Math.max(0, safeInt(minPoints)),
                      prize: prize.trim(),
                      description: description.trim() || null,
                    });
                    setOpen(false);
                    setName("");
                    setPrize("");
                    setDescription("");
                    toast({ title: "Prêmio criado." });
                    await qc.invalidateQueries({ queryKey: ["points", "tiers", companyId] });
                  } catch (e: any) {
                    toast({ title: "Erro ao criar prêmio", description: e?.message ?? String(e) });
                  }
                }}
              >
                Criar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-4 grid gap-2">
        {tiers.length === 0 ? (
          <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">Nenhum prêmio ainda.</div>
        ) : null}

        {tiers.map((t) => (
          <div key={t.id} className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">{t.name}</div>
                  <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">{formatPts(t.min_points)} pts</Badge>
                  {!t.active ? <Badge className="rounded-full bg-white text-muted-foreground hover:bg-white ring-1 ring-[color:var(--sinaxys-border)]">inativo</Badge> : null}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">{t.prize}</div>
                {t.description ? <div className="mt-2 text-xs text-muted-foreground">{t.description}</div> : null}
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button
                  variant="outline"
                  className="h-10 rounded-xl border-[color:var(--sinaxys-border)]"
                  onClick={async () => {
                    try {
                      await updateRewardTier(t.id, { active: !t.active });
                      await qc.invalidateQueries({ queryKey: ["points", "tiers", companyId] });
                    } catch (e: any) {
                      toast({ title: "Erro ao atualizar", description: e?.message ?? String(e) });
                    }
                  }}
                >
                  {t.active ? "Desativar" : "Ativar"}
                </Button>
                <Button
                  variant="outline"
                  className="h-10 rounded-xl border-[color:var(--sinaxys-border)]"
                  onClick={async () => {
                    if (!confirm("Remover este prêmio?")) return;
                    try {
                      await deleteRewardTier(t.id);
                      await qc.invalidateQueries({ queryKey: ["points", "tiers", companyId] });
                    } catch (e: any) {
                      toast({ title: "Erro ao remover", description: e?.message ?? String(e) });
                    }
                  }}
                >
                  Remover
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function Rankings() {
  const { user } = useAuth();
  const { company } = useCompany();
  const [sp, setSp] = useSearchParams();

  const companyId = user?.companyId ?? null;

  const tab = (sp.get("tab") || "ranking").toLowerCase();
  const tabSafe = tab === "tiers" || tab === "rules" || tab === "activity" ? tab : "ranking";

  const qProfiles = useQuery({
    queryKey: ["points", "profiles", companyId],
    queryFn: () => listPublicProfiles(companyId as string),
    enabled: !!companyId,
  });

  const qLeaderboard = useQuery({
    queryKey: ["points", "leaderboard", companyId],
    queryFn: () => fetchLeaderboard(companyId as string, 50),
    enabled: !!companyId,
  });

  const qEvents = useQuery({
    queryKey: ["points", "events", companyId, user?.id],
    queryFn: () => getMyPointsEvents(companyId as string, user!.id, 40),
    enabled: !!companyId && !!user?.id,
  });

  const qRules = useQuery({
    queryKey: ["points", "rules", companyId],
    queryFn: () => listPointsRules(companyId as string),
    enabled: !!companyId && user?.role === "ADMIN",
  });

  const qTiers = useQuery({
    queryKey: ["points", "tiers", companyId],
    queryFn: () => listRewardTiers(companyId as string),
    enabled: !!companyId,
  });

  const myPoints = useMemo(() => {
    const rows = qLeaderboard.data ?? [];
    const mine = rows.find((r) => r.user_id === user?.id);
    return mine?.total_points ?? 0;
  }, [qLeaderboard.data, user?.id]);

  const myRank = useMemo(() => {
    const rows = qLeaderboard.data ?? [];
    const idx = rows.findIndex((r) => r.user_id === user?.id);
    return idx >= 0 ? idx + 1 : null;
  }, [qLeaderboard.data, user?.id]);

  if (!user) return null;

  if (!companyId) {
    return (
      <div className="grid gap-6">
        <TopBanner />
        <div className="rounded-3xl border border-[color:var(--sinaxys-border)] bg-white p-6">
          <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Sem empresa ativa</div>
          <div className="mt-2 text-sm text-muted-foreground">Para usar o Points, é preciso ter uma empresa selecionada.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <TopBanner />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Seus pontos" value={formatPts(myPoints)} hint="Acumulado na empresa" icon={<Sparkles className="h-5 w-5" />} />
        <StatCard title="Posição" value={myRank ? `#${myRank}` : "—"} hint="No ranking (Top 50)" icon={<Trophy className="h-5 w-5" />} />
        <CurrentTier tiers={qTiers.data ?? []} myPoints={myPoints} />
      </div>

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">{company.name}</div>
            <div className="mt-1 text-sm text-muted-foreground">Um quadro por empresa. Todos os usuários enxergam o ranking.</div>
          </div>
          <Badge className="w-fit rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">Atualiza em tempo real</Badge>
        </div>

        <Separator className="my-4" />

        <Tabs
          value={tabSafe}
          onValueChange={(v) => {
            setSp((prev) => {
              const next = new URLSearchParams(prev);
              next.set("tab", v);
              return next;
            });
          }}
        >
          <ScrollableTabsList
            listClassName="h-11 rounded-2xl bg-[color:var(--sinaxys-tint)] p-1"
            containerClassName="-mx-1 px-1"
          >
            <TabsTrigger value="ranking" className="shrink-0 rounded-xl data-[state=active]:bg-white data-[state=active]:text-[color:var(--sinaxys-ink)]">
              Ranking
            </TabsTrigger>
            <TabsTrigger value="activity" className="shrink-0 rounded-xl data-[state=active]:bg-white data-[state=active]:text-[color:var(--sinaxys-ink)]">
              Minha atividade
            </TabsTrigger>
            {user.role === "ADMIN" ? (
              <>
                <TabsTrigger value="rules" className="shrink-0 rounded-xl data-[state=active]:bg-white data-[state=active]:text-[color:var(--sinaxys-ink)]">
                  Regras
                </TabsTrigger>
                <TabsTrigger value="tiers" className="shrink-0 rounded-xl data-[state=active]:bg-white data-[state=active]:text-[color:var(--sinaxys-ink)]">
                  Prêmios
                </TabsTrigger>
              </>
            ) : null}
          </ScrollableTabsList>

          <TabsContent value="ranking" className="mt-4">
            {qProfiles.isLoading || qLeaderboard.isLoading ? (
              <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">Carregando ranking…</div>
            ) : null}

            {qProfiles.data && qLeaderboard.data ? (
              <LeaderboardList leaderboard={qLeaderboard.data} profiles={qProfiles.data} myUserId={user.id} />
            ) : null}

            <AdminBonusCard companyId={companyId} people={qProfiles.data ?? []} />
          </TabsContent>

          <TabsContent value="activity" className="mt-4">
            {qEvents.isLoading ? (
              <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">Carregando atividade…</div>
            ) : null}

            {qEvents.data ? <ActivityList items={qEvents.data} /> : null}
          </TabsContent>

          <TabsContent value="rules" className="mt-4">
            {user.role === "ADMIN" ? (
              qRules.isLoading ? (
                <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">Carregando regras…</div>
              ) : (
                <RulesAdmin companyId={companyId} rules={qRules.data ?? []} />
              )
            ) : null}
          </TabsContent>

          <TabsContent value="tiers" className="mt-4">
            {user.role === "ADMIN" ? (
              qTiers.isLoading ? (
                <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">Carregando prêmios…</div>
              ) : (
                <TiersAdmin companyId={companyId} tiers={qTiers.data ?? []} />
              )
            ) : null}
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}