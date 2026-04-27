import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getProfile } from "@/lib/profilesDb";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload } from "lucide-react";
import type { DbProfile } from "@/lib/profilesDb";
import { listUserDocuments } from "@/lib/documentsDb";
import { listUserInvoices, createInvoiceSignedUrl, uploadInvoiceFile, createUserInvoice } from "@/lib/financeDb";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/costs";

function formatTenure(joinedAt?: string | null) {
  if (!joinedAt) return "—";
  const join = new Date(joinedAt);
  if (Number.isNaN(join.getTime())) return "—";
  const now = new Date();
  let years = now.getFullYear() - join.getFullYear();
  let months = now.getMonth() - join.getMonth();
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (years <= 0 && months <= 0) return "Menos de 1 mês";
  const parts = [];
  if (years > 0) parts.push(`${years} ano${years > 1 ? "s" : ""}`);
  if (months > 0) parts.push(`${months} mês${months > 1 ? "es" : ""}`);
  return parts.join(" e ");
}

export default function MinimalLimitedProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: () => (user?.id ? getProfile(user.id) : Promise.resolve(null)),
    enabled: !!user?.id,
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["user-documents", user?.companyId, user?.id],
    queryFn: () => (user?.companyId && user?.id ? listUserDocuments({ companyId: user.companyId, userId: user.id }) : Promise.resolve([])),
    enabled: !!user?.companyId && !!user?.id,
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["user-invoices", user?.companyId, user?.id],
    queryFn: () => (user?.companyId && user?.id ? listUserInvoices({ userId: user.id, companyId: user.companyId }) : Promise.resolve([])),
    enabled: !!user?.companyId && !!user?.id,
  });

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

  const p = profile as DbProfile | null;
  if (!p) return null;

  const invoiceSummary = useMemo(() => {
    const total = invoices.length;
    let totalAmount = 0;
    let paidAmount = 0;
    for (const inv of invoices) {
      const amt = typeof inv.amount_brl === "number" ? inv.amount_brl : Number(inv.amount_brl ?? 0);
      totalAmount += amt;
      if (String(inv.status ?? "").toUpperCase() === "PAGA") paidAmount += amt;
    }
    return { total, totalAmount, paidAmount };
  }, [invoices]);

  const handleOpenInvoice = async (inv: any) => {
    try {
      const url = await createInvoiceSignedUrl(inv.file_path, 60);
      // Audit log: user viewed invoice while in limited access
      try {
        await supabase.from("audit_logs").insert({
          company_id: user?.companyId ?? null,
          actor_user_id: user?.id ?? null,
          target_user_id: user?.id ?? null,
          action: "offboarding_view_invoice",
          meta: { invoice_id: inv.id, viewed_at: new Date().toISOString() },
        });
      } catch {
        // ignore audit failures
      }
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      // fallback: try direct file path or do nothing
      console.error("Failed to open invoice", e);
    }
  };

  const handleUploadInvoice = async () => {
    if (!user?.companyId) return;
    if (!file) return;
    if (!issueDate) return;
    if (!amountNumber) return;

    setSending(true);
    try {
      const invoiceId = crypto.randomUUID();
      const { path, fileName, mimeType } = await uploadInvoiceFile({
        userId: user.id,
        invoiceId,
        file,
      });

      // Audit log: user uploaded invoice during offboarding
      try {
        await supabase.from("audit_logs").insert({
          company_id: user.companyId,
          actor_user_id: user.id,
          target_user_id: user.id,
          action: "offboarding_upload_invoice",
          meta: { invoice_id: invoiceId, uploaded_at: new Date().toISOString() },
        });
      } catch {
        // ignore audit failures
      }

      await createUserInvoice({
        id: invoiceId,
        companyId: user.companyId,
        userId: user.id,
        invoiceNumber: invoiceNumber.trim() || null,
        issueDate,
        amountBRL: amountNumber,
        description: description.trim() || null,
        filePath: path,
        fileName,
        mimeType,
      });

      await qc.invalidateQueries({ queryKey: ["user-invoices", user.companyId, user.id] });

      toast({ title: "Nota fiscal enviada" });
      setSendOpen(false);
      setInvoiceNumber("");
      setIssueDate("");
      setAmount("");
      setDescription("");
      setFile(null);
    } catch (e) {
      toast({
        title: "Não foi possível enviar a nota fiscal",
        description: e instanceof Error ? e.message : "Erro inesperado.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 grid gap-6">
      <Card className="rounded-3xl p-6">
        <div className="text-lg font-semibold">Acesso limitado</div>
        <p className="mt-2 text-sm text-muted-foreground">Seu acesso à plataforma foi suspenso porque você está em processo de desligamento. Aqui você pode consultar documentos relacionados ao seu contrato e seu histórico na empresa.</p>

        <div className="mt-4 grid gap-4">
          {p.contract_url ? (
            <a href={p.contract_url} target="_blank" rel="noreferrer">
              <Button className="w-full">Ver contrato assinado</Button>
            </a>
          ) : null}

          {documents?.length ? (
            <div>
              <div className="text-sm font-semibold">Documentos</div>
              <div className="mt-2 grid gap-2">
                {documents.map((d: any) => (
                  <a key={d.id} href={d.url} target="_blank" rel="noreferrer" className="inline-block text-sm text-[color:var(--sinaxys-primary)] hover:underline">
                    {d.title}
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-4 text-xs text-muted-foreground">Se precisar de mais informações, contate o RH da sua empresa.</div>
      </Card>

      <Card className="rounded-3xl p-6">
        <div className="text-sm font-semibold">Resumo na empresa</div>
        <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
          <div className="flex items-center justify-between">
            <div>Data de admissão</div>
            <div className="font-semibold text-[color:var(--sinaxys-ink)]">{p.joined_at ? new Date(p.joined_at).toLocaleDateString("pt-BR") : "—"}</div>
          </div>
          <div className="flex items-center justify-between">
            <div>Tempo de casa</div>
            <div className="font-semibold text-[color:var(--sinaxys-ink)]">{formatTenure(p.joined_at)}</div>
          </div>
          <div className="flex items-center justify-between">
            <div>Cargo</div>
            <div className="font-semibold text-[color:var(--sinaxys-ink)]">{p.job_title ?? "—"}</div>
          </div>
          <div className="flex items-center justify-between">
            <div>Custo mensal</div>
            <div className="font-semibold text-[color:var(--sinaxys-ink)]">{typeof p.monthly_cost_brl === "number" ? brl(p.monthly_cost_brl) : (p.monthly_cost_brl ? brl(Number(p.monthly_cost_brl)) : "—")}</div>
          </div>
          <div className="flex items-center justify-between">
            <div>Notas enviadas</div>
            <div className="font-semibold text-[color:var(--sinaxys-ink)]">{invoiceSummary.total}</div>
          </div>
          <div className="flex items-center justify-between">
            <div>Total faturado</div>
            <div className="font-semibold text-[color:var(--sinaxys-ink)]">{invoiceSummary.totalAmount ? brl(invoiceSummary.totalAmount) : "—"}</div>
          </div>
          <div className="flex items-center justify-between">
            <div>Total recebido</div>
            <div className="font-semibold text-[color:var(--sinaxys-ink)]">{invoiceSummary.paidAmount ? brl(invoiceSummary.paidAmount) : "—"}</div>
          </div>
        </div>
      </Card>

      <Card className="rounded-3xl p-6">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Minhas notas fiscais</div>
          <div className="flex items-center gap-2">
            <div className="text-xs text-muted-foreground">Você pode enviar notas mesmo durante o desligamento</div>
            <Button
              type="button"
              className="h-10 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
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

        <div className="mt-4 grid gap-3">
          {invoices.length ? (
            invoices.map((inv: any) => (
              <div key={inv.id} className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-3">
                <div>
                  <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">{inv.invoice_number ? `NF ${inv.invoice_number}` : inv.file_name || "Nota fiscal"}</div>
                  <div className="text-xs text-muted-foreground">{inv.issue_date ?? "—"} — {typeof inv.amount_brl === "number" ? brl(inv.amount_brl) : "—"}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" className="h-9 rounded-xl" onClick={() => handleOpenInvoice(inv)}>Abrir</Button>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">Nenhuma nota enviada ainda.</div>
          )}
        </div>
      </Card>

      {/* Dialog: Enviar nota */}
      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent className="max-h-[88vh] max-w-[92vw] overflow-y-auto rounded-3xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Enviar nota fiscal</DialogTitle>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label>Número da nota (opcional)</Label>
              <Input className="h-11 rounded-2xl" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="Ex.: 12345" />
            </div>

            <div className="grid gap-2">
              <Label>Data de emissão</Label>
              <Input className="h-11 rounded-2xl" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </div>

            <div className="grid gap-2">
              <Label>Valor (R$)</Label>
              <Input className="h-11 rounded-2xl" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Ex.: 4500" inputMode="decimal" />
            </div>

            <div className="grid gap-2">
              <Label>Descrição (opcional)</Label>
              <Textarea className="min-h-[90px] rounded-2xl" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex.: Prestação de serviços — Jan/2026" />
            </div>

            <div className="grid gap-2">
              <Label>Arquivo (PDF ou imagem)</Label>
              <Input
                type="file"
                className="h-11 rounded-2xl"
                accept="application/pdf,image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setSendOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              disabled={sending || !user?.companyId || !issueDate || !amountNumber || !file}
              onClick={handleUploadInvoice}
            >
              <Upload className="mr-2 h-4 w-4" />
              {sending ? "Enviando..." : "Enviar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
