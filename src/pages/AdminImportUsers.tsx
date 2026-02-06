import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import * as XLSX from "xlsx";
import { ArrowLeft, Download, FileSpreadsheet, Upload } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { mockDb } from "@/lib/mockDb";

type ParsedRow = {
  email: string;
  name: string;
  role: "HEAD" | "COLABORADOR";
  department: string;
  managerEmail?: string;
  phone?: string;
  monthlyCostBRL?: number;
  contractUrl?: string;
  avatarUrl?: string;
  active?: boolean;
  initialPassword?: string;
  joinedAt?: string;
};

type RowIssue = { rowIndex: number; message: string };

function norm(s: unknown) {
  return String(s ?? "").trim();
}

function normHeader(s: string) {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/(^_|_$)/g, "");
}

function parseRole(raw: string): ParsedRow["role"] | null {
  const v = raw.trim().toLowerCase();
  if (!v) return null;
  if (["head", "gestor", "lider", "lideranca", "liderança"].includes(v)) return "HEAD";
  if (["colaborador", "colab", "colaboradora", "funcionario", "funcionaria"].includes(v)) return "COLABORADOR";
  if (v === "head_de_departamento") return "HEAD";
  if (v === "colaborador" || v === "colaborador(a)") return "COLABORADOR";
  if (v === "head" || v === "colaborador") return v.toUpperCase() as any;
  return null;
}

function parseBool(raw: string): boolean | undefined {
  const v = raw.trim().toLowerCase();
  if (!v) return undefined;
  if (["1", "true", "sim", "s", "yes", "y"].includes(v)) return true;
  if (["0", "false", "nao", "não", "n", "no"].includes(v)) return false;
  return undefined;
}

function parseMoneyBRL(raw: string): number | undefined {
  const cleaned = raw.replace(/[^0-9]/g, "");
  if (!cleaned) return undefined;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return undefined;
  return n;
}

function parseDateISO(raw: string): string | undefined {
  const v = raw.trim();
  if (!v) return undefined;
  // Accept YYYY-MM-DD or ISO; store full ISO.
  const d = new Date(v);
  if (!Number.isFinite(d.getTime())) return undefined;
  return d.toISOString();
}

function mapRow(obj: Record<string, any>): { row: Partial<ParsedRow>; issues: string[] } {
  const issues: string[] = [];
  const byKey = new Map<string, any>();
  for (const [k, v] of Object.entries(obj)) byKey.set(normHeader(k), v);

  const get = (...keys: string[]) => {
    for (const k of keys) {
      const v = byKey.get(k);
      if (v !== undefined) return norm(v);
    }
    return "";
  };

  const email = get("email", "e_mail", "e_mail", "e_mail", "e_mail", "e_mail");
  const name = get("name", "nome", "colaborador", "pessoa");
  const roleRaw = get("role", "papel", "perfil", "cargo", "funcao", "funcao");
  const department = get("department", "departamento", "area", "setor");

  const managerEmail = get("manager_email", "gestor_email", "lider_email", "leader_email", "email_gestor", "email_lider") || undefined;
  const phone = get("phone", "telefone", "celular") || undefined;
  const contractUrl = get("contract_url", "contrato", "contract", "link_contrato") || undefined;
  const avatarUrl = get("avatar_url", "foto", "avatar") || undefined;
  const monthlyCostRaw = get("monthlycostbrl", "monthly_cost_brl", "custo_mensal", "salario", "salario_brl", "custo_brl");
  const activeRaw = get("active", "ativo", "status");
  const initialPassword = get("initial_password", "senha_inicial", "senha") || undefined;
  const joinedAtRaw = get("joined_at", "admissao", "admissao_em", "data_admissao", "entrada") || undefined;

  if (!email || !email.includes("@")) issues.push("E-mail inválido.");
  if (!name) issues.push("Nome é obrigatório.");

  const role = parseRole(roleRaw);
  if (!role) issues.push("Role inválido. Use HEAD ou COLABORADOR.");

  if (!department) issues.push("Departamento é obrigatório.");

  const monthlyCostBRL = monthlyCostRaw ? parseMoneyBRL(monthlyCostRaw) : undefined;
  const active = activeRaw ? parseBool(activeRaw) : undefined;

  const joinedAt = joinedAtRaw ? parseDateISO(joinedAtRaw) : undefined;
  if (joinedAtRaw && !joinedAt) issues.push("Data de admissão inválida. Use YYYY-MM-DD.");

  const password = initialPassword?.trim();
  if (password && password.length < 6) issues.push("Senha inicial muito curta (mínimo 6 caracteres).");

  return {
    row: {
      email: email.toLowerCase(),
      name,
      role: role ?? undefined,
      department,
      managerEmail: managerEmail ? managerEmail.toLowerCase() : undefined,
      phone,
      monthlyCostBRL,
      contractUrl,
      avatarUrl,
      active,
      initialPassword: password || undefined,
      joinedAt,
    },
    issues,
  };
}

