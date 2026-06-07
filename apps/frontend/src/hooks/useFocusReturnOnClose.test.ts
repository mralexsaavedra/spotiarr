import { renderHook } from "@testing-library/react";
import { useRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { useFocusReturnOnClose } from "./useFocusReturnOnClose";

describe("useFocusReturnOnClose", () => {
  it("calls focus on triggerRef when isOpen transitions from true to false", () => {
    const focusMock = vi.fn();
    const { result, rerender } = renderHook(
      ({ isOpen }: { isOpen: boolean }) => {
        const ref = useRef<HTMLElement | null>({ focus: focusMock } as unknown as HTMLElement);
        useFocusReturnOnClose(isOpen, ref);
        return ref;
      },
      { initialProps: { isOpen: true } },
    );

    expect(focusMock).not.toHaveBeenCalled();

    rerender({ isOpen: false });

    expect(focusMock).toHaveBeenCalledOnce();
    void result;
  });

  it("does not call focus on initial render when isOpen is false", () => {
    const focusMock = vi.fn();
    renderHook(
      ({ isOpen }: { isOpen: boolean }) => {
        const ref = useRef<HTMLElement | null>({ focus: focusMock } as unknown as HTMLElement);
        useFocusReturnOnClose(isOpen, ref);
      },
      { initialProps: { isOpen: false } },
    );

    expect(focusMock).not.toHaveBeenCalled();
  });

  it("does not throw and does not call focus when triggerRef.current is null at close time", () => {
    const { rerender } = renderHook(
      ({ isOpen }: { isOpen: boolean }) => {
        const ref = useRef<HTMLElement | null>(null);
        useFocusReturnOnClose(isOpen, ref);
      },
      { initialProps: { isOpen: true } },
    );

    expect(() => rerender({ isOpen: false })).not.toThrow();
  });

  it("calls focus exactly once per close across multiple open/close cycles", () => {
    const focusMock = vi.fn();
    const { rerender } = renderHook(
      ({ isOpen }: { isOpen: boolean }) => {
        const ref = useRef<HTMLElement | null>({ focus: focusMock } as unknown as HTMLElement);
        useFocusReturnOnClose(isOpen, ref);
      },
      { initialProps: { isOpen: false } },
    );

    rerender({ isOpen: true });
    rerender({ isOpen: false });
    rerender({ isOpen: true });
    rerender({ isOpen: false });

    expect(focusMock).toHaveBeenCalledTimes(2);
  });
});
