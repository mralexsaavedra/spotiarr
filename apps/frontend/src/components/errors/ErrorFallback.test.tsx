import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ErrorFallback } from "./ErrorFallback";

// ErrorFallback delegates to GenericErrorState which uses onGoHome to set window.location.href
// We just need the error and resetError contract tested.

describe("ErrorFallback", () => {
  it("renders without crashing", () => {
    const { container } = render(
      <ErrorFallback error={new Error("Something failed")} resetError={vi.fn()} />,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it("renders a retry button", () => {
    render(<ErrorFallback error={new Error("fail")} resetError={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Try Again" })).toBeTruthy();
  });

  it("calls resetError when Try Again is clicked", () => {
    const resetError = vi.fn();
    render(<ErrorFallback error={new Error("fail")} resetError={resetError} />);
    fireEvent.click(screen.getByRole("button", { name: "Try Again" }));
    expect(resetError).toHaveBeenCalledTimes(1);
  });

  it("renders a Go Home button", () => {
    render(<ErrorFallback error={new Error("fail")} resetError={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Go Home" })).toBeTruthy();
  });
});
