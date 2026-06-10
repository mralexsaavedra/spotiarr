import { useCallback, useEffect, useRef, useState } from "react";
import { authService } from "@/services/auth.service";
import { clearUnauthorizedHandler, setUnauthorizedHandler } from "@/services/httpClient";

type GatePhase = "checking" | "locked" | "unlocked";

const MAX_PROBE_ATTEMPTS = 5;
const PROBE_RETRY_DELAY_MS = 1000;

export const useTokenGate = () => {
  const [phase, setPhase] = useState<GatePhase>("checking");
  const [sessionExpired, setSessionExpired] = useState(false);
  const wasUnlocked = useRef(false);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (wasUnlocked.current) setSessionExpired(true);
      wasUnlocked.current = false;
      setPhase("locked");
    });
    return () => clearUnauthorizedHandler();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let retryTimeout: ReturnType<typeof setTimeout> | undefined;

    const probe = (attempt: number) => {
      authService
        .getSession()
        .then(() => {
          if (cancelled) return;
          wasUnlocked.current = true;
          setPhase("unlocked");
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          const status = (err as { status?: number }).status;
          if (status === 401) {
            setPhase("locked");
            return;
          }
          if (attempt < MAX_PROBE_ATTEMPTS) {
            retryTimeout = setTimeout(() => probe(attempt + 1), PROBE_RETRY_DELAY_MS);
          }
          // all retries exhausted: stay in "checking" — never auto-unlock
        });
    };

    probe(1);

    return () => {
      cancelled = true;
      clearTimeout(retryTimeout);
    };
  }, []);

  const unlock = useCallback(async (token: string): Promise<void> => {
    await authService.unlock(token);
    setSessionExpired(false);
    wasUnlocked.current = true;
    setPhase("unlocked");
  }, []);

  return { phase, unlock, sessionExpired };
};
