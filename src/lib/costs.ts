export const HOURS_PER_MONTH = 160;

export function brl(n: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(n);
}

export function hourlyFromMonthly(monthly: number) {
  if (!Number.isFinite(monthly) || monthly <= 0) return 0;
  return monthly / HOURS_PER_MONTH;
}

export function brlPerHourFromMonthly(monthly: number) {
  const h = hourlyFromMonthly(monthly);
  return h ? `${brl(h)}/h` : "—";
}
