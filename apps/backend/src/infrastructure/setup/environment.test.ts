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
    delete process.env.SPOTIFY_HTTP_MAX_CONCURRENCY;
    delete process.env.SPOTIFY_HTTP_QUEUE_TIMEOUT_MS;
    delete process.env.SPOTIFY_HTTP_MIN_INTERVAL_MS;
    delete process.env.SPOTIFY_SYNC_MAX_CONCURRENCY;
    delete process.env.SPOTIFY_SYNC_QUEUE_TIMEOUT_MS;
    delete process.env.SPOTIFY_SYNC_MIN_INTERVAL_MS;
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.doUnmock("dotenv");
  });

  it("defaults releases and spotify limiter env values", async () => {
    const { getEnv, validateEnvironment } = await import("./environment");

    validateEnvironment();

    expect(getEnv().RELEASES_LOOKBACK_DAYS).toBe(30);
    expect(getEnv().SPOTIFY_HTTP_MAX_CONCURRENCY).toBe(5);
    expect(getEnv().SPOTIFY_HTTP_QUEUE_TIMEOUT_MS).toBe(60000);
    expect(getEnv().SPOTIFY_HTTP_MIN_INTERVAL_MS).toBe(100);
    expect(getEnv().SPOTIFY_SYNC_MAX_CONCURRENCY).toBe(1);
    expect(getEnv().SPOTIFY_SYNC_QUEUE_TIMEOUT_MS).toBe(600000);
    expect(getEnv().SPOTIFY_SYNC_MIN_INTERVAL_MS).toBe(3000);
  });
});
