import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, RefreshCw } from "lucide-react";
import { listDepartments } from "@/lib/departmentsDb";
import { setCostAllocations, type CostAllocation } from "@/lib/costItemsDb";
import { toast } from "sonner";
import { brl } from "@/lib/costs";

interface AllocationRow {
  id: string;
  department_id: string;
  department_name: string;
  allocation_percentage: number;
}

interface CostAllocationsEditorProps {
  costItemId: string;
  companyId: string;
  isShared: boolean;
  monthlyCost: number;
  onSave?: () => void;
}

export function CostAllocationsEditor({
  costItemId,
  companyId,
  isShared,
  monthlyCost,
  onSave,
}: CostAllocationsEditorProps) {
  const queryClient = useQueryClient();
  const [allocations, setAllocations] = useState<AllocationRow[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [open, setOpen] = useState(false);

  const { data: deptList = [] } = useQuery({
    queryKey: ["departments", companyId],
    queryFn: () => listDepartments(companyId),
    enabled: open,
  });

  const totalPercentage = allocations.reduce((sum, a) => sum + a.allocation_percentage, 0);
  const isValid = Math.abs(totalPercentage - 100) < 0.01;
  const isComplete = isShared ? allocations.length >= 2 : allocations.length === 1;

  const addAllocation = () => {
    const availableDept = departments.find(
      (d) => !allocations.some((a) => a.department_id === d.id)
    );
    if (availableDept) {
      setAllocations([
        ...allocations,
        {
          id: crypto.randomUUID(),
          department_id: availableDept.id,
          department_name: availableDept.name,
          allocation_percentage: 0,
        },
      ]);
    }
  };

  const removeAllocation = (id: string) => {
    setAllocations(allocations.filter((a) => a.id !== id));
  };

  const updateAllocation = (id: string, percentage: number) => {
    setAllocations(
      allocations.map((a) => (a.id === id ? { ...a, allocation_percentage: percentage } : a))
    );
  };

  const suggestHeadcount = () => {
    // Calculate allocation based on department headcount
    const suggestedAllocations = departments.map((dept) => ({
      id: crypto.randomUUID(),
      department_id: dept.id,
      department_name: dept.name,
      allocation_percentage: Math.round(100 / departments.length), // Simplified for now
    }));

    // Adjust last to ensure exactly 100%
    let sum = suggestedAllocations.reduce((s, a) => s + a.allocation_percentage, 0);
    if (suggestedAllocations.length > 0) {
      suggestedAllocations[suggestedAllocations.length - 1].allocation_percentage += 100 - sum;
    }

    setAllocations(suggestedAllocations);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const allocationsToSave = allocations.map((a) => ({
        department_id: a.department_id,
        allocation_percentage: a.allocation_percentage,
      }));

      if (isShared) {
        if (Math.abs(totalPercentage - 100) > 0.01) {
          throw new Error("A soma dos percentuais deve ser exatamente 100%");
        }
        if (allocations.length < 2) {
          throw new Error("Itens compartilhados precisam de pelo menos 2 departamentos");
        }
      } else {
        if (allocations.length !== 1) {
          throw new Error("Itens não compartilhados devem ter exatamente 1 departamento");
        }
        if (Math.abs(allocations[0].allocation_percentage - 100) > 0.01) {
          throw new Error("O percentual deve ser exatamente 100%");
        }
      }

      await setCostAllocations(costItemId, allocationsToSave);
    },
    onSuccess: () => {
      toast.success("Rateio salvo com sucesso");
      queryClient.invalidateQueries({ queryKey: ["cost-item", costItemId] });
      queryClient.invalidateQueries({ queryKey: ["cost-items", companyId] });
      onSave?.();
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao salvar rateio");
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">
            Rateio por Departamento
          </Label>
          <p className="mt-1 text-xs text-muted-foreground">
            Defina a porcentual de alocação da despesa para cada departamento.
          </p>
        </div>
        {isShared && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={suggestHeadcount}
            className="h-9 gap-1 rounded-xl"
          >
            <RefreshCw className="h-3 w-3" />
            Sugestão por Headcount
          </Button>
        )}
      </div>

      <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-4">
        <div className="mb-4 grid grid-cols-2 gap-4 rounded-xl bg-[color:var(--sinaxys-tint)] p-4">
          <div>
            <div className="text-xs text-muted-foreground">Custo mensal</div>
            <div className="mt-1 text-sm font-semibold text-[color:var(--sinaxys-ink)]">{brl(monthlyCost)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Soma dos percentuais</div>
            <div
              className={`mt-1 text-sm font-semibold ${
                isValid ? "text-green-600" : "text-red-600"
              }`}
            >
              {totalPercentage.toFixed(2)}%
            </div>
          </div>
        </div>

        {isShared && (
          <div className="mb-4 text-xs text-muted-foreground">
            <span className="font-semibold text-[color:var(--sinaxys-ink)]">Regras:</span>
            {" "}Deve haver pelo menos 2 departamentos e a soma deve ser exatamente 100%.
          </div>
        )}

        {!isShared && (
          <div className="mb-4 text-xs text-muted-foreground">
            <span className="font-semibold text-[color:var(--sinaxys-ink)]">Regra:</span>
            {" "}Deve haver exatamente 1 departamento com 100% de alocação.
          </div>
        )}

        <div className="space-y-3">
          {allocations.map((allocation) => (
            <div key={allocation.id} className="flex items-center gap-3">
              <div className="flex-1 rounded-lg border border-[color:var(--sinaxys-border)] bg-white p-3">
                <div className="mb-2 text-xs font-medium text-[color:var(--sinaxys-ink)]">
                  {allocation.department_name}
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={allocation.allocation_percentage}
                    onChange={(e) => updateAllocation(allocation.id, Number(e.target.value))}
                    className="h-9 w-24 rounded-lg"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                  <div className="ml-auto min-w-[80px] text-right text-xs text-muted-foreground">
                    {brl((monthlyCost * allocation.allocation_percentage) / 100)}
                  </div>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 rounded-lg text-destructive hover:text-destructive"
                onClick={() => removeAllocation(allocation.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          {allocations.length === 0 && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Nenhum departamento selecionado. Adicione pelo menos um departamento.
            </div>
          )}

          {departments.length > allocations.length && (
            <Button
              type="button"
              variant="outline"
              onClick={addAllocation}
              className="h-10 w-full gap-2 rounded-xl"
            >
              <Plus className="h-4 w-4" />
              Adicionar Departamento
            </Button>
          )}
        </div>

        {departments.length === allocations.length && allocations.length > 0 && (
          <div className="mt-4 rounded-lg bg-yellow-50 p-3 text-xs text-yellow-800">
            Todos os departamentos já foram adicionados. Remova um departamento para adicionar outro.
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => setAllocations([])}
          className="h-11 rounded-xl"
        >
          Cancelar
        </Button>
        <Button
          type="button"
          onClick={() => saveMutation.mutate()}
          disabled={!isValid || !isComplete || saveMutation.isPending}
          className="h-11 rounded-xl"
        >
          {saveMutation.isPending ? "Salvando..." : "Salvar Rateio"}
        </Button>
      </div>
    </div>
  );
}