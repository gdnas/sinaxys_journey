import { supabase } from "@/integrations/supabase/client";

export type FinanceFiscalPeriodType = "month" | "quarter" | "year";

export type FinanceFiscalPeriod = {
  id: string;
  company_id: string;
  period_type: FinanceFiscalPeriodType;
  fiscal_year: number;
  fiscal_quarter: number | null;
  fiscal_month: number | null;
  label: string;
  start_date: string;
  end_date: string;
  is_closed: boolean;
  created_at: string;
  updated_at: string;
};

export type FinanceScenarioStatus = "draft" | "active" | "archived";

export type FinanceScenario = {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  status: FinanceScenarioStatus;
  base_scenario_id: string | null;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
};

export type FinanceScenarioAssumption = {
  id: string;
  company_id: string;
  scenario_id: string;
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

export async function trackFinanceModuleEnabled(companyId: string, userId: string) {
  const { error } = await supabase.from("audit_logs").insert({
    company_id: companyId,
    actor_user_id: userId,
    action: "finance_module_enabled",
    meta: { company_id: companyId, user_id: userId, enabled_at: new Date().toISOString() },
  });

  if (error) throw error;
}

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "short" }).format(date).replace(".", "");
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function endOfMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
}

function startOfQuarter(year: number, quarter: number) {
  return new Date(Date.UTC(year, (quarter - 1) * 3, 1));
}

function endOfQuarter(year: number, quarter: number) {
  return new Date(Date.UTC(year, quarter * 3, 0));
}

function startOfYear(year: number) {
  return new Date(Date.UTC(year, 0, 1));
}

function endOfYear(year: number) {
  return new Date(Date.UTC(year, 11, 31));
}

function buildMonthPeriods(companyId: string, baseDate: Date) {
  const periods = [];
  for (let offset = -12; offset < 12; offset += 1) {
    const date = new Date(Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth() + offset, 1));
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const quarter = Math.floor((month - 1) / 3) + 1;

    periods.push({
      company_id: companyId,
      period_type: "month" as const,
      fiscal_year: year,
      fiscal_quarter: quarter,
      fiscal_month: month,
      label: `${monthLabel(date)} ${year}`,
      start_date: toIsoDate(startOfMonth(date)),
      end_date: toIsoDate(endOfMonth(date)),
      is_closed: false,
    });
  }
  return periods;
}

function buildQuarterPeriods(companyId: string, baseYear: number) {
  const periods = [];
  for (let offset = -2; offset < 6; offset += 1) {
    const year = baseYear + Math.floor(offset / 4);
    const quarter = ((offset % 4) + 4) % 4 + 1;
    const start = startOfQuarter(year, quarter);
    const end = endOfQuarter(year, quarter);

    periods.push({
      company_id: companyId,
      period_type: "quarter" as const,
      fiscal_year: year,
      fiscal_quarter: quarter,
      fiscal_month: null,
      label: `Q${quarter} ${year}`,
      start_date: toIsoDate(start),
      end_date: toIsoDate(end),
      is_closed: false,
    });
  }
  return periods;
}

function buildYearPeriods(companyId: string, baseYear: number) {
  const periods = [];
  for (let offset = -1; offset < 1; offset += 1) {
    const year = baseYear + offset;
    periods.push({
      company_id: companyId,
      period_type: "year" as const,
      fiscal_year: year,
      fiscal_quarter: null,
      fiscal_month: null,
      label: `${year}`,
      start_date: toIsoDate(startOfYear(year)),
      end_date: toIsoDate(endOfYear(year)),
      is_closed: false,
    });
  }
  return periods;
}

export async function seedFinanceFiscalPeriods(companyId: string) {
  const now = new Date();
  const baseYear = now.getUTCFullYear();

  const periods = [
    ...buildMonthPeriods(companyId, now),
    ...buildQuarterPeriods(companyId, baseYear),
    ...buildYearPeriods(companyId, baseYear),
  ];

  const { error } = await supabase
    .from("finance_fiscal_periods")
    .upsert(periods, { onConflict: "company_id,period_type,fiscal_year,fiscal_quarter,fiscal_month" });

  if (error) throw error;
}

