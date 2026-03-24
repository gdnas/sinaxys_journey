import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, X, AlertTriangle } from "lucide-react";
import { useCompany } from "@/lib/company";
import { getAsset, getAssetWithDetails, createIncident } from "@/lib/assetsDb";
import { RequireAuth } from "@/components/RequireAuth";
import { RequireCompanyModule } from "@/components/RequireCompanyModule";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export default function AssetIncidentForm() {
  const { assetId } = useParams();
  const navigate = useNavigate();
  const { companyId } = useCompany();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [asset, setAsset] = useState<any>(null);

  const [formData, setFormData] = useState({
    incident_type: "damage",
    description: "",
    incident_date: new Date().toISOString().split('T')[0],
    police_report_url: "",
    resolution_status: "in_analysis",
    resolution_notes: "",
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

    if (!formData.description.trim()) {
      return toast({ title: "Descrição da ocorrência é obrigatória", variant: "destructive" });
    }

    setLoading(true);
    try {
      await createIncident({
        tenant_id: companyId!,
        asset_id: assetId!,
        assignment_id: asset?.current_assignment?.id,
        incident_type: formData.incident_type as any,
        description: formData.description,
        incident_date: formData.incident_date,
        residual_value_at_incident: asset?.residual_value_current || 0,
        police_report_url: formData.police_report_url || undefined,
        resolution_status: formData.resolution_status as any,
        resolution_notes: formData.resolution_notes || undefined,
      });

      toast({ title: "Ocorrência registrada com sucesso" });
      navigate(`/app/ativos/${assetId}`);
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Não foi possível registrar a ocorrência.",
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
              <h1 className="text-2xl font-bold text-[color:var(--sinaxys-ink)]">Registrar Ocorrência</h1>
              <p className="text-sm text-muted-foreground">{asset.asset_code} - {asset.asset_type}</p>
            </div>
          </div>

          <Card className="rounded-3xl border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <div className="text-sm text-red-800">
                Você está registrando uma ocorrência para este ativo. Certifique-se de ter todas as informações necessárias, incluindo boletim de ocorrência se for o caso.
              </div>
            </div>
          </Card>

          <form onSubmit={handleSubmit}>
            <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6 space-y-6">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label>Tipo de ocorrência *</Label>
                  <Select value={formData.incident_type} onValueChange={(v) => setFormData({ ...formData, incident_type: v })}>
                    <SelectTrigger className="rounded-2xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="damage">Dano</SelectItem>
                      <SelectItem value="loss">Perda</SelectItem>
                      <SelectItem value="theft">Furto</SelectItem>
                      <SelectItem value="robbery">Roubo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>Data da ocorrência *</Label>
                  <Input
                    type="date"
                    value={formData.incident_date}
                    onChange={(e) => setFormData({ ...formData, incident_date: e.target.value })}
                    className="rounded-2xl"
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Descrição *</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descreva detalhadamente o que aconteceu..."
                    className="rounded-2xl min-h-24"
                    required
                  />
                </div>

                {(formData.incident_type === "theft" || formData.incident_type === "robbery") && (
                  <div className="grid gap-2">
                    <Label>Boletim de ocorrência (URL)</Label>
                    <Input
                      value={formData.police_report_url}
                      onChange={(e) => setFormData({ ...formData, police_report_url: e.target.value })}
                      placeholder="https://..."
                      className="rounded-2xl"
                    />
                  </div>
                )}

                <div className="grid gap-2">
                  <Label>Status da resolução</Label>
                  <Select value={formData.resolution_status} onValueChange={(v) => setFormData({ ...formData, resolution_status: v })}>
                    <SelectTrigger className="rounded-2xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in_analysis">Em análise</SelectItem>
                      <SelectItem value="charged">Cobrado</SelectItem>
                      <SelectItem value="waived">Abonado</SelectItem>
                      <SelectItem value="resolved">Resolvido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>Notas de resolução</Label>
                  <Textarea
                    value={formData.resolution_notes}
                    onChange={(e) => setFormData({ ...formData, resolution_notes: e.target.value })}
                    placeholder="Detalhes sobre a resolução da ocorrência..."
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
                  {loading ? "Salvando..." : "Registrar ocorrência"}
                </Button>
              </div>
            </Card>
          </form>
        </div>
      </RequireCompanyModule>
    </RequireAuth>
  );
}
