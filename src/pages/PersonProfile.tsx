import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ExternalLink,
  FileText,
  Mail,
  Phone,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

function formatDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}

function isHttpUrl(s: string) {
  return /^https?:\/\//i.test(s.trim());
}

export default function PersonProfile() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { userId } = useParams();

  const [version, setVersion] = useState(0);

  const { person, deptName, manager, directReports } = useMemo(() => {
    const db = mockDb.get();
    const person = db.users.find((u) => u.id === userId && u.active) ?? null;
    const deptName = person?.departmentId
      ? db.departments.find((d) => d.id === person.departmentId)?.name
      : undefined;
    const manager = person?.managerId ? db.users.find((u) => u.id === person.managerId && u.active) : undefined;
    const directReports = person ? db.users.filter((u) => u.active && u.managerId === person.id) : [];
    return { person, deptName, manager, directReports };
  }, [userId, version]);

  const canSeeContracts = !!user && !!person && (user.role === "ADMIN" || user.id === person.id);
  const canEditContracts = !!user && !!person && user.role === "ADMIN";

  const [contractUrl, setContractUrl] = useState("");
  const [savingContract, setSavingContract] = useState(false);

  useEffect(() => {
    setContractUrl(person?.contractUrl ?? "");
  }, [person?.id, version]);

  const contractDirty = !!person && canEditContracts && (contractUrl.trim() || "") !== (person.contractUrl ?? "");

  const contractAttachments = useMemo(() => {
    if (!person) return [];
    return mockDb.getContractAttachmentsForUser(person.id);
  }, [person?.id, version]);

  const [attachmentTitle, setAttachmentTitle] = useState("");
  const [attachmentMode, setAttachmentMode] = useState<"FILE" | "LINK">("FILE");
  const [attachmentFileDataUrl, setAttachmentFileDataUrl] = useState("");
  const [attachmentLinkUrl, setAttachmentLinkUrl] = useState("");
  const [savingAttachment, setSavingAttachment] = useState(false);
  const attachmentFileRef = useRef<HTMLInputElement | null>(null);

  if (!user) return null;

  if (!person) {
    return (
      <div className="grid gap-4">
        <div className="rounded-3xl border bg-white p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Perfil não encontrado</div>
              <div className="mt-1 text-sm text-muted-foreground">Essa pessoa pode estar inativa ou não existe.</div>
            </div>
            <Button asChild variant="outline" className="rounded-xl">
              <Link to="/org">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar ao organograma
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <div className="rounded-3xl border bg-white p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16 ring-2 ring-[color:var(--sinaxys-border)]">
              <AvatarImage src={person.avatarUrl} alt={person.name} />
              <AvatarFallback className="bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]">
                {initials(person.name)}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <div className="truncate text-xl font-semibold text-[color:var(--sinaxys-ink)]">
                  {person.name} <span className="font-medium text-muted-foreground">— {person.jobTitle?.trim() || "Sem cargo"}</span>
                </div>
                <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
                  {roleLabel(person.role)}
                </Badge>
                {deptName ? (
                  <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] shadow-sm ring-1 ring-[color:var(--sinaxys-border)] hover:bg-white">
                    {deptName}
                  </Badge>
                ) : null}
              </div>
              <div className="mt-2 flex flex-col gap-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-[color:var(--sinaxys-primary)]" />
                  <span className="text-[color:var(--sinaxys-ink)]">{person.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-[color:var(--sinaxys-primary)]" />
                  <span className="text-[color:var(--sinaxys-ink)]">{person.phone ?? "—"}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="rounded-xl">
              <Link to="/org">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Organograma
              </Link>
            </Button>
            {user.id === person.id ? (
              <Button
                asChild
                className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              >
                <Link to="/profile">Minha área</Link>
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
          <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Posição na estrutura</div>
          <p className="mt-1 text-sm text-muted-foreground">Gestor direto e liderados (quando aplicável).</p>

          <div className="mt-4 grid gap-4">
            <div className="rounded-2xl border border-[color:var(--sinaxys-border)] p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reporta para</div>
              {manager ? (
                <div className="mt-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">{manager.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {roleLabel(manager.role)} • {manager.email}
                    </div>
                  </div>
                  <Button asChild variant="outline" className="rounded-xl">
                    <Link to={`/people/${manager.id}`}>Ver</Link>
                  </Button>
                </div>
              ) : (
                <div className="mt-2 text-sm text-muted-foreground">—</div>
              )}
            </div>

            <div className="rounded-2xl border border-[color:var(--sinaxys-border)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Lidera</div>
                  <div className="mt-1 text-sm font-semibold text-[color:var(--sinaxys-ink)]">{directReports.length} pessoas</div>
                </div>
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
                  <Users className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
                </div>
              </div>
              {directReports.length ? (
                <div className="mt-3 grid gap-2">
                  {directReports.slice(0, 5).map((r) => (
                    <Link
                      key={r.id}
                      to={`/people/${r.id}`}
                      className="flex items-center justify-between gap-3 rounded-xl bg-[color:var(--sinaxys-tint)] px-3 py-2 text-sm"
                    >
                      <span className="truncate font-medium text-[color:var(--sinaxys-ink)]">{r.name}</span>
                      <span className="text-xs text-muted-foreground">{roleLabel(r.role)}</span>
                    </Link>
                  ))}
                  {directReports.length > 5 ? (
                    <div className="text-xs text-muted-foreground">+ {directReports.length - 5} pessoas</div>
                  ) : null}
                </div>
              ) : (
                <div className="mt-2 text-sm text-muted-foreground">Sem liderados diretos.</div>
              )}
            </div>
          </div>
        </Card>

        <div className="grid gap-6">
          {canSeeContracts ? (
            <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Documentos</div>
                  <p className="mt-1 text-sm text-muted-foreground">Contrato principal + aditivos/versões.</p>
                </div>
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
                  <FileText className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
                </div>
              </div>

              <Separator className="my-4" />

              <div className="grid gap-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contrato principal (Clicksign)</div>

                {canEditContracts ? (
                  <div className="grid gap-2">
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input
                        value={contractUrl}
                        onChange={(e) => setContractUrl(e.target.value)}
                        className="h-11 rounded-xl"
                        placeholder="https://app.clicksign.com/..."
                      />
                      <Button asChild variant="outline" className="h-11 rounded-xl" disabled={!isHttpUrl(contractUrl)}>
                        <a href={contractUrl || "#"} target="_blank" rel="noreferrer">
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Abrir
                        </a>
                      </Button>
                    </div>
                    <Button
                      className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                      disabled={savingContract || !contractDirty}
                      onClick={() => {
                        try {
                          setSavingContract(true);
                          mockDb.updateUserProfile(person.id, { contractUrl });
                          setVersion((v) => v + 1);
                          toast({ title: "Contrato principal atualizado", description: "Link salvo com sucesso." });
                        } catch (e) {
                          toast({
                            title: "Não foi possível salvar",
                            description: e instanceof Error ? e.message : "Tente novamente.",
                            variant: "destructive",
                          });
                        } finally {
                          setSavingContract(false);
                        }
                      }}
                    >
                      {savingContract ? "Salvando…" : "Salvar"}
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm text-[color:var(--sinaxys-ink)]">
                      {person.contractUrl ? "Contrato cadastrado" : "Nenhum contrato cadastrado"}
                    </div>
                    <Button asChild variant="outline" className="rounded-xl" disabled={!isHttpUrl(person.contractUrl ?? "") }>
                      <a href={person.contractUrl || "#"} target="_blank" rel="noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Abrir
                      </a>
                    </Button>
                  </div>
                )}

                {!canEditContracts ? (
                  <div className="text-xs text-muted-foreground">Somente o admin pode alterar contratos.</div>
                ) : null}
              </div>

              <Separator className="my-4" />

              <div className="grid gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contratos & aditivos</div>
                  <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
                    {contractAttachments.length}
                  </Badge>
                </div>

                {canEditContracts ? (
                  <div className="grid gap-3 rounded-2xl bg-[color:var(--sinaxys-tint)] p-3">
                    <div className="grid gap-2">
                      <Label>Título</Label>
                      <Input
                        className="h-11 rounded-xl"
                        value={attachmentTitle}
                        onChange={(e) => setAttachmentTitle(e.target.value)}
                        placeholder="Ex.: Aditivo 01 — Ajuste de escopo"
                      />
                    </div>

                    <Tabs value={attachmentMode} onValueChange={(v) => setAttachmentMode(v as "FILE" | "LINK")}>
                      <TabsList className="w-full justify-start rounded-xl bg-white p-1">
                        <TabsTrigger value="FILE" className="rounded-lg">Arquivo</TabsTrigger>
                        <TabsTrigger value="LINK" className="rounded-lg">Link</TabsTrigger>
                      </TabsList>

                      <TabsContent value="FILE" className="mt-3">
                        <input
                          ref={attachmentFileRef}
                          type="file"
                          accept="application/pdf,image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = () => {
                              const dataUrl = String(reader.result ?? "");
                              setAttachmentFileDataUrl(dataUrl);
                              setAttachmentTitle((t) => (t.trim() ? t : file.name));
                              toast({ title: "Arquivo anexado", description: "Agora é só salvar." });
                            };
                            reader.readAsDataURL(file);
                          }}
                        />

                        <div className="grid gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full rounded-xl"
                            onClick={() => attachmentFileRef.current?.click()}
                          >
                            Selecionar arquivo
                          </Button>

                          {attachmentFileDataUrl.startsWith("data:") ? (
                            <div className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-3">
                              <div className="min-w-0">
                                <div className="truncate text-sm font-medium text-[color:var(--sinaxys-ink)]">Arquivo pronto</div>
                                <div className="mt-1 text-xs text-muted-foreground">Fica armazenado no navegador.</div>
                              </div>
                              <Button asChild variant="outline" size="sm" className="rounded-xl">
                                <a href={attachmentFileDataUrl} target="_blank" rel="noreferrer">
                                  <ExternalLink className="mr-2 h-4 w-4" />
                                  Abrir
                                </a>
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      </TabsContent>

                      <TabsContent value="LINK" className="mt-3">
                        <div className="grid gap-2">
                          <Label>Link do documento</Label>
                          <Input
                            className="h-11 rounded-xl"
                            value={attachmentLinkUrl}
                            onChange={(e) => setAttachmentLinkUrl(e.target.value)}
                            placeholder="https://app.clicksign.com/..."
                          />
                        </div>
                      </TabsContent>
                    </Tabs>

                    <Button
                      className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                      disabled={
                        savingAttachment ||
                        (attachmentMode === "FILE"
                          ? !attachmentFileDataUrl.startsWith("data:")
                          : !isHttpUrl(attachmentLinkUrl))
                      }
                      onClick={() => {
                        try {
                          setSavingAttachment(true);
                          const url = attachmentMode === "FILE" ? attachmentFileDataUrl.trim() : attachmentLinkUrl.trim();

                          mockDb.addContractAttachment({
                            userId: person.id,
                            title: attachmentTitle.trim() || "Contrato",
                            url,
                            kind: attachmentMode,
                          });

                          setAttachmentTitle("");
                          setAttachmentFileDataUrl("");
                          setAttachmentLinkUrl("");
                          if (attachmentFileRef.current) attachmentFileRef.current.value = "";

                          setVersion((v) => v + 1);
                          toast({ title: "Documento salvo" });
                        } catch (e) {
                          toast({
                            title: "Não foi possível salvar",
                            description: e instanceof Error ? e.message : "Tente novamente.",
                            variant: "destructive",
                          });
                        } finally {
                          setSavingAttachment(false);
                        }
                      }}
                    >
                      {savingAttachment ? "Salvando…" : "Salvar aditivo"}
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">
                    Aditivos são gerenciados pelo admin.
                  </div>
                )}

                <div className="grid gap-2">
                  {contractAttachments.length ? (
                    contractAttachments.map((c) => {
                      const href = (c.url ?? c.fileDataUrl ?? "").trim();
                      return (
                        <div key={c.id} className="rounded-2xl border border-[color:var(--sinaxys-border)] p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">{c.title}</div>
                              <div className="mt-1 text-xs text-muted-foreground">Salvo em {formatDate(c.createdAt)}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button asChild variant="outline" size="icon" className="h-9 w-9 rounded-xl" disabled={!href}>
                                <a href={href || "#"} target="_blank" rel="noreferrer" aria-label="Abrir">
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                              {canEditContracts ? (
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-9 w-9 rounded-xl"
                                  aria-label="Remover"
                                  onClick={() => {
                                    mockDb.deleteContractAttachment({ userId: person.id, contractAttachmentId: c.id });
                                    setVersion((v) => v + 1);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">
                      Nenhum aditivo cadastrado.
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ) : null}

          <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Contato rápido</div>
                <p className="mt-1 text-sm text-muted-foreground">Use os dados abaixo para falar com a pessoa certa.</p>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
                <ShieldCheck className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
              </div>
            </div>
            <Separator className="my-4" />
            <div className="grid gap-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">E-mail</span>
                <span className="font-medium text-[color:var(--sinaxys-ink)]">{person.email}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Celular</span>
                <span className="font-medium text-[color:var(--sinaxys-ink)]">{person.phone ?? "—"}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}