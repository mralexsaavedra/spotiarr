import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { envSchema } from "./environment";

type AnyDef = { _def: { in: { _def: { shape: Record<string, z.ZodTypeAny> } } } };
const innerShape = (envSchema as unknown as AnyDef)._def.in._def.shape;

const tokenSchema = innerShape.SPOTIARR_TOKEN;
const corsOriginSchema = innerShape.SPOTIARR_CORS_ORIGIN;
const trustProxySchema = innerShape.SPOTIARR_TRUST_PROXY;
const logLevelSchema = innerShape.LOG_LEVEL;
const sessionTtlSchema = innerShape.SPOTIARR_SESSION_TTL_HOURS;
const unlockRatelimitSchema = innerShape.SPOTIARR_UNLOCK_RATELIMIT;

describe("SPOTIARR_TOKEN schema", () => {
  it("accepts undefined (auth disabled)", () => {
    expect(tokenSchema.safeParse(undefined).success).toBe(true);
    expect(tokenSchema.safeParse(undefined).data).toBeUndefined();
  });

  it("accepts a 16-character token", () => {
    const result = tokenSchema.safeParse("abcdefghijklmnop");
    expect(result.success).toBe(true);
    expect(result.data).toBe("abcdefghijklmnop");
  });

  it("accepts a long token", () => {
    expect(tokenSchema.safeParse("a-valid-token-that-is-long-enough").success).toBe(true);
  });

  it("trims surrounding whitespace and keeps the trimmed value", () => {
    const result = tokenSchema.safeParse("  abcdefghijklmnop  ");
    expect(result.success).toBe(true);
    expect(result.data).toBe("abcdefghijklmnop");
  });

  it("rejects a token shorter than 16 characters", () => {
    expect(tokenSchema.safeParse("tooshort").success).toBe(false);
  });

  it("rejects a whitespace-only string", () => {
    expect(tokenSchema.safeParse("               ").success).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(tokenSchema.safeParse("").success).toBe(false);
  });
});

describe("SPOTIARR_CORS_ORIGIN schema", () => {
  it("accepts undefined and returns undefined (no CORS)", () => {
    const result = corsOriginSchema.safeParse(undefined);
    expect(result.success).toBe(true);
    expect(result.data).toBeUndefined();
  });

  it("returns undefined for an empty string", () => {
    const result = corsOriginSchema.safeParse("");
    expect(result.success).toBe(true);
    expect(result.data).toBeUndefined();
  });

  it("returns undefined for a whitespace-only string", () => {
    const result = corsOriginSchema.safeParse("   ");
    expect(result.success).toBe(true);
    expect(result.data).toBeUndefined();
  });

  it("parses a single origin into an array", () => {
    const result = corsOriginSchema.safeParse("https://app.example.com");
    expect(result.success).toBe(true);
    expect(result.data).toEqual(["https://app.example.com"]);
  });

  it("parses a comma-separated list and trims each entry", () => {
    const result = corsOriginSchema.safeParse("https://a.com, https://b.com ,https://c.com");
    expect(result.success).toBe(true);
    expect(result.data).toEqual(["https://a.com", "https://b.com", "https://c.com"]);
  });

  it("rejects a wildcard origin", () => {
    expect(corsOriginSchema.safeParse("*").success).toBe(false);
  });

  it("rejects a list containing a wildcard", () => {
    expect(corsOriginSchema.safeParse("https://a.com,*").success).toBe(false);
  });
});

describe("SPOTIARR_TRUST_PROXY schema", () => {
  it("accepts undefined and returns undefined", () => {
    const result = trustProxySchema.safeParse(undefined);
    expect(result.success).toBe(true);
    expect(result.data).toBeUndefined();
  });

  it("parses '1' as the number 1", () => {
    const result = trustProxySchema.safeParse("1");
    expect(result.success).toBe(true);
    expect(result.data).toBe(1);
  });

  it("parses '0' as the number 0", () => {
    const result = trustProxySchema.safeParse("0");
    expect(result.success).toBe(true);
    expect(result.data).toBe(0);
  });

  it("parses 'true' as boolean true", () => {
    const result = trustProxySchema.safeParse("true");
    expect(result.success).toBe(true);
    expect(result.data).toBe(true);
  });

  it("parses 'false' as boolean false", () => {
    const result = trustProxySchema.safeParse("false");
    expect(result.success).toBe(true);
    expect(result.data).toBe(false);
  });

  it("parses 'loopback' as string 'loopback'", () => {
    const result = trustProxySchema.safeParse("loopback");
    expect(result.success).toBe(true);
    expect(result.data).toBe("loopback");
  });

  it("parses 'linklocal' as string 'linklocal'", () => {
    expect(trustProxySchema.safeParse("linklocal").data).toBe("linklocal");
  });

  it("parses 'uniquelocal' as string 'uniquelocal'", () => {
    expect(trustProxySchema.safeParse("uniquelocal").data).toBe("uniquelocal");
  });

  it("rejects an unknown string", () => {
    expect(trustProxySchema.safeParse("garbage-value").success).toBe(false);
  });

  it("rejects 'yes' (not a valid preset or boolean)", () => {
    expect(trustProxySchema.safeParse("yes").success).toBe(false);
  });

  it("rejects 'TRUE' (case-sensitive)", () => {
    expect(trustProxySchema.safeParse("TRUE").success).toBe(false);
  });
});

