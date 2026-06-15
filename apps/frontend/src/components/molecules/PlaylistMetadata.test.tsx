import { PlaylistTypeEnum } from "@spotiarr/shared";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PlaylistMetadata } from "./PlaylistMetadata";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

describe("PlaylistMetadata", () => {
  it("renders the owner for AI playlists", () => {
    render(<PlaylistMetadata type={PlaylistTypeEnum.Ai} tracks={[]} owner="SpotiArr AI" />);

    expect(screen.getByText("SpotiArr AI")).toBeTruthy();
  });

  it("falls back to the SpotiArr label when an AI playlist has no owner", () => {
    render(<PlaylistMetadata type={PlaylistTypeEnum.Ai} tracks={[]} />);

    expect(screen.getByText("SpotiArr")).toBeTruthy();
  });
});
