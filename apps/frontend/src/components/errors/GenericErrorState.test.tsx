import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GenericErrorState } from "./GenericErrorState";

describe("GenericErrorState", () => {
  it("renders with default title and description", () => {
    render(<GenericErrorState />);
    expect(screen.getByText("Oops! Something went wrong")).toBeTruthy();
    expect(
      screen.getByText(
        "Don't worry, this happens sometimes. Try refreshing the page or going back home.",
      ),
    ).toBeTruthy();
  });

  it("renders custom title and description when provided", () => {
    render(<GenericErrorState title="Custom Title" description="Custom description." />);
    expect(screen.getByText("Custom Title")).toBeTruthy();
    expect(screen.getByText("Custom description.")).toBeTruthy();
  });

  it("renders Try Again button when onRetry is provided", () => {
    render(<GenericErrorState onRetry={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Try Again" })).toBeTruthy();
  });

  it("does not render Try Again button when onRetry is absent", () => {
    render(<GenericErrorState />);
    expect(screen.queryByRole("button", { name: "Try Again" })).toBeNull();
  });

  it("calls onRetry when Try Again is clicked", () => {
    const onRetry = vi.fn();
    render(<GenericErrorState onRetry={onRetry} />);
    fireEvent.click(screen.getByRole("button", { name: "Try Again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("renders Go Home button when onGoHome is provided", () => {
    render(<GenericErrorState onGoHome={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Go Home" })).toBeTruthy();
  });

  it("does not render Go Home button when onGoHome is absent", () => {
    render(<GenericErrorState />);
    expect(screen.queryByRole("button", { name: "Go Home" })).toBeNull();
  });

  it("calls onGoHome when Go Home is clicked", () => {
    const onGoHome = vi.fn();
    render(<GenericErrorState onGoHome={onGoHome} />);
    fireEvent.click(screen.getByRole("button", { name: "Go Home" }));
    expect(onGoHome).toHaveBeenCalledTimes(1);
  });

  it("renders both buttons when both handlers are provided", () => {
    render(<GenericErrorState onRetry={vi.fn()} onGoHome={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Try Again" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Go Home" })).toBeTruthy();
  });
});
