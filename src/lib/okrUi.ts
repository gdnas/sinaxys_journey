import type { ObjectiveLevel } from "@/lib/okrDb";

export function objectiveTypeLabel(level: ObjectiveLevel) {
  return level === "COMPANY" ? "Estratégico" : "Tático-operacional";
}

export function objectiveLevelLabel(level: ObjectiveLevel) {
  if (level === "COMPANY") return "Empresa";
  if (level === "DEPARTMENT") return "Área";
  if (level === "TEAM") return "Time";
  return "Individual";
}

export function objectiveTypeBadgeClass(level: ObjectiveLevel) {
  return level === "COMPANY"
    ? "bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
    : "bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]";
}
