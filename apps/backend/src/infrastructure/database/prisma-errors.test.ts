import { describe, it, expect } from "vitest";
import { isPrismaUniqueViolation } from "./prisma-errors";

describe("isPrismaUniqueViolation", () => {
  it("returns true when passed an Error with code P2002", () => {
    const err = Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
    expect(isPrismaUniqueViolation(err)).toBe(true);
  });

  it("returns false for P2025 (not found)", () => {
    const err = Object.assign(new Error("Record not found"), { code: "P2025" });
    expect(isPrismaUniqueViolation(err)).toBe(false);
  });

  it("returns false for a plain non-Error value", () => {
    expect(isPrismaUniqueViolation("P2002")).toBe(false);
    expect(isPrismaUniqueViolation({ code: "P2002" })).toBe(false);
  });

  it("returns false for null", () => {
    expect(isPrismaUniqueViolation(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isPrismaUniqueViolation(undefined)).toBe(false);
  });
});
