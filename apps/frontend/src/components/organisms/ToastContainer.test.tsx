import { render, screen, act, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ToastProvider, useToast } from "@/contexts/ToastContext";
import { ToastContainer } from "./ToastContainer";

// Helper component that exposes addToast to test code via a ref callback
const AddToastTrigger = ({
  onMount,
}: {
  onMount: (add: (msg: string, type: "success" | "error" | "info" | "warning") => void) => void;
}) => {
  const { addToast } = useToast();
  onMount(addToast);
  return null;
};

const renderWithProvider = (
  onMount: (add: (msg: string, type: "success" | "error" | "info" | "warning") => void) => void,
) => {
  return render(
    <ToastProvider>
      <AddToastTrigger onMount={onMount} />
      <ToastContainer />
    </ToastProvider>,
  );
};

describe("ToastContainer", () => {
  it("renders nothing when there are no toasts", () => {
    const { container } = render(
      <ToastProvider>
        <ToastContainer />
      </ToastProvider>,
    );
    expect(container.querySelectorAll("[role='alert']")).toHaveLength(0);
  });

  it("renders a toast when one is added", () => {
    let addToast!: (msg: string, type: "success" | "error" | "info" | "warning") => void;
    renderWithProvider((fn) => {
      addToast = fn;
    });

    act(() => {
      addToast("Hello toast", "success");
    });

    expect(screen.getAllByRole("alert")).toHaveLength(1);
    expect(screen.getByText("Hello toast")).toBeTruthy();
  });

  it("renders multiple toasts when several are added", () => {
    let addToast!: (msg: string, type: "success" | "error" | "info" | "warning") => void;
    renderWithProvider((fn) => {
      addToast = fn;
    });

    act(() => {
      addToast("First", "success");
      addToast("Second", "error");
      addToast("Third", "info");
    });

    expect(screen.getAllByRole("alert")).toHaveLength(3);
    expect(screen.getByText("First")).toBeTruthy();
    expect(screen.getByText("Second")).toBeTruthy();
    expect(screen.getByText("Third")).toBeTruthy();
  });

  it("clicking the close button triggers removal flow without throwing", () => {
    let addToast!: (msg: string, type: "success" | "error" | "info" | "warning") => void;
    renderWithProvider((fn) => {
      addToast = fn;
    });

    act(() => {
      addToast("Closable toast", "warning");
    });

    expect(screen.getAllByRole("alert")).toHaveLength(1);

    const closeBtn = screen.getByRole("button");
    expect(() => fireEvent.click(closeBtn)).not.toThrow();
  });

  it("throws when useToast is used outside ToastProvider", () => {
    // Confirm the hook enforces provider boundary
    const Bad = () => {
      useToast();
      return null;
    };
    expect(() => render(<Bad />)).toThrow("useToast must be used within a ToastProvider");
  });
});
