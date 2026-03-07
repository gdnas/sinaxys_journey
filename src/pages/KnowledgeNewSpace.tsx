import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { useCompany } from "@/lib/company";
import { toast } from "sonner";
import { createKnowledgeSpace } from "@/lib/knowledgeDb";
import { useState } from "react";

const EMOJIS = ["📁", "📚", "💼", "🎯", "🚀", "💡", "📊", "🔧", "📋", "🎨", "🏢", "👥"];

export default function KnowledgeNewSpace() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { companyId } = useCompany();
  const queryClient = useQueryClient();
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("📁");

  if (!user) return null;

  const cid = companyId ?? "";

  const createSpaceMutation = useMutation({
    mutationFn: () => createKnowledgeSpace({
      company_id: cid,
      name,
      description,
      icon,
    }),
    onSuccess: (space) => {
      toast.success("Espaço criado com sucesso");
      queryClient.invalidateQueries({ queryKey: ["knowledge-spaces", cid] });
      navigate(`/knowledge/space/${space.id}`);
    },
    onError: (error) => {
      toast.error("Erro ao criar espaço", { description: error.message });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Por favor, insira um nome para o espaço");
      return;
    }
    createSpaceMutation.mutate();
  };

  return (
    <div className="mx-auto max-w-2xl grid gap-8 pb-12">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link to="/knowledge">
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
              Novo Espaço
            </h1>
            <p className="text-muted-foreground">
              Crie um espaço para organizar suas páginas de conhecimento
            </p>
          </div>

          {/* Icon Selection */}
          <div>
            <label className="block text-sm font-semibold text-[color:var(--sinaxys-ink)] mb-3">
              Ícone
            </label>
            <div className="grid grid-cols-6 sm:grid-cols-12 gap-2">
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

          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-[color:var(--sinaxys-ink)] mb-2">
              Nome do Espaço *
            </label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Documentação, Processos, Políticas..."
              className="h-12 rounded-2xl border-[color:var(--sinaxys-border)]"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-semibold text-[color:var(--sinaxys-ink)] mb-2">
              Descrição
            </label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o propósito deste espaço..."
              className="min-h-[100px] rounded-2xl border-[color:var(--sinaxys-border)] resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/knowledge")}
              className="rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createSpaceMutation.isPending}
              className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white"
            >
              <Save className="mr-2 h-4 w-4" />
              {createSpaceMutation.isPending ? "Criando..." : "Criar Espaço"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}