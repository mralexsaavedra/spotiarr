import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { RouteErrorBoundary } from "./RouteErrorBoundary";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Suppress expected React error boundary console.error noise
const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

afterEach(() => {
  consoleErrorSpy.mockClear();
});

afterAll(() => {
  consoleErrorSpy.mockRestore();
});

const ThrowingChild = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error("Route error");
  }
  return <span>Child content</span>;
};

const renderInRouter = (ui: React.ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe("RouteErrorBoundary", () => {
  it("renders children when no error is thrown", () => {
    renderInRouter(
      <RouteErrorBoundary>
        <ThrowingChild shouldThrow={false} />
      </RouteErrorBoundary>,
    );
    expect(screen.getByText("Child content")).toBeTruthy();
  });

  it("renders fallback with i18n title when a child throws", () => {
    renderInRouter(
      <RouteErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </RouteErrorBoundary>,
    );
    expect(screen.getByText("common.errors.pageError")).toBeTruthy();
  });

  it("renders a retry button in the fallback", () => {
    renderInRouter(
      <RouteErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </RouteErrorBoundary>,
    );
    expect(screen.getByRole("button", { name: "Try Again" })).toBeTruthy();
  });

  it("renders a go home button in the fallback", () => {
    renderInRouter(
      <RouteErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </RouteErrorBoundary>,
    );
    expect(screen.getByRole("button", { name: "Go Home" })).toBeTruthy();
  });

  it("resets and renders children again after clicking Try Again", () => {
    // Provide a stable ref so we can flip shouldThrow without remounting
    // the boundary. We rerender BEFORE the reset click so the boundary
    // receives safe children by the time it re-renders after reset.
    const { rerender } = renderInRouter(
      <RouteErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </RouteErrorBoundary>,
    );

    expect(screen.getByText("common.errors.pageError")).toBeTruthy();

    // Swap children to non-throwing FIRST, then click reset.
    // This prevents the boundary from immediately re-catching after reset.
    rerender(
      <MemoryRouter>
        <RouteErrorBoundary>
          <ThrowingChild shouldThrow={false} />
        </RouteErrorBoundary>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Try Again" }));

    expect(screen.getByText("Child content")).toBeTruthy();
  });
});
