import { Link, useParams, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { useCompany } from "@/lib/company";
import { toast } from "sonner";
import { createKnowledgePage } from "@/lib/knowledgeDb";
import { useState } from "react";

const EMOJIS = ["📄", "📝", "📋", "📌", "🎯", "💡", "📊", "🔧", "📚", "🎨", "🏢", "👥", "✅", "⚡", "🔥", "💎"];

export default function KnowledgeNewPage() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { companyId } = useCompany();
  const queryClient = useQueryClient();
  
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [icon, setIcon] = useState("📄");

  if (!user || !spaceId) return null;

  const cid = companyId ?? "";

  const createPageMutation = useMutation({
    mutationFn: () => createKnowledgePage({
      spaceId: spaceId,
      title,
      content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: content }] }] },
      icon,
      parentPageId: null,
      createdBy: user.id,
      companyId: cid,
    }),
    onSuccess: (page) => {
      toast.success("Página criada com sucesso");
      queryClient.invalidateQueries({ queryKey: ["knowledge-pages", spaceId] });
      navigate(`/knowledge/page/${page.id}`);
    },
    onError: (error) => {
      toast.error("Erro ao criar página", { description: error.message });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Por favor, insira um título para a página");
      return;
    }
    createPageMutation.mutate();
  };

  return (
    <div className="mx-auto max-w-3xl grid gap-8 pb-12">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link to={`/knowledge/space/${spaceId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>
      </div>

      {/* Form */}
      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-[color:var(--sinaxys-ink)] mb-2">
              Nova Página
            </h1>
            <p className="text-muted-foreground">
              Crie uma nova página de conhecimento
            </p>
          </div>

          {/* Icon Selection */}
          <div>
            <label className="block text-sm font-semibold text-[color:var(--sinaxys-ink)] mb-3">
              Ícone
            </label>
            <div className="grid grid-cols-8 sm:grid-cols-16 gap-2">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  className={`
                    h-12 w-12 rounded-xl text-2xl flex items-center justify-center transition-all
                    ${icon === emoji 
                      ? 'bg-[color:var(--sinaxys-primary)] text-white scale-110' 
                      : 'bg-[color:var(--sinaxys-bg)] hover:bg-[color:var(--sinaxys-tint)]'
                    }
                  `}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-semibold text-[color:var(--sinaxys-ink)] mb-2">
              Título da Página *
            </label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Introdução, Guia de Instalação, Políticas..."
              className="h-12 rounded-2xl border-[color:var(--sinaxys-border)]"
              required
            />
          </div>

          {/* Content */}
          <div>
            <label htmlFor="content" className="block text-sm font-semibold text-[color:var(--sinaxys-ink)] mb-2">
              Conteúdo
            </label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Escreva o conteúdo da página..."
              className="min-h-[300px] rounded-2xl border-[color:var(--sinaxys-border)] resize-none"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Suporta formatação básica. Use **negrito**, *itálico*, - listas, etc.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/knowledge/space/${spaceId}`)}
              className="rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createPageMutation.isPending}
              className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white"
            >
              <Save className="mr-2 h-4 w-4" />
              {createPageMutation.isPending ? "Criando..." : "Criar Página"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}