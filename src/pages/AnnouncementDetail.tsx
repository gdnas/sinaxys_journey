import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import {
  getAnnouncementById,
  enrichAnnouncementsWithAuthors,
  markAnnouncementAsRead,
  deleteAnnouncement,
} from "@/lib/internalCommunicationDb";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AnnouncementComposer } from "@/components/AnnouncementComposer";

export default function AnnouncementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data: enrichedAnnouncement, isLoading, refetch } = useQuery({
    queryKey: ["announcement", id],
    queryFn: async () => {
      const announcement = await getAnnouncementById(id!);
      if (!announcement) return null;
      const enriched = await enrichAnnouncementsWithAuthors([announcement], user?.id);
      return enriched[0];
    },
    enabled: !!id,
  });

  const markAsReadMutation = useMutation({
    mutationFn: () => markAnnouncementAsRead(id!, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcement", id] });
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await deleteAnnouncement(id!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      toast({
        title: "Recado excluído",
        description: "O recado foi excluído com sucesso.",
      });
      navigate("/announcements");
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir",
        description: error.message || "Não foi possível excluir o recado.",
        variant: "destructive",
      });
    },
  });

  const handleDelete = () => {
    deleteMutation.mutate();
    setDeleteDialogOpen(false);
  };

  const canEditOrDelete = () => {
    if (!user || !enrichedAnnouncement) return false;
    // Admin and MASTERADMIN can edit/delete any announcement in their company
    if (user.role === "ADMIN" || user.role === "MASTERADMIN") return true;
    // Head can only edit/delete their own team announcements
    if (user.role === "HEAD" && enrichedAnnouncement.created_by === user.id) return true;
    return false;
  };

  React.useEffect(() => {
    if (enrichedAnnouncement && !enrichedAnnouncement.is_read && user) {
      markAsReadMutation.mutate();
    }
  }, [enrichedAnnouncement, user]);

  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const datePart = date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
      const timePart = date.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });
      return `${datePart} às ${timePart}`;
    } catch {
      return dateString;
    }
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

  if (!enrichedAnnouncement) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-12 text-center">
          <h3 className="text-lg font-semibold">Recado não encontrado</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Este recado pode ter sido removido ou você não tem permissão para visualizá-lo.
          </p>
          <Button onClick={() => navigate("/announcements")} className="mt-4 rounded-xl">
            Voltar para o mural
          </Button>
        </Card>
      </div>
    );
  }

  if (isEditing && canEditOrDelete()) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsEditing(false);
              refetch();
            }}
            className="rounded-xl"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Cancelar edição
          </Button>
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
          onSuccess={() => {
            setIsEditing(false);
            refetch();
          }}
          onCancel={() => {
            setIsEditing(false);
            refetch();
          }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/announcements")}
            className="rounded-xl"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </div>
        {canEditOrDelete() && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="rounded-xl"
            >
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
              className="rounded-xl"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir
            </Button>
          </div>
        )}
      </div>

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900">{enrichedAnnouncement.title}</h1>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {enrichedAnnouncement.scope === "company" ? (
                    <Badge className="bg-blue-100 text-blue-700">Empresa</Badge>
                  ) : (
                    <Badge className="bg-green-100 text-green-700">Meu time</Badge>
                  )}
                  {enrichedAnnouncement.team_name && (
                    <span className="text-sm text-muted-foreground">
                      • {enrichedAnnouncement.team_name}
                    </span>
                  )}
                  <span className="text-sm text-muted-foreground">
                    • {formatDate(enrichedAnnouncement.published_at)}
                  </span>
                </div>
              </div>
            </div>

            {/* Author */}
            <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-4">
              {enrichedAnnouncement.author_avatar ? (
                <Avatar className="h-12 w-12">
                  <AvatarImage src={enrichedAnnouncement.author_avatar} alt={enrichedAnnouncement.author_name} />
                  <AvatarFallback className="bg-purple-100 text-purple-700">
                    {getInitials(enrichedAnnouncement.author_name)}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <Avatar className="h-12 w-12 bg-purple-100 text-purple-700">
                  <AvatarFallback>{getInitials(enrichedAnnouncement.author_name)}</AvatarFallback>
                </Avatar>
              )}
              <div>
                <p className="font-medium text-gray-900">{enrichedAnnouncement.author_name}</p>
                <p className="text-sm text-muted-foreground">Publicou este recado</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="prose prose-slate max-w-none">
            <div className="whitespace-pre-wrap text-gray-700">{enrichedAnnouncement.content}</div>
          </div>
        </div>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir recado</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este recado? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}