describe("SPOTIARR_SESSION_TTL_HOURS schema", () => {
  it("defaults to 168 when absent", () => {
    const result = sessionTtlSchema.safeParse(undefined);
    expect(result.success).toBe(true);
    expect(result.data).toBe(168);
  });

  it("accepts 1 (min boundary)", () => {
    expect(sessionTtlSchema.safeParse("1").success).toBe(true);
    expect(sessionTtlSchema.safeParse("1").data).toBe(1);
  });

  it("rejects 0 (below min boundary)", () => {
    expect(sessionTtlSchema.safeParse("0").success).toBe(false);
  });

  it("accepts 8760 (max boundary)", () => {
    expect(sessionTtlSchema.safeParse("8760").success).toBe(true);
    expect(sessionTtlSchema.safeParse("8760").data).toBe(8760);
  });

  it("rejects 8761 (above max boundary)", () => {
    expect(sessionTtlSchema.safeParse("8761").success).toBe(false);
  });

  it("rejects non-integer garbage", () => {
    expect(sessionTtlSchema.safeParse("abc").success).toBe(false);
  });

  it("coerces a string number to a number", () => {
    const result = sessionTtlSchema.safeParse("24");
    expect(result.success).toBe(true);
    expect(result.data).toBe(24);
  });
});

describe("SPOTIARR_UNLOCK_RATELIMIT schema", () => {
  it("defaults to 5 when absent", () => {
    const result = unlockRatelimitSchema.safeParse(undefined);
    expect(result.success).toBe(true);
    expect(result.data).toBe(5);
  });

  it("accepts 1 (min boundary)", () => {
    expect(unlockRatelimitSchema.safeParse("1").success).toBe(true);
    expect(unlockRatelimitSchema.safeParse("1").data).toBe(1);
  });

  it("rejects 0 (below min boundary)", () => {
    expect(unlockRatelimitSchema.safeParse("0").success).toBe(false);
  });

  it("accepts 100 (max boundary)", () => {
    expect(unlockRatelimitSchema.safeParse("100").success).toBe(true);
    expect(unlockRatelimitSchema.safeParse("100").data).toBe(100);
  });

  it("rejects 101 (above max boundary)", () => {
    expect(unlockRatelimitSchema.safeParse("101").success).toBe(false);
  });

  it("rejects garbage", () => {
    expect(unlockRatelimitSchema.safeParse("garbage").success).toBe(false);
  });
});

describe("LOG_LEVEL schema", () => {
  it("accepts 'info'", () => {
    expect(logLevelSchema.safeParse("info").success).toBe(true);
  });

  it("accepts all valid pino levels", () => {
    const validLevels = ["trace", "debug", "info", "warn", "error", "fatal", "silent"];
    for (const level of validLevels) {
      expect(logLevelSchema.safeParse(level).success, `level "${level}" should be valid`).toBe(
        true,
      );
    }
  });

  it("rejects 'verbose' (invalid level)", () => {
    expect(logLevelSchema.safeParse("verbose").success).toBe(false);
  });

  it("rejects 'WARNING' (case-sensitive)", () => {
    expect(logLevelSchema.safeParse("WARNING").success).toBe(false);
  });
});

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

  it("defaults LOG_LEVEL to 'silent' when NODE_ENV=test", async () => {
    process.env.NODE_ENV = "test";
    delete process.env.LOG_LEVEL;
    const { getEnv, validateEnvironment } = await import("./environment");
    validateEnvironment();
    expect(getEnv().LOG_LEVEL).toBe("silent");
  });

  it("defaults LOG_LEVEL to 'debug' when NODE_ENV=development", async () => {
    process.env.NODE_ENV = "development";
    delete process.env.LOG_LEVEL;
    const { getEnv, validateEnvironment } = await import("./environment");
    validateEnvironment();
    expect(getEnv().LOG_LEVEL).toBe("debug");
  });

  it("defaults LOG_LEVEL to 'info' when NODE_ENV=production", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.LOG_LEVEL;
    const { getEnv, validateEnvironment } = await import("./environment");
    validateEnvironment();
    expect(getEnv().LOG_LEVEL).toBe("info");
  });

  it("explicit LOG_LEVEL overrides the NODE_ENV default", async () => {
    process.env.NODE_ENV = "production";
    process.env.LOG_LEVEL = "debug";
    const { getEnv, validateEnvironment } = await import("./environment");
    validateEnvironment();
    expect(getEnv().LOG_LEVEL).toBe("debug");
  });
});
