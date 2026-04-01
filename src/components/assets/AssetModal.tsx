import React, { useEffect, useState } from "react";
import { BlurDialog, BlurDialogContent, BlurDialogHeader, BlurDialogTitle, BlurDialogFooter } from "@/components/BlurDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getAssetWithDetails, deleteAsset, uploadAssetDocumentFile, createAssetDocument, createAssetDocumentSignedUrl } from "@/lib/assetsDb";
import { useCompany } from "@/lib/company";
import { useAuth } from "@/lib/auth";
import { X, Trash2, Edit3, UploadCloud, QrCode } from "lucide-react";
import AssetQRLabel from "@/components/assets/AssetQRLabel";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  assetId?: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDeleted?: () => void;
  onUpdated?: () => void;
};

export default function AssetModal({ assetId, open, onOpenChange, onDeleted, onUpdated }: Props) {
  const { toast } = useToast();
  const { companyId } = useCompany();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [asset, setAsset] = useState<any | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [link, setLink] = useState("");
  const [title, setTitle] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<string | null>(null);
  const [showQRLabel, setShowQRLabel] = useState(false);

  useEffect(() => {
    if (!open) return;
    async function load() {
      if (!assetId) return;
      setLoading(true);
      try {
        const a = await getAssetWithDetails(assetId);
        setAsset(a);
      } catch (e: any) {
        console.error("AssetModal: failed to load asset", e);
        toast({ title: "Erro ao carregar ativo", description: e?.message ?? String(e), variant: "destructive" });
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [open, assetId]);

  async function ensureQrCodeUrl() {
    if (!assetId || !asset) return;
    if (asset.qr_code_url) return; // já existe

    try {
      const url = `${window.location.origin}/ativo/${assetId}`;
      const { error } = await supabase.from('assets').update({ qr_code_url: url }).eq('id', assetId);
      if (error) throw error;
      // atualizar estado local
      setAsset((prev: any) => ({ ...prev, qr_code_url: url }));
    } catch (e) {
      console.warn('Falha ao atualizar qr_code_url:', e);
    }
  }

  const handleShowQR = async () => {
    if (!asset) return;
    await ensureQrCodeUrl();
    setShowQRLabel(true);
  };

  async function handleDelete() {
    if (!assetId) return;
    if (!confirm("Confirma exclusão deste ativo?")) return;
    setLoading(true);
    try {
      await deleteAsset(assetId);
      toast({ title: "Ativo excluído" });
      onDeleted?.();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Erro ao excluir", description: e?.message ?? String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!companyId || !assetId) return;
    if (!file && !link) {
      toast({ title: "Selecione um arquivo ou informe um link", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      let fileUrl = link || null;
      let docTitle = title || (file ? file.name : link);
      if (file) {
        const uploaded = await uploadAssetDocumentFile({ tenantId: companyId, assetId, file });
        fileUrl = uploaded.path;
      }

      await createAssetDocument({
        tenant_id: companyId,
        asset_id: assetId,
        assignment_id: asset?.current_assignment?.id ?? null,
        incident_id: null,
        document_type: file ? "other" : "other",
        title: docTitle,
        file_url: fileUrl || "",
        file_name: file ? file.name : null,
        file_size_bytes: file ? file.size : null,
        mime_type: file ? file.type : null,
        uploaded_by: user?.id ?? null,
      });

      toast({ title: "Documento anexado" });
      setFile(null);
      setLink("");
      setTitle("");
      // refresh asset
      const a = await getAssetWithDetails(assetId);
      setAsset(a);
      onUpdated?.();
    } catch (e: any) {
      console.error("AssetModal: upload error", e);
      // Show detailed message when available
      const detail = e?.message ?? (typeof e === 'string' ? e : JSON.stringify(e));
      toast({ title: "Erro ao anexar documento", description: detail, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  // Drag & drop
  function handleDrop(ev: React.DragEvent) {
    ev.preventDefault();
    const f = ev.dataTransfer.files?.[0];
    if (f) setFile(f);
  }
  function handleDragOver(ev: React.DragEvent) { ev.preventDefault(); }

  async function openDocument(doc: any) {
    try {
      let url = doc.file_url;
      if (!url) {
        toast({ title: "Documento sem url" });
        return;
      }
      // If it's a storage path (contains '/'), try to create signed url
      if (companyId && url && !url.startsWith('http')) {
        try {
          const signed = await createAssetDocumentSignedUrl(url, 60);
          url = signed;
        } catch (e) {
          console.warn("AssetModal: failed to create signed url", e);
          // fallback - proceed with original url
        }
      }
      setPreviewUrl(url);
      // determine type
      const lower = (doc.file_name || url || "").toLowerCase();
      if (lower.endsWith('.pdf')) setPreviewType('pdf');
      else if (lower.match(/\.(png|jpg|jpeg|gif|webp)$/)) setPreviewType('image');
      else setPreviewType('other');
      setPreviewOpen(true);
    } catch (e: any) {
      toast({ title: "Erro ao abrir documento", description: e?.message ?? String(e), variant: "destructive" });
    }
  }

  const roleValue = (user?.role || "").toString().toUpperCase();
  const canManage = roleValue === "MASTERADMIN" || roleValue === "ADMIN";

  return (
    <>
      <BlurDialog open={open} onOpenChange={onOpenChange}>
        <BlurDialogContent>
          <BlurDialogHeader>
            <BlurDialogTitle>{asset?.asset_code ?? "Detalhes do ativo"}</BlurDialogTitle>
          </BlurDialogHeader>

          <div className="mt-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="text-sm text-muted-foreground">{asset?.asset_type}</div>
                <div className="text-xs text-muted-foreground">{asset?.brand} {asset?.model} {asset?.serial_number ? `• S/N: ${asset.serial_number}` : ''}</div>
                <div className="mt-2 text-sm">
                  <div><span className="font-medium">Localização:</span> {asset?.current_location ?? '—'}</div>
                  <div><span className="font-medium">Fornecedor:</span> {asset?.supplier ?? '—'}</div>
                  <div><span className="font-medium">Data compra:</span> {asset?.purchase_date ? new Date(asset.purchase_date).toLocaleDateString() : '—'}</div>
                  <div><span className="font-medium">Valor compra:</span> {asset?.purchase_value ? `R$ ${Number(asset.purchase_value).toLocaleString()}` : '—'}</div>
                  <div><span className="font-medium">Valor residual:</span> {asset?.residual_value_current ? `R$ ${Number(asset.residual_value_current).toLocaleString()}` : '—'}</div>
                  <div><span className="font-medium">Vida útil (meses):</span> {asset?.useful_life_months ?? '—'}</div>
                </div>
                {asset?.notes && (
                  <div className="mt-3 text-sm text-[color:var(--sinaxys-ink)]/80">{asset.notes}</div>
                )}
              </div>

              <div className="flex items-start gap-2">
                <Button size="sm" variant="outline" onClick={handleShowQR}><QrCode className="mr-2 h-4 w-4"/>Etiqueta</Button>
                {canManage && asset?.status === 'in_stock' && (
                  <Button asChild size="sm" variant="secondary"><a href={`/app/ativos/${assetId}/entregar`}>Entregar</a></Button>
                )}
                <Button asChild size="sm" variant="outline"><a href={`/app/ativos/${assetId}/editar`}><Edit3 className="mr-2 h-4 w-4"/>Editar</a></Button>
                <Button size="sm" variant="destructive" onClick={handleDelete}><Trash2 className="mr-2 h-4 w-4"/>Excluir</Button>
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              <Card className="p-4">
                <div className="text-sm font-semibold">Status</div>
                <div className="mt-2">{asset?.status}</div>
              </Card>

              <Card className="p-4">
                <div className="text-sm font-semibold">Cessão Atual</div>
                {asset?.current_assignment ? (
                  <div className="mt-2">
                    <div>{asset.current_assignment.profile?.name}</div>
                    <div className="text-xs text-muted-foreground">{asset.current_assignment.modality}</div>
                  </div>
                ) : (
                  <div className="mt-2 text-sm text-muted-foreground">Sem cessão ativa</div>
                )}
              </Card>

              <Card className="p-4">
                <div className="text-sm font-semibold">Documentos</div>
                <div className="mt-2 space-y-2">
                  {(asset?.documents || []).map((d: any) => (
                    <div key={d.id} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-[color:var(--sinaxys-ink)]">
                          <button className="underline" onClick={() => openDocument(d)}>{d.title}</button>
                        </div>
                        <div className="mt-1 text-xs text-[color:var(--sinaxys-ink)]/70">{d.document_type} • {d.file_name ?? ''}</div>
                      </div>
                      <div className="text-xs text-[color:var(--sinaxys-ink)]/70">{d.created_at ? new Date(d.created_at).toLocaleDateString() : ''}</div>
                    </div>
                  ))}
                  {(!asset?.documents || asset.documents.length === 0) && (
                    <div className="text-sm text-muted-foreground">Nenhum documento</div>
                  )}
                </div>
              </Card>

              <Card className="p-4">
                <div className="text-sm font-semibold mb-2">Anexar documento</div>
                <div onDrop={handleDrop} onDragOver={handleDragOver} className="rounded-xl border-dashed border-2 border-[color:var(--sinaxys-border)] p-4">
                  <form onSubmit={handleUpload} className="space-y-2">
                    <div>
                      <Label>Título</Label>
                      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título do documento (opcional)" />
                    </div>
                    <div>
                      <Label>Arquivo (arraste ou selecione)</Label>
                      <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                      {file && <div className="text-xs mt-1">Arquivo selecionado: {file.name} — {(file.size / 1024).toFixed(0)} KB</div>}
                    </div>
                    <div>
                      <Label>ou Link do contrato</Label>
                      <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://..." />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="submit" className="rounded-xl" disabled={loading}><UploadCloud className="mr-2"/>Anexar</Button>
                      <Button variant="ghost" onClick={() => onOpenChange(false)}><X className="mr-2"/>Fechar</Button>
                    </div>
                  </form>
                </div>
              </Card>

              <Card className="p-4">
                <div className="text-sm font-semibold mb-2">Logs</div>
                <div className="space-y-2">
                  {(asset?.events || []).length ? (
                    (asset.events || []).map((ev: any) => (
                      <div key={ev.id} className="rounded-md border p-2">
                        <div className="text-xs text-[color:var(--sinaxys-ink)]/70">{new Date(ev.event_date).toLocaleString()}</div>
                        <div className="font-medium text-[color:var(--sinaxys-ink)]">{ev.title || ev.event_type}</div>
                        {ev.description && <div className="text-sm text-[color:var(--sinaxys-ink)]/70">{ev.description}</div>}
                        {ev.metadata && <pre className="mt-2 text-xs text-[color:var(--sinaxys-ink)]/70">{JSON.stringify(ev.metadata, null, 2)}</pre>}
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground">Nenhum evento registrado.</div>
                  )}
                </div>
              </Card>

            </div>
          </div>

          <BlurDialogFooter />
        </BlurDialogContent>
      </BlurDialog>

      {showQRLabel && asset && (
        <AssetQRLabel
          assetCode={asset.asset_code}
          assetType={asset.asset_type}
          qrCodeUrl={asset.qr_code_url || `${window.location.origin}/ativo/${asset.id}`}
          brand={asset.brand}
          model={asset.model}
          onClose={() => setShowQRLabel(false)}
        />
      )}

      {/* Preview dialog */}
      {previewOpen && (
        <BlurDialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <BlurDialogContent>
            <BlurDialogHeader>
              <BlurDialogTitle>Visualizar documento</BlurDialogTitle>
            </BlurDialogHeader>
            <div className="p-4">
              {previewType === 'image' && previewUrl && (
                // eslint-disable-next-line jsx-a11y/img-redundant-alt
                <img src={previewUrl} alt="preview image" className="max-h-[70vh] w-auto mx-auto" />
              )}
              {previewType === 'pdf' && previewUrl && (
                <iframe src={previewUrl} title="pdf preview" className="w-full h-[70vh]" />
              )}
              {previewType === 'other' && previewUrl && (
                <div className="text-center">
                  <a href={previewUrl} target="_blank" rel="noreferrer" className="text-[color:var(--sinaxys-primary)] underline">Abrir documento em nova aba</a>
                </div>
              )}
            </div>
            <BlurDialogFooter />
          </BlurDialogContent>
        </BlurDialog>
      )}
    </>
  );
}