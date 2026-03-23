import React from "react";
import { useTranslation } from "react-i18next";
import { InternalCommunicationModuleCard } from "@/components/InternalCommunicationModuleCard";

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

      <div className="grid gap-4">
        <InternalCommunicationModuleCard />
      </div>
    </div>
  );
}