import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Loader2, CheckCircle2, XCircle, Clock, AlertTriangle, Play } from "lucide-react";
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

const TestRunner = () => {
  const [runState, setRunState] = useState<RunState>('idle');
  const [qaStatus, setQaStatus] = useState<QAStatus | null>(null);
  const [pollHandle, setPollHandle] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState<string>('00:00');
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    if (runState === 'in_progress' && startTime) {
      const id = window.setInterval(() => {
        const now = new Date();
        const diff = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        const minutes = Math.floor(diff / 60);
        const seconds = diff % 60;
        setElapsedTime(`${minutes.toString().padStart(2,'0')}:${seconds.toString().padStart(2,'0')}`);
      }, 1000);
      return () => clearInterval(id);
    }
  }, [runState, startTime]);

  useEffect(() => {
    return () => {
      if (pollHandle) window.clearInterval(pollHandle);
    };
  }, [pollHandle]);

  const parseInvokeResponse = (data: any) => {
    if (!data) return null;
    try {
      if (typeof data === 'string') return JSON.parse(data);
      return data;
    } catch {
      return data;
    }
  };

  const triggerQARun = async () => {
    setLastError(null);
    setQaStatus(null);
    setRunState('triggering');
    setStartTime(null);

    try {
      const { data, error } = await supabase.functions.invoke('qa-run', {
        // no body required
      });

      if (error) {
        setLastError(error.message || String(error));
        toast.error('Erro ao iniciar QA: ' + (error.message ?? String(error)));
        setRunState('idle');
        return;
      }

      const parsed = parseInvokeResponse(data) ?? {};
      // Some setups return runId directly, others nested - normalize:
      const runId = parsed.runId || parsed.run_id || parsed.id || parsed?.id?.toString();
      const status = parsed.status || parsed.state || 'queued';
      const htmlUrl = parsed.htmlUrl || parsed.html_url || parsed.html || null;

      if (!runId) {
        setLastError('Resposta inválida do servidor (runId ausente).');
        toast.error('Resposta inválida do servidor ao iniciar QA.');
        setRunState('idle');
        return;
      }

      setQaStatus({
        runId: String(runId),
        status,
        conclusion: null,
        htmlUrl: htmlUrl ?? '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        jobs: [],
        logsUrl: null,
      });

      setStartTime(new Date());
      setRunState('queued');
      toast.success('Pipeline QA iniciado!');

      // Start polling
      startPolling(String(runId));
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      setLastError(msg);
      toast.error('Erro ao iniciar QA: ' + msg);
      setRunState('idle');
    }
  };

  const startPolling = (runId: string) => {
    // clear previous
    if (pollHandle) {
      window.clearInterval(pollHandle);
      setPollHandle(null);
    }

    const id = window.setInterval(() => {
      checkQAStatus(runId);
    }, 3000);
    setPollHandle(id);
  };

  const checkQAStatus = async (runId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('qa-status', {
        body: JSON.stringify({ run_id: runId }),
        headers: { 'Content-Type': 'application/json' },
      });

      if (error) {
        console.error('qa-status invoke error', error);
        setLastError(error.message || String(error));
        return;
      }

      const parsed = parseInvokeResponse(data) ?? {};
      // Normalize fields
      const status = parsed.status || parsed.state || 'queued';
      const conclusion = parsed.conclusion || parsed.result || null;
      const htmlUrl = parsed.htmlUrl || parsed.html_url || parsed.html_url || parsed.html || parsed.htmlUrl || '';
      const jobs = parsed.jobs || [];
      const logsUrl = parsed.logsUrl || parsed.logs_url || null;

      const newStatus: QAStatus = {
        runId: parsed.runId || parsed.run_id || runId,
        status,
        conclusion,
        htmlUrl,
        createdAt: parsed.createdAt || parsed.created_at || new Date().toISOString(),
        updatedAt: parsed.updatedAt || parsed.updated_at || new Date().toISOString(),
        jobs,
        logsUrl,
      };

      setQaStatus(newStatus);

      if (status === 'completed' || conclusion === 'success' || conclusion === 'failure' || conclusion === 'cancelled') {
        // stop polling
        if (pollHandle) {
          window.clearInterval(pollHandle);
          setPollHandle(null);
        }
        setRunState(conclusion === 'success' ? 'completed' : (conclusion === 'cancelled' ? 'cancelled' : 'failed'));
      } else if (status === 'in_progress') {
        setRunState('in_progress');
      } else if (status === 'queued') {
        setRunState('queued');
      }
    } catch (err: any) {
      console.error('Error polling qa-status', err);
      setLastError(err?.message ?? String(err));
    }
  };

  const getStatusBadge = () => {
    switch (runState) {
      case 'idle': return <Badge variant="outline" className="text-base">Pronto</Badge>;
      case 'triggering': return <Badge variant="secondary" className="text-base"><Loader2 className="h-4 w-4 mr-2 animate-spin" />Iniciando...</Badge>;
      case 'queued': return <Badge variant="secondary" className="text-base"><Clock className="h-4 w-4 mr-2" />Na fila</Badge>;
      case 'in_progress': return <Badge className="text-base bg-blue-500 hover:bg-blue-600"><Loader2 className="h-4 w-4 mr-2 animate-spin" />Executando {elapsedTime}</Badge>;
      case 'completed': return <Badge className="text-base bg-green-500 hover:bg-green-600"><CheckCircle2 className="h-4 w-4 mr-2" />Concluído</Badge>;
      case 'failed': return <Badge variant="destructive" className="text-base"><XCircle className="h-4 w-4 mr-2" />Falhou</Badge>;
      case 'cancelled': return <Badge variant="secondary" className="text-base"><AlertTriangle className="h-4 w-4 mr-2" />Cancelado</Badge>;
      default: return <Badge variant="outline">Desconhecido</Badge>;
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
          <CardDescription>Disparar o pipeline QA via GitHub Actions (apenas MASTERADMIN)</CardDescription>
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
                  <a href={qaStatus.htmlUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:underline">
                    Ver no GitHub <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            )}
          </div>
          {lastError && (
            <div className="mt-4 text-sm text-red-400">
              Erro: {lastError}
            </div>
          )}
        </CardContent>
      </Card>

      {qaStatus ? (
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
                            <div>{job.status === 'in_progress' ? <Loader2 className="h-4 w-4 text-blue-600 animate-spin" /> : job.status === 'completed' ? (job.conclusion === 'success' ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-red-600" />) : <Clock className="h-4 w-4 text-yellow-600" />}</div>
                            <div>
                              <p className="font-medium">{job.name}</p>
                              <p className="text-sm text-muted-foreground">{job.started_at ?? '-'} → {job.completed_at ?? '-'}</p>
                            </div>
                          </div>
                          <div>
                            <Badge variant="outline">{job.status}{job.conclusion ? ` / ${job.conclusion}` : ''}</Badge>
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
        </>
      ) : (
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