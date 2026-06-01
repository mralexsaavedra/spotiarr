import { getEnv } from "@/infrastructure/setup/environment";
import { CircuitBreaker } from "./circuit-breaker";
import { RateLimiter } from "./rate-limiter";
import { SpotifyAuthService } from "./spotify-auth.service";

const DEFAULT_SPOTIFY_HTTP_MAX_CONCURRENCY = 5;
const DEFAULT_SPOTIFY_HTTP_QUEUE_TIMEOUT_MS = 60_000;
const DEFAULT_SPOTIFY_HTTP_MIN_INTERVAL_MS = 100;

// Background sync limiter — more conservative to avoid starving user requests
const DEFAULT_SPOTIFY_SYNC_MAX_CONCURRENCY = 1;
const DEFAULT_SPOTIFY_SYNC_QUEUE_TIMEOUT_MS = 600_000;
const DEFAULT_SPOTIFY_SYNC_MIN_INTERVAL_MS = 3_000;
const DEFAULT_SPOTIFY_INTERACTIVE_MAX_CONCURRENCY = 2;
const DEFAULT_SPOTIFY_INTERACTIVE_QUEUE_TIMEOUT_MS = 30_000;
const DEFAULT_SPOTIFY_INTERACTIVE_MIN_INTERVAL_MS = 300;

export const SPOTIFY_LIMITER_MODE = {
  USER: "user",
  SYNC: "sync",
  INTERACTIVE: "interactive",
} as const;

export type SpotifyLimiterMode = (typeof SPOTIFY_LIMITER_MODE)[keyof typeof SPOTIFY_LIMITER_MODE];

function resolveLimiterConfig(): {
  user: { maxConcurrency: number; queueTimeoutMs: number; minIntervalMs: number };
  sync: { maxConcurrency: number; queueTimeoutMs: number; minIntervalMs: number };
  interactive: { maxConcurrency: number; queueTimeoutMs: number; minIntervalMs: number };
} {
  try {
    const env = getEnv();
    return {
      user: {
        maxConcurrency: env.SPOTIFY_HTTP_MAX_CONCURRENCY,
        queueTimeoutMs: env.SPOTIFY_HTTP_QUEUE_TIMEOUT_MS,
        minIntervalMs: env.SPOTIFY_HTTP_MIN_INTERVAL_MS,
      },
      sync: {
        maxConcurrency: env.SPOTIFY_SYNC_MAX_CONCURRENCY,
        queueTimeoutMs: env.SPOTIFY_SYNC_QUEUE_TIMEOUT_MS,
        minIntervalMs: env.SPOTIFY_SYNC_MIN_INTERVAL_MS,
      },
      interactive: {
        maxConcurrency: env.SPOTIFY_INTERACTIVE_MAX_CONCURRENCY,
        queueTimeoutMs: env.SPOTIFY_INTERACTIVE_QUEUE_TIMEOUT_MS,
        minIntervalMs: env.SPOTIFY_INTERACTIVE_MIN_INTERVAL_MS,
      },
    };
  } catch {
    return {
      user: {
        maxConcurrency: DEFAULT_SPOTIFY_HTTP_MAX_CONCURRENCY,
        queueTimeoutMs: DEFAULT_SPOTIFY_HTTP_QUEUE_TIMEOUT_MS,
        minIntervalMs: DEFAULT_SPOTIFY_HTTP_MIN_INTERVAL_MS,
      },
      sync: {
        maxConcurrency: DEFAULT_SPOTIFY_SYNC_MAX_CONCURRENCY,
        queueTimeoutMs: DEFAULT_SPOTIFY_SYNC_QUEUE_TIMEOUT_MS,
        minIntervalMs: DEFAULT_SPOTIFY_SYNC_MIN_INTERVAL_MS,
      },
      interactive: {
        maxConcurrency: DEFAULT_SPOTIFY_INTERACTIVE_MAX_CONCURRENCY,
        queueTimeoutMs: DEFAULT_SPOTIFY_INTERACTIVE_QUEUE_TIMEOUT_MS,
        minIntervalMs: DEFAULT_SPOTIFY_INTERACTIVE_MIN_INTERVAL_MS,
      },
    };
  }
}

const limiterConfig = resolveLimiterConfig();

// User-facing limiter: faster, shorter timeout
const userRateLimiter = new RateLimiter({
  maxConcurrency: limiterConfig.user.maxConcurrency,
  queueTimeoutMs: limiterConfig.user.queueTimeoutMs,
  minIntervalMs: limiterConfig.user.minIntervalMs,
});

// Background sync limiter: slower, longer timeout, doesn't block user requests
const syncRateLimiter = new RateLimiter({
  maxConcurrency: limiterConfig.sync.maxConcurrency,
  queueTimeoutMs: limiterConfig.sync.queueTimeoutMs,
  minIntervalMs: limiterConfig.sync.minIntervalMs,
});

const interactiveRateLimiter = new RateLimiter({
  maxConcurrency: limiterConfig.interactive.maxConcurrency,
  queueTimeoutMs: limiterConfig.interactive.queueTimeoutMs,
  minIntervalMs: limiterConfig.interactive.minIntervalMs,
});

