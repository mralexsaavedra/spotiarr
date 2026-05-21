import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Path } from "@/routes/routes";

export interface NavigationHelpers {
  handleGoBack: () => void;
  handleGoHome: () => void;
}

/**
 * Shared memoized navigation helpers.
 * Centralizes handleGoBack (navigate(-1)) and handleGoHome (navigate to HOME)
 * so controllers don't redefine them inline.
 */
export function useNavigationHelpers(): NavigationHelpers {
  const navigate = useNavigate();

  const handleGoBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const handleGoHome = useCallback(() => {
    navigate(Path.HOME);
  }, [navigate]);

  return { handleGoBack, handleGoHome };
}
