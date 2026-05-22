import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const REQUIRED_ENV = {
  SPOTIFY_CLIENT_ID: "client-id",
  SPOTIFY_CLIENT_SECRET: "client-secret",
  SPOTIFY_REDIRECT_URI: "http://localhost:3000/callback",
  NODE_ENV: "test",
};

describe("environment setup", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    vi.doMock("dotenv", () => ({ config: vi.fn() }));
    process.env = { ...originalEnv, ...REQUIRED_ENV };
    delete process.env.RELEASES_LOOKBACK_DAYS;
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.doUnmock("dotenv");
  });

  it("defaults the releases lookback window to 30 days", async () => {
    const { getEnv, validateEnvironment } = await import("./environment");

    validateEnvironment();

    expect(getEnv().RELEASES_LOOKBACK_DAYS).toBe(30);
  });
});
