import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./app/App";
import { ErrorBoundary } from "./components/errors/ErrorBoundary";
import { ErrorFallback } from "./components/errors/ErrorFallback";
import { APP_CONFIG } from "./config/app";
import "./icons";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: APP_CONFIG.QUERY.STALE_TIME,
      gcTime: APP_CONFIG.QUERY.GC_TIME,
      refetchOnWindowFocus: false,
      retry: APP_CONFIG.QUERY.RETRY_COUNT,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary fallback={(error, reset) => <ErrorFallback error={error} resetError={reset} />}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);
