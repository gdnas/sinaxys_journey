import { useEffect, useMemo, useState } from "react";
import { supabase, supabaseUrl } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function maskKey(k: string) {
  if (!k) return "";
  const start = k.slice(0, 10);
  const end = k.slice(-6);
  return `${start}…${end}`;
}

export default function SupabaseStatus() {
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<
    | null
    | {
        ok: boolean;
        message: string;
        details?: string;
      }
  >(null);

  const anonKeyPresent = useMemo(() => {
    const k = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? "";
    return { present: !!k.trim(), masked: maskKey(k.trim()) };
  }, []);

  const urlPresent = useMemo(() => {
    const u = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "";
    return { present: !!u.trim(), value: u.trim() };
  }, []);

  useEffect(() => {
    // Auto-check once on mount to avoid “blank” status.
    void (async () => {
      try {
        setLoading(true);
        const { error } = await supabase.from("companies").select("id").limit(1);
        if (error) {
          setLastResult({ ok: false, message: error.message, details: JSON.stringify(error) });
          return;
        }
        setLastResult({ ok: true, message: "Consegui consultar a tabela companies." });
      } catch (e: any) {
        setLastResult({ ok: false, message: e?.message ?? "Erro ao testar conexão." });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-[color:var(--sinaxys-bg)] px-4 py-10 md:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-[color:var(--sinaxys-ink)]">Status do Supabase</h1>
          <p className="text-sm text-muted-foreground">
            Esta tela ajuda a confirmar se o app está apontando para o projeto certo (URL/anon key) e se consegue ler o banco.
          </p>
        </div>

        <div className="mt-6 grid gap-4">
          <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Projeto atualmente configurado</div>
                <div className="grid gap-1 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-muted-foreground">supabaseUrl usado:</span>
                    <span className="font-medium text-[color:var(--sinaxys-ink)]">{supabaseUrl}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-muted-foreground">VITE_SUPABASE_URL:</span>
                    <Badge
                      className={`rounded-full px-2.5 py-0.5 text-xs ${urlPresent.present ? "bg-emerald-600 text-white" : "bg-amber-600 text-white"}`}
                    >
                      {urlPresent.present ? "definida" : "não definida"}
                    </Badge>
                    {urlPresent.present && <span className="text-xs text-muted-foreground">({urlPresent.value})</span>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-muted-foreground">VITE_SUPABASE_ANON_KEY:</span>
                    <Badge
                      className={`rounded-full px-2.5 py-0.5 text-xs ${anonKeyPresent.present ? "bg-emerald-600 text-white" : "bg-amber-600 text-white"}`}
                    >
                      {anonKeyPresent.present ? "definida" : "não definida"}
                    </Badge>
                    {anonKeyPresent.present && <span className="text-xs text-muted-foreground">({anonKeyPresent.masked})</span>}
                  </div>
                </div>
              </div>

              <Button
                className="h-11 rounded-2xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                disabled={loading}
                onClick={async () => {
                  try {
                    setLoading(true);
                    const { error } = await supabase.from("companies").select("id").limit(1);
                    if (error) {
                      setLastResult({ ok: false, message: error.message, details: JSON.stringify(error) });
                      return;
                    }
                    setLastResult({ ok: true, message: "Consegui consultar a tabela companies." });
                  } catch (e: any) {
                    setLastResult({ ok: false, message: e?.message ?? "Erro ao testar conexão." });
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                {loading ? "Testando…" : "Testar conexão"}
              </Button>
            </div>
          </Card>

          <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Resultado</div>
              {lastResult && (
                <Badge
                  className={`rounded-full px-2.5 py-0.5 text-xs ${lastResult.ok ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"}`}
                >
                  {lastResult.ok ? "OK" : "Falhou"}
                </Badge>
              )}
            </div>

            {!lastResult ? (
              <p className="mt-2 text-sm text-muted-foreground">Ainda não testado.</p>
            ) : (
              <div className="mt-3 space-y-2">
                <p className="text-sm text-[color:var(--sinaxys-ink)]">{lastResult.message}</p>
                {lastResult.details && (
                  <pre className="max-h-52 overflow-auto rounded-2xl bg-[color:var(--sinaxys-muted)] p-3 text-xs text-[color:var(--sinaxys-ink)]">
                    {lastResult.details}
                  </pre>
                )}
                {!lastResult.ok && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                    <div className="font-semibold">Dicas rápidas</div>
                    <ul className="mt-1 list-disc space-y-1 pl-4">
                      <li>
                        Confirme se o projeto do Supabase contém as tabelas esperadas (ex.: <span className="font-mono">companies</span>,
                        <span className="font-mono"> profiles</span>, <span className="font-mono">departments</span>, etc.).
                      </li>
                      <li>
                        Se a tabela existir, o erro mais comum é RLS bloqueando o select para o usuário anônimo.
                      </li>
                      <li>
                        Depois de ajustar variáveis de ambiente, use <span className="font-medium">Restart</span> para recarregar.
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
