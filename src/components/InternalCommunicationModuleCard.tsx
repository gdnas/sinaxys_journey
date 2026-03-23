import React from "react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useTranslation } from "react-i18next";
import { useCompanyModuleEnabled } from "@/hooks/useCompanyModuleEnabled";
import { useCompany } from "@/lib/company";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { setCompanyModuleEnabled } from "@/lib/modulesDb";
import { toast } from "@/hooks/use-toast";
import { MessageSquare, Cake } from "lucide-react";

export function InternalCommunicationModuleCard() {
  const { t } = useTranslation();
  const { companyId } = useCompany();
  const queryClient = useQueryClient();
  const { enabled: moduleEnabled, isLoading } = useCompanyModuleEnabled("INTERNAL_COMMUNICATION");

  const toggleMutation = useMutation({
    mutationFn: (enabled: boolean) =>
      setCompanyModuleEnabled(String(companyId), "INTERNAL_COMMUNICATION", enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-module", companyId, "INTERNAL_COMMUNICATION"] });
      toast({
        title: "Módulo atualizado",
        description: `Comunicação Interna foi ${moduleEnabled ? "desativado" : "ativado"} com sucesso.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar módulo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return null;
  }

  return (
    <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 text-white">
            <MessageSquare className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Comunicação Interna</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Mural de recados corporativos e celebração de aniversários dos colaboradores
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700">
                <MessageSquare className="h-3 w-3" />
                Mural de Recados
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-pink-50 px-2.5 py-1 text-xs font-medium text-pink-700">
                <Cake className="h-3 w-3" />
                Aniversários
              </span>
            </div>
          </div>
        </div>
        <Switch
          checked={moduleEnabled}
          onCheckedChange={(checked) => toggleMutation.mutate(checked)}
          disabled={toggleMutation.isPending}
          className="data-[state=checked]:bg-purple-600"
        />
      </div>
    </Card>
  );
}
