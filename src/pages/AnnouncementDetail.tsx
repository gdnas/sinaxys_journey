import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import {
  getAnnouncementById,
  enrichAnnouncementsWithAuthors,
  markAnnouncementAsRead,
  getAnnouncementAttachments,
} from "@/lib/internalCommunicationDb";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Download, FileIcon } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function AnnouncementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

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

  const { data: attachments } = useQuery({
    queryKey: ["announcement-attachments", id],
    queryFn: () => getAnnouncementAttachments(id!),
    enabled: !!id,
  });

  const markAsReadMutation = useMutation({
    mutationFn: () => markAnnouncementAsRead(id!, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcement", id] });
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
  });

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

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
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

          {/* Attachments */}
          {attachments && attachments.length > 0 && (
            <div className="space-y-3 pt-4 border-t">
              <h3 className="text-sm font-semibold text-muted-foreground">
                Anexos ({attachments.length})
              </h3>
              <div className="space-y-2">
                {attachments.map((attachment) => (
                  <a
                    key={attachment.id}
                    href={attachment.file_url}
                    download={attachment.title}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3 transition-colors hover:bg-gray-100"
                  >
                    <div className="flex items-center gap-3">
                      <FileIcon className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{attachment.title}</p>
                        {attachment.file_size && (
                          <p className="text-xs text-muted-foreground">
                            {(attachment.file_size / 1024).toFixed(1)} KB
                          </p>
                        )}
                      </div>
                    </div>
                    <Download className="h-4 w-4 text-muted-foreground" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}