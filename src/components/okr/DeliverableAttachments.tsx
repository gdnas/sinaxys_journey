import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Link2, X, Plus, ExternalLink } from "lucide-react";
import {
  createDeliverableAttachment,
  deleteDeliverableAttachment,
  type DbDeliverableAttachment,
} from "@/lib/okrDb";
import { toast } from "@/components/ui/use-toast";

interface DeliverableAttachmentsProps {
  deliverableId: string;
  attachments: DbDeliverableAttachment[];
  onAttachmentsChange: () => void;
  currentUserId: string;
  canEdit: boolean;
}

/**
 * Validação básica de URL
 * Verifica se a string parece uma URL válida (http:// ou https://)
 */
function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === "http:" || urlObj.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Sanitiza URL para evitar XSS
 * Remove caracteres perigosos e garante que é uma URL válida
 */
function sanitizeUrl(url: string): string {
  const trimmed = url.trim();
  
  // Adiciona https:// se não tiver protocolo
  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  
  return trimmed;
}

export function DeliverableAttachments({
  deliverableId,
  attachments,
  onAttachmentsChange,
  currentUserId,
  canEdit,
}: DeliverableAttachmentsProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleAddAttachment = async () => {
    const trimmedUrl = url.trim();
    
    if (!trimmedUrl) {
      toast({
        title: "URL obrigatória",
        description: "Por favor, insira uma URL para o anexo.",
        variant: "destructive",
      });
      return;
    }

    // Validar formato da URL
    const sanitizedUrl = sanitizeUrl(trimmedUrl);
    if (!isValidUrl(sanitizedUrl)) {
      toast({
        title: "URL inválida",
        description: "Por favor, insira uma URL válida (ex: https://exemplo.com).",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsAdding(true);
      await createDeliverableAttachment({
        deliverable_id: deliverableId,
        type: "LINK", // Apenas links por enquanto
        url: sanitizedUrl,
        description: description.trim() || null,
        file_name: null,
        file_size: null,
        file_type: null,
        created_by: currentUserId,
      });

      // Reset form
      setUrl("");
      setDescription("");
      setIsAddDialogOpen(false);

      onAttachmentsChange();
      toast({ title: "Link adicionado com sucesso" });
    } catch (error) {
      console.error("Error adding attachment:", error);
      toast({
        title: "Erro ao adicionar link",
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
      toast({ title: "Link removido" });
    } catch (error) {
      console.error("Error deleting attachment:", error);
      toast({
        title: "Erro ao remover link",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // Filtra apenas anexos do tipo LINK
  const linkAttachments = attachments.filter((a) => a.type === "LINK");

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">Links</Label>
        {canEdit && (
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 rounded-xl">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Adicionar Link
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl">
              <DialogHeader>
                <DialogTitle>Adicionar Link</DialogTitle>
                <DialogDescription>
                  Adicione um link útil ao entregável.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="url">URL *</Label>
                  <Input
                    id="url"
                    placeholder="https://exemplo.com"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="rounded-xl"
                  />
                  <p className="text-xs text-muted-foreground">
                    Insira uma URL válida começando com http:// ou https://
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="description">Descrição (opcional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Breve descrição do link..."
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

      {linkAttachments.length === 0 ? (
        <div className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
          Nenhum link anexado ainda
        </div>
      ) : (
        <div className="space-y-2">
          {linkAttachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-start gap-3 rounded-xl border p-3 hover:bg-muted/50 transition-colors"
            >
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Link2 className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                {attachment.description && (
                  <p className="text-sm font-medium text-foreground">
                    {attachment.description}
                  </p>
                )}
                {attachment.url && (
                  <a
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline break-all"
                  >
                    <ExternalLink className="h-3 w-3 shrink-0" />
                    <span className="truncate">{attachment.url}</span>
                  </a>
                )}
              </div>
              {canEdit && attachment.created_by === currentUserId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteAttachment(attachment.id)}
                  className="h-8 w-8 shrink-0 rounded-lg p-0 text-muted-foreground hover:text-destructive"
                  title="Remover link"
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