export async function getCurrentPeriod(companyId: string) {
  const today = toIsoDate(new Date());
  const { data, error } = await supabase
    .from("finance_fiscal_periods")
    .select("*")
    .eq("company_id", companyId)
    .lte("start_date", today)
    .gte("end_date", today)
    .order("period_type", { ascending: true })
    .limit(1);

  if (error) throw error;
  return (data?.[0] ?? null) as FinanceFiscalPeriod | null;
}

export async function getPeriodByDate(companyId: string, date: string) {
  const { data, error } = await supabase
    .from("finance_fiscal_periods")
    .select("*")
    .eq("company_id", companyId)
    .lte("start_date", date)
    .gte("end_date", date)
    .order("period_type", { ascending: true })
    .limit(1);

  if (error) throw error;
  return (data?.[0] ?? null) as FinanceFiscalPeriod | null;
}

export async function getPeriodRange(companyId: string, start: string, end: string) {
  const { data, error } = await supabase
    .from("finance_fiscal_periods")
    .select("*")
    .eq("company_id", companyId)
    .lte("start_date", end)
    .gte("end_date", start)
    .order("start_date", { ascending: true });

  if (error) throw error;
  return (data ?? []) as FinanceFiscalPeriod[];
}

export async function seedFinanceScenarios(companyId: string, userId: string) {
  const { data: scenarios, error: scenarioError } = await supabase
    .from("finance_scenarios")
    .upsert(
      [
        {
          company_id: companyId,
          name: "Base",
          description: "Cenário principal da empresa.",
          status: "active",
          base_scenario_id: null,
          created_by_user_id: userId,
        },
        {
          company_id: companyId,
          name: "Conservador",
          description: "Premissas mais prudentes para simulação.",
          status: "draft",
          base_scenario_id: null,
          created_by_user_id: userId,
        },
        {
          company_id: companyId,
          name: "Agressivo",
          description: "Premissas mais otimistas para simulação.",
          status: "draft",
          base_scenario_id: null,
          created_by_user_id: userId,
        },
      ],
      { onConflict: "company_id,name" },
    )
    .select("*");

  if (scenarioError) throw scenarioError;

  const baseScenario = scenarios?.find((item) => item.name === "Base");
  const conservativeScenario = scenarios?.find((item) => item.name === "Conservador");
  const aggressiveScenario = scenarios?.find((item) => item.name === "Agressivo");

  if (!baseScenario || !conservativeScenario || !aggressiveScenario) return;

  const { error: assumptionError } = await supabase.from("finance_scenario_assumptions").upsert(
    [
      {
        company_id: companyId,
        scenario_id: baseScenario.id,
        key: "growth_rate",
        label: "Taxa de crescimento",
        value_number: 0,
        value_text: null,
        value_json: null,
        unit: "%",
        applies_to_account_id: null,
        applies_to_department_id: null,
        applies_to_project_id: null,
        applies_to_squad_id: null,
      },
      {
        company_id: companyId,
        scenario_id: conservativeScenario.id,
        key: "growth_rate",
        label: "Taxa de crescimento",
        value_number: -5,
        value_text: null,
        value_json: null,
        unit: "%",
        applies_to_account_id: null,
        applies_to_department_id: null,
        applies_to_project_id: null,
        applies_to_squad_id: null,
      },
      {
        company_id: companyId,
        scenario_id: aggressiveScenario.id,
        key: "growth_rate",
        label: "Taxa de crescimento",
        value_number: 12,
        value_text: null,
        value_json: null,
        unit: "%",
        applies_to_account_id: null,
        applies_to_department_id: null,
        applies_to_project_id: null,
        applies_to_squad_id: null,
      },
    ],
    { onConflict: "company_id,scenario_id,key,applies_to_account_id,applies_to_department_id,applies_to_project_id,applies_to_squad_id" },
  );

  if (assumptionError) throw assumptionError;
}

