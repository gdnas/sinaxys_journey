import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Search, Plus, Filter, Box, MoreHorizontal, ArrowLeft } from "lucide-react";
import { useCompany } from "@/lib/company";
import { useAuth } from "@/lib/auth";
import { listAssets, getAssetStatusLabel, getAssetCategoryLabel, type AssetFilters } from "@/lib/assetsDb";
import { RequireAuth } from "@/components/RequireAuth";
import { RequireCompanyModule } from "@/components/RequireCompanyModule";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import AssetModal from "@/components/assets/AssetModal";

// =====================
// SUBCOMPONENTS
// =====================

function StatusBadge({ status }: { status: string }) {
  const statusColors: Record<string, string> = {
    in_stock: "bg-green-100 text-green-700 hover:bg-green-100",
    reserved: "bg-yellow-100 text-yellow-700 hover:bg-yellow-100",
    in_use: "bg-blue-100 text-blue-700 hover:bg-blue-100",
    in_return: "bg-orange-100 text-orange-700 hover:bg-orange-100",
    returned: "bg-gray-100 text-gray-700 hover:bg-gray-100",
    in_maintenance: "bg-purple-100 text-purple-700 hover:bg-purple-100",
    acquired_by_user: "bg-indigo-100 text-indigo-700 hover:bg-indigo-100",
    lost: "bg-red-100 text-red-700 hover:bg-red-100",
    discarded: "bg-gray-100 text-gray-700 hover:bg-gray-100",
  };

  return (
    <Badge variant="outline" className={`rounded-2xl ${statusColors[status] || ""}`}>
      {getAssetStatusLabel(status as any)}
    </Badge>
  );
}

// Main AssetsList component
function AssetsList() {
  const { companyId } = useCompany();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  useEffect(() => {
    loadAssets();
  }, [companyId]);

  async function loadAssets() {
    if (!companyId) return;
    try {
      setLoading(true);
      const filters: any = {};
      if (statusFilter !== "all") filters.status = [statusFilter];
      if (categoryFilter !== "all") filters.category = [categoryFilter];
      if (searchTerm) filters.search = searchTerm;
      
      // Adicionar filtros de permissão
      if (user) {
        filters.user_role = user.role;
        filters.user_department_id = user.departmentId || undefined;
        filters.user_id = user.id;
      }
      
      const data = await listAssets(companyId, filters);
      setAssets(data);
    } catch (error) {
      console.error("Error loading assets:", error);
    } finally {
      setLoading(false);
    }
  }

  // Verificar se usuário pode editar (não colaborador)
  const canEdit = user?.role !== "COLABORADOR";

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Gestão de Ativos</h1>
        <Button onClick={() => navigate("/app/ativos/novo")} disabled={!canEdit}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Ativo
        </Button>
      </div>

      <Card className="p-6">
        <div className="flex gap-4 mb-6">
          <Input
            placeholder="Buscar ativos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="in_stock">Em estoque</SelectItem>
              <SelectItem value="in_use">Em uso</SelectItem>
              <SelectItem value="in_maintenance">Em manutenção</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              <SelectItem value="it_equipment">Equipamento de TI</SelectItem>
              <SelectItem value="office_equipment">Equipamento de escritório</SelectItem>
              <SelectItem value="mobile_devices">Dispositivo móvel</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="text-center py-8">Carregando...</div>
        ) : assets.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Nenhum ativo encontrado
          </div>
        ) : (
          <div className="space-y-4">
            {assets.map((asset) => (
              <div key={asset.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <div className="font-semibold">{asset.asset_code}</div>
                  <div className="text-sm text-gray-500">{asset.asset_type}</div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={asset.status} />
                  {canEdit && asset.status === 'in_stock' && (
                    <Button asChild size="sm"><Link to={`/app/ativos/${asset.id}/entregar`}>Entregar</Link></Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => { setSelectedAssetId(asset.id); setModalOpen(true); }}>
                    Ver
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
      {selectedAssetId && (
        <AssetModal assetId={selectedAssetId} open={modalOpen} onOpenChange={(v) => setModalOpen(v)} onUpdated={() => loadAssets()} onDeleted={() => { setModalOpen(false); loadAssets(); }} />
      )}
    </div>
  );
}

// Wrapper com verificação de autenticação e módulo
function AssetsListWrapper() {
  return (
    <RequireAuth roles={["MASTERADMIN", "ADMIN", "HEAD", "COLABORADOR"]}>
      <RequireCompanyModule moduleKey="ASSETS">
        <AssetsList />
      </RequireCompanyModule>
    </RequireAuth>
  );
}

// Named exports
export { AssetsList };
// Default export for module (importante wrapper)
export default AssetsListWrapper;