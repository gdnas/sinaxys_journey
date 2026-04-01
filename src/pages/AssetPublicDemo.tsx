import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export default function AssetPublicDemo() {
  const { companyId, assetId } = useParams<{ companyId?: string; assetId?: string }>();
  const [loading, setLoading] = useState(true);
  const [asset, setAsset] = useState<any | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // report form
  const [reportOpen, setReportOpen] = useState(false);
  const [reportName, setReportName] = useState("");
  const [reportPhone, setReportPhone] = useState("");
  const [reportEmail, setReportEmail] = useState("");
  const [reportLocation, setReportLocation] = useState("");
  const [reportNotes, setReportNotes] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [reportSuccess, setReportSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!assetId) {
        setError("Parâmetros inválidos");
        setLoading(false);
        return;
      }
      try {
        // call RPC to fetch public asset (bypasses RLS and is safe for public view)
        const { data, error } = await supabase.rpc('get_public_asset', { p_asset_id: assetId });
        if (error) {
          console.warn('RPC get_public_asset error', error);
          // fallback: try to fetch asset by client (may be blocked by RLS)
          setError('Ativo não encontrado');
          setLoading(false);
          return;
        }
        if (!data || data.length === 0) {
          setError('Ativo não encontrado');
          setLoading(false);
          return;
        }
        const a = data[0];
        setAsset(a);
        setCompanyName(a.company_name || null);
      } catch (e: any) {
        console.error(e);
        setError("Erro ao carregar ativo");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [companyId, assetId]);

  async function submitReport(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!asset) return;
    setReportLoading(true);
    setReportSuccess(null);
    try {
      const payload = {
        tenant_id: asset.tenant_id,
        asset_id: asset.id,
        reporter_name: reportName || null,
        reporter_phone: reportPhone || null,
        reporter_email: reportEmail || null,
        location: reportLocation || null,
        notes: reportNotes || null,
      };

      const { error } = await supabase.from('asset_reports').insert(payload);
      if (error) throw error;

      setReportSuccess('Relato enviado. Obrigado! Os administradores serão notificados.');
      setReportOpen(false);
      setReportName('');
      setReportPhone('');
      setReportEmail('');
      setReportLocation('');
      setReportNotes('');
    } catch (err: any) {
      console.error('report error', err);
      setReportSuccess('Erro ao enviar relato. Tente novamente.');
    } finally {
      setReportLoading(false);
    }
  }

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

          <div className="mt-6 flex gap-3">
            <button
              className="rounded-xl bg-[color:var(--sinaxys-primary)] px-4 py-2 text-white"
              onClick={() => setReportOpen(true)}
            >
              Notificar perda / Encontrou este ativo
            </button>
            <a href="/" className="rounded-xl border px-4 py-2">Voltar</a>
          </div>

          {reportSuccess && (
            <div className="mt-4 text-sm text-green-600">{reportSuccess}</div>
          )}

          {reportOpen && (
            <form onSubmit={submitReport} className="mt-6 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Seu nome (opcional)</label>
                <input className="mt-1 block w-full rounded-md border p-2" value={reportName} onChange={(e) => setReportName(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Telefone (opcional)</label>
                <input className="mt-1 block w-full rounded-md border p-2" value={reportPhone} onChange={(e) => setReportPhone(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">E-mail (opcional)</label>
                <input className="mt-1 block w-full rounded-md border p-2" value={reportEmail} onChange={(e) => setReportEmail(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Localização (ex: Rua, cidade)</label>
                <input className="mt-1 block w-full rounded-md border p-2" value={reportLocation} onChange={(e) => setReportLocation(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Observações</label>
                <textarea className="mt-1 block w-full rounded-md border p-2" value={reportNotes} onChange={(e) => setReportNotes(e.target.value)} />
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={reportLoading} className="rounded-xl bg-[color:var(--sinaxys-primary)] px-4 py-2 text-white">Enviar relato</button>
                <button type="button" onClick={() => setReportOpen(false)} className="rounded-xl border px-4 py-2">Cancelar</button>
              </div>
            </form>
          )}

        </Card>
      </div>
    </div>
  );
}