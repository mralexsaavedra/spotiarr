import { AppError } from "@/domain/errors/app-error";

const CIRCUIT_BREAKER_STATE = {
  CLOSED: "closed",
  OPEN: "open",
  HALF_OPEN: "half-open",
} as const;

type CircuitBreakerState = (typeof CIRCUIT_BREAKER_STATE)[keyof typeof CIRCUIT_BREAKER_STATE];

interface Waiter {
  fn: () => Promise<Response>;
  resolve: (value: Response) => void;
  reject: (reason?: unknown) => void;
}

interface CircuitBreakerOptions {
  maxWaiters?: number;
  /**
   * Called whenever the circuit opens or extends its open window.
   * Use this to persist `openUntilMs` so it survives process restarts.
   */
  onOpen?: (openUntilMs: number) => void;
  /**
   * Seed the circuit with a previously persisted open-until timestamp
   * so we don't hammer Spotify immediately after a restart.
   */
  initialOpenUntilMs?: number;
}

export class CircuitBreaker {
  private state: CircuitBreakerState = CIRCUIT_BREAKER_STATE.CLOSED;
  private openUntil = 0;
  private readonly maxWaiters: number;
  private readonly waiters: Waiter[] = [];
  private probeInFlight = false;
  private consecutiveOpenCount = 0;
  private onOpenCallback?: (openUntilMs: number) => void;

  constructor(options: CircuitBreakerOptions = {}) {
    this.maxWaiters = Math.max(1, options.maxWaiters ?? 200);
    this.onOpenCallback = options.onOpen;

    if (options.initialOpenUntilMs && options.initialOpenUntilMs > Date.now()) {
      this.openUntil = options.initialOpenUntilMs;
      this.state = CIRCUIT_BREAKER_STATE.OPEN;
      const remainingMs = options.initialOpenUntilMs - Date.now();
      console.warn(
        `[CircuitBreaker] Restored OPEN state from persistent store — ${Math.ceil(remainingMs / 1000)}s remaining`,
      );
    }
  }

  /**
   * Register a callback to be called whenever the circuit opens.
   * Use this to persist the open-until timestamp across process restarts.
   */
  setOnOpenCallback(fn: (openUntilMs: number) => void): void {
    this.onOpenCallback = fn;
  }

  isOpen(): boolean {
    if (this.state !== CIRCUIT_BREAKER_STATE.OPEN) return false;
    return Date.now() < this.openUntil;
  }

  getOpenUntil(): number {
    return this.openUntil;
  }

  /**
   * Restore persisted open-until timestamp after construction.
   * Safe to call even if the window has already passed — no-op in that case.
   */
  restore(openUntilMs: number): void {
    if (openUntilMs > Date.now() && openUntilMs > this.openUntil) {
      this.openUntil = openUntilMs;
      this.state = CIRCUIT_BREAKER_STATE.OPEN;
      const remainingMs = openUntilMs - Date.now();
      console.warn(
        `[CircuitBreaker] Restored OPEN state — ${Math.ceil(remainingMs / 1000)}s remaining`,
      );
    }
  }

  execute(fn: () => Promise<Response>, options: { failFast?: boolean } = {}): Promise<Response> {
    if (this.state === CIRCUIT_BREAKER_STATE.OPEN) {
      if (Date.now() >= this.openUntil) {
        this.transitionTo(CIRCUIT_BREAKER_STATE.HALF_OPEN);
      } else {
        if (options.failFast || this.waiters.length >= this.maxWaiters) {
          throw new AppError(503, "circuit_open", "Spotify rate limit circuit breaker is open");
        }
        return new Promise<Response>((resolve, reject) => {
          this.waiters.push({ fn, resolve, reject });
        });
      }
    }

    if (this.state === CIRCUIT_BREAKER_STATE.HALF_OPEN) {
      if (this.probeInFlight) {
        if (options.failFast || this.waiters.length >= this.maxWaiters) {
          throw new AppError(503, "circuit_open", "Spotify rate limit circuit breaker is open");
        }
        return new Promise<Response>((resolve, reject) => {
          this.waiters.push({ fn, resolve, reject });
        });
      }

      this.probeInFlight = true;
      const promise = this.runFn(fn);
      // Reset the in-flight flag without leaving a floating rejection: the
      // caller owns `promise`, so swallow the rejection on this side chain only.
      promise
        .finally(() => {
          this.probeInFlight = false;
        })
        .catch(() => {});
      return promise;
    }

    // CLOSED
    return this.runFn(fn);
  }

