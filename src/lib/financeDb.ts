import { supabase } from "@/integrations/supabase/client";

export const FINANCE_ACCOUNT_CODES = {
  recurringRevenue: "1001",
  payroll: "2001",
  marketing: "2002",
  taxes: "2003",
  loans: "2004",
  investments: "3001",
} as const;

export const FINANCE_ASSUMPTION_KEYS = {
  taxRate: "tax_rate",
  taxFixedMonthly: "tax_fixed_monthly",
  loanMonthlyPayment: "loan_monthly_payment",
  loanInterestRate: "loan_interest_rate",
  loanOutstandingBalance: "loan_outstanding_balance",
} as const;

export type UserFinancialRecipientType = "PF" | "PJ" | (string & {});

export type UserFinancialProfile = {
  user_id: string;
  company_id: string | null;
  recipient_type: UserFinancialRecipientType;
  destination_account: string | null;
  pix_key: string | null;
  created_at: string;
  updated_at: string;
};

export type CompanyFinanceSettings = {
  id: string;
  company_id: string;
  legal_name: string | null;
  cnpj: string | null;
  bank_name: string | null;
  agency: string | null;
  account_number: string | null;
  account_holder: string | null;
  pix_key: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type UserInvoiceStatus = "ENVIADA" | "EM_ANALISE" | "APROVADA" | "PAGA" | "REJEITADA" | (string & {});

export type UserInvoice = {
  id: string;
  company_id: string | null;
  user_id: string;
  invoice_number: string | null;
  issue_date: string | null;
  amount_brl: number | null;
  description: string | null;
  file_path: string;
  file_name: string | null;
  mime_type: string | null;
  status: UserInvoiceStatus;
  created_at: string;
  updated_at: string;
};

export const FINANCE_INVOICES_BUCKET = "finance-invoices";

export type FinanceScenarioStatus = "draft" | "active" | "archived" | (string & {});
export type FinanceVersionStatus = "draft" | "locked" | (string & {});
export type FinanceVersionPeriodType = "month" | "quarter" | "year" | (string & {});

export type FinanceScenario = {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  status: FinanceScenarioStatus;
  base_scenario_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type FinanceScenarioAssumption = {
  id: string;
  company_id: string;
  finance_scenario_id: string;
  key: string;
  label: string;
  value_number: number | null;
  value_text: string | null;
  value_json: Record<string, unknown> | null;
  unit: string | null;
  applies_to_account_id: string | null;
  applies_to_department_id: string | null;
  applies_to_project_id: string | null;
  applies_to_squad_id: string | null;
  created_at: string;
  updated_at: string;
};

export type FinanceVersion = {
  id: string;
  company_id: string;
  scenario_id: string;
  name: string;
  status: FinanceVersionStatus;
  period_type: FinanceVersionPeriodType;
  fiscal_year: number;
  fiscal_quarter: number | null;
  fiscal_month: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  scenario?: FinanceScenario | null;
  line_count?: number;
};

export type FinanceVersionLine = {
  id: string;
  company_id: string;
  finance_version_id: string;
  finance_account_id: string;
  fiscal_period_id: string;
  department_id: string | null;
  project_id: string | null;
  squad_id: string | null;
  amount: number;
  created_at: string;
  updated_at: string;
};

export type FinanceForecastAdjustmentAction = "set_amount" | "stop" | (string & {});

export type FinanceForecastAdjustment = {
  id: string;
  company_id: string;
  scenario_id: string | null;
  cost_item_id: string;
  action: FinanceForecastAdjustmentAction;
  amount: number | null;
  effective_year: number;
  effective_month: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type FinanceFiscalPeriod = {
  id: string;
  company_id: string;
  label: string;
  fiscal_year: number;
  fiscal_quarter: number | null;
  fiscal_month: number | null;
  created_at: string;
  updated_at: string;
};

export type FinanceAccount = {
  id: string;
  company_id: string;
  name: string;
  code: string | null;
  created_at: string;
  updated_at: string;
};

const STORE_KEYS = {
  scenarios: "kairoos_finance_scenarios",
  assumptions: "kairoos_finance_scenario_assumptions",
  versions: "kairoos_finance_versions",
  lines: "kairoos_finance_version_lines",
  periods: "kairoos_finance_fiscal_periods",
  accounts: "kairoos_finance_accounts",
  forecastAdjustments: "kairoos_finance_forecast_adjustments",
} as const;

function sanitizeFilename(name: string) {
  return name
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "");
}

function nowIso() {
  return new Date().toISOString();
}

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function canUseStorage() {
  return typeof window !== "undefined" && !!window.localStorage;
}

function readCollection<T>(key: string): T[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function writeCollection<T>(key: string, value: T[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function sortByCreatedDesc<T extends { created_at: string }>(items: T[]) {
  return [...items].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

function getFinanceScenariosStore() {
  return readCollection<FinanceScenario>(STORE_KEYS.scenarios);
}

function setFinanceScenariosStore(value: FinanceScenario[]) {
  writeCollection(STORE_KEYS.scenarios, value);
}

function getFinanceScenarioAssumptionsStore() {
  return readCollection<FinanceScenarioAssumption>(STORE_KEYS.assumptions);
}

function setFinanceScenarioAssumptionsStore(value: FinanceScenarioAssumption[]) {
  writeCollection(STORE_KEYS.assumptions, value);
}

function getFinanceVersionsStore() {
  return readCollection<FinanceVersion>(STORE_KEYS.versions);
}

function setFinanceVersionsStore(value: FinanceVersion[]) {
  writeCollection(STORE_KEYS.versions, value);
}

function getFinanceVersionLinesStore() {
  return readCollection<FinanceVersionLine>(STORE_KEYS.lines);
}

function setFinanceVersionLinesStore(value: FinanceVersionLine[]) {
  writeCollection(STORE_KEYS.lines, value);
}

function getFinanceFiscalPeriodsStore() {
  return readCollection<FinanceFiscalPeriod>(STORE_KEYS.periods);
}

function setFinanceFiscalPeriodsStore(value: FinanceFiscalPeriod[]) {
  writeCollection(STORE_KEYS.periods, value);
}

function getFinanceAccountsStore() {
  return readCollection<FinanceAccount>(STORE_KEYS.accounts);
}

function setFinanceAccountsStore(value: FinanceAccount[]) {
  writeCollection(STORE_KEYS.accounts, value);
}

function getFinanceForecastAdjustmentsStore() {
  return readCollection<FinanceForecastAdjustment>(STORE_KEYS.forecastAdjustments);
}

function setFinanceForecastAdjustmentsStore(value: FinanceForecastAdjustment[]) {
  writeCollection(STORE_KEYS.forecastAdjustments, value);
}

function ensureDefaultFinanceAccounts(companyId: string) {
  const accounts = getFinanceAccountsStore();
  const companyAccounts = accounts.filter((item) => item.company_id === companyId);
  const defaults = [
    { code: FINANCE_ACCOUNT_CODES.recurringRevenue, name: "Receita Recorrente" },
    { code: FINANCE_ACCOUNT_CODES.payroll, name: "Folha" },
    { code: FINANCE_ACCOUNT_CODES.marketing, name: "Marketing" },
    { code: FINANCE_ACCOUNT_CODES.taxes, name: "Impostos" },
    { code: FINANCE_ACCOUNT_CODES.loans, name: "Empréstimos e juros" },
    { code: FINANCE_ACCOUNT_CODES.investments, name: "Investimentos" },
  ] as const;

  const timestamp = nowIso();
  const missingAccounts = defaults
    .filter((item) => !companyAccounts.some((account) => account.code === item.code))
    .map((item) => ({
      id: createId(),
      company_id: companyId,
      code: item.code,
      name: item.name,
      created_at: timestamp,
      updated_at: timestamp,
    } satisfies FinanceAccount));

  if (!missingAccounts.length) {
    return companyAccounts.sort((a, b) => (a.code ?? "").localeCompare(b.code ?? ""));
  }

  const next = [...accounts, ...missingAccounts];
  setFinanceAccountsStore(next);
  return next.filter((item) => item.company_id === companyId).sort((a, b) => (a.code ?? "").localeCompare(b.code ?? ""));
}

async function safeSelect<T>(query: PromiseLike<{ data: T[] | null; error: any }>) {
  const { data, error } = await query;
  if (error) return [] as T[];
  return (data ?? []) as T[];
}

export async function getUserFinancialProfile(userId: string) {
  const { data, error } = await supabase
    .from("user_financial_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as UserFinancialProfile | null;
}

export async function upsertUserFinancialProfile(params: {
  userId: string;
  companyId: string | null;
  recipientType: UserFinancialRecipientType;
  destinationAccount: string | null;
  pixKey: string | null;
}) {
  const { data, error } = await supabase
    .from("user_financial_profiles")
    .upsert(
      {
        user_id: params.userId,
        company_id: params.companyId,
        recipient_type: params.recipientType,
        destination_account: params.destinationAccount,
        pix_key: params.pixKey,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    )
    .select("*")
    .single();

  if (error) throw error;
  return data as UserFinancialProfile;
}

export async function getCompanyFinanceSettings(companyId: string) {
  const { data, error } = await supabase
    .from("company_finance_settings")
    .select("*")
    .eq("company_id", companyId)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as CompanyFinanceSettings | null;
}

export async function upsertCompanyFinanceSettings(params: {
  companyId: string;
  patch: Partial<Omit<CompanyFinanceSettings, "id" | "company_id" | "created_at" | "updated_at">>;
}) {
  const payload = {
    company_id: params.companyId,
    ...params.patch,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("company_finance_settings")
    .upsert(payload, { onConflict: "company_id" })
    .select("*")
    .single();

  if (error) throw error;
  return data as CompanyFinanceSettings;
}

export async function listUserInvoices(params: { userId: string; companyId?: string | null }) {
  let q = supabase.from("user_invoices").select("*").eq("user_id", params.userId);
  if (params.companyId) q = q.eq("company_id", params.companyId);

  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as UserInvoice[];
}

export async function createUserInvoice(params: {
  id: string;
  userId: string;
  companyId: string | null;
  invoiceNumber: string | null;
  issueDate: string | null;
  amountBRL: number | null;
  description: string | null;
  filePath: string;
  fileName: string;
  mimeType: string | null;
}) {
  const { data, error } = await supabase
    .from("user_invoices")
    .insert({
      id: params.id,
      user_id: params.userId,
      company_id: params.companyId,
      invoice_number: params.invoiceNumber,
      issue_date: params.issueDate,
      amount_brl: params.amountBRL,
      description: params.description,
      file_path: params.filePath,
      file_name: params.fileName,
      mime_type: params.mimeType,
      status: "ENVIADA",
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as UserInvoice;
}

export async function deleteUserInvoice(id: string) {
  const { error } = await supabase.from("user_invoices").delete().eq("id", id);
  if (error) throw error;
}

export async function uploadInvoiceFile(params: { userId: string; invoiceId: string; file: File }) {
  const safeName = sanitizeFilename(params.file.name) || `arquivo-${Date.now()}`;
  const path = `${params.userId}/${params.invoiceId}/${safeName}`;

  const { error } = await supabase.storage
    .from(FINANCE_INVOICES_BUCKET)
    .upload(path, params.file, { contentType: params.file.type || undefined, upsert: false });

  if (error) throw error;

  return {
    path,
    fileName: safeName,
    mimeType: params.file.type || null,
  };
}

export async function removeInvoiceFile(path: string) {
  const { error } = await supabase.storage.from(FINANCE_INVOICES_BUCKET).remove([path]);
  if (error) throw error;
}

export async function createInvoiceSignedUrl(path: string, expiresInSeconds = 60) {
  const { data, error } = await supabase.storage
    .from(FINANCE_INVOICES_BUCKET)
    .createSignedUrl(path, expiresInSeconds);
  if (error) throw error;
  return data.signedUrl;
}

export async function seedFinanceScenarios(companyId: string, userId: string) {
  const scenarios = getFinanceScenariosStore();
  if (scenarios.some((item) => item.company_id === companyId)) {
    return listFinanceScenarios(companyId);
  }

  const timestamp = nowIso();
  const seeded: FinanceScenario[] = [
    {
      id: createId(),
      company_id: companyId,
      name: "Base",
      description: "Cenário principal da operação.",
      status: "active",
      base_scenario_id: null,
      created_by: userId,
      created_at: timestamp,
      updated_at: timestamp,
    },
    {
      id: createId(),
      company_id: companyId,
      name: "Conservador",
      description: "Leitura mais prudente para receita e custos.",
      status: "draft",
      base_scenario_id: null,
      created_by: userId,
      created_at: timestamp,
      updated_at: timestamp,
    },
    {
      id: createId(),
      company_id: companyId,
      name: "Agressivo",
      description: "Hipótese de aceleração de crescimento.",
      status: "draft",
      base_scenario_id: null,
      created_by: userId,
      created_at: timestamp,
      updated_at: timestamp,
    },
  ];

  setFinanceScenariosStore([...scenarios, ...seeded]);
  return seeded;
}

export async function listFinanceScenarios(companyId: string) {
  return sortByCreatedDesc(getFinanceScenariosStore().filter((item) => item.company_id === companyId)).sort((a, b) => {
    if (a.status === "active" && b.status !== "active") return -1;
    if (a.status !== "active" && b.status === "active") return 1;
    return a.name.localeCompare(b.name);
  });
}

export async function createFinanceScenario(
  companyId: string,
  userId: string,
  name: string,
  description: string | null,
  baseScenarioId: string | null,
) {
  const timestamp = nowIso();
  const next: FinanceScenario = {
    id: createId(),
    company_id: companyId,
    name: name.trim(),
    description,
    status: "draft",
    base_scenario_id: baseScenarioId,
    created_by: userId,
    created_at: timestamp,
    updated_at: timestamp,
  };
  setFinanceScenariosStore([...getFinanceScenariosStore(), next]);
  return next;
}

export async function updateFinanceScenario(id: string, patch: Partial<Pick<FinanceScenario, "name" | "description" | "status" | "base_scenario_id">>) {
  let updated: FinanceScenario | null = null;
  const scenarios = getFinanceScenariosStore().map((item) => {
    if (item.id !== id) return item;
    updated = { ...item, ...patch, updated_at: nowIso() };
    return updated;
  });
  setFinanceScenariosStore(scenarios);
  if (!updated) throw new Error("Cenário não encontrado");
  return updated;
}

export async function activateFinanceScenario(id: string) {
  const current = getFinanceScenariosStore().find((item) => item.id === id);
  if (!current) throw new Error("Cenário não encontrado");

  const updatedAt = nowIso();
  const scenarios = getFinanceScenariosStore().map((item) => {
    if (item.company_id !== current.company_id) return item;
    if (item.id === id) return { ...item, status: "active" as const, updated_at: updatedAt };
    if (item.status === "active") return { ...item, status: "draft" as const, updated_at: updatedAt };
    return item;
  });
  setFinanceScenariosStore(scenarios);
  return scenarios.find((item) => item.id === id)!;
}

export async function duplicateFinanceScenario(companyId: string, userId: string, scenarioId: string) {
  const source = getFinanceScenariosStore().find((item) => item.id === scenarioId && item.company_id === companyId);
  if (!source) throw new Error("Cenário não encontrado");

  const duplicated = await createFinanceScenario(
    companyId,
    userId,
    `${source.name} (cópia)`,
    source.description,
    source.id,
  );

  const assumptions = getFinanceScenarioAssumptionsStore();
  const timestamp = nowIso();
  const cloned = assumptions
    .filter((item) => item.finance_scenario_id === scenarioId)
    .map((item) => ({
      ...item,
      id: createId(),
      finance_scenario_id: duplicated.id,
      created_at: timestamp,
      updated_at: timestamp,
    }));

  setFinanceScenarioAssumptionsStore([...assumptions, ...cloned]);
  return duplicated;
}

export async function listFinanceScenarioAssumptions(companyId: string, scenarioId: string) {
  return sortByCreatedDesc(
    getFinanceScenarioAssumptionsStore().filter(
      (item) => item.company_id === companyId && item.finance_scenario_id === scenarioId,
    ),
  );
}

export async function upsertFinanceScenarioAssumption(
  companyId: string,
  scenarioId: string,
  payload: Omit<FinanceScenarioAssumption, "id" | "company_id" | "finance_scenario_id" | "created_at" | "updated_at">,
) {
  const assumptions = getFinanceScenarioAssumptionsStore();
  const existing = assumptions.find(
    (item) => item.company_id === companyId && item.finance_scenario_id === scenarioId && item.key === payload.key,
  );
  const timestamp = nowIso();

  if (existing) {
    const updated = { ...existing, ...payload, updated_at: timestamp };
    setFinanceScenarioAssumptionsStore(assumptions.map((item) => (item.id === existing.id ? updated : item)));
    return updated;
  }

  const created: FinanceScenarioAssumption = {
    id: createId(),
    company_id: companyId,
    finance_scenario_id: scenarioId,
    ...payload,
    created_at: timestamp,
    updated_at: timestamp,
  };
  setFinanceScenarioAssumptionsStore([...assumptions, created]);
  return created;
}

export async function deleteFinanceScenarioAssumption(id: string) {
  setFinanceScenarioAssumptionsStore(getFinanceScenarioAssumptionsStore().filter((item) => item.id !== id));
}

export async function seedFinanceFiscalPeriods(companyId: string) {
  const periods = getFinanceFiscalPeriodsStore();
  if (periods.some((item) => item.company_id === companyId)) {
    return listFinanceFiscalPeriods(companyId);
  }

  const year = new Date().getFullYear();
  const timestamp = nowIso();
  const seeded = Array.from({ length: 12 }, (_, index) => ({
    id: createId(),
    company_id: companyId,
    label: `${String(index + 1).padStart(2, "0")}/${year}`,
    fiscal_year: year,
    fiscal_quarter: Math.floor(index / 3) + 1,
    fiscal_month: index + 1,
    created_at: timestamp,
    updated_at: timestamp,
  } satisfies FinanceFiscalPeriod));

  setFinanceFiscalPeriodsStore([...periods, ...seeded]);
  return seeded;
}

export async function listFinanceFiscalPeriods(companyId: string) {
  return [...getFinanceFiscalPeriodsStore().filter((item) => item.company_id === companyId)].sort((a, b) => {
    if (a.fiscal_year !== b.fiscal_year) return a.fiscal_year - b.fiscal_year;
    return (a.fiscal_month ?? 0) - (b.fiscal_month ?? 0);
  });
}

export async function listFinanceAccounts(companyId: string) {
  return ensureDefaultFinanceAccounts(companyId).sort((a, b) => (a.code ?? "").localeCompare(b.code ?? ""));
}

export async function listFinanceDepartments(companyId: string) {
  const rows = await safeSelect<{ id: string; name: string }>(
    supabase.from("departments").select("id,name").eq("company_id", companyId).order("name", { ascending: true }),
  );
  return rows;
}

export async function listFinanceProjects(companyId: string) {
  const rows = await safeSelect<{ id: string; name: string }>(
    supabase.from("projects").select("id,name").eq("tenant_id", companyId).order("name", { ascending: true }),
  );
  return rows;
}

export async function listFinanceSquads(companyId: string) {
  const rows = await safeSelect<{ id: string; name: string }>(
    supabase.from("squads").select("id,name").eq("company_id", companyId).order("name", { ascending: true }),
  );
  return rows;
}

export async function listFinanceVersions(companyId: string) {
  const scenarios = getFinanceScenariosStore();
  const lines = getFinanceVersionLinesStore();
  return sortByCreatedDesc(getFinanceVersionsStore().filter((item) => item.company_id === companyId)).map((item) => ({
    ...item,
    scenario: scenarios.find((scenario) => scenario.id === item.scenario_id) ?? null,
    line_count: lines.filter((line) => line.finance_version_id === item.id).length,
  }));
}

export async function createFinanceVersion(
  companyId: string,
  userId: string,
  payload: {
    scenario_id: string;
    name: string;
    period_type: FinanceVersionPeriodType;
    fiscal_year: number;
    fiscal_quarter: number | null;
    fiscal_month: number | null;
  },
) {
  const timestamp = nowIso();
  const created: FinanceVersion = {
    id: createId(),
    company_id: companyId,
    scenario_id: payload.scenario_id,
    name: payload.name,
    status: "draft",
    period_type: payload.period_type,
    fiscal_year: payload.fiscal_year,
    fiscal_quarter: payload.fiscal_quarter,
    fiscal_month: payload.fiscal_month,
    created_by: userId,
    created_at: timestamp,
    updated_at: timestamp,
  };
  setFinanceVersionsStore([...getFinanceVersionsStore(), created]);
  return created;
}

export async function deleteFinanceVersion(id: string) {
  setFinanceVersionsStore(getFinanceVersionsStore().filter((item) => item.id !== id));
  setFinanceVersionLinesStore(getFinanceVersionLinesStore().filter((item) => item.finance_version_id !== id));
}

export async function getFinanceVersion(id: string) {
  const version = getFinanceVersionsStore().find((item) => item.id === id);
  if (!version) throw new Error("Versão não encontrada");
  const scenario = getFinanceScenariosStore().find((item) => item.id === version.scenario_id) ?? null;
  return { ...version, scenario };
}

export async function listFinanceVersionLines(versionId: string) {
  return sortByCreatedDesc(getFinanceVersionLinesStore().filter((item) => item.finance_version_id === versionId));
}

export async function createFinanceVersionLine(
  companyId: string,
  _userId: string,
  payload: Omit<FinanceVersionLine, "id" | "company_id" | "created_at" | "updated_at">,
) {
  const timestamp = nowIso();
  const created: FinanceVersionLine = {
    id: createId(),
    company_id: companyId,
    ...payload,
    created_at: timestamp,
    updated_at: timestamp,
  };
  setFinanceVersionLinesStore([...getFinanceVersionLinesStore(), created]);
  return created;
}

export async function updateFinanceVersionLine(
  id: string,
  patch: Partial<Omit<FinanceVersionLine, "id" | "company_id" | "finance_version_id" | "created_at" | "updated_at">>,
) {
  let updated: FinanceVersionLine | null = null;
  const lines = getFinanceVersionLinesStore().map((item) => {
    if (item.id !== id) return item;
    updated = { ...item, ...patch, updated_at: nowIso() };
    return updated;
  });
  setFinanceVersionLinesStore(lines);
  if (!updated) throw new Error("Linha não encontrada");
  return updated;
}

export async function deleteFinanceVersionLine(id: string) {
  setFinanceVersionLinesStore(getFinanceVersionLinesStore().filter((item) => item.id !== id));
}

export async function lockFinanceVersion(id: string) {
  let updated: FinanceVersion | null = null;
  const versions = getFinanceVersionsStore().map((item) => {
    if (item.id !== id) return item;
    updated = { ...item, status: "locked", updated_at: nowIso() };
    return updated;
  });
  setFinanceVersionsStore(versions);
  if (!updated) throw new Error("Versão não encontrada");
  const scenario = getFinanceScenariosStore().find((item) => item.id === updated.scenario_id) ?? null;
  return { ...updated, scenario };
}

export async function listFinanceForecastAdjustments(companyId: string, scenarioId?: string | null) {
  return sortByCreatedDesc(
    getFinanceForecastAdjustmentsStore().filter((item) => item.company_id === companyId && (scenarioId === undefined ? true : item.scenario_id === scenarioId)),
  ).sort((a, b) => {
    if (a.effective_year !== b.effective_year) return a.effective_year - b.effective_year;
    if (a.effective_month !== b.effective_month) return a.effective_month - b.effective_month;
    return a.created_at.localeCompare(b.created_at);
  });
}

export async function createFinanceForecastAdjustment(
  companyId: string,
  userId: string,
  payload: Omit<FinanceForecastAdjustment, "id" | "company_id" | "created_by" | "created_at" | "updated_at">,
) {
  const timestamp = nowIso();
  const created: FinanceForecastAdjustment = {
    id: createId(),
    company_id: companyId,
    created_by: userId,
    created_at: timestamp,
    updated_at: timestamp,
    ...payload,
  };
  setFinanceForecastAdjustmentsStore([...getFinanceForecastAdjustmentsStore(), created]);
  return created;
}

export async function updateFinanceForecastAdjustment(
  id: string,
  patch: Partial<Omit<FinanceForecastAdjustment, "id" | "company_id" | "created_by" | "created_at" | "updated_at">>,
) {
  let updated: FinanceForecastAdjustment | null = null;
  const adjustments = getFinanceForecastAdjustmentsStore().map((item) => {
    if (item.id !== id) return item;
    updated = { ...item, ...patch, updated_at: nowIso() };
    return updated;
  });
  setFinanceForecastAdjustmentsStore(adjustments);
  if (!updated) throw new Error("Ajuste de forecast não encontrado");
  return updated;
}

export async function deleteFinanceForecastAdjustment(id: string) {
  setFinanceForecastAdjustmentsStore(getFinanceForecastAdjustmentsStore().filter((item) => item.id !== id));
}