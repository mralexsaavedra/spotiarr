import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PreviewError } from "./PreviewError";

describe("PreviewError", () => {
  it("renders the heading and default message when no error is provided", () => {
    render(<PreviewError onGoBack={vi.fn()} />);

    expect(screen.getByText("Preview not available")).not.toBeNull();
    expect(screen.getByText("Could not load preview")).not.toBeNull();
  });

  it("renders the stringified error when error prop is provided", () => {
    render(<PreviewError error="Network timeout" onGoBack={vi.fn()} />);

    expect(screen.getByText("Network timeout")).not.toBeNull();
  });

  it("renders the go back button", () => {
    render(<PreviewError onGoBack={vi.fn()} />);

    expect(screen.getByRole("button", { name: /go back/i })).not.toBeNull();
  });

  it("calls onGoBack when the button is clicked", () => {
    const onGoBack = vi.fn();
    render(<PreviewError onGoBack={onGoBack} />);

    fireEvent.click(screen.getByRole("button", { name: /go back/i }));

    expect(onGoBack).toHaveBeenCalledTimes(1);
  });

  it("stringifies a non-string error value", () => {
    const error = new Error("Something went wrong");
    render(<PreviewError error={error} onGoBack={vi.fn()} />);

    expect(screen.getByText(String(error))).not.toBeNull();
  });
});
