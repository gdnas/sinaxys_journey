import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getProfile } from "@/lib/profilesDb";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload } from "lucide-react";
import type { DbProfile } from "@/lib/profilesDb";
import { listUserDocuments } from "@/lib/documentsDb";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/costs";

function formatTenure(joinedAt?: string | null) {
  if (!joinedAt) return "—";
  const join = new Date(joinedAt);
  if (Number.isNaN(join.getTime())) return "—";
  const now = new Date();
  let years = now.getFullYear() - join.getFullYear();
  let months = now.getMonth() - join.getMonth();
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (years <= 0 && months <= 0) return "Menos de 1 mês";
  const parts = [];
  if (years > 0) parts.push(`${years} ano${years > 1 ? "s" : ""}`);
  if (months > 0) parts.push(`${months} mês${months > 1 ? "es" : ""}`);
  return parts.join(" e ");
}

export default function MinimalLimitedProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: () => (user?.id ? getProfile(user.id) : Promise.resolve(null)),
    enabled: !!user?.id,
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["user-documents", user?.companyId, user?.id],
    queryFn: () => (user?.companyId && user?.id ? listUserDocuments({ companyId: user.companyId, userId: user.id }) : Promise.resolve([])),
    enabled: !!user?.companyId && !!user?.id,
  });

  const p = profile as DbProfile | null;
  if (!p) return null;

  return (
    <div className="max-w-3xl mx-auto py-8 grid gap-6">
      <Card className="rounded-3xl p-6">
        <div className="text-lg font-semibold">Acesso limitado</div>
        <p className="mt-2 text-sm text-muted-foreground">Seu acesso à plataforma foi suspenso porque você está em processo de desligamento. Aqui você pode consultar documentos relacionados ao seu contrato e seu histórico na empresa.</p>

        <div className="mt-4 grid gap-4">
          {p.contract_url ? (
            <a href={p.contract_url} target="_blank" rel="noreferrer">
              <Button className="w-full">Ver contrato assinado</Button>
            </a>
          ) : null}

          {documents?.length ? (
            <div>
              <div className="text-sm font-semibold">Documentos</div>
              <div className="mt-2 grid gap-2">
                {documents.map((d: any) => (
                  <a key={d.id} href={d.url} target="_blank" rel="noreferrer" className="inline-block text-sm text-[color:var(--sinaxys-primary)] hover:underline">
                    {d.title}
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-4 text-xs text-muted-foreground">Se precisar de mais informações, contate o RH da sua empresa.</div>
      </Card>
    </div>
  );
}