import React from "react";
import { useNavigate } from "react-router-dom";
import { useCompanyModuleEnabled } from "@/hooks/useCompanyModuleEnabled";
import { RequireCompanyModule } from "@/components/RequireCompanyModule";
import { AnnouncementComposer } from "@/components/AnnouncementComposer";

export default function AnnouncementCreatePage() {
  const { enabled } = useCompanyModuleEnabled("INTERNAL_COMMUNICATION");
  const navigate = useNavigate();

  return (
    <RequireCompanyModule moduleKey="INTERNAL_COMMUNICATION">
      <div className="grid gap-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/announcements")}
            className="rounded-lg text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Voltar
          </button>
          <div>
            <h1 className="text-2xl font-semibold">Criar Novo Recado</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Envie uma comunicação para sua equipe
            </p>
          </div>
        </div>

        <AnnouncementComposer
          onSuccess={() => navigate("/announcements")}
          onCancel={() => navigate("/announcements")}
        />
      </div>
    </RequireCompanyModule>
  );
}
