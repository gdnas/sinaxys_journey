import type { DbCommitmentAnalyticsOverview } from "@/lib/commitmentsAnalyticsDb";
import { canonicalizeCommitmentHealth, commitmentAnalyticsDefinitions, type CanonicalCommitmentHealth } from "@/lib/commitmentTypes";

export interface CommitmentOperationalSignals {
  blocking_dependencies_open: number;
  is_overdue: boolean;
  missing_required_evidence: boolean;
  approved_renegotiation_count: number;
}

export interface CommitmentAnalyticsFlags {
  canonical_health: CanonicalCommitmentHealth;
  has_blocker: boolean;
  has_schedule_risk: boolean;
  has_evidence_gap: boolean;
  has_renegotiation_pressure: boolean;
}

export function deriveCommitmentOperationalHealth(signals: CommitmentOperationalSignals): CanonicalCommitmentHealth {
  if (signals.blocking_dependencies_open > 0) return "blocked";
  if (signals.is_overdue || signals.missing_required_evidence || signals.approved_renegotiation_count > 0) return "at_risk";
  return "healthy";
}

export function buildCommitmentAnalyticsFlags(row: Pick<DbCommitmentAnalyticsOverview, "health" | "blocking_dependencies_open" | "is_overdue" | "missing_required_evidence" | "approved_renegotiation_count">): CommitmentAnalyticsFlags {
  const signalHealth = deriveCommitmentOperationalHealth({
    blocking_dependencies_open: row.blocking_dependencies_open,
    is_overdue: row.is_overdue,
    missing_required_evidence: row.missing_required_evidence,
    approved_renegotiation_count: row.approved_renegotiation_count,
  });

  const canonicalHealth = canonicalizeCommitmentHealth(row.health);

  return {
    canonical_health: canonicalHealth === "unknown" ? signalHealth : canonicalHealth,
    has_blocker: row.blocking_dependencies_open > 0,
    has_schedule_risk: row.is_overdue,
    has_evidence_gap: row.missing_required_evidence,
    has_renegotiation_pressure: row.approved_renegotiation_count > 1,
  };
}

export function summarizeAnalyticsCoverage(rows: DbCommitmentAnalyticsOverview[]) {
  return {
    total: rows.length,
    healthy: rows.filter((row) => buildCommitmentAnalyticsFlags(row).canonical_health === "healthy").length,
    at_risk: rows.filter((row) => buildCommitmentAnalyticsFlags(row).canonical_health === "at_risk").length,
    blocked: rows.filter((row) => buildCommitmentAnalyticsFlags(row).canonical_health === "blocked").length,
    unknown: rows.filter((row) => buildCommitmentAnalyticsFlags(row).canonical_health === "unknown").length,
  };
}

export function listCommitmentAnalyticsDefinitionKeys() {
  return commitmentAnalyticsDefinitions.map((definition) => definition.key);
}
