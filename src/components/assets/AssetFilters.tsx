import { useState, useEffect } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import { ChevronDown, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserMultiSelect } from "@/components/okr/UserMultiSelect";
import { DepartmentMultiSelect } from "@/components/okr/DepartmentMultiSelect";
import {
  ExpandedAssetFilters,
  type AssetStatus,
  type AssetCategory,
} from "@/lib/assetsDb";
import { getAssetStatusLabel, getAssetCategoryLabel } from "@/lib/assetsDb";

interface AssetFiltersProps {
  expanded: boolean;
  onToggle: () => void;
  filters: ExpandedAssetFilters;
  onChange: (filters: ExpandedAssetFilters) => void;
  resultCount: number;
  availableUsers?: any[];
  availableDepartments?: any[];
}

export function AssetFilters({
  expanded,
  onToggle,
  filters,
  onChange,
  resultCount,
  availableUsers = [],
  availableDepartments = [],
}: AssetFiltersProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const [localSearch, setLocalSearch] = useState(filters.search || "");

  // Debounce para busca textual
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== filters.search) {
        const newFilters = { ...filters, search: localSearch || undefined };
        onChange(newFilters);
        updateURLParams(newFilters);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [localSearch]);

  // Atualizar URL quando filtros mudam
  const updateURLParams = (newFilters: ExpandedAssetFilters) => {
    const params = new URLSearchParams(searchParams);
    
    // Limpar todos os parâmetros existentes
    params.delete('status');
    params.delete('category');
    params.delete('assignee_id');
    params.delete('department_id');
    params.delete('has_assignee');
    params.delete('has_contract');
    params.delete('search');
    params.delete('quick_filter');

    // Adicionar novos parâmetros
    if (newFilters.status?.length) {
      params.set('status', newFilters.status.join(','));
    }
    if (newFilters.category?.length) {
      params.set('category', newFilters.category.join(','));
    }
    if (newFilters.assignee_id) {
      params.set('assignee_id', newFilters.assignee_id);
    }
    if (newFilters.department_id) {
      params.set('department_id', newFilters.department_id);
    }
    if (newFilters.has_assignee !== undefined) {
      params.set('has_assignee', String(newFilters.has_assignee));
    }
    if (newFilters.has_contract !== undefined) {
      params.set('has_contract', String(newFilters.has_contract));
    }
    if (newFilters.search) {
      params.set('search', newFilters.search);
    }

    setSearchParams(params);
  };

  // Atualizar filtros com persistência na URL
  const updateFilter = (key: keyof ExpandedAssetFilters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    onChange(newFilters);
    updateURLParams(newFilters);
  };

  const clearFilters = () => {
    const newFilters: ExpandedAssetFilters = {};
    onChange(newFilters);
    setLocalSearch("");
    setSearchParams({});
  };

  // Filtros rápidos
  const applyQuickFilter = (filterType: 'my_assets' | 'no_contract' | 'in_maintenance') => {
    const newFilters: ExpandedAssetFilters = { ...filters };

    switch (filterType) {
      case 'my_assets':
        newFilters.has_assignee = true;
        break;
      case 'no_contract':
        newFilters.has_contract = false;
        newFilters.has_assignee = true;
        break;
      case 'in_maintenance':
        newFilters.status = ['in_maintenance'];
        break;
    }

    onChange(newFilters);
    updateURLParams(newFilters);
  };

  const statusOptions: { value: AssetStatus; label: string }[] = [
    { value: "in_stock", label: "Em estoque" },
    { value: "reserved", label: "Reservado" },
    { value: "in_use", label: "Em uso" },
    { value: "in_return", label: "Em devolução" },
    { value: "returned", label: "Devolvido" },
    { value: "in_maintenance", label: "Em manutenção" },
    { value: "acquired_by_user", label: "Adquirido pelo colaborador" },
    { value: "lost", label: "Extraviado" },
    { value: "discarded", label: "Descartado" },
  ];

  const categoryOptions: { value: AssetCategory; label: string }[] = [
    { value: "it_equipment", label: "Equipamento de TI" },
    { value: "office_equipment", label: "Equipamento de escritório" },
    { value: "mobile_devices", label: "Dispositivo móvel" },
    { value: "furniture", label: "Móvel" },
    { value: "vehicles", label: "Veículo" },
    { value: "tools", label: "Ferramenta" },
    { value: "licenses", label: "Licença de software" },
    { value: "other", label: "Outro" },
  ];

  return (
    <Collapsible open={expanded} onOpenChange={onToggle}>
      <CollapsibleTrigger className="w-full flex items-center justify-between p-4 rounded-xl border border-[color:var(--sinaxys-border)] hover:bg-[color:var(--sinaxys-tint)]/20 transition-all">
        <div className="flex items-center gap-2">
          <span className="font-medium text-[color:var(--sinaxys-ink)]">Filtros Avançados</span>
          <Badge variant="secondary" className="rounded-full">
            {resultCount} ativos
          </Badge>
        </div>
        <ChevronDown className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
      </CollapsibleTrigger>

      <CollapsibleContent className="p-4 border-t border-[color:var(--sinaxys-border)] mt-2 space-y-4">
        {/* Status */}
        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={filters.status?.[0] || ""}
            onValueChange={(value) => updateFilter('status', value ? [value as AssetStatus] : undefined)}
          >
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="Todos os status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos os status</SelectItem>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Categoria */}
        <div className="space-y-2">
          <Label>Categoria</Label>
          <Select
            value={filters.category?.[0] || ""}
            onValueChange={(value) => updateFilter('category', value ? [value as AssetCategory] : undefined)}
          >
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="Todas as categorias" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas as categorias</SelectItem>
              {categoryOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Responsável */}
        {availableUsers.length > 0 && (
          <div className="space-y-2">
            <Label>Responsável</Label>
            <UserMultiSelect
              users={availableUsers}
              value={filters.assignee_id ? [filters.assignee_id] : []}
              onChange={(ids) => updateFilter('assignee_id', ids[0])}
              placeholder="Buscar responsável..."
            />
          </div>
        )}

        {/* Departamento */}
        {availableDepartments.length > 0 && (
          <div className="space-y-2">
            <Label>Departamento</Label>
            <DepartmentMultiSelect
              departments={availableDepartments}
              value={filters.department_id ? [filters.department_id] : []}
              onChange={(ids) => updateFilter('department_id', ids[0])}
              placeholder="Buscar departamento..."
            />
          </div>
        )}

        {/* Disponibilidade */}
        <div className="space-y-2">
          <Label>Disponibilidade</Label>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="has_assignee_all"
                checked={filters.has_assignee === undefined}
                onCheckedChange={(checked) => {
                  if (checked) updateFilter('has_assignee', undefined);
                }}
              />
              <label htmlFor="has_assignee_all" className="text-sm">
                Todos
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="has_assignee_true"
                checked={filters.has_assignee === true}
                onCheckedChange={(checked) => {
                  updateFilter('has_assignee', checked === true ? true : undefined);
                }}
              />
              <label htmlFor="has_assignee_true" className="text-sm">
                Com responsável
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="has_assignee_false"
                checked={filters.has_assignee === false}
                onCheckedChange={(checked) => {
                  updateFilter('has_assignee', checked === true ? false : undefined);
                }}
              />
              <label htmlFor="has_assignee_false" className="text-sm">
                Sem responsável
              </label>
            </div>
          </div>
        </div>

        {/* Filtros rápidos */}
        <div className="space-y-2">
          <Label>Filtros rápidos</Label>
          <div className="flex gap-2 flex-wrap">
            <Badge
              variant="outline"
              className="cursor-pointer hover:bg-[color:var(--sinaxys-tint)] rounded-full"
              onClick={() => applyQuickFilter('my_assets')}
            >
              Com responsável
            </Badge>
            <Badge
              variant="outline"
              className="cursor-pointer hover:bg-[color:var(--sinaxys-tint)] rounded-full"
              onClick={() => applyQuickFilter('no_contract')}
            >
              Sem contrato
            </Badge>
            <Badge
              variant="outline"
              className="cursor-pointer hover:bg-[color:var(--sinaxys-tint)] rounded-full"
              onClick={() => applyQuickFilter('in_maintenance')}
            >
              Em manutenção
            </Badge>
          </div>
        </div>

        {/* Busca textual */}
        <div className="space-y-2">
          <Label>Buscar</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Nome do ativo, código, colaborador..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="pl-10 rounded-xl"
            />
            {localSearch && (
              <button
                onClick={() => setLocalSearch("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
              >
                <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* Limpar filtros */}
        <Button
          variant="outline"
          className="w-full rounded-xl"
          onClick={clearFilters}
        >
          Limpar filtros
        </Button>
      </CollapsibleContent>
    </Collapsible>
  );
}