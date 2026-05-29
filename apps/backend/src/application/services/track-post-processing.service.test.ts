import type { ITrack } from "@spotiarr/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ResolvedArtwork } from "@/application/services/artwork.service";
import { TrackPostProcessingService } from "./track-post-processing.service";

describe("TrackPostProcessingService", () => {
  const artworkService = {
    resolveTrackArtwork: vi.fn(),
    saveAlbumCover: vi.fn(),
    saveArtistImageIfNeeded: vi.fn(),
  };

  const metadataService = {
    writeTags: vi.fn(),
  };

  const playlistRepository = {
    findOne: vi.fn(),
  };

  const trackRepository = {
    findAllByPlaylist: vi.fn(),
  };

  const trackPathService = {
    getPlaylistFolderPath: vi.fn(),
  };

  const m3uService = {
    generateM3uFile: vi.fn(),
    getCompletedTracksCount: vi.fn(),
  };

  const track: ITrack = {
    name: "Track",
    artist: "Track Artist",
    albumArtist: "Album Artist",
    album: "Album",
    playlistId: "playlist-1",
  };

  let resolvedArtwork: ResolvedArtwork;

  beforeEach(() => {
    vi.clearAllMocks();
    metadataService.writeTags.mockResolvedValue(undefined);
    resolvedArtwork = {
      tagCoverBuffer: Buffer.from("tag-cover"),
      folderCoverBuffer: Buffer.from("folder-cover"),
      artistImageBuffer: Buffer.from("artist-image"),
    };
    artworkService.resolveTrackArtwork.mockResolvedValue(resolvedArtwork);
    artworkService.saveAlbumCover.mockResolvedValue(undefined);
    artworkService.saveArtistImageIfNeeded.mockResolvedValue(undefined);
  });

  it("delegates album and artist artwork persistence to ArtworkService", async () => {
    const service = new TrackPostProcessingService(
      artworkService as never,
      metadataService as never,
      playlistRepository as never,
      trackRepository as never,
      trackPathService as never,
      m3uService as never,
    );

    await service.process(track, "/library/Album Artist/Album/01 - Track.mp3");

    expect(artworkService.resolveTrackArtwork).toHaveBeenCalledWith(track);
    expect(artworkService.saveAlbumCover).toHaveBeenCalledWith(
      "/library/Album Artist/Album",
      resolvedArtwork,
    );
    expect(artworkService.saveArtistImageIfNeeded).toHaveBeenCalledWith(track, resolvedArtwork);
  });

  it("passes resolved coverBuffer to metadata writer", async () => {
    const service = new TrackPostProcessingService(
      artworkService as never,
      metadataService as never,
      playlistRepository as never,
      trackRepository as never,
      trackPathService as never,
      m3uService as never,
    );

    await service.process(track, "/library/Album Artist/Album/01 - Track.mp3");

    expect(metadataService.writeTags).toHaveBeenCalledWith(
      "/library/Album Artist/Album/01 - Track.mp3",
      expect.objectContaining({
        coverBuffer: resolvedArtwork.tagCoverBuffer,
      }),
    );
  });
});
