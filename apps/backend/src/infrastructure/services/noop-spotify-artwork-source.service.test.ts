import { describe, expect, it } from "vitest";
import type { ArtworkBackfillCandidate } from "@/application/ports/artwork-backfill-sources.port";
import { NoopSpotifyArtworkSourceService } from "./noop-spotify-artwork-source.service";

const artistCandidate: ArtworkBackfillCandidate = {
  type: "artist",
  cursorValue: "cursor-1",
  artistName: "Radiohead",
  artistSpotifyId: "spotify-artist-1",
};

const albumCandidate: ArtworkBackfillCandidate = {
  type: "album",
  cursorValue: "cursor-2",
  artistName: "Radiohead",
  albumName: "OK Computer",
  albumSpotifyId: "spotify-album-1",
};

describe("NoopSpotifyArtworkSourceService", () => {
  it("findArtistImageUrl always returns null", async () => {
    const service = new NoopSpotifyArtworkSourceService();
    const result = await service.findArtistImageUrl(artistCandidate);
    expect(result).toBeNull();
  });

  it("findAlbumCoverUrl always returns null", async () => {
    const service = new NoopSpotifyArtworkSourceService();
    const result = await service.findAlbumCoverUrl(albumCandidate);
    expect(result).toBeNull();
  });

  it("findArtistImageUrl returns null for any candidate shape", async () => {
    const service = new NoopSpotifyArtworkSourceService();
    const result = await service.findArtistImageUrl(albumCandidate);
    expect(result).toBeNull();
  });

  it("findAlbumCoverUrl returns null for any candidate shape", async () => {
    const service = new NoopSpotifyArtworkSourceService();
    const result = await service.findAlbumCoverUrl(artistCandidate);
    expect(result).toBeNull();
  });

  it("implements ArtworkBackfillExternalSourcePort (duck-type check)", () => {
    const service = new NoopSpotifyArtworkSourceService();
    expect(typeof service.findArtistImageUrl).toBe("function");
    expect(typeof service.findAlbumCoverUrl).toBe("function");
  });
});
