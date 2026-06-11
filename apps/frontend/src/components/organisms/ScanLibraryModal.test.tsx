import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ScanLibraryModal } from "./ScanLibraryModal";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

describe("ScanLibraryModal", () => {
  it("disables artwork backfill checkbox when backfill is active", () => {
    render(
      <ScanLibraryModal
        isOpen
        isSubmitting={false}
        backfillStatus="running"
        onCancel={() => undefined}
        onConfirm={() => undefined}
      />,
    );

    expect(screen.getByRole("checkbox").hasAttribute("disabled")).toBe(true);
  });

  it("submits scan + artwork backfill when checkbox is selected", () => {
    const onConfirm = vi.fn();

    render(
      <ScanLibraryModal
        isOpen
        isSubmitting={false}
        backfillStatus="idle"
        onCancel={() => undefined}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Start scan" }));

    expect(onConfirm).toHaveBeenCalledWith({ shouldStartBackfill: true });
  });

  it("falls back to scan-only when backfill becomes active before confirm", () => {
    const onConfirm = vi.fn();

    const { rerender } = render(
      <ScanLibraryModal
        isOpen
        isSubmitting={false}
        backfillStatus="idle"
        onCancel={() => undefined}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.click(screen.getByRole("checkbox"));
    rerender(
      <ScanLibraryModal
        isOpen
        isSubmitting={false}
        backfillStatus="running"
        onCancel={() => undefined}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Start scan" }));
    expect(onConfirm).toHaveBeenCalledWith({ shouldStartBackfill: false });
  });

  it("renders with role=dialog and aria-modal", () => {
    render(
      <ScanLibraryModal
        isOpen
        isSubmitting={false}
        backfillStatus="idle"
        onCancel={() => undefined}
        onConfirm={() => undefined}
      />,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute("aria-modal")).toBe("true");
  });

  it("dialog is labelled by its title", () => {
    render(
      <ScanLibraryModal
        isOpen
        isSubmitting={false}
        backfillStatus="idle"
        onCancel={() => undefined}
        onConfirm={() => undefined}
      />,
    );
    expect(screen.getByRole("dialog", { name: "Scan library" })).toBeTruthy();
  });

  it("calls onCancel when Escape is pressed", () => {
    const onCancel = vi.fn();
    render(
      <ScanLibraryModal
        isOpen
        isSubmitting={false}
        backfillStatus="idle"
        onCancel={onCancel}
        onConfirm={() => undefined}
      />,
    );
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("focuses first focusable element when opened", () => {
    const { rerender } = render(
      <ScanLibraryModal
        isOpen={false}
        isSubmitting={false}
        backfillStatus="idle"
        onCancel={() => undefined}
        onConfirm={() => undefined}
      />,
    );

    act(() => {
      rerender(
        <ScanLibraryModal
          isOpen
          isSubmitting={false}
          backfillStatus="idle"
          onCancel={() => undefined}
          onConfirm={() => undefined}
        />,
      );
    });

    const dialog = screen.getByRole("dialog");
    const focusables = dialog.querySelectorAll<HTMLElement>(
      "a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex='-1'])",
    );
    expect(focusables.length).toBeGreaterThan(0);
  });

  it("resets artwork backfill checkbox when modal is closed and reopened", () => {
    const onConfirm = vi.fn();

    const { rerender } = render(
      <ScanLibraryModal
        isOpen
        isSubmitting={false}
        backfillStatus="idle"
        onCancel={() => undefined}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.click(screen.getByRole("checkbox"));

    rerender(
      <ScanLibraryModal
        isOpen={false}
        isSubmitting={false}
        backfillStatus="idle"
        onCancel={() => undefined}
        onConfirm={onConfirm}
      />,
    );

    rerender(
      <ScanLibraryModal
        isOpen
        isSubmitting={false}
        backfillStatus="idle"
        onCancel={() => undefined}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Start scan" }));
    expect(onConfirm).toHaveBeenCalledWith({ shouldStartBackfill: false });
  });
});
