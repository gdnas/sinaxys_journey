import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getProfile } from "@/lib/profilesDb";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { DbProfile } from "@/lib/profilesDb";

export default function MinimalLimitedProfile() {
  const { user } = useAuth();
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: () => (user?.id ? getProfile(user.id) : Promise.resolve(null)),
    enabled: !!user?.id,
  });

  const p = profile as DbProfile | null;
  if (!p) return null;

  return (
    <div className="max-w-xl mx-auto py-8">
      <Card className="rounded-3xl p-6">
        <div className="text-lg font-semibold">Acesso limitado</div>
        <p className="mt-2 text-sm text-muted-foreground">Seu acesso à plataforma foi suspenso porque você está em processo de desligamento. Aqui você pode consultar documentos relacionados ao seu contrato.</p>

        <div className="mt-4 grid gap-3">
          {p.contract_url ? (
            <a href={p.contract_url} target="_blank" rel="noreferrer">
              <Button className="w-full">Ver contrato assinado</Button>
            </a>
          ) : null}
        </div>

        <div className="mt-4 text-xs text-muted-foreground">Se precisar de mais informações, contate o RH da sua empresa.</div>
      </Card>
    </div>
  );
}