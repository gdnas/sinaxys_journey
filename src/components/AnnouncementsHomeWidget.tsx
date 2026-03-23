import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageSquare, Megaphone } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useCompany } from "@/lib/company";
import { getVisibleAnnouncements, enrichAnnouncementsWithAuthors, markAnnouncementAsRead } from "@/lib/internalCommunicationDb";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

interface AnnouncementsHomeWidgetProps {
  limit?: number;
}

export function AnnouncementsHomeWidget({ limit = 3 }: AnnouncementsHomeWidgetProps) {
  const { user } = useAuth();
  const { companyId } = useCompany();
  const navigate = useNavigate();

  const { data: announcements, isLoading } = useQuery({
    queryKey: ["announcements", companyId, user?.departmentId, limit],
    queryFn: async () => {
      const raw = await getVisibleAnnouncements(user!.id, String(companyId), user?.departmentId ?? null, limit);
      return enrichAnnouncementsWithAuthors(raw, user?.id);
    },
    enabled: !!user && !!companyId,
    staleTime: 30_000,
  });

  const handleMarkAsRead = async (announcementId: string) => {
    try {
      await markAnnouncementAsRead(announcementId, user!.id);
    } catch (error) {
      console.error("Error marking announcement as read:", error);
    }
  };

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
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
        locale: ptBR,
      });
    } catch {
      return dateString;
    }
  };

  if (isLoading) {
    return (
      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="animate-pulse">
          <div className="h-6 w-1/3 rounded bg-gray-200" />
          <div className="mt-4 space-y-3">
            <div className="h-20 rounded-xl bg-gray-100" />
            <div className="h-20 rounded-xl bg-gray-100" />
            <div className="h-20 rounded-xl bg-gray-100" />
          </div>
        </div>
      </Card>
    );
  }

  if (!announcements || announcements.length === 0) {
    return (
      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 text-white">
              <Megaphone className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Mural de Recados</h3>
              <p className="text-sm text-muted-foreground">Nenhum recado publicado</p>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 text-white">
            <Megaphone className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Mural de Recados</h3>
            <p className="text-sm text-muted-foreground">
              {announcements.length} recado{announcements.length !== 1 ? "s" : ""} disponível{announcements.length !== 1 ? "is" : ""}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {announcements.map((announcement) => (
          <div
            key={announcement.id}
            onClick={() => {
              handleMarkAsRead(announcement.id);
              navigate(`/announcements/${announcement.id}`);
            }}
            className={`group cursor-pointer rounded-xl border p-4 transition-all hover:border-purple-200 hover:bg-purple-50/50 ${
              !announcement.is_read ? "border-purple-200 bg-purple-50/30" : "border-gray-100"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  {!announcement.is_read && (
                    <div className="h-2 w-2 rounded-full bg-purple-600" />
                  )}
                  <h4 className="font-semibold text-gray-900">{announcement.title}</h4>
                  {announcement.scope === "company" ? (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                      Empresa
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100">
                      Meu time
                    </Badge>
                  )}
                </div>
                <p className="line-clamp-2 text-sm text-gray-600">{announcement.content}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {announcement.author_avatar ? (
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={announcement.author_avatar} alt={announcement.author_name} />
                      <AvatarFallback className="text-[10px]">
                        {getInitials(announcement.author_name)}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-[10px] font-medium text-gray-600">
                      {getInitials(announcement.author_name)}
                    </span>
                  )}
                  <span className="font-medium">{announcement.author_name}</span>
                  <span>•</span>
                  <span>{formatDate(announcement.published_at)}</span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 transition-opacity group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  handleMarkAsRead(announcement.id);
                  navigate(`/announcements/${announcement.id}`);
                }}
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex justify-center">
        <Button
          variant="outline"
          className="rounded-xl border-purple-200 text-purple-700 hover:bg-purple-50 hover:text-purple-700"
          onClick={() => navigate("/announcements")}
        >
          Ver todos os recados
        </Button>
      </div>
    </Card>
  );
}
