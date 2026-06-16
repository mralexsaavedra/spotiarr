import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SettingTextarea } from "./SettingTextarea";

const baseProps = {
  id: "system-prompt",
  label: "System Prompt",
  value: "You are a helpful assistant.",
  onChange: vi.fn(),
  description: "Enter the AI system prompt",
};

describe("SettingTextarea", () => {
  it("renders the label", () => {
    render(<SettingTextarea {...baseProps} />);

    expect(screen.getByText("System Prompt")).not.toBeNull();
  });

  it("renders the description", () => {
    render(<SettingTextarea {...baseProps} />);

    expect(screen.getByText("Enter the AI system prompt")).not.toBeNull();
  });

  it("renders with the provided string value", () => {
    render(<SettingTextarea {...baseProps} />);

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    expect(textarea.value).toBe("You are a helpful assistant.");
  });

  it("renders with a numeric value", () => {
    render(<SettingTextarea {...baseProps} value={42} />);

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    expect(textarea.value).toBe("42");
  });

  it("calls onChange when the textarea content changes", () => {
    const onChange = vi.fn();
    render(<SettingTextarea {...baseProps} onChange={onChange} />);

    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "Updated prompt" } });

    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("associates label with textarea via htmlFor / id", () => {
    render(<SettingTextarea {...baseProps} />);

    const label = screen.getByText("System Prompt") as HTMLLabelElement;
    expect(label.htmlFor).toBe("system-prompt");
  });
});
