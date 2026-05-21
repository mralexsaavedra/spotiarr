import { describe, expect, it } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  it("merges plain class strings", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("resolves Tailwind conflicting utilities to the last value", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("ignores falsy values", () => {
    expect(cn("foo", undefined, "baz", null, "")).toBe("foo baz");
  });

  it("handles conditional object syntax", () => {
    expect(cn("base", { active: true, disabled: false })).toBe("base active");
  });

  it("resolves complex Tailwind conflicts", () => {
    expect(cn("text-sm text-red-500", "text-lg text-blue-500")).toBe("text-lg text-blue-500");
  });
});
