import type { CorsOptions } from "cors";

export function buildCorsOptions(allowlist: string[] | undefined): CorsOptions | null {
  // Defense in depth: never let a wildcard reach the cors middleware, since
  // `origin: "*"` combined with `credentials: true` would defeat the policy.
  const origins = allowlist?.filter((origin) => origin !== "*") ?? [];
  if (origins.length === 0) {
    return null;
  }

  return {
    origin: origins,
    credentials: true,
  };
}

export function resolveAllowedOrigin(
  requestOrigin: string | undefined,
  allowlist: string[] | undefined,
): string | null {
  if (!requestOrigin || !allowlist || allowlist.length === 0) {
    return null;
  }

  return allowlist.includes(requestOrigin) ? requestOrigin : null;
}
