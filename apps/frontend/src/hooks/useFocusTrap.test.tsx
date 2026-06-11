import { act, fireEvent, render, renderHook } from "@testing-library/react";
import { useRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { useFocusTrap } from "./useFocusTrap";

describe("useFocusTrap", () => {
  it("focuses the first focusable element when isOpen becomes true", () => {
    const container = document.createElement("div");
    const btn1 = document.createElement("button");
    const btn2 = document.createElement("button");
    btn1.focus = vi.fn();
    btn2.focus = vi.fn();
    container.appendChild(btn1);
    container.appendChild(btn2);
    document.body.appendChild(container);

    const onClose = vi.fn();
    const { rerender } = renderHook(
      ({ isOpen }: { isOpen: boolean }) => {
        const ref = useRef<HTMLElement | null>(container);
        useFocusTrap(isOpen, ref, onClose);
      },
      { initialProps: { isOpen: false } },
    );

    expect(btn1.focus).not.toHaveBeenCalled();

    rerender({ isOpen: true });

    expect(btn1.focus).toHaveBeenCalledOnce();

    document.body.removeChild(container);
  });

  it("calls onClose when Escape is pressed while open", () => {
    const onClose = vi.fn();

    function TestComponent() {
      const ref = useRef<HTMLDivElement>(null);
      useFocusTrap(true, ref, onClose);
      return (
        <div ref={ref} tabIndex={-1} data-testid="container">
          <button>first</button>
          <button>second</button>
        </div>
      );
    }

    const { getByTestId } = render(<TestComponent />);
    fireEvent.keyDown(getByTestId("container"), { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("wraps Tab from last focusable to first", () => {
    const onClose = vi.fn();
    const firstFocus = vi.fn();
    const lastFocus = vi.fn();

    function TestComponent() {
      const ref = useRef<HTMLDivElement>(null);
      useFocusTrap(true, ref, onClose);
      return (
        <div ref={ref} tabIndex={-1} data-testid="container">
          <button onFocus={firstFocus} data-testid="first">
            first
          </button>
          <button onFocus={lastFocus} data-testid="last">
            last
          </button>
        </div>
      );
    }

    const { getByTestId } = render(<TestComponent />);
    const container = getByTestId("container");
    const last = getByTestId("last");

    act(() => {
      last.focus();
    });

    const event = new KeyboardEvent("keydown", {
      key: "Tab",
      shiftKey: false,
      bubbles: true,
      cancelable: true,
    });
    const preventDefaultSpy = vi.spyOn(event, "preventDefault");
    container.dispatchEvent(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it("wraps Shift+Tab from first focusable to last", () => {
    const onClose = vi.fn();

    function TestComponent() {
      const ref = useRef<HTMLDivElement>(null);
      useFocusTrap(true, ref, onClose);
      return (
        <div ref={ref} tabIndex={-1} data-testid="container">
          <button data-testid="first">first</button>
          <button data-testid="last">last</button>
        </div>
      );
    }

    const { getByTestId } = render(<TestComponent />);
    const container = getByTestId("container");
    const first = getByTestId("first");

    act(() => {
      first.focus();
    });

    const event = new KeyboardEvent("keydown", {
      key: "Tab",
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    const preventDefaultSpy = vi.spyOn(event, "preventDefault");
    container.dispatchEvent(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it("does nothing when isOpen is false", () => {
    const onClose = vi.fn();

    function TestComponent() {
      const ref = useRef<HTMLDivElement>(null);
      useFocusTrap(false, ref, onClose);
      return (
        <div ref={ref} tabIndex={-1} data-testid="container">
          <button>btn</button>
        </div>
      );
    }

    const { getByTestId } = render(<TestComponent />);
    fireEvent.keyDown(getByTestId("container"), { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("does not focus first element on mount when isOpen is false", () => {
    const container = document.createElement("div");
    const btn = document.createElement("button");
    btn.focus = vi.fn();
    container.appendChild(btn);
    document.body.appendChild(container);

    const onClose = vi.fn();
    renderHook(() => {
      const ref = useRef<HTMLElement | null>(container);
      useFocusTrap(false, ref, onClose);
    });

    expect(btn.focus).not.toHaveBeenCalled();
    document.body.removeChild(container);
  });
});
