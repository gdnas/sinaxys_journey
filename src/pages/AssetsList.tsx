import { useEffect, useState } from "react";
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
import { Link } from "react-router-dom";

type AssetStatus = "in_stock" | "reserved" | "in_use" | "in_return" | "returned" | "in_maintenance" | "acquired_by_user" | "lost" | "discarded";
type AssetCategory = "it_equipment" | "office_equipment" | "mobile_devices" | "furniture" | "vehicles" | "tools" | "licenses" | "other";

export default function AssetsList() {
  const { companyId } = useCompany();
  const { user } = useAuth();
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Filtros
  const [statusFilter, setStatusFilter] = useState<AssetStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<AssetCategory | "all">("all");
  const [availabilityFilter, setAvailabilityFilter] = useState<"all" | "available" | "in_use" | "pending">("all");

  const canManage = user?.role === "MASTERADMIN" || user?.role === "ADMIN";

  useEffect(() => {
    async function loadAssets() {
      if (!companyId) return;

      setLoading(true);
      try {
        const filters: AssetFilters = {};
        
        if (statusFilter !== "all") {
          filters.status = [statusFilter];
        }
        
        if (categoryFilter !== "all") {
          filters.category = [categoryFilter];
        }
        
        if (availabilityFilter === "available") {
          filters.available_only = true;
        } else if (availabilityFilter === "in_use") {
          filters.in_use_only = true;
        } else if (availabilityFilter === "pending") {
          filters.with_pending_return = true;
        }
        
        if (search.trim()) {
          filters.search = search.trim();
        }

        const data = await listAssets(companyId, filters);
        setAssets(data);
      } catch (error) {
        console.error("Error loading assets:", error);
      } finally {
        setLoading(false);
      }
    }

    loadAssets();
  }, [companyId, statusFilter, categoryFilter, availabilityFilter, search]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Link to="/app/ativos">
            <Button variant="ghost" className="rounded-2xl" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[color:var(--sinaxys-ink)]">Lista de Ativos</h1>
            <p className="text-sm text-muted-foreground">
              {assets.length} ativo(s) encontrado(s)
            </p>
          </div>
        </div>
        
        {canManage && (
          <Button className="rounded-2xl bg-[color:var(--sinaxys-primary)] text-white" asChild>
            <Link to="/app/ativos/novo">
              <Plus className="mr-2 h-4 w-4" />
              Novo Ativo
            </Link>
          </Button>
        )}
      </div>

      {/* Filtros e Busca */}
      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          {/* Busca */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por código, marca, modelo, série..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-2xl pl-10"
            />
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap gap-3">
            <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
              <SelectTrigger className="w-48 rounded-2xl">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="in_stock">Em estoque</SelectItem>
                <SelectItem value="in_use">Em uso</SelectItem>
                <SelectItem value="in_maintenance">Em manutenção</SelectItem>
                <SelectItem value="acquired_by_user">Adquirido</SelectItem>
                <SelectItem value="lost">Extraviado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={(v: any) => setCategoryFilter(v)}>
              <SelectTrigger className="w-48 rounded-2xl">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                <SelectItem value="it_equipment">Equipamento de TI</SelectItem>
                <SelectItem value="office_equipment">Equipamento de escritório</SelectItem>
                <SelectItem value="mobile_devices">Dispositivo móvel</SelectItem>
                <SelectItem value="furniture">Móvel</SelectItem>
                <SelectItem value="other">Outro</SelectItem>
              </SelectContent>
            </Select>

            <Select value={availabilityFilter} onValueChange={(v: any) => setAvailabilityFilter(v)}>
              <SelectTrigger className="w-48 rounded-2xl">
                <SelectValue placeholder="Disponibilidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="available">Disponíveis</SelectItem>
                <SelectItem value="in_use">Em uso</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Lista de Ativos */}
      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Carregando...</div>
        ) : assets.length === 0 ? (
          <div className="py-12 text-center">
            <Box className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-[color:var(--sinaxys-ink)]">Nenhum ativo encontrado</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Tente ajustar os filtros ou cadastre um novo ativo.
            </p>
            {canManage && (
              <Button className="mt-4 rounded-2xl bg-[color:var(--sinaxys-primary)] text-white" asChild>
                <Link to="/app/ativos/novo">Cadastrar Ativo</Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[color:var(--sinaxys-border)]">
                  <th className="pb-3 text-left text-sm font-semibold text-[color:var(--sinaxys-ink)]">
                    Código
                  </th>
                  <th className="pb-3 text-left text-sm font-semibold text-[color:var(--sinaxys-ink)]">
                    Equipamento
                  </th>
                  <th className="pb-3 text-left text-sm font-semibold text-[color:var(--sinaxys-ink)]">
                    Categoria
                  </th>
                  <th className="pb-3 text-left text-sm font-semibold text-[color:var(--sinaxys-ink)]">
                    Status
                  </th>
                  <th className="pb-3 text-right text-sm font-semibold text-[color:var(--sinaxys-ink)]">
                    Valor residual
                  </th>
                  <th className="pb-3 text-right text-sm font-semibold text-[color:var(--sinaxys-ink)]">
                    Aquisição
                  </th>
                  <th className="pb-3 text-center text-sm font-semibold text-[color:var(--sinaxys-ink)]">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {assets.map((asset) => (
                  <tr
                    key={asset.id}
                    className="border-b border-[color:var(--sinaxys-border)] last:border-0 hover:bg-[color:var(--sinaxys-tint)]/5"
                  >
                    <td className="py-4">
                      <div className="font-medium text-[color:var(--sinaxys-ink)]">
                        {asset.asset_code}
                      </div>
                      {asset.serial_number && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          S/N: {asset.serial_number}
                        </div>
                      )}
                    </td>
                    <td className="py-4">
                      <div className="text-sm font-medium text-[color:var(--sinaxys-ink)]">
                        {asset.asset_type}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {asset.brand} {asset.model}
                      </div>
                    </td>
                    <td className="py-4">
                      <Badge variant="outline" className="rounded-2xl">
                        {getAssetCategoryLabel(asset.category)}
                      </Badge>
                    </td>
                    <td className="py-4">
                      <StatusBadge status={asset.status} />
                    </td>
                    <td className="py-4 text-right">
                      <div className="text-sm font-medium text-[color:var(--sinaxys-ink)]">
                        {asset.residual_value_current
                          ? parseFloat(asset.residual_value_current).toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            })
                          : "-"}
                      </div>
                    </td>
                    <td className="py-4 text-right text-sm text-muted-foreground">
                      {asset.purchase_date ? format(new Date(asset.purchase_date), "dd/MM/yyyy") : "-"}
                    </td>
                    <td className="py-4 text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="rounded-full" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to={`/app/ativos/${asset.id}`}>Ver detalhes</Link>
                          </DropdownMenuItem>
                          {canManage && (
                            <>
                              {asset.status === "in_stock" && (
                                <DropdownMenuItem asChild>
                                  <Link to={`/app/ativos/${asset.id}/entregar`}>Entregar ativo</Link>
                                </DropdownMenuItem>
                              )}
                              {asset.status === "in_use" && (
                                <DropdownMenuItem asChild>
                                  <Link to={`/app/ativos/${asset.id}/devolver`}>Registrar devolução</Link>
                                </DropdownMenuItem>
                              )}
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

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

export default AssetsListWrapper;