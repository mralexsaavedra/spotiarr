import { describe, expect, it, vi } from "vitest";
import { AppError } from "@/domain/errors/app-error";
import { SpotifyArtworkSourceService } from "./spotify-artwork-source.service";

function makeArtistClient(overrides: Record<string, unknown> = {}) {
  return {
    getArtistRaw: vi.fn().mockResolvedValue(null),
    ...overrides,
  };
}

function makeAlbumClient(overrides: Record<string, unknown> = {}) {
  return {
    getAlbumDetails: vi.fn().mockResolvedValue({ images: [] }),
    ...overrides,
  };
}

function makeSearchClient(overrides: Record<string, unknown> = {}) {
  return {
    searchCatalog: vi.fn().mockResolvedValue({ artists: [], albums: [] }),
    ...overrides,
  };
}

function makeCandidate(overrides: Record<string, unknown> = {}) {
  return {
    artistName: "Test Artist",
    artistSpotifyId: undefined,
    albumName: undefined,
    albumSpotifyId: undefined,
    ...overrides,
  };
}

describe("SpotifyArtworkSourceService", () => {
  describe("findArtistImageUrl", () => {
    it("returns the artist image when found by spotifyId", async () => {
      const artistClient = makeArtistClient({
        getArtistRaw: vi.fn().mockResolvedValue({
          images: [{ url: "https://i.scdn.co/artist.jpg" }],
        }),
      });

      const service = new SpotifyArtworkSourceService(
        artistClient as never,
        makeAlbumClient() as never,
        makeSearchClient() as never,
      );

      const result = await service.findArtistImageUrl(
        makeCandidate({ artistSpotifyId: "abc123" }) as never,
      );

      expect(result).toBe("https://i.scdn.co/artist.jpg");
    });

    it("falls back to search when getArtistRaw returns no images", async () => {
      const artistClient = makeArtistClient({
        getArtistRaw: vi.fn().mockResolvedValue({ images: [] }),
      });
      const searchClient = makeSearchClient({
        searchCatalog: vi.fn().mockResolvedValue({
          artists: [{ image: "https://search.img/artist.jpg" }],
          albums: [],
        }),
      });

      const service = new SpotifyArtworkSourceService(
        artistClient as never,
        makeAlbumClient() as never,
        searchClient as never,
      );

      const result = await service.findArtistImageUrl(
        makeCandidate({ artistSpotifyId: "abc" }) as never,
      );

      expect(result).toBe("https://search.img/artist.jpg");
    });

    it("uses search directly when no artistSpotifyId is provided", async () => {
      const searchClient = makeSearchClient({
        searchCatalog: vi.fn().mockResolvedValue({
          artists: [{ image: "https://search.img/no-id.jpg" }],
          albums: [],
        }),
      });

      const service = new SpotifyArtworkSourceService(
        makeArtistClient() as never,
        makeAlbumClient() as never,
        searchClient as never,
      );

      const result = await service.findArtistImageUrl(makeCandidate() as never);

      expect(result).toBe("https://search.img/no-id.jpg");
    });

    it("returns null when search returns no artist results", async () => {
      const service = new SpotifyArtworkSourceService(
        makeArtistClient() as never,
        makeAlbumClient() as never,
        makeSearchClient() as never,
      );

      const result = await service.findArtistImageUrl(makeCandidate() as never);
      expect(result).toBeNull();
    });

    it("re-throws a 429 AppError as spotify_rate_limited", async () => {
      const artistClient = makeArtistClient({
        getArtistRaw: vi
          .fn()
          .mockRejectedValue(new AppError(429, "spotify_rate_limited", "rate limited")),
      });

      const service = new SpotifyArtworkSourceService(
        artistClient as never,
        makeAlbumClient() as never,
        makeSearchClient() as never,
      );

      await expect(
        service.findArtistImageUrl(makeCandidate({ artistSpotifyId: "x" }) as never),
      ).rejects.toMatchObject({ statusCode: 429, errorCode: "spotify_rate_limited" });
    });

    it("wraps circuit_open errors as 429 spotify_rate_limited", async () => {
      const circuitError = Object.assign(new Error("circuit open"), { errorCode: "circuit_open" });
      const artistClient = makeArtistClient({
        getArtistRaw: vi.fn().mockRejectedValue(circuitError),
      });

      const service = new SpotifyArtworkSourceService(
        artistClient as never,
        makeAlbumClient() as never,
        makeSearchClient() as never,
      );

      await expect(
        service.findArtistImageUrl(makeCandidate({ artistSpotifyId: "x" }) as never),
      ).rejects.toMatchObject({ statusCode: 429, errorCode: "spotify_rate_limited" });
    });

    it("wraps unknown errors as 502 internal_server_error", async () => {
      const artistClient = makeArtistClient({
        getArtistRaw: vi.fn().mockRejectedValue(new Error("unknown")),
      });

      const service = new SpotifyArtworkSourceService(
        artistClient as never,
        makeAlbumClient() as never,
        makeSearchClient() as never,
      );

      await expect(
        service.findArtistImageUrl(makeCandidate({ artistSpotifyId: "x" }) as never),
      ).rejects.toMatchObject({ statusCode: 502, errorCode: "internal_server_error" });
    });
  });

  describe("findAlbumCoverUrl", () => {
    it("returns null immediately when albumName is missing", async () => {
      const service = new SpotifyArtworkSourceService(
        makeArtistClient() as never,
        makeAlbumClient() as never,
        makeSearchClient() as never,
      );

      const result = await service.findAlbumCoverUrl(makeCandidate() as never);
      expect(result).toBeNull();
    });

    it("returns the album image when found by albumSpotifyId", async () => {
      const albumClient = makeAlbumClient({
        getAlbumDetails: vi.fn().mockResolvedValue({
          images: [{ url: "https://i.scdn.co/album.jpg" }],
        }),
      });

      const service = new SpotifyArtworkSourceService(
        makeArtistClient() as never,
        albumClient as never,
        makeSearchClient() as never,
      );

      const result = await service.findAlbumCoverUrl(
        makeCandidate({ albumName: "Great Album", albumSpotifyId: "sp1" }) as never,
      );

      expect(result).toBe("https://i.scdn.co/album.jpg");
    });

    it("falls back to search when getAlbumDetails returns no images", async () => {
      const albumClient = makeAlbumClient({
        getAlbumDetails: vi.fn().mockResolvedValue({ images: [] }),
      });
      const searchClient = makeSearchClient({
        searchCatalog: vi.fn().mockResolvedValue({
          artists: [],
          albums: [{ coverUrl: "https://search.img/album.jpg" }],
        }),
      });

      const service = new SpotifyArtworkSourceService(
        makeArtistClient() as never,
        albumClient as never,
        searchClient as never,
      );

      const result = await service.findAlbumCoverUrl(
        makeCandidate({ albumName: "Great Album", albumSpotifyId: "sp1" }) as never,
      );

      expect(result).toBe("https://search.img/album.jpg");
    });

    it("returns null when search returns no album results", async () => {
      const service = new SpotifyArtworkSourceService(
        makeArtistClient() as never,
        makeAlbumClient() as never,
        makeSearchClient() as never,
      );

      const result = await service.findAlbumCoverUrl(
        makeCandidate({ albumName: "Unknown Album" }) as never,
      );

      expect(result).toBeNull();
    });

    it("re-throws errors through classifyError", async () => {
      const albumClient = makeAlbumClient({
        getAlbumDetails: vi.fn().mockRejectedValue(new Error("network error")),
      });

      const service = new SpotifyArtworkSourceService(
        makeArtistClient() as never,
        albumClient as never,
        makeSearchClient() as never,
      );

      await expect(
        service.findAlbumCoverUrl(
          makeCandidate({ albumName: "Album", albumSpotifyId: "sp2" }) as never,
        ),
      ).rejects.toMatchObject({ statusCode: 502 });
    });
  });
});
