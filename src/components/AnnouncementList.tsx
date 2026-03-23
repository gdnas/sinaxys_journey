import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useCompany } from "@/lib/company";
import { getVisibleAnnouncements, enrichAnnouncementsWithAuthors } from "@/lib/internalCommunicationDb";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

interface AnnouncementListProps {
  limit?: number;
  showViewAll?: boolean;
}

export function AnnouncementList({ limit, showViewAll = true }: AnnouncementListProps) {
  const { user } = useAuth();
  const { companyId } = useCompany();
  const navigate = useNavigate();

  const { data: announcements, isLoading } = useQuery({
    queryKey: ["announcements", companyId, user?.departmentId, limit],
    queryFn: async () => {
      const raw = await getVisibleAnnouncements(user!.id, String(companyId), user?.departmentId ?? null, limit ?? 100);
      return enrichAnnouncementsWithAuthors(raw, user?.id);
    },
    enabled: !!user && !!companyId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes cache
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

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
        <div className="animate-pulse space-y-4">
          <div className="h-20 rounded-xl bg-gray-100" />
          <div className="h-20 rounded-xl bg-gray-100" />
          <div className="h-20 rounded-xl bg-gray-100" />
        </div>
      </Card>
    );
  }

  if (!announcements || announcements.length === 0) {
    return (
      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4 text-5xl">📢</div>
          <h3 className="text-lg font-semibold">Nenhum recado</h3>
          <p className="text-sm text-muted-foreground">
            Ainda não há recados publicados para você.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Todos os Recados</h3>
        <span className="text-sm text-muted-foreground">{announcements.length} recado{announcements.length !== 1 ? "s" : ""}</span>
      </div>

      <ScrollArea className="h-[600px] pr-4">
        <div className="space-y-3">
          {announcements.map((announcement) => (
            <div
              key={announcement.id}
              onClick={() => navigate(`/announcements/${announcement.id}`)}
              className={`cursor-pointer rounded-xl border p-4 transition-all hover:border-purple-200 hover:bg-purple-50/50 ${
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
                  <p className="line-clamp-3 text-sm text-gray-600">{announcement.content}</p>
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
                    {announcement.team_name && (
                      <>
                        <span>•</span>
                        <span>{announcement.team_name}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}