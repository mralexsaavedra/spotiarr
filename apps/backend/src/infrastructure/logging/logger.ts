import pino from "pino";

// -----------------------------------------------------------------------------
// Redaction paths — secrets must never appear in log output.
// This list MUST NOT be narrowed (REQ-4.2).
// -----------------------------------------------------------------------------
export const REDACT_PATHS: string[] = [
  "token",
  "spotiarrToken",
  "SPOTIARR_TOKEN",
  "clientSecret",
  "client_secret",
  "SPOTIFY_CLIENT_SECRET",
  "authorization",
  "*.token",
  "*.secret",
  "*.clientSecret",
  "*.SPOTIFY_CLIENT_SECRET",
  "*.authorization",
  "headers.authorization",
];

// -----------------------------------------------------------------------------
// Level resolution
// Logger reads process.env directly at init (NOT via getEnv()) to avoid the
// bootstrap ordering trap: the logger module may be imported before environment
// validation runs. Zod still validates LOG_LEVEL in environment.ts for
// fail-fast startup (see design ADR-2).
// -----------------------------------------------------------------------------
function resolveLevel(): string {
  const explicit = process.env.LOG_LEVEL;
  if (explicit) return explicit;

  const nodeEnv = process.env.NODE_ENV ?? "development";
  if (nodeEnv === "production") return "info";
  if (nodeEnv === "test") return "silent";
  return "debug";
}

// -----------------------------------------------------------------------------
// Transport selection — pino-pretty is a devDependency; it MUST NOT be loaded
// in production (REQ-3.3). The NODE_ENV guard makes the pretty branch
// unreachable in prod even if pino-pretty were somehow present.
// -----------------------------------------------------------------------------
function resolveTransport(): pino.TransportSingleOptions | undefined {
  const nodeEnv = process.env.NODE_ENV ?? "development";
  if (nodeEnv === "production" || nodeEnv === "test") {
    return undefined;
  }
  return {
    target: "pino-pretty",
    options: {
      translateTime: true,
      colorize: true,
    },
  };
}

// -----------------------------------------------------------------------------
// Exported helper — allows tests to inspect the options object without needing
// to capture stdout or spy on pino internals.
// -----------------------------------------------------------------------------
export function getLoggerOptions(): pino.LoggerOptions {
  return {
    level: resolveLevel(),
    base: { service: "spotiarr-backend" },
    redact: {
      paths: REDACT_PATHS,
      censor: "[Redacted]",
    },
    transport: resolveTransport(),
  };
}

// -----------------------------------------------------------------------------
// Singleton logger — the ONLY place in apps/backend/src that imports pino.
// All other modules use logger.child({ component, ...fields }).
// -----------------------------------------------------------------------------
export const logger = pino(getLoggerOptions());