  notifyRateLimit(retryAfterSeconds: number): void {
    // Apply exponential backoff multiplier on repeated opens to handle
    // Spotify's long-term throttling (which far exceeds the Retry-After header).
    // Each consecutive open doubles the window, capped at 4 hours.
    const backoffMultiplier = Math.min(Math.pow(2, this.consecutiveOpenCount), 16);
    const effectiveSeconds = Math.min(retryAfterSeconds * backoffMultiplier, 4 * 60 * 60);
    const retryAfterMs = effectiveSeconds * 1000;
    const newOpenUntil = Date.now() + retryAfterMs;

    if (this.state !== CIRCUIT_BREAKER_STATE.OPEN || newOpenUntil > this.openUntil) {
      this.openUntil = newOpenUntil;
      this.consecutiveOpenCount++;
      this.transitionTo(CIRCUIT_BREAKER_STATE.OPEN);
      this.onOpenCallback?.(this.openUntil);
    }
  }

  private async runFn(fn: () => Promise<Response>): Promise<Response> {
    try {
      const response = await fn();

      if (response.status === 429) {
        const retryAfterHeader = response.headers.get("Retry-After");
        const retryAfterSeconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 60;
        // Use notifyRateLimit so exponential backoff multiplier is applied
        this.notifyRateLimit(retryAfterSeconds);
        throw new AppError(429, "spotify_rate_limited", "Rate limited by Spotify API.");
      }

      if (this.state === CIRCUIT_BREAKER_STATE.HALF_OPEN) {
        this.transitionTo(CIRCUIT_BREAKER_STATE.CLOSED);
      }

      return response;
    } catch (error) {
      if (this.state === CIRCUIT_BREAKER_STATE.HALF_OPEN) {
        // Probe failed for a non-429 reason. Conservatively reopen for 30s.
        const isRateLimit = error instanceof AppError && error.errorCode === "spotify_rate_limited";
        if (!isRateLimit) {
          this.open(30_000);
        }
      }
      throw error;
    }
  }

  private open(retryAfterMs: number): void {
    this.openUntil = Date.now() + retryAfterMs;
    this.consecutiveOpenCount++;
    this.transitionTo(CIRCUIT_BREAKER_STATE.OPEN);
    this.onOpenCallback?.(this.openUntil);
  }

  private transitionTo(newState: CircuitBreakerState): void {
    const oldState = this.state;
    this.state = newState;
    if (newState === CIRCUIT_BREAKER_STATE.CLOSED) {
      this.consecutiveOpenCount = 0;
    }
    console.warn("[CircuitBreaker]", `State: ${oldState} -> ${newState}`, {
      retryAfterMs:
        newState === CIRCUIT_BREAKER_STATE.OPEN ? this.openUntil - Date.now() : undefined,
      consecutiveOpenCount: this.consecutiveOpenCount,
      queueSize: this.waiters.length,
    });
    if (newState === CIRCUIT_BREAKER_STATE.CLOSED) {
      this.flushWaiters();
    }
  }

  private flushWaiters(): void {
    const waiters = this.waiters.splice(0, this.waiters.length);
    for (const waiter of waiters) {
      this.execute(waiter.fn).then(waiter.resolve, waiter.reject);
    }
  }
}
