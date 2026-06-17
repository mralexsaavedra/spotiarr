import { describe, expect, it, vi } from "vitest";
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

function makeRepo(value: string | undefined): SettingsRepository {
  return {
    get: vi.fn().mockResolvedValue(value),
    set: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
  } as unknown as SettingsRepository;
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

// ---------------------------------------------------------------------------
// getString
// ---------------------------------------------------------------------------

describe("SettingsService.getString", () => {
  it("returns the value from the repository when found", async () => {
    const service = new SettingsService(makeRepo("custom-value"), () => undefined);
    await expect(service.getString("UI_LANGUAGE")).resolves.toBe("custom-value");
  });

  it("returns the explicit fallback when repo returns undefined and no metadata default", async () => {
    const service = new SettingsService(makeRepo(undefined), () => undefined);
    await expect(service.getString("DEFINITELY_NOT_A_SETTING", "my-fallback")).resolves.toBe(
      "my-fallback",
    );
  });

  it("returns the metadata default when repo returns undefined and no explicit fallback", async () => {
    // UI_LANGUAGE has defaultValue "en" in SETTINGS_METADATA
    const service = makeUnseededService();
    await expect(service.getString("UI_LANGUAGE")).resolves.toBe("en");
  });

  it("throws AppError when no repo value, no fallback, and no metadata default", async () => {
    const service = makeUnseededService();
    await expect(service.getString("DEFINITELY_NOT_A_SETTING")).rejects.toThrow(
      "Setting DEFINITELY_NOT_A_SETTING not found and no valid default value available",
    );
  });

  it("prefers repo value over metadata default", async () => {
    const service = new SettingsService(makeRepo("custom-lang"), () => undefined);
    // UI_LANGUAGE metadata default is "en", but repo returns "custom-lang"
    await expect(service.getString("UI_LANGUAGE")).resolves.toBe("custom-lang");
  });
});

// ---------------------------------------------------------------------------
// getNumber — internalized numeric settings
// ---------------------------------------------------------------------------

describe("SettingsService.getNumber — internalized numeric settings", () => {
  it("returns the internalized value when available, bypassing the repo", async () => {
    const repo = makeRepo("999");
    const service = new SettingsService(repo, (key) => {
      if (key === "FEED_SYNC_INTERVAL_MINUTES") return 42;
      return undefined;
    });

    await expect(service.getNumber("FEED_SYNC_INTERVAL_MINUTES")).resolves.toBe(42);
    // repo.get should NOT be called when internalized value is present
    expect(repo.get).not.toHaveBeenCalled();
  });

  it("falls through to repo when internalized value returns undefined for a non-internalized key", async () => {
    const repo = makeRepo("15");
    const service = new SettingsService(repo, () => undefined);

    // PLAYLIST_CHECK_INTERVAL_MINUTES is in metadata but NOT in INTERNALIZED_NUMERIC_SETTINGS
    await expect(service.getNumber("PLAYLIST_CHECK_INTERVAL_MINUTES")).resolves.toBe(15);
    expect(repo.get).toHaveBeenCalled();
  });

  it("returns explicit fallback when repo value is not a valid number", async () => {
    const repo = makeRepo("not-a-number");
    const service = new SettingsService(repo, () => undefined);

    await expect(service.getNumber("DEFINITELY_NOT_A_SETTING", 99)).resolves.toBe(99);
  });

  it("returns metadata default when repo returns undefined and no explicit fallback", async () => {
    const service = makeUnseededService();
    // DOWNLOAD_MAX_RETRIES has defaultValue "3"
    await expect(service.getNumber("DOWNLOAD_MAX_RETRIES")).resolves.toBe(3);
  });

  it("returns repo numeric value parsed from string", async () => {
    const repo = makeRepo("7");
    const service = new SettingsService(repo, () => undefined);
    // Using a key not in INTERNALIZED_NUMERIC_SETTINGS but in metadata
    await expect(service.getNumber("PLAYLIST_CHECK_INTERVAL_MINUTES")).resolves.toBe(7);
  });
});

// ---------------------------------------------------------------------------
// getBoolean
// ---------------------------------------------------------------------------

describe("SettingsService.getBoolean", () => {
  it("returns true when repo value is 'true'", async () => {
    const service = new SettingsService(makeRepo("true"), () => undefined);
    await expect(service.getBoolean("AUTO_SUBSCRIBE_NEW_PLAYLISTS")).resolves.toBe(true);
  });

  it("returns false when repo value is 'false'", async () => {
    const service = new SettingsService(makeRepo("false"), () => undefined);
    await expect(service.getBoolean("AUTO_SUBSCRIBE_NEW_PLAYLISTS")).resolves.toBe(false);
  });

  it("returns explicit fallback when repo returns undefined", async () => {
    const service = makeUnseededService();
    await expect(service.getBoolean("DEFINITELY_NOT_A_SETTING", true)).resolves.toBe(true);
  });

  it("returns false from metadata default when no repo value and no explicit fallback", async () => {
    // AUTO_SUBSCRIBE_NEW_PLAYLISTS has defaultValue "false"
    const service = makeUnseededService();
    await expect(service.getBoolean("AUTO_SUBSCRIBE_NEW_PLAYLISTS")).resolves.toBe(false);
  });

  it("returns true when metadata default is 'true' and no repo value or fallback", async () => {
    // M3U_GENERATION_ENABLED has defaultValue "true"
    const service = makeUnseededService();
    await expect(service.getBoolean("M3U_GENERATION_ENABLED")).resolves.toBe(true);
  });

  it("returns false for an unknown key with no fallback (fallback undefined, metadata default undefined)", async () => {
    const service = makeUnseededService();
    // fallback ?? (undefined === "true") → false
    await expect(service.getBoolean("DEFINITELY_NOT_A_SETTING")).resolves.toBe(false);
  });
});

// ---------------------------------------------------------------------------
// setString / delete
// ---------------------------------------------------------------------------

describe("SettingsService.setString", () => {
  it("delegates to repo.set with the given key and value", async () => {
    const repo = makeRepo(undefined);
    const service = new SettingsService(repo, () => undefined);
    await service.setString("UI_LANGUAGE", "fr");
    expect(repo.set).toHaveBeenCalledWith("UI_LANGUAGE", "fr");
  });
});

describe("SettingsService.delete", () => {
  it("delegates to repo.delete with the given key", async () => {
    const repo = makeRepo(undefined);
    const service = new SettingsService(repo, () => undefined);
    await service.delete("UI_LANGUAGE");
    expect(repo.delete).toHaveBeenCalledWith("UI_LANGUAGE");
  });
});
