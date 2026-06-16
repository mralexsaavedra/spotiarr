import { describe, expect, it } from "vitest";
import type { SettingsRepository } from "@/domain/repositories/settings.repository";
import { SettingsService } from "./settings.service";

// An unseeded settings backend: the DB has no rows and nothing is internalized.
// This is the production state on a fresh install — the path that unit tests
// mocking `getNumber` cannot exercise.
function makeUnseededService(): SettingsService {
  const repo: SettingsRepository = {
    get: async () => undefined,
    set: async () => undefined,
    delete: async () => undefined,
  } as unknown as SettingsRepository;
  return new SettingsService(repo, () => undefined);
}

describe("SettingsService.getNumber — recovery keys resolve to a default (regression guard)", () => {
  // Regression: SEARCH_MAX_ATTEMPTS and RECOVERY_JOB_INTERVAL_MINUTES were used
  // by the track-recovery subsystem without being registered, so getNumber threw
  // at runtime (masked everywhere by mocked settings). These MUST resolve to
  // their metadata default instead of throwing.
  it("resolves SEARCH_MAX_ATTEMPTS to its default without throwing", async () => {
    const service = makeUnseededService();
    await expect(service.getNumber("SEARCH_MAX_ATTEMPTS")).resolves.toBe(5);
  });

  it("resolves RECOVERY_JOB_INTERVAL_MINUTES to its default without throwing", async () => {
    const service = makeUnseededService();
    await expect(service.getNumber("RECOVERY_JOB_INTERVAL_MINUTES")).resolves.toBe(5);
  });

  it("still throws for a genuinely unknown numeric key with no default", async () => {
    const service = makeUnseededService();
    await expect(service.getNumber("DEFINITELY_NOT_A_SETTING")).rejects.toThrow();
  });
});
