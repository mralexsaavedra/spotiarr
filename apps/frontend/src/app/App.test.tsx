import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { App } from "./App";

// __APP_VERSION__ is a Vite define — not injected by vitest; stub the module
vi.mock("@/config/version", () => ({
  APP_VERSION: "0.0.0-test",
}));

// Prevent real server-event connections and language sync side-effects
vi.mock("@/hooks/useServerEvents", () => ({
  useServerEvents: () => undefined,
}));

vi.mock("@/hooks/useLanguageSync", () => ({
  useLanguageSync: () => undefined,
}));

// TokenGate: render children immediately (bypass auth)
vi.mock("@/components/organisms/TokenGate", () => ({
  TokenGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ToastContainer is a side-effect-free overlay
vi.mock("@/components/organisms/ToastContainer", () => ({
  ToastContainer: () => null,
}));

// Routing: render a stable sentinel so we can assert App mounted
vi.mock("@/routes/Routing", () => ({
  Routing: () => <div data-testid="routing-sentinel" />,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

function renderApp() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("App", () => {
  it("mounts without crashing", () => {
    const { container } = renderApp();
    expect(container).toBeTruthy();
  });

  it("renders the routing sentinel — App wires up router and providers correctly", () => {
    renderApp();
    expect(screen.getByTestId("routing-sentinel")).toBeTruthy();
  });
});
