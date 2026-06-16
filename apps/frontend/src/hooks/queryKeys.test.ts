import { describe, expect, it } from "vitest";
import { queryKeys } from "./queryKeys";

describe("queryKeys — static keys", () => {
  it("playlists returns the expected tuple", () => {
    expect(queryKeys.playlists).toEqual(["playlists"]);
  });

  it("myPlaylists returns the expected tuple", () => {
    expect(queryKeys.myPlaylists).toEqual(["my-playlists"]);
  });

  it("downloadHistory returns the expected tuple", () => {
    expect(queryKeys.downloadHistory).toEqual(["download-history"]);
  });

  it("downloadStatus returns the expected tuple", () => {
    expect(queryKeys.downloadStatus).toEqual(["download-status"]);
  });

  it("settings returns the expected tuple", () => {
    expect(queryKeys.settings).toEqual(["settings"]);
  });

  it("settingsMetadata returns the expected tuple", () => {
    expect(queryKeys.settingsMetadata).toEqual(["settingsMetadata"]);
  });

  it("supportedFormats returns the expected tuple", () => {
    expect(queryKeys.supportedFormats).toEqual(["supportedFormats"]);
  });

  it("releases returns the expected tuple", () => {
    expect(queryKeys.releases).toEqual(["releases"]);
  });

  it("followedArtists returns the expected tuple", () => {
    expect(queryKeys.followedArtists).toEqual(["followed-artists"]);
  });

  it("spotifyAuthStatus returns the expected tuple", () => {
    expect(queryKeys.spotifyAuthStatus).toEqual(["spotify-auth-status"]);
  });

  it("library returns the expected tuple", () => {
    expect(queryKeys.library).toEqual(["library"]);
  });

  it("artworkBackfillStatus returns the expected tuple", () => {
    expect(queryKeys.artworkBackfillStatus).toEqual(["library", "artwork-backfill", "status"]);
  });

  it("libraryStats returns the expected tuple", () => {
    expect(queryKeys.libraryStats).toEqual(["library", "stats"]);
  });

  it("libraryArtists returns the expected tuple", () => {
    expect(queryKeys.libraryArtists).toEqual(["library", "artists"]);
  });

  it("authSession returns the expected tuple", () => {
    expect(queryKeys.authSession).toEqual(["auth", "session"]);
  });

  it("aiChatMessages returns the expected tuple", () => {
    expect(queryKeys.aiChatMessages).toEqual(["ai", "chat", "messages"]);
  });
});

describe("queryKeys — parameterized keys", () => {
  describe("tracks", () => {
    it("places playlistId at position [1]", () => {
      const key = queryKeys.tracks("pl-123");
      expect(key[0]).toBe("tracks");
      expect(key[1]).toBe("pl-123");
      expect(key).toEqual(["tracks", "pl-123"]);
    });

    it("returns distinct keys for distinct playlistIds", () => {
      expect(queryKeys.tracks("a")).not.toEqual(queryKeys.tracks("b"));
    });
  });

  describe("playlistPreview", () => {
    it("places spotifyUrl at position [1]", () => {
      const url = "https://open.spotify.com/playlist/abc";
      const key = queryKeys.playlistPreview(url);
      expect(key[0]).toBe("playlist-preview");
      expect(key[1]).toBe(url);
    });
  });

  describe("playlistPreviewTracksPage", () => {
    it("places spotifyUrl, offset, limit at positions [1], [2], [3]", () => {
      const url = "https://open.spotify.com/playlist/xyz";
      const key = queryKeys.playlistPreviewTracksPage(url, 20, 10);
      expect(key[0]).toBe("playlist-preview-tracks-page");
      expect(key[1]).toBe(url);
      expect(key[2]).toBe(20);
      expect(key[3]).toBe(10);
      expect(key).toHaveLength(4);
    });

    it("returns distinct keys for different offsets", () => {
      const url = "https://open.spotify.com/playlist/xyz";
      expect(queryKeys.playlistPreviewTracksPage(url, 0, 10)).not.toEqual(
        queryKeys.playlistPreviewTracksPage(url, 10, 10),
      );
    });
  });

  describe("playlistPreviewTracks", () => {
    it("places spotifyUrl at position [1]", () => {
      const url = "https://open.spotify.com/playlist/def";
      const key = queryKeys.playlistPreviewTracks(url);
      expect(key[0]).toBe("playlist-preview-tracks");
      expect(key[1]).toBe(url);
    });
  });

  describe("artistDetail", () => {
    it("places artistId at position [1]", () => {
      const key = queryKeys.artistDetail("artist-99");
      expect(key[0]).toBe("artist-detail");
      expect(key[1]).toBe("artist-99");
    });
  });

  describe("artistAlbums", () => {
    it("places artistId, limit, offset at positions [1], [2], [3]", () => {
      const key = queryKeys.artistAlbums("art-1", 50, 0);
      expect(key[0]).toBe("artist-albums");
      expect(key[1]).toBe("art-1");
      expect(key[2]).toBe(50);
      expect(key[3]).toBe(0);
      expect(key).toHaveLength(4);
    });

    it("returns distinct keys for different offsets", () => {
      expect(queryKeys.artistAlbums("art-1", 50, 0)).not.toEqual(
        queryKeys.artistAlbums("art-1", 50, 50),
      );
    });
  });

  describe("artistAlbumTracks", () => {
    it("places artistId at [1] and albumId at [2]", () => {
      const key = queryKeys.artistAlbumTracks("art-1", "alb-2");
      expect(key[0]).toBe("artist-album-tracks");
      expect(key[1]).toBe("art-1");
      expect(key[2]).toBe("alb-2");
      expect(key).toHaveLength(3);
    });
  });

  describe("libraryArtistDetail", () => {
    it("places name at position [2] with fixed prefix", () => {
      const key = queryKeys.libraryArtistDetail("Radiohead");
      expect(key[0]).toBe("library");
      expect(key[1]).toBe("artist");
      expect(key[2]).toBe("Radiohead");
    });

    it("returns distinct keys for distinct names", () => {
      expect(queryKeys.libraryArtistDetail("A")).not.toEqual(queryKeys.libraryArtistDetail("B"));
    });
  });

  describe("search", () => {
    it("places query at [1], types at [2], limit at [3]", () => {
      const key = queryKeys.search("radiohead", ["track", "artist"], 20);
      expect(key[0]).toBe("search");
      expect(key[1]).toBe("radiohead");
      expect(key[2]).toEqual(["track", "artist"]);
      expect(key[3]).toBe(20);
      expect(key).toHaveLength(4);
    });

    it("returns distinct keys for different queries", () => {
      expect(queryKeys.search("foo", ["track"], 10)).not.toEqual(
        queryKeys.search("bar", ["track"], 10),
      );
    });
  });
});
