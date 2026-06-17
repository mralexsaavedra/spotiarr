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

  // ---------------------------------------------------------------------------
  // process — error branch: post-processing errors are swallowed
  // ---------------------------------------------------------------------------

  it("does not throw when artworkService.resolveTrackArtwork throws (error is swallowed)", async () => {
    artworkService.resolveTrackArtwork.mockRejectedValue(new Error("artwork fetch failed"));
    const service = new TrackPostProcessingService(
      artworkService as never,
      metadataService as never,
      playlistRepository as never,
      trackRepository as never,
      trackPathService as never,
      m3uService as never,
    );

    await expect(
      service.process(track, "/library/Album Artist/Album/01 - Track.mp3"),
    ).resolves.toBeUndefined();
  });

  it("does not throw when metadataService.writeTags throws (error is swallowed)", async () => {
    metadataService.writeTags.mockRejectedValue(new Error("writeTags failed"));
    const service = new TrackPostProcessingService(
      artworkService as never,
      metadataService as never,
      playlistRepository as never,
      trackRepository as never,
      trackPathService as never,
      m3uService as never,
    );

    await expect(
      service.process(track, "/library/Album Artist/Album/01 - Track.mp3"),
    ).resolves.toBeUndefined();
  });

  it("does not throw when artworkService.saveAlbumCover throws (error is swallowed)", async () => {
    artworkService.saveAlbumCover.mockRejectedValue(new Error("saveAlbumCover failed"));
    const service = new TrackPostProcessingService(
      artworkService as never,
      metadataService as never,
      playlistRepository as never,
      trackRepository as never,
      trackPathService as never,
      m3uService as never,
    );

    await expect(
      service.process(track, "/library/Album Artist/Album/01 - Track.mp3"),
    ).resolves.toBeUndefined();
  });

  it("passes undefined coverBuffer when tagCoverBuffer is null", async () => {
    resolvedArtwork.tagCoverBuffer = null;
    artworkService.resolveTrackArtwork.mockResolvedValue(resolvedArtwork);
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
      expect.objectContaining({ coverBuffer: undefined }),
    );
  });

  // ---------------------------------------------------------------------------
  // updatePlaylistM3u
  // ---------------------------------------------------------------------------

  describe("updatePlaylistM3u", () => {
    it("returns early without calling repository when track has no playlistId", async () => {
      const service = new TrackPostProcessingService(
        artworkService as never,
        metadataService as never,
        playlistRepository as never,
        trackRepository as never,
        trackPathService as never,
        m3uService as never,
      );

      await service.updatePlaylistM3u({ ...track, playlistId: undefined });

      expect(playlistRepository.findOne).not.toHaveBeenCalled();
    });

    it("returns early when playlist is not found (findOne returns null)", async () => {
      playlistRepository.findOne.mockResolvedValue(null);
      const service = new TrackPostProcessingService(
        artworkService as never,
        metadataService as never,
        playlistRepository as never,
        trackRepository as never,
        trackPathService as never,
        m3uService as never,
      );

      await service.updatePlaylistM3u(track);

      expect(trackRepository.findAllByPlaylist).not.toHaveBeenCalled();
      expect(m3uService.generateM3uFile).not.toHaveBeenCalled();
    });

    it("returns early when playlist type is not 'playlist'", async () => {
      const nonPlaylistEntity = {
        name: "Some Album",
        type: "album",
        toPrimitive: vi.fn().mockReturnValue({ name: "Some Album", type: "album" }),
      };
      playlistRepository.findOne.mockResolvedValue(nonPlaylistEntity);
      const service = new TrackPostProcessingService(
        artworkService as never,
        metadataService as never,
        playlistRepository as never,
        trackRepository as never,
        trackPathService as never,
        m3uService as never,
      );

      await service.updatePlaylistM3u(track);

      expect(trackRepository.findAllByPlaylist).not.toHaveBeenCalled();
      expect(m3uService.generateM3uFile).not.toHaveBeenCalled();
    });

    it("returns early when playlist has no name", async () => {
      const namelessEntity = {
        name: undefined,
        type: "playlist",
        toPrimitive: vi.fn().mockReturnValue({ name: undefined, type: "playlist" }),
      };
      playlistRepository.findOne.mockResolvedValue(namelessEntity);
      const service = new TrackPostProcessingService(
        artworkService as never,
        metadataService as never,
        playlistRepository as never,
        trackRepository as never,
        trackPathService as never,
        m3uService as never,
      );

      await service.updatePlaylistM3u(track);

      expect(trackRepository.findAllByPlaylist).not.toHaveBeenCalled();
    });

    it("generates M3U when playlist is of type 'playlist' with tracks", async () => {
      const primitivePlaylist = { id: "playlist-1", name: "My Playlist", type: "playlist" };
      const playlistEntity = {
        name: "My Playlist",
        type: "playlist",
        toPrimitive: vi.fn().mockReturnValue(primitivePlaylist),
      };
      const primitiveTrack = { id: "t1", name: "Track", status: "completed" };
      const trackEntity = { toPrimitive: vi.fn().mockReturnValue(primitiveTrack) };
      playlistRepository.findOne.mockResolvedValue(playlistEntity);
      trackRepository.findAllByPlaylist.mockResolvedValue([trackEntity]);
      trackPathService.getPlaylistFolderPath.mockReturnValue("/music/My Playlist");
      m3uService.generateM3uFile.mockResolvedValue(undefined);
      m3uService.getCompletedTracksCount.mockReturnValue(1);

      const service = new TrackPostProcessingService(
        artworkService as never,
        metadataService as never,
        playlistRepository as never,
        trackRepository as never,
        trackPathService as never,
        m3uService as never,
      );

      await service.updatePlaylistM3u(track);

      expect(trackRepository.findAllByPlaylist).toHaveBeenCalledWith("playlist-1");
      expect(trackPathService.getPlaylistFolderPath).toHaveBeenCalledWith("My Playlist");
      expect(m3uService.generateM3uFile).toHaveBeenCalledWith(
        primitivePlaylist,
        [primitiveTrack],
        "/music/My Playlist",
      );
    });

    it("skips M3U generation when playlist has no tracks", async () => {
      const primitivePlaylist = { id: "playlist-1", name: "Empty Playlist", type: "playlist" };
      const playlistEntity = {
        name: "Empty Playlist",
        type: "playlist",
        toPrimitive: vi.fn().mockReturnValue(primitivePlaylist),
      };
      playlistRepository.findOne.mockResolvedValue(playlistEntity);
      trackRepository.findAllByPlaylist.mockResolvedValue([]);

      const service = new TrackPostProcessingService(
        artworkService as never,
        metadataService as never,
        playlistRepository as never,
        trackRepository as never,
        trackPathService as never,
        m3uService as never,
      );

      await service.updatePlaylistM3u(track);

      expect(m3uService.generateM3uFile).not.toHaveBeenCalled();
    });

    it("swallows errors from m3uService.generateM3uFile without throwing", async () => {
      const primitivePlaylist = { id: "playlist-1", name: "My Playlist", type: "playlist" };
      const playlistEntity = {
        name: "My Playlist",
        type: "playlist",
        toPrimitive: vi.fn().mockReturnValue(primitivePlaylist),
      };
      const primitiveTrack = { id: "t1", name: "Track" };
      const trackEntity = { toPrimitive: vi.fn().mockReturnValue(primitiveTrack) };
      playlistRepository.findOne.mockResolvedValue(playlistEntity);
      trackRepository.findAllByPlaylist.mockResolvedValue([trackEntity]);
      trackPathService.getPlaylistFolderPath.mockReturnValue("/music/My Playlist");
      m3uService.generateM3uFile.mockRejectedValue(new Error("m3u write error"));

      const service = new TrackPostProcessingService(
        artworkService as never,
        metadataService as never,
        playlistRepository as never,
        trackRepository as never,
        trackPathService as never,
        m3uService as never,
      );

      await expect(service.updatePlaylistM3u(track)).resolves.toBeUndefined();
    });
  });
});
