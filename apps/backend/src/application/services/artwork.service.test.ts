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
  });
});
