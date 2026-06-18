import { act, render, screen } from "@testing-library/react";
import { Suspense } from "react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { Routing } from "./Routing";
import { Path } from "./routes";

vi.mock("@/components/atoms/Loading", () => ({
  Loading: () => <div data-testid="loading" />,
}));

vi.mock("@/components/layouts/AppLayout", () => {
  const { Outlet } = require("react-router-dom");
  return {
    AppLayout: () => (
      <div>
        <Outlet />
      </div>
    ),
  };
});

vi.mock("@/components/errors/RouteErrorBoundary", () => ({
  RouteErrorBoundary: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("../views/Home", () => ({
  Home: () => <div data-testid="view-home">Home</div>,
}));

vi.mock("../views/Dashboard", () => ({
  Dashboard: () => <div data-testid="view-dashboard">Dashboard</div>,
}));

vi.mock("../views/Releases", () => ({
  Releases: () => <div data-testid="view-releases">Releases</div>,
}));

vi.mock("../views/Artists", () => ({
  Artists: () => <div data-testid="view-artists">Artists</div>,
}));

vi.mock("../views/ArtistDetail", () => ({
  ArtistDetail: () => <div data-testid="view-artist-detail">ArtistDetail</div>,
}));

vi.mock("../views/LibraryArtist", () => ({
  LibraryArtist: () => <div data-testid="view-library-artist">LibraryArtist</div>,
}));

vi.mock("../views/LibraryAlbumDetail", () => ({
  LibraryAlbumDetail: () => <div data-testid="view-library-album-detail">LibraryAlbumDetail</div>,
}));

vi.mock("../views/MyPlaylists", () => ({
  MyPlaylists: () => <div data-testid="view-my-playlists">MyPlaylists</div>,
}));

vi.mock("../views/Settings", () => ({
  Settings: () => <div data-testid="view-settings">Settings</div>,
}));

vi.mock("../views/NotFound", () => ({
  NotFound: () => <div data-testid="view-not-found">NotFound</div>,
}));

vi.mock("../views/Search", () => ({
  Search: () => <div data-testid="view-search">Search</div>,
}));

vi.mock("../views/AlbumDetail", () => ({
  AlbumDetail: () => <div data-testid="view-album-detail">AlbumDetail</div>,
}));

vi.mock("../views/Chat", () => ({
  Chat: () => <div data-testid="view-chat">Chat</div>,
}));

vi.mock("../views/PlaylistDetail", () => ({
  PlaylistDetail: () => <div data-testid="view-playlist-detail">PlaylistDetail</div>,
}));

vi.mock("../views/PlaylistPreview", () => ({
  PlaylistPreview: () => <div data-testid="view-playlist-preview">PlaylistPreview</div>,
}));

const renderAt = (initialPath: string) =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Suspense fallback={<div data-testid="loading" />}>
        <Routing pathname={Path.HOME} version="1.0.0" />
      </Suspense>
    </MemoryRouter>,
  );

describe("Routing", () => {
  it("renders Dashboard view at /dashboard", async () => {
    await act(async () => {
      renderAt("/dashboard");
    });
    expect(await screen.findByTestId("view-dashboard")).toBeTruthy();
  });

  it("redirects /history to /dashboard (replace navigation)", async () => {
    await act(async () => {
      renderAt("/history");
    });
    expect(await screen.findByTestId("view-dashboard")).toBeTruthy();
  });

  it("renders Home view at /", async () => {
    await act(async () => {
      renderAt("/");
    });
    expect(await screen.findByTestId("view-home")).toBeTruthy();
  });
});