// Shared app-token limiter + circuit breaker to prevent 429 storms across workers
const appTokenRateLimiter = new RateLimiter({
  maxConcurrency: 2,
  minIntervalMs: 500,
  queueTimeoutMs: 120_000,
});

const appTokenCircuitBreaker = new CircuitBreaker();

/**
 * Configure the shared app-token circuit breaker with persistence callbacks.
 * Call this once at startup (after the settings repository is ready) to:
 * - Restore any persisted open-until timestamp (so restarts don't reset the breaker)
 * - Register a callback to persist the state whenever the circuit opens
 *
 * @param initialOpenUntilMs - timestamp (ms) read from persistent storage
 * @param onOpen             - called whenever the circuit opens; persist this value
 */
export function isAppTokenCircuitOpen(): boolean {
  return appTokenCircuitBreaker.isOpen();
}

export function getAppTokenCircuitOpenUntil(): number {
  return appTokenCircuitBreaker.getOpenUntil();
}

export function configureAppTokenCircuitBreaker(
  initialOpenUntilMs: number,
  onOpen: (openUntilMs: number) => void,
): void {
  if (initialOpenUntilMs > 0) {
    appTokenCircuitBreaker.restore(initialOpenUntilMs);
  }
  appTokenCircuitBreaker.setOnOpenCallback(onOpen);
}

export class SpotifyHttpClient {
  private readonly limiter: RateLimiter;
  private readonly useFailFastRetry: boolean;

  constructor(
    private readonly authService: SpotifyAuthService,
    limiterMode: SpotifyLimiterMode = "user",
    useFailFastRetryOverride?: boolean,
  ) {
    let resolvedLimiter = userRateLimiter;
    let useFailFastRetry = false;

    if (limiterMode === SPOTIFY_LIMITER_MODE.SYNC) {
      resolvedLimiter = syncRateLimiter;
    }

    if (limiterMode === SPOTIFY_LIMITER_MODE.INTERACTIVE) {
      resolvedLimiter = interactiveRateLimiter;
      useFailFastRetry = true;
    }

    this.limiter = resolvedLimiter;
    this.useFailFastRetry = useFailFastRetryOverride ?? useFailFastRetry;
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async fetchWithRateLimitRetry(
    input: string | URL,
    init?: RequestInit,
    retries = 0,
    options: { failFast?: boolean } = {},
  ): Promise<Response> {
    const isFailFast = options.failFast === true;
    const MAX_RETRIES = isFailFast ? 0 : 5;

    try {
      const response = await fetch(input.toString(), init);
      // 429: return immediately — circuit breaker's runFn owns the backoff
      return response;
    } catch (err: unknown) {
      const error = err as { message?: string; cause?: { code?: string } };
      const isNetworkError =
        error.message?.includes("fetch failed") ||
        error.cause?.code === "ETIMEDOUT" ||
        error.cause?.code === "UND_ERR_CONNECT_TIMEOUT" ||
        error.cause?.code === "ECONNRESET";

      if (isNetworkError && retries < MAX_RETRIES) {
        const waitMs = Math.pow(2, retries) * 2000;
        console.warn(
          `[SpotifyHttpClient] Network error (${error.message}). Retrying in ${waitMs}ms (${retries + 1}/${MAX_RETRIES})`,
        );
        await this.sleep(waitMs);
        return this.fetchWithRateLimitRetry(input, init, retries + 1, options);
      }

      throw error;
    }
  }

  /**
   * Perform a fetch using the Spotify application access token.
   */
  async fetchWithAppToken(input: string | URL, init?: RequestInit): Promise<Response> {
    const token = await this.authService.getAppToken();
    const headers = {
      ...init?.headers,
      Authorization: `Bearer ${token}`,
    } as Record<string, string>;

    return appTokenCircuitBreaker.execute(
      () =>
        appTokenRateLimiter.queueRequest(() =>
          this.fetchWithRateLimitRetry(input, { ...init, headers }, 0, {
            failFast: this.useFailFastRetry,
          }),
        ),
      { failFast: this.useFailFastRetry },
    );
  }

  private fetchUserTokenRequest(
    input: string | URL,
    token: string,
    init?: RequestInit,
  ): Promise<Response> {
    const headers = {
      ...init?.headers,
      Authorization: `Bearer ${token}`,
    } as Record<string, string>;

    return this.limiter.queueRequest(() =>
      this.fetchWithRateLimitRetry(
        input,
        {
          ...init,
          headers,
        },
        0,
        { failFast: this.useFailFastRetry },
      ),
    );
  }

  /**
   * Perform a fetch using the Spotify user access token, automatically
   * attempting a single refresh on 401 responses.
   */
  async fetchWithUserToken(input: string | URL, init?: RequestInit): Promise<Response> {
    const initialToken = await this.authService.getUserToken();
    const response = await this.fetchUserTokenRequest(input, initialToken, init);

    if (response.status !== 401) {
      return response;
    }

    // Try to refresh the token once
    const refreshed = await this.authService.refreshUserToken();
    if (!refreshed) {
      return response;
    }

    const newToken = await this.authService.getUserToken();
    return this.fetchUserTokenRequest(input, newToken, init);
  }
}
