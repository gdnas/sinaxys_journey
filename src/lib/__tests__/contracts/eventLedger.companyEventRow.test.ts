import { describe, it, expect } from 'vitest/globals';
import type { CompanyEventRow } from "@/lib/eventLedgerDb";

function validateCompanyEventRowShape(obj: any): obj is CompanyEventRow {
  return (
    typeof obj === "object" &&
    obj !== null &&
    typeof obj.id === "string" &&
    typeof obj.company_id === "string" &&
    typeof obj.user_id === "string" &&
    typeof obj.source_module === "string" &&
    typeof obj.event_type === "string" &&
    typeof obj.occurred_at === "string" &&
    typeof obj.created_at === "string" &&
    typeof obj.payload === "object" &&
    obj.payload !== null
  );
}

describe("CompanyEventRow contract", () => {
  it("deve falhar quando falta payload", () => {
    const invalid = {
      id: "abc",
      company_id: "def",
      user_id: "user123",
      source_module: "OKR",
      event_type: "TASK_CREATED",
      occurred_at: "2024-01-01",
      created_at: "2024-01-01",
      // payload faltando
    };

    expect(validateCompanyEventRowShape(invalid)).toBe(false);
  });

  it("deve passar quando todos os campos essenciais estão presentes", () => {
    const valid = {
      id: "abc",
      company_id: "def",
      user_id: "user123",
      source_module: "OKR" as const,
      event_type: "TASK_CREATED",
      occurred_at: "2024-01-01",
      created_at: "2024-01-01",
      payload: { task_id: "task123" },
    };

    expect(validateCompanyEventRowShape(valid)).toBe(true);
  });
});