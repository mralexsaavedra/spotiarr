import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ConnectSpotifyPrompt } from "./ConnectSpotifyPrompt";

vi.mock("../atoms/Button", () => ({
  Button: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
}));

describe("ConnectSpotifyPrompt", () => {
  it("renders the heading 'Connect Spotify'", () => {
    render(<ConnectSpotifyPrompt onConnect={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Connect Spotify" })).not.toBeNull();
  });

  it("renders the description text", () => {
    render(<ConnectSpotifyPrompt onConnect={vi.fn()} />);
    expect(screen.getByText(/connect your Spotify account/i)).not.toBeNull();
  });

  it("renders the 'Connect with Spotify' button", () => {
    render(<ConnectSpotifyPrompt onConnect={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Connect with Spotify" })).not.toBeNull();
  });

  it("calls onConnect when the button is clicked", () => {
    const onConnect = vi.fn();
    render(<ConnectSpotifyPrompt onConnect={onConnect} />);

    fireEvent.click(screen.getByRole("button", { name: "Connect with Spotify" }));
    expect(onConnect).toHaveBeenCalledTimes(1);
  });
});
