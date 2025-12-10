import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FC } from "react";

interface GenericErrorStateProps {
  title?: string;
  description?: string;
  error?: Error;
  onRetry?: () => void;
  onGoHome?: () => void;
  variant?: "full-page" | "embedded";
}

export const GenericErrorState: FC<GenericErrorStateProps> = ({
  title = "Oops! Something went wrong",
  description = "Don't worry, this happens sometimes. Try refreshing the page or going back home.",
  error,
  onRetry,
  onGoHome,
  variant = "full-page",
}) => {
  const isDev = import.meta.env.DEV;
  const containerClass =
    variant === "full-page"
      ? "min-h-screen bg-background flex items-center justify-center p-6"
      : "flex-1 bg-background flex items-center justify-center p-6";

  return (
    <div className={containerClass}>
      <div className="bg-background-elevated w-full max-w-2xl space-y-6 rounded-lg p-8">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10">
            <FontAwesomeIcon icon={faTriangleExclamation} className="text-4xl text-red-400" />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2 text-center">
          <h1 className="text-text-primary text-3xl font-bold">{title}</h1>
          <p className="text-text-secondary">{description}</p>
        </div>

        {/* Error details (only in dev) */}
        {isDev && error && (
          <div className="bg-background space-y-2 rounded-md p-4 text-left">
            <h2 className="text-text-primary text-sm font-semibold">Error Details (Dev Only)</h2>
            <p className="font-mono text-xs break-all text-red-400">{error.message}</p>
            {error.stack && (
              <details className="text-text-secondary text-xs">
                <summary className="hover:text-text-primary cursor-pointer">Stack Trace</summary>
                <pre className="mt-2 max-h-40 overflow-auto text-[10px] leading-tight">
                  {error.stack}
                </pre>
              </details>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-center gap-3">
          {onRetry && (
            <button
              onClick={onRetry}
              className="bg-primary hover:bg-primary/90 rounded-md px-6 py-3 font-semibold text-black transition-colors"
            >
              Try Again
            </button>
          )}
          {onGoHome && (
            <button
              onClick={onGoHome}
              className="bg-background-hover text-text-primary rounded-md px-6 py-3 font-semibold transition-colors hover:bg-white/10"
            >
              Go Home
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
