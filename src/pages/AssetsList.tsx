import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Plus, ArrowLeft } from "lucide-react";
import { useCompany } from "@/lib/company";
import { useAuth } from "@/lib/auth";
import {
  listAssetsWithAssignee,
  type ExpandedAssetFilters,
  type AssetStatus,
  type AssetCategory,
} from "@/lib/assetsDb";
import { RequireAuth } from "@/components/RequireAuth";
import { RequireCompanyModule } from "@/components/RequireCompanyModule";
import { AssetFilters } from "@/components/assets/AssetFilters";
import { AssetListSection } from "@/components/assets/AssetListSection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import AssetModal from "@/components/assets/AssetModal";
import { useQuery } from "@tanstack/react-query";

// Main AssetsList component
function AssetsList() {
  const { companyId } = useCompany();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  // Extrair filtros da URL
  const [filters, setFilters] = useState<ExpandedAssetFilters>(() => {
    const initialFilters: ExpandedAssetFilters = {};

    // Status
    const statusParam = searchParams.get('status');
    if (statusParam) {
      initialFilters.status = statusParam.split(',') as AssetStatus[];
    }

    // Categoria
    const categoryParam = searchParams.get('category');
    if (categoryParam) {
      initialFilters.category = categoryParam.split(',') as AssetCategory[];
    }

    // Responsável
    const assigneeParam = searchParams.get('assignee_id');
    if (assigneeParam) {
      initialFilters.assignee_id = assigneeParam;
    }

    // Departamento
    const deptParam = searchParams.get('department_id');
    if (deptParam) {
      initialFilters.department_id = deptParam;
    }

    // Has assignee
    const hasAssigneeParam = searchParams.get('has_assignee');
    if (hasAssigneeParam) {
      initialFilters.has_assignee = hasAssigneeParam === 'true' ? true : hasAssigneeParam === 'false' ? false : undefined;
    }

    // Has contract
    const hasContractParam = searchParams.get('has_contract');
    if (hasContractParam) {
      initialFilters.has_contract = hasContractParam === 'true' ? true : hasContractParam === 'false' ? false : undefined;
    }

    // Search
    const searchParam = searchParams.get('search');
    if (searchParam) {
      initialFilters.search = searchParam;
    }

    return initialFilters;
  });

  // Sincronizar filtros com URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams);

    // Status
    if (filters.status?.length) {
      params.set('status', filters.status.join(','));
    } else {
      params.delete('status');
    }

    // Categoria
    if (filters.category?.length) {
      params.set('category', filters.category.join(','));
    } else {
      params.delete('category');
    }

    // Responsável
    if (filters.assignee_id) {
      params.set('assignee_id', filters.assignee_id);
    } else {
      params.delete('assignee_id');
    }

    // Departamento
    if (filters.department_id) {
      params.set('department_id', filters.department_id);
    } else {
      params.delete('department_id');
    }

    // Has assignee
    if (filters.has_assignee !== undefined) {
      params.set('has_assignee', String(filters.has_assignee));
    } else {
      params.delete('has_assignee');
    }

    // Has contract
    if (filters.has_contract !== undefined) {
      params.set('has_contract', String(filters.has_contract));
    } else {
      params.delete('has_contract');
    }

    // Search
    if (filters.search) {
      params.set('search', filters.search);
    } else {
      params.delete('search');
    }

    // Criar nova URL apenas se os parâmetros mudaram
    const newUrl = params.toString() ? `?${params.toString()}` : '';
    if (newUrl !== searchParams.toString()) {
      navigate(newUrl, { replace: true });
    }
  }, [filters]);

  // Carregar usuários para filtro de responsável
  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles', companyId],
    queryFn: async () => {
      const data = await (await import('@/lib/profilesDb')).listAllProfiles();
      // Filtrar apenas usuários da empresa atual
      return companyId ? (data || []).filter(p => p.company_id === companyId) : [];
    },
    enabled: !!companyId && filtersExpanded,
  });

  // Carregar departamentos para filtro
  const { data: departments = [] } = useQuery({
    queryKey: ['departments', companyId],
    queryFn: async () => {
      const data = await (await import('@/lib/departmentsDb')).listDepartments(companyId || '');
      return data || [];
    },
    enabled: !!companyId && filtersExpanded,
  });

  // Carregar ativos com filtros
  const { data: assets = [], isLoading, refetch } = useQuery({
    queryKey: ['assets', companyId, filters],
    queryFn: async () => {
      if (!companyId) return [];

      // Adicionar filtros de permissão
      const filtersWithPermissions: ExpandedAssetFilters = {
        ...filters,
        user_role: user?.role,
        user_department_id: user?.departmentId,
        user_id: user?.id,
      };

      return listAssetsWithAssignee(companyId, filtersWithPermissions);
    },
    enabled: !!companyId,
  });

  // Verificar se usuário pode editar (não colaborador)
  const canEdit = (user?.role || "").toString().toUpperCase() !== "COLABORADOR";
  // Verificar se pode gerenciar (mostrar ações como Entregar)
  const roleValue = (user?.role || "").toString().toUpperCase();
  const canManage = roleValue === "MASTERADMIN" || roleValue === "ADMIN";

  const handleViewAsset = (assetId: string) => {
    setSelectedAssetId(assetId);
    setModalOpen(true);
  };

  const handleEditAsset = (assetId: string) => {
    navigate(`/app/ativos/${assetId}/editar`);
  };

  const handleOpenContract = (contractUrl: string) => {
    window.open(contractUrl, "_blank", "noopener,noreferrer");
  };

  const handleCreateAsset = () => {
    navigate("/app/ativos/novo");
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[color:var(--sinaxys-ink)]">
          Gestão de Ativos
        </h1>
        <Button onClick={handleCreateAsset} disabled={!canEdit}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Ativo
        </Button>
      </div>

      {/* Filtros Avançados */}
      <AssetFilters
        expanded={filtersExpanded}
        onToggle={() => setFiltersExpanded(!filtersExpanded)}
        filters={filters}
        onChange={setFilters}
        resultCount={assets.length}
        availableUsers={profiles.map(p => ({
          id: p.id,
          name: p.name || '',
          job_title: p.job_title || null,
        }))}
        availableDepartments={departments.map(d => ({
          id: d.id,
          name: d.name || '',
        }))}
      />

      {/* Lista de Ativos */}
      <div className="mt-6">
        <AssetListSection
          assets={assets}
          loading={isLoading}
          onView={handleViewAsset}
          onEdit={canEdit ? handleEditAsset : undefined}
          onContract={handleOpenContract}
          canEdit={canEdit}
          canManage={canManage}
          emptyTitle="Nenhum ativo encontrado"
          emptyDescription="Tente ajustar os filtros ou adicionar um novo ativo."
          emptyAction={
            canEdit ? {
              label: "Adicionar novo ativo",
              onClick: handleCreateAsset,
            } : undefined
          }
        />
      </div>

      {/* Asset Modal */}
      {selectedAssetId && (
        <AssetModal
          assetId={selectedAssetId}
          open={modalOpen}
          onOpenChange={(open) => {
            setModalOpen(open);
            if (!open) setSelectedAssetId(null);
          }}
          onUpdated={() => {
            refetch();
            setModalOpen(false);
          }}
          onDeleted={() => {
            refetch();
            setModalOpen(false);
          }}
        />
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