import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SettingToggle } from "./SettingToggle";

const baseProps = {
  id: "notifications-toggle",
  label: "Enable Notifications",
  description: "Receive push notifications",
  value: false,
  onChange: vi.fn(),
};

describe("SettingToggle", () => {
  it("renders the label", () => {
    render(<SettingToggle {...baseProps} />);

    expect(screen.getByText("Enable Notifications")).not.toBeNull();
  });

  it("renders the description", () => {
    render(<SettingToggle {...baseProps} />);

    expect(screen.getByText("Receive push notifications")).not.toBeNull();
  });

  it("renders a button element", () => {
    render(<SettingToggle {...baseProps} />);

    expect(screen.getByRole("button")).not.toBeNull();
  });

  it("applies the active color class when value is true", () => {
    render(<SettingToggle {...baseProps} value={true} />);

    const button = screen.getByRole("button");
    expect(button.className).toContain("bg-primary");
  });

  it("applies the inactive color class when value is false", () => {
    render(<SettingToggle {...baseProps} value={false} />);

    const button = screen.getByRole("button");
    expect(button.className).toContain("bg-text-muted");
  });

  it("calls onChange when the button is clicked", () => {
    const onChange = vi.fn();
    render(<SettingToggle {...baseProps} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button"));

    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
