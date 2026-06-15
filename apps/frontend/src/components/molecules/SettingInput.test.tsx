import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SettingInput } from "./SettingInput";

describe("SettingInput", () => {
  it("renders an enabled input by default", () => {
    render(
      <SettingInput
        id="test"
        label="Test"
        value="val"
        onChange={() => {}}
        description="desc"
        type="text"
      />,
    );
    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input.disabled).toBe(false);
  });

  it("disables the input when disabled=true", () => {
    render(
      <SettingInput
        id="test"
        label="Test"
        value=""
        onChange={() => {}}
        description="desc"
        type="text"
        disabled
      />,
    );
    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });

  it("renders the placeholder when provided", () => {
    render(
      <SettingInput
        id="test"
        label="Test"
        value=""
        onChange={() => {}}
        description="desc"
        type="text"
        placeholder="https://api.openai.com/v1"
      />,
    );
    expect(screen.getByPlaceholderText("https://api.openai.com/v1")).toBeDefined();
  });

  it("applies disabled visual styles when disabled", () => {
    render(
      <SettingInput
        id="test"
        label="Test"
        value=""
        onChange={() => {}}
        description="desc"
        type="text"
        disabled
      />,
    );
    const input = screen.getByRole("textbox");
    expect(input.className).toContain("opacity-50");
    expect(input.className).toContain("cursor-not-allowed");
  });
});
