import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import * as XLSX from "xlsx";
import {
  ArrowLeft,
  ChevronDown,
  Download,
  FileSpreadsheet,
  Upload,
  Wand2,
  AlertTriangle,
  ArrowRightLeft,
  Eye,
  EyeOff,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { mockDb } from "@/lib/mockDb";

type ParsedRow = {
  email: string;
  name: string;
  role: "ADMIN" | "HEAD" | "COLABORADOR";
  department?: string;
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

type ImportStage = "idle" | "mapping" | "preview";

type FieldKey =
  | "email"
  | "name"
  | "role"
  | "department"
  | "managerEmail"
  | "phone"
  | "monthlyCostBRL"
  | "contractUrl"
  | "avatarUrl"
  | "active"
  | "initialPassword"
  | "joinedAt";

type FieldSpec = {
  key: FieldKey;
  label: string;
  hint?: string;
};

const FIELDS: FieldSpec[] = [
  { key: "email", label: "E-mail", hint: "Precisa conter @" },
  { key: "name", label: "Nome" },
  { key: "role", label: "Role", hint: "ADMIN, HEAD ou COLABORADOR" },
  { key: "department", label: "Departamento", hint: "Obrigatório para HEAD/COLABORADOR" },
  { key: "managerEmail", label: "Gestor (e-mail)", hint: "Opcional" },
  { key: "phone", label: "Telefone", hint: "Opcional" },
  { key: "monthlyCostBRL", label: "Custo mensal (R$)", hint: "Opcional" },
  { key: "contractUrl", label: "Contrato (link)", hint: "Opcional" },
  { key: "avatarUrl", label: "Avatar (URL)", hint: "Opcional" },
  { key: "active", label: "Ativo", hint: "sim/não" },
  { key: "initialPassword", label: "Senha inicial", hint: "mín. 6 (se preenchida)" },
  { key: "joinedAt", label: "Admissão", hint: "YYYY-MM-DD" },
];

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
  if (["admin", "administrador", "administradora"].includes(v)) return "ADMIN";
  if (["head", "gestor", "lider", "lideranca", "liderança"].includes(v)) return "HEAD";
  if (["colaborador", "colab", "colaboradora", "funcionario", "funcionaria"].includes(v)) return "COLABORADOR";
  if (v === "head_de_departamento") return "HEAD";
  if (v === "colaborador" || v === "colaborador(a)") return "COLABORADOR";
  if (["admin", "head", "colaborador"].includes(v)) return v.toUpperCase() as any;
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

function headerAliases(): Record<FieldKey, string[]> {
  return {
    email: ["email", "e_mail", "mail"],
    name: ["nome", "name", "colaborador", "pessoa"],
    role: ["role", "papel", "perfil", "funcao", "funcao", "cargo"],
    department: ["department", "departamento", "area", "setor"],
    managerEmail: ["manager_email", "gestor_email", "lider_email", "leader_email", "email_gestor", "email_lider"],
    phone: ["phone", "telefone", "celular"],
    monthlyCostBRL: ["monthly_cost_brl", "custo_mensal", "salario", "salario_brl", "custo_brl", "monthlycostbrl"],
    contractUrl: ["contract_url", "contrato", "contract", "link_contrato"],
    avatarUrl: ["avatar_url", "foto", "avatar"],
    active: ["active", "ativo", "status"],
    initialPassword: ["initial_password", "senha_inicial", "senha"],
    joinedAt: ["joined_at", "admissao", "admissao_em", "data_admissao", "entrada"],
  };
}

function fieldValueScore(field: FieldKey, v: string): number {
  const value = v.trim();
  if (!value) return 0;

  if (field === "email" || field === "managerEmail") return value.includes("@") ? 1 : -1;
  if (field === "role") return parseRole(value) ? 1 : -0.5;
  if (field === "active") return parseBool(value) !== undefined ? 1 : -0.5;
  if (field === "joinedAt") return parseDateISO(value) ? 1 : -0.5;
  if (field === "monthlyCostBRL") return parseMoneyBRL(value) !== undefined ? 1 : -0.5;
  if (field === "contractUrl" || field === "avatarUrl") {
    const looksUrl = /^https?:\/\//i.test(value) || value.startsWith("data:");
    return looksUrl ? 0.7 : 0;
  }

  // name, department, phone, initialPassword
  if (field === "initialPassword") return value.length >= 6 ? 0.6 : 0.2;
  return 0.2;
}

function suggestMapping(headers: string[], dataRows: any[][]): Record<FieldKey, string | null> {
  const aliases = headerAliases();
  const normHeaders = headers.map((h) => normHeader(h));

  const sampleRows = dataRows.slice(0, 20);

  const pickBest = (field: FieldKey): string | null => {
    let best: { header: string; score: number } | null = null;

    headers.forEach((h, idx) => {
      const nk = normHeaders[idx];
      const aliasHit = aliases[field].includes(nk) ? 2 : 0;

      let sampleScore = 0;
      let count = 0;
      for (const r of sampleRows) {
        const val = norm(r[idx]);
        if (!val) continue;
        sampleScore += fieldValueScore(field, val);
        count += 1;
      }

      const avgSample = count ? sampleScore / count : 0;
      const score = aliasHit + avgSample;

      if (!best || score > best.score) best = { header: h, score };
    });

    // If nothing looks even remotely plausible, return null.
    if (!best) return null;
    if (best.score <= 0.2) return null;
    return best.header;
  };

  return {
    email: pickBest("email"),
    name: pickBest("name"),
    role: pickBest("role"),
    department: pickBest("department"),
    managerEmail: pickBest("managerEmail"),
    phone: pickBest("phone"),
    monthlyCostBRL: pickBest("monthlyCostBRL"),
    contractUrl: pickBest("contractUrl"),
    avatarUrl: pickBest("avatarUrl"),
    active: pickBest("active"),
    initialPassword: pickBest("initialPassword"),
    joinedAt: pickBest("joinedAt"),
  };
}

function analyzeMapping(headers: string[], dataRows: any[][], mapping: Record<FieldKey, string | null>) {
  const idxByHeader = new Map(headers.map((h, i) => [h, i] as const));
  const sampleRows = dataRows.slice(0, 30);

  const result: Record<FieldKey, { confidence: number; message?: string }> = {} as any;

  for (const f of FIELDS) {
    const header = mapping[f.key];
    if (!header) {
      result[f.key] = { confidence: 1, message: "—" };
      continue;
    }

    const idx = idxByHeader.get(header);
    if (idx === undefined) {
      result[f.key] = { confidence: 0, message: "Coluna inválida." };
      continue;
    }

    let score = 0;
    let count = 0;
    for (const r of sampleRows) {
      const val = norm(r[idx]);
      if (!val) continue;
      score += Math.max(-1, Math.min(1, fieldValueScore(f.key, val)));
      count += 1;
    }

    const avg = count ? score / count : 0;
    const confidence = Math.max(0, Math.min(1, (avg + 1) / 2)); // map [-1..1] => [0..1]

    let message: string | undefined;
    if (confidence < 0.45) message = "Parece não bater com o tipo de dado esperado.";

    result[f.key] = { confidence, message };
  }

  return result;
}

function mapRowsFromMapping(headers: string[], dataRows: any[][], mapping: Record<FieldKey, string | null>) {
  const idxByHeader = new Map(headers.map((h, i) => [h, i] as const));

  const read = (row: any[], key: FieldKey) => {
    const h = mapping[key];
    if (!h) return "";
    const idx = idxByHeader.get(h);
    if (idx === undefined) return "";
    return norm(row[idx]);
  };

  const out: ParsedRow[] = [];
  const issues: RowIssue[] = [];

  dataRows.forEach((row, idx) => {
    const rowIndex = idx + 2; // assumes header on line 1

    const email = read(row, "email").toLowerCase();
    const name = read(row, "name");
    const roleRaw = read(row, "role");
    const department = read(row, "department");

    const role = parseRole(roleRaw);

    const managerEmail = read(row, "managerEmail").toLowerCase() || undefined;
    const phone = read(row, "phone") || undefined;
    const contractUrl = read(row, "contractUrl") || undefined;
    const avatarUrl = read(row, "avatarUrl") || undefined;
    const monthlyCostRaw = read(row, "monthlyCostBRL");
    const activeRaw = read(row, "active");
    const initialPassword = read(row, "initialPassword") || undefined;
    const joinedAtRaw = read(row, "joinedAt") || undefined;

    const rowErrs: string[] = [];

    if (!email || !email.includes("@")) rowErrs.push("E-mail inválido.");
    if (!name) rowErrs.push("Nome é obrigatório.");

    if (!role) rowErrs.push("Role inválido. Use ADMIN, HEAD ou COLABORADOR.");

    if (role && role !== "ADMIN") {
      if (!department) rowErrs.push("Departamento é obrigatório para HEAD/COLABORADOR.");
    }

    const monthlyCostBRL = monthlyCostRaw ? parseMoneyBRL(monthlyCostRaw) : undefined;
    const active = activeRaw ? parseBool(activeRaw) : undefined;

    const joinedAt = joinedAtRaw ? parseDateISO(joinedAtRaw) : undefined;
    if (joinedAtRaw && !joinedAt) rowErrs.push("Data de admissão inválida. Use YYYY-MM-DD.");

    const password = initialPassword?.trim();
    if (password && password.length < 6) rowErrs.push("Senha inicial muito curta (mínimo 6 caracteres).");

    if (rowErrs.length) {
      rowErrs.forEach((m) => issues.push({ rowIndex, message: m }));
      return;
    }

    out.push({
      email,
      name,
      role: role!,
      department: role === "ADMIN" ? undefined : department,
      managerEmail: role === "ADMIN" ? undefined : (managerEmail && managerEmail.includes("@") ? managerEmail : undefined),
      phone,
      monthlyCostBRL,
      contractUrl,
      avatarUrl,
      active,
      initialPassword: password || undefined,
      joinedAt,
    });
  });

  // Basic duplicates check
  const seen = new Set<string>();
  for (const r of out) {
    const key = r.email.toLowerCase();
    if (seen.has(key)) issues.push({ rowIndex: -1, message: `E-mail duplicado na planilha: ${r.email}` });
    seen.add(key);
  }

  return { rows: out, issues };
}

function downloadTemplate() {
  const rows = [
    {
      email: "admin@empresa.com",
      nome: "Admin da Empresa",
      role: "ADMIN",
      departamento: "", // opcional para ADMIN
      gestor_email: "",
      telefone: "+55 11 90000-0000",
      custo_mensal: "",
      contrato: "",
      avatar_url: "",
      ativo: "sim",
      senha_inicial: "",
      admissao: "2024-01-15",
    },
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

  const [stage, setStage] = useState<ImportStage>("idle");
  const [fileName, setFileName] = useState<string>("");

  const [headers, setHeaders] = useState<string[]>([]);
  const [dataRows, setDataRows] = useState<any[][]>([]);
  const [mapping, setMapping] = useState<Record<FieldKey, string | null>>({
    email: null,
    name: null,
    role: null,
    department: null,
    managerEmail: null,
    phone: null,
    monthlyCostBRL: null,
    contractUrl: null,
    avatarUrl: null,
    active: null,
    initialPassword: null,
    joinedAt: null,
  });

  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [issues, setIssues] = useState<RowIssue[]>([]);
  const [importing, setImporting] = useState(false);
  const [showRawTable, setShowRawTable] = useState(false);

  const companyId = user?.companyId ?? null;

  const preview = useMemo(() => rows.slice(0, 15), [rows]);

  const idxByHeader = useMemo(() => new Map(headers.map((h, i) => [h, i] as const)), [headers]);

  const mappingAnalysis = useMemo(() => {
    if (!headers.length || !dataRows.length) return null;
    return analyzeMapping(headers, dataRows, mapping);
  }, [headers, dataRows, mapping]);

  const needsDepartment = useMemo(() => {
    if (!headers.length || !dataRows.length) return true;
    if (!mapping.role) return true;
    const idx = idxByHeader.get(mapping.role);
    if (idx === undefined) return true;

    for (const r of dataRows.slice(0, 80)) {
      const role = parseRole(norm(r[idx]));
      if (role && role !== "ADMIN") return true;
    }
    return false;
  }, [headers, dataRows, mapping.role, idxByHeader]);

  const isRequiredNow = (key: FieldKey) => {
    if (key === "email" || key === "name" || key === "role") return true;
    if (key === "department") return needsDepartment;
    return false;
  };

  const hasErrors = issues.length > 0;

  if (!user || user.role !== "ADMIN" || !companyId) return null;

  const mappingMissingRequired = (Object.keys(mapping) as FieldKey[]).some((k) => isRequiredNow(k) && !mapping[k]);

  const mappingHasLowConfidenceRequired =
    !!mappingAnalysis &&
    (Object.keys(mapping) as FieldKey[]).some((k) => {
      if (!isRequiredNow(k)) return false;
      const conf = mappingAnalysis[k]?.confidence ?? 1;
      return conf < 0.55;
    });

  const parseFile = async (file: File) => {
    setFileName(file.name);
    setRows([]);
    setIssues([]);
    setStage("idle");
    setShowRawTable(false);

    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];

    // Read as matrix so we can control headers + mapping safely.
    const grid = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as any[][];
    const headerRow = (grid[0] ?? []).map((h) => norm(h));
    const body = (grid.slice(1) ?? []).filter((r) => r.some((x) => norm(x)));

    if (!headerRow.length || headerRow.every((h) => !h)) {
      throw new Error("Não foi possível identificar a linha de cabeçalho. Use a 1ª linha como nomes das colunas.");
    }

    // Ensure unique and readable header labels
    const used = new Map<string, number>();
    const safeHeaders = headerRow.map((h, idx) => {
      const base = h.trim() || `col_${idx + 1}`;
      const n = used.get(base) ?? 0;
      used.set(base, n + 1);
      return n ? `${base} (${n + 1})` : base;
    });

    setHeaders(safeHeaders);
    setDataRows(body);

    const suggested = suggestMapping(safeHeaders, body);
    setMapping(suggested);
    setStage("mapping");
  };

  const generatePreview = () => {
    if (!headers.length) return;

    const { rows: parsed, issues: nextIssues } = mapRowsFromMapping(headers, dataRows, mapping);
    setRows(parsed);
    setIssues(nextIssues);
    setStage("preview");
  };

  const sampleByField = useMemo(() => {
    const sampleRows = dataRows.slice(0, 12);
    const out: Record<FieldKey, string[]> = {
      email: [],
      name: [],
      role: [],
      department: [],
      managerEmail: [],
      phone: [],
      monthlyCostBRL: [],
      contractUrl: [],
      avatarUrl: [],
      active: [],
      initialPassword: [],
      joinedAt: [],
    };

    for (const f of FIELDS) {
      const h = mapping[f.key];
      if (!h) continue;
      const idx = idxByHeader.get(h);
      if (idx === undefined) continue;

      const values: string[] = [];
      for (const r of sampleRows) {
        const v = norm(r[idx]);
        if (!v) continue;
        values.push(v);
        if (values.length >= 3) break;
      }
      out[f.key] = values;
    }

    return out;
  }, [dataRows, mapping, idxByHeader]);

  return (
    <div className="grid gap-6">
      <div className="rounded-3xl border bg-white p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Importar usuários (admins, heads e colaboradores)</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Faça upload de uma planilha (.xlsx/.csv) para criar/atualizar usuários em massa — com confirmação de colunas para evitar conflito de dados.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
                Obrigatório: email, nome, role
              </Badge>
              <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white">
                Departamento: obrigatório para HEAD/COLABORADOR
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
          </div>
        </div>

        {stage === "mapping" && headers.length ? (
          <div className="mt-5 grid gap-4">
            <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-[color:var(--sinaxys-ink)]">
                    <Wand2 className="h-4 w-4 text-[color:var(--sinaxys-primary)]" />
                    Confirme o mapeamento das colunas
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Se algo ficar com baixa confiança, escolha manualmente a coluna correta.
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
                    {headers.length} colunas
                  </Badge>
                  {mappingHasLowConfidenceRequired ? (
                    <Badge className="rounded-full bg-amber-100 text-amber-900 hover:bg-amber-100">
                      <AlertTriangle className="mr-1 h-3.5 w-3.5" />
                      Revisar campos obrigatórios
                    </Badge>
                  ) : null}
                </div>
              </div>

              <Separator className="my-4" />

              <div className="grid gap-3 md:grid-cols-2">
                {FIELDS.map((f) => {
                  const analysis = mappingAnalysis?.[f.key];
                  const confidence = analysis?.confidence ?? 1;
                  const requiredNow = isRequiredNow(f.key);
                  const isLow = requiredNow ? confidence < 0.55 : confidence < 0.45;
                  const value = mapping[f.key] ?? "";

                  return (
                    <div
                      key={f.key}
                      className={
                        "rounded-2xl border p-3 " +
                        (requiredNow && !value
                          ? "border-rose-200 bg-rose-50"
                          : requiredNow && isLow
                            ? "border-amber-200 bg-amber-50"
                            : "border-[color:var(--sinaxys-border)] bg-white")
                      }
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">
                            {f.label}{" "}
                            {requiredNow ? <span className="text-rose-600">*</span> : null}
                          </div>
                          {f.hint ? <div className="mt-0.5 text-xs text-muted-foreground">{f.hint}</div> : null}
                        </div>
                        {analysis?.message && (requiredNow || isLow) ? (
                          <div className="text-xs font-medium text-amber-900">{analysis.message}</div>
                        ) : null}
                      </div>

                      <div className="mt-2">
                        <Select
                          value={mapping[f.key] ?? "__none__"}
                          onValueChange={(v) =>
                            setMapping((m) => ({
                              ...m,
                              [f.key]: v === "__none__" ? null : v,
                            }))
                          }
                        >
                          <SelectTrigger className="h-11 rounded-xl">
                            <SelectValue placeholder={requiredNow ? "Selecione a coluna" : "—"} />
                          </SelectTrigger>
                          <SelectContent>
                            {!requiredNow ? <SelectItem value="__none__">—</SelectItem> : null}
                            {headers.map((h) => (
                              <SelectItem key={h} value={h}>
                                {h}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                          <div>
                            Confiança: <span className="font-medium text-[color:var(--sinaxys-ink)]">{Math.round(confidence * 100)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <Separator className="my-4" />

              <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
                <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[color:var(--sinaxys-ink)]">
                    <ArrowRightLeft className="h-4 w-4 text-[color:var(--sinaxys-primary)]" />
                    Amostra (por campo)
                  </div>
                  <div className="mt-2 overflow-hidden rounded-2xl border border-[color:var(--sinaxys-border)] bg-white">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[160px]">Campo</TableHead>
                          <TableHead className="w-[220px]">Coluna</TableHead>
                          <TableHead>Exemplos</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {FIELDS.filter((f) => isRequiredNow(f.key) || mapping[f.key]).map((f) => (
                          <TableRow key={f.key}>
                            <TableCell className="font-medium text-[color:var(--sinaxys-ink)]">
                              {f.label}
                              {isRequiredNow(f.key) ? <span className="ml-1 text-rose-600">*</span> : null}
                            </TableCell>
                            <TableCell className="text-muted-foreground">{mapping[f.key] ?? "—"}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {(sampleByField[f.key] ?? []).length
                                ? (sampleByField[f.key] ?? []).join(" • ")
                                : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="mt-3 text-xs text-muted-foreground">
                    Dica: se algo estiver estranho aqui, ajuste o mapeamento antes de gerar o preview.
                  </div>
                </div>

                <div className="grid gap-3">
                  <Collapsible open={showRawTable} onOpenChange={setShowRawTable}>
                    <div className="flex items-center justify-between rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-3">
                      <div>
                        <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Tabela original</div>
                        <div className="text-xs text-muted-foreground">(opcional) para conferir tudo</div>
                      </div>
                      <CollapsibleTrigger asChild>
                        <Button variant="outline" className="rounded-xl">
                          {showRawTable ? (
                            <>
                              <EyeOff className="mr-2 h-4 w-4" />
                              Ocultar
                            </>
                          ) : (
                            <>
                              <Eye className="mr-2 h-4 w-4" />
                              Ver
                            </>
                          )}
                          <ChevronDown className={"ml-2 h-4 w-4 transition " + (showRawTable ? "rotate-180" : "")} />
                        </Button>
                      </CollapsibleTrigger>
                    </div>

                    <CollapsibleContent>
                      <div className="mt-3 rounded-2xl border border-[color:var(--sinaxys-border)] bg-white">
                        <ScrollArea className="h-[260px] w-full">
                          <div className="min-w-[880px]">
                            <table className="w-full text-xs">
                              <thead className="sticky top-0 bg-white">
                                <tr className="border-b border-[color:var(--sinaxys-border)]">
                                  {headers.map((h) => (
                                    <th key={h} className="px-2 py-2 text-left font-semibold text-[color:var(--sinaxys-ink)]">
                                      {h}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {dataRows.slice(0, 10).map((r, ridx) => (
                                  <tr key={ridx} className="border-b border-[color:var(--sinaxys-border)] last:border-b-0">
                                    {headers.map((_, cidx) => (
                                      <td key={cidx} className="px-2 py-2 text-muted-foreground">
                                        {norm(r[cidx]).slice(0, 60) || "—"}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </ScrollArea>
                        <div className="border-t border-[color:var(--sinaxys-border)] p-3 text-xs text-muted-foreground">
                          Mostrando 10 primeiras linhas. A rolagem fica contida para não "estourar" a tela.
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  <Button
                    className="h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                    disabled={mappingMissingRequired}
                    onClick={() => {
                      if (mappingHasLowConfidenceRequired) {
                        toast({
                          title: "Atenção",
                          description:
                            "Alguns campos obrigatórios não parecem bater com o tipo de dado. Revise o mapeamento antes de gerar o preview.",
                          variant: "destructive",
                        });
                        return;
                      }
                      generatePreview();
                    }}
                  >
                    Validar e gerar preview
                  </Button>

                  <div className="text-xs text-muted-foreground">
                    * Campos obrigatórios variam: <span className="font-medium text-[color:var(--sinaxys-ink)]">Departamento</span> só é obrigatório se houver HEAD/COLABORADOR na planilha.
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {stage === "preview" ? (
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              {rows.length ? `${rows.length} linhas válidas` : "Nenhuma linha válida"} • {issues.length} avisos
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" className="h-11 rounded-xl" onClick={() => setStage("mapping")}>
                Ajustar mapeamento
              </Button>

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
                    setHeaders([]);
                    setDataRows([]);
                    setStage("idle");
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
        ) : null}

        {stage === "preview" && hasErrors ? (
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

        {stage === "idle" ? (
          <div className="mt-4 rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">
            Baixe o modelo, preencha e selecione a planilha. Depois confirme o mapeamento para evitar conflito de dados.
          </div>
        ) : null}
      </div>

      {stage === "preview" && rows.length ? (
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
                    <TableCell className="text-muted-foreground">{r.role === "ADMIN" ? "—" : (r.department ?? "—")}</TableCell>
                    <TableCell className="text-muted-foreground">{r.role === "ADMIN" ? "—" : (r.managerEmail ?? "—")}</TableCell>
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