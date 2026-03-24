import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, X } from "lucide-react";
import { useCompany } from "@/lib/company";
import { createAsset, updateAsset, getAsset, type CreateAssetInput } from "@/lib/assetsDb";
import { RequireAuth } from "@/components/RequireAuth";
import { RequireCompanyModule } from "@/components/RequireCompanyModule";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

type AssetCategory = "it_equipment" | "office_equipment" | "mobile_devices" | "furniture" | "vehicles" | "tools" | "licenses" | "other";
type AssetCondition = "new" | "good" | "fair" | "poor" | "damaged";
type DepreciationMethod = "linear" | "declining_balance" | "units_of_production";

export default function AssetForm() {
  const { assetId } = useParams();
  const navigate = useNavigate();
  const { companyId } = useCompany();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isEdit, setIsEdit] = useState(!!assetId);

  const [formData, setFormData] = useState({
    asset_code: "",
    category: "other" as AssetCategory,
    asset_type: "",
    brand: "",
    model: "",
    serial_number: "",
    condition_initial: "new" as AssetCondition,
    purchase_date: "",
    purchase_value: "",
    supplier: "",
    useful_life_months: "48",
    depreciation_method: "linear" as DepreciationMethod,
    current_location: "",
    notes: "",
  });

  useEffect(() => {
    async function loadAsset() {
      if (!assetId) return;

      try {
        const asset = await getAsset(assetId);
        if (asset) {
          setFormData({
            asset_code: asset.asset_code,
            category: asset.category,
            asset_type: asset.asset_type,
            brand: asset.brand || "",
            model: asset.model || "",
            serial_number: asset.serial_number || "",
            condition_initial: asset.condition_initial,
            purchase_date: asset.purchase_date,
            purchase_value: String(asset.purchase_value),
            supplier: asset.supplier || "",
            useful_life_months: String(asset.useful_life_months),
            depreciation_method: asset.depreciation_method,
            current_location: asset.current_location || "",
            notes: asset.notes || "",
          });
        }
      } catch (error) {
        toast({
          title: "Erro ao carregar ativo",
          description: error instanceof Error ? error.message : "Não foi possível carregar o ativo.",
          variant: "destructive",
        });
      }
    }

    loadAsset();
  }, [assetId, toast]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.asset_code.trim()) {
      return toast({ title: "Código do ativo é obrigatório", variant: "destructive" });
    }
    if (!formData.asset_type.trim()) {
      return toast({ title: "Tipo do equipamento é obrigatório", variant: "destructive" });
    }
    if (!formData.purchase_date) {
      return toast({ title: "Data de aquisição é obrigatória", variant: "destructive" });
    }
    if (!formData.purchase_value) {
      return toast({ title: "Valor de aquisição é obrigatório", variant: "destructive" });
    }

    setLoading(true);
    try {
      if (isEdit && assetId) {
        await updateAsset(assetId, {
          asset_code: formData.asset_code,
          category: formData.category,
          asset_type: formData.asset_type,
          brand: formData.brand || null,
          model: formData.model || null,
          serial_number: formData.serial_number || null,
          purchase_date: formData.purchase_date,
          purchase_value: parseFloat(formData.purchase_value),
          supplier: formData.supplier || null,
          useful_life_months: parseInt(formData.useful_life_months),
          depreciation_method: formData.depreciation_method,
          current_location: formData.current_location || null,
          notes: formData.notes || null,
        });
        toast({ title: "Ativo atualizado com sucesso" });
      } else {
        const input: CreateAssetInput = {
          tenant_id: companyId!,
          asset_code: formData.asset_code,
          category: formData.category,
          asset_type: formData.asset_type,
          brand: formData.brand || undefined,
          model: formData.model || undefined,
          serial_number: formData.serial_number || undefined,
          condition_initial: formData.condition_initial,
          purchase_date: formData.purchase_date,
          purchase_value: parseFloat(formData.purchase_value),
          supplier: formData.supplier || undefined,
          useful_life_months: parseInt(formData.useful_life_months),
          depreciation_method: formData.depreciation_method,
          current_location: formData.current_location || undefined,
          notes: formData.notes || undefined,
        };
        await createAsset(input);
        toast({ title: "Ativo cadastrado com sucesso" });
      }
      navigate("/app/ativos");
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Não foi possível salvar o ativo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <RequireAuth roles={["MASTERADMIN", "ADMIN"]}>
      <RequireCompanyModule moduleKey="ASSETS">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" className="rounded-2xl" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-[color:var(--sinaxys-ink)]">
                {isEdit ? "Editar Ativo" : "Cadastrar Novo Ativo"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isEdit ? "Atualize os dados do ativo" : "Preencha os dados do equipamento"}
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6 space-y-6">
              {/* Identificação */}
              <div>
                <h2 className="mb-4 text-lg font-semibold text-[color:var(--sinaxys-ink)]">Identificação</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Código do patrimônio *</Label>
                    <Input
                      value={formData.asset_code}
                      onChange={(e) => setFormData({ ...formData, asset_code: e.target.value })}
                      placeholder="Ex: NB-001"
                      className="rounded-2xl"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Categoria *</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(v: AssetCategory) => setFormData({ ...formData, category: v })}
                    >
                      <SelectTrigger className="rounded-2xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="it_equipment">Equipamento de TI</SelectItem>
                        <SelectItem value="office_equipment">Equipamento de escritório</SelectItem>
                        <SelectItem value="mobile_devices">Dispositivo móvel</SelectItem>
                        <SelectItem value="furniture">Móvel</SelectItem>
                        <SelectItem value="vehicles">Veículo</SelectItem>
                        <SelectItem value="tools">Ferramenta</SelectItem>
                        <SelectItem value="licenses">Licença de software</SelectItem>
                        <SelectItem value="other">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2 md:col-span-2">
                    <Label>Tipo do equipamento *</Label>
                    <Input
                      value={formData.asset_type}
                      onChange={(e) => setFormData({ ...formData, asset_type: e.target.value })}
                      placeholder="Ex: Notebook Dell Latitude 3420"
                      className="rounded-2xl"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Marca</Label>
                    <Input
                      value={formData.brand}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                      placeholder="Ex: Dell"
                      className="rounded-2xl"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Modelo</Label>
                    <Input
                      value={formData.model}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                      placeholder="Ex: Latitude 3420"
                      className="rounded-2xl"
                    />
                  </div>
                  <div className="grid gap-2 md:col-span-2">
                    <Label>Número de série</Label>
                    <Input
                      value={formData.serial_number}
                      onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                      placeholder="Ex: 8F92KL1"
                      className="rounded-2xl"
                    />
                  </div>
                </div>
              </div>

              {/* Dados Financeiros */}
              <div>
                <h2 className="mb-4 text-lg font-semibold text-[color:var(--sinaxys-ink)]">Dados Financeiros</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Data de aquisição *</Label>
                    <Input
                      type="date"
                      value={formData.purchase_date}
                      onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                      className="rounded-2xl"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Valor de aquisição (R$) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.purchase_value}
                      onChange={(e) => setFormData({ ...formData, purchase_value: e.target.value })}
                      placeholder="0,00"
                      className="rounded-2xl"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Fornecedor</Label>
                    <Input
                      value={formData.supplier}
                      onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                      placeholder="Ex: Dell Brasil"
                      className="rounded-2xl"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Vida útil (meses) *</Label>
                    <Input
                      type="number"
                      value={formData.useful_life_months}
                      onChange={(e) => setFormData({ ...formData, useful_life_months: e.target.value })}
                      className="rounded-2xl"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Método de depreciação *</Label>
                    <Select
                      value={formData.depreciation_method}
                      onValueChange={(v: DepreciationMethod) => setFormData({ ...formData, depreciation_method: v })}
                    >
                      <SelectTrigger className="rounded-2xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="linear">Linear</SelectItem>
                        <SelectItem value="declining_balance">Saldo decrescente</SelectItem>
                        <SelectItem value="units_of_production">Unidades produzidas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Estado e Localização */}
              <div>
                <h2 className="mb-4 text-lg font-semibold text-[color:var(--sinaxys-ink)]">Estado e Localização</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Estado de conservação inicial *</Label>
                    <Select
                      value={formData.condition_initial}
                      onValueChange={(v: AssetCondition) => setFormData({ ...formData, condition_initial: v })}
                    >
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
                    <Label>Localização atual</Label>
                    <Input
                      value={formData.current_location}
                      onChange={(e) => setFormData({ ...formData, current_location: e.target.value })}
                      placeholder="Ex: Estoque - Sala 101"
                      className="rounded-2xl"
                    />
                  </div>
                </div>
              </div>

              {/* Observações */}
              <div className="grid gap-2">
                <Label>Observações</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Informações adicionais sobre o ativo..."
                  className="rounded-2xl min-h-24"
                />
              </div>

              {/* Botões */}
              <div className="flex justify-end gap-3 pt-4 border-t border-[color:var(--sinaxys-border)]">
                <Button type="button" variant="outline" className="rounded-2xl" onClick={() => navigate(-1)}>
                  <X className="mr-2 h-4 w-4" />
                  Cancelar
                </Button>
                <Button type="submit" className="rounded-2xl bg-[color:var(--sinaxys-primary)] text-white" disabled={loading}>
                  <Save className="mr-2 h-4 w-4" />
                  {loading ? "Salvando..." : isEdit ? "Salvar alterações" : "Cadastrar ativo"}
                </Button>
              </div>
            </Card>
          </form>
        </div>
      </RequireCompanyModule>
    </RequireAuth>
  );
}