function downloadTemplate() {
  const rows = [
    {
      email: "joao@empresa.com",
      nome: "João da Silva",
      role: "COLABORADOR",
      departamento: "Produto",
      gestor_email: "camila@empresa.com",
      telefone: "+55 11 98888-1111",
      custo_mensal: 6500,
      contrato: "https://app.clicksign.com/...",
      avatar_url: "https://...",
      ativo: "sim",
      senha_inicial: "",
      admissao: "2024-01-15",
    },
  ];

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "modelo");
  XLSX.writeFile(wb, "modelo_importacao_usuarios_sinaxys.xlsx");
}

export default function AdminImportUsers() {
  const { toast } = useToast();
  const { user } = useAuth();

  const [fileName, setFileName] = useState<string>("");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [issues, setIssues] = useState<RowIssue[]>([]);
  const [importing, setImporting] = useState(false);

  const companyId = user?.companyId ?? null;

  const preview = useMemo(() => rows.slice(0, 15), [rows]);

  if (!user || user.role !== "ADMIN" || !companyId) return null;

  const hasErrors = issues.length > 0;

  const parseFile = async (file: File) => {
    setFileName(file.name);
    setRows([]);
    setIssues([]);

    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];

    const raw = XLSX.utils.sheet_to_json(ws, { defval: "" }) as Record<string, any>[];

    const nextRows: ParsedRow[] = [];
    const nextIssues: RowIssue[] = [];

    raw.forEach((obj, idx) => {
      const mapped = mapRow(obj);
      if (mapped.issues.length) {
        mapped.issues.forEach((m) => nextIssues.push({ rowIndex: idx + 2, message: m }));
        return;
      }

      const r = mapped.row as ParsedRow;
      nextRows.push(r);
    });

    // Basic duplicates check
    const seen = new Set<string>();
    for (const r of nextRows) {
      const key = r.email.toLowerCase();
      if (seen.has(key)) nextIssues.push({ rowIndex: -1, message: `E-mail duplicado na planilha: ${r.email}` });
      seen.add(key);
    }

    setRows(nextRows);
    setIssues(nextIssues);
  };

  return (
    <div className="grid gap-6">
      <div className="rounded-3xl border bg-white p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Importar colaboradores e heads</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Faça upload de uma planilha (.xlsx) para criar/atualizar usuários em massa — incluindo departamento e líder direto.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
                Colunas mínimas: email, nome, role, departamento
              </Badge>
              <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white">
                Opcional: gestor_email, telefone, custo_mensal, contrato, avatar_url, ativo, senha_inicial, admissao
              </Badge>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="rounded-xl" onClick={downloadTemplate}>
              <Download className="mr-2 h-4 w-4" />
              Baixar modelo
            </Button>
            <Button asChild variant="outline" className="rounded-xl">
              <Link to="/admin/users">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Link>
            </Button>
          </div>
        </div>

        <Separator className="my-5" />

        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Arquivo</div>
            <div className="mt-1 text-sm text-muted-foreground">
              {fileName ? (
                <span className="inline-flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-[color:var(--sinaxys-primary)]" />
                  {fileName}
                </span>
              ) : (
                "Nenhum arquivo selecionado"
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="h-11 cursor-pointer rounded-xl bg-white"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                parseFile(f).catch((err) => {
                  toast({
                    title: "Não foi possível ler a planilha",
                    description: err instanceof Error ? err.message : "Verifique o arquivo e tente novamente.",
                    variant: "destructive",
                  });
                });
              }}
            />

            <Button
              className="h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              disabled={importing || !rows.length || hasErrors}
              onClick={() => {
                try {
                  setImporting(true);
                  const result = mockDb.importUsersBulk({ companyId, rows });
                  toast({
                    title: "Importação concluída",
                    description: `Criados: ${result.created} • Atualizados: ${result.updated} • Vínculos de liderança: ${result.managersLinked}`,
                  });
                  setRows([]);
                  setIssues([]);
                  setFileName("");
                } catch (e) {
                  toast({
                    title: "Não foi possível importar",
                    description: e instanceof Error ? e.message : "Tente novamente.",
                    variant: "destructive",
                  });
                } finally {
                  setImporting(false);
                }
              }}
            >
              <Upload className="mr-2 h-4 w-4" />
              {importing ? "Importando…" : "Importar"}
            </Button>
          </div>
        </div>

        {hasErrors ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
            <div className="font-semibold">Ajustes necessários</div>
            <ul className="mt-2 grid gap-1 text-xs">
              {issues.slice(0, 12).map((i, idx) => (
                <li key={idx}>
                  {i.rowIndex > 0 ? `Linha ${i.rowIndex}: ` : ""}
                  {i.message}
                </li>
              ))}
            </ul>
            {issues.length > 12 ? (
              <div className="mt-2 text-xs text-rose-900/80">+{issues.length - 12} outros apontamentos</div>
            ) : null}
          </div>
        ) : null}

        {!rows.length && !hasErrors ? (
          <div className="mt-4 rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">
            Baixe o modelo para preencher e depois selecione a planilha para validar e visualizar um preview antes de importar.
          </div>
        ) : null}
      </div>

      {rows.length ? (
        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Preview</div>
              <div className="mt-1 text-sm text-muted-foreground">Mostrando {preview.length} de {rows.length} linhas válidas.</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge className="rounded-full bg-emerald-100 text-emerald-900 hover:bg-emerald-100">{rows.length} válidas</Badge>
              <Badge className={"rounded-full hover:bg-amber-100 " + (hasErrors ? "bg-rose-100 text-rose-900" : "bg-amber-100 text-amber-900")}>
                {issues.length} avisos
              </Badge>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto rounded-2xl border border-[color:var(--sinaxys-border)]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Gestor (email)</TableHead>
                  <TableHead>Admissão</TableHead>
                  <TableHead>Ativo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.map((r) => (
                  <TableRow key={r.email}>
                    <TableCell className="font-medium text-[color:var(--sinaxys-ink)]">{r.name}</TableCell>
                    <TableCell className="text-muted-foreground">{r.email}</TableCell>
                    <TableCell>
                      <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
                        {r.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{r.department}</TableCell>
                    <TableCell className="text-muted-foreground">{r.managerEmail ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.joinedAt ? new Date(r.joinedAt).toLocaleDateString("pt-BR") : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge className={"rounded-full " + ((r.active ?? true) ? "bg-emerald-100 text-emerald-900 hover:bg-emerald-100" : "bg-amber-100 text-amber-900 hover:bg-amber-100")}>
                        {(r.active ?? true) ? "Sim" : "Não"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-3 text-xs text-muted-foreground">
            Dica: use <span className="font-medium text-[color:var(--sinaxys-ink)]">senha_inicial</span> para forçar troca no primeiro acesso.
          </div>
        </Card>
      ) : null}
    </div>
  );
}