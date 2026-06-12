import type { SpotifyCircuitBreakerPort } from "@/application/ports/spotify-circuit-breaker.port";
import { CircuitBreaker } from "./circuit-breaker";

export class SpotifyCircuitBreakerAdapter implements SpotifyCircuitBreakerPort {
  constructor(private readonly circuitBreaker: CircuitBreaker) {}

  isOpen(): boolean {
    return this.circuitBreaker.isOpen();
  }
}
