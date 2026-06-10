import { useCallback, useEffect, useRef, useState } from "react";
import { clearUnauthorizedHandler, setUnauthorizedHandler } from "@/services/httpClient";
import { useUnlockMutation } from "../mutations/useUnlockMutation";
import { useAuthSessionQuery } from "../queries/useAuthSessionQuery";

type GatePhase = "checking" | "locked" | "unlocked" | "error";

export const useTokenGate = () => {
  const session = useAuthSessionQuery();
  const unlockMutation = useUnlockMutation();

  const wasUnlocked = useRef(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [forcedPhase, setForcedPhase] = useState<"locked" | null>(null);

  const derivedPhase: GatePhase = (() => {
    if (session.isPending || session.isFetching) return "checking";
    if (session.isSuccess) return "unlocked";
    const status = (session.error as { status?: number } | null)?.status;
    if (status === 401) return "locked";
    return "error";
  })();

  const phase: GatePhase = forcedPhase ?? derivedPhase;

  if (derivedPhase === "unlocked") {
    wasUnlocked.current = true;
  }

  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (wasUnlocked.current) {
        setSessionExpired(true);
        wasUnlocked.current = false;
      }
      setForcedPhase("locked");
    });
    return () => clearUnauthorizedHandler();
  }, []);

  const unlock = useCallback(
    async (token: string): Promise<void> => {
      await unlockMutation.mutateAsync(token);
      setSessionExpired(false);
      setForcedPhase(null);
    },
    [unlockMutation],
  );

  return { phase, unlock, sessionExpired };
};
