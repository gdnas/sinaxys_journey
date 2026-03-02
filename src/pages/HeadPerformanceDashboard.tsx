"use client";

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "react-router-dom";
import { listPerformanceScores } from "@/lib/performanceDb";
import { ArrowLeft, TrendingUp, Award, Calendar, Users, Funnel } from "lucide-react";

export default function HeadPerformanceDashboard() {
  const [searchParams] = useSearchParams();
  const cycleIdParam = searchParams.get("cycleId");
  const [cycleId, setCycleId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState<any[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");

  useEffect(() => {
    if (params.cycleId) {
      setCycleId(params.cycleId);
    }
  }, [params.cycleId]);

  const fetchScores = async () => {
    setLoading(true);
    try {
      const data = await listPerformanceScores("", cycleId);
      setScores(data);
    } catch (error) {
      console.error("Erro ao buscar scores:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (cycleId) {
      fetchScores();
    }
  }, [cycleId]);

  const filteredScores = departmentFilter === "all"
    ? scores
    : scores.filter(s => s.department_id === departmentFilter);

  const departments = Array.from(new Set(scores.map(s => s.department_id).filter(Boolean)));

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 70) return "text-yellow-600";
    if (score >= 50) return "text-orange-600";
    return "text-red-600";
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return { label: "Excelente", variant: "default" as const };
    if (score >= 70) return { label: "Bom", variant: "secondary" as const };
    if (score >= 50) return { label: "Regular", variant: "outline" as const };
    return { label: "Crítico", variant: "destructive" as const };
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Scores de Performance</h1>
        <p className="text-muted-foreground">
          Visualize o desempenho dos colaboradores neste ciclo
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Funnel className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Ciclo */}
            <div>
              <label className="text-sm font-medium mb-2 block">Ciclo</label>
              <Select
                value={cycleId}
                onValueChange={setCycleId}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {/* TODO: Fetch cycles from API */}
                  <SelectItem value="current">Atual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Departamento */}
            <div>
              <label className="text-recommendation-sm font-medium mb-2 block">Departamento</label>
              <Select
                value={departmentFilter}
                onValueChange={setDepartmentFilter}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de scores */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, ].map(i => (
            <Card key={i}>
              <CardContent className="py-12">
                <div className="h-6 bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredScores.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhum score encontrado para os filtros selecionados.
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="ranking">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="ranking">
              <TrendingUp className="mr-2 h-4 w-4" />
              Ranking
            </TabsTrigger>
            <TabsTrigger value="details">
              <Users className="mr-2 h-4 w-4" />
              Detalhes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ranking" className="space-y-4">
            {filteredScores.map((score, index) => (
              <Card key={score.id}>
                <CardContent className="py-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold truncate">
                          {score.user_name}
                        </span>
                        {score.breakdown && (
                          <Badge variant="outline" className="text-xs">
                            {Object.keys(score.breakdown).length} dimensões
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {score.department_id || "Sem departamento"}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className={`text-2xl font-bold ${getScoreColor(score.score)}`}>
                        {score.score.toFixed(1)}
                      </div>
                      <Badge {...getScoreBadge(score.score)}>
                        {getScoreBadge(score.score).label}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="details" className="space-y-4">
            {filteredScores.map((score) => (
              <Card key={score.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{score.user_name}</CardTitle>
                    <Badge {...getScoreBadge(score.score)}>
                      {score.score.toFixed(1)} - {getScoreBadge(score.score).label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {score.breakdown ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(score.breakdown).map(([key, value]) => (
                        <div key={key} className="rounded-lg bg-muted/50 p-3">
                          <div className="text-sm font-medium mb-1">
                            {key.replace(/_/g, " ")}
                          </div>
                          <div className="text-xl font-bold">
                            {typeof value === "number" ? value.toFixed(1) : String(value)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <CardDescription>Sem dados de breakdown disponíveis.</CardDescription>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      )}

      {/* Voltar */}
      <Button asChild variant="outline" className="w-full md:w-auto">
        <Link to="/head">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Head Dashboard
        </Link>
      </Button>
    </div>
  );
}