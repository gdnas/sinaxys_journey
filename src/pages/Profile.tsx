import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, ImagePlus, LayoutDashboard, Save, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { mockDb } from "@/lib/mockDb";
import { roleLabel } from "@/lib/sinaxys";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "";
  const b = parts[1]?.[0] ?? parts[0]?.[1] ?? "";
  return (a + b).toUpperCase();
}

export default function Profile() {
  const { toast } = useToast();
  const { user, refresh } = useAuth();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [contractUrl, setContractUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setAvatarUrl(user.avatarUrl ?? "");
    setContractUrl(user.contractUrl ?? "");
  }, [user?.id]);

  const dirty =
    !!user &&
    (name.trim() !== user.name.trim() ||
      (avatarUrl.trim() || "") !== (user.avatarUrl ?? "") ||
      (contractUrl.trim() || "") !== (user.contractUrl ?? ""));

  const assignments = useMemo(() => {
    if (!user) return [];
    return mockDb.getAssignmentsForUser(user.id);
  }, [user?.id]);

  const totalXp = useMemo(() => {
    if (!user) return 0;
    const db = mockDb.get();
    const assignmentsForUser = db.assignments.filter((a) => a.userId === user.id);
    let xp = 0;
    for (const a of assignmentsForUser) {
      const detail = mockDb.getAssignmentDetail(a.id);
      if (!detail) continue;
      xp += detail.modules
        .filter((m) => detail.progressByModuleId[m.id]?.status === "COMPLETED")
        .reduce((acc, m) => acc + m.xpReward, 0);
    }
    return xp;
  }, [user?.id]);

  const completedTracks = assignments.filter((a) => a.assignment.status === "COMPLETED").length;

  if (!user) return null;

  return (
    <div className="grid gap-6">
      <div className="rounded-3xl border bg-white p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Perfil</div>
            <div className="mt-1 text-xl font-semibold text-[color:var(--sinaxys-ink)]">{user.name}</div>
            <div className="mt-1 text-sm text-muted-foreground">{roleLabel(user.role)} • {user.email}</div>
          </div>

          <div className="flex flex-wrap gap-2">
            {user.role === "COLABORADOR" ? (
              <Button asChild variant="outline" className="rounded-xl">
                <Link to="/app">
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Minha jornada
                </Link>
              </Button>
            ) : user.role === "HEAD" ? (
              <Button asChild variant="outline" className="rounded-xl">
                <Link to="/head">
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Painel do departamento
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="grid gap-6">
          <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Seus dados</div>
            <p className="mt-1 text-sm text-muted-foreground">Atualize sua foto e mantenha seus links importantes em um só lugar.</p>

            <div className="mt-5 grid gap-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <Avatar className="h-16 w-16 ring-2 ring-[color:var(--sinaxys-border)]">
                  <AvatarImage src={avatarUrl || undefined} alt={user.name} />
                  <AvatarFallback className="bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]">
                    {initials(user.name)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex flex-wrap gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        const dataUrl = String(reader.result ?? "");
                        setAvatarUrl(dataUrl);
                        toast({
                          title: "Foto carregada",
                          description: "Agora é só salvar o perfil.",
                        });
                      };
                      reader.readAsDataURL(file);
                    }}
                  />

                  <Button
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => fileRef.current?.click()}
                  >
                    <ImagePlus className="mr-2 h-4 w-4" />
                    Enviar foto
                  </Button>
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Nome</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl" />
              </div>

              <div className="grid gap-2">
                <Label>Foto (URL opcional)</Label>
                <Input
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  className="rounded-xl"
                  placeholder="https://..."
                />
                <div className="text-xs text-muted-foreground">
                  Você pode colar um link de imagem ou enviar uma foto acima.
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Contrato assinado (Clicksign)</Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={contractUrl}
                    onChange={(e) => setContractUrl(e.target.value)}
                    className="rounded-xl"
                    placeholder="https://app.clicksign.com/..."
                  />
                  <Button
                    asChild
                    variant="outline"
                    className="rounded-xl"
                    disabled={!contractUrl.trim()}
                  >
                    <a href={contractUrl || "#"} target="_blank" rel="noreferrer">
                      <FileText className="mr-2 h-4 w-4" />
                      Abrir
                    </a>
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-muted-foreground">As mudanças são aplicadas no seu perfil imediatamente.</div>
                <Button
                  className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                  disabled={saving || !dirty || name.trim().length < 3}
                  onClick={() => {
                    try {
                      setSaving(true);
                      const updated = mockDb.updateUserProfile(user.id, {
                        name,
                        avatarUrl,
                        contractUrl,
                      });
                      if (!updated) {
                        toast({
                          title: "Não foi possível salvar",
                          description: "Tente novamente.",
                          variant: "destructive",
                        });
                        return;
                      }
                      refresh?.();
                      toast({
                        title: "Perfil atualizado",
                        description: "Dados salvos com sucesso.",
                      });
                    } finally {
                      setSaving(false);
                    }
                  }}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Salvando…" : "Salvar"}
                </Button>
              </div>
            </div>
          </Card>

          <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Evolução</div>
            <p className="mt-1 text-sm text-muted-foreground">Uma visão clara do seu progresso (por trilha).</p>

            <div className="mt-4">
              <Tabs defaultValue="tracks" className="w-full">
                <TabsList className="w-full justify-start rounded-2xl bg-[color:var(--sinaxys-tint)] p-1">
                  <TabsTrigger value="tracks" className="rounded-xl">Trilhas</TabsTrigger>
                  <TabsTrigger value="stats" className="rounded-xl">Resumo</TabsTrigger>
                </TabsList>

                <TabsContent value="tracks" className="mt-4">
                  <div className="grid gap-3">
                    {assignments.length ? (
                      assignments.map((a) => (
                        <div key={a.assignment.id} className="rounded-2xl border border-[color:var(--sinaxys-border)] p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">{a.track.title}</div>
                              <div className="mt-1 text-xs text-muted-foreground">
                                {a.completedModules} de {a.totalModules} módulos
                              </div>
                            </div>
                            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">{a.progressPct}%</div>
                          </div>
                          <div className="mt-3">
                            <Progress value={a.progressPct} className="h-2 rounded-full bg-[color:var(--sinaxys-tint)]" />
                          </div>

                          {user.role === "COLABORADOR" ? (
                            <div className="mt-4">
                              <Button
                                asChild
                                className="w-full rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90 sm:w-auto"
                              >
                                <Link to={`/app/tracks/${a.assignment.id}`}>Abrir</Link>
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">
                        Nenhuma trilha atribuída para você ainda.
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="stats" className="mt-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">XP</div>
                      <div className="mt-1 text-2xl font-semibold text-[color:var(--sinaxys-ink)]">{totalXp}</div>
                    </div>
                    <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Trilhas</div>
                      <div className="mt-1 text-2xl font-semibold text-[color:var(--sinaxys-ink)]">{assignments.length}</div>
                    </div>
                    <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Concluídas</div>
                      <div className="mt-1 text-2xl font-semibold text-[color:var(--sinaxys-ink)]">{completedTracks}</div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </Card>
        </div>

        <div className="grid gap-6">
          <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Contrato</div>
            <p className="mt-1 text-sm text-muted-foreground">Acesso rápido ao documento assinado.</p>

            <div className="mt-4 grid gap-2">
              {user.contractUrl ? (
                <Button asChild className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90">
                  <a href={user.contractUrl} target="_blank" rel="noreferrer">
                    <FileText className="mr-2 h-4 w-4" />
                    Abrir contrato
                  </a>
                </Button>
              ) : (
                <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">
                  Nenhum link de contrato cadastrado ainda.
                </div>
              )}
            </div>
          </Card>

          <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Dica</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Se quiser, eu adiciono também um perfil público do colaborador para o gestor ver (com foto, progresso e contrato) — mantendo permissões.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
