import { fireEvent, render, screen } from "@testing-library/react";
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
