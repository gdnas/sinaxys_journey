import { useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Link as LinkIcon,
  MessageSquare,
  MoreVertical,
  PlayCircle,
  User,
  Lock,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import type { DbDeliverable, WorkStatus, DbDeliverableAttachment, DbDeliverableComment } from "@/lib/okrDb";
import type { DbProfile } from "@/lib/profilesDb";
import { listDeliverableDateHistory } from "@/lib/okrDb";
import { canUserEditDeliverable, canUserDeleteDeliverable } from "@/lib/okrHierarchyValidation";

import { DeliverableTimeline } from "./DeliverableTimeline";
import { TaskHierarchyView } from "./TaskHierarchyView";
import { DeliverableAttachments } from "./DeliverableAttachments";
import { DeliverableComments } from "./DeliverableComments";

interface DeliverableCardProps {
  deliverable: DbDeliverable;
  krTitle: string;
  objectiveTitle: string;
  owner?: DbProfile;
  attachments?: DbDeliverableAttachment[];
  comments?: DbDeliverableComment[];
  currentUserId?: string;
  currentUserRole?: string;
  currentUserAvatar?: string;
  currentUserEmail?: string;
  canEdit?: boolean;
  canDelete?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onStatusChange?: (status: WorkStatus) => void;
  onAttachmentsChange?: () => void;
  onCommentsChange?: () => void;
}

const statusConfig = {
  TODO: {
    label: "A fazer",
    icon: Clock,
    color: "bg-slate-100 text-slate-700 hover:bg-slate-200",
    textColor: "text-slate-700",
  },
  IN_PROGRESS: {
    label: "Em andamento",
    icon: PlayCircle,
    color: "bg-blue-100 text-blue-700 hover:bg-blue-200",
    textColor: "text-blue-700",
  },
  DONE: {
    label: "Concluído",
    icon: CheckCircle2,
    color: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200",
    textColor: "text-emerald-700",
  },
};

function getInitials(name?: string | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function DeliverableCard({
  deliverable,
  krTitle,
  objectiveTitle,
  owner,
  attachments = [],
  comments = [],
  currentUserId = "",
  currentUserRole = "",
  currentUserAvatar,
  currentUserEmail,
  canEdit = true,
  canDelete = true,
  onEdit,
  onDelete,
  onStatusChange,
  onAttachmentsChange,
  onCommentsChange,
}: DeliverableCardProps) {
  const [showHistory, setShowHistory] = useState(false);
  const [dateLogs, setDateLogs] = useState<any[]>([]);
  
  const statusConfigItem = statusConfig[deliverable.status];
  const StatusIcon = statusConfigItem.icon;

  // Verificar permissões usando os helpers
  const isAdmin = currentUserRole === "ADMIN" || currentUserRole === "MASTERADMIN" || currentUserRole === "HEAD";
  const userCanEdit = canEdit && canUserEditDeliverable(deliverable, currentUserId, currentUserRole, isAdmin);
  const userCanDelete = canDelete && canUserDeleteDeliverable(deliverable, currentUserId, currentUserRole, isAdmin);

  const handleShowHistory = async () => {
    try {
      const logs = await listDeliverableDateHistory(deliverable.id);
      setDateLogs(logs);
      setShowHistory(true);
    } catch (error) {
      console.error("Error fetching date history:", error);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return format(new Date(dateStr), "dd MMM yyyy", { locale: ptBR });
  };

  return (
    <Card className="overflow-hidden rounded-2xl border-[color:var(--sinaxys-border)] bg-white transition hover:shadow-md">
      {/* Status Bar */}
      <div className="flex items-center gap-2 border-b border-[color:var(--sinaxys-border)] bg-gradient-to-r from-slate-50 to-white px-4 py-2">
        <Badge className={statusConfigItem.color}>
          <StatusIcon className="mr-1 h-3.5 w-3.5" />
          {statusConfigItem.label}
        </Badge>
        {deliverable.tier && (
          <Badge variant="outline" className="bg-white">
            {deliverable.tier === "TIER1" ? "Estratégico" : "Tático"}
          </Badge>
        )}
      </div>

      <div className="p-5">
        {/* Title */}
        <div className="mb-3">
          <Link
            to={`/okr/entregaveis/${deliverable.id}`}
            className="block text-base font-semibold text-[color:var(--sinaxys-ink)] transition hover:text-[color:var(--sinaxys-primary)]"
          >
            {deliverable.title}
          </Link>
          {deliverable.description && (
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
              {deliverable.description}
            </p>
          )}
        </div>

        {/* Owner */}
        {owner && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
            <Avatar className="h-7 w-7">
              <AvatarImage src={owner.avatar_url || undefined} />
              <AvatarFallback className="text-xs">{getInitials(owner.name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-[color:var(--sinaxys-ink)]">
                {owner.name || owner.email}
              </div>
              <div className="text-xs text-muted-foreground">Responsável</div>
            </div>
          </div>
        )}

        {/* KR and Objective */}
        <div className="mb-4 space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <Badge className="mt-0.5 shrink-0 rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]">
              KR
            </Badge>
            <p className="line-clamp-2 text-muted-foreground">{krTitle}</p>
          </div>
          <div className="flex items-start gap-2">
            <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-[color:var(--sinaxys-primary)]" />
            <p className="line-clamp-1 text-muted-foreground">{objectiveTitle}</p>
          </div>
        </div>

        {/* Dates */}
        <div className="mb-4 flex items-center justify-between rounded-xl border border-[color:var(--sinaxys-border)] bg-slate-50 px-3 py-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div className="text-sm">
              <span className="font-medium text-[color:var(--sinaxys-ink)]">Prazo:</span>{" "}
              <span className="text-muted-foreground">{formatDate(deliverable.due_at)}</span>
            </div>
          </div>
          
          {dateLogs.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-[color:var(--sinaxys-primary)]"
              onClick={handleShowHistory}
            >
              <MessageSquare className="mr-1 h-3.5 w-3.5" />
              Histórico
            </Button>
          )}
        </div>

        {/* Attachments and Comments Tabs */}
        {(attachments.length > 0 || comments.length > 0 || userCanEdit) && (
          <div className="mb-4">
            <Tabs defaultValue="attachments" className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-9 rounded-xl">
                <TabsTrigger value="attachments" className="text-xs">
                  <FileText className="mr-1 h-3.5 w-3.5" />
                  Anexos ({attachments.length})
                </TabsTrigger>
                <TabsTrigger value="comments" className="text-xs">
                  <MessageSquare className="mr-1 h-3.5 w-3.5" />
                  Comentários ({comments.length})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="attachments" className="mt-3">
                <DeliverableAttachments
                  deliverableId={deliverable.id}
                  attachments={attachments}
                  onAttachmentsChange={onAttachmentsChange || (() => {})}
                  currentUserId={currentUserId}
                  canEdit={userCanEdit}
                />
              </TabsContent>
              <TabsContent value="comments" className="mt-3">
                <DeliverableComments
                  deliverableId={deliverable.id}
                  comments={comments}
                  onCommentsChange={onCommentsChange || (() => {})}
                  currentUserId={currentUserId}
                  currentUserAvatar={currentUserAvatar}
                  currentUserEmail={currentUserEmail}
                  canEdit={userCanEdit}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {!userCanEdit && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Lock className="h-3 w-3" />
                <span>Somente leitura</span>
              </div>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8" disabled={!userCanEdit && !userCanDelete}>
                  <MoreVertical className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {userCanEdit && onEdit && (
                  <DropdownMenuItem onClick={onEdit}>
                    <FileText className="mr-2 h-4 w-4" />
                    Editar
                  </DropdownMenuItem>
                )}
                {userCanEdit && onStatusChange && (
                  <>
                    <DropdownMenuItem onClick={() => onStatusChange("TODO")}>
                      <Clock className="mr-2 h-4 w-4" />
                      Marcar como a fazer
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onStatusChange("IN_PROGRESS")}>
                      <PlayCircle className="mr-2 h-4 w-4" />
                      Marcar em andamento
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onStatusChange("DONE")}>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Marcar concluído
                    </DropdownMenuItem>
                  </>
                )}
                <Separator />
                {userCanDelete && onDelete && (
                  <DropdownMenuItem onClick={onDelete} className="text-red-600">
                    Deletar
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Button asChild variant="outline" size="sm" className="h-8 rounded-xl bg-white">
            <Link to={`/okr/entregaveis/${deliverable.id}`}>
              <LinkIcon className="mr-1 h-3.5 w-3.5" />
              Detalhes
            </Link>
          </Button>
        </div>
      </div>

      {/* Date History Dialog */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-2xl max-h-[80vh] rounded-3xl">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-[color:var(--sinaxys-ink)]">Histórico de Datas</h3>
            <p className="mt-1 text-sm text-muted-foreground">{deliverable.title}</p>
          </div>
          
          <ScrollArea className="h-[400px] pr-4">
            {dateLogs.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Nenhuma alteração de data registrada
              </div>
            ) : (
              <DeliverableTimeline dateLogs={dateLogs} />
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </Card>
  );
}