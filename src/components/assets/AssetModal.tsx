import React, { useEffect, useState } from "react";
import { BlurDialog, BlurDialogContent, BlurDialogHeader, BlurDialogTitle, BlurDialogFooter } from "@/components/BlurDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getAssetWithDetails, deleteAsset, uploadAssetDocumentFile, createAssetDocument } from "@/lib/assetsDb";
import { useCompany } from "@/lib/company";
import { useAuth } from "@/lib/auth";
import { X, Trash2, Edit3, UploadCloud } from "lucide-react";

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

  useEffect(() => {
    if (!open) return;
    async function load() {
      if (!assetId) return;
      setLoading(true);
      try {
        const a = await getAssetWithDetails(assetId);
        setAsset(a);
      } catch (e: any) {
        toast({ title: "Erro ao carregar ativo", description: e?.message ?? String(e), variant: "destructive" });
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [open, assetId]);

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
        // store path as file_url
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
      toast({ title: "Erro ao anexar documento", description: e?.message ?? String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <BlurDialog open={open} onOpenChange={onOpenChange}>
      <BlurDialogContent>
        <BlurDialogHeader>
          <BlurDialogTitle>{asset?.asset_code ?? "Detalhes do ativo"}</BlurDialogTitle>
        </BlurDialogHeader>

        <div className="mt-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm text-muted-foreground">{asset?.asset_type}</div>
              <div className="text-xs text-muted-foreground">{asset?.brand} {asset?.model}</div>
            </div>
            <div className="flex items-center gap-2">
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
                      <div className="font-medium">{d.title}</div>
                      <div className="text-xs text-muted-foreground">{d.document_type}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleDateString()}</div>
                  </div>
                ))}
                {(!asset?.documents || asset.documents.length === 0) && (
                  <div className="text-sm text-muted-foreground">Nenhum documento</div>
                )}
              </div>
            </Card>

            <form onSubmit={handleUpload} className="space-y-2">
              <div>
                <Label>Título</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título do documento (opcional)" />
              </div>
              <div>
                <Label>Arquivo</Label>
                <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
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
        </div>

        <BlurDialogFooter />
      </BlurDialogContent>
    </BlurDialog>
  );
}
