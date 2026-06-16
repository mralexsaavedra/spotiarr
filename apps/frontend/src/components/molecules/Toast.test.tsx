import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Toast as ToastType } from "@/contexts/ToastContext";
import { Toast } from "./Toast";

const makeToast = (overrides: Partial<ToastType> = {}): ToastType => ({
  id: "toast-1",
  message: "Operation successful",
  type: "success",
  ...overrides,
});

describe("Toast", () => {
  it("renders the message", () => {
    render(<Toast toast={makeToast()} onRemove={vi.fn()} />);

    expect(screen.getByText("Operation successful")).not.toBeNull();
  });

  it("renders with role alert", () => {
    render(<Toast toast={makeToast()} onRemove={vi.fn()} />);

    expect(screen.getByRole("alert")).not.toBeNull();
  });

  it("renders a success toast", () => {
    const { container } = render(
      <Toast toast={makeToast({ type: "success" })} onRemove={vi.fn()} />,
    );

    expect((container.firstChild as HTMLElement).className).toContain("green");
  });

  it("renders an error toast", () => {
    const { container } = render(
      <Toast
        toast={makeToast({ type: "error", message: "Something failed" })}
        onRemove={vi.fn()}
      />,
    );

    expect((container.firstChild as HTMLElement).className).toContain("red");
    expect(screen.getByText("Something failed")).not.toBeNull();
  });

  it("renders a warning toast", () => {
    const { container } = render(
      <Toast toast={makeToast({ type: "warning", message: "Be careful" })} onRemove={vi.fn()} />,
    );

    expect((container.firstChild as HTMLElement).className).toContain("yellow");
  });

  it("renders an info toast", () => {
    const { container } = render(
      <Toast toast={makeToast({ type: "info", message: "FYI" })} onRemove={vi.fn()} />,
    );

    expect((container.firstChild as HTMLElement).className).toContain("blue");
  });

  it("renders a close button", () => {
    render(<Toast toast={makeToast()} onRemove={vi.fn()} />);

    expect(screen.getByRole("button")).not.toBeNull();
  });

  it("calls onRemove after clicking the close button", () => {
    vi.useFakeTimers();
    const onRemove = vi.fn();
    render(<Toast toast={makeToast({ id: "t-42" })} onRemove={onRemove} />);

    fireEvent.click(screen.getByRole("button"));
    vi.runAllTimers();

    expect(onRemove).toHaveBeenCalledWith("t-42");
    vi.useRealTimers();
  });
});
