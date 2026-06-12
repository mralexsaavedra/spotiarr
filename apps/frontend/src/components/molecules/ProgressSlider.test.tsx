import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProgressSlider } from "./ProgressSlider";

const baseProps = {
  currentTime: 0,
  duration: 90,
  onSeek: vi.fn(),
  ariaLabel: "Seek",
};

describe("ProgressSlider", () => {
  it("renders current time and duration labels", () => {
    render(<ProgressSlider {...baseProps} currentTime={10} duration={90} />);

    expect(screen.getByText("0:10")).not.toBeNull();
    expect(screen.getByText("1:30")).not.toBeNull();
  });

  it("calls onSeek with the numeric value when the slider changes", () => {
    const onSeek = vi.fn();
    render(<ProgressSlider {...baseProps} onSeek={onSeek} />);

    const slider = screen.getByRole("slider");
    fireEvent.change(slider, { target: { value: "45" } });

    expect(onSeek).toHaveBeenCalledWith(45);
  });

  it("has correct aria-valuetext", () => {
    render(<ProgressSlider {...baseProps} currentTime={0} duration={90} />);

    const slider = screen.getByRole("slider");
    expect(slider.getAttribute("aria-valuetext")).toBe("0:00 of 1:30");
  });

  it("renders with variant fullscreen without crashing", () => {
    render(<ProgressSlider {...baseProps} variant="fullscreen" />);

    expect(screen.getByRole("slider")).not.toBeNull();
  });
});
