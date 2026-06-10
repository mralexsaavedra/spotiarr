import { describe, expect, it } from "vitest";
import { buildCorsOptions, resolveAllowedOrigin } from "./cors";

describe("buildCorsOptions", () => {
  it("returns null when allowlist is undefined", () => {
    expect(buildCorsOptions(undefined)).toBeNull();
  });

  it("returns null when allowlist is empty", () => {
    expect(buildCorsOptions([])).toBeNull();
  });

  it("returns options with the allowlist and credentials when origins are present", () => {
    const options = buildCorsOptions(["https://app.example.com"]);
    expect(options).toEqual({
      origin: ["https://app.example.com"],
      credentials: true,
    });
  });

  it("never produces a wildcard origin", () => {
    const options = buildCorsOptions(["https://a.com", "https://b.com"]);
    expect(options?.origin).not.toBe("*");
    expect(options?.origin).toEqual(["https://a.com", "https://b.com"]);
  });

  it("returns null when the only entry is a wildcard", () => {
    expect(buildCorsOptions(["*"])).toBeNull();
  });

  it("strips a wildcard mixed into an explicit list", () => {
    const options = buildCorsOptions(["https://a.com", "*"]);
    expect(options).toEqual({ origin: ["https://a.com"], credentials: true });
  });
});

describe("resolveAllowedOrigin", () => {
  it("returns null when no request origin", () => {
    expect(resolveAllowedOrigin(undefined, ["https://app.example.com"])).toBeNull();
  });

  it("returns null when no allowlist", () => {
    expect(resolveAllowedOrigin("https://app.example.com", undefined)).toBeNull();
  });

  it("returns null when allowlist is empty", () => {
    expect(resolveAllowedOrigin("https://app.example.com", [])).toBeNull();
  });

  it("echoes the origin when it is on the allowlist", () => {
    expect(resolveAllowedOrigin("https://app.example.com", ["https://app.example.com"])).toBe(
      "https://app.example.com",
    );
  });

  it("returns null when the origin is not on the allowlist", () => {
    expect(
      resolveAllowedOrigin("https://evil.example.com", ["https://app.example.com"]),
    ).toBeNull();
  });
});
