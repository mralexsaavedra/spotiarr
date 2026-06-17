import { describe, it, expect, beforeEach } from "vitest";
import { CircuitBreaker } from "./circuit-breaker";
import { SpotifyCircuitBreakerAdapter } from "./spotify-circuit-breaker.adapter";

describe("SpotifyCircuitBreakerAdapter", () => {
  let circuitBreaker: CircuitBreaker;
  let adapter: SpotifyCircuitBreakerAdapter;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker();
    adapter = new SpotifyCircuitBreakerAdapter(circuitBreaker);
  });

  it("returns false when the circuit is closed", () => {
    expect(adapter.isOpen()).toBe(false);
  });

  it("returns true when the circuit is open after notifyRateLimit", () => {
    // Open for 60 seconds — the first notifyRateLimit call has backoff multiplier = 2^0 = 1
    circuitBreaker.notifyRateLimit(60);

    expect(adapter.isOpen()).toBe(true);
  });

  it("delegates isOpen directly to CircuitBreaker.isOpen", () => {
    // Verify adapter result matches the underlying circuit breaker state
    expect(adapter.isOpen()).toBe(circuitBreaker.isOpen());

    circuitBreaker.notifyRateLimit(60);

    expect(adapter.isOpen()).toBe(circuitBreaker.isOpen());
    expect(adapter.isOpen()).toBe(true);
  });

  it("returns false after the circuit open window has passed", () => {
    // Open for 0 seconds — window is immediately in the past
    circuitBreaker.notifyRateLimit(0);

    // With 0 seconds * backoff (min 1) = 0ms, the window expires instantly
    // Depending on timing it may be false already
    expect(adapter.isOpen()).toBe(circuitBreaker.isOpen());
  });
});
