import { describe, it, expect } from 'vitest/globals';
import type { PublicProfileRow } from "@/lib/pointsDb";

function validatePublicProfileRowShape(obj: any): obj is PublicProfileRow {
  return (
    typeof obj === "object" &&
    obj !== null &&
    typeof obj.id === "string" &&
    typeof obj.company_id === "string" &&
    (obj.department_id === null || typeof obj.department_id === "string") &&
    typeof obj.name === "string" &&
    (obj.avatar_url === null || typeof obj.avatar_url === "string") &&
    typeof obj.role === "string" &&
    typeof obj.active === "boolean" &&
    (obj.manager_id === null || typeof obj.manager_id === "string") &&
    (obj.job_title === null || typeof obj.job_title === "string") &&
    typeof obj.updated_at === "string"
  );
}

describe("PublicProfileRow contract", () => {
  it("deve falhar quando faltam campos obrigatórios", () => {
    const invalid = {
      id: "abc",
      company_id: "def",
      department_id: null,
      name: "John",
      avatar_url: null,
      role: "USER",
      active: true,
      // manager_id faltando
      // job_title faltando
      updated_at: "2024-01-01",
    };

    expect(validatePublicProfileRowShape(invalid)).toBe(false);
  });

  it("deve passar quando todos os campos estão presentes", () => {
    const valid = {
      id: "abc",
      company_id: "def",
      department_id: null,
      name: "John",
      avatar_url: null,
      role: "USER",
      active: true,
      manager_id: null,
      job_title: null,
      updated_at: "2024-01-01",
    };

    expect(validatePublicProfileRowShape(valid)).toBe(true);
  });
});