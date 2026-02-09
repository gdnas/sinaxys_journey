import { useMemo, useState } from "react";
import { UploadCloud, Users } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { listDepartments } from "@/lib/departmentsDb";

type Row = {
  line: number;
  email: string;
  name?: string;
  role?: "ADMIN" | "HEAD" | "COLABORADOR";
  department?: string;
  job_title?: string;
  phone?: string;
  monthly_cost_brl?: string;
  password?: string;
};

type Result =
  | { line: number; email: string; ok: true; mode: "created" | "invited" | "already"; message: string }
  | { line: number; email: string; ok: false; message: string };

function parseCsv(text: string): Row[] {
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((l) => l.trim().length > 0);

  if (lines.length < 2) return [];

  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const get = (cols: string[], key: string) => {
    const idx = cols.indexOf(key);
    return idx;
  };

  const idxEmail = get(header, "email");
  if (idxEmail < 0) return [];

  const mapping: Record<string, number> = {
    email: idxEmail,
    name: get(header, "name"),
    role: get(header, "role"),
    department: get(header, "department"),
    job_title: get(header, "job_title"),
    phone: get(header, "phone"),
    monthly_cost_brl: get(header, "monthly_cost_brl"),
    password: get(header, "password"),
  };

  const out: Row[] = [];
  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i].split(",");
    const pick = (k: keyof Row) => {
      const idx = mapping[k as string];
      if (idx === undefined || idx < 0) return undefined;
      return (raw[idx] ?? "").trim();
    };

    const email = (pick("email") ?? "").trim().toLowerCase();
    if (!email) continue;

    const role = (pick("role") ?? "").trim().toUpperCase();
    const normalizedRole = (["ADMIN", "HEAD", "COLABORADOR"] as const).includes(role as any) ? (role as any) : undefined;

    out.push({
      line: i + 1,
      email,
      name: pick("name"),
      role: normalizedRole,
      department: pick("department"),
      job_title: pick("job_title"),
      phone: pick("phone"),
      monthly_cost_brl: pick("monthly_cost_brl"),
      password: pick("password"),
    });
  }

  return out;
}

function toNumberOrNull(v?: string) {
  if (!v) return null;
  const n = Number(String(v).replace(/\./g, "").replace(/,/g, "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export default function AdminImportUsers() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();

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

  const [csvText, setCsvText] = useState("");
  const rows = useMemo(() => parseCsv(csvText), [csvText]);

  const [results, setResults] = useState<Result[]>([]);
  const [running, setRunning] = useState(false);

  const template =
    "email,name,role,department,job_title,phone,monthly_cost_brl,password\n" +
    "maria@empresa.com,Maria Silva,COLABORADOR,Vendas,Analista,(11) 99999-9999,6500,Temp123\n" +
    "joao@empresa.com,João Souza,HEAD,Vendas,Coordenador,,12000,\n";

  return (
    <div className="grid gap-6">
      <div className="rounded-3xl border bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Admin — Importar usuários</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Cole um CSV e faça provisioning em lote. Se a coluna <span className="font-semibold">password</span> estiver preenchida, o usuário é criado com senha temporária e troca no primeiro acesso.
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
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">CSV</div>
            <p className="mt-1 text-sm text-muted-foreground">Cabeçalhos obrigatórios: email. Recomendado: name, role, department.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
              {rows.length} linha(s)
            </Badge>
            <Button
              variant="outline"
              className="h-10 rounded-full"
              onClick={() => {
                setCsvText(template);
                setResults([]);
              }}
            >
              Carregar modelo
            </Button>
          </div>
        </div>

        <Separator className="my-5" />

        <div className="grid gap-3">
          <div className="grid gap-2">
            <Label>Colar CSV</Label>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              className="min-h-[220px] w-full rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-[color:var(--sinaxys-primary)]"
              placeholder={template}
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-muted-foreground">
              Importante: <span className="font-semibold">department</span> deve bater com o nome de um departamento existente.
            </div>
            <Button
              className="h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              disabled={running || rows.length === 0}
              onClick={async () => {
                try {
                  setRunning(true);
                  setResults([]);

                  const next: Result[] = [];

                  for (const r of rows) {
                    const deptName = (r.department ?? "").trim();
                    const departmentId = deptName ? deptIdByName.get(deptName.toLowerCase()) : null;
                    if (deptName && !departmentId) {
                      next.push({ line: r.line, email: r.email, ok: false, message: `Departamento não encontrado: ${deptName}` });
                      continue;
                    }

                    const monthly = toNumberOrNull(r.monthly_cost_brl);

                    const { data, error } = await supabase.functions.invoke("admin-invite-user", {
                      body: {
                        email: r.email,
                        name: r.name || null,
                        role: r.role || "COLABORADOR",
                        departmentId,
                        jobTitle: r.job_title || null,
                        phone: r.phone || null,
                        password: r.password || null,
                      },
                    });

                    if (error) {
                      next.push({ line: r.line, email: r.email, ok: false, message: error.message });
                      continue;
                    }

                    if (data?.alreadyMember) {
                      next.push({ line: r.line, email: r.email, ok: true, mode: "already", message: "Já existe na empresa" });
                      continue;
                    }

                    // If monthly cost was provided, patch after provisioning (admin has UPDATE policy).
                    if (monthly && data?.userId) {
                      const { error: patchErr } = await supabase
                        .from("profiles")
                        .update({ monthly_cost_brl: monthly })
                        .eq("id", data.userId);
                      if (patchErr) {
                        next.push({ line: r.line, email: r.email, ok: true, mode: data?.mode ?? "invited", message: "Criado, mas falhou ao salvar custo" });
                        continue;
                      }
                    }

                    next.push({
                      line: r.line,
                      email: r.email,
                      ok: true,
                      mode: data?.mode ?? (r.password ? "created" : "invited"),
                      message: data?.mode === "created" ? "Criado com senha temporária" : "Convite enviado",
                    });
                  }

                  setResults(next);
                  await qc.invalidateQueries({ queryKey: ["profiles", companyId] });

                  const okCount = next.filter((x) => x.ok).length;
                  const failCount = next.length - okCount;
                  toast({ title: "Importação finalizada", description: `${okCount} ok, ${failCount} falhas.` });
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
        </div>

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

            <div className="mt-4 overflow-x-auto rounded-2xl border border-[color:var(--sinaxys-border)]">
              <Table className="min-w-[720px]">
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
                      <TableCell className="text-muted-foreground">{r.line}</TableCell>
                      <TableCell className="font-medium text-[color:var(--sinaxys-ink)]">{r.email}</TableCell>
                      <TableCell>
                        {r.ok ? (
                          <Badge className="rounded-full bg-emerald-100 text-emerald-900 hover:bg-emerald-100">OK</Badge>
                        ) : (
                          <Badge className="rounded-full bg-rose-100 text-rose-900 hover:bg-rose-100">Falha</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{r.message}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        ) : null}
      </Card>
    </div>
  );
}
