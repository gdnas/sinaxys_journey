import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { useCompany } from "@/lib/company";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { publishAnnouncement } from "@/lib/internalCommunicationDb";
import { toast } from "@/hooks/use-toast";
import { Megaphone, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface AnnouncementComposerProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function AnnouncementComposer({ onSuccess, onCancel }: AnnouncementComposerProps) {
  const { user } = useAuth();
  const { companyId } = useCompany();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [scope, setScope] = useState<"company" | "team">("company");
  const [teamId, setTeamId] = useState<string>("");

  const { data: departments } = useQuery({
    queryKey: ["departments", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("id, name")
        .eq("company_id", companyId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!companyId,
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      const announcement = await publishAnnouncement({
        companyId: String(companyId),
        scope,
        teamId: scope === "team" ? teamId : null,
        title: title.trim(),
        content: content.trim(),
        createdById: user!.id,
      });

      // Trigger notification
      try {
        await supabase.functions.invoke("notifications-internal-communication", {
          body: {
            action: "announcement_published",
            payload: {
              announcementId: announcement.id,
              companyId: String(companyId),
              scope,
              teamId: scope === "team" ? teamId : null,
              title: title.trim(),
            },
          },
        });
      } catch (error) {
        console.error("[AnnouncementComposer] Failed to send notification:", error);
        // Don't block publication on notification error
      }

      return announcement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      toast({
        title: "Recado publicado!",
        description: "O recado foi publicado com sucesso.",
      });
      setTitle("");
      setContent("");
      setScope("company");
      setTeamId("");
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao publicar",
        description: error.message || "Não foi possível publicar o recado.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o título e o conteúdo do recado.",
        variant: "destructive",
      });
      return;
    }

    if (scope === "team" && !teamId) {
      toast({
        title: "Selecione um time",
        description: "Para recados de time, você deve selecionar um time.",
        variant: "destructive",
      });
      return;
    }

    publishMutation.mutate();
  };

  const canPublishToCompany = user?.role === "ADMIN" || user?.role === "MASTERADMIN";
  const canPublishToTeam = user?.role === "HEAD" || user?.role === "ADMIN" || user?.role === "MASTERADMIN";

  return (
    <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 text-white">
            <Megaphone className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Novo Recado</h3>
            <p className="text-sm text-muted-foreground">Comunique-se com sua equipe</p>
          </div>
        </div>
        {onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="scope">Alcance</Label>
          <Select value={scope} onValueChange={(value: "company" | "team") => setScope(value)}>
            <SelectTrigger id="scope" className="rounded-xl">
              <SelectValue placeholder="Selecione o alcance" />
            </SelectTrigger>
            <SelectContent>
              {canPublishToCompany && (
                <SelectItem value="company">Empresa inteira</SelectItem>
              )}
              {canPublishToTeam && (
                <SelectItem value="team">Meu time</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        {scope === "team" && (
          <div className="space-y-2">
            <Label htmlFor="team">Time</Label>
            <Select value={teamId} onValueChange={setTeamId}>
              <SelectTrigger id="team" className="rounded-xl">
                <SelectValue placeholder="Selecione o time" />
              </SelectTrigger>
              <SelectContent>
                {departments?.map((dept: any) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="title">Título</Label>
          <Input
            id="title"
            placeholder="Título do recado"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-xl"
            maxLength={200}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="content">Conteúdo</Label>
          <Textarea
            id="content"
            placeholder="Escreva o conteúdo do recado..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[150px] resize-none rounded-xl"
            maxLength={5000}
          />
          <p className="text-xs text-muted-foreground">{content.length} / 5000 caracteres</p>
        </div>

        <div className="flex justify-end gap-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} className="rounded-xl">
              Cancelar
            </Button>
          )}
          <Button
            type="submit"
            disabled={publishMutation.isPending}
            className="rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            {publishMutation.isPending ? "Publicando..." : "Publicar Recado"}
          </Button>
        </div>
      </form>
    </Card>
  );
}