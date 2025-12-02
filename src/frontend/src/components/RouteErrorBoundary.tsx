import { FC, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Path } from "../routes/routes";
import { ErrorBoundary } from "./ErrorBoundary";

interface RouteErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

const RouteErrorFallback: FC<RouteErrorFallbackProps> = ({ error, resetError }) => {
  const navigate = useNavigate();

  const handleGoHome = () => {
    resetError();
    navigate(Path.HOME);
  };

  return (
    <div className="flex-1 bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-background-elevated rounded-lg p-8 text-center space-y-6">
        <div className="text-6xl">😵</div>
        <h1 className="text-2xl font-bold text-text-primary">Page Error</h1>
        <p className="text-text-secondary text-sm">
          This page encountered an error. Don't worry, the rest of the app is still working.
        </p>
        {import.meta.env.DEV && (
          <p className="text-xs text-red-400 font-mono break-all">{error.message}</p>
        )}
        <div className="flex gap-3 justify-center">
          <button
            onClick={resetError}
            className="px-4 py-2 bg-background-hover text-text-primary font-semibold rounded-md hover:bg-white/10 transition-colors text-sm"
          >
            Try Again
          </button>
          <button
            onClick={handleGoHome}
            className="px-4 py-2 bg-primary text-black font-semibold rounded-md hover:bg-primary/90 transition-colors text-sm"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
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
