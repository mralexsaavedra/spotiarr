import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.resetError);
      }

      return (
        <div className="bg-background flex min-h-screen items-center justify-center p-6">
          <div className="bg-background-elevated w-full max-w-md space-y-6 rounded-lg p-8 text-center">
            <div className="text-6xl">💥</div>
            <h1 className="text-text-primary text-2xl font-bold">Something went wrong</h1>
            <p className="text-text-secondary text-sm">
              {this.state.error.message || "An unexpected error occurred"}
            </p>
            <button
              onClick={this.resetError}
              className="bg-primary hover:bg-primary/90 rounded-md px-6 py-3 font-semibold text-black transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
