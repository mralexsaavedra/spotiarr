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

  it("root carries data-size=large when size=large", () => {
    const { container } = render(<TransportControls {...defaultProps} size="large" />);
    expect((container.firstChild as HTMLElement).getAttribute("data-size")).toBe("large");
  });

  it("root carries data-size=default when size=default", () => {
    const { container } = render(<TransportControls {...defaultProps} size="default" />);
    expect((container.firstChild as HTMLElement).getAttribute("data-size")).toBe("default");
  });

  it("root has no data-size attribute when size is not provided", () => {
    const { container } = render(<TransportControls {...defaultProps} />);
    expect((container.firstChild as HTMLElement).getAttribute("data-size")).toBeNull();
  });

  it("all five buttons are disabled with aria-disabled when currentTrack is null", () => {
    render(<TransportControls {...defaultProps} currentTrack={null} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(5);
    buttons.forEach((btn) => {
      expect(btn).toHaveProperty("disabled", true);
      expect(btn.getAttribute("aria-disabled")).toBe("true");
    });
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

  it("repeat button aria-label uses player.transport.repeatAll when repeatMode=all", () => {
    render(<TransportControls {...defaultProps} repeatMode="all" />);
    expect(screen.getByRole("button", { name: "player.transport.repeatAll" })).toBeTruthy();
  });

  it("repeat button aria-label uses player.transport.repeatOne when repeatMode=one", () => {
    render(<TransportControls {...defaultProps} repeatMode="one" />);
    expect(screen.getByRole("button", { name: "player.transport.repeatOne" })).toBeTruthy();
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

  it("isBuffering=true: play/pause button shows spinner icon", () => {
    render(<TransportControls {...defaultProps} isBuffering={true} />);
    const btn = screen.getByRole("button", { name: "player.transport.loading" });
    const icon = btn.querySelector("[data-icon='spinner']");
    expect(icon).not.toBeNull();
  });

  it("isBuffering=true: play/pause button has loading aria-label", () => {
    render(<TransportControls {...defaultProps} isBuffering={true} />);
    expect(screen.getByRole("button", { name: "player.transport.loading" })).not.toBeNull();
  });

  it("isBuffering=true: play/pause button is still enabled (not disabled)", () => {
    render(<TransportControls {...defaultProps} isBuffering={true} />);
    const btn = screen.getByRole("button", { name: "player.transport.loading" });
    expect(btn).toHaveProperty("disabled", false);
  });

  it("isBuffering=false: shows play or pause as before", () => {
    render(<TransportControls {...defaultProps} isBuffering={false} isPlaying={false} />);
    expect(screen.getByRole("button", { name: "player.transport.play" })).not.toBeNull();
  });

  it("isBuffering=true: play/pause button has aria-busy='true'", () => {
    render(<TransportControls {...defaultProps} isBuffering={true} />);
    const btn = screen.getByRole("button", { name: "player.transport.loading" });
    expect(btn.getAttribute("aria-busy")).toBe("true");
  });

  it("isBuffering=false: play/pause button does not have aria-busy attribute", () => {
    render(<TransportControls {...defaultProps} isBuffering={false} />);
    const btn = screen.getByRole("button", { name: "player.transport.play" });
    expect(btn.getAttribute("aria-busy")).toBeNull();
  });
});
