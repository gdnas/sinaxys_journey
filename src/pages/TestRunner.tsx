import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ExternalLink, Loader2, CheckCircle2, XCircle, Clock, AlertTriangle, Play, History, RefreshCw, ChevronRight, Filter } from "lucide-react";
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
  testType?: string;
}

interface HistoryRun {
  id: number;
  name: string;
  testType: string;
  status: string;
  conclusion: string | null;
  htmlUrl: string;
  createdAt: string;
  updatedAt: string;
  durationSeconds: number;
  workflowFile: string;
}

interface Pagination {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  perPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

type RunState = 'idle' | 'triggering' | 'queued' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
type TestType = 'quick' | 'full' | 'custom';

const TestRunner = () => {
  const [runState, setRunState] = useState<RunState>('idle');
  const [qaStatus, setQaStatus] = useState<QAStatus | null>(null);
  const [pollHandle, setPollHandle] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState<string>('00:00');
  const [lastError, setLastError] = useState<string | null>(null);

  // Test type selection
  const [testType, setTestType] = useState<TestType>('quick');
  const [selectedTests, setSelectedTests] = useState({
    lint: true,
    typecheck: true,
    unit: false,
    e2e: false,
  });

  // History state
  const [qaHistory, setQaHistory] = useState<HistoryRun[]>([]);
  const [historyPagination, setHistoryPagination] = useState<Pagination | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyFilter, setHistoryFilter] = useState<{ testType: string; status: string }>({ testType: 'all', status: 'all' });

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

  // Fetch history on mount and when filters change
  useEffect(() => {
    fetchQAHistory();
  }, [historyPage, historyFilter.testType, historyFilter.status]);

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
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;

      const requestBody: any = {
        test_type: testType,
      };

      if (userId) {
        requestBody.trigger_user = userId;
      }

      if (testType === 'custom') {
        requestBody.run_lint = selectedTests.lint;
        requestBody.run_typecheck = selectedTests.typecheck;
        requestBody.run_unit = selectedTests.unit;
        requestBody.run_e2e = selectedTests.e2e;
      }

      const { data, error } = await supabase.functions.invoke('qa-run', {
        body: requestBody,
      });

      if (error) {
        setLastError(error.message || String(error));
        toast.error('Erro ao iniciar QA: ' + (error.message ?? String(error)));
        setRunState('idle');
        return;
      }

