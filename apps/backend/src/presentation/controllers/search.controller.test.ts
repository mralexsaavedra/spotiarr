import type { Request, Response } from "express";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CatalogSearchPort } from "@/application/ports/catalog-search.port";
import { SearchController } from "./search.controller";

function mockRes(): Response {
  const jsonFn = vi.fn().mockReturnThis();
  const statusFn = vi.fn().mockReturnThis();
  return { json: jsonFn, status: statusFn } as unknown as Response;
}

function makeMockCatalogSearch(overrides: Partial<CatalogSearchPort> = {}): CatalogSearchPort {
  return {
    searchCatalog: vi.fn().mockResolvedValue({ tracks: [], albums: [], artists: [] }),
    ...overrides,
  };
}

describe("SearchController", () => {
  let catalogSearch: CatalogSearchPort;
  let controller: SearchController;

  beforeEach(() => {
    catalogSearch = makeMockCatalogSearch();
    controller = new SearchController(catalogSearch);
  });

  describe("searchCatalog", () => {
    it("returns empty results when query is missing", async () => {
      const req = { query: {} } as unknown as Request;
      const res = mockRes();

      await controller.searchCatalog(req, res);

      expect(res.json).toHaveBeenCalledWith({ data: { tracks: [], albums: [], artists: [] } });
      expect(catalogSearch.searchCatalog).not.toHaveBeenCalled();
    });

    it("delegates to CatalogSearchPort with parsed params", async () => {
      const fakeResult = {
        tracks: [],
        albums: [
          {
            albumId: "1",
            albumName: "Test",
            artistId: "a",
            artistName: "A",
            artistImageUrl: null,
            coverUrl: null,
          },
        ],
        artists: [{ id: "a", name: "Test Artist", image: null, spotifyUrl: null }],
      };
      vi.mocked(catalogSearch.searchCatalog).mockResolvedValue(fakeResult);

      const req = {
        query: { q: "test", types: "artist,album", limit: "5" },
      } as unknown as Request;
      const res = mockRes();

      await controller.searchCatalog(req, res);

      expect(catalogSearch.searchCatalog).toHaveBeenCalledWith("test", ["artist", "album"], {
        track: 5,
        album: 5,
        artist: 5,
      });
      expect(res.json).toHaveBeenCalledWith({ data: fakeResult });
    });

    it("defaults to all types when types param is absent", async () => {
      const req = { query: { q: "anything" } } as unknown as Request;
      const res = mockRes();

      await controller.searchCatalog(req, res);

      expect(catalogSearch.searchCatalog).toHaveBeenCalledWith(
        "anything",
        ["track", "album", "artist"],
        { track: 10, album: 10, artist: 10 },
      );
    });

    it("clamps limit between 1 and 10", async () => {
      const req = { query: { q: "x", limit: "999" } } as unknown as Request;
      const res = mockRes();

      await controller.searchCatalog(req, res);

      expect(catalogSearch.searchCatalog).toHaveBeenCalledWith("x", ["track", "album", "artist"], {
        track: 10,
        album: 10,
        artist: 10,
      });
    });

    it("uses DeezerCatalogSearchAdapter results (no Spotify call) — structural contract", async () => {
      const deezerResult = {
        tracks: [],
        albums: [],
        artists: [{ id: "123456789", name: "Deezer Artist", image: null, spotifyUrl: null }],
      };
      vi.mocked(catalogSearch.searchCatalog).mockResolvedValue(deezerResult);

      const req = { query: { q: "deezer artist", types: "artist" } } as unknown as Request;
      const res = mockRes();

      await controller.searchCatalog(req, res);

      expect(res.json).toHaveBeenCalledWith({ data: deezerResult });
    });
  });
});
