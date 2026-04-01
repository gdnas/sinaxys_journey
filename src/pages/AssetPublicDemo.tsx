import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { getAssetWithDetails } from "@/lib/assetsDb";
import { supabase } from "@/integrations/supabase/client";

export default function AssetPublicDemo() {
  const { companyId, assetId } = useParams<{ companyId?: string; assetId?: string }>();
  const [loading, setLoading] = useState(true);
  const [asset, setAsset] = useState<any | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!assetId) {
        setError("Parâmetros inválidos");
        setLoading(false);
        return;
      }
      try {
        // buscar ativo por id (não depender do companyId na URL)
        const a = await getAssetWithDetails(assetId);
        if (!a) {
          setError("Ativo não encontrado");
          setLoading(false);
          return;
        }

        setAsset(a);

        // buscar nome da empresa correto a partir do tenant_id do asset
        try {
          const { data: comp } = await supabase.from('companies').select('name').eq('id', a.tenant_id).maybeSingle();
          if (comp && comp.name) setCompanyName(comp.name);
        } catch (e) {
          console.warn('Failed to fetch company name', e);
        }

        // If companyId was provided but doesn't match asset.tenant_id, still show the asset
        // but note the mismatch (previously we hid the asset). This makes the public demo robust.
      } catch (e: any) {
        console.error(e);
        setError("Erro ao carregar ativo");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [companyId, assetId]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  if (error) return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="p-8 rounded-3xl text-center max-w-lg">
        <h2 className="text-lg font-semibold mb-4">O caminho</h2>
        <p className="text-gray-600">{error}</p>
        <div className="mt-6">
          <Link to="/">← Voltar</Link>
        </div>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-indigo-900 mb-2">{companyName || 'Empresa'}</h1>
          <p className="text-gray-600">Demonstração do ativo</p>
        </div>
        <Card className="rounded-3xl overflow-hidden shadow-xl bg-white p-6">
          <h2 className="text-2xl font-bold mb-4">{asset.asset_code} — {asset.asset_type}</h2>
          <p className="text-gray-700 mb-2">Marca: {asset.brand || '-'}</p>
          <p className="text-gray-700 mb-2">Modelo: {asset.model || '-'}</p>
          <p className="text-gray-700 mb-2">Número de série: {asset.serial_number || '-'}</p>
          <p className="text-gray-700 mb-2">Status: {asset.status}</p>
          <p className="text-gray-700 mt-4">{asset.notes}</p>
        </Card>
      </div>
    </div>
  );
}