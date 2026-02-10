import { useEffect, useMemo, useState, type ReactNode } from "react";

import {
  Building2,
  Calendar,
  Copy,
  CreditCard,
  FileDown,
  FileText,
  Landmark,
  Plus,
  Receipt,
  Save,
  Trash2,
  Upload,
} from "lucide-react";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  createInvoiceSignedUrl,
  createUserInvoice,
  deleteUserInvoice,
  getCompanyFinanceSettings,
  getUserFinancialProfile,
  listUserInvoices,
  removeInvoiceFile,
  upsertCompanyFinanceSettings,
  upsertUserFinancialProfile,
  uploadInvoiceFile,
  type CompanyFinanceSettings,
} from "@/lib/financeDb";

function formatBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function statusBadge(status: string) {
  const s = String(status || "").toUpperCase();
  if (s === "PAGA") return { label: "Paga", className: "bg-emerald-50 text-emerald-700 hover:bg-emerald-50" };
  if (s === "APROVADA") return { label: "Aprovada", className: "bg-sky-50 text-sky-700 hover:bg-sky-50" };
  if (s === "REJEITADA") return { label: "Rejeitada", className: "bg-rose-50 text-rose-700 hover:bg-rose-50" };
  if (s === "EM_ANALISE") return { label: "Em análise", className: "bg-amber-50 text-amber-800 hover:bg-amber-50" };
  return { label: "Enviada", className: "bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]" };
}

