import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { listProfilesByCompany } from "@/lib/profilesDb";
import { type Squad } from "@/lib/squadsDb";
import { toast } from "sonner";

const squadSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  product: z.string().optional(),
  type: z.enum(["core", "growth", "support"]).nullable().optional(),
  owner_user_id: z.string().uuid().nullable().optional(),
  active: z.boolean(),
});

type SquadFormData = z.infer<typeof squadSchema>;

interface SquadFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  squad?: Squad | null;
  companyId: string;
  onSave: (data: any) => Promise<void>;
}

export function SquadForm({ open, onOpenChange, squad, companyId, onSave }: SquadFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles", companyId],
    queryFn: () => listProfilesByCompany(companyId),
    enabled: open,
  });

  const form = useForm<SquadFormData>({
    resolver: zodResolver(squadSchema),
    defaultValues: {
      name: "",
      product: "",
      type: "core",
      owner_user_id: null,
      active: true,
    },
  });

  useEffect(() => {
    if (squad) {
      form.reset({
        name: squad.name,
        product: squad.product || "",
        type: squad.type || "core",
        owner_user_id: squad.owner_user_id || null,
        active: squad.active,
      });
    } else {
      form.reset({
        name: "",
        product: "",
        type: "core",
        owner_user_id: null,
        active: true,
      });
    }
  }, [squad, form]);

  const onSubmit = async (data: SquadFormData) => {
    try {
      setIsSubmitting(true);
      await onSave({
        ...data,
        company_id: companyId,
      });
      toast.success(squad ? "Squad atualizado com sucesso" : "Squad criado com sucesso");
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar squad");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-[color:var(--sinaxys-ink)]">
            {squad ? "Editar Squad" : "Novo Squad"}
          </DialogTitle>
          <DialogDescription>
            Cadastre os detalhes do squad cross-functional.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Squad *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Squad de Plataforma" {...field} className="rounded-xl" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="product"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Produto</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Kairoos" {...field} className="rounded-xl" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                    <FormControl>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">Nenhum</SelectItem>
                      <SelectItem value="core">Core</SelectItem>
                      <SelectItem value="growth">Growth</SelectItem>
                      <SelectItem value="support">Support</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="owner_user_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Owner</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value || ""}
                  >
                    <FormControl>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Selecione o owner" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">Nenhum</SelectItem>
                      {profiles
                        .filter((p) => p.active)
                        .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""))
                        .map((profile) => (
                          <SelectItem key={profile.id} value={profile.id}>
                            {profile.name} ({profile.job_title || "Sem cargo"})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!squad && (
              <FormField
                control={form.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-3 rounded-xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-tint)] p-4">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1">
                      <FormLabel className="text-sm font-medium">Ativo?</FormLabel>
                      <p className="text-xs text-muted-foreground">
                        Squads inativos não aparecem na lista e não entram nos cálculos
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
            {isSubmitting ? "Salvando..." : squad ? "Atualizar" : "Criar Squad"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
