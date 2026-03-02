import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  duration: number;
}

// Import validation functions from test files
function validateCompanyEventRowShape(obj: any): obj is any {
  return (
    typeof obj === "object" &&
    obj !== null &&
    typeof obj.id === "string" &&
    typeof obj.company_id === "string" &&
    typeof obj.user_id === "string" &&
    typeof obj.source_module === "string" &&
    typeof obj.event_type === "string" &&
    typeof obj.occurred_at === "string" &&
    typeof obj.created_at === "string" &&
    typeof obj.payload === "object" &&
    obj.payload !== null
  );
}

function validateDbTaskShape(obj: any): obj is any {
  return (
    typeof obj === "object" &&
    obj !== null &&
    typeof obj.id === "string" &&
    typeof obj.deliverable_id === "string" &&
    typeof obj.title === "string" &&
    typeof obj.owner_user_id === "string" &&
    typeof obj.status === "string"
  );
}

function validatePublicProfileRowShape(obj: any): obj is any {
  return (
    typeof obj === "object" &&
    obj !== null &&
    typeof obj.id === "string" &&
    typeof obj.company_id === "string" &&
    (obj.department_id === null || typeof obj.department_id === "string") &&
    typeof obj.name === "string" &&
    (obj.avatar_url === null || typeof obj.avatar_url === "string") &&
    typeof obj.role === "string" &&
    typeof obj.active === "boolean" &&
    (obj.manager_id === null || typeof obj.manager_id === "string") &&
    (obj.job_title === null || typeof obj.job_title === "string") &&
    typeof obj.updated_at === "string"
  );
}

// Test cases
const testCases = [
  {
    name: "CompanyEventRow - deve falhar quando falta payload",
    run: () => {
      const invalid = {
        id: "abc",
        company_id: "def",
        user_id: "user123",
        source_module: "OKR",
        event_type: "TASK_CREATED",
        occurred_at: "2024-01-01",
        created_at: "2024-01-01",
      };
      return !validateCompanyEventRowShape(invalid);
    },
  },
  {
    name: "CompanyEventRow - deve passar quando todos os campos essenciais estão presentes",
    run: () => {
      const valid = {
        id: "abc",
        company_id: "def",
        user_id: "user123",
        source_module: "OKR",
        event_type: "TASK_CREATED",
        occurred_at: "2024-01-01",
        created_at: "2024-01-01",
        payload: { task_id: "task123" },
      };
      return validateCompanyEventRowShape(valid);
    },
  },
  {
    name: "DbTask - deve falhar quando faltam campos obrigatórios",
    run: () => {
      const invalid = {
        id: "abc",
        deliverable_id: "def",
        title: "Task",
        status: "TODO",
      };
      return !validateDbTaskShape(invalid);
    },
  },
  {
    name: "DbTask - deve passar quando todos os campos essenciais estão presentes",
    run: () => {
      const valid = {
        id: "abc",
        deliverable_id: "def",
        title: "Task",
        owner_user_id: "user123",
        status: "TODO",
      };
      return validateDbTaskShape(valid);
    },
  },
  {
    name: "PublicProfileRow - deve falhar quando faltam campos obrigatórios",
    run: () => {
      const invalid = {
        id: "abc",
        company_id: "def",
        department_id: null,
        name: "John",
        avatar_url: null,
        role: "USER",
        active: true,
        updated_at: "2024-01-01",
      };
      return !validatePublicProfileRowShape(invalid);
    },
  },
  {
    name: "PublicProfileRow - deve passar quando todos os campos estão presentes",
    run: () => {
      const valid = {
        id: "abc",
        company_id: "def",
        department_id: null,
        name: "John",
        avatar_url: null,
        role: "USER",
        active: true,
        manager_id: null,
        job_title: null,
        updated_at: "2024-01-01",
      };
      return validatePublicProfileRowShape(valid);
    },
  },
];

const TestRunner = () => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);
  const [runCount, setRunCount] = useState(0);

  const runTests = async () => {
    setRunning(true);
    setResults([]);
    
    const newResults: TestResult[] = [];
    
    for (const testCase of testCases) {
      const startTime = performance.now();
      try {
        const passed = testCase.run();
        const duration = performance.now() - startTime;
        newResults.push({
          name: testCase.name,
          passed,
          message: passed ? "Teste passou com sucesso" : "Teste falhou",
          duration: Math.round(duration),
        });
      } catch (error) {
        const duration = performance.now() - startTime;
        newResults.push({
          name: testCase.name,
          passed: false,
          message: error instanceof Error ? error.message : "Erro desconhecido",
          duration: Math.round(duration),
        });
      }
      
      // Small delay to allow UI updates
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    setResults(newResults);
    setRunning(false);
    setRunCount(prev => prev + 1);
  };

  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;
  const allPassed = results.length > 0 && failedCount === 0;

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Test Runner</h1>
        <p className="text-muted-foreground">
          Execute e visualize os resultados dos testes de validação de contrato
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Painel de Controle</CardTitle>
          <CardDescription>
            Clique no botão abaixo para executar todos os testes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button 
              onClick={runTests} 
              disabled={running}
              size="lg"
              className="min-w-[200px]"
            >
              {running ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Executando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Executar Testes
                </>
              )}
            </Button>
            
            {results.length > 0 && (
              <div className="flex items-center gap-3 text-sm">
                <Badge variant={allPassed ? "default" : "destructive"} className="text-base px-3 py-1">
                  {passedCount}/{results.length} Passou
                </Badge>
                {runCount > 1 && (
                  <span className="text-muted-foreground">
                    (Execução #{runCount})
                  </span>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resultados dos Testes</CardTitle>
            <CardDescription>
              {allPassed 
                ? "Todos os testes passaram com sucesso! ✅"
                : `${failedCount} teste(s) falharam. Revise os resultados abaixo.`
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 p-4 rounded-lg border ${
                    result.passed
                      ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800"
                      : "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800"
                  }`}
                >
                  {result.passed ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`font-medium ${result.passed ? "text-green-900 dark:text-green-100" : "text-red-900 dark:text-red-100"}`}>
                        {result.name}
                      </h3>
                      <Badge variant="outline" className="text-xs">
                        {result.duration}ms
                      </Badge>
                    </div>
                    <p className={`text-sm ${result.passed ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}`}>
                      {result.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {results.length === 0 && !running && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              Os testes ainda não foram executados.
              <br />
              Clique em "Executar Testes" para começar.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TestRunner;