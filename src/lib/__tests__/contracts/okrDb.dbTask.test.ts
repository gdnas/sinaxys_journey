import { describe, it, expect } from 'vitest';
import type { DbTask } from "@/lib/okrDb";

function validateDbTaskShape(obj: any): obj is DbTask {
  return (
    typeof obj === "object" &&
    obj !== null &&
    typeof obj.id === "string" &&
    typeof obj.deliverable_id === "string" &&
    typeof obj.title === "string" &&
    typeof obj.owner_user_id === "string" &&
    typeof obj.status === "string"
  );
}

describe("DbTask contract", () => {
  it("deve falhar quando faltam campos obrigatórios", () => {
    const invalid = {
      id: "abc",
      deliverable_id: "def",
      title: "Task",
      // owner_user_id faltando
      status: "TODO",
    };

    expect(validateDbTaskShape(invalid)).toBe(false);
  });

  it("deve passar quando todos os campos essenciais estão presentes", () => {
    const valid = {
      id: "abc",
      deliverable_id: "def",
      title: "Task",
      owner_user_id: "user123",
      status: "TODO",
    };

    expect(validateDbTaskShape(valid)).toBe(true);
  });
});