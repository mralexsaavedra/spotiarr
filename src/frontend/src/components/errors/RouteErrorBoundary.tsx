import { FC, ReactNode, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Path } from "../../routes/routes";
import { ErrorBoundary } from "./ErrorBoundary";
import { GenericErrorState } from "./GenericErrorState";

interface RouteErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

const RouteErrorFallback: FC<RouteErrorFallbackProps> = ({ error, resetError }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleGoHome = useCallback(() => {
    resetError();
    navigate(Path.HOME);
  }, [navigate, resetError]);

  return (
    <GenericErrorState
      title={t("common.errors.pageError")}
      description={t("common.errors.pageErrorDesc")}
      error={error}
      onRetry={resetError}
      onGoHome={handleGoHome}
      variant="embedded"
    />
  );
};

interface RouteErrorBoundaryProps {
  children: ReactNode;
}

export const RouteErrorBoundary: FC<RouteErrorBoundaryProps> = ({ children }) => {
  return (
    <ErrorBoundary
      fallback={(error, reset) => <RouteErrorFallback error={error} resetError={reset} />}
    >
      {children}
    </ErrorBoundary>
  );
};
