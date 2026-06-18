import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CircuitBreaker } from "./circuit-breaker";

const loggerMock = vi.hoisted(() => {
  const mock = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(),
  };
  mock.child.mockReturnValue(mock);
  return mock;
});
vi.mock("@/infrastructure/logging/logger", () => ({ logger: loggerMock }));

const START = 1_700_000_000_000;

function makeResponse(status: number, retryAfter?: string): Response {
  return {
    status,
    headers: {
      get: (header: string) => (header === "Retry-After" ? (retryAfter ?? null) : null),
    },
  } as unknown as Response;
}

describe("CircuitBreaker", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(START);
    loggerMock.warn.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("runs the function directly while CLOSED", async () => {
    const breaker = new CircuitBreaker();
    const fn = vi.fn().mockResolvedValue(makeResponse(200));

    const response = await breaker.execute(fn);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(200);
    expect(breaker.isOpen()).toBe(false);
  });

  it("opens the circuit and throws on a 429 response, honoring Retry-After", async () => {
    const onOpen = vi.fn();
    const breaker = new CircuitBreaker({ onOpen });
    const fn = vi.fn().mockResolvedValue(makeResponse(429, "30"));

    await expect(breaker.execute(fn)).rejects.toMatchObject({
      statusCode: 429,
      errorCode: "spotify_rate_limited",
    });

    expect(breaker.isOpen()).toBe(true);
    expect(breaker.getOpenUntil()).toBe(START + 30_000);
    expect(onOpen).toHaveBeenCalledWith(START + 30_000);
  });

  it("fails fast with a 503 while OPEN when failFast is requested", () => {
    const breaker = new CircuitBreaker();
    breaker.notifyRateLimit(60);

    expect(() => breaker.execute(vi.fn(), { failFast: true })).toThrowError(
      expect.objectContaining({ statusCode: 503, errorCode: "circuit_open" }),
    );
  });

  it("queues waiters while OPEN and rejects overflow beyond maxWaiters", () => {
    const breaker = new CircuitBreaker({ maxWaiters: 1 });
    breaker.notifyRateLimit(60);

    // First waiter is accepted and parked as a pending promise.
    const pending = breaker.execute(vi.fn().mockResolvedValue(makeResponse(200)));
    expect(pending).toBeInstanceOf(Promise);

    // Second waiter overflows the queue and is rejected synchronously.
    expect(() => breaker.execute(vi.fn())).toThrowError(
      expect.objectContaining({ statusCode: 503, errorCode: "circuit_open" }),
    );
  });

  it("applies an exponential backoff multiplier on consecutive opens", () => {
    const breaker = new CircuitBreaker();

    breaker.notifyRateLimit(60); // multiplier 2^0 = 1 -> 60s
    expect(breaker.getOpenUntil()).toBe(START + 60_000);

    breaker.notifyRateLimit(60); // multiplier 2^1 = 2 -> 120s
    expect(breaker.getOpenUntil()).toBe(START + 120_000);

    breaker.notifyRateLimit(60); // multiplier 2^2 = 4 -> 240s
    expect(breaker.getOpenUntil()).toBe(START + 240_000);
  });

  it("caps the backoff window at 4 hours", () => {
    const breaker = new CircuitBreaker();
    // A huge Retry-After must never exceed the 4h ceiling.
    breaker.notifyRateLimit(10 * 60 * 60);
    expect(breaker.getOpenUntil()).toBe(START + 4 * 60 * 60 * 1000);
  });

  it("transitions OPEN -> HALF-OPEN -> CLOSED on a successful probe and flushes waiters", async () => {
    const breaker = new CircuitBreaker();
    breaker.notifyRateLimit(30);

    const waiterFn = vi.fn().mockResolvedValue(makeResponse(200));
    const waiterPromise = breaker.execute(waiterFn);

    // Move past the open window so the next call probes (HALF-OPEN).
    vi.setSystemTime(START + 31_000);

    const probeFn = vi.fn().mockResolvedValue(makeResponse(200));
    const probeResponse = await breaker.execute(probeFn);

    expect(probeResponse.status).toBe(200);
    expect(breaker.isOpen()).toBe(false);

    // The parked waiter is replayed once the circuit closes.
    await expect(waiterPromise).resolves.toMatchObject({ status: 200 });
    expect(waiterFn).toHaveBeenCalledTimes(1);
  });

  it("reopens for 30s when a HALF-OPEN probe fails for a non-rate-limit reason", async () => {
    const breaker = new CircuitBreaker();
    breaker.notifyRateLimit(30);
    vi.setSystemTime(START + 31_000);

    const probeFn = vi.fn().mockRejectedValue(new Error("network down"));

    await expect(breaker.execute(probeFn)).rejects.toThrow("network down");
    expect(breaker.isOpen()).toBe(true);
    expect(breaker.getOpenUntil()).toBe(START + 31_000 + 30_000);
  });

  it("restores a persisted open window from the constructor", () => {
    const breaker = new CircuitBreaker({ initialOpenUntilMs: START + 60_000 });
    expect(breaker.isOpen()).toBe(true);
    expect(breaker.getOpenUntil()).toBe(START + 60_000);
  });

  it("ignores a constructor restore whose window has already passed", () => {
    const breaker = new CircuitBreaker({ initialOpenUntilMs: START - 1 });
    expect(breaker.isOpen()).toBe(false);
  });

  it("restore() extends the open window only when the timestamp is in the future and later", () => {
    const breaker = new CircuitBreaker();

    breaker.restore(START - 1); // past -> no-op
    expect(breaker.isOpen()).toBe(false);

    breaker.restore(START + 90_000); // future -> opens
    expect(breaker.isOpen()).toBe(true);
    expect(breaker.getOpenUntil()).toBe(START + 90_000);

    breaker.restore(START + 10_000); // earlier than current -> no-op
    expect(breaker.getOpenUntil()).toBe(START + 90_000);
  });

  it("invokes the onOpen callback set via setOnOpenCallback", () => {
    const breaker = new CircuitBreaker();
    const onOpen = vi.fn();
    breaker.setOnOpenCallback(onOpen);

    breaker.notifyRateLimit(60);

    expect(onOpen).toHaveBeenCalledWith(START + 60_000);
  });
});
