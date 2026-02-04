import { useMemo, useState } from "react";
import { Building2, Copy, Plus, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { mockDb } from "@/lib/mockDb";
import type { Role } from "@/lib/domain";

function inviteLink(token: string) {
  return `${window.location.origin}/invite/${token}`;
}

export default function MasterCompanies() {
  const { toast } = useToast();
  const { user, activeCompanyId, setActiveCompanyId } = useAuth();
  const [version, setVersion] = useState(0);

  const companies = useMemo(() => mockDb.getCompanies(), [version]);
  const current = useMemo(() => {
    if (!activeCompanyId) return companies[0] ?? null;
    return companies.find((c) => c.id === activeCompanyId) ?? companies[0] ?? null;
  }, [companies, activeCompanyId]);

  const companyUsersCount = useMemo(() => {
    if (!current) return 0;
    return mockDb.getUsers(current.id).filter((u) => u.active).length;
  }, [current, version]);

  const invites = useMemo(() => {
    const db = mockDb.get();
    if (!current) return [];
    return db.invites
      .filter((i) => i.companyId === current.id)
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [current, version]);

  const [newCompanyName, setNewCompanyName] = useState("");
  const [newCompanyTagline, setNewCompanyTagline] = useState("");

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("ADMIN");

  if (!user || user.role !== "MASTERADMIN") return null;

  return (
    <div className="grid gap-6">
      <div className="flex flex-col justify-between gap-3 rounded-3xl border bg-white p-6 md:flex-row md:items-center">
        <div>
          <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Master Admin — Empresas</div>
          <p className="mt-1 text-sm text-muted-foreground">
            Crie ambientes (empresas) e gere convites. O admin de cada empresa gerencia usuários e marca dentro do próprio ambiente.
          </p>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
          <Building2 className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_1fr]">
        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
          <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Empresas</div>
          <p className="mt-1 text-sm text-muted-foreground">Selecione uma empresa para definir o ambiente ativo.</p>

          <div className="mt-5 grid gap-4">
            <div className="grid gap-2">
              <Label>Empresa ativa</Label>
              <Select
                value={current?.id ?? ""}
                onValueChange={(v) => {
                  setActiveCompanyId(v);
                  setVersion((x) => x + 1);
                }}
              >
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Selecione…" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
                {companyUsersCount} usuários ativos
              </Badge>
              <span className="text-xs text-muted-foreground">ID: {current?.id ?? "—"}</span>
            </div>

            <Separator />

            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Criar nova empresa</div>
            <div className="grid gap-3">
              <div className="grid gap-2">
                <Label htmlFor="cname">Nome</Label>
                <Input
                  id="cname"
                  className="h-11 rounded-xl"
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  placeholder="Ex.: Acme Educação"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ctag">Tagline (opcional)</Label>
                <Input
                  id="ctag"
                  className="h-11 rounded-xl"
                  value={newCompanyTagline}
                  onChange={(e) => setNewCompanyTagline(e.target.value)}
                  placeholder="Ex.: Onboarding e evolução contínua"
                />
              </div>
              <Button
                className="h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                disabled={newCompanyName.trim().length < 3}
                onClick={() => {
                  const c = mockDb.createCompany({ name: newCompanyName, tagline: newCompanyTagline });
                  setNewCompanyName("");
                  setNewCompanyTagline("");
                  setActiveCompanyId(c.id);
                  setVersion((x) => x + 1);
                  toast({ title: "Empresa criada", description: `Ambiente criado: ${c.name}` });
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Criar empresa
              </Button>
            </div>
          </div>
        </Card>

        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
          <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Convites</div>
          <p className="mt-1 text-sm text-muted-foreground">O convite cria/ativa o usuário no ambiente escolhido.</p>

          <div className="mt-5 grid gap-4">
            <div className="grid gap-2">
              <Label>E-mail</Label>
              <Input
                className="h-11 rounded-xl"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="admin@empresa.com"
              />
            </div>

            <div className="grid gap-2">
              <Label>Nome (opcional)</Label>
              <Input
                className="h-11 rounded-xl"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="Ex.: Ana Souza"
              />
            </div>

            <div className="grid gap-2">
              <Label>Papel</Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as Role)}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin da empresa</SelectItem>
                  <SelectItem value="HEAD">Head</SelectItem>
                  <SelectItem value="COLABORADOR">Colaborador</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              className="h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              disabled={!current || inviteEmail.trim().length < 6}
              onClick={() => {
                if (!current) return;
                try {
                  const inv = mockDb.createInvite({
                    companyId: current.id,
                    email: inviteEmail,
                    role: inviteRole,
                    name: inviteName,
                  });
                  setInviteEmail("");
                  setInviteName("");
                  setInviteRole("ADMIN");
                  setVersion((x) => x + 1);

                  const link = inviteLink(inv.token);
                  navigator.clipboard?.writeText(link).catch(() => null);

                  toast({
                    title: "Convite criado",
                    description: "Link copiado (se permitido pelo navegador).",
                  });
                } catch (e) {
                  toast({
                    title: "Não foi possível criar",
                    description: e instanceof Error ? e.message : "Erro inesperado.",
                    variant: "destructive",
                  });
                }
              }}
            >
              <Send className="mr-2 h-4 w-4" />
              Gerar convite
            </Button>

            <Separator />

            <div className="grid gap-2">
              <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Últimos convites</div>
              {!invites.length ? (
                <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">
                  Nenhum convite ainda.
                </div>
              ) : (
                <div className="grid gap-2">
                  {invites.slice(0, 8).map((i) => {
                    const link = inviteLink(i.token);
                    const used = !!i.usedAt;
                    return (
                      <div
                        key={i.id}
                        className="rounded-2xl border border-[color:var(--sinaxys-border)] p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">
                              {i.email}
                            </div>
                            <div className="mt-0.5 text-xs text-muted-foreground">
                              Papel: <span className="font-medium text-[color:var(--sinaxys-ink)]">{i.role}</span>
                              {i.name ? ` • Nome: ${i.name}` : ""}
                            </div>
                          </div>
                          <Badge
                            className={
                              "rounded-full " +
                              (used
                                ? "bg-muted text-muted-foreground hover:bg-muted"
                                : "bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]")
                            }
                          >
                            {used ? "Usado" : "Ativo"}
                          </Badge>
                        </div>

                        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="truncate text-xs text-muted-foreground">{link}</div>
                          <Button
                            variant="outline"
                            className="h-9 rounded-xl"
                            onClick={() => {
                              navigator.clipboard?.writeText(link).catch(() => null);
                              toast({ title: "Link copiado" });
                            }}
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            Copiar
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
