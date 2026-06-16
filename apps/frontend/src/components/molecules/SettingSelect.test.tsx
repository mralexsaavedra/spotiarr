import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SettingSelect } from "./SettingSelect";

const baseProps = {
  id: "theme-select",
  label: "Theme",
  value: "dark",
  onChange: vi.fn(),
  options: ["dark", "light", "system"],
  description: "Choose your preferred theme",
};

describe("SettingSelect", () => {
  it("renders the label", () => {
    render(<SettingSelect {...baseProps} />);

    expect(screen.getByText("Theme")).not.toBeNull();
  });

  it("renders the description", () => {
    render(<SettingSelect {...baseProps} />);

    expect(screen.getByText("Choose your preferred theme")).not.toBeNull();
  });

  it("renders all options", () => {
    render(<SettingSelect {...baseProps} />);

    expect(screen.getByRole("option", { name: "Dark" })).not.toBeNull();
    expect(screen.getByRole("option", { name: "Light" })).not.toBeNull();
    expect(screen.getByRole("option", { name: "System" })).not.toBeNull();
  });

  it("has the correct option selected by default", () => {
    render(<SettingSelect {...baseProps} />);

    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.value).toBe("dark");
  });

  it("calls onChange when the selection changes", () => {
    const onChange = vi.fn();
    render(<SettingSelect {...baseProps} onChange={onChange} />);

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "light" } });

    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("uses a custom formatLabel when provided", () => {
    render(
      <SettingSelect
        {...baseProps}
        options={["en", "es"]}
        formatLabel={(opt) => opt.toUpperCase()}
      />,
    );

    expect(screen.getByRole("option", { name: "EN" })).not.toBeNull();
    expect(screen.getByRole("option", { name: "ES" })).not.toBeNull();
  });
});
