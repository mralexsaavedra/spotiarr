import { PlaylistTypeEnum, type ITrack } from "@spotiarr/shared";
import * as path from "path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Playlist } from "@/domain/entities/playlist.entity";
import { ArtworkService } from "./artwork.service";

describe("ArtworkService", () => {
  const playlistRepository = { findOne: vi.fn() };
  const spotifyService = { getCoverImage: vi.fn() };
  const pathService = { getArtistFolderPath: vi.fn() };
  const artworkAssets = {
    downloadImage: vi.fn(),
    writeFileIfMissing: vi.fn(),
    clearCache: vi.fn(),
  };

  const track: ITrack = {
    name: "Track",
    artist: "Track Artist",
    albumArtist: "Album Artist",
    album: "Album",
    playlistId: "playlist-1",
    spotifyUrl: "https://p.scdn.co/mp3-preview/123",
    trackUrl: "https://open.spotify.com/track/123",
  };

  const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff]);

  beforeEach(() => {
    vi.clearAllMocks();
    pathService.getArtistFolderPath.mockReturnValue(path.join("/music", "Album Artist"));
    spotifyService.getCoverImage.mockResolvedValue("https://image.test/track.jpg");
    playlistRepository.findOne.mockResolvedValue(
      new Playlist({
        id: "playlist-1",
        type: PlaylistTypeEnum.Album,
        coverUrl: "https://image.test/playlist.jpg",
        artistImageUrl: "https://image.test/artist.jpg",
      }),
    );
    artworkAssets.downloadImage.mockResolvedValue(jpegBuffer);
    artworkAssets.writeFileIfMissing.mockResolvedValue(undefined);
  });

  it("downloads playlist, track, and artist artwork through the assets port", async () => {
    const service = new ArtworkService(
      playlistRepository as never,
      spotifyService as never,
      pathService as never,
      artworkAssets as never,
    );

    const artwork = await service.resolveTrackArtwork(track);

    expect(artwork).toEqual({
      tagCoverBuffer: jpegBuffer,
      folderCoverBuffer: jpegBuffer,
      artistImageBuffer: jpegBuffer,
    });
    expect(artworkAssets.downloadImage).toHaveBeenCalledTimes(3);
    expect(spotifyService.getCoverImage).toHaveBeenCalledWith("https://open.spotify.com/track/123");
  });

  it("falls back to legacy spotifyUrl when trackUrl is missing", async () => {
    const service = new ArtworkService(
      playlistRepository as never,
      spotifyService as never,
      pathService as never,
      artworkAssets as never,
    );

    await service.resolveTrackArtwork({
      ...track,
      trackUrl: undefined,
      spotifyUrl: "https://open.spotify.com/track/legacy-123",
    });

    expect(spotifyService.getCoverImage).toHaveBeenCalledWith(
      "https://open.spotify.com/track/legacy-123",
    );
  });

  it("falls back to playlist cover for non-playlist folder cover when track cover is unavailable", async () => {
    spotifyService.getCoverImage.mockResolvedValue("");
    const service = new ArtworkService(
      playlistRepository as never,
      spotifyService as never,
      pathService as never,
      artworkAssets as never,
    );

    const artwork = await service.resolveTrackArtwork(track);

    expect(artwork.tagCoverBuffer).toEqual(jpegBuffer);
    expect(artwork.folderCoverBuffer).toEqual(jpegBuffer);
  });

  it("never uses album/playlist cover as artist image fallback", async () => {
    playlistRepository.findOne.mockResolvedValue(
      new Playlist({
        id: "playlist-1",
        type: PlaylistTypeEnum.Album,
        coverUrl: "https://image.test/playlist.jpg",
      }),
    );
    const service = new ArtworkService(
      playlistRepository as never,
      spotifyService as never,
      pathService as never,
      artworkAssets as never,
    );

    const artwork = await service.resolveTrackArtwork(track);

    expect(artwork.artistImageBuffer).toBeNull();
  });

  it("persists album cover.jpg and artist folder.jpg through the assets port", async () => {
    const service = new ArtworkService(
      playlistRepository as never,
      spotifyService as never,
      pathService as never,
      artworkAssets as never,
    );
    const artwork = await service.resolveTrackArtwork(track);

    const albumDir = path.join("/music", "Album Artist", "Album");
    await service.saveAlbumCover(albumDir, artwork);
    await service.saveArtistImageIfNeeded(track, artwork);

    expect(artworkAssets.writeFileIfMissing).toHaveBeenNthCalledWith(
      1,
      path.join(albumDir, "cover.jpg"),
      jpegBuffer,
    );
    expect(artworkAssets.writeFileIfMissing).toHaveBeenNthCalledWith(
      2,
      path.join("/music", "Album Artist", "folder.jpg"),
      jpegBuffer,
    );
  });

  it("clears the underlying assets cache when available", () => {
    const service = new ArtworkService(
      playlistRepository as never,
      spotifyService as never,
      pathService as never,
      artworkAssets as never,
    );

    service.clearCache();

    expect(artworkAssets.clearCache).toHaveBeenCalledTimes(1);
  });

  describe("Deezer URL skip-path (ATW-1)", () => {
    const deezerTrackUrl = "https://api.deezer.com/track/123";

    it("ATW-1a: returns albumCoverUrl directly and does NOT call spotifyService for a Deezer track with stored albumCoverUrl", async () => {
      const deezerCoverUrl = "https://cdn.deezer.com/cover.jpg";
      const service = new ArtworkService(
        playlistRepository as never,
        spotifyService as never,
        pathService as never,
        artworkAssets as never,
      );

      const artwork = await service.resolveTrackArtwork({
        ...track,
        trackUrl: deezerTrackUrl,
        albumCoverUrl: deezerCoverUrl,
      });

      expect(spotifyService.getCoverImage).not.toHaveBeenCalled();
      expect(artworkAssets.downloadImage).toHaveBeenCalledWith(deezerCoverUrl);
      expect(artwork.tagCoverBuffer).toEqual(jpegBuffer);
    });

    it("ATW-1b: does NOT call spotifyService for a Deezer track when albumCoverUrl is absent, falls through to playlist cover", async () => {
      const service = new ArtworkService(
        playlistRepository as never,
        spotifyService as never,
        pathService as never,
        artworkAssets as never,
      );

      const artwork = await service.resolveTrackArtwork({
        ...track,
        trackUrl: deezerTrackUrl,
        albumCoverUrl: undefined,
      });

      expect(spotifyService.getCoverImage).not.toHaveBeenCalled();
      // Falls through to playlistCoverBuffer from playlist.coverUrl
      expect(artwork.tagCoverBuffer).toEqual(jpegBuffer);
    });

    it("ATW-1c: still calls spotifyService.getCoverImage for a Spotify track URL (regression guard)", async () => {
      const service = new ArtworkService(
        playlistRepository as never,
        spotifyService as never,
        pathService as never,
        artworkAssets as never,
      );

      await service.resolveTrackArtwork({
        ...track,
        trackUrl: "https://open.spotify.com/track/abc",
      });

      expect(spotifyService.getCoverImage).toHaveBeenCalledWith(
        "https://open.spotify.com/track/abc",
      );
    });

    it("ATW-1d: swallows error when Deezer albumCoverUrl download fails", async () => {
      artworkAssets.downloadImage.mockImplementation((url: string) => {
        if (url === "https://cdn.deezer.com/failing.jpg") throw new Error("download failed");
        return Promise.resolve(jpegBuffer);
      });
      const service = new ArtworkService(
        playlistRepository as never,
        spotifyService as never,
        pathService as never,
        artworkAssets as never,
      );

      const artwork = await service.resolveTrackArtwork({
        ...track,
        trackUrl: deezerTrackUrl,
        albumCoverUrl: "https://cdn.deezer.com/failing.jpg",
      });

      // Error swallowed — trackCoverBuffer is null, falls back to playlistCoverBuffer
      expect(artwork.tagCoverBuffer).toEqual(jpegBuffer);
    });
  });

  // ---------------------------------------------------------------------------
  // resolveTrackArtwork — track with no playlist
  // ---------------------------------------------------------------------------

  describe("resolveTrackArtwork — no playlist", () => {
    it("resolves without playlist cover when track has no playlistId", async () => {
      playlistRepository.findOne.mockResolvedValue(null);
      const service = new ArtworkService(
        playlistRepository as never,
        spotifyService as never,
        pathService as never,
        artworkAssets as never,
      );

      const artwork = await service.resolveTrackArtwork({ ...track, playlistId: undefined });

      expect(playlistRepository.findOne).not.toHaveBeenCalled();
      // Only trackCover download is called (spotifyService resolves a URL)
      expect(artwork.tagCoverBuffer).toEqual(jpegBuffer);
      expect(artwork.artistImageBuffer).toBeNull();
    });

    it("resolves without track cover when spotifyService returns empty string", async () => {
      spotifyService.getCoverImage.mockResolvedValue("");
      playlistRepository.findOne.mockResolvedValue(null);
      const service = new ArtworkService(
        playlistRepository as never,
        spotifyService as never,
        pathService as never,
        artworkAssets as never,
      );

      const artwork = await service.resolveTrackArtwork({ ...track, playlistId: undefined });

      expect(artwork.tagCoverBuffer).toBeNull();
      expect(artwork.folderCoverBuffer).toBeNull();
    });

    it("swallows error when spotifyService.getCoverImage throws", async () => {
      spotifyService.getCoverImage.mockRejectedValue(new Error("spotify error"));
      playlistRepository.findOne.mockResolvedValue(null);
      const service = new ArtworkService(
        playlistRepository as never,
        spotifyService as never,
        pathService as never,
        artworkAssets as never,
      );

      const artwork = await service.resolveTrackArtwork({ ...track, playlistId: undefined });

      // Error swallowed — trackCoverBuffer is null
      expect(artwork.tagCoverBuffer).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // resolveTrackArtwork — playlist type "playlist" (isPlaylistType = true)
  // ---------------------------------------------------------------------------

  describe("resolveTrackArtwork — playlist type variants", () => {
    it("for playlist type: folderCoverBuffer prefers playlistCoverBuffer over trackCoverBuffer", async () => {
      playlistRepository.findOne.mockResolvedValue(
        new Playlist({
          id: "playlist-1",
          type: PlaylistTypeEnum.Playlist,
          coverUrl: "https://image.test/playlist.jpg",
        }),
      );
      const service = new ArtworkService(
        playlistRepository as never,
        spotifyService as never,
        pathService as never,
        artworkAssets as never,
      );

      const artwork = await service.resolveTrackArtwork(track);

      // isPlaylistType=true → folderCoverBuffer = playlistCoverBuffer || trackCoverBuffer
      expect(artwork.folderCoverBuffer).toEqual(jpegBuffer);
      // No artistImageBuffer because type=playlist but artistImageUrl is missing
      expect(artwork.artistImageBuffer).toBeNull();
    });

    it("for non-playlist type: folderCoverBuffer uses trackCoverBuffer first", async () => {
      // Default beforeEach has type Album with both coverUrl and artistImageUrl
      const trackBuffer = Buffer.from([0xff, 0xd8, 0xfe]);
      const playlistBuffer = Buffer.from([0xff, 0xd8, 0xfd]);
      artworkAssets.downloadImage.mockImplementation((url: string) => {
        if (url === "https://image.test/playlist.jpg") return Promise.resolve(playlistBuffer);
        if (url === "https://image.test/track.jpg") return Promise.resolve(trackBuffer);
        return Promise.resolve(jpegBuffer);
      });
      const service = new ArtworkService(
        playlistRepository as never,
        spotifyService as never,
        pathService as never,
        artworkAssets as never,
      );

      const artwork = await service.resolveTrackArtwork(track);

      // isPlaylistType=false (Album) → folderCoverBuffer = trackCoverBuffer || playlistCoverBuffer
      expect(artwork.folderCoverBuffer).toEqual(trackBuffer);
    });
  });

  // ---------------------------------------------------------------------------
  // saveAlbumCover — no-op when folderCoverBuffer is null
  // ---------------------------------------------------------------------------

  describe("saveAlbumCover", () => {
    it("does not call writeFileIfMissing when folderCoverBuffer is null", async () => {
      const service = new ArtworkService(
        playlistRepository as never,
        spotifyService as never,
        pathService as never,
        artworkAssets as never,
      );

      await service.saveAlbumCover("/music/Album", {
        tagCoverBuffer: null,
        folderCoverBuffer: null,
        artistImageBuffer: null,
      });

      expect(artworkAssets.writeFileIfMissing).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // saveArtistImageIfNeeded — early-return conditions
  // ---------------------------------------------------------------------------

  describe("saveArtistImageIfNeeded", () => {
    it("does not call writeFileIfMissing when artistImageBuffer is null", async () => {
      const service = new ArtworkService(
        playlistRepository as never,
        spotifyService as never,
        pathService as never,
        artworkAssets as never,
      );

      await service.saveArtistImageIfNeeded(track, {
        tagCoverBuffer: null,
        folderCoverBuffer: null,
        artistImageBuffer: null,
      });

      expect(artworkAssets.writeFileIfMissing).not.toHaveBeenCalled();
    });

    it("does not call writeFileIfMissing when track has no playlistId", async () => {
      const service = new ArtworkService(
        playlistRepository as never,
        spotifyService as never,
        pathService as never,
        artworkAssets as never,
      );

      await service.saveArtistImageIfNeeded(
        { ...track, playlistId: undefined },
        {
          tagCoverBuffer: null,
          folderCoverBuffer: null,
          artistImageBuffer: jpegBuffer,
        },
      );

      expect(artworkAssets.writeFileIfMissing).not.toHaveBeenCalled();
    });

    it("swallows error when writeFileIfMissing throws while saving artist image", async () => {
      artworkAssets.writeFileIfMissing.mockRejectedValue(new Error("disk full"));
      pathService.getArtistFolderPath.mockReturnValue("/music/Artist");
      const service = new ArtworkService(
        playlistRepository as never,
        spotifyService as never,
        pathService as never,
        artworkAssets as never,
      );

      await expect(
        service.saveArtistImageIfNeeded(track, {
          tagCoverBuffer: null,
          folderCoverBuffer: null,
          artistImageBuffer: jpegBuffer,
        }),
      ).resolves.toBeUndefined();
    });

    it("uses albumArtist over artist when determining the artist folder path", async () => {
      pathService.getArtistFolderPath.mockReturnValue("/music/Album Artist");
      const service = new ArtworkService(
        playlistRepository as never,
        spotifyService as never,
        pathService as never,
        artworkAssets as never,
      );

      await service.saveArtistImageIfNeeded(track, {
        tagCoverBuffer: null,
        folderCoverBuffer: null,
        artistImageBuffer: jpegBuffer,
      });

      expect(pathService.getArtistFolderPath).toHaveBeenCalledWith("Album Artist");
    });

    it("falls back to artist when albumArtist is absent", async () => {
      pathService.getArtistFolderPath.mockReturnValue("/music/Track Artist");
      const service = new ArtworkService(
        playlistRepository as never,
        spotifyService as never,
        pathService as never,
        artworkAssets as never,
      );

      await service.saveArtistImageIfNeeded(
        { ...track, albumArtist: undefined },
        {
          tagCoverBuffer: null,
          folderCoverBuffer: null,
          artistImageBuffer: jpegBuffer,
        },
      );

      expect(pathService.getArtistFolderPath).toHaveBeenCalledWith("Track Artist");
    });
  });

  // ---------------------------------------------------------------------------
  // clearCache — no-op when artworkAssets has no clearCache method
  // ---------------------------------------------------------------------------

  describe("clearCache", () => {
    it("does nothing when artworkAssets does not have a clearCache method", () => {
      const assetsWithoutCache = {
        downloadImage: vi.fn(),
        writeFileIfMissing: vi.fn(),
        // no clearCache
      };
      const service = new ArtworkService(
        playlistRepository as never,
        spotifyService as never,
        pathService as never,
        assetsWithoutCache as never,
      );

      // Should not throw
      expect(() => service.clearCache()).not.toThrow();
    });
  });
});
