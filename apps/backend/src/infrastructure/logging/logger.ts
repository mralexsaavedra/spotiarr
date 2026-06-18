import pino from "pino";

// Security: secrets must never reach log output. Do not narrow this list.
export const REDACT_PATHS: string[] = [
  "token",
  "spotiarrToken",
  "SPOTIARR_TOKEN",
  "clientSecret",
  "client_secret",
  "SPOTIFY_CLIENT_SECRET",
  "authorization",
  "access_token",
  "refresh_token",
  "apiKey",
  "api_key",
  "*.token",
  "*.secret",
  "*.clientSecret",
  "*.SPOTIFY_CLIENT_SECRET",
  "*.authorization",
  "*.access_token",
  "*.refresh_token",
  "*.apiKey",
  "*.api_key",
  "headers.authorization",
];

// Reads process.env directly, not getEnv(): the logger may be imported before
// environment validation runs. Zod still validates LOG_LEVEL for fail-fast startup.
function resolveLevel(): string {
  const explicit = process.env.LOG_LEVEL;
  if (explicit) return explicit;

  const nodeEnv = process.env.NODE_ENV ?? "development";
  if (nodeEnv === "production") return "info";
  if (nodeEnv === "test") return "silent";
  return "debug";
}

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

export const logger = pino(getLoggerOptions());
