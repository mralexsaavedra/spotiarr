import { describe, expect, it } from "vitest";
import { isPrismaUniqueViolation } from "./prisma-error.utils";

describe("isPrismaUniqueViolation", () => {
  it("returns true for an Error with code P2002", () => {
    const err = Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
    expect(isPrismaUniqueViolation(err)).toBe(true);
  });

  it("returns false for a plain Error without code", () => {
    expect(isPrismaUniqueViolation(new Error("some error"))).toBe(false);
  });

  it("returns false for a non-Error value (string)", () => {
    expect(isPrismaUniqueViolation("P2002")).toBe(false);
  });

  it("returns false for null", () => {
    expect(isPrismaUniqueViolation(null)).toBe(false);
  });
});
