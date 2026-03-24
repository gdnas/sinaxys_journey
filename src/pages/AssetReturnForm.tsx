import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, X } from "lucide-react";
import { getAsset, getAssetWithDetails, completeAssignment } from "@/lib/assetsDb";
import { RequireAuth } from "@/components/RequireAuth";
import { RequireCompanyModule } from "@/components/RequireCompanyModule";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export default function AssetReturnForm() {
  const { assetId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [asset, setAsset] = useState<any>(null);

  const [formData, setFormData] = useState({
    returned_at: new Date().toISOString().split('T')[0],
    return_condition: "good",
    return_notes: "",
  });

  useEffect(() => {
    async function loadAsset() {
      if (!assetId) return;

      try {
        const data = await getAssetWithDetails(assetId);
        setAsset(data);
      } catch (error) {
        console.error("Error loading asset:", error);
      }
    }

    loadAsset();
  }, [assetId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!asset?.current_assignment?.id) {
      return toast({ title: "Não há cessão ativa para este ativo", variant: "destructive" });
    }

    setLoading(true);
    try {
      await completeAssignment(asset.current_assignment.id, {
        returned_at: formData.returned_at,
        return_condition: formData.return_condition as any,
        return_notes: formData.return_notes || undefined,
      });

      toast({ title: "Devolução registrada com sucesso" });
      navigate(`/app/ativos/${assetId}`);
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Não foi possível registrar a devolução.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  if (!asset) return <div className="p-6">Carregando...</div>;

  return (
    <RequireAuth roles={["MASTERADMIN", "ADMIN"]}>
      <RequireCompanyModule moduleKey="ASSETS">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="flex items-center gap-3">
            <Link to={`/app/ativos/${assetId}`}>
              <Button variant="ghost" className="rounded-2xl" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-[color:var(--sinaxys-ink)]">Registrar Devolução</h1>
              <p className="text-sm text-muted-foreground">{asset.asset_code} - {asset.asset_type}</p>
            </div>
          </div>

          {asset.current_assignment && (
            <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-tint)]/20 p-4">
              <div className="text-sm">
                <span className="font-semibold">Com o colaborador:</span>{" "}
                {asset.current_assignment.profile?.name} desde{" "}
                {new Date(asset.current_assignment.assigned_at).toLocaleDateString("pt-BR")}
              </div>
            </Card>
          )}

          <form onSubmit={handleSubmit}>
            <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6 space-y-6">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label>Data da devolução *</Label>
                  <Input
                    type="date"
                    value={formData.returned_at}
                    onChange={(e) => setFormData({ ...formData, returned_at: e.target.value })}
                    className="rounded-2xl"
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Estado de conservação na devolução *</Label>
                  <Select value={formData.return_condition} onValueChange={(v) => setFormData({ ...formData, return_condition: v })}>
                    <SelectTrigger className="rounded-2xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">Novo</SelectItem>
                      <SelectItem value="good">Bom</SelectItem>
                      <SelectItem value="fair">Regular</SelectItem>
                      <SelectItem value="poor">Ruim</SelectItem>
                      <SelectItem value="damaged">Danificado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>Observações</Label>
                  <Textarea
                    value={formData.return_notes}
                    onChange={(e) => setFormData({ ...formData, return_notes: e.target.value })}
                    placeholder="Informações adicionais sobre a devolução..."
                    className="rounded-2xl min-h-24"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[color:var(--sinaxys-border)]">
                <Button type="button" variant="outline" className="rounded-2xl" onClick={() => navigate(-1)}>
                  <X className="mr-2 h-4 w-4" />
                  Cancelar
                </Button>
                <Button type="submit" className="rounded-2xl bg-[color:var(--sinaxys-primary)] text-white" disabled={loading}>
                  <Save className="mr-2 h-4 w-4" />
                  {loading ? "Salvando..." : "Registrar devolução"}
                </Button>
              </div>
            </Card>
          </form>
        </div>
      </RequireCompanyModule>
    </RequireAuth>
  );
}
