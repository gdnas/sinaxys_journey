"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import {
  listPerformanceScores,
  recalculateAllPerformances,
  getPerformanceScore,
  type PerformanceScoreRow,
} from "@/lib/eventLedgerDb";
import { listOkrCycles, type DbOkrCycle } from "@/lib/okrDb";
import { listPublicProfiles, type PublicProfileRow } from "@/lib/pointsDb";
import { Button } from "@/components/ui/button";
import { RefreshCw, TrendingUp, Target, BookOpen, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type PerformanceWithProfile = PerformanceScoreRow & {
  profile: PublicProfileRow | null;
};

export default function HeadPerformanceDashboard() {
  const [searchParams] = useSearchParams();
  const cycleIdParam = searchParams.get("cycleId");
  
  const { toast } = useToast();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [cycles, setCycles] = useState<DbOkrCycle[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(cycleIdParam);
  const [performances, setPerformances] = useState<PerformanceWithProfile[]>([]);
  const [profiles, setProfiles] = useState<Map<string, PublicProfileRow>>(new Map());

  // Buscar company_id
  useEffect(() => {
    async function fetchCompanyId() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (profile?.company_id) {
        setCompanyId(profile.company_id);
      }
    }
    fetchCompanyId();
  }, []);

  // Buscar ciclos
  useEffect(() => {
    if (!companyId) return;
    
    async function fetchCycles() {
      try {
        const data = await listOkrCycles(companyId);
        setCycles(data);
        
        // Selecionar ciclo ativo se nenhum estiver selecionado
        const activeCycle = data.find(c => c.status === "ACTIVE");
        if (!selectedCycleId && activeCycle) {
          setSelectedCycleId(activeCycle.id);
        }
      } catch (error) {
        console.error("Erro ao buscar ciclos:", error);
      }
    }
    fetchCycles();
  }, [companyId, selectedCycleId]);

  // Buscar profiles
  useEffect(() => {
    if (!companyId) return;

    async function fetchProfiles() {
      try {
        const data = await listPublicProfiles(companyId);
        const profileMap = new Map(data.map(p => [p.id, p]));
        setProfiles(profileMap);
      } catch (error) {
        console.error("Erro ao buscar profiles:", error);
      }
    }
    fetchProfiles();
  }, [companyId]);

  // Buscar performances
  useEffect(() => {
    if (!companyId || !selectedCycleId) return;

    async function fetchPerformances() {
      setLoading(true);
      try {
        const data = await listPerformanceScores(companyId, selectedCycleId);
        
        const withProfiles = data.map(p => ({
          ...p,
          profile: profiles.get(p.user_id) || null,
        }));
        
        setPerformances(withProfiles);
      } catch (error) {
        console.error("Erro ao buscar performances:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os dados de performance.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
    fetchPerformances();
  }, [companyId, selectedCycleId, profiles]);

  const handleRecalculate = async () => {
    if (!companyId) return;
    
    setRecalculating(true);
    try {
      await recalculateAllPerformances(companyId, selectedCycleId ?? undefined);
      
      // Recarregar performances
      const data = await listPerformanceScores(companyId, selectedCycleId ?? undefined);
      const withProfiles = data.map(p => ({
        ...p,
        profile: profiles.get(p.user_id) || null,
      }));
      setPerformances(withProfiles);
      
      toast({
        title: "Sucesso",
        description: "Scores recalculados com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao recalcular:", error);
      toast({
        title: "Erro",
        description: "Não foi possível recalcular os scores.",
        variant: "destructive",
      });
    } finally {
      setRecalculating(false);
    }
  };

  const selectedCycle = cycles.find(c => c.id === selectedCycleId);

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard de Performance</h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe a performance dos colaboradores
          </p>
        </div>
        <Button
          onClick={handleRecalculate}
          disabled={recalculating}
          variant="outline"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${recalculating ? "animate-spin" : ""}`} />
          Recalcular
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Ciclo OKR</label>
            <select
              value={selectedCycleId ?? ""}
              onChange={(e) => setSelectedCycleId(e.target.value || null)}
              className="w-full max-w-xs px-3 py-2 border rounded-md"
            >
              <option value="">Todos os períodos</option>
              {cycles.map(cycle => (
                <option key={cycle.id} value={cycle.id}>
                  {cycle.name || `${cycle.type === "ANNUAL" ? "Anual" : "Trimestral"} ${cycle.year}${cycle.quarter ? ` - Q${cycle.quarter}` : ""}`}
                  {cycle.status === "ACTIVE" && " (Ativo)"}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de performances */}
      <div className="space-y-4">
        {performances.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Nenhum dado de performance encontrado para este período.
            </CardContent>
          </Card>
        ) : (
          performances.map((performance) => (
            <Card key={performance.id}>
              <CardContent className="py-6">
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
                    {performance.profile?.name?.charAt(0).toUpperCase() || "?"}
                  </div>

                  <div className="flex-1 space-y-3">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">
                          {performance.profile?.name || "Usuário desconhecido"}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {performance.profile?.job_title || "Sem cargo definido"}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-purple-600">
                          {performance.score.toFixed(1)}
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {selectedCycle?.name || "Total"}
                        </Badge>
                      </div>
                    </div>

                    {/* Breakdown */}
                    <div className="grid grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Target className="h-4 w-4" />
                          Execução
                        </div>
                        <div className="text-lg font-semibold">
                          {performance.execution_score.toFixed(0)}
                        </div>
                        <Progress value={Math.min(100, performance.execution_score * 2)} className="h-2" />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <TrendingUp className="h-4 w-4" />
                          Resultado
                        </div>
                        <div className="text-lg font-semibold">
                          {performance.result_score.toFixed(0)}
                        </div>
                        <Progress value={Math.min(100, performance.result_score * 2)} className="h-2" />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <BookOpen className="h-4 w-4" />
                          Aprendizado
                        </div>
                        <div className="text-lg font-semibold">
                          {performance.learning_score.toFixed(0)}
                        </div>
                        <Progress value={Math.min(100, performance.learning_score * 2)} className="h-2" />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          Consistência
                        </div>
                        <div className="text-lg font-semibold">
                          {performance.consistency_score.toFixed(0)}
                        </div>
                        <Progress value={Math.min(100, performance.consistency_score * 2)} className="h-2" />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Legenda */}
      <Card>
        <CardContent className="py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-purple-500" />
              <span><strong>Execução:</strong> Tarefas e entregáveis OKR concluídos</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <span><strong>Resultado:</strong> Key Results atingidos e progresso</span>
            </div>
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-green-500" />
              <span><strong>Aprendizado:</strong> Módulos e quizzes concluídos</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              <span><strong>Consistência:</strong> Check-ins e 1:1 realizados</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}