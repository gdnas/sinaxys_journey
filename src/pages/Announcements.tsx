import React from "react";
import { useCompanyModuleEnabled } from "@/hooks/useCompanyModuleEnabled";
import { RequireCompanyModule } from "@/components/RequireCompanyModule";
import { AnnouncementComposer } from "@/components/AnnouncementComposer";
import { AnnouncementList } from "@/components/AnnouncementList";
import { useAuth } from "@/lib/auth";
import { useState } from "react";

export default function AnnouncementsPage() {
  const { enabled } = useCompanyModuleEnabled("INTERNAL_COMMUNICATION");
  const { user } = useAuth();
  const [showComposer, setShowComposer] = useState(false);
  const canPublish = user?.role === "ADMIN" || user?.role === "HEAD" || user?.role === "MASTERADMIN";

  return (
    <RequireCompanyModule moduleKey="INTERNAL_COMMUNICATION">
      <div className="grid gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Mural de Recados</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Acompanhe as comunicações da sua empresa
            </p>
          </div>
          {canPublish && !showComposer && (
            <button
              onClick={() => setShowComposer(true)}
              className="rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 text-sm font-medium text-white hover:from-purple-700 hover:to-pink-700"
            >
              + Novo Recado
            </button>
          )}
        </div>

        {showComposer && (
          <AnnouncementComposer
            onSuccess={() => setShowComposer(false)}
            onCancel={() => setShowComposer(false)}
          />
        )}

        <AnnouncementList />
      </div>
    </RequireCompanyModule>
  );
}
