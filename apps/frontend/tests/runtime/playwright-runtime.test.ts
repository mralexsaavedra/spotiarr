import { describe, expect, test } from "vitest";
import { runPortCollisionScenario, runStartupFailureScenario } from "./playwright-runtime";

describe.sequential("Playwright runtime guarantees", () => {
  test("fails before route specs execute when preview startup fails", async () => {
    const result = await runStartupFailureScenario();

    expect(result.exitCode).not.toBe(0);
    expect(result.markerExists).toBe(false);
    expect(result.output).not.toContain("startup failure fixture executed");
  });

  test("fails before route specs execute when a required port is already occupied", async () => {
    const result = await runPortCollisionScenario(false);

    expect(result.exitCode).not.toBe(0);
    expect(result.markerExists).toBe(false);
    expect(result.output).not.toContain("port collision fixture executed");
  });

  test("shows why reusing an existing occupied port is non-hermetic", async () => {
    const result = await runPortCollisionScenario(true);

    expect(result.exitCode).toBe(0);
    expect(result.markerExists).toBe(true);
    expect(result.output).toContain("port collision fixture executed");
  });
});
