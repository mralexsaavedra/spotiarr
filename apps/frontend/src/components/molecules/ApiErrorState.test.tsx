import { ApiErrorCode } from "@spotiarr/shared";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ApiErrorState } from "./ApiErrorState";

vi.mock("./ConnectSpotifyPrompt", () => ({
  ConnectSpotifyPrompt: ({ onConnect }: any) => (
    <button onClick={onConnect}>Connect with Spotify</button>
  ),
}));

vi.mock("./RateLimitedMessage", () => ({
  RateLimitedMessage: () => <div>Rate limited</div>,
}));

describe("ApiErrorState", () => {
  it("renders nothing when error is null", () => {
    const { container } = render(<ApiErrorState error={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders generic error message when error is an unknown code", () => {
    render(<ApiErrorState error={"not_found" as ApiErrorCode} />);
    expect(screen.getByText("Failed to load data.")).not.toBeNull();
  });

  it("renders ConnectSpotifyPrompt when error is missing_user_access_token", () => {
    render(<ApiErrorState error={"missing_user_access_token" as ApiErrorCode} />);
    expect(screen.getByText("Connect with Spotify")).not.toBeNull();
  });

  it("clicking connect button in ConnectSpotifyPrompt does not throw", () => {
    render(<ApiErrorState error={"missing_user_access_token" as ApiErrorCode} />);
    expect(() => fireEvent.click(screen.getByText("Connect with Spotify"))).not.toThrow();
  });

  it("renders RateLimitedMessage when error is spotify_rate_limited", () => {
    render(<ApiErrorState error={"spotify_rate_limited" as ApiErrorCode} />);
    expect(screen.getByText("Rate limited")).not.toBeNull();
  });

  it("uses custom message prop for generic errors", () => {
    render(<ApiErrorState error={"not_found" as ApiErrorCode} message="Custom error message" />);
    expect(screen.getByText("Custom error message")).not.toBeNull();
  });
});
