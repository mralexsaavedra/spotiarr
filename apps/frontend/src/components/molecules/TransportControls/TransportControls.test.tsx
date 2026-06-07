import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TransportControls } from "./TransportControls";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const defaultProps = {
  isPlaying: false,
  shuffleMode: false,
  repeatMode: "off" as const,
  onPlayPause: vi.fn(),
  onPrev: vi.fn(),
  onNext: vi.fn(),
  onShuffleToggle: vi.fn(),
  onRepeatCycle: vi.fn(),
};

describe("TransportControls", () => {
  it("renders all five control buttons", () => {
    render(<TransportControls {...defaultProps} />);
    expect(screen.getAllByRole("button")).toHaveLength(5);
  });

  it("play/pause aria-label reflects isPlaying=false", () => {
    render(<TransportControls {...defaultProps} isPlaying={false} />);
    expect(screen.getByRole("button", { name: "player.transport.play" })).toBeTruthy();
  });

  it("play/pause aria-label reflects isPlaying=true", () => {
    render(<TransportControls {...defaultProps} isPlaying={true} />);
    expect(screen.getByRole("button", { name: "player.transport.pause" })).toBeTruthy();
  });

  it("shuffle aria-label reflects shuffleMode=false", () => {
    render(<TransportControls {...defaultProps} shuffleMode={false} />);
    expect(screen.getByRole("button", { name: "player.transport.shuffleOff" })).toBeTruthy();
  });

  it("shuffle aria-label reflects shuffleMode=true", () => {
    render(<TransportControls {...defaultProps} shuffleMode={true} />);
    expect(screen.getByRole("button", { name: "player.transport.shuffleOn" })).toBeTruthy();
  });

  it("root carries data-size attribute when size prop provided", () => {
    const { container } = render(<TransportControls {...defaultProps} size="lg" />);
    expect((container.firstChild as HTMLElement).getAttribute("data-size")).toBe("lg");
  });

  it("root has no data-size attribute when size is not provided", () => {
    const { container } = render(<TransportControls {...defaultProps} />);
    expect((container.firstChild as HTMLElement).getAttribute("data-size")).toBeNull();
  });

  it("calls onPlayPause when play/pause button clicked", () => {
    const onPlayPause = vi.fn();
    render(<TransportControls {...defaultProps} onPlayPause={onPlayPause} />);
    fireEvent.click(screen.getByRole("button", { name: "player.transport.play" }));
    expect(onPlayPause).toHaveBeenCalledOnce();
  });

  it("calls onPrev when previous button clicked", () => {
    const onPrev = vi.fn();
    render(<TransportControls {...defaultProps} onPrev={onPrev} />);
    fireEvent.click(screen.getByRole("button", { name: "player.transport.previous" }));
    expect(onPrev).toHaveBeenCalledOnce();
  });

  it("calls onNext when next button clicked", () => {
    const onNext = vi.fn();
    render(<TransportControls {...defaultProps} onNext={onNext} />);
    fireEvent.click(screen.getByRole("button", { name: "player.transport.next" }));
    expect(onNext).toHaveBeenCalledOnce();
  });

  it("calls onShuffleToggle when shuffle button clicked", () => {
    const onShuffleToggle = vi.fn();
    render(<TransportControls {...defaultProps} onShuffleToggle={onShuffleToggle} />);
    fireEvent.click(screen.getByRole("button", { name: "player.transport.shuffleOff" }));
    expect(onShuffleToggle).toHaveBeenCalledOnce();
  });

  it("calls onRepeatCycle when repeat button clicked", () => {
    const onRepeatCycle = vi.fn();
    render(<TransportControls {...defaultProps} onRepeatCycle={onRepeatCycle} />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[buttons.length - 1]!);
    expect(onRepeatCycle).toHaveBeenCalledOnce();
  });

  it("prev button is disabled when isPrevDisabled=true", () => {
    render(<TransportControls {...defaultProps} isPrevDisabled={true} />);
    expect(screen.getByRole("button", { name: "player.transport.previous" })).toHaveProperty(
      "disabled",
      true,
    );
  });

  it("next button is disabled when isNextDisabled=true", () => {
    render(<TransportControls {...defaultProps} isNextDisabled={true} />);
    expect(screen.getByRole("button", { name: "player.transport.next" })).toHaveProperty(
      "disabled",
      true,
    );
  });
});
