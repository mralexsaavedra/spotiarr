import type { Request, Response } from "express";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { GetAlbumTracksUseCase } from "@/application/use-cases/artists/get-album-tracks.use-case";
import type { GetArtistAlbumsUseCase } from "@/application/use-cases/artists/get-artist-albums.use-case";
import type { GetArtistDetailUseCase } from "@/application/use-cases/artists/get-artist-detail.use-case";
import type { MaterializeAlbumSpotifyUrlUseCase } from "@/application/use-cases/artists/materialize-album-spotify-url.use-case";
import type { SpotifyAlbumClient } from "@/infrastructure/external/spotify-album.client";
import type { SpotifyArtistClient } from "@/infrastructure/external/spotify-artist.client";
import { ArtistController } from "./artist.controller";

function mockRes(): Response {
  const jsonFn = vi.fn().mockReturnThis();
  const statusFn = vi.fn().mockReturnThis();

  return {
    json: jsonFn,
    status: statusFn,
  } as unknown as Response;
}

function makeController(
  partial: {
    getAlbumTracksUseCase?: Partial<GetAlbumTracksUseCase>;
    materializeAlbumSpotifyUrlUseCase?: Partial<MaterializeAlbumSpotifyUrlUseCase>;
  } = {},
): ArtistController {
  return new ArtistController(
    {} as unknown as SpotifyArtistClient,
    {} as unknown as SpotifyAlbumClient,
    {} as unknown as GetArtistDetailUseCase,
    {} as unknown as GetArtistAlbumsUseCase,
    {
      execute: vi.fn().mockResolvedValue([]),
      ...partial.getAlbumTracksUseCase,
    } as unknown as GetAlbumTracksUseCase,
    {
      execute: vi.fn().mockResolvedValue({ spotifyUrl: "https://open.spotify.com/album/abc" }),
      ...partial.materializeAlbumSpotifyUrlUseCase,
    } as unknown as MaterializeAlbumSpotifyUrlUseCase,
  );
}

describe("ArtistController.getAlbumTracks", () => {
  let controller: ArtistController;

  beforeEach(() => {
    controller = makeController();
  });

  describe("provider-miss contract: non-Spotify album ID misses Deezer + MusicBrainz", () => {
    it("returns HTTP 200 with an empty array", async () => {
      const req = {
        params: { id: "artist-1", albumId: "non-spotify-album-123" },
      } as unknown as Request;
      const res = mockRes();

      await controller.getAlbumTracks(req, res);

      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith([]);
    });
  });

  describe("error handling", () => {
    it("returns 400 when params are missing", async () => {
      const req = { params: {} } as unknown as Request;
      const res = mockRes();

      await controller.getAlbumTracks(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "missing_params" });
    });
  });
});

describe("ArtistController.materializeAlbumSpotifyUrl", () => {
  it("returns materialized Spotify URL", async () => {
    const execute = vi.fn().mockResolvedValue({ spotifyUrl: "https://open.spotify.com/album/abc" });
    const controller = makeController({ materializeAlbumSpotifyUrlUseCase: { execute } });
    const req = {
      params: { id: "artist-1", albumId: "album-1" },
      body: { artistName: "Artist", albumName: "Album" },
    } as unknown as Request;
    const res = mockRes();

    await controller.materializeAlbumSpotifyUrl(req, res);

    expect(execute).toHaveBeenCalledWith({
      artistId: "artist-1",
      albumId: "album-1",
      artistName: "Artist",
      albumName: "Album",
    });
    expect(res.json).toHaveBeenCalledWith({ spotifyUrl: "https://open.spotify.com/album/abc" });
  });

  it("returns 400 when identity is missing", async () => {
    const controller = makeController();
    const req = { params: { id: "artist-1", albumId: "album-1" }, body: {} } as unknown as Request;
    const res = mockRes();

    await controller.materializeAlbumSpotifyUrl(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "missing_album_identity" });
  });
});
