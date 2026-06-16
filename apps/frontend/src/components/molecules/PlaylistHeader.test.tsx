import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PlaylistHeader } from "./PlaylistHeader";

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock("../atoms/Image", () => ({ Image: ({ alt }: any) => <img alt={alt} /> }));

const baseProps = {
  title: "My Playlist",
  type: "album",
  coverUrl: null,
  totalCount: 12,
};

describe("PlaylistHeader", () => {
  it("renders title in h1", () => {
    render(<PlaylistHeader {...baseProps} />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.textContent).toBe("My Playlist");
  });

  it("renders typeLabel with first char uppercased", () => {
    render(<PlaylistHeader {...baseProps} />);
    expect(screen.queryByText("Album")).not.toBeNull();
  });

  it("renders totalCount and playlist.songs text", () => {
    render(<PlaylistHeader {...baseProps} />);
    expect(screen.queryByText(/12/)).not.toBeNull();
    expect(screen.queryByText(/playlist\.songs/)).not.toBeNull();
  });

  it("renders description when provided", () => {
    render(<PlaylistHeader {...baseProps} description={<p>Cool description</p>} />);
    expect(screen.queryByText("Cool description")).not.toBeNull();
  });

  it("does not render description when omitted", () => {
    render(<PlaylistHeader {...baseProps} />);
    expect(screen.queryByText("Cool description")).toBeNull();
  });

  it("renders metadata when provided, with bullet separator", () => {
    render(<PlaylistHeader {...baseProps} metadata={<span>Some metadata</span>} />);
    expect(screen.queryByText("Some metadata")).not.toBeNull();
    expect(screen.queryByText("•")).not.toBeNull();
  });

  it("does not render bullet separator when metadata is omitted", () => {
    render(<PlaylistHeader {...baseProps} />);
    expect(screen.queryByText("•")).toBeNull();
  });
});
