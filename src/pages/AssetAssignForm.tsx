import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, X } from "lucide-react";
import { useCompany } from "@/lib/company";
import { listProfilesByCompany, getAsset, createAssignment } from "@/lib/assetsDb";
import { RequireAuth } from "@/components/RequireAuth";
import { RequireCompanyModule } from "@/components/RequireCompanyModule";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { listProfilesByCompany as listProfiles } from "@/lib/profilesDb";

export default function AssetAssignForm() {
  const { assetId } = useParams();
  const navigate = useNavigate();
  const { companyId } = useCompany();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [asset, setAsset] = useState<any>(null);

  const [formData, setFormData] = useState({
    profile_id: "",
    contractor_company_id: "",
    modality: "commodatum",
    monthly_amount: "",
    assigned_at: new Date().toISOString().split('T')[0],
    expected_until_contract_end: true,
    expected_return_date: "",
    signed_document_url: "",
  });

  useEffect(() => {
    async function loadData() {
      if (!companyId || !assetId) return;

      try {
        const [assetData, profilesData] = await Promise.all([
          getAsset(assetId),
          listProfiles(companyId),
        ]);

        setAsset(assetData);
        setProfiles(profilesData);
      } catch (error) {
        console.error("Error loading data:", error);
      }
    }

    loadData();
  }, [companyId, assetId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.profile_id) {
      return toast({ title: "Selecione um colaborador", variant: "destructive" });
    }

    setLoading(true);
    try {
      await createAssignment({
        tenant_id: companyId!,
        asset_id: assetId!,
        profile_id: formData.profile_id,
        contractor_company_id: formData.contractor_company_id || undefined,
        modality: formData.modality as any,
        monthly_amount: formData.monthly_amount ? parseFloat(formData.monthly_amount) : undefined,
        assigned_at: formData.assigned_at,
        expected_until_contract_end: formData.expected_until_contract_end,
        expected_return_date: formData.expected_return_date || undefined,
        signed_document_url: formData.signed_document_url || undefined,
      });

      toast({ title: "Ativo entregue com sucesso" });
      navigate(`/app/ativos/${assetId}`);
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Não foi possível entregar o ativo.",
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
              <h1 className="text-2xl font-bold text-[color:var(--sinaxys-ink)]">Entregar Ativo</h1>
              <p className="text-sm text-muted-foreground">{asset.asset_code} - {asset.asset_type}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6 space-y-6">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label>Colaborador *</Label>
                  <Select value={formData.profile_id} onValueChange={(v) => setFormData({ ...formData, profile_id: v })}>
                    <SelectTrigger className="rounded-2xl">
                      <SelectValue placeholder="Selecione um colaborador" />
                    </SelectTrigger>
                    <SelectContent>
                      {profiles.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name || p.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>Modalidade *</Label>
                  <Select value={formData.modality} onValueChange={(v) => setFormData({ ...formData, modality: v })}>
                    <SelectTrigger className="rounded-2xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="commodatum">Comodato (gratuito)</SelectItem>
                      <SelectItem value="paid_lease">Cessão onerosa</SelectItem>
                      <SelectItem value="purchase_option">Cessão com opção de aquisição</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.modality === "paid_lease" && (
                  <div className="grid gap-2">
                    <Label>Valor mensal (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.monthly_amount}
                      onChange={(e) => setFormData({ ...formData, monthly_amount: e.target.value })}
                      placeholder="0,00"
                      className="rounded-2xl"
                    />
                  </div>
                )}

                <div className="grid gap-2">
                  <Label>Data de entrega *</Label>
                  <Input
                    type="date"
                    value={formData.assigned_at}
                    onChange={(e) => setFormData({ ...formData, assigned_at: e.target.value })}
                    className="rounded-2xl"
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Documento assinado (URL)</Label>
                  <Input
                    value={formData.signed_document_url}
                    onChange={(e) => setFormData({ ...formData, signed_document_url: e.target.value })}
                    placeholder="https://..."
                    className="rounded-2xl"
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
                  {loading ? "Salvando..." : "Entregar ativo"}
                </Button>
              </div>
            </Card>
          </form>
        </div>
      </RequireCompanyModule>
    </RequireAuth>
  );
}
