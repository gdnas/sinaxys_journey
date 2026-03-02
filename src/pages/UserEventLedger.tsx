"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  listEventsForUser,
  type CompanyEventRow,
  type EventSourceModule,
} from "@/lib/eventLedgerDb";
import { getPublicProfile } from "@/lib/profilePublicDb";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Filter, Calendar, Cube } from "lucide-react";

type UserProfile = {
  id: string;
  name: string;
  avatar_url: string | null;
  job_title: string | null;
};

export default function UserEventLedger() {
  const params = useParams();
  const searchParams = useSearchParams();
  const userId = params.userId;
  
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<CompanyEventRow[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [filters, setFilters] = useState<{
    sourceModule?: EventSourceModule;
    from?: string;
    to?: string;
    eventType?: string;
  }>({
    sourceModule: (searchParams.get("sourceModule") as EventSourceModule) || undefined,
    from: searchParams.get("from") || undefined,
    to: searchParams.get("to") || undefined,
    eventType: searchParams.get("eventType") || undefined,
  });

  // Buscar profile do usuário
  useEffect(() => {
    if (!userId) return;
    
    async function fetchProfile() {
      try {
        const data = await getPublicProfile(userId);
        if (data) {
          setProfile({
            id: data.id,
            name: data.name,
            avatar_url: data.avatar_url,
            job_title: data.job_title,
          });
        }
      } catch (error) {
        console.error("Erro ao buscar profile:", error);
      }
    }
    fetchProfile();
  }, [userId]);

  // Buscar eventos
  useEffect(() => {
    if (!userId) return;

    async function fetchEvents() {
      setLoading(true);
      try {
        const data = await listEventsForUser(
          profile?.id || "", // company_id será obtido via RLS
          userId,
          {
            sourceModule: filters.sourceModule,
            from: filters.from,
            to: filters.to,
            eventType: filters.eventType,
            limit: 100,
          }
        );
        setEvents(data);
      } catch (error) {
        console.error("Erro ao buscar eventos:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, [userId, filters]);

  const getEventColor = (sourceModule: EventSourceModule) => {
    switch (sourceModule) {
      case "OKR": return "bg-blue-500";
      case "TRACKS": return "bg-green-500";
      case "POINTS": return "bg-yellow-500";
      case "PDI": return "bg-purple-500";
      default: return "bg-gray-500";
    }
  };

  const getEventLabel = (sourceModule: EventSourceModule) => {
    switch (sourceModule) {
      case "OKR": return "OKR";
      case "TRACKS": return "Trilhas";
      case "POINTS": return "Pontos";
      case "PDI": return "PDI";
      default: return "Outro";
    }
  };

  const uniqueEventTypes = Array.from(new Set(events.map(e => e.event_type)));

  if (loading && !profile) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Ledger de Eventos</h1>
        <p className="text-muted-foreground">
          Histórico completo de eventos de {profile?.name || "Usuário"}
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Módulo */}
            <div>
              <label className="text-sm font-medium mb-2 block">Módulo</label>
              <Select
                value={filters.sourceModule || "all"}
                onValueChange={(value) =>
                  setFilters(f => ({
                    ...f,
                    sourceModule: value === "all" ? undefined : value as EventSourceModule,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="OKR">OKR</SelectItem>
                  <SelectItem value="TRACKS">Trilhas</SelectItem>
                  <SelectItem value="POINTS">Pontos</SelectItem>
                  <SelectItem value="PDI">PDI</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tipo de evento */}
            <div>
              <label className="text-sm font-medium mb-2 block">Tipo de Evento</label>
              <Select
                value={filters.eventType || "all"}
                onValueChange={(value) =>
                  setFilters(f => ({
                    ...f,
                    eventType: value === "all" ? undefined : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {uniqueEventTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {type.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Data início */}
            <div>
              <label className="text-sm font-medium mb-2 block">De</label>
              <Input
                type="date"
                value={filters.from || ""}
                onChange={(e) =>
                  setFilters(f => ({ ...f, from: e.target.value || undefined }))
                }
              />
            </div>

            {/* Data fim */}
            <div>
              <label className="text-sm font-medium mb-2 block">Até</label>
              <Input
                type="date"
                value={filters.to || ""}
                onChange={(e) =>
                  setFilters(f => ({ ...f, to: e.target.value || undefined }))
                }
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() =>
                setFilters({
                  sourceModule: undefined,
                  from: undefined,
                  to: undefined,
                  eventType: undefined,
                })
              }
            >
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de eventos */}
      <div className="space-y-4">
        {loading ? (
          [1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-24" />)
        ) : events.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Nenhum evento encontrado com os filtros atuais.
            </CardContent>
          </Card>
        ) : (
          events.map((event) => (
            <Card key={event.id}>
              <CardContent className="py-4">
                <div className="flex items-start gap-4">
                  {/* Icone de módulo */}
                  <div className={`w-10 h-10 rounded-lg ${getEventColor(event.source_module)} flex items-center justify-center text-white`}>
                    <Cube className="h-5 w-5" />
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          {getEventLabel(event.source_module)}
                        </Badge>
                        <span className="font-medium">
                          {event.event_type.replace(/_/g, " ")}
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(event.occurred_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </span>
                    </div>

                    {/* Payload */}
                    {event.payload && Object.keys(event.payload).length > 0 && (
                      <div className="text-sm text-muted-foreground space-y-1">
                        {Object.entries(event.payload)
                          .filter(([key]) => !key.startsWith("_"))
                          .map(([key, value]) => (
                            <div key={key} className="flex gap-2">
                              <span className="font-medium text-muted-foreground/70">
                                {key.replace(/_/g, " ")}:
                              </span>
                              <span className="truncate">
                                {typeof value === "boolean"
                                  ? value ? "Sim" : "Não"
                                  : String(value)}
                              </span>
                            </div>
                          ))}
                      </div>
                    )}

                    {/* Detalhes da entidade */}
                    {event.entity_type && event.entity_id && (
                      <div className="text-xs text-muted-foreground/70">
                        {event.entity_type}: {event.entity_id}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}