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
    if (cycleIdParam) {
      setCycleId(cycleIdParam);
    }
  }, [cycleIdParam]);

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
              <input
                type="text"
                className="w-full h-11 rounded-xl border border-[color:var(--sinaxys-border)] px-3 text-sm outline-none focus:ring-2 focus:ring-[color:var(--sinaxys-primary)]/20"
                value={cycleId}
                onChange={(e) => setCycleId(e.target.value)}
                placeholder="ID do ciclo"
              />
            </div>

            {/* Departamento */}
            <div>
              <label className="text-sm font-medium mb-2 block">Departamento</label>
              <select
                className="w-full h-11 rounded-xl border border-[color:var(--sinaxys-border)] px-3 text-sm outline-none focus:ring-2 focus:ring-[color:var(--sinaxys-primary)]/20"
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
              >
                <option value="all">Todos</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
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
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-muted-foreground">
              {filteredScores.length} colaboradores encontrados
            </div>
          </div>
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
                        {score.user_name || score.user_id}
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
        </div>
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