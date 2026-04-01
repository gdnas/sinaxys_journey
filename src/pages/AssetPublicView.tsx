import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Package, MapPin, Calendar, DollarSign, Tag, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { getAsset } from "@/lib/assetsDb";
import { getAssetStatusLabel, getAssetCategoryLabel, getAssetConditionLabel } from "@/lib/assetsDb";
import { supabase } from "@/integrations/supabase/client";

export default function AssetPublicView() {
  const { assetId } = useParams<{ assetId: string }>();
  const [asset, setAsset] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [companyName, setCompanyName] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    async function loadAsset() {
      if (!assetId) {
        setError("ID do ativo não fornecido");
        setLoading(false);
        return;
      }

      try {
        const data = await getAsset(assetId);
        if (!data) {
          setError("Ativo não encontrado");
          setLoading(false);
          return;
        }

        setAsset(data);

        // Buscar informações da empresa (tenant)
        const { data: tenantData } = await supabase
          .from("companies")
          .select("name")
          .eq("id", data.tenant_id)
          .maybeSingle();

        if (tenantData) {
          setCompanyName(tenantData.name);
        }
      } catch (err) {
        console.error("Erro ao carregar ativo:", err);
        setError("Erro ao carregar informações do ativo");
      } finally {
        setLoading(false);
      }
    }

    loadAsset();
  }, [assetId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 mx-auto animate-spin" />
          <p className="text-gray-600">Carregando informações do ativo...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="max-w-md w-full mx-4 p-8 rounded-3xl text-center">
          <div className="text-red-500 mb-4">
            <Package className="w-16 h-16 mx-auto" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Ativo não encontrado</h1>
          <p className="text-gray-600">{error}</p>
        </Card>
      </div>
    );
  }

  if (!asset) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header da empresa */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-indigo-900 mb-2">{companyName}</h1>
          <p className="text-gray-600">Patrimônio da Empresa</p>
        </div>

        {/* Card principal */}
        <Card className="rounded-3xl overflow-hidden shadow-xl bg-white">
          {/* Header com código e status */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-8 text-white">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-indigo-200 text-sm mb-1">Código do Patrimônio</p>
                <h2 className="text-4xl font-bold">{asset.asset_code}</h2>
              </div>
              <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
                asset.status === 'in_use' ? 'bg-green-500' :
                asset.status === 'in_stock' ? 'bg-blue-500' :
                asset.status === 'in_maintenance' ? 'bg-yellow-500' :
                asset.status === 'lost' ? 'bg-red-500' :
                'bg-gray-500'
              }`}>
                {getAssetStatusLabel(asset.status)}
              </span>
            </div>
          </div>

          {/* Conteúdo */}
          <div className="p-6 space-y-6">
            {/* Informações principais */}
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Tag className="w-5 h-5 text-indigo-600" />
                  Tipo de Equipamento
                </h3>
                <p className="text-gray-700">{asset.asset_type}</p>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Tag className="w-5 h-5 text-indigo-600" />
                  Categoria
                </h3>
                <p className="text-gray-700">{getAssetCategoryLabel(asset.category)}</p>
              </div>

              {asset.brand && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900">Marca</h3>
                  <p className="text-gray-700">{asset.brand}</p>
                </div>
              )}

              {asset.model && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900">Modelo</h3>
                  <p className="text-gray-700">{asset.model}</p>
                </div>
              )}

              {asset.serial_number && (
                <div className="space-y-3 md:col-span-2">
                  <h3 className="font-semibold text-gray-900">Número de Série</h3>
                  <p className="text-gray-700 font-mono bg-gray-50 p-3 rounded-xl">
                    {asset.serial_number}
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-600" />
                  Data de Aquisição
                </h3>
                <p className="text-gray-700">
                  {new Date(asset.purchase_date).toLocaleDateString('pt-BR')}
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-indigo-600" />
                  Valor de Aquisição
                </h3>
                <p className="text-gray-700 font-semibold">
                  {asset.purchase_value.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  })}
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">Vida Útil</h3>
                <p className="text-gray-700">{asset.useful_life_months} meses</p>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">Estado de Conservação</h3>
                <p className="text-gray-700">{getAssetConditionLabel(asset.condition_initial)}</p>
              </div>

              {asset.supplier && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900">Fornecedor</h3>
                  <p className="text-gray-700">{asset.supplier}</p>
                </div>
              )}

              {asset.current_location && (
                <div className="space-y-3 md:col-span-2">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-indigo-600" />
                    Localização Atual
                  </h3>
                  <p className="text-gray-700">{asset.current_location}</p>
                </div>
              )}
            </div>

            {/* Valores depreciados */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 space-y-4">
              <h3 className="font-semibold text-gray-900">Valores Atuais</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-gray-600">Valor Residual</p>
                  <p className="text-2xl font-bold text-indigo-700">
                    {asset.residual_value_current.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Depreciação Acumulada</p>
                  <p className="text-2xl font-bold text-red-600">
                    {asset.accumulated_depreciation.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Observações */}
            {asset.notes && (
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">Observações</h3>
                <p className="text-gray-700 bg-gray-50 p-4 rounded-xl">{asset.notes}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 text-center text-sm text-gray-500">
            Última atualização: {new Date(asset.updated_at).toLocaleDateString('pt-BR')} às {new Date(asset.updated_at).toLocaleTimeString('pt-BR')}
          </div>
        </Card>

        {/* Powered by */}
        <div className="text-center mt-8">
          <p className="text-gray-500 text-sm">
            Sistema de Gestão de Ativos
          </p>
        </div>
      </div>
    </div>
  );
}