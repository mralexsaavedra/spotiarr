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
      <div className="max-w-2xl w-full bg-background-elevated rounded-lg p-8 space-y-6">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center">
            <FontAwesomeIcon icon="triangle-exclamation" className="text-4xl text-red-400" />
          </div>
        </div>

        {/* Title */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-text-primary">{title}</h1>
          <p className="text-text-secondary">{description}</p>
        </div>

        {/* Error details (only in dev) */}
        {isDev && error && (
          <div className="bg-background rounded-md p-4 space-y-2 text-left">
            <h2 className="text-sm font-semibold text-text-primary">Error Details (Dev Only)</h2>
            <p className="text-xs text-red-400 font-mono break-all">{error.message}</p>
            {error.stack && (
              <details className="text-xs text-text-secondary">
                <summary className="cursor-pointer hover:text-text-primary">Stack Trace</summary>
                <pre className="mt-2 overflow-auto max-h-40 text-[10px] leading-tight">
                  {error.stack}
                </pre>
              </details>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-center">
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-6 py-3 bg-primary text-black font-semibold rounded-md hover:bg-primary/90 transition-colors"
            >
              Try Again
            </button>
          )}
          {onGoHome && (
            <button
              onClick={onGoHome}
              className="px-6 py-3 bg-background-hover text-text-primary font-semibold rounded-md hover:bg-white/10 transition-colors"
            >
              Go Home
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
