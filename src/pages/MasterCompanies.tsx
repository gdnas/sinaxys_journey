import { useMemo, useState } from "react";
import { Building2, Pencil, Plus, Search } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { createCompany, listCompanies } from "@/lib/companiesDb";
import { CompanyEditDialog } from "@/components/master/CompanyEditDialog";
import { cn } from "@/lib/utils";

export default function MasterCompanies() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user, activeCompanyId, setActiveCompanyId } = useAuth();

  if (!user || user.role !== "MASTERADMIN") return null;

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["companies"],
    queryFn: () => listCompanies(),
  });

  const current = useMemo(() => {
    if (!activeCompanyId) return companies[0] ?? null;
    return companies.find((c) => c.id === activeCompanyId) ?? companies[0] ?? null;
  }, [companies, activeCompanyId]);

  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter((c) => `${c.name} ${c.tagline ?? ""} ${c.id}`.toLowerCase().includes(q));
  }, [companies, query]);

  const [newCompanyName, setNewCompanyName] = useState("");
  const [newCompanyTagline, setNewCompanyTagline] = useState("");
  const [creating, setCreating] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = useMemo(() => companies.find((c) => c.id === editingId) ?? null, [companies, editingId]);

  const openEdit = (companyId: string) => {
    setEditingId(companyId);
    setEditOpen(true);
  };

  return (
    <div className="grid gap-6">
      <div className="flex flex-col justify-between gap-3 rounded-3xl border bg-white p-6 sm:flex-row sm:items-center">
        <div>
          <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Master Admin — Empresas</div>
          <p className="mt-1 text-sm text-muted-foreground">Gerencie tenants (Supabase). Renomeie ou remova empresas.</p>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
          <Building2 className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
          <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Empresa ativa</div>
          <p className="mt-1 text-sm text-muted-foreground">
            Para Master Admin, o tenant ativo é salvo em <span className="font-medium text-[color:var(--sinaxys-ink)]">profiles.company_id</span>.
          </p>

          <div className="mt-5 grid gap-4">
            <div className="grid gap-2">
              <Label>Selecionar</Label>
              <Select
                value={current?.id ?? ""}
                onValueChange={async (v) => {
                  try {
                    await setActiveCompanyId(v);
                    toast({ title: "Empresa ativa atualizada" });
                  } catch (e) {
                    toast({
                      title: "Não foi possível trocar",
                      description: e instanceof Error ? e.message : "Erro inesperado.",
                      variant: "destructive",
                    });
                  }
                }}
              >
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder={isLoading ? "Carregando…" : "Selecione…"} />
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
                ID: {current?.id ?? "—"}
              </Badge>
              {current ? (
                <Button
                  variant="outline"
                  className="h-9 rounded-xl bg-white"
                  onClick={() => openEdit(current.id)}
                  title="Editar empresa"
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </Button>
              ) : null}
            </div>

            <Separator />

            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Criar nova empresa</div>
            <div className="grid gap-3">
              <div className="grid gap-2">
                <Label>Nome</Label>
                <Input className="h-11 rounded-xl" value={newCompanyName} onChange={(e) => setNewCompanyName(e.target.value)} placeholder="Ex.: Acme Educação" />
              </div>
              <div className="grid gap-2">
                <Label>Tagline (opcional)</Label>
                <Input
                  className="h-11 rounded-xl"
                  value={newCompanyTagline}
                  onChange={(e) => setNewCompanyTagline(e.target.value)}
                  placeholder="Ex.: Onboarding e evolução contínua"
                />
              </div>
              <Button
                className="h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                disabled={creating || newCompanyName.trim().length < 3}
                onClick={async () => {
                  try {
                    setCreating(true);
                    const c = await createCompany({ name: newCompanyName, tagline: newCompanyTagline });
                    setNewCompanyName("");
                    setNewCompanyTagline("");
                    await qc.invalidateQueries({ queryKey: ["companies"] });
                    await setActiveCompanyId(c.id);
                    toast({ title: "Empresa criada", description: `Ambiente criado: ${c.name}` });
                  } catch (e) {
                    toast({
                      title: "Não foi possível criar",
                      description: e instanceof Error ? e.message : "Erro inesperado.",
                      variant: "destructive",
                    });
                  } finally {
                    setCreating(false);
                  }
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Criar empresa
              </Button>
            </div>
          </div>
        </Card>

        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Empresas</div>
              <p className="mt-1 text-sm text-muted-foreground">Toque em uma empresa para editar.</p>
            </div>
            <div className="relative w-full sm:w-[320px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} className="h-11 rounded-xl pl-9" placeholder="Buscar…" />
            </div>
          </div>

          <Separator className="my-5" />

          <div className="grid gap-2">
            {isLoading ? (
              <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">Carregando…</div>
            ) : filtered.length ? (
              filtered.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => openEdit(c.id)}
                  className={cn(
                    "group rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-4 text-left transition hover:bg-[color:var(--sinaxys-tint)]/30",
                    activeCompanyId === c.id ? "ring-2 ring-[color:var(--sinaxys-primary)]/20" : "",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">{c.name}</div>
                      <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{c.tagline ?? "—"}</div>
                      <div className="mt-2 text-xs text-muted-foreground">{c.id}</div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {activeCompanyId === c.id ? (
                        <Badge className="rounded-full bg-emerald-100 text-emerald-900 hover:bg-emerald-100">Ativa</Badge>
                      ) : (
                        <Badge className="rounded-full bg-muted text-muted-foreground hover:bg-muted">—</Badge>
                      )}
                      <span className="hidden text-xs font-semibold text-[color:var(--sinaxys-primary)] group-hover:inline">Editar</span>
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">Nenhuma empresa encontrada.</div>
            )}
          </div>
        </Card>
      </div>

      <CompanyEditDialog
        open={editOpen}
        onOpenChange={(v) => {
          setEditOpen(v);
          if (!v) setEditingId(null);
        }}
        company={editing}
        isActive={!!editing && editing.id === activeCompanyId}
        onAfterDelete={async () => {
          if (editingId && editingId === activeCompanyId) {
            try {
              await setActiveCompanyId(null);
            } catch {
              // ignore
            }
          }
          setEditingId(null);
        }}
      />
    </div>
  );
}