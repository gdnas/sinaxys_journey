import { hourlyFromMonthly } from "@/lib/costs";

export function parsePtNumber(input: string): number | null {
  const s = String(input ?? "")
    .trim()
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^0-9.-]/g, "");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function laborCostFromMonthly(monthlyCostBRL: number | null | undefined, effortHours: number | null | undefined) {
  const monthly = typeof monthlyCostBRL === "number" ? monthlyCostBRL : null;
  const hours = typeof effortHours === "number" ? effortHours : null;
  if (!monthly || monthly <= 0) return null;
  if (!hours || hours <= 0) return null;
  const rate = hourlyFromMonthly(monthly);
  if (!rate) return null;
  return rate * hours;
}

export function roiPct(valueBRL: number | null | undefined, costBRL: number | null | undefined) {
  const v = typeof valueBRL === "number" ? valueBRL : null;
  const c = typeof costBRL === "number" ? costBRL : null;
  if (v === null || c === null) return null;
  if (c <= 0) return null;
  return ((v - c) / c) * 100;
}
