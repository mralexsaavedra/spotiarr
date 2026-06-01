import type { SpotifyCircuitBreakerPort } from "@/application/ports/spotify-circuit-breaker.port";
import { isAppTokenCircuitOpen } from "./spotify-http.client";

export class SpotifyCircuitBreakerAdapter implements SpotifyCircuitBreakerPort {
  isOpen(): boolean {
    return isAppTokenCircuitOpen();
  }
}
