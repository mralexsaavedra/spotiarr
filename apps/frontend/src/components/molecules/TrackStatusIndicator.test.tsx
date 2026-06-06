import { TrackStatusEnum } from "@spotiarr/shared";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TrackStatusIndicator } from "./TrackStatusIndicator";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe("TrackStatusIndicator — play/pause prop branches", () => {
  it("renders numeric index when onPlay is not provided", () => {
    render(<TrackStatusIndicator index={3} />);
    expect(screen.getByText("3")).toBeTruthy();
  });

  it("renders number span and hidden play button when onPlay provided and track is not current", () => {
    const onPlay = vi.fn();
    render(<TrackStatusIndicator index={5} onPlay={onPlay} isCurrentTrack={false} />);
    expect(screen.getByText("5")).toBeTruthy();
    const btn = screen.getByRole("button", { name: "library.album.playTrack" });
    expect(btn).toBeTruthy();
  });

  it("clicking play button calls onPlay", () => {
    const onPlay = vi.fn();
    render(<TrackStatusIndicator index={1} onPlay={onPlay} isCurrentTrack={false} />);
    fireEvent.click(screen.getByRole("button", { name: "library.album.playTrack" }));
    expect(onPlay).toHaveBeenCalledTimes(1);
  });

  it("renders only pause button when isCurrentTrack and isPlaying are true", () => {
    const onPlay = vi.fn();
    render(
      <TrackStatusIndicator index={2} onPlay={onPlay} isCurrentTrack={true} isPlaying={true} />,
    );
    expect(screen.getByRole("button", { name: "library.album.pauseTrack" })).toBeTruthy();
    expect(screen.queryByText("2")).toBeNull();
  });

  it("renders only play button when isCurrentTrack is true and isPlaying is false", () => {
    const onPlay = vi.fn();
    render(
      <TrackStatusIndicator index={2} onPlay={onPlay} isCurrentTrack={true} isPlaying={false} />,
    );
    expect(screen.getByRole("button", { name: "library.album.playTrack" })).toBeTruthy();
    expect(screen.queryByText("2")).toBeNull();
  });

  it("current-track button has type=button and aria-label", () => {
    const onPlay = vi.fn();
    render(
      <TrackStatusIndicator index={1} onPlay={onPlay} isCurrentTrack={true} isPlaying={true} />,
    );
    const btn = screen.getByRole("button", { name: "library.album.pauseTrack" });
    expect(btn.getAttribute("type")).toBe("button");
    expect(btn.getAttribute("aria-label")).toBe("library.album.pauseTrack");
  });

  it("clicking current-track pause button calls onPlay", () => {
    const onPlay = vi.fn();
    render(
      <TrackStatusIndicator index={1} onPlay={onPlay} isCurrentTrack={true} isPlaying={true} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "library.album.pauseTrack" }));
    expect(onPlay).toHaveBeenCalledTimes(1);
  });

  it("does not render play button when onPlay is not provided even if isCurrentTrack is true", () => {
    render(<TrackStatusIndicator index={4} isCurrentTrack={true} isPlaying={false} />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText("4")).toBeTruthy();
  });

  it("still renders error icon when status is Error regardless of onPlay", () => {
    render(<TrackStatusIndicator index={1} status={TrackStatusEnum.Error} />);
    expect(screen.queryByRole("button", { name: "library.album.playTrack" })).toBeNull();
  });
});
