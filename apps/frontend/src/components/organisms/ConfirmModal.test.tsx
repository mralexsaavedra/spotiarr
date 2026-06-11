import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ConfirmModal } from "./ConfirmModal";

describe("ConfirmModal", () => {
  const defaultProps = {
    isOpen: true,
    title: "Delete item",
    description: "Are you sure?",
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  it("renders with role=dialog and aria-modal", () => {
    render(<ConfirmModal {...defaultProps} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute("aria-modal")).toBe("true");
  });

  it("dialog is labelled by its title", () => {
    render(<ConfirmModal {...defaultProps} title="Delete item" />);
    expect(screen.getByRole("dialog", { name: "Delete item" })).toBeTruthy();
  });

  it("calls onCancel when Escape is pressed", () => {
    const onCancel = vi.fn();
    render(<ConfirmModal {...defaultProps} onCancel={onCancel} />);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("uses danger variant for destructive confirm button", () => {
    render(<ConfirmModal {...defaultProps} isDestructive confirmLabel="Delete" />);
    const confirmBtn = screen.getByRole("button", { name: "Delete" });
    expect(confirmBtn.className).toMatch(/bg-red-500/);
  });

  it("uses primary variant for non-destructive confirm button", () => {
    render(<ConfirmModal {...defaultProps} isDestructive={false} confirmLabel="OK" />);
    const confirmBtn = screen.getByRole("button", { name: "OK" });
    expect(confirmBtn.className).not.toMatch(/bg-red-500/);
  });

  it("renders nothing when isOpen is false", () => {
    render(<ConfirmModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("calls onConfirm when confirm button is clicked", () => {
    const onConfirm = vi.fn();
    render(<ConfirmModal {...defaultProps} onConfirm={onConfirm} confirmLabel="Confirm" />);
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("calls onCancel when cancel button is clicked", () => {
    const onCancel = vi.fn();
    render(<ConfirmModal {...defaultProps} onCancel={onCancel} cancelLabel="Cancel" />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