async function copyToClipboard(text: string) {
  await navigator.clipboard.writeText(text);
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string | null | undefined;
}) {

  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-3">
      <div className="flex min-w-0 gap-3">
        <div className="mt-0.5 grid h-9 w-9 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-xs font-medium text-muted-foreground">{label}</div>
          <div className="mt-0.5 truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">
            {value?.trim() ? value : "—"}
          </div>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        className="h-9 rounded-xl"
        disabled={!value?.trim()}
        onClick={async () => {
          if (!value?.trim()) return;
          await copyToClipboard(value.trim());
        }}
      >
        <Copy className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function FinanceiroPanel({
  userId,
  companyId,
  canEditCompany,
}: {
  userId: string;
  companyId: string | null;
  canEditCompany: boolean;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: myFinance } = useQuery({
    queryKey: ["user-financial", userId],
    queryFn: () => getUserFinancialProfile(userId),
  });

  const { data: companyFinance } = useQuery({
    queryKey: ["company-finance", companyId],
    queryFn: () => getCompanyFinanceSettings(companyId!),
    enabled: !!companyId,
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["user-invoices", companyId, userId],
    queryFn: () => listUserInvoices({ userId, companyId }),
    enabled: !!companyId,
  });

  const [destinationAccount, setDestinationAccount] = useState(myFinance?.destination_account ?? "");
  const [pixKey, setPixKey] = useState(myFinance?.pix_key ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDestinationAccount(myFinance?.destination_account ?? "");
    setPixKey(myFinance?.pix_key ?? "");
  }, [myFinance?.user_id]);

  const dirtyMy = useMemo(() => {
    const baseAcc = myFinance?.destination_account ?? "";
    const basePix = myFinance?.pix_key ?? "";
    return destinationAccount.trim() !== baseAcc || pixKey.trim() !== basePix;
  }, [destinationAccount, pixKey, myFinance?.destination_account, myFinance?.pix_key]);

  // Dialog: enviar nota
  const [sendOpen, setSendOpen] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);

  const amountNumber = useMemo(() => {
    const t = amount.trim();
    if (!t) return null;
    const n = Number(t.replace(/\./g, "").replace(/,/g, "."));
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [amount]);

  const summary = useMemo(() => {
    const total = invoices.length;
    const pending = invoices.filter((i) => {
      const s = String(i.status || "").toUpperCase();
      return s === "ENVIADA" || s === "EM_ANALISE";
    }).length;
    const paid = invoices.filter((i) => String(i.status || "").toUpperCase() === "PAGA").length;
    return { total, pending, paid };
  }, [invoices]);

  // Dialog: editar dados da empresa
  const [companyOpen, setCompanyOpen] = useState(false);
  const [companyDraft, setCompanyDraft] = useState<Partial<CompanyFinanceSettings>>({});
  const [companySaving, setCompanySaving] = useState(false);

  const openCompanyDialog = () => {
    setCompanyDraft({
      legal_name: companyFinance?.legal_name ?? "",
      cnpj: companyFinance?.cnpj ?? "",
      bank_name: companyFinance?.bank_name ?? "",
      agency: companyFinance?.agency ?? "",
      account_number: companyFinance?.account_number ?? "",
      account_holder: companyFinance?.account_holder ?? "",
      pix_key: companyFinance?.pix_key ?? "",
      notes: companyFinance?.notes ?? "",
    } as any);
    setCompanyOpen(true);
  };

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-[color:var(--sinaxys-ink)]">
                <Building2 className="h-4 w-4 text-[color:var(--sinaxys-primary)]" />
                Dados da empresa (depósitos)
              </div>
              <div className="mt-1 text-xs text-muted-foreground">Informações para onde os depósitos devem ser feitos.</div>
            </div>
            {canEditCompany ? (
              <Button type="button" variant="outline" className="h-10 rounded-xl" onClick={openCompanyDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Configurar
              </Button>
            ) : null}
          </div>

          <Separator className="my-4" />

          {companyId ? (
            <div className="grid gap-2">
              <InfoRow icon={<Landmark className="h-4 w-4" />} label="Banco" value={companyFinance?.bank_name} />
              <div className="grid gap-2 sm:grid-cols-2">
                <InfoRow icon={<CreditCard className="h-4 w-4" />} label="Agência" value={companyFinance?.agency} />
                <InfoRow icon={<CreditCard className="h-4 w-4" />} label="Conta" value={companyFinance?.account_number} />
              </div>
              <InfoRow icon={<Receipt className="h-4 w-4" />} label="Titular" value={companyFinance?.account_holder} />
              <div className="grid gap-2 sm:grid-cols-2">
                <InfoRow icon={<FileText className="h-4 w-4" />} label="Razão social" value={companyFinance?.legal_name} />
                <InfoRow icon={<FileText className="h-4 w-4" />} label="CNPJ" value={companyFinance?.cnpj} />
              </div>
              <InfoRow icon={<Receipt className="h-4 w-4" />} label="Chave Pix (empresa)" value={companyFinance?.pix_key} />

              {companyFinance?.notes?.trim() ? (
                <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-[color:var(--sinaxys-ink)]">
                  <div className="text-xs font-semibold text-muted-foreground">Observações</div>
                  <div className="mt-1 whitespace-pre-wrap">{companyFinance.notes}</div>
                </div>
              ) : (
                <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">
                  {canEditCompany ? "Clique em “Configurar” para preencher os dados da empresa." : "Dados da empresa ainda não configurados."}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">Você ainda não está vinculado a uma empresa.</div>
          )}
        </Card>

        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-[color:var(--sinaxys-ink)]">
                <Landmark className="h-4 w-4 text-[color:var(--sinaxys-primary)]" />
                Seus dados para recebimento
              </div>
              <div className="mt-1 text-xs text-muted-foreground">Conta de destino e chave Pix para depósitos.</div>
            </div>
            <Button
              type="button"
              className="h-10 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              disabled={!companyId || saving || !dirtyMy}
              onClick={async () => {
                try {
                  setSaving(true);
                  await upsertUserFinancialProfile({
                    userId,
                    companyId,
                    destinationAccount: destinationAccount.trim() || null,
                    pixKey: pixKey.trim() || null,
                  });
                  await qc.invalidateQueries({ queryKey: ["user-financial", userId] });
                  toast({ title: "Dados de recebimento salvos" });
                } catch (e) {
                  toast({
                    title: "Não foi possível salvar",
                    description: e instanceof Error ? e.message : "Erro inesperado.",
                    variant: "destructive",
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

          <Separator className="my-4" />

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Conta de destino</Label>
              <Input
                className="h-11 rounded-xl"
                value={destinationAccount}
                onChange={(e) => setDestinationAccount(e.target.value)}
                placeholder="Ex.: Banco X • Ag 0001 • Cc 12345-6"
                disabled={!companyId}
              />
              <div className="text-xs text-muted-foreground">Escreva de um jeito fácil de conferir pelo financeiro.</div>
            </div>

            <div className="grid gap-2">
              <Label>Chave Pix</Label>
              <Input
                className="h-11 rounded-xl"
                value={pixKey}
                onChange={(e) => setPixKey(e.target.value)}
                placeholder="Ex.: seuemail@dominio.com"
                disabled={!companyId}
              />
            </div>

            <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">
              Estes dados ficam salvos no banco (tabela <span className="font-semibold">public.user_financial_profiles</span>).
            </div>
          </div>
        </Card>
      </div>

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-[color:var(--sinaxys-ink)]">
              <Receipt className="h-4 w-4 text-[color:var(--sinaxys-primary)]" />
              Controle de notas fiscais
            </div>
            <div className="mt-1 text-xs text-muted-foreground">Suba suas notas e acompanhe o status.</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white">Total: {summary.total}</Badge>
            <Badge className="rounded-full bg-amber-50 text-amber-800 hover:bg-amber-50">Pendentes: {summary.pending}</Badge>
            <Badge className="rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-50">Pagas: {summary.paid}</Badge>
            <Button
              type="button"
              className="h-10 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              disabled={!companyId}
              onClick={() => {
                setInvoiceNumber("");
                setIssueDate("");
                setAmount("");
                setDescription("");
                setFile(null);
                setSendOpen(true);
              }}
            >
              <Upload className="mr-2 h-4 w-4" />
              Enviar nota
            </Button>
          </div>
        </div>

        <Separator className="my-4" />

        {!companyId ? (
          <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">Você ainda não está vinculado a uma empresa.</div>
        ) : invoices.length ? (
          <div className="overflow-hidden rounded-2xl border border-[color:var(--sinaxys-border)]">
            <Table>
              <TableHeader>
                <TableRow className="bg-[color:var(--sinaxys-tint)]">
                  <TableHead className="text-xs font-semibold text-[color:var(--sinaxys-ink)]">Nota</TableHead>
                  <TableHead className="text-xs font-semibold text-[color:var(--sinaxys-ink)]">Data</TableHead>
                  <TableHead className="text-xs font-semibold text-[color:var(--sinaxys-ink)]">Valor</TableHead>
                  <TableHead className="text-xs font-semibold text-[color:var(--sinaxys-ink)]">Status</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-[color:var(--sinaxys-ink)]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => {
                  const b = statusBadge(inv.status);
                  return (
                    <TableRow key={inv.id} className="hover:bg-[color:var(--sinaxys-tint)]/40">
                      <TableCell className="py-3">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 grid h-9 w-9 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
                            <FileText className="h-4 w-4 text-[color:var(--sinaxys-primary)]" />
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">
                              {inv.invoice_number?.trim() ? `NF ${inv.invoice_number}` : inv.file_name || "Nota fiscal"}
                            </div>
                            {inv.description?.trim() ? (
                              <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{inv.description}</div>
                            ) : null}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="inline-flex items-center gap-2 text-sm text-[color:var(--sinaxys-ink)]">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {inv.issue_date || "—"}
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">
                          {typeof inv.amount_brl === "number" ? formatBRL(inv.amount_brl) : "—"}
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <Badge className={`rounded-full ${b.className}`}>{b.label}</Badge>
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="h-10 rounded-xl"
                            onClick={async () => {
                              try {
                                const url = await createInvoiceSignedUrl(inv.file_path, 60);
                                window.open(url, "_blank", "noopener,noreferrer");
                              } catch (e) {
                                toast({
                                  title: "Não foi possível abrir",
                                  description: e instanceof Error ? e.message : "Erro inesperado.",
                                  variant: "destructive",
                                });
                              }
                            }}
                          >
                            <FileDown className="mr-2 h-4 w-4" />
                            Abrir
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="h-10 rounded-xl"
                            onClick={async () => {
                              try {
                                // Remove primeiro o arquivo para evitar lixo.
                                await removeInvoiceFile(inv.file_path);
                                await deleteUserInvoice(inv.id);
                                await qc.invalidateQueries({ queryKey: ["user-invoices", companyId, userId] });
                                toast({ title: "Nota removida" });
                              } catch (e) {
                                toast({
                                  title: "Não foi possível remover",
                                  description: e instanceof Error ? e.message : "Erro inesperado.",
                                  variant: "destructive",
                                });
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">Nenhuma nota enviada ainda.</div>
        )}
      </Card>

      {/* Dialog: Enviar nota */}
      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent className="max-h-[88vh] max-w-[92vw] overflow-y-auto rounded-3xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Enviar nota fiscal</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">
              Envie PDF ou imagem. O arquivo vai para o Storage (bucket <span className="font-semibold">finance-invoices</span>).
            </div>

            <div className="grid gap-2">
              <Label>Número da nota (opcional)</Label>
              <Input className="h-11 rounded-xl" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="Ex.: 12345" />
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Data de emissão (opcional)</Label>
                <Input className="h-11 rounded-xl" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} placeholder="YYYY-MM-DD" />
              </div>
              <div className="grid gap-2">
                <Label>Valor (BRL) (opcional)</Label>
                <Input className="h-11 rounded-xl" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Ex.: 1500,00" inputMode="decimal" />
                <div className="text-xs text-muted-foreground">{amountNumber ? formatBRL(amountNumber) : "—"}</div>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Descrição (opcional)</Label>
              <Textarea className="min-h-20 rounded-2xl" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex.: Reembolso de despesas" />
            </div>

            <div className="grid gap-2">
              <Label>Arquivo</Label>
              <Input
                className="h-11 rounded-xl"
                type="file"
                accept="application/pdf,image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <div className="text-xs text-muted-foreground">{file ? `${file.name} • ${(file.size / 1024 / 1024).toFixed(2)} MB` : "Selecione um arquivo."}</div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setSendOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              disabled={!companyId || sending || !file}
              onClick={async () => {
                if (!companyId || !file) return;
                try {
                  setSending(true);
                  const invoiceId = crypto.randomUUID();

                  const uploaded = await uploadInvoiceFile({ userId, invoiceId, file });
                  await createUserInvoice({
                    id: invoiceId,
                    userId,
                    companyId,
                    invoiceNumber: invoiceNumber.trim() || null,
                    issueDate: issueDate.trim() || null,
                    amountBRL: amountNumber,
                    description: description.trim() || null,
                    filePath: uploaded.path,
                    fileName: uploaded.fileName,
                    mimeType: uploaded.mimeType,
                  });

                  await qc.invalidateQueries({ queryKey: ["user-invoices", companyId, userId] });
                  toast({ title: "Nota enviada" });
                  setSendOpen(false);
                } catch (e) {
                  toast({
                    title: "Não foi possível enviar",
                    description: e instanceof Error ? e.message : "Erro inesperado.",
                    variant: "destructive",
                  });
                } finally {
                  setSending(false);
                }
              }}
            >
              <Receipt className="mr-2 h-4 w-4" />
              {sending ? "Enviando…" : "Enviar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Dados da empresa */}
      <Dialog open={companyOpen} onOpenChange={setCompanyOpen}>
        <DialogContent className="max-h-[88vh] max-w-[92vw] overflow-y-auto rounded-3xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Dados da empresa (financeiro)</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">
              Esses dados ficam visíveis para os colaboradores na aba Financeiro.
            </div>

            <div className="grid gap-2">
              <Label>Razão social</Label>
              <Input
                className="h-11 rounded-xl"
                value={(companyDraft.legal_name as any) ?? ""}
                onChange={(e) => setCompanyDraft((s) => ({ ...s, legal_name: e.target.value }))}
              />
            </div>

            <div className="grid gap-2">
              <Label>CNPJ</Label>
              <Input
                className="h-11 rounded-xl"
                value={(companyDraft.cnpj as any) ?? ""}
                onChange={(e) => setCompanyDraft((s) => ({ ...s, cnpj: e.target.value }))}
              />
            </div>

            <div className="grid gap-2">
              <Label>Banco</Label>
              <Input
                className="h-11 rounded-xl"
                value={(companyDraft.bank_name as any) ?? ""}
                onChange={(e) => setCompanyDraft((s) => ({ ...s, bank_name: e.target.value }))}
                placeholder="Ex.: Itaú"
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Agência</Label>
                <Input
                  className="h-11 rounded-xl"
                  value={(companyDraft.agency as any) ?? ""}
                  onChange={(e) => setCompanyDraft((s) => ({ ...s, agency: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>Conta</Label>
                <Input
                  className="h-11 rounded-xl"
                  value={(companyDraft.account_number as any) ?? ""}
                  onChange={(e) => setCompanyDraft((s) => ({ ...s, account_number: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Titular</Label>
              <Input
                className="h-11 rounded-xl"
                value={(companyDraft.account_holder as any) ?? ""}
                onChange={(e) => setCompanyDraft((s) => ({ ...s, account_holder: e.target.value }))}
              />
            </div>

            <div className="grid gap-2">
              <Label>Chave Pix (empresa)</Label>
              <Input
                className="h-11 rounded-xl"
                value={(companyDraft.pix_key as any) ?? ""}
                onChange={(e) => setCompanyDraft((s) => ({ ...s, pix_key: e.target.value }))}
              />
            </div>

            <div className="grid gap-2">
              <Label>Observações</Label>
              <Textarea
                className="min-h-20 rounded-2xl"
                value={(companyDraft.notes as any) ?? ""}
                onChange={(e) => setCompanyDraft((s) => ({ ...s, notes: e.target.value }))}
                placeholder="Ex.: Enviar comprovante para financeiro@..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setCompanyOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              disabled={!companyId || companySaving}
              onClick={async () => {
                if (!companyId) return;
                try {
                  setCompanySaving(true);
                  await upsertCompanyFinanceSettings({
                    companyId,
                    patch: {
                      legal_name: String(companyDraft.legal_name ?? "").trim() || null,
                      cnpj: String(companyDraft.cnpj ?? "").trim() || null,
                      bank_name: String(companyDraft.bank_name ?? "").trim() || null,
                      agency: String(companyDraft.agency ?? "").trim() || null,
                      account_number: String(companyDraft.account_number ?? "").trim() || null,
                      account_holder: String(companyDraft.account_holder ?? "").trim() || null,
                      pix_key: String(companyDraft.pix_key ?? "").trim() || null,
                      notes: String(companyDraft.notes ?? "").trim() || null,
                    },
                  });
                  await qc.invalidateQueries({ queryKey: ["company-finance", companyId] });
                  toast({ title: "Dados da empresa salvos" });
                  setCompanyOpen(false);
                } catch (e) {
                  toast({
                    title: "Não foi possível salvar",
                    description: e instanceof Error ? e.message : "Erro inesperado.",
                    variant: "destructive",
                  });
                } finally {
                  setCompanySaving(false);
                }
              }}
            >
              <Save className="mr-2 h-4 w-4" />
              {companySaving ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}