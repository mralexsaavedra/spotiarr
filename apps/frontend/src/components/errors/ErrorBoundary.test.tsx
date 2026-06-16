import { render, screen, fireEvent } from "@testing-library/react";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { ErrorBoundary } from "./ErrorBoundary";

// Silence the expected console.error from ErrorBoundary.componentDidCatch
const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

afterEach(() => {
  consoleErrorSpy.mockClear();
});

afterAll(() => {
  consoleErrorSpy.mockRestore();
});

const ThrowingChild = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error("Test error message");
  }
  return <span>Safe child</span>;
};

describe("ErrorBoundary", () => {
  it("renders children when no error is thrown", () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Safe child")).toBeTruthy();
  });

  it("renders default fallback when child throws and no fallback prop is provided", () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Something went wrong")).toBeTruthy();
    expect(screen.getByText("Test error message")).toBeTruthy();
  });

  it("renders a 'Try again' button in the default fallback", () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
  });

  it("resets error state when 'Try again' is clicked — hides the fallback", () => {
    // After reset the boundary clears its error state.
    // Re-render with a non-throwing child to confirm children render.
    let shouldThrow = true;
    const ControlledChild = () => {
      if (shouldThrow) throw new Error("Boom");
      return <span>Safe child</span>;
    };

    const { rerender } = render(
      <ErrorBoundary>
        <ControlledChild />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Something went wrong")).toBeTruthy();

    // Click reset, then re-render without throwing
    shouldThrow = false;
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    rerender(
      <ErrorBoundary>
        <ControlledChild />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Safe child")).toBeTruthy();
  });

  it("calls custom fallback prop with error and reset function", () => {
    const fallback = vi.fn().mockReturnValue(<span>Custom fallback</span>);
    render(
      <ErrorBoundary fallback={fallback}>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Custom fallback")).toBeTruthy();
    expect(fallback).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Test error message" }),
      expect.any(Function),
    );
  });
});
