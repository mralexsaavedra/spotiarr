import { FC } from "react";
import { GenericErrorState } from "./GenericErrorState";

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

export const ErrorFallback: FC<ErrorFallbackProps> = ({ error, resetError }) => {
  return (
    <GenericErrorState
      error={error}
      onRetry={resetError}
      onGoHome={() => (window.location.href = "/")}
      variant="full-page"
    />
  );
};
