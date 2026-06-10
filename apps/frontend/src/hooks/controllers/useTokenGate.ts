import { ApiRoutes, type AuthSessionResponseDto } from "@spotiarr/shared";
import { useCallback, useEffect, useState } from "react";
import { clearUnauthorizedHandler, setUnauthorizedHandler } from "@/services/httpClient";
import { httpClient } from "@/services/httpClient";

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

    httpClient
      .get<AuthSessionResponseDto>(ApiRoutes.AUTH_SESSION)
      .then((data) => {
        if (cancelled) return;
        setPhase("unlocked");
        void data;
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const status = (err as { status?: number }).status;
        if (status === 401) {
          setPhase("locked");
        } else {
          setPhase("unlocked");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const unlock = useCallback(async (token: string): Promise<void> => {
    const response = await httpClient.post<{ ok: boolean }>(ApiRoutes.AUTH_UNLOCK, { token });
    void response;
    setSessionExpired(false);
    setPhase("unlocked");
  }, []);

  return { phase, unlock, sessionExpired };
};