      const parsed = parseInvokeResponse(data) ?? {};
      const runId = parsed.runId || parsed.run_id || parsed.id || parsed?.id?.toString();
      const status = parsed.status || parsed.state || 'queued';
      const htmlUrl = parsed.htmlUrl || parsed.html_url || parsed.html || null;
      const returnedTestType = parsed.testType || testType;

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
        testType: returnedTestType,
      });

      setStartTime(new Date());
      setRunState('queued');
      toast.success(`${getTestTypeLabel(returnedTestType)} iniciado!`);

      // Start polling
      startPolling(String(runId));

      // Refresh history after starting
      setTimeout(() => fetchQAHistory(), 5000);
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

  const fetchQAHistory = async () => {
    setHistoryLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('qa-history', {
        body: {
          page: historyPage,
          per_page: 10,
          test_type: historyFilter.testType,
          status: historyFilter.status,
        },
      });

      if (error) {
        console.error('Error fetching QA history:', error);
        toast.error('Erro ao carregar histórico');
        return;
      }

      const parsed = parseInvokeResponse(data) ?? {};
      setQaHistory(parsed.runs || []);
      setHistoryPagination(parsed.pagination || null);
    } catch (err: any) {
      console.error('Error fetching QA history:', err);
      toast.error('Erro ao carregar histórico');
    } finally {
      setHistoryLoading(false);
    }
  };

  const getTestTypeLabel = (type: string): string => {
    switch (type) {
      case 'quick': return 'Quick Test';
      case 'full': return 'Full Test';
      case 'custom': return 'Teste Personalizado';
      default: return type;
    }
  };

  const getTestTypeColor = (type: string): string => {
    switch (type) {
      case 'quick': return 'bg-purple-500 hover:bg-purple-600';
      case 'full': return 'bg-blue-500 hover:bg-blue-600';
      case 'custom': return 'bg-orange-500 hover:bg-orange-600';
      default: return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  const getStatusBadge = (status: string, conclusion: string | null) => {
    if (status === 'completed' && conclusion === 'success') {
      return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />Sucesso</Badge>;
    } else if (status === 'completed' && conclusion === 'failure') {
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Falhou</Badge>;
    } else if (status === 'completed' && conclusion === 'cancelled') {
      return <Badge variant="secondary"><AlertTriangle className="h-3 w-3 mr-1" />Cancelado</Badge>;
    } else if (status === 'in_progress') {
      return <Badge className="bg-blue-500 hover:bg-blue-600"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Em andamento</Badge>;
    } else if (status === 'queued') {
      return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Na fila</Badge>;
    } else {
      return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      <div className="mb-2">
        <h1 className="text-3xl font-bold mb-2">QA Pipeline Runner</h1>
        <p className="text-muted-foreground">
          Execute o pipeline de QA via GitHub Actions com opções flexíveis de execução
        </p>
      </div>

      {/* Painel de Controle */}
      <Card>
        <CardHeader>
          <CardTitle>Painel de Controle</CardTitle>
          <CardDescription>Selecione o tipo de teste e execute (apenas MASTERADMIN)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Tipo de Execução */}
          <div>
            <label className="text-sm font-medium mb-3 block">Tipo de Execução</label>
            <Tabs value={testType} onValueChange={(v) => setTestType(v as TestType)} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="quick" className="flex items-center gap-2">
                  <Play className="h-4 w-4" />
                  Quick Test
                </TabsTrigger>
                <TabsTrigger value="full" className="flex items-center gap-2">
                  <Play className="h-4 w-4" />
                  Full Test
                </TabsTrigger>
                <TabsTrigger value="custom" className="flex items-center gap-2">
                  <Play className="h-4 w-4" />
                  Personalizado
                </TabsTrigger>
              </TabsList>

              <TabsContent value="quick" className="mt-4">
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-2">Testes essenciais (rápido)</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>ESLint (Linting de código)</li>
                    <li>TypeScript (Verificação de tipos)</li>
                  </ul>
                  <p className="mt-2 text-xs text-muted-foreground">Tempo estimado: 30-60 segundos</p>
                </div>
              </TabsContent>

              <TabsContent value="full" className="mt-4">
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-2">Pipeline completo</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>ESLint (Linting de código)</li>
                    <li>TypeScript (Verificação de tipos)</li>
                    <li>Unit Tests (Vitest)</li>
                    <li>E2E Tests (Playwright)</li>
                  </ul>
                  <p className="mt-2 text-xs text-muted-foreground">Tempo estimado: 5-10 minutos</p>
                </div>
              </TabsContent>

              <TabsContent value="custom" className="mt-4">
                <div className="space-y-3">
                  <p className="font-medium text-sm">Selecione os testes específicos:</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="lint"
                        checked={selectedTests.lint}
                        onCheckedChange={(checked) => setSelectedTests({ ...selectedTests, lint: checked as boolean })}
                      />
                      <label htmlFor="lint" className="text-sm">Lint (ESLint)</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="typecheck"
                        checked={selectedTests.typecheck}
                        onCheckedChange={(checked) => setSelectedTests({ ...selectedTests, typecheck: checked as boolean })}
                      />
                      <label htmlFor="typecheck" className="text-sm">Typecheck (TypeScript)</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="unit"
                        checked={selectedTests.unit}
                        onCheckedChange={(checked) => setSelectedTests({ ...selectedTests, unit: checked as boolean })}
                      />
                      <label htmlFor="unit" className="text-sm">Unit Tests (Vitest)</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="e2e"
                        checked={selectedTests.e2e}
                        onCheckedChange={(checked) => setSelectedTests({ ...selectedTests, e2e: checked as boolean })}
                      />
                      <label htmlFor="e2e" className="text-sm">E2E Tests (Playwright)</label>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Selecione pelo menos um teste para executar
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Ação Principal */}
          <div className="flex items-center gap-4 flex-wrap">
            <Button
              onClick={triggerQARun}
              disabled={runState === 'triggering' || runState === 'queued' || runState === 'in_progress'}
              size="lg"
              className={`min-w-[200px] ${testType === 'custom' ? 'bg-orange-500 hover:bg-orange-600' : testType === 'quick' ? 'bg-purple-500 hover:bg-purple-600' : 'bg-blue-500 hover:bg-blue-600'}`}
            >
              {runState === 'triggering' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Iniciando...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Executar {getTestTypeLabel(testType)}
                </>
              )}
            </Button>

            {qaStatus && (
              <div className="flex items-center gap-3 text-sm">
                {getStatusBadge(qaStatus.status, qaStatus.conclusion)}
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
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Status do Pipeline</CardTitle>
                  <CardDescription>
                    {qaStatus.testType && (
                      <Badge className={`mr-2 ${getTestTypeColor(qaStatus.testType)}`}>
                        {getTestTypeLabel(qaStatus.testType)}
                      </Badge>
                    )}
                    Tempo decorrido: {elapsedTime}
                  </CardDescription>
                </div>
                {runState === 'in_progress' && (
                  <Badge variant="secondary">
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Atualizando...
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Run ID</p>
                    <p className="font-mono font-medium text-sm">{qaStatus.runId}</p>
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
                    <p className="text-sm text-muted-foreground mb-1">Iniciado em</p>
                    <p className="font-medium text-sm">{qaStatus.createdAt ? new Date(qaStatus.createdAt).toLocaleString('pt-BR') : '-'}</p>
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
              Selecione o tipo de teste e clique em "Executar" para começar.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Histórico de Testes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5" />
              <CardTitle>Histórico de Testes</CardTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchQAHistory}
              disabled={historyLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${historyLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
          <CardDescription>
            Veja os resultados dos testes anteriores
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtros */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Filtros:</span>
            </div>
            <select
              value={historyFilter.testType}
              onChange={(e) => {
                setHistoryFilter({ ...historyFilter, testType: e.target.value });
                setHistoryPage(1);
              }}
              className="px-3 py-1.5 text-sm border rounded-md bg-background"
            >
              <option value="all">Todos os tipos</option>
              <option value="quick">Quick Test</option>
              <option value="full">Full Test</option>
              <option value="custom">Personalizado</option>
            </select>
            <select
              value={historyFilter.status}
              onChange={(e) => {
                setHistoryFilter({ ...historyFilter, status: e.target.value });
                setHistoryPage(1);
              }}
              className="px-3 py-1.5 text-sm border rounded-md bg-background"
            >
              <option value="all">Todos os status</option>
              <option value="success">Sucesso</option>
              <option value="failure">Falha</option>
              <option value="cancelled">Cancelado</option>
              <option value="in_progress">Em andamento</option>
            </select>
          </div>

          {/* Tabela de histórico */}
          {historyLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Carregando histórico...</span>
            </div>
          ) : qaHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum teste encontrado no histórico.
            </div>
          ) : (
            <div className="space-y-3">
              {qaHistory.map((run) => (
                <div key={run.id} className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <Badge className={getTestTypeColor(run.testType)} variant="secondary">
                      {getTestTypeLabel(run.testType)}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">#{run.id}</span>
                        {getStatusBadge(run.status, run.conclusion)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(run.createdAt).toLocaleString('pt-BR')}
                        {run.durationSeconds > 0 && (
                          <span className="ml-3">Duração: {formatDuration(run.durationSeconds)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={run.htmlUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      Detalhes <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Paginação */}
          {historyPagination && historyPagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Página {historyPagination.currentPage} de {historyPagination.totalPages}
                {' '} ({historyPagination.totalItems} resultados)
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setHistoryPage(historyPage - 1)}
                  disabled={!historyPagination.hasPrevPage || historyLoading}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setHistoryPage(historyPage + 1)}
                  disabled={!historyPagination.hasNextPage || historyLoading}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TestRunner;