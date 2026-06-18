import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Tests for infrastructure/logging/logger.ts
 *
 * Strategy: logger reads raw process.env at module init. vitest caches modules
 * between dynamic imports, so we call vi.resetModules() in beforeEach to force
 * a fresh module load with each test's env. process.env is restored in afterEach.
 *
 * We deliberately do NOT test transport output (pino-pretty vs JSON) because
 * that would require capturing stdout — an integration concern. Instead we
 * test the exported logger's observable contract:
 *  - it exports a `logger` with a `.child` method
 *  - the pino options (level, redact) are what the spec requires
 *  - pino-pretty transport is NOT configured when NODE_ENV=production
 */

describe("logger module", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("exports a logger with a child method", async () => {
    process.env = { ...originalEnv, NODE_ENV: "test", LOG_LEVEL: "silent" };
    const { logger } = await import("./logger");
    expect(typeof logger.child).toBe("function");
  });

  it("logger.child returns a child logger with a child method", async () => {
    process.env = { ...originalEnv, NODE_ENV: "test", LOG_LEVEL: "silent" };
    const { logger } = await import("./logger");
    const child = logger.child({ component: "test-component" });
    expect(typeof child.child).toBe("function");
  });

  it("defaults to level 'silent' when NODE_ENV=test and LOG_LEVEL unset", async () => {
    process.env = { ...originalEnv, NODE_ENV: "test" };
    delete process.env.LOG_LEVEL;
    const { logger } = await import("./logger");
    expect(logger.level).toBe("silent");
  });

  it("uses LOG_LEVEL when explicitly set (overrides NODE_ENV default)", async () => {
    process.env = { ...originalEnv, NODE_ENV: "test", LOG_LEVEL: "warn" };
    const { logger } = await import("./logger");
    expect(logger.level).toBe("warn");
  });
});

describe("logger redaction", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("redacts 'token' path so secrets are never logged", async () => {
    process.env = { ...originalEnv, NODE_ENV: "test", LOG_LEVEL: "silent" };
    const { REDACT_PATHS } = await import("./logger");
    expect(REDACT_PATHS).toContain("token");
  });

  it("redacts 'clientSecret' path", async () => {
    process.env = { ...originalEnv, NODE_ENV: "test", LOG_LEVEL: "silent" };
    const { REDACT_PATHS } = await import("./logger");
    expect(REDACT_PATHS).toContain("clientSecret");
  });

  it("redacts 'SPOTIARR_TOKEN' path", async () => {
    process.env = { ...originalEnv, NODE_ENV: "test", LOG_LEVEL: "silent" };
    const { REDACT_PATHS } = await import("./logger");
    expect(REDACT_PATHS).toContain("SPOTIARR_TOKEN");
  });

  it("redacts 'SPOTIFY_CLIENT_SECRET' path", async () => {
    process.env = { ...originalEnv, NODE_ENV: "test", LOG_LEVEL: "silent" };
    const { REDACT_PATHS } = await import("./logger");
    expect(REDACT_PATHS).toContain("SPOTIFY_CLIENT_SECRET");
  });

  it("redacts '*.token' wildcard path", async () => {
    process.env = { ...originalEnv, NODE_ENV: "test", LOG_LEVEL: "silent" };
    const { REDACT_PATHS } = await import("./logger");
    expect(REDACT_PATHS).toContain("*.token");
  });

  it("redacts '*.secret' wildcard path", async () => {
    process.env = { ...originalEnv, NODE_ENV: "test", LOG_LEVEL: "silent" };
    const { REDACT_PATHS } = await import("./logger");
    expect(REDACT_PATHS).toContain("*.secret");
  });

  it("redacts 'responseBody' path so Spotify error bodies are not logged", async () => {
    process.env = { ...originalEnv, NODE_ENV: "test", LOG_LEVEL: "silent" };
    const { REDACT_PATHS } = await import("./logger");
    expect(REDACT_PATHS).toContain("responseBody");
  });

  it("redacts '*.responseBody' wildcard path", async () => {
    process.env = { ...originalEnv, NODE_ENV: "test", LOG_LEVEL: "silent" };
    const { REDACT_PATHS } = await import("./logger");
    expect(REDACT_PATHS).toContain("*.responseBody");
  });
});

describe("logger production invariants", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("does not configure pino-pretty transport in production", async () => {
    process.env = { ...originalEnv, NODE_ENV: "production", LOG_LEVEL: "info" };
    const { getLoggerOptions } = await import("./logger");
    const options = getLoggerOptions();
    expect(options.transport).toBeUndefined();
  });

  it("sets base service field to 'spotiarr-backend'", async () => {
    process.env = { ...originalEnv, NODE_ENV: "test", LOG_LEVEL: "silent" };
    const { getLoggerOptions } = await import("./logger");
    const options = getLoggerOptions();
    expect(options.base).toMatchObject({ service: "spotiarr-backend" });
  });
});
