import { useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { brl } from "@/lib/costs";
import { createCostItem, suggestHeadcountAllocations, updateCostItem, type CostAllocation, type CostItem } from "@/lib/costItemsDb";

type DepartmentOption = {
  id: string;
  name: string;
};

type AllocationDraft = {
  id: string;
  department_id: string;
  allocation_percentage: number;
};

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `alloc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildDefaultAllocations(departments: DepartmentOption[], ownerDepartmentId?: string | null) {
  if (ownerDepartmentId) {
    return [{ id: createId(), department_id: ownerDepartmentId, allocation_percentage: 100 }];
  }

  if (departments[0]) {
    return [{ id: createId(), department_id: departments[0].id, allocation_percentage: 100 }];
  }

  return [] as AllocationDraft[];
}

function buildSharedDefaults(departments: DepartmentOption[], ownerDepartmentId?: string | null) {
  const uniqueIds = Array.from(new Set([ownerDepartmentId, departments[0]?.id, departments[1]?.id].filter(Boolean))) as string[];
  const selectedIds = uniqueIds.slice(0, 2);

  if (selectedIds.length === 0) return [] as AllocationDraft[];
  if (selectedIds.length === 1) {
    return [{ id: createId(), department_id: selectedIds[0], allocation_percentage: 100 }];
  }

  return selectedIds.map((departmentId, index) => ({
    id: createId(),
    department_id: departmentId,
    allocation_percentage: index === 0 ? 50 : 50,
  }));
}

export function ExpenseItemDialog({
  open,
  onOpenChange,
  companyId,
  departments,
  costItem,
  initialAllocations,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  departments: DepartmentOption[];
  costItem?: CostItem | null;
  initialAllocations?: CostAllocation[];
  onSaved: () => Promise<void> | void;
}) {
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [type, setType] = useState<"fixed" | "variable">("fixed");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual" | "one_time">("monthly");
  const [monthlyCost, setMonthlyCost] = useState("0");
  const [shared, setShared] = useState(false);
  const [allocationMethod, setAllocationMethod] = useState<"manual" | "headcount">("manual");
  const [ownerDepartmentId, setOwnerDepartmentId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [active, setActive] = useState(true);
  const [allocations, setAllocations] = useState<AllocationDraft[]>([]);

  useEffect(() => {
    if (!open) return;

    if (costItem) {
      setName(costItem.name);
      setCategory(costItem.category ?? "");
      setType(costItem.type);
      setBillingCycle(costItem.billing_cycle);
      setMonthlyCost(String(Number(costItem.total_monthly_cost) || 0));
      setShared(costItem.is_shared);
      setAllocationMethod(costItem.allocation_method);
      setOwnerDepartmentId(costItem.owner_department_id);
      setNotes(costItem.notes ?? "");
      setActive(costItem.active);
      setAllocations(
        initialAllocations?.length
          ? initialAllocations.map((item) => ({
              id: item.id,
              department_id: item.department_id,
              allocation_percentage: Number(item.allocation_percentage) || 0,
            }))
          : buildDefaultAllocations(departments, costItem.owner_department_id),
      );
      return;
    }

    const defaultOwner = departments[0]?.id ?? null;
    setName("");
    setCategory("Tecnologia");
    setType("fixed");
    setBillingCycle("monthly");
    setMonthlyCost("0");
    setShared(false);
    setAllocationMethod("manual");
    setOwnerDepartmentId(defaultOwner);
    setNotes("");
    setActive(true);
    setAllocations(buildDefaultAllocations(departments, defaultOwner));
  }, [open, costItem, initialAllocations, departments]);

  const totalPercentage = useMemo(
    () => allocations.reduce((sum, item) => sum + (Number(item.allocation_percentage) || 0), 0),
    [allocations],
  );

  const monthlyCostValue = Number(monthlyCost) || 0;

  function setSingleDepartment(departmentId: string | null) {
    setOwnerDepartmentId(departmentId);
    if (!departmentId) {
      setAllocations([]);
      return;
    }
    setAllocations([{ id: createId(), department_id: departmentId, allocation_percentage: 100 }]);
  }

  function handleSharedChange(next: boolean) {
    setShared(next);
    if (next) {
      setAllocations((current) => {
        if (current.length >= 2) return current;
        return buildSharedDefaults(departments, ownerDepartmentId);
      });
      return;
    }

    const fallbackDepartmentId = ownerDepartmentId ?? allocations[0]?.department_id ?? departments[0]?.id ?? null;
    if (fallbackDepartmentId) {
      setSingleDepartment(fallbackDepartmentId);
    } else {
      setAllocations([]);
    }
  }

  function addAllocation() {
    const used = new Set(allocations.map((item) => item.department_id));
    const nextDepartment = departments.find((department) => !used.has(department.id)) ?? departments[0];
    if (!nextDepartment) return;

    setAllocations((current) => [
      ...current,
      { id: createId(), department_id: nextDepartment.id, allocation_percentage: 0 },
    ]);
  }

  function updateAllocation(id: string, patch: Partial<AllocationDraft>) {
    setAllocations((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function removeAllocation(id: string) {
    setAllocations((current) => current.filter((item) => item.id !== id));
  }

  async function applyHeadcountSuggestion() {
    try {
      const suggested = await suggestHeadcountAllocations(companyId);
      setAllocations(
        suggested.map((item) => ({
          id: createId(),
          department_id: item.department_id,
          allocation_percentage: Number(item.allocation_percentage) || 0,
        })),
      );
      setAllocationMethod("headcount");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível sugerir o rateio.");
    }
  }

  async function handleSubmit() {
    if (!name.trim()) {
      toast.error("Informe o nome da despesa.");
      return;
    }

    if (monthlyCostValue <= 0) {
      toast.error("Informe um custo mensal maior que zero.");
      return;
    }

    const normalizedAllocations = shared
      ? allocations
          .map((item) => ({
            department_id: item.department_id,
            allocation_percentage: Number(item.allocation_percentage) || 0,
          }))
          .filter((item) => !!item.department_id)
      : ownerDepartmentId
        ? [{ department_id: ownerDepartmentId, allocation_percentage: 100 }]
        : [];

    if (!shared && !ownerDepartmentId) {
      toast.error("Selecione o departamento responsável.");
      return;
    }

    if (shared) {
      if (normalizedAllocations.length < 2) {
        toast.error("Despesas compartilhadas precisam de pelo menos 2 departamentos.");
        return;
      }

      const uniqueDepartments = new Set(normalizedAllocations.map((item) => item.department_id));
      if (uniqueDepartments.size !== normalizedAllocations.length) {
        toast.error("Cada departamento só pode aparecer uma vez no rateio.");
        return;
      }

      if (Math.abs(totalPercentage - 100) > 0.01) {
        toast.error("A soma do rateio deve ser exatamente 100%.");
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        category: category.trim() || null,
        type,
        billing_cycle: billingCycle,
        total_monthly_cost: monthlyCostValue,
        is_shared: shared,
        allocation_method: allocationMethod,
        owner_department_id: ownerDepartmentId,
        notes: notes.trim() || null,
        active,
        allocations: normalizedAllocations,
      };

      if (costItem) {
        await updateCostItem(costItem.id, payload);
        toast.success("Despesa atualizada com sucesso.");
      } else {
        await createCostItem({ company_id: companyId, ...payload });
        toast.success("Despesa criada com sucesso.");
      }

      await onSaved();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar a despesa.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-0">
        <div className="p-6 md:p-7">
          <DialogHeader>
            <DialogTitle className="text-xl text-[color:var(--sinaxys-ink)]">
              {costItem ? "Editar despesa" : "Nova despesa de ferramenta"}
            </DialogTitle>
            <DialogDescription>
              Cadastre ferramentas, licenças, fornecedores e outros custos não-humanos com rateio por departamento.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="grid gap-2 md:col-span-2">
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Figma, AWS, Google Workspace" className="h-11 rounded-2xl" />
            </div>

            <div className="grid gap-2">
              <Label>Categoria</Label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ex.: Tecnologia" className="h-11 rounded-2xl" />
            </div>

            <div className="grid gap-2">
              <Label>Custo mensal equivalente</Label>
              <Input type="number" min="0" step="0.01" value={monthlyCost} onChange={(e) => setMonthlyCost(e.target.value)} className="h-11 rounded-2xl" />
              <div className="text-xs text-muted-foreground">Use o valor mensal. Para anual, divida por 12.</div>
            </div>

            <div className="grid gap-2">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={(value: "fixed" | "variable") => setType(value)}>
                <SelectTrigger className="h-11 rounded-2xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixo</SelectItem>
                  <SelectItem value="variable">Variável</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Ciclo</Label>
              <Select value={billingCycle} onValueChange={(value: "monthly" | "annual" | "one_time") => setBillingCycle(value)}>
                <SelectTrigger className="h-11 rounded-2xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Mensal</SelectItem>
                  <SelectItem value="annual">Anual</SelectItem>
                  <SelectItem value="one_time">Único</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-6 rounded-[28px] border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-tint)]/60 p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Rateio por departamento</div>
                <p className="mt-1 text-sm text-muted-foreground">Escolha entre despesa exclusiva de um departamento ou compartilhada entre vários.</p>
              </div>

              <div className="flex items-center gap-3 rounded-full border border-[color:var(--sinaxys-border)] bg-white px-4 py-2">
                <Switch checked={shared} onCheckedChange={handleSharedChange} />
                <div>
                  <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Compartilhada</div>
                  <div className="text-xs text-muted-foreground">{shared ? "Rateio entre múltiplos departamentos" : "100% em um departamento"}</div>
                </div>
              </div>
            </div>

            {!shared ? (
              <div className="mt-5 grid gap-2 md:max-w-sm">
                <Label>Departamento responsável</Label>
                <Select value={ownerDepartmentId ?? "none"} onValueChange={(value) => setSingleDepartment(value === "none" ? null : value)}>
                  <SelectTrigger className="h-11 rounded-2xl bg-white">
                    <SelectValue placeholder="Selecione um departamento" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="none">Selecione</SelectItem>
                    {departments.map((department) => (
                      <SelectItem key={department.id} value={department.id}>
                        {department.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="mt-5 grid gap-4">
                <div className="flex flex-col gap-3 rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Soma do rateio</div>
                    <div className={`mt-1 text-sm ${Math.abs(totalPercentage - 100) <= 0.01 ? "text-emerald-700" : "text-amber-700"}`}>
                      {totalPercentage.toFixed(2)}%
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" className="rounded-full" onClick={applyHeadcountSuggestion}>
                      <RefreshCw className="mr-2 h-4 w-4" />Sugestão por headcount
                    </Button>
                    <Button type="button" variant="outline" className="rounded-full" onClick={addAllocation}>
                      <Plus className="mr-2 h-4 w-4" />Adicionar departamento
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3">
                  {allocations.map((allocation) => (
                    <div key={allocation.id} className="grid gap-3 rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-4 md:grid-cols-[1fr_180px_auto] md:items-end">
                      <div className="grid gap-2">
                        <Label>Departamento</Label>
                        <Select value={allocation.department_id} onValueChange={(value) => updateAllocation(allocation.id, { department_id: value })}>
                          <SelectTrigger className="h-11 rounded-2xl">
                            <SelectValue placeholder="Selecione um departamento" />
                          </SelectTrigger>
                          <SelectContent>
                            {departments.map((department) => (
                              <SelectItem key={department.id} value={department.id}>
                                {department.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2">
                        <Label>Percentual</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={allocation.allocation_percentage}
                          onChange={(e) => updateAllocation(allocation.id, { allocation_percentage: Number(e.target.value) || 0 })}
                          className="h-11 rounded-2xl"
                        />
                        <div className="text-xs text-muted-foreground">{brl((monthlyCostValue * allocation.allocation_percentage) / 100)}</div>
                      </div>

                      <Button type="button" variant="ghost" className="h-11 rounded-2xl text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => removeAllocation(allocation.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}

                  {!allocations.length && (
                    <div className="rounded-2xl border border-dashed border-[color:var(--sinaxys-border)] bg-white p-6 text-sm text-muted-foreground">
                      Adicione pelo menos dois departamentos para ratear esta despesa.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="grid gap-2 md:col-span-2">
              <Label>Observações</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex.: 12 licenças do time de produto, contrato renovado em janeiro..." className="min-h-[96px] rounded-2xl" />
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-[color:var(--sinaxys-border)] bg-white px-4 py-3 md:max-w-sm">
              <Switch checked={active} onCheckedChange={setActive} />
              <div>
                <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Despesa ativa</div>
                <div className="text-xs text-muted-foreground">Somente despesas ativas entram no consolidado.</div>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6 flex-col gap-2 border-t border-[color:var(--sinaxys-border)] pt-5 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" className="rounded-full" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="button" className="rounded-full bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90" onClick={handleSubmit} disabled={saving}>
              {saving ? "Salvando..." : costItem ? "Salvar alterações" : "Criar despesa"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
