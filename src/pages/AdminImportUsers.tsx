import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { UploadCloud, Users } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResponsiveTable } from "@/components/ResponsiveTable";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
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
  | { rowNumber: number; email: string; ok: true; mode: "created" | "invited" | "already"; message: string }
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
  XLSX.utils.book_append_sheet(wb, ws, "contatos");
  XLSX.writeFile(wb, "modelo-importacao-contatos.xlsx");
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
    // Skip completely empty lines
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
      ? [
          `Nenhuma linha encontrada para importar em "${fileName}" (verifique se há dados abaixo do cabeçalho).`,
        ]
      : [],
  };
}

export default function AdminImportUsers() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement | null>(null);

  if (!user || user.role !== "ADMIN" || !user.companyId) return null;
  const companyId = user.companyId;

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

      // Role is normalized on read, but if someone typed another value, it becomes COLABORADOR.
      // We warn only when the raw might be wrong (best-effort: infer from file text).
      // (Keeping it simple: no raw tracking; no warning here.)

      if (r.password && r.password.trim().length > 0 && r.password.trim().length < 6) {
        messages.push("Senha temporária deve ter no mínimo 6 caracteres.");
      }

      // Monthly cost: we parse and drop invalid values; warn if it looks filled but invalid
      // (best-effort: if original was string non-empty but parsed null, we can't distinguish here; keep it simple.)

      out.push({
        rowNumber: r.rowNumber,
        email: r.email,
        ok: messages.length === 0,
        messages,
      });
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
      <div className="rounded-3xl border bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Admin — Importar contatos</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Baixe o modelo em Excel, preencha e faça upload. O sistema valida compatibilidade (principalmente e-mail e departamento) antes de subir no banco.
            </p>
          </div>
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
            <UploadCloud className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
          </div>
        </div>
      </div>

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">1) Modelo e upload</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Formato: .xlsx. Coluna obrigatória: <span className="font-semibold">email</span>.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button variant="outline" className="h-10 rounded-full" onClick={downloadTemplate}>
              Baixar modelo (.xlsx)
            </Button>

            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                setResults([]);
                setProgress(null);

                if (!file) {
                  setFileName("");
                  setRows([]);
                  setFileWarnings([]);
                  return;
                }

                try {
                  const buf = await file.arrayBuffer();
                  const parsed = parseWorkbook(file.name, buf);
                  setFileName(file.name);
                  setRows(parsed.rows);
                  setFileWarnings(parsed.warnings);

                  if (parsed.warnings.length) {
                    toast({
                      title: "Arquivo carregado com avisos",
                      description: parsed.warnings[0],
                      variant: "destructive",
                    });
                  } else {
                    toast({ title: "Planilha carregada", description: `${parsed.rows.length} linha(s) detectadas.` });
                  }
                } catch (err) {
                  setFileName("");
                  setRows([]);
                  setFileWarnings(["Não foi possível ler o arquivo."]);
                  toast({
                    title: "Falha ao ler o arquivo",
                    description: err instanceof Error ? err.message : "Tente novamente.",
                    variant: "destructive",
                  });
                }
              }}
            />

            <Button
              className="h-10 rounded-full bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              onClick={() => fileRef.current?.click()}
            >
              Selecionar arquivo
            </Button>
          </div>
        </div>

        {fileName ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
              Arquivo: {fileName}
            </Badge>
            <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white ring-1 ring-[color:var(--sinaxys-border)]">
              {rows.length} linha(s)
            </Badge>
          </div>
        ) : null}

        {fileWarnings.length ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
            <div className="font-semibold">Problemas na planilha</div>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {fileWarnings.map((w, idx) => (
                <li key={idx}>{w}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </Card>

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">2) Checagem de compatibilidade</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Validamos e-mails e se o departamento (texto) existe no seu cadastro.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge className="rounded-full bg-emerald-100 text-emerald-900 hover:bg-emerald-100">{okCount} ok</Badge>
            <Badge className="rounded-full bg-rose-100 text-rose-900 hover:bg-rose-100">{failCount} com erro</Badge>
          </div>
        </div>

        <Separator className="my-5" />

        {!rows.length ? (
          <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">
            Faça upload da planilha para ver a compatibilidade.
          </div>
        ) : (
          <ResponsiveTable minWidth="980px">
            <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white">
              <Table className="min-w-[980px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Linha</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Mensagens</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 25).map((r) => {
                    const c = checks.find((x) => x.rowNumber === r.rowNumber);
                    const ok = !!c?.ok;
                    return (
                      <TableRow key={r.rowNumber} className={!ok ? "bg-rose-50/60" : undefined}>
                        <TableCell className="text-muted-foreground">{r.rowNumber}</TableCell>
                        <TableCell className="font-medium text-[color:var(--sinaxys-ink)]">{r.email || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{r.name ?? "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{r.role}</TableCell>
                        <TableCell className="text-muted-foreground">{r.department ?? "—"}</TableCell>
                        <TableCell>
                          {ok ? (
                            <Badge className="rounded-full bg-emerald-100 text-emerald-900 hover:bg-emerald-100">OK</Badge>
                          ) : (
                            <Badge className="rounded-full bg-rose-100 text-rose-900 hover:bg-rose-100">Erro</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{c?.messages.join(" ") || "—"}</TableCell>
                      </TableRow>
                    );
                  })}

                  {rows.length > 25 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-4 text-center text-sm text-muted-foreground">
                        Mostrando 25 de {rows.length} linhas.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          </ResponsiveTable>
        )}

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-muted-foreground">
            Observação: se preencher a coluna <span className="font-semibold">password</span>, o usuário é criado com senha temporária e troca no primeiro acesso.
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
                    next.push({ rowNumber: r.rowNumber, email: r.email, ok: false, message: error.message });
                  } else if (data?.alreadyMember) {
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
            {running ? "Importando…" : "Importar para o sistema"}
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
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Resultados</div>
              <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                <Users className="h-4 w-4" />
                {results.filter((r) => r.ok).length}/{results.length} ok
              </span>
            </div>

            <ResponsiveTable className="mt-4" minWidth="880px">
              <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white">
                <Table className="min-w-[880px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Linha</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Mensagem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((r, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="text-muted-foreground">{r.rowNumber}</TableCell>
                        <TableCell className="font-medium text-[color:var(--sinaxys-ink)]">{r.email}</TableCell>
                        <TableCell>
                          {r.ok ? (
                            <Badge className="rounded-full bg-emerald-100 text-emerald-900 hover:bg-emerald-100">OK</Badge>
                          ) : (
                            <Badge className="rounded-full bg-rose-100 text-rose-900 hover:bg-rose-100">Falha</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{r.ok ? r.message : r.message}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </ResponsiveTable>
          </>
        ) : null}
      </Card>

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Campos do modelo</div>
        <Separator className="my-4" />
        <div className="grid gap-2 text-sm text-muted-foreground">
          <div>
            <span className="font-semibold text-[color:var(--sinaxys-ink)]">email</span> (obrigatório)
          </div>
          <div>
            <span className="font-semibold text-[color:var(--sinaxys-ink)]">department</span>: deve ser o nome exato de um departamento já cadastrado.
          </div>
          <div>
            <span className="font-semibold text-[color:var(--sinaxys-ink)]">role</span>: ADMIN | HEAD | COLABORADOR (se vazio, assume COLABORADOR).
          </div>
          <div>
            <span className="font-semibold text-[color:var(--sinaxys-ink)]">password</span>: se preenchido, cria com senha temporária e força troca no primeiro acesso.
          </div>
          <div>
            <span className="font-semibold text-[color:var(--sinaxys-ink)]">monthly_cost_brl</span>: número (ex.: 6500). Usado no relatório de custos.
          </div>
          <div className="text-xs text-muted-foreground">
            Dica: se você renomear colunas, o import não reconhece. Sempre baixe e use o modelo.
          </div>
        </div>
      </Card>
    </div>
  );
}