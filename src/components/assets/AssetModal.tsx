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
import { getAssetStatusLabel } from "@/lib/assetsDb";

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
        // fetch company name to ensure it's available for the label
        try {
          const { data: comp } = await supabase.from('companies').select('name').eq('id', a.tenant_id).maybeSingle();
          if (comp && comp.name) {
            setAsset((prev: any) => ({ ...(prev || {}), company_name: comp.name }));
          }
        } catch (e) {
          // ignore
        }
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
        <BlurDialogContent className="max-w-5xl w-full">
          <BlurDialogHeader>
            <BlurDialogTitle>{asset?.asset_code ?? "Detalhes do ativo"}</BlurDialogTitle>
          </BlurDialogHeader>

          <div className="mt-4 overflow-auto max-h-[72vh]">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Left column: visual + main actions */}
              <div className="md:col-span-1 flex flex-col gap-4">
                <Card className="p-4 rounded-2xl w-full">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-28 h-28 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center mb-3">
                      <div className="text-2xl font-bold text-indigo-700">{asset?.asset_code ? asset.asset_code.slice(0,3) : '—'}</div>
                    </div>
                    <div className="text-sm font-semibold text-slate-900">{asset?.asset_type}</div>
                    <div className="text-xs text-slate-500">{asset?.company_name}</div>

                    <div className="mt-4 flex w-full gap-2 flex-wrap">
                      <Button size="sm" className="flex-1 min-w-[120px]" variant="ghost" onClick={handleShowQR}><QrCode className="mr-2"/>Etiqueta</Button>
                      {canManage && <Button size="sm" className="flex-1 min-w-[120px]" asChild><a href={`/app/ativos/${assetId}/entregar`}>Entregar</a></Button>}
                    </div>

                    <div className="mt-3 w-full flex gap-2 flex-wrap">
                      <Button size="sm" variant="outline" className="flex-1 min-w-[120px]" asChild><a href={`/app/ativos/${assetId}/editar`}><Edit3 className="mr-2"/>Editar</a></Button>
                      <Button size="sm" variant="destructive" className="flex-1 min-w-[120px]" onClick={handleDelete}><Trash2 className="mr-2"/>Excluir</Button>
                    </div>
                  </div>
                </Card>

                <Card className="mt-0 p-4 rounded-2xl w-full">
                  <div className="text-sm font-semibold mb-2">Status</div>
                  <div className="inline-block px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-sm font-medium">{getAssetStatusLabel(asset?.status)}</div>

                  <div className="mt-4 text-sm font-semibold">Cessão Atual</div>
                  {asset?.current_assignment ? (
                    <div className="mt-2">
                      <div className="font-medium">{asset.current_assignment.profile?.name}</div>
                      <div className="text-xs text-muted-foreground">{asset.current_assignment.modality}</div>
                    </div>
                  ) : (
                    <div className="mt-2 text-sm text-muted-foreground">Sem cessão ativa</div>
                  )}
                </Card>
              </div>

              {/* Right column: details */}
              <div className="md:col-span-3">
                <Card className="p-6 rounded-2xl w-full">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <div className="text-xs text-muted-foreground">Código</div>
                      <div className="font-medium text-lg">{asset?.asset_code}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Tipo</div>
                      <div className="font-medium">{asset?.asset_type}</div>
                    </div>

                    <div>
                      <div className="text-xs text-muted-foreground">Marca / Modelo</div>
                      <div className="font-medium">{[asset?.brand, asset?.model].filter(Boolean).join(' • ') || '—'}</div>
                    </div>

                    <div>
                      <div className="text-xs text-muted-foreground">Número de série</div>
                      <div className="font-medium">{asset?.serial_number || '—'}</div>
                    </div>

                    <div>
                      <div className="text-xs text-muted-foreground">Localização</div>
                      <div className="font-medium">{asset?.current_location || '—'}</div>
                    </div>

                    <div>
                      <div className="text-xs text-muted-foreground">Fornecedor</div>
                      <div className="font-medium">{asset?.supplier || '—'}</div>
                    </div>

                    <div>
                      <div className="text-xs text-muted-foreground">Data compra</div>
                      <div className="font-medium">{asset?.purchase_date ? new Date(asset.purchase_date).toLocaleDateString() : '—'}</div>
                    </div>

                    <div>
                      <div className="text-xs text-muted-foreground">Valor compra</div>
                      <div className="font-medium">{asset?.purchase_value ? `R$ ${Number(asset.purchase_value).toLocaleString()}` : '—'}</div>
                    </div>

                    <div>
                      <div className="text-xs text-muted-foreground">Valor residual atual</div>
                      <div className="font-medium">{asset?.residual_value_current ? `R$ ${Number(asset.residual_value_current).toLocaleString()}` : '—'}</div>
                    </div>

                    <div className="md:col-span-2">
                      <div className="text-xs text-muted-foreground">Observações</div>
                      <div className="mt-1 text-sm text-[color:var(--sinaxys-ink)]/80">{asset?.notes || '—'}</div>
                    </div>
                  </div>
                </Card>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="p-4 rounded-2xl">
                    <div className="text-sm font-semibold mb-2">Dados Financeiros</div>
                    <div className="text-sm">
                      <div><span className="text-xs text-muted-foreground">Vida útil (meses): </span><span className="font-medium">{asset?.useful_life_months ?? '—'}</span></div>
                      <div className="mt-2"><span className="text-xs text-muted-foreground">Depreciação: </span><span className="font-medium">{asset?.depreciation_method || '—'}</span></div>
                    </div>
                  </Card>

                  <Card className="p-4 rounded-2xl col-span-2 md:col-span-1">
                    <div className="text-sm font-semibold mb-2">Documentos</div>
                    <div className="space-y-2">
                      {(asset?.documents || []).length ? (
                        (asset.documents || []).map((d: any) => (
                          <div key={d.id} className="flex items-center justify-between">
                            <div>
                              <button className="text-sm font-medium text-[color:var(--sinaxys-ink)] underline" onClick={() => openDocument(d)}>{d.title}</button>
                              <div className="text-xs text-muted-foreground">{d.file_name || ''}</div>
                            </div>
                            <div className="text-xs text-muted-foreground">{d.created_at ? new Date(d.created_at).toLocaleDateString() : ''}</div>
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-muted-foreground">Nenhum documento</div>
                      )}
                    </div>
                  </Card>
                </div>

              </div>
            </div>
          </div>

          <BlurDialogFooter />
        </BlurDialogContent>
      </BlurDialog>

      {showQRLabel && asset && (
        <AssetQRLabel
          assetCode={asset.asset_code}
          assetType={asset.asset_type}
          qrCodeUrl={asset.qr_code_url || `https://kairoos.ai/companies/${asset.tenant_id}/assets/${asset.id}/demo`}
          brand={asset.brand}
          model={asset.model}
          companyName={asset.company_name || ''}
          registeredAt={asset.created_at}
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