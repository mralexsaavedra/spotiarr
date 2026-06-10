import { useCallback, useEffect, useState } from "react";
import { authService } from "@/services/auth.service";
import { clearUnauthorizedHandler, setUnauthorizedHandler } from "@/services/httpClient";

type GatePhase = "checking" | "locked" | "unlocked";

export const useTokenGate = () => {
  const [phase, setPhase] = useState<GatePhase>("checking");
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setSessionExpired(true);
      setPhase("locked");
    });
    return () => clearUnauthorizedHandler();
  }, []);

  useEffect(() => {
    let cancelled = false;

    authService
      .getSession()
      .then(() => {
        if (!cancelled) setPhase("unlocked");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const status = (err as { status?: number }).status;
        setPhase(status === 401 ? "locked" : "unlocked");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const unlock = useCallback(async (token: string): Promise<void> => {
    await authService.unlock(token);
    setSessionExpired(false);
    setPhase("unlocked");
  }, []);

  return { phase, unlock, sessionExpired };
};
