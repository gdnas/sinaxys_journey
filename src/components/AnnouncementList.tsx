import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useCompany } from "@/lib/company";
import { getVisibleAnnouncements, enrichAnnouncementsWithAuthors, deleteAnnouncement } from "@/lib/internalCommunicationDb";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { MoreVertical, Pencil, Trash2, FileText, Filter } from "lucide-react";
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

interface AnnouncementListProps {
  limit?: number;
  showViewAll?: boolean;
}

export function AnnouncementList({ limit, showViewAll = true }: AnnouncementListProps) {
  const { user } = useAuth();
  const { companyId } = useCompany();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [filter, setFilter] = useState<"all" | "unread" | "company" | "team">("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [announcementToDelete, setAnnouncementToDelete] = useState<string | null>(null);

  const { data: announcements, isLoading } = useQuery({
    queryKey: ["announcements", companyId, user?.departmentId, limit, filter],
    queryFn: async () => {
      const raw = await getVisibleAnnouncements(user!.id, String(companyId), user?.departmentId ?? null, limit ?? 100);
      let filtered = raw;
      
      // Apply client-side filters
      if (filter === "unread") {
        const enriched = await enrichAnnouncementsWithAuthors(raw, user?.id);
        filtered = enriched.filter(a => !a.is_read) as any;
      } else if (filter === "company") {
        filtered = raw.filter(a => a.scope === "company");
      } else if (filter === "team") {
        filtered = raw.filter(a => a.scope === "team");
      }
      
      return enrichAnnouncementsWithAuthors(filtered, user?.id);
    },
    enabled: !!user && !!companyId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes cache
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const deleteMutation = useMutation({
    mutationFn: async (announcementId: string) => {
      await deleteAnnouncement(announcementId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      toast({
        title: "Recado excluído",
        description: "O recado foi excluído com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir",
        description: error.message || "Não foi possível excluir o recado.",
        variant: "destructive",
      });
    },
  });

  const canEditOrDelete = (announcement: any) => {
    if (!user) return false;
    // Admin and MASTERADMIN can edit/delete any announcement in their company
    if (user.role === "ADMIN" || user.role === "MASTERADMIN") return true;
    // Head and COLLABORADOR can only edit/delete their own announcements
    if ((user.role === "HEAD" || user.role === "COLABORADOR") && announcement.created_by === user.id) return true;
    return false;
  };

  const handleDelete = () => {
    if (announcementToDelete) {
      deleteMutation.mutate(announcementToDelete);
      setDeleteDialogOpen(false);
      setAnnouncementToDelete(null);
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
    <>
      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold">Todos os Recados</h3>
            <span className="text-sm text-muted-foreground">
              {announcements.length} recado{announcements.length !== 1 ? "s" : ""}
            </span>
          </div>
          
          {/* Filters */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <div className="flex gap-1">
              {[
                { value: "all" as const, label: "Todos" },
                { value: "unread" as const, label: "Não lidos" },
                { value: "company" as const, label: "Empresa" },
                { value: "team" as const, label: "Time" },
              ].map((f) => (
                <Button
                  key={f.value}
                  variant={filter === f.value ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setFilter(f.value)}
                  className={`rounded-lg ${
                    filter === f.value 
                      ? "bg-purple-600 text-white hover:bg-purple-700" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-3">
            {announcements.map((announcement) => (
              <div
                key={announcement.id}
                className="group relative rounded-xl border p-4 transition-all hover:border-purple-200 hover:bg-purple-50/50"
              >
                <div
                  className="cursor-pointer"
                  onClick={() => navigate(`/announcements/${announcement.id}`)}
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

                {/* Action buttons for admins */}
                {canEditOrDelete(announcement) && (
                  <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/announcements/${announcement.id}/edit`);
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAnnouncementToDelete(announcement.id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
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
    </>
  );
}