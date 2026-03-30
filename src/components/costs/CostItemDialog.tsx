import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useQuery } from "@tanstack/react-query";
import { listDepartments } from "@/lib/departmentsDb";
import { type CostItem } from "@/lib/costItemsDb";
import { toast } from "sonner";
import { brl } from "@/lib/costs";

const costItemSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  category: z.string().optional(),
  type: z.enum(["fixed", "variable"]),
  billing_cycle: z.enum(["monthly", "annual", "one_time"]),
  total_monthly_cost: z.coerce.number().min(0, "Custo deve ser maior ou igual a 0"),
  is_shared: z.boolean(),
  allocation_method: z.enum(["manual", "headcount"]),
  owner_department_id: z.string().uuid().nullable().optional(),
  competence_month: z.coerce.number().min(1).max(12).nullable().optional(),
  competence_year: z.coerce.number().min(2000).max(2100).nullable().optional(),
  active: z.boolean(),
  notes: z.string().optional(),
});

type CostItemFormData = z.infer<typeof costItemSchema>;

interface CostItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  costItem?: CostItem | null;
  companyId: string;
  onSave: (data: any) => Promise<void>;
}

export function CostItemDialog({ open, onOpenChange, costItem, companyId, onSave }: CostItemDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: departments = [] } = useQuery({
    queryKey: ["departments", companyId],
    queryFn: () => listDepartments(companyId),
    enabled: open,
  });

  const form = useForm<CostItemFormData>({
    resolver: zodResolver(costItemSchema),
    defaultValues: {
      name: "",
      category: "",
      type: "fixed",
      billing_cycle: "monthly",
      total_monthly_cost: 0,
      is_shared: false,
      allocation_method: "manual",
      owner_department_id: null,
      competence_month: null,
      competence_year: null,
      active: true,
      notes: "",
    },
  });

  useEffect(() => {
    if (costItem) {
      form.reset({
        name: costItem.name,
        category: costItem.category || "",
        type: costItem.type,
        billing_cycle: costItem.billing_cycle,
        total_monthly_cost: Number(costItem.total_monthly_cost),
        is_shared: costItem.is_shared,
        allocation_method: costItem.allocation_method,
        owner_department_id: costItem.owner_department_id || null,
        competence_month: costItem.competence_month,
        competence_year: costItem.competence_year,
        active: costItem.active,
        notes: costItem.notes || "",
      });
    } else {
      form.reset({
        name: "",
        category: "",
        type: "fixed",
        billing_cycle: "monthly",
        total_monthly_cost: 0,
        is_shared: false,
        allocation_method: "manual",
        owner_department_id: null,
        competence_month: null,
        competence_year: null,
        active: true,
        notes: "",
      });
    }
  }, [costItem, form]);

  const watchIsShared = form.watch("is_shared");
  const watchAllocationMethod = form.watch("allocation_method");
  const watchTotalCost = form.watch("total_monthly_cost");

  const onSubmit = async (data: CostItemFormData) => {
    try {
      setIsSubmitting(true);
      await onSave({
        ...data,
        company_id: companyId,
        allocations: costItem ? undefined : [], // Don't send allocations on update
      });
      toast.success(costItem ? "Despesa atualizada com sucesso" : "Despesa criada com sucesso");
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar despesa");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-[color:var(--sinaxys-ink)]">
            {costItem ? "Editar Despesa" : "Nova Despesa"}
          </DialogTitle>
          <DialogDescription>
            Cadastre os detalhes da despesa operacional e defina como ela será rateada entre departamentos.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da Despesa *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Licença de Software" {...field} className="rounded-xl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Tecnologia" {...field} className="rounded-xl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="fixed">Fixo</SelectItem>
                        <SelectItem value="variable">Variável</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="billing_cycle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ciclo de Cobrança *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="Selecione o ciclo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="monthly">Mensal</SelectItem>
                        <SelectItem value="annual">Anual</SelectItem>
                        <SelectItem value="one_time">Único</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="total_monthly_cost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Custo Mensal Equivalente (R$) *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                      className="rounded-xl"
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    O valor informado será usado nos cálculos como custo mensal. Para despesas anuais, divida por 12.
                  </p>
                  {watchTotalCost > 0 && (
                    <p className="mt-1 text-sm font-medium text-[color:var(--sinaxys-primary)]">
                      {brl(watchTotalCost)} / mês
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="rounded-xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-tint)] p-4">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Rateio entre Departamentos</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Defina como esta despesa será distribuída entre os departamentos.
                  </p>
                </div>
                <FormField
                  control={form.control}
                  name="is_shared"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center gap-3">
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1">
                        <FormLabel className="text-sm font-medium">Compartilhada?</FormLabel>
                        <p className="text-xs text-muted-foreground">
                          {field.value ? "Rateia entre múltiplos departamentos" : "Atribuída a um departamento"}
                        </p>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="owner_department_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Departamento Principal</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value || ""}
                        disabled={watchIsShared}
                      >
                        <FormControl>
                          <SelectTrigger className="rounded-xl">
                            <SelectValue placeholder="Selecione o departamento" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">Nenhum</SelectItem>
                          {departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id}>
                              {dept.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="allocation_method"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Método de Rateio</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={!watchIsShared}
                      >
                        <FormControl>
                          <SelectTrigger className="rounded-xl">
                            <SelectValue placeholder="Selecione o método" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="manual">Manual</SelectItem>
                          <SelectItem value="headcount">Por Headcount</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {watchIsShared && watchAllocationMethod === "headcount" && (
                <div className="mt-3 rounded-lg bg-white p-3 text-xs text-muted-foreground">
                  <p>
                    <span className="font-semibold text-[color:var(--sinaxys-ink)]">Por Headcount:</span>
                    {" "}A alocação será calculada automaticamente com base no número de pessoas em cada departamento. Você poderá ajustar manualmente após a criação.
                  </p>
                </div>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="competence_month"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mês de Competência</FormLabel>
                    <Select
                      onValueChange={(v) => field.onChange(v ? Number(v) : null)}
                      value={field.value ? String(field.value) : ""}
                    >
                      <FormControl>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="Selecione o mês" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Nenhum</SelectItem>
                        {Array.from({ length: 12 }, (_, i) => (
                          <SelectItem key={i + 1} value={String(i + 1)}>
                            {i + 1}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="competence_year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ano de Competência</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Ex: 2024"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                        className="rounded-xl"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Informações adicionais sobre esta despesa..."
                      className="min-h-[80px] resize-none rounded-xl"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!costItem && (
              <FormField
                control={form.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-3 rounded-xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-tint)] p-4">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1">
                      <FormLabel className="text-sm font-medium">Ativa?</FormLabel>
                      <p className="text-xs text-muted-foreground">
                        Despesas inativas não entram nos cálculos de custo
                      </p>
                    </div>
                  </FormItem>
                )}
              />
            )}
          </form>
        </Form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-11 rounded-xl">
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={form.handleSubmit(onSubmit)}
            disabled={isSubmitting}
            className="h-11 rounded-xl"
          >
            {isSubmitting ? "Salvando..." : costItem ? "Atualizar" : "Criar Despesa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
