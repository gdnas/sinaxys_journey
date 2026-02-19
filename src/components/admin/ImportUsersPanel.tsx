import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { UploadCloud, Users } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResponsiveTable } from "@/components/ResponsiveTable";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { listDepartments } from "@/lib/departmentsDb";

type Role = "ADMIN" | "HEAD" | "COLABORADOR";

type ImportRow = {
  rowNumber: number; // 2+ (1 is header)
  email: string;
  name: string | null;
  role: Role;
  department: string | null;
  job_title: string | null;
  phone: string | null;
  monthly_cost_brl: number | null;
  password: string | null;
};

type RowCheck = {
  rowNumber: number;
  email: string;
  ok: boolean;
  messages: string[];
};

type Result =
  | { rowNumber: number; email: string; ok: true; mode: "created" | "invited" | "already" | "linked"; message: string }
  | { rowNumber: number; email: string; ok: false; message: string };

const EXPECTED_HEADERS = [
  "email",
  "name",
  "role",
  "department",
  "job_title",
  "phone",
  "monthly_cost_brl",
  "password",
] as const;

type ExpectedHeader = (typeof EXPECTED_HEADERS)[number];

function normHeader(v: unknown) {
  return String(v ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function isEmail(v: string) {
  const t = v.trim().toLowerCase();
  return t.includes("@") && t.includes(".");
}

function toOptionalString(v: unknown) {
  const t = String(v ?? "").trim();
  return t ? t : null;
}

function toOptionalNumber(v: unknown) {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) && v > 0 ? v : null;
  const t = String(v).trim();
  if (!t) return null;
  const n = Number(t.replace(/\./g, "").replace(/,/g, "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function toRole(v: unknown): Role {
  const t = String(v ?? "")
    .trim()
    .toUpperCase();
  if (t === "ADMIN" || t === "HEAD" || t === "COLABORADOR") return t;
  return "COLABORADOR";
}

async function describeFunctionError(e: unknown): Promise<string> {
  const anyErr = e as any;
  const ctx = anyErr?.context;

  // For FunctionsHttpError, context is usually a Response.
  if (ctx && typeof ctx.json === "function") {
    try {
      const payload = await ctx.json();
      const msg = payload?.message;
      if (typeof msg === "string" && msg.trim()) return msg;
    } catch {
      // ignore
    }
  }

  const msg = anyErr?.message;
  if (typeof msg === "string" && msg.trim()) return msg;
  return "Erro inesperado.";
}

function downloadTemplate() {
  const rows: (string | number)[][] = [
    [...EXPECTED_HEADERS],
    ["maria@empresa.com", "Maria Silva", "COLABORADOR", "Vendas", "Analista", "(11) 99999-9999", 6500, "Temp123"],
    ["joao@empresa.com", "João Souza", "HEAD", "Vendas", "Coordenador", "", 12000, ""],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);

  (ws as any)["!cols"] = [
    { wch: 28 },
    { wch: 22 },
    { wch: 14 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 16 },
    { wch: 14 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "usuarios");
  XLSX.writeFile(wb, "modelo-importacao-usuarios.xlsx");
}

function parseWorkbook(fileName: string, buf: ArrayBuffer): { rows: ImportRow[]; warnings: string[] } {
  const wb = XLSX.read(buf, { type: "array" });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  if (!ws) return { rows: [], warnings: ["Arquivo sem planilha válida."] };

  const aoa: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" }) as any;
  if (!aoa.length) return { rows: [], warnings: ["Planilha vazia."] };

  const headerRow = (aoa[0] ?? []).map(normHeader);
  const colIndex = new Map<ExpectedHeader, number>();
  for (const h of EXPECTED_HEADERS) {
    const idx = headerRow.indexOf(h);
    if (idx >= 0) colIndex.set(h, idx);
  }

  if (!colIndex.has("email")) {
    return {
      rows: [],
      warnings: [
        `Cabeçalho inválido. A coluna "email" é obrigatória. Encontrado: ${headerRow.filter(Boolean).join(", ") || "(vazio)"}`,
        `Baixe o modelo e preencha a planilha com os mesmos cabeçalhos: ${EXPECTED_HEADERS.join(", ")}.`,
      ],
    };
  }

  const rows: ImportRow[] = [];

  for (let i = 1; i < aoa.length; i++) {
    const r = aoa[i] ?? [];
    const get = (key: ExpectedHeader) => {
      const idx = colIndex.get(key);
      if (idx === undefined) return "";
      return r[idx];
    };

    const email = String(get("email") ?? "")
      .trim()
      .toLowerCase();

    const hasAny = r.some((x) => String(x ?? "").trim().length > 0);
    if (!hasAny) continue;

    rows.push({
      rowNumber: i + 1,
      email,
      name: toOptionalString(get("name")),
      role: toRole(get("role")),
      department: toOptionalString(get("department")),
      job_title: toOptionalString(get("job_title")),
      phone: toOptionalString(get("phone")),
      monthly_cost_brl: toOptionalNumber(get("monthly_cost_brl")),
      password: toOptionalString(get("password")),
    });
  }

  return {
    rows,
    warnings: !rows.length
      ? [`Nenhuma linha encontrada para importar em "${fileName}" (verifique se há dados abaixo do cabeçalho).`]
      : [],
  };
}

export function ImportUsersPanel({
  companyId,
  onImported,
}: {
  companyId: string;
  onImported?: () => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const { data: departments = [] } = useQuery({
    queryKey: ["departments", companyId],
    queryFn: () => listDepartments(companyId),
  });

  const deptIdByName = useMemo(() => {
    const m = new Map<string, string>();
    for (const d of departments) m.set(d.name.trim().toLowerCase(), d.id);
    return m;
  }, [departments]);

  const [fileName, setFileName] = useState<string>("");
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fileWarnings, setFileWarnings] = useState<string[]>([]);

  const checks = useMemo<RowCheck[]>(() => {
    const out: RowCheck[] = [];

    for (const r of rows) {
      const messages: string[] = [];
      if (!r.email) messages.push("E-mail vazio.");
      if (r.email && !isEmail(r.email)) messages.push("E-mail inválido.");

      if (r.department) {
        const ok = deptIdByName.has(r.department.trim().toLowerCase());
        if (!ok) messages.push(`Departamento não encontrado: ${r.department}`);
      }

      if (r.password && r.password.trim().length > 0 && r.password.trim().length < 6) {
        messages.push("Senha temporária deve ter no mínimo 6 caracteres.");
      }

      out.push({ rowNumber: r.rowNumber, email: r.email, ok: messages.length === 0, messages });
    }

    return out;
  }, [rows, deptIdByName]);

  const okCount = useMemo(() => checks.filter((c) => c.ok).length, [checks]);
  const failCount = useMemo(() => checks.length - okCount, [checks, okCount]);
  const canImport = rows.length > 0 && failCount === 0;

  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  return (
    <div className="grid gap-6">
      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold text-[color:var(--sinaxys-ink)]">
              <Users className="h-4 w-4 text-[color:var(--sinaxys-primary)]" />
              Importar usuários
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Baixe o modelo em Excel, preencha e faça upload. O sistema valida (e-mail, departamento e senha) antes de provisionar.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button variant="outline" className="h-11 rounded-xl bg-white" onClick={downloadTemplate}>
              Baixar modelo
            </Button>

            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try {
                  setResults([]);
                  setProgress(null);
                  setFileName(f.name);
                  const buf = await f.arrayBuffer();
                  const parsed = parseWorkbook(f.name, buf);
                  setRows(parsed.rows);
                  setFileWarnings(parsed.warnings);
                } catch (err) {
                  setRows([]);
                  setFileWarnings([err instanceof Error ? err.message : "Não foi possível ler o arquivo."]); 
                }
              }}
            />

            <Button
              className="h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              onClick={() => fileRef.current?.click()}
            >
              <UploadCloud className="mr-2 h-4 w-4" />
              Selecionar arquivo
            </Button>
          </div>
        </div>

        {fileName ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
              {fileName}
            </Badge>
            {rows.length ? (
              <div className="text-xs text-muted-foreground">{rows.length} linhas</div>
            ) : null}
          </div>
        ) : null}

        {fileWarnings.length ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <div className="font-semibold">Atenção</div>
            <ul className="mt-2 list-disc pl-5">
              {fileWarnings.map((w, idx) => (
                <li key={idx}>{w}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {rows.length ? (
          <>
            <Separator className="my-5" />

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Prévia</div>
              <div className="text-xs text-muted-foreground">
                {okCount} ok • {failCount} com erro
              </div>
            </div>

            <ResponsiveTable className="mt-3" minWidth="980px">
              <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white">
                <Table className="min-w-[980px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Papel</TableHead>
                      <TableHead>Departamento</TableHead>
                      <TableHead className="text-right">Senha</TableHead>
                      <TableHead>Validação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.slice(0, 25).map((r) => {
                      const ck = checks.find((c) => c.rowNumber === r.rowNumber);
                      return (
                        <TableRow key={r.rowNumber}>
                          <TableCell className="text-muted-foreground">{r.rowNumber}</TableCell>
                          <TableCell className="font-medium">{r.email || "—"}</TableCell>
                          <TableCell>{r.name || "—"}</TableCell>
                          <TableCell>{r.role}</TableCell>
                          <TableCell>{r.department || "—"}</TableCell>
                          <TableCell className="text-right">{r.password ? "definida" : "convite"}</TableCell>
                          <TableCell>
                            {ck?.ok ? (
                              <span className="text-xs font-medium text-emerald-700">OK</span>
                            ) : (
                              <div className="text-xs text-destructive">
                                {(ck?.messages ?? ["Erro" ]).slice(0, 2).join(" ")}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {rows.length > 25 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-xs text-muted-foreground">
                          Mostrando 25 de {rows.length} linhas.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>
            </ResponsiveTable>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-muted-foreground">
                Dica: se preencher <span className="font-semibold">password</span>, o usuário é criado com senha temporária e troca no primeiro acesso.
              </div>

              <Button
                className="h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                disabled={running || !canImport}
                onClick={async () => {
                  try {
                    setRunning(true);
                    setResults([]);
                    setProgress({ done: 0, total: rows.length });

                    const next: Result[] = [];

                    for (let i = 0; i < rows.length; i++) {
                      const r = rows[i];
                      const deptName = r.department?.trim() || "";
                      const departmentId = deptName ? deptIdByName.get(deptName.toLowerCase()) ?? null : null;

                      const { data, error } = await supabase.functions.invoke("admin-invite-user", {
                        body: {
                          email: r.email,
                          name: r.name,
                          role: r.role,
                          departmentId,
                          jobTitle: r.job_title,
                          phone: r.phone,
                          password: r.password,
                        },
                      });

                      if (error) {
                        next.push({
                          rowNumber: r.rowNumber,
                          email: r.email,
                          ok: false,
                          message: await describeFunctionError(error),
                        });
                      } else if (data?.alreadyMember) {
                        // still consider OK
                        if (r.monthly_cost_brl && data?.profileId) {
                          await supabase.from("profiles").update({ monthly_cost_brl: r.monthly_cost_brl }).eq("id", data.profileId);
                        }
                        next.push({ rowNumber: r.rowNumber, email: r.email, ok: true, mode: "already", message: "Já existe na empresa" });
                      } else {
                        // Patch monthly cost (admin has UPDATE policy)
                        if (r.monthly_cost_brl && data?.userId) {
                          const { error: patchErr } = await supabase
                            .from("profiles")
                            .update({ monthly_cost_brl: r.monthly_cost_brl })
                            .eq("id", data.userId);
                          if (patchErr) {
                            next.push({
                              rowNumber: r.rowNumber,
                              email: r.email,
                              ok: true,
                              mode: data?.mode ?? (r.password ? "created" : "invited"),
                              message: "Provisionado, mas falhou ao salvar custo",
                            });
                          } else {
                            next.push({
                              rowNumber: r.rowNumber,
                              email: r.email,
                              ok: true,
                              mode: data?.mode ?? (r.password ? "created" : "invited"),
                              message: data?.mode === "created" ? "Criado com senha temporária" : "Convite enviado",
                            });
                          }
                        } else {
                          next.push({
                            rowNumber: r.rowNumber,
                            email: r.email,
                            ok: true,
                            mode: data?.mode ?? (r.password ? "created" : "invited"),
                            message: data?.mode === "created" ? "Criado com senha temporária" : "Convite enviado",
                          });
                        }
                      }

                      setProgress({ done: i + 1, total: rows.length });
                    }

                    setResults(next);
                    await qc.invalidateQueries({ queryKey: ["profiles", companyId] });

                    const ok = next.filter((x) => x.ok).length;
                    toast({ title: "Importação finalizada", description: `${ok} ok, ${next.length - ok} falhas.` });
                    onImported?.();
                  } catch (e) {
                    toast({
                      title: "Não foi possível importar",
                      description: e instanceof Error ? e.message : "Erro inesperado.",
                      variant: "destructive",
                    });
                  } finally {
                    setRunning(false);
                  }
                }}
              >
                {running ? "Importando…" : "Importar"}
              </Button>
            </div>

            {!canImport && rows.length ? (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                Corrija as linhas com erro antes de importar.
              </div>
            ) : null}

            {progress ? (
              <div className="mt-4 text-xs text-muted-foreground">
                Progresso: {progress.done}/{progress.total}
              </div>
            ) : null}

            {results.length ? (
              <>
                <Separator className="my-5" />
                <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Resultado</div>
                <div className="mt-3 grid gap-2">
                  {results.map((r) => (
                    <div
                      key={`${r.rowNumber}-${r.email}`}
                      className={
                        "rounded-2xl border p-3 text-sm " +
                        (r.ok
                          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                          : "border-red-200 bg-red-50 text-red-900")
                      }
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate font-medium">Linha {r.rowNumber} — {r.email}</div>
                          <div className="mt-1 text-xs opacity-90">{r.message}</div>
                        </div>
                        {r.ok ? (
                          <Badge className="rounded-full bg-white text-emerald-900 hover:bg-white">OK</Badge>
                        ) : (
                          <Badge className="rounded-full bg-white text-red-900 hover:bg-white">Erro</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </>
        ) : null}
      </Card>
    </div>
  );
}
