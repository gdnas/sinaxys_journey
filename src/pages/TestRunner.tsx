import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Loader2, CheckCircle2, XCircle, Clock, AlertTriangle, Play, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface JobStep {
  name: string;
  status: string;
  conclusion: string | null;
  started_at: string | null;
  completed_at: string | null;
}

interface QAStatus {
  runId: string;
  status: string;
  conclusion: string | null;
  htmlUrl: string;
  createdAt: string;
  updatedAt: string;
  jobs: JobStep[];
  logsUrl: string | null;
}

type RunState = 'idle' | 'triggering' | 'queued' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

const GITHUB_PROJECT_ID = "gohcnlyonuoeszaqjsxw"; // Replace with actual project ID
const SUPABASE_URL = `https://${GITHUB_PROJECT_ID}.supabase.co`;

const TestRunner = () => {
  const [runState, setRunState] = useState<RunState>('idle');
  const [qaStatus, setQaStatus] = useState<QAStatus | null>(null);
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState<string>('00:00');

  // Format elapsed time
  useEffect(() => {
    if (runState === 'in_progress' && startTime) {
      const interval = setInterval(() => {
        const now = new Date();
        const diff = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        const minutes = Math.floor(diff / 60);
        const seconds = diff % 60;
        setElapsedTime(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [runState, startTime]);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [pollInterval]);

  const triggerQARun = async () => {
    try {
      setRunState('triggering');
      setStartTime(null);
      setQaStatus(null);

      // Get session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Não autenticado');
        return;
      }

      // Call qa-run edge function
      const response = await fetch(`${SUPABASE_URL}/functions/v1/qa-run`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      const data = await response.json() as { runId: string; status: string; htmlUrl: string };
      
      setQaStatus({
        runId: data.runId,
        status: data.status,
        conclusion: null,
        htmlUrl: data.htmlUrl,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        jobs: [],
        logsUrl: null,
      });

      setStartTime(new Date());
      setRunState('queued');
      toast.success('Pipeline QA iniciado!');

      // Start polling
      startPolling(data.runId);

    } catch (error) {
      console.error('Error triggering QA:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao iniciar QA');
      setRunState('idle');
    }
  };

  const startPolling = (runId: string) => {
    // Clear any existing interval
    if (pollInterval) {
      clearInterval(pollInterval);
    }

    // Poll every 3 seconds
    const interval = setInterval(() => {
      checkQAStatus(runId);
    }, 3000);

    setPollInterval(interval);
  };

  const checkQAStatus = async (runId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        return;
      }

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/qa-status?run_id=${runId}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        console.error('Error fetching QA status:', await response.text());
        return;
      }

      const data = await response.json() as QAStatus;
      setQaStatus(data);

      // Update run state based on status
      if (data.status === 'completed') {
        setRunState(data.conclusion === 'success' ? 'completed' : 'failed');
        if (pollInterval) {
          clearInterval(pollInterval);
          setPollInterval(null);
        }
      } else if (data.status === 'in_progress') {
        setRunState('in_progress');
      } else if (data.status === 'queued') {
        setRunState('queued');
      } else if (data.status === 'failure') {
        setRunState('failed');
        if (pollInterval) {
          clearInterval(pollInterval);
          setPollInterval(null);
        }
      } else if (data.status === 'cancelled') {
        setRunState('cancelled');
        if (pollInterval) {
          clearInterval(pollInterval);
          setPollInterval(null);
        }
      }

    } catch (error) {
      console.error('Error polling QA status:', error);
    }
  };

  const getStatusBadge = () => {
    switch (runState) {
      case 'idle':
        return <Badge variant="outline" className="text-base">Pronto</Badge>;
      case 'triggering':
        return <Badge variant="secondary" className="text-base"><Loader2 className="h-4 w-4 mr-2 animate-spin" />Iniciando...</Badge>;
      case 'queued':
        return <Badge variant="secondary" className="text-base"><Clock className="h-4 w-4 mr-2" />Na fila</Badge>;
      case 'in_progress':
        return <Badge className="text-base bg-blue-500 hover:bg-blue-600"><Loader2 className="h-4 w-4 mr-2 animate-spin" />Executando {elapsedTime}</Badge>;
      case 'completed':
        return <Badge className="text-base bg-green-500 hover:bg-green-600"><CheckCircle2 className="h-4 w-4 mr-2" />Concluído</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="text-base"><XCircle className="h-4 w-4 mr-2" />Falhou</Badge>;
      case 'cancelled':
        return <Badge variant="secondary" className="text-base"><AlertTriangle className="h-4 w-4 mr-2" />Cancelado</Badge>;
      default:
        return <Badge variant="outline">Desconhecido</Badge>;
    }
  };

  const getJobStatusIcon = (status: string, conclusion: string | null) => {
    if (status === 'queued') {
      return <Clock className="h-4 w-4 text-yellow-600" />;
    } else if (status === 'in_progress') {
      return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />;
    } else if (status === 'completed') {
      return conclusion === 'success' 
        ? <CheckCircle2 className="h-4 w-4 text-green-600" />
        : <XCircle className="h-4 w-4 text-red-600" />;
    } else if (status === 'failed') {
      return <XCircle className="h-4 w-4 text-red-600" />;
    } else {
      return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getJobStatusBadge = (status: string, conclusion: string | null) => {
    if (status === 'queued') {
      return <Badge variant="secondary">Na fila</Badge>;
    } else if (status === 'in_progress') {
      return <Badge className="bg-blue-500 hover:bg-blue-600">Executando</Badge>;
    } else if (status === 'completed') {
      return conclusion === 'success' 
        ? <Badge className="bg-green-500 hover:bg-green-600">Sucesso</Badge>
        : <Badge variant="destructive">Falhou</Badge>;
    } else if (status === 'failed') {
      return <Badge variant="destructive">Falhou</Badge>;
    } else {
      return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">QA Pipeline Runner</h1>
        <p className="text-muted-foreground">
          Execute o pipeline completo de QA (lint + typecheck + testes unitários + e2e) via GitHub Actions
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Painel de Controle</CardTitle>
          <CardDescription>
            Disparar o pipeline QA via GitHub Actions (apenas MASTERADMIN)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 flex-wrap">
            <Button 
              onClick={triggerQARun} 
              disabled={runState === 'triggering' || runState === 'queued' || runState === 'in_progress'}
              size="lg"
              className="min-w-[200px]"
            >
              {runState === 'triggering' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Iniciando...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Executar Pipeline QA
                </>
              )}
            </Button>
            
            {qaStatus && (
              <div className="flex items-center gap-3 text-sm">
                {getStatusBadge()}
                {qaStatus.htmlUrl && (
                  <a 
                    href={qaStatus.htmlUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    Ver no GitHub
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {qaStatus && (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Status do Pipeline</CardTitle>
              <CardDescription>
                Tempo decorrido: {elapsedTime} | Iniciado em: {qaStatus.createdAt ? new Date(qaStatus.createdAt).toLocaleString('pt-BR') : '-'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Run ID</p>
                    <p className="font-mono font-medium">{qaStatus.runId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Status</p>
                    <p className="font-medium capitalize">{qaStatus.status}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Conclusão</p>
                    <p className="font-medium capitalize">{qaStatus.conclusion || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Última atualização</p>
                    <p className="font-medium">{qaStatus.updatedAt ? new Date(qaStatus.updatedAt).toLocaleString('pt-BR') : '-'}</p>
                  </div>
                </div>

                {qaStatus.jobs.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Etapas do Pipeline</h3>
                    <div className="space-y-2">
                      {qaStatus.jobs.map((job, index) => (
                        <div key={index} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                          <div className="flex items-center gap-3 flex-1">
                            {getJobStatusIcon(job.status, job.conclusion)}
                            <div>
                              <p className="font-medium">{job.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {job.started_at ? new Date(job.started_at).toLocaleTimeString('pt-BR') : '-'} - {' '}
                                {job.completed_at ? new Date(job.completed_at).toLocaleTimeString('pt-BR') : '-'}
                              </p>
                            </div>
                          </div>
                          <div>
                            {getJobStatusBadge(job.status, job.conclusion)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {qaStatus.logsUrl && (
                  <Button variant="outline" className="w-full" asChild>
                    <a href={qaStatus.logsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                      <ExternalLink className="h-4 w-4" />
                      Ver logs completos no GitHub
                    </a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Instruções de Configuração</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Configure o GITHUB_TOKEN</p>
                    <p className="text-muted-foreground">
                      Adicione o segredo <code className="bg-muted px-1.5 py-0.5 rounded text-xs">GITHUB_TOKEN</code> no Supabase com permissões de <code className="bg-muted px-1.5 py-0.5 rounded text-xs">workflow</code>.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Atualize o repositório GitHub</p>
                    <p className="text-muted-foreground">
                      Substitua <code className="bg-muted px-1.5 py-0.5 rounded text-xs">your-repo-owner/your-repo</code> nas Edge Functions com o dono real do repositório.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Rate Limiting</p>
                    <p className="text-muted-foreground">
                      Proteção contra abusos: apenas 1 execução por minuto por usuário MASTERADMIN.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {runState === 'idle' && !qaStatus && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Play className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              O pipeline QA ainda não foi executado.
              <br />
              Clique em "Executar Pipeline QA" para começar.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TestRunner;