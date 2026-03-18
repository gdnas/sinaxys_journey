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

const coreTables: Array<{ table: string; countColumn: string }> = [
  { table: "companies", countColumn: "id" },
  { table: "profiles", countColumn: "id" },
  { table: "departments", countColumn: "id" },
  { table: "learning_tracks", countColumn: "id" },
  { table: "track_modules", countColumn: "id" },
  { table: "track_assignments", countColumn: "id" },
  { table: "module_progress", countColumn: "id" },
  { table: "certificates", countColumn: "id" },
  { table: "points_events", countColumn: "id" },
  { table: "points_rules", countColumn: "id" },
  { table: "reward_tiers", countColumn: "id" },
  { table: "okr_cycles", countColumn: "id" },
  { table: "okr_objectives", countColumn: "id" },
  { table: "okr_key_results", countColumn: "id" },
  { table: "okr_deliverables", countColumn: "id" },
  { table: "work_items", countColumn: "id" },
  { table: "strategy_objectives", countColumn: "id" },

  { table: "strategy_key_results", countColumn: "id" },
  { table: "pdi_plans", countColumn: "id" },
  { table: "pdi_skills", countColumn: "id" },
  { table: "vacation_requests", countColumn: "id" },
];

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

  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<string, number | null> | null>(null);
  const [companies, setCompanies] = useState<Array<{ id: string; name: string; created_at: string | null }> | null>(null);

  const anonKeyPresent = useMemo(() => {
    const k = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? "";
    return { present: !!k.trim(), masked: maskKey(k.trim()) };
  }, []);

  const urlPresent = useMemo(() => {
    const u = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "";
    return { present: !!u.trim(), value: u.trim() };
  }, []);

  const runConnectivityTest = async () => {
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
  };

  const loadSnapshot = async () => {
    try {
      setSnapshotLoading(true);
      setSnapshotError(null);

      // Counts (best-effort; may be blocked by RLS for unauthenticated users)
      const countPairs = await Promise.all(
        coreTables.map(async ({ table, countColumn }) => {
          const { count, error } = await supabase
            .from(table as any)
            .select(countColumn, { count: "exact", head: true });
          if (error) throw new Error(`${table}: ${error.message}`);
          return [table, typeof count === "number" ? count : null] as const;
        }),
      );
      setCounts(Object.fromEntries(countPairs));

      // Companies list (helps to confirm data is in the expected project)
      const { data: cData, error: cErr } = await supabase
        .from("companies")
        .select("id,name,created_at")
        .order("created_at", { ascending: true })
        .limit(20);
      if (cErr) throw new Error(`companies list: ${cErr.message}`);
      setCompanies((cData ?? []) as any);
    } catch (e: any) {
      setSnapshotError(e?.message ?? "Falha ao carregar snapshot.");
    } finally {
      setSnapshotLoading(false);
    }
  };

  useEffect(() => {
    // Auto-check once on mount to avoid "blank" status.
    void runConnectivityTest();
    void loadSnapshot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
                onClick={runConnectivityTest}
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
                      <li>Se a tabela existir, o erro mais comum é RLS bloqueando o select para o usuário anônimo.</li>
                      <li>
                        Depois de ajustar variáveis de ambiente, use <span className="font-medium">Restart</span> para recarregar.
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            )}
          </Card>

          <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Snapshot de dados (básico)</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Contagens e amostra de empresas para confirmar se este ambiente está lendo os dados do projeto correto.
                </p>
              </div>
              <Button
                variant="outline"
                className="h-11 rounded-2xl"
                disabled={snapshotLoading}
                onClick={loadSnapshot}
              >
                {snapshotLoading ? "Carregando…" : "Recarregar"}
              </Button>
            </div>

            {snapshotError ? (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
                {snapshotError}
              </div>
            ) : (
              <div className="mt-4 grid gap-4">
                <div className="grid gap-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contagens (core)</div>
                  {!counts ? (
                    <p className="text-sm text-muted-foreground">Carregando…</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                      {coreTables.map(({ table }) => (
                        <div key={table} className="rounded-2xl border bg-[color:var(--sinaxys-tint)] p-3">
                          <div className="text-xs font-semibold text-[color:var(--sinaxys-ink)]">{table}</div>
                          <div className="mt-1 text-lg font-semibold text-[color:var(--sinaxys-ink)]">
                            {typeof counts[table] === "number" ? counts[table] : "—"}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid gap-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Empresas (amostra)</div>
                  {!companies ? (
                    <p className="text-sm text-muted-foreground">Carregando…</p>
                  ) : companies.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma empresa encontrada.</p>
                  ) : (
                    <div className="overflow-hidden rounded-2xl border">
                      <div className="grid grid-cols-[1fr_auto] gap-2 bg-[color:var(--sinaxys-tint)] px-4 py-2 text-xs font-semibold text-[color:var(--sinaxys-ink)]">
                        <div>Nome</div>
                        <div className="text-right">ID</div>
                      </div>
                      <div className="divide-y">
                        {companies.map((c) => (
                          <div key={c.id} className="grid grid-cols-[1fr_auto] gap-2 px-4 py-2 text-sm">
                            <div className="font-medium text-[color:var(--sinaxys-ink)]">{c.name}</div>
                            <div className="text-right font-mono text-xs text-muted-foreground">{c.id.slice(0, 8)}…</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}