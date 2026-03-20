import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

export default function AdminModules() {
  const { t } = useTranslation();

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t('nav.company.modules')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gerencie a visibilidade de módulos da empresa.</p>
        </div>
        <div />
      </div>

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="text-sm text-muted-foreground">Aqui você encontrará controles para ativar/desativar módulos e configurar políticas específicas. Essa é uma página administrativa separada de Marca.</div>
        <div className="mt-4">
          <Button className="h-10 rounded-xl bg-[color:var(--sinaxys-primary)] text-white">Ir para módulos</Button>
        </div>
      </Card>
    </div>
  );
}
