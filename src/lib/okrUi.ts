import type { ObjectiveLevel } from "@/lib/okrDb";

export function objectiveTypeLabel(level: ObjectiveLevel) {
  if (level === "COMPANY") return "Estratégico (Tier 1)";
  if (level === "DEPARTMENT" || level === "TEAM") return "Tático (Tier 2)";
  return "(legado)";
}

export function objectiveLevelLabel(level: ObjectiveLevel) {
  if (level === "COMPANY") return "Empresa";
  if (level === "DEPARTMENT") return "Time";
  if (level === "TEAM") return "Time";
  return "Individual";
}

export function objectiveTypeBadgeClass(level: ObjectiveLevel) {
  return level === "COMPANY"
    ? "bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
    : "bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]";
}

export function objectiveAccent(level: ObjectiveLevel) {
  if (level === "COMPANY") {
    return {
      accent: "var(--okr-accent-company)",
      soft: "var(--okr-accent-company-soft)",
      border: "var(--okr-accent-company-border)",
    } as const;
  }
  if (level === "DEPARTMENT" || level === "TEAM") {
    return {
      accent: "var(--okr-accent-team)",
      soft: "var(--okr-accent-team-soft)",
      border: "var(--okr-accent-team-border)",
    } as const;
  }
  return {
    accent: "var(--okr-accent-individual)",
    soft: "var(--okr-accent-individual-soft)",
    border: "var(--okr-accent-individual-border)",
  } as const;
}