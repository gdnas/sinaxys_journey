import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getAnnouncementById, enrichAnnouncementsWithAuthors } from "@/lib/internalCommunicationDb";
import { useAuth } from "@/lib/auth";
import { AnnouncementComposer } from "@/components/AnnouncementComposer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function AnnouncementEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: enrichedAnnouncement, isLoading } = useQuery({
    queryKey: ["announcement", id],
    queryFn: async () => {
      const announcement = await getAnnouncementById(id!);
      if (!announcement) return null;
      const enriched = await enrichAnnouncementsWithAuthors([announcement], user?.id);
      return enriched[0];
    },
    enabled: !!id,
  });

  const canEdit = () => {
    if (!user || !enrichedAnnouncement) return false;
    if (user.role === "ADMIN" || user.role === "MASTERADMIN") return true;
    if (user.role === "HEAD" && enrichedAnnouncement.created_by === user.id) return true;
    return false;
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-1/3 rounded bg-gray-200" />
          <div className="h-64 rounded-xl bg-gray-100" />
        </div>
      </div>
    );
  }

  if (!enrichedAnnouncement || !canEdit()) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-12 text-center">
          <h3 className="text-lg font-semibold">Acesso negado</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Você não tem permissão para editar este recado.
          </p>
          <Button onClick={() => navigate("/announcements")} className="mt-4 rounded-xl">
            Voltar para o mural
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/announcements/${id}`)}
          className="rounded-xl"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Editar Recado</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Atualize as informações do recado
          </p>
        </div>
      </div>

      <AnnouncementComposer
        editMode={true}
        announcementId={enrichedAnnouncement.id}
        initialData={{
          title: enrichedAnnouncement.title,
          content: enrichedAnnouncement.content,
          scope: enrichedAnnouncement.scope,
          teamId: enrichedAnnouncement.team_id,
        }}
        onSuccess={() => navigate(`/announcements/${id}`)}
        onCancel={() => navigate(`/announcements/${id}`)}
      />
    </div>
  );
}
