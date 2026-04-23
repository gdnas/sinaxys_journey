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