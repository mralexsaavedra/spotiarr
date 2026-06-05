import { describe, expect, test } from "vitest";
import { runStartupFailureScenario } from "./playwright-runtime";

describe.sequential("Playwright runtime guarantees", () => {
  test("fails before route specs execute when preview startup fails", async () => {
    const result = await runStartupFailureScenario();

    expect(result.exitCode).not.toBe(0);
    expect(result.markerExists).toBe(false);
    expect(result.output).not.toContain("startup failure fixture executed");
  });
});
