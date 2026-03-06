import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link2, FileText, File, X, Plus, ExternalLink } from "lucide-react";
import {
  createDeliverableAttachment,
  deleteDeliverableAttachment,
  type DbDeliverableAttachment,
  type AttachmentType,
} from "@/lib/okrDb";
import { toast } from "@/components/ui/use-toast";

interface DeliverableAttachmentsProps {
  deliverableId: string;
  attachments: DbDeliverableAttachment[];
  onAttachmentsChange: () => void;
  currentUserId: string;
  canEdit: boolean;
}

export function DeliverableAttachments({
  deliverableId,
  attachments,
  onAttachmentsChange,
  currentUserId,
  canEdit,
}: DeliverableAttachmentsProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [attachmentType, setAttachmentType] = useState<AttachmentType>("LINK");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [fileName, setFileName] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleAddAttachment = async () => {
    if (!url.trim()) {
      toast({
        title: "URL obrigatória",
        description: "Por favor, insira uma URL para o anexo.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsAdding(true);
      await createDeliverableAttachment({
        deliverable_id: deliverableId,
        type: attachmentType,
        url: url.trim(),
        description: description.trim() || null,
        file_name: fileName.trim() || null,
        file_size: null,
        file_type: null,
        created_by: currentUserId,
      });

      // Reset form
      setUrl("");
      setDescription("");
      setFileName("");
      setAttachmentType("LINK");
      setIsAddDialogOpen(false);

      onAttachmentsChange();
      toast({ title: "Anexo adicionado com sucesso" });
    } catch (error) {
      console.error("Error adding attachment:", error);
      toast({
        title: "Erro ao adicionar anexo",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    try {
      await deleteDeliverableAttachment(attachmentId);
      onAttachmentsChange();
      toast({ title: "Anexo removido" });
    } catch (error) {
      console.error("Error deleting attachment:", error);
      toast({
        title: "Erro ao remover anexo",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const getAttachmentIcon = (type: AttachmentType) => {
    switch (type) {
      case "LINK":
        return <Link2 className="h-4 w-4" />;
      case "DOCUMENT":
        return <FileText className="h-4 w-4" />;
      case "FILE":
        return <File className="h-4 w-4" />;
    }
  };

  const getAttachmentTypeLabel = (type: AttachmentType) => {
    switch (type) {
      case "LINK":
        return "Link";
      case "DOCUMENT":
        return "Documento";
      case "FILE":
        return "Arquivo";
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">Anexos</Label>
        {canEdit && (
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 rounded-xl">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Adicionar
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl">
              <DialogHeader>
                <DialogTitle>Adicionar Anexo</DialogTitle>
                <DialogDescription>
                  Adicione links, documentos ou arquivos ao entregável.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Tipo de Anexo</Label>
                  <Select value={attachmentType} onValueChange={(v) => setAttachmentType(v as AttachmentType)}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="LINK">Link</SelectItem>
                      <SelectItem value="DOCUMENT">Documento</SelectItem>
                      <SelectItem value="FILE">Arquivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>URL *</Label>
                  <Input
                    placeholder="https://..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="rounded-xl"
                  />
                </div>

                {attachmentType === "FILE" && (
                  <div className="grid gap-2">
                    <Label>Nome do Arquivo</Label>
                    <Input
                      placeholder="documento.pdf"
                      value={fileName}
                      onChange={(e) => setFileName(e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                )}

                <div className="grid gap-2">
                  <Label>Descrição (opcional)</Label>
                  <Textarea
                    placeholder="Breve descrição do anexo..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="rounded-xl min-h-[80px]"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                  className="rounded-xl"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleAddAttachment}
                  disabled={isAdding || !url.trim()}
                  className="rounded-xl"
                >
                  {isAdding ? "Adicionando..." : "Adicionar"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {attachments.length === 0 ? (
        <div className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
          Nenhum anexo ainda
        </div>
      ) : (
        <div className="space-y-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-start gap-3 rounded-xl border p-3 hover:bg-muted/50 transition-colors"
            >
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                {getAttachmentIcon(attachment.type)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {getAttachmentTypeLabel(attachment.type)}
                  </Badge>
                  {attachment.file_name && (
                    <span className="text-sm font-medium truncate">{attachment.file_name}</span>
                  )}
                </div>
                {attachment.description && (
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                    {attachment.description}
                  </p>
                )}
                {attachment.url && (
                  <a
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Abrir link
                  </a>
                )}
              </div>
              {canEdit && attachment.created_by === currentUserId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteAttachment(attachment.id)}
                  className="h-8 w-8 shrink-0 rounded-lg p-0 text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}