export async function listFinanceScenarios(companyId: string) {
  const { data, error } = await supabase
    .from("finance_scenarios")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as FinanceScenario[];
}

export async function listFinanceScenarioAssumptions(companyId: string, scenarioId: string) {
  const { data, error } = await supabase
    .from("finance_scenario_assumptions")
    .select("*")
    .eq("company_id", companyId)
    .eq("scenario_id", scenarioId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as FinanceScenarioAssumption[];
}

export async function createFinanceScenario(companyId: string, userId: string, name: string, description: string | null, baseScenarioId: string | null) {
  const { data, error } = await supabase
    .from("finance_scenarios")
    .insert({
      company_id: companyId,
      name,
      description,
      status: "draft",
      base_scenario_id: baseScenarioId,
      created_by_user_id: userId,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as FinanceScenario;
}

export async function updateFinanceScenario(
  scenarioId: string,
  payload: Partial<Pick<FinanceScenario, "name" | "description" | "status" | "base_scenario_id">>,
) {
  const { data, error } = await supabase
    .from("finance_scenarios")
    .update(payload)
    .eq("id", scenarioId)
    .select("*")
    .single();

  if (error) throw error;
  return data as FinanceScenario;
}

export async function duplicateFinanceScenario(companyId: string, userId: string, scenarioId: string) {
  const { data: source, error: sourceError } = await supabase
    .from("finance_scenarios")
    .select("*")
    .eq("id", scenarioId)
    .single();

  if (sourceError) throw sourceError;

  const duplicated = await createFinanceScenario(
    companyId,
    userId,
    `${source.name} - Cópia`,
    source.description,
    source.id,
  );

  const assumptions = await listFinanceScenarioAssumptions(companyId, scenarioId);

  if (assumptions.length) {
    const { error } = await supabase.from("finance_scenario_assumptions").insert(
      assumptions.map((item) => ({
        company_id: companyId,
        scenario_id: duplicated.id,
        key: item.key,
        label: item.label,
        value_number: item.value_number,
        value_text: item.value_text,
        value_json: item.value_json,
        unit: item.unit,
        applies_to_account_id: item.applies_to_account_id,
        applies_to_department_id: item.applies_to_department_id,
        applies_to_project_id: item.applies_to_project_id,
        applies_to_squad_id: item.applies_to_squad_id,
      })),
    );

    if (error) throw error;
  }

  return duplicated;
}

export async function upsertFinanceScenarioAssumption(
  companyId: string,
  scenarioId: string,
  payload: Omit<FinanceScenarioAssumption, "id" | "company_id" | "scenario_id" | "created_at" | "updated_at">,
) {
  const { data, error } = await supabase
    .from("finance_scenario_assumptions")
    .upsert(
      {
        company_id: companyId,
        scenario_id: scenarioId,
        ...payload,
      },
      {
        onConflict: "company_id,scenario_id,key,applies_to_account_id,applies_to_department_id,applies_to_project_id,applies_to_squad_id",
      },
    )
    .select("*")
    .single();

  if (error) throw error;
  return data as FinanceScenarioAssumption;
}

export async function deleteFinanceScenarioAssumption(assumptionId: string) {
  const { error } = await supabase.from("finance_scenario_assumptions").delete().eq("id", assumptionId);
  if (error) throw error;
}

export async function activateFinanceScenario(scenarioId: string) {
  const { data: scenario, error: scenarioError } = await supabase
    .from("finance_scenarios")
    .select("id,company_id")
    .eq("id", scenarioId)
    .single();

  if (scenarioError) throw scenarioError;

  const { error: deactivateError } = await supabase
    .from("finance_scenarios")
    .update({ status: "archived" })
    .eq("company_id", scenario.company_id)
    .neq("id", scenarioId);

  if (deactivateError) throw deactivateError;

  const { data, error } = await supabase
    .from("finance_scenarios")
    .update({ status: "active" })
    .eq("id", scenarioId)
    .select("*")
    .single();

  if (error) throw error;
  return data as FinanceScenario